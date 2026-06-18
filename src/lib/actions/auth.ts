"use server";

// Client-invokable server actions for invitations. Ported from the OLD APP
// TanStack serverFns in auth.functions.ts.
//
// - createInvite: requires an authenticated inviter (requireUser) with a role
//   permitted to invite the target role. Uses the RLS-scoped client only to read
//   the inviter's roles/hierarchy and the admin client to insert the invite row.
// - getInviteInfo: public — looks up an invite token to render the accept page.
// - acceptInvite: public — creates the auth user (admin), assigns the role and
//   links vp_hierarchy / kunden, then marks the invite accepted.
import { z } from "zod";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOrgId } from "@/lib/actions/_org";
import { passwordSchema } from "@/lib/password";
import { sendEmail } from "@/lib/email/resend";
import { inviteEmail } from "@/lib/email/templates";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrator",
  support: "Support",
  vertriebsleiter: "Vertriebsleiter",
  vp_l1: "Vertriebspartner L1",
  vp_l2: "Vertriebspartner L2",
  vp_l3: "Vertriebspartner L3",
  kunde: "Kunde",
  finanzierer: "Finanzierungspartner",
};

/** Resolve the public site URL from request headers (fallback to env). */
async function resolveSiteUrl(): Promise<string> {
  const hdrs = await headers();
  const origin = hdrs.get("origin");
  if (origin) return origin;
  const fwd = hdrs.get("x-forwarded-host");
  if (fwd) return `https://${fwd}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────── createInvite ────────────────────────────
const createInviteInput = z.object({
  email: z.string().email(),
  role: z.enum([
    "admin",
    "support",
    "vertriebsleiter",
    "vp_l1",
    "vp_l2",
    "vp_l3",
    "kunde",
    "finanzierer",
  ]),
  commission_rate: z.number().min(0).max(100).optional(),
});

export async function createInvite(input: z.infer<typeof createInviteInput>) {
  const session = await requireUser();
  const { userId } = session;
  const data = createInviteInput.parse(input);
  const admin = createAdminClient();

  // Tenant: stamp the invite with the inviter's active organisation so the new
  // member joins the right tenant (the admin client has no auth.uid(), so the
  // default-org trigger can't fire).
  const orgId = await activeOrgId(session.supabase, userId);

  // Inviter-Rollen ermitteln
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const inviterRoles = (roles ?? []).map((r) => r.role as AppRole);
  const has = (r: AppRole) => inviterRoles.includes(r);

  // Wer darf wen einladen?
  const allowed: Record<AppRole, AppRole[]> = {
    admin: ["admin", "support", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3", "kunde", "finanzierer"],
    support: [],
    vertriebsleiter: ["vp_l1", "kunde"],
    vp_l1: ["vp_l2", "kunde"],
    vp_l2: ["vp_l3", "kunde"],
    vp_l3: ["kunde"],
    kunde: [],
    finanzierer: [],
  };
  const canInvite = inviterRoles.some((ir) => allowed[ir].includes(data.role));
  if (!canInvite) throw new Error("Keine Berechtigung diese Rolle einzuladen");

  // parent_vp_id + vertriebsleiter_id ableiten
  let parent_vp_id: string | null = null;
  let vertriebsleiter_id: string | null = null;

  if (["vp_l1", "vp_l2", "vp_l3"].includes(data.role)) {
    if (data.role === "vp_l1") {
      if (!has("vertriebsleiter") && !has("admin"))
        throw new Error("Nur Vertriebsleiter/Admin dürfen L1 einladen");
      if (has("vertriebsleiter")) vertriebsleiter_id = userId;
      // parent_vp_id bleibt null bei L1
    } else {
      // L2 oder L3: Inviter ist Parent
      parent_vp_id = userId;
      const { data: parentH } = await admin
        .from("vp_hierarchy")
        .select("vertriebsleiter_id")
        .eq("vp_id", userId)
        .maybeSingle();
      if (!parentH) throw new Error("Inviter hat keinen Hierarchie-Eintrag");
      vertriebsleiter_id = parentH.vertriebsleiter_id;
    }
  } else if (data.role === "kunde") {
    // Kunde: Inviter ist VP (oder Admin, dann ohne vp_id)
    if (has("vp_l1") || has("vp_l2") || has("vp_l3")) {
      parent_vp_id = userId; // wird beim Akzeptieren als kunden.vp_id genutzt
    }
  }

  // commission_rate Validierung (nur für VP-Rollen relevant)
  let invite_commission_rate: number | null = null;
  if (["vp_l1", "vp_l2", "vp_l3"].includes(data.role)) {
    if (data.role === "vp_l1") {
      invite_commission_rate = data.commission_rate ?? 5.0;
    } else {
      // L2/L3 — Default = parent.commission_rate, max = parent.commission_rate
      const { data: parentH } = await admin
        .from("vp_hierarchy")
        .select("commission_rate")
        .eq("vp_id", parent_vp_id!)
        .maybeSingle();
      const parentRate = parentH ? Number(parentH.commission_rate) : 0;
      invite_commission_rate = data.commission_rate ?? parentRate;
      if (invite_commission_rate > parentRate) {
        throw new Error(
          `Sub-Provision (${invite_commission_rate}%) darf Parent-Provision (${parentRate}%) nicht übersteigen`,
        );
      }
    }
  }

  const token = randomToken();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("invites").insert({
    email: data.email,
    role: data.role,
    token,
    invited_by: userId,
    parent_vp_id,
    vertriebsleiter_id,
    commission_rate: invite_commission_rate,
    expires_at,
    organisation_id: orgId,
  });
  if (error) throw new Error(`Invite konnte nicht angelegt werden: ${error.message}`);

  const siteUrl = await resolveSiteUrl();
  const acceptUrl = `${siteUrl.replace(/\/$/, "")}/invite/${token}`;

  // Send the invitation email (best-effort — the invite is already created; if
  // mailing fails the caller can still share `acceptUrl` manually).
  let emailSent = false;
  try {
    const [{ data: inviter }, { data: org }] = await Promise.all([
      admin
        .from("profiles")
        .select("name, vorname, nachname")
        .eq("id", userId)
        .maybeSingle(),
      orgId
        ? admin.from("organisationen").select("name").eq("id", orgId).maybeSingle()
        : Promise.resolve({ data: null as { name: string } | null }),
    ]);
    const inviterName =
      inviter?.name ??
      ([inviter?.vorname, inviter?.nachname].filter(Boolean).join(" ") || null);

    const { subject, html } = inviteEmail({
      inviterName,
      orgName: org?.name ?? null,
      roleLabel: ROLE_LABEL[data.role] ?? data.role,
      acceptUrl,
      expiresAt: expires_at,
    });
    const res = await sendEmail({
      to: data.email,
      subject,
      html,
      from: process.env.INVITE_FROM_EMAIL,
    });
    emailSent = res.ok;
  } catch {
    emailSent = false;
  }

  return { token, expires_at, acceptUrl, emailSent };
}

// ──────────────────────────── getInviteInfo (public) ────────────────────────────
const getInviteInfoInput = z.object({ token: z.string().min(10) });

export type InviteInfo =
  | { ok: false; reason: "not_found" | "used" | "expired" }
  | { ok: true; email: string; role: AppRole };

export async function getInviteInfo(
  input: z.infer<typeof getInviteInfoInput>,
): Promise<InviteInfo> {
  const data = getInviteInfoInput.parse(input);
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("invites")
    .select("email, role, accepted_at, expires_at")
    .eq("token", data.token)
    .maybeSingle();
  if (!inv) return { ok: false, reason: "not_found" };
  if (inv.accepted_at) return { ok: false, reason: "used" };
  if (new Date(inv.expires_at) < new Date()) return { ok: false, reason: "expired" };
  return { ok: true, email: inv.email, role: inv.role };
}

// ──────────────────────────── acceptInvite (public) ────────────────────────────
const acceptInviteInput = z.object({
  token: z.string().min(10),
  password: passwordSchema,
  name: z.string().min(1).max(120).optional(),
});

export async function acceptInvite(input: z.infer<typeof acceptInviteInput>) {
  const data = acceptInviteInput.parse(input);
  const admin = createAdminClient();

  const { data: inv } = await admin
    .from("invites")
    .select("*")
    .eq("token", data.token)
    .maybeSingle();
  if (!inv) throw new Error("Einladung ungültig");
  if (inv.accepted_at) throw new Error("Einladung wurde bereits akzeptiert");
  if (new Date(inv.expires_at) < new Date()) throw new Error("Einladung abgelaufen");

  // User existiert evtl. schon? -> blockieren
  const { data: existingList } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const exists = existingList?.users.find(
    (u) => u.email?.toLowerCase() === inv.email.toLowerCase(),
  );
  if (exists) throw new Error("Für diese Email existiert bereits ein Account");

  // 1) auth user
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password: data.password,
    email_confirm: true,
    user_metadata: { name: data.name ?? inv.email },
  });
  if (cErr || !created.user)
    throw new Error(`Account konnte nicht angelegt werden: ${cErr?.message}`);
  const newUserId = created.user.id;

  // 2) role
  const { error: rErr } = await admin
    .from("user_roles")
    .insert({ user_id: newUserId, role: inv.role });
  if (rErr) throw new Error(`Rolle konnte nicht gesetzt werden: ${rErr.message}`);

  // 2b) Multi-tenant membership: resolve the inviter's organisation and join the
  // new user to it so tenant isolation (active_organisation_id + organisation_members)
  // is wired from the start. The admin client has no auth.uid(), so org-default
  // triggers can't fire — we set it explicitly.
  // Prefer the org stamped on the invite; fall back to the inviter chain's
  // active org for legacy invites created before invites carried organisation_id.
  let orgId: string | null = inv.organisation_id ?? null;
  {
    const inviterCandidates = [
      inv.invited_by,
      inv.parent_vp_id,
      inv.vertriebsleiter_id,
    ].filter((id): id is string => Boolean(id));

    for (const candidateId of inviterCandidates) {
      if (orgId) break;
      const { data: prof } = await admin
        .from("profiles")
        .select("active_organisation_id")
        .eq("id", candidateId)
        .maybeSingle();
      if (prof?.active_organisation_id) {
        orgId = prof.active_organisation_id;
        break;
      }
    }

    if (orgId) {
      await admin
        .from("profiles")
        .update({ active_organisation_id: orgId })
        .eq("id", newUserId);
      await admin
        .from("organisation_members")
        .upsert(
          { organisation_id: orgId, user_id: newUserId, rolle: "member" },
          { onConflict: "organisation_id,user_id" },
        );
    }
  }

  // 3) Hierarchie / Kunden-Verknüpfung
  if (["vp_l1", "vp_l2", "vp_l3"].includes(inv.role)) {
    const level = inv.role === "vp_l1" ? 1 : inv.role === "vp_l2" ? 2 : 3;
    // commission_rate: bevorzugt aus Invite, sonst Parent-Rate, sonst 5.0
    let commission_rate = inv.commission_rate != null ? Number(inv.commission_rate) : 5.0;
    let vl_id = inv.vertriebsleiter_id;
    if (inv.parent_vp_id) {
      const { data: parent } = await admin
        .from("vp_hierarchy")
        .select("commission_rate, vertriebsleiter_id")
        .eq("vp_id", inv.parent_vp_id)
        .maybeSingle();
      if (parent) {
        if (inv.commission_rate == null) commission_rate = Number(parent.commission_rate);
        vl_id = parent.vertriebsleiter_id;
      }
    }
    if (!vl_id) throw new Error("vertriebsleiter_id konnte nicht abgeleitet werden");
    const { error: hErr } = await admin.from("vp_hierarchy").insert({
      vp_id: newUserId,
      parent_vp_id: inv.parent_vp_id,
      level,
      commission_rate,
      vertriebsleiter_id: vl_id,
      organisation_id: orgId,
    });
    if (hErr) throw new Error(`Hierarchie konnte nicht gesetzt werden: ${hErr.message}`);
  } else if (inv.role === "kunde" && inv.parent_vp_id) {
    // The admin client has no auth.uid(), so the org-default trigger can't fire.
    // Mirror the inviting VP's active org so the new kunde stays visible to them.
    // (organisation_id is not yet in the generated kunden types — see _org.ts.)
    const { data: vpProfile } = await admin
      .from("profiles")
      .select("active_organisation_id")
      .eq("id", inv.parent_vp_id)
      .maybeSingle();
    const { error: kErr } = await admin.from("kunden").insert({
      vp_id: inv.parent_vp_id,
      user_id: newUserId,
      persoenliche_daten: { name: data.name ?? inv.email },
      organisation_id: vpProfile?.active_organisation_id ?? null,
    } as Database["public"]["Tables"]["kunden"]["Insert"]);
    if (kErr) throw new Error(`Kunde konnte nicht angelegt werden: ${kErr.message}`);
  }

  // 4) invite als angenommen markieren
  await admin
    .from("invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("token", data.token);

  return { ok: true as const, email: inv.email };
}
