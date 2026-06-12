"use client";

// Bank details for the Reservierungsgebühr — read/write on the projekt row.
// RLS (authed client in the actions) gates who may persist changes.
import { useEffect, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  getProjektBank,
  updateProjektBank,
  type ProjektBank,
} from "@/lib/actions/projekt-bank";

export function BankDatenCard({ projektId }: { projektId: string }) {
  const [bank, setBank] = useState<ProjektBank>({
    kontoinhaber: "",
    iban: "",
    bic: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getProjektBank(projektId)
      .then((b) => {
        if (!cancelled)
          setBank({
            kontoinhaber: b.kontoinhaber ?? "",
            iban: b.iban ?? "",
            bic: b.bic ?? "",
          });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projektId]);

  const set = (k: keyof ProjektBank, v: string) =>
    setBank((p) => ({ ...p, [k]: v }));

  async function handleSave() {
    setSaving(true);
    try {
      await updateProjektBank({
        projektId,
        kontoinhaber: bank.kontoinhaber,
        iban: bank.iban,
        bic: bank.bic,
      });
      toast.success("Bank-Daten gespeichert");
    } catch (e) {
      toast.error("Speichern fehlgeschlagen", {
        description: e instanceof Error ? e.message : "Bitte erneut versuchen.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold tracking-tight">
          Bank-Daten (Reservierungsgebühr)
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Diese Bankverbindung wird für die Reservierungsgebühr verwendet und gilt
        für das gesamte Projekt.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen …
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bank-kontoinhaber">Kontoinhaber</Label>
            <Input
              id="bank-kontoinhaber"
              value={bank.kontoinhaber ?? ""}
              onChange={(e) => set("kontoinhaber", e.target.value)}
              placeholder="z. B. Muster Vertrieb GmbH"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bank-iban">IBAN</Label>
              <Input
                id="bank-iban"
                value={bank.iban ?? ""}
                onChange={(e) => set("iban", e.target.value)}
                placeholder="DE00 0000 0000 0000 0000 00"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank-bic">BIC</Label>
              <Input
                id="bank-bic"
                value={bank.bic ?? ""}
                onChange={(e) => set("bic", e.target.value)}
                placeholder="XXXXDEXXXXX"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
