"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, FileDown, User, Users } from "lucide-react";
import { toast } from "sonner";
import {
  listZugewieseneKundenForEinheit,
  getMyVPProfile,
  getKundePersonalisierung,
} from "@/lib/actions/objekte";
import type { EinheitDetail } from "@/lib/data/objekte";
import type { CalcDefaults } from "@/lib/kalkulation";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  einheit: EinheitDetail;
  defaults: CalcDefaults;
}

interface KundeOpt {
  id: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
}

export function ExposeModal({ open, onOpenChange, einheit, defaults }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kunden, setKunden] = useState<KundeOpt[] | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    listZugewieseneKundenForEinheit({ einheitId: einheit.einheit_id })
      .then((list) => {
        if (!cancelled) setKunden(list as KundeOpt[]);
      })
      .catch(() => {
        if (!cancelled) setKunden([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, einheit.einheit_id]);

  const generate = async (kundeId: string | null) => {
    const label = kundeId ? "Personalisiertes Exposé" : "Allgemeines Exposé";
    setBusy(kundeId ?? "general");
    try {
      const [vp, kunde] = await Promise.all([
        getMyVPProfile(),
        kundeId ? getKundePersonalisierung({ kundeId }) : Promise.resolve(null),
      ]);

      // Grundriss-Dokument suchen (kategorie='grundriss')
      const grundrissDoc = (einheit.dokumente ?? []).find(
        (d) => (d.kategorie ?? "").toLowerCase() === "grundriss",
      );
      const grundrissUrl: string | null = grundrissDoc?.url ?? null;

      // Mapbox Static Image (graceful degradation)
      const adresse = [
        einheit.adresse,
        [einheit.plz, einheit.stadt].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ");
      const { fetchStaticMapDataUrl } = await import("@/lib/mapbox");
      const mapImageDataUrl = adresse
        ? await fetchStaticMapDataUrl(adresse)
        : null;

      // Lazy-load react-pdf to keep main bundle slim (client-side only)
      const [{ pdf }, { ExposePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./ExposePdfDocument"),
      ]);

      const blob = await pdf(
        <ExposePdfDocument
          data={{
            einheit,
            kunde: kunde
              ? {
                  vorname: kunde.vorname,
                  nachname: kunde.nachname,
                  eigenkapital: kunde.eigenkapital,
                  persoenlicher_steuersatz: kunde.persoenlicher_steuersatz,
                }
              : null,
            vp,
            defaults,
            mapImageDataUrl,
            grundrissUrl,
          }}
        />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = kunde
        ? `Expose_${einheit.wohnungsnummer}_${kunde.nachname ?? "Kunde"}.pdf`
        : `Expose_${einheit.wohnungsnummer}.pdf`;
      a.href = url;
      a.download = filename.replace(/\s+/g, "_");
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`${label} erstellt`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(
        e instanceof Error ? e.message : "Exposé konnte nicht erstellt werden",
      );
    } finally {
      setBusy(null);
    }
  };

  const list = kunden ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Exposé erstellen</DialogTitle>
          <DialogDescription>
            Wähle einen zugewiesenen Kunden für ein personalisiertes Exposé, oder
            erstelle ein allgemeines Exposé ohne Kundendaten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => generate(null)}
            className="flex w-full items-center gap-3 rounded-md border p-3 text-left hover:bg-muted disabled:opacity-50"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              {busy === "general" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Users className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <div className="font-medium">Allgemeines Exposé</div>
              <div className="text-xs text-muted-foreground">
                Ohne personalisierte Kalkulation, neutral und breit teilbar.
              </div>
            </div>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="px-1 pt-2 text-xs font-semibold uppercase text-muted-foreground">
            Personalisiert
          </div>

          {loading ? (
            <Skeleton className="h-20 w-full" />
          ) : list.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              Kein Kunde zugewiesen, weise zuerst einen Kunden zu, um ein
              personalisiertes Exposé zu erstellen.
            </div>
          ) : (
            list.map((k) => {
              const name =
                `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || "(ohne Name)";
              return (
                <button
                  key={k.id}
                  type="button"
                  disabled={!!busy}
                  onClick={() => generate(k.id)}
                  className="flex w-full items-center gap-3 rounded-md border p-3 text-left hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    {busy === k.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">
                      {k.email ?? "—"}
                    </div>
                  </div>
                  <FileDown className="h-4 w-4 text-muted-foreground" />
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={!!busy}
          >
            Abbrechen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
