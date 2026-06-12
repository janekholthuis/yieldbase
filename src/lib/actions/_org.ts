import "server-only";

// Shared helper for org-isolated writes.
//
// Per-org data isolation is enforced by RESTRICTIVE RLS (a row is only visible
// when `organisation_id = current_org_id()`, i.e. the caller's
// `profiles.active_organisation_id`). A BEFORE INSERT trigger defaults
// `organisation_id` to the caller's active org — but it relies on `auth.uid()`,
// which is NULL when an action writes via the service-role admin client.
//
// Admin-client inserts must therefore set `organisation_id` explicitly. Resolve
// it with this helper using the AUTHED cookie client (so it reads the caller's
// own profile under RLS), then include the value in the admin-client payload.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { AppRole } from "@/lib/auth";

type AuthedClient = SupabaseClient<Database>;

/**
 * The caller's active organisation id, or null if none is set.
 *
 * Always read via the AUTHED `session.supabase` (not the admin client) so the
 * lookup is the caller's own `profiles.active_organisation_id`. Never throws —
 * callers decide how to treat a null result (e.g. `assertOrgAccess` denies
 * access, `createProjekt` rejects the write).
 */
export async function activeOrgId(
  supabase: AuthedClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("active_organisation_id")
    .eq("id", userId)
    .maybeSingle();
  return data?.active_organisation_id ?? null;
}

/** Minimal session shape an org guard needs (subset of `SessionUser`). */
export type OrgGuardSession = {
  supabase: AuthedClient;
  userId: string;
  roles: AppRole[];
};

/**
 * Enforce per-org access before an admin-client (RLS-bypassing) write.
 *
 * Admin-client writes succeed regardless of RLS, so the org isolation that
 * protects the authed client is NOT applied automatically — every such write
 * must gate on this helper.
 *
 * Mirrors the `assertCanManageKunde` convention: platform-level `admin`/`support`
 * have cross-org access, everyone else is restricted to their active org. A
 * target row with no `organisation_id` (orphaned/legacy) is only touchable by
 * admin/support. Throws "FORBIDDEN" when access is denied.
 */
export async function assertOrgAccess(
  session: OrgGuardSession,
  targetOrgId: string | null,
): Promise<void> {
  if (session.roles.includes("admin") || session.roles.includes("support")) {
    return;
  }
  const myOrg = await activeOrgId(session.supabase, session.userId);
  if (!myOrg || targetOrgId !== myOrg) {
    throw new Error("FORBIDDEN");
  }
}
