// Server-side data access for Kunden (customers).
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Replaces the OLD APP TanStack serverFns
// listKunden / getKunde from kunden.functions.ts.
import "server-only";
import { requireUser } from "@/lib/auth";
import type { Database } from "@/lib/supabase/types";

type KundeRow = Database["public"]["Tables"]["kunden"]["Row"];

const LIST_SELECT =
  "id,vorname,nachname,email,telefon,stadt,status,brutto_jahreseinkommen,max_finanzierbar,vp_id,user_id,created_at,updated_at";

export type KundeListItem = Pick<
  KundeRow,
  | "id"
  | "vorname"
  | "nachname"
  | "email"
  | "telefon"
  | "stadt"
  | "status"
  | "brutto_jahreseinkommen"
  | "max_finanzierbar"
  | "vp_id"
  | "user_id"
  | "created_at"
  | "updated_at"
>;

// getKunde uses `select("*")`, so the detail shape is the full row.
export type KundeDetail = KundeRow;

/** Flat customer list. RLS handles role-based visibility (VP/Vertriebsleiter hierarchy). */
export async function listKunden(): Promise<KundeListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("kunden")
    .select(LIST_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as KundeListItem[];
}

/** Single customer detail. Throws if not found / not visible under RLS. */
export async function getKunde(id: string): Promise<KundeDetail> {
  const { supabase } = await requireUser();
  const { data: k, error } = await supabase
    .from("kunden")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!k) throw new Error("Kunde nicht gefunden");
  return k as KundeDetail;
}
