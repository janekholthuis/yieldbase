"use client";

// PROJ-3 — Projektansicht v2, Variante B1 „Klar" (App-Theme-Variante).
// Konsolidiert: Galerie-Hero mit Karte rechts → Zwei-Spalten-Body. Die
// Einheiten-Auswahl (Dropdown ODER Klick in der Kaufpreisliste) treibt Preis,
// Investition UND Kalkulation. EIN gemeinsamer Calc-State (`useEinheitKalkulation`
// in `CalcBody`, gekeyed per Einheit) versorgt sowohl die rechte Investitions-
// Karte (mit den Annahmen-Slidern) ALS AUCH die Diagramme im Kalkulations-Tab —
// ein Slider rechts rechnet die Charts links live neu.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ArrowLeft,
  Heart,
  Share2,
  MoreHorizontal,
  MapPin,
  Mail,
  FileText,
  Presentation,
  Pencil,
  Building2,
  Phone,
  Images,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EinheitDetailView } from "@/components/objekte/EinheitDetailView";
import { FinanziererPoolTab } from "@/components/objekte/FinanziererPoolTab";
import { ImageLightbox } from "@/components/objekte/ImageLightbox";
import { StandortHighlights } from "@/components/objekte/StandortHighlights";
import {
  useEinheitKalkulation,
  type EinheitKalkulation,
  KpiStrip,
  DiagrammePanel,
  CashflowDetailCard,
  RenditenCard,
  AnnahmenPanel,
  InvestitionsSliders,
} from "@/components/objekte/EinheitKalkulationPanel";
import { getEinheitDetailAction } from "@/lib/actions/objekte";
import { useAuth } from "@/lib/auth-context";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddressParts } from "@/lib/mapbox";
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
  EinheitDetail,
  EinheitStatus,
  ObjektListItem,
} from "@/lib/data/objekte";

const TYP_LABEL = {
  mfh: "Mehrfamilienhaus",
  etw_einzeln: "Eigentumswohnung",
} as const;

const PILL =
  "rounded-full px-4 data-[state=active]:bg-brand-accent data-[state=active]:text-white";

// Status dot colours mapped to app tokens (frei = success, reserviert = warning,
// sold = subtle grey, else primary).
function statusDotClass(status: EinheitStatus): string {
  if (status === "frei") return "bg-brand-success";
  if (status === "reserviert" || status === "auf_anfrage") return "bg-brand-warning";
  if (status === "verkauft") return "bg-brand-subtle";
  return "bg-brand-primary";
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
  initialDetail,
}: {
  projekt: ProjektDetail;
  kalkContext: KalkulationsContext;
  initialEinheitId?: string;
  /** Server-pre-loaded detail for the initially selected unit (avoids a client
   *  roundtrip + skeleton hang on first paint). */
  initialDetail?: EinheitDetail | null;
}) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("support");

  const units = projekt.einheiten;
  const adresse = formatAddress(
    projekt.adresse,
    projekt.plz,
    projekt.stadt,
    projekt.bundesland,
  );

  // ---- Selected unit (drives price card, investment AND calculation) -------
  const firstValid = useMemo(() => {
    if (initialEinheitId && units.some((u) => u.einheit_id === initialEinheitId))
      return initialEinheitId;
    return units[0]?.einheit_id ?? null;
  }, [initialEinheitId, units]);

  const [selectedId, setSelectedId] = useState<string | null>(firstValid);

  // Linke Tab-Leiste — standardmäßig die Kalkulation (Wunsch: Kalkulationen
  // direkt offen, nicht erst die Kaufpreisliste).
  const [activeTab, setActiveTab] = useState<string>("kalkulation");

  // Keep the deep-link (?einheit=…) in the URL without a server roundtrip.
  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("einheit", selectedId);
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  // Detail for the selected unit. Seeded from the server-pre-loaded initialDetail
  // so the first paint needs no client fetch; a ref tracks which unit is already
  // loaded so switching units fetches lazily.
  const initialDetailMatches =
    initialDetail != null && initialDetail.einheit_id === selectedId;
  const [detail, setDetail] = useState<EinheitDetail | null>(
    initialDetailMatches ? initialDetail : null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(
    initialDetailMatches ? (initialDetail!.einheit_id as string) : null,
  );

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      loadedIdRef.current = null;
      return;
    }
    if (loadedIdRef.current === selectedId) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    getEinheitDetailAction({ einheitId: selectedId })
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.einheit) {
          setDetailError(res.error ?? "Einheit nicht gefunden");
        } else {
          setDetail(res.einheit);
          loadedIdRef.current = selectedId;
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
    <div className="bg-brand-surfaceMuted text-brand-ink">
      <div className="mx-auto max-w-[1280px] px-3 py-3 sm:px-6 sm:py-6">
        {/* App surface */}
        <div
          id="projekt-top"
          className="overflow-hidden rounded-2xl border border-brand-border bg-card shadow-[var(--shadow-lg)]"
        >
          {/* 1 — Gallery hero (big image + map) */}
          <GalleryHero
            projekt={projekt}
            alt={title}
            docCount={projekt.dokumente.length}
            onShowDetails={() => setActiveTab("details")}
          />

          {/* 2 — Two-column body. Gekeyed per Einheit → frischer Calc-State beim Wechsel. */}
          {detail ? (
            <CalcBody
              key={detail.einheit_id}
              detail={detail}
              kalkContext={kalkContext}
              projekt={projekt}
              units={units}
              isAdmin={isAdmin}
              selectedId={selectedId}
              onSelectUnit={setSelectedId}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              eyebrow={eyebrow}
              title={title}
              adresse={adresse}
            />
          ) : (
            <PlaceholderBody
              loading={detailLoading}
              error={detailError}
              eyebrow={eyebrow}
              title={title}
              adresse={adresse}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Calc body (shared state) ─────────────────────────
// Owns ONE `useEinheitKalkulation` and feeds both the left calculation tab and
// the right investment card. Remounted (via key on the unit) when the selection
// changes, so the calculation resets to the new unit's defaults.
function CalcBody({
  detail,
  kalkContext,
  projekt,
  units,
  isAdmin,
  selectedId,
  onSelectUnit,
  activeTab,
  setActiveTab,
  eyebrow,
  title,
  adresse,
}: {
  detail: EinheitDetail;
  kalkContext: KalkulationsContext;
  projekt: ProjektDetail;
  units: ObjektListItem[];
  isAdmin: boolean;
  selectedId: string | null;
  onSelectUnit: (id: string) => void;
  activeTab: string;
  setActiveTab: (v: string) => void;
  eyebrow: string;
  title: string;
  adresse: string | null;
}) {
  const k = useEinheitKalkulation(detail, kalkContext, false);

  // ---- Aggregates for the big metrics row ---------------------------------
  const prices = units.map((u) => u.kaufpreis).filter((v): v is number => v != null);
  const flaechen = units.map((u) => u.wohnflaeche).filter((v): v is number => v != null);
  const renditen = units
    .map((u) => bruttoRendite(u.kaufpreis, u.miete))
    .filter((v): v is number => v != null);
  const minPrice = prices.length ? Math.min(...prices) : null;

  const statusCounts = new Map<EinheitStatus, number>();
  for (const u of units) statusCounts.set(u.status, (statusCounts.get(u.status) ?? 0) + 1);
  const freiCount = statusCounts.get("frei") ?? 0;

  // Freitext-Lage-Highlights (Feld standort_highlights, KI/manuell). Projektweit:
  // alle Einheiten teilen die Adresse → erster gepflegter Text.
  const lageHighlights = units
    .map((u) => u.standort_highlights)
    .find((h): h is string => !!h && h.trim().length > 0);

  return (
    <div className="flex flex-col gap-7 px-4 pb-8 pt-6 sm:px-7 lg:flex-row">
      {/* LEFT */}
      <div className="min-w-0 flex-1 space-y-7">
        {/* Title block */}
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-accent">
            {eyebrow}
          </div>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[34px]">
            {title}
          </h1>
          {adresse && (
            <div className="mt-3 flex items-center gap-3">
              <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-brand-primaryTint text-brand-primary">
                <MapPin className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-subtle">
                  Adresse
                </div>
                <div className="text-[14px] text-brand-ink">{adresse}</div>
              </div>
            </div>
          )}
        </div>

        {/* Big metrics */}
        <div className="flex flex-wrap gap-x-10 gap-y-5">
          <Metric label="Kaufpreis">
            <span className="inline-block rounded-[7px] bg-brand-accentSoft px-3 py-[3px]">
              <span className="text-[27px] font-semibold leading-none text-brand-ink">
                {minPrice != null ? `ab ${formatEUR(minPrice)}` : "—"}
              </span>
            </span>
          </Metric>
          <Metric label="Wohnfläche">
            <span className="text-[27px] font-semibold leading-none">
              {fmtRange(range(flaechen), (n) => formatNumber(n))}
            </span>
            <span className="ml-1 text-[15px] text-brand-subtle">m²</span>
          </Metric>
          <Metric label="Einheiten">
            <span className="text-[27px] font-semibold leading-none">{units.length}</span>
            <span className="ml-1 text-[15px] text-brand-subtle">· {freiCount} frei</span>
          </Metric>
          <Metric label="Bruttorendite">
            <span className="text-[27px] font-semibold leading-none">
              {fmtRange(range(renditen), (n) => formatNumber(n))}
            </span>
            <span className="ml-1 text-[15px] text-brand-subtle">%</span>
          </Metric>
        </div>

        {/* Tab-Leiste: Kaufpreisliste · Lage · Kalkulationen · Wohnungsdetails · Pool */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <TabsList className="h-auto flex-wrap gap-1 rounded-full bg-brand-surfaceMuted p-1">
            {units.length > 1 && (
              <TabsTrigger value="kaufpreisliste" className={PILL}>
                Kaufpreisliste
              </TabsTrigger>
            )}
            <TabsTrigger value="lage" className={PILL}>
              Lage
            </TabsTrigger>
            <TabsTrigger value="kalkulation" className={PILL}>
              Kalkulationen
            </TabsTrigger>
            <TabsTrigger value="details" className={PILL}>
              Wohnungsdetails
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="pool" className={PILL}>
                Finanziererpool
              </TabsTrigger>
            )}
          </TabsList>

          {units.length > 1 && (
            <TabsContent value="kaufpreisliste">
              <KaufpreislisteTab
                units={units}
                selectedId={selectedId}
                onSelect={(id) => {
                  onSelectUnit(id);
                  setActiveTab("kalkulation");
                }}
              />
            </TabsContent>
          )}

          {/* Lage — die Karte (vorher im Hero) */}
          <TabsContent value="lage">
            <div className="space-y-3">
              {adresse && (
                <div className="flex items-center gap-2 text-[13.5px] text-brand-ink">
                  <MapPin className="h-4 w-4 text-brand-primary" /> {adresse}
                </div>
              )}
              <div className="h-[460px] overflow-hidden rounded-[14px] border border-brand-border bg-brand-primaryTint">
                <HeroMap
                  adresse={projekt.adresse}
                  plz={projekt.plz}
                  stadt={projekt.stadt}
                  label={adresse ?? ""}
                />
              </div>
              <StandortHighlights
                adresse={projekt.adresse}
                plz={projekt.plz}
                stadt={projekt.stadt}
              />
              {lageHighlights && (
                <div className="rounded-[14px] border border-brand-border bg-card p-4">
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-subtle">
                    Lage-Highlights
                  </h3>
                  <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-brand-body">
                    {lageHighlights}
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Kalkulationen — volle Breite für die (größeren) Diagramme. Die
              Annahmen-Slider leben jetzt rechts; AfA/KfW bleiben hier ausklappbar. */}
          <TabsContent value="kalkulation" className="space-y-4">
            <KpiStrip k={k} />
            <DiagrammePanel k={k} headline={false} big />
            <div className="grid gap-4 lg:grid-cols-2">
              <CashflowDetailCard r={k.result} />
              <RenditenCard r={k.result} />
            </div>
            <details className="rounded-[14px] border border-brand-border bg-card p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-[13.5px] font-semibold text-brand-ink">
                <SlidersHorizontal className="h-4 w-4 text-brand-primary" />
                Erweiterte Annahmen &amp; Förderung (AfA, KfW, Szenario)
              </summary>
              <div className="mt-4">
                <AnnahmenPanel k={k} />
              </div>
            </details>
          </TabsContent>

          <TabsContent value="details">
            <EinheitDetailView
              key={detail.einheit_id}
              einheit={detail}
              kalkContext={kalkContext}
              embedded
              hideInvestment
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="pool">
              <FinanziererPoolTab projektId={projekt.id} />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* RIGHT — sticky: action/investment card (mit Slidern), advisor below */}
      <aside className="w-full lg:w-[340px] lg:shrink-0">
        <div className="space-y-4 lg:sticky lg:top-5">
          <InvestmentCard
            detail={detail}
            k={k}
            units={units}
            selectedId={selectedId}
            onSelectUnit={onSelectUnit}
          />
          <AdvisorCard />
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── Placeholder body (loading / error) ─────────────────────────
function PlaceholderBody({
  loading,
  error,
  eyebrow,
  title,
  adresse,
}: {
  loading: boolean;
  error: string | null;
  eyebrow: string;
  title: string;
  adresse: string | null;
}) {
  return (
    <div className="flex flex-col gap-7 px-4 pb-8 pt-6 sm:px-7 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-accent">
            {eyebrow}
          </div>
          <h1 className="mt-1.5 text-[30px] font-semibold leading-tight tracking-tight text-brand-ink sm:text-[34px]">
            {title}
          </h1>
          {adresse && <div className="mt-2 text-[14px] text-brand-muted">{adresse}</div>}
        </div>
        {error ? (
          <div className="rounded-[14px] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <Skeleton className="h-6 w-72" />
            <Skeleton className="h-64 w-full" />
          </>
        )}
      </div>
      <aside className="w-full lg:w-[340px] lg:shrink-0">
        <div className="rounded-[14px] border border-brand-border bg-card p-5">
          {loading ? (
            <>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-9 w-40" />
              <Skeleton className="mt-4 h-11 w-full" />
            </>
          ) : (
            <div className="text-[13px] text-brand-muted">
              Wähle eine Einheit, um Preis und Investition zu sehen.
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

// ───────────────────────── Gallery hero ─────────────────────────
function GalleryHero({
  projekt,
  alt,
  docCount,
  onShowDetails,
}: {
  projekt: ProjektDetail;
  alt: string;
  docCount: number;
  onShowDetails: () => void;
}) {
  const bilder = projekt.bilder;
  const lead = bilder[0] ?? null;
  const totalPhotos = bilder.length;
  const stacked = [bilder[1] ?? null, bilder[2] ?? null];
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <div className="relative flex h-[300px] gap-3 p-[18px] sm:h-[360px]">
      <ImageLightbox
        images={bilder}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
      {/* Big image */}
      <div className="relative h-full flex-[1.7] overflow-hidden rounded-[14px] bg-brand-primaryTint">
        {lead ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lead.url}
            alt={lead.alt ?? alt}
            onClick={() => setLightboxIndex(0)}
            className="h-full w-full cursor-zoom-in object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-subtle">
            <Building2 className="h-12 w-12" />
          </div>
        )}

        {/* Overlay chip — documents */}
        <button
          type="button"
          onClick={onShowDetails}
          className="absolute bottom-3 left-3 rounded-[11px] bg-white/95 px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink shadow-[0_2px_10px_rgba(0,0,0,0.16)] hover:bg-white"
        >
          Grundrisse &amp; Dokumente{docCount ? ` (${docCount})` : ""}
        </button>

        {/* Overlay chip — all photos → Lightbox (mobil; Desktop nutzt die Stapel-Fotos) */}
        {totalPhotos > 1 && (
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[11px] bg-black/55 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-black/70 sm:hidden"
          >
            <Images className="h-4 w-4" /> {totalPhotos} Fotos
          </button>
        )}
      </div>

      {/* Right column — two stacked photos (Karte lebt jetzt im Lage-Tab) */}
      <div className="hidden h-full flex-1 flex-col gap-3 sm:flex">
        {stacked.map((b, i) => (
          <div
            key={i}
            className="relative min-h-0 flex-1 overflow-hidden rounded-[14px] bg-brand-primaryTint"
          >
            {b ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.url}
                alt={b.alt ?? alt}
                onClick={() => setLightboxIndex(i + 1)}
                className="h-full w-full cursor-zoom-in object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-brand-subtle">
                <Building2 className="h-8 w-8" />
              </div>
            )}
            {/* „+N Fotos" auf der letzten Kachel → Lightbox */}
            {i === stacked.length - 1 && totalPhotos > 3 && (
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[11px] bg-black/55 px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-black/70"
              >
                <Images className="h-4 w-4" /> +{totalPhotos - 3} Fotos
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Floating round buttons */}
      <Link
        href="/objekte"
        aria-label="Zurück zu Objekte"
        className="absolute left-7 top-7 flex h-[42px] w-[42px] items-center justify-center rounded-full bg-card text-brand-ink shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-colors hover:bg-brand-surfaceMuted"
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
            className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-card text-brand-ink shadow-[0_2px_10px_rgba(0,0,0,0.16)] transition-colors hover:bg-brand-surfaceMuted"
          >
            <Icon className="h-5 w-5" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── Hero map ─────────────────────────
function HeroMap({
  adresse,
  plz,
  stadt,
  label,
}: {
  adresse: string;
  plz: string | null;
  stadt: string | null;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasMapbox()) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const center = await geocodeAddressParts(adresse, plz, stadt);
      if (cancelled || !ref.current) return;
      if (!center) {
        setFailed(true);
        return;
      }
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: ref.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 14.5,
        attributionControl: false,
        cooperativeGestures: true,
        locale: {
          "ScrollZoomBlocker.CtrlMessage": "Strg + Scrollen zum Zoomen",
          "ScrollZoomBlocker.CmdMessage": "⌘ + Scrollen zum Zoomen",
          "TouchPanBlocker.Message": "Mit zwei Fingern bewegen",
        },
      });
      mapRef.current = map;
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#B8893E;" +
        "border:3px solid #ffffff;box-shadow:0 1px 8px rgba(15,23,42,.45);";
      new mapboxgl.Marker({ element: el }).setLngLat(center).addTo(map);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [adresse, plz, stadt]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-subtle">
        <MapPin className="h-8 w-8" />
        <span className="px-4 text-center text-[12px] text-brand-muted">
          {label || "Karte nicht verfügbar"}
        </span>
      </div>
    );
  }
  return <div ref={ref} className="h-full w-full" />;
}

// ───────────────────────── Big metric ─────────────────────────
function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline tabular-nums text-brand-ink">{children}</div>
      <div className="mt-1.5 text-[12.5px] text-brand-subtle">{label}</div>
    </div>
  );
}

// ───────────────────────── Kaufpreisliste tab ─────────────────────────
function KaufpreislisteTab({
  units,
  selectedId,
  onSelect,
}: {
  units: ObjektListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-brand-border bg-card">
      {/* Header row (desktop) */}
      <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1fr_1fr] gap-3 border-b border-brand-borderSoft px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-subtle sm:grid">
        <span>Wohnung</span>
        <span>Status</span>
        <span className="text-right">Fläche</span>
        <span className="text-right">€/m²</span>
        <span className="text-right">Kaufpreis</span>
      </div>
      <ul>
        {units.map((u) => {
          const active = u.einheit_id === selectedId;
          const ppsm = pricePerSqm(u.kaufpreis, u.wohnflaeche);
          return (
            <li key={u.einheit_id}>
              <button
                type="button"
                onClick={() => onSelect(u.einheit_id)}
                aria-pressed={active}
                className={`grid w-full grid-cols-2 gap-x-3 gap-y-1 border-b border-brand-borderSoft px-4 py-3 text-left text-[13.5px] transition-colors last:border-0 hover:bg-brand-surfaceMuted sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_1fr] sm:items-center ${
                  active ? "bg-brand-accentSoft/60" : ""
                }`}
              >
                <span className="flex items-center gap-2 font-semibold text-brand-ink">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${statusDotClass(u.status)}`}
                  />
                  WE {u.wohnungsnummer}
                </span>
                <span className="text-brand-muted">{STATUS_LABELS[u.status]}</span>
                <span className="text-right tabular-nums text-brand-muted">
                  {u.wohnflaeche != null ? `${formatNumber(u.wohnflaeche)} m²` : "—"}
                </span>
                <span className="text-right tabular-nums text-brand-muted">
                  {ppsm != null ? `${formatEUR(Math.round(ppsm))}` : "—"}
                </span>
                <span className="text-right font-semibold tabular-nums text-brand-ink">
                  {u.kaufpreis != null ? formatEUR(u.kaufpreis) : "—"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────────────────────── Investment card (right, mit Slidern) ─────────────────────────
function InvestmentCard({
  detail,
  k,
  units,
  selectedId,
  onSelectUnit,
}: {
  detail: EinheitDetail;
  k: EinheitKalkulation;
  units: ObjektListItem[];
  selectedId: string | null;
  onSelectUnit: (id: string) => void;
}) {
  const e = detail;
  const { result, effective } = k;
  const selectedListItem = units.find((u) => u.einheit_id === selectedId) ?? null;
  const praesentationKundeId = e.zuweisungen.find((z) => z.kunde_id)?.kunde_id;
  const praesentationHref = `/objekte/${e.einheit_id}/praesentation${
    praesentationKundeId ? `/${praesentationKundeId}` : ""
  }`;

  return (
    <div className="space-y-5 rounded-[14px] border border-brand-border bg-card p-5">
      {/* Einheiten-Auswahl — kompakt, direkt über dem Angebotspreis */}
      {units.length > 1 && (
        <div>
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-subtle">
            Einheit
          </div>
          <Select value={selectedId ?? undefined} onValueChange={onSelectUnit}>
            <SelectTrigger className="h-9 w-full gap-2 rounded-[10px] border-brand-border bg-card px-3 text-[13px]">
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
                      WE {u.wohnungsnummer}
                      {u.kaufpreis != null ? ` · ${formatEUR(u.kaufpreis)}` : ""}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Price */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-accent">
          Angebotspreis · WE {e.wohnungsnummer}
        </div>
        <div className="mt-1 text-[36px] font-semibold leading-none tracking-tight text-brand-primary">
          {formatEUR(e.kaufpreis)}
        </div>
        {e.wohnflaeche != null && e.kaufpreis != null && (
          <div className="mt-1 text-[13px] text-brand-subtle">
            {formatEUR(Math.round(e.kaufpreis / e.wohnflaeche))}/m²
          </div>
        )}
      </div>

      {/* CTAs */}
      <div id="projekt-anfragen" className="space-y-2">
        <Button
          asChild
          className="h-auto w-full rounded-[10px] bg-brand-primary py-[13px] text-[14px] font-semibold text-white hover:bg-brand-primaryHover"
        >
          <Link href={praesentationHref}>
            <Mail className="mr-2 h-4 w-4" /> Anfragen
          </Link>
        </Button>
        <button
          type="button"
          className="w-full rounded-[10px] border border-brand-border py-[11px] text-[13px] font-semibold text-brand-ink transition-colors hover:bg-brand-surfaceMuted"
        >
          Preis vorschlagen
        </button>
      </div>

      {/* Small outline actions */}
      <div className="grid grid-cols-3 gap-2">
        <SmallAction href={praesentationHref} icon={FileText} label="Exposé" />
        <SmallAction href={praesentationHref} icon={Presentation} label="Präsentation" />
        <SmallAction href={`/objekte/${e.einheit_id}`} icon={Pencil} label="Bearbeiten" />
      </div>

      {/* Ihre Investition — jetzt mit Annahmen-Slidern */}
      <div className="border-t border-brand-borderSoft pt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-subtle">
          Ihre Investition
        </div>
        <div className="mt-3 rounded-[11px] border border-brand-border bg-brand-primaryTint p-3">
          <div className="text-[12px] text-brand-muted">Eigenkapital (gesamt)</div>
          <div className="text-[23px] font-semibold leading-tight text-brand-primary">
            {formatEUR(Math.round(result.ekTatsaechlich))}
          </div>
        </div>

        {/* Slider mit Annahmen */}
        <div className="mt-4">
          <InvestitionsSliders k={k} />
        </div>

        <dl className="mt-4 border-t border-brand-borderSoft pt-3">
          <InvRow label="Gesamtkosten" value={formatEUR(Math.round(result.gesamtkosten))} />
          <InvRow label="Fremdkapital" value={formatEUR(Math.round(result.darlehen))} />
          <InvRow label="Kreditzins" value={`${effective.zins.toFixed(2)} %`} />
          <InvRow
            label="Cashflow n. St."
            value={`${formatEUR(Math.round(result.cashflowNachSteuerMonat))}/Mon`}
            cashflow={result.cashflowNachSteuerMonat >= 0}
          />
        </dl>
      </div>
    </div>
  );
}

// ───────────────────────── Advisor card ─────────────────────────
function AdvisorCard() {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-brand-border bg-card p-4">
      <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-brand-primaryTint text-brand-primary">
        <Building2 className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-subtle">
          Ihr Berater
        </div>
        <div className="truncate text-[14px] font-semibold text-brand-ink">
          Ihr Vertriebspartner
        </div>
        <a
          href="#projekt-anfragen"
          className="mt-0.5 flex items-center gap-1 text-[13px] font-semibold text-brand-primary hover:underline"
        >
          <Phone className="h-3.5 w-3.5" /> Kontakt aufnehmen
        </a>
      </div>
    </div>
  );
}

function SmallAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-[8px] border border-brand-border py-2 text-[11px] font-semibold text-brand-ink transition-colors hover:bg-brand-surfaceMuted"
    >
      <Icon className="h-4 w-4 text-brand-primary" />
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
      <dt className="text-brand-muted">{label}</dt>
      <dd
        className={`text-right font-semibold tabular-nums ${
          cashflow ? "text-brand-success" : "text-brand-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
