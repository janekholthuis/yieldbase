import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ObjektListItem } from "@/lib/data/objekte";
import { formatEUR, formatNumber, pricePerSqm } from "@/lib/objekt-format";
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
  einheiten: ObjektListItem[];
  highlights?: string[];
  isNew?: boolean;
}

function range(values: number[]): [number, number] | null {
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

function fmtRange(
  r: [number, number] | null,
  fmt: (n: number) => string,
): string {
  if (!r) return "—";
  return r[0] === r[1] ? fmt(r[0]) : `${fmt(r[0])} bis ${fmt(r[1])}`;
}

const TYP_LABEL: Record<"mfh" | "etw_einzeln", string> = {
  mfh: "Mehrfamilienhaus",
  etw_einzeln: "Eigentumswohnung",
};

export function ProjektCard({ data }: { data: ProjektCardData }) {
  const units = data.einheiten;
  const prices = units.map((u) => u.kaufpreis).filter((v): v is number => v != null);
  const renditen = units
    .map((u) => u.mietrendite_brutto)
    .filter((v): v is number => v != null);
  const flaechen = units
    .map((u) => u.wohnflaeche)
    .filter((v): v is number => v != null);
  const zimmer = units.map((u) => u.zimmer).filter((v): v is number => v != null);
  const afaWerte = units
    .map((u) => u.afa_satz)
    .filter((v): v is number => v != null);
  const ppsmList = units
    .map((u) => pricePerSqm(u.kaufpreis, u.wohnflaeche))
    .filter((v): v is number => v != null);
  const mietePerSqmList = units
    .map((u) => pricePerSqm(u.miete, u.wohnflaeche))
    .filter((v): v is number => v != null);

  const zimmerRange = range(zimmer);
  const baujahr = data.baujahr;
  const afaR = range(afaWerte);

  const adresse =
    data.adresse ??
    [data.stadt, data.plz].filter(Boolean).join(" · ") ??
    "—";
  const stadtZeile = [data.plz, data.stadt].filter(Boolean).join(" ");

  const href = `/objekte/projekt/${data.projekt_id}`;

  return (
    <Link href={href} className="group block focus:outline-none">
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
        </div>

        {/* Preis + Eckdaten */}
        <div className="px-5 pt-5">
          <div className="text-2xl font-bold leading-tight">
            {fmtRange(range(prices), (n) => formatEUR(n))}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {zimmerRange
              ? `${fmtRange(zimmerRange, (n) => formatNumber(n))} Zimmer`
              : null}
            {zimmerRange && baujahr ? <span className="mx-1.5">|</span> : null}
            {baujahr ? `Baujahr ${baujahr}` : null}
            {(zimmerRange || baujahr) && afaR ? (
              <span className="mx-1.5">|</span>
            ) : null}
            {afaR
              ? `AfA ${fmtRange(afaR, (n) => formatNumber(n))} %`
              : null}
          </div>

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
            value={fmtRange(range(flaechen), (n) => formatNumber(n))}
            unit="m²"
          />
          <Metric
            label="Kaufpreis"
            value={fmtRange(range(ppsmList), (n) =>
              formatEUR(Math.round(n)),
            )}
            unit="/ m²"
          />
          <Metric
            label="Kaltmiete"
            value={fmtRange(range(mietePerSqmList), (n) =>
              formatEUR(Math.round(n)),
            )}
            unit="/ m²"
          />
          <Metric
            label="Bruttorendite"
            value={fmtRange(range(renditen), (n) => formatNumber(n))}
            unit="%"
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
