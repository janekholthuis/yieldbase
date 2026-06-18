"use server";

// Client-invokable server actions for the Kunden feature: create, Bonität
// recompute, and customer-portal activation. Each action authenticates via
// requireUser() and runs RLS-scoped queries as the signed-in user. Ported from
// the OLD APP TanStack serverFns in kunden.functions.ts.
//
// activateKundenportal uses the service-role admin client (createAdminClient)
// because it creates auth users, assigns roles, mirrors profile data and
// generates magic links — exactly as the OLD APP's supabaseAdmin path did.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateBonitaet } from "@/lib/bonitaet";
import { sendEmail } from "@/lib/email/resend";
import { portalLinkEmail } from "@/lib/email/templates";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type AuthedClient = SupabaseClient<Database>;

// ───────────── Shared schemas ─────────────
const Anrede = z.enum(["herr", "frau", "divers"]);
const BerufStatus = z.enum(["angestellter", "selbststaendiger", "unternehmer"]);

const beruflichSchema = z.object({
  beruf_status: BerufStatus,
  brutto_jahreseinkommen: z.number().min(0).max(10_000_000),
  verheiratet: z.boolean(),
  erwachsene_im_haushalt: z.union([z.literal(1), z.literal(2)]),
  kinder_anzahl: z.number().int().min(0).max(15),
});

const finanziellSchema = z.object({
  eigenkapital: z.number().min(0).max(100_000_000),
  kreditverpflichtungen_monatlich: z.number().min(0).max(1_000_000),
  bestehende_immobilien: z.boolean(),
});

// Kunde anlegen erfasst bewusst nur die Stammdaten (Anrede/Name/Email) — Beruf,
// Einkommen, Haushalt und Finanzen gibt der Kunde selbst in der Selbstauskunft
// an. Alle übrigen Felder sind optional und defaulten serverseitig, damit die
// Bonitäts-Berechnung (zunächst 0) und der Insert weiter funktionieren.
const createInput = z.object({
  anrede: Anrede.default("herr"),
  vorname: z.string().trim().min(1).max(60),
  nachname: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200).optional().nullable(),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  telefon: z.string().trim().max(60).optional().nullable(),
  adresse: z.string().trim().max(200).optional().nullable(),
  plz: z.string().trim().max(10).optional().nullable(),
  stadt: z.string().trim().max(100).optional().nullable(),
  bundesland: z.string().trim().max(60).optional().nullable(),
  beruf_status: BerufStatus.default("angestellter"),
  brutto_jahreseinkommen: z.number().min(0).max(10_000_000).default(0),
  verheiratet: z.boolean().default(false),
  erwachsene_im_haushalt: z.union([z.literal(1), z.literal(2)]).default(1),
  kinder_anzahl: z.number().int().min(0).max(15).default(0),
  eigenkapital: z.number().min(0).max(100_000_000).default(0),
  kreditverpflichtungen_monatlich: z.number().min(0).max(1_000_000).default(0),
  bestehende_immobilien: z.boolean().default(false),
  // CRM-Verknüpfung (Close.io) — kommt aus der Prefill-URL, die der Berater
  // öffnet; wird in persoenliche_daten abgelegt, damit die Lead-Zuordnung
  // erhalten bleibt (und später z. B. an die Selbstauskunft durchgereicht wird).
  close_lead_id: z.string().trim().max(200).optional().nullable(),
  close_opportunity_id: z.string().trim().max(200).optional().nullable(),
  berater_vorname: z.string().trim().max(120).optional().nullable(),
  berater_nachname: z.string().trim().max(120).optional().nullable(),
});

const updateInput = z
  .object({ id: z.string().uuid() })
  .merge(beruflichSchema)
  .merge(finanziellSchema);

// ───────────── Helpers ─────────────
async function assertCanCreateKunde(sb: AuthedClient, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  const allowed = ["vp_l1", "vp_l2", "vp_l3", "vertriebsleiter", "admin"];
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error("Nur VPs, Vertriebsleiter oder Admins dürfen Kunden anlegen");
  }
}

async function assertCanManageKunde(sb: AuthedClient, actorId: string, kundeId: string) {
  const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", actorId);
  const r = (roles ?? []).map((x) => x.role);
  if (r.includes("admin") || r.includes("support")) return;

  const { data: k } = await sb
    .from("kunden")
    .select("vp_id")
    .eq("id", kundeId)
    .maybeSingle();
  if (!k) throw new Error("Kunde nicht gefunden");

  if (k.vp_id === actorId) return;

  const { data: isDesc } = await sb.rpc("is_descendant_of", {
    _ancestor: actorId,
    _descendant: k.vp_id,
  });
  if (isDesc) return;

  if (r.includes("vertriebsleiter")) {
    const { data: h } = await sb
      .from("vp_hierarchy")
      .select("vp_id")
      .eq("vp_id", k.vp_id)
      .eq("vertriebsleiter_id", actorId)
      .maybeSingle();
    if (h) return;
  }
  throw new Error("Keine Berechtigung für diesen Kunden");
}

// ───────────── createKunde ─────────────
export async function createKunde(input: z.input<typeof createInput>) {
  const { supabase, userId } = await requireUser();
  const data = createInput.parse(input);
  await assertCanCreateKunde(supabase, userId);

  const bon = calculateBonitaet({
    brutto: data.brutto_jahreseinkommen,
    verheiratet: data.verheiratet,
    eigenkapital: data.eigenkapital,
    kreditverpflichtungen_monatlich: data.kreditverpflichtungen_monatlich,
    erwachsene_im_haushalt: data.erwachsene_im_haushalt,
    kinder_anzahl: data.kinder_anzahl,
    beruf_status: data.beruf_status,
  });

  const { data: ins, error } = await supabase
    .from("kunden")
    .insert({
      vp_id: userId,
      user_id: null,
      status: "lead",
      anrede: data.anrede,
      vorname: data.vorname,
      nachname: data.nachname,
      geburtsdatum: data.geburtsdatum || null,
      email: data.email || null,
      telefon: data.telefon || null,
      adresse: data.adresse || null,
      plz: data.plz || null,
      stadt: data.stadt || null,
      bundesland: data.bundesland || null,
      beruf_status: data.beruf_status,
      brutto_jahreseinkommen: data.brutto_jahreseinkommen,
      verheiratet: data.verheiratet,
      erwachsene_im_haushalt: data.erwachsene_im_haushalt,
      kinder_anzahl: data.kinder_anzahl,
      eigenkapital: data.eigenkapital,
      kreditverpflichtungen_monatlich: data.kreditverpflichtungen_monatlich,
      bestehende_immobilien: data.bestehende_immobilien,
      persoenlicher_steuersatz: bon.steuersatz_grenze,
      steuersatz_durchschnitt: bon.steuersatz_durchschnitt,
      max_finanzierbar: bon.max_finanzierbar,
      max_monatsrate: bon.max_monatsrate,
      max_darlehen: bon.max_darlehen,
      persoenliche_daten: {
        ...(data.close_lead_id ? { close_lead_id: data.close_lead_id } : {}),
        ...(data.close_opportunity_id
          ? { close_opportunity_id: data.close_opportunity_id }
          : {}),
        ...(data.berater_vorname ? { berater_vorname: data.berater_vorname } : {}),
        ...(data.berater_nachname
          ? { berater_nachname: data.berater_nachname }
          : {}),
      },
    })
    .select("id")
    .single();

  if (error) throw new Error(`Kunde anlegen fehlgeschlagen: ${error.message}`);

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${ins.id}`);
  return { id: ins.id, bonitaet: bon };
}

// ───────────── updateKundeStammdaten ─────────────
// Stammdaten (Anrede/Name/Email/Kontakt) eines bestehenden Kunden ändern.
// RLS-gescopt als eingeloggter VP; bei aktiviertem Portal werden die Profil-
// Daten gespiegelt, damit der Kunde aktuelle Angaben sieht.
const stammdatenInput = z.object({
  id: z.string().uuid(),
  anrede: Anrede,
  vorname: z.string().trim().min(1).max(60),
  nachname: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200).optional().nullable(),
  telefon: z.string().trim().max(60).optional().nullable(),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  adresse: z.string().trim().max(200).optional().nullable(),
  plz: z.string().trim().max(10).optional().nullable(),
  stadt: z.string().trim().max(100).optional().nullable(),
  bundesland: z.string().trim().max(60).optional().nullable(),
});

export async function updateKundeStammdaten(
  input: z.input<typeof stammdatenInput>,
) {
  const { supabase, userId } = await requireUser();
  const data = stammdatenInput.parse(input);
  await assertCanManageKunde(supabase, userId, data.id);

  const patch = {
    anrede: data.anrede,
    vorname: data.vorname,
    nachname: data.nachname,
    email: data.email || null,
    telefon: data.telefon || null,
    geburtsdatum: data.geburtsdatum || null,
    adresse: data.adresse || null,
    plz: data.plz || null,
    stadt: data.stadt || null,
    bundesland: data.bundesland || null,
  };

  const { data: updated, error } = await supabase
    .from("kunden")
    .update(patch)
    .eq("id", data.id)
    .select("user_id")
    .single();
  if (error) throw new Error(`Aktualisieren fehlgeschlagen: ${error.message}`);

  // Bei aktiviertem Portal das Profil spiegeln (Anzeige-Daten im Portal).
  // Hinweis: die Auth-Login-Email wird bewusst NICHT geändert.
  if (updated?.user_id) {
    const admin = createAdminClient();
    await admin
      .from("profiles")
      .update({
        anrede: data.anrede,
        vorname: data.vorname,
        nachname: data.nachname,
        name: `${data.vorname} ${data.nachname}`.trim(),
        email: data.email || null,
        phone: data.telefon || null,
        geburtsdatum: data.geburtsdatum || null,
        address: data.adresse || null,
        plz: data.plz || null,
        stadt: data.stadt || null,
        bundesland: data.bundesland || null,
      })
      .eq("id", updated.user_id);
  }

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${data.id}`);
  return { ok: true };
}

// ───────────── updateBonitaet ─────────────
export async function updateBonitaet(input: z.input<typeof updateInput>) {
  const { supabase, userId } = await requireUser();
  const data = updateInput.parse(input);
  await assertCanManageKunde(supabase, userId, data.id);

  const bon = calculateBonitaet({
    brutto: data.brutto_jahreseinkommen,
    verheiratet: data.verheiratet,
    eigenkapital: data.eigenkapital,
    kreditverpflichtungen_monatlich: data.kreditverpflichtungen_monatlich,
    erwachsene_im_haushalt: data.erwachsene_im_haushalt,
    kinder_anzahl: data.kinder_anzahl,
    beruf_status: data.beruf_status,
  });

  const { error } = await supabase
    .from("kunden")
    .update({
      beruf_status: data.beruf_status,
      brutto_jahreseinkommen: data.brutto_jahreseinkommen,
      verheiratet: data.verheiratet,
      erwachsene_im_haushalt: data.erwachsene_im_haushalt,
      kinder_anzahl: data.kinder_anzahl,
      eigenkapital: data.eigenkapital,
      kreditverpflichtungen_monatlich: data.kreditverpflichtungen_monatlich,
      bestehende_immobilien: data.bestehende_immobilien,
      persoenlicher_steuersatz: bon.steuersatz_grenze,
      steuersatz_durchschnitt: bon.steuersatz_durchschnitt,
      max_finanzierbar: bon.max_finanzierbar,
      max_monatsrate: bon.max_monatsrate,
      max_darlehen: bon.max_darlehen,
    })
    .eq("id", data.id);
  if (error) throw new Error(error.message);

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${data.id}`);
  return { ok: true, bonitaet: bon };
}

// ───────────── activateKundenportal ─────────────
// Idempotent portal activation: creates the auth user, assigns role 'kunde',
// links kunden.user_id, mirrors profile data, sets status 'aktiviert' and
// generates a magic link. Uses the SERVICE-ROLE admin client (bypasses RLS)
// exactly as the OLD APP's supabaseAdmin path. Authorisation is enforced first
// via the signed-in user (assertCanManageKunde) before any admin work runs.
export async function activateKundenportal(input: { id: string }): Promise<{
  ok: boolean;
  userId: string | null;
  magicLinkSent: boolean;
  alreadyActive?: boolean;
  warning?: string;
  action_link?: string | null;
}> {
  const { supabase, userId: actorId } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(input);
  await assertCanManageKunde(supabase, actorId, id);

  const admin = createAdminClient();

  const { data: k, error: kErr } = await admin
    .from("kunden")
    .select("*")
    .eq("id", id)
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

  revalidatePath("/kunden");
  revalidatePath(`/kunden/${id}`);

  // 5) Login-Link generieren. WICHTIG: generateLink ERZEUGT nur den Link und
  // versendet KEINE E-Mail. Wir versenden ihn daher selbst via Resend
  // (send-portal-link) und geben den Link zusätzlich als Fallback zurück.
  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: k.email,
  });
  if (lErr) {
    return { ok: true, userId: newUserId, magicLinkSent: false, warning: lErr.message };
  }
  const action_link = link?.properties?.action_link ?? null;
  const magicLinkSent = await sendPortalLinkEmail(admin, {
    to: k.email,
    name: `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || null,
    loginUrl: action_link,
  });
  return { ok: true, userId: newUserId, magicLinkSent, action_link };
}

// Versendet den Portal-Login-Link direkt via Resend (best-effort). Liefert true
// bei Erfolg; bei fehlender Resend-Konfiguration false → der Aufrufer zeigt den
// Link zum Kopieren. (Früher über die Supabase-Edge-Function send-portal-link.)
async function sendPortalLinkEmail(
  _admin: ReturnType<typeof createAdminClient>,
  args: { to: string; name: string | null; loginUrl: string | null; orgName?: string | null },
): Promise<boolean> {
  if (!args.loginUrl) return false;
  const { subject, html } = portalLinkEmail({
    kundeName: args.name,
    orgName: args.orgName ?? null,
    loginUrl: args.loginUrl,
  });
  const res = await sendEmail({ to: args.to, subject, html, from: process.env.PORTAL_FROM_EMAIL });
  return res.ok;
}

// ───────────── resendPortalLink ─────────────
// Erzeugt für einen bereits aktivierten Kunden einen frischen einmaligen
// Login-Link (z. B. wenn der erste Link abgelaufen ist oder nicht ankam). Wie
// bei der Aktivierung wird KEINE E-Mail versendet — der Link wird zurückgegeben,
// damit der VP ihn dem Kunden zustellt. Service-Role; Autorisierung zuerst.
export async function resendPortalLink(input: { id: string }): Promise<{
  action_link: string | null;
  magicLinkSent: boolean;
}> {
  const { supabase, userId: actorId } = await requireUser();
  const { id } = z.object({ id: z.string().uuid() }).parse(input);
  await assertCanManageKunde(supabase, actorId, id);

  const admin = createAdminClient();
  const { data: k, error: kErr } = await admin
    .from("kunden")
    .select("email, user_id, vorname, nachname")
    .eq("id", id)
    .maybeSingle();
  if (kErr || !k) throw new Error("Kunde nicht gefunden");
  if (!k.email) throw new Error("Kunde hat keine Email-Adresse, bitte zuerst hinterlegen");
  if (!k.user_id)
    throw new Error("Kundenportal ist noch nicht aktiviert — bitte zuerst aktivieren");

  const { data: link, error: lErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: k.email,
  });
  if (lErr) throw new Error(`Login-Link konnte nicht erzeugt werden: ${lErr.message}`);

  const action_link = link?.properties?.action_link ?? null;
  const magicLinkSent = await sendPortalLinkEmail(admin, {
    to: k.email,
    name: `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || null,
    loginUrl: action_link,
  });
  return { action_link, magicLinkSent };
}
