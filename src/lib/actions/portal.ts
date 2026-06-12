"use server";

// Client-invokable server actions for the Kunden-Portal (customer self-service).
// The portal user is a `kunde` who edits their own profile and fills out the
// 4-step Selbstauskunft. Each action authenticates via requireUser() and runs
// RLS-scoped queries as the signed-in user. Ported verbatim from the OLD APP
// TanStack serverFns in portal.functions.ts and selbstauskunft.functions.ts.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { calculateBonitaet } from "@/lib/bonitaet";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AuthedClient = SupabaseClient<Database>;

// ───────────── Helpers ─────────────
async function findMyKundeId(supabase: AuthedClient, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("kunden")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Kein Kundenprofil verknüpft");
  return data.id;
}

// ───────────── updateMyKundeProfile ─────────────
const profileUpdateSchema = z.object({
  anrede: z.enum(["herr", "frau", "divers"]).optional().nullable(),
  vorname: z.string().trim().max(60).optional().nullable(),
  nachname: z.string().trim().max(80).optional().nullable(),
  geburtsdatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  telefon: z.string().trim().max(60).optional().nullable(),
  adresse: z.string().trim().max(200).optional().nullable(),
  plz: z.string().trim().max(10).optional().nullable(),
  stadt: z.string().trim().max(100).optional().nullable(),
  bundesland: z.string().trim().max(60).optional().nullable(),
});

export async function updateMyKundeProfile(input: z.input<typeof profileUpdateSchema>) {
  const { supabase, userId } = await requireUser();
  const data = profileUpdateSchema.parse(input);

  const { data: kunde, error: kErr } = await supabase
    .from("kunden")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (kErr) throw new Error(kErr.message);
  if (!kunde) throw new Error("Kein Kundenprofil verknüpft");

  const payload = {
    anrede: data.anrede ?? null,
    vorname: data.vorname ?? null,
    nachname: data.nachname ?? null,
    geburtsdatum: data.geburtsdatum ?? null,
    telefon: data.telefon ?? null,
    adresse: data.adresse ?? null,
    plz: data.plz ?? null,
    stadt: data.stadt ?? null,
    bundesland: data.bundesland ?? null,
  };

  const { error } = await supabase.from("kunden").update(payload).eq("id", kunde.id);
  if (error) throw new Error(error.message);

  // Spiegel auch in profiles (Anzeige-Name etc.)
  const fullName = [data.vorname, data.nachname].filter(Boolean).join(" ").trim();
  await supabase
    .from("profiles")
    .update({
      ...(fullName ? { name: fullName } : {}),
      vorname: data.vorname ?? null,
      nachname: data.nachname ?? null,
      anrede: data.anrede ?? null,
      geburtsdatum: data.geburtsdatum ?? null,
      phone: data.telefon ?? null,
      address: data.adresse ?? null,
      plz: data.plz ?? null,
      stadt: data.stadt ?? null,
      bundesland: data.bundesland ?? null,
    })
    .eq("id", userId);

  revalidatePath("/portal");
  revalidatePath("/portal/profil");
  return { ok: true };
}

// ───────────── Selbstauskunft step schemas ─────────────
const step1 = z.object({
  anrede: z.enum(["herr", "frau", "divers"]).nullable(),
  vorname: z.string().trim().min(1).max(60),
  nachname: z.string().trim().min(1).max(80),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  verheiratet: z.boolean(),
  adresse: z.string().trim().min(1).max(200),
  plz: z.string().trim().regex(/^\d{5}$/, "PLZ muss 5 Ziffern enthalten"),
  stadt: z.string().trim().min(1).max(100),
  telefon: z.string().trim().max(40).nullable().optional(),
  bundesland: z.string().trim().max(60).nullable().optional(),
});

const step2 = z.object({
  beruf_status: z.enum(["angestellter", "selbststaendiger", "unternehmer"]),
  brutto_jahreseinkommen: z.number().min(0).max(10_000_000),
});

const step3 = z.object({
  erwachsene_im_haushalt: z.union([z.literal(1), z.literal(2)]),
  kinder_anzahl: z.number().int().min(0).max(20),
  bestehende_immobilien: z.boolean(),
});

const step4 = z.object({
  eigenkapital: z.number().min(0).max(100_000_000),
  kreditverpflichtungen_monatlich: z.number().min(0).max(1_000_000),
});

const saveInput = z.discriminatedUnion("step", [
  z.object({ step: z.literal(1), data: step1 }),
  z.object({ step: z.literal(2), data: step2 }),
  z.object({ step: z.literal(3), data: step3 }),
  z.object({ step: z.literal(4), data: step4 }),
]);

// ───────────── saveSelbstauskunftStep ─────────────
export async function saveSelbstauskunftStep(input: z.input<typeof saveInput>) {
  const { supabase, userId } = await requireUser();
  const parsed = saveInput.parse(input);

  const kundeId = await findMyKundeId(supabase, userId);

  const patch = { ...parsed.data, selbstauskunft_step: parsed.step } as never;

  const { error } = await supabase.from("kunden").update(patch).eq("id", kundeId);
  if (error) throw new Error(error.message);

  revalidatePath("/portal");
  revalidatePath("/portal/selbstauskunft");
  return { ok: true };
}

// ───────────── submitSelbstauskunft ─────────────
const submitInput = z.object({
  ...step1.shape,
  ...step2.shape,
  ...step3.shape,
  ...step4.shape,
});

export async function submitSelbstauskunft(input: z.input<typeof submitInput>) {
  const { supabase } = await requireUser();
  const data = submitInput.parse(input);

  const bon = calculateBonitaet({
    brutto: data.brutto_jahreseinkommen,
    verheiratet: data.verheiratet,
    eigenkapital: data.eigenkapital,
    kreditverpflichtungen_monatlich: data.kreditverpflichtungen_monatlich,
    erwachsene_im_haushalt: data.erwachsene_im_haushalt,
    kinder_anzahl: data.kinder_anzahl,
    beruf_status: data.beruf_status,
  });

  const { error } = await supabase.rpc("submit_selbstauskunft", {
    _anrede: data.anrede,
    _vorname: data.vorname,
    _nachname: data.nachname,
    _geburtsdatum: data.geburtsdatum,
    _verheiratet: data.verheiratet,
    _adresse: data.adresse,
    _plz: data.plz,
    _stadt: data.stadt,
    _beruf_status: data.beruf_status,
    _brutto: data.brutto_jahreseinkommen,
    _erwachsene: data.erwachsene_im_haushalt,
    _kinder: data.kinder_anzahl,
    _bestehende_immobilien: data.bestehende_immobilien,
    _eigenkapital: data.eigenkapital,
    _kreditverpflichtungen: data.kreditverpflichtungen_monatlich,
    _steuersatz_grenze: bon.steuersatz_grenze,
    _steuersatz_durchschnitt: bon.steuersatz_durchschnitt,
    _max_finanzierbar: bon.max_finanzierbar,
    _max_monatsrate: bon.max_monatsrate,
    _max_darlehen: bon.max_darlehen,
    _telefon: data.telefon ?? null,
    _bundesland: data.bundesland ?? null,
  } as never);
  if (error) throw new Error(error.message);

  revalidatePath("/portal");
  revalidatePath("/portal/selbstauskunft");
  return { ok: true, bonitaet: bon };
}
