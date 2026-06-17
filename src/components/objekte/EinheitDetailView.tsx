"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatRow } from "@/components/ui/stat-row";
import { FileUpload } from "@/components/dokumente/FileUpload";
import {
  recordObjektBild,
  deleteObjektBild,
  recordObjektDokument,
  deleteObjektDokument,
  listObjektDokumenteSignedUrls,
} from "@/lib/actions/dokumente";
import { sanitizeFilename } from "@/lib/kunden-dokumente";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  FREIGABE_BADGE_CLASS,
  FREIGABE_LABELS,
  formatEUR,
  formatNumber,
  formatAddress,
  pricePerSqm,
} from "@/lib/objekt-format";
import {
  grunderwerbsteuer,
  grunderwerbsteuerSatz,
  notarGerichtskosten,
  gebaeudeanteil,
  NOTAR_GERICHT_SATZ_DEFAULT,
} from "@/lib/objekt-kosten";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  FileDown,
  FileText,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  UserCheck,
} from "lucide-react";
import { EinheitForm } from "@/components/objekte/EinheitForm";
import type {
  EinheitDetail,
  ObjektBild,
  ObjektDokument,
  ObjektListItem,
} from "@/lib/data/objekte";
import { CompletenessCard } from "@/components/objekte/CompletenessCard";
import { BankDatenCard } from "@/components/objekte/BankDatenCard";
import { KarteTab } from "@/components/objekte/KarteTab";
import { StandortHighlights } from "@/components/objekte/StandortHighlights";
import { KundenPickerModal } from "@/components/objekte/KundenPickerModal";
import { ReservierungModal } from "@/components/reservierung/ReservierungModal";
import { KalkulationsTab } from "@/components/objekte/KalkulationsTab";
import { EinheitInvestmentView } from "@/components/objekte/EinheitInvestmentView";
import { FinanziererPoolTab } from "@/components/objekte/FinanziererPoolTab";
import { ExposeModal } from "@/components/expose/ExposeModal";
import { useAuth } from "@/lib/auth-context";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";

const DOK_KAT_LABEL: Record<string, string> = {
  grundriss: "Grundriss",
  expose: "Exposé",
  energieausweis: "Energieausweis",
  teilungserklaerung: "Teilungserklärung",
  mietvertrag: "Mietvertrag",
  kaufvertrag: "Kaufvertrag",
  protokoll: "Protokoll",
  sonstiges: "Sonstiges",
};

export function EinheitDetailView({
  einheit,
  kalkContext,
  embedded = false,
}: {
  einheit: EinheitDetail;
  kalkContext: KalkulationsContext;
  /** When rendered inside the project page master-detail: drop the outer page
   * chrome (container padding + back/all-objects nav) so it sits in a panel. */
  embedded?: boolean;
}) {
  const e = einheit;
  const router = useRouter();
  const { roles } = useAuth();
  const canManagePool = roles.includes("admin") || roles.includes("support");
  const canEdit = roles.some((r) =>
    ["admin", "support", "vertriebsleiter", "vp_l1", "vp_l2", "vp_l3"].includes(r),
  );
  const ppsm = pricePerSqm(e.kaufpreis, e.wohnflaeche);
  const [exposeOpen, setExposeOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [reserveKundeId, setReserveKundeId] = useState<string | null>(null);

  // Erste zugewiesene Kunde-ID für eine personalisierte Präsentation (optional).
  const praesentationKundeId =
    e.zuweisungen.find((z) => z.kunde_id)?.kunde_id ?? undefined;
  // „Anfragen"/Reservieren in der Investment-Sidebar: nur aktiv, wenn bereits
  // ein Kunde zugewiesen ist (Reservierung braucht einen Kunden). Sonst weist
  // der Nutzer erst im Tab „Freigabe & Kunden" zu.
  const reserveCandidateId = canEdit ? praesentationKundeId : undefined;
  const praesentationHref = `/objekte/${e.einheit_id}/praesentation${
    praesentationKundeId ? `/${praesentationKundeId}` : ""
  }`;

  return (
    <div className={embedded ? "space-y-4" : "container mx-auto p-4 md:p-6 space-y-4"}>
      {/* Back / actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!embedded ? (
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="h-4 w-4" /> Bearbeiten
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddOpen(true)}
              >
                <Plus className="h-4 w-4" /> Einheit hinzufügen
              </Button>
            </>
          )}
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={praesentationHref}>
              <Presentation className="h-4 w-4" /> Präsentation
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExposeOpen(true)}
          >
            <FileDown className="h-4 w-4" /> Exposé
          </Button>
          {!embedded && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/objekte">Alle Objekte</Link>
            </Button>
          )}
        </div>
      </div>

      <ExposeModal
        open={exposeOpen}
        onOpenChange={setExposeOpen}
        einheit={e}
        defaults={kalkContext.defaults}
      />

      {canEdit && (
        <>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Einheit bearbeiten</DialogTitle>
                <DialogDescription>
                  Wohnung {e.wohnungsnummer}
                  {e.projekt_name ? ` · ${e.projekt_name}` : ""}
                </DialogDescription>
              </DialogHeader>
              <EinheitForm
                projektId={e.projekt_id}
                bundesland={e.bundesland}
                initial={e}
                submitLabel="Änderungen speichern"
                onSaved={() => {
                  setEditOpen(false);
                  router.refresh();
                }}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Einheit hinzufügen</DialogTitle>
                <DialogDescription>
                  Neue Einheit zu{" "}
                  {e.projekt_name ?? e.adresse ?? "diesem Projekt"} hinzufügen.
                </DialogDescription>
              </DialogHeader>
              <EinheitForm
                projektId={e.projekt_id}
                bundesland={e.bundesland}
                submitLabel="Einheit anlegen"
                onSaved={(id) => {
                  setAddOpen(false);
                  router.push(`/objekte/${id}`);
                }}
              />
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Title block */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Wohnung {e.wohnungsnummer}
            {e.projekt_name && (
              <span className="text-muted-foreground"> · {e.projekt_name}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatAddress(e.adresse, e.plz, e.stadt) || "—"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {e.freigabe_status !== "freigegeben" && (
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-medium ${FREIGABE_BADGE_CLASS[e.freigabe_status]}`}
            >
              {FREIGABE_LABELS[e.freigabe_status]}
            </span>
          )}
          <span
            className={`rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[e.status]}`}
          >
            {STATUS_LABELS[e.status]}
          </span>
        </div>
      </div>

      {/* Reservierung aus der „Anfragen"-CTA (Investagon-Layout) */}
      {reserveKundeId && (
        <ReservierungModal
          open={!!reserveKundeId}
          onOpenChange={(o) => !o && setReserveKundeId(null)}
          einheitId={e.einheit_id}
          kundeId={reserveKundeId}
          onDone={() => {
            setReserveKundeId(null);
            router.refresh();
          }}
        />
      )}

      {/* Prominente Preis-Zeile nur im Standalone-Modus — eingebettet trägt die
          Investment-Sidebar den Angebotspreis (keine Dopplung). */}
      {!embedded && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold tracking-tight">
              {formatEUR(e.kaufpreis)}
            </span>
            {ppsm != null && (
              <span className="text-sm text-muted-foreground">
                {formatEUR(Math.round(ppsm))}/m²
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Fact value={formatNumber(e.zimmer)} unit="Zi." />
            <Dot />
            <Fact value={formatNumber(e.wohnflaeche)} unit="m²" />
            <Dot />
            <Fact value={formatNumber(e.mietrendite_brutto)} unit="% Rendite" strong />
            <Dot />
            <span>
              <span className="font-medium text-foreground">{formatEUR(e.miete)}</span>{" "}
              Miete/mtl.
            </span>
          </div>
        </div>
      )}

      {/* EINGEBETTET (Master-Detail Projektseite): Investagon-Layout als primäre
          Ansicht — Hero + Diagramme/Kalkulation/Annahmen + Investment-Sidebar,
          die Kalkulation sofort sichtbar. Sekundär-Tabs darunter. */}
      {embedded ? (
        <div className="space-y-4">
          <EinheitInvestmentView
            einheit={e}
            kalkContext={kalkContext}
            onReserve={
              reserveCandidateId
                ? () => setReserveKundeId(reserveCandidateId)
                : undefined
            }
          />

          <Tabs defaultValue="details">
            <TabsList className="flex-wrap">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="bilder">Bilder</TabsTrigger>
              <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
              <TabsTrigger value="verwaltung">Freigabe &amp; Kunden</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <EckdatenBlock einheit={e} />
            </TabsContent>

            <TabsContent value="bilder" className="space-y-4">
              <BilderGallery
                bilder={e.bilder}
                dokumente={e.dokumente}
                einheitId={e.einheit_id}
                projektId={e.projekt_id}
              />
            </TabsContent>

            <TabsContent value="dokumente" className="space-y-4">
              <DokumenteList
                dokumente={e.dokumente}
                einheitId={e.einheit_id}
                projektId={e.projekt_id}
              />
            </TabsContent>

            <TabsContent value="verwaltung" className="space-y-4">
              <div className="mx-auto max-w-2xl space-y-4">
                <CompletenessCard einheit={e} />
                <ZuweisungenCard
                  zuweisungen={e.zuweisungen}
                  einheitId={e.einheit_id}
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
      <Tabs defaultValue="kalkulation">
        <TabsList className="flex-wrap">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="kalkulation">Kalkulation</TabsTrigger>
          <TabsTrigger value="bilder">Bilder</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="verwaltung">Freigabe &amp; Kunden</TabsTrigger>
          {/* Bankdaten/Karte/Pool sind projekt-scoped — eingebettet in die
              Projektseite zeigt diese bereits die Pill-Tabs Lage/Bankdaten/Pool,
              daher hier nur im Standalone-Modus. */}
          {!embedded && (
            <>
              <TabsTrigger value="bankdaten">Bankdaten</TabsTrigger>
              <TabsTrigger value="karte">Karte</TabsTrigger>
              {canManagePool && (
                <TabsTrigger value="finanzierer-pool">Finanzierer-Pool</TabsTrigger>
              )}
            </>
          )}
        </TabsList>

        {/* Übersicht — eine Spalte, nur Objektfakten (kein 2-Spalten-Layout) */}
        <TabsContent value="uebersicht" className="space-y-4">
          <EckdatenBlock einheit={e} />
          {/* Eingebettet (Projektseite) zeigt die Einheiten-Liste bereits
              alle Geschwister — Karte nur im Standalone-Modus. */}
          {!embedded && <GeschwisterCard geschwister={e.geschwister} />}
        </TabsContent>

        {/* Freigabe & Kunden — Management in eigenem Tab statt rechter Spalte */}
        <TabsContent value="verwaltung" className="space-y-4">
          <div className="mx-auto max-w-2xl space-y-4">
            <CompletenessCard einheit={e} />
            <ZuweisungenCard zuweisungen={e.zuweisungen} einheitId={e.einheit_id} />
          </div>
        </TabsContent>

        {/* Kalkulation */}
        <TabsContent value="kalkulation" className="space-y-4">
          <KalkulationsTab einheit={e} kalkContext={kalkContext} />
        </TabsContent>

        {/* Bilder */}
        <TabsContent value="bilder" className="space-y-4">
          <BilderGallery
            bilder={e.bilder}
            dokumente={e.dokumente}
            einheitId={e.einheit_id}
            projektId={e.projekt_id}
          />
        </TabsContent>

        {/* Dokumente */}
        <TabsContent value="dokumente" className="space-y-4">
          <DokumenteList
            dokumente={e.dokumente}
            einheitId={e.einheit_id}
            projektId={e.projekt_id}
          />
        </TabsContent>

        {/* Bankdaten/Karte/Pool nur im Standalone-Modus — eingebettet liefern
            die Projekt-Pill-Tabs (Lage/Bankdaten/Finanzierer-Pool) dasselbe. */}
        {!embedded && (
          <>
            {/* Bankdaten */}
            <TabsContent value="bankdaten" className="space-y-4">
              <BankDatenCard projektId={e.projekt_id} />
            </TabsContent>

            {/* Karte */}
            <TabsContent value="karte" className="space-y-4">
              <KarteTab adresse={e.adresse} plz={e.plz} stadt={e.stadt} />
              <StandortHighlights adresse={e.adresse} plz={e.plz} stadt={e.stadt} />
            </TabsContent>

            {/* Finanzierer-Pool (admin/support only) */}
            {canManagePool && (
              <TabsContent value="finanzierer-pool" className="space-y-4">
                <FinanziererPoolTab projektId={e.projekt_id} />
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
      )}
    </div>
  );
}

/** Inline-Eckdatum für die Preis-Zeile (z. B. „2 Zi."). */
function Fact({
  value,
  unit,
  strong,
}: {
  value: string;
  unit: string;
  strong?: boolean;
}) {
  if (!value || value === "—")
    return <span className="text-muted-foreground">—</span>;
  return (
    <span>
      <span
        className={
          strong ? "font-semibold text-brand-accent" : "font-medium text-foreground"
        }
      >
        {value}
      </span>{" "}
      {unit}
    </span>
  );
}

function Dot() {
  return <span className="text-muted-foreground/40">·</span>;
}

/** Zeile in der kompakten Eckdaten-Liste. */
function EckRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-brand-divider/60 py-1.5 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium">{value}</dd>
    </div>
  );
}

/** Aufklappbare Detail-Sektion (native details — kein extra Dependency). */
function Collapsible({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium">
        {title}
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t px-4 py-3">{children}</div>
    </details>
  );
}

const NUTZUNGSART_LABELS: Record<string, string> = {
  wohnen: "Wohnung",
  gewerbe: "Gewerbe",
};

const OBJEKTZUSTAND_LABELS: Record<string, string> = {
  bestand: "Bestand",
  neubau: "Neubau",
};

/** Kleiner Chip/Badge für boolesche bzw. kategoriale Werte. */
function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-brand-borderSoft bg-brand-accentSoft px-2 py-0.5 text-xs font-medium text-brand-accent">
      {children}
    </span>
  );
}

/** Hat einen Wert (nicht null/undefined/leer)? */
function has(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  return true;
}

/** Deutsches Datum aus ISO-String (yyyy-mm-dd / ISO timestamp). */
function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function EckdatenBlock({ einheit: e }: { einheit: EinheitDetail }) {
  const ausstattung: string[] = [];
  if (e.balkon) ausstattung.push("Balkon");
  if (e.keller) ausstattung.push("Keller");
  if (e.aufzug) ausstattung.push("Aufzug");

  const vermietetSeit = formatDate(e.vermietet_seit);
  const mietvertragEnde = formatDate(e.mietvertrag_ende);

  // Abgeleitete Kaufnebenkosten / Steuer
  const grestSatz = grunderwerbsteuerSatz(e.bundesland);
  const grestBetrag = grunderwerbsteuer(e.kaufpreis, e.bundesland);
  const notar = notarGerichtskosten(e.kaufpreis);
  const gebaeude = gebaeudeanteil(e.kaufpreis, e.grundstueckswert_anteil);
  const hasKaufnebenkosten = has(grestBetrag) || has(notar) || has(gebaeude);
  const hasBewirtschaftung =
    has(e.stellplatz_preis) ||
    has(e.hausgeld_umlagefaehig) ||
    has(e.hausgeld_nicht_umlagefaehig) ||
    has(e.instandhaltungsruecklage) ||
    has(e.sondereigentumsverwaltung);
  const hasSteuer =
    has(e.grundstueckswert_anteil) ||
    has(e.grundstuecksanteil_qm) ||
    has(e.miteigentumsanteil) ||
    has(e.afa_satz) ||
    hasKaufnebenkosten;

  // Kompakte Eckdaten — nur vorhandene Werte, ohne die oben gezeigten Kennzahlen.
  const eck: { label: string; value: React.ReactNode }[] = [
    { label: "Wohnungsnummer", value: e.wohnungsnummer || "—" },
  ];
  if (has(e.etage)) eck.push({ label: "Etage", value: e.etage });
  if (has(e.nutzungsart))
    eck.push({
      label: "Nutzungsart",
      value: NUTZUNGSART_LABELS[e.nutzungsart as string] ?? e.nutzungsart,
    });
  if (has(e.objektzustand))
    eck.push({
      label: "Zustand",
      value: OBJEKTZUSTAND_LABELS[e.objektzustand as string] ?? e.objektzustand,
    });
  if (has(e.heizungsart)) eck.push({ label: "Heizung", value: e.heizungsart });
  if (has(e.energieklasse))
    eck.push({ label: "Energieklasse", value: e.energieklasse });
  if (has(e.baujahr)) eck.push({ label: "Baujahr", value: e.baujahr });
  if (has(e.stellplaetze_anzahl))
    eck.push({ label: "Stellplätze", value: formatNumber(e.stellplaetze_anzahl) });

  return (
    <div className="space-y-4">
      {/* Eckdaten + Ausstattung */}
      <section className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eckdaten
        </h3>
        <dl className="grid gap-x-8 sm:grid-cols-2">
          {eck.map((r) => (
            <EckRow key={r.label} label={r.label} value={r.value} />
          ))}
        </dl>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-brand-divider/60 pt-3">
          {ausstattung.map((a) => (
            <Chip key={a}>{a}</Chip>
          ))}
          <Chip>{e.vermietet ? "Vermietet" : "Nicht vermietet"}</Chip>
          {e.vermietet && vermietetSeit && (
            <span className="text-xs text-muted-foreground">seit {vermietetSeit}</span>
          )}
          {e.vermietet && mietvertragEnde && (
            <span className="text-xs text-muted-foreground">bis {mietvertragEnde}</span>
          )}
        </div>
      </section>

      {/* Steuer & Nebenkosten — aufklappbar, damit die Seite ruhig bleibt */}
      {(hasBewirtschaftung || hasSteuer) && (
        <Collapsible title="Steuer & Nebenkosten">
          <div className="space-y-4">
            {hasBewirtschaftung && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Bewirtschaftung
                </div>
                {has(e.stellplatz_preis) && (
                  <StatRow
                    label="Stellplatz-Preis"
                    value={formatEUR(e.stellplatz_preis)}
                  />
                )}
                {has(e.hausgeld_umlagefaehig) && (
                  <StatRow
                    label="Hausgeld umlagefähig"
                    value={formatEUR(e.hausgeld_umlagefaehig)}
                  />
                )}
                {has(e.hausgeld_nicht_umlagefaehig) && (
                  <StatRow
                    label="Hausgeld nicht umlagefähig"
                    value={formatEUR(e.hausgeld_nicht_umlagefaehig)}
                  />
                )}
                {has(e.instandhaltungsruecklage) && (
                  <StatRow
                    label="Instandhaltungsrücklage"
                    value={formatEUR(e.instandhaltungsruecklage)}
                  />
                )}
                {has(e.sondereigentumsverwaltung) && (
                  <StatRow
                    label="SE-Verwaltung"
                    value={formatEUR(e.sondereigentumsverwaltung)}
                  />
                )}
              </div>
            )}
            {hasSteuer && (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Steuerlich
                </div>
                {has(e.grundstueckswert_anteil) && (
                  <StatRow
                    label="Grundstückswertanteil"
                    value={formatEUR(e.grundstueckswert_anteil)}
                  />
                )}
                {has(e.grundstuecksanteil_qm) && (
                  <StatRow
                    label="Grundstücksanteil"
                    value={formatNumber(e.grundstuecksanteil_qm, " m²")}
                  />
                )}
                {has(e.miteigentumsanteil) && (
                  <StatRow label="Miteigentumsanteil" value={e.miteigentumsanteil} />
                )}
                {has(e.afa_satz) && (
                  <StatRow label="AfA-Satz" value={formatNumber(e.afa_satz, " %")} />
                )}
                {hasKaufnebenkosten && (
                  <div className="mt-2 space-y-1.5 rounded-lg border border-brand-borderSoft bg-muted/40 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Kaufnebenkosten
                    </div>
                    {has(grestBetrag) && (
                      <StatRow
                        label={
                          grestSatz != null
                            ? `Grunderwerbsteuer (${formatNumber(grestSatz, " %")})`
                            : "Grunderwerbsteuer"
                        }
                        value={formatEUR(grestBetrag)}
                      />
                    )}
                    {has(notar) && (
                      <StatRow
                        label={`Notar/Gericht (${formatNumber(
                          NOTAR_GERICHT_SATZ_DEFAULT,
                          " %",
                        )})`}
                        value={formatEUR(notar)}
                      />
                    )}
                    {has(gebaeude) && (
                      <StatRow
                        label="Gebäudeanteil (AfA-Basis)"
                        value={formatEUR(gebaeude)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {has(e.extras) && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Beschreibung
          </h3>
          <p className="text-sm text-muted-foreground">{e.extras}</p>
        </section>
      )}

      {e.tags.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {e.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {has(e.standort_highlights) && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Standort-Highlights
          </h3>
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {e.standort_highlights}
          </p>
        </section>
      )}

      {e.renovierungen.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Renovierungen
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-1.5 font-medium">Gewerk</th>
                <th className="py-1.5 text-right font-medium">Jahr</th>
              </tr>
            </thead>
            <tbody>
              {[...e.renovierungen]
                .sort((a, b) => b.jahr - a.jahr)
                .map((r, i) => (
                  <tr key={`${r.gewerk}-${i}`} className="border-b last:border-0">
                    <td className="py-1.5">{r.gewerk}</td>
                    <td className="py-1.5 text-right tabular-nums">{r.jahr}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function GeschwisterCard({ geschwister }: { geschwister: ObjektListItem[] }) {
  if (geschwister.length === 0) return null;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Weitere Einheiten in diesem Projekt</h3>
      </div>
      <div className="divide-y rounded-md border">
        {geschwister.map((g) => (
          <Link
            key={g.einheit_id}
            href={`/objekte/${g.einheit_id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">Wohnung {g.wohnungsnummer}</span>
            <span className="text-muted-foreground">
              {formatNumber(g.wohnflaeche, " m²")} · {formatNumber(g.zimmer, " Zi")} ·{" "}
              {formatEUR(g.kaufpreis)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[g.status]}`}
            >
              {STATUS_LABELS[g.status]}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ZuweisungenCard({
  zuweisungen,
  einheitId,
}: {
  zuweisungen: EinheitDetail["zuweisungen"];
  einheitId: string;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reserveKundeId, setReserveKundeId] = useState<string | null>(null);
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Zugewiesene Kunden</h3>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          Objekt zuweisen
        </Button>
      </div>
      <KundenPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        einheitId={einheitId}
        onAssigned={() => router.refresh()}
      />
      {reserveKundeId && (
        <ReservierungModal
          open={!!reserveKundeId}
          onOpenChange={(o) => !o && setReserveKundeId(null)}
          einheitId={einheitId}
          kundeId={reserveKundeId}
          onDone={() => {
            setReserveKundeId(null);
            router.refresh();
          }}
        />
      )}
      {zuweisungen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch kein Kunde zugewiesen.</p>
      ) : (
        <div className="space-y-2">
          {zuweisungen.map((z) => {
            const name =
              `${z.kunde?.vorname ?? ""} ${z.kunde?.nachname ?? ""}`.trim() ||
              "Kunde";
            return (
              <div
                key={z.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {z.kunde?.email ?? "—"}
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {z.status}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setReserveKundeId(z.kunde_id)}
                >
                  Reservieren
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Gallery ported from OLD APP BilderTab (lightbox + grundriss) with upload +
// delete wired to the objekt-bilder (public) bucket.
function BilderGallery({
  bilder,
  dokumente,
  einheitId,
  projektId,
}: {
  bilder: ObjektBild[];
  dokumente: ObjektDokument[];
  einheitId: string;
  projektId: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const grundriss = dokumente.filter((d) => d.kategorie === "grundriss");
  const maxSort = bilder.reduce((m, b) => Math.max(m, b.sort_order ?? 0), -1);

  async function handleDeleteBild(id: string) {
    setDeletingId(id);
    try {
      await deleteObjektBild({ id });
      toast.success("Bild gelöscht");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Galerie ({bilder.length})</h3>
      </div>

      <FileUpload
        bucket="objekt-bilder"
        multiple
        acceptedMime={["image/jpeg", "image/png", "image/webp"]}
        accept="image/jpeg,image/png,image/webp"
        label="Bilder hierher ziehen oder klicken (JPG, PNG, WebP)"
        buildPath={({ id, file }) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          return `${einheitId}/${id}.${ext}`;
        }}
        onUploaded={async (meta) => {
          if (!meta.publicUrl) throw new Error("Keine öffentliche URL erhalten");
          await recordObjektBild({
            einheitId,
            projektId,
            url: meta.publicUrl,
            alt: meta.dateiname,
            sortOrder: maxSort + 1,
          });
        }}
      />

      {bilder.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Noch keine Bilder vorhanden.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {bilder.map((b, i) => (
            <div
              key={b.id}
              className="group relative aspect-square w-full overflow-hidden rounded-lg bg-muted"
            >
              <button
                onClick={() => setLightbox(i)}
                className="block h-full w-full"
                aria-label="Bild vergrößern"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.url}
                  alt={b.alt ?? "Bild"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1.5 top-1.5 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                disabled={deletingId === b.id}
                onClick={() => handleDeleteBild(b.id)}
                aria-label="Bild löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {grundriss.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Grundriss</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {grundriss.map((g) => (
              <Card key={g.id} className="overflow-hidden">
                {g.url.toLowerCase().endsWith(".pdf") ? (
                  <iframe src={g.url} title={g.dateiname} className="h-[420px] w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.url} alt={g.dateiname} className="w-full" />
                )}
                <div className="flex items-center gap-2 border-t p-2 text-sm">
                  <FileText className="h-4 w-4" /> {g.dateiname}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {lightbox != null && bilder[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Bildvorschau"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bilder[lightbox].url}
            alt={bilder[lightbox].alt ?? "Bild"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {lightbox + 1} / {bilder.length}
          </div>
        </div>
      )}
    </div>
  );
}

const DOK_KAT_OPTIONS: { value: string; label: string }[] = [
  { value: "grundriss", label: "Grundriss" },
  { value: "expose", label: "Exposé" },
  { value: "energieausweis", label: "Energieausweis" },
  { value: "teilungserklaerung", label: "Teilungserklärung" },
  { value: "mietvertrag", label: "Mietvertrag" },
  { value: "kaufvertrag", label: "Kaufvertrag" },
  { value: "protokoll_eigentuemerversammlung", label: "Protokoll Eigentümerversammlung" },
  { value: "wirtschaftsplan", label: "Wirtschaftsplan" },
  { value: "sonstiges", label: "Sonstiges" },
];

// Document list grouped by kategorie, with upload (objekt-dokumente, private),
// signed-URL open (resolved on click) and delete. Ported from OLD APP DokumenteTab.
function DokumenteList({
  dokumente,
  einheitId,
  projektId,
}: {
  dokumente: ObjektDokument[];
  einheitId: string;
  projektId: string;
}) {
  const [kategorie, setKategorie] = useState<string>("sonstiges");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = new Map<string, ObjektDokument[]>();
  for (const d of dokumente) {
    const arr = groups.get(d.kategorie) ?? [];
    arr.push(d);
    groups.set(d.kategorie, arr);
  }

  async function handleOpen(d: ObjektDokument) {
    setOpeningId(d.id);
    try {
      // If the stored url is already an http link (legacy public URL), open it
      // directly; otherwise resolve a fresh signed URL (private bucket).
      if (/^https?:\/\//.test(d.url)) {
        window.open(d.url, "_blank", "noopener,noreferrer");
        return;
      }
      const urls = await listObjektDokumenteSignedUrls({ ids: [d.id] });
      const signed = urls[d.id];
      if (!signed) {
        toast.error("Link konnte nicht erzeugt werden");
        return;
      }
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Öffnen fehlgeschlagen");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(d: ObjektDokument) {
    setDeletingId(d.id);
    try {
      await deleteObjektDokument({ id: d.id });
      toast.success("Dokument gelöscht");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dokumente ({dokumente.length})</h3>

      <Card className="space-y-3 p-4">
        <div className="max-w-xs space-y-1.5">
          <Label>Kategorie</Label>
          <Select value={kategorie} onValueChange={setKategorie}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOK_KAT_OPTIONS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FileUpload
          bucket="objekt-dokumente"
          label="Dokument hierher ziehen oder klicken"
          buildPath={({ id, safeName }) =>
            `einheit/${einheitId}/${id}-${sanitizeFilename(safeName)}`
          }
          onUploaded={async (meta) => {
            await recordObjektDokument({
              einheitId,
              projektId: undefined,
              url: meta.storagePath,
              dateiname: meta.dateiname,
              kategorie: kategorie as never,
              mimeType: meta.mimeType,
              sizeBytes: meta.sizeBytes,
            });
          }}
        />
      </Card>

      {dokumente.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Keine Dokumente vorhanden.
        </Card>
      ) : (
        [...groups.entries()].map(([kat, items]) => (
          <Card key={kat} className="p-4 space-y-2">
            <h4 className="font-semibold">{DOK_KAT_LABEL[kat] ?? kat}</h4>
            <div className="divide-y">
              {items.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-2">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.dateiname}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={openingId === d.id}
                    onClick={() => handleOpen(d)}
                  >
                    Öffnen
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === d.id}
                    onClick={() => handleDelete(d)}
                    aria-label="Dokument löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
