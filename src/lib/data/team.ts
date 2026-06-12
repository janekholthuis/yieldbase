// Server-side data access for the Team module (VP hierarchy + pending invites).
// Plain async functions for Server Components. Reads use the admin client because
// the VP hierarchy / invites are not directly RLS-readable across the sub-tree;
// authorisation is enforced up-front via requireUser + caller-scoped tree walking.
import "server-only";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export interface TeamMember {
  vpId: string;
  name: string | null;
  email: string | null;
  role: AppRole | null;
  level: number;
  parentVpId: string | null;
  commissionRate: number;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: AppRole;
  commissionRate: number | null;
  createdAt: string;
  expiresAt: string;
}

const VP_ROLES: AppRole[] = ["vp_l1", "vp_l2", "vp_l3"];

/**
 * Returns the VP hierarchy the caller leads, as a flat array ordered by level
 * then name. Admin/Vertriebsleiter see the whole tree under them; a VP sees
 * their own sub-tree (themselves + all descendants).
 */
export async function getMyTeam(): Promise<TeamMember[]> {
  const { userId, roles } = await requireUser();
  const admin = createAdminClient();

  const isAdmin = roles.includes("admin");
  const isVertriebsleiter = roles.includes("vertriebsleiter");

  // Load the full hierarchy once, then derive the caller's visible subset.
  const { data: hierarchy, error: hErr } = await admin
    .from("vp_hierarchy")
    .select("vp_id, parent_vp_id, level, commission_rate, vertriebsleiter_id");
  if (hErr) throw new Error(`Hierarchie konnte nicht geladen werden: ${hErr.message}`);
  const rows = hierarchy ?? [];

  let visible: typeof rows;
  if (isAdmin) {
    visible = rows;
  } else if (isVertriebsleiter) {
    // Everyone whose vertriebsleiter_id is the caller.
    visible = rows.filter((r) => r.vertriebsleiter_id === userId);
  } else {
    // A VP: themselves + all transitive descendants via parent_vp_id.
    const childrenOf = new Map<string, string[]>();
    for (const r of rows) {
      if (r.parent_vp_id) {
        const arr = childrenOf.get(r.parent_vp_id) ?? [];
        arr.push(r.vp_id);
        childrenOf.set(r.parent_vp_id, arr);
      }
    }
    const includeIds = new Set<string>([userId]);
    const queue = [userId];
    let guard = 0;
    while (queue.length && guard < 10_000) {
      guard += 1;
      const current = queue.shift()!;
      for (const childId of childrenOf.get(current) ?? []) {
        if (!includeIds.has(childId)) {
          includeIds.add(childId);
          queue.push(childId);
        }
      }
    }
    visible = rows.filter((r) => includeIds.has(r.vp_id));
  }

  if (visible.length === 0) return [];

  const vpIds = visible.map((r) => r.vp_id);

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, name, vorname, nachname, email")
    .in("id", vpIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: roleRows } = await admin
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", vpIds);
  // A VP's hierarchy role is one of the vp_l* roles; pick that if present.
  const roleByUser = new Map<string, AppRole>();
  for (const r of roleRows ?? []) {
    const existing = roleByUser.get(r.user_id);
    if (!existing || VP_ROLES.includes(r.role)) {
      roleByUser.set(r.user_id, r.role);
    }
  }

  const members: TeamMember[] = visible.map((r) => {
    const p = profileById.get(r.vp_id);
    const name =
      p?.name ?? ([p?.vorname, p?.nachname].filter(Boolean).join(" ") || null);
    return {
      vpId: r.vp_id,
      name: name && name.length > 0 ? name : null,
      email: p?.email ?? null,
      role: roleByUser.get(r.vp_id) ?? null,
      level: r.level,
      parentVpId: r.parent_vp_id,
      commissionRate: Number(r.commission_rate),
    };
  });

  members.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    return (a.name ?? "").localeCompare(b.name ?? "");
  });

  return members;
}

/** Open invites (not accepted, not expired) the caller created. */
export async function listPendingInvites(): Promise<PendingInvite[]> {
  const { userId } = await requireUser();
  const admin = createAdminClient();

  const nowIso = new Date().toISOString();
  const { data, error } = await admin
    .from("invites")
    .select("id, email, role, commission_rate, created_at, expires_at")
    .eq("invited_by", userId)
    .is("accepted_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Einladungen konnten nicht geladen werden: ${error.message}`);

  return (data ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    commissionRate: i.commission_rate == null ? null : Number(i.commission_rate),
    createdAt: i.created_at,
    expiresAt: i.expires_at,
  }));
}
