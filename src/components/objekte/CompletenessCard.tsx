import { Card } from "@/components/ui/card";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EinheitDetail } from "@/lib/data/objekte";

interface Props {
  einheit: EinheitDetail;
}

interface Completeness {
  eckdaten: boolean;
  kalkulation: boolean;
  bilder: boolean;
  dokumente: boolean;
  bank: boolean;
}

const ITEMS: { key: keyof Completeness; label: string }[] = [
  { key: "eckdaten", label: "Eckdaten" },
  { key: "kalkulation", label: "Kalkulations-Defaults" },
  { key: "bilder", label: "Bilder" },
  { key: "dokumente", label: "Dokumente" },
  { key: "bank", label: "Bank-Daten" },
];

// Completeness is derived directly from the loaded einheit data (deterministic,
// known fields). `bank` reflects the parent projekt's bank details.
function deriveCompleteness(e: EinheitDetail): Completeness {
  return {
    eckdaten:
      e.wohnflaeche != null && e.zimmer != null && e.kaufpreis != null,
    kalkulation: e.kalkulation != null && Object.keys(e.kalkulation).length > 0,
    bilder: e.bilder.length > 0,
    dokumente: e.dokumente.length > 0,
    bank: e.bank_complete,
  };
}

export function CompletenessCard({ einheit }: Props) {
  const data = deriveCompleteness(einheit);
  const total = ITEMS.length;
  const done = ITEMS.filter((item) => data[item.key]).length;
  const pct = Math.round((done / total) * 100);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold tracking-tight">Pflege-Vollständigkeit</h3>
        <span className="text-sm font-medium text-muted-foreground">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {ITEMS.map((item) => {
          const ok = data[item.key];
          return (
            <li
              key={item.key}
              className={cn(
                "flex items-center gap-2",
                ok ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {ok ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
