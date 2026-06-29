"use server";

// PROJ-24: Lead-Sandbox — Verwaltung der gebrandeten Demo-Links (nur admin/support)
// + öffentliche Lead-Erfassung über den CTA. Branding-Extraktion und Logo-
// Re-Hosting werden aus PROJ-23 wiederverwendet.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { assertEntitlement } from "@/lib/entitlements-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import {
  extractBrandingFromUrl,
  rehostLogoFromUrl,
} from "@/lib/actions/branding-extract";
import type { BrandingSuggestion } from "@/lib/branding-extract";

const HEX = /^#[0-9a-fA-F]{6}$/;
function cleanHex(v?: string | null): string | null {
  if (!v) return null;
  const t = v.trim();
  return HEX.test(t) ? t.toUpperCase() : null;
}

function slugify(company: string): string {
  const base = company
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${base || "demo"}-${rand}`;
}

export interface DemoLinkRow {
  id: string;
  slug: string;
  leadCompany: string;
  leadWebsite: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  isExpired: boolean;
  openedCount: number;
  firstOpenedAt: string | null;
  lastOpenedAt: string | null;
}

/** Branding-Vorschau aus einer Website-URL (Reuse PROJ-23). */
export async function extractDemoBranding(input: {
  url: string;
}): Promise<BrandingSuggestion> {
  await requireRole("admin", "support");
  return extractBrandingFromUrl(input);
}

const createSchema = z.object({
  leadCompany: z.string().trim().min(2).max(120),
  leadWebsite: z.string().trim().max(300).optional().nullable(),
  logoUrl: z.string().trim().url().max(600).optional().nullable(),
  primaryColor: z.string().trim().optional().nullable(),
  accentColor: z.string().trim().optional().nullable(),
});

/** Erzeugt einen gebrandeten Demo-Link. Nur admin/support. */
export async function createDemoLink(
  input: z.infer<typeof createSchema>,
): Promise<{ ok: true; slug: string; id: string } | { ok: false; error: string }> {
  const session = await requireRole("admin", "support");
  await assertEntitlement("demo_links"); // PROJ-31: defense-in-depth
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ungültige Eingabe." };
  const data = parsed.data;

  const admin = createAdminClient();
  const slug = slugify(data.leadCompany);

  const { data: inserted, error } = await admin
    .from("demo_links")
    .insert({
      slug,
      lead_company: data.leadCompany,
      lead_website: data.leadWebsite || null,
      logo_url: data.logoUrl || null,
      primary_color: cleanHex(data.primaryColor),
      accent_color: cleanHex(data.accentColor),
      created_by: session.userId,
    })
    .select("id, slug")
    .single();

  if (error || !inserted) {
    return { ok: false, error: "Demo-Link konnte nicht erstellt werden." };
  }

  // Best-effort: Logo serverseitig re-hosten (stabil statt Hotlink). Scheitert es,
  // bleibt der Hotlink stehen — kein harter Fehler.
  if (data.logoUrl) {
    try {
      const res = await rehostLogoFromUrl({
        orgId: inserted.id,
        sourceUrl: data.logoUrl,
      });
      if (res.rehosted && res.logoUrl !== data.logoUrl) {
        await admin
          .from("demo_links")
          .update({ logo_url: res.logoUrl })
          .eq("id", inserted.id);
      }
    } catch {
      /* Hotlink behalten */
    }
  }

  revalidatePath("/demo-links");
  return { ok: true, slug: inserted.slug, id: inserted.id };
}

/** Listet alle Demo-Links (RLS-gescopt auf admin/support). */
export async function listDemoLinks(): Promise<DemoLinkRow[]> {
  const { supabase } = await requireRole("admin", "support");
  const { data, error } = await supabase
    .from("demo_links")
    .select(
      "id, slug, lead_company, lead_website, logo_url, primary_color, accent_color, created_at, expires_at, is_active, opened_count, first_opened_at, last_opened_at",
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  const now = Date.now();
  return data.map((r) => ({
    id: r.id,
    slug: r.slug,
    leadCompany: r.lead_company,
    leadWebsite: r.lead_website,
    logoUrl: r.logo_url,
    primaryColor: r.primary_color,
    accentColor: r.accent_color,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    isActive: r.is_active,
    isExpired: new Date(r.expires_at).getTime() < now,
    openedCount: r.opened_count,
    firstOpenedAt: r.first_opened_at,
    lastOpenedAt: r.last_opened_at,
  }));
}

/** Kill-Switch: Link (de)aktivieren. Nur admin/support. */
export async function setDemoLinkActive(input: {
  id: string;
  active: boolean;
}): Promise<{ ok: boolean }> {
  const { supabase } = await requireRole("admin", "support");
  const { error } = await supabase
    .from("demo_links")
    .update({ is_active: input.active })
    .eq("id", input.id);
  revalidatePath("/demo-links");
  return { ok: !error };
}

const leadSchema = z.object({
  slug: z.string().trim().min(1).max(120),
  name: z.string().trim().max(120).optional().nullable(),
  company: z.string().trim().max(120).optional().nullable(),
  email: z.string().trim().email().max(200),
  message: z.string().trim().max(2000).optional().nullable(),
});

/**
 * Öffentliche Lead-Erfassung über den Sandbox-CTA. Speichert die Anfrage und
 * benachrichtigt den Ersteller best-effort. Läuft über den Service-Role-Client,
 * gescopt auf den Slug (kein Vertrauen in client-gelieferte IDs).
 */
export async function submitDemoLead(
  input: z.infer<typeof leadSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Bitte eine gültige E-Mail angeben." };
  const data = parsed.data;

  const admin = createAdminClient();
  const { data: link } = await admin
    .from("demo_links")
    .select("id, lead_company, created_by")
    .eq("slug", data.slug)
    .maybeSingle();
  if (!link) return { ok: false, error: "Demo nicht gefunden." };

  const { error } = await admin.from("demo_link_leads").insert({
    demo_link_id: link.id,
    name: data.name || null,
    company: data.company || null,
    email: data.email,
    message: data.message || null,
  });
  if (error) return { ok: false, error: "Anfrage konnte nicht gespeichert werden." };

  // Best-effort: Ersteller per E-Mail benachrichtigen.
  try {
    if (link.created_by) {
      const { data: u } = await admin.auth.admin.getUserById(link.created_by);
      const to = u.user?.email;
      if (to) {
        await sendEmail({
          to,
          subject: `Neue Demo-Anfrage von ${data.company || data.name || data.email}`,
          html: `<p>Ein Lead hat über die personalisierte Demo (<strong>${link.lead_company}</strong>) Kontakt aufgenommen:</p>
<ul>
<li><strong>Name:</strong> ${data.name || "—"}</li>
<li><strong>Firma:</strong> ${data.company || "—"}</li>
<li><strong>E-Mail:</strong> ${data.email}</li>
<li><strong>Nachricht:</strong> ${data.message || "—"}</li>
</ul>`,
        });
      }
    }
  } catch {
    /* Benachrichtigung ist best-effort */
  }

  return { ok: true };
}
