import "server-only";

// PROJ-24: Lead-Sandbox — serverseitige Reads/Tracking für die ÖFFENTLICHE Route
// `/fuer/[slug]`. Läuft über den Service-Role-Client (anon hat kein RLS-Match),
// strikt auf den Slug gescopt. Kein client-geliefertes Vertrauen.
import { createAdminClient } from "@/lib/supabase/admin";

export interface DemoBranding {
  id: string;
  slug: string;
  leadCompany: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
}

/** Lädt einen aktiven, nicht abgelaufenen Demo-Link per Slug — sonst null. */
export async function getDemoBySlug(slug: string): Promise<DemoBranding | null> {
  if (!slug) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("demo_links")
    .select(
      "id, slug, lead_company, logo_url, primary_color, accent_color, is_active, expires_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data || !data.is_active) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return {
    id: data.id,
    slug: data.slug,
    leadCompany: data.lead_company,
    logoUrl: data.logo_url,
    primaryColor: data.primary_color,
    accentColor: data.accent_color,
  };
}

/** Zählt eine Öffnung (Zähler + erste/letzte Öffnung). Best-effort. */
export async function recordDemoOpen(id: string): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("demo_links")
    .select("opened_count, first_opened_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  const now = new Date().toISOString();
  await admin
    .from("demo_links")
    .update({
      opened_count: (data.opened_count ?? 0) + 1,
      last_opened_at: now,
      first_opened_at: data.first_opened_at ?? now,
    })
    .eq("id", id);
}
