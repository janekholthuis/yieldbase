import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Label (Uppercase) + optionaler Range-Hint rechts +
 * Input mit Suffix + Slider darunter — wie im ZinsMix-Pro-Screenshot.
 */
export interface SliderInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: string;
  disabled?: boolean;
  /** Anzahl Nachkommastellen für die Anzeige; -1 = keine Formatierung. */
  decimals?: number;
  className?: string;
}

function formatVal(v: number, decimals = -1) {
  if (decimals < 0) return String(v);
  return v.toFixed(decimals).replace(".", ",");
}

function parseVal(raw: string): number {
  const cleaned = raw.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  hint,
  disabled,
  decimals = -1,
  className,
}: SliderInputProps) {
  const [draft, setDraft] = React.useState(formatVal(value, decimals));
  React.useEffect(() => {
    setDraft(formatVal(value, decimals));
  }, [value, decimals]);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {hint && (
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <Input
          inputMode="decimal"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Math.min(max, Math.max(min, parseVal(draft)));
            onChange(n);
            setDraft(formatVal(n, decimals));
          }}
          className={cn(
            "h-11 text-base font-semibold",
            suffix && "pr-12",
          )}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(v) => onChange(v[0])}
      />
    </div>
  );
}
