"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { mobileNav, canSeeQuickAction } from "@/lib/navigation";

/**
 * design: navy+gold token-map for MobileTabbar
 * - bg-brand-surface + border-t-brand-border (+ safe-area-padding)
 * - Active: 3px Top-Indicator bg-brand-primary + bg-brand-primaryTint
 * - FAB: bg-brand-primary text-white (NICHT Gold — Gold gehört Screen-CTAs)
 */
export function MobileTabbar() {
  const { roles } = useAuth();
  const items = mobileNav(roles);
  const pathname = usePathname();
  const showFab = canSeeQuickAction("new-customer", roles);

  if (items.length === 0) return null;

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-brand-border bg-brand-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-5">
          {items.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <li key={item.to}>
                <Link
                  href={item.to}
                  className={
                    "relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition-colors " +
                    (active
                      ? "bg-brand-primaryTint font-semibold text-brand-primary"
                      : "text-brand-muted hover:text-brand-primary")
                  }
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 top-0 h-[3px] rounded-b-full bg-brand-primary"
                    />
                  )}
                  <item.icon
                    className={
                      "h-5 w-5 " + (active ? "text-brand-primary" : "")
                    }
                    strokeWidth={2}
                  />
                  <span>{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {showFab && (
        <button
          type="button"
          aria-label="Neuer Kunde"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-white shadow-popover transition-colors hover:bg-brand-primaryHover md:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
