import * as React from "react";
import { cn } from "@/lib/utils";

/** Label links, Wert rechts — für Sidebar-Statistiken. */
export function StatRow({
  label,
  value,
  emphasis,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  emphasis?: "default" | "success" | "destructive";
  className?: string;
}) {
  const valueColor =
    emphasis === "success"
      ? "text-[color:oklch(var(--success))]"
      : emphasis === "destructive"
        ? "text-[color:oklch(var(--destructive))]"
        : "text-foreground";
  return (
    <div className={cn("flex items-baseline justify-between gap-3", className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", valueColor)}>
        {value}
      </span>
    </div>
  );
}
