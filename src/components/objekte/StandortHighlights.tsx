"use client";

// Standort-Highlights (PROJ-15) — shows the nearest POI per category around a
// property with its straight-line distance. `useStandortHighlights` holds the
// shared data logic (geocode → fetch POIs); the default export renders the
// light-theme card used on the Einheiten "Karte" tab. The Präsentation slide
// reuses the hook with its own dark styling.
import { useEffect, useState } from "react";
import {
  Bus,
  Car,
  GraduationCap,
  HeartPulse,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { geocodeAddressParts, hasMapbox } from "@/lib/mapbox";
import {
  fetchStandortHighlights,
  formatDistance,
  type HighlightCategoryKey,
  type StandortHighlight,
} from "@/lib/standort-highlights";
import { SectionCard } from "@/components/ui/section-card";
import { Skeleton } from "@/components/ui/skeleton";

export const CATEGORY_ICONS: Record<HighlightCategoryKey, LucideIcon> = {
  oepnv: Bus,
  einkauf: ShoppingCart,
  bildung: GraduationCap,
  gesundheit: HeartPulse,
  autobahn: Car,
};

interface AddressProps {
  adresse: string;
  plz: string | null;
  stadt: string | null;
}

interface HookState {
  /** True while geocoding / fetching POIs. */
  loading: boolean;
  highlights: StandortHighlight[];
  /** False when no valid Mapbox token is configured. */
  available: boolean;
}

export function useStandortHighlights({
  adresse,
  plz,
  stadt,
}: AddressProps): HookState {
  const available = hasMapbox();
  const [loading, setLoading] = useState(available);
  const [highlights, setHighlights] = useState<StandortHighlight[]>([]);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const center = await geocodeAddressParts(adresse, plz, stadt);
      if (cancelled) return;
      if (!center) {
        setHighlights([]);
        setLoading(false);
        return;
      }
      const result = await fetchStandortHighlights(center);
      if (cancelled) return;
      setHighlights(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [available, adresse, plz, stadt]);

  return { loading, highlights, available };
}

/** Light-theme card for the Einheiten "Karte" tab. Renders nothing when no
 *  highlights are available (no token, address not geocodable, or no POIs). */
export function StandortHighlights(props: AddressProps) {
  const { loading, highlights, available } = useStandortHighlights(props);

  if (!available) return null;

  if (loading) {
    return (
      <SectionCard title="Standort-Highlights">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </SectionCard>
    );
  }

  if (highlights.length === 0) return null;

  return (
    <SectionCard
      title="Standort-Highlights"
      subtitle="Nächstgelegene Einrichtungen (Luftlinie)"
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {highlights.map((h) => {
          const Icon = CATEGORY_ICONS[h.category];
          return (
            <div
              key={h.category}
              className="flex items-center gap-3 rounded-lg border border-brand-borderSoft bg-card px-3 py-2.5"
            >
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-brand-accent/30 bg-brand-accentSoft text-brand-accent">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted-foreground">{h.label}</div>
                <div className="truncate text-sm font-medium text-foreground">
                  {h.name}
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatDistance(h.distanceMeters)}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
