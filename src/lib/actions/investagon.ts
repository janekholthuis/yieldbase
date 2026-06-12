"use server";

// Investagon -> Supabase sync action (admin/support only).
//
// Thin wrapper around the framework-agnostic core in
// `@/lib/investagon/sync-core` (shared with scripts/seed-investagon.ts).
// Writes use the service-role admin client (bypasses RLS) because the sync
// touches rows across all tenants; authorisation is enforced up-front.

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInvestagonSync } from "@/lib/investagon/sync-core";

export async function syncInvestagon(input?: {
  organisationId?: string;
  updatedAfter?: string;
}): Promise<{ projects: number; properties: number }> {
  const session = await requireRole("admin", "support");

  // Resolve the target organisation: explicit arg wins, else the caller's
  // active organisation from their profile.
  let organisationId = input?.organisationId ?? null;
  if (!organisationId) {
    const { data: profile } = await session.supabase
      .from("profiles")
      .select("active_organisation_id")
      .eq("id", session.userId)
      .maybeSingle();
    organisationId = profile?.active_organisation_id ?? null;
  }
  if (!organisationId) {
    throw new Error("Keine Organisation ausgewählt.");
  }

  // Load that org's Investagon credentials via the admin client.
  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("id, investagon_org_id, investagon_api_key")
    .eq("id", organisationId)
    .maybeSingle();

  if (!org) {
    throw new Error("Organisation nicht gefunden.");
  }
  if (!org.investagon_org_id || !org.investagon_api_key) {
    throw new Error(
      "Diese Organisation hat keine Investagon-Zugangsdaten hinterlegt.",
    );
  }

  return runInvestagonSync(admin, {
    organisationId: org.id,
    credentials: {
      orgId: org.investagon_org_id,
      apiKey: org.investagon_api_key,
    },
    updatedAfter: input?.updatedAfter,
  });
}
