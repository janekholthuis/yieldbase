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
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { calculate, type CalcInputs } from "@/lib/kalkulation";
import { formatEUR, formatNumber } from "@/lib/objekt-format";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddress } from "@/lib/mapbox";
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-anthrazit text-off-white">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-accent font-display font-bold text-anthrazit">
            O
          </div>
          <span className="font-display font-semibold tracking-tight">
            Objektpilot
          </span>
        </div>
        <div className="font-display text-sm text-white/70">
          {slide + 1} / {TOTAL_SLIDES}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white/70 hover:bg-white/10 hover:text-white"
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
              <Skeleton className="h-64 w-2/3 bg-white/10" />
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
      <footer className="flex items-center justify-between border-t border-white/10 px-6 py-3">
        <Button
          variant="ghost"
          size="lg"
          onClick={() => setSlide((s) => Math.max(0, s - 1))}
          disabled={slide === 0}
          className="text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
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
                  : "w-2 bg-white/30 hover:bg-white/50"
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
          className="text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
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
  switch (index) {
    case 0:
      return <SlideCover einheit={einheit} kunde={kunde} vp={vp} />;
    case 1:
      return <SlideUebersicht einheit={einheit} />;
    case 2:
      return <SlideLage einheit={einheit} />;
    case 3:
      return <SlideBilder einheit={einheit} />;
    case 4:
      return <SlideEckdaten einheit={einheit} />;
    case 5:
      return (
        <SlideKalkulation einheit={einheit} kunde={kunde} defaults={defaults} />
      );
    case 6:
      return (
        <SlideVermoegen einheit={einheit} kunde={kunde} defaults={defaults} />
      );
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
  const hero = einheit.bilder?.[0]?.url;
  const vorname = kunde?.vorname ?? "";
  const begruessung = vorname
    ? `Hey ${vorname}, hier ist deine Wohnung`
    : "Hier ist deine Wohnung";
  const vpName =
    [vp?.vorname, vp?.nachname].filter(Boolean).join(" ") ||
    vp?.name ||
    "Dein Berater";
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
        <div className="absolute inset-0 bg-graphit-800" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-anthrazit via-anthrazit/60 to-anthrazit/10" />
      <div className="relative flex h-full flex-col justify-end p-8 md:p-14">
        <h1 className="font-display text-3xl font-bold leading-tight md:text-6xl">
          {begruessung}
        </h1>
        <p className="mt-3 font-display text-lg text-white/80 md:text-2xl">
          {[einheit.adresse, einheit.plz, einheit.stadt]
            .filter(Boolean)
            .join(", ")}
        </p>
        <div className="mt-8 flex items-center gap-3 border-t border-white/15 pt-5">
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
  const hero = einheit.bilder?.[0]?.url;
  return (
    <div className="grid h-full gap-6 md:grid-cols-2">
      <div className="flex flex-col justify-center space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wider text-white/60">
            Wohnung
          </div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">
            {einheit.wohnungsnummer}
          </h1>
          <p className="mt-2 text-lg text-white/80">
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
          <Pill>{einheit.vermietet ? "Vermietet" : "Leerstand"}</Pill>
        </div>
        <div>
          <div className="text-sm uppercase tracking-wider text-white/60">
            Kaufpreis
          </div>
          <div className="font-display text-5xl font-bold text-brand-accent md:text-6xl">
            {formatEUR(einheit.kaufpreis)}
          </div>
        </div>
        <ul className="space-y-1.5 text-white/85">
          <li>· Vollvermietung mit stabilem Cashflow</li>
          <li>· Lage in {einheit.stadt ?? "begehrter Region"}</li>
          <li>· Steuerlich attraktiv über AfA und Werbungskosten</li>
        </ul>
      </div>
      <div className="overflow-hidden rounded-2xl bg-graphit-800">
        {hero ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Building2 className="h-16 w-16 text-white/30" />
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────── Slide 3: Lage ────────────────
function SlideLage({ einheit }: { einheit: EinheitDetail }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMapbox()) return;
    let cancelled = false;
    const query = [einheit.adresse, einheit.plz, einheit.stadt]
      .filter(Boolean)
      .join(", ");
    let map: mapboxgl.Map | null = null;
    (async () => {
      const center = await geocodeAddress(query);
      if (cancelled || !ref.current || !center) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;
      map = new mapboxgl.Map({
        container: ref.current,
        style: "mapbox://styles/mapbox/dark-v11",
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
      <div className="overflow-hidden rounded-2xl border border-white/10 md:col-span-2">
        {hasMapbox() ? (
          <div ref={ref} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/50">
            <MapPin className="h-12 w-12" />
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center space-y-5">
        <div>
          <div className="text-sm uppercase tracking-wider text-white/60">
            Lage
          </div>
          <h2 className="font-display text-3xl font-bold">
            {einheit.stadt ?? "—"}
          </h2>
          <p className="mt-1 text-white/70">
            {[einheit.adresse, einheit.plz, einheit.bundesland]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Standort-Highlights folgen. ÖPNV, Schulen und Versorgung werden mit dem
          Standort-Modul personalisiert.
        </div>
      </div>
    </div>
  );
}

// ──────────────── Slide 4: Bilder + Grundriss ────────────────
function SlideBilder({ einheit }: { einheit: EinheitDetail }) {
  const bilder = einheit.bilder ?? [];
  const grundriss =
    bilder.find((b) => /grund/i.test(b.alt ?? "")) ?? bilder[0];
  const restBilder = bilder
    .filter((b) => b.id !== grundriss?.id)
    .slice(0, 6);
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="grid h-full gap-6 md:grid-cols-2">
      <div className="flex flex-col">
        <div className="mb-2 text-sm uppercase tracking-wider text-white/60">
          Grundriss
        </div>
        <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-off-white">
          {grundriss ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={grundriss.url}
              alt={grundriss.alt ?? "Grundriss"}
              className="h-full w-full cursor-zoom-in object-contain p-3"
              onClick={() => setLightbox(grundriss.url)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-anthrazit/50">
              Kein Grundriss vorhanden
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="mb-2 text-sm uppercase tracking-wider text-white/60">
          Eindrücke
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          {restBilder.length === 0 ? (
            <div className="col-span-2 flex items-center justify-center rounded-2xl border border-white/10 text-white/50">
              Keine weiteren Bilder
            </div>
          ) : (
            restBilder.map((b) => (
              <button
                key={b.id}
                onClick={() => setLightbox(b.url)}
                className="overflow-hidden rounded-xl border border-white/10 bg-graphit-800"
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
  const ppsm =
    einheit.kaufpreis && einheit.wohnflaeche
      ? Math.round(einheit.kaufpreis / einheit.wohnflaeche)
      : null;
  const rendite = einheit.mietrendite_brutto;
  return (
    <div className="flex h-full flex-col justify-center">
      <div className="mb-8">
        <div className="text-sm uppercase tracking-wider text-white/60">
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
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <span className="text-white/70">{label}</span>
      <span
        className={`font-display text-xl font-bold ${
          highlight ? "text-brand-accent" : "text-white"
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
    wertsteigerung: defaults.wertsteigerung,
    mietsteigerung: 2,
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
        <div className="text-sm uppercase tracking-wider text-white/60">
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

      <div className="mt-6 grid flex-1 gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5 md:grid-cols-2">
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
      </div>
      {kunde && (
        <div className="mt-3 text-center text-xs text-white/50">
          Steuersatz {inputs.steuersatz}% übernommen aus dem Profil von{" "}
          {kunde.vorname ?? "Kunde"}.
        </div>
      )}
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
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-white/60">
        {label}
      </div>
      <div
        className={`mt-1 font-display text-2xl font-bold ${
          accent ? "text-brand-accent" : "text-white"
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
        <span className="text-sm text-white/70">{label}</span>
        <span className="font-display font-bold text-brand-accent">
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
  const data = r.jahre.map((j) => ({
    jahr: j.jahr,
    Vermögen: Math.round(j.vermoegen),
    Restschuld: Math.round(j.restschuld),
    Wert: Math.round(j.immobilienwert),
  }));

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 text-center">
        <div className="text-sm uppercase tracking-wider text-white/60">
          Vermögensaufbau
        </div>
        <h2 className="mt-1 font-display text-3xl font-bold md:text-5xl">
          In {inputs.haltedauerJahre} Jahren baust du dir{" "}
          <span className="text-brand-accent">
            {formatEUR(Math.round(r.endVermoegen))}
          </span>{" "}
          Vermögen auf.
        </h2>
      </div>
      <div className="flex-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="vmg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C99B4D" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#C99B4D" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="wt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FBF3E2" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#FBF3E2" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="jahr"
              stroke="rgba(255,255,255,0.25)"
              tick={{
                fill: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontFamily: "Inter",
              }}
              tickFormatter={(v) => `${v}`}
            />
            <YAxis
              stroke="rgba(255,255,255,0.25)"
              tick={{
                fill: "rgba(255,255,255,0.6)",
                fontSize: 12,
                fontFamily: "Inter",
              }}
              tickFormatter={(v) =>
                new Intl.NumberFormat("de-DE", {
                  maximumFractionDigits: 0,
                }).format(Math.round(v / 1000)) + "k"
              }
            />
            <Tooltip
              cursor={{ stroke: "rgba(255,255,255,0.15)" }}
              content={
                <BrandTooltip
                  labelFmt={(l) => `Jahr ${l}`}
                  valueFmt={(v) => formatEUR(v)}
                />
              }
            />
            <Legend
              wrapperStyle={{
                color: "rgba(255,255,255,0.7)",
                fontFamily: "Inter",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="Wert"
              stroke="#FBF3E2"
              fill="url(#wt)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6, fill: "#FBF3E2" }}
            />
            <Area
              type="monotone"
              dataKey="Restschuld"
              stroke="rgba(255,255,255,0.5)"
              fill="transparent"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 6, fill: "rgba(255,255,255,0.7)" }}
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
      <p className="mt-4 max-w-xl text-white/70">
        Mit der Reservierung blockierst du Wohnung {einheit.wohnungsnummer} für{" "}
        <strong className="text-white">einen Monat verbindlich</strong>. Die
        Reservierungsgebühr beträgt{" "}
        <strong className="text-white">500 €</strong> und wird beim Kauf
        verrechnet. Sprich deinen Berater an, um die Reservierung zu starten.
      </p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm text-white/85">
      {children}
    </span>
  );
}
