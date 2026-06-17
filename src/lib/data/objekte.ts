// Server-side data access for Objekte (projects + units).
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Replaces the OLD APP TanStack serverFns
// listObjekte / getEinheitDetail / getProjektDetail.
import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Renovierung } from "@/lib/einheit-vollstaendigkeit";

// Harte Obergrenze pro Lese-Query gegen Instanz-Sättigung: PostgREST/DB-seitig
// greift der authenticated-statement_timeout auf dem API-Pfad nicht zuverlässig
// (PostgREST loggt sich als `authenticator` ein). Ein client-seitiges AbortSignal
// bricht eine hängende Query ab → die DB cancelt sie → CPU wird frei, statt dass
// sich Minuten-Queries aufstauen. Self-stabilizing.
const QUERY_TIMEOUT_MS = 9000;
function queryTimeout(): AbortSignal {
  return AbortSignal.timeout(QUERY_TIMEOUT_MS);
}

export type EinheitStatus =
  | "frei"
  | "auf_anfrage"
  | "reserviert"
  | "notarvorbereitung"
  | "notartermin"
  | "verkauft";

/** Publication/quality gate, orthogonal to the sales `status` (PROJ-21). */
export type EinheitFreigabeStatus = "entwurf" | "in_bearbeitung" | "freigegeben";

export interface ObjektListItem {
  einheit_id: string;
  projekt_id: string;
  projekt_name: string | null;
  projekt_typ: "mfh" | "etw_einzeln";
  bautraeger: string | null;
  cover_image_url: string | null;
  adresse: string | null;
  stadt: string | null;
  plz: string | null;
  bundesland: string | null;
  baujahr: number | null;
  mietrendite_brutto: number | null;
  wohnungsnummer: string;
  etage: number | null;
  wohnflaeche: number | null;
  zimmer: number | null;
  kaufpreis: number | null;
  miete: number | null;
  status: EinheitStatus;
  freigabe_status: EinheitFreigabeStatus;
  vermietet: boolean;
  balkon: boolean;
  keller: boolean;
  aufzug: boolean;
  afa_satz: number | null;
  created_at: string;
}

export interface ObjektBild {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

export interface ObjektDokument {
  id: string;
  url: string;
  dateiname: string;
  kategorie: string;
}

export interface ObjektKundenZuweisung {
  id: string;
  kunde_id: string;
  status: string;
  created_at: string;
  kunde: {
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
  } | null;
}

export interface ProjektDetail {
  id: string;
  name: string | null;
  adresse: string;
  stadt: string | null;
  plz: string | null;
  bundesland: string | null;
  bautraeger: string | null;
  baujahr: number | null;
  projekt_typ: "mfh" | "etw_einzeln";
  cover_image_url: string | null;
  mietrendite_brutto: number | null;
  bilder: ObjektBild[];
  dokumente: ObjektDokument[];
  einheiten: ObjektListItem[];
}

/** Denormalised per-project unit aggregate (maintained by the
 * `einheit_aggregat_trg` trigger → `projekte.einheiten_aggregat`). Lets the
 * Objekte list render project tiles without scanning all units (PROJ-3 perf). */
export interface ProjektAggregat {
  count: number;
  kaufpreis_min: number | null;
  kaufpreis_max: number | null;
  wohnflaeche_min: number | null;
  wohnflaeche_max: number | null;
  zimmer_min: number | null;
  zimmer_max: number | null;
  afa_min: number | null;
  afa_max: number | null;
  ppsm_min: number | null;
  ppsm_max: number | null;
  miete_sqm_min: number | null;
  miete_sqm_max: number | null;
  status_counts: Record<string, number> | null;
}

export interface ProjektUebersichtItem {
  projekt_id: string;
  name: string | null;
  projekt_typ: "mfh" | "etw_einzeln";
  bautraeger: string | null;
  cover_image_url: string | null;
  adresse: string | null;
  stadt: string | null;
  plz: string | null;
  bundesland: string | null;
  baujahr: number | null;
  mietrendite_brutto: number | null;
  created_at: string;
  aggregat: ProjektAggregat;
}

export interface EinheitDetail extends ObjektListItem {
  mietvertrag_ende: string | null;
   
  kalkulation: Record<string, any>;
  adresse: string;
  baujahr: number | null;
  hausgeld_umlagefaehig: number | null;
  hausgeld_nicht_umlagefaehig: number | null;
  instandhaltungsruecklage: number | null;
  sondereigentumsverwaltung: number | null;
  grundstueckswert_anteil: number | null;
  afa_satz: number;
  erhaltungsaufwand: number | null;
  grundstuecksanteil_qm: number | null;
  nutzungsart: string | null;
  objektzustand: string | null;
  stellplaetze_anzahl: number | null;
  stellplatz_preis: number | null;
  miteigentumsanteil: string | null;
  vermietet_seit: string | null;
  energieklasse: string | null;
  heizungsart: string | null;
  extras: string | null;
  // PROJ-21 — Vollständigkeit / Freigabe
  kaufpreis_wohnung: number | null;
  kaufpreis_moebel: number | null;
  instandhaltungsruecklage_gesamt: number | null;
  lage_im_haus: string | null;
  renovierungen: Renovierung[];
  tags: string[];
  standort_highlights: string | null;
  freigegeben_at: string | null;
  /** True when the parent projekt has bank details (for completeness). */
  bank_complete: boolean;
  bilder: ObjektBild[];
  dokumente: ObjektDokument[];
  zuweisungen: ObjektKundenZuweisung[];
  geschwister: ObjektListItem[];
}

/**
 * The unit fields the calculation engine seeds from. `EinheitDetail` satisfies
 * this, and the projekt page lazy-loads exactly these for the selected unit
 * (see getEinheitKalkulation) so the calculator can be reused with accurate
 * per-unit values instead of list-level fallbacks.
 */
export interface KalkulationsEinheit {
  wohnungsnummer: string;
  kaufpreis: number | null;
  miete: number | null;
  hausgeld_nicht_umlagefaehig: number | null;
  instandhaltungsruecklage: number | null;
  sondereigentumsverwaltung: number | null;
  grundstueckswert_anteil: number | null;
  afa_satz: number | null;
  erhaltungsaufwand: number | null;
}

const EINHEIT_SELECT = `id, projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer,
  kaufpreis, miete, status, freigabe_status, vermietet, balkon, keller, aufzug, afa_satz, created_at,
  projekte:projekt_id (
    id, name, projekt_typ, bautraeger, cover_image_url, adresse, baujahr,
    stadt, plz, bundesland, mietrendite_brutto
  )`;

 
function mapEinheitRow(row: any): ObjektListItem {
  return {
    einheit_id: row.id,
    projekt_id: row.projekt_id,
    projekt_name: row.projekte?.name ?? null,
    projekt_typ: row.projekte?.projekt_typ ?? "mfh",
    bautraeger: row.projekte?.bautraeger ?? null,
    cover_image_url: row.projekte?.cover_image_url ?? null,
    adresse: row.projekte?.adresse ?? null,
    stadt: row.projekte?.stadt ?? null,
    plz: row.projekte?.plz ?? null,
    bundesland: row.projekte?.bundesland ?? null,
    baujahr: row.projekte?.baujahr ?? null,
    mietrendite_brutto: row.projekte?.mietrendite_brutto ?? null,
    wohnungsnummer: row.wohnungsnummer,
    etage: row.etage,
    wohnflaeche: row.wohnflaeche,
    zimmer: row.zimmer,
    kaufpreis: row.kaufpreis,
    miete: row.miete,
    status: row.status,
    freigabe_status: row.freigabe_status ?? "entwurf",
    vermietet: row.vermietet,
    balkon: row.balkon,
    keller: row.keller,
    aufzug: row.aufzug,
    afa_satz: row.afa_satz ?? null,
    created_at: row.created_at,
  };
}

// Einheit columns WITHOUT the projekte embed. Embedding projekte directly in
// the full-table list query forces a per-row nested-loop join against projekte
// (each row re-evaluating projekte RLS), which is ~240ms warm but blows past the
// 8s statement_timeout on a cold cache (e.g. right after a large Investagon
// sync). We instead fetch projekte once and join in memory — both queries stay
// simple, indexed and robust. RLS still scopes each table independently.
const EINHEIT_LIST_COLS = `id, projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer,
  kaufpreis, miete, status, freigabe_status, vermietet, balkon, keller, aufzug, afa_satz, created_at`;

const PROJEKT_LIST_COLS = `id, name, projekt_typ, bautraeger, cover_image_url, adresse,
  baujahr, stadt, plz, bundesland, mietrendite_brutto`;

/** Flat einheit list. RLS handles role-based visibility (VP deny-list, Finanzierer scoping). */
export async function listObjekte(): Promise<{
  items: ObjektListItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  let eRes, pRes;
  try {
    [eRes, pRes] = await Promise.all([
      supabase
        .from("einheiten")
        .select(EINHEIT_LIST_COLS)
        .order("created_at", { ascending: false })
        .abortSignal(queryTimeout()),
      supabase.from("projekte").select(PROJEKT_LIST_COLS).abortSignal(queryTimeout()),
    ]);
  } catch (err) {
    console.error("listObjekte aborted/failed:", err);
    return {
      items: [],
      error:
        "Die Objektliste konnte nicht rechtzeitig geladen werden (hohe Last). Bitte neu laden.",
    };
  }

  if (eRes.error) {
    console.error("listObjekte einheiten error:", eRes.error);
    return { items: [], error: eRes.error.message };
  }
  if (pRes.error) {
    console.error("listObjekte projekte error:", pRes.error);
    return { items: [], error: pRes.error.message };
  }

  // Join in memory: attach each unit's (RLS-visible) projekt; drop units whose
  // projekt is not visible — same semantics as the previous inner-embed filter.

  const projektById = new Map<string, any>(

    (pRes.data ?? []).map((p: any) => [p.id, p]),
  );
  const items = (eRes.data ?? [])

    .map((row: any) => ({ ...row, projekte: projektById.get(row.projekt_id) }))
    .filter((row: any) => row.projekte)
    .map(mapEinheitRow);

  return { items, error: null };
}

const PROJEKT_UEBERSICHT_COLS = `id, name, projekt_typ, bautraeger, cover_image_url,
  adresse, baujahr, stadt, plz, bundesland, mietrendite_brutto, created_at, einheiten_aggregat`;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapAggregat(raw: any): ProjektAggregat {
  const a = raw ?? {};
  return {
    count: num(a.count) ?? 0,
    kaufpreis_min: num(a.kaufpreis_min),
    kaufpreis_max: num(a.kaufpreis_max),
    wohnflaeche_min: num(a.wohnflaeche_min),
    wohnflaeche_max: num(a.wohnflaeche_max),
    zimmer_min: num(a.zimmer_min),
    zimmer_max: num(a.zimmer_max),
    afa_min: num(a.afa_min),
    afa_max: num(a.afa_max),
    ppsm_min: num(a.ppsm_min),
    ppsm_max: num(a.ppsm_max),
    miete_sqm_min: num(a.miete_sqm_min),
    miete_sqm_max: num(a.miete_sqm_max),
    status_counts:
      a.status_counts && typeof a.status_counts === "object"
        ? (a.status_counts as Record<string, number>)
        : null,
  };
}

/**
 * Project-level overview for the Objekte list. Reads only ~projekte rows (no
 * full einheiten scan) using the trigger-maintained `einheiten_aggregat` — the
 * durable fix for the list-load timeout (PROJ-3). Units load lazily on the
 * project detail page (`getProjektDetail` / `getEinheitDetail`).
 */
export async function listProjekteUebersicht(): Promise<{
  items: ProjektUebersichtItem[];
  error: string | null;
}> {
  const supabase = await createClient();

  let res;
  try {
    res = await supabase
      .from("projekte")
      .select(PROJEKT_UEBERSICHT_COLS)
      .order("created_at", { ascending: false })
      .abortSignal(queryTimeout());
  } catch (err) {
    console.error("listProjekteUebersicht aborted/failed:", err);
    return {
      items: [],
      error:
        "Die Objektliste konnte nicht rechtzeitig geladen werden (hohe Last). Bitte neu laden.",
    };
  }

  if (res.error) {
    console.error("listProjekteUebersicht error:", res.error);
    return { items: [], error: res.error.message };
  }

  const items: ProjektUebersichtItem[] = (res.data ?? [])
    .map((p: any) => ({
      projekt_id: p.id,
      name: p.name ?? null,
      projekt_typ: (p.projekt_typ ?? "mfh") as "mfh" | "etw_einzeln",
      bautraeger: p.bautraeger ?? null,
      cover_image_url: p.cover_image_url ?? null,
      adresse: p.adresse ?? null,
      stadt: p.stadt ?? null,
      plz: p.plz ?? null,
      bundesland: p.bundesland ?? null,
      baujahr: p.baujahr ?? null,
      mietrendite_brutto: p.mietrendite_brutto ?? null,
      created_at: p.created_at,
      aggregat: mapAggregat(p.einheiten_aggregat),
    }))
    // Projekte ohne Einheiten in der Liste ausblenden.
    .filter((p: ProjektUebersichtItem) => p.aggregat.count > 0);

  return { items, error: null };
}

export async function getEinheitDetail(einheitId: string): Promise<{
  einheit: EinheitDetail | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: e, error: eErr } = await supabase
    .from("einheiten")
    .select(
      `id, projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer,
       kaufpreis, miete, status, freigabe_status, freigegeben_at, vermietet, balkon, keller, aufzug, created_at,
       mietvertrag_ende, kalkulation,
       hausgeld_umlagefaehig, hausgeld_nicht_umlagefaehig,
       instandhaltungsruecklage, instandhaltungsruecklage_gesamt, sondereigentumsverwaltung,
       grundstueckswert_anteil, grundstuecksanteil_qm, afa_satz, erhaltungsaufwand,
       nutzungsart, objektzustand, stellplaetze_anzahl, stellplatz_preis,
       kaufpreis_wohnung, kaufpreis_moebel, lage_im_haus, renovierungen, tags, standort_highlights,
       miteigentumsanteil, vermietet_seit, energieklasse, heizungsart, extras,
       projekte:projekt_id (
         id, name, projekt_typ, bautraeger, cover_image_url, adresse, baujahr,
         stadt, plz, bundesland, mietrendite_brutto, bank_iban
       )`,
    )
    .eq("id", einheitId)
    .maybeSingle();

  if (eErr || !e || !(e as any).projekte) {
    return { einheit: null, error: eErr?.message ?? "Nicht gefunden" };
  }

  const projektId = (e as any).projekt_id as string;

  const [bildersR, dokR, zuweisungenR, geschwisterR] = await Promise.all([
    supabase
      .from("objekt_bilder")
      .select("id, url, alt, sort_order")
      .or(`einheit_id.eq.${einheitId},projekt_id.eq.${projektId}`)
      .order("sort_order", { ascending: true }),
    supabase
      .from("objekt_dokumente")
      .select("id, url, dateiname, kategorie")
      .or(`einheit_id.eq.${einheitId},projekt_id.eq.${projektId}`),
    supabase
      .from("objekt_kunde_zuweisungen")
      .select("id, kunde_id, status, created_at")
      .eq("einheit_id", einheitId)
      .order("created_at", { ascending: false }),
    supabase
      .from("einheiten")
      .select(EINHEIT_SELECT)
      .eq("projekt_id", projektId)
      .neq("id", einheitId),
  ]);

  const zuweisungenRaw = zuweisungenR.data ?? [];
  const kundeIds = [...new Set(zuweisungenRaw.map((z) => z.kunde_id).filter(Boolean))];
  const { data: kundenR } = kundeIds.length
    ? await supabase.from("kunden").select("id, vorname, nachname, email").in("id", kundeIds)
    : { data: [] as { id: string; vorname: string | null; nachname: string | null; email: string | null }[] };
  const kundenById = new Map((kundenR ?? []).map((k) => [k.id, k]));

  const base = mapEinheitRow(e);
  const detail: EinheitDetail = {
    ...base,
    mietvertrag_ende: (e as any).mietvertrag_ende ?? null,
    kalkulation: ((e as any).kalkulation ?? {}) as Record<string, any>,
    adresse: (e as any).projekte?.adresse ?? "",
    baujahr: (e as any).projekte?.baujahr ?? null,
    hausgeld_umlagefaehig: (e as any).hausgeld_umlagefaehig ?? null,
    hausgeld_nicht_umlagefaehig: (e as any).hausgeld_nicht_umlagefaehig ?? null,
    instandhaltungsruecklage: (e as any).instandhaltungsruecklage ?? null,
    sondereigentumsverwaltung: (e as any).sondereigentumsverwaltung ?? null,
    grundstueckswert_anteil: (e as any).grundstueckswert_anteil ?? null,
    afa_satz: (e as any).afa_satz ?? 2.0,
    erhaltungsaufwand: (e as any).erhaltungsaufwand ?? null,
    grundstuecksanteil_qm: (e as any).grundstuecksanteil_qm ?? null,
    nutzungsart: (e as any).nutzungsart ?? null,
    objektzustand: (e as any).objektzustand ?? null,
    stellplaetze_anzahl: (e as any).stellplaetze_anzahl ?? null,
    stellplatz_preis: (e as any).stellplatz_preis ?? null,
    miteigentumsanteil: (e as any).miteigentumsanteil ?? null,
    vermietet_seit: (e as any).vermietet_seit ?? null,
    energieklasse: (e as any).energieklasse ?? null,
    heizungsart: (e as any).heizungsart ?? null,
    extras: (e as any).extras ?? null,
    kaufpreis_wohnung: (e as any).kaufpreis_wohnung ?? null,
    kaufpreis_moebel: (e as any).kaufpreis_moebel ?? null,
    instandhaltungsruecklage_gesamt: (e as any).instandhaltungsruecklage_gesamt ?? null,
    lage_im_haus: (e as any).lage_im_haus ?? null,
    renovierungen: Array.isArray((e as any).renovierungen) ? (e as any).renovierungen : [],
    tags: Array.isArray((e as any).tags) ? (e as any).tags : [],
    standort_highlights: (e as any).standort_highlights ?? null,
    freigegeben_at: (e as any).freigegeben_at ?? null,
    bank_complete: Boolean((e as any).projekte?.bank_iban),
    bilder: (bildersR.data ?? []) as ObjektBild[],
    dokumente: (dokR.data ?? []) as ObjektDokument[],
    zuweisungen: zuweisungenRaw.map((z) => ({
      id: z.id,
      kunde_id: z.kunde_id,
      status: z.status,
      created_at: z.created_at,
      kunde: kundenById.get(z.kunde_id) ?? null,
    })),
    geschwister: (geschwisterR.data ?? []).filter((r: any) => r.projekte).map(mapEinheitRow),
  };

  return { einheit: detail, error: null };
}

export async function getProjektDetail(projektId: string): Promise<{
  projekt: ProjektDetail | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: p, error: pErr } = await supabase
    .from("projekte")
    .select(
      `id, name, adresse, stadt, plz, bundesland, bautraeger, baujahr,
       projekt_typ, cover_image_url, mietrendite_brutto`,
    )
    .eq("id", projektId)
    .abortSignal(queryTimeout())
    .maybeSingle();

  if (pErr || !p) return { projekt: null, error: pErr?.message ?? "Nicht gefunden" };

  let bildR, dokR, einhR;
  try {
    [bildR, dokR, einhR] = await Promise.all([
      supabase
        .from("objekt_bilder")
        .select("id, url, alt, sort_order")
        .eq("projekt_id", projektId)
        .order("sort_order", { ascending: true })
        .abortSignal(queryTimeout()),
      supabase
        .from("objekt_dokumente")
        .select("id, url, dateiname, kategorie")
        .eq("projekt_id", projektId)
        .abortSignal(queryTimeout()),
      supabase
        .from("einheiten")
        // Kein projekte-Embed nötig — wir haben das Projekt `p` bereits; der
        // Embed-Join über zwei Tabellen unter RLS ist teuer und vermeidbar.
        .select(EINHEIT_LIST_COLS)
        .eq("projekt_id", projektId)
        .order("wohnungsnummer", { ascending: true })
        .abortSignal(queryTimeout()),
    ]);
  } catch (err) {
    console.error("getProjektDetail aborted/failed:", err);
    return { projekt: null, error: "Projekt konnte nicht geladen werden (hohe Last). Bitte neu laden." };
  }

  const detail: ProjektDetail = {
    id: (p as any).id,
    name: (p as any).name,
    adresse: (p as any).adresse,
    stadt: (p as any).stadt,
    plz: (p as any).plz,
    bundesland: (p as any).bundesland,
    bautraeger: (p as any).bautraeger,
    baujahr: (p as any).baujahr,
    projekt_typ: (p as any).projekt_typ,
    cover_image_url: (p as any).cover_image_url,
    mietrendite_brutto: (p as any).mietrendite_brutto,
    bilder: (bildR.data ?? []) as ObjektBild[],
    dokumente: (dokR.data ?? []) as ObjektDokument[],
    // Projekt `p` als projekte-Kontext anhängen (statt teurem Embed-Join).
    einheiten: (einhR.data ?? []).map((r: any) => mapEinheitRow({ ...r, projekte: p })),
  };

  return { projekt: detail, error: null };
}
