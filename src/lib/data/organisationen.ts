// Server-side data access for Organisationen (multi-tenant orgs).
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Members can SELECT their orgs; the SQL
// helpers is_org_member / is_org_admin back the policies.
import "server-only";
import { unstable_cache } from "next/cache";
import { getSessionUser, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import type { EntitlementOverrides } from "@/lib/entitlements";

type OrganisationRow = Database["public"]["Tables"]["organisationen"]["Row"];
type MemberRolle = "owner" | "admin" | "member";

/** Branding fields for the currently active org, consumed by the root layout. */
export interface ActiveOrg {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  /** PROJ-31: per-org feature overrides (raw jsonb). Resolve via resolveEntitlements(). */
  entitlements: EntitlementOverrides;
}

export interface MyOrganisation {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  rolle: MemberRolle;
}

export interface OrganisationMember {
  userId: string;
  name: string | null;
  email: string | null;
  rolle: MemberRolle;
}

const BRANDING_SELECT =
  "id,name,slug,logo_url,primary_color,accent_color,entitlements";

/**
 * Cross-request cached branding for a single org. Branding is non-secret and
 * changes rarely (org setup), so it is read with the service client (sidestepping
 * the heavy organisationen RLS on the hot path) and shared across all users of the
 * org. TTL-based freshness: a branding edit self-heals within 60s; the settings UI
 * shows the new values immediately from updateOrganisationBranding's return value,
 * so only the global layout chrome lags by at most the TTL.
 */
function getOrgBrandingCached(orgId: string): Promise<ActiveOrg | null> {
  return unstable_cache(
    async (): Promise<ActiveOrg | null> => {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("organisationen")
        .select(BRANDING_SELECT)
        .eq("id", orgId)
        .maybeSingle();
      if (error || !data) return null;
      return toActiveOrg(data);
    },
    ["org-branding", orgId],
    { revalidate: 60 },
  )();
}

function toActiveOrg(
  row: Pick<
    OrganisationRow,
    | "id"
    | "name"
    | "slug"
    | "logo_url"
    | "primary_color"
    | "accent_color"
    | "entitlements"
  >,
): ActiveOrg {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    entitlements: toEntitlementOverrides(row.entitlements),
  };
}

/** Narrow the jsonb column to the override map; tolerate null/garbage shapes. */
function toEntitlementOverrides(value: unknown): EntitlementOverrides {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as EntitlementOverrides;
  }
  return {};
}

/**
 * Branding of the current user's active organisation, or null.
 * Robust by design: runs in the root layout and must never throw — any error,
 * missing session, or absent active org resolves to null.
 */
export async function getActiveOrganisation(): Promise<ActiveOrg | null> {
  try {
    const session = await getSessionUser();
    if (!session) return null;
    const { userId } = session;

    // Resolve which org is active for this user. Self-scoped read by the
    // already-authenticated userId via the service client — keeps the heavy
    // profiles RLS policy off the per-request hot path. Reads only the user's
    // own active_organisation_id, so no data crosses tenant boundaries.
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("active_organisation_id")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile?.active_organisation_id) return null;

    // Branding itself is served from the cross-request cache (warm = no DB).
    return await getOrgBrandingCached(profile.active_organisation_id);
  } catch {
    return null;
  }
}

/** Cross-request cached org branding looked up by custom domain (host). */
function getOrgByDomainCached(domain: string): Promise<ActiveOrg | null> {
  return unstable_cache(
    async (): Promise<ActiveOrg | null> => {
      const admin = createAdminClient();
      const { data } = await admin
        .from("organisationen")
        .select(BRANDING_SELECT)
        .eq("domain", domain)
        .maybeSingle();
      return data ? toActiveOrg(data) : null;
    },
    ["org-by-domain", domain],
    { revalidate: 60 },
  )();
}

/**
 * Resolve the org that owns the request's Host (custom domain) — or null for the
 * neutral canonical Vercel URL / localhost. Works WITHOUT a session, so the public
 * login/marketing surface on a custom domain is already org-branded (PROJ-30).
 * `www.` is normalised; ports are stripped.
 */
export async function resolveOrgForHost(host: string | null): Promise<ActiveOrg | null> {
  if (!host) return null;
  let h = host.split(":")[0].trim().toLowerCase();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h.endsWith(".vercel.app")) {
    return null;
  }
  if (h.startsWith("www.")) h = h.slice(4);
  return getOrgByDomainCached(h);
}

/**
 * Pin the signed-in user's active organisation to the org that owns the request
 * Host (custom domain), so data scoping (RLS `current_org_id()` reads
 * `active_organisation_id`) follows the domain — not just branding (PROJ-30).
 *
 * Safe by construction: only ever switches to an org the user is **a member of**
 * (non-members are untouched — never breaks their scoping), only writes on an
 * actual mismatch, self-scoped to the user's own profile row, and never throws.
 */
export async function alignActiveOrgToHost(host: string | null): Promise<void> {
  try {
    const hostOrg = await resolveOrgForHost(host);
    if (!hostOrg) return; // neutral domain — leave the user's active org as-is
    const session = await getSessionUser();
    if (!session) return;

    const admin = createAdminClient();
    const [memRes, profRes] = await Promise.all([
      admin
        .from("organisation_members")
        .select("organisation_id")
        .eq("organisation_id", hostOrg.id)
        .eq("user_id", session.userId)
        .maybeSingle(),
      admin
        .from("profiles")
        .select("active_organisation_id")
        .eq("id", session.userId)
        .maybeSingle(),
    ]);

    if (!memRes.data) return; // not a member of the host org → never re-scope
    if (profRes.data?.active_organisation_id === hostOrg.id) return; // already aligned

    await admin
      .from("profiles")
      .update({ active_organisation_id: hostOrg.id })
      .eq("id", session.userId);
  } catch {
    /* org alignment must never break the app */
  }
}

/** Organisations the current user is a member of, with their role, ordered by name. */
export async function listMyOrganisations(): Promise<MyOrganisation[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("organisation_members")
    .select(
      "rolle,organisationen!inner(id,name,slug,logo_url,primary_color,accent_color,entitlements)",
    )
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    rolle: string;
    organisationen: Pick<
      OrganisationRow,
      | "id"
      | "name"
      | "slug"
      | "logo_url"
      | "primary_color"
      | "accent_color"
      | "entitlements"
    > | null;
  }>;

  return rows
    .filter((r) => r.organisationen !== null)
    .map((r) => {
      const org = r.organisationen!;
      return {
        ...toActiveOrg(org),
        rolle: r.rolle as MemberRolle,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Members of an org joined with their profile. RLS requires the caller be a member. */
export async function listOrganisationMembers(
  orgId: string,
): Promise<OrganisationMember[]> {
  const { supabase } = await requireUser();

  const { data, error } = await supabase
    .from("organisation_members")
    .select("user_id,rolle,profiles!inner(name,email)")
    .eq("organisation_id", orgId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    user_id: string;
    rolle: string;
    profiles: { name: string | null; email: string | null } | null;
  }>;

  return rows
    .map((r) => ({
      userId: r.user_id,
      name: r.profiles?.name ?? null,
      email: r.profiles?.email ?? null,
      rolle: r.rolle as MemberRolle,
    }))
    .sort((a, b) =>
      (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "", "de"),
    );
}
