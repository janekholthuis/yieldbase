"use server";

// Server actions for the Team module: invite sub-VPs, adjust their commission
// rate within the caller's tree, and revoke pending invites. Authorisation is
// enforced via requireRole; mutations use the admin client (invites/hierarchy
// are not RLS-writable by ordinary VPs) after the caller's scope is verified.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ──────────────────────────── inviteSubVp ────────────────────────────
const inviteSubVpInput = z.object({
  email: z.string().email(),
  role: z.enum(["vp_l1", "vp_l2", "vp_l3"]),
  commissionRate: z.number().min(0).max(100),
});

export async function inviteSubVp(input: z.infer<typeof inviteSubVpInput>) {
  const { userId } = await requireRole(
    "admin",
    "vertriebsleiter",
    "vp_l1",
    "vp_l2",
    "vp_l3",
  );
  const data = inviteSubVpInput.parse(input);
  const admin = createAdminClient();

  // parent_vp_id = caller. vertriebsleiter_id = the caller's vertriebsleiter,
  // or the caller themselves if they are a Vertriebsleiter.
  const parent_vp_id = userId;
  let vertriebsleiter_id: string = userId;

  const { data: callerH } = await admin
    .from("vp_hierarchy")
    .select("vertriebsleiter_id")
    .eq("vp_id", userId)
    .maybeSingle();
  if (callerH?.vertriebsleiter_id) {
    vertriebsleiter_id = callerH.vertriebsleiter_id;
  }

  const token = randomToken();
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: inserted, error } = await admin
    .from("invites")
    .insert({
      email: data.email,
      role: data.role,
      token,
      invited_by: userId,
      parent_vp_id,
      vertriebsleiter_id,
      commission_rate: data.commissionRate,
      expires_at,
    })
    .select("id, token")
    .single();
  if (error || !inserted) {
    throw new Error(`Einladung konnte nicht angelegt werden: ${error?.message}`);
  }

  revalidatePath("/team");
  return { id: inserted.id, token: inserted.token, expires_at };
}

// ──────────────────────────── updateVpCommissionRate ────────────────────────────
const updateVpCommissionRateInput = z.object({
  vpId: z.string().uuid(),
  commissionRate: z.number().min(0).max(100),
});

export async function updateVpCommissionRate(
  input: z.infer<typeof updateVpCommissionRateInput>,
) {
  const { userId, roles } = await requireRole("admin", "vertriebsleiter");
  const data = updateVpCommissionRateInput.parse(input);
  const admin = createAdminClient();

  // Scope check: the target VP must be within the caller's tree.
  const { data: target } = await admin
    .from("vp_hierarchy")
    .select("vp_id, vertriebsleiter_id")
    .eq("vp_id", data.vpId)
    .maybeSingle();
  if (!target) throw new Error("VP nicht gefunden");

  const isAdmin = roles.includes("admin");
  if (!isAdmin && target.vertriebsleiter_id !== userId) {
    throw new Error("VP liegt nicht in Ihrem Team");
  }

  const { error } = await admin
    .from("vp_hierarchy")
    .update({ commission_rate: data.commissionRate })
    .eq("vp_id", data.vpId);
  if (error) {
    throw new Error(`Provisionssatz konnte nicht aktualisiert werden: ${error.message}`);
  }

  revalidatePath("/team");
  return { ok: true as const };
}

// ──────────────────────────── revokeInvite ────────────────────────────
const revokeInviteInput = z.object({ inviteId: z.string().uuid() });

export async function revokeInvite(input: z.infer<typeof revokeInviteInput>) {
  const { userId } = await requireRole(
    "admin",
    "vertriebsleiter",
    "vp_l1",
    "vp_l2",
    "vp_l3",
  );
  const data = revokeInviteInput.parse(input);
  const admin = createAdminClient();

  // Only delete a pending invite the caller created.
  const { data: deleted, error } = await admin
    .from("invites")
    .delete()
    .eq("id", data.inviteId)
    .eq("invited_by", userId)
    .is("accepted_at", null)
    .select("id");
  if (error) {
    throw new Error(`Einladung konnte nicht zurückgezogen werden: ${error.message}`);
  }
  if (!deleted || deleted.length === 0) {
    throw new Error("Einladung nicht gefunden oder bereits angenommen");
  }

  revalidatePath("/team");
  return { ok: true as const };
}
