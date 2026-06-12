// Server-side data access for the Kunden-Portal (customer self-service).
// Plain async function for Server Components — RLS is enforced as the signed-in
// kunde via the cookie Supabase client. Ported from the OLD APP TanStack serverFn
// getPortalDashboard in portal.functions.ts. Keeps the exact selects + RPC names.
import "server-only";
import { requireUser } from "@/lib/auth";

export interface PortalDashboard {
  kunde: {
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    telefon: string | null;
    adresse: string | null;
    plz: string | null;
    stadt: string | null;
    bundesland: string | null;
    geburtsdatum: string | null;
    anrede: string | null;
    max_finanzierbar: number | null;
    max_monatsrate: number | null;
    persoenlicher_steuersatz: number | null;
    eigenkapital: number | null;
    brutto_jahreseinkommen: number | null;
    beruf_status: string | null;
    status: string;
    vp_id: string;
    selbstauskunft_step: number | null;
    selbstauskunft_submitted_at: string | null;
  } | null;
  vp: {
    id: string;
    name: string | null;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  einheiten: Array<{
    einheit_id: string;
    wohnungsnummer: string;
    status: string;
    zuweisung_status: string | null;
    cover_image_url: string | null;
    projekt_name: string | null;
    adresse: string | null;
    plz: string | null;
    stadt: string | null;
    kaufpreis: number | null;
    wohnflaeche: number | null;
    zimmer: number | null;
    reservierung_status: string | null;
    reservierung_id: string | null;
  }>;
  /** Distinct (non-deleted) document categories the kunde has uploaded. */
  dokumentKategorien: string[];
}

/** Portal dashboard for the signed-in kunde: own profile, assigned VP, einheiten + status. */
export async function getPortalDashboard(): Promise<PortalDashboard> {
  const { supabase, userId } = await requireUser();

  const { data: kunde } = await supabase
    .from("kunden")
    .select(
      `id, vorname, nachname, email, telefon, adresse, plz, stadt, bundesland,
       geburtsdatum, anrede, max_finanzierbar, max_monatsrate,
       persoenlicher_steuersatz, eigenkapital, brutto_jahreseinkommen,
       beruf_status, status, vp_id, selbstauskunft_step, selbstauskunft_submitted_at`,
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (!kunde)
    return { kunde: null, vp: null, einheiten: [], dokumentKategorien: [] };

  const [vpRes, zuwRes, resRes, dokRes] = await Promise.all([
    supabase.rpc("get_my_vp"),
    supabase
      .from("objekt_kunde_zuweisungen")
      .select(
        `einheit_id, status,
         einheit:einheit_id (
           id, wohnungsnummer, status, kaufpreis, wohnflaeche, zimmer,
           projekt:projekt_id ( name, adresse, plz, stadt, cover_image_url )
         )`,
      )
      .eq("kunde_id", kunde.id),
    supabase
      .from("reservierungen")
      .select("id, einheit_id, status")
      .eq("kunde_id", kunde.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("kunden_dokumente")
      .select("kategorie")
      .eq("kunde_id", kunde.id)
      .is("deleted_at", null),
  ]);

  const dokumentKategorien = [
    ...new Set(
      ((dokRes.data ?? []) as Array<{ kategorie: string }>)
        .map((d) => d.kategorie)
        .filter(Boolean),
    ),
  ];

  const resByEinheit = new Map<string, { id: string; status: string }>();
  for (const r of (resRes.data ?? []) as Array<{
    id: string;
    einheit_id: string;
    status: string;
  }>) {
    if (!resByEinheit.has(r.einheit_id)) {
      resByEinheit.set(r.einheit_id, { id: r.id, status: r.status });
    }
  }

  const einheiten = ((zuwRes.data ?? []) as unknown[]).map((row) => {
    const z = row as {
      einheit_id: string;
      status: string | null;
      einheit: {
        wohnungsnummer?: string;
        status?: string;
        kaufpreis?: number | null;
        wohnflaeche?: number | null;
        zimmer?: number | null;
        projekt?: {
          name?: string | null;
          adresse?: string | null;
          plz?: string | null;
          stadt?: string | null;
          cover_image_url?: string | null;
        } | null;
      } | null;
    };
    const e = z.einheit ?? {};
    const p = e.projekt ?? {};
    const r = resByEinheit.get(z.einheit_id) ?? null;
    return {
      einheit_id: z.einheit_id,
      wohnungsnummer: e.wohnungsnummer ?? "—",
      status: e.status ?? "—",
      zuweisung_status: z.status ?? null,
      cover_image_url: p?.cover_image_url ?? null,
      projekt_name: p?.name ?? null,
      adresse: p?.adresse ?? null,
      plz: p?.plz ?? null,
      stadt: p?.stadt ?? null,
      kaufpreis: e.kaufpreis ?? null,
      wohnflaeche: e.wohnflaeche ?? null,
      zimmer: e.zimmer ?? null,
      reservierung_status: r?.status ?? null,
      reservierung_id: r?.id ?? null,
    };
  });

  return {
    kunde: kunde as PortalDashboard["kunde"],
    vp: ((vpRes.data ?? [])[0] ?? null) as PortalDashboard["vp"],
    einheiten,
    dokumentKategorien,
  };
}
