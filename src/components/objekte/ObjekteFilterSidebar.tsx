"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { STATUS_LABELS } from "@/lib/objekt-format";
import type { EinheitStatus, ObjektListItem } from "@/lib/data/objekte";
import { cn } from "@/lib/utils";

export type VermietetState = "alle" | "vermietet" | "leer";

export interface ObjekteFilters {
  q: string;
  statuses: EinheitStatus[];
  stadt: string; // "" = alle
  plz: string;
  preisMin: number;
  preisMax: number;
  flaecheMin: number;
  flaecheMax: number;
  zimmer: number[]; // 1,2,3,4 (4 = 4+)
  renditeMin: number;
  vermietet: VermietetState;
  projekte: string[]; // projekt_ids
}

export const DEFAULT_FILTERS: ObjekteFilters = {
  q: "",
  statuses: [],
  stadt: "",
  plz: "",
  preisMin: 100_000,
  preisMax: 1_000_000,
  flaecheMin: 30,
  flaecheMax: 200,
  zimmer: [],
  renditeMin: 0,
  vermietet: "alle",
  projekte: [],
};

const ALL_STATUSES: EinheitStatus[] = [
  "frei",
  "auf_anfrage",
  "reserviert",
  "notarvorbereitung",
  "notartermin",
  "verkauft",
];

interface Props {
  filters: ObjekteFilters;
  onChange: (next: ObjekteFilters) => void;
  items: ObjektListItem[];
}

export function ObjekteFilterSidebar({ filters, onChange, items }: Props) {
  const staedte = useMemo(
    () => unique(items.map((i) => i.stadt).filter(Boolean) as string[]).sort(),
    [items],
  );
  const projekte = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((i) => {
      if (i.projekt_id) m.set(i.projekt_id, i.projekt_name ?? i.projekt_id);
    });
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);

  const set = <K extends keyof ObjekteFilters>(k: K, v: ObjekteFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const toggleStatus = (s: EinheitStatus) =>
    set(
      "statuses",
      filters.statuses.includes(s)
        ? filters.statuses.filter((x) => x !== s)
        : [...filters.statuses, s],
    );

  const toggleZimmer = (z: number) =>
    set(
      "zimmer",
      filters.zimmer.includes(z)
        ? filters.zimmer.filter((x) => x !== z)
        : [...filters.zimmer, z],
    );

  const toggleProjekt = (id: string) =>
    set(
      "projekte",
      filters.projekte.includes(id)
        ? filters.projekte.filter((x) => x !== id)
        : [...filters.projekte, id],
    );

  return (
    <aside className="w-full space-y-5 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Filter</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Zurücksetzen
        </Button>
      </div>

      {/* Volltext */}
      <div className="space-y-1.5">
        <Label htmlFor="f-q">Suche</Label>
        <Input
          id="f-q"
          placeholder="Adresse, Wohnung, Stadt, Bauträger…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>

      {/* Status pills */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => {
            const active = filters.statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {STATUS_LABELS[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stadt */}
      <div className="space-y-1.5">
        <Label>Stadt</Label>
        <Select
          value={filters.stadt || "__all"}
          onValueChange={(v) => set("stadt", v === "__all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Alle Städte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Alle Städte</SelectItem>
            {staedte.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* PLZ */}
      <div className="space-y-1.5">
        <Label htmlFor="f-plz">PLZ</Label>
        <Input
          id="f-plz"
          placeholder="z.B. 102"
          value={filters.plz}
          onChange={(e) => set("plz", e.target.value)}
        />
      </div>

      {/* Preis */}
      <RangeBlock
        label="Kaufpreis"
        min={50_000}
        max={2_000_000}
        step={10_000}
        unit="€"
        value={[filters.preisMin, filters.preisMax]}
        onValue={([a, b]) => onChange({ ...filters, preisMin: a, preisMax: b })}
        format={(n) => new Intl.NumberFormat("de-DE").format(n) + " €"}
      />

      {/* Wohnfläche */}
      <RangeBlock
        label="Wohnfläche"
        min={20}
        max={300}
        step={5}
        unit="m²"
        value={[filters.flaecheMin, filters.flaecheMax]}
        onValue={([a, b]) =>
          onChange({ ...filters, flaecheMin: a, flaecheMax: b })
        }
        format={(n) => `${n} m²`}
      />

      {/* Zimmer */}
      <div className="space-y-2">
        <Label>Zimmer</Label>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((z) => {
            const active = filters.zimmer.includes(z);
            return (
              <button
                key={z}
                type="button"
                onClick={() => toggleZimmer(z)}
                className={cn(
                  "min-w-10 rounded-full border px-2.5 py-1 text-xs",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {z === 4 ? "4+" : z}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mietrendite */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Mietrendite ≥</Label>
          <span className="text-xs text-muted-foreground">
            {filters.renditeMin.toFixed(1)} %
          </span>
        </div>
        <Slider
          min={0}
          max={10}
          step={0.1}
          value={[filters.renditeMin]}
          onValueChange={(v) => set("renditeMin", v[0])}
        />
      </div>

      {/* Vermietet */}
      <div className="space-y-2">
        <Label>Vermietung</Label>
        <div className="flex gap-1.5">
          {(["alle", "vermietet", "leer"] as VermietetState[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => set("vermietet", v)}
              className={cn(
                "flex-1 rounded-full border px-2.5 py-1 text-xs capitalize",
                filters.vermietet === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted",
              )}
            >
              {v === "alle" ? "Alle" : v === "vermietet" ? "Vermietet" : "Leer"}
            </button>
          ))}
        </div>
      </div>

      {/* Projekt / Bauträger */}
      <div className="space-y-2">
        <Label>Projekt</Label>
        <div className="max-h-44 space-y-1 overflow-auto rounded-md border p-2">
          {projekte.length === 0 ? (
            <p className="text-xs text-muted-foreground">Keine Projekte</p>
          ) : (
            projekte.map(([id, name]) => {
              const active = filters.projekte.includes(id);
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleProjekt(id)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{name}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}

function RangeBlock({
  label,
  min,
  max,
  step,
  value,
  onValue,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: [number, number];
  onValue: (v: [number, number]) => void;
  format: (n: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">
          {format(value[0])} bis {format(value[1])}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onValue([v[0], v[1]] as [number, number])}
      />
    </div>
  );
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

// Active filter chips
export function ActiveFilterChips({
  filters,
  onChange,
  itemsCount,
  totalCount,
  projektNames,
}: {
  filters: ObjekteFilters;
  onChange: (f: ObjekteFilters) => void;
  itemsCount: number;
  totalCount: number;
  projektNames: Record<string, string>;
}) {
  const chips: { label: string; clear: () => void }[] = [];
  const d = DEFAULT_FILTERS;

  if (filters.q)
    chips.push({ label: `"${filters.q}"`, clear: () => onChange({ ...filters, q: "" }) });
  filters.statuses.forEach((s) =>
    chips.push({
      label: STATUS_LABELS[s],
      clear: () =>
        onChange({ ...filters, statuses: filters.statuses.filter((x) => x !== s) }),
    }),
  );
  if (filters.stadt)
    chips.push({
      label: `Stadt: ${filters.stadt}`,
      clear: () => onChange({ ...filters, stadt: "" }),
    });
  if (filters.plz)
    chips.push({
      label: `PLZ: ${filters.plz}`,
      clear: () => onChange({ ...filters, plz: "" }),
    });
  if (filters.preisMin !== d.preisMin || filters.preisMax !== d.preisMax)
    chips.push({
      label: `${(filters.preisMin / 1000).toFixed(0)}k bis ${(filters.preisMax / 1000).toFixed(0)}k €`,
      clear: () =>
        onChange({ ...filters, preisMin: d.preisMin, preisMax: d.preisMax }),
    });
  if (filters.flaecheMin !== d.flaecheMin || filters.flaecheMax !== d.flaecheMax)
    chips.push({
      label: `${filters.flaecheMin} bis ${filters.flaecheMax} m²`,
      clear: () =>
        onChange({
          ...filters,
          flaecheMin: d.flaecheMin,
          flaecheMax: d.flaecheMax,
        }),
    });
  filters.zimmer.forEach((z) =>
    chips.push({
      label: `${z === 4 ? "4+" : z} Zi`,
      clear: () =>
        onChange({ ...filters, zimmer: filters.zimmer.filter((x) => x !== z) }),
    }),
  );
  if (filters.renditeMin > 0)
    chips.push({
      label: `Rendite ≥ ${filters.renditeMin.toFixed(1)}%`,
      clear: () => onChange({ ...filters, renditeMin: 0 }),
    });
  if (filters.vermietet !== "alle")
    chips.push({
      label: filters.vermietet === "vermietet" ? "Vermietet" : "Leer",
      clear: () => onChange({ ...filters, vermietet: "alle" }),
    });
  filters.projekte.forEach((id) =>
    chips.push({
      label: projektNames[id] ?? "Projekt",
      clear: () =>
        onChange({
          ...filters,
          projekte: filters.projekte.filter((x) => x !== id),
        }),
    }),
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">
        {itemsCount} von {totalCount}
      </span>
      {chips.map((c, i) => (
        <button
          key={i}
          onClick={c.clear}
          className="inline-flex items-center gap-1 rounded-full border bg-secondary px-2 py-0.5 text-xs hover:bg-muted"
        >
          {c.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
