"use client";

// PROJ-3 — Konsolidierte Projektseite (LearningSuite-Stil): Pill-Tabs statt
// Navigationstiefe. Der Tab "Einheiten" ist ein Master-Detail: Liste links,
// Detail der gewählten Wohnung rechts (lazy geladen, volle Einheit-Funktionen
// via EinheitDetailView embedded). Ersetzt die separate Einheiten-Unterseite.

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, ChevronDown, Layers } from "lucide-react";

import { VerkaufsstatusTabelle } from "@/components/objekte/VerkaufsstatusTabelle";
import { KarteTab } from "@/components/objekte/KarteTab";
import { StandortHighlights } from "@/components/objekte/StandortHighlights";
import { BankDatenCard } from "@/components/objekte/BankDatenCard";
import { FinanziererPoolTab } from "@/components/objekte/FinanziererPoolTab";
import { EinheitDetailView } from "@/components/objekte/EinheitDetailView";
import { getEinheitDetailAction } from "@/lib/actions/objekte";
import { useAuth } from "@/lib/auth-context";
import {
  STATUS_LABELS,
  formatEUR,
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

  const selected = units.find((u) => u.einheit_id === selectedId) ?? null;

  // ImmoScout-Stil, einspaltig: Anzahl Einheiten groß + Wechsel-Dropdown oben
  // rechts; darunter die gewählte Wohnung in voller Breite.
  return (
    <div className="space-y-4">
      {/* Kopfzeile: Anzahl groß (links) · Einheit-Wechsel-Dropdown (rechts) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-accent/10 text-brand-accent">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <div className="text-xl font-semibold leading-tight tracking-tight">
              {units.length} Einheiten
            </div>
            <div className="text-sm text-muted-foreground">{statusSummary}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Einheit wechseln
          </span>
          <Select
            value={selectedId ?? undefined}
            onValueChange={(v) => setSelectedId(v)}
          >
            <SelectTrigger className="w-[260px] sm:w-[300px]">
              <SelectValue placeholder="Wohnung wählen" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.einheit_id} value={u.einheit_id}>
                  Wohnung {u.wohnungsnummer} · {STATUS_LABELS[u.status]}
                  {u.kaufpreis != null ? ` · ${formatEUR(u.kaufpreis)}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Verkaufsstatus-Breakdown — verfügbar, aber eingeklappt */}
      <details className="group rounded-xl border bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-sm">
          <span className="font-medium">Verkaufsstatus-Übersicht</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t p-3">
          <VerkaufsstatusTabelle einheiten={units} />
        </div>
      </details>

      {/* Gewählte Wohnung — volle Breite (ImmoScout-Listing-Stil) */}
      {selected ? (
        <UnitDetailPane
          key={selected.einheit_id}
          einheitId={selected.einheit_id}
          kalkContext={kalkContext}
        />
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
