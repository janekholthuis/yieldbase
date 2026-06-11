"use client";

import type { TooltipContentProps } from "recharts";

type BrandTooltipExtra = {
  labelFmt?: (label: unknown) => string;
  valueFmt?: (value: number) => string;
};

/** Yieldbase-Tooltip: weiße Karte, brand-border, tabular-nums Werte. */
export function BrandTooltip(
  props: Partial<TooltipContentProps<number, string>> & BrandTooltipExtra,
) {
  const { active, payload, label, labelFmt, valueFmt } = props;
  if (!active || !payload || payload.length === 0) return null;
  const headerText = labelFmt ? labelFmt(label) : String(label ?? "");
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-3 shadow-popover">
      {headerText && (
        <div className="mb-1.5 text-xs font-semibold text-brand-ink">
          {headerText}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((p, i) => {
          const v = typeof p.value === "number" ? p.value : Number(p.value);
          return (
            <div
              key={i}
              className="flex items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-center gap-2 text-brand-body">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: p.color ?? "var(--color-brand-primary)" }}
                />
                <span>{p.name}</span>
              </div>
              <span className="font-medium tabular-nums text-brand-ink">
                {valueFmt ? valueFmt(v) : v.toLocaleString("de-DE")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
