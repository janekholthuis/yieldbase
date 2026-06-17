"use client";

import { useMemo, useState } from "react";
import { ProjektCard } from "@/components/objekte/ProjektCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, SlidersHorizontal, Search } from "lucide-react";
import { STATUS_LABELS } from "@/lib/objekt-format";
import type {
  ProjektUebersichtItem,
  EinheitStatus,
} from "@/lib/data/objekte";
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
  const [filterOpen, setFilterOpen] = useState(false);
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
          (a, b) =>
            (b.mietrendite_brutto ?? 0) - (a.mietrendite_brutto ?? 0),
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
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Objekte
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "Projekt" : "Projekte"}
          </p>
        </div>
        {canCreate && (
          <Button className="gap-2" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4" />
            Neues Projekt anlegen
          </Button>
        )}
      </div>

      {canCreate && (
        <ProjektWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      )}

      {/* Top filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            placeholder="Projekt, Adresse, Stadt, PLZ…"
            className="pl-8"
          />
        </div>

        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[340px] flex-col overflow-y-auto sm:w-[380px]"
          >
            <SheetHeader className="mb-4">
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>

            <div className="flex-1 space-y-6">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Kaufpreis (€)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="min"
                    value={filters.preisMin}
                    onChange={(e) =>
                      setFilters({ ...filters, preisMin: e.target.value })
                    }
                  />
                  <span className="text-muted-foreground">–</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="max"
                    value={filters.preisMax}
                    onChange={(e) =>
                      setFilters({ ...filters, preisMax: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Verkaufsstatus</Label>
                <div className="flex flex-col gap-2">
                  {STATUS_OPTIONS.map((s) => {
                    const checked = filters.statuses.includes(s);
                    return (
                      <label
                        key={s}
                        className="flex cursor-pointer items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={checked}
                          onChange={(e) =>
                            setFilters((f) => ({
                              ...f,
                              statuses: e.target.checked
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
            </div>

            <SheetFooter className="mt-6">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters((f) => ({
                    ...EMPTY_FILTERS,
                    q: f.q,
                  }))
                }
              >
                Zurücksetzen
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sortierung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="neueste">Neueste zuerst</SelectItem>
            <SelectItem value="preis_asc">Preis aufsteigend</SelectItem>
            <SelectItem value="preis_desc">Preis absteigend</SelectItem>
            <SelectItem value="rendite_desc">Mietrendite ↓</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
  );
}

/**
 * Projekt-Ebene-Filter (ersetzt das frühere applyObjekteFilters auf Einheiten):
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
      // Ohne Preisdaten kann keine Überlappung bestimmt werden → ausschließen.
      if (lo == null && hi == null) return false;
      const pLo = lo ?? hi!;
      const pHi = hi ?? lo!;
      if (min != null && pHi < min) return false;
      if (max != null && pLo > max) return false;
    }

    if (f.statuses.length > 0) {
      const counts = p.aggregat.status_counts;
      const hit =
        counts != null &&
        f.statuses.some((s) => (counts[s] ?? 0) > 0);
      if (!hit) return false;
    }

    return true;
  });
}
