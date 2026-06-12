import Link from "next/link";
import { ArrowLeft, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerkaufsstatusTabelle } from "@/components/objekte/VerkaufsstatusTabelle";
import { ProjektKalkulation } from "@/components/objekte/ProjektKalkulation";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatEUR,
  formatNumber,
  formatAddress,
  pricePerSqm,
} from "@/lib/objekt-format";
import type { ProjektDetail } from "@/lib/data/objekte";

const TYP_LABEL = { mfh: "Mehrfamilienhaus", etw_einzeln: "Eigentumswohnung" } as const;

function range(values: number[]): [number, number] | null {
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}
function fmtRange(r: [number, number] | null, fmt: (n: number) => string): string {
  if (!r) return "—";
  return r[0] === r[1] ? fmt(r[0]) : `${fmt(r[0])} – ${fmt(r[1])}`;
}

export function ProjektDetailView({
  projekt,
  kalkContext,
}: {
  projekt: ProjektDetail;
  kalkContext: KalkulationsContext;
}) {
  const units = projekt.einheiten;
  const prices = units.map((u) => u.kaufpreis).filter((v): v is number => v != null);
  const flaechen = units.map((u) => u.wohnflaeche).filter((v): v is number => v != null);
  const zimmer = units.map((u) => u.zimmer).filter((v): v is number => v != null);
  const renditen = units
    .map((u) => u.mietrendite_brutto)
    .filter((v): v is number => v != null);

  const freiCount = units.filter((u) => u.status === "frei").length;
  const adresse = formatAddress(projekt.adresse, projekt.plz, projekt.stadt, projekt.bundesland);

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/objekte">
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück zu Objekte
        </Link>
      </Button>

      {/* Header */}
      <Card className="overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[minmax(0,360px)_1fr]">
          <div className="relative h-56 w-full bg-muted md:h-full">
            {projekt.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={projekt.cover_image_url}
                alt={projekt.name ?? "Projekt"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Building2 className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="space-y-4 p-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {TYP_LABEL[projekt.projekt_typ]}
              </div>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                {projekt.name ?? adresse ?? "Projekt"}
              </h1>
              {adresse && (
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  {adresse}
                </div>
              )}
            </div>

            <div className="text-2xl font-bold">
              {fmtRange(range(prices), (n) => formatEUR(n))}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Metric label="Einheiten" value={`${units.length}`} sub={`${freiCount} frei`} />
              <Metric
                label="Zimmer"
                value={fmtRange(range(zimmer), (n) => formatNumber(n))}
              />
              <Metric label="Baujahr" value={projekt.baujahr ? `${projekt.baujahr}` : "—"} />
              <Metric
                label="Größe"
                value={fmtRange(range(flaechen), (n) => formatNumber(n))}
                unit="m²"
              />
              <Metric
                label="Bruttorendite"
                value={fmtRange(range(renditen), (n) => formatNumber(n))}
                unit="%"
              />
              {projekt.bautraeger && (
                <Metric label="Bauträger" value={projekt.bautraeger} />
              )}
            </dl>
          </div>
        </div>
      </Card>

      {/* Verkaufsstatus + Kaufpreisliste */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Verkaufsstatus</h2>
          <VerkaufsstatusTabelle einheiten={units} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Kaufpreisliste
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {units.length} {units.length === 1 ? "Einheit" : "Einheiten"}
            </span>
          </h2>
          {units.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Noch keine Einheiten in diesem Projekt.
            </div>
          ) : (
            <div className="rounded-lg border bg-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Wohnung</TableHead>
                    <TableHead className="text-right">Etage</TableHead>
                    <TableHead className="text-right">Zimmer</TableHead>
                    <TableHead className="text-right">Fläche</TableHead>
                    <TableHead className="text-right">Kaufpreis</TableHead>
                    <TableHead className="text-right">€/m²</TableHead>
                    <TableHead className="text-right">Rendite</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => {
                    const ppsm = pricePerSqm(u.kaufpreis, u.wohnflaeche);
                    return (
                      <TableRow key={u.einheit_id} className="cursor-pointer">
                        <TableCell className="font-medium">
                          <Link
                            href={`/objekte/${u.einheit_id}`}
                            className="hover:underline"
                          >
                            {u.wohnungsnummer}
                          </Link>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {u.etage != null ? u.etage : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(u.zimmer)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(u.wohnflaeche, " m²")}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatEUR(u.kaufpreis)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {ppsm != null ? formatEUR(Math.round(ppsm)) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatNumber(u.mietrendite_brutto, " %")}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[u.status]}`}
                          >
                            {STATUS_LABELS[u.status]}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </div>

      {/* Kalkulation für eine gewählte Wohneinheit */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Kalkulation</h2>
          <p className="text-sm text-muted-foreground">
            Wähle eine Wohneinheit und rechne direkt — Annahmen anpassbar.
          </p>
        </div>
        <ProjektKalkulation einheiten={units} kalkContext={kalkContext} />
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{unit}</span>}
      </dd>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
