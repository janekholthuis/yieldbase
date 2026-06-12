// Server-side data access for Organisationen (multi-tenant orgs).
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Members can SELECT their orgs; the SQL
// helpers is_org_member / is_org_admin back the policies.
import "server-only";
import { getSessionUser, requireUser } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";

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

const BRANDING_SELECT = "id,name,slug,logo_url,primary_color,accent_color";

function toActiveOrg(
  row: Pick<
    OrganisationRow,
    "id" | "name" | "slug" | "logo_url" | "primary_color" | "accent_color"
  >,
): ActiveOrg {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
  };
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
    const { supabase, userId } = session;

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("active_organisation_id")
      .eq("id", userId)
      .maybeSingle();
    if (profileErr || !profile?.active_organisation_id) return null;

    const { data: org, error: orgErr } = await supabase
      .from("organisationen")
      .select(BRANDING_SELECT)
      .eq("id", profile.active_organisation_id)
      .maybeSingle();
    if (orgErr || !org) return null;

    return toActiveOrg(org);
  } catch {
    return null;
  }
}

/** Organisations the current user is a member of, with their role, ordered by name. */
export async function listMyOrganisations(): Promise<MyOrganisation[]> {
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("organisation_members")
    .select(
      "rolle,organisationen!inner(id,name,slug,logo_url,primary_color,accent_color)",
    )
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    rolle: string;
    organisationen: Pick<
      OrganisationRow,
      "id" | "name" | "slug" | "logo_url" | "primary_color" | "accent_color"
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
