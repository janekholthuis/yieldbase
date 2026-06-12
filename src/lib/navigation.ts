import type { AppRole } from "@/lib/auth";
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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  to: string;
  icon: LucideIcon;
  roles: AppRole[]; // roles that may see it
  mobile?: boolean; // include in mobile bottom tabs
  comingSoon?: boolean; // V1: shown greyed-out + non-navigable (code kept, feature deferred)
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
    comingSoon: true, // V1: deferred — greyed out (code kept)
  },
  {
    title: "Provisionen",
    to: "/provisionen",
    icon: Wallet,
    roles: ["admin", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3"],
    comingSoon: true, // V1: deferred — greyed out (code kept)
  },
  {
    title: "Mein Team",
    to: "/team",
    icon: UsersRound,
    roles: ["vertriebsleiter", "vp_l1", "vp_l2"],
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

export function visibleNav(roles: AppRole[]): NavItem[] {
  if (roles.length === 0) return [];
  return NAV_ITEMS.filter((item) => item.roles.some((r) => roles.includes(r)));
}

/** Nav the user can actually navigate to — excludes V1-deferred (comingSoon) areas. */
export function navigableNav(roles: AppRole[]): NavItem[] {
  return visibleNav(roles).filter((i) => !i.comingSoon);
}

export function mobileNav(roles: AppRole[]): NavItem[] {
  return visibleNav(roles)
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
