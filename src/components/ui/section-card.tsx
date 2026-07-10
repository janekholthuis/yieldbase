import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Karten-Baustein:
 * - weicher Rand, sehr leichter Schatten
 * - optionaler Icon-Badge im Akzent-Ton
 * - Titel (semibold) + optionaler Untertitel
 * - optionaler Action-Slot rechts (Buttons etc.)
 */
export interface SectionCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Wenn true: ohne innere Padding (für Tabellen etc., die selbst paddingen). */
  noPadding?: boolean;
  /** Inhaltsbereich-Padding-Override. */
  contentClassName?: string;
  /** Header-Bereich-Padding-Override. */
  headerClassName?: string;
}

export function SectionCard({
  icon,
  title,
  subtitle,
  action,
  noPadding,
  contentClassName,
  headerClassName,
  className,
  children,
  ...rest
}: SectionCardProps) {
  const hasHeader = Boolean(icon || title || subtitle || action);
  return (
    <div
      className={cn(
        "rounded-xl border border-brand-borderSoft bg-card text-card-foreground",
        "shadow-[var(--shadow-card)]",
        className,
      )}
      {...rest}
    >
      {hasHeader && (
        <div
          className={cn(
            "flex items-start gap-4 px-5 pt-5",
            children ? "pb-4" : "pb-5",
            headerClassName,
          )}
        >
          {icon && (
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-brand-accent/30 bg-brand-accentSoft text-brand-accent"
              aria-hidden
            >
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="font-display text-base font-semibold leading-tight tracking-tight text-foreground">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children != null && (
        <div
          className={cn(
            !noPadding && (hasHeader ? "px-5 pb-5" : "p-5"),
            contentClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
