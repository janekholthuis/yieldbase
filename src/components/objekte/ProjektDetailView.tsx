"use client";

// PROJ-3 — Projektansicht v2, Variante B1 „Klar".
// Single scrollable view: editorial gallery hero → two-column body
// (title block + big metrics + chip row + unit selector + Verkaufsstatus +
// wealth chart + Objektdaten on the left; sticky action/investment/advisor
// card on the right). The deeper functionality (Lage map, Bankdaten,
// Finanzierer-Pool, full unit edit/docs) stays available below a divider via
// ProjektTabs — no feature is dropped.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Heart,
  Share2,
  MoreHorizontal,
  MapPin,
  ChevronDown,
  Mail,
  FileText,
  Presentation,
  Pencil,
  Building2,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjektTabs } from "@/components/objekte/ProjektTabs";
import {
  useEinheitKalkulation,
  DiagrammePanel,
} from "@/components/objekte/EinheitKalkulationPanel";
import { getEinheitDetailAction } from "@/lib/actions/objekte";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import {
  formatEUR,
  formatNumber,
  formatAddress,
  pricePerSqm,
  STATUS_LABELS,
} from "@/lib/objekt-format";
import type {
  ProjektDetail,
  ObjektListItem,
  EinheitDetail,
  EinheitStatus,
} from "@/lib/data/objekte";

const SERIF = "font-[family-name:var(--font-spectral)]";

const TYP_LABEL = {
  mfh: "Mehrfamilienhaus",
  etw_einzeln: "Eigentumswohnung",
} as const;

const ZUSTAND_LABEL: Record<string, string> = {
  bestand: "Bestand",
  neubau: "Neubau",
};

const ENERGIE_LABEL = "Energieklasse";

// Status dot colours per the B1 spec (frei = green, reserviert = amber, sold = grey).
function statusDotClass(status: EinheitStatus): string {
  if (status === "frei") return "bg-[#3f8f63]";
  if (status === "reserviert" || status === "auf_anfrage") return "bg-[#b9852a]";
  if (status === "verkauft") return "bg-[#9aa0a8]";
  return "bg-[#1f3a5f]";
}

function range(values: number[]): [number, number] | null {
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}
function fmtRange(r: [number, number] | null, fmt: (n: number) => string): string {
  if (!r) return "—";
  return r[0] === r[1] ? fmt(r[0]) : `${fmt(r[0])} – ${fmt(r[1])}`;
}
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
  const adresse = formatAddress(
    projekt.adresse,
    projekt.plz,
    projekt.stadt,
    projekt.bundesland,
  );

  // ---- Aggregates for the big metrics row ---------------------------------
  const prices = units.map((u) => u.kaufpreis).filter((v): v is number => v != null);
  const flaechen = units
    .map((u) => u.wohnflaeche)
    .filter((v): v is number => v != null);
  const renditen = units
    .map((u) => bruttoRendite(u.kaufpreis, u.miete))
    .filter((v): v is number => v != null);

  const statusCounts = useMemo(() => {
    const map = new Map<EinheitStatus, number>();
    for (const u of units) map.set(u.status, (map.get(u.status) ?? 0) + 1);
    return map;
  }, [units]);
  const freiCount = statusCounts.get("frei") ?? 0;
  const reserviertCount =
    (statusCounts.get("reserviert") ?? 0) + (statusCounts.get("auf_anfrage") ?? 0);

  const minPrice = prices.length ? Math.min(...prices) : null;

  // ---- Selected unit (drives price card, chart, investment, Objektdaten) ---
  const firstValid = useMemo(() => {
    if (initialEinheitId && units.some((u) => u.einheit_id === initialEinheitId))
      return initialEinheitId;
    return units[0]?.einheit_id ?? null;
  }, [initialEinheitId, units]);

  const [selectedId, setSelectedId] = useState<string | null>(firstValid);

  // Keep the deep-link (?einheit=…) in the URL without a server roundtrip.
  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("einheit", selectedId);
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  const selectedListItem = units.find((u) => u.einheit_id === selectedId) ?? null;

  // Lazy-load the full detail for the selected unit (same pattern as ProjektTabs).
  const [detail, setDetail] = useState<EinheitDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getEinheitDetailAction({ einheitId: selectedId })
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.einheit) {
          setDetailError(res.error ?? "Einheit nicht gefunden");
          setDetail(null);
        } else {
          setDetail(res.einheit);
        }
      })
      .catch((err) => {
        if (!cancelled)
          setDetailError(err instanceof Error ? err.message : "Fehler");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const eyebrow =
    units.length > 1
      ? `${TYP_LABEL[projekt.projekt_typ]} · ${units.length} Einheiten`
      : `${TYP_LABEL[projekt.projekt_typ]} · Projekt`;
  const title = projekt.name ?? adresse ?? "Projekt";

  return (
    <div className="bg-[#e7e5df] font-[family-name:var(--font-manrope)] text-[#1d2530]">
      <div className="mx-auto max-w-[1280px] px-3 py-3 sm:px-6 sm:py-6">
        {/* App surface */}
        <div className="overflow-hidden rounded-2xl bg-[#f5f2ec] shadow-[0_34px_80px_-28px_rgba(40,35,25,0.22)]">
          {/* 1 — Gallery hero */}
          <GalleryHero
            projekt={projekt}
            alt={title}
            docCount={projekt.dokumente.length}
          />

          {/* 2 — Two-column body */}
          <div className="flex flex-col gap-7 px-4 pb-8 pt-6 sm:px-7 lg:flex-row">
            {/* LEFT */}
            <div className="min-w-0 flex-1 space-y-7">
              {/* Title block */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a7636]">
                  {eyebrow}
                </div>
                <h1
                  className={`${SERIF} mt-1.5 text-[30px] font-semibold leading-tight tracking-tight text-[#1d2530] sm:text-[34px]`}
                >
                  {title}
                </h1>
                {adresse && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#eef0f4] text-[#1f3a5f]">
                      <MapPin className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
                        Adresse
                      </div>
                      <div className="text-[14px] text-[#1d2530]">{adresse}</div>
                    </div>
                    <a
                      href="#projekt-lage"
                      className="ml-auto shrink-0 text-[13px] font-semibold text-[#1f3a5f] hover:underline"
                    >
                      Auf Karte zeigen
                    </a>
                  </div>
                )}
              </div>

              {/* Big metrics */}
              <div className="flex flex-wrap gap-x-10 gap-y-5">
                <Metric label="Kaufpreis">
                  <span className="inline-block rounded-[7px] bg-[#f0e3c8] px-3 py-[3px]">
                    <span className={`${SERIF} text-[27px] font-semibold leading-none text-[#1d2530]`}>
                      {minPrice != null ? `ab ${formatEUR(minPrice)}` : "—"}
                    </span>
                  </span>
                </Metric>
                <Metric label="Wohnfläche">
                  <span className={`${SERIF} text-[27px] font-semibold leading-none`}>
                    {fmtRange(range(flaechen), (n) => formatNumber(n))}
                  </span>
                  <span className="ml-1 text-[15px] text-[#9aa0a8]">m²</span>
                </Metric>
                <Metric label="Einheiten">
                  <span className={`${SERIF} text-[27px] font-semibold leading-none`}>
                    {units.length}
                  </span>
                  <span className="ml-1 text-[15px] text-[#9aa0a8]">
                    · {freiCount} frei
                  </span>
                </Metric>
                <Metric label="Bruttorendite">
                  <span className={`${SERIF} text-[27px] font-semibold leading-none`}>
                    {fmtRange(range(renditen), (n) => formatNumber(n))}
                  </span>
                  <span className="ml-1 text-[15px] text-[#9aa0a8]">%</span>
                </Metric>
              </div>

              {/* Chip / button row */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  className="rounded-[10px] border border-[#1f3a5f] px-4 py-2 text-[13px] font-semibold text-[#1f3a5f] transition-colors hover:bg-[#1f3a5f]/5"
                >
                  {minPrice != null
                    ? `Ab ${formatEUR(Math.round((minPrice * 0.04) / 12))} mtl. finanzieren`
                    : "Finanzierung anfragen"}
                </button>
                <span className="rounded-[8px] bg-[#eef0f4] px-3 py-2 text-[12.5px] font-semibold text-[#1f3a5f]">
                  Provisionsfrei
                </span>
                <span className="rounded-[8px] bg-[#f0ede5] px-3 py-2 text-[12.5px] font-medium text-[#6c7480]">
                  {projekt.baujahr ? `Baujahr ${projekt.baujahr}` : "Bestand · vermietet"}
                </span>
              </div>

              {/* Einheiten-Auswahl */}
              {units.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#e7e2d6] bg-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#eef0f4] text-[#1f3a5f]">
                      <Building2 className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold leading-tight">
                        {units.length} {units.length === 1 ? "Einheit" : "Einheiten"}
                      </div>
                      <div className="text-[12.5px] text-[#6c7480]">
                        {freiCount} Frei · {reserviertCount} Reserviert
                      </div>
                    </div>
                  </div>

                  <Select
                    value={selectedId ?? undefined}
                    onValueChange={(v) => setSelectedId(v)}
                  >
                    <SelectTrigger className="h-auto min-w-[240px] gap-2 rounded-[10px] border-[#d8d2c4] bg-white px-3 py-2 text-[13px]">
                      <span className="flex items-center gap-2 truncate">
                        {selectedListItem && (
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(selectedListItem.status)}`}
                          />
                        )}
                        <SelectValue placeholder="Wohnung wählen" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.einheit_id} value={u.einheit_id}>
                          <span className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(u.status)}`}
                            />
                            <span>
                              Wohnung WE {u.wohnungsnummer}
                              {u.kaufpreis != null ? ` · ${formatEUR(u.kaufpreis)}` : ""}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Verkaufsstatus bar */}
              {units.length > 1 && (
                <VerkaufsstatusBar
                  total={units.length}
                  frei={freiCount}
                  reserviert={reserviertCount}
                />
              )}

              {/* Wealth chart — reuse useEinheitKalkulation for the selected unit */}
              <div id="projekt-kalkulation">
                {detail ? (
                  <WealthChartCard detail={detail} kalkContext={kalkContext} />
                ) : detailLoading ? (
                  <div className="rounded-[14px] border border-[#e7e2d6] bg-white p-5">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="mt-4 h-64 w-full" />
                  </div>
                ) : detailError ? (
                  <div className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {detailError}
                  </div>
                ) : null}
              </div>

              {/* Objektdaten table */}
              {detail && <ObjektdatenTable detail={detail} />}
            </div>

            {/* RIGHT — sticky action / investment / advisor card */}
            <aside className="w-full lg:w-[340px] lg:shrink-0">
              <div className="lg:sticky lg:top-5">
                <ActionCard
                  detail={detail}
                  loading={detailLoading}
                  kalkContext={kalkContext}
                />
              </div>
            </aside>
          </div>
        </div>

        {/* Divider + full functionality (Lage, Bankdaten, Pool, full unit detail) */}
        <div id="projekt-lage" className="mt-10">
          <div className="mb-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-[#d8d2c4]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
              Verwaltung & Details
            </span>
            <span className="h-px flex-1 bg-[#d8d2c4]" />
          </div>
          <ProjektTabs
            projekt={projekt}
            kalkContext={kalkContext}
            initialEinheitId={selectedId ?? initialEinheitId}
          />
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Gallery hero ─────────────────────────
function GalleryHero({
  projekt,
  alt,
  docCount,
}: {
  projekt: ProjektDetail;
  alt: string;
  docCount: number;
}) {
  const bilder = projekt.bilder;
  const lead = bilder[0] ?? null;
  const right = bilder.slice(1, 3);
  const totalPhotos = bilder.length;

  return (
    <div className="relative flex h-[300px] gap-3 p-[18px] sm:h-[360px]">
      {/* Big image */}
      <div className="relative h-full flex-[1.7] overflow-hidden rounded-[14px] bg-[#eef0f4]">
        {lead ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.url}
            alt={lead.alt ?? alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#9aa0a8]">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {/* Overlay chip — documents */}
        <Link
          href="#projekt-lage"
          className="absolute bottom-3 left-3 rounded-[11px] bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-[#1d2530] shadow-[0_2px_10px_rgba(0,0,0,0.16)] hover:bg-white"
        >
          Grundrisse &amp; Dokumente{docCount ? ` (${docCount})` : ""}
        </Link>
      </div>

      {/* Right column — two stacked images */}
      <div className="hidden h-full flex-1 flex-col gap-3 sm:flex">
        {[0, 1].map((i) => {
          const b = right[i];
          const isLast = i === 1;
          return (
            <div
              key={i}
              className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-[#eef0f4]"
            >
              {b ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.url}
                  alt={b.alt ?? alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#9aa0a8]">
                  <Building2 className="h-8 w-8" />
                </div>
              )}
              {isLast && totalPhotos > 3 && (
                <span className="absolute bottom-2 right-2 rounded-[8px] bg-black/55 px-2.5 py-1 text-[12px] font-semibold text-white">
                  +{totalPhotos - 3} Fotos
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating round buttons */}
      <Link
        href="/objekte"
        aria-label="Zurück zu Objekte"
        className="absolute left-7 top-7 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#1d2530] shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-colors hover:bg-[#f5f2ec]"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="absolute right-7 top-7 flex gap-2">
        {[
          { icon: Heart, label: "Merken" },
          { icon: Share2, label: "Teilen" },
          { icon: MoreHorizontal, label: "Mehr" },
        ].map(({ icon: Icon, label }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white text-[#1d2530] shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-colors hover:bg-[#f5f2ec]"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Big metric ─────────────────────────
function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline tabular-nums text-[#1d2530]">{children}</div>
      <div className="mt-1.5 text-[12.5px] text-[#9aa0a8]">{label}</div>
    </div>
  );
}

// ───────────────────────── Verkaufsstatus bar ─────────────────────────
function VerkaufsstatusBar({
  total,
  frei,
  reserviert,
}: {
  total: number;
  frei: number;
  reserviert: number;
}) {
  const freiPct = total ? (frei / total) * 100 : 0;
  const resPct = total ? (reserviert / total) * 100 : 0;
  return (
    <div className="rounded-[14px] border border-[#e7e2d6] bg-white p-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
        Verkaufsstatus
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-[5px] bg-[#ece8de]">
        <div className="h-full bg-[#3f8f63]" style={{ width: `${freiPct}%` }} />
        <div className="h-full bg-[#b9852a]" style={{ width: `${resPct}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-[#6c7480]">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#3f8f63]" /> {frei} Frei
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#b9852a]" /> {reserviert} Reserviert
        </span>
      </div>
    </div>
  );
}

// ───────────────────────── Wealth chart card ─────────────────────────
// Reuses the shared calculation hook + DiagrammePanel (same SVG the README
// describes) so the chart is never re-implemented.
function WealthChartCard({
  detail,
  kalkContext,
}: {
  detail: EinheitDetail;
  kalkContext: KalkulationsContext;
}) {
  const k = useEinheitKalkulation(detail, kalkContext, true);
  return (
    <div className="rounded-[14px] border border-[#e7e2d6] bg-white p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
        Vermögensentwicklung
      </div>
      <div className="mt-4">
        <DiagrammePanel k={k} />
      </div>
    </div>
  );
}

// ───────────────────────── Objektdaten table ─────────────────────────
function ObjektdatenTable({ detail }: { detail: EinheitDetail }) {
  const e = detail;
  const ppsm = pricePerSqm(e.kaufpreis, e.wohnflaeche);
  const rows: Array<[string, string | null]> = [
    ["Objektart", TYP_LABEL[e.projekt_typ]],
    ["Wohnfläche", e.wohnflaeche != null ? formatNumber(e.wohnflaeche, " m²") : null],
    [
      "Zimmer · Etage",
      e.zimmer != null
        ? `${formatNumber(e.zimmer)}${e.etage != null ? ` · ${e.etage}. Etage` : ""}`
        : e.etage != null
          ? `${e.etage}. Etage`
          : null,
    ],
    ["Kaltmiete (mtl.)", e.miete != null ? formatEUR(e.miete) : null],
    ["Preis je m²", ppsm != null ? `${formatEUR(Math.round(ppsm))}/m²` : null],
    ["Baujahr", e.baujahr != null ? String(e.baujahr) : null],
    [
      "Zustand",
      e.objektzustand ? (ZUSTAND_LABEL[e.objektzustand] ?? e.objektzustand) : null,
    ],
    [ENERGIE_LABEL, e.energieklasse],
    ["Heizung", e.heizungsart],
    ["Status", STATUS_LABELS[e.status]],
  ];
  const visible = rows.filter(([, v]) => v != null && v !== "");

  return (
    <div className="rounded-[14px] border border-[#e7e2d6] bg-white px-5 pb-2 pt-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
        Objektdaten · WE {e.wohnungsnummer}
      </div>
      <dl className="mt-1">
        {visible.map(([label, value], i) => (
          <div
            key={label}
            className={`flex items-center justify-between gap-4 py-3 text-[14px] ${
              i < visible.length - 1 ? "border-b border-[#f0ede5]" : ""
            }`}
          >
            <dt className="text-[#6c7480]">{label}</dt>
            <dd className="text-right font-semibold text-[#1d2530]">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ───────────────────────── Action / investment / advisor card ─────────────────────────
function ActionCard({
  detail,
  loading,
  kalkContext,
}: {
  detail: EinheitDetail | null;
  loading: boolean;
  kalkContext: KalkulationsContext;
}) {
  if (!detail) {
    return (
      <div className="rounded-[14px] border border-[#e7e2d6] bg-white p-5">
        {loading ? (
          <>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-9 w-40" />
            <Skeleton className="mt-4 h-11 w-full" />
            <Skeleton className="mt-2 h-10 w-full" />
          </>
        ) : (
          <div className="text-[13px] text-[#6c7480]">
            Wähle eine Einheit, um Preis und Investition zu sehen.
          </div>
        )}
      </div>
    );
  }
  return <InnerActionCard detail={detail} kalkContext={kalkContext} />;
}

function InnerActionCard({
  detail,
  kalkContext,
}: {
  detail: EinheitDetail;
  kalkContext: KalkulationsContext;
}) {
  const e = detail;
  const k = useEinheitKalkulation(e, kalkContext, true);
  const { result, effective } = k;
  const praesentationKundeId = e.zuweisungen.find((z) => z.kunde_id)?.kunde_id;
  const praesentationHref = `/objekte/${e.einheit_id}/praesentation${
    praesentationKundeId ? `/${praesentationKundeId}` : ""
  }`;

  return (
    <div className="space-y-5 rounded-[14px] border border-[#e7e2d6] bg-white p-5">
      {/* Price */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a7636]">
          Angebotspreis · WE {e.wohnungsnummer}
        </div>
        <div className={`${SERIF} mt-1 text-[36px] font-semibold leading-none text-[#1f3a5f]`}>
          {formatEUR(e.kaufpreis)}
        </div>
        {e.wohnflaeche != null && e.kaufpreis != null && (
          <div className="mt-1 text-[13px] text-[#9aa0a8]">
            {formatEUR(Math.round(e.kaufpreis / e.wohnflaeche))}/m²
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="space-y-2">
        <Button
          asChild
          className="h-auto w-full rounded-[10px] bg-[#1f3a5f] py-[13px] text-[14px] font-semibold text-white hover:bg-[#1a3252]"
        >
          <Link href={praesentationHref}>
            <Mail className="mr-2 h-4 w-4" /> Anfragen
          </Link>
        </Button>
        <button
          type="button"
          className="w-full rounded-[10px] border border-[#d8d2c4] py-[11px] text-[13px] font-semibold text-[#1d2530] transition-colors hover:bg-[#f5f2ec]"
        >
          Preis vorschlagen
        </button>
      </div>

      {/* Small outline actions */}
      <div className="grid grid-cols-3 gap-2">
        <SmallAction asLink href={praesentationHref} icon={FileText} label="Exposé" />
        <SmallAction asLink href={praesentationHref} icon={Presentation} label="Präsentation" />
        <SmallAction asLink href={`/objekte/${e.einheit_id}`} icon={Pencil} label="Bearbeiten" />
      </div>

      {/* Ihre Investition */}
      <div className="border-t border-[#f0ede5] pt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
          Ihre Investition
        </div>
        <div className="mt-3 rounded-[11px] border border-[#dde1ea] bg-[#eef0f4] p-3">
          <div className="text-[12px] text-[#6c7480]">Eigenkapital</div>
          <div className={`${SERIF} text-[23px] font-semibold leading-tight text-[#1f3a5f]`}>
            {formatEUR(Math.round(result.ekTatsaechlich))}
          </div>
        </div>
        <dl className="mt-2">
          <InvRow label="Gesamtkosten" value={formatEUR(Math.round(result.gesamtkosten))} />
          <InvRow label="Fremdkapital" value={formatEUR(Math.round(result.darlehen))} />
          <InvRow label="Kreditzins" value={`${effective.zins.toFixed(2)} %`} />
          <InvRow
            label="Cashflow n. St."
            value={`${formatEUR(Math.round(result.cashflowNachSteuerMonat))}/Mon`}
            cashflow
          />
        </dl>
      </div>

      {/* Advisor */}
      <div className="flex items-center gap-3 border-t border-[#f0ede5] pt-4">
        <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-[#eef0f4] text-[#1f3a5f]">
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9aa0a8]">
            Ihr Berater
          </div>
          <div className="truncate text-[14px] font-semibold text-[#1d2530]">
            Ihr Vertriebspartner
          </div>
          <a
            href="#projekt-lage"
            className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-[#1f3a5f] hover:underline"
          >
            <Phone className="h-3.5 w-3.5" /> Kontakt aufnehmen
          </a>
        </div>
      </div>
    </div>
  );
}

function SmallAction({
  href,
  icon: Icon,
  label,
}: {
  asLink: true;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-[8px] border border-[#d8d2c4] py-2 text-[11px] font-semibold text-[#1d2530] transition-colors hover:bg-[#f5f2ec]"
    >
      <Icon className="h-4 w-4 text-[#1f3a5f]" />
      {label}
    </Link>
  );
}

function InvRow({
  label,
  value,
  cashflow,
}: {
  label: string;
  value: string;
  cashflow?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[13.5px]">
      <dt className="text-[#6c7480]">{label}</dt>
      <dd
        className={`text-right font-semibold tabular-nums ${
          cashflow ? "text-[#3f8f63]" : "text-[#1d2530]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
