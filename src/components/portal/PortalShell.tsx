"use client";

import { useEffect, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderClosed,
  Activity,
  MessageCircle,
  UserCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ObjektpilotWordmark } from "@/components/brand/ObjektpilotLogo";

const PORTAL_NAV: Array<{
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}> = [
  { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/portal/dokumente", label: "Meine Unterlagen", icon: FolderClosed },
  { to: "/portal/status", label: "Mein Status", icon: Activity },
  { to: "/portal/nachrichten", label: "Nachrichten", icon: MessageCircle },
  { to: "/portal/profil", label: "Profil", icon: UserCircle },
];

const WELCOME_KEY = "op_portal_welcome_seen";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { signOut, user } = useAuth();
  const pathname = usePathname() ?? "/portal";

  // Welcome modal nur beim ersten Login je Browser
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(WELCOME_KEY);
    if (!seen) setShowWelcome(true);
  }, []);

  const dismissWelcome = () => {
    window.localStorage.setItem(WELCOME_KEY, "1");
    setShowWelcome(false);
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const initials =
    (user?.user_metadata?.name as string | undefined)?.trim()?.[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "?";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[color:var(--surface-soft)]">
        <PortalSidebar pathname={pathname} />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-[color:var(--surface-soft)]">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-[color:var(--surface-soft)]/80 px-3 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Benutzermenü"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
                  >
                    {initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="text-sm font-medium">
                      {(user?.user_metadata?.name as string) ?? "Mein Konto"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/portal/profil">
                      <UserCircle className="mr-2 h-4 w-4" /> Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 pb-6">
            <div key={pathname} className="page-fade">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      <Dialog
        open={showWelcome}
        onOpenChange={(o) => {
          if (!o) dismissWelcome();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--highlight-bg)] text-[color:var(--primary)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <DialogTitle className="font-display text-2xl">
              Schön, dass du da bist
            </DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-muted-foreground">
              Hier kannst du deine Unterlagen einreichen und den Status deiner
              Reservierung verfolgen. Dein Berater begleitet dich durch den
              Prozess.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end">
            <Button onClick={dismissWelcome}>Los geht&apos;s</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function PortalSidebar({ pathname }: { pathname: string }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/portal" className="flex items-center gap-2 px-2 py-1.5">
          {collapsed ? (
            <ObjektpilotWordmark logoSize={28} className="[&>span:last-child]:hidden" />
          ) : (
            <ObjektpilotWordmark logoSize={28} textClassName="text-base" />
          )}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Mein Bereich</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {PORTAL_NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.to
                  : pathname === item.to || pathname.startsWith(item.to + "/");
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={
                        active
                          ? "!bg-[color:var(--highlight-bg)] !text-[color:var(--primary)] font-semibold rounded-xl"
                          : "rounded-xl"
                      }
                    >
                      <Link href={item.to} className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            Dein Kunden-Portal
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
