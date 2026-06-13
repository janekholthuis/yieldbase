"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { visibleNav } from "@/lib/navigation";
import { ObjektpilotLogo, ObjektpilotWordmark } from "@/components/brand/ObjektpilotLogo";

/**
 * design: navy+gold token-map for Sidebar
 * - bg-brand-surface + border-r-brand-border
 * - Active: bg-brand-primaryTint + text-brand-primary + rounded-lg (KEIN L-Border)
 * - Group-Label: uppercase tracking-widest text-brand-subtle
 * - Header: ObjektpilotWordmark
 */
export function AppSidebar() {
  const { roles } = useAuth();
  const items = visibleNav(roles);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-brand-border [&_[data-sidebar=sidebar]]:bg-brand-surface"
    >
      <SidebarHeader className="border-b border-brand-divider">
        <Link href="/dashboard" className="flex items-center px-2 py-1.5">
          {collapsed ? (
            <ObjektpilotLogo size={26} className="shrink-0" />
          ) : (
            <ObjektpilotWordmark logoSize={28} textClassName="text-base" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="px-3 text-xs font-semibold uppercase tracking-widest text-brand-subtle">
              Bereiche
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                // V1: deferred areas are shown greyed-out and non-navigable.
                if (item.comingSoon) {
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        tooltip={`${item.title} · bald verfügbar`}
                        aria-disabled
                        className="rounded-lg text-brand-subtle opacity-60 cursor-not-allowed hover:!bg-transparent hover:!text-brand-subtle"
                        onClick={(e) => e.preventDefault()}
                      >
                        <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        <span>{item.title}</span>
                        {!collapsed && (
                          <span className="ml-auto rounded-full bg-brand-surfaceMuted px-1.5 py-0.5 text-[10px] font-medium text-brand-subtle">
                            Bald
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                const active =
                  pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className={
                        active
                          ? "!bg-brand-primaryTint !text-brand-primary font-semibold rounded-lg"
                          : "rounded-lg text-brand-body hover:!bg-brand-surfaceMuted hover:!text-brand-primary"
                      }
                    >
                      <Link href={item.to} className="flex items-center gap-3">
                        <item.icon className="h-[18px] w-[18px]" strokeWidth={2} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
