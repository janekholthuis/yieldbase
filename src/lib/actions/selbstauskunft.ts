"use server";

// PROJ-7 — Selbstauskunft (Fillout-Nachbau) Server-Actions.
//
// Der eingeloggte Kunde füllt seine eigene Selbstauskunft aus. Die Zeile in
// `selbstauskuenfte` (+ Kind `selbstauskunft_immobilien`) wird über den
// authentifizierten Client geschrieben — RLS erlaubt nur die eigene Zeile
// (Policy sa_self_*). Beim Einreichen werden zusätzlich die groben
// `kunden`-Felder + Bonität aktualisiert; das geschieht über den Admin-Client,
// weil der `kunden_protect_system_fields`-Trigger einem Kunden das Schreiben der
// max_*-Felder verbietet (der Admin-Client hat keine auth.uid() -> Trigger
// greift nicht), analog zur bestehenden submit_selbstauskunft-RPC.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateBonitaet } from "@/lib/bonitaet";
import {
  type SelbstauskunftData,
  type ImmobilieData,
  emptySelbstauskunft,
  auswerten,
  relevantePersonen,
  berufStatusFromBeschaeftigung,
  istVerheiratet,
  validatePersonStep,
  parseEuro,
} from "@/lib/selbstauskunft";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AuthedClient = SupabaseClient<Database>;

const CONTENT_STEPS = [1, 2, 3, 4, 6] as const; // 5 = Immobilien, 7 = Unterschrift

async function findMyKunde(supabase: AuthedClient, userId: string) {
  const { data, error } = await supabase
    .from("kunden")
    .select(
      "id, organisation_id, vp_id, vorname, nachname, email, telefon, geburtsdatum, adresse, plz, stadt",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Kein Kundenprofil verknüpft");
  return data;
}

// ───────────── getMySelbstauskunftContext ─────────────
export async function getMySelbstauskunftContext() {
  const { supabase, userId } = await requireUser();
  const kunde = await findMyKunde(supabase, userId);

  const { data: row } = await supabase
    .from("selbstauskuenfte")
    .select(
      "id, status, step, mitantragsteller, daten, submitted_at, close_lead_id, close_opportunity_id, berater_vorname, berater_nachname",
    )
    .eq("kunde_id", kunde.id)
    .maybeSingle();

  let immobilien: ImmobilieData[] = [];
  if (row?.id) {
    const { data: imm } = await supabase
      .from("selbstauskunft_immobilien")
      .select("objektart, adresse, verkehrswert, restdarlehen, mieteinnahme_monat, eigennutzung")
      .eq("selbstauskunft_id", row.id);
    immobilien = (imm ?? []).map((i) => ({
      objektart: i.objektart ?? "",
      adresse: i.adresse ?? "",
      verkehrswert: i.verkehrswert != null ? String(i.verkehrswert) : "",
      restdarlehen: i.restdarlehen != null ? String(i.restdarlehen) : "",
      mieteinnahme_monat: i.mieteinnahme_monat != null ? String(i.mieteinnahme_monat) : "",
      eigennutzung: Boolean(i.eigennutzung),
    }));
  }

  // Berater (VP) für versteckte CRM-Felder / Anzeige — via Admin (read-only).
  let berater: { vorname: string | null; nachname: string | null } | null = null;
  if (kunde.vp_id) {
    const admin = createAdminClient();
    const { data: vp } = await admin
      .from("profiles")
      .select("vorname, nachname")
      .eq("id", kunde.vp_id)
      .maybeSingle();
    if (vp) berater = { vorname: vp.vorname, nachname: vp.nachname };
  }

  return {
    existing: row
      ? {
          status: row.status,
          step: row.step,
          mitantragsteller: row.mitantragsteller,
          daten: row.daten as unknown as SelbstauskunftData | null,
          submitted_at: row.submitted_at,
          close_lead_id: row.close_lead_id,
          close_opportunity_id: row.close_opportunity_id,
          berater_vorname: row.berater_vorname,
          berater_nachname: row.berater_nachname,
        }
      : null,
    immobilien,
    prefill: {
      vorname: kunde.vorname,
      nachname: kunde.nachname,
      email: kunde.email,
      telefon: kunde.telefon,
      geburtsdatum: kunde.geburtsdatum,
      adresse: kunde.adresse,
      plz: kunde.plz,
      stadt: kunde.stadt,
    },
    berater,
  };
}

// ───────────── saveSelbstauskunftDraft (Autosave) ─────────────
const crmSchema = {
  close_lead_id: z.string().trim().max(120).optional().nullable(),
  close_opportunity_id: z.string().trim().max(120).optional().nullable(),
  berater_vorname: z.string().trim().max(120).optional().nullable(),
  berater_nachname: z.string().trim().max(120).optional().nullable(),
};

const saveDraftSchema = z.object({
  step: z.number().int().min(0).max(7),
  data: z.record(z.string(), z.unknown()),
  ...crmSchema,
});

export async function saveSelbstauskunftDraft(input: z.input<typeof saveDraftSchema>) {
  const { supabase, userId } = await requireUser();
  const parsed = saveDraftSchema.parse(input);
  const kunde = await findMyKunde(supabase, userId);

  const data = parsed.data as unknown as SelbstauskunftData;

  const { error } = await supabase.from("selbstauskuenfte").upsert(
    {
      kunde_id: kunde.id,
      organisation_id: kunde.organisation_id,
      status: "entwurf",
      step: parsed.step,
      mitantragsteller: Boolean(data?.mitantragsteller),
      daten: parsed.data as never,
      close_lead_id: parsed.close_lead_id ?? null,
      close_opportunity_id: parsed.close_opportunity_id ?? null,
      berater_vorname: parsed.berater_vorname ?? null,
      berater_nachname: parsed.berater_nachname ?? null,
    },
    { onConflict: "kunde_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/portal/selbstauskunft");
  return { ok: true };
}

// ───────────── submitMySelbstauskunft ─────────────
const submitSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  signaturHaupt: z.string().min(1, "Unterschrift fehlt").max(2_000_000),
  signaturMit: z.string().max(2_000_000).nullable().optional(),
  ...crmSchema,
});

/** Akzeptiere nur plausible IPv4/IPv6-Werte (sonst null) — schützt den inet-Cast. */
function sanitizeIp(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.trim();
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^[0-9a-fA-F:]+$/;
  return ipv4.test(v) || (v.includes(":") && ipv6.test(v)) ? v : null;
}

function validateAll(d: SelbstauskunftData): string | null {
  for (const step of CONTENT_STEPS) {
    const eH = validatePersonStep(d.haupt, step);
    if (eH) return `Hauptantragsteller, Schritt ${step}: ${eH}`;
    if (d.mitantragsteller) {
      const eM = validatePersonStep(d.mit, step);
      if (eM) return `Mitantragsteller, Schritt ${step}: ${eM}`;
    }
  }
  if (d.immobilienvermoegen === "") return "Immobilienvermögen: bitte Ja/Nein wählen";
  if (!d.datenschutz) return "Datenschutzerklärung muss bestätigt werden";
  if (d.ort.trim() === "") return "Ort fehlt";
  return null;
}

export async function submitMySelbstauskunft(input: z.input<typeof submitSchema>) {
  const { supabase, userId } = await requireUser();
  const parsed = submitSchema.parse(input);
  const data = parsed.data as unknown as SelbstauskunftData;

  const err = validateAll(data);
  if (err) throw new Error(err);
  if (data.mitantragsteller && !(parsed.signaturMit && parsed.signaturMit.length > 0))
    throw new Error("Unterschrift des Mitantragstellers fehlt");

  const kunde = await findMyKunde(supabase, userId);

  // Immutability: eine bereits eingereichte (unterschriebene) Selbstauskunft
  // nicht erneut überschreiben — sie ist ein rechtlich verbindliches Dokument.
  const { data: current } = await supabase
    .from("selbstauskuenfte")
    .select("status")
    .eq("kunde_id", kunde.id)
    .maybeSingle();
  if (current?.status === "eingereicht") {
    throw new Error(
      "Deine Selbstauskunft wurde bereits eingereicht und kann nicht erneut geändert werden.",
    );
  }

  const eval_ = auswerten(data);

  // Audit-Metadaten.
  const h = await headers();
  const ipRaw = sanitizeIp((h.get("x-forwarded-for") ?? "").split(",")[0] ?? null);
  const userAgent = h.get("user-agent");

  // 1) selbstauskuenfte finalisieren (authed client, RLS self).
  const { data: saRow, error: saErr } = await supabase
    .from("selbstauskuenfte")
    .upsert(
      {
        kunde_id: kunde.id,
        organisation_id: kunde.organisation_id,
        status: "eingereicht",
        step: 7,
        mitantragsteller: data.mitantragsteller,
        daten: parsed.data as never,
        einnahmen_summe_monat: eval_.einnahmen_summe_monat,
        vermoegen_summe: eval_.vermoegen_summe,
        ausgaben_summe_monat: eval_.ausgaben_summe_monat,
        kv_status: data.haupt.kv_status || null,
        beschaeftigung: data.haupt.beschaeftigung || null,
        ort: data.ort.trim() || null,
        datum: data.datum || null,
        datenschutz_bestaetigt: data.datenschutz,
        signatur_haupt_url: parsed.signaturHaupt,
        signatur_mit_url: data.mitantragsteller ? (parsed.signaturMit ?? null) : null,
        submitted_at: new Date().toISOString(),
        ip: ipRaw as never,
        user_agent: userAgent,
        close_lead_id: parsed.close_lead_id ?? null,
        close_opportunity_id: parsed.close_opportunity_id ?? null,
        berater_vorname: parsed.berater_vorname ?? null,
        berater_nachname: parsed.berater_nachname ?? null,
      },
      { onConflict: "kunde_id" },
    )
    .select("id")
    .single();
  if (saErr) throw new Error(saErr.message);

  // 2) Immobilien-Subform ersetzen.
  await supabase.from("selbstauskunft_immobilien").delete().eq("selbstauskunft_id", saRow.id);
  if (data.immobilienvermoegen === "ja" && data.immobilien.length > 0) {
    const rows = data.immobilien
      .filter((i) => i.objektart || i.adresse || i.verkehrswert)
      .map((i: ImmobilieData) => ({
        selbstauskunft_id: saRow.id,
        objektart: i.objektart || null,
        adresse: i.adresse || null,
        verkehrswert: i.verkehrswert ? parseEuro(i.verkehrswert) : null,
        restdarlehen: i.restdarlehen ? parseEuro(i.restdarlehen) : null,
        mieteinnahme_monat: i.mieteinnahme_monat ? parseEuro(i.mieteinnahme_monat) : null,
        eigennutzung: i.eigennutzung,
      }));
    if (rows.length > 0) {
      const { error: immErr } = await supabase
        .from("selbstauskunft_immobilien")
        .insert(rows);
      if (immErr) throw new Error(immErr.message);
    }
  }

  // 3) kunden-Mirror + Bonität (Admin-Client, umgeht protect-Trigger).
  // Hinweis: Die Selbstauskunft erfasst NETTO-Einnahmen (wie Fillout). Als
  // Einkommensbasis für die (konservative) Bonität wird die annualisierte
  // Gesamteinnahme genutzt — netto < brutto, also im sicheren Bereich. Der VP
  // kann brutto_jahreseinkommen bei Bedarf nachschärfen.
  const admin = createAdminClient();
  const berufStatus = berufStatusFromBeschaeftigung(data.haupt.beschaeftigung);
  const einkommenJahr = Math.round(eval_.einnahmen_summe_monat * 12);
  const verheiratet = istVerheiratet(data.haupt.familienstand);
  const kinder = Math.max(0, Math.round(parseEuro(data.haupt.kinder_anzahl)));

  const mirror: Database["public"]["Tables"]["kunden"]["Update"] = {
    vorname: data.haupt.vorname.trim() || null,
    nachname: data.haupt.nachname.trim() || null,
    geburtsdatum: data.haupt.geburtsdatum || null,
    telefon: data.haupt.telefon.trim() || null,
    adresse: data.haupt.strasse.trim() || null,
    plz: data.haupt.plz.trim() || null,
    stadt: data.haupt.ort.trim() || null,
    verheiratet,
    kinder_anzahl: kinder,
    erwachsene_im_haushalt: data.mitantragsteller ? 2 : 1,
    bestehende_immobilien: data.immobilienvermoegen === "ja",
    eigenkapital: eval_.vermoegen_summe,
    kreditverpflichtungen_monatlich: eval_.kreditverpflichtungen_monat,
    selbstauskunft_step: 7,
    selbstauskunft_submitted_at: new Date().toISOString(),
  };

  // Bonität nur rechnen, wenn ein Bonitäts-Status + Einkommen vorliegt.
  if (berufStatus && einkommenJahr > 0) {
    const bon = calculateBonitaet({
      brutto: einkommenJahr,
      verheiratet,
      eigenkapital: eval_.vermoegen_summe,
      kreditverpflichtungen_monatlich: eval_.kreditverpflichtungen_monat,
      erwachsene_im_haushalt: data.mitantragsteller ? 2 : 1,
      kinder_anzahl: kinder,
      beruf_status: berufStatus,
    });
    mirror.beruf_status = berufStatus;
    mirror.brutto_jahreseinkommen = einkommenJahr;
    mirror.persoenlicher_steuersatz = bon.steuersatz_grenze;
    mirror.steuersatz_durchschnitt = bon.steuersatz_durchschnitt;
    mirror.max_finanzierbar = bon.max_finanzierbar;
    mirror.max_monatsrate = bon.max_monatsrate;
    mirror.max_darlehen = bon.max_darlehen;
  }

  const { error: kErr } = await admin.from("kunden").update(mirror).eq("id", kunde.id);
  if (kErr) throw new Error(kErr.message);

  revalidatePath("/portal");
  revalidatePath("/portal/selbstauskunft");
  return { ok: true };
}
