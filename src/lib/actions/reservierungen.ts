"use server";

// Client-invokable server actions for the Reservierungen feature: create a
// reservation (with signature + bank data), attach the generated PDF, cancel,
// extend, produce signed download URLs and trigger the confirmation email.
// Each action authenticates via requireUser() and runs RLS-scoped queries as
// the signed-in user. Ported from the OLD APP TanStack serverFns in
// reservierungen.functions.ts.
//
// Admin (service-role) client usage: createReservierung auto-activates the
// customer portal — creating an auth user, assigning the 'kunde' role, mirroring
// profile data, linking kunden.user_id and generating a magic link — exactly as
// the OLD APP's activateKundePortalCore did via supabaseAdmin. That work bypasses
// RLS and must run with elevated privileges.
//
// Storage: attachReservierungPdf / getReservierungSignedUrl / sendReservierungEmail
// use the `reservierungen` bucket via the signed-in user's client (RLS-scoped),
// matching the OLD APP.
//
// Edge function: sendReservierungEmail invokes the `send-reservation-email`
// Supabase edge function (will work once the edge fn is deployed).
import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ───────────── createReservierung ─────────────
const createInput = z.object({
  einheitId: z.string().uuid(),
  kundeId: z.string().uuid(),
  signatur_data_url: z.string().startsWith("data:image/png").max(2_000_000),
  bemerkungen: z.string().max(2000).optional(),
  dauerTage: z.number().int().min(1).max(365).default(30),
  reservierungsgebuehr: z.number().min(0).max(100_000).default(500),
  bank_kontoinhaber: z.string().max(200).optional().nullable(),
  bank_iban: z.string().max(50).optional().nullable(),
  bank_bic: z.string().max(20).optional().nullable(),
});

export async function createReservierung(input: z.input<typeof createInput>) {
  const { supabase, userId } = await requireUser();
  const data = createInput.parse(input);

  // Sub-Block 10: Hard-Block — Reservierung nur möglich, wenn das Projekt
  // hinter der Einheit vollständige Bank-Daten (Kontoinhaber + IBAN) hat.
  const { data: einheitRow, error: einheitErr } = await supabase
    .from("einheiten")
    .select("projekt_id, projekte:projekt_id(bank_kontoinhaber, bank_iban)")
    .eq("id", data.einheitId)
    .maybeSingle();
  if (einheitErr || !einheitRow) {
    throw new Error("Einheit nicht gefunden.");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const projektBank = (einheitRow as any).projekte ?? {};
  const ibanOk =
    typeof projektBank.bank_iban === "string" &&
    projektBank.bank_iban.trim().length > 0;
  const kontoinhaberOk =
    typeof projektBank.bank_kontoinhaber === "string" &&
    projektBank.bank_kontoinhaber.trim().length > 0;
  if (!ibanOk || !kontoinhaberOk) {
    throw new Error(
      "Reservierung blockiert: Für dieses Projekt sind keine Bank-Daten (Kontoinhaber/IBAN) hinterlegt. Bitte zuerst im Projekt pflegen.",
    );
  }

  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent") ?? null;
  const xff = hdrs.get("x-forwarded-for") ?? null;
  const ip = xff ? xff.split(",")[0]!.trim() : null;
  const now = new Date();
  const expires = new Date(now.getTime() + data.dauerTage * 86400_000);

  const { data: row, error } = await supabase
    .from("reservierungen")
    .insert({
      einheit_id: data.einheitId,
      kunde_id: data.kundeId,
      vp_id: userId,
      status: "reserviert",
      signed_at: now.toISOString(),
      expires_at: expires.toISOString(),
      reservierungsgebuehr: data.reservierungsgebuehr,
      bank_kontoinhaber: data.bank_kontoinhaber ?? null,
      bank_iban: data.bank_iban ?? null,
      bank_bic: data.bank_bic ?? null,
      signatur_data_url: data.signatur_data_url,
      audit_user_agent: userAgent,
      audit_timestamp: now.toISOString(),
      ip,
      bemerkungen: data.bemerkungen ?? null,
    })
    .select("id, expires_at")
    .single();

  if (error) throw new Error(error.message);

  // Einheit-Status auf reserviert
  await supabase
    .from("einheiten")
    .update({ status: "reserviert" })
    .eq("id", data.einheitId);

  // Zuweisung anlegen oder Status nachziehen, damit die Wohnung im Kunden-View erscheint
  const { data: zRow } = await supabase
    .from("objekt_kunde_zuweisungen")
    .select("id")
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId)
    .maybeSingle();
  if (zRow) {
    await supabase
      .from("objekt_kunde_zuweisungen")
      .update({ status: "reserviert" })
      .eq("id", zRow.id);
  } else {
    // vp_id muss laut RLS dem vp_id des Kunden entsprechen
    const { data: kRow } = await supabase
      .from("kunden")
      .select("vp_id")
      .eq("id", data.kundeId)
      .maybeSingle();
    const zVpId = kRow?.vp_id ?? userId;
    const { error: zErr } = await supabase
      .from("objekt_kunde_zuweisungen")
      .insert({
        einheit_id: data.einheitId,
        kunde_id: data.kundeId,
        vp_id: zVpId,
        status: "reserviert",
      });
    if (zErr) {
      console.warn("[createReservierung] Zuweisung konnte nicht angelegt werden", zErr);
    }
  }

  // Auto-Aktivierung Kunden-Portal (best-effort, blockiert nicht)
  try {
    await activateKundePortalCore(data.kundeId);
  } catch (err) {
    console.warn("[createReservierung] Portal-Aktivierung fehlgeschlagen", err);
  }

  revalidatePath("/reservierungen");
  return { id: row.id, expiresAt: row.expires_at };
}

// Idempotent customer-portal activation. Creates the auth user, assigns role
// 'kunde', links kunden.user_id, mirrors profile data, sets status 'aktiviert'
// and generates a magic link. Uses the SERVICE-ROLE admin client (bypasses RLS),
// exactly as the OLD APP's activateKundePortalCore (supabaseAdmin) path.
async function activateKundePortalCore(kundeId: string): Promise<{
  ok: boolean;
  userId: string | null;
  magicLinkSent: boolean;
  alreadyActive?: boolean;
  warning?: string;
  action_link?: string | null;
}> {
  const admin = createAdminClient();

  const { data: k, error: kErr } = await admin
    .from("kunden")
    .select("*")
    .eq("id", kundeId)
    .maybeSingle();
  if (kErr || !k) throw new Error("Kunde nicht gefunden");
  if (!k.email) throw new Error("Kunde hat keine Email-Adresse, bitte zuerst hinterlegen");
  if (k.user_id) {
    return { ok: true, userId: k.user_id, magicLinkSent: false, alreadyActive: true };
  }

  // 1) Auth-User holen oder anlegen
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list?.users.find(
    (u) => u.email?.toLowerCase() === k.email!.toLowerCase(),
  );

  let newUserId: string;
  if (existing) {
    newUserId = existing.id;
  } else {
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email: k.email,
      email_confirm: true,
      user_metadata: { name: `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() },
    });
    if (cErr || !created.user)
      throw new Error(`Auth-User konnte nicht angelegt werden: ${cErr?.message}`);
    newUserId = created.user.id;
  }

  // 2) Rolle 'kunde' (idempotent)
  await admin
    .from("user_roles")
    .upsert({ user_id: newUserId, role: "kunde" }, { onConflict: "user_id,role" });

  // 3) Profile-Daten spiegeln
  await admin.from("profiles").upsert(
    {
      id: newUserId,
      email: k.email,
      name: `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || k.email,
      anrede: k.anrede,
      vorname: k.vorname,
      nachname: k.nachname,
      geburtsdatum: k.geburtsdatum,
      phone: k.telefon,
      address: k.adresse,
      plz: k.plz,
      stadt: k.stadt,
      bundesland: k.bundesland,
      persoenlicher_steuersatz: k.persoenlicher_steuersatz,
      steuersatz_durchschnitt: k.steuersatz_durchschnitt,
    },
    { onConflict: "id" },
  );

  // 4) Kunde verknüpfen + Status
  const { error: uErr } = await admin
    .from("kunden")
    .update({ user_id: newUserId, status: "aktiviert" })
    .eq("id", k.id);
  if (uErr) throw new Error(`Kunde-Verknüpfung fehlgeschlagen: ${uErr.message}`);

  // 5) Magic-Link generieren (Supabase versendet Mail automatisch)
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: k.email,
  });
  if (lErr) {
    return { ok: true, userId: newUserId, magicLinkSent: false, warning: lErr.message };
  }
  return {
    ok: true,
    userId: newUserId,
    magicLinkSent: true,
    action_link: link?.properties?.action_link ?? null,
  };
}

// ───────────── attachReservierungPdf ─────────────
const attachInput = z.object({
  reservierungId: z.string().uuid(),
  einheitId: z.string().uuid(),
  pdfBase64: z.string().min(100),
});

export async function attachReservierungPdf(input: z.input<typeof attachInput>) {
  const { supabase } = await requireUser();
  const data = attachInput.parse(input);

  const path = `${data.einheitId}/${data.reservierungId}.pdf`;
  const bytes = Uint8Array.from(atob(data.pdfBase64), (c) => c.charCodeAt(0));

  const { error: upErr } = await supabase.storage
    .from("reservierungen")
    .upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) throw new Error(upErr.message);

  await supabase
    .from("reservierungen")
    .update({ pdf_url: path })
    .eq("id", data.reservierungId);

  // Signed URL (7 Tage) zum sofortigen Download / Email
  const { data: signed } = await supabase.storage
    .from("reservierungen")
    .createSignedUrl(path, 60 * 60 * 24 * 7);

  revalidatePath("/reservierungen");
  return { path, signedUrl: signed?.signedUrl ?? null };
}

// ───────────── cancelReservierung ─────────────
export async function cancelReservierung(input: { id: string; grund?: string }) {
  const { supabase } = await requireUser();
  const data = z
    .object({ id: z.string().uuid(), grund: z.string().max(500).optional() })
    .parse(input);

  const { error } = await supabase
    .from("reservierungen")
    .update({
      status: "storniert",
      bemerkungen: data.grund ?? null,
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);

  revalidatePath("/reservierungen");
  return { ok: true };
}

// ───────────── extendReservierung ─────────────
export async function extendReservierung(input: { id: string; tage: number }) {
  const { supabase, userId } = await requireUser();
  const data = z
    .object({ id: z.string().uuid(), tage: z.number().int().min(1).max(365) })
    .parse(input);

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  if (!isAdmin) throw new Error("Nur Admins dürfen verlängern.");

  const { data: cur } = await supabase
    .from("reservierungen")
    .select("expires_at")
    .eq("id", data.id)
    .maybeSingle();
  if (!cur) throw new Error("Reservierung nicht gefunden");
  const base = new Date(cur.expires_at);
  const next = new Date(
    Math.max(base.getTime(), Date.now()) + data.tage * 86400_000,
  );
  const { error } = await supabase
    .from("reservierungen")
    .update({ expires_at: next.toISOString() })
    .eq("id", data.id);
  if (error) throw new Error(error.message);

  revalidatePath("/reservierungen");
  return { expiresAt: next.toISOString() };
}

// ───────────── getReservierungSignedUrl ─────────────
export async function getReservierungSignedUrl(input: { id: string }) {
  const { supabase } = await requireUser();
  const data = z.object({ id: z.string().uuid() }).parse(input);

  const { data: row } = await supabase
    .from("reservierungen")
    .select("pdf_url")
    .eq("id", data.id)
    .maybeSingle();
  if (!row?.pdf_url) throw new Error("Kein PDF vorhanden");
  const { data: signed, error } = await supabase.storage
    .from("reservierungen")
    .createSignedUrl(row.pdf_url, 60 * 60);
  if (error || !signed) throw new Error(error?.message ?? "Signed URL fehlgeschlagen");
  return { signedUrl: signed.signedUrl };
}

// ───────────── sendReservierungEmail ─────────────
export async function sendReservierungEmail(input: { id: string }) {
  const { supabase } = await requireUser();
  const data = z.object({ id: z.string().uuid() }).parse(input);

  // Lade Reservierung mit allen Joins
  const { data: r, error } = await supabase
    .from("reservierungen")
    .select(
      `id, status, signed_at, expires_at, reservierungsgebuehr, pdf_url,
       bank_kontoinhaber, bank_iban, bank_bic,
       einheit:einheit_id ( wohnungsnummer, projekt:projekt_id ( name, stadt, adresse ) ),
       kunde:kunde_id ( vorname, nachname, email ),
       vp:vp_id ( vorname, nachname, name, email, phone )`,
    )
    .eq("id", data.id)
    .maybeSingle();
  if (error || !r) throw new Error(error?.message ?? "Reservierung nicht gefunden");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rr: any = r;
  if (!rr.kunde?.email) throw new Error("Kunde hat keine Email-Adresse");
  if (!rr.pdf_url) throw new Error("Kein PDF vorhanden");

  // Lade PDF aus Storage und encode base64
  const { data: blob, error: dlErr } = await supabase.storage
    .from("reservierungen")
    .download(rr.pdf_url);
  if (dlErr || !blob) throw new Error(dlErr?.message ?? "PDF Download fehlgeschlagen");
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]!);
  const pdfBase64 = btoa(bin);

  // TODO(migration): the OLD APP derived siteUrl from the incoming request
  // origin / x-forwarded-host. In Next.js we read it from the request headers
  // and fall back to NEXT_PUBLIC_SITE_URL (sane default for non-request contexts).
  const hdrs = await headers();
  const siteUrl =
    hdrs.get("origin") ??
    (hdrs.get("x-forwarded-host")
      ? `https://${hdrs.get("x-forwarded-host")}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

  // Invoke the `send-reservation-email` edge function. Works once the edge fn
  // is deployed; the authed client forwards the user's JWT automatically.
  const { data: json, error: fnErr } = await supabase.functions.invoke(
    "send-reservation-email",
    {
      body: {
        kunde: rr.kunde,
        vp: rr.vp,
        einheit: rr.einheit,
        bank: {
          kontoinhaber: rr.bank_kontoinhaber,
          iban: rr.bank_iban,
          bic: rr.bank_bic,
        },
        reservierungsgebuehr: rr.reservierungsgebuehr,
        expiresAt: rr.expires_at,
        pdfBase64,
        pdfFilename: `Reservierung_${rr.einheit?.wohnungsnummer ?? "Wohnung"}.pdf`,
        siteUrl,
      },
    },
  );
  if (fnErr) {
    throw new Error(`Email-Versand fehlgeschlagen: ${fnErr.message}`);
  }

  revalidatePath("/reservierungen");
  return { ok: true, recipient: rr.kunde.email, id: json?.id ?? null };
}
