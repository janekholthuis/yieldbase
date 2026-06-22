"use client";

import { useState } from "react";
import { Search, Plus, LogOut, UserCircle, Settings } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { OrgSwitcher } from "@/components/organisation/OrgSwitcher";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-context";
import { canSeeQuickAction } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserInitial } from "@/lib/user-initial";
import { CommandPalette, useCommandPalette } from "./CommandPalette";

/**
 * design: navy+gold token-map for Topbar
 * - bg-brand-surface + border-b-brand-border (kein Backdrop-Blur)
 * - Search-Trigger als rounded-xl Input-Look
 * - Bell-Wrapper rounded-lg mit primaryTint Hover
 * - Avatar bleibt rounded-full bg-brand-primary
 */
export function Topbar() {
  const { user, roles, signOut } = useAuth();
  const palette = useCommandPalette();
  const showNewCustomer = canSeeQuickAction("new-customer", roles);
  const showNewSubVp = canSeeQuickAction("new-sub-vp", roles);

  // One browser client per component instance (shares cookie storage).
  const [supabase] = useState(() => createClient());

  const userId = user?.id ?? null;
  const profileQ = useQuery({
    queryKey: ["profile-initial", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("vorname, name")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  const initials = getUserInitial({
    vorname: profileQ.data?.vorname ?? null,
    name:
      profileQ.data?.name ??
      (user?.user_metadata?.name as string | undefined) ??
      null,
    email: user?.email ?? null,
  });

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-brand-border bg-brand-surface px-3 md:px-6">
        <SidebarTrigger className="text-brand-muted hover:bg-brand-primaryTint hover:text-brand-primary" />
        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          className="ml-1 hidden h-10 w-72 items-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-4 text-left text-sm text-brand-subtle transition-colors hover:border-brand-primary/40 hover:bg-brand-surfaceMuted md:flex"
        >
          <Search className="h-4 w-4 text-brand-subtle" />
          <span className="flex-1">Suchen …</span>
          <kbd className="rounded-md bg-brand-surfaceMuted px-1.5 py-0.5 font-mono text-[10px] text-brand-muted">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={() => palette.setOpen(true)}
          aria-label="Suchen"
          className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-primaryTint hover:text-brand-primary md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>

        <div className="ml-2">
          <OrgSwitcher />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {showNewCustomer && (
            <Button asChild size="default" className="hidden md:inline-flex" variant="default">
              <Link href="/kunden/neu">
                <Plus className="mr-1 h-4 w-4" /> Neuer Kunde
              </Link>
            </Button>
          )}
          {showNewSubVp && (
            <Button asChild size="default" className="hidden lg:inline-flex" variant="outline">
              <Link href="/team">
                <Plus className="mr-1 h-4 w-4" /> Neuer Sub-VP
              </Link>
            </Button>
          )}

          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Benutzermenü"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-white"
              >
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel>
                <div className="text-sm font-semibold text-brand-primary">
                  {(user?.user_metadata?.name as string) ?? "Benutzer"}
                </div>
                <div className="truncate text-xs text-brand-muted">
                  {user?.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profil">
                  <UserCircle className="mr-2 h-4 w-4" /> Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/einstellungen">
                  <Settings className="mr-2 h-4 w-4" /> Einstellungen
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Abmelden
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <CommandPalette open={palette.open} onOpenChange={palette.setOpen} />
    </>
  );
}
