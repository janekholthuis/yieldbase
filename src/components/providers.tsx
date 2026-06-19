"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import type { AppRole } from "@/lib/auth";

export type ActiveOrgBrand = { name: string; logoUrl: string | null } | null;

const OrgContext = createContext<ActiveOrgBrand>(null);
/** The active organisation's display branding (name + logo), or null for the default. */
export const useActiveOrg = () => useContext(OrgContext);

export function Providers({
  children,
  activeOrg = null,
  initialRoles = [],
  initialUserId = null,
}: {
  children: ReactNode;
  activeOrg?: ActiveOrgBrand;
  initialRoles?: AppRole[];
  initialUserId?: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <OrgContext.Provider value={activeOrg}>
        <AuthProvider initialRoles={initialRoles} initialUserId={initialUserId}>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </OrgContext.Provider>
    </QueryClientProvider>
  );
}
