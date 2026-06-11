import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Hero-KPI-Box: kleines Label oben (uppercase, cyan), darunter sehr große Zahl.
 * Hintergrund Cyan-Ultra, abgerundet — wie "Gewichteter Mischzins" im Screenshot.
 */
export function HighlightStat({
  label,
  value,
  unit,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-[color:oklch(var(--highlight-bg))] px-5 py-6 text-center",
        className,
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:oklch(var(--primary))]">
        {label}
      </div>
      <div className="mt-2 font-display text-4xl font-bold leading-none tracking-tight text-[color:oklch(var(--highlight-fg))]">
        {value}
        {unit && (
          <span className="ml-1 text-2xl font-semibold text-[color:oklch(var(--primary))]">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
