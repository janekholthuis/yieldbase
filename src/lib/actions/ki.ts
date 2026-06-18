"use server";

// PROJ-22 — KI-Lageeinschätzung + KI-Tags. Generiert (Vorschau, persistiert
// nicht) und speichert die KI-Felder einer Einheit. Autorisierung wie der übrige
// Objekt-CRUD: interne Rollen + assertOrgAccess (Admin-Client bypassed RLS).
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOrgAccess } from "@/lib/actions/_org";
import { chatJSON, isAiConfigured } from "@/lib/ai/openai";
import {
  buildLageMessages,
  parseLageResult,
  MAX_TAGS,
  type LageResult,
} from "@/lib/ai/lageeinschaetzung";

const INTERNAL_ROLES = [
  "admin",
  "support",
  "vertriebsleiter",
  "vp_l1",
  "vp_l2",
  "vp_l3",
] as const;

/** Ist die KI serverseitig nutzbar? (für UI-Gating). */
export async function getAiStatus(): Promise<{ configured: boolean }> {
  await requireRole(...INTERNAL_ROLES);
  return { configured: isAiConfigured() };
}

const generateSchema = z.object({ einheitId: z.string().uuid() });

/**
 * Generiert eine Lageeinschätzung + Tags für eine Einheit. Persistiert NICHT —
 * gibt einen Vorschlag zur Vorschau/Bearbeitung zurück.
 */
export async function generateEinheitLage(
  input: z.infer<typeof generateSchema>,
): Promise<LageResult> {
  const session = await requireRole(...INTERNAL_ROLES);
  const { einheitId } = generateSchema.parse(input);
  const admin = createAdminClient();

  const { data: einheit } = await admin
    .from("einheiten")
    .select(
      "organisation_id, wohnflaeche, zimmer, etage, objektzustand, nutzungsart, standort_highlights, projekt:projekt_id ( name, adresse, plz, stadt, baujahr )",
    )
    .eq("id", einheitId)
    .maybeSingle();
  if (!einheit) throw new Error("Einheit nicht gefunden");
  await assertOrgAccess(session, einheit.organisation_id);

  const projekt = (einheit.projekt ?? {}) as {
    name?: string | null;
    adresse?: string | null;
    plz?: string | null;
    stadt?: string | null;
    baujahr?: number | null;
  };

  const messages = buildLageMessages({
    adresse: projekt.adresse ?? null,
    plz: projekt.plz ?? null,
    stadt: projekt.stadt ?? null,
    projektName: projekt.name ?? null,
    baujahr: projekt.baujahr ?? null,
    wohnflaeche: einheit.wohnflaeche,
    zimmer: einheit.zimmer,
    etage: einheit.etage,
    objektzustand: einheit.objektzustand,
    nutzungsart: einheit.nutzungsart,
    vorhandeneHighlights: einheit.standort_highlights,
  });

  const raw = await chatJSON(messages);
  return parseLageResult(raw);
}

const saveSchema = z.object({
  einheitId: z.string().uuid(),
  standort_highlights: z.string().trim().max(1500).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(MAX_TAGS).optional(),
});

/** Speichert die KI-Felder (standort_highlights + tags) einer Einheit. */
export async function saveEinheitKiFelder(
  input: z.infer<typeof saveSchema>,
): Promise<{ ok: true }> {
  const session = await requireRole(...INTERNAL_ROLES);
  const data = saveSchema.parse(input);
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("einheiten")
    .select("organisation_id, projekt_id")
    .eq("id", data.einheitId)
    .maybeSingle();
  if (!existing) throw new Error("Einheit nicht gefunden");
  await assertOrgAccess(session, existing.organisation_id);

  const patch: { standort_highlights?: string | null; tags?: string[] } = {};
  if (data.standort_highlights !== undefined) {
    patch.standort_highlights = data.standort_highlights || null;
  }
  if (data.tags !== undefined) patch.tags = data.tags;

  const { error } = await admin
    .from("einheiten")
    .update(patch)
    .eq("id", data.einheitId);
  if (error) throw new Error(`KI-Felder konnten nicht gespeichert werden: ${error.message}`);

  revalidatePath("/objekte");
  if (existing.projekt_id) revalidatePath(`/objekte/projekt/${existing.projekt_id}`);
  return { ok: true };
}
