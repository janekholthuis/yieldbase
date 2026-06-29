"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth-context";
import type { AppRole } from "@/lib/auth";
import {
  resolveEntitlements,
  type EntitlementOverrides,
  type Entitlements,
} from "@/lib/entitlements";

export type ActiveOrgBrand = { name: string; logoUrl: string | null } | null;

const OrgContext = createContext<ActiveOrgBrand>(null);
/** The active organisation's display branding (name + logo), or null for the default. */
export const useActiveOrg = () => useContext(OrgContext);

const EntitlementsContext = createContext<Entitlements>(resolveEntitlements(null));
/** PROJ-31: resolved feature entitlements of the active org (defaults if none). */
export const useEntitlements = () => useContext(EntitlementsContext);

export function Providers({
  children,
  activeOrg = null,
  entitlements = null,
  initialRoles = [],
  initialUserId = null,
}: {
  children: ReactNode;
  activeOrg?: ActiveOrgBrand;
  entitlements?: EntitlementOverrides | null;
  initialRoles?: AppRole[];
  initialUserId?: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const resolvedEntitlements = useMemo(
    () => resolveEntitlements(entitlements),
    [entitlements],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <OrgContext.Provider value={activeOrg}>
        <EntitlementsContext.Provider value={resolvedEntitlements}>
          <AuthProvider initialRoles={initialRoles} initialUserId={initialUserId}>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </EntitlementsContext.Provider>
      </OrgContext.Provider>
    </QueryClientProvider>
  );
}
