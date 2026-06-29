import type { AppRole } from "@/lib/auth";
import type { EntitlementKey, EntitlementOverrides, Entitlements } from "@/lib/entitlements";
import { hasEntitlement } from "@/lib/entitlements";
import {
  LayoutDashboard,
  Building2,
  Users,
  CalendarCheck,
  Banknote,
  Wallet,
  UsersRound,
  UserCircle,
  Settings,
  Send,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  roles: AppRole[]; // roles that may see it
  mobile?: boolean; // include in mobile bottom tabs
  comingSoon?: boolean; // V1: shown greyed-out + non-navigable (code kept, feature deferred)
  hidden?: boolean; // V1: completely removed from all nav surfaces (route + code kept)
  requiresFeature?: EntitlementKey; // PROJ-31: hidden unless the active org has this entitlement
}

const ALL_INTERNAL: AppRole[] = [
  "admin",
  "support",
  "vertriebsleiter",
  "vp_l1",
  "vp_l2",
  "vp_l3",
];

export const NAV_ITEMS: NavItem[] = [
  {
    title: "Dashboard",
    to: "/dashboard",
    icon: LayoutDashboard,
    roles: [...ALL_INTERNAL, "kunde", "finanzierer"],
    mobile: true,
  },
  { title: "Objekte", to: "/objekte", icon: Building2, roles: ALL_INTERNAL, mobile: true },
  { title: "Kunden", to: "/kunden", icon: Users, roles: ALL_INTERNAL, mobile: true },
  {
    title: "Reservierungen",
    to: "/reservierungen",
    icon: CalendarCheck,
    roles: ALL_INTERNAL,
  },
  {
    title: "Finanzierungen",
    to: "/finanzierungen",
    icon: Banknote,
    roles: [...ALL_INTERNAL, "finanzierer"],
    requiresFeature: "finanzierungen",
  },
  {
    title: "Provisionen",
    to: "/provisionen",
    icon: Wallet,
    roles: ["admin", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3"],
    requiresFeature: "provisionen",
  },
  {
    title: "Mein Team",
    to: "/team",
    icon: UsersRound,
    roles: ["admin", "support", "vertriebsleiter", "vp_l1", "vp_l2"],
  },
  {
    title: "Demo-Links",
    to: "/demo-links",
    icon: Send,
    roles: ["admin", "support"],
    requiresFeature: "demo_links",
  },
  {
    title: "Einstellungen",
    to: "/einstellungen",
    icon: Settings,
    roles: [...ALL_INTERNAL, "finanzierer"],
  },
  {
    title: "Profil",
    to: "/profil",
    icon: UserCircle,
    roles: [...ALL_INTERNAL, "kunde", "finanzierer"],
    mobile: true,
  },
];

/**
 * PROJ-31: A nav item passes the feature gate if it has no `requiresFeature`, or
 * the active org has that entitlement. When `entitlements` is omitted (undefined),
 * the gate is a no-op — callers that don't know the org's entitlements keep the
 * pre-PROJ-31 behaviour (show everything role-allowed).
 */
function passesFeatureGate(
  item: NavItem,
  entitlements?: EntitlementOverrides | Entitlements | null,
): boolean {
  if (!item.requiresFeature) return true;
  if (entitlements === undefined) return true;
  return hasEntitlement(entitlements, item.requiresFeature);
}

export function visibleNav(
  roles: AppRole[],
  entitlements?: EntitlementOverrides | Entitlements | null,
): NavItem[] {
  if (roles.length === 0) return [];
  return NAV_ITEMS.filter(
    (item) =>
      !item.hidden &&
      item.roles.some((r) => roles.includes(r)) &&
      passesFeatureGate(item, entitlements),
  );
}

/** Nav the user can actually navigate to — excludes V1-deferred (comingSoon) areas. */
export function navigableNav(
  roles: AppRole[],
  entitlements?: EntitlementOverrides | Entitlements | null,
): NavItem[] {
  return visibleNav(roles, entitlements).filter((i) => !i.comingSoon);
}

export function mobileNav(
  roles: AppRole[],
  entitlements?: EntitlementOverrides | Entitlements | null,
): NavItem[] {
  return visibleNav(roles, entitlements)
    .filter((i) => i.mobile && !i.comingSoon)
    .slice(0, 5);
}

export function canSeeQuickAction(
  action: "new-customer" | "new-sub-vp",
  roles: AppRole[],
): boolean {
  if (action === "new-customer") {
    return roles.some((r) =>
      ["admin", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3"].includes(r),
    );
  }
  if (action === "new-sub-vp") {
    return roles.some((r) => ["vertriebsleiter", "vp_l1", "vp_l2"].includes(r));
  }
  return false;
}

export function isInternalRole(roles: AppRole[]): boolean {
  // Finanzierer counts as internal (sees feedback FAB). Only "kunde" is external.
  return roles.some((r) =>
    ["admin", "support", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3", "finanzierer"].includes(
      r,
    ),
  );
}
