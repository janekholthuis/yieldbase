"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import {
  useEinheitKalkulation,
  DiagrammePanel,
  KalkulationDetailPanel,
  AnnahmenPanel,
} from "@/components/objekte/EinheitKalkulationPanel";
import { formatEUR, formatNumber, pricePerSqm } from "@/lib/objekt-format";
import type { EinheitDetail } from "@/lib/data/objekte";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";

const ZUSTAND_LABEL: Record<string, string> = {
  bestand: "Bestand",
  neubau: "Neubau",
};
const ANLAGEKLASSE_LABEL: Record<string, string> = {
  mfh: "Mehrfamilienhaus",
  etw_einzeln: "Eigentumswohnung",
};

type PanelTab = "diagramme" | "kalkulation" | "annahmen";

/**
 * Investagon-/Exposé-style investment view: hero gallery + a tabbed analysis
 * panel (Diagramme · Kalkulation · Annahmen) on the left, a sticky investment
 * sidebar on the right. The chart, calculation tables, assumption sliders AND
 * the sidebar figures all read the SAME `useEinheitKalkulation` state, so any
 * slider change updates every surface live.
 */
export function EinheitInvestmentView({
  einheit,
  kalkContext,
  onReserve,
  readOnly = false,
  showGallery = true,
}: {
  einheit: EinheitDetail;
  kalkContext: KalkulationsContext;
  /** Optional "Anfragen"/Reserve handler — falls back to a no-op disabled button. */
  onReserve?: () => void;
  readOnly?: boolean;
  /** Hide the unit hero gallery when the project page already shows one above
   * (avoids the project appearing twice). */
  showGallery?: boolean;
}) {
  const e = einheit;
  const k = useEinheitKalkulation(e, kalkContext, readOnly);
  const [tab, setTab] = useState<PanelTab>("diagramme");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* LEFT — (optional hero) + analysis panel */}
      <div className="min-w-0 space-y-4">
        {showGallery && <HeroGallery einheit={e} />}

        <Card className="p-4">
          <div
            className="inline-flex rounded-lg bg-muted p-1"
            role="tablist"
            aria-label="Analyse"
          >
            <PanelTabButton active={tab === "diagramme"} onClick={() => setTab("diagramme")}>
              Diagramme
            </PanelTabButton>
            <PanelTabButton
              active={tab === "kalkulation"}
              onClick={() => setTab("kalkulation")}
            >
              Kalkulation
            </PanelTabButton>
            <PanelTabButton active={tab === "annahmen"} onClick={() => setTab("annahmen")}>
              Annahmen
            </PanelTabButton>
          </div>

          <div className="mt-4">
            {tab === "diagramme" && <DiagrammePanel k={k} />}
            {tab === "kalkulation" && <KalkulationDetailPanel k={k} />}
            {tab === "annahmen" && <AnnahmenPanel k={k} />}
          </div>
        </Card>
      </div>

      {/* RIGHT — sticky investment sidebar */}
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <InvestmentSidebar einheit={e} k={k} onReserve={onReserve} />
      </aside>
    </div>
  );
}

function PanelTabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

// ──────────────── Hero gallery ────────────────
function HeroGallery({ einheit }: { einheit: EinheitDetail }) {
  const bilder = einheit.bilder ?? [];
  const cover = einheit.cover_image_url ?? bilder[0]?.url ?? null;
  const thumbs = bilder.filter((b) => b.url !== cover).slice(0, 4);
  const [active, setActive] = useState<string | null>(cover);
  const hero = active ?? cover;

  return (
    <div className="space-y-2">
      <div className="aspect-[16/10] w-full overflow-hidden rounded-xl border bg-muted">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 className="h-12 w-12" />
          </div>
        )}
      </div>
      {thumbs.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[cover, ...thumbs.map((t) => t.url)]
            .filter((u): u is string => !!u)
            .slice(0, 5)
            .map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setActive(url)}
                className={`aspect-[4/3] overflow-hidden rounded-lg border transition-opacity ${
                  hero === url ? "ring-2 ring-brand-accent" : "hover:opacity-80"
                }`}
                aria-label="Bild auswählen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

// ──────────────── Investment sidebar ────────────────
function InvestmentSidebar({
  einheit: e,
  k,
  onReserve,
}: {
  einheit: EinheitDetail;
  k: ReturnType<typeof useEinheitKalkulation>;
  onReserve?: () => void;
}) {
  const { result, effective } = k;
  const ppsm = pricePerSqm(e.kaufpreis, e.wohnflaeche);
  const zustand = e.objektzustand
    ? (ZUSTAND_LABEL[e.objektzustand] ?? e.objektzustand)
    : null;
  const anlageklasse = ANLAGEKLASSE_LABEL[e.projekt_typ] ?? null;

  return (
    <Card className="space-y-5 p-5">
      {/* Angebotspreis + CTA */}
      <div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Angebotspreis
        </div>
        <div className="mt-0.5 text-3xl font-bold tracking-tight">
          {formatEUR(e.kaufpreis)}
        </div>
        {ppsm != null && (
          <div className="text-sm text-muted-foreground">
            {formatEUR(Math.round(ppsm))}/m²
          </div>
        )}
        <Button
          type="button"
          className="mt-3 w-full"
          onClick={onReserve}
          disabled={!onReserve}
        >
          Anfragen
        </Button>
      </div>

      <Section title="Beschreibung">
        <Row label="Zimmer" value={formatNumber(e.zimmer)} />
        {e.etage != null && <Row label="Etage" value={String(e.etage)} />}
        <Row label="Wohnfläche" value={formatNumber(e.wohnflaeche, " m²")} />
        {e.baujahr != null && <Row label="Baujahr" value={String(e.baujahr)} />}
        {zustand && <Row label="Sanierung / Zustand" value={zustand} />}
        {anlageklasse && <Row label="Anlageklasse" value={anlageklasse} />}
      </Section>

      <Section title="Details">
        <Row label="Kaltmiete (mtl.)" value={formatEUR(e.miete)} />
        {e.hausgeld_umlagefaehig != null && (
          <Row label="Hausgeld umlagef." value={formatEUR(e.hausgeld_umlagefaehig)} />
        )}
        {e.hausgeld_nicht_umlagefaehig != null && (
          <Row
            label="Hausgeld nicht umlagef."
            value={formatEUR(e.hausgeld_nicht_umlagefaehig)}
          />
        )}
        {e.sondereigentumsverwaltung != null && (
          <Row
            label="Verwaltungskosten"
            value={formatEUR(e.sondereigentumsverwaltung)}
          />
        )}
      </Section>

      <Section title="Investmentinformation">
        <Row label="Kaufpreis" value={formatEUR(e.kaufpreis)} />
        {e.kaufpreis_wohnung != null && (
          <Row label="davon Wohnung" value={formatEUR(e.kaufpreis_wohnung)} muted />
        )}
        {e.kaufpreis_moebel != null && e.kaufpreis_moebel > 0 && (
          <Row label="davon Möbel" value={formatEUR(e.kaufpreis_moebel)} muted />
        )}
        <Row
          label="+ Kaufnebenkosten"
          value={formatEUR(Math.round(result.kaufnebenkosten))}
        />
        <Row
          label="Gesamtkosten"
          value={formatEUR(Math.round(result.gesamtkosten))}
          strong
        />
      </Section>

      <Section title="Ihre Investition">
        <div className="rounded-lg border border-brand-borderSoft bg-brand-accentSoft p-3">
          <div className="text-xs text-muted-foreground">Eigenkapital</div>
          <div className="text-2xl font-bold text-brand-accent">
            {formatEUR(Math.round(result.ekTatsaechlich))}
          </div>
        </div>
        <div className="mt-2">
          <Row label="Fremdkapital" value={formatEUR(Math.round(result.darlehen))} />
          <Row label="Kreditzins" value={`${effective.zins.toFixed(2)} %`} />
          <Row
            label="Cashflow n. Steuern"
            value={`${formatEUR(Math.round(result.cashflowNachSteuerMonat))}/Mon`}
            strong
          />
        </div>
        <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
          Werte aus der Kalkulation — passe Eigenkapital, Zins &amp; Co. im
          Reiter „Annahmen“ an.
        </p>
      </Section>
    </Card>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t pt-4 first:border-0 first:pt-0">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <dl className="space-y-0.5">{children}</dl>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-sm">
      <dt className={muted ? "pl-2 text-muted-foreground" : "text-muted-foreground"}>
        {label}
      </dt>
      <dd
        className={`text-right tabular-nums ${
          strong ? "text-base font-bold" : "font-medium"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
