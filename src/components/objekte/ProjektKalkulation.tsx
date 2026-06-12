"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KalkulationsTab } from "@/components/objekte/KalkulationsTab";
import { getEinheitKalkulation } from "@/lib/actions/objekte";
import { STATUS_LABELS, formatEUR } from "@/lib/objekt-format";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import type { ObjektListItem, KalkulationsEinheit } from "@/lib/data/objekte";

export function ProjektKalkulation({
  einheiten,
  kalkContext,
}: {
  einheiten: ObjektListItem[];
  kalkContext: KalkulationsContext;
}) {
  const [selectedId, setSelectedId] = useState<string>(
    einheiten[0]?.einheit_id ?? "",
  );
  const [einheit, setEinheit] = useState<KalkulationsEinheit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getEinheitKalkulation({ einheitId: selectedId })
      .then((data) => {
        if (cancelled) return;
        if (!data) setError("Einheit konnte nicht geladen werden.");
        setEinheit(data);
      })
      .catch(() => {
        if (!cancelled) setError("Einheit konnte nicht geladen werden.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  if (einheiten.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Noch keine Einheiten zum Kalkulieren.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            Wohneinheit für die Kalkulation
          </Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-[360px]">
              <SelectValue placeholder="Einheit wählen" />
            </SelectTrigger>
            <SelectContent>
              {einheiten.map((u) => (
                <SelectItem key={u.einheit_id} value={u.einheit_id}>
                  Wohnung {u.wohnungsnummer}
                  {u.kaufpreis != null && ` · ${formatEUR(u.kaufpreis)}`}
                  {` · ${STATUS_LABELS[u.status]}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !einheit ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Kalkulation wird geladen …
        </div>
      ) : einheit ? (
        <div className={loading ? "opacity-60 transition-opacity" : undefined}>
          <KalkulationsTab
            key={selectedId}
            einheit={einheit}
            kalkContext={kalkContext}
          />
        </div>
      ) : null}
    </div>
  );
}
