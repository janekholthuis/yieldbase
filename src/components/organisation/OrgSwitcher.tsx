"use client";

// Organisation switcher for the Topbar. Loads the signed-in user's orgs via the
// `getMyOrganisations` server-action wrapper (the underlying data module is
// `server-only`), marks the active one, and switches with `switchOrganisation`
// followed by `router.refresh()` so the root-layout theme re-applies.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getActiveOrganisationId,
  getMyOrganisations,
  switchOrganisation,
} from "@/lib/actions/organisationen";
import type { MyOrganisation } from "@/lib/data/organisationen";

function OrgLogo({ org }: { org: Pick<MyOrganisation, "name" | "logoUrl"> }) {
  if (org.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={org.logoUrl}
        alt=""
        className="h-6 w-6 shrink-0 rounded-md object-cover"
      />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-brand-primaryTint text-[11px] font-semibold text-brand-primary">
      {org.name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

export function OrgSwitcher() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<MyOrganisation[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getMyOrganisations(), getActiveOrganisationId()])
      .then(([data, activeId]) => {
        if (cancelled) return;
        setOrgs(data);
        setActiveOrgId(activeId);
      })
      .catch(() => {
        if (!cancelled) setOrgs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Loading skeleton.
  if (loading) {
    return (
      <div className="hidden h-9 w-44 animate-pulse items-center gap-2 rounded-lg border border-brand-border bg-brand-surfaceMuted px-3 sm:flex" />
    );
  }

  // No orgs — nothing to show.
  if (!orgs || orgs.length === 0) return null;

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  // Single org: render a non-interactive label (no switching needed).
  if (orgs.length === 1) {
    return (
      <div className="hidden items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 sm:flex">
        <OrgLogo org={active} />
        <span className="max-w-[140px] truncate text-sm font-medium text-brand-primary">
          {active.name}
        </span>
      </div>
    );
  }

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) return;
    setSwitching(orgId);
    try {
      await switchOrganisation({ orgId });
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wechsel fehlgeschlagen";
      toast.error("Organisation konnte nicht gewechselt werden", {
        description: msg,
      });
    } finally {
      setSwitching(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Organisation wechseln"
          className="hidden items-center gap-2 rounded-lg border border-brand-border bg-brand-surface px-3 py-1.5 text-left transition-colors hover:border-brand-primary/40 hover:bg-brand-surfaceMuted sm:flex"
        >
          <OrgLogo org={active} />
          <span className="max-w-[140px] truncate text-sm font-medium text-brand-primary">
            {active.name}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-brand-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 rounded-xl">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-brand-muted">
          <Building2 className="h-3.5 w-3.5" /> Organisation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((org) => {
          const isActive = org.id === active.id;
          const isBusy = switching === org.id;
          return (
            <DropdownMenuItem
              key={org.id}
              onSelect={(e) => {
                e.preventDefault();
                void handleSwitch(org.id);
              }}
              className="gap-2"
            >
              <OrgLogo org={org} />
              <span className="flex-1 truncate text-sm">{org.name}</span>
              {isBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-muted" />
              ) : isActive ? (
                <Check className="h-4 w-4 shrink-0 text-brand-primary" />
              ) : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
