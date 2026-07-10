"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrandTooltip } from "@/components/charts/BrandTooltip";
import {
  ArrowLeft,
  ArrowRight,
  X,
  MapPin,
  Building2,
  Phone,
  Mail,
  CalendarDays,
  Zap,
  Flame,
  Car,
  Home,
  KeyRound,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { calculate, SZENARIO_KONSERVATIV, type CalcInputs } from "@/lib/kalkulation";
import {
  formatEUR,
  formatNumber,
  formatAddress,
  pricePerSqm,
} from "@/lib/objekt-format";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddressParts } from "@/lib/mapbox";
import { formatDistance } from "@/lib/standort-highlights";
import {
  useStandortHighlights,
  CATEGORY_ICONS,
} from "@/components/objekte/StandortHighlights";
import type { EinheitDetail } from "@/lib/data/objekte";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import type { VPProfile } from "@/lib/data/objekte-extra-types";
import {
  getMyVPProfile,
  getKundePersonalisierung,
  promoteToPraesentationGehalten,
} from "@/lib/actions/objekte";

const TOTAL_SLIDES = 8;

interface KundePerso {
  vorname: string | null;
  nachname: string | null;
  eigenkapital: number | null;
  persoenlicher_steuersatz: number | null;
}

/**
 * Brutto-Mietrendite in %: the stored projekt value if present, otherwise
 * computed from monthly rent & purchase price (the real Investagon sync leaves
 * the stored projekt value null, so without this every unit shows "—").
 */
function bruttoRenditeProzent(einheit: EinheitDetail): number | null {
  if (einheit.mietrendite_brutto != null) return einheit.mietrendite_brutto;
  if (einheit.miete && einheit.kaufpreis && einheit.kaufpreis > 0) {
    return ((einheit.miete * 12) / einheit.kaufpreis) * 100;
  }
  return null;
}

/** Reliable hero image: project cover first, then the first available image. */
function heroImage(einheit: EinheitDetail): string | null {
  return einheit.cover_image_url ?? einheit.bilder?.[0]?.url ?? null;
}

const ZUSTAND_LABEL: Record<string, string> = {
  bestand: "Bestand",
  neubau: "Neubau",
};

/**
 * Geteilte Vermögens-Grafik (helles Theme) — von SlideVermoegen UND der
 * Kalkulations-Slide genutzt. Erwartet die `jahre` aus dem calculate()-Result.
 * Wichtig: ResponsiveContainer mit minWidth/minHeight gehärtet (React #310),
 * der Aufrufer MUSS einen Wrapper mit AUFGELÖSTER fester Höhe liefern.
 */
function VermoegensChart({
  jahre,
  showLegend = true,
}: {
  jahre: { jahr: number; vermoegen: number; restschuld: number; immobilienwert: number }[];
  showLegend?: boolean;
}) {
  const data = jahre.map((j) => ({
    jahr: j.jahr,
    Vermögen: Math.round(j.vermoegen),
    Restschuld: Math.round(j.restschuld),
    Wert: Math.round(j.immobilienwert),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="vmg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#C99B4D" stopOpacity={0.55} />
            <stop offset="95%" stopColor="#C99B4D" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0A2E4F" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0A2E4F" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis
          dataKey="jahr"
          stroke="#E5E7EB"
          tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
          tickFormatter={(v) => `${v}`}
        />
        <YAxis
          stroke="#E5E7EB"
          tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
          tickFormatter={(v) =>
            new Intl.NumberFormat("de-DE", {
              maximumFractionDigits: 0,
            }).format(Math.round(v / 1000)) + "k"
          }
        />
        <Tooltip
          cursor={{ stroke: "#E5E7EB" }}
          content={
            <BrandTooltip
              labelFmt={(l) => `Jahr ${l}`}
              valueFmt={(v) => formatEUR(v)}
            />
          }
        />
        {showLegend && (
          <Legend
            wrapperStyle={{
              color: "#334155",
              fontFamily: "Inter",
              fontSize: 12,
            }}
          />
        )}
        <Area
          type="monotone"
          dataKey="Wert"
          stroke="#0A2E4F"
          fill="url(#wt)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 6, fill: "#0A2E4F" }}
        />
        <Area
          type="monotone"
          dataKey="Restschuld"
          stroke="#64748B"
          fill="transparent"
          strokeWidth={2}
          strokeDasharray="6 4"
          dot={false}
          activeDot={{ r: 6, fill: "#64748B" }}
        />
        <Area
          type="monotone"
          dataKey="Vermögen"
          stroke="#C99B4D"
          fill="url(#vmg)"
          strokeWidth={3}
          dot={{ r: 4, fill: "#C99B4D", stroke: "#C99B4D" }}
          activeDot={{ r: 6, fill: "#C99B4D" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function PraesentationView({
  einheit,
  kalkContext,
  kundeId,
}: {
  einheit: EinheitDetail;
  kalkContext: KalkulationsContext;
  kundeId?: string;
}) {
  const router = useRouter();
  const [slide, setSlide] = useState(0);
  const [vp, setVp] = useState<VPProfile | null>(null);
  const [kunde, setKunde] = useState<KundePerso | null>(null);
  const [loading, setLoading] = useState(true);

  // VP-Branding + (optional) Kunden-Personalisierung laden
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getMyVPProfile(),
      kundeId ? getKundePersonalisierung({ kundeId }) : Promise.resolve(null),
    ])
      .then(([vpData, kData]) => {
        if (cancelled) return;
        setVp(vpData);
        setKunde(kData);
      })
      .catch(() => {
        // Branding ist optional — Slideshow funktioniert auch ohne.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kundeId]);

  const handleClose = async () => {
    if (kundeId) {
      try {
        await promoteToPraesentationGehalten({
          einheitId: einheit.einheit_id,
          kundeId,
        });
      } catch {
        // ignore
      }
    }
    router.push(`/objekte/${einheit.einheit_id}`);
  };

  // Auto-Vollbild beim Start
  useEffect(() => {
    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const req =
      el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
    if (req && !document.fullscreenElement) {
      req().catch(() => {
        // Browser kann Fullscreen ohne User-Geste blockieren — still ignorieren
      });
    }
    return () => {
      const doc = document as Document & {
        webkitExitFullscreen?: () => Promise<void>;
      };
      const exit =
        doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc);
      if (exit && document.fullscreenElement) {
        exit().catch(() => {});
      }
    };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowRight")
        setSlide((s) => Math.min(TOTAL_SLIDES - 1, s + 1));
      if (ev.key === "ArrowLeft") setSlide((s) => Math.max(0, s - 1));
      if (ev.key === "Escape") {
        ev.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kundeId, einheit.einheit_id]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-brand-surfaceMuted text-brand-ink">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-brand-border bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-accent font-display font-bold text-white">
            O
          </div>
          <span className="font-display font-semibold tracking-tight">
            Erfolg mit Immobilien
          </span>
        </div>
        <div className="font-display text-sm text-brand-body">
          {slide + 1} / {TOTAL_SLIDES}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-brand-body hover:bg-brand-surfaceMuted hover:text-brand-ink"
          aria-label="Präsentation schließen"
        >
          <X className="h-5 w-5" />
        </Button>
      </header>

      {/* Slide area */}
      <main className="relative flex-1 overflow-hidden">
        <div key={slide} className="h-full w-full animate-fade-in">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Skeleton className="h-64 w-2/3 bg-brand-border" />
            </div>
          ) : (
            <div className="mx-auto h-full max-w-[1400px] px-6 py-6 md:py-10">
              <SlideRouter
                index={slide}
                einheit={einheit}
                kunde={kunde}
                vp={vp}
                defaults={kalkContext.defaults}
              />
            </div>
          )}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="flex items-center justify-between border-t border-brand-border bg-white px-6 py-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={slide === 0}
          className="text-brand-body hover:bg-brand-surfaceMuted hover:text-brand-ink disabled:opacity-30"
        >
          <ArrowLeft className="h-5 w-5" /> Zurück
        </Button>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === slide
                  ? "w-8 bg-brand-accent"
                  : "w-2 bg-brand-border hover:bg-brand-subtle"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setSlide((s) => Math.min(TOTAL_SLIDES - 1, s + 1))}
          disabled={slide === TOTAL_SLIDES - 1}
          className="text-brand-body hover:bg-brand-surfaceMuted hover:text-brand-ink disabled:opacity-30"
        >
          Weiter <ArrowRight className="h-5 w-5" />
        </Button>
      </footer>
    </div>
  );
}

function SlideRouter(props: {
  index: number;
  einheit: EinheitDetail;
  kunde: KundePerso | null;
  vp: VPProfile | null;
  defaults: KalkulationsContext["defaults"];
}) {
  const { index, einheit, kunde, vp, defaults } = props;
  // Reihenfolge: nach dem Cover führt die Präsentation direkt mit der
  // Kalkulation + Vermögensaufbau (Investment-Story), erst danach die
  // Objekt-/Lage-/Eckdaten-Details. (Kapitalanlage verkauft die Rechnung.)
  switch (index) {
    case 0:
      return <SlideCover einheit={einheit} kunde={kunde} vp={vp} />;
    case 1:
      return (
        <SlideKalkulation einheit={einheit} kunde={kunde} defaults={defaults} />
      );
    case 2:
      return (
        <SlideVermoegen einheit={einheit} kunde={kunde} defaults={defaults} />
      );
    case 3:
      return <SlideUebersicht einheit={einheit} />;
    case 4:
      return <SlideLage einheit={einheit} />;
    case 5:
      return <SlideBilder einheit={einheit} />;
    case 6:
      return <SlideEckdaten einheit={einheit} />;
    case 7:
      return <SlideAbschluss einheit={einheit} />;
    default:
      return null;
  }
}

// ──────────────── Slide 1: Cover ────────────────
function SlideCover({
  einheit,
  kunde,
  vp,
}: {
  einheit: EinheitDetail;
  kunde: KundePerso | null;
  vp: VPProfile | null;
}) {
  const hero = heroImage(einheit);
  const vorname = kunde?.vorname ?? "";
  const begruessung = vorname
    ? `Hey ${vorname}, hier ist deine Wohnung`
    : "Hier ist deine Wohnung";
  const vpName =
    [vp?.vorname, vp?.nachname].filter(Boolean).join(" ") ||
    vp?.name ||
    "Dein Berater";
  const rendite = bruttoRenditeProzent(einheit);
  const facts: { label: string; value: string }[] = [
    { label: "Kaufpreis", value: formatEUR(einheit.kaufpreis) },
    ...(einheit.wohnflaeche != null
      ? [{ label: "Wohnfläche", value: formatNumber(einheit.wohnflaeche, " m²") }]
      : []),
    ...(einheit.zimmer != null
      ? [{ label: "Zimmer", value: formatNumber(einheit.zimmer) }]
      : []),
    ...(rendite != null
      ? [{ label: "Mietrendite", value: formatNumber(rendite, " %") }]
      : []),
  ];
  return (
    <div className="relative h-full overflow-hidden rounded-2xl">
      {hero ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-brand-primaryTint" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-anthrazit via-anthrazit/80 to-anthrazit/25" />
      <div className="relative flex h-full flex-col justify-end p-8 md:p-14 [text-shadow:0_1px_24px_rgba(0,0,0,0.45)]">
        <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white md:text-6xl">
          {begruessung}
        </h1>
        <p className="mt-3 font-display text-lg text-white/85 md:text-2xl">
          {formatAddress(einheit.adresse, einheit.plz, einheit.stadt)}
        </p>
        {/* Kennzahlen-Strip — sofortiger Eindruck */}
        <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-5">
          {facts.map((f) => (
            <div key={f.label}>
              <div className="text-[11px] uppercase tracking-wide text-white/55">
                {f.label}
              </div>
              <div className="font-display text-2xl font-bold text-white md:text-3xl">
                {f.value}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-7 flex items-center gap-3 border-t border-white/15 pt-5">
          {vp?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vp.avatar_url}
              alt=""
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent font-bold text-anthrazit">
              {vpName.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wide text-white/60">
              Dein Berater
            </div>
            <div className="font-display font-semibold">{vpName}</div>
            <div className="flex gap-3 text-xs text-white/70">
              {vp?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {vp.email}
                </span>
              )}
              {vp?.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {vp.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────── Slide 2: Übersicht ────────────────
function SlideUebersicht({ einheit }: { einheit: EinheitDetail }) {
  const hero = heroImage(einheit);
  // Data-driven facts — never claim something that isn't backed by data
  // (a sales document must not state "Vollvermietung" for a vacant unit).
  const facts: { icon: typeof Home; label: string; value: string }[] = [];
  if (einheit.baujahr != null)
    facts.push({ icon: CalendarDays, label: "Baujahr", value: String(einheit.baujahr) });
  if (einheit.objektzustand)
    facts.push({
      icon: Home,
      label: "Zustand",
      value: ZUSTAND_LABEL[einheit.objektzustand] ?? einheit.objektzustand,
    });
  if (einheit.energieklasse)
    facts.push({ icon: Zap, label: "Energieklasse", value: einheit.energieklasse });
  if (einheit.heizungsart)
    facts.push({ icon: Flame, label: "Heizung", value: einheit.heizungsart });
  if (einheit.stellplaetze_anzahl && einheit.stellplaetze_anzahl > 0)
    facts.push({
      icon: Car,
      label: "Stellplatz",
      value:
        einheit.stellplatz_preis != null
          ? formatEUR(einheit.stellplatz_preis)
          : `${einheit.stellplaetze_anzahl}`,
    });
  facts.push({
    icon: KeyRound,
    label: "Vermietung",
    value: einheit.vermietet ? "Vermietet" : "Leerstand",
  });

  return (
    <div className="grid h-full gap-6 md:grid-cols-2">
      <div className="flex flex-col justify-center space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wider text-brand-muted">
            Wohnung
          </div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">
            {einheit.wohnungsnummer}
          </h1>
          <p className="mt-2 text-lg text-brand-body">
            {[einheit.adresse, einheit.stadt].filter(Boolean).join(", ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {einheit.wohnflaeche != null && (
            <Pill>{formatNumber(einheit.wohnflaeche, " m²")}</Pill>
          )}
          {einheit.zimmer != null && (
            <Pill>{formatNumber(einheit.zimmer, " Zi")}</Pill>
          )}
          {einheit.etage != null && <Pill>Etage {einheit.etage}</Pill>}
        </div>
        <div>
          <div className="text-sm uppercase tracking-wider text-brand-muted">
            Kaufpreis
          </div>
          <div className="font-display text-5xl font-bold text-brand-primary md:text-6xl">
            {formatEUR(einheit.kaufpreis)}
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
          {facts.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-primaryTint text-brand-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs text-brand-muted">{f.label}</dt>
                  <dd className="truncate font-display font-semibold text-brand-ink">
                    {f.value}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
      </div>
      <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-primaryTint">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-16 w-16 text-brand-subtle" />
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────── Slide 3: Lage ────────────────
function SlideLage({ einheit }: { einheit: EinheitDetail }) {
  const ref = useRef<HTMLDivElement>(null);
  const { loading, highlights } = useStandortHighlights({
    adresse: einheit.adresse,
    plz: einheit.plz,
    stadt: einheit.stadt,
  });
  useEffect(() => {
    if (!hasMapbox()) return;
    let cancelled = false;
    let map: mapboxgl.Map | null = null;
    (async () => {
      const center = await geocodeAddressParts(
        einheit.adresse,
        einheit.plz,
        einheit.stadt,
      );
      if (cancelled || !ref.current || !center) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map = new mapboxgl.Map({
        container: ref.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 14,
      });
      new mapboxgl.Marker({ color: "#C99B4D" }).setLngLat(center).addTo(map);
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [einheit.adresse, einheit.plz, einheit.stadt]);

  return (
    <div className="grid h-full gap-6 md:grid-cols-3">
      <div className="overflow-hidden rounded-2xl border border-brand-border bg-white md:col-span-2">
        {hasMapbox() ? (
          <div ref={ref} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-brand-subtle">
            <MapPin className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center space-y-5">
        <div>
          <div className="text-sm uppercase tracking-wider text-brand-muted">
            Lage
          </div>
          <h2 className="font-display text-3xl font-bold">
            {einheit.stadt ?? "—"}
          </h2>
          <p className="mt-1 text-brand-body">
            {[einheit.adresse, einheit.plz, einheit.bundesland]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="rounded-xl border border-brand-border bg-white p-4">
          <div className="mb-3 text-xs uppercase tracking-wider text-brand-muted">
            Standort-Highlights
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md bg-brand-border" />
              ))}
            </div>
          ) : highlights.length === 0 ? (
            <p className="text-sm text-brand-muted">
              Für diese Adresse sind keine Standortdaten verfügbar.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {highlights.map((h) => {
                const Icon = CATEGORY_ICONS[h.category];
                return (
                  <li key={h.category} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-[#C99B4D]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-brand-ink">
                        {h.name}
                      </div>
                      <div className="text-xs text-brand-muted">{h.label}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums text-brand-body">
                      {formatDistance(h.distanceMeters)}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {einheit.standort_highlights ? (
          <div className="rounded-xl border border-brand-border bg-white p-4">
            <div className="mb-2 text-xs uppercase tracking-wider text-brand-muted">
              Lageeinschätzung
            </div>
            <p className="text-sm leading-relaxed text-brand-body">
              {einheit.standort_highlights}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ──────────────── Slide 4: Bilder + Grundriss ────────────────
function SlideBilder({ einheit }: { einheit: EinheitDetail }) {
  const bilder = einheit.bilder ?? [];
  // Only call it a "Grundriss" when an image actually is one; otherwise show the
  // lead image as a neutral "Ansicht" — never mislabel a photo as a floor plan.
  const grundriss = bilder.find((b) => /grund/i.test(b.alt ?? ""));
  const lead = grundriss ?? bilder[0];
  const leadLabel = grundriss ? "Grundriss" : "Ansicht";
  const restBilder = bilder.filter((b) => b.id !== lead?.id).slice(0, 6);
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="grid h-full gap-6 md:grid-cols-2">
      <div className="flex flex-col">
        <div className="mb-2 text-sm uppercase tracking-wider text-brand-muted">
          {leadLabel}
        </div>
        <div
          className={`flex-1 overflow-hidden rounded-2xl border border-brand-border ${
            grundriss ? "bg-white" : "bg-brand-primaryTint"
          }`}
        >
          {lead ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lead.url}
              alt={lead.alt ?? leadLabel}
              className={`h-full w-full cursor-zoom-in ${
                grundriss ? "object-contain p-3" : "object-cover"
              }`}
              onClick={() => setLightbox(lead.url)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-brand-subtle">
              Keine Bilder vorhanden
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="mb-2 text-sm uppercase tracking-wider text-brand-muted">
          Eindrücke
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {restBilder.length === 0 ? (
            <div className="col-span-2 flex items-center justify-center rounded-2xl border border-brand-border text-brand-subtle">
              Keine weiteren Bilder
            </div>
          ) : (
            restBilder.map((b) => (
              <button
                key={b.id}
                onClick={() => setLightbox(b.url)}
                className="overflow-hidden rounded-xl border border-brand-border bg-brand-primaryTint"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.url}
                  alt={b.alt ?? ""}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </button>
            ))
          )}
        </div>
      </div>
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-6"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
          <button
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(null)}
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────── Slide 5: Wirtschaftliche Eckdaten ────────────────
function SlideEckdaten({ einheit }: { einheit: EinheitDetail }) {
  const ppsm = pricePerSqm(einheit.kaufpreis, einheit.wohnflaeche);
  const rendite = bruttoRenditeProzent(einheit);
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mb-8">
        <div className="text-sm uppercase tracking-wider text-brand-muted">
          Wirtschaftliche Eckdaten
        </div>
        <h2 className="font-display text-3xl font-bold md:text-4xl">
          Was die Wohnung wirtschaftlich macht
        </h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DataRow label="Kaufpreis" value={formatEUR(einheit.kaufpreis)} />
        <DataRow
          label="€ pro m²"
          value={ppsm != null ? formatEUR(ppsm) : "—"}
        />
        <DataRow label="Kaltmiete (mtl.)" value={formatEUR(einheit.miete)} />
        <DataRow
          label="Mietrendite brutto"
          value={rendite != null ? formatNumber(rendite, " %") : "—"}
          highlight
        />
        <DataRow
          label="Hausgeld umlagef."
          value={formatEUR(einheit.hausgeld_umlagefaehig)}
        />
        <DataRow
          label="Hausgeld nicht umlagef."
          value={formatEUR(einheit.hausgeld_nicht_umlagefaehig)}
        />
        <DataRow
          label="Instandhaltungsrücklage"
          value={formatEUR(einheit.instandhaltungsruecklage)}
        />
        <DataRow
          label="Sondereig.-Verwaltung"
          value={formatEUR(einheit.sondereigentumsverwaltung)}
        />
        {einheit.stellplatz_preis != null && (
          <DataRow
            label="Stellplatzpreis"
            value={formatEUR(einheit.stellplatz_preis)}
          />
        )}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-5 py-4 ${
        highlight
          ? "border-brand-accent/40 bg-brand-accent/10"
          : "border-brand-border bg-white"
      }`}
    >
      <span className="text-brand-body">{label}</span>
      <span
        className={`font-display text-xl font-bold ${
          highlight ? "text-brand-accentText" : "text-brand-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ──────────────── Kalkulation: Initial-Inputs ────────────────
function buildInitialInputs(
  einheit: EinheitDetail,
  kunde: KundePerso | null,
  defaults: KalkulationsContext["defaults"],
): CalcInputs {
  const kp = einheit.kaufpreis ?? 300_000;
  return {
    kaufpreis: kp,
    kaltmieteMonat: einheit.miete ?? Math.round((kp * 0.04) / 12),
    hausgeldNichtUmlagef: einheit.hausgeld_nicht_umlagefaehig ?? 80,
    instandhaltung: einheit.instandhaltungsruecklage ?? 30,
    sondereigVerwaltung: einheit.sondereigentumsverwaltung ?? 25,
    grundstueckswertAnteil: einheit.grundstueckswert_anteil ?? 20,
    ekBetrag:
      kunde?.eigenkapital != null
        ? Math.round(Number(kunde.eigenkapital))
        : Math.round((kp * defaults.ekProzent) / 100),
    kaufnebenkostenProzent: 10,
    kaufnebenkostenFinanziert: false,
    zins: defaults.zins,
    tilgung: defaults.tilgung,
    haltedauerJahre: defaults.haltedauer,
    afaSatz: einheit.afa_satz ?? defaults.afa,
    // Kundenseitige Präsentation: konservatives Szenario als Default
    // (rechtlich die sichere Wahl — keine geschönten Zukunftsannahmen).
    wertsteigerung: SZENARIO_KONSERVATIV.wertsteigerung,
    mietsteigerung: SZENARIO_KONSERVATIV.mietsteigerung,
    inflation: SZENARIO_KONSERVATIV.inflation,
    steuersatz:
      kunde?.persoenlicher_steuersatz != null
        ? Number(kunde.persoenlicher_steuersatz)
        : 35,
    erhaltungsaufwand: einheit.erhaltungsaufwand ?? 0,
  };
}

// ──────────────── Slide 6: Personalisierte Kalkulation ────────────────
function SlideKalkulation({
  einheit,
  kunde,
  defaults,
}: {
  einheit: EinheitDetail;
  kunde: KundePerso | null;
  defaults: KalkulationsContext["defaults"];
}) {
  const initial = useMemo(
    () => buildInitialInputs(einheit, kunde, defaults),
    [einheit, kunde, defaults],
  );
  const [inputs, setInputs] = useState<CalcInputs>(initial);
  const result = useMemo(() => calculate(inputs), [inputs]);

  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) =>
    setInputs((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <div className="text-sm uppercase tracking-wider text-brand-muted">
          Deine Kalkulation
        </div>
        <h2 className="font-display text-2xl font-bold md:text-3xl">
          Wie sich die Wohnung für dich rechnet
        </h2>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <KPI
          label="Cashflow nach Steuern"
          value={`${formatEUR(Math.round(result.cashflowNachSteuerMonat))} / Monat`}
          accent={result.cashflowNachSteuerMonat >= 0}
        />
        <KPI
          label="EK-Rendite p.a."
          value={`${formatNumber(result.ekRenditeProJahr, " %")}`}
          accent
        />
        <KPI
          label={`Vermögen nach ${inputs.haltedauerJahre} J.`}
          value={formatEUR(Math.round(result.endVermoegen))}
        />
        <KPI
          label="Steuerersparnis kumuliert"
          value={formatEUR(Math.round(result.kumulierteSteuerersparnis))}
        />
      </div>

      {/* Slider (links) + live reagierende Vermögens-Grafik (rechts) */}
      <div className="mt-6 grid flex-1 gap-5 lg:grid-cols-[minmax(0,380px)_1fr]">
        <div className="grid content-start gap-5 rounded-2xl border border-brand-border bg-white p-5 sm:grid-cols-2 lg:grid-cols-1">
          <SliderField
            label="Eigenkapital"
            value={inputs.ekBetrag}
            min={0}
            max={Math.max(50_000, Math.round(inputs.kaufpreis * 0.5))}
            step={1000}
            format={(v) => formatEUR(v)}
            onChange={(v) => set("ekBetrag", v)}
          />
          <SliderField
            label="Zins"
            value={inputs.zins}
            min={1}
            max={8}
            step={0.1}
            format={(v) => `${v.toFixed(1)} %`}
            onChange={(v) => set("zins", v)}
          />
          <SliderField
            label="Tilgung"
            value={inputs.tilgung}
            min={0.5}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)} %`}
            onChange={(v) => set("tilgung", v)}
          />
          <SliderField
            label="Haltedauer"
            value={inputs.haltedauerJahre}
            min={5}
            max={30}
            step={1}
            format={(v) => `${v} Jahre`}
            onChange={(v) => set("haltedauerJahre", v)}
          />
          {kunde && (
            <div className="text-xs text-brand-muted sm:col-span-2 lg:col-span-1">
              Steuersatz {inputs.steuersatz}% übernommen aus dem Profil von{" "}
              {kunde.vorname ?? "Kunde"}.
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-brand-border bg-white p-5">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div className="text-xs uppercase tracking-wider text-brand-muted">
              Vermögensentwicklung
            </div>
            <div className="font-display text-sm font-semibold text-brand-body">
              Vermögen nach {inputs.haltedauerJahre} J.{" "}
              <span className="text-brand-primary">
                {formatEUR(Math.round(result.endVermoegen))}
              </span>
            </div>
          </div>
          <div className="h-[38vh] min-h-[260px] w-full">
            <VermoegensChart jahre={result.jahre} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        accent
          ? "border-brand-accent/40 bg-brand-accent/10"
          : "border-brand-border bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-brand-muted">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-bold ${
          accent ? "text-brand-accentText" : "text-brand-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-brand-body">{label}</span>
        <span className="font-display font-bold text-brand-accentText">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}

// ──────────────── Slide 7: Vermögensaufbau ────────────────
function SlideVermoegen({
  einheit,
  kunde,
  defaults,
}: {
  einheit: EinheitDetail;
  kunde: KundePerso | null;
  defaults: KalkulationsContext["defaults"];
}) {
  const inputs = useMemo(
    () => buildInitialInputs(einheit, kunde, defaults),
    [einheit, kunde, defaults],
  );
  const r = useMemo(() => calculate(inputs), [inputs]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 text-center">
        <div className="text-sm uppercase tracking-wider text-brand-muted">
          Vermögensaufbau
        </div>
        <h2 className="mt-1 font-display text-3xl font-bold md:text-5xl">
          In {inputs.haltedauerJahre} Jahren baust du dir{" "}
          <span className="text-brand-primary">
            {formatEUR(Math.round(r.endVermoegen))}
          </span>{" "}
          Vermögen auf.
        </h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-brand-border bg-white p-4">
        <div className="h-[52vh] min-h-[280px] w-full">
          <VermoegensChart jahre={r.jahre} />
        </div>
      </div>
    </div>
  );
}

// ──────────────── Slide 8: Abschluss ────────────────
function SlideAbschluss({ einheit }: { einheit: EinheitDetail }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-sm uppercase tracking-wider text-brand-accent">
        Wohnung sichern
      </div>
      <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold md:text-5xl">
        Wenn du dir diese Wohnung sichern willst, reservieren wir sie jetzt.
      </h2>
      <p className="mt-4 max-w-xl text-brand-body">
        Mit der Reservierung blockierst du Wohnung {einheit.wohnungsnummer} für{" "}
        <strong className="text-brand-ink">einen Monat verbindlich</strong>. Die
        Reservierungsgebühr beträgt{" "}
        <strong className="text-brand-ink">500 €</strong> und wird beim Kauf
        verrechnet. Sprich deinen Berater an, um die Reservierung zu starten.
      </p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-brand-border bg-white px-3 py-1 text-sm text-brand-body">
      {children}
    </span>
  );
}
