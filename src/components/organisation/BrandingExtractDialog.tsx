"use client";

// PROJ-23 — Dialog: Website-URL eingeben → Branding (Logo + Farben) erkennen →
// in einer Vorschau bestätigen/übernehmen. Schreibt selbst nicht; übergibt das
// Ergebnis per onApply an die Branding-Felder (dort: finale Vorschau + Speichern).

import { useState } from "react";
import { toast } from "sonner";
import { Globe, Loader2, Check, CircleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractBrandingFromUrl } from "@/lib/actions/branding-extract";
import type { BrandingSuggestion } from "@/lib/branding-extract";

export function BrandingExtractDialog({
  open,
  onOpenChange,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Wird mit dem (bestätigten) Vorschlag aufgerufen; befüllt die Branding-Felder. */
  onApply: (s: BrandingSuggestion) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BrandingSuggestion | null>(null);

  function reset() {
    setUrl("");
    setResult(null);
    setLoading(false);
  }

  async function handleDetect() {
    if (!url.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const s = await extractBrandingFromUrl({ url });
      setResult(s);
      if (!s.detected.logo && !s.detected.primary && !s.detected.accent) {
        toast.warning("Es konnte kein Branding erkannt werden.", {
          description: "Du kannst die Werte manuell setzen.",
        });
      }
    } catch (e) {
      toast.error("Branding konnte nicht erkannt werden", {
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
    toast.success("Branding übernommen — bitte prüfen und speichern.");
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Branding aus Website übernehmen</DialogTitle>
          <DialogDescription>
            Website-Adresse eingeben — Logo und Markenfarben werden automatisch
            erkannt. Du prüfst alles, bevor es gespeichert wird.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="brand-url">Website</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="brand-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDetect()}
                placeholder="z. B. meinefirma.de"
                className="pl-8"
                autoFocus
              />
            </div>
            <Button onClick={handleDetect} disabled={!url.trim() || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Erkennen
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-4 rounded-lg border p-4">
            {/* Logo */}
            <Row
              label="Logo"
              ok={result.detected.logo}
              detail={
                result.logoUrl ? (
                  <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.logoUrl}
                      alt="Logo-Vorschau"
                      className="max-h-10 max-w-10 object-contain"
                    />
                  </span>
                ) : null
              }
            />
            {/* Primär */}
            <Row
              label="Primärfarbe"
              ok={result.detected.primary}
              detail={<Swatch hex={result.primaryColor} />}
            />
            {/* Akzent */}
            <Row
              label="Akzentfarbe"
              ok={result.detected.accent}
              detail={<Swatch hex={result.accentColor} />}
            />

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleApply}>Übernehmen</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium">
        {ok ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : (
          <CircleAlert className="h-4 w-4 text-amber-500" />
        )}
        {label}
      </span>
      {ok && detail ? (
        detail
      ) : (
        <span className="text-xs text-muted-foreground">nicht erkannt</span>
      )}
    </div>
  );
}

function Swatch({ hex }: { hex: string | null }) {
  if (!hex) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-2">
      <span
        className="h-6 w-6 rounded-md border"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs tabular-nums text-muted-foreground">{hex}</span>
    </span>
  );
}
