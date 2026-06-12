"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { calculate, type CalcInputs, type CalcResult } from "@/lib/kalkulation";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import type { EinheitDetail } from "@/lib/data/objekte";
import { formatEUR } from "@/lib/objekt-format";
import { BrandTooltip } from "@/components/charts/BrandTooltip";

interface Props {
  einheit: EinheitDetail;
  kalkContext: KalkulationsContext;
  readOnly?: boolean;
}

export function KalkulationsTab({ einheit, kalkContext, readOnly = false }: Props) {
  const ctx = kalkContext;

  // Initial-Inputs aus Defaults + Einheit.
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [inputs, setInputs] = useState<CalcInputs>(initial);
  const result = useMemo(() => calculate(inputs), [inputs]);

  const set = <K extends keyof CalcInputs>(k: K, v: CalcInputs[K]) =>
    setInputs((s) => ({ ...s, [k]: v }));

  // TODO(migration): Persisting a Kalkulation requires a kundeId, which this
  // object-detail context does not have. saveKalkulation from
  // "@/lib/actions/objekte" should be wired once a Kunde is selected here
  // (e.g. via a customer picker). The calculator stays fully interactive
  // without persistence until then.

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Cashflow nach Steuern"
          value={result.cashflowNachSteuerMonat}
          format={(n) => `${formatEUR(Math.round(n))}/Mon`}
          accent
        />
        <KpiCard
          label={`EK-Rendite (${inputs.haltedauerJahre} J.)`}
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

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Inputs */}
        <Card className="space-y-4 p-4 lg:col-span-1">
          <h3 className="font-semibold">Annahmen</h3>

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

          <SliderRow
            label="Zins"
            value={inputs.zins}
            min={1}
            max={8}
            step={0.05}
            onChange={(v) => set("zins", v)}
            format={(n) => `${n.toFixed(2)} %`}
            disabled={readOnly}
          />
          <SliderRow
            label="Tilgung"
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
            label="AfA"
            value={inputs.afaSatz}
            min={1}
            max={5}
            step={0.1}
            onChange={(v) => set("afaSatz", v)}
            format={(n) => `${n.toFixed(1)} %`}
            disabled={readOnly}
          />
          <SliderRow
            label="Wertsteigerung"
            value={inputs.wertsteigerung}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => set("wertsteigerung", v)}
            format={(n) => `${n.toFixed(1)} % p.a.`}
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
          <NumberRow
            label="Erhaltungsaufwand (Jahr 1)"
            value={inputs.erhaltungsaufwand}
            onChange={(v) => set("erhaltungsaufwand", v)}
            suffix="€"
            disabled={readOnly}
          />
        </Card>

        {/* Charts + Detail */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="font-semibold text-brand-ink">Vermögensschere</h3>
              <span className="text-xs text-brand-muted">
                Wert minus Restschuld ist dein Vermögen
              </span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <AreaChart data={result.jahre}>
                  <defs>
                    <linearGradient id="vermoegenG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F2A661" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#F2A661" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="jahr"
                    stroke="#E5E7EB"
                    tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(j) => `J${j}`}
                  />
                  <YAxis
                    stroke="#E5E7EB"
                    tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(
                        Math.round(v / 1000),
                      ) + "k"
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: "#E5E7EB" }}
                    content={
                      <BrandTooltip
                        labelFmt={(l) => `Jahr ${l}`}
                        valueFmt={(v) => formatEUR(Math.round(v))}
                      />
                    }
                  />
                  <Legend
                    wrapperStyle={{ color: "#6B7785", fontFamily: "Inter", fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="vermoegen"
                    name="Vermögen"
                    stroke="#F2A661"
                    fill="url(#vermoegenG)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#F2A661", stroke: "#F2A661" }}
                    activeDot={{ r: 6, fill: "#F2A661" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="immobilienwert"
                    name="Immobilienwert"
                    stroke="#1583C9"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#1583C9" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="restschuld"
                    name="Restschuld"
                    stroke="#243A57"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    activeDot={{ r: 6, fill: "#243A57" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 font-semibold text-brand-ink">Cashflow-Entwicklung</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <LineChart data={result.jahre.filter((j) => j.jahr > 0)}>
                  <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" strokeOpacity={0.6} />
                  <XAxis
                    dataKey="jahr"
                    stroke="#E5E7EB"
                    tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(j) => `J${j}`}
                  />
                  <YAxis
                    stroke="#E5E7EB"
                    tick={{ fill: "#6B7785", fontSize: 12, fontFamily: "Inter" }}
                    tickFormatter={(v) =>
                      new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(
                        Math.round(v),
                      ) + " €"
                    }
                  />
                  <Tooltip
                    cursor={{ stroke: "#E5E7EB" }}
                    content={
                      <BrandTooltip
                        labelFmt={(l) => `Jahr ${l}`}
                        valueFmt={(v) => `${formatEUR(Math.round(v))}/Mon`}
                      />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="cashflowMonat"
                    name="Cashflow nach Steuer"
                    stroke="#1583C9"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#1583C9", stroke: "#1583C9" }}
                    activeDot={{ r: 6, fill: "#1583C9" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <CashflowDetail r={result} />
          <RenditenCard r={result} />
        </div>
      </div>
    </div>
  );
}

// ---------- helpers ----------

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

function CashflowDetail({ r }: { r: CalcResult }) {
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
            <span className={`font-medium ${row.v < 0 ? "text-destructive" : ""}`}>
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

function RenditenCard({ r }: { r: CalcResult }) {
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
