"use client";

// PROJ-7 — Selbstauskunft (Fillout-Nachbau): 8-Schritt-Wizard im Kundenportal.
// Haupt- + Mitantragsteller (toggle), bedingte Felder, Immobilien-Subform,
// Autosave je Schritt, Unterschrift (Zeichnen). Ersetzt den alten Kurz-Wizard.

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SignaturePad,
  type SignaturePadHandle,
} from "@/components/reservierung/SignaturePad";

import {
  type SelbstauskunftData,
  type PersonData,
  type ImmobilieData,
  emptyImmobilie,
  WOHNSITUATION,
  FAMILIENSTAND,
  BESCHAEFTIGUNG,
  DAUER,
  EINNAHMEQUELLEN,
  VERMOEGENSWERTE,
  KV_STATUS,
  AUSGABENPOSTEN,
  IMMOBILIEN_OBJEKTART,
  validatePersonStep,
} from "@/lib/selbstauskunft";
import {
  saveSelbstauskunftDraft,
  submitMySelbstauskunft,
} from "@/lib/actions/selbstauskunft";
import {
  saveSelbstauskunftDraftByToken,
  submitSelbstauskunftByToken,
} from "@/lib/actions/selbstauskunft-public";

export interface SelbstauskunftCrm {
  close_lead_id: string | null;
  close_opportunity_id: string | null;
  berater_vorname: string | null;
  berater_nachname: string | null;
}

export interface SelbstauskunftWizardProps {
  initialData: SelbstauskunftData;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  startStep: number;
  crm: SelbstauskunftCrm;
  /** Token-Modus (öffentlicher Link, ohne Login): save/submit laufen token-basiert,
   *  nach dem Absenden gibt es keinen Portal-Redirect, nur einen Dank-Screen. */
  token?: string;
}

const STEP_TITLES = [
  "Persönliche Daten",
  "Aktuelle Tätigkeit",
  "Einnahmen",
  "Vermögen",
  "Immobilienvermögen",
  "Ausgaben",
  "Unterschrift",
];
const TOTAL = STEP_TITLES.length;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export function SelbstauskunftWizard({
  initialData,
  alreadySubmitted,
  submittedAt,
  startStep,
  crm,
  token,
}: SelbstauskunftWizardProps) {
  const router = useRouter();
  const publicMode = Boolean(token);
  const [data, setData] = useState<SelbstauskunftData>(initialData);
  const [step, setStep] = useState(() => Math.min(TOTAL - 1, Math.max(0, startStep)));
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [publicDone, setPublicDone] = useState(false);

  const sigHaupt = useRef<SignaturePadHandle>(null);
  const sigMit = useRef<SignaturePadHandle>(null);

  const setHaupt = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, haupt: { ...d.haupt, ...patch } }));
  const setMit = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, mit: { ...d.mit, ...patch } }));

  // 0-based step -> validation step number used in lib (1,2,3,4,_,6).
  const VALID_STEP: Record<number, number | null> = {
    0: 1,
    1: 2,
    2: 3,
    3: 4,
    4: null, // Immobilien
    5: 6,
    6: null, // Unterschrift
  };

  function validateCurrent(): string | null {
    const vs = VALID_STEP[step];
    if (vs != null) {
      const eH = validatePersonStep(data.haupt, vs);
      if (eH) return `Hauptantragsteller: ${eH}`;
      if (data.mitantragsteller) {
        const eM = validatePersonStep(data.mit, vs);
        if (eM) return `Mitantragsteller: ${eM}`;
      }
    }
    if (step === 4 && data.immobilienvermoegen === "")
      return "Bitte Ja/Nein zum Immobilienvermögen wählen.";
    return null;
  }

  async function persist(nextStep: number) {
    const payload = {
      step: nextStep,
      data: data as unknown as Record<string, unknown>,
      close_lead_id: crm.close_lead_id,
      close_opportunity_id: crm.close_opportunity_id,
      berater_vorname: crm.berater_vorname,
      berater_nachname: crm.berater_nachname,
    };
    if (token) {
      await saveSelbstauskunftDraftByToken({ token, ...payload });
    } else {
      await saveSelbstauskunftDraft(payload);
    }
  }

  async function next() {
    const err = validateCurrent();
    if (err) {
      toast.error(err);
      return;
    }
    try {
      setSaving(true);
      await persist(step + 1);
      setStep((s) => Math.min(TOTAL - 1, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  function prev() {
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit() {
    // Validate all content steps client-side first for fast feedback.
    for (const [zero, vs] of Object.entries(VALID_STEP)) {
      if (vs == null) continue;
      const eH = validatePersonStep(data.haupt, vs);
      if (eH) {
        toast.error(`Hauptantragsteller, ${STEP_TITLES[Number(zero)]}: ${eH}`);
        setStep(Number(zero));
        return;
      }
      if (data.mitantragsteller) {
        const eM = validatePersonStep(data.mit, vs);
        if (eM) {
          toast.error(`Mitantragsteller, ${STEP_TITLES[Number(zero)]}: ${eM}`);
          setStep(Number(zero));
          return;
        }
      }
    }
    if (data.immobilienvermoegen === "") {
      toast.error("Bitte Ja/Nein zum Immobilienvermögen wählen.");
      setStep(4);
      return;
    }
    if (!data.datenschutz) {
      toast.error("Bitte die Datenschutzerklärung bestätigen.");
      return;
    }
    if (!data.ort.trim()) {
      toast.error("Bitte den Ort angeben.");
      return;
    }
    if (sigHaupt.current?.isEmpty() ?? true) {
      toast.error("Bitte unterschreiben.");
      return;
    }
    if (data.mitantragsteller && (sigMit.current?.isEmpty() ?? true)) {
      toast.error("Bitte auch als Mitantragsteller unterschreiben.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        data: data as unknown as Record<string, unknown>,
        signaturHaupt: sigHaupt.current!.toDataURL(),
        signaturMit: data.mitantragsteller ? (sigMit.current?.toDataURL() ?? null) : null,
        close_lead_id: crm.close_lead_id,
        close_opportunity_id: crm.close_opportunity_id,
        berater_vorname: crm.berater_vorname,
        berater_nachname: crm.berater_nachname,
      };
      if (token) {
        await submitSelbstauskunftByToken({ token, ...payload });
      } else {
        await submitMySelbstauskunft(payload);
      }
      toast.success("Selbstauskunft eingereicht. Vielen Dank!");
      if (publicMode) {
        setPublicDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push("/portal");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Einreichen fehlgeschlagen.");
    } finally {
      setSubmitting(false);
    }
  }

  // Token-Modus: Dank-Screen nach dem Absenden (kein Login/Portal).
  if (publicDone) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <div className="rounded-3xl border border-brand-border bg-brand-surface p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-success" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink">
            Vielen Dank!
          </h1>
          <p className="mt-2 text-sm text-brand-body">
            Ihre Selbstauskunft wurde übermittelt. Ihr Ansprechpartner meldet sich
            bei Ihnen zu den nächsten Schritten. Sie können dieses Fenster schließen.
          </p>
        </div>
      </div>
    );
  }

  // Success screen before re-edit.
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
            {submittedAt ? (
              <>Eingereicht am <strong>{fmtDate(submittedAt)}</strong>. </>
            ) : null}
            Du kannst deine Angaben aktualisieren.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => { setStep(0); setEditMode(true); }} className="rounded-2xl">
              Daten bearbeiten
            </Button>
            {!publicMode && (
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href="/portal">Zurück zum Dashboard</Link>
              </Button>
            )}
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
          Bitte fülle nur aus, was auf dich zutrifft. Du kannst jederzeit
          pausieren — dein Fortschritt wird gespeichert.
        </p>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-brand-muted">
            <span>Schritt {step + 1} von {TOTAL}: {STEP_TITLES[step]}</span>
            <span className="tabular-nums">{Math.round(((step + 1) / TOTAL) * 100)}%</span>
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

      <div className="space-y-6 rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-card md:p-8">
        {/* Mitantragsteller-Toggle nur auf Schritt 1 */}
        {step === 0 && (
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surfaceMuted px-4 py-3">
            <span className="text-sm font-medium text-brand-ink">
              Gibt es einen Mitantragsteller?
            </span>
            <Switch
              checked={data.mitantragsteller}
              onCheckedChange={(v) => setData((d) => ({ ...d, mitantragsteller: v }))}
            />
          </label>
        )}

        {/* Immobilien-Schritt */}
        {step === 4 ? (
          <ImmobilienStep data={data} setData={setData} />
        ) : step === 6 ? (
          <UnterschriftStep
            data={data}
            setData={setData}
            sigHaupt={sigHaupt}
            sigMit={sigMit}
          />
        ) : (
          <div className="space-y-8">
            <PersonBlock
              title={data.mitantragsteller ? "Hauptantragsteller" : undefined}
              person={data.haupt}
              set={setHaupt}
              section={VALID_STEP[step]!}
            />
            {data.mitantragsteller && (
              <PersonBlock
                title="Mitantragsteller"
                person={data.mit}
                set={setMit}
                section={VALID_STEP[step]!}
              />
            )}
          </div>
        )}
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
        {step < TOTAL - 1 ? (
          <Button onClick={next} disabled={saving} className="rounded-2xl">
            {saving ? "Speichern …" : "Weiter"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={submitting}
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

// ===========================================================================
// PersonBlock — rendert die Felder einer Person für einen Abschnitt
// ===========================================================================

function PersonBlock({
  title,
  person,
  set,
  section,
}: {
  title?: string;
  person: PersonData;
  set: (patch: Partial<PersonData>) => void;
  section: number;
}) {
  return (
    <div className="space-y-5">
      {title && (
        <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
          {title}
        </h3>
      )}
      {section === 1 && <SectionPersoenlich person={person} set={set} />}
      {section === 2 && <SectionTaetigkeit person={person} set={set} />}
      {section === 3 && <SectionEinnahmen person={person} set={set} />}
      {section === 4 && <SectionVermoegen person={person} set={set} />}
      {section === 6 && <SectionAusgaben person={person} set={set} />}
    </div>
  );
}

type PS = { person: PersonData; set: (patch: Partial<PersonData>) => void };

function SectionPersoenlich({ person, set }: PS) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Vorname" req value={person.vorname} onChange={(v) => set({ vorname: v })} />
        <TextField label="Nachname" req value={person.nachname} onChange={(v) => set({ nachname: v })} />
        <TextField label="E-Mail" req type="email" value={person.email} onChange={(v) => set({ email: v })} />
        <TextField label="Telefon" req type="tel" value={person.telefon} onChange={(v) => set({ telefon: v })} />
        <DateField label="Geburtsdatum" req value={person.geburtsdatum} onChange={(v) => set({ geburtsdatum: v })} />
        <TextField label="Staatsangehörigkeit" req value={person.staatsangehoerigkeit} onChange={(v) => set({ staatsangehoerigkeit: v })} />
      </div>
      <TextField label="Straße & Hausnr." req value={person.strasse} onChange={(v) => set({ strasse: v })} />
      <div className="grid gap-5 md:grid-cols-[160px_1fr]">
        <TextField
          label="PLZ" req inputMode="numeric" value={person.plz}
          onChange={(v) => set({ plz: v.replace(/\D/g, "").slice(0, 5) })}
        />
        <TextField label="Ort" req value={person.ort} onChange={(v) => set({ ort: v })} />
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Wohnsituation" req options={WOHNSITUATION} value={person.wohnsituation} onChange={(v) => set({ wohnsituation: v })} />
        <DateField label="Dort wohnhaft seit" value={person.wohnhaft_seit} onChange={(v) => set({ wohnhaft_seit: v })} />
        <SelectField label="Familienstand" req options={FAMILIENSTAND} value={person.familienstand} onChange={(v) => set({ familienstand: v })} />
        <TextField label="Kindergeldberechtigte Kinder (Anzahl)" inputMode="numeric" value={person.kinder_anzahl} onChange={(v) => set({ kinder_anzahl: v.replace(/\D/g, "") })} />
      </div>
    </div>
  );
}

function SectionTaetigkeit({ person, set }: PS) {
  const erwerbstaetig = ["Angestellt", "Beamter", "Freiberufler"].includes(person.beschaeftigung);
  return (
    <div className="space-y-5">
      <SelectField label="Beschäftigungsverhältnis" req options={BESCHAEFTIGUNG} value={person.beschaeftigung} onChange={(v) => set({ beschaeftigung: v })} />
      {erwerbstaetig && (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <TextField label="Beruf / Tätigkeit" req value={person.beruf} onChange={(v) => set({ beruf: v })} />
            <TextField label="Arbeitgeber" value={person.arbeitgeber} onChange={(v) => set({ arbeitgeber: v })} />
          </div>
          <SwitchField label="Arbeitgeber in Deutschland ansässig?" checked={person.arbeitgeber_deutschland} onChange={(v) => set({ arbeitgeber_deutschland: v })} />
          <div className="grid gap-5 md:grid-cols-2">
            <DateField label="Tätig seit" value={person.taetig_seit} onChange={(v) => set({ taetig_seit: v })} />
            <SelectField label="Dauer" req options={DAUER} value={person.dauer} onChange={(v) => set({ dauer: v })} />
          </div>
          {person.dauer === "Befristet bis" && (
            <DateField label="Befristet bis" req value={person.befristet_bis} onChange={(v) => set({ befristet_bis: v })} />
          )}
        </>
      )}
    </div>
  );
}

function SectionEinnahmen({ person, set }: PS) {
  const has = (q: string) => person.einnahmequellen.includes(q);
  return (
    <div className="space-y-5">
      <CheckboxGroup
        label="Einnahmequellen" req options={EINNAHMEQUELLEN}
        selected={person.einnahmequellen} onChange={(v) => set({ einnahmequellen: v })}
      />
      {has("Lohn / Gehalt / Bezüge") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Lohn / Gehalt netto pro Monat" req value={person.lohn_netto_monat} onChange={(v) => set({ lohn_netto_monat: v })} />
          <TextField label="Anzahl Gehälter pro Jahr" req inputMode="numeric" value={person.anzahl_gehaelter} onChange={(v) => set({ anzahl_gehaelter: v.replace(/\D/g, "") })} />
        </div>
      )}
      {has("Einnahmen aus selbstständiger/freiberuflicher Arbeit") && (
        <EuroField label="Einnahmen selbstständig pro Jahr" req value={person.selbststaendig_jahr} onChange={(v) => set({ selbststaendig_jahr: v })} />
      )}
      {has("Einnahmen aus nebenberuflicher Tätigkeit") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Einnahmen Nebenberuf pro Jahr" req value={person.nebenberuf_jahr} onChange={(v) => set({ nebenberuf_jahr: v })} />
          <DateField label="Beginn Nebenberuf" value={person.nebenberuf_beginn} onChange={(v) => set({ nebenberuf_beginn: v })} />
        </div>
      )}
      {has("Renten und Pensionen") && (
        <EuroField label="Renten / Pensionen pro Monat" req value={person.renten_monat} onChange={(v) => set({ renten_monat: v })} />
      )}
      {has("Mieteinnahmen") && (
        <EuroField label="Mieteinnahmen pro Monat" req value={person.mieteinnahmen_monat} onChange={(v) => set({ mieteinnahmen_monat: v })} />
      )}
      {has("Kindergeld") && (
        <EuroField label="Kindergeld pro Monat" req value={person.kindergeld_monat} onChange={(v) => set({ kindergeld_monat: v })} />
      )}
      {has("Unterhalt") && (
        <EuroField label="Unterhalt pro Monat" req value={person.unterhalt_monat} onChange={(v) => set({ unterhalt_monat: v })} />
      )}
      {has("sonstige Einkünfte") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Sonstige Einkünfte pro Jahr" req value={person.sonstige_einkuenfte_jahr} onChange={(v) => set({ sonstige_einkuenfte_jahr: v })} />
          <TextField label="Art der Einkünfte" req value={person.sonstige_einkuenfte_art} onChange={(v) => set({ sonstige_einkuenfte_art: v })} />
        </div>
      )}
    </div>
  );
}

function SectionVermoegen({ person, set }: PS) {
  const has = (q: string) => person.vermoegenswerte.includes(q);
  return (
    <div className="space-y-5">
      <CheckboxGroup
        label="Liquide Vermögenswerte" req options={VERMOEGENSWERTE}
        selected={person.vermoegenswerte} onChange={(v) => set({ vermoegenswerte: v })}
      />
      {has("Bank- und Sparguthaben") && (
        <EuroField label="Bank- und Sparguthaben" req value={person.bank_sparguthaben} onChange={(v) => set({ bank_sparguthaben: v })} />
      )}
      {has("Wertpapiere/Aktien") && (
        <EuroField label="Wertpapiere / Aktien (Kurswert)" req value={person.wertpapiere} onChange={(v) => set({ wertpapiere: v })} />
      )}
      {has("Kapitalbildende Lebens-/Rentenversicherungen") && (
        <EuroField label="Lebens-/Rentenversicherungen (Rückkaufswert)" req value={person.lebensversicherung} onChange={(v) => set({ lebensversicherung: v })} />
      )}
      {has("Bausparvertrag") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Bausparvertrag: Guthaben" req value={person.bausparen_guthaben} onChange={(v) => set({ bausparen_guthaben: v })} />
          <EuroField label="Bausparvertrag: Sparrate pro Monat" value={person.bausparen_rate} onChange={(v) => set({ bausparen_rate: v })} />
        </div>
      )}
      {has("Sonstiges Vermögen") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Sonstiges Vermögen" req value={person.sonstiges_vermoegen} onChange={(v) => set({ sonstiges_vermoegen: v })} />
          <TextField label="Art des sonstigen Vermögens" req value={person.sonstiges_vermoegen_art} onChange={(v) => set({ sonstiges_vermoegen_art: v })} />
        </div>
      )}
    </div>
  );
}

function SectionAusgaben({ person, set }: PS) {
  const has = (q: string) => person.ausgabenposten.includes(q);
  return (
    <div className="space-y-5">
      <EuroField label="Lebenshaltungskosten (ca.) pro Monat" req value={person.lebenshaltung_monat} onChange={(v) => set({ lebenshaltung_monat: v })} />
      <SelectField label="Krankenversicherungsstatus" req options={KV_STATUS} value={person.kv_status} onChange={(v) => set({ kv_status: v })} />
      {person.kv_status === "Privat krankenversichert" && (
        <EuroField label="Privater Krankenversicherungsbeitrag pro Monat" req value={person.pkv_beitrag_monat} onChange={(v) => set({ pkv_beitrag_monat: v })} />
      )}
      <CheckboxGroup
        label="Weitere Ausgabenposten" options={AUSGABENPOSTEN}
        selected={person.ausgabenposten} onChange={(v) => set({ ausgabenposten: v })}
      />
      {has("Wohnkosten") && (
        <EuroField label="Warmmiete pro Monat" req value={person.warmmiete_monat} onChange={(v) => set({ warmmiete_monat: v })} />
      )}
      {has("Kredite / Leasing / 0% Finanzierungen") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Kreditrate pro Monat" req value={person.kreditrate_monat} onChange={(v) => set({ kreditrate_monat: v })} />
          <EuroField label="Restschuld" value={person.restschuld} onChange={(v) => set({ restschuld: v })} />
        </div>
      )}
      {has("Unterhaltsverpflichtungen") && (
        <EuroField label="Unterhaltsverpflichtungen pro Monat" req value={person.unterhaltsverpflichtung_monat} onChange={(v) => set({ unterhaltsverpflichtung_monat: v })} />
      )}
      {has("sonstige Verbindlichkeiten") && (
        <div className="grid gap-5 md:grid-cols-2">
          <EuroField label="Sonstige Verbindlichkeiten pro Monat" req value={person.sonstige_verbindlichkeit_monat} onChange={(v) => set({ sonstige_verbindlichkeit_monat: v })} />
          <TextField label="Art der Verbindlichkeit" req value={person.verbindlichkeit_art} onChange={(v) => set({ verbindlichkeit_art: v })} />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Immobilien-Subform (Schritt 5)
// ===========================================================================

function ImmobilienStep({
  data,
  setData,
}: {
  data: SelbstauskunftData;
  setData: React.Dispatch<React.SetStateAction<SelbstauskunftData>>;
}) {
  const setImm = (idx: number, patch: Partial<ImmobilieData>) =>
    setData((d) => ({
      ...d,
      immobilien: d.immobilien.map((im, i) => (i === idx ? { ...im, ...patch } : im)),
    }));

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-sm font-medium text-brand-ink">
          Ist bereits Immobilienvermögen vorhanden?
          <span className="ml-0.5 text-brand-accent">*</span>
        </Label>
        <RadioGroup
          className="mt-2 flex gap-6"
          value={data.immobilienvermoegen || undefined}
          onValueChange={(v) =>
            setData((d) => ({
              ...d,
              immobilienvermoegen: v as "ja" | "nein",
              immobilien:
                v === "ja" && d.immobilien.length === 0 ? [emptyImmobilie()] : d.immobilien,
            }))
          }
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="ja" id="imm-ja" /> Ja
          </label>
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="nein" id="imm-nein" /> Nein
          </label>
        </RadioGroup>
      </div>

      {data.immobilienvermoegen === "ja" && (
        <div className="space-y-4">
          {data.immobilien.map((im, idx) => (
            <div key={idx} className="space-y-4 rounded-2xl border border-brand-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-muted">
                  Immobilie {idx + 1}
                </span>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => setData((d) => ({ ...d, immobilien: d.immobilien.filter((_, i) => i !== idx) }))}
                >
                  <Trash2 className="h-4 w-4" /> Entfernen
                </Button>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField label="Objektart" options={IMMOBILIEN_OBJEKTART} value={im.objektart} onChange={(v) => setImm(idx, { objektart: v })} />
                <TextField label="Adresse" value={im.adresse} onChange={(v) => setImm(idx, { adresse: v })} />
                <EuroField label="Verkehrswert" value={im.verkehrswert} onChange={(v) => setImm(idx, { verkehrswert: v })} />
                <EuroField label="Restdarlehen" value={im.restdarlehen} onChange={(v) => setImm(idx, { restdarlehen: v })} />
                <EuroField label="Mieteinnahme pro Monat" value={im.mieteinnahme_monat} onChange={(v) => setImm(idx, { mieteinnahme_monat: v })} />
                <SwitchField label="Eigennutzung" checked={im.eigennutzung} onChange={(v) => setImm(idx, { eigennutzung: v })} />
              </div>
            </div>
          ))}
          <Button
            type="button" variant="outline"
            onClick={() => setData((d) => ({ ...d, immobilien: [...d.immobilien, emptyImmobilie()] }))}
            className="rounded-2xl"
          >
            <Plus className="mr-1 h-4 w-4" /> Immobilie erfassen
          </Button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Unterschrift (Schritt 7)
// ===========================================================================

function UnterschriftStep({
  data,
  setData,
  sigHaupt,
  sigMit,
}: {
  data: SelbstauskunftData;
  setData: React.Dispatch<React.SetStateAction<SelbstauskunftData>>;
  sigHaupt: React.RefObject<SignaturePadHandle | null>;
  sigMit: React.RefObject<SignaturePadHandle | null>;
}) {
  const today = useMemo(() => data.datum, [data.datum]);
  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 rounded-2xl border border-brand-border bg-brand-surfaceMuted px-4 py-3">
        <Checkbox
          checked={data.datenschutz}
          onCheckedChange={(c) => setData((d) => ({ ...d, datenschutz: Boolean(c) }))}
          className="mt-0.5"
        />
        <span className="text-sm text-brand-body">
          Ich bestätige die Richtigkeit meiner Angaben und die Datenschutzerklärung.
        </span>
      </label>
      <div className="grid gap-5 md:grid-cols-2">
        <TextField label="Ort" req value={data.ort} onChange={(v) => setData((d) => ({ ...d, ort: v }))} />
        <DateField label="Datum" value={today} onChange={(v) => setData((d) => ({ ...d, datum: v }))} />
      </div>
      <div>
        <Label className="text-sm font-medium text-brand-ink">
          Unterschrift {data.mitantragsteller ? "Hauptantragsteller" : ""}
          <span className="ml-0.5 text-brand-accent">*</span>
        </Label>
        <div className="mt-2">
          <SignaturePad ref={sigHaupt} />
        </div>
      </div>
      {data.mitantragsteller && (
        <div>
          <Label className="text-sm font-medium text-brand-ink">
            Unterschrift Mitantragsteller<span className="ml-0.5 text-brand-accent">*</span>
          </Label>
          <div className="mt-2">
            <SignaturePad ref={sigMit} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Feld-Primitive
// ===========================================================================

const Star = () => <span className="ml-0.5 text-brand-accent">*</span>;

function Wrap({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-sm font-medium text-brand-ink">
        {label}{req ? <Star /> : null}
      </Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function TextField({
  label, req, value, onChange, type = "text", inputMode,
}: {
  label: string; req?: boolean; value: string; onChange: (v: string) => void;
  type?: string; inputMode?: "numeric" | "text";
}) {
  return (
    <Wrap label={label} req={req}>
      <Input type={type} inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)} />
    </Wrap>
  );
}

function EuroField({ label, req, value, onChange }: { label: string; req?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <Wrap label={label} req={req}>
      <div className="relative">
        <Input
          inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="0,00" className="pr-7"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">€</span>
      </div>
    </Wrap>
  );
}

function DateField({ label, req, value, onChange }: { label: string; req?: boolean; value: string; onChange: (v: string) => void }) {
  return (
    <Wrap label={label} req={req}>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </Wrap>
  );
}

function SelectField({
  label, req, options, value, onChange,
}: {
  label: string; req?: boolean; options: readonly string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <Wrap label={label} req={req}>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Wrap>
  );
}

function SwitchField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border px-4 py-3 text-sm">
      <span className="font-medium text-brand-ink">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function CheckboxGroup({
  label, req, options, selected, onChange,
}: {
  label: string; req?: boolean; options: readonly string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  return (
    <div>
      <Label className="text-sm font-medium text-brand-ink">{label}{req ? <Star /> : null}</Label>
      <div className="mt-2 space-y-2">
        {options.map((o) => (
          <label key={o} className="flex items-start gap-3 rounded-xl border border-brand-border px-3 py-2 text-sm">
            <Checkbox checked={selected.includes(o)} onCheckedChange={() => toggle(o)} className="mt-0.5" />
            <span className="text-brand-body">{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
