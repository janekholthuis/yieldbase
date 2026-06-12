"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import type { PortalDashboard } from "@/lib/data/portal";
import { calculateBonitaet } from "@/lib/bonitaet";
import {
  saveSelbstauskunftStep,
  submitSelbstauskunft,
} from "@/lib/actions/portal";
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
import { ArrowLeft, ArrowRight, CheckCircle2, Pencil } from "lucide-react";

type Familienstand = "ledig" | "verheiratet" | "geschieden" | "verwitwet";

interface FormState {
  anrede: "herr" | "frau" | "divers" | "";
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  familienstand: Familienstand | "";
  adresse: string;
  plz: string;
  stadt: string;
  bundesland: string;
  telefon: string;
  beruf_status: "angestellter" | "selbststaendiger" | "unternehmer" | "";
  brutto_jahreseinkommen: string;
  erwachsene_im_haushalt: string;
  kinder_anzahl: string;
  bestehende_immobilien: string;
  eigenkapital: string;
  kreditverpflichtungen_monatlich: string;
}

const STEP_TITLES = [
  "Persönliche Daten",
  "Beruf und Einkommen",
  "Haushalt",
  "Vermögen und Verpflichtungen",
  "Zusammenfassung",
];

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat("de-DE").format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

const parseNum = (s: string): number => {
  const cleaned = s.replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

type Kunde = PortalDashboard["kunde"];

function buildInitialForm(k: Kunde): FormState {
  return {
    anrede: (k?.anrede as FormState["anrede"]) ?? "",
    vorname: k?.vorname ?? "",
    nachname: k?.nachname ?? "",
    geburtsdatum: k?.geburtsdatum ?? "",
    familienstand: "",
    adresse: k?.adresse ?? "",
    plz: k?.plz ?? "",
    stadt: k?.stadt ?? "",
    bundesland: k?.bundesland ?? "",
    telefon: k?.telefon ?? "",
    beruf_status: (k?.beruf_status as FormState["beruf_status"]) ?? "",
    brutto_jahreseinkommen:
      k?.brutto_jahreseinkommen != null
        ? fmtNum(Number(k.brutto_jahreseinkommen))
        : "",
    erwachsene_im_haushalt: "1",
    kinder_anzahl: "0",
    bestehende_immobilien: "false",
    eigenkapital: k?.eigenkapital != null ? fmtNum(Number(k.eigenkapital)) : "",
    kreditverpflichtungen_monatlich: "0",
  };
}

export function SelbstauskunftWizard({ kunde }: { kunde: Kunde }) {
  const router = useRouter();

  const [step, setStep] = useState(() =>
    Math.min(4, Math.max(0, kunde?.selbstauskunft_step ?? 0)),
  );
  const [form, setForm] = useState<FormState>(() => buildInitialForm(kunde));
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const alreadySubmitted = !!kunde?.selbstauskunft_submitted_at;

  // Live-Bonität für Step 5
  const bon = useMemo(() => {
    if (!form.beruf_status || !form.brutto_jahreseinkommen || !form.eigenkapital)
      return null;
    return calculateBonitaet({
      brutto: parseNum(form.brutto_jahreseinkommen),
      verheiratet: form.familienstand === "verheiratet",
      eigenkapital: parseNum(form.eigenkapital),
      kreditverpflichtungen_monatlich: parseNum(
        form.kreditverpflichtungen_monatlich,
      ),
      erwachsene_im_haushalt: (Number(form.erwachsene_im_haushalt) === 2
        ? 2
        : 1) as 1 | 2,
      kinder_anzahl: Number(form.kinder_anzahl) || 0,
      beruf_status: form.beruf_status,
    });
  }, [form]);

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.vorname.trim()) return "Vorname ist Pflicht.";
      if (!form.nachname.trim()) return "Nachname ist Pflicht.";
      if (!form.geburtsdatum) return "Geburtsdatum ist Pflicht.";
      if (!form.familienstand) return "Familienstand ist Pflicht.";
      if (!form.adresse.trim()) return "Adresse ist Pflicht.";
      if (!/^\d{5}$/.test(form.plz)) return "PLZ muss 5 Ziffern haben.";
      if (!form.stadt.trim()) return "Stadt ist Pflicht.";
    } else if (s === 1) {
      if (!form.beruf_status) return "Beruf-Status ist Pflicht.";
      if (parseNum(form.brutto_jahreseinkommen) <= 0)
        return "Brutto-Jahreseinkommen ist Pflicht.";
    } else if (s === 2) {
      if (Number(form.erwachsene_im_haushalt) < 1)
        return "Mindestens eine erwachsene Person im Haushalt.";
      if (Number(form.kinder_anzahl) < 0) return "Kinder-Anzahl ungültig.";
    } else if (s === 3) {
      if (parseNum(form.eigenkapital) < 0) return "Eigenkapital ungültig.";
      if (parseNum(form.kreditverpflichtungen_monatlich) < 0)
        return "Kreditverpflichtungen ungültig.";
    }
    return null;
  }

  async function persistStep(s: number) {
    if (s === 0) {
      await saveSelbstauskunftStep({
        step: 1,
        data: {
          anrede: (form.anrede || null) as "herr" | "frau" | "divers" | null,
          vorname: form.vorname.trim(),
          nachname: form.nachname.trim(),
          geburtsdatum: form.geburtsdatum,
          verheiratet: form.familienstand === "verheiratet",
          adresse: form.adresse.trim(),
          plz: form.plz.trim(),
          stadt: form.stadt.trim(),
          bundesland: form.bundesland.trim() || null,
          telefon: form.telefon.trim() || null,
        },
      });
    } else if (s === 1) {
      await saveSelbstauskunftStep({
        step: 2,
        data: {
          beruf_status: form.beruf_status as
            | "angestellter"
            | "selbststaendiger"
            | "unternehmer",
          brutto_jahreseinkommen: parseNum(form.brutto_jahreseinkommen),
        },
      });
    } else if (s === 2) {
      await saveSelbstauskunftStep({
        step: 3,
        data: {
          erwachsene_im_haushalt: (Number(form.erwachsene_im_haushalt) === 2
            ? 2
            : 1) as 1 | 2,
          kinder_anzahl: Number(form.kinder_anzahl) || 0,
          bestehende_immobilien: form.bestehende_immobilien === "true",
        },
      });
    } else if (s === 3) {
      await saveSelbstauskunftStep({
        step: 4,
        data: {
          eigenkapital: parseNum(form.eigenkapital),
          kreditverpflichtungen_monatlich: parseNum(
            form.kreditverpflichtungen_monatlich,
          ),
        },
      });
    }
  }

  async function next() {
    const err = validateStep(step);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      setSaving(true);
      await persistStep(step);
      setStep((s) => Math.min(4, s + 1));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  async function onSubmit() {
    for (let s = 0; s < 4; s++) {
      const err = validateStep(s);
      if (err) {
        toast.error(`Schritt ${s + 1}: ${err}`);
        setStep(s);
        return;
      }
    }
    try {
      setSubmitting(true);
      await submitSelbstauskunft({
        anrede: (form.anrede || null) as "herr" | "frau" | "divers" | null,
        vorname: form.vorname.trim(),
        nachname: form.nachname.trim(),
        geburtsdatum: form.geburtsdatum,
        verheiratet: form.familienstand === "verheiratet",
        adresse: form.adresse.trim(),
        plz: form.plz.trim(),
        stadt: form.stadt.trim(),
        bundesland: form.bundesland.trim() || null,
        telefon: form.telefon.trim() || null,
        beruf_status: form.beruf_status as
          | "angestellter"
          | "selbststaendiger"
          | "unternehmer",
        brutto_jahreseinkommen: parseNum(form.brutto_jahreseinkommen),
        erwachsene_im_haushalt: (Number(form.erwachsene_im_haushalt) === 2
          ? 2
          : 1) as 1 | 2,
        kinder_anzahl: Number(form.kinder_anzahl) || 0,
        bestehende_immobilien: form.bestehende_immobilien === "true",
        eigenkapital: parseNum(form.eigenkapital),
        kreditverpflichtungen_monatlich: parseNum(
          form.kreditverpflichtungen_monatlich,
        ),
      });
      toast.success("Selbstauskunft eingereicht. Vielen Dank!");
      router.push("/portal");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Einreichen fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  // Erfolgs-Card vor Re-Edit
  if (alreadySubmitted && !editMode) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <div className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-card">
          <div className="mb-3 flex items-center gap-2 text-brand-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Eingereicht
            </span>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink">
            Deine Selbstauskunft
          </h1>
          <p className="mt-2 text-sm text-brand-body">
            Du hast deine Selbstauskunft am{" "}
            <strong>{fmtDate(kunde!.selbstauskunft_submitted_at!)}</strong>{" "}
            eingereicht. Hier kannst du deine Daten aktualisieren.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => {
                setStep(0);
                setEditMode(true);
              }}
              className="rounded-2xl"
            >
              Daten bearbeiten
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/portal">Zurück zum Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink md:text-3xl">
          Deine Selbstauskunft
        </h1>
        <p className="mt-2 text-sm text-brand-body">
          Diese Daten helfen uns, deine Finanzierung realistisch einzuschätzen.
          Du kannst alles später ändern.
        </p>

        {/* Progress */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-brand-muted">
            <span>
              Schritt {step + 1} von 5: {STEP_TITLES[step]}
            </span>
            <span className="tabular-nums">
              {Math.round(((step + 1) / 5) * 100)}%
            </span>
          </div>
          <div className="flex gap-1.5">
            {STEP_TITLES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= step ? "bg-brand-accent" : "bg-brand-surfaceMuted"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-card md:p-8">
        {step === 0 && <Step1 form={form} setForm={setForm} />}
        {step === 1 && <Step2 form={form} setForm={setForm} />}
        {step === 2 && <Step3 form={form} setForm={setForm} />}
        {step === 3 && <Step4 form={form} setForm={setForm} />}
        {step === 4 && <Step5 form={form} bon={bon} onEdit={(s) => setStep(s)} />}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={prev}
          disabled={step === 0 || saving || submitting}
          className="rounded-2xl"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        {step < 4 ? (
          <Button onClick={next} disabled={saving} className="rounded-2xl">
            {saving ? "Speichern …" : "Weiter"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={submitting || !bon}
            size="lg"
            className="rounded-2xl bg-brand-accent text-white hover:bg-brand-accent/90"
          >
            {submitting ? "Wird eingereicht …" : "Selbstauskunft einreichen"}
          </Button>
        )}
      </div>
    </div>
  );
}

type StepProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
};

const PflichtStar = () => (
  <span aria-label="Pflichtfeld" className="ml-0.5 text-brand-accent">
    *
  </span>
);

const Hint = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-xs text-brand-muted">{children}</p>
);

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-brand-ink">
        {label}
        {required ? <PflichtStar /> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

function Step1({ form, setForm }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Anrede">
          <Select
            value={form.anrede || undefined}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, anrede: v as FormState["anrede"] }))
            }
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="herr">Herr</SelectItem>
              <SelectItem value="frau">Frau</SelectItem>
              <SelectItem value="divers">Divers</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Geburtsdatum" required>
          <Input
            type="date"
            value={form.geburtsdatum}
            onChange={(e) =>
              setForm((f) => ({ ...f, geburtsdatum: e.target.value }))
            }
          />
        </Field>
        <Field label="Vorname" required>
          <Input
            value={form.vorname}
            onChange={(e) => setForm((f) => ({ ...f, vorname: e.target.value }))}
          />
        </Field>
        <Field label="Nachname" required>
          <Input
            value={form.nachname}
            onChange={(e) =>
              setForm((f) => ({ ...f, nachname: e.target.value }))
            }
          />
        </Field>
        <Field label="Familienstand" required>
          <Select
            value={form.familienstand || undefined}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, familienstand: v as Familienstand }))
            }
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue placeholder="Bitte wählen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ledig">ledig</SelectItem>
              <SelectItem value="verheiratet">verheiratet</SelectItem>
              <SelectItem value="geschieden">geschieden</SelectItem>
              <SelectItem value="verwitwet">verwitwet</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Adresse" required>
        <Input
          value={form.adresse}
          placeholder="Straße und Hausnummer"
          onChange={(e) => setForm((f) => ({ ...f, adresse: e.target.value }))}
        />
      </Field>
      <div className="grid gap-5 md:grid-cols-[160px_1fr]">
        <Field label="PLZ" required>
          <Input
            inputMode="numeric"
            maxLength={5}
            value={form.plz}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                plz: e.target.value.replace(/\D/g, "").slice(0, 5),
              }))
            }
          />
        </Field>
        <Field label="Stadt" required>
          <Input
            value={form.stadt}
            onChange={(e) => setForm((f) => ({ ...f, stadt: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Bundesland">
          <Input
            value={form.bundesland}
            placeholder="z. B. Bayern"
            onChange={(e) =>
              setForm((f) => ({ ...f, bundesland: e.target.value }))
            }
          />
        </Field>
        <Field label="Telefon">
          <Input
            type="tel"
            value={form.telefon}
            placeholder="+49 …"
            onChange={(e) => setForm((f) => ({ ...f, telefon: e.target.value }))}
          />
        </Field>
      </div>
    </div>
  );
}

function NumericFormatted({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <Input
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        if (!digits) {
          onChange("");
          return;
        }
        onChange(fmtNum(Number(digits)));
      }}
    />
  );
}

function Step2({ form, setForm }: StepProps) {
  return (
    <div className="space-y-5">
      <Field label="Beruf-Status" required>
        <Select
          value={form.beruf_status || undefined}
          onValueChange={(v) =>
            setForm((f) => ({
              ...f,
              beruf_status: v as FormState["beruf_status"],
            }))
          }
        >
          <SelectTrigger className="rounded-2xl">
            <SelectValue placeholder="Bitte wählen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="angestellter">Angestellter</SelectItem>
            <SelectItem value="selbststaendiger">Selbstständiger</SelectItem>
            <SelectItem value="unternehmer">Unternehmer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field
        label="Brutto-Jahreseinkommen (EUR)"
        required
        hint="Bei Selbstständigen / Unternehmern: durchschnittliches Brutto-Jahreseinkommen der letzten 24 Monate."
      >
        <NumericFormatted
          value={form.brutto_jahreseinkommen}
          onChange={(v) =>
            setForm((f) => ({ ...f, brutto_jahreseinkommen: v }))
          }
          placeholder="z. B. 75.000"
        />
      </Field>
    </div>
  );
}

function Step3({ form, setForm }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Erwachsene im Haushalt" required>
          <Select
            value={form.erwachsene_im_haushalt}
            onValueChange={(v) =>
              setForm((f) => ({ ...f, erwachsene_im_haushalt: v }))
            }
          >
            <SelectTrigger className="rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
              <SelectItem value="2">2</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Kinder" required>
          <Input
            inputMode="numeric"
            value={form.kinder_anzahl}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                kinder_anzahl: e.target.value.replace(/\D/g, ""),
              }))
            }
          />
        </Field>
      </div>
      <Field
        label="Bestehende Immobilien"
        required
        hint="Besitzt du bereits eine Immobilie, unabhängig von dieser geplanten Investition?"
      >
        <Select
          value={form.bestehende_immobilien}
          onValueChange={(v) =>
            setForm((f) => ({ ...f, bestehende_immobilien: v }))
          }
        >
          <SelectTrigger className="rounded-2xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">Nein</SelectItem>
            <SelectItem value="true">Ja</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Step4({ form, setForm }: StepProps) {
  return (
    <div className="space-y-5">
      <Field
        label="Eigenkapital (EUR)"
        required
        hint="Liquide Mittel, die du für Kaufpreis und Nebenkosten einsetzen kannst."
      >
        <NumericFormatted
          value={form.eigenkapital}
          onChange={(v) => setForm((f) => ({ ...f, eigenkapital: v }))}
          placeholder="z. B. 50.000"
        />
      </Field>
      <Field
        label="Kreditverpflichtungen monatlich (EUR)"
        required
        hint="Summe aller monatlichen Raten für bestehende Kredite, ohne Miete."
      >
        <NumericFormatted
          value={form.kreditverpflichtungen_monatlich}
          onChange={(v) =>
            setForm((f) => ({ ...f, kreditverpflichtungen_monatlich: v }))
          }
          placeholder="0"
        />
      </Field>
    </div>
  );
}

function Step5({
  form,
  bon,
  onEdit,
}: {
  form: FormState;
  bon: ReturnType<typeof calculateBonitaet> | null;
  onEdit: (step: number) => void;
}) {
  const anredeLabel: Record<string, string> = {
    herr: "Herr",
    frau: "Frau",
    divers: "Divers",
  };
  const berufLabel: Record<string, string> = {
    angestellter: "Angestellter",
    selbststaendiger: "Selbstständiger",
    unternehmer: "Unternehmer",
  };

  return (
    <div className="space-y-6">
      <SummaryGroup title="Persönliche Daten" onEdit={() => onEdit(0)}>
        <SummaryRow label="Anrede" v={anredeLabel[form.anrede] ?? "—"} />
        <SummaryRow label="Name" v={`${form.vorname} ${form.nachname}`.trim()} />
        <SummaryRow
          label="Geburtsdatum"
          v={form.geburtsdatum ? fmtDate(form.geburtsdatum) : "—"}
        />
        <SummaryRow label="Familienstand" v={form.familienstand || "—"} />
        <SummaryRow
          label="Adresse"
          v={[form.adresse, [form.plz, form.stadt].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(", ")}
        />
        <SummaryRow label="Bundesland" v={form.bundesland || "—"} />
        <SummaryRow label="Telefon" v={form.telefon || "—"} />
      </SummaryGroup>

      <SummaryGroup title="Beruf und Einkommen" onEdit={() => onEdit(1)}>
        <SummaryRow
          label="Beruf-Status"
          v={berufLabel[form.beruf_status] ?? "—"}
        />
        <SummaryRow
          label="Brutto/Jahr"
          v={`${form.brutto_jahreseinkommen || "—"} EUR`}
        />
      </SummaryGroup>

      <SummaryGroup title="Haushalt" onEdit={() => onEdit(2)}>
        <SummaryRow label="Erwachsene" v={form.erwachsene_im_haushalt} />
        <SummaryRow label="Kinder" v={form.kinder_anzahl} />
        <SummaryRow
          label="Bestehende Immobilien"
          v={form.bestehende_immobilien === "true" ? "Ja" : "Nein"}
        />
      </SummaryGroup>

      <SummaryGroup title="Vermögen und Verpflichtungen" onEdit={() => onEdit(3)}>
        <SummaryRow label="Eigenkapital" v={`${form.eigenkapital || "—"} EUR`} />
        <SummaryRow
          label="Kreditverpflichtungen / Monat"
          v={`${form.kreditverpflichtungen_monatlich || "0"} EUR`}
        />
      </SummaryGroup>

      {/* Bonitäts-Vorschau */}
      <div className="rounded-3xl border-2 border-brand-accent bg-brand-accentSoft p-6">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Bonitäts-Vorschau
        </div>
        {bon ? (
          <>
            <div className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-brand-ink md:text-4xl">
              {fmtEUR(bon.max_finanzierbar)}
            </div>
            <p className="text-xs text-brand-muted">
              Maximaler Finanzierungsrahmen
            </p>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <BonRow label="Max. Monatsrate" v={fmtEUR(bon.max_monatsrate)} />
              <BonRow label="Max. Darlehen" v={fmtEUR(bon.max_darlehen)} />
              <BonRow
                label="Persönlicher Steuersatz"
                v={`${(bon.steuersatz_grenze * 100).toFixed(0)}%`}
              />
              <BonRow
                label="Durchschnittsteuersatz"
                v={`${(bon.steuersatz_durchschnitt * 100).toFixed(1)}%`}
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-brand-body">
            Vervollständige bitte die vorherigen Schritte für deine
            Bonitäts-Vorschau.
          </p>
        )}
      </div>

      <p className="text-xs text-brand-muted">
        Mit Klick auf „Selbstauskunft einreichen&quot; bestätigst du die
        Richtigkeit deiner Angaben und stimmst der Verarbeitung zur
        Bonitätsprüfung zu. Deine Daten werden ausschließlich zur Prüfung deiner
        Finanzierung verwendet.
      </p>
    </div>
  );
}

function SummaryGroup({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
        >
          <Pencil className="h-3 w-3" /> Bearbeiten
        </button>
      </div>
      <dl className="grid gap-1.5 rounded-2xl bg-brand-surfaceMuted p-4 text-sm">
        {children}
      </dl>
    </div>
  );
}

function SummaryRow({ label, v }: { label: string; v: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <dt className="text-brand-muted">{label}</dt>
      <dd className="font-medium text-brand-ink">{v || "—"}</dd>
    </div>
  );
}

function BonRow({ label, v }: { label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-xl bg-brand-surface px-3 py-2">
      <span className="text-brand-muted">{label}</span>
      <span className="font-semibold tabular-nums text-brand-ink">{v}</span>
    </div>
  );
}
