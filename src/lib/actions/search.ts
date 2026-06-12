"use server";

// Global search for the command palette: units, projects and customers.
// RLS scopes every query to what the signed-in user may see, so VPs only get
// their own customers / visible objects. Internal-only surface (app shell).
import { requireUser } from "@/lib/auth";

export interface SearchResult {
  id: string;
  title: string;
  subtitle: string | null;
  to: string;
  group: "Objekte" | "Projekte" | "Kunden";
}

export async function searchEntities(query: string): Promise<SearchResult[]> {
  const raw = query.trim();
  if (raw.length < 2) return [];
  // Strip characters that would break a PostgREST or()/ilike filter.
  const safe = raw.replace(/[,()*%]/g, " ").trim();
  if (!safe) return [];
  const like = `%${safe}%`;

  const { supabase } = await requireUser();

  const [einheitenR, projekteR, kundenR] = await Promise.all([
    supabase
      .from("einheiten")
      .select("id, wohnungsnummer, projekte:projekt_id (name, adresse)")
      .ilike("wohnungsnummer", like)
      .limit(5),
    supabase
      .from("projekte")
      .select("id, name, adresse, stadt")
      .or(`name.ilike.${like},adresse.ilike.${like},stadt.ilike.${like}`)
      .limit(5),
    supabase
      .from("kunden")
      .select("id, vorname, nachname, email")
      .or(`vorname.ilike.${like},nachname.ilike.${like},email.ilike.${like}`)
      .limit(5),
  ]);

  const results: SearchResult[] = [];

  for (const e of (einheitenR.data ?? []) as Array<{
    id: string;
    wohnungsnummer: string;
    projekte?: { name?: string | null; adresse?: string | null } | null;
  }>) {
    results.push({
      id: e.id,
      title: `Wohnung ${e.wohnungsnummer}`,
      subtitle: e.projekte?.name ?? e.projekte?.adresse ?? null,
      to: `/objekte/${e.id}`,
      group: "Objekte",
    });
  }

  for (const p of (projekteR.data ?? []) as Array<{
    id: string;
    name: string | null;
    adresse: string;
    stadt: string | null;
  }>) {
    results.push({
      id: p.id,
      title: p.name ?? p.adresse,
      subtitle: [p.adresse, p.stadt].filter(Boolean).join(", ") || null,
      to: `/objekte/projekt/${p.id}`,
      group: "Projekte",
    });
  }

  for (const k of (kundenR.data ?? []) as Array<{
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
  }>) {
    const name =
      [k.vorname, k.nachname].filter(Boolean).join(" ") || k.email || "Kunde";
    results.push({
      id: k.id,
      title: name,
      subtitle: k.email,
      to: `/kunden/${k.id}`,
      group: "Kunden",
    });
  }

  return results;
}
