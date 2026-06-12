"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  Building2,
  MessageSquare,
  User as UserIcon,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { formatEUR, formatAddress } from "@/lib/objekt-format";
import { CASE_STATUS_LABEL, type CaseStatus } from "@/lib/finanzierung-status";
import type { CaseDetail, CaseKommentar } from "@/lib/data/finanzierung";
import {
  addCaseKommentar,
  updateCaseOffer,
  updateCaseStatus,
} from "@/lib/actions/finanzierung";

const fmtEur = (n: number | null | undefined) => formatEUR(n ?? null);

const fmtPct = (n: number | null | undefined) =>
  n == null ? "—" : `${Number(n).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;

const FIN_NEXT_STATUS: CaseStatus[] = [
  "in_pruefung",
  "in_bearbeitung",
  "unterlagen_fehlen",
  "angebot_vorhanden",
  "genehmigt",
  "abgelehnt",
  "ausgezahlt",
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCase = any;

export function CaseDetailView({
  caseData,
  kommentare,
}: {
  caseData: CaseDetail;
  kommentare: CaseKommentar[];
}) {
  const c = caseData as AnyCase;
  const { roles } = useAuth();
  const isFin = roles.includes("finanzierer");
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild className="rounded-2xl">
          <Link href="/finanzierungen" aria-label="Zurück zur Übersicht">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primaryTint text-brand-primary">
          <Banknote className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-xl font-semibold tracking-tight text-brand-primary">
            Case {c.kunde?.vorname ?? ""} {c.kunde?.nachname ?? ""}
          </h1>
          <p className="text-xs text-brand-muted">
            Eingegangen {new Date(c.created_at).toLocaleDateString("de-DE")} · ID{" "}
            {String(c.id).slice(0, 8)}
          </p>
        </div>
        <Badge className="rounded-full bg-brand-primaryTint text-brand-primary border-transparent">
          {CASE_STATUS_LABEL[c.status as CaseStatus]}
        </Badge>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="angebot">Angebot</TabsTrigger>
          <TabsTrigger value="verlauf">Verlauf</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <KundenCard c={c} pseudonymize={isFin} />
          <EinheitCard c={c} />
        </TabsContent>

        <TabsContent value="angebot" className="space-y-4">
          {isFin ? (
            <OfferForm c={c} onSaved={refresh} />
          ) : (
            <OfferReadonly c={c} />
          )}
        </TabsContent>

        <TabsContent value="verlauf" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Kommentare caseId={String(c.id)} kommentare={kommentare} onSent={refresh} />
            <aside className="space-y-4">
              <StatusCard c={c} isFin={isFin} onChanged={refresh} />
              <TimelineCard c={c} />
            </aside>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-brand-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primaryTint text-brand-primary">
          {icon}
        </span>
        <h2 className="font-display text-base font-semibold tracking-tight text-brand-ink">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
        {label}
      </div>
      <div className="mt-1 text-sm text-brand-ink tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

function KundenCard({ c, pseudonymize }: { c: AnyCase; pseudonymize: boolean }) {
  const k = c.kunde ?? {};
  const name = pseudonymize
    ? `${k.vorname?.[0] ?? "?"}. ${k.nachname ?? ""}`.trim()
    : `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim();
  return (
    <Card icon={<UserIcon className="h-4 w-4" />} title="Kunde">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <KV label="Name" value={name || "—"} />
        <KV label="Beruf-Status" value={k.beruf_status ?? "—"} />
        <KV label="Familienstand" value={k.verheiratet ? "verheiratet" : "ledig"} />
        <KV label="Kinder" value={k.kinder_anzahl ?? 0} />
        <KV label="PLZ / Stadt" value={[k.plz, k.stadt].filter(Boolean).join(" ") || "—"} />
        <KV label="Bundesland" value={k.bundesland ?? "—"} />
        <KV label="Brutto/Jahr" value={fmtEur(k.brutto_jahreseinkommen)} />
        <KV label="Eigenkapital" value={fmtEur(k.eigenkapital)} />
        <KV label="Kredite/Monat" value={fmtEur(k.kreditverpflichtungen_monatlich)} />
        <KV label="Bestehende Immobilien" value={k.bestehende_immobilien ? "Ja" : "Nein"} />
        <KV label="Max. Kaufpreis" value={fmtEur(k.max_finanzierbar)} />
        <KV label="Max. Rate" value={fmtEur(k.max_monatsrate)} />
      </div>
      {pseudonymize && (
        <p className="mt-4 text-xs text-brand-muted">
          Persönliche Kontaktdaten werden erst nach Angebotsannahme freigegeben.
        </p>
      )}
    </Card>
  );
}

function EinheitCard({ c }: { c: AnyCase }) {
  const e = c.einheit ?? {};
  const p = e.projekt ?? {};
  return (
    <Card icon={<Building2 className="h-4 w-4" />} title="Objekt">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <KV label="Projekt" value={p.name ?? "—"} />
        <KV label="Wohnung" value={e.wohnungsnummer ?? "—"} />
        <KV label="Adresse" value={formatAddress(p.adresse, p.plz, p.stadt) || "—"} />
        <KV label="Etage" value={e.etage ?? "—"} />
        <KV label="Wohnfläche" value={e.wohnflaeche ? `${e.wohnflaeche} m²` : "—"} />
        <KV label="Zimmer" value={e.zimmer ?? "—"} />
        <KV label="Kaufpreis" value={fmtEur(e.kaufpreis)} />
        <KV label="Miete" value={fmtEur(e.miete)} />
        <KV label="Vermietet" value={e.vermietet ? "Ja" : "Nein"} />
        <KV label="Baujahr" value={p.baujahr ?? "—"} />
      </div>
    </Card>
  );
}

function OfferReadonly({ c }: { c: AnyCase }) {
  return (
    <Card icon={<Banknote className="h-4 w-4" />} title="Angebot">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <KV label="Zins (% p.a.)" value={fmtPct(c.zins_satz)} />
        <KV label="Tilgung (% p.a.)" value={fmtPct(c.tilgung_initial)} />
        <KV label="Laufzeit (Jahre)" value={c.laufzeit_jahre ?? "—"} />
        <KV label="Sondertilgung (% p.a.)" value={fmtPct(c.sondertilgung_pa)} />
        <KV label="Monatliche Rate" value={fmtEur(c.monatliche_rate)} />
        <KV label="Finanzierungssumme" value={fmtEur(c.finanzierungs_summe)} />
        <KV label="Gesamtkosten" value={fmtEur(c.gesamtkosten)} />
      </div>
      {c.notiz_finanzierer && (
        <div className="mt-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
            Notiz Finanzierungspartner
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-brand-ink">{c.notiz_finanzierer}</p>
        </div>
      )}
      {!c.offer_filled_at && (
        <p className="mt-4 text-sm text-brand-muted">Noch kein Angebot hinterlegt.</p>
      )}
    </Card>
  );
}

function OfferForm({ c, onSaved }: { c: AnyCase; onSaved: () => void }) {
  const [form, setForm] = useState({
    zins_satz: c.zins_satz ?? "",
    tilgung_initial: c.tilgung_initial ?? "",
    laufzeit_jahre: c.laufzeit_jahre ?? "",
    sondertilgung_pa: c.sondertilgung_pa ?? "",
    monatliche_rate: c.monatliche_rate ?? "",
    finanzierungs_summe: c.finanzierungs_summe ?? "",
    gesamtkosten: c.gesamtkosten ?? "",
    notiz_finanzierer: c.notiz_finanzierer ?? "",
  });
  const [saving, setSaving] = useState(false);

  const num = (v: string | number) => {
    if (v === "" || v == null) return null;
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateCaseOffer({
        caseId: c.id,
        zins_satz: num(form.zins_satz),
        tilgung_initial: num(form.tilgung_initial),
        laufzeit_jahre:
          form.laufzeit_jahre === "" ? null : parseInt(String(form.laufzeit_jahre), 10),
        sondertilgung_pa: num(form.sondertilgung_pa),
        monatliche_rate: num(form.monatliche_rate),
        finanzierungs_summe: num(form.finanzierungs_summe),
        gesamtkosten: num(form.gesamtkosten),
        notiz_finanzierer: form.notiz_finanzierer || null,
      });
      toast.success("Angebot gespeichert");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card icon={<Banknote className="h-4 w-4" />} title="Angebot">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Field label="Zins (% p.a.)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.zins_satz}
            onChange={(e) => setForm({ ...form, zins_satz: e.target.value })}
          />
        </Field>
        <Field label="Tilgung (% p.a.)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.tilgung_initial}
            onChange={(e) => setForm({ ...form, tilgung_initial: e.target.value })}
          />
        </Field>
        <Field label="Laufzeit (Jahre)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="numeric"
            value={form.laufzeit_jahre}
            onChange={(e) => setForm({ ...form, laufzeit_jahre: e.target.value })}
          />
        </Field>
        <Field label="Sondertilgung (% p.a.)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.sondertilgung_pa}
            onChange={(e) => setForm({ ...form, sondertilgung_pa: e.target.value })}
          />
        </Field>
        <Field label="Monatliche Rate (€)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.monatliche_rate}
            onChange={(e) => setForm({ ...form, monatliche_rate: e.target.value })}
          />
        </Field>
        <Field label="Finanzierungssumme (€)">
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.finanzierungs_summe}
            onChange={(e) => setForm({ ...form, finanzierungs_summe: e.target.value })}
          />
        </Field>
        <Field label="Gesamtkosten (€)" full>
          <Input
            className="rounded-2xl tabular-nums"
            inputMode="decimal"
            value={form.gesamtkosten}
            onChange={(e) => setForm({ ...form, gesamtkosten: e.target.value })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
          Notiz (intern für Vertriebspartner sichtbar)
        </Label>
        <Textarea
          className="mt-2 rounded-2xl"
          rows={3}
          value={form.notiz_finanzierer}
          onChange={(e) => setForm({ ...form, notiz_finanzierer: e.target.value })}
        />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-brand-muted">
          {c.offer_filled_at
            ? `Zuletzt gespeichert ${new Date(c.offer_filled_at).toLocaleString("de-DE")}`
            : "Noch nicht gespeichert"}
        </span>
        <Button onClick={save} disabled={saving} className="rounded-2xl">
          {saving ? "Speichert …" : "Angebot speichern"}
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2 md:col-span-3" : ""}>
      <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
        {label}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function StatusCard({
  c,
  isFin,
  onChanged,
}: {
  c: AnyCase;
  isFin: boolean;
  onChanged: () => void;
}) {
  const [next, setNext] = useState<CaseStatus | "">("");
  const [saving, setSaving] = useState(false);

  const apply = async () => {
    if (!next) return;
    setSaving(true);
    try {
      await updateCaseStatus({ caseId: c.id, status: next });
      toast.success("Status aktualisiert");
      setNext("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status konnte nicht gesetzt werden");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-brand-border bg-card p-5 shadow-card">
      <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
        Aktueller Status
      </div>
      <div className="mt-2 font-display text-lg font-semibold tracking-tight text-brand-primary">
        {CASE_STATUS_LABEL[c.status as CaseStatus]}
      </div>
      {isFin && (
        <div className="mt-4 space-y-2">
          <Label className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
            Status ändern
          </Label>
          <Select value={next} onValueChange={(v) => setNext(v as CaseStatus)}>
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Wählen …" />
            </SelectTrigger>
            <SelectContent>
              {FIN_NEXT_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {CASE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={apply} disabled={!next || saving} className="w-full rounded-2xl">
            {saving ? "Speichert …" : "Übernehmen"}
          </Button>
        </div>
      )}
    </section>
  );
}

function TimelineCard({ c }: { c: AnyCase }) {
  const items = useMemo(
    () =>
      [
        { label: "Eingegangen", at: c.created_at },
        { label: "Zugewiesen", at: c.assigned_at },
        { label: "Angebot gefüllt", at: c.offer_filled_at },
        { label: "Angebot akzeptiert", at: c.offer_accepted_at },
        { label: "Abgeschlossen", at: c.final_status_at },
      ].filter((i) => i.at),
    [c],
  );
  return (
    <section className="rounded-3xl border border-brand-border bg-card p-5 shadow-card">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.2em] text-brand-muted">
        Verlauf
      </div>
      <ol className="space-y-3 text-sm">
        {items.map((i) => (
          <li key={i.label} className="flex items-start gap-3">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-primary" />
            <div className="flex-1">
              <div className="text-brand-ink">{i.label}</div>
              <div className="text-xs text-brand-muted tabular-nums">
                {new Date(i.at as string).toLocaleString("de-DE")}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="text-xs text-brand-muted">Noch keine Ereignisse.</li>}
      </ol>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-borderSoft pt-4 text-sm">
        <KV label="Zins" value={fmtPct(c.zins_satz)} />
        <KV label="Tilgung" value={fmtPct(c.tilgung_initial)} />
        <KV label="Rate" value={fmtEur(c.monatliche_rate)} />
        <KV label="Summe" value={fmtEur(c.finanzierungs_summe)} />
      </div>
    </section>
  );
}

function Kommentare({
  caseId,
  kommentare,
  onSent,
}: {
  caseId: string;
  kommentare: CaseKommentar[];
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addCaseKommentar({ caseId, text: text.trim() });
      setText("");
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Senden fehlgeschlagen");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card icon={<MessageSquare className="h-4 w-4" />} title="Kommentare">
      {kommentare.length === 0 ? (
        <p className="text-sm text-brand-muted">Noch keine Kommentare.</p>
      ) : (
        <ul className="space-y-3">
          {kommentare.map((k) => (
            <li
              key={k.id}
              className="rounded-2xl border border-brand-borderSoft bg-brand-surfaceMuted p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-brand-primary">{k.author_label}</span>
                <span className="text-[11px] tabular-nums text-brand-muted">
                  {new Date(k.created_at).toLocaleString("de-DE")}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-brand-ink">{k.text}</div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Textarea
          rows={2}
          className="flex-1 rounded-2xl"
          placeholder="Notiz schreiben …"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          onClick={send}
          disabled={!text.trim() || sending}
          className="rounded-2xl sm:self-end"
        >
          <Send className="mr-1 h-4 w-4" />
          Senden
        </Button>
      </div>
    </Card>
  );
}
