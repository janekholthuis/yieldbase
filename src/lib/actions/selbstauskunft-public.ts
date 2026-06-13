"use server";

// PROJ-7 — Selbstauskunft OHNE Login (Token-Link). Der Kunde öffnet
// /selbstauskunft/<token> und füllt ohne Account aus. Der Token am Kunden
// (kunden.selbstauskunft_token) wird serverseitig validiert; ALLE Schreib-/
// Lesevorgänge laufen über den Service-Role-Client, strikt auf den Token-Kunden
// begrenzt. Login folgt erst später (ab Reservierung). Spiegelt die
// authentifizierten Actions in selbstauskunft.ts, ohne auth.uid().

import { z } from "zod";
import { headers } from "next/headers";

import { createAdminClient } from "@/lib/supabase/admin";
import { calculateBonitaet } from "@/lib/bonitaet";
import {
  type SelbstauskunftData,
  type ImmobilieData,
  auswerten,
  berufStatusFromBeschaeftigung,
  istVerheiratet,
  validatePersonStep,
  parseEuro,
} from "@/lib/selbstauskunft";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AdminClient = SupabaseClient<Database>;
const CONTENT_STEPS = [1, 2, 3, 4, 6] as const; // 5 = Immobilien, 7 = Unterschrift
const tokenSchema = z.string().uuid("Ungültiger Link");

async function findKundeByToken(admin: AdminClient, rawToken: string) {
  const token = tokenSchema.parse(rawToken);
  const { data, error } = await admin
    .from("kunden")
    .select(
      "id, organisation_id, vp_id, vorname, nachname, email, telefon, geburtsdatum, adresse, plz, stadt",
    )
    .eq("selbstauskunft_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Dieser Link ist ungültig oder abgelaufen.");
  return data;
}

const crmSchema = {
  close_lead_id: z.string().trim().max(120).optional().nullable(),
  close_opportunity_id: z.string().trim().max(120).optional().nullable(),
  berater_vorname: z.string().trim().max(120).optional().nullable(),
  berater_nachname: z.string().trim().max(120).optional().nullable(),
};

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

// ───────────── getSelbstauskunftByToken ─────────────
export async function getSelbstauskunftByToken(token: string) {
  const admin = createAdminClient();
  const kunde = await findKundeByToken(admin, token);

  const { data: row } = await admin
    .from("selbstauskuenfte")
    .select(
      "id, status, step, mitantragsteller, daten, submitted_at, close_lead_id, close_opportunity_id, berater_vorname, berater_nachname",
    )
    .eq("kunde_id", kunde.id)
    .maybeSingle();

  let immobilien: ImmobilieData[] = [];
  if (row?.id) {
    const { data: imm } = await admin
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

  let berater: { vorname: string | null; nachname: string | null } | null = null;
  if (kunde.vp_id) {
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

// ───────────── saveSelbstauskunftDraftByToken (Autosave) ─────────────
const saveDraftSchema = z.object({
  token: tokenSchema,
  step: z.number().int().min(0).max(7),
  data: z.record(z.string(), z.unknown()),
  ...crmSchema,
});

export async function saveSelbstauskunftDraftByToken(
  input: z.input<typeof saveDraftSchema>,
) {
  const parsed = saveDraftSchema.parse(input);
  const admin = createAdminClient();
  const kunde = await findKundeByToken(admin, parsed.token);

  const data = parsed.data as unknown as SelbstauskunftData;

  const { error } = await admin.from("selbstauskuenfte").upsert(
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
  return { ok: true };
}

// ───────────── submitSelbstauskunftByToken ─────────────
const submitSchema = z.object({
  token: tokenSchema,
  data: z.record(z.string(), z.unknown()),
  signaturHaupt: z.string().min(1, "Unterschrift fehlt").max(2_000_000),
  signaturMit: z.string().max(2_000_000).nullable().optional(),
  ...crmSchema,
});

export async function submitSelbstauskunftByToken(
  input: z.input<typeof submitSchema>,
) {
  const parsed = submitSchema.parse(input);
  const data = parsed.data as unknown as SelbstauskunftData;

  const err = validateAll(data);
  if (err) throw new Error(err);
  if (data.mitantragsteller && !(parsed.signaturMit && parsed.signaturMit.length > 0))
    throw new Error("Unterschrift des Mitantragstellers fehlt");

  const admin = createAdminClient();
  const kunde = await findKundeByToken(admin, parsed.token);
  const eval_ = auswerten(data);

  const h = await headers();
  const ipRaw = sanitizeIp((h.get("x-forwarded-for") ?? "").split(",")[0] ?? null);
  const userAgent = h.get("user-agent");

  // 1) selbstauskuenfte finalisieren (Admin — token-scoped).
  const { data: saRow, error: saErr } = await admin
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
  await admin.from("selbstauskunft_immobilien").delete().eq("selbstauskunft_id", saRow.id);
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
      const { error: immErr } = await admin
        .from("selbstauskunft_immobilien")
        .insert(rows);
      if (immErr) throw new Error(immErr.message);
    }
  }

  // 3) kunden-Mirror + (konservative) Netto-Bonität.
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

  return { ok: true };
}
