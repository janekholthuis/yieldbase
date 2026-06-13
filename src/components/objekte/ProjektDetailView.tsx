import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Ruler,
  DoorClosed,
  Percent,
  CalendarDays,
  Layers,
  Euro,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjektGalerie } from "@/components/objekte/ProjektGalerie";
import { ProjektTabs } from "@/components/objekte/ProjektTabs";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import {
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
/** Brutto-Mietrendite aus Kaltmiete & Kaufpreis (Projekt-Wert fehlt nach Sync). */
function bruttoRendite(kp: number | null, miete: number | null): number | null {
  if (!kp || !miete || kp <= 0) return null;
  return ((miete * 12) / kp) * 100;
}

export function ProjektDetailView({
  projekt,
  kalkContext,
  initialEinheitId,
}: {
  projekt: ProjektDetail;
  kalkContext: KalkulationsContext;
  initialEinheitId?: string;
}) {
  const units = projekt.einheiten;
  const prices = units.map((u) => u.kaufpreis).filter((v): v is number => v != null);
  const flaechen = units.map((u) => u.wohnflaeche).filter((v): v is number => v != null);
  const zimmer = units.map((u) => u.zimmer).filter((v): v is number => v != null);
  const renditen = units
    .map((u) => bruttoRendite(u.kaufpreis, u.miete))
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

      {/* Hero: Galerie + Zusammenfassung */}
      <div className="grid items-start gap-5 lg:grid-cols-[1fr_minmax(0,360px)]">
        <ProjektGalerie
          bilder={projekt.bilder}
          alt={projekt.name ?? adresse ?? "Projekt"}
        />
        <div className="rounded-2xl border bg-card p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {TYP_LABEL[projekt.projekt_typ]}
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {projekt.name ?? adresse ?? "Projekt"}
          </h1>
          {adresse && (
            <div className="mt-1.5 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {adresse}
            </div>
          )}
          <div className="mt-4 border-t pt-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Kaufpreis
            </div>
            <div className="text-2xl font-bold text-foreground md:text-3xl">
              {fmtRange(range(prices), (n) => formatEUR(n))}
            </div>
          </div>
        </div>
      </div>

      {/* Kennzahlen-Karten */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          icon={<Layers className="h-4 w-4" />}
          label="Einheiten"
          value={`${units.length}`}
          sub={`${freiCount} frei`}
        />
        <StatCard
          icon={<Ruler className="h-4 w-4" />}
          label="Wohnfläche"
          value={fmtRange(range(flaechen), (n) => formatNumber(n))}
          sub="m²"
        />
        <StatCard
          icon={<DoorClosed className="h-4 w-4" />}
          label="Zimmer"
          value={fmtRange(range(zimmer), (n) => formatNumber(n))}
        />
        <StatCard
          icon={<Percent className="h-4 w-4" />}
          label="Bruttorendite"
          value={fmtRange(range(renditen), (n) => formatNumber(n))}
          sub="%"
          accent
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4" />}
          label="Baujahr"
          value={projekt.baujahr ? `${projekt.baujahr}` : "—"}
        />
        <StatCard
          icon={<Euro className="h-4 w-4" />}
          label="€ / m²"
          value={fmtRange(
            range(
              units
                .map((u) => pricePerSqm(u.kaufpreis, u.wohnflaeche))
                .filter((v): v is number => v != null)
                .map((v) => Math.round(v)),
            ),
            (n) => formatEUR(n),
          )}
        />
      </div>

      {/* Konsolidierte Tabs: Einheiten (Master-Detail) · Lage · Admin */}
      <ProjektTabs
        projekt={projekt}
        kalkContext={kalkContext}
        initialEinheitId={initialEinheitId}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? "border-brand-accent/40 bg-brand-accent/5" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={accent ? "text-brand-accent" : "text-muted-foreground"}>
          {icon}
        </span>
        {label}
      </div>
      <div
        className={`mt-1 text-base font-semibold tabular-nums ${
          accent ? "text-brand-accent" : "text-foreground"
        }`}
      >
        {value}
        {sub && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
