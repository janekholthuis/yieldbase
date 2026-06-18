"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { createEinheit, updateEinheit } from "@/lib/actions/objekte-crud";
import {
  BUNDESLAENDER,
  grunderwerbsteuer,
  grunderwerbsteuerSatz,
  notarGerichtskosten,
  gebaeudeanteil,
  NOTAR_GERICHT_SATZ_DEFAULT,
} from "@/lib/objekt-kosten";
import { formatEUR, STATUS_LABELS } from "@/lib/objekt-format";
import type { EinheitDetail, EinheitStatus } from "@/lib/data/objekte";
import type { Renovierung } from "@/lib/einheit-vollstaendigkeit";

// ---------------------------------------------------------------------------
// Helpers — parse number / keep ISO dates; only filled values get submitted.
// ---------------------------------------------------------------------------

/** Parse the raw string of a number input to number | undefined (empty -> undefined). */
function num(v: string): number | undefined {
  if (v.trim() === "") return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/** Trim a string -> string | undefined. */
function str(v: string | null | undefined): string | undefined {
  const t = (v ?? "").trim();
  return t === "" ? undefined : t;
}

type NutzungsartValue = "wohnen" | "gewerbe";
type ObjektzustandValue = "bestand" | "neubau";

// The form reads more fields than EinheitDetail currently exposes (e.g.
// nutzungsart, objektzustand, extras). We accept the typed partial but read
// fields defensively, since `initial` may carry extra columns at runtime.
type EinheitInitial = Partial<EinheitDetail>;

function rawValue(initial: EinheitInitial | undefined, key: string): unknown {
  if (!initial) return undefined;
  return (initial as Record<string, unknown>)[key];
}
function readStr(initial: EinheitInitial | undefined, key: string): string {
  const v = rawValue(initial, key);
  return v == null ? "" : String(v);
}
function readNum(initial: EinheitInitial | undefined, key: string): string {
  const v = rawValue(initial, key);
  return v == null || v === "" ? "" : String(v);
}
function readBool(initial: EinheitInitial | undefined, key: string): boolean {
  return Boolean(rawValue(initial, key));
}

export interface EinheitFormProps {
  projektId: string;
  bundesland?: string | null;
  /** When `initial.einheit_id` is set, the form edits that unit; otherwise it creates one. */
  initial?: EinheitInitial;
  onSaved?: (id: string) => void;
  /** Render the submit button inside the form (default true). Set false to drive externally. */
  showSubmit?: boolean;
  submitLabel?: string;
}

export function EinheitForm({
  projektId,
  bundesland,
  initial,
  onSaved,
  showSubmit = true,
  submitLabel,
}: EinheitFormProps) {
  const router = useRouter();
  const isEdit = Boolean(initial?.einheit_id);
  const [saving, setSaving] = useState(false);

  // --- Technisch ---
  const [wohnungsnummer, setWohnungsnummer] = useState(readStr(initial, "wohnungsnummer"));
  const [etage, setEtage] = useState(readNum(initial, "etage"));
  const [wohnflaeche, setWohnflaeche] = useState(readNum(initial, "wohnflaeche"));
  const [zimmer, setZimmer] = useState(readNum(initial, "zimmer"));
  const [nutzungsart, setNutzungsart] = useState<NutzungsartValue | "">(
    (readStr(initial, "nutzungsart") as NutzungsartValue) || "",
  );
  const [objektzustand, setObjektzustand] = useState<ObjektzustandValue | "">(
    (readStr(initial, "objektzustand") as ObjektzustandValue) || "",
  );
  const [heizungsart, setHeizungsart] = useState(readStr(initial, "heizungsart"));
  const [energieklasse, setEnergieklasse] = useState(readStr(initial, "energieklasse"));
  const [stellplaetzeAnzahl, setStellplaetzeAnzahl] = useState(
    readNum(initial, "stellplaetze_anzahl"),
  );
  const [balkon, setBalkon] = useState(readBool(initial, "balkon"));
  const [keller, setKeller] = useState(readBool(initial, "keller"));
  const [aufzug, setAufzug] = useState(readBool(initial, "aufzug"));
  const [vermietet, setVermietet] = useState(readBool(initial, "vermietet"));
  const [vermietetSeit, setVermietetSeit] = useState(readStr(initial, "vermietet_seit"));
  const [mietvertragEnde, setMietvertragEnde] = useState(
    readStr(initial, "mietvertrag_ende"),
  );
  const [status, setStatus] = useState<EinheitStatus>(
    (readStr(initial, "status") as EinheitStatus) || "frei",
  );

  // --- Wirtschaftlich ---
  const [kaufpreis, setKaufpreis] = useState(readNum(initial, "kaufpreis"));
  const [miete, setMiete] = useState(readNum(initial, "miete"));
  const [stellplatzPreis, setStellplatzPreis] = useState(readNum(initial, "stellplatz_preis"));
  const [hausgeldUml, setHausgeldUml] = useState(readNum(initial, "hausgeld_umlagefaehig"));
  const [hausgeldNichtUml, setHausgeldNichtUml] = useState(
    readNum(initial, "hausgeld_nicht_umlagefaehig"),
  );
  const [instandhaltung, setInstandhaltung] = useState(
    readNum(initial, "instandhaltungsruecklage"),
  );
  const [sondereigentum, setSondereigentum] = useState(
    readNum(initial, "sondereigentumsverwaltung"),
  );

  // --- Steuerlich ---
  const [grundstueckswertAnteil, setGrundstueckswertAnteil] = useState(
    readNum(initial, "grundstueckswert_anteil"),
  );
  const [grundstuecksanteilQm, setGrundstuecksanteilQm] = useState(
    readNum(initial, "grundstuecksanteil_qm"),
  );
  const [miteigentumsanteil, setMiteigentumsanteil] = useState(
    readStr(initial, "miteigentumsanteil"),
  );
  const [afaSatz, setAfaSatz] = useState(readNum(initial, "afa_satz"));
  const [formBundesland, setFormBundesland] = useState<string>(
    str(bundesland) ?? str(initial?.bundesland as string | undefined) ?? "",
  );

  // --- Extras ---
  const [extras, setExtras] = useState(readStr(initial, "extras"));

  // --- PROJ-21: Vollständigkeit ---
  const [lageImHaus, setLageImHaus] = useState(readStr(initial, "lage_im_haus"));
  const [kaufpreisWohnung, setKaufpreisWohnung] = useState(
    readNum(initial, "kaufpreis_wohnung"),
  );
  const [kaufpreisMoebel, setKaufpreisMoebel] = useState(
    readNum(initial, "kaufpreis_moebel"),
  );
  const [instandhaltungGesamt, setInstandhaltungGesamt] = useState(
    readNum(initial, "instandhaltungsruecklage_gesamt"),
  );
  const [standortHighlights, setStandortHighlights] = useState(
    readStr(initial, "standort_highlights"),
  );
  const [tagsInput, setTagsInput] = useState(
    (Array.isArray(rawValue(initial, "tags")) ? (rawValue(initial, "tags") as string[]) : []).join(", "),
  );
  const [renovierungen, setRenovierungen] = useState<Renovierung[]>(
    Array.isArray(rawValue(initial, "renovierungen"))
      ? (rawValue(initial, "renovierungen") as Renovierung[])
      : [],
  );
  const [aiLoading, setAiLoading] = useState(false);

  // PROJ-22: KI-Lageeinschätzung generieren (nur im Edit-Modus — braucht die
  // gespeicherte Einheit-ID als Kontextquelle). Füllt Standort-Highlights + Tags
  // als Vorschlag; der Nutzer kann editieren und speichert dann normal das Formular.
  const einheitId = isEdit ? (initial?.einheit_id as string) : null;
  // PROJ-22: KI-Button nur zeigen, wenn der Server einen OpenAI-Key hat —
  // sonst würde der Klick ins Leere laufen. getAiStatus() prüft das serverseitig.
  const [aiConfigured, setAiConfigured] = useState(false);
  useEffect(() => {
    if (!einheitId) return;
    let active = true;
    import("@/lib/actions/ki")
      .then((m) => m.getAiStatus())
      .then((s) => {
        if (active) setAiConfigured(s.configured);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [einheitId]);
  async function runAiLage() {
    if (!einheitId) return;
    setAiLoading(true);
    try {
      const { generateEinheitLage } = await import("@/lib/actions/ki");
      const res = await generateEinheitLage({ einheitId });
      setStandortHighlights(res.lageeinschaetzung);
      if (res.tags.length > 0) {
        const existing = tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...existing, ...res.tags]));
        setTagsInput(merged.join(", "));
      }
      toast.success("KI-Vorschlag eingefügt. Bitte prüfen und speichern.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "KI-Generierung fehlgeschlagen",
      );
    } finally {
      setAiLoading(false);
    }
  }

  // Live-derived steuerliche Werte.
  const kp = num(kaufpreis);
  const gwAnteil = num(grundstueckswertAnteil);
  const derived = useMemo(() => {
    const bl = formBundesland || null;
    return {
      satz: grunderwerbsteuerSatz(bl),
      grest: grunderwerbsteuer(kp, bl),
      notar: notarGerichtskosten(kp),
      gebaeude: gebaeudeanteil(kp, gwAnteil),
    };
  }, [formBundesland, kp, gwAnteil]);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    if (str(wohnungsnummer) === undefined) {
      toast.error("Wohnungsnummer ist erforderlich.");
      return;
    }
    const wnr = str(wohnungsnummer) as string; // guarded above
    setSaving(true);
    try {
      const common = {
        wohnungsnummer: wnr,
        etage: num(etage),
        wohnflaeche: num(wohnflaeche),
        zimmer: num(zimmer),
        nutzungsart: nutzungsart || undefined,
        objektzustand: objektzustand || undefined,
        heizungsart: str(heizungsart),
        energieklasse: str(energieklasse),
        stellplaetze_anzahl: num(stellplaetzeAnzahl),
        balkon,
        keller,
        aufzug,
        vermietet,
        vermietet_seit: vermietet ? str(vermietetSeit) : undefined,
        mietvertrag_ende: str(mietvertragEnde),
        status,
        kaufpreis: num(kaufpreis),
        miete: num(miete),
        stellplatz_preis: num(stellplatzPreis),
        hausgeld_umlagefaehig: num(hausgeldUml),
        hausgeld_nicht_umlagefaehig: num(hausgeldNichtUml),
        instandhaltungsruecklage: num(instandhaltung),
        sondereigentumsverwaltung: num(sondereigentum),
        grundstueckswert_anteil: num(grundstueckswertAnteil),
        grundstuecksanteil_qm: num(grundstuecksanteilQm),
        miteigentumsanteil: str(miteigentumsanteil),
        afa_satz: num(afaSatz),
        extras: str(extras),
        // PROJ-21: Vollständigkeit
        lage_im_haus: str(lageImHaus),
        kaufpreis_wohnung: num(kaufpreisWohnung),
        kaufpreis_moebel: num(kaufpreisMoebel),
        instandhaltungsruecklage_gesamt: num(instandhaltungGesamt),
        standort_highlights: str(standortHighlights),
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        renovierungen: renovierungen.filter((r) => r.gewerk.trim() !== ""),
      };

      let id: string;
      if (isEdit && initial?.einheit_id) {
        const res = await updateEinheit({ id: initial.einheit_id, ...common });
        id = res.id;
      } else {
        const res = await createEinheit({ projekt_id: projektId, ...common });
        id = res.id;
      }
      toast.success(isEdit ? "Einheit gespeichert." : "Einheit angelegt.");
      if (onSaved) onSaved(id);
      else router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="technisch">
        <TabsList className="flex-wrap">
          <TabsTrigger value="technisch">Technisch</TabsTrigger>
          <TabsTrigger value="wirtschaftlich">Wirtschaftlich</TabsTrigger>
          <TabsTrigger value="steuerlich">Steuerlich</TabsTrigger>
          <TabsTrigger value="renovierungen">Renovierungen</TabsTrigger>
          <TabsTrigger value="extras">Extras</TabsTrigger>
        </TabsList>

        {/* --- Technisch --- */}
        <TabsContent value="technisch" className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Wohnungsnummer *">
              <Input
                value={wohnungsnummer}
                onChange={(e) => setWohnungsnummer(e.target.value)}
                placeholder="z. B. 1, WE 04"
                required
              />
            </Field>
            <Field label="Etage">
              <Input
                type="number"
                value={etage}
                onChange={(e) => setEtage(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Lage im Haus">
              <Input
                value={lageImHaus}
                onChange={(e) => setLageImHaus(e.target.value)}
                placeholder="z. B. EG rechts"
              />
            </Field>
            <Field label="Wohnfläche (m²)">
              <Input
                type="number"
                step="0.01"
                value={wohnflaeche}
                onChange={(e) => setWohnflaeche(e.target.value)}
              />
            </Field>
            <Field label="Zimmer">
              <Input
                type="number"
                step="0.5"
                value={zimmer}
                onChange={(e) => setZimmer(e.target.value)}
              />
            </Field>
            <Field label="Nutzungsart">
              <Select
                value={nutzungsart || undefined}
                onValueChange={(v) => setNutzungsart(v as NutzungsartValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wohnen">Wohnung</SelectItem>
                  <SelectItem value="gewerbe">Gewerbe</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Objektzustand">
              <Select
                value={objektzustand || undefined}
                onValueChange={(v) => setObjektzustand(v as ObjektzustandValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bestand">Bestand</SelectItem>
                  <SelectItem value="neubau">Neubau</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Heizungsart">
              <Input
                value={heizungsart}
                onChange={(e) => setHeizungsart(e.target.value)}
                placeholder="z. B. Gas-Zentralheizung"
              />
            </Field>
            <Field label="Energieklasse">
              <Input
                value={energieklasse}
                onChange={(e) => setEnergieklasse(e.target.value)}
                placeholder="z. B. B"
              />
            </Field>
            <Field label="Stellplätze (Anzahl)">
              <Input
                type="number"
                value={stellplaetzeAnzahl}
                onChange={(e) => setStellplaetzeAnzahl(e.target.value)}
                inputMode="numeric"
              />
            </Field>
            <Field label="Status">
              <Select value={status} onValueChange={(v) => setStatus(v as EinheitStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABELS) as EinheitStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SwitchRow label="Balkon" checked={balkon} onChange={setBalkon} />
            <SwitchRow label="Keller" checked={keller} onChange={setKeller} />
            <SwitchRow label="Aufzug" checked={aufzug} onChange={setAufzug} />
          </div>

          <div className="rounded-lg border p-3 space-y-3">
            <SwitchRow label="Vermietet" checked={vermietet} onChange={setVermietet} />
            {vermietet && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Vermietet seit">
                  <Input
                    type="date"
                    value={vermietetSeit}
                    onChange={(e) => setVermietetSeit(e.target.value)}
                  />
                </Field>
                <Field label="Mietvertrag Ende">
                  <Input
                    type="date"
                    value={mietvertragEnde}
                    onChange={(e) => setMietvertragEnde(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </div>
        </TabsContent>

        {/* --- Wirtschaftlich --- */}
        <TabsContent value="wirtschaftlich" className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kaufpreis (€)">
              <Input
                type="number"
                step="0.01"
                value={kaufpreis}
                onChange={(e) => setKaufpreis(e.target.value)}
              />
            </Field>
            <Field label="Kaltmiete (€/Monat)">
              <Input
                type="number"
                step="0.01"
                value={miete}
                onChange={(e) => setMiete(e.target.value)}
              />
            </Field>
            <Field label="Stellplatz-Preis (€)">
              <Input
                type="number"
                step="0.01"
                value={stellplatzPreis}
                onChange={(e) => setStellplatzPreis(e.target.value)}
              />
            </Field>
            <Field label="Hausgeld umlagefähig (€/Monat)">
              <Input
                type="number"
                step="0.01"
                value={hausgeldUml}
                onChange={(e) => setHausgeldUml(e.target.value)}
              />
            </Field>
            <Field label="Hausgeld nicht umlagefähig (€/Monat)">
              <Input
                type="number"
                step="0.01"
                value={hausgeldNichtUml}
                onChange={(e) => setHausgeldNichtUml(e.target.value)}
              />
            </Field>
            <Field label="Instandhaltungsrücklage (€/Monat)">
              <Input
                type="number"
                step="0.01"
                value={instandhaltung}
                onChange={(e) => setInstandhaltung(e.target.value)}
              />
            </Field>
            <Field label="Instandhaltungsrücklage gesamt (€)">
              <Input
                type="number"
                step="0.01"
                value={instandhaltungGesamt}
                onChange={(e) => setInstandhaltungGesamt(e.target.value)}
              />
            </Field>
            <Field label="Sondereigentumsverwaltung / Kosten SEV (€/Monat)">
              <Input
                type="number"
                step="0.01"
                value={sondereigentum}
                onChange={(e) => setSondereigentum(e.target.value)}
              />
            </Field>
          </div>

          {/* Kaufpreis-Aufteilung (informativ; Kaufpreis bleibt der Gesamtwert) */}
          <div className="rounded-lg border p-3 space-y-3">
            <h4 className="text-sm font-semibold">Kaufpreis-Aufteilung</h4>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Anteil Wohnung (€)">
                <Input
                  type="number"
                  step="0.01"
                  value={kaufpreisWohnung}
                  onChange={(e) => setKaufpreisWohnung(e.target.value)}
                />
              </Field>
              <Field label="Anteil Möbel (€)">
                <Input
                  type="number"
                  step="0.01"
                  value={kaufpreisMoebel}
                  onChange={(e) => setKaufpreisMoebel(e.target.value)}
                />
              </Field>
              <Field label="Anteil Stellplatz (€)">
                <Input
                  type="number"
                  step="0.01"
                  value={stellplatzPreis}
                  onChange={(e) => setStellplatzPreis(e.target.value)}
                />
              </Field>
            </div>
            <KaufpreisSplitHint
              wohnung={num(kaufpreisWohnung)}
              moebel={num(kaufpreisMoebel)}
              stellplatz={num(stellplatzPreis)}
              gesamt={num(kaufpreis)}
            />
          </div>
        </TabsContent>

        {/* --- Steuerlich --- */}
        <TabsContent value="steuerlich" className="space-y-4 pt-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Bundesland">
              <Select
                value={formBundesland || undefined}
                onValueChange={setFormBundesland}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wählen…" />
                </SelectTrigger>
                <SelectContent>
                  {BUNDESLAENDER.map((bl) => (
                    <SelectItem key={bl} value={bl}>
                      {bl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Grundstückswert-Anteil (€)">
              <Input
                type="number"
                step="0.01"
                value={grundstueckswertAnteil}
                onChange={(e) => setGrundstueckswertAnteil(e.target.value)}
              />
            </Field>
            <Field label="Grundstücksanteil (m²)">
              <Input
                type="number"
                step="0.01"
                value={grundstuecksanteilQm}
                onChange={(e) => setGrundstuecksanteilQm(e.target.value)}
              />
            </Field>
            <Field label="Miteigentumsanteil">
              <Input
                value={miteigentumsanteil}
                onChange={(e) => setMiteigentumsanteil(e.target.value)}
                placeholder="z. B. 123/10000"
              />
            </Field>
            <Field label="AfA-Satz (%)">
              <Input
                type="number"
                step="0.01"
                value={afaSatz}
                onChange={(e) => setAfaSatz(e.target.value)}
              />
            </Field>
          </div>

          {/* Read-only derived panel */}
          <div className="rounded-lg border bg-muted/40 p-4">
            <h4 className="mb-3 text-sm font-semibold">Abgeleitete Kosten</h4>
            <dl className="grid gap-2 sm:grid-cols-3">
              <DerivedRow
                label={`Grunderwerbsteuer${
                  derived.satz != null ? ` (${derived.satz} %)` : ""
                }`}
                value={
                  derived.grest != null
                    ? formatEUR(derived.grest)
                    : formBundesland
                      ? "—"
                      : "Bundesland wählen"
                }
              />
              <DerivedRow
                label={`Notar/Gericht (${NOTAR_GERICHT_SATZ_DEFAULT} %)`}
                value={derived.notar != null ? formatEUR(derived.notar) : "—"}
              />
              <DerivedRow
                label="Gebäudeanteil"
                value={derived.gebaeude != null ? formatEUR(derived.gebaeude) : "—"}
              />
            </dl>
          </div>
        </TabsContent>

        {/* --- Renovierungen --- */}
        <TabsContent value="renovierungen" className="space-y-4 pt-2">
          <RenovierungenEditor
            value={renovierungen}
            onChange={setRenovierungen}
          />
        </TabsContent>

        {/* --- Extras --- */}
        <TabsContent value="extras" className="space-y-4 pt-2">
          {einheitId && aiConfigured && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-surfaceMuted/40 p-3">
              <div className="text-sm">
                <p className="font-medium text-brand-ink">KI-Lageeinschätzung</p>
                <p className="text-xs text-brand-muted">
                  Generiert Standort-Highlights + Tags aus Adresse und Eckdaten.
                  Vorschlag — bitte prüfen, dann speichern.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={runAiLage}
                disabled={aiLoading}
              >
                {aiLoading ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-4 w-4" />
                )}
                Per KI generieren
              </Button>
            </div>
          )}
          <Field label="Extras / Besonderheiten / Notizen">
            <Textarea
              value={extras}
              onChange={(e) => setExtras(e.target.value)}
              rows={5}
              placeholder="Freitext zu Ausstattung, Besonderheiten, Hinweise…"
            />
          </Field>
          <Field label="Tags / Highlights">
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Komma-getrennt, z. B. Balkon, ÖPNV-nah, saniert"
            />
            <p className="text-xs text-muted-foreground">
              Mehrere Tags mit Komma trennen. Wird ggf. per KI ergänzt.
            </p>
          </Field>
          <Field label="Standort-Highlights">
            <Textarea
              value={standortHighlights}
              onChange={(e) => setStandortHighlights(e.target.value)}
              rows={4}
              placeholder="Lageeinschätzung (wird ggf. per KI generiert)…"
            />
          </Field>
        </TabsContent>
      </Tabs>

      {showSubmit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving
              ? "Speichern…"
              : (submitLabel ?? (isEdit ? "Änderungen speichern" : "Einheit anlegen"))}
          </Button>
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
      <span className="font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function DerivedRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function KaufpreisSplitHint({
  wohnung,
  moebel,
  stellplatz,
  gesamt,
}: {
  wohnung?: number;
  moebel?: number;
  stellplatz?: number;
  gesamt?: number;
}) {
  const summe = (wohnung ?? 0) + (moebel ?? 0) + (stellplatz ?? 0);
  if (summe === 0) return null;
  const diff = gesamt != null ? gesamt - summe : null;
  const matches = diff != null && Math.abs(diff) < 0.5;
  return (
    <p className="text-xs text-muted-foreground">
      Summe Aufteilung: <span className="font-medium tabular-nums">{formatEUR(summe)}</span>
      {gesamt != null && (
        <>
          {" · Kaufpreis gesamt: "}
          <span className="font-medium tabular-nums">{formatEUR(gesamt)}</span>
          {!matches && (
            <span className="text-warning-foreground">
              {" "}
              (Differenz {formatEUR(diff!)})
            </span>
          )}
        </>
      )}
    </p>
  );
}

function RenovierungenEditor({
  value,
  onChange,
}: {
  value: Renovierung[];
  onChange: (rows: Renovierung[]) => void;
}) {
  function update(i: number, patch: Partial<Renovierung>) {
    onChange(value.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    onChange([...value, { gewerk: "", jahr: new Date().getFullYear() }]);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Renovierungsaufstellung der einzelnen Gewerke (Jahresangabe genügt).
      </p>
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((r, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <Label className={i === 0 ? undefined : "sr-only"}>Gewerk</Label>
                <Input
                  value={r.gewerk}
                  onChange={(e) => update(i, { gewerk: e.target.value })}
                  placeholder="z. B. Dach, Heizung, Fenster"
                />
              </div>
              <div className="w-28 space-y-1.5">
                <Label className={i === 0 ? undefined : "sr-only"}>Jahr</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={String(r.jahr ?? "")}
                  onChange={(e) =>
                    update(i, { jahr: Number(e.target.value) || 0 })
                  }
                  placeholder="2019"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(i)}
                aria-label="Zeile entfernen"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Zeile hinzufügen
      </Button>
    </div>
  );
}
