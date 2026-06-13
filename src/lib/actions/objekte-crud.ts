"use server";

// CRUD server actions for Projekte + Einheiten (internal users only).
//
// Authorisation is gated up-front via requireRole(...). The writes then use
// the service-role admin client (createAdminClient) so they succeed regardless
// of per-row visibility/RLS policies — the same pattern the Investagon sync
// uses (see `src/lib/actions/investagon.ts`). NEVER call createAdminClient()
// before the requireRole gate.
//
// Because the admin client BYPASSES the per-org RLS, the role gate alone does
// not enforce tenant isolation: every write that targets an existing row must
// additionally call assertOrgAccess(session, <row's organisation_id>) so a
// caller from org A cannot mutate org B's data. admin/support keep cross-org
// access (platform operators); VP/Vertriebsleiter are scoped to their active org.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOrgId, assertOrgAccess } from "@/lib/actions/_org";
import type { Database } from "@/lib/supabase/types";

// Internal roles allowed to manage projects/units.
const INTERNAL_ROLES = [
  "admin",
  "support",
  "vertriebsleiter",
  "vp_l1",
  "vp_l2",
  "vp_l3",
] as const;

// ---------------------------------------------------------------------------
// Zod helpers
// ---------------------------------------------------------------------------

/** Trim a string; treat empty string as undefined (so optional fields stay unset). */
const optionalString = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

/** Coerce to number; treat "" / null / undefined as undefined. */
const optionalNumber = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number(),
  )
  .optional();

/** Coerce to a finite integer (e.g. smallint columns). */
const optionalInt = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int(),
  )
  .optional();

const optionalBool = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.boolean(),
  )
  .optional();

/** ISO date string (YYYY-MM-DD or full ISO); "" -> undefined. */
const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v))
  .optional();

const projektTypEnum = z.enum(["mfh", "etw_einzeln"]);
const einheitStatusEnum = z.enum([
  "frei",
  "auf_anfrage",
  "reserviert",
  "notarvorbereitung",
  "notartermin",
  "verkauft",
]);
const nutzungsartEnum = z.enum(["wohnen", "gewerbe"]);
const objektzustandEnum = z.enum(["bestand", "neubau"]);

const uuid = z.string().uuid();

/** Drop keys whose value is `undefined` so partial updates only touch provided columns. */
function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as Partial<T>;
}

// ---------------------------------------------------------------------------
// Projekte
// ---------------------------------------------------------------------------

const projektFieldsSchema = z.object({
  name: optionalString,
  adresse: optionalString,
  plz: optionalString,
  stadt: optionalString,
  bundesland: optionalString,
  projekt_typ: projektTypEnum.optional(),
  baujahr: optionalInt,
  bautraeger: optionalString,
  instandhaltungsruecklage_gesamt: optionalNumber,
});

const createProjektSchema = projektFieldsSchema.extend({
  // adresse is required + non-empty for creation.
  adresse: z.string().trim().min(1, "adresse is required"),
});

type CreateProjektInput = z.input<typeof createProjektSchema>;

type ProjektInsert = Database["public"]["Tables"]["projekte"]["Insert"];
type ProjektUpdate = Database["public"]["Tables"]["projekte"]["Update"];

export async function createProjekt(
  input: CreateProjektInput,
): Promise<{ id: string }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const data = createProjektSchema.parse(input);

  // The admin client has no auth.uid(), so the org-default trigger can't fire.
  // Resolve the caller's active org via the authed client and set it explicitly.
  // A null org would create an orphaned projekt invisible to everyone under the
  // restrictive RLS — reject instead of writing unisolated (BUG-002).
  const organisationId = await activeOrgId(session.supabase, session.userId);
  if (!organisationId) {
    throw new Error(
      "Keine aktive Organisation gesetzt — bitte zuerst eine Organisation auswählen.",
    );
  }

  const insert: ProjektInsert = {
    adresse: data.adresse,
    name: data.name ?? data.adresse,
    plz: data.plz ?? null,
    stadt: data.stadt ?? null,
    bundesland: data.bundesland ?? null,
    projekt_typ: data.projekt_typ ?? "mfh",
    baujahr: data.baujahr ?? null,
    bautraeger: data.bautraeger ?? null,
    instandhaltungsruecklage_gesamt:
      data.instandhaltungsruecklage_gesamt ?? null,
    organisation_id: organisationId,
    created_by: session.userId,
  };

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("projekte")
    .insert(insert)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  return { id: row.id };
}

const updateProjektSchema = projektFieldsSchema.extend({ id: uuid });
type UpdateProjektInput = z.input<typeof updateProjektSchema>;

export async function updateProjekt(
  input: UpdateProjektInput,
): Promise<{ id: string }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const { id, ...rest } = updateProjektSchema.parse(input);

  const admin = createAdminClient();

  // Tenant isolation: only mutate a projekt the caller's org owns.
  const { data: existing } = await admin
    .from("projekte")
    .select("organisation_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("Projekt nicht gefunden");
  await assertOrgAccess(session, existing.organisation_id);

  const patch: ProjektUpdate = compact({
    name: rest.name,
    adresse: rest.adresse,
    plz: rest.plz,
    stadt: rest.stadt,
    bundesland: rest.bundesland,
    projekt_typ: rest.projekt_typ,
    baujahr: rest.baujahr,
    bautraeger: rest.bautraeger,
    instandhaltungsruecklage_gesamt: rest.instandhaltungsruecklage_gesamt,
  });

  const { error } = await admin.from("projekte").update(patch).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${id}`);
  return { id };
}

export async function deleteProjekt(input: {
  id: string;
}): Promise<{ id: string }> {
  // Restricted to platform operators (admin/support), who have cross-org access
  // by convention — no per-org assertOrgAccess needed here.
  await requireRole("admin", "support");
  const { id } = z.object({ id: uuid }).parse(input);

  const admin = createAdminClient();

  // Delete child einheiten first in case the FK is not ON DELETE CASCADE.
  const { error: childErr } = await admin
    .from("einheiten")
    .delete()
    .eq("projekt_id", id);
  if (childErr) throw new Error(childErr.message);

  const { error } = await admin.from("projekte").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${id}`);
  return { id };
}

// ---------------------------------------------------------------------------
// Einheiten
// ---------------------------------------------------------------------------

const einheitOptionalFields = {
  etage: optionalInt,
  wohnflaeche: optionalNumber,
  zimmer: optionalNumber,
  kaufpreis: optionalNumber,
  miete: optionalNumber,
  status: einheitStatusEnum.optional(),
  vermietet: optionalBool,
  mietvertrag_ende: optionalDate,
  vermietet_seit: optionalDate,
  balkon: optionalBool,
  keller: optionalBool,
  aufzug: optionalBool,
  hausgeld_umlagefaehig: optionalNumber,
  hausgeld_nicht_umlagefaehig: optionalNumber,
  instandhaltungsruecklage: optionalNumber,
  sondereigentumsverwaltung: optionalNumber,
  grundstuecksanteil_qm: optionalNumber,
  grundstueckswert_anteil: optionalNumber,
  afa_satz: optionalNumber,
  erhaltungsaufwand: optionalNumber,
  nutzungsart: nutzungsartEnum.optional(),
  objektzustand: objektzustandEnum.optional(),
  stellplaetze_anzahl: optionalInt,
  stellplatz_preis: optionalNumber,
  miteigentumsanteil: optionalString,
  energieklasse: optionalString,
  heizungsart: optionalString,
  extras: optionalString,
} as const;

const createEinheitSchema = z.object({
  projekt_id: uuid,
  wohnungsnummer: z.string().trim().min(1, "wohnungsnummer is required"),
  ...einheitOptionalFields,
});

const updateEinheitSchema = z.object({
  id: uuid,
  wohnungsnummer: optionalString,
  ...einheitOptionalFields,
});

type CreateEinheitInput = z.input<typeof createEinheitSchema>;
type UpdateEinheitInput = z.input<typeof updateEinheitSchema>;

type EinheitInsert = Database["public"]["Tables"]["einheiten"]["Insert"];
type EinheitUpdate = Database["public"]["Tables"]["einheiten"]["Update"];

export async function createEinheit(
  input: CreateEinheitInput,
): Promise<{ id: string }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const data = createEinheitSchema.parse(input);

  const admin = createAdminClient();

  // A unit must share its project's org. Load the parent projekt's
  // organisation_id and enforce tenant isolation: a caller may only add units to
  // a projekt owned by their org (admin/support excepted).
  const { data: parentProjekt } = await admin
    .from("projekte")
    .select("organisation_id")
    .eq("id", data.projekt_id)
    .maybeSingle();
  if (!parentProjekt) throw new Error("Projekt nicht gefunden");
  await assertOrgAccess(session, parentProjekt.organisation_id);

  const organisationId =
    parentProjekt.organisation_id ??
    (await activeOrgId(session.supabase, session.userId));

  const insert: EinheitInsert = {
    projekt_id: data.projekt_id,
    wohnungsnummer: data.wohnungsnummer,
    status: data.status ?? "frei",
    organisation_id: organisationId,
    ...compact({
      etage: data.etage,
      wohnflaeche: data.wohnflaeche,
      zimmer: data.zimmer,
      kaufpreis: data.kaufpreis,
      miete: data.miete,
      vermietet: data.vermietet,
      mietvertrag_ende: data.mietvertrag_ende,
      vermietet_seit: data.vermietet_seit,
      balkon: data.balkon,
      keller: data.keller,
      aufzug: data.aufzug,
      hausgeld_umlagefaehig: data.hausgeld_umlagefaehig,
      hausgeld_nicht_umlagefaehig: data.hausgeld_nicht_umlagefaehig,
      instandhaltungsruecklage: data.instandhaltungsruecklage,
      sondereigentumsverwaltung: data.sondereigentumsverwaltung,
      grundstuecksanteil_qm: data.grundstuecksanteil_qm,
      grundstueckswert_anteil: data.grundstueckswert_anteil,
      afa_satz: data.afa_satz,
      erhaltungsaufwand: data.erhaltungsaufwand,
      nutzungsart: data.nutzungsart,
      objektzustand: data.objektzustand,
      stellplaetze_anzahl: data.stellplaetze_anzahl,
      stellplatz_preis: data.stellplatz_preis,
      miteigentumsanteil: data.miteigentumsanteil,
      energieklasse: data.energieklasse,
      heizungsart: data.heizungsart,
      extras: data.extras,
    }),
  };

  const { data: row, error } = await admin
    .from("einheiten")
    .insert(insert)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.projekt_id}`);
  return { id: row.id };
}

// ---------------------------------------------------------------------------
// Bulk-Einheiten (PROJ-16) — mehrere Einheiten in einem Schritt anlegen
// (typische Quelle: aus Excel eingefügte Kaufpreisliste). Org-Isolation wird
// einmal über das Parent-Projekt erzwungen; Insert erfolgt in Chunks. Der
// Insert ist pro Chunk atomar — schlägt ein Chunk fehl, bricht die Aktion ab
// (Fehlermeldung mit Kontext), bereits geschriebene Chunks bleiben bestehen.
// ---------------------------------------------------------------------------

const bulkEinheitRowSchema = z.object({
  wohnungsnummer: z.string().trim().min(1, "wohnungsnummer is required"),
  ...einheitOptionalFields,
});

const createEinheitenBulkSchema = z.object({
  projekt_id: uuid,
  einheiten: z
    .array(bulkEinheitRowSchema)
    .min(1, "Mindestens eine Einheit")
    .max(500, "Höchstens 500 Einheiten pro Vorgang"),
});

type CreateEinheitenBulkInput = z.input<typeof createEinheitenBulkSchema>;

const BULK_CHUNK_SIZE = 100;

export async function createEinheitenBulk(
  input: CreateEinheitenBulkInput,
): Promise<{ count: number }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const { projekt_id, einheiten } = createEinheitenBulkSchema.parse(input);

  const admin = createAdminClient();

  // Tenant isolation: caller may only add units to a projekt their org owns.
  const { data: parentProjekt } = await admin
    .from("projekte")
    .select("organisation_id")
    .eq("id", projekt_id)
    .maybeSingle();
  if (!parentProjekt) throw new Error("Projekt nicht gefunden");
  await assertOrgAccess(session, parentProjekt.organisation_id);

  const organisationId =
    parentProjekt.organisation_id ??
    (await activeOrgId(session.supabase, session.userId));

  // Duplikat-Schutz: Wohnungsnummern müssen innerhalb des Batches eindeutig
  // sein und dürfen nicht mit bereits im Projekt vorhandenen kollidieren.
  const norm = (v: string) => v.trim().toLowerCase();
  const batchSeen = new Set<string>();
  const batchDupes = new Set<string>();
  for (const e of einheiten) {
    const k = norm(e.wohnungsnummer);
    if (batchSeen.has(k)) batchDupes.add(e.wohnungsnummer.trim());
    batchSeen.add(k);
  }
  const { data: existingRows } = await admin
    .from("einheiten")
    .select("wohnungsnummer")
    .eq("projekt_id", projekt_id);
  const existingSet = new Set((existingRows ?? []).map((r) => norm(r.wohnungsnummer)));
  const collisions = [...batchSeen].filter((k) => existingSet.has(k));
  if (batchDupes.size > 0 || collisions.length > 0) {
    const parts: string[] = [];
    if (batchDupes.size > 0)
      parts.push(`doppelt in der Eingabe: ${[...batchDupes].join(", ")}`);
    if (collisions.length > 0)
      parts.push(`bereits im Projekt vorhanden: ${collisions.length}`);
    throw new Error(`Wohnungsnummern müssen eindeutig sein (${parts.join("; ")}).`);
  }

  const rows: EinheitInsert[] = einheiten.map((data) => ({
    projekt_id,
    wohnungsnummer: data.wohnungsnummer,
    status: data.status ?? "frei",
    organisation_id: organisationId,
    ...compact({
      etage: data.etage,
      wohnflaeche: data.wohnflaeche,
      zimmer: data.zimmer,
      kaufpreis: data.kaufpreis,
      miete: data.miete,
      vermietet: data.vermietet,
      mietvertrag_ende: data.mietvertrag_ende,
      vermietet_seit: data.vermietet_seit,
      balkon: data.balkon,
      keller: data.keller,
      aufzug: data.aufzug,
      hausgeld_umlagefaehig: data.hausgeld_umlagefaehig,
      hausgeld_nicht_umlagefaehig: data.hausgeld_nicht_umlagefaehig,
      instandhaltungsruecklage: data.instandhaltungsruecklage,
      sondereigentumsverwaltung: data.sondereigentumsverwaltung,
      grundstuecksanteil_qm: data.grundstuecksanteil_qm,
      grundstueckswert_anteil: data.grundstueckswert_anteil,
      afa_satz: data.afa_satz,
      erhaltungsaufwand: data.erhaltungsaufwand,
      nutzungsart: data.nutzungsart,
      objektzustand: data.objektzustand,
      stellplaetze_anzahl: data.stellplaetze_anzahl,
      stellplatz_preis: data.stellplatz_preis,
      miteigentumsanteil: data.miteigentumsanteil,
      energieklasse: data.energieklasse,
      heizungsart: data.heizungsart,
      extras: data.extras,
    }),
  }));

  let count = 0;
  for (let i = 0; i < rows.length; i += BULK_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + BULK_CHUNK_SIZE);
    const { error } = await admin.from("einheiten").insert(chunk);
    if (error) {
      throw new Error(
        count > 0
          ? `${count} Einheiten gespeichert, dann Fehler: ${error.message}`
          : error.message,
      );
    }
    count += chunk.length;
  }

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${projekt_id}`);
  return { count };
}

export async function updateEinheit(
  input: UpdateEinheitInput,
): Promise<{ id: string }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const { id, ...rest } = updateEinheitSchema.parse(input);

  const admin = createAdminClient();

  // Tenant isolation: only mutate an einheit the caller's org owns.
  const { data: existing } = await admin
    .from("einheiten")
    .select("organisation_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("Einheit nicht gefunden");
  await assertOrgAccess(session, existing.organisation_id);

  const patch: EinheitUpdate = compact({
    wohnungsnummer: rest.wohnungsnummer,
    etage: rest.etage,
    wohnflaeche: rest.wohnflaeche,
    zimmer: rest.zimmer,
    kaufpreis: rest.kaufpreis,
    miete: rest.miete,
    status: rest.status,
    vermietet: rest.vermietet,
    mietvertrag_ende: rest.mietvertrag_ende,
    vermietet_seit: rest.vermietet_seit,
    balkon: rest.balkon,
    keller: rest.keller,
    aufzug: rest.aufzug,
    hausgeld_umlagefaehig: rest.hausgeld_umlagefaehig,
    hausgeld_nicht_umlagefaehig: rest.hausgeld_nicht_umlagefaehig,
    instandhaltungsruecklage: rest.instandhaltungsruecklage,
    sondereigentumsverwaltung: rest.sondereigentumsverwaltung,
    grundstuecksanteil_qm: rest.grundstuecksanteil_qm,
    grundstueckswert_anteil: rest.grundstueckswert_anteil,
    afa_satz: rest.afa_satz,
    erhaltungsaufwand: rest.erhaltungsaufwand,
    nutzungsart: rest.nutzungsart,
    objektzustand: rest.objektzustand,
    stellplaetze_anzahl: rest.stellplaetze_anzahl,
    stellplatz_preis: rest.stellplatz_preis,
    miteigentumsanteil: rest.miteigentumsanteil,
    energieklasse: rest.energieklasse,
    heizungsart: rest.heizungsart,
    extras: rest.extras,
  });

  const { data: row, error } = await admin
    .from("einheiten")
    .update(patch)
    .eq("id", id)
    .select("projekt_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  if (row?.projekt_id) revalidatePath(`/objekte/${row.projekt_id}`);
  return { id };
}

export async function deleteEinheit(input: {
  id: string;
}): Promise<{ id: string }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const { id } = z.object({ id: uuid }).parse(input);

  const admin = createAdminClient();

  // Tenant isolation: only delete an einheit the caller's org owns.
  const { data: existing } = await admin
    .from("einheiten")
    .select("organisation_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) throw new Error("Einheit nicht gefunden");
  await assertOrgAccess(session, existing.organisation_id);

  const { data: row, error } = await admin
    .from("einheiten")
    .delete()
    .eq("id", id)
    .select("projekt_id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  if (row?.projekt_id) revalidatePath(`/objekte/${row.projekt_id}`);
  return { id };
}
