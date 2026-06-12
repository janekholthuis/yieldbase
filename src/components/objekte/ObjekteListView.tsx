"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ObjektCard } from "@/components/objekte/ObjektCard";
import { ProjektCard, type ProjektCardData } from "@/components/objekte/ProjektCard";
import {
  ObjekteFilterSidebar,
  ActiveFilterChips,
  DEFAULT_FILTERS,
  type ObjekteFilters,
} from "@/components/objekte/ObjekteFilterSidebar";
import { applyObjekteFilters } from "@/lib/objekte-filter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LayoutGrid, Plus, Rows3, SlidersHorizontal, Search } from "lucide-react";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatEUR,
  formatNumber,
  pricePerSqm,
} from "@/lib/objekt-format";
import type { ObjektListItem } from "@/lib/data/objekte";
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

type SortKey = "neueste" | "preis_asc" | "preis_desc" | "rendite_desc" | "status";

// TODO(migration): Mapbox map view ("map") is intentionally omitted — only
// grid and table views are ported. Re-add when ObjekteMapView is migrated.
type View = "grid" | "table";

export function ObjekteListView({ items: allItems }: { items: ObjektListItem[] }) {
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<SortKey>("neueste");
  const [filters, setFilters] = useState<ObjekteFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { roles } = useAuth();
  const canCreate = roles.some((r) => INTERNAL_ROLES.includes(r));

  const filtered = useMemo(
    () => applyObjekteFilters(allItems, filters),
    [allItems, filters],
  );

  const items = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "preis_asc":
        list.sort((a, b) => (a.kaufpreis ?? 0) - (b.kaufpreis ?? 0));
        break;
      case "preis_desc":
        list.sort((a, b) => (b.kaufpreis ?? 0) - (a.kaufpreis ?? 0));
        break;
      case "rendite_desc":
        list.sort(
          (a, b) => (b.mietrendite_brutto ?? 0) - (a.mietrendite_brutto ?? 0),
        );
        break;
      case "status":
        list.sort((a, b) => a.status.localeCompare(b.status));
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    return list;
  }, [filtered, sort]);

  const projektNames = useMemo(() => {
    const m: Record<string, string> = {};
    allItems.forEach((i) => {
      if (i.projekt_id) m[i.projekt_id] = i.projekt_name ?? i.projekt_id;
    });
    return m;
  }, [allItems]);

  const activeFilterCount = countActiveFilters(filters);

  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-accent backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Vertriebsplattform
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Objekte
          </h1>
          <div className="mt-1 h-[2px] w-10 rounded-full bg-accent" />
          <p className="mt-2 text-sm text-muted-foreground">
            {view === "grid"
              ? `${countProjects(items)} Projekte · ${items.length} Einheiten`
              : `${items.length} Einheiten`}
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
            placeholder="Adresse, Wohnung, Stadt, Bauträger…"
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
          <SheetContent side="right" className="w-[340px] overflow-y-auto sm:w-[380px]">
            <SheetHeader className="mb-4">
              <SheetTitle>Filter</SheetTitle>
            </SheetHeader>
            <ObjekteFilterSidebar
              filters={filters}
              onChange={setFilters}
              items={allItems}
            />
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
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex rounded-md border bg-background">
          <Button
            variant={view === "grid" ? "default" : "ghost"}
            size="icon"
            className="rounded-r-none"
            onClick={() => setView("grid")}
            aria-label="Grid-Ansicht"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "default" : "ghost"}
            size="icon"
            className="rounded-l-none"
            onClick={() => setView("table")}
            aria-label="Tabellen-Ansicht"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ActiveFilterChips
        filters={filters}
        onChange={setFilters}
        itemsCount={items.length}
        totalCount={allItems.length}
        projektNames={projektNames}
      />

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Keine Objekte passen zu den Filtern.
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {groupForGrid(items).map((entry) =>
            entry.kind === "projekt" ? (
              <ProjektCard key={entry.data.projekt_id} data={entry.data} />
            ) : (
              <ObjektCard key={entry.item.einheit_id} item={entry.item} />
            ),
          )}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bezeichnung</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead className="text-right">Wohnfläche</TableHead>
                <TableHead className="text-right">Zimmer</TableHead>
                <TableHead className="text-right">Kaufpreis</TableHead>
                <TableHead className="text-right">€/m²</TableHead>
                <TableHead className="text-right">Mietrendite</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => {
                const ppsm = pricePerSqm(it.kaufpreis, it.wohnflaeche);
                return (
                  <TableRow key={it.einheit_id} className="cursor-pointer">
                    <TableCell>
                      <Link
                        href={`/objekte/${it.einheit_id}`}
                        className="font-medium hover:underline"
                      >
                        Wohnung {it.wohnungsnummer}
                        {it.projekt_name && (
                          <span className="text-muted-foreground"> · {it.projekt_name}</span>
                        )}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {[it.stadt, it.plz].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(it.wohnflaeche, " m²")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(it.zimmer)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEUR(it.kaufpreis)}
                    </TableCell>
                    <TableCell className="text-right">
                      {ppsm != null ? formatEUR(Math.round(ppsm)) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(it.mietrendite_brutto, " %")}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[it.status]}`}
                      >
                        {STATUS_LABELS[it.status]}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function countActiveFilters(f: ObjekteFilters): number {
  const d = DEFAULT_FILTERS;
  let n = 0;
  if (f.q) n++;
  n += f.statuses.length;
  if (f.stadt) n++;
  if (f.plz) n++;
  if (f.preisMin !== d.preisMin || f.preisMax !== d.preisMax) n++;
  if (f.flaecheMin !== d.flaecheMin || f.flaecheMax !== d.flaecheMax) n++;
  n += f.zimmer.length;
  if (f.renditeMin > 0) n++;
  if (f.vermietet !== "alle") n++;
  n += f.projekte.length;
  return n;
}

type GridEntry =
  | { kind: "projekt"; data: ProjektCardData }
  | { kind: "einheit"; item: ObjektListItem };

function groupForGrid(items: ObjektListItem[]): GridEntry[] {
  const projekte = new Map<string, ProjektCardData>();
  const singles: GridEntry[] = [];
  const order: string[] = [];

  for (const it of items) {
    if (it.projekt_typ === "etw_einzeln") {
      singles.push({ kind: "einheit", item: it });
      continue;
    }
    if (!projekte.has(it.projekt_id)) {
      order.push(it.projekt_id);
      projekte.set(it.projekt_id, {
        projekt_id: it.projekt_id,
        projekt_name: it.projekt_name,
        projekt_typ: it.projekt_typ,
        bautraeger: it.bautraeger,
        cover_image_url: it.cover_image_url,
        adresse: it.adresse,
        stadt: it.stadt,
        plz: it.plz,
        bundesland: it.bundesland,
        baujahr: it.baujahr,
        einheiten: [],
      });
    }
    projekte.get(it.projekt_id)!.einheiten.push(it);
  }

  return [
    ...order.map<GridEntry>((id) => ({ kind: "projekt", data: projekte.get(id)! })),
    ...singles,
  ];
}

function countProjects(items: ObjektListItem[]): number {
  const ids = new Set<string>();
  let singles = 0;
  for (const it of items) {
    if (it.projekt_typ === "etw_einzeln") singles++;
    else ids.add(it.projekt_id);
  }
  return ids.size + singles;
}
