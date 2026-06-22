"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculate,
  defaultSzenarien,
  KFW_PROGRAMME,
  type AfaTyp,
  type CalcInputs,
  type CalcResult,
  type SzenarioKey,
} from "@/lib/kalkulation";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import type { KalkulationsEinheit } from "@/lib/data/objekte";
import { formatEUR } from "@/lib/objekt-format";

/**
 * Shared calculation state for a unit. One `CalcInputs` state feeds the chart,
 * the detail tables, the assumption sliders AND (when consumed by the detail
 * view's sidebar) the investment figures — so adjusting a slider in „Annahmen"
 * updates every surface live.
 *
 * The hook centralises everything previously local to `KalkulationsTab`, so it
 * can be lifted up and the result shared with the Investagon-style sidebar.
 */
export interface EinheitKalkulation {
  inputs: CalcInputs;
  set: <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) => void;
  /** Inputs after the active scenario preset is applied (drives the engine). */
  effective: CalcInputs;
  result: CalcResult;
  szenarioKey: SzenarioKey;
  setSzenarioKey: (k: SzenarioKey) => void;
  szenarien: ReturnType<typeof defaultSzenarien>;
  aktivesSzenario: ReturnType<typeof defaultSzenarien>[number];
  annahmenEditierbar: boolean;
  kfwProgrammKey: string;
  applyKfw: (key: string) => void;
  readOnly: boolean;
}

export function useEinheitKalkulation(
  einheit: KalkulationsEinheit,
  kalkContext: KalkulationsContext,
  readOnly = false,
): EinheitKalkulation {
  const ctx = kalkContext;

  const initial: CalcInputs = useMemo(() => {
    const kp = einheit.kaufpreis ?? 300_000;
    return {
      kaufpreis: kp,
      kaltmieteMonat: einheit.miete ?? Math.round((kp * 0.04) / 12),
      hausgeldNichtUmlagef: einheit.hausgeld_nicht_umlagefaehig ?? 80,
      instandhaltung: einheit.instandhaltungsruecklage ?? 30,
      sondereigVerwaltung: einheit.sondereigentumsverwaltung ?? 25,
      grundstueckswertAnteil: einheit.grundstueckswert_anteil ?? 20,
      ekBetrag: Math.round((kp * ctx.defaults.ekProzent) / 100),
      kaufnebenkostenProzent: 10,
      kaufnebenkostenFinanziert: false,
      zins: ctx.defaults.zins,
      tilgung: ctx.defaults.tilgung,
      haltedauerJahre: ctx.defaults.haltedauer,
      afaSatz: einheit.afa_satz ?? ctx.defaults.afa,
      wertsteigerung: ctx.defaults.wertsteigerung,
      mietsteigerung: 2.0,
      steuersatz: ctx.meinSteuersatz ?? 35,
      erhaltungsaufwand: einheit.erhaltungsaufwand ?? 0,
      // Kalkulation 2.0 — Defaults entsprechen dem bisherigen Verhalten
      afaTyp: "linear",
      sanierungsanteil: 0,
      altbauAfaSatz: 2,
      sonderAfaBemessung: 0,
      moeblierungswert: 0,
      moeblierungJahre: 10,
      inflation: 2.0,
      kfwBetrag: 0,
      kfwZins: 0,
      kfwTilgung: 0,
      kfwTilgungszuschussProzent: 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [inputs, setInputs] = useState<CalcInputs>(initial);
  const [szenarioKey, setSzenarioKey] = useState<SzenarioKey>("konservativ");
  const [kfwProgrammKey, setKfwProgrammKey] = useState<string>("none");

  const szenarien = useMemo(
    () =>
      defaultSzenarien({
        wertsteigerung: inputs.wertsteigerung,
        mietsteigerung: inputs.mietsteigerung,
        inflation: inputs.inflation ?? 2,
      }),
    [inputs.wertsteigerung, inputs.mietsteigerung, inputs.inflation],
  );
  const aktivesSzenario =
    szenarien.find((s) => s.key === szenarioKey) ?? szenarien[0];

  const effective = useMemo<CalcInputs>(
    () => ({ ...inputs, ...aktivesSzenario.annahmen }),
    [inputs, aktivesSzenario],
  );
  const result = useMemo(() => calculate(effective), [effective]);

  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) =>
    setInputs((s) => ({ ...s, [k]: v }));

  const annahmenEditierbar = aktivesSzenario.editierbar && !readOnly;

  const applyKfw = (key: string) => {
    setKfwProgrammKey(key);
    if (key === "none") {
      setInputs((s) => ({
        ...s,
        kfwBetrag: 0,
        kfwZins: 0,
        kfwTilgung: 0,
        kfwTilgungszuschussProzent: 0,
      }));
      return;
    }
    const p = KFW_PROGRAMME.find((x) => x.key === key);
    if (!p) return;
    setInputs((s) => ({
      ...s,
      kfwBetrag: Math.min(p.maxBetrag, Math.max(0, s.kaufpreis - s.ekBetrag)),
      kfwZins: p.zins,
      kfwTilgung: p.tilgung,
      kfwTilgungszuschussProzent: p.tilgungszuschussProzent,
    }));
  };

  return {
    inputs,
    set,
    effective,
    result,
    szenarioKey,
    setSzenarioKey,
    szenarien,
    aktivesSzenario,
    annahmenEditierbar,
    kfwProgrammKey,
    applyKfw,
    readOnly,
  };
}

// ──────────────── KPIs ────────────────
export function KpiStrip({ k }: { k: EinheitKalkulation }) {
  const { result, effective } = k;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Cashflow nach Steuern"
        value={result.cashflowNachSteuerMonat}
        format={(n) => `${formatEUR(Math.round(n))}/Mon`}
        accent
      />
      <KpiCard
        label={`EK-Rendite (${effective.haltedauerJahre} J.)`}
        value={result.ekRenditeMultiplikator}
        format={(n) =>
          `${n.toFixed(2)}× · ${result.ekRenditeProJahr.toFixed(1)} % p.a.`
        }
      />
      <KpiCard
        label="Vermögen am Ende"
        value={result.endVermoegen}
        format={(n) => formatEUR(Math.round(n))}
      />
      <KpiCard
        label="Steuerersparnis kumuliert"
        value={result.kumulierteSteuerersparnis}
        format={(n) => formatEUR(Math.round(n))}
      />
    </div>
  );
}

// ──────────────── Diagramme (charts) ────────────────
// recharts lebt in KalkulationCharts und wird per next/dynamic (ssr:false) erst
// geladen, wenn die Diagramme gerendert werden — so zieht der häufig importierte
// `useEinheitKalkulation`-Hook recharts NICHT in den initialen Bundle.
const KalkulationCharts = dynamic(
  () => import("@/components/objekte/KalkulationCharts"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Card className="h-72 animate-pulse bg-muted/40 p-4" />
        <Card className="h-56 animate-pulse bg-muted/40 p-4" />
      </div>
    ),
  },
);

export function DiagrammePanel({
  k,
  headline = true,
  big = false,
}: {
  k: EinheitKalkulation;
  headline?: boolean;
  /** Größere Chart-Höhen (z. B. wenn die Diagramme volle Breite bekommen). */
  big?: boolean;
}) {
  return <KalkulationCharts k={k} headline={headline} big={big} />;
}

// ──────────────── Kalkulation (detail tables) ────────────────
export function KalkulationDetailPanel({ k }: { k: EinheitKalkulation }) {
  return (
    <div className="space-y-4">
      <KpiStrip k={k} />
      <CashflowDetailCard r={k.result} />
      <RenditenCard r={k.result} />
    </div>
  );
}

// Re-export the detail cards under both names so the standalone tab can reuse
// them without re-implementing.

// ──────────────── Annahmen (inputs) ────────────────
export function AnnahmenPanel({ k }: { k: EinheitKalkulation }) {
  const {
    inputs,
    set,
    effective,
    result,
    szenarien,
    szenarioKey,
    setSzenarioKey,
    aktivesSzenario,
    annahmenEditierbar,
    kfwProgrammKey,
    applyKfw,
    readOnly,
  } = k;
  const afaTyp = inputs.afaTyp ?? "linear";
  const aktivesKfw = KFW_PROGRAMME.find((p) => p.key === kfwProgrammKey);

  return (
    <div className="space-y-4">
      {/* Szenario-Umschalter */}
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Prognose-Szenario
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {aktivesSzenario.beschreibung}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1">
          {szenarien.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSzenarioKey(s.key)}
              aria-pressed={szenarioKey === s.key}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                szenarioKey === s.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-4">
        <h3 className="font-semibold">Annahmen</h3>

        <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <NumberRow
            label="Kaufpreis"
            value={inputs.kaufpreis}
            onChange={(v) => set("kaufpreis", v)}
            suffix="€"
            disabled={readOnly}
          />
          <NumberRow
            label="Kaltmiete"
            value={inputs.kaltmieteMonat}
            onChange={(v) => set("kaltmieteMonat", v)}
            suffix="€/Mon"
            disabled={readOnly}
          />

          <div className="space-y-1.5">
            <NumberRow
              label="Eigenkapital"
              value={inputs.ekBetrag}
              onChange={(v) => set("ekBetrag", v)}
              suffix="€"
              disabled={readOnly}
            />
            <label className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Kaufnebenkosten mitfinanzieren</span>
              <Switch
                checked={inputs.kaufnebenkostenFinanziert}
                onCheckedChange={(v) => set("kaufnebenkostenFinanziert", v)}
                disabled={readOnly}
              />
            </label>
          </div>
          <NumberRow
            label="Erhaltungsaufwand (Jahr 1)"
            value={inputs.erhaltungsaufwand}
            onChange={(v) => set("erhaltungsaufwand", v)}
            suffix="€"
            disabled={readOnly}
          />

          <SliderRow
            label="Zins (Bank)"
            value={inputs.zins}
            min={1}
            max={8}
            step={0.05}
            onChange={(v) => set("zins", v)}
            format={(n) => `${n.toFixed(2)} %`}
            disabled={readOnly}
          />
          <SliderRow
            label="Tilgung (Bank)"
            value={inputs.tilgung}
            min={1}
            max={6}
            step={0.1}
            onChange={(v) => set("tilgung", v)}
            format={(n) => `${n.toFixed(1)} %`}
            disabled={readOnly}
          />
          <SliderRow
            label="Haltedauer"
            value={inputs.haltedauerJahre}
            min={3}
            max={30}
            step={1}
            onChange={(v) => set("haltedauerJahre", v)}
            format={(n) => `${n} J.`}
            disabled={readOnly}
          />
          <SliderRow
            label="Steuersatz"
            value={inputs.steuersatz}
            min={0}
            max={50}
            step={0.5}
            onChange={(v) => set("steuersatz", v)}
            format={(n) => `${n.toFixed(1)} %`}
            disabled={readOnly}
          />
        </div>

        {/* Zukunftsannahmen — nur im Szenario „Individuell" editierbar */}
        <div className="space-y-3 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Zukunftsannahmen
            </span>
            {!annahmenEditierbar && (
              <span className="text-[10px] text-muted-foreground">
                via Szenario „{aktivesSzenario.label}“
              </span>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <SliderRow
              label="Wertsteigerung"
              value={effective.wertsteigerung}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("wertsteigerung", v)}
              format={(n) => `${n.toFixed(1)} % p.a.`}
              disabled={!annahmenEditierbar}
            />
            <SliderRow
              label="Mietsteigerung"
              value={effective.mietsteigerung}
              min={0}
              max={5}
              step={0.1}
              onChange={(v) => set("mietsteigerung", v)}
              format={(n) => `${n.toFixed(1)} % p.a.`}
              disabled={!annahmenEditierbar}
            />
            <SliderRow
              label="Inflation (Kosten)"
              value={effective.inflation ?? 0}
              min={0}
              max={6}
              step={0.1}
              onChange={(v) => set("inflation", v)}
              format={(n) => `${n.toFixed(1)} % p.a.`}
              disabled={!annahmenEditierbar}
            />
          </div>
        </div>

        {/* AfA */}
        <div className="space-y-3 border-t pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Abschreibung (AfA)
          </span>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">AfA-Typ</Label>
              <Select
                value={afaTyp}
                onValueChange={(v) => set("afaTyp", v as AfaTyp)}
                disabled={readOnly}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear (Standard)</SelectItem>
                  <SelectItem value="denkmal">Denkmal §7i</SelectItem>
                  <SelectItem value="sonder_7b">
                    Sonder-AfA §7b (Neubau)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {afaTyp === "linear" && (
              <SliderRow
                label="AfA-Satz"
                value={inputs.afaSatz}
                min={1}
                max={5}
                step={0.1}
                onChange={(v) => set("afaSatz", v)}
                format={(n) => `${n.toFixed(1)} %`}
                disabled={readOnly}
              />
            )}

            {afaTyp === "denkmal" && (
              <>
                <NumberRow
                  label="Sanierungsanteil (§7i)"
                  value={inputs.sanierungsanteil ?? 0}
                  onChange={(v) => set("sanierungsanteil", v)}
                  suffix="€"
                  disabled={readOnly}
                />
                <SliderRow
                  label="Altbau-AfA"
                  value={inputs.altbauAfaSatz ?? 2}
                  min={2}
                  max={2.5}
                  step={0.5}
                  onChange={(v) => set("altbauAfaSatz", v)}
                  format={(n) => `${n.toFixed(1)} %`}
                  disabled={readOnly}
                />
                <p className="text-[10px] text-muted-foreground sm:col-span-2">
                  Sanierungsanteil: 9 % p.a. (Jahr 1–8), 7 % p.a. (Jahr 9–12).
                </p>
              </>
            )}

            {afaTyp === "sonder_7b" && (
              <>
                <SliderRow
                  label="Lineare Basis-AfA"
                  value={inputs.afaSatz}
                  min={1}
                  max={5}
                  step={0.1}
                  onChange={(v) => set("afaSatz", v)}
                  format={(n) => `${n.toFixed(1)} %`}
                  disabled={readOnly}
                />
                <NumberRow
                  label="Sonder-AfA Bemessung"
                  value={inputs.sonderAfaBemessung ?? 0}
                  onChange={(v) => set("sonderAfaBemessung", v)}
                  suffix="€"
                  disabled={readOnly}
                />
                <p className="text-[10px] text-muted-foreground sm:col-span-2">
                  Zusätzlich 5 % p.a. in den Jahren 1–4 (Beta — ohne
                  §7b-Voll­prüfung).
                </p>
              </>
            )}

            <NumberRow
              label="Möblierungswert (optional)"
              value={inputs.moeblierungswert ?? 0}
              onChange={(v) => set("moeblierungswert", v)}
              suffix="€"
              disabled={readOnly}
            />
            {(inputs.moeblierungswert ?? 0) > 0 && (
              <SliderRow
                label="Möblierung Nutzungsdauer"
                value={inputs.moeblierungJahre ?? 10}
                min={5}
                max={15}
                step={1}
                onChange={(v) => set("moeblierungJahre", v)}
                format={(n) => `${n} J.`}
                disabled={readOnly}
              />
            )}
          </div>
          <div className="flex justify-between rounded-md bg-muted px-2 py-1.5 text-xs">
            <span className="text-muted-foreground">AfA Jahr 1</span>
            <span className="font-semibold">
              {formatEUR(Math.round(result.afaJahr1))}
            </span>
          </div>
        </div>

        {/* KfW-Förderung */}
        <div className="space-y-3 border-t pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            KfW-Förderung
          </span>
          <div className="space-y-1 sm:max-w-sm">
            <Label className="text-xs">Programm</Label>
            <Select
              value={kfwProgrammKey}
              onValueChange={applyKfw}
              disabled={readOnly}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Keine KfW-Förderung" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Keine KfW-Förderung</SelectItem>
                {KFW_PROGRAMME.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(inputs.kfwBetrag ?? 0) > 0 && (
            <>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <NumberRow
                  label="KfW-Darlehen"
                  value={inputs.kfwBetrag ?? 0}
                  onChange={(v) => set("kfwBetrag", v)}
                  suffix="€"
                  disabled={readOnly}
                />
                <SliderRow
                  label="KfW-Zins"
                  value={inputs.kfwZins ?? 0}
                  min={0}
                  max={5}
                  step={0.05}
                  onChange={(v) => set("kfwZins", v)}
                  format={(n) => `${n.toFixed(2)} %`}
                  disabled={readOnly}
                />
                <SliderRow
                  label="KfW-Tilgung"
                  value={inputs.kfwTilgung ?? 0}
                  min={1}
                  max={6}
                  step={0.1}
                  onChange={(v) => set("kfwTilgung", v)}
                  format={(n) => `${n.toFixed(1)} %`}
                  disabled={readOnly}
                />
                <SliderRow
                  label="Tilgungszuschuss"
                  value={inputs.kfwTilgungszuschussProzent ?? 0}
                  min={0}
                  max={45}
                  step={1}
                  onChange={(v) => set("kfwTilgungszuschussProzent", v)}
                  format={(n) => `${n.toFixed(0)} %`}
                  disabled={readOnly}
                />
              </div>
              {aktivesKfw && (
                <p className="text-[10px] text-muted-foreground">
                  {aktivesKfw.hinweis}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Bank-Tranche {formatEUR(Math.round(result.bankTranche))} · KfW{" "}
                {formatEUR(Math.round(result.kfwTranche))}. Konditionen sind
                Richtwerte — vor Beratung prüfen.
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

// ──────────────── Kompakte Investitions-Slider (rechte Sidebar) ────────────────
// Die wichtigsten Stellhebel als schmale, einspaltige Slider — teilen sich den
// Calc-State (k), sodass Charts/KPIs/Investition live mitlaufen.
export function InvestitionsSliders({ k }: { k: EinheitKalkulation }) {
  const { inputs, set, szenarien, szenarioKey, setSzenarioKey } = k;
  return (
    <div className="space-y-3.5">
      {/* Szenario-Schnellschalter */}
      <div className="inline-flex w-full rounded-[8px] bg-brand-surfaceMuted p-1">
        {szenarien.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSzenarioKey(s.key)}
            aria-pressed={szenarioKey === s.key}
            className={`flex-1 rounded-[6px] px-2 py-1.5 text-[12px] font-medium transition-colors ${
              szenarioKey === s.key
                ? "bg-card text-brand-ink shadow-sm"
                : "text-brand-muted hover:text-brand-ink"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <SliderRow
        label="Eigenkapital"
        value={inputs.ekBetrag}
        min={0}
        max={Math.max(inputs.kaufpreis, inputs.ekBetrag)}
        step={1000}
        onChange={(v) => set("ekBetrag", v)}
        format={(n) => formatEUR(Math.round(n))}
      />
      <SliderRow
        label="Zins (Bank)"
        value={inputs.zins}
        min={1}
        max={8}
        step={0.05}
        onChange={(v) => set("zins", v)}
        format={(n) => `${n.toFixed(2)} %`}
      />
      <SliderRow
        label="Tilgung (Bank)"
        value={inputs.tilgung}
        min={1}
        max={6}
        step={0.1}
        onChange={(v) => set("tilgung", v)}
        format={(n) => `${n.toFixed(1)} %`}
      />
      <SliderRow
        label="Haltedauer"
        value={inputs.haltedauerJahre}
        min={3}
        max={30}
        step={1}
        onChange={(v) => set("haltedauerJahre", v)}
        format={(n) => `${n} J.`}
      />
    </div>
  );
}

// ──────────────── helpers ────────────────

function KpiCard({
  label,
  value,
  format,
  accent,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
  accent?: boolean;
}) {
  const animated = useCountUp(value);
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-bold ${accent ? "text-primary" : ""}`}>
        {format(animated)}
      </div>
    </Card>
  );
}

function useCountUp(target: number, durationMs = 500) {
  const [v, setV] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const start = ref.current;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(start + (target - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else ref.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return v;
}

function NumberRow({
  label,
  value,
  onChange,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          disabled={disabled}
          className="h-8"
        />
        {suffix && (
          <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs font-medium">{format(value)}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        disabled={disabled}
      />
    </div>
  );
}

export function CashflowDetailCard({ r }: { r: CalcResult }) {
  const i = r.inputs;
  const rows: { label: string; v: number }[] = [
    { label: "Kaltmiete", v: i.kaltmieteMonat },
    { label: "− Hausgeld nicht umlagefähig", v: -i.hausgeldNichtUmlagef },
    { label: "− Instandhaltungsrücklage", v: -i.instandhaltung },
    { label: "− Sondereigentumsverwaltung", v: -i.sondereigVerwaltung },
    { label: "− Zins (Monat 1)", v: -r.zinsMonat1 },
    { label: "− Tilgung (Monat 1)", v: -r.tilgungMonat1 },
    { label: "+ Steuerersparnis (Monat 1)", v: r.steuerersparnisMonat1 },
  ];
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-semibold">Cashflow im Detail (Monat 1)</h3>
      <div className="divide-y text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-1.5">
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={`font-medium ${row.v < 0 ? "text-destructive" : ""}`}
            >
              {formatEUR(Math.round(row.v))}
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-2 text-base font-bold">
          <span>= Cashflow nach Steuer</span>
          <span className="text-primary">
            {formatEUR(Math.round(r.cashflowNachSteuerMonat))}
          </span>
        </div>
      </div>
    </Card>
  );
}

export function RenditenCard({ r }: { r: CalcResult }) {
  return (
    <Card className="p-4">
      <h3 className="mb-2 font-semibold">Renditen</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Bruttomietrendite</div>
          <div className="text-base font-bold">
            {r.bruttoMietrendite.toFixed(2)} %
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">EK-Rendite p.a.</div>
          <div className="text-base font-bold text-primary">
            {r.ekRenditeProJahr.toFixed(1)} %
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Total ROI</div>
          <div className="text-base font-bold">
            {r.ekRenditeMultiplikator.toFixed(2)}×
          </div>
        </div>
      </div>
    </Card>
  );
}
