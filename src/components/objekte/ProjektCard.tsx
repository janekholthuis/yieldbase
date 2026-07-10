import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ProjektAggregat, EinheitStatus } from "@/lib/data/objekte";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatEUR,
  formatNumber,
} from "@/lib/objekt-format";
import { Building2, MapPin } from "lucide-react";

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
  return a === b ? fmt(a) : `${fmt(a)} bis ${fmt(b)}`;
}

const TYP_LABEL: Record<"mfh" | "etw_einzeln", string> = {
  mfh: "Mehrfamilienhaus",
  etw_einzeln: "Eigentumswohnung",
};

// Status-Reihenfolge für die dezente Verteilungs-Anzeige (verkaufte zuletzt).
const STATUS_ORDER: EinheitStatus[] = [
  "frei",
  "auf_anfrage",
  "reserviert",
  "notarvorbereitung",
  "notartermin",
  "verkauft",
];

export function ProjektCard({ data }: { data: ProjektCardData }) {
  const agg = data.aggregat;
  const baujahr = data.baujahr;

  const adresse =
    data.adresse ??
    [data.stadt, data.plz].filter(Boolean).join(" · ") ??
    "—";
  const stadtZeile = [data.plz, data.stadt].filter(Boolean).join(" ");

  const statusEntries = STATUS_ORDER.map((s) => ({
    status: s,
    count: agg.status_counts?.[s] ?? 0,
  })).filter((e) => e.count > 0);

  const href = `/objekte/projekt/${data.projekt_id}`;

  return (
    <Link href={href} prefetch={false} className="group block focus:outline-none">
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring h-full flex flex-col">
        {/* Cover */}
        <div className="relative h-48 w-full overflow-hidden bg-muted">
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
            <span className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow">
              Neu
            </span>
          )}
          <span className="absolute right-3 top-3 rounded-md bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow">
            {agg.count} {agg.count === 1 ? "Einheit" : "Einheiten"}
          </span>
        </div>

        {/* Preis + Eckdaten */}
        <div className="px-5 pt-5">
          <div className="text-2xl font-bold leading-tight">
            {fmtRange(agg.kaufpreis_min, agg.kaufpreis_max, (n) => formatEUR(n))}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {agg.zimmer_min != null || agg.zimmer_max != null
              ? `${fmtRange(agg.zimmer_min, agg.zimmer_max, (n) => formatNumber(n))} Zimmer`
              : null}
            {(agg.zimmer_min != null || agg.zimmer_max != null) && baujahr ? (
              <span className="mx-1.5">·</span>
            ) : null}
            {baujahr ? `Baujahr ${baujahr}` : null}
            {(agg.zimmer_min != null || agg.zimmer_max != null || baujahr) &&
            (agg.afa_min != null || agg.afa_max != null) ? (
              <span className="mx-1.5">·</span>
            ) : null}
            {agg.afa_min != null || agg.afa_max != null
              ? `AfA ${fmtRange(agg.afa_min, agg.afa_max, (n) => formatNumber(n))} %`
              : null}
          </div>

          {/* Status-Verteilung */}
          {statusEntries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {statusEntries.map((e) => (
                <span
                  key={e.status}
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[e.status]}`}
                >
                  {e.count} {STATUS_LABELS[e.status].toLowerCase()}
                </span>
              ))}
            </div>
          )}

          {/* Highlights */}
          {data.highlights && data.highlights.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.highlights.map((h) => (
                <span
                  key={h}
                  className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Spannen */}
        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 px-5">
          <Metric
            label="Größe"
            value={fmtRange(agg.wohnflaeche_min, agg.wohnflaeche_max, (n) =>
              formatNumber(n),
            )}
            unit="m²"
          />
          <Metric
            label="Kaufpreis"
            value={fmtRange(agg.ppsm_min, agg.ppsm_max, (n) =>
              formatEUR(Math.round(n)),
            )}
            unit="/ m²"
          />
          <Metric
            label="Kaltmiete"
            value={fmtRange(agg.miete_sqm_min, agg.miete_sqm_max, (n) =>
              formatEUR(Math.round(n)),
            )}
            unit="/ m²"
          />
          <Metric label="Anlageklasse" value={TYP_LABEL[data.projekt_typ]} />
        </dl>

        {/* Footer Adresse */}
        <div className="mt-5 flex items-start gap-2 border-t px-5 py-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="text-sm text-muted-foreground leading-snug">
            {data.adresse && <div>{data.adresse}</div>}
            {stadtZeile && <div>{stadtZeile}</div>}
            {!data.adresse && !stadtZeile && <div>{adresse}</div>}
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </dd>
    </div>
  );
}
