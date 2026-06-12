// Server-side data access for the Finanzierungen (financing cases) feature.
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Ported from the OLD APP TanStack serverFns
// in finanzierung.functions.ts / finanzierer-pool.functions.ts.
import "server-only";
import { requireUser } from "@/lib/auth";
import type { CaseStatus } from "@/lib/finanzierung-status";

export type { CaseStatus };

export interface CaseListItem {
  id: string;
  status: CaseStatus;
  created_at: string;
  assigned_at: string | null;
  finanzierungs_summe: number | null;
  monatliche_rate: number | null;
  zins_satz: number | null;
  kunde: { id: string; vorname: string | null; nachname: string | null; max_finanzierbar: number | null } | null;
  einheit: {
    id: string;
    wohnungsnummer: string | null;
    kaufpreis: number | null;
    projekt_name: string | null;
    stadt: string | null;
  } | null;
}

export interface CaseKommentar {
  id: string;
  case_id: string;
  text: string;
  created_at: string;
  author_id: string | null;
  author_label: string | null;
}

export interface MyKundeCase {
  id: string;
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  einheit_id: string;
}

export interface FinanziererPoolMember {
  id: string;
  name: string | null;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  in_pool: boolean;
  pool_position: number | null;
}

export interface FinanziererPoolResult {
  members: FinanziererPoolMember[];
  pool: FinanziererPoolMember[];
  counter: number;
  nextAssignee: FinanziererPoolMember | null;
  error?: string;
}

// ─── Liste für Finanzierer ──────────────────────────────────────────
export async function listCasesForFinanzierer(): Promise<CaseListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("v_case_for_finanzierer")
    .select(
      `
        id, status, created_at, assigned_at,
        finanzierungs_summe, monatliche_rate, zins_satz,
        kunde:kunde_id (id, vorname, nachname, max_finanzierbar),
        einheit:einheit_id (
          id, wohnungsnummer, kaufpreis,
          projekt:projekt_id (name, stadt)
        )
      `,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
   
  return (data ?? []).map((r: any) => ({
    id: r.id,
    status: r.status as CaseStatus,
    created_at: r.created_at,
    assigned_at: r.assigned_at,
    finanzierungs_summe: r.finanzierungs_summe,
    monatliche_rate: r.monatliche_rate,
    zins_satz: r.zins_satz,
    kunde: r.kunde
      ? {
          id: r.kunde.id,
          vorname: r.kunde.vorname,
          nachname: r.kunde.nachname,
          max_finanzierbar: r.kunde.max_finanzierbar,
        }
      : null,
    einheit: r.einheit
      ? {
          id: r.einheit.id,
          wohnungsnummer: r.einheit.wohnungsnummer,
          kaufpreis: r.einheit.kaufpreis,
          projekt_name: r.einheit.projekt?.name ?? null,
          stadt: r.einheit.projekt?.stadt ?? null,
        }
      : null,
  }));
}

// ─── Liste für VP (für Kunden-Tab) ──────────────────────────────────
export async function listCasesForKunde(input: { kundeId: string }): Promise<CaseListItem[]> {
  const { supabase } = await requireUser();
  const { data: rows, error } = await supabase
    .from("v_case_for_vp")
    .select(
      `
        id, status, created_at, assigned_at,
        finanzierungs_summe, monatliche_rate, zins_satz,
        kunde:kunde_id (id, vorname, nachname, max_finanzierbar),
        einheit:einheit_id (
          id, wohnungsnummer, kaufpreis,
          projekt:projekt_id (name, stadt)
        )
      `,
    )
    .eq("kunde_id", input.kundeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
   
  return (rows ?? []).map((r: any) => ({
    id: r.id,
    status: r.status as CaseStatus,
    created_at: r.created_at,
    assigned_at: r.assigned_at,
    finanzierungs_summe: r.finanzierungs_summe,
    monatliche_rate: r.monatliche_rate,
    zins_satz: r.zins_satz,
    kunde: r.kunde,
    einheit: r.einheit
      ? {
          id: r.einheit.id,
          wohnungsnummer: r.einheit.wohnungsnummer,
          kaufpreis: r.einheit.kaufpreis,
          projekt_name: r.einheit.projekt?.name ?? null,
          stadt: r.einheit.projekt?.stadt ?? null,
        }
      : null,
  }));
}

// ─── Status für Kunden-Portal ───────────────────────────────────────
export async function getMyKundeCases(): Promise<MyKundeCase[]> {
  const { supabase } = await requireUser();
  // Pseudonymisierter Read über SECURITY-DEFINER-RPC (Spec Z. 893).
  // Whitelist: id, status, einheit_id, created_at, updated_at — keine Eckdaten,
  // keine finanzierer_id, keine Notizen.
  const { data: rows, error } = await supabase.rpc("get_my_kunde_cases");
  if (error) throw new Error(error.message);
   
  return (rows ?? []).map((r: any) => ({
    id: r.id,
    status: r.status as CaseStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
    einheit_id: r.einheit_id,
  }));
}

// ─── Detail ─────────────────────────────────────────────────────────
export async function getCase(input: { caseId: string }) {
  const { supabase } = await requireUser();
  const { data: c, error } = await supabase
    .from("finanzierungs_cases")
    .select(
      `
        id, status, created_at, assigned_at, vp_id, finanzierer_id,
        zins_satz, tilgung_initial, laufzeit_jahre, sondertilgung_pa,
        monatliche_rate, finanzierungs_summe, gesamtkosten,
        notiz_finanzierer, offer_filled_at, offer_accepted_at, final_status_at,
        kunde:kunde_id (
          id, vorname, nachname, email, telefon, geburtsdatum,
          adresse, plz, stadt, bundesland, beruf_status,
          brutto_jahreseinkommen, eigenkapital, kreditverpflichtungen_monatlich,
          verheiratet, kinder_anzahl, bestehende_immobilien,
          max_finanzierbar, max_monatsrate, max_darlehen, persoenlicher_steuersatz
        ),
        einheit:einheit_id (
          id, wohnungsnummer, etage, wohnflaeche, zimmer,
          kaufpreis, miete, vermietet,
          projekt:projekt_id (id, name, adresse, plz, stadt, bundesland, baujahr)
        )
      `,
    )
    .eq("id", input.caseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!c) throw new Error("Case nicht gefunden");
  return c;
}

export type CaseDetail = Awaited<ReturnType<typeof getCase>>;

// ─── Kommentare (pseudonymisiert) ───────────────────────────────────
export async function listCaseKommentare(input: { caseId: string }): Promise<CaseKommentar[]> {
  const { supabase } = await requireUser();
  const { data: rows, error } = await supabase
    .from("v_case_kommentare_pseudonym")
    .select("id, case_id, text, created_at, author_id, author_label")
    .eq("case_id", input.caseId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (rows ?? []) as unknown as CaseKommentar[];
}

// ─── Finanzierer-Pool (admin/support only) ──────────────────────────
export async function listFinanziererForPool(input: {
  projektId: string;
}): Promise<FinanziererPoolResult> {
  const { supabase, userId } = await requireUser();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
   
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("admin") && !roleSet.has("support")) {
    return {
      members: [],
      pool: [],
      counter: 0,
      nextAssignee: null,
      error: "Forbidden",
    };
  }

  const [rpc, projekt] = await Promise.all([
    supabase.rpc("list_finanzierer_for_pool", { p_projekt_id: input.projektId }),
    supabase
      .from("projekte")
      .select("finanzierer_round_robin_counter")
      .eq("id", input.projektId)
      .maybeSingle(),
  ]);

  if (rpc.error) {
    return {
      members: [],
      pool: [],
      counter: 0,
      nextAssignee: null,
      error: rpc.error.message,
    };
  }

  const members = (rpc.data ?? []) as unknown as FinanziererPoolMember[];
  const pool = members
    .filter((m) => m.in_pool)
    .sort((a, b) => (a.pool_position ?? 0) - (b.pool_position ?? 0));

   
  const counter = (projekt.data as any)?.finanzierer_round_robin_counter ?? 0;
  const nextAssignee = pool.length > 0 ? (pool[counter % pool.length] ?? null) : null;

  return { members, pool, counter, nextAssignee };
}
