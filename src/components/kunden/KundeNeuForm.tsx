"use client";

import { useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { calculateBonitaet } from "@/lib/bonitaet";
import { createKunde } from "@/lib/actions/kunden";

type State = {
  anrede: "herr" | "frau" | "divers";
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  email: string;
  telefon: string;
  adresse: string;
  plz: string;
  stadt: string;
  bundesland: string;
  beruf_status: "angestellter" | "selbststaendiger" | "unternehmer";
  brutto_jahreseinkommen: string;
  verheiratet: boolean;
  erwachsene_im_haushalt: 1 | 2;
  kinder_anzahl: string;
  eigenkapital: string;
  kreditverpflichtungen_monatlich: string;
  bestehende_immobilien: boolean;
};

const initial: State = {
  anrede: "herr",
  vorname: "",
  nachname: "",
  geburtsdatum: "",
  email: "",
  telefon: "",
  adresse: "",
  plz: "",
  stadt: "",
  bundesland: "",
  beruf_status: "angestellter",
  brutto_jahreseinkommen: "",
  verheiratet: false,
  erwachsene_im_haushalt: 1,
  kinder_anzahl: "0",
  eigenkapital: "",
  kreditverpflichtungen_monatlich: "0",
  bestehende_immobilien: false,
};

const fmt = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

function num(v: string) {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function KundeNeuForm() {
  const router = useRouter();
  const [s, setS] = useState<State>(initial);
  const [submitting, setSubmitting] = useState(false);

  const upd = <K extends keyof State>(k: K, v: State[K]) =>
    setS((prev) => ({ ...prev, [k]: v }));

  const live = useMemo(
    () =>
      calculateBonitaet({
        brutto: num(s.brutto_jahreseinkommen),
        verheiratet: s.verheiratet,
        eigenkapital: num(s.eigenkapital),
        kreditverpflichtungen_monatlich: num(s.kreditverpflichtungen_monatlich),
        erwachsene_im_haushalt: s.erwachsene_im_haushalt,
        kinder_anzahl: Math.max(0, parseInt(s.kinder_anzahl || "0", 10)),
        beruf_status: s.beruf_status,
      }),
    [s],
  );

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
        geburtsdatum: s.geburtsdatum || null,
        email: s.email.trim() || null,
        telefon: s.telefon.trim() || null,
        adresse: s.adresse.trim() || null,
        plz: s.plz.trim() || null,
        stadt: s.stadt.trim() || null,
        bundesland: s.bundesland.trim() || null,
        beruf_status: s.beruf_status,
        brutto_jahreseinkommen: num(s.brutto_jahreseinkommen),
        verheiratet: s.verheiratet,
        erwachsene_im_haushalt: s.erwachsene_im_haushalt,
        kinder_anzahl: Math.max(0, parseInt(s.kinder_anzahl || "0", 10)),
        eigenkapital: num(s.eigenkapital),
        kreditverpflichtungen_monatlich: num(s.kreditverpflichtungen_monatlich),
        bestehende_immobilien: s.bestehende_immobilien,
      });
      toast.success("Kunde angelegt");
      router.push(`/kunden/${res.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehler beim Anlegen");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kunden" aria-label="Zurück zur Kundenliste">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">Neuer Kunde</h1>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {/* Persönlich */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-medium">Persönliche Daten</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <Label>Anrede *</Label>
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
              <div>
                <Label>Vorname *</Label>
                <Input
                  value={s.vorname}
                  onChange={(e) => upd("vorname", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Nachname *</Label>
                <Input
                  value={s.nachname}
                  onChange={(e) => upd("nachname", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Geburtsdatum</Label>
                <Input
                  type="date"
                  value={s.geburtsdatum}
                  onChange={(e) => upd("geburtsdatum", e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={s.email}
                  onChange={(e) => upd("email", e.target.value)}
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input
                  value={s.telefon}
                  onChange={(e) => upd("telefon", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Adresse</Label>
                <Input
                  value={s.adresse}
                  onChange={(e) => upd("adresse", e.target.value)}
                />
              </div>
              <div>
                <Label>PLZ</Label>
                <Input
                  value={s.plz}
                  onChange={(e) => upd("plz", e.target.value)}
                />
              </div>
              <div>
                <Label>Stadt</Label>
                <Input
                  value={s.stadt}
                  onChange={(e) => upd("stadt", e.target.value)}
                />
              </div>
              <div>
                <Label>Bundesland</Label>
                <Input
                  value={s.bundesland}
                  onChange={(e) => upd("bundesland", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Beruflich */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-medium">Beruflich & Haushalt</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <Label>Beruf-Status *</Label>
                <Select
                  value={s.beruf_status}
                  onValueChange={(v) =>
                    upd("beruf_status", v as State["beruf_status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="angestellter">Angestellter</SelectItem>
                    <SelectItem value="selbststaendiger">
                      Selbstständiger
                    </SelectItem>
                    <SelectItem value="unternehmer">Unternehmer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Brutto/Jahr (€) *</Label>
                <Input
                  inputMode="numeric"
                  value={s.brutto_jahreseinkommen}
                  onChange={(e) =>
                    upd("brutto_jahreseinkommen", e.target.value)
                  }
                  required
                />
              </div>
              <div>
                <Label>Erwachsene im Haushalt</Label>
                <Select
                  value={String(s.erwachsene_im_haushalt)}
                  onValueChange={(v) =>
                    upd("erwachsene_im_haushalt", Number(v) as 1 | 2)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kinder</Label>
                <Input
                  type="number"
                  min={0}
                  max={15}
                  value={s.kinder_anzahl}
                  onChange={(e) => upd("kinder_anzahl", e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
                <Label htmlFor="verh">Verheiratet (Splittingtarif)</Label>
                <Switch
                  id="verh"
                  checked={s.verheiratet}
                  onCheckedChange={(v) => upd("verheiratet", v)}
                />
              </div>
            </div>
          </section>

          {/* Finanziell */}
          <section className="rounded-lg border bg-card p-4">
            <h2 className="mb-3 font-medium">Finanziell</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div>
                <Label>Eigenkapital (€)</Label>
                <Input
                  inputMode="numeric"
                  value={s.eigenkapital}
                  onChange={(e) => upd("eigenkapital", e.target.value)}
                />
              </div>
              <div>
                <Label>Kredite/Monat (€)</Label>
                <Input
                  inputMode="numeric"
                  value={s.kreditverpflichtungen_monatlich}
                  onChange={(e) =>
                    upd("kreditverpflichtungen_monatlich", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="bi">Bestehende Immobilien</Label>
                <Switch
                  id="bi"
                  checked={s.bestehende_immobilien}
                  onCheckedChange={(v) => upd("bestehende_immobilien", v)}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Live-Preview */}
        <aside className="lg:sticky lg:top-20 self-start space-y-3 rounded-lg border bg-card p-4">
          <h3 className="font-medium">Bonitäts-Vorschau</h3>
          <p className="text-xs text-muted-foreground">
            Live-Berechnung. Endgültig entscheidet die Bank.
          </p>
          <dl className="space-y-2 text-sm">
            <PreviewRow
              label="Ø Steuersatz"
              v={(live.steuersatz_durchschnitt * 100).toFixed(1) + " %"}
            />
            <PreviewRow
              label="Grenzsteuer"
              v={(live.steuersatz_grenze * 100).toFixed(1) + " %"}
            />
            <PreviewRow label="Netto/Monat" v={fmt(live.netto_monat)} />
            <PreviewRow label="Lebenshaltung" v={fmt(live.lebenshaltung)} />
            <PreviewRow label="Verfügbar" v={fmt(live.verfuegbar)} />
            <PreviewRow label="Max. Rate" v={fmt(live.max_monatsrate)} />
            <PreviewRow label="Max. Darlehen" v={fmt(live.max_darlehen)} />
            <div className="mt-2 border-t pt-2">
              <PreviewRow
                label="Max. Kaufpreis"
                v={fmt(live.max_finanzierbar)}
                bold
              />
            </div>
          </dl>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Speichert …" : "Kunde anlegen"}
          </Button>
        </aside>
      </form>
    </div>
  );
}

function PreviewRow({
  label,
  v,
  bold,
}: {
  label: string;
  v: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? "font-semibold" : ""}>{v}</dd>
    </div>
  );
}
