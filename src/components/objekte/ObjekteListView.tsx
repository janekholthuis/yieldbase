"use client";

import { useMemo, useState } from "react";
import { ProjektCard } from "@/components/objekte/ProjektCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, SlidersHorizontal, Search, X } from "lucide-react";
import { STATUS_LABELS } from "@/lib/objekt-format";
import type { ProjektUebersichtItem, EinheitStatus } from "@/lib/data/objekte";
import { ProjektWizard } from "@/components/objekte/ProjektWizard";
import { useAuth } from "@/lib/auth-context";

const INTERNAL_ROLES = [
  "admin",
  "support",
  "vertriebsleiter",
  "vp_l1",
  "vp_l2",
  "vp_l3",
];

type SortKey = "neueste" | "preis_asc" | "preis_desc" | "rendite_desc";

const STATUS_OPTIONS: EinheitStatus[] = [
  "frei",
  "auf_anfrage",
  "reserviert",
  "notarvorbereitung",
  "notartermin",
  "verkauft",
];

interface ProjektFilters {
  q: string;
  preisMin: string;
  preisMax: string;
  statuses: EinheitStatus[];
}

const EMPTY_FILTERS: ProjektFilters = {
  q: "",
  preisMin: "",
  preisMax: "",
  statuses: [],
};

export function ObjekteListView({
  projekte,
}: {
  projekte: ProjektUebersichtItem[];
}) {
  const [sort, setSort] = useState<SortKey>("neueste");
  const [filters, setFilters] = useState<ProjektFilters>(EMPTY_FILTERS);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { roles } = useAuth();
  const canCreate = roles.some((r) => INTERNAL_ROLES.includes(r));

  const filtered = useMemo(
    () => applyProjektFilters(projekte, filters),
    [projekte, filters],
  );

  const items = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "preis_asc":
        list.sort(
          (a, b) =>
            (a.aggregat.kaufpreis_min ?? Infinity) -
            (b.aggregat.kaufpreis_min ?? Infinity),
        );
        break;
      case "preis_desc":
        list.sort(
          (a, b) =>
            (b.aggregat.kaufpreis_max ?? -Infinity) -
            (a.aggregat.kaufpreis_max ?? -Infinity),
        );
        break;
      case "rendite_desc":
        list.sort(
          (a, b) => (b.mietrendite_brutto ?? 0) - (a.mietrendite_brutto ?? 0),
        );
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return list;
  }, [filtered, sort]);

  const activeFilterCount =
    (filters.preisMin ? 1 : 0) +
    (filters.preisMax ? 1 : 0) +
    filters.statuses.length;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* Filter-Sidebar (Desktop) */}
      <aside className="hidden shrink-0 border-r bg-card lg:block lg:w-72">
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto p-5">
          <div className="mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Filter
            </span>
            {activeFilterCount > 0 && (
              <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </div>
          <FilterPanel filters={filters} setFilters={setFilters} />
        </div>
      </aside>

      {/* Hauptbereich */}
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Objekte
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length}{" "}
              {items.length === 1 ? "Projekt gefunden" : "Projekte gefunden"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Filter-Trigger (mobil) */}
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2 lg:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[320px] overflow-y-auto sm:w-[360px]"
              >
                <SheetHeader className="mb-4">
                  <SheetTitle>Filter</SheetTitle>
                </SheetHeader>
                <FilterPanel filters={filters} setFilters={setFilters} />
              </SheetContent>
            </Sheet>

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sortierung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="neueste">Neueste zuerst</SelectItem>
                <SelectItem value="preis_asc">Preis aufsteigend</SelectItem>
                <SelectItem value="preis_desc">Preis absteigend</SelectItem>
                <SelectItem value="rendite_desc">Mietrendite ↓</SelectItem>
              </SelectContent>
            </Select>

            {canCreate && (
              <Button className="gap-2" onClick={() => setWizardOpen(true)}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Neues Projekt</span>
              </Button>
            )}
          </div>
        </div>

        {canCreate && (
          <ProjektWizard open={wizardOpen} onOpenChange={setWizardOpen} />
        )}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            {projekte.length === 0
              ? "Noch keine Projekte vorhanden."
              : "Keine Projekte passen zu den Filtern."}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => (
              <ProjektCard
                key={p.projekt_id}
                data={{
                  projekt_id: p.projekt_id,
                  projekt_name: p.name,
                  projekt_typ: p.projekt_typ,
                  cover_image_url: p.cover_image_url,
                  adresse: p.adresse,
                  stadt: p.stadt,
                  plz: p.plz,
                  bundesland: p.bundesland,
                  baujahr: p.baujahr,
                  aggregat: p.aggregat,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  setFilters,
}: {
  filters: ProjektFilters;
  setFilters: React.Dispatch<React.SetStateAction<ProjektFilters>>;
}) {
  const hasActive =
    filters.q !== "" ||
    filters.preisMin !== "" ||
    filters.preisMax !== "" ||
    filters.statuses.length > 0;

  return (
    <div className="space-y-6">
      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          placeholder="Projekt, Stadt, PLZ…"
          className="pl-8"
        />
      </div>

      {/* Kaufpreis */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Kaufpreis (€)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder="min"
            value={filters.preisMin}
            onChange={(e) =>
              setFilters((f) => ({ ...f, preisMin: e.target.value }))
            }
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder="max"
            value={filters.preisMax}
            onChange={(e) =>
              setFilters((f) => ({ ...f, preisMax: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Verkaufsstatus */}
      <div className="space-y-2.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Verkaufsstatus
        </Label>
        <div className="flex flex-col gap-2.5">
          {STATUS_OPTIONS.map((s) => {
            const checked = filters.statuses.includes(s);
            return (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2.5 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) =>
                    setFilters((f) => ({
                      ...f,
                      statuses:
                        c === true
                          ? [...f.statuses, s]
                          : f.statuses.filter((x) => x !== s),
                    }))
                  }
                />
                {STATUS_LABELS[s]}
              </label>
            );
          })}
        </div>
      </div>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          <X className="h-3.5 w-3.5" />
          Filter zurücksetzen
        </Button>
      )}
    </div>
  );
}

/**
 * Projekt-Ebene-Filter:
 * - q: matcht name/adresse/stadt/plz (case-insensitive)
 * - Preis: Projekt matcht, wenn [kaufpreis_min, kaufpreis_max] den gewählten
 *   Bereich überlappt
 * - Status: Projekt matcht, wenn status_counts den Status > 0 hat
 */
function applyProjektFilters(
  items: ProjektUebersichtItem[],
  f: ProjektFilters,
): ProjektUebersichtItem[] {
  const q = f.q.trim().toLowerCase();
  const min = f.preisMin ? Number(f.preisMin) : null;
  const max = f.preisMax ? Number(f.preisMax) : null;

  return items.filter((p) => {
    if (q) {
      const hay = [p.name, p.adresse, p.stadt, p.plz]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }

    if (min != null || max != null) {
      const lo = p.aggregat.kaufpreis_min;
      const hi = p.aggregat.kaufpreis_max;
      if (lo == null && hi == null) return false;
      const pLo = lo ?? hi!;
      const pHi = hi ?? lo!;
      if (min != null && pHi < min) return false;
      if (max != null && pLo > max) return false;
    }

    if (f.statuses.length > 0) {
      const counts = p.aggregat.status_counts;
      const hit =
        counts != null && f.statuses.some((s) => (counts[s] ?? 0) > 0);
      if (!hit) return false;
    }

    return true;
  });
}
