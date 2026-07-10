import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ProjektAggregat } from "@/lib/data/objekte";
import { formatEUR, formatNumber } from "@/lib/objekt-format";
import { Building2, MapPin, Maximize, BedDouble, type LucideIcon } from "lucide-react";

export interface ProjektCardData {
  projekt_id: string;
  projekt_name: string | null;
  projekt_typ: "mfh" | "etw_einzeln";
  cover_image_url: string | null;
  adresse: string | null;
  stadt: string | null;
  plz: string | null;
  bundesland: string | null;
  baujahr: number | null;
  aggregat: ProjektAggregat;
  highlights?: string[];
  isNew?: boolean;
}

function fmtRange(
  lo: number | null,
  hi: number | null,
  fmt: (n: number) => string,
): string {
  if (lo == null && hi == null) return "—";
  const a = lo ?? hi!;
  const b = hi ?? lo!;
  return a === b ? fmt(a) : `${fmt(a)} – ${fmt(b)}`;
}

export function ProjektCard({ data }: { data: ProjektCardData }) {
  const agg = data.aggregat;

  const lage =
    [data.plz, data.stadt].filter(Boolean).join(" ") || data.adresse || "—";

  // Headline-Preis: "ab X" bei Spanne, sonst exakt (Referenz zeigt eine Zahl).
  const lo = agg.kaufpreis_min;
  const hi = agg.kaufpreis_max;
  const priceLabel =
    lo == null && hi == null
      ? "Auf Anfrage"
      : lo != null && hi != null && lo !== hi
        ? `ab ${formatEUR(lo)}`
        : formatEUR((lo ?? hi)!);

  const href = `/objekte/projekt/${data.projekt_id}`;

  return (
    <Link href={href} prefetch={false} className="group block focus:outline-none">
      <Card className="flex h-full flex-col overflow-hidden transition-all duration-ds-short ease-ds-out group-hover:-translate-y-0.5 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
        {/* Cover */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {data.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.cover_image_url}
              alt={data.projekt_name ?? "Projekt"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Building2 className="h-10 w-10" />
            </div>
          )}
          {data.isNew && (
            <span className="absolute left-3 top-3 rounded bg-primary px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-sm">
              Neu
            </span>
          )}
          <span className="absolute right-3 top-3 rounded bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm">
            {agg.count} {agg.count === 1 ? "Einheit" : "Einheiten"}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 truncate font-display text-base font-semibold leading-tight text-foreground">
              {data.projekt_name ?? "Projekt"}
            </h3>
            <div className="shrink-0 font-display text-base font-semibold tabular-nums text-foreground">
              {priceLabel}
            </div>
          </div>

          <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{lage}</span>
          </div>

          {/* Spec-Chips (Referenz-Stil) */}
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Spec
              icon={Maximize}
              value={`${fmtRange(agg.wohnflaeche_min, agg.wohnflaeche_max, (n) => formatNumber(n))} m²`}
            />
            {(agg.zimmer_min != null || agg.zimmer_max != null) && (
              <Spec
                icon={BedDouble}
                value={`${fmtRange(agg.zimmer_min, agg.zimmer_max, (n) => formatNumber(n))} Zi.`}
              />
            )}
            {(agg.ppsm_min != null || agg.ppsm_max != null) && (
              <Spec
                icon={Building2}
                value={`${fmtRange(agg.ppsm_min, agg.ppsm_max, (n) => formatEUR(Math.round(n)))} / m²`}
              />
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Spec({ icon: Icon, value }: { icon: LucideIcon; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border bg-background px-2 py-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="tabular-nums">{value}</span>
    </span>
  );
}
