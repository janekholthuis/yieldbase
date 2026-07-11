"use client";

// PROJ-7 — Selbstauskunft: durchgehender linearer Wizard im „EMI"-Look
// (angelehnt an das Fillout-Referenzformular): Foto-Hero-Banner, monochrome
// editorial Fläche, Instrument-Sans-Titel, luftige Felder, Haupt-/Mitantrag-
// steller nebeneinander. Ein Schritt nach dem anderen mit Fortschrittsbalken
// und Autosave (jederzeit pausierbar/zwischenspeicherbar). Rendert über die
// geteilten Section-/Feld-Renderer (components/portal/selbstauskunft).
// Öffentlicher Token-Modus (ohne Login) bleibt vollständig erhalten; der
// Unterlagen-Schritt nur im eingeloggten Portal.

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

// Foto-Banner oben. Standard = mitgeliefertes Fassaden-SVG; für ein echtes Foto
// die Datei public/selbstauskunft-hero.jpg ablegen und HERO_SRC hier umbiegen.
const HERO_SRC = "/selbstauskunft-hero.svg";

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
  /** Token-Modus (öffentlicher Link, ohne Login). */
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

function HeroBanner() {
  return (
    <div
      aria-hidden
      className="h-52 w-full bg-neutral-100 bg-cover bg-center md:h-72"
      style={{ backgroundImage: `url(${HERO_SRC})` }}
    />
  );
}

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
      <div className="min-h-screen bg-white font-instrument">
        <HeroBanner />
        <div className="mx-auto max-w-2xl px-6 py-12 text-center md:py-16">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-neutral-900" />
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Vielen Dank!
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
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
      <div className="min-h-screen bg-white font-instrument">
        <HeroBanner />
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-3 flex items-center gap-2 text-neutral-900">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Eingereicht
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Deine Selbstauskunft
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
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
              className="rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
            >
              Daten bearbeiten
            </Button>
            {!publicMode && (
              <Button
                asChild
                variant="outline"
                className="rounded-lg border-neutral-300 text-neutral-700"
              >
                <Link href="/portal">Zurück zum Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const percent = Math.round(((step + 1) / total) * 100);
  const twoColumns = data.mitantragsteller && current.section != null;

  return (
    <div className="min-h-screen bg-white font-instrument">
      <HeroBanner />

      <div className="mx-auto max-w-4xl px-6 pb-20 pt-8 md:pt-10">
        {/* Titel + Trennstrich */}
        <header>
          {/* Single-Tenant EMI: Markenname im Titel wie im Referenzformular. */}
          <h1 className="text-[2rem] font-semibold leading-[1.1] tracking-[-0.02em] text-neutral-900 md:text-[2.5rem]">
            Selbstauskunft{" "}
            <span className="text-neutral-400">Erfolg mit Immobilien</span>
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-500">
            Bitte fülle nur aus, was auf dich zutrifft. Du kannst jederzeit
            pausieren — dein Fortschritt wird automatisch gespeichert.
          </p>
          <div className="mt-6 border-t border-neutral-200" />
        </header>

        {/* Fortschritt */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-neutral-500">
            <span className="font-medium text-neutral-700">
              Schritt {step + 1} von {total}: {current.title}
            </span>
            <span className="flex items-center gap-3">
              {saveState === "saving" && <span>Speichern …</span>}
              {saveState === "saved" && (
                <span className="inline-flex items-center gap-1 text-neutral-700">
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
                className={`h-1 flex-1 rounded-full transition-colors duration-ds-short ease-ds-out ${
                  i <= step ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Schritt-Inhalt */}
        <div className="mt-10 space-y-8">
          {current.key === "persoenlich" && (
            <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <span className="text-sm font-medium text-neutral-800">
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

          <h2 className="text-xl font-semibold tracking-tight text-neutral-900 md:text-[1.6rem]">
            {current.title}
          </h2>

          {current.key === "immobilien" ? (
            <ImmobilienStep data={data} setData={setData} />
          ) : current.key === "unterlagen" && docs ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
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
            twoColumns ? (
              <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
                <PersonBlock
                  title="Hauptantragsteller"
                  person={data.haupt}
                  set={setHaupt}
                  section={current.section}
                  cols={1}
                />
                <PersonBlock
                  title="Mitantragsteller"
                  person={data.mit}
                  set={setMit}
                  section={current.section}
                  cols={1}
                />
              </div>
            ) : (
              <PersonBlock
                person={data.haupt}
                set={setHaupt}
                section={current.section}
                cols={2}
              />
            )
          ) : null}
        </div>

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={prev}
            disabled={step === 0 || saving || submitting}
            className="h-11 rounded-lg border-neutral-300 px-5 text-[15px] font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Button>
          {step < total - 1 ? (
            <Button
              onClick={next}
              disabled={saving}
              className="h-11 rounded-lg bg-neutral-900 px-7 text-[15px] font-medium text-white hover:bg-neutral-800"
            >
              {saving ? "Speichern …" : "Weiter"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onSubmit}
              disabled={submitting}
              className="h-11 rounded-lg bg-neutral-900 px-7 text-[15px] font-medium text-white hover:bg-neutral-800"
            >
              {submitting ? "Wird eingereicht …" : "Selbstauskunft einreichen"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
