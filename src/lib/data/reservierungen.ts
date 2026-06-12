// Server-side data access for the Reservierungen feature.
// Plain async functions for Server Components — RLS is enforced as the signed-in
// user via the cookie Supabase client. Ported from the OLD APP TanStack serverFns
// getReservierungContext / listReservierungen in reservierungen.functions.ts.
import "server-only";
import { requireUser } from "@/lib/auth";

export interface ReservierungContext {
  einheit: {
    id: string;
    wohnungsnummer: string;
    etage: number | null;
    wohnflaeche: number | null;
    zimmer: number | null;
    kaufpreis: number | null;
    status: string;
    projekt: {
      id: string;
      name: string | null;
      adresse: string | null;
      plz: string | null;
      stadt: string | null;
      bank_kontoinhaber: string | null;
      bank_iban: string | null;
      bank_bic: string | null;
    } | null;
  } | null;
  kunde: {
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    telefon: string | null;
    geburtsdatum: string | null;
    adresse: string | null;
    plz: string | null;
    stadt: string | null;
  } | null;
  vp: {
    id: string;
    name: string | null;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    phone: string | null;
    bank_kontoinhaber: string | null;
    bank_iban: string | null;
    bank_bic: string | null;
  } | null;
}

export interface ReservierungListItem {
  id: string;
  status: string;
  signed_at: string | null;
  expires_at: string;
  created_at: string;
  reservierungsgebuehr: number;
  pdf_url: string | null;
  vp_id: string;
  einheit: {
    id: string;
    wohnungsnummer: string;
    projekt: { id: string; name: string | null; stadt: string | null; adresse: string | null } | null;
  } | null;
  kunde: {
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
  } | null;
  vp: {
    id: string;
    vorname: string | null;
    nachname: string | null;
    name: string | null;
  } | null;
}

/**
 * Loads the einheit + kunde + signed-in VP context used to pre-fill the
 * reservation form. RLS scopes every read to the signed-in user.
 */
export async function getReservierungContext(input: {
  einheitId: string;
  kundeId: string;
}): Promise<ReservierungContext> {
  const { supabase, userId } = await requireUser();

  const [eRes, kRes, vpRes] = await Promise.all([
    supabase
      .from("einheiten")
      .select(
        `id, wohnungsnummer, etage, wohnflaeche, zimmer, kaufpreis, status,
         projekte:projekt_id (
           id, name, adresse, plz, stadt,
           bank_kontoinhaber, bank_iban, bank_bic
         )`,
      )
      .eq("id", input.einheitId)
      .maybeSingle(),
    supabase
      .from("kunden")
      .select(
        "id, vorname, nachname, email, telefon, geburtsdatum, adresse, plz, stadt",
      )
      .eq("id", input.kundeId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, name, vorname, nachname, email, phone, bank_kontoinhaber, bank_iban, bank_bic")
      .eq("id", userId)
      .maybeSingle(),
  ]);

   
  const e: any = eRes.data;
  return {
    einheit: e
      ? {
          id: e.id,
          wohnungsnummer: e.wohnungsnummer,
          etage: e.etage,
          wohnflaeche: e.wohnflaeche,
          zimmer: e.zimmer,
          kaufpreis: e.kaufpreis,
          status: e.status,
          projekt: e.projekte
            ? {
                id: e.projekte.id,
                name: e.projekte.name,
                adresse: e.projekte.adresse,
                plz: e.projekte.plz,
                stadt: e.projekte.stadt,
                bank_kontoinhaber: e.projekte.bank_kontoinhaber,
                bank_iban: e.projekte.bank_iban,
                bank_bic: e.projekte.bank_bic,
              }
            : null,
        }
      : null,
     
    kunde: (kRes.data as any) ?? null,
     
    vp: (vpRes.data as any) ?? null,
  };
}

/**
 * All reservations visible to the signed-in user (RLS-scoped), newest first.
 */
export async function listReservierungen(): Promise<ReservierungListItem[]> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("reservierungen")
    .select(
      `id, status, signed_at, expires_at, created_at, reservierungsgebuehr, pdf_url, vp_id,
       einheit:einheit_id ( id, wohnungsnummer, projekt:projekt_id ( id, name, stadt, adresse ) ),
       kunde:kunde_id ( id, vorname, nachname, email ),
       vp:vp_id ( id, vorname, nachname, name )`,
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ReservierungListItem[];
}
