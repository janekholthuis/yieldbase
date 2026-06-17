"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Circle, ChevronDown } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fehlendeFelder,
  vollstaendigkeitProzent,
  type VollstaendigkeitInput,
} from "@/lib/einheit-vollstaendigkeit";
import { setFreigabeStatus } from "@/lib/actions/objekte-crud";
import { FREIGABE_LABELS, FREIGABE_BADGE_CLASS } from "@/lib/objekt-format";
import type { EinheitDetail, EinheitFreigabeStatus } from "@/lib/data/objekte";

interface Props {
  einheit: EinheitDetail;
}

// Informative Zusatz-Signale (NICHT Teil des harten Freigabe-Gates, das nur die
// Pflichtfelder prüft — siehe einheit-vollstaendigkeit.ts).
function extraSignals(e: EinheitDetail) {
  return [
    { key: "kalkulation", label: "Kalkulations-Defaults", ok: e.kalkulation != null && Object.keys(e.kalkulation).length > 0 },
    { key: "bilder", label: "Bilder", ok: e.bilder.length > 0 },
    { key: "dokumente", label: "Dokumente", ok: e.dokumente.length > 0 },
    { key: "bank", label: "Bank-Daten", ok: e.bank_complete },
  ];
}

/** EinheitDetail → VollstaendigkeitInput (Feldnamen decken sich). */
function toInput(e: EinheitDetail): VollstaendigkeitInput {
  return {
    wohnungsnummer: e.wohnungsnummer,
    wohnflaeche: e.wohnflaeche,
    zimmer: e.zimmer,
    etage: e.etage,
    lage_im_haus: e.lage_im_haus,
    kaufpreis: e.kaufpreis,
    grundstueckswert_anteil: e.grundstueckswert_anteil,
    miete: e.miete,
    nutzungsart: e.nutzungsart,
    objektzustand: e.objektzustand,
    heizungsart: e.heizungsart,
    energieklasse: e.energieklasse,
    miteigentumsanteil: e.miteigentumsanteil,
    hausgeld_umlagefaehig: e.hausgeld_umlagefaehig,
    hausgeld_nicht_umlagefaehig: e.hausgeld_nicht_umlagefaehig,
    instandhaltungsruecklage: e.instandhaltungsruecklage,
    instandhaltungsruecklage_gesamt: e.instandhaltungsruecklage_gesamt,
    sondereigentumsverwaltung: e.sondereigentumsverwaltung,
    afa_satz: e.afa_satz,
    vermietet: e.vermietet,
    vermietet_seit: e.vermietet_seit,
    renovierungen: e.renovierungen,
    adresse: e.adresse,
    baujahr: e.baujahr,
    tags: e.tags,
    standort_highlights: e.standort_highlights,
  };
}

export function CompletenessCard({ einheit }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [freigabe, setFreigabe] = useState<EinheitFreigabeStatus>(
    einheit.freigabe_status,
  );

  const input = toInput(einheit);
  const missing = fehlendeFelder(input);
  const pct = vollstaendigkeitProzent(input);
  const freigebbar = missing.length === 0;
  const extras = extraSignals(einheit);

  function change(status: EinheitFreigabeStatus) {
    startTransition(async () => {
      try {
        await setFreigabeStatus({ id: einheit.einheit_id, status });
        setFreigabe(status);
        toast.success(
          status === "freigegeben"
            ? "Einheit freigegeben."
            : `Status: ${FREIGABE_LABELS[status]}.`,
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Statusänderung fehlgeschlagen.",
        );
      }
    });
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold tracking-tight">Pflege-Vollständigkeit</h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium",
            FREIGABE_BADGE_CLASS[freigabe],
          )}
        >
          {FREIGABE_LABELS[freigabe]}
        </span>
      </div>

      {/* Progress: Label + % inline, slim bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Pflichtfelder</span>
          <span className={cn("font-medium", freigebbar && "text-emerald-600")}>
            {freigebbar ? "vollständig" : `${pct}%`}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", freigebbar ? "bg-emerald-600" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Missing fields — collapsed by default so the card stays calm */}
      {missing.length > 0 && (
        <details className="group rounded-md border border-amber-200 bg-amber-50 text-sm dark:border-amber-900/40 dark:bg-amber-950/30">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-1.5 px-2.5 py-2 font-medium text-amber-800 dark:text-amber-300">
            <span>{missing.length} Pflichtfeld{missing.length === 1 ? "" : "er"} fehlt{missing.length === 1 ? "" : "en"}</span>
            <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 border-t border-amber-200/70 px-2.5 py-2 text-amber-800/90 dark:border-amber-900/40 dark:text-amber-200/80 sm:grid-cols-2">
            {missing.map((m) => (
              <li key={m.key} className="flex items-center gap-1.5">
                <Circle className="h-2.5 w-2.5 shrink-0" />
                <span>{m.label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Freigabe-Gate */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {freigabe !== "freigegeben" ? (
          <Button
            size="sm"
            disabled={!freigebbar || pending}
            onClick={() => change("freigegeben")}
            title={
              freigebbar
                ? "Einheit online schalten"
                : `Erst möglich, wenn alle Pflichtfelder vorhanden sind (${missing.length} fehlen)`
            }
          >
            Freigeben
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => change("entwurf")}
          >
            Zurück zu Entwurf
          </Button>
        )}
        {freigabe === "entwurf" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => change("in_bearbeitung")}
          >
            In Bearbeitung
          </Button>
        )}
        {freigabe === "in_bearbeitung" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => change("entwurf")}
          >
            Auf Entwurf
          </Button>
        )}
      </div>

      {/* Informative Zusatz-Signale — kompakte Chip-Reihe */}
      <ul className="flex flex-wrap gap-1.5 border-t pt-3 text-xs">
        {extras.map((item) => (
          <li
            key={item.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
              item.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300"
                : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {item.ok ? (
              <Check className="h-3 w-3" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
