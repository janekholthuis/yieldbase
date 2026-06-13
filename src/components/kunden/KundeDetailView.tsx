"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Building2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { calculateBonitaet } from "@/lib/bonitaet";
import { formatEUR } from "@/lib/objekt-format";
import {
  updateBonitaet,
  activateKundenportal,
} from "@/lib/actions/kunden";
import {
  listKundenZuweisungen,
  getEmpfehlungen,
} from "@/lib/actions/objekte";
import type { KundeDetail } from "@/lib/data/kunden";
import type {
  KundeZuweisungItem,
  EmpfehlungItem,
} from "@/lib/data/objekte-extra-types";
import { EmpfehlungCard } from "@/components/kunden/EmpfehlungCard";
import { KundenDokumenteListe } from "@/components/kunden-dokumente/KundenDokumenteListe";

const STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  aktiviert: "Aktiviert",
  bonitaet_geprueft: "Bonität geprüft",
  reserviert: "Reserviert",
  beurkundet: "Beurkundet",
};

const STATUS_BADGE: Record<string, string> = {
  zugewiesen: "Zugewiesen",
  kalkulation_erstellt: "Kalkulation erstellt",
  praesentation_gehalten: "Präsentation gehalten",
  reserviert: "Reserviert",
  verkauft: "Verkauft",
  abgelehnt: "Abgelehnt",
};

const fmt = formatEUR;

function num(v: string) {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function KundeDetailView({
  kunde,
  currentUserId,
}: {
  kunde: KundeDetail;
  currentUserId: string;
}) {
  const router = useRouter();
  const [activating, setActivating] = useState(false);
  const k = kunde;

  const fullName =
    `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || "(ohne Name)";

  const activate = async () => {
    setActivating(true);
    try {
      const res = await activateKundenportal({ id: k.id });
      toast.success(
        res.magicLinkSent
          ? "Kundenportal aktiviert, Magic-Link versandt"
          : "Kundenportal aktiviert (Magic-Link nicht versandt)",
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aktivierung fehlgeschlagen");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/kunden" aria-label="Zurück zur Kundenliste">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{fullName}</h1>
        <Badge variant="outline">{STATUS_LABEL[k.status] ?? k.status}</Badge>
        <div className="ml-auto">
          {!k.user_id ? (
            <Button onClick={activate} disabled={activating}>
              <KeyRound className="mr-1 h-4 w-4" />
              {activating ? "Aktiviert …" : "Kundenportal aktivieren"}
            </Button>
          ) : (
            <Badge variant="secondary">Portal aktiv</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="daten">
        <TabsList>
          <TabsTrigger value="daten">Daten</TabsTrigger>
          <TabsTrigger value="selbstauskunft">Selbstauskunft</TabsTrigger>
          <TabsTrigger value="bonitaet">Bonität</TabsTrigger>
          <TabsTrigger value="zuweisungen">Zuweisungen</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
        </TabsList>

        <TabsContent value="daten" className="space-y-4">
          <section className="grid gap-4 md:grid-cols-3">
            <Stat label="Brutto/Jahr" value={fmt(k.brutto_jahreseinkommen)} />
            <Stat label="Eigenkapital" value={fmt(k.eigenkapital)} />
            <Stat
              label="Max. Kaufpreis"
              value={fmt(k.max_finanzierbar)}
              highlight
            />
          </section>
          <section className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-medium">Kontakt</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <KV label="Email" v={k.email} />
              <KV label="Telefon" v={k.telefon} />
              <KV label="Geburtsdatum" v={k.geburtsdatum} />
              <KV label="Adresse" v={k.adresse} />
              <KV
                label="PLZ / Stadt"
                v={[k.plz, k.stadt].filter(Boolean).join(" ") || null}
              />
              <KV label="Bundesland" v={k.bundesland} />
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="selbstauskunft">
          <SelbstauskunftTab k={k} />
        </TabsContent>

        <TabsContent value="bonitaet">
          <BonitaetTab k={k} onSaved={() => router.refresh()} />
        </TabsContent>

        <TabsContent value="zuweisungen">
          <ZuweisungenTab kundeId={k.id} />
        </TabsContent>

        <TabsContent value="dokumente">
          <KundenDokumenteListe
            kundeId={k.id}
            berufStatus={k.beruf_status}
            canUpload
            currentUserId={currentUserId}
            showUploader
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${highlight ? "border-primary/40" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function KV({ label, v }: { label: string; v: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{v || "—"}</dd>
    </div>
  );
}

const BERUF_LABEL: Record<string, string> = {
  angestellter: "Angestellt",
  selbststaendiger: "Selbstständig",
  unternehmer: "Unternehmer",
};

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
}

/** Read-only view of the customer's self-disclosure (filled in the portal). */
function SelbstauskunftTab({ k }: { k: KundeDetail }) {
  const submitted = k.selbstauskunft_submitted_at;
  const step = k.selbstauskunft_step ?? 0;
  const hasAny =
    submitted != null ||
    step > 0 ||
    k.beruf_status != null ||
    k.brutto_jahreseinkommen != null ||
    k.eigenkapital != null;

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <h3 className="font-medium">Selbstauskunft</h3>
          <p className="text-sm text-muted-foreground">
            {submitted
              ? `Eingereicht am ${fmtDate(submitted)}`
              : step > 0
                ? `In Bearbeitung (Schritt ${step})`
                : "Noch nicht ausgefüllt"}
          </p>
        </div>
        <Badge variant={submitted ? "default" : "outline"}>
          {submitted ? "Vollständig" : step > 0 ? "In Bearbeitung" : "Offen"}
        </Badge>
      </section>

      {!hasAny ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Der Kunde hat die Selbstauskunft im Portal noch nicht begonnen.
        </div>
      ) : (
        <>
          <section className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-medium">Angaben des Kunden</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
              <KV
                label="Beruflicher Status"
                v={
                  k.beruf_status
                    ? (BERUF_LABEL[k.beruf_status] ?? k.beruf_status)
                    : null
                }
              />
              <KV
                label="Brutto / Jahr"
                v={k.brutto_jahreseinkommen != null ? fmt(k.brutto_jahreseinkommen) : null}
              />
              <KV
                label="Eigenkapital"
                v={k.eigenkapital != null ? fmt(k.eigenkapital) : null}
              />
              <KV
                label="Pers. Steuersatz"
                v={
                  k.persoenlicher_steuersatz != null
                    ? `${k.persoenlicher_steuersatz} %`
                    : null
                }
              />
              <KV
                label="Kreditverpflichtungen / Monat"
                v={
                  k.kreditverpflichtungen_monatlich != null
                    ? fmt(k.kreditverpflichtungen_monatlich)
                    : null
                }
              />
              <KV
                label="Erwachsene im Haushalt"
                v={
                  k.erwachsene_im_haushalt != null
                    ? String(k.erwachsene_im_haushalt)
                    : null
                }
              />
              <KV
                label="Kinder"
                v={k.kinder_anzahl != null ? String(k.kinder_anzahl) : null}
              />
              <KV
                label="Bestehende Immobilien"
                v={k.bestehende_immobilien ? "Ja" : "Nein"}
              />
            </dl>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <Stat label="Max. Kaufpreis" value={fmt(k.max_finanzierbar)} highlight />
            <Stat label="Max. Monatsrate" value={fmt(k.max_monatsrate)} />
            <Stat label="Max. Darlehen" value={fmt(k.max_darlehen)} />
          </section>
        </>
      )}
    </div>
  );
}

function BonitaetTab({
  k,
  onSaved,
}: {
  k: KundeDetail;
  onSaved: () => void;
}) {
  const [brutto, setBrutto] = useState(String(k.brutto_jahreseinkommen ?? ""));
  const [verheiratet, setVerheiratet] = useState(!!k.verheiratet);
  const [erw, setErw] = useState<1 | 2>(
    (k.erwachsene_im_haushalt ?? 1) as 1 | 2,
  );
  const [kinder, setKinder] = useState(String(k.kinder_anzahl ?? 0));
  const [ek, setEk] = useState(String(k.eigenkapital ?? ""));
  const [kredite, setKredite] = useState(
    String(k.kreditverpflichtungen_monatlich ?? 0),
  );
  const [beruf, setBeruf] = useState<
    "angestellter" | "selbststaendiger" | "unternehmer"
  >(
    (k.beruf_status as
      | "angestellter"
      | "selbststaendiger"
      | "unternehmer") ?? "angestellter",
  );
  const [bestImm, setBestImm] = useState(!!k.bestehende_immobilien);
  const [saving, setSaving] = useState(false);

  const live = useMemo(
    () =>
      calculateBonitaet({
        brutto: num(brutto),
        verheiratet,
        eigenkapital: num(ek),
        kreditverpflichtungen_monatlich: num(kredite),
        erwachsene_im_haushalt: erw,
        kinder_anzahl: Math.max(0, parseInt(kinder || "0", 10)),
        beruf_status: beruf,
      }),
    [brutto, verheiratet, ek, kredite, erw, kinder, beruf],
  );

  const save = async () => {
    setSaving(true);
    try {
      await updateBonitaet({
        id: k.id,
        beruf_status: beruf,
        brutto_jahreseinkommen: num(brutto),
        verheiratet,
        erwachsene_im_haushalt: erw,
        kinder_anzahl: Math.max(0, parseInt(kinder || "0", 10)),
        eigenkapital: num(ek),
        kreditverpflichtungen_monatlich: num(kredite),
        bestehende_immobilien: bestImm,
      });
      toast.success("Bonität aktualisiert");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="font-medium">Eingaben</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <div>
            <Label>Beruf-Status</Label>
            <Select
              value={beruf}
              onValueChange={(v) => setBeruf(v as typeof beruf)}
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
            <Label>Brutto/Jahr (€)</Label>
            <Input
              value={brutto}
              onChange={(e) => setBrutto(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>Eigenkapital (€)</Label>
            <Input
              value={ek}
              onChange={(e) => setEk(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>Kredite/Monat (€)</Label>
            <Input
              value={kredite}
              onChange={(e) => setKredite(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <Label>Erwachsene</Label>
            <Select
              value={String(erw)}
              onValueChange={(v) => setErw(Number(v) as 1 | 2)}
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
              value={kinder}
              onChange={(e) => setKinder(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
            <Label>Verheiratet</Label>
            <Switch checked={verheiratet} onCheckedChange={setVerheiratet} />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label>Bestehende Immobilien</Label>
            <Switch checked={bestImm} onCheckedChange={setBestImm} />
          </div>
        </div>
        <Button onClick={save} disabled={saving}>
          <RefreshCw className="mr-1 h-4 w-4" />
          {saving ? "Aktualisiert …" : "Bonität neu berechnen & speichern"}
        </Button>
      </section>

      <aside className="self-start space-y-2 rounded-lg border bg-card p-4 text-sm">
        <h3 className="font-medium">Berechnung (Live)</h3>
        <Row
          label="Ø Steuersatz"
          v={(live.steuersatz_durchschnitt * 100).toFixed(1) + " %"}
        />
        <Row
          label="Grenzsteuer"
          v={(live.steuersatz_grenze * 100).toFixed(1) + " %"}
        />
        <Row label="Netto/Jahr" v={fmt(live.netto_jahr)} />
        <Row label="Netto/Monat" v={fmt(live.netto_monat)} />
        <Row label="− Lebenshaltung" v={fmt(live.lebenshaltung)} />
        <Row label="= Verfügbar" v={fmt(live.verfuegbar)} />
        <Row label="× 35 % Banker" v={fmt(live.max_monatsrate)} />
        <Row
          label="Max. Darlehen (6 % Annuität)"
          v={fmt(live.max_darlehen)}
        />
        <div className="mt-2 border-t pt-2">
          <Row label="Max. Kaufpreis" v={fmt(live.max_finanzierbar)} bold />
        </div>
        <p className="pt-2 text-xs text-muted-foreground">
          Grobe Schätzung, die Bank entscheidet endgültig.
        </p>
      </aside>
    </div>
  );
}

function Row({
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
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{v}</span>
    </div>
  );
}

function ZuweisungenTab({ kundeId }: { kundeId: string }) {
  const [zuweisungen, setZuweisungen] = useState<KundeZuweisungItem[] | null>(
    null,
  );
  const [empfehlungen, setEmpfehlungen] = useState<EmpfehlungItem[] | null>(
    null,
  );
  const [maxFin, setMaxFin] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [z, e] = await Promise.all([
          listKundenZuweisungen({ kundeId }),
          getEmpfehlungen({ kundeId }),
        ]);
        if (cancelled) return;
        setZuweisungen(z);
        setEmpfehlungen(e.items);
        setMaxFin(e.max_finanzierbar);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Laden fehlgeschlagen");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kundeId]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Zugewiesene Objekte
            {zuweisungen && zuweisungen.length > 0 && (
              <span className="ml-2 text-sm text-muted-foreground">
                ({zuweisungen.length})
              </span>
            )}
          </h3>
        </div>
        {zuweisungen === null ? (
          <Skeleton className="h-24 w-full" />
        ) : zuweisungen.length === 0 ? (
          <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Noch keine Objekte zugewiesen. Im Objekt-Detail über „Kunde
            zuweisen“ verknüpfen.
          </p>
        ) : (
          <ul className="divide-y">
            {zuweisungen.map((z) => (
              <ZuweisungRow key={z.id} z={z} />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-medium">
          Empfehlungen
          {maxFin != null && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              · max. Finanzierungsrahmen {fmt(maxFin)}
            </span>
          )}
        </h3>
        {empfehlungen === null ? (
          <Skeleton className="h-64 w-full" />
        ) : empfehlungen.length === 0 ? (
          <p className="rounded-md border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Keine passenden Empfehlungen gefunden.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {empfehlungen.map((it) => (
              <EmpfehlungCard
                key={it.einheit_id}
                item={it}
                kundeId={kundeId}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ZuweisungRow({ z }: { z: KundeZuweisungItem }) {
  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Link
          href={`/objekte/${z.einheit_id}`}
          className="flex flex-1 items-center gap-3 hover:opacity-80"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
            {z.einheit?.cover_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={z.einheit.cover_image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              {z.einheit?.wohnungsnummer ?? "—"}
              {z.einheit?.projekt_name && (
                <span className="text-muted-foreground">
                  {" "}
                  · {z.einheit.projekt_name}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {z.einheit?.stadt ?? "—"} · {fmt(z.einheit?.kaufpreis ?? null)} ·{" "}
              {new Date(z.created_at).toLocaleDateString("de-DE")}
            </div>
          </div>
        </Link>
        <Badge variant="outline">{STATUS_BADGE[z.status] ?? z.status}</Badge>
        <Button asChild size="sm" variant="ghost">
          <Link href={`/objekte/${z.einheit_id}`}>
            <ExternalLink className="mr-1 h-4 w-4" /> Zur Einheit
          </Link>
        </Button>
      </div>
    </li>
  );
}

