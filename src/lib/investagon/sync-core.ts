// Core Investagon -> Supabase sync logic (framework-agnostic).
//
// Shared by the `syncInvestagon` server action and the standalone seed script
// (`scripts/seed-investagon.ts`). Takes a service-role Supabase client as a
// parameter so callers control auth/elevation. Uses RELATIVE imports only so it
// runs both inside Next and under `tsx` without path-alias config.
//
// REAL DATA: the thin ApiProject/ApiProperty list endpoints only expose address
// + status, but the FULL resources (GET /api/projects/{id}, /api/properties/{id})
// carry the real financials, structure, photos and files. This sync enumerates
// via the list endpoints and then fetches the full resource per entity, mapping
// the real values into dedicated columns. The complete raw payload is preserved
// in each row's `raw` jsonb so nothing is lost.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../supabase/types";
import {
  fetchAllProjects,
  fetchAllProperties,
  fetchFullProject,
  fetchFullProperty,
  type InvestagonCredentials,
  type InvestagonFile,
  type InvestagonFullProject,
  type InvestagonFullProperty,
  type InvestagonPhoto,
  type InvestagonProperty,
} from "./client";

type Db = SupabaseClient<Database>;
type EinheitStatus = Database["public"]["Enums"]["einheit_status"];
type Objektzustand = Database["public"]["Enums"]["objektzustand"];
type Nutzungsart = Database["public"]["Enums"]["nutzungsart"];
type DokumentKategorie = Database["public"]["Enums"]["dokument_kategorie"];

export interface SyncResult {
  projects: number;
  properties: number;
  photos: number;
  documents: number;
}

// Investagon serves uploaded media from this host; we scope idempotent deletes
// to it so re-syncs replace synced media without touching manually-added rows.
const INVESTAGON_CDN_PREFIX = "https://tool.investagon.com";

// ─────────────────────────── mapping helpers ───────────────────────────

function mapStatus(statusName?: string | null): EinheitStatus {
  const s = (statusName ?? "").toLowerCase();
  if (/(verkauft|sold)/.test(s)) return "verkauft";
  if (/(notartermin)/.test(s)) return "notartermin";
  if (/(kaufvertrag|beurkund|notar)/.test(s)) return "notarvorbereitung";
  if (/(reserv|finanzier)/.test(s)) return "reserviert";
  if (/(anfrage|request)/.test(s)) return "auf_anfrage";
  return "frei";
}

function mapZustand(propertyKind?: string | null): Objektzustand | null {
  const s = (propertyKind ?? "").toLowerCase();
  if (/neubau|new/.test(s)) return "neubau";
  if (/bestand|existing/.test(s)) return "bestand";
  return null;
}

function mapNutzung(propertyUsage?: string | null): Nutzungsart {
  const s = (propertyUsage ?? "").toLowerCase();
  if (/gewerbe|commercial|büro|buro|office|laden|retail/.test(s)) return "gewerbe";
  return "wohnen";
}

function mapDokumentKategorie(title?: string | null): DokumentKategorie {
  const s = (title ?? "").toLowerCase();
  if (/grundriss|floor.?plan/.test(s)) return "grundriss";
  if (/expos/.test(s)) return "expose";
  if (/energ/.test(s)) return "energieausweis";
  if (/teilungs/.test(s)) return "teilungserklaerung";
  if (/mietvertr/.test(s)) return "mietvertrag";
  if (/kaufvertr|notar/.test(s)) return "kaufvertrag";
  if (/wirtschaftsplan/.test(s)) return "wirtschaftsplan";
  if (/protokoll|eigent[üu]merversamm/.test(s)) return "protokoll_eigentuemerversammlung";
  return "sonstiges";
}

/** "rented" → true, "vacant"/"leer" → false, otherwise false. */
function mapVermietet(rentStatus?: string | null): boolean {
  const s = (rentStatus ?? "").toLowerCase();
  if (/rent|vermiet/.test(s)) return true;
  return false;
}

/** German yes/no string → boolean (null if undecidable). */
function germanBool(value?: string | null): boolean | null {
  const s = (value ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/^(ja|yes|true|1|vorhanden)/.test(s)) return true;
  if (/^(nein|no|false|0|kein)/.test(s)) return false;
  return null;
}

/** Parse a floor label ("EG"→0, "2.OG rechts"→2, "1. Etage"→1) to a number. */
function parseEtage(floor?: string | null): number | null {
  const s = (floor ?? "").trim().toLowerCase();
  if (!s) return null;
  if (/(^|\b)(eg|erdgeschoss)\b/.test(s)) return 0;
  const m = s.match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function toInt(value?: string | number | null): number | null {
  if (value == null) return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

function num(value?: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isoDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function buildAdresse(p: InvestagonFullProperty): string {
  const street = [p.object_street, p.object_house_number]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim();
  const cityLine = [p.object_postal_code, p.object_city]
    .filter((x) => x != null && String(x).trim() !== "")
    .join(" ")
    .trim();
  return (
    [street, cityLine].filter((x) => x !== "").join(", ") ||
    `Investagon ${p.api_property_id ?? ""}`.trim()
  );
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

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ───────────────────────────── media sync ──────────────────────────────

type BildRow = Database["public"]["Tables"]["objekt_bilder"]["Insert"];
type DokRow = Database["public"]["Tables"]["objekt_dokumente"]["Insert"];

function photoRows(
  photos: InvestagonPhoto[] | null | undefined,
  link: { projektId?: string; einheitId?: string },
): BildRow[] {
  const ebene = link.einheitId ? "einheit" : "projekt";
  return (photos ?? [])
    .filter((p) => typeof p.filename === "string" && p.filename.startsWith("http"))
    .map((p, i) => ({
      url: p.filename as string,
      public_url: p.filename as string,
      ebene,
      projekt_id: link.projektId ?? null,
      einheit_id: link.einheitId ?? null,
      sort_order: p.position ?? i,
      is_cover: ebene === "projekt" && i === 0,
      alt: p.original_filename ?? null,
    }));
}

function fileRows(
  files: InvestagonFile[] | null | undefined,
  link: { projektId?: string; einheitId?: string },
): DokRow[] {
  const ebene = link.einheitId ? "einheit" : "projekt";
  return (files ?? [])
    .filter((f) => typeof f.filename === "string" && f.filename.startsWith("http"))
    .map((f, i) => ({
      url: f.filename as string,
      dateiname: (f.title ?? f.filename ?? "Dokument") as string,
      kategorie: mapDokumentKategorie(f.title),
      ebene,
      projekt_id: link.projektId ?? null,
      einheit_id: link.einheitId ?? null,
      sort_order: f.position ?? i,
    }));
}

// ─────────────────────────────── sync ──────────────────────────────────

export async function runInvestagonSync(
  db: Db,
  opts: {
    organisationId: string;
    credentials: InvestagonCredentials;
    updatedAfter?: string;
    /** Cap the number of projects processed (testing / partial syncs). */
    projectLimit?: number;
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
  let photosSynced = 0;
  let documentsSynced = 0;

  try {
    // 2) Enumerate projects (thin list), then fetch the FULL project per id.
    let projects = await fetchAllProjects(credentials, opts.updatedAfter);
    if (opts.projectLimit != null) projects = projects.slice(0, opts.projectLimit);
    log(`enumerated ${projects.length} projects`);

    const fullProjects = await mapPool(projects, concurrency, async (p) => {
      try {
        return await fetchFullProject(credentials, p.id);
      } catch (e) {
        log(`full project fetch failed for ${p.id}: ${(e as Error).message}`);
        return null;
      }
    });

    // Upsert projekte from real fields. `adresse` is enriched later from the
    // first property (projects carry no address).
    const projektRows = projects
      .map((p, idx) => {
        const fp = fullProjects[idx];
        const name = (fp?.name ?? p.name ?? null) || null;
        const coverPhoto = (fp?.photos ?? []).find(
          (ph) => typeof ph.filename === "string" && ph.filename.startsWith("http"),
        );
        return {
          investagon_id: p.id,
          organisation_id: organisationId,
          name,
          adresse: name?.trim() ? name : `Investagon-Projekt ${p.id}`,
          baujahr: toInt(fp?.object_building_year),
          bautraeger: fp?.object_operator_name ?? null,
          cover_image_url: coverPhoto?.filename ?? null,
          raw: (fp ?? p) as unknown as Json,
        };
      });
    if (projektRows.length > 0) {
      const { error } = await db
        .from("projekte")
        .upsert(projektRows, { onConflict: "investagon_id" });
      if (error) throw new Error(`projekte upsert: ${error.message}`);
      projectsSynced = projektRows.length;
    }

    // investagon_id -> projekte.id lookup.
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

    // 3) Enumerate properties per project (thin list, fast & reliable), then
    //    fetch the FULL property per id to get the real financials/structure.
    const perProjectLists = await mapPool(projects, concurrency, async (p) => {
      try {
        const list = await fetchAllProperties(credentials, opts.updatedAfter, p.id);
        return list.map((ap: InvestagonProperty) => ({
          projInvId: p.id,
          apId: ap.id,
          statusName: ap.statusName ?? null,
        }));
      } catch (e) {
        log(`property list failed for project ${p.id}: ${(e as Error).message}`);
        return [] as { projInvId: string; apId: string; statusName: string | null }[];
      }
    });
    const apiProps = perProjectLists.flat();
    log(`enumerated ${apiProps.length} properties; fetching full records…`);

    const fullProps = await mapPool(apiProps, concurrency, async (ref) => {
      try {
        const fp = await fetchFullProperty(credentials, ref.apId);
        return { ref, fp };
      } catch (e) {
        log(`full property fetch failed for ${ref.apId}: ${(e as Error).message}`);
        return { ref, fp: null as InvestagonFullProperty | null };
      }
    });

    // Best-effort project address/coords enrichment from the first property.
    const projektEnrich = new Map<
      string,
      {
        adresse: string;
        stadt: string | null;
        plz: string | null;
        bundesland: string | null;
        lat: number | null;
        lng: number | null;
      }
    >();

    const einheitRows = fullProps
      .map(({ ref, fp }) => {
        if (!fp) return null;
        const projektId = projektIdByInvId.get(ref.projInvId);
        if (!projektId) return null;

        if (!projektEnrich.has(projektId)) {
          projektEnrich.set(projektId, {
            adresse: buildAdresse(fp),
            stadt: fp.object_city ?? null,
            plz: fp.object_postal_code ?? null,
            bundesland: fp.province ?? null,
            lat: num(fp.lat),
            lng: num(fp.lng),
          });
        }

        const wohnungsnummer =
          fp.object_apartment_number != null &&
          String(fp.object_apartment_number).trim() !== ""
            ? String(fp.object_apartment_number)
            : ref.apId;

        const parkingPrice = num(fp.purchase_price_parking);

        return {
          investagon_id: ref.apId,
          organisation_id: organisationId,
          projekt_id: projektId,
          wohnungsnummer,
          status: mapStatus(fp.statusName ?? ref.statusName),
          wohnflaeche: num(fp.object_size),
          zimmer: num(fp.object_rooms),
          etage: parseEtage(fp.object_floor),
          kaufpreis: num(fp.purchase_price_apartment),
          stellplatz_preis: parkingPrice,
          stellplaetze_anzahl: parkingPrice && parkingPrice > 0 ? 1 : 0,
          miete: num(fp.rent_apartment_month),
          balkon: germanBool(fp.object_balcony) ?? false,
          vermietet: mapVermietet(fp.rent_status),
          vermietet_seit: isoDate(fp.rented_since),
          afa_satz: num(fp.depreciation_rate_building_manual) ?? 2.0,
          energieklasse: fp.energy_efficiency_class
            ? fp.energy_efficiency_class.toUpperCase()
            : null,
          heizungsart: fp.heating_type ?? null,
          objektzustand: mapZustand(fp.property_kind),
          nutzungsart: mapNutzung(fp.property_usage),
          hausgeld_umlagefaehig: num(fp.operation_cost_tenant_apartment),
          hausgeld_nicht_umlagefaehig: num(fp.operation_cost_landlord_apartment),
          instandhaltungsruecklage: num(fp.operation_cost_reserve_apartment),
          miteigentumsanteil:
            fp.object_share_owner != null ? String(fp.object_share_owner) : null,
          raw: fp as unknown as Json,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (einheitRows.length > 0) {
      for (const part of chunk(einheitRows, 500)) {
        const { error } = await db
          .from("einheiten")
          .upsert(part, { onConflict: "investagon_id" });
        if (error) throw new Error(`einheiten upsert: ${error.message}`);
      }
      propertiesSynced = einheitRows.length;

      // Enrich each parent projekt with a real address + coords.
      for (const [projektId, e] of projektEnrich) {
        await db
          .from("projekte")
          .update({
            adresse: e.adresse,
            stadt: e.stadt,
            plz: e.plz,
            bundesland: e.bundesland,
            geo:
              e.lat != null && e.lng != null
                ? ({ lat: e.lat, lng: e.lng } as unknown as Json)
                : null,
          })
          .eq("id", projektId);
      }
    }

    // 4) Media: photos -> objekt_bilder, files -> objekt_dokumente.
    //    Idempotent: replace previously-synced (Investagon CDN) media only.
    const einheitIdByInvId = new Map<string, string>();
    if (einheitRows.length > 0) {
      for (const part of chunk(einheitRows.map((r) => r.investagon_id), 300)) {
        const { data } = await db
          .from("einheiten")
          .select("id, investagon_id")
          .in("investagon_id", part);
        for (const row of data ?? []) {
          if (row.investagon_id) einheitIdByInvId.set(row.investagon_id, row.id);
        }
      }
    }

    const bildRows: BildRow[] = [];
    const dokRows: DokRow[] = [];

    // Project-level media.
    projects.forEach((p, idx) => {
      const fp = fullProjects[idx];
      const projektId = projektIdByInvId.get(p.id);
      if (!fp || !projektId) return;
      bildRows.push(...photoRows(fp.photos, { projektId }));
      dokRows.push(...fileRows(fp.files, { projektId }));
    });
    // Property-level media.
    for (const { ref, fp } of fullProps) {
      if (!fp) continue;
      const einheitId = einheitIdByInvId.get(ref.apId);
      if (!einheitId) continue;
      bildRows.push(...photoRows(fp.photos, { einheitId }));
      dokRows.push(...fileRows(fp.files, { einheitId }));
    }

    // Clear previously-synced media for the touched objects, then insert.
    const touchedProjektIds = [...projektIdByInvId.values()];
    const touchedEinheitIds = [...einheitIdByInvId.values()];

    async function clearMedia(
      table: "objekt_bilder" | "objekt_dokumente",
    ): Promise<void> {
      for (const part of chunk(touchedProjektIds, 200)) {
        if (part.length === 0) continue;
        await db
          .from(table)
          .delete()
          .eq("ebene", "projekt")
          .in("projekt_id", part)
          .ilike("url", `${INVESTAGON_CDN_PREFIX}%`);
      }
      for (const part of chunk(touchedEinheitIds, 200)) {
        if (part.length === 0) continue;
        await db
          .from(table)
          .delete()
          .eq("ebene", "einheit")
          .in("einheit_id", part)
          .ilike("url", `${INVESTAGON_CDN_PREFIX}%`);
      }
    }

    if (bildRows.length > 0) {
      await clearMedia("objekt_bilder");
      for (const part of chunk(bildRows, 500)) {
        const { error } = await db.from("objekt_bilder").insert(part);
        if (error) throw new Error(`objekt_bilder insert: ${error.message}`);
      }
      photosSynced = bildRows.length;
    }
    if (dokRows.length > 0) {
      await clearMedia("objekt_dokumente");
      for (const part of chunk(dokRows, 500)) {
        const { error } = await db.from("objekt_dokumente").insert(part);
        if (error) throw new Error(`objekt_dokumente insert: ${error.message}`);
      }
      documentsSynced = dokRows.length;
    }

    log(
      `done: ${projectsSynced} projects, ${propertiesSynced} units, ` +
        `${photosSynced} photos, ${documentsSynced} documents`,
    );

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
    return {
      projects: projectsSynced,
      properties: propertiesSynced,
      photos: photosSynced,
      documents: documentsSynced,
    };
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
