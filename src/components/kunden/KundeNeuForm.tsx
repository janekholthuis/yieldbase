"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createKunde } from "@/lib/actions/kunden";

// Kunde anlegen erfasst bewusst nur die Stammdaten. Beruf, Einkommen, Haushalt
// und Finanzen gibt der Kunde selbst in der Selbstauskunft (Kundenportal) an —
// die Bonität wird daraus berechnet und zurückgespiegelt.
type State = {
  anrede: "herr" | "frau" | "divers";
  vorname: string;
  nachname: string;
  email: string;
};

/** Vorbefüllung + CRM-Verknüpfung aus der Close-Prefill-URL (Berater öffnet). */
export type KundePrefill = {
  vorname?: string;
  nachname?: string;
  email?: string;
  telefon?: string;
};
export type KundeCrm = {
  close_lead_id?: string;
  close_opportunity_id?: string;
  berater_vorname?: string;
  berater_nachname?: string;
};

export function KundeNeuForm({
  initial,
  crm,
}: {
  initial?: KundePrefill;
  crm?: KundeCrm;
}) {
  const router = useRouter();
  const [s, setS] = useState<State>({
    anrede: "herr",
    vorname: initial?.vorname ?? "",
    nachname: initial?.nachname ?? "",
    email: initial?.email ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const fromClose = Boolean(crm?.close_lead_id || crm?.close_opportunity_id);

  const upd = <K extends keyof State>(k: K, v: State[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!s.vorname.trim() || !s.nachname.trim()) {
      toast.error("Vor- und Nachname sind Pflicht");
      return;
    }
    setSubmitting(true);
    try {
      const res = await createKunde({
        anrede: s.anrede,
        vorname: s.vorname.trim(),
        nachname: s.nachname.trim(),
        email: s.email.trim() || null,
        telefon: initial?.telefon?.trim() || null,
        close_lead_id: crm?.close_lead_id ?? null,
        close_opportunity_id: crm?.close_opportunity_id ?? null,
        berater_vorname: crm?.berater_vorname ?? null,
        berater_nachname: crm?.berater_nachname ?? null,
      });
      toast.success("Kunde angelegt");
      router.push(`/kunden/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Anlegen");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kunden" aria-label="Zurück zur Kundenliste">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Neuer Kunde</h1>
      </div>

      {fromClose && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium">Aus Close-Lead übernommen</p>
          <p className="text-xs text-muted-foreground">
            Daten vorbefüllt. Nach dem Anlegen kannst du dem Kunden den Zugang zur
            Selbstauskunft senden (Kundenportal aktivieren → Login-Link).
          </p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        <section className="space-y-4 rounded-lg border bg-card p-4">
          <div>
            <h2 className="font-medium">Stammdaten</h2>
            <p className="text-sm text-muted-foreground">
              Nur das Nötigste. Beruf, Einkommen und Finanzen ergänzt der Kunde
              selbst in der Selbstauskunft.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <Label>Anrede</Label>
              <Select
                value={s.anrede}
                onValueChange={(v) => upd("anrede", v as State["anrede"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="herr">Herr</SelectItem>
                  <SelectItem value="frau">Frau</SelectItem>
                  <SelectItem value="divers">Divers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Vorname *</Label>
              <Input
                value={s.vorname}
                onChange={(e) => upd("vorname", e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Nachname *</Label>
              <Input
                value={s.nachname}
                onChange={(e) => upd("nachname", e.target.value)}
                required
              />
            </div>
            <div className="col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={s.email}
                onChange={(e) => upd("email", e.target.value)}
                placeholder="kunde@example.com"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Für die Aktivierung des Kundenportals erforderlich.
              </p>
            </div>
          </div>
        </section>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Speichert …" : "Kunde anlegen"}
        </Button>
      </form>
    </div>
  );
}
