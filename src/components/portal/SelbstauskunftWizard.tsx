"use client";

// PROJ-7 — Selbstauskunft: durchgehender linearer Wizard (ersetzt den
// gamifizierten Bereichs-Hub). Ein Schritt nach dem anderen wie ein Formular,
// mit Fortschrittsbalken und Autosave (jederzeit pausierbar/zwischenspeicherbar).
// Rendert über die geteilten Section-/Feld-Renderer (components/portal/
// selbstauskunft) — keine Duplizierung. Öffentlicher Token-Modus (ohne Login)
// bleibt vollständig erhalten; der Unterlagen-Schritt nur im eingeloggten Portal.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { type SignaturePadHandle } from "@/components/reservierung/SignaturePad";
import { KundenDokumenteListe } from "@/components/kunden-dokumente/KundenDokumenteListe";
import {
  PersonBlock,
  ImmobilienStep,
  UnterschriftStep,
} from "@/components/portal/selbstauskunft/sections";

import {
  type SelbstauskunftData,
  type PersonData,
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

/** Nur im eingeloggten Portal verfügbar (Upload braucht den authed Kontext). */
export interface SelbstauskunftDocsContext {
  kundeId: string;
  berufStatus: string | null;
  currentUserId: string;
  uploadedCategories: string[];
}

export interface SelbstauskunftWizardProps {
  initialData: SelbstauskunftData;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  /** Persistierter Schritt aus einem früheren Entwurf (Resume-Position). */
  startStep: number;
  crm: SelbstauskunftCrm;
  /** Token-Modus (öffentlicher Link, ohne Login): save/submit token-basiert,
   *  nach dem Absenden gibt es einen Dank-Screen statt Portal-Redirect. */
  token?: string;
  /** Unterlagen-Schritt nur im eingeloggten Portal. */
  docs?: SelbstauskunftDocsContext;
}

type StepKey =
  | "persoenlich"
  | "taetigkeit"
  | "einnahmen"
  | "vermoegen"
  | "immobilien"
  | "ausgaben"
  | "unterlagen"
  | "unterschrift";

interface StepDef {
  key: StepKey;
  title: string;
  /** validatePersonStep-Abschnitt (1..6), sonst null (kein Personen-Block). */
  section: number | null;
}

const ALL_STEPS: StepDef[] = [
  { key: "persoenlich", title: "Persönliche Daten", section: 1 },
  { key: "taetigkeit", title: "Aktuelle Tätigkeit", section: 2 },
  { key: "einnahmen", title: "Einnahmen", section: 3 },
  { key: "vermoegen", title: "Vermögen", section: 4 },
  { key: "immobilien", title: "Immobilienvermögen", section: null },
  { key: "ausgaben", title: "Ausgaben", section: 6 },
  { key: "unterlagen", title: "Unterlagen", section: null },
  { key: "unterschrift", title: "Unterschrift", section: null },
];

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
  docs,
}: SelbstauskunftWizardProps) {
  const router = useRouter();
  const publicMode = Boolean(token);

  // Unterlagen-Schritt nur, wenn ein Kundenprofil verknüpft ist (authed).
  const steps = docs ? ALL_STEPS : ALL_STEPS.filter((s) => s.key !== "unterlagen");
  const total = steps.length;

  const [data, setData] = useState<SelbstauskunftData>(initialData);
  const [step, setStep] = useState(() =>
    Math.min(total - 1, Math.max(0, startStep)),
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [publicDone, setPublicDone] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const sigHaupt = useRef<SignaturePadHandle>(null);
  const sigMit = useRef<SignaturePadHandle>(null);

  const current = steps[step];

  const setHaupt = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, haupt: { ...d.haupt, ...patch } }));
  const setMit = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, mit: { ...d.mit, ...patch } }));

  const canSave = !alreadySubmitted || editMode;

  const persist = useCallback(
    async (nextStep: number, d: SelbstauskunftData) => {
      const payload = {
        step: nextStep,
        data: d as unknown as Record<string, unknown>,
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
    },
    [crm.close_lead_id, crm.close_opportunity_id, crm.berater_vorname, crm.berater_nachname, token],
  );

  // Autosave (Zwischenspeichern): debounced bei jeder Änderung.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!canSave) return;
    const t = setTimeout(() => {
      setSaveState("saving");
      persist(step, data)
        .then(() => setSaveState("saved"))
        .catch(() => setSaveState("idle"));
    }, 800);
    return () => clearTimeout(t);
  }, [data, step, canSave, persist]);

  function validateCurrent(): string | null {
    if (current.section != null) {
      const eH = validatePersonStep(data.haupt, current.section);
      if (eH) return `Hauptantragsteller: ${eH}`;
      if (data.mitantragsteller) {
        const eM = validatePersonStep(data.mit, current.section);
        if (eM) return `Mitantragsteller: ${eM}`;
      }
    }
    if (current.key === "immobilien" && data.immobilienvermoegen === "")
      return "Bitte Ja/Nein zum Immobilienvermögen wählen.";
    return null;
  }

  async function next() {
    const err = validateCurrent();
    if (err) {
      toast.error(err);
      return;
    }
    const nextStep = Math.min(total - 1, step + 1);
    try {
      setSaving(true);
      if (canSave) await persist(nextStep, data);
      setStep(nextStep);
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
    // Alle Inhalts-Schritte clientseitig prüfen (schnelles Feedback).
    for (const s of steps) {
      if (s.section == null) continue;
      const eH = validatePersonStep(data.haupt, s.section);
      if (eH) {
        toast.error(`Hauptantragsteller, ${s.title}: ${eH}`);
        setStep(steps.indexOf(s));
        return;
      }
      if (data.mitantragsteller) {
        const eM = validatePersonStep(data.mit, s.section);
        if (eM) {
          toast.error(`Mitantragsteller, ${s.title}: ${eM}`);
          setStep(steps.indexOf(s));
          return;
        }
      }
    }
    if (data.immobilienvermoegen === "") {
      toast.error("Bitte Ja/Nein zum Immobilienvermögen wählen.");
      setStep(steps.findIndex((s) => s.key === "immobilien"));
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
        signaturMit: data.mitantragsteller
          ? (sigMit.current?.toDataURL() ?? null)
          : null,
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

  // ── Token-Modus: Dank-Screen nach dem Absenden ───────────────────────
  if (publicDone) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 md:py-16">
        <div className="rounded-3xl border border-brand-border bg-brand-surface p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-brand-success" />
          <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink">
            Vielen Dank!
          </h1>
          <p className="mt-2 text-sm text-brand-body">
            Deine Selbstauskunft wurde übermittelt. Dein Ansprechpartner meldet
            sich bei dir zu den nächsten Schritten. Du kannst dieses Fenster
            schließen.
          </p>
        </div>
      </div>
    );
  }

  // ── „Eingereicht"-Screen vor dem erneuten Bearbeiten ─────────────────
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
              <>
                Eingereicht am <strong>{fmtDate(submittedAt)}</strong>.{" "}
              </>
            ) : null}
            Du kannst deine Angaben aktualisieren.
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

  const percent = Math.round(((step + 1) / total) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-brand-ink md:text-3xl">
          Deine Selbstauskunft
        </h1>
        <p className="mt-2 text-sm text-brand-body">
          Bitte fülle nur aus, was auf dich zutrifft. Du kannst jederzeit
          pausieren — dein Fortschritt wird automatisch gespeichert.
        </p>
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-brand-muted">
            <span>
              Schritt {step + 1} von {total}: {current.title}
            </span>
            <span className="flex items-center gap-3">
              {saveState === "saving" && (
                <span className="normal-case tracking-normal">Speichern …</span>
              )}
              {saveState === "saved" && (
                <span className="inline-flex items-center gap-1 normal-case tracking-normal text-brand-success">
                  <Check className="h-3 w-3" /> Gespeichert
                </span>
              )}
              <span className="tabular-nums">{percent}%</span>
            </span>
          </div>
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <div
                key={s.key}
                className={`h-1.5 flex-1 rounded-full transition-colors duration-ds-short ease-ds-out ${
                  i <= step ? "bg-brand-accent" : "bg-brand-surfaceMuted"
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-6 rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-card md:p-8">
        {/* Mitantragsteller-Toggle nur auf dem ersten Schritt */}
        {current.key === "persoenlich" && (
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-surfaceMuted px-4 py-3">
            <span className="text-sm font-medium text-brand-ink">
              Gibt es einen Mitantragsteller?
            </span>
            <Switch
              checked={data.mitantragsteller}
              onCheckedChange={(v) =>
                setData((d) => ({ ...d, mitantragsteller: v }))
              }
            />
          </label>
        )}

        {current.key === "immobilien" ? (
          <ImmobilienStep data={data} setData={setData} />
        ) : current.key === "unterlagen" && docs ? (
          <div className="space-y-3">
            <p className="text-sm text-brand-body">
              Lade deine Nachweise sicher hoch. Du kannst diesen Schritt auch
              später im Portal vervollständigen.
            </p>
            <KundenDokumenteListe
              kundeId={docs.kundeId}
              berufStatus={docs.berufStatus}
              canUpload
              currentUserId={docs.currentUserId}
            />
          </div>
        ) : current.key === "unterschrift" ? (
          <UnterschriftStep
            data={data}
            setData={setData}
            sigHaupt={sigHaupt}
            sigMit={sigMit}
          />
        ) : current.section != null ? (
          <div className="space-y-8">
            <PersonBlock
              title={data.mitantragsteller ? "Hauptantragsteller" : undefined}
              person={data.haupt}
              set={setHaupt}
              section={current.section}
            />
            {data.mitantragsteller && (
              <PersonBlock
                title="Mitantragsteller"
                person={data.mit}
                set={setMit}
                section={current.section}
              />
            )}
          </div>
        ) : null}
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
        {step < total - 1 ? (
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
