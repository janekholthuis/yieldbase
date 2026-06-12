"use server";

// CRUD server actions for Projekte + Einheiten (internal users only).
//
// Authorisation is gated up-front via requireRole(...). The writes then use
// the service-role admin client (createAdminClient) so they succeed regardless
// of per-row visibility/RLS policies — the same pattern the Investagon sync
// uses (see `src/lib/actions/investagon.ts`). NEVER call createAdminClient()
// before the requireRole gate.

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOrgId } from "@/lib/actions/_org";
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
  "verfuegbar",
  "reserviert",
  "in_finanzierung",
  "kaufvertrag_bestellt",
  "notartermin",
  "verkauft",
  "abgebrochen",
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
  const organisationId = await activeOrgId(session.supabase, session.userId);

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
  await requireRole(...INTERNAL_ROLES);
  const { id, ...rest } = updateProjektSchema.parse(input);

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

  const admin = createAdminClient();
  const { error } = await admin.from("projekte").update(patch).eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${id}`);
  return { id };
}

export async function deleteProjekt(input: {
  id: string;
}): Promise<{ id: string }> {
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

  // A unit must share its project's org. Prefer the parent projekt's
  // organisation_id (read via the admin client, since the projekt may belong to
  // another caller's active org); fall back to the caller's active org.
  const { data: parentProjekt } = await admin
    .from("projekte")
    .select("organisation_id")
    .eq("id", data.projekt_id)
    .maybeSingle();
  const organisationId =
    parentProjekt?.organisation_id ??
    (await activeOrgId(session.supabase, session.userId));

  const insert: EinheitInsert = {
    projekt_id: data.projekt_id,
    wohnungsnummer: data.wohnungsnummer,
    status: data.status ?? "verfuegbar",
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

export async function updateEinheit(
  input: UpdateEinheitInput,
): Promise<{ id: string }> {
  await requireRole(...INTERNAL_ROLES);
  const { id, ...rest } = updateEinheitSchema.parse(input);

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

  const admin = createAdminClient();
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
  await requireRole(...INTERNAL_ROLES);
  const { id } = z.object({ id: uuid }).parse(input);

  const admin = createAdminClient();
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
