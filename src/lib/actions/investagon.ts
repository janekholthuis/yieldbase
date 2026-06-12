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
import { formatUpdatedAfter } from "@/lib/investagon/client";

/** Resolve the caller's target organisation (explicit arg or active org). */
async function resolveOrganisationId(
  session: Awaited<ReturnType<typeof requireRole>>,
  explicit?: string | null,
): Promise<string> {
  let organisationId = explicit ?? null;
  if (!organisationId) {
    const { data: profile } = await session.supabase
      .from("profiles")
      .select("active_organisation_id")
      .eq("id", session.userId)
      .maybeSingle();
    organisationId = profile?.active_organisation_id ?? null;
  }
  if (!organisationId) throw new Error("Keine Organisation ausgewählt.");
  return organisationId;
}

export interface InvestagonStatus {
  hasCredentials: boolean;
  lastSync: {
    status: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    projectsSynced: number | null;
    propertiesSynced: number | null;
    error: string | null;
  } | null;
}

/**
 * Status for the settings UI: whether the active org has Investagon credentials
 * and the most recent sync-log row. Admin/support only.
 */
export async function getInvestagonStatus(input?: {
  organisationId?: string;
}): Promise<InvestagonStatus> {
  const session = await requireRole("admin", "support");
  const organisationId = await resolveOrganisationId(session, input?.organisationId);

  const admin = createAdminClient();
  const { data: org } = await admin
    .from("organisationen")
    .select("investagon_org_id, investagon_api_key")
    .eq("id", organisationId)
    .maybeSingle();

  const { data: last } = await admin
    .from("investagon_sync_log")
    .select(
      "status, started_at, finished_at, projects_synced, properties_synced, error",
    )
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    hasCredentials: Boolean(org?.investagon_org_id && org?.investagon_api_key),
    lastSync: last
      ? {
          status: last.status,
          startedAt: last.started_at,
          finishedAt: last.finished_at,
          projectsSynced: last.projects_synced,
          propertiesSynced: last.properties_synced,
          error: last.error,
        }
      : null,
  };
}

export async function syncInvestagon(input?: {
  organisationId?: string;
  updatedAfter?: string;
  /**
   * Incremental: only sync entities changed since the last successful sync
   * (with a safety overlap). Use this from the UI — a full backfill of all
   * projects is long and should run via `scripts/seed-investagon.ts`.
   */
  incremental?: boolean;
}): Promise<{
  projects: number;
  properties: number;
  photos: number;
  documents: number;
}> {
  const session = await requireRole("admin", "support");
  const organisationId = await resolveOrganisationId(session, input?.organisationId);

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

  // Derive the incremental cutoff from the last successful sync (1h overlap to
  // avoid missing records updated mid-run).
  let updatedAfter = input?.updatedAfter;
  if (input?.incremental && !updatedAfter) {
    const { data: lastOk } = await admin
      .from("investagon_sync_log")
      .select("finished_at")
      .eq("status", "success")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastOk?.finished_at) {
      const cutoff = new Date(lastOk.finished_at);
      cutoff.setHours(cutoff.getHours() - 1);
      updatedAfter = formatUpdatedAfter(cutoff);
    }
  }

  return runInvestagonSync(admin, {
    organisationId: org.id,
    credentials: {
      orgId: org.investagon_org_id,
      apiKey: org.investagon_api_key,
    },
    updatedAfter,
  });
}
