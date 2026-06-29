"use server";

// Server actions for the Provisionen module: generate commission rows from
// reservierungen, and update a provision's status.
// Commission goes to the CLOSING VP only — the VP on the reservierung earns
// their own commission_rate % of einheit.kaufpreis; no upline participation.
// Idempotent (re-run refreshes amounts, preserves status).
// Admin/Vertriebsleiter only; mutations use the admin client.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { assertEntitlement } from "@/lib/entitlements-server";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOrgId, assertOrgAccess } from "@/lib/actions/_org";
import type { Database } from "@/lib/supabase/types";

type ProvisionStatus = Database["public"]["Enums"]["provision_status"];

const PROVISION_STATUSES = [
  "pipeline",
  "verdient",
  "in_auszahlung",
  "ausgezahlt",
  "storniert",
] as const satisfies readonly ProvisionStatus[];

// ──────────────────────────── generateProvisionen ────────────────────────────
export async function generateProvisionen(): Promise<{
  reservierungen: number;
  provisionen: number;
}> {
  const session = await requireRole("admin", "vertriebsleiter");
  const { userId, roles } = session;
  const admin = createAdminClient();

  // Tenant isolation: only generate within the caller's active organisation.
  // The admin client bypasses RLS, so the org scope is applied explicitly.
  const orgId = await activeOrgId(session.supabase, userId);

  // Scope: admin sees all reservierungen (within the active org); Vertriebsleiter
  // sees those whose VP is within their tree.
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

  // Pre-load each VP's own commission rate: vp_id -> rate.
  const { data: hierarchy } = await admin
    .from("vp_hierarchy")
    .select("vp_id, commission_rate");
  const rateByVp = new Map(
    (hierarchy ?? []).map((h) => [h.vp_id, Number(h.commission_rate)]),
  );

  // Load candidate reservierungen (not storniert) with their einheit kaufpreis.
  let resQuery = admin
    .from("reservierungen")
    .select("id, vp_id, status, einheit:einheit_id ( kaufpreis )")
    .neq("status", "storniert");
  if (orgId) resQuery = resQuery.eq("organisation_id", orgId);
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
    if (kaufpreis == null || !r.vp_id) continue;

    // Closing VP only — the VP on the reservierung earns their own rate; no
    // upline participation. Skip if they have no hierarchy entry or a 0 % rate.
    const rate = rateByVp.get(r.vp_id);
    if (rate == null || rate <= 0) continue;

    // NB: `status` is intentionally omitted. On INSERT the DB default
    // ('pipeline') applies; on CONFLICT the existing status is preserved — so
    // re-running generation refreshes amounts WITHOUT reverting a provision
    // that is already verdient/in_auszahlung/ausgezahlt/storniert.
    upserts.push({
      deal_id: r.id,
      vp_id: r.vp_id,
      provisionssatz: rate,
      betrag: (rate / 100) * kaufpreis,
      // Stamp the tenant explicitly — the admin client has no auth.uid(), so the
      // default-org trigger can't fire. Reservierungen are already org-scoped.
      organisation_id: orgId,
    });
    provisionCount += 1;
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
  const session = await requireRole("admin", "vertriebsleiter");
  await assertEntitlement("provisionen"); // PROJ-31: defense-in-depth
  const { userId, roles } = session;
  const data = updateProvisionStatusInput.parse(input);
  const admin = createAdminClient();

  // The admin client bypasses RLS, so `requireRole` alone would let any VL flip
  // the status of ANY provision (cross-org / outside their tree). Re-derive the
  // target's scope and gate exactly like the read path before writing.
  const { data: row, error: readErr } = await admin
    .from("provisionen")
    .select("organisation_id, vp_id")
    .eq("id", data.id)
    .maybeSingle();
  if (readErr) {
    throw new Error(`Status konnte nicht aktualisiert werden: ${readErr.message}`);
  }
  if (!row) throw new Error("Provision nicht gefunden");

  // Tenant isolation (admin/support may act cross-org; everyone else only in
  // their active org; orphaned rows only for admin/support).
  await assertOrgAccess(session, row.organisation_id);

  // Within-org: a Vertriebsleiter may only touch provisionen of VPs in their own
  // tree (matches the `prov_vl_select` RLS policy + the list scope). Admin: all.
  if (!roles.includes("admin")) {
    const { data: tree } = await admin
      .from("vp_hierarchy")
      .select("vp_id")
      .eq("vertriebsleiter_id", userId);
    const allowed = new Set((tree ?? []).map((r) => r.vp_id));
    allowed.add(userId);
    if (!row.vp_id || !allowed.has(row.vp_id)) {
      throw new Error("FORBIDDEN");
    }
  }

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
