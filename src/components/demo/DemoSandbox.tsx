"use client";

// PROJ-24: Öffentliche, auf einen Lead gebrandete Demo-Sandbox.
// Theming läuft ausschließlich über die am :root injizierten Brand-Tokens
// (bg-brand-primary, text-brand-ink, …). Keine echten Daten, rein clientseitig.

import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Calculator,
  ArrowLeft,
  MapPin,
  Ruler,
  DoorOpen,
  Layers,
  TrendingUp,
  CheckCircle2,
  Send,
} from "lucide-react";
import {
  DEMO_PROJEKTE,
  DEMO_KPIS,
  bruttorendite,
  demoCalcInputs,
  type DemoProjekt,
  type DemoUnit,
} from "@/lib/demo/sample-data";
import { calculate } from "@/lib/kalkulation";
import { submitDemoLead } from "@/lib/actions/demo-links";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";

const eur = (x: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(x);

const pct = (x: number) =>
  `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(x)} %`;

const STATUS_LABEL: Record<DemoUnit["status"], string> = {
  frei: "Frei",
  reserviert: "Reserviert",
  verkauft: "Verkauft",
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StatusChip({ status }: { status: DemoUnit["status"] }) {
  if (status === "frei") {
    return (
      <span className="inline-flex items-center rounded-[4px] bg-brand-successSoft px-2 py-0.5 text-xs font-medium text-brand-success">
        Frei
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[4px] bg-brand-surfaceMuted px-2 py-0.5 text-xs font-medium text-brand-muted">
      {STATUS_LABEL[status]}
    </span>
  );
}

function LeadLogo({
  logoUrl,
  company,
  className = "",
}: {
  logoUrl: string | null;
  company: string;
  className?: string;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={company}
        className={`max-h-8 w-auto object-contain ${className}`}
      />
    );
  }
  return (
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-[4px] bg-brand-primary text-sm font-semibold text-brand-accentText ${className}`}
    >
      EH
    </div>
  );
}

// ── Rechner ──────────────────────────────────────────────────────────────
function UnitRechner({ unit }: { unit: DemoUnit }) {
  const base = useMemo(() => demoCalcInputs(unit), [unit]);
  const [ekProzent, setEkProzent] = useState(10);
  const [zins, setZins] = useState(base.zins);
  const [tilgung, setTilgung] = useState(base.tilgung);

  const ekBetrag = Math.round((unit.kaufpreis * ekProzent) / 100);

  const result = useMemo(
    () => calculate({ ...base, ekBetrag, zins, tilgung }),
    [base, ekBetrag, zins, tilgung],
  );

  const maxVermoegen = Math.max(
    1,
    ...result.jahre.map((j) => Math.abs(j.vermoegen)),
  );

  return (
    <div className="border border-brand-border bg-white">
      <div className="border-b border-brand-border px-4 py-3">
        <h3 className="text-sm font-semibold text-brand-ink">
          Investitionsrechner
        </h3>
        <p className="text-xs text-brand-muted">
          Werte live anpassen — alle Kennzahlen aktualisieren sich sofort.
        </p>
      </div>

      <div className="grid gap-5 p-4 lg:grid-cols-2">
        {/* Regler */}
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label className="text-brand-body">Eigenkapital</Label>
              <span className="font-medium text-brand-ink">
                {ekProzent} % · {eur(ekBetrag)}
              </span>
            </div>
            <Slider
              value={[ekProzent]}
              min={0}
              max={40}
              step={1}
              onValueChange={(v) => setEkProzent(v[0])}
              aria-label="Eigenkapital in Prozent"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label className="text-brand-body">Sollzins</Label>
              <span className="font-medium text-brand-ink">{pct(zins)}</span>
            </div>
            <Slider
              value={[zins]}
              min={1}
              max={6}
              step={0.1}
              onValueChange={(v) => setZins(v[0])}
              aria-label="Sollzins in Prozent"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <Label className="text-brand-body">Tilgung</Label>
              <span className="font-medium text-brand-ink">{pct(tilgung)}</span>
            </div>
            <Slider
              value={[tilgung]}
              min={1}
              max={5}
              step={0.1}
              onValueChange={(v) => setTilgung(v[0])}
              aria-label="Anfängliche Tilgung in Prozent"
            />
          </div>
        </div>

        {/* Ergebnis-Kennzahlen */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-brand-border bg-brand-border">
          <Kennzahl
            label="Cashflow / Monat"
            value={eur(result.cashflowNachSteuerMonat)}
            positive={result.cashflowNachSteuerMonat >= 0}
          />
          <Kennzahl
            label="Bruttomietrendite"
            value={pct(result.bruttoMietrendite)}
          />
          <Kennzahl
            label="Vermögen nach 15 J."
            value={eur(result.endVermoegen)}
            positive={result.endVermoegen >= 0}
          />
          <Kennzahl label="Rate / Monat" value={eur(result.annuitaetMonat)} />
        </div>
      </div>

      {/* Balkendiagramm Vermögensentwicklung */}
      <div className="border-t border-brand-border px-4 py-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-brand-ink">
          <TrendingUp className="h-4 w-4 text-brand-primary" />
          Vermögensentwicklung
        </div>
        <div className="flex h-40 items-end gap-1.5">
          {result.jahre.map((j) => {
            const h = Math.max(2, (Math.abs(j.vermoegen) / maxVermoegen) * 100);
            const neg = j.vermoegen < 0;
            return (
              <div
                key={j.jahr}
                className="group flex flex-1 flex-col items-center justify-end"
                title={`Jahr ${j.jahr}: ${eur(j.vermoegen)}`}
              >
                <div
                  className={`w-full rounded-t-[2px] ${
                    neg ? "bg-brand-surfaceMuted" : "bg-brand-primary"
                  }`}
                  style={{ height: `${h}%` }}
                />
                <span className="mt-1 hidden text-[10px] text-brand-muted sm:block">
                  {j.jahr}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-brand-muted">
          <span>Heute</span>
          <span>nach {result.jahre.length - 1} Jahren</span>
        </div>
      </div>
    </div>
  );
}

function Kennzahl({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white p-3">
      <div className="text-xs text-brand-muted">{label}</div>
      <div
        className={`mt-1 text-base font-semibold ${
          positive === undefined
            ? "text-brand-ink"
            : positive
              ? "text-brand-success"
              : "text-brand-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// ── Objekt-Detail ────────────────────────────────────────────────────────
function ObjektDetail({
  projekt,
  onBack,
}: {
  projekt: DemoProjekt;
  onBack: () => void;
}) {
  const [unitId, setUnitId] = useState(projekt.einheiten[0]?.id);
  const unit =
    projekt.einheiten.find((u) => u.id === unitId) ?? projekt.einheiten[0];

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-brand-body hover:text-brand-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </button>

      <div className="border border-brand-border bg-white">
        <div
          className={`flex items-end bg-gradient-to-br ${projekt.accent} px-5 py-6`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[4px] bg-brand-primary text-lg font-semibold text-brand-accentText">
              {initials(projekt.name)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-ink">
                {projekt.name}
              </h2>
              <div className="mt-0.5 flex items-center gap-1 text-sm text-brand-body">
                <MapPin className="h-3.5 w-3.5" />
                {projekt.strasse}, {projekt.plz} {projekt.stadt}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-brand-border bg-brand-border sm:grid-cols-4">
          <Fact label="Baujahr" value={String(projekt.baujahr)} />
          <Fact label="Zustand" value={projekt.zustand} />
          <Fact label="Einheiten" value={String(projekt.einheiten.length)} />
          <Fact label="Energieklasse" value={projekt.energieklasse} />
        </div>
      </div>

      {/* Einheiten-Auswahl */}
      <div>
        <div className="mb-2 text-sm font-medium text-brand-ink">
          Einheit wählen
        </div>
        <div className="flex flex-wrap gap-2">
          {projekt.einheiten.map((u) => {
            const active = u.id === unit?.id;
            return (
              <button
                key={u.id}
                onClick={() => setUnitId(u.id)}
                className={`inline-flex items-center gap-2 rounded-[4px] border px-3 py-1.5 text-sm ${
                  active
                    ? "border-brand-primary bg-brand-primaryTint text-brand-primary"
                    : "border-brand-border bg-white text-brand-body hover:border-brand-primary"
                }`}
              >
                {u.bezeichnung}
                <StatusChip status={u.status} />
              </button>
            );
          })}
        </div>
      </div>

      {unit && (
        <>
          {/* Kennzahlen der Einheit */}
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[4px] border border-brand-border bg-brand-border sm:grid-cols-5">
            <UnitFact
              icon={<TrendingUp className="h-4 w-4" />}
              label="Kaufpreis"
              value={eur(unit.kaufpreis)}
            />
            <UnitFact
              icon={<Ruler className="h-4 w-4" />}
              label="Wohnfläche"
              value={`${unit.wohnflaeche} m²`}
            />
            <UnitFact
              icon={<DoorOpen className="h-4 w-4" />}
              label="Zimmer"
              value={String(unit.zimmer)}
            />
            <UnitFact
              icon={<Layers className="h-4 w-4" />}
              label="Etage"
              value={unit.etage}
            />
            <UnitFact
              icon={<TrendingUp className="h-4 w-4" />}
              label="Bruttorendite"
              value={pct(bruttorendite(unit))}
            />
          </div>

          <UnitRechner unit={unit} />
        </>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="text-xs text-brand-muted">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-brand-ink">{value}</div>
    </div>
  );
}

function UnitFact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white p-3">
      <div className="flex items-center gap-1.5 text-brand-muted">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-brand-ink">{value}</div>
    </div>
  );
}

// ── Objekte-Liste ────────────────────────────────────────────────────────
function ObjekteListe({
  onSelect,
}: {
  onSelect: (p: DemoProjekt) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-brand-ink">Objekte</h1>
        <p className="text-sm text-brand-muted">
          Beispielhafte Projekte — so präsentieren sich Ihre Angebote in der
          Plattform.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_PROJEKTE.map((p) => {
          const frei = p.einheiten.filter((u) => u.status === "frei").length;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p)}
              className="group flex flex-col overflow-hidden rounded-[4px] border border-brand-border bg-white text-left transition-colors hover:border-brand-primary"
            >
              <div
                className={`flex items-center gap-3 bg-gradient-to-br ${p.accent} px-4 py-5`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-brand-primary text-sm font-semibold text-brand-accentText">
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-brand-ink">
                    {p.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-brand-body">
                    <MapPin className="h-3 w-3" />
                    {p.stadt}
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-brand-muted">Baujahr</div>
                    <div className="font-medium text-brand-ink">
                      {p.baujahr}
                    </div>
                  </div>
                  <div>
                    <div className="text-brand-muted">Einheiten</div>
                    <div className="font-medium text-brand-ink">
                      {p.einheiten.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-brand-muted">Energie</div>
                    <div className="font-medium text-brand-ink">
                      {p.energieklasse}
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {frei > 0 && (
                    <span className="inline-flex items-center rounded-[4px] bg-brand-successSoft px-2 py-0.5 text-xs font-medium text-brand-success">
                      {frei} frei
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-[4px] bg-brand-surfaceMuted px-2 py-0.5 text-xs font-medium text-brand-muted">
                    {p.zustand}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────
function DashboardView({ company }: { company: string }) {
  const cards = [
    { label: "Objekte", value: DEMO_KPIS.objekte },
    { label: "Einheiten", value: DEMO_KPIS.einheiten },
    { label: "Freie Einheiten", value: DEMO_KPIS.frei },
  ];
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-brand-ink">Dashboard</h1>
        <p className="text-sm text-brand-muted">
          Willkommen zurück, {company}. Hier ein Überblick über Ihren
          (Beispiel-)Bestand.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[4px] border border-brand-border bg-white p-5"
          >
            <div className="text-sm text-brand-muted">{c.label}</div>
            <div className="mt-1 text-3xl font-semibold text-brand-ink">
              {c.value}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-[4px] border border-brand-border bg-brand-surfaceMuted p-4 text-sm text-brand-body">
        Das ist eine personalisierte Vorschau. In Ihrer echten Plattform
        verwalten Sie hier Projekte, Einheiten, Kunden und Reservierungen — voll
        in Ihrem Branding.
      </div>
    </div>
  );
}

// ── Kontakt-Dialog ───────────────────────────────────────────────────────
function KontaktDialog({
  slug,
  company,
  open,
  onOpenChange,
  onSuccess,
}: {
  slug: string;
  company: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [firma, setFirma] = useState(company);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      toast.error("Bitte eine gültige E-Mail-Adresse angeben.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitDemoLead({
        slug,
        name: name.trim() || undefined,
        company: firma.trim() || undefined,
        email: email.trim(),
        message: message.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Vielen Dank! Wir melden uns in Kürze bei Ihnen.");
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(res.error ?? "Anfrage konnte nicht gesendet werden.");
      }
    } catch {
      toast.error("Anfrage konnte nicht gesendet werden.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[4px] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Echten Account anfragen</DialogTitle>
          <DialogDescription>
            Hinterlassen Sie Ihre Kontaktdaten — wir richten Ihre eigene
            Plattform ein.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="demo-name">Name</Label>
            <Input
              id="demo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Max Mustermann"
              className="rounded-[4px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-firma">Firma</Label>
            <Input
              id="demo-firma"
              value={firma}
              onChange={(e) => setFirma(e.target.value)}
              placeholder="Ihre Firma"
              className="rounded-[4px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-email">
              E-Mail <span className="text-brand-primary">*</span>
            </Label>
            <Input
              id="demo-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firma.de"
              className="rounded-[4px]"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-message">Nachricht</Label>
            <Textarea
              id="demo-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Worüber möchten Sie sprechen?"
              rows={3}
              className="rounded-[4px]"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !emailValid}
            className="w-full rounded-[4px] bg-brand-primary text-brand-accentText hover:bg-brand-primary/90"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Wird gesendet…" : "Anfrage senden"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Hauptkomponente ──────────────────────────────────────────────────────
type View = "dashboard" | "objekte";

export function DemoSandbox({
  slug,
  company,
  logoUrl,
}: {
  slug: string;
  company: string;
  logoUrl: string | null;
}) {
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [view, setView] = useState<View>("objekte");
  const [selected, setSelected] = useState<DemoProjekt | null>(null);
  const [kontaktOpen, setKontaktOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nav: {
    key: View | "stub";
    label: string;
    icon: React.ReactNode;
    active: boolean;
    onClick?: () => void;
  }[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      active: view === "dashboard",
      onClick: () => {
        setView("dashboard");
        setSelected(null);
      },
    },
    {
      key: "objekte",
      label: "Objekte",
      icon: <Building2 className="h-4 w-4" />,
      active: view === "objekte",
      onClick: () => {
        setView("objekte");
        setSelected(null);
      },
    },
    {
      key: "stub",
      label: "Kunden",
      icon: <Users className="h-4 w-4" />,
      active: false,
    },
    {
      key: "stub",
      label: "Kalkulation",
      icon: <Calculator className="h-4 w-4" />,
      active: false,
    },
  ];

  // ── Willkommens-Overlay ──
  if (welcomeOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-surfaceMuted px-6">
        <div className="w-full max-w-lg rounded-[4px] border border-brand-border bg-white p-8 text-center shadow-sm">
          <div className="mb-6 flex justify-center">
            <LeadLogo logoUrl={logoUrl} company={company} className="max-h-16" />
          </div>
          <Badge
            variant="secondary"
            className="rounded-[4px] bg-brand-primaryTint text-brand-primary"
          >
            Personalisierte Demo · erstellt von EMI Hub
          </Badge>
          <h1 className="mt-5 text-2xl font-semibold text-brand-ink">
            Willkommen, {company}
          </h1>
          <p className="mt-2 text-brand-body">
            So könnte Ihre Vertriebsplattform aussehen.
          </p>
          <Button
            onClick={() => setWelcomeOpen(false)}
            className="mt-7 w-full rounded-[4px] bg-brand-primary text-brand-accentText hover:bg-brand-primary/90"
          >
            Plattform ansehen
          </Button>
        </div>
      </div>
    );
  }

  // ── Sandbox-Shell ──
  return (
    <div className="min-h-screen bg-brand-surfaceMuted pb-24 text-brand-body">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b border-brand-border bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <LeadLogo logoUrl={logoUrl} company={company} />
            <span className="text-sm font-semibold text-brand-ink">
              {company}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-[4px] bg-brand-primaryTint px-2 py-0.5 text-xs font-medium text-brand-primary">
              Demo
            </span>
            <span className="hidden text-xs text-brand-muted sm:inline">
              erstellt von EMI Hub
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Top-Tabs */}
      <nav className="flex gap-1 overflow-x-auto border-b border-brand-border bg-white px-4 py-2 md:hidden">
        {nav.map((n, i) => (
          <button
            key={`${n.label}-${i}`}
            onClick={n.onClick}
            disabled={!n.onClick}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] px-3 py-1.5 text-sm ${
              n.active
                ? "bg-brand-primaryTint text-brand-primary"
                : "text-brand-body disabled:text-brand-muted"
            }`}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        {/* Sidebar (Desktop) */}
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="space-y-1">
            {nav.map((n, i) => (
              <button
                key={`${n.label}-${i}`}
                onClick={n.onClick}
                disabled={!n.onClick}
                className={`flex w-full items-center gap-2.5 rounded-[4px] px-3 py-2 text-sm ${
                  n.active
                    ? "bg-brand-primaryTint font-medium text-brand-primary"
                    : "text-brand-body hover:bg-brand-surfaceMuted disabled:text-brand-muted disabled:hover:bg-transparent"
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Inhalt */}
        <main className="min-w-0 flex-1">
          {view === "dashboard" && <DashboardView company={company} />}
          {view === "objekte" &&
            (selected ? (
              <ObjektDetail
                projekt={selected}
                onBack={() => setSelected(null)}
              />
            ) : (
              <ObjekteListe onSelect={setSelected} />
            ))}

          <footer className="mt-10 border-t border-brand-border pt-4 text-xs text-brand-muted">
            Unverbindliche, personalisierte Demo · erstellt von EMI Hub. Keine
            echten Objektdaten.
          </footer>
        </main>
      </div>

      {/* Dauerhafte CTA-Leiste */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-border bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-2 text-sm">
            {submitted ? (
              <span className="inline-flex items-center gap-1.5 text-brand-success">
                <CheckCircle2 className="h-4 w-4" />
                Vielen Dank! Wir melden uns in Kürze bei Ihnen.
              </span>
            ) : (
              <span className="font-medium text-brand-ink">
                Gefällt Ihnen, was Sie sehen?
              </span>
            )}
          </div>
          <Button
            onClick={() => setKontaktOpen(true)}
            className="w-full rounded-[4px] bg-brand-primary text-brand-accentText hover:bg-brand-primary/90 sm:w-auto"
          >
            Echten Account anfragen
          </Button>
        </div>
      </div>

      <KontaktDialog
        slug={slug}
        company={company}
        open={kontaktOpen}
        onOpenChange={setKontaktOpen}
        onSuccess={() => setSubmitted(true)}
      />
    </div>
  );
}
