"use server";

// Investagon -> Supabase sync action.
//
// Admin/support-only. Pulls all projects + properties from Investagon and
// upserts them into `projekte` / `einheiten`, keyed on `investagon_id`.
// The full raw API object is stored in each row's `raw` jsonb column so no
// data is lost for fields not yet mapped to dedicated columns.
//
// Writes use the service-role admin client (bypasses RLS) because the sync
// touches rows across all tenants. Authorisation is enforced up-front via
// requireRole().
//
// The `investagon_id` / `raw` columns and the `investagon_sync_log` table are
// added by migration 20260612000000_investagon_sync.sql (applied) and present
// in the generated Supabase types, so the client stays fully typed.

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/supabase/types";
import {
  fetchAllProjects,
  fetchAllProperties,
  type InvestagonProject,
  type InvestagonProperty,
} from "@/lib/investagon/client";

type EinheitStatus = Database["public"]["Enums"]["einheit_status"];

/**
 * Best-effort mapping of Investagon `statusName` to our `einheit_status` enum.
 * Falls back to 'verfuegbar' for unknown/empty values.
 */
function mapStatus(statusName?: string | null): EinheitStatus {
  const s = (statusName ?? "").toLowerCase();
  if (/(verkauft|sold)/.test(s)) return "verkauft";
  if (/(notar)/.test(s)) return "notartermin";
  if (/(kaufvertrag|beurkund)/.test(s)) return "kaufvertrag_bestellt";
  if (/(finanzier)/.test(s)) return "in_finanzierung";
  if (/(reserv)/.test(s)) return "reserviert";
  if (/(abgebrochen|storniert|cancel)/.test(s)) return "abgebrochen";
  // "frei", "verfügbar", "available", "aktiv", "gesperrt", ...
  return "verfuegbar";
}

/** Extracts the trailing id segment from an IRI like "/api/api_projects/abc". */
function iriToId(iri?: string | null): string | null {
  if (!iri) return null;
  const trimmed = iri.replace(/\/+$/, "");
  const seg = trimmed.split("/").pop();
  return seg ? decodeURIComponent(seg) : null;
}

/** Build a single-line German address string from Investagon address parts. */
function buildAdresse(p: InvestagonProperty): string {
  const street = [p.object_street, p.object_house_number]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim();
  const parts = [
    street,
    [p.object_postal_code, p.object_city]
      .filter((x) => x != null && String(x).trim() !== "")
      .join(" ")
      .trim(),
  ].filter((x) => x !== "");
  // `adresse` is NOT NULL in projekte; guarantee a non-empty fallback.
  return parts.join(", ") || `Investagon ${p.id}`;
}

export interface SyncResult {
  projects: number;
  properties: number;
}

/**
 * Runs a full (or incremental) Investagon sync. Admin/support only.
 * Records a row in `investagon_sync_log` with counts + status.
 */
export async function syncInvestagon(input?: {
  updatedAfter?: string;
}): Promise<SyncResult> {
  await requireRole("admin", "support");

  const admin = createAdminClient();
  const db = admin;

  // 1) Open a sync-log row.
  let logId: string | null = null;
  try {
    const { data: logRow } = await db
      .from("investagon_sync_log")
      .insert({ status: "running" })
      .select("id")
      .maybeSingle();
    logId = (logRow as { id: string } | null)?.id ?? null;
  } catch {
    // If the log table doesn't exist yet (migration unapplied) we still run
    // the sync; logId just stays null.
    logId = null;
  }

  let projectsSynced = 0;
  let propertiesSynced = 0;

  try {
    // 2) Projects -> projekte
    const projects: InvestagonProject[] = await fetchAllProjects(
      input?.updatedAfter,
    );

    if (projects.length > 0) {
      const projektRows = projects.map((p) => ({
        investagon_id: p.id,
        name: p.name ?? null,
        // `adresse` is NOT NULL; projects carry no address, so keep a stable
        // placeholder. Real addresses live on the linked einheiten/properties.
        adresse: p.name?.trim() ? p.name : `Investagon-Projekt ${p.id}`,
        raw: p as unknown as Json,
      }));

      const { error } = await admin
        .from("projekte")
        .upsert(projektRows, { onConflict: "investagon_id" });
      if (error) throw new Error(`projekte upsert: ${error.message}`);
      projectsSynced = projektRows.length;
    }

    // Build investagon_id -> projekte.id lookup for linking properties.
    const projectInvestagonIds = projects.map((p) => p.id);
    const projektIdByInvestagonId = new Map<string, string>();
    if (projectInvestagonIds.length > 0) {
      const { data: projektLookup, error: lookupErr } = await db
        .from("projekte")
        .select("id, investagon_id")
        .in("investagon_id", projectInvestagonIds);
      if (lookupErr) throw new Error(`projekte lookup: ${lookupErr.message}`);
      for (const row of (projektLookup ?? []) as Array<{
        id: string;
        investagon_id: string | null;
      }>) {
        if (row.investagon_id) {
          projektIdByInvestagonId.set(row.investagon_id, row.id);
        }
      }
    }

    // 3) Properties -> einheiten
    const properties: InvestagonProperty[] = await fetchAllProperties(
      input?.updatedAfter,
    );

    // Resolve any property whose parent project we don't yet have in the map
    // (e.g. incremental sync where the project wasn't in this batch).
    const missingProjectIds = new Set<string>();
    for (const prop of properties) {
      const projInvId = iriToId(prop.project);
      if (projInvId && !projektIdByInvestagonId.has(projInvId)) {
        missingProjectIds.add(projInvId);
      }
    }
    if (missingProjectIds.size > 0) {
      const { data: extra } = await db
        .from("projekte")
        .select("id, investagon_id")
        .in("investagon_id", [...missingProjectIds]);
      for (const row of (extra ?? []) as Array<{
        id: string;
        investagon_id: string | null;
      }>) {
        if (row.investagon_id) {
          projektIdByInvestagonId.set(row.investagon_id, row.id);
        }
      }
    }

    const einheitRows = properties
      .map((prop) => {
        const projInvId = iriToId(prop.project);
        if (!projInvId) return null;
        const projektId = projektIdByInvestagonId.get(projInvId);
        if (!projektId) {
          // Can't link to a parent projekt -> skip (FK is NOT NULL).
          return null;
        }
        const wohnungsnummer =
          (prop.object_apartment_number != null &&
          String(prop.object_apartment_number).trim() !== ""
            ? String(prop.object_apartment_number)
            : null) ?? prop.id;

        return {
          investagon_id: prop.id,
          projekt_id: projektId,
          wohnungsnummer,
          status: mapStatus(prop.statusName),
          // Address parts have no dedicated einheiten columns; preserved in raw.
          raw: prop as unknown as Json,
          _adresse: buildAdresse(prop),
          _projInvId: projInvId,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (einheitRows.length > 0) {
      const payload = einheitRows.map(
        ({ _adresse: _a, _projInvId: _p, ...row }) => row,
      );
      const { error } = await admin
        .from("einheiten")
        .upsert(payload, { onConflict: "investagon_id" });
      if (error) throw new Error(`einheiten upsert: ${error.message}`);
      propertiesSynced = payload.length;

      // Best-effort: enrich each parent projekt with the property's address
      // (projects carry no address of their own in Investagon).
      const adresseByProjektId = new Map<string, string>();
      for (const r of einheitRows) {
        const pid = projektIdByInvestagonId.get(r._projInvId);
        if (pid && !adresseByProjektId.has(pid)) {
          adresseByProjektId.set(pid, r._adresse);
        }
      }
      for (const [pid, adresse] of adresseByProjektId) {
        await db
          .from("projekte")
          .update({ adresse })
          .eq("id", pid)
          .or(`adresse.is.null,adresse.like.Investagon-Projekt %`);
      }
    }

    // 4) Close the log row (success).
    if (logId) {
      await db
        .from("investagon_sync_log")
        .update({
          finished_at: new Date().toISOString(),
          projects_synced: projectsSynced,
          properties_synced: propertiesSynced,
          status: "success",
        })
        .eq("id", logId);
    }

    return { projects: projectsSynced, properties: propertiesSynced };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (logId) {
      await db
        .from("investagon_sync_log")
        .update({
          finished_at: new Date().toISOString(),
          projects_synced: projectsSynced,
          properties_synced: propertiesSynced,
          status: "error",
          error: message,
        })
        .eq("id", logId);
    }
    throw new Error(`Investagon sync failed: ${message}`);
  }
}
