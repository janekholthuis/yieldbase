"use server";

// Server actions for the Provisionen module: generate commission rows from
// reservierungen along the VP hierarchy, and update a provision's status.
// Generation walks reservierung.vp_id up the parent_vp_id chain; each VP earns
// commission_rate % of the einheit.kaufpreis. Idempotent (re-run updates amounts).
// Admin/Vertriebsleiter only; mutations use the admin client.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type ProvisionStatus = Database["public"]["Enums"]["provision_status"];

const PROVISION_STATUSES = [
  "pipeline",
  "verdient",
  "in_auszahlung",
  "ausgezahlt",
  "storniert",
] as const satisfies readonly ProvisionStatus[];

// Default "open" status for freshly generated provisionen.
const OPEN_STATUS: ProvisionStatus = "pipeline";
const MAX_CHAIN_DEPTH = 10;

// ──────────────────────────── generateProvisionen ────────────────────────────
export async function generateProvisionen(): Promise<{
  reservierungen: number;
  provisionen: number;
}> {
  const { userId, roles } = await requireRole("admin", "vertriebsleiter");
  const admin = createAdminClient();

  // Scope: admin sees all reservierungen; Vertriebsleiter sees those whose VP is
  // within their tree.
  const isAdmin = roles.includes("admin");
  let scopeVpIds: Set<string> | null = null;
  if (!isAdmin) {
    const { data: tree } = await admin
      .from("vp_hierarchy")
      .select("vp_id")
      .eq("vertriebsleiter_id", userId);
    scopeVpIds = new Set((tree ?? []).map((r) => r.vp_id));
    scopeVpIds.add(userId);
  }

  // Pre-load the full hierarchy chain map: vp_id -> { parent, rate }.
  const { data: hierarchy } = await admin
    .from("vp_hierarchy")
    .select("vp_id, parent_vp_id, commission_rate");
  const hierById = new Map(
    (hierarchy ?? []).map((h) => [
      h.vp_id,
      { parent: h.parent_vp_id, rate: Number(h.commission_rate) },
    ]),
  );

  // Load candidate reservierungen (not storniert) with their einheit kaufpreis.
  let resQuery = admin
    .from("reservierungen")
    .select("id, vp_id, status, einheit:einheit_id ( kaufpreis )")
    .neq("status", "storniert");
  if (scopeVpIds !== null) {
    const ids = Array.from(scopeVpIds);
    if (ids.length === 0) return { reservierungen: 0, provisionen: 0 };
    resQuery = resQuery.in("vp_id", ids);
  }
  const { data: reservierungen, error: resErr } = await resQuery;
  if (resErr) {
    throw new Error(`Reservierungen konnten nicht geladen werden: ${resErr.message}`);
  }

  let provisionCount = 0;
  const upserts: Database["public"]["Tables"]["provisionen"]["Insert"][] = [];

  for (const r of reservierungen ?? []) {
    const einheit = r.einheit as { kaufpreis: number | null } | null;
    const kaufpreis = einheit?.kaufpreis;
    if (kaufpreis == null) continue;

    // Walk the VP chain up to the top, guarding against cycles / runaway loops.
    let currentVp: string | null = r.vp_id;
    let depth = 0;
    const seen = new Set<string>();
    while (currentVp && depth < MAX_CHAIN_DEPTH && !seen.has(currentVp)) {
      seen.add(currentVp);
      const node = hierById.get(currentVp);
      if (!node) break;
      if (node.rate > 0) {
        upserts.push({
          deal_id: r.id,
          vp_id: currentVp,
          provisionssatz: node.rate,
          betrag: (node.rate / 100) * kaufpreis,
          status: OPEN_STATUS,
        });
        provisionCount += 1;
      }
      currentVp = node.parent;
      depth += 1;
    }
  }

  if (upserts.length > 0) {
    // Idempotent on (deal_id, vp_id): re-running refreshes provisionssatz/betrag.
    const { error: upErr } = await admin
      .from("provisionen")
      .upsert(upserts, { onConflict: "deal_id,vp_id" });
    if (upErr) {
      throw new Error(`Provisionen konnten nicht erzeugt werden: ${upErr.message}`);
    }
  }

  revalidatePath("/provisionen");
  return { reservierungen: (reservierungen ?? []).length, provisionen: provisionCount };
}

// ──────────────────────────── updateProvisionStatus ────────────────────────────
const updateProvisionStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(PROVISION_STATUSES),
});

export async function updateProvisionStatus(
  input: z.infer<typeof updateProvisionStatusInput>,
) {
  await requireRole("admin", "vertriebsleiter");
  const data = updateProvisionStatusInput.parse(input);
  const admin = createAdminClient();

  const { error } = await admin
    .from("provisionen")
    .update({ status: data.status })
    .eq("id", data.id);
  if (error) {
    throw new Error(`Status konnte nicht aktualisiert werden: ${error.message}`);
  }

  revalidatePath("/provisionen");
  return { ok: true as const };
}
