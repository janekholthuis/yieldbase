// Core Investagon -> Supabase sync logic (framework-agnostic).
//
// Shared by the `syncInvestagon` server action and the standalone seed script
// (`scripts/seed-investagon.ts`). Takes a service-role Supabase client as a
// parameter so callers control auth/elevation. Uses RELATIVE imports only so it
// runs both inside Next and under `tsx` without path-alias config.
//
// IMPORTANT — sample data: the Investagon API exposes only address + status
// (no price / area / rooms / rent). To make the app testable we synthesise
// realistic financials DETERMINISTICALLY (seeded by the entity id) so re-syncs
// are stable. Real API data is always preserved verbatim in each row's `raw`.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/types";
import {
  fetchAllProjects,
  fetchAllProperties,
  type InvestagonCredentials,
  type InvestagonProject,
  type InvestagonProperty,
} from "./client";

type Db = SupabaseClient<Database>;
type EinheitStatus = Database["public"]["Enums"]["einheit_status"];
type ProjektTyp = Database["public"]["Enums"]["projekt_typ"];

export interface SyncResult {
  projects: number;
  properties: number;
}

// ─────────────────────────── mapping helpers ───────────────────────────

function mapStatus(statusName?: string | null): EinheitStatus {
  const s = (statusName ?? "").toLowerCase();
  if (/(verkauft|sold)/.test(s)) return "verkauft";
  if (/(notartermin)/.test(s)) return "notartermin";
  if (/(kaufvertrag|beurkund|notar)/.test(s)) return "notarvorbereitung";
  if (/(reserv|finanzier)/.test(s)) return "reserviert";
  if (/(anfrage|request)/.test(s)) return "auf_anfrage";
  if (/(abgebrochen|storniert|cancel)/.test(s)) return "frei";
  return "frei";
}

function iriToId(iri?: string | null): string | null {
  if (!iri) return null;
  const seg = iri.replace(/\/+$/, "").split("/").pop();
  return seg ? decodeURIComponent(seg) : null;
}

/** `project` may be a string IRI or an embedded object — handle both. */
function resolveProjectInvId(project: InvestagonProperty["project"]): string | null {
  if (!project) return null;
  if (typeof project === "string") return iriToId(project);
  return project.id ?? iriToId(project["@id"] ?? null);
}

function buildAdresse(p: InvestagonProperty): string {
  const street = [p.object_street, p.object_house_number]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim();
  const cityLine = [p.object_postal_code, p.object_city]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim();
  return [street, cityLine].filter((x) => x !== "").join(", ") || `Investagon ${p.id}`;
}

// ─────────────────────── deterministic sample data ─────────────────────
// Real Investagon data has no financials; we synthesise stable, plausible
// values seeded by the entity id so every sync yields the same numbers.

function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const f = (rng: () => number, min: number, max: number) => min + rng() * (max - min);
const i = (rng: () => number, min: number, max: number) => Math.floor(f(rng, min, max + 1));
const round = (n: number, step: number) => Math.round(n / step) * step;

const BAUTRAEGER = [
  "Imvesto Investment- und Beteiligungs GmbH",
  "DSK Deutsche Stadt- und Grundstücksentwicklung",
  "Pandion AG",
  "Instone Real Estate",
  "Quarterback Immobilien AG",
  "Bauwens GmbH & Co. KG",
];

function sampleEinheit(seedId: string, statusName?: string | null) {
  const rng = seededRng("einheit:" + seedId);
  const wohnflaeche = round(f(rng, 32, 118), 0.5);
  const zimmer = i(rng, 1, 4);
  const etage = i(rng, 0, 6);
  const pricePerSqm = f(rng, 2600, 5800);
  const kaufpreis = round(wohnflaeche * pricePerSqm, 1000);
  const rentPerSqm = f(rng, 7.5, 13.5);
  const miete = round(wohnflaeche * rentPerSqm, 5);
  const verkauft = /(verkauft|sold)/.test((statusName ?? "").toLowerCase());
  return {
    wohnflaeche,
    zimmer,
    etage,
    kaufpreis,
    miete,
    vermietet: rng() > 0.3,
    balkon: rng() > 0.4,
    keller: rng() > 0.45,
    aufzug: etage >= 3 || rng() > 0.7,
    afa_satz: rng() > 0.5 ? 2.0 : 2.5,
    _verkauft: verkauft,
  };
}

function sampleProjekt(seedId: string) {
  const rng = seededRng("projekt:" + seedId);
  return {
    baujahr: i(rng, 1958, 2023),
    projekt_typ: (rng() > 0.45 ? "mfh" : "etw_einzeln") as ProjektTyp,
    bautraeger: BAUTRAEGER[i(rng, 0, BAUTRAEGER.length - 1)],
    mietrendite_brutto: Number(f(rng, 3.1, 5.4).toFixed(1)),
  };
}

// ───────────────────────── concurrency helper ──────────────────────────

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) || 0 }, worker),
  );
  return results;
}

// ─────────────────────────────── sync ──────────────────────────────────

export async function runInvestagonSync(
  db: Db,
  opts: {
    organisationId: string;
    credentials: InvestagonCredentials;
    updatedAfter?: string;
    log?: (msg: string) => void;
    concurrency?: number;
  },
): Promise<SyncResult> {
  const log = opts.log ?? (() => {});
  const concurrency = opts.concurrency ?? 8;
  const { organisationId, credentials } = opts;

  // 1) Open sync-log row.
  let logId: string | null = null;
  {
    const { data } = await db
      .from("investagon_sync_log")
      .insert({ status: "running" })
      .select("id")
      .maybeSingle();
    logId = data?.id ?? null;
  }

  let projectsSynced = 0;
  let propertiesSynced = 0;

  try {
    // 2) Projects -> projekte (+ sample fields).
    const projects: InvestagonProject[] = await fetchAllProjects(
      credentials,
      opts.updatedAfter,
    );
    log(`fetched ${projects.length} projects`);

    if (projects.length > 0) {
      const projektRows = projects.map((p) => {
        const s = sampleProjekt(p.id);
        return {
          investagon_id: p.id,
          organisation_id: organisationId,
          name: p.name ?? null,
          adresse: p.name?.trim() ? p.name : `Investagon-Projekt ${p.id}`,
          baujahr: s.baujahr,
          projekt_typ: s.projekt_typ,
          bautraeger: s.bautraeger,
          mietrendite_brutto: s.mietrendite_brutto,
          raw: p as unknown as Json,
        };
      });
      const { error } = await db
        .from("projekte")
        .upsert(projektRows, { onConflict: "investagon_id" });
      if (error) throw new Error(`projekte upsert: ${error.message}`);
      projectsSynced = projektRows.length;
    }

    // Build investagon_id -> projekte.id lookup.
    const projektIdByInvId = new Map<string, string>();
    if (projects.length > 0) {
      const { data, error } = await db
        .from("projekte")
        .select("id, investagon_id")
        .in("investagon_id", projects.map((p) => p.id));
      if (error) throw new Error(`projekte lookup: ${error.message}`);
      for (const row of data ?? []) {
        if (row.investagon_id) projektIdByInvId.set(row.investagon_id, row.id);
      }
    }

    // 3) Properties -> einheiten. Fetch PER PROJECT (the filtered endpoint is
    //    fast; the unfiltered collection times out). Limited concurrency.
    const perProject = await mapPool(projects, concurrency, async (p) => {
      try {
        return await fetchAllProperties(credentials, opts.updatedAfter, p.id);
      } catch (e) {
        log(`properties fetch failed for project ${p.id}: ${(e as Error).message}`);
        return [] as InvestagonProperty[];
      }
    });
    const properties = perProject.flat();
    log(`fetched ${properties.length} properties across ${projects.length} projects`);

    // Address enrichment: projects carry no address, properties do. Use each
    // project's first property to fill stadt/plz/adresse.
    const projektAddr = new Map<
      string,
      { adresse: string; stadt: string | null; plz: string | null }
    >();

    const einheitRows = properties
      .map((prop) => {
        const projInvId = resolveProjectInvId(prop.project);
        if (!projInvId) return null;
        const projektId = projektIdByInvId.get(projInvId);
        if (!projektId) return null;

        if (!projektAddr.has(projektId)) {
          projektAddr.set(projektId, {
            adresse: buildAdresse(prop),
            stadt: prop.object_city ?? null,
            plz: prop.object_postal_code ?? null,
          });
        }

        const wohnungsnummer =
          prop.object_apartment_number != null &&
          String(prop.object_apartment_number).trim() !== ""
            ? String(prop.object_apartment_number)
            : prop.id;
        const s = sampleEinheit(prop.id, prop.statusName);

        return {
          investagon_id: prop.id,
          organisation_id: organisationId,
          projekt_id: projektId,
          wohnungsnummer,
          status: mapStatus(prop.statusName),
          wohnflaeche: s.wohnflaeche,
          zimmer: s.zimmer,
          etage: s.etage,
          kaufpreis: s.kaufpreis,
          miete: s.miete,
          vermietet: s.vermietet,
          balkon: s.balkon,
          keller: s.keller,
          aufzug: s.aufzug,
          afa_satz: s.afa_satz,
          raw: prop as unknown as Json,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (einheitRows.length > 0) {
      // Upsert in chunks to keep payloads reasonable.
      const CHUNK = 500;
      for (let c = 0; c < einheitRows.length; c += CHUNK) {
        const { error } = await db
          .from("einheiten")
          .upsert(einheitRows.slice(c, c + CHUNK), { onConflict: "investagon_id" });
        if (error) throw new Error(`einheiten upsert: ${error.message}`);
      }
      propertiesSynced = einheitRows.length;

      // Enrich each parent projekt with a real address from its properties.
      for (const [projektId, addr] of projektAddr) {
        await db
          .from("projekte")
          .update({ adresse: addr.adresse, stadt: addr.stadt, plz: addr.plz })
          .eq("id", projektId);
      }
    }

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
