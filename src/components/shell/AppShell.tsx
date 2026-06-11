"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Topbar } from "./Topbar";
import { MobileTabbar } from "./MobileTabbar";
import { FeedbackButton } from "./FeedbackButton";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Präsentations-Route: nur Slideshow, ohne Sidebar/Topbar
  const isPraesentation = pathname.includes("/praesentation");
  if (isPraesentation) {
    return (
      <div key={pathname} className="min-h-screen w-full bg-background">
        {children}
      </div>
    );
  }

  // design: navy+gold token-map for AppShell — Off-White bg-brand-bg (Master-Spec)
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-brand-bg">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-brand-bg">
          <Topbar />
          <main className="flex-1 pb-20 md:pb-6">
            <div key={pathname} className="page-fade">
              {children}
            </div>
          </main>
        </SidebarInset>
        <MobileTabbar />
        <FeedbackButton />
      </div>
    </SidebarProvider>
  );
}
