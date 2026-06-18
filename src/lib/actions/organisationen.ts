"use server";

// Client-invokable server actions for multi-tenant Organisationen: create, brand,
// switch the active org, and manage members. Each action authenticates via
// requireUser()/requireRole() and runs RLS-scoped queries as the signed-in user.
// The SQL helpers is_org_member / is_org_admin back the underlying policies, so
// these actions surface clear errors when RLS blocks a write.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActiveOrg, MyOrganisation } from "@/lib/data/organisationen";
import {
  getActiveOrganisation,
  listMyOrganisations,
} from "@/lib/data/organisationen";

// ───────────── Shared schemas ─────────────
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Farbe muss im Format #RRGGBB sein");

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  primaryColor: hexColor.optional(),
  accentColor: hexColor.optional(),
});

const brandingSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().trim().min(2).max(120).optional(),
  logoUrl: z.string().trim().url().max(2000).optional().nullable(),
  primaryColor: hexColor.optional().nullable(),
  accentColor: hexColor.optional().nullable(),
});

const switchSchema = z.object({ orgId: z.string().uuid() });

const addMemberSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
  rolle: z.enum(["admin", "member"]).optional(),
});

const removeMemberSchema = z.object({
  orgId: z.string().uuid(),
  userId: z.string().uuid(),
});

const addMemberByEmailSchema = z.object({
  orgId: z.string().uuid(),
  email: z.string().trim().email(),
  rolle: z.enum(["admin", "member"]).default("member"),
});

// ───────────── Helpers ─────────────
/** ASCII slugify: lowercase, hyphen-separated, alphanumerics only. */
function slugify(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/ß/g, "ss") // ß → ss
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
  return base || "org";
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

// ───────────── Actions ─────────────

/**
 * Client-callable wrapper around the `server-only` data accessor so that
 * client components (e.g. the OrgSwitcher) can load the user's orgs without
 * importing the server-only data module directly.
 */
export async function getMyOrganisations(): Promise<MyOrganisation[]> {
  return listMyOrganisations();
}

/**
 * Client-callable wrapper returning the user's active organisation (branding +
 * id) or null. Lets the OrgSwitcher mark the active entry without prop drilling.
 */
export async function getActiveOrganisationId(): Promise<string | null> {
  const active = await getActiveOrganisation();
  return active?.id ?? null;
}

/**
 * Create a new organisation, make the caller its owner, and switch to it.
 * Only admins / Vertriebsleiter may create orgs.
 */
export async function createOrganisation(input: {
  name: string;
  primaryColor?: string;
  accentColor?: string;
}): Promise<ActiveOrg> {
  const { name, primaryColor, accentColor } = createSchema.parse(input);
  const { supabase, userId } = await requireRole("admin", "vertriebsleiter");

  // Find a free slug — try the plain slug, then append random suffixes.
  const baseSlug = slugify(name);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;
    const { data: existing, error: lookupErr } = await supabase
      .from("organisationen")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!existing) {
      slug = candidate;
      break;
    }
    if (attempt === 5) slug = `${baseSlug}-${randomSuffix()}`;
  }

  const { data: org, error: insertErr } = await supabase
    .from("organisationen")
    .insert({
      name,
      slug,
      owner_id: userId,
      primary_color: primaryColor ?? null,
      accent_color: accentColor ?? null,
    })
    .select("id,name,slug,logo_url,primary_color,accent_color")
    .single();
  if (insertErr || !org) {
    throw new Error(insertErr?.message ?? "Organisation konnte nicht erstellt werden");
  }

  const { error: memberErr } = await supabase
    .from("organisation_members")
    .insert({ organisation_id: org.id, user_id: userId, rolle: "owner" });
  if (memberErr) throw new Error(memberErr.message);

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ active_organisation_id: org.id })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  revalidatePath("/", "layout");

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color,
    accentColor: org.accent_color,
  };
}

/**
 * Update an org's name / logo / brand colors. RLS (org owner/admin) governs the
 * write; an empty result means the caller is not permitted or the org is gone.
 */
export async function updateOrganisationBranding(input: {
  orgId: string;
  name?: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}): Promise<ActiveOrg> {
  const parsed = brandingSchema.parse(input);
  const { supabase } = await requireUser();

  const patch: {
    name?: string;
    logo_url?: string | null;
    primary_color?: string | null;
    accent_color?: string | null;
  } = {};
  if (parsed.name !== undefined) patch.name = parsed.name;
  if (parsed.logoUrl !== undefined) patch.logo_url = parsed.logoUrl;
  if (parsed.primaryColor !== undefined) patch.primary_color = parsed.primaryColor;
  if (parsed.accentColor !== undefined) patch.accent_color = parsed.accentColor;

  if (Object.keys(patch).length === 0) {
    throw new Error("Keine Änderungen angegeben");
  }

  const { data: org, error } = await supabase
    .from("organisationen")
    .update(patch)
    .eq("id", parsed.orgId)
    .select("id,name,slug,logo_url,primary_color,accent_color")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!org) {
    throw new Error(
      "Organisation nicht gefunden oder keine Berechtigung zum Bearbeiten",
    );
  }

  revalidatePath("/", "layout");

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logo_url,
    primaryColor: org.primary_color,
    accentColor: org.accent_color,
  };
}

/** Set the caller's active organisation. Caller must be a member of the target org. */
export async function switchOrganisation(input: {
  orgId: string;
}): Promise<{ activeOrganisationId: string }> {
  const { orgId } = switchSchema.parse(input);
  const { supabase, userId } = await requireUser();

  const { data: membership, error: memberErr } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (memberErr) throw new Error(memberErr.message);
  if (!membership) throw new Error("FORBIDDEN");

  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ active_organisation_id: orgId })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);

  revalidatePath("/", "layout");

  return { activeOrganisationId: orgId };
}

/**
 * Add (or update the role of) a member in an org. RLS restricts this to org
 * owners/admins. Upserts on the (organisation_id, user_id) PK.
 */
export async function addOrganisationMember(input: {
  orgId: string;
  userId: string;
  rolle?: "admin" | "member";
}): Promise<void> {
  const { orgId, userId, rolle } = addMemberSchema.parse(input);
  const { supabase, userId: callerId } = await requireUser();

  // Defense-in-depth: verify the caller is owner/admin up-front (RLS also
  // enforces this, but an explicit check fails clearly and independently).
  await assertOrgManager(supabase, orgId, callerId);

  const { error } = await supabase
    .from("organisation_members")
    .upsert(
      { organisation_id: orgId, user_id: userId, rolle: rolle ?? "member" },
      { onConflict: "organisation_id,user_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

/** Throws unless `callerId` is owner/admin of `orgId`. */
async function assertOrgManager(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  orgId: string,
  callerId: string,
): Promise<void> {
  const { data: me } = await supabase
    .from("organisation_members")
    .select("rolle")
    .eq("organisation_id", orgId)
    .eq("user_id", callerId)
    .maybeSingle();
  if (!me || (me.rolle !== "owner" && me.rolle !== "admin")) {
    throw new Error("Keine Berechtigung, Mitglieder zu verwalten");
  }
}

/**
 * Add an EXISTING user to the org by their email. For brand-new people (no
 * account yet) use the VP invitation flow (createInvite) instead. The membership
 * insert runs as the caller, so RLS enforces owner/admin; we additionally verify
 * the caller's role up-front so a non-admin never even triggers the email lookup.
 */
export async function addOrgMemberByEmail(input: {
  orgId: string;
  email: string;
  rolle?: "admin" | "member";
}): Promise<{ name: string | null; email: string }> {
  const { orgId, email, rolle } = addMemberByEmailSchema.parse(input);
  const { supabase, userId } = await requireUser();

  // Caller must be owner/admin of this org.
  const { data: me } = await supabase
    .from("organisation_members")
    .select("rolle")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!me || (me.rolle !== "owner" && me.rolle !== "admin")) {
    throw new Error("Keine Berechtigung, Mitglieder hinzuzufügen");
  }

  // Resolve the user by exact email (admin client — profiles aren't broadly
  // RLS-readable). Case-insensitive exact match.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, name, email")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();
  if (!profile) {
    throw new Error(
      "Kein bestehender Nutzer mit dieser E-Mail. Für neue Nutzer die Einladung im Bereich „Mein Team“ verwenden.",
    );
  }
  if (profile.id === userId) {
    throw new Error("Du bist bereits Mitglied dieser Organisation.");
  }

  // Insert membership via the authed client (RLS double-checks owner/admin).
  const { error } = await supabase
    .from("organisation_members")
    .upsert(
      { organisation_id: orgId, user_id: profile.id, rolle },
      { onConflict: "organisation_id,user_id" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return { name: profile.name ?? null, email: profile.email ?? email };
}

/** Remove a member from an org. RLS restricts this to org owners/admins. */
export async function removeOrganisationMember(input: {
  orgId: string;
  userId: string;
}): Promise<void> {
  const { orgId, userId } = removeMemberSchema.parse(input);
  const { supabase, userId: callerId } = await requireUser();

  await assertOrgManager(supabase, orgId, callerId);

  // The org owner must not be removable by an org-admin (would lock them out of
  // their own org without transferring ownership). Only the owner themselves may
  // leave, and that path should go through ownership transfer instead.
  const { data: target } = await supabase
    .from("organisation_members")
    .select("rolle")
    .eq("organisation_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (target?.rolle === "owner") {
    throw new Error("Der Eigentümer der Organisation kann nicht entfernt werden.");
  }

  const { error } = await supabase
    .from("organisation_members")
    .delete()
    .eq("organisation_id", orgId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
