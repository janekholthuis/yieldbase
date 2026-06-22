"use client";

// Recharts-tragende Chart-Bodies für die Kalkulation, in ein eigenes Modul
// ausgelagert, damit recharts (~100 KB) per next/dynamic NUR geladen wird, wenn
// die Diagramme tatsächlich gerendert werden — nicht schon, weil ein Consumer den
// `useEinheitKalkulation`-Hook aus EinheitKalkulationPanel importiert (der den
// gesamten Modul-Chunk inkl. recharts zöge). DiagrammePanel ist der Wrapper.
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
import { BrandTooltip } from "@/components/charts/BrandTooltip";
import { formatEUR } from "@/lib/objekt-format";
import type { EinheitKalkulation } from "@/components/objekte/EinheitKalkulationPanel";

export default function KalkulationCharts({
  k,
  headline = true,
  big = false,
}: {
  k: EinheitKalkulation;
  headline?: boolean;
  big?: boolean;
}) {
  const { result } = k;
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-brand-ink">
            {headline ? "Vermögensentwicklung (kumuliert)" : "Vermögensschere"}
          </h3>
          <span className="text-xs text-brand-muted">
            Wert minus Restschuld ist dein Vermögen
          </span>
        </div>
        <div className={big ? "h-[440px] w-full" : "h-72 w-full"}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={big ? 440 : 288}
          >
            <AreaChart data={result.jahre}>
              <defs>
                <linearGradient id="vermoegenG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C99B4D" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#C99B4D" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
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
                    valueFmt={(v) => formatEUR(Math.round(v))}
                  />
                }
              />
              <Legend
                wrapperStyle={{
                  color: "#6B7785",
                  fontFamily: "Inter",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="vermoegen"
                name="Vermögen"
                stroke="#C99B4D"
                fill="url(#vermoegenG)"
                strokeWidth={2}
                dot={{ r: 4, fill: "#C99B4D", stroke: "#C99B4D" }}
                activeDot={{ r: 6, fill: "#C99B4D" }}
              />
              <Line
                type="monotone"
                dataKey="immobilienwert"
                name="Immobilienwert"
                stroke="#1B2D45"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: "#1B2D45" }}
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
        <div className={big ? "h-80 w-full" : "h-56 w-full"}>
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={big ? 320 : 224}
          >
            <LineChart data={result.jahre.filter((j) => j.jahr > 0)}>
              <CartesianGrid
                stroke="#E5E7EB"
                strokeDasharray="3 3"
                strokeOpacity={0.6}
              />
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
                  new Intl.NumberFormat("de-DE", {
                    maximumFractionDigits: 0,
                  }).format(Math.round(v)) + " €"
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
                stroke="#1B2D45"
                strokeWidth={2}
                dot={{ r: 4, fill: "#1B2D45", stroke: "#1B2D45" }}
                activeDot={{ r: 6, fill: "#1B2D45" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
