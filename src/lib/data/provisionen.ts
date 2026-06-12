// Server-side data access for the Provisionen (commissions) module.
// Commission model: % of Kaufpreis along the VP hierarchy. A VP sees their own
// provisionen; admin/Vertriebsleiter see all within their tree. Reads use the
// admin client (provisionen + hierarchy are not RLS-readable across the sub-tree)
// after the caller's scope is derived; authorisation is enforced via requireUser.
import "server-only";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { activeOrgId } from "@/lib/actions/_org";
import type { Database } from "@/lib/supabase/types";

type ProvisionStatus = Database["public"]["Enums"]["provision_status"];

export interface ProvisionListItem {
  id: string;
  vpId: string;
  vpName: string | null;
  dealId: string | null;
  provisionssatz: number;
  betrag: number;
  status: ProvisionStatus;
  kaufpreis: number | null;
  einheitLabel: string | null;
  createdAt: string;
}

export type ProvisionenSummary = Record<ProvisionStatus, number>;

/**
 * Resolve the set of VP ids the caller may see provisionen for.
 * - admin: all VPs in the hierarchy.
 * - vertriebsleiter: everyone whose vertriebsleiter_id is the caller.
 * - VP: themselves only (own provisionen).
 * Returns null for "all" (admin), else an explicit id set.
 */
async function resolveScopeVpIds(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  roles: Database["public"]["Enums"]["app_role"][],
): Promise<string[] | null> {
  if (roles.includes("admin")) return null;

  if (roles.includes("vertriebsleiter")) {
    const { data } = await admin
      .from("vp_hierarchy")
      .select("vp_id")
      .eq("vertriebsleiter_id", userId);
    const ids = (data ?? []).map((r) => r.vp_id);
    ids.push(userId);
    return Array.from(new Set(ids));
  }

  // Plain VP — only their own.
  return [userId];
}

/** Role-scoped list of provisionen with VP name + deal/einheit context. */
export async function listProvisionen(): Promise<ProvisionListItem[]> {
  const session = await requireUser();
  const { userId, roles } = session;
  const admin = createAdminClient();

  const scopeIds = await resolveScopeVpIds(admin, userId, roles);
  // Tenant isolation: the admin client bypasses RLS, so scope to the caller's
  // active organisation explicitly (the org-switcher model — you see the active
  // org's data, regardless of role).
  const orgId = await activeOrgId(session.supabase, userId);

  let query = admin
    .from("provisionen")
    .select("id, vp_id, deal_id, provisionssatz, betrag, status, created_at")
    .order("created_at", { ascending: false });
  if (orgId) query = query.eq("organisation_id", orgId);
  if (scopeIds !== null) {
    if (scopeIds.length === 0) return [];
    query = query.in("vp_id", scopeIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Provisionen konnten nicht geladen werden: ${error.message}`);
  const rows = data ?? [];

  // Resolve VP names in one round-trip.
  const vpIds = Array.from(new Set(rows.map((r) => r.vp_id)));
  const { data: profiles } = vpIds.length
    ? await admin
        .from("profiles")
        .select("id, name, vorname, nachname")
        .in("id", vpIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => {
      const name =
        p.name ?? ([p.vorname, p.nachname].filter(Boolean).join(" ") || null);
      return [p.id, name && name.length > 0 ? name : null] as const;
    }),
  );

  // Resolve einheit (wohnungsnummer + kaufpreis) per deal via reservierungen.
  const dealIds = Array.from(
    new Set(rows.map((r) => r.deal_id).filter((d): d is string => Boolean(d))),
  );
  const einheitByDeal = new Map<
    string,
    { wohnungsnummer: string | null; kaufpreis: number | null }
  >();
  if (dealIds.length) {
    const { data: deals } = await admin
      .from("reservierungen")
      .select("id, einheit:einheit_id ( wohnungsnummer, kaufpreis )")
      .in("id", dealIds);
    for (const d of deals ?? []) {
      const einheit = d.einheit as
        | { wohnungsnummer: string | null; kaufpreis: number | null }
        | null;
      einheitByDeal.set(d.id, {
        wohnungsnummer: einheit?.wohnungsnummer ?? null,
        kaufpreis: einheit?.kaufpreis ?? null,
      });
    }
  }

  return rows.map((r) => {
    const einheit = r.deal_id ? einheitByDeal.get(r.deal_id) : undefined;
    return {
      id: r.id,
      vpId: r.vp_id,
      vpName: nameById.get(r.vp_id) ?? null,
      dealId: r.deal_id,
      provisionssatz: Number(r.provisionssatz),
      betrag: Number(r.betrag),
      status: r.status,
      kaufpreis: einheit?.kaufpreis ?? null,
      einheitLabel: einheit?.wohnungsnummer ?? null,
      createdAt: r.created_at,
    };
  });
}

/** Totals (sum of betrag) grouped by status, scoped like listProvisionen. */
export async function provisionenSummary(): Promise<ProvisionenSummary> {
  const session = await requireUser();
  const { userId, roles } = session;
  const admin = createAdminClient();

  const scopeIds = await resolveScopeVpIds(admin, userId, roles);
  const orgId = await activeOrgId(session.supabase, userId);

  const empty: ProvisionenSummary = {
    pipeline: 0,
    verdient: 0,
    in_auszahlung: 0,
    ausgezahlt: 0,
    storniert: 0,
  };

  let query = admin.from("provisionen").select("status, betrag");
  if (orgId) query = query.eq("organisation_id", orgId);
  if (scopeIds !== null) {
    if (scopeIds.length === 0) return empty;
    query = query.in("vp_id", scopeIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Summen konnten nicht geladen werden: ${error.message}`);

  const totals = { ...empty };
  for (const row of data ?? []) {
    totals[row.status] += Number(row.betrag);
  }
  return totals;
}
