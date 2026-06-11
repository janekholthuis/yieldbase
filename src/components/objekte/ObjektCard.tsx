import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { ObjektListItem } from "@/lib/data/objekte";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatEUR,
  formatNumber,
  pricePerSqm,
} from "@/lib/objekt-format";
import { Building2 } from "lucide-react";

export function ObjektCard({ item }: { item: ObjektListItem }) {
  const ppsm = pricePerSqm(item.kaufpreis, item.wohnflaeche);

  return (
    <Link
      href={`/objekte/${item.einheit_id}`}
      className="group block focus:outline-none"
    >
      <Card className="overflow-hidden transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-ring h-full flex flex-col">
        {/* Cover */}
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          {item.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover_image_url}
              alt={item.projekt_name ?? "Objekt"}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Building2 className="h-8 w-8" />
            </div>
          )}
          {item.mietrendite_brutto != null && (
            <span className="absolute right-2 top-2 rounded-md bg-accent px-2 py-1 text-xs font-semibold text-accent-foreground shadow">
              {formatNumber(item.mietrendite_brutto, " %")}
            </span>
          )}
          <span
            className={`absolute bottom-2 left-2 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[item.status]}`}
          >
            {STATUS_LABELS[item.status]}
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div>
            <h3 className="font-semibold leading-tight">
              Wohnung {item.wohnungsnummer}
              {item.projekt_name ? (
                <span className="text-muted-foreground"> · {item.projekt_name}</span>
              ) : null}
            </h3>
            <p className="text-sm text-muted-foreground">
              {[item.stadt, item.plz].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {item.wohnflaeche != null && (
              <Pill>{formatNumber(item.wohnflaeche, " m²")}</Pill>
            )}
            {item.zimmer != null && <Pill>{formatNumber(item.zimmer, " Zi")}</Pill>}
            {item.etage != null && <Pill>Etage {item.etage}</Pill>}
            {item.vermietet && <Pill>Vermietet</Pill>}
          </div>

          <div className="mt-auto flex items-end justify-between pt-2">
            <div>
              <div className="text-lg font-bold">{formatEUR(item.kaufpreis)}</div>
              {ppsm != null && (
                <div className="text-xs text-muted-foreground">
                  {formatEUR(Math.round(ppsm))}/m²
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-muted/50 px-2 py-0.5 text-muted-foreground">
      {children}
    </span>
  );
}
