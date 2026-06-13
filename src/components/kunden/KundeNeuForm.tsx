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

const initial: State = {
  anrede: "herr",
  vorname: "",
  nachname: "",
  email: "",
};

export function KundeNeuForm() {
  const router = useRouter();
  const [s, setS] = useState<State>(initial);
  const [submitting, setSubmitting] = useState(false);

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
