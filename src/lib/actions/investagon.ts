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
  updatedAfter?: string;
}): Promise<{ projects: number; properties: number }> {
  await requireRole("admin", "support");
  return runInvestagonSync(createAdminClient(), {
    updatedAfter: input?.updatedAfter,
  });
}
