"use server";

// Client-invokable server actions for the Objekte feature: recommendations,
// customer<->unit assignment, calculations and status pipeline. Each action
// authenticates via requireUser() and runs queries as the signed-in user
// (RLS enforced). Ported verbatim from the OLD APP TanStack serverFns in
// empfehlungen.functions.ts / kalkulation.functions.ts / praesentation.functions.ts.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { ObjektListItem, EinheitStatus } from "@/lib/data/objekte";
import type {
  EmpfehlungItem,
  KundeZuweisungItem,
  KalkulationListItem,
  VPProfile,
} from "@/lib/data/objekte-extra-types";

const ACTIVE_STATUS: EinheitStatus[] = [
  "verfuegbar",
  "reserviert",
  "in_finanzierung",
];

function calcScore(args: {
  kaufpreis: number | null;
  max_finanzierbar: number | null;
  mietrendite: number | null;
  status: EinheitStatus;
}): { score: number; reason: string } {
  const { kaufpreis, max_finanzierbar, mietrendite, status } = args;
  if (status === "abgebrochen" || status === "verkauft") {
    return { score: 0, reason: "nicht verfügbar" };
  }
  if (!kaufpreis) return { score: 0, reason: "kein Preis" };
  if (!max_finanzierbar || max_finanzierbar <= 0) {
    return { score: 25, reason: "Bonität fehlt" };
  }

  let base = 25;
  let reason = "zu teuer";
  if (kaufpreis <= max_finanzierbar * 0.95) {
    base = 100;
    reason = "passt locker";
  } else if (kaufpreis <= max_finanzierbar * 1.05) {
    base = 75;
    reason = "passt knapp";
  } else if (kaufpreis <= max_finanzierbar * 1.15) {
    base = 50;
    reason = "leicht überschritten";
  }

  // Bonus: Mietrendite > 4% → +5 % pro 0,5 % darüber
  if (mietrendite != null && mietrendite > 4) {
    const steps = Math.floor((mietrendite - 4) / 0.5);
    base += steps * 5;
  }
  // Bonus: verfügbar → +10
  if (status === "verfuegbar") base += 10;

  return { score: Math.min(150, base), reason };
}

// ─── getEmpfehlungen ───
export async function getEmpfehlungen(input: { kundeId: string }): Promise<{
  items: EmpfehlungItem[];
  max_finanzierbar: number | null;
}> {
  const { supabase } = await requireUser();
  const data = z.object({ kundeId: z.string().uuid() }).parse(input);

  const { data: k, error: kErr } = await supabase
    .from("kunden")
    .select("id, max_finanzierbar")
    .eq("id", data.kundeId)
    .maybeSingle();
  if (kErr || !k) throw new Error(kErr?.message ?? "Kunde nicht gefunden");

  const { data: rows, error } = await supabase
    .from("einheiten")
    .select(
      `id, projekt_id, wohnungsnummer, etage, wohnflaeche, zimmer,
       kaufpreis, miete, status, vermietet, balkon, keller, aufzug, created_at,
       projekte:projekt_id (
         id, name, projekt_typ, bautraeger, cover_image_url, adresse, baujahr,
         stadt, plz, bundesland, mietrendite_brutto
       )`,
    )
    .in("status", ACTIVE_STATUS);

  if (error) throw new Error(error.message);

  const items: EmpfehlungItem[] = (rows ?? [])
     
    .filter((r: any) => r.projekte)
     
    .map((r: any) => {
      const item: ObjektListItem = {
        einheit_id: r.id,
        projekt_id: r.projekt_id,
        projekt_name: r.projekte?.name ?? null,
        projekt_typ: r.projekte?.projekt_typ ?? "mfh",
        bautraeger: r.projekte?.bautraeger ?? null,
        cover_image_url: r.projekte?.cover_image_url ?? null,
        adresse: r.projekte?.adresse ?? null,
        stadt: r.projekte?.stadt ?? null,
        plz: r.projekte?.plz ?? null,
        bundesland: r.projekte?.bundesland ?? null,
        baujahr: r.projekte?.baujahr ?? null,
        mietrendite_brutto: r.projekte?.mietrendite_brutto ?? null,
        wohnungsnummer: r.wohnungsnummer,
        etage: r.etage,
        wohnflaeche: r.wohnflaeche,
        zimmer: r.zimmer,
        kaufpreis: r.kaufpreis,
        miete: r.miete,
        status: r.status,
        vermietet: r.vermietet,
        balkon: r.balkon,
        keller: r.keller,
        aufzug: r.aufzug,
        afa_satz: r.afa_satz ?? null,
        created_at: r.created_at,
      };
      const { score, reason } = calcScore({
        kaufpreis: item.kaufpreis,
        max_finanzierbar: k.max_finanzierbar,
        mietrendite: item.mietrendite_brutto,
        status: item.status,
      });
      return { ...item, score, reason };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return { items, max_finanzierbar: k.max_finanzierbar };
}

// ─── Zugewiesene Kunden für Einheit ───
export async function listZugewieseneKundenForEinheit(input: {
  einheitId: string;
}) {
  const { supabase } = await requireUser();
  const data = z.object({ einheitId: z.string().uuid() }).parse(input);

  const { data: zRows, error } = await supabase
    .from("objekt_kunde_zuweisungen")
    .select("kunde_id")
    .eq("einheit_id", data.einheitId);
  if (error) throw new Error(error.message);
  const ids = [
    ...new Set((zRows ?? []).map((r) => r.kunde_id).filter(Boolean)),
  ];
  if (!ids.length) return [];
  const { data: kunden, error: kErr } = await supabase
    .from("kunden")
    .select(
      "id, vorname, nachname, email, max_finanzierbar, persoenlicher_steuersatz, eigenkapital",
    )
    .in("id", ids);
  if (kErr) throw new Error(kErr.message);
  return kunden ?? [];
}

// ─── Kunde-Picker ───
export async function listMyKundenForPicker() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("kunden")
    .select(
      "id, vorname, nachname, email, max_finanzierbar, persoenlicher_steuersatz, eigenkapital",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ─── assignKundeToEinheit ───
export async function assignKundeToEinheit(input: {
  einheitId: string;
  kundeId: string;
}) {
  const { supabase } = await requireUser();
  const data = z
    .object({
      einheitId: z.string().uuid(),
      kundeId: z.string().uuid(),
    })
    .parse(input);

  // Zuweisung wird dem zuständigen Kunden-VP zugeordnet, damit
  // sie in der gesamten VP/Vertriebsleiter-Hierarchie sichtbar ist.
  const { data: k, error: kErr } = await supabase
    .from("kunden")
    .select("vp_id")
    .eq("id", data.kundeId)
    .maybeSingle();
  if (kErr || !k) throw new Error(kErr?.message ?? "Kunde nicht gefunden");

  const { error } = await supabase.from("objekt_kunde_zuweisungen").upsert(
    {
      einheit_id: data.einheitId,
      kunde_id: data.kundeId,
      vp_id: k.vp_id,
      status: "zugewiesen",
    },
    { onConflict: "einheit_id,kunde_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true };
}

// ─── unassignKundeFromEinheit ───
export async function unassignKundeFromEinheit(input: {
  einheitId: string;
  kundeId: string;
}) {
  const { supabase } = await requireUser();
  const data = z
    .object({
      einheitId: z.string().uuid(),
      kundeId: z.string().uuid(),
    })
    .parse(input);

  // Zugehörige Kalkulationen ebenfalls entfernen, damit beim erneuten
  // Zuweisen kein veralteter Stand übernommen wird.
  const { error: kalkErr } = await supabase
    .from("kalkulationen")
    .delete()
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId);
  if (kalkErr) throw new Error(kalkErr.message);

  const { error } = await supabase
    .from("objekt_kunde_zuweisungen")
    .delete()
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId);
  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true };
}

// ─── listKundenZuweisungen ───
export async function listKundenZuweisungen(input: {
  kundeId: string;
}): Promise<KundeZuweisungItem[]> {
  const { supabase } = await requireUser();
  const data = z.object({ kundeId: z.string().uuid() }).parse(input);

  const { data: rows, error } = await supabase
    .from("objekt_kunde_zuweisungen")
    .select("id, einheit_id, status, created_at")
    .eq("kunde_id", data.kundeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const einheitIds = [...new Set((rows ?? []).map((r) => r.einheit_id))];
  if (einheitIds.length === 0) return [];

  const { data: einheiten } = await supabase
    .from("einheiten")
    .select(
      `id, wohnungsnummer, kaufpreis,
       projekte:projekt_id ( name, stadt, cover_image_url )`,
    )
    .in("id", einheitIds);

  const byId = new Map(
     
    (einheiten ?? []).map((e: any) => [
      e.id,
      {
        id: e.id,
        wohnungsnummer: e.wohnungsnummer,
        kaufpreis: e.kaufpreis,
        projekt_name: e.projekte?.name ?? null,
        stadt: e.projekte?.stadt ?? null,
        cover_image_url: e.projekte?.cover_image_url ?? null,
      },
    ]),
  );

  return (rows ?? []).map((r) => ({
    id: r.id,
    einheit_id: r.einheit_id,
    status: r.status,
    created_at: r.created_at,
    einheit: byId.get(r.einheit_id) ?? null,
  }));
}

// ─── saveKalkulation ───
const saveKalkInput = z.object({
  einheitId: z.string().uuid(),
  kundeId: z.string().uuid(),
  zins: z.number().min(0).max(20),
  tilgung: z.number().min(0).max(20),
  haltedauer: z.number().int().min(1).max(50),
  ek_prozent: z.number().min(0).max(100).optional().nullable(),
  ek_betrag: z.number().min(0).max(100_000_000),
  wertsteigerung: z.number().min(-10).max(20),
  afa: z.number().min(0).max(20),
  erhaltungsaufwand: z.number().min(0).max(10_000_000).optional().nullable(),
  kaufnebenkosten_finanziert: z.boolean(),
  steuersatz: z.number().min(0).max(100),
  miete_override: z.number().min(0).max(1_000_000).optional().nullable(),
  notiz: z.string().max(2000).optional().nullable(),
});

export async function saveKalkulation(input: z.input<typeof saveKalkInput>) {
  const { supabase, userId } = await requireUser();
  const data = saveKalkInput.parse(input);

  const { error } = await supabase.from("kalkulationen").insert({
    einheit_id: data.einheitId,
    kunde_id: data.kundeId,
    ersteller_vp_id: userId,
    zins: data.zins,
    tilgung: data.tilgung,
    haltedauer: data.haltedauer,
    ek_prozent: data.ek_prozent ?? null,
    ek_betrag: data.ek_betrag,
    wertsteigerung: data.wertsteigerung,
    afa: data.afa,
    erhaltungsaufwand: data.erhaltungsaufwand ?? null,
    kaufnebenkosten_finanziert: data.kaufnebenkosten_finanziert,
    steuersatz: data.steuersatz,
    miete_override: data.miete_override ?? null,
    notiz: data.notiz ?? null,
  });
  if (error) throw new Error(error.message);

  // Status-Pipeline: nur "vorwärts" promoten (zugewiesen → kalkulation_erstellt)
  const { data: zRow } = await supabase
    .from("objekt_kunde_zuweisungen")
    .select("id, status")
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId)
    .maybeSingle();
  if (
    zRow &&
    (zRow.status === "zugewiesen" || zRow.status === "vorgeschlagen")
  ) {
    await supabase
      .from("objekt_kunde_zuweisungen")
      .update({ status: "kalkulation_erstellt" })
      .eq("id", zRow.id);
  }

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true };
}

// ─── setZuweisungStatus (manuelles Vorrücken, z. B. Präsentation/Reservierung) ───
export async function setZuweisungStatus(input: {
  einheitId: string;
  kundeId: string;
  status: string;
}) {
  const { supabase } = await requireUser();
  const data = z
    .object({
      einheitId: z.string().uuid(),
      kundeId: z.string().uuid(),
      status: z.enum([
        "zugewiesen",
        "kalkulation_erstellt",
        "praesentation_gehalten",
        "reserviert",
        "verkauft",
        "abgelehnt",
      ]),
    })
    .parse(input);

  const { error } = await supabase
    .from("objekt_kunde_zuweisungen")
    .update({ status: data.status })
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId);
  if (error) throw new Error(error.message);

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true };
}

// ─── listKalkulationenForKunde ───
export async function listKalkulationenForKunde(input: {
  kundeId: string;
}): Promise<KalkulationListItem[]> {
  const { supabase } = await requireUser();
  const data = z.object({ kundeId: z.string().uuid() }).parse(input);

  const { data: rows, error } = await supabase
    .from("kalkulationen")
    .select("id, einheit_id, created_at")
    .eq("kunde_id", data.kundeId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return rows ?? [];
}

// ─── promoteToPraesentationGehalten ───
// Status promoten: kalkulation_erstellt → praesentation_gehalten
export async function promoteToPraesentationGehalten(input: {
  einheitId: string;
  kundeId: string;
}) {
  const { supabase } = await requireUser();
  const data = z
    .object({ einheitId: z.string().uuid(), kundeId: z.string().uuid() })
    .parse(input);

  const { data: zRow } = await supabase
    .from("objekt_kunde_zuweisungen")
    .select("id, status")
    .eq("einheit_id", data.einheitId)
    .eq("kunde_id", data.kundeId)
    .maybeSingle();
  if (
    zRow &&
    (zRow.status === "kalkulation_erstellt" || zRow.status === "zugewiesen")
  ) {
    await supabase
      .from("objekt_kunde_zuweisungen")
      .update({ status: "praesentation_gehalten" })
      .eq("id", zRow.id);
  }

  revalidatePath("/objekte");
  revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true };
}

// ─── getKundePersonalisierung ───
// Lean read of a single customer's personalization fields (name + tax rate +
// equity) for client-side Exposé/Präsentation generation. RLS-scoped.
export async function getKundePersonalisierung(input: {
  kundeId: string;
}): Promise<{
  id: string;
  vorname: string | null;
  nachname: string | null;
  eigenkapital: number | null;
  persoenlicher_steuersatz: number | null;
} | null> {
  const { supabase } = await requireUser();
  const data = z.object({ kundeId: z.string().uuid() }).parse(input);
  const { data: k, error } = await supabase
    .from("kunden")
    .select("id, vorname, nachname, eigenkapital, persoenlicher_steuersatz")
    .eq("id", data.kundeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!k) return null;
  return {
    id: k.id,
    vorname: k.vorname ?? null,
    nachname: k.nachname ?? null,
    eigenkapital: (k.eigenkapital as number | null) ?? null,
    persoenlicher_steuersatz:
      (k.persoenlicher_steuersatz as number | null) ?? null,
  };
}

// ─── getMyVPProfile ───
export async function getMyVPProfile(): Promise<VPProfile> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, name, vorname, nachname, email, phone, avatar_url, branding_color, branding_logo_url",
    )
    .eq("id", userId)
    .maybeSingle();
  return (
    (data as VPProfile) ?? {
      id: userId,
      name: null,
      vorname: null,
      nachname: null,
      email: null,
      phone: null,
      avatar_url: null,
      branding_color: null,
      branding_logo_url: null,
    }
  );
}
