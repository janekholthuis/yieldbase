"use client";

// PROJ-7 — „Dein Finanz-Check": gamifizierter Bereichs-Hub, der den linearen
// Selbstauskunft-Wizard ersetzt. Bereiche (Quests) werden in beliebiger
// Reihenfolge in einem fokussierten Editor-Dialog ausgefüllt. Autosave als
// Entwurf; Abschluss + Unterschrift + Einreichen am Ende. Öffentlicher
// Token-Modus (ohne Login) bleibt vollständig erhalten.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FolderClosed,
  Lock,
  PenLine,
  PiggyBank,
  Receipt,
  User,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type SelbstauskunftAreaKey,
  type AreaStatus,
  selbstauskunftProgress,
  auswerten,
  parseEuro,
  istVerheiratet,
  berufStatusFromBeschaeftigung,
  validatePersonStep,
} from "@/lib/selbstauskunft";
import { calculateBonitaet } from "@/lib/bonitaet";
import { unterlagenFor } from "@/lib/kunden-dokumente";
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

export interface SelbstauskunftHubProps {
  initialData: SelbstauskunftData;
  alreadySubmitted: boolean;
  submittedAt: string | null;
  /** Nur für Signatur-Parität mit dem alten Wizard — der Hub ist nicht-linear. */
  startStep: number;
  crm: SelbstauskunftCrm;
  /** Token-Modus (öffentlicher Link, ohne Login). */
  token?: string;
  /** Unterlagen-Bereich nur im eingeloggten Portal. */
  docs?: SelbstauskunftDocsContext;
}

type HubAreaKey = SelbstauskunftAreaKey | "unterlagen";

const PERSON_SECTION: Partial<Record<HubAreaKey, number>> = {
  persoenlich: 1,
  taetigkeit: 2,
  einkommen: 3,
  vermoegen: 4,
  ausgaben: 6,
  verbindlichkeiten: 6,
};

interface AreaMeta {
  key: HubAreaKey;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  minutes: string;
}

const AREA_META: AreaMeta[] = [
  { key: "persoenlich", icon: User, title: "Persönliche Daten", hint: "Wer du bist und wo du wohnst.", minutes: "~2 Min" },
  { key: "taetigkeit", icon: Briefcase, title: "Deine Tätigkeit", hint: "Beruf und Beschäftigung.", minutes: "~1 Min" },
  { key: "einkommen", icon: Wallet, title: "Deine Einnahmen", hint: "Womit du dein Geld verdienst.", minutes: "~2 Min" },
  { key: "vermoegen", icon: PiggyBank, title: "Dein Vermögen", hint: "Was du bereits angespart hast.", minutes: "~2 Min" },
  { key: "ausgaben", icon: Receipt, title: "Deine Ausgaben", hint: "Laufende Kosten und Versicherung.", minutes: "~2 Min" },
  { key: "verbindlichkeiten", icon: CreditCard, title: "Verbindlichkeiten", hint: "Kredite und weitere Verpflichtungen.", minutes: "~1 Min" },
  { key: "immobilien", icon: Building2, title: "Immobilien", hint: "Bereits vorhandenes Immobilienvermögen.", minutes: "~1 Min" },
  { key: "unterlagen", icon: FolderClosed, title: "Unterlagen", hint: "Lade deine Nachweise sicher hoch.", minutes: "~3 Min" },
  { key: "abschluss", icon: PenLine, title: "Abschluss & Unterschrift", hint: "Prüfen, bestätigen, unterschreiben.", minutes: "~2 Min" },
];

const AREA_TITLE: Record<HubAreaKey, string> = AREA_META.reduce(
  (acc, m) => ({ ...acc, [m.key]: m.title }),
  {} as Record<HubAreaKey, string>,
);

const fmtEUR0 = (n: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

function headline(percent: number, vorname: string): string {
  if (percent >= 100) return "Alles erledigt!";
  if (percent >= 71) return "Fast geschafft";
  if (percent >= 41) return "Über die Hälfte";
  if (percent >= 1) return "Guter Start";
  return vorname ? `Los geht's, ${vorname}` : "Los geht's";
}

export function SelbstauskunftHub({
  initialData,
  alreadySubmitted,
  submittedAt,
  crm,
  token,
  docs,
}: SelbstauskunftHubProps) {
  const router = useRouter();
  const publicMode = Boolean(token);

  const [data, setData] = useState<SelbstauskunftData>(initialData);
  const [activeArea, setActiveArea] = useState<HubAreaKey | null>(null);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publicDone, setPublicDone] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const sigHaupt = useRef<SignaturePadHandle | null>(null);
  const sigMit = useRef<SignaturePadHandle | null>(null);

  const setHaupt = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, haupt: { ...d.haupt, ...patch } }));
  const setMit = (patch: Partial<PersonData>) =>
    setData((d) => ({ ...d, mit: { ...d.mit, ...patch } }));

  const progress = selbstauskunftProgress(data);
  const statusOf = (k: SelbstauskunftAreaKey): AreaStatus =>
    progress.areas.find((a) => a.key === k)?.status ?? "leer";

  // Autosave: nur wenn kein rechtlich eingereichtes Dokument (oder bewusst im
  // Bearbeiten-Modus). Speichert genau wie der Wizard einen Entwurf; die
  // versteckten CRM-Felder werden unverändert durchgereicht.
  const canSave = !alreadySubmitted || editing;

  const persist = useCallback(
    async (d: SelbstauskunftData) => {
      if (alreadySubmitted && !editing) return;
      const prog = selbstauskunftProgress(d);
      const payload = {
        step: Math.min(7, prog.requiredDone),
        data: d as unknown as Record<string, unknown>,
        close_lead_id: crm.close_lead_id,
        close_opportunity_id: crm.close_opportunity_id,
        berater_vorname: crm.berater_vorname,
        berater_nachname: crm.berater_nachname,
      };
      try {
        setSaveState("saving");
        if (token) {
          await saveSelbstauskunftDraftByToken({ token, ...payload });
        } else {
          await saveSelbstauskunftDraft(payload);
        }
        setSaveState("saved");
      } catch {
        setSaveState("idle");
      }
    },
    [alreadySubmitted, editing, crm.close_lead_id, crm.close_opportunity_id, crm.berater_vorname, crm.berater_nachname, token],
  );

  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!canSave) return;
    const t = setTimeout(() => {
      void persist(data);
    }, 800);
    return () => clearTimeout(t);
  }, [data, canSave, persist]);

  function closeEditor() {
    setActiveArea(null);
    if (canSave) void persist(data);
  }

  // ── Live-Schätzung (grob, unverbindlich) ──────────────────────────────
  const evalR = auswerten(data);
  const einkommenJahr = Math.round(evalR.einnahmen_summe_monat * 12);
  const berufForEst =
    berufStatusFromBeschaeftigung(data.haupt.beschaeftigung) ?? "angestellter";
  const estimateRaw =
    einkommenJahr > 0
      ? calculateBonitaet({
          brutto: einkommenJahr,
          verheiratet: istVerheiratet(data.haupt.familienstand),
          eigenkapital: evalR.vermoegen_summe,
          kreditverpflichtungen_monatlich: evalR.kreditverpflichtungen_monat,
          erwachsene_im_haushalt: data.mitantragsteller ? 2 : 1,
          kinder_anzahl: Math.max(0, Math.round(parseEuro(data.haupt.kinder_anzahl))),
          beruf_status: berufForEst,
        }).max_finanzierbar
      : 0;
  // Auf 1.000 € runden — betont den Schätz-Charakter.
  const estimate = estimateRaw > 0 ? Math.round(estimateRaw / 1000) * 1000 : 0;

  // ── Unterlagen-Fortschritt (nur authed) ───────────────────────────────
  const docReq = docs ? unterlagenFor(docs.berufStatus) : [];
  const docDone = docs
    ? docReq.filter((u) => docs.uploadedCategories.includes(u.slug)).length
    : 0;
  const docStatus: AreaStatus =
    docReq.length > 0 && docDone >= docReq.length
      ? "fertig"
      : docDone > 0
        ? "teilweise"
        : "leer";

  const vorname = data.haupt.vorname.trim();

  async function onSubmit() {
    for (const step of [1, 2, 3, 4, 6]) {
      const eH = validatePersonStep(data.haupt, step);
      if (eH) {
        toast.error(`Hauptantragsteller: ${eH}`);
        return;
      }
      if (data.mitantragsteller) {
        const eM = validatePersonStep(data.mit, step);
        if (eM) {
          toast.error(`Mitantragsteller: ${eM}`);
          return;
        }
      }
    }
    if (data.immobilienvermoegen === "") {
      toast.error("Bitte Ja/Nein zum Immobilienvermögen wählen.");
      setActiveArea("immobilien");
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
        setActiveArea(null);
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

  // ── „Geschafft"-Siegel für ein bereits eingereichtes Dokument ────────
  if (alreadySubmitted && !editing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
        <div className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-card">
          <div className="mb-4 flex items-center justify-center">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-successSoft text-brand-success">
              <Check className="h-8 w-8" />
            </span>
          </div>
          <div className="mb-1 flex items-center justify-center gap-2 text-brand-success">
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">
              Geschafft
            </span>
          </div>
          <h1 className="text-center font-display text-2xl font-semibold tracking-tight text-brand-ink">
            Dein Finanz-Check ist vollständig
          </h1>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-brand-body">
            {submittedAt ? (
              <>
                Eingereicht am <strong>{fmtDate(submittedAt)}</strong>.{" "}
              </>
            ) : null}
            Vielen Dank — deine Angaben liegen deinem Berater vor.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setEditing(true)}
              className="rounded-2xl"
            >
              Daten bearbeiten
            </Button>
            {!publicMode && (
              <Button asChild className="rounded-2xl">
                <Link href="/portal">Zurück zum Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const areasForGrid = AREA_META.filter(
    (m) => m.key !== "unterlagen" || Boolean(docs),
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      {/* Hero */}
      <section className="rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-card md:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <ProgressRing percent={progress.percent} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
              Dein Finanz-Check
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-brand-ink md:text-3xl">
              {headline(progress.percent, vorname)}
            </h1>
            <p className="mt-2 text-sm text-brand-body">
              Fülle die Bereiche in deinem Tempo aus — in beliebiger Reihenfolge.
              Dein Fortschritt wird automatisch gespeichert.
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brand-muted sm:justify-start">
              <span className="tabular-nums">
                {progress.requiredDone} von {progress.requiredTotal} Pflichtbereichen fertig
              </span>
              {saveState === "saving" && <span>Speichern …</span>}
              {saveState === "saved" && (
                <span className="inline-flex items-center gap-1 text-brand-success">
                  <Check className="h-3 w-3" /> Gespeichert
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live-Schätzung */}
        <div className="mt-6 rounded-2xl border border-brand-accent/30 bg-brand-accentSoft/60 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                Deine geschätzte Finanzierung
              </p>
              <p className="mt-0.5 text-xs text-brand-muted">
                Grobe Schätzung · unverbindlich, keine Zusage
              </p>
            </div>
            <div className="font-display text-2xl font-semibold tabular-nums tracking-tight text-brand-ink md:text-3xl">
              {estimate > 0 ? fmtEUR0(estimate) : "—"}
            </div>
          </div>
          {estimate === 0 && (
            <p className="mt-2 text-xs text-brand-muted">
              Sobald du deine Einnahmen einträgst, erscheint hier deine grobe
              Schätzung.
            </p>
          )}
        </div>
      </section>

      {/* Bereichs-Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areasForGrid.map((meta) => {
          const status =
            meta.key === "unterlagen"
              ? docStatus
              : statusOf(meta.key as SelbstauskunftAreaKey);
          const locked = meta.key === "abschluss" && !progress.submittable;
          const extra =
            meta.key === "unterlagen"
              ? `${docDone}/${docReq.length} hochgeladen`
              : undefined;
          return (
            <AreaCard
              key={meta.key}
              meta={meta}
              status={status}
              locked={locked}
              extra={extra}
              onOpen={() => setActiveArea(meta.key)}
            />
          );
        })}
      </div>

      {/* Editor-Dialog */}
      <Dialog
        open={activeArea != null}
        onOpenChange={(open) => {
          if (!open) closeEditor();
        }}
      >
        <DialogContent className="max-w-2xl gap-0 p-0">
          {activeArea && (
            <>
              <DialogHeader className="border-b border-brand-border px-6 py-4 text-left">
                <DialogTitle className="font-display text-lg font-semibold text-brand-ink">
                  {AREA_TITLE[activeArea]}
                </DialogTitle>
                <DialogDescription className="text-sm text-brand-muted">
                  {AREA_META.find((m) => m.key === activeArea)?.hint}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[65vh] space-y-6 overflow-y-auto px-6 py-5">
                {renderEditorBody({
                  area: activeArea,
                  data,
                  setData,
                  setHaupt,
                  setMit,
                  sigHaupt,
                  sigMit,
                  docs,
                })}
              </div>

              <DialogFooter className="border-t border-brand-border px-6 py-4">
                {activeArea === "abschluss" ? (
                  <Button
                    onClick={onSubmit}
                    disabled={submitting}
                    size="lg"
                    className="rounded-2xl bg-brand-accent text-white hover:bg-brand-accent/90"
                  >
                    {submitting ? "Wird eingereicht …" : "Selbstauskunft einreichen"}
                  </Button>
                ) : activeArea === "unterlagen" ? (
                  <Button onClick={closeEditor} className="rounded-2xl">
                    Fertig
                  </Button>
                ) : (
                  <Button onClick={closeEditor} className="rounded-2xl">
                    Speichern & zurück
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===========================================================================
// Editor-Body je Bereich (nutzt die geteilten Section-Renderer)
// ===========================================================================

function renderEditorBody({
  area,
  data,
  setData,
  setHaupt,
  setMit,
  sigHaupt,
  sigMit,
  docs,
}: {
  area: HubAreaKey;
  data: SelbstauskunftData;
  setData: React.Dispatch<React.SetStateAction<SelbstauskunftData>>;
  setHaupt: (patch: Partial<PersonData>) => void;
  setMit: (patch: Partial<PersonData>) => void;
  sigHaupt: React.RefObject<SignaturePadHandle | null>;
  sigMit: React.RefObject<SignaturePadHandle | null>;
  docs?: SelbstauskunftDocsContext;
}) {
  if (area === "immobilien") {
    return <ImmobilienStep data={data} setData={setData} />;
  }
  if (area === "abschluss") {
    return (
      <UnterschriftStep
        data={data}
        setData={setData}
        sigHaupt={sigHaupt}
        sigMit={sigMit}
      />
    );
  }
  if (area === "unterlagen") {
    if (!docs) return null;
    return (
      <KundenDokumenteListe
        kundeId={docs.kundeId}
        berufStatus={docs.berufStatus}
        canUpload
        currentUserId={docs.currentUserId}
      />
    );
  }

  const section = PERSON_SECTION[area];
  if (section == null) return null;
  return (
    <div className="space-y-8">
      {area === "persoenlich" && (
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
      <PersonBlock
        title={data.mitantragsteller ? "Hauptantragsteller" : undefined}
        person={data.haupt}
        set={setHaupt}
        section={section}
      />
      {data.mitantragsteller && (
        <PersonBlock
          title="Mitantragsteller"
          person={data.mit}
          set={setMit}
          section={section}
        />
      )}
    </div>
  );
}

// ===========================================================================
// Bereichs-Karte
// ===========================================================================

function AreaCard({
  meta,
  status,
  locked,
  extra,
  onOpen,
}: {
  meta: AreaMeta;
  status: AreaStatus;
  locked: boolean;
  extra?: string;
  onOpen: () => void;
}) {
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={locked}
      aria-label={`${meta.title} bearbeiten`}
      className="group flex h-full flex-col rounded-2xl border border-brand-border bg-brand-surface p-5 text-left shadow-card transition duration-ds-short ease-ds-out hover:border-brand-accent/50 hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-brand-border disabled:hover:shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
            status === "fertig"
              ? "border-brand-success/30 bg-brand-successSoft text-brand-success"
              : "border-brand-accent/30 bg-brand-accentSoft text-brand-accent"
          }`}
          aria-hidden
        >
          {locked ? <Lock className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </span>
        <StatusChip status={status} locked={locked} />
      </div>
      <h3 className="mt-4 font-display text-base font-semibold tracking-tight text-brand-ink">
        {meta.title}
      </h3>
      <p className="mt-1 text-sm text-brand-body">{meta.hint}</p>
      <div className="mt-4 flex items-center justify-between gap-2 text-xs text-brand-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {extra ?? meta.minutes}
        </span>
        {!locked && (
          <span className="inline-flex items-center gap-1 font-medium text-brand-accent">
            {status === "leer" ? "Starten" : status === "fertig" ? "Ansehen" : "Weiter"}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        )}
      </div>
    </button>
  );
}

function StatusChip({
  status,
  locked,
}: {
  status: AreaStatus;
  locked?: boolean;
}) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-surfaceMuted px-2.5 py-1 text-xs font-medium text-brand-muted">
        Gesperrt
      </span>
    );
  }
  if (status === "fertig") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-successSoft px-2.5 py-1 text-xs font-semibold text-brand-success">
        <Check className="h-3 w-3" /> Fertig
      </span>
    );
  }
  if (status === "teilweise") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-warningSoft px-2.5 py-1 text-xs font-semibold text-brand-warning">
        In Arbeit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-surfaceMuted px-2.5 py-1 text-xs font-medium text-brand-muted">
      Offen
    </span>
  );
}

// ===========================================================================
// Fortschritts-Ring (SVG, Gold-Akzent)
// ===========================================================================

function ProgressRing({ percent }: { percent: number }) {
  const size = 128;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        role="img"
        aria-label={`Fortschritt ${percent} Prozent`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-brand-surfaceMuted"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-brand-accent transition-[stroke-dashoffset] duration-500 ease-ds-out"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold tabular-nums text-brand-ink">
          {percent}%
        </span>
      </div>
    </div>
  );
}
