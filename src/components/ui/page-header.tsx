import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Einheitlicher Seitenkopf für alle Top-Level-Seiten.
 * Ein Titel-Rhythmus app-weit: Display-Sans, text-2xl semibold, tracking-tight.
 * Optionaler `description`-Untertitel + rechter Action-Slot (Buttons etc.).
 */
export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Rechts ausgerichtete Aktionen (Buttons, Selects …). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </div>
  );
}
