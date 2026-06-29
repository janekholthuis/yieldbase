import "server-only";

// Server-seitige Durchsetzung der Org-Entitlements (PROJ-31).
//
// Das Nav-Gating ist nur Kosmetik. Die echte Durchsetzung passiert hier:
// - `requireEntitlementPage` als Route-Guard in Server-Component-Seiten
// - `assertEntitlement` als Defense-in-Depth in Server-Actions
//
// Modell: Entitlements gaten die FEATURES, die die Org gebucht hat. Externe
// Beteiligten-Rollen (finanzierer, kunde) sind NICHT entitlement-gated — ihr
// Zugriff ist rollen- und RLS-gesteuert. Solche Rollen koennen je Aufruf via
// `allowRoles` vom Gate ausgenommen werden.
import { redirect } from "next/navigation";
import { getSessionUser, type AppRole } from "@/lib/auth";
import { getActiveOrganisation } from "@/lib/data/organisationen";
import {
  hasEntitlement,
  resolveEntitlements,
  type EntitlementKey,
  type Entitlements,
} from "@/lib/entitlements";

/** Resolved entitlements of the signed-in user's active org (defaults if none). */
export async function getActiveOrgEntitlements(): Promise<Entitlements> {
  const org = await getActiveOrganisation();
  return resolveEntitlements(org?.entitlements ?? null);
}

interface GateOptions {
  /** Roles that bypass the entitlement check entirely (e.g. external participants). */
  allowRoles?: AppRole[];
}

function rolesBypass(roles: AppRole[], allowRoles?: AppRole[]): boolean {
  if (!allowRoles || allowRoles.length === 0) return false;
  return roles.some((r) => allowRoles.includes(r));
}

/**
 * Route-Guard fuer Server-Component-Seiten. Leitet auf /login (kein Login) bzw.
 * /dashboard (Org hat das Feature nicht) um. Gibt bei Erfolg die Rollen zurueck,
 * damit die Seite weiteres Rollen-Gating ohne zweiten getSessionUser() machen kann.
 */
export async function requireEntitlementPage(
  key: EntitlementKey,
  opts: GateOptions = {},
): Promise<AppRole[]> {
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (rolesBypass(session.roles, opts.allowRoles)) return session.roles;

  const ent = await getActiveOrgEntitlements();
  if (!ent[key]) redirect("/dashboard");
  return session.roles;
}

/**
 * Defense-in-Depth fuer Server-Actions. Wirft "FORBIDDEN", wenn die aktive Org
 * das Feature nicht hat. RLS schuetzt die Mandantentrennung ohnehin — dies
 * verhindert die Nutzung eines nicht freigeschalteten Features per Direkt-POST.
 */
export async function assertEntitlement(
  key: EntitlementKey,
  opts: GateOptions = {},
): Promise<void> {
  const session = await getSessionUser();
  if (!session) throw new Error("UNAUTHORIZED");
  if (rolesBypass(session.roles, opts.allowRoles)) return;

  const org = await getActiveOrganisation();
  if (!hasEntitlement(org?.entitlements ?? null, key)) {
    throw new Error("FORBIDDEN");
  }
}
