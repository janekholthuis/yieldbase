"use client";

// PROJ-3 — Konsolidierte Projektseite (LearningSuite-Stil): Pill-Tabs statt
// Navigationstiefe. Der Tab "Einheiten" ist ein Master-Detail: Liste links,
// Detail der gewählten Wohnung rechts (lazy geladen, volle Einheit-Funktionen
// via EinheitDetailView embedded). Ersetzt die separate Einheiten-Unterseite.

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, ChevronDown } from "lucide-react";

import { VerkaufsstatusTabelle } from "@/components/objekte/VerkaufsstatusTabelle";
import { KarteTab } from "@/components/objekte/KarteTab";
import { StandortHighlights } from "@/components/objekte/StandortHighlights";
import { BankDatenCard } from "@/components/objekte/BankDatenCard";
import { FinanziererPoolTab } from "@/components/objekte/FinanziererPoolTab";
import { EinheitDetailView } from "@/components/objekte/EinheitDetailView";
import { getEinheitDetailAction } from "@/lib/actions/objekte";
import { useAuth } from "@/lib/auth-context";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  FREIGABE_BADGE_CLASS,
  FREIGABE_LABELS,
  formatEUR,
  formatNumber,
} from "@/lib/objekt-format";
import type {
  ProjektDetail,
  EinheitDetail,
  ObjektListItem,
} from "@/lib/data/objekte";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";

const PILL =
  "rounded-full px-4 data-[state=active]:bg-brand-accent data-[state=active]:text-white";

export function ProjektTabs({
  projekt,
  kalkContext,
  initialEinheitId,
}: {
  projekt: ProjektDetail;
  kalkContext: KalkulationsContext;
  initialEinheitId?: string;
}) {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("support");
  const units = projekt.einheiten;

  return (
    <Tabs defaultValue="einheiten" className="space-y-5">
      <TabsList className="h-auto flex-wrap gap-1 rounded-full bg-brand-surfaceMuted p-1">
        <TabsTrigger value="einheiten" className={PILL}>
          Einheiten
        </TabsTrigger>
        <TabsTrigger value="lage" className={PILL}>
          Lage
        </TabsTrigger>
        {isAdmin && (
          <>
            <TabsTrigger value="bankdaten" className={PILL}>
              Bankdaten
            </TabsTrigger>
            <TabsTrigger value="pool" className={PILL}>
              Finanzierer-Pool
            </TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="einheiten">
        <EinheitenMasterDetail
          units={units}
          kalkContext={kalkContext}
          initialEinheitId={initialEinheitId}
        />
      </TabsContent>

      <TabsContent value="lage" className="space-y-4">
        <KarteTab adresse={projekt.adresse} plz={projekt.plz} stadt={projekt.stadt} />
        <StandortHighlights
          adresse={projekt.adresse}
          plz={projekt.plz}
          stadt={projekt.stadt}
        />
      </TabsContent>

      {isAdmin && (
        <>
          <TabsContent value="bankdaten" className="space-y-4">
            <BankDatenCard projektId={projekt.id} />
          </TabsContent>
          <TabsContent value="pool" className="space-y-4">
            <FinanziererPoolTab projektId={projekt.id} />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Master-Detail: Einheiten-Liste (links) + Detail der gewählten Wohnung (rechts)
// ---------------------------------------------------------------------------

function EinheitenMasterDetail({
  units,
  kalkContext,
  initialEinheitId,
}: {
  units: ObjektListItem[];
  kalkContext: KalkulationsContext;
  initialEinheitId?: string;
}) {
  const firstValid = useMemo(() => {
    if (initialEinheitId && units.some((u) => u.einheit_id === initialEinheitId))
      return initialEinheitId;
    return units[0]?.einheit_id ?? null;
  }, [initialEinheitId, units]);

  const [selectedId, setSelectedId] = useState<string | null>(firstValid);

  // Tiefen-Link in der URL halten (ohne Server-Roundtrip), damit ein Einheiten-
  // Link / Reload die richtige Wohnung wieder öffnet.
  useEffect(() => {
    if (!selectedId || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("einheit", selectedId);
    window.history.replaceState(null, "", url.toString());
  }, [selectedId]);

  if (units.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Einheiten in diesem Projekt.
      </div>
    );
  }

  // Einzel-Einheit (häufig bei etw_einzeln): direkt das Detail.
  if (units.length === 1 && selectedId) {
    return <UnitDetailPane einheitId={selectedId} kalkContext={kalkContext} />;
  }

  // Verkaufsstatus-Kurzfassung (z. B. „14 frei · 4 reserviert · 6 verkauft").
  const statusSummary = (() => {
    const counts = new Map<string, number>();
    for (const u of units) counts.set(u.status, (counts.get(u.status) ?? 0) + 1);
    return [...counts.entries()]
      .map(([s, n]) => `${n} ${STATUS_LABELS[s as keyof typeof STATUS_LABELS] ?? s}`)
      .join(" · ");
  })();

  // Einspaltig: kompakter Status + horizontaler Einheiten-Wähler oben, Detail
  // darunter in voller Breite (kein Splitscreen / keine zweite Spalte mehr).
  return (
    <div className="space-y-4">
      {/* Verkaufsstatus — Kurzfassung, Breakdown ausklappbar */}
      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm">
          <span className="font-medium">Verkaufsstatus</span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="hidden sm:inline">{statusSummary}</span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="border-t p-3">
          <VerkaufsstatusTabelle einheiten={units} />
        </div>
      </details>

      {/* Einheiten-Wähler: horizontal scrollbar */}
      <div className="rounded-xl border bg-card p-2">
        <div className="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {units.length} Einheiten — Wohnung wählen
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {units.map((u) => {
            const active = u.einheit_id === selectedId;
            return (
              <button
                key={u.einheit_id}
                type="button"
                onClick={() => setSelectedId(u.einheit_id)}
                className={`flex shrink-0 flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-brand-accent bg-brand-accent/10"
                    : "hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{u.wohnungsnummer}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_BADGE_CLASS[u.status]}`}
                  >
                    {STATUS_LABELS[u.status]}
                  </span>
                  {u.freigabe_status !== "freigegeben" && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${FREIGABE_BADGE_CLASS[u.freigabe_status]}`}
                    >
                      {FREIGABE_LABELS[u.freigabe_status]}
                    </span>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                  {[
                    formatNumber(u.zimmer, " Zi"),
                    formatNumber(u.wohnflaeche, " m²"),
                    formatEUR(u.kaufpreis),
                  ]
                    .filter((s) => s && s !== "—")
                    .join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail der gewählten Wohnung — volle Breite */}
      {selectedId ? (
        <UnitDetailPane einheitId={selectedId} kalkContext={kalkContext} />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Wähle oben eine Wohnung.
        </div>
      )}
    </div>
  );
}

function UnitDetailPane({
  einheitId,
  kalkContext,
}: {
  einheitId: string;
  kalkContext: KalkulationsContext;
}) {
  const [detail, setDetail] = useState<EinheitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEinheitDetailAction({ einheitId })
      .then((res) => {
        if (cancelled) return;
        if (res.error || !res.einheit) {
          setError(res.error ?? "Einheit nicht gefunden");
          setDetail(null);
        } else {
          setDetail(res.einheit);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Fehler");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [einheitId]);

  if (loading && !detail) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        <MapPin className="h-4 w-4" /> {error ?? "Einheit nicht gefunden"}
      </div>
    );
  }

  return <EinheitDetailView einheit={detail} kalkContext={kalkContext} embedded />;
}
