"use server";

// Client-invokable server actions for the Finanzierungen feature: add a case
// comment, fill an offer, change a case status, and manage the per-project
// financier round-robin pool (RPC-based, admin/support only).
// Each action authenticates via requireUser() and runs RLS-scoped queries as the
// signed-in user. Ported from the OLD APP TanStack serverFns in
// finanzierung.functions.ts / finanzierer-pool.functions.ts.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser, requireRole } from "@/lib/auth";
import { assertEntitlement } from "@/lib/entitlements-server";
import { CASE_STATUS } from "@/lib/finanzierung-status";
import {
  listFinanziererForPool,
  listCasesForKunde,
  type FinanziererPoolResult,
  type CaseListItem,
} from "@/lib/data/finanzierung";

// ─── Kommentar hinzufügen ───────────────────────────────────────────
const addKommentarInput = z.object({
  caseId: z.string().uuid(),
  text: z.string().min(1).max(4000),
});

export async function addCaseKommentar(input: z.input<typeof addKommentarInput>) {
  const { supabase, userId } = await requireUser();
  const data = addKommentarInput.parse(input);

  const { error } = await supabase.from("finanzierungs_case_kommentare").insert({
    case_id: data.caseId,
    author_id: userId,
    text: data.text,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/finanzierungen/${data.caseId}`);
  return { ok: true };
}

// ─── Angebot ausfüllen (nur Finanzierer) ────────────────────────────
const OfferSchema = z.object({
  caseId: z.string().uuid(),
  zins_satz: z.number().min(0).max(20).nullable(),
  tilgung_initial: z.number().min(0).max(20).nullable(),
  laufzeit_jahre: z.number().int().min(1).max(50).nullable(),
  sondertilgung_pa: z.number().min(0).max(100).nullable(),
  monatliche_rate: z.number().min(0).max(100000).nullable(),
  finanzierungs_summe: z.number().min(0).max(100_000_000).nullable(),
  gesamtkosten: z.number().min(0).max(100_000_000).nullable(),
  notiz_finanzierer: z.string().max(4000).nullable(),
});

export async function updateCaseOffer(input: z.input<typeof OfferSchema>) {
  // Defense-in-depth: the offer fields (Zins, Rate, …) are the financier's to
  // fill. RLS lets the owning VP write the same row too (case_vp_update), but it
  // can't restrict per-column — so gate the offer action to financiers (plus
  // admin/support). The RLS `case_finanzierer_update` (finanzierer_id = self)
  // still scopes it to the financier's own assigned case.
  const { supabase } = await requireRole("finanzierer", "admin", "support");
  const data = OfferSchema.parse(input);

  const { caseId, ...patch } = data;
  const { error } = await supabase
    .from("finanzierungs_cases")
    .update({ ...patch, offer_filled_at: new Date().toISOString() })
    .eq("id", caseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/finanzierungen/${caseId}`);
  return { ok: true };
}

// ─── Status setzen ──────────────────────────────────────────────────
const updateStatusInput = z.object({
  caseId: z.string().uuid(),
  status: z.enum(CASE_STATUS),
});

export async function updateCaseStatus(input: z.input<typeof updateStatusInput>) {
  const { supabase } = await requireUser();
  const data = updateStatusInput.parse(input);

  const finalSet: Partial<{ final_status_at: string; offer_accepted_at: string }> = {};
  if (["genehmigt", "bewilligt", "abgelehnt", "ausgezahlt", "storniert"].includes(data.status)) {
    finalSet.final_status_at = new Date().toISOString();
  }
  if (data.status === "angebot_akzeptiert") {
    finalSet.offer_accepted_at = new Date().toISOString();
  }
  const { error } = await supabase
    .from("finanzierungs_cases")
    .update({ status: data.status, ...finalSet })
    .eq("id", data.caseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/finanzierungen/${data.caseId}`);
  revalidatePath("/finanzierungen");
  return { ok: true };
}

// ─── Finanzierer-Pool laden (Client-Wrapper) ────────────────────────
// Thin "use server" wrapper around the server-only data fn so the client
// FinanziererPoolTab can load + refresh the pool without importing a
// `server-only` module. Auth + admin/support gating happens inside
// listFinanziererForPool (returns { error: "Forbidden" } for other roles).
const getPoolInput = z.object({ projektId: z.string().uuid() });

export async function getFinanziererPool(
  input: z.input<typeof getPoolInput>,
): Promise<FinanziererPoolResult> {
  const data = getPoolInput.parse(input);
  return listFinanziererForPool({ projektId: data.projektId });
}

// ─── Finanzierer-Pool verwalten (RPC, admin/support) ────────────────
const poolMutationInput = z.object({
  projektId: z.string().uuid(),
  finanziererId: z.string().uuid(),
});

export async function addFinanziererToPool(
  input: z.input<typeof poolMutationInput>,
): Promise<{ ok: true }> {
  const { supabase } = await requireUser();
  const data = poolMutationInput.parse(input);

  const { error } = await supabase.rpc("add_finanzierer_to_pool", {
    p_projekt_id: data.projektId,
    p_finanzierer_id: data.finanziererId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/finanzierungen");
  return { ok: true };
}

export async function removeFinanziererFromPool(
  input: z.input<typeof poolMutationInput>,
): Promise<{ ok: true }> {
  const { supabase } = await requireUser();
  const data = poolMutationInput.parse(input);

  const { error } = await supabase.rpc("remove_finanzierer_from_pool", {
    p_projekt_id: data.projektId,
    p_finanzierer_id: data.finanziererId,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/finanzierungen");
  return { ok: true };
}

// ─── Cases eines Kunden laden (Client-Wrapper) ──────────────────────
// Thin "use server" wrapper around the server-only data fn so the client
// KundeDetailView "Finanzierung"-Tab can load + refresh the customer's cases
// without importing a `server-only` module. Auth + RLS are enforced inside
// listCasesForKunde (signed-in user, v_case_for_vp).
const listKundeCasesInput = z.object({ kundeId: z.string().uuid() });

export async function listKundeCases(
  input: z.input<typeof listKundeCasesInput>,
): Promise<CaseListItem[]> {
  const data = listKundeCasesInput.parse(input);
  return listCasesForKunde({ kundeId: data.kundeId });
}

// ─── Finanzierung anfragen (Case anlegen) ───────────────────────────
// Legt über die SECURITY-DEFINER-RPC `request_finanzierung` einen neuen
// Finanzierungs-Case an: die RPC macht Round-Robin-Zuweisung an den
// Finanzierer-Pool des Projekts, den Case-Insert und das Audit-Log und prüft
// dabei selbst Rolle + can_access_kunde. Wir rufen sie als angemeldeter Nutzer
// (RLS-Client, kein Admin-Bypass) und übersetzen DB-Fehler in verständliche
// deutsche Meldungen statt zu crashen.
const requestFinanzierungInput = z.object({
  kundeId: z.string().uuid(),
  einheitId: z.string().uuid(),
});

export async function requestFinanzierung(
  input: z.input<typeof requestFinanzierungInput>,
): Promise<{ ok: true; caseId: string } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  await assertEntitlement("finanzierungen"); // PROJ-31: defense-in-depth
  const data = requestFinanzierungInput.parse(input);

  const { data: caseId, error } = await supabase.rpc("request_finanzierung", {
    p_kunde_id: data.kundeId,
    p_einheit_id: data.einheitId,
  });

  if (error) {
    return { ok: false, error: friendlyRequestError(error.message) };
  }
  if (!caseId) {
    return {
      ok: false,
      error: "Die Finanzierungsanfrage konnte nicht angelegt werden.",
    };
  }

  revalidatePath(`/kunden/${data.kundeId}`);
  revalidatePath("/finanzierungen");
  return { ok: true, caseId: caseId as string };
}

/**
 * Übersetzt die Roh-Fehlermeldungen der `request_finanzierung`-RPC in
 * verständliche deutsche Hinweise. Der wichtigste Fall: viele Projekte haben
 * (noch) keinen Finanzierer-Pool — das ist erwartbar und darf nicht als
 * technischer Fehler durchschlagen.
 */
function friendlyRequestError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("kein finanzierer-pool")) {
    return "Für dieses Projekt ist noch kein Finanzierer-Pool hinterlegt. Bitte wende dich an deinen Administrator, damit ein Finanzierer zugewiesen wird.";
  }
  if (m.includes("kein zugriff auf diesen kunden")) {
    return "Du hast keinen Zugriff auf diesen Kunden.";
  }
  if (m.includes("nicht berechtigt")) {
    return "Du bist nicht berechtigt, eine Finanzierung anzufragen.";
  }
  if (m.includes("kunde nicht gefunden")) {
    return "Der Kunde wurde nicht gefunden.";
  }
  if (m.includes("einheit nicht gefunden")) {
    return "Die ausgewählte Einheit wurde nicht gefunden.";
  }
  return "Die Finanzierungsanfrage ist fehlgeschlagen. Bitte versuche es später erneut.";
}
