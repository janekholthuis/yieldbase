"use client";

// PROJ-7 — Selbstauskunft: geteilte Abschnitts-Renderer.
// Felder/Bedingungen/Validierungs-Wiring unverändert; der lineare
// SelbstauskunftWizard rendert hierüber.

import { useMemo } from "react";
import { Mail, Phone, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
} from "@/lib/selbstauskunft";

import {
  TextField,
  EuroField,
  DateField,
  SelectField,
  SwitchField,
  CheckboxGroup,
} from "./fields";

// ===========================================================================
// PersonBlock — rendert die Felder einer Person für einen Abschnitt
// ===========================================================================

export function PersonBlock({
  title,
  person,
  set,
  section,
  cols = 2,
}: {
  title?: string;
  person: PersonData;
  set: (patch: Partial<PersonData>) => void;
  section: number;
  /** 2 = interne Felder zweispaltig; 1 = einspaltig (für Haupt+Mit nebeneinander). */
  cols?: 1 | 2;
}) {
  return (
    <div className="space-y-6">
      {title && (
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
      )}
      {section === 1 && <SectionPersoenlich person={person} set={set} cols={cols} />}
      {section === 2 && <SectionTaetigkeit person={person} set={set} cols={cols} />}
      {section === 3 && <SectionEinnahmen person={person} set={set} cols={cols} />}
      {section === 4 && <SectionVermoegen person={person} set={set} cols={cols} />}
      {section === 6 && <SectionAusgaben person={person} set={set} cols={cols} />}
    </div>
  );
}

type PS = {
  person: PersonData;
  set: (patch: Partial<PersonData>) => void;
  cols?: 1 | 2;
};

/** Tailwind-Klasse für ein 2er-Raster, das bei cols=1 einspaltig bleibt. */
const grid2 = (cols: 1 | 2) =>
  `grid gap-6 ${cols === 2 ? "md:grid-cols-2" : ""}`;

export function SectionPersoenlich({ person, set, cols = 2 }: PS) {
  return (
    <div className="space-y-6">
      <div className={grid2(cols)}>
        <TextField label="Vorname" req value={person.vorname} onChange={(v) => set({ vorname: v })} />
        <TextField label="Nachname" req value={person.nachname} onChange={(v) => set({ nachname: v })} />
        <TextField label="E-Mail" req type="email" icon={Mail} value={person.email} onChange={(v) => set({ email: v })} />
        <TextField label="Telefon" req type="tel" icon={Phone} value={person.telefon} onChange={(v) => set({ telefon: v })} />
        <DateField label="Geburtsdatum" req value={person.geburtsdatum} onChange={(v) => set({ geburtsdatum: v })} />
        <TextField label="Staatsangehörigkeit" req value={person.staatsangehoerigkeit} onChange={(v) => set({ staatsangehoerigkeit: v })} />
      </div>
      <TextField label="Straße & Hausnr." req value={person.strasse} onChange={(v) => set({ strasse: v })} />
      <div className="grid gap-6 md:grid-cols-[160px_1fr]">
        <TextField
          label="PLZ" req inputMode="numeric" value={person.plz}
          onChange={(v) => set({ plz: v.replace(/\D/g, "").slice(0, 5) })}
        />
        <TextField label="Ort" req value={person.ort} onChange={(v) => set({ ort: v })} />
      </div>
      <div className={grid2(cols)}>
        <SelectField label="Wohnsituation" req options={WOHNSITUATION} value={person.wohnsituation} onChange={(v) => set({ wohnsituation: v })} />
        <DateField label="Dort wohnhaft seit" value={person.wohnhaft_seit} onChange={(v) => set({ wohnhaft_seit: v })} />
        <SelectField label="Familienstand" req options={FAMILIENSTAND} value={person.familienstand} onChange={(v) => set({ familienstand: v })} />
        <TextField label="Kindergeldberechtigte Kinder (Anzahl)" inputMode="numeric" value={person.kinder_anzahl} onChange={(v) => set({ kinder_anzahl: v.replace(/\D/g, "") })} />
      </div>
    </div>
  );
}

export function SectionTaetigkeit({ person, set, cols = 2 }: PS) {
  const erwerbstaetig = ["Angestellt", "Beamter", "Freiberufler"].includes(person.beschaeftigung);
  return (
    <div className="space-y-6">
      <SelectField label="Beschäftigungsverhältnis" req options={BESCHAEFTIGUNG} value={person.beschaeftigung} onChange={(v) => set({ beschaeftigung: v })} />
      {erwerbstaetig && (
        <>
          <div className={grid2(cols)}>
            <TextField label="Beruf / Tätigkeit" req value={person.beruf} onChange={(v) => set({ beruf: v })} />
            <TextField label="Arbeitgeber" value={person.arbeitgeber} onChange={(v) => set({ arbeitgeber: v })} />
          </div>
          <SwitchField label="Arbeitgeber in Deutschland ansässig?" checked={person.arbeitgeber_deutschland} onChange={(v) => set({ arbeitgeber_deutschland: v })} />
          <div className={grid2(cols)}>
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

export function SectionEinnahmen({ person, set, cols = 2 }: PS) {
  const has = (q: string) => person.einnahmequellen.includes(q);
  return (
    <div className="space-y-6">
      <CheckboxGroup
        label="Einnahmequellen" req options={EINNAHMEQUELLEN}
        selected={person.einnahmequellen} onChange={(v) => set({ einnahmequellen: v })}
      />
      {has("Lohn / Gehalt / Bezüge") && (
        <div className={grid2(cols)}>
          <EuroField label="Lohn / Gehalt netto pro Monat" req value={person.lohn_netto_monat} onChange={(v) => set({ lohn_netto_monat: v })} />
          <TextField label="Anzahl Gehälter pro Jahr" req inputMode="numeric" value={person.anzahl_gehaelter} onChange={(v) => set({ anzahl_gehaelter: v.replace(/\D/g, "") })} />
        </div>
      )}
      {has("Einnahmen aus selbstständiger/freiberuflicher Arbeit") && (
        <EuroField label="Einnahmen selbstständig pro Jahr" req value={person.selbststaendig_jahr} onChange={(v) => set({ selbststaendig_jahr: v })} />
      )}
      {has("Einnahmen aus nebenberuflicher Tätigkeit") && (
        <div className={grid2(cols)}>
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
        <div className={grid2(cols)}>
          <EuroField label="Sonstige Einkünfte pro Jahr" req value={person.sonstige_einkuenfte_jahr} onChange={(v) => set({ sonstige_einkuenfte_jahr: v })} />
          <TextField label="Art der Einkünfte" req value={person.sonstige_einkuenfte_art} onChange={(v) => set({ sonstige_einkuenfte_art: v })} />
        </div>
      )}
    </div>
  );
}

export function SectionVermoegen({ person, set, cols = 2 }: PS) {
  const has = (q: string) => person.vermoegenswerte.includes(q);
  return (
    <div className="space-y-6">
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
        <div className={grid2(cols)}>
          <EuroField label="Bausparvertrag: Guthaben" req value={person.bausparen_guthaben} onChange={(v) => set({ bausparen_guthaben: v })} />
          <EuroField label="Bausparvertrag: Sparrate pro Monat" value={person.bausparen_rate} onChange={(v) => set({ bausparen_rate: v })} />
        </div>
      )}
      {has("Sonstiges Vermögen") && (
        <div className={grid2(cols)}>
          <EuroField label="Sonstiges Vermögen" req value={person.sonstiges_vermoegen} onChange={(v) => set({ sonstiges_vermoegen: v })} />
          <TextField label="Art des sonstigen Vermögens" req value={person.sonstiges_vermoegen_art} onChange={(v) => set({ sonstiges_vermoegen_art: v })} />
        </div>
      )}
    </div>
  );
}

export function SectionAusgaben({ person, set, cols = 2 }: PS) {
  const has = (q: string) => person.ausgabenposten.includes(q);
  return (
    <div className="space-y-6">
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
        <div className={grid2(cols)}>
          <EuroField label="Kreditrate pro Monat" req value={person.kreditrate_monat} onChange={(v) => set({ kreditrate_monat: v })} />
          <EuroField label="Restschuld" value={person.restschuld} onChange={(v) => set({ restschuld: v })} />
        </div>
      )}
      {has("Unterhaltsverpflichtungen") && (
        <EuroField label="Unterhaltsverpflichtungen pro Monat" req value={person.unterhaltsverpflichtung_monat} onChange={(v) => set({ unterhaltsverpflichtung_monat: v })} />
      )}
      {has("sonstige Verbindlichkeiten") && (
        <div className={grid2(cols)}>
          <EuroField label="Sonstige Verbindlichkeiten pro Monat" req value={person.sonstige_verbindlichkeit_monat} onChange={(v) => set({ sonstige_verbindlichkeit_monat: v })} />
          <TextField label="Art der Verbindlichkeit" req value={person.verbindlichkeit_art} onChange={(v) => set({ verbindlichkeit_art: v })} />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Immobilien-Subform
// ===========================================================================

export function ImmobilienStep({
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
    <div className="space-y-6">
      <div>
        <Label className="mb-2 block text-[13px] font-medium text-neutral-600">
          Ist bereits Immobilienvermögen vorhanden?
          <span className="ml-0.5 text-neutral-400">*</span>
        </Label>
        <RadioGroup
          className="flex gap-3"
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
          {(["ja", "nein"] as const).map((v) => (
            <label
              key={v}
              className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-lg border border-neutral-200 px-4 py-3 text-[15px] transition-colors hover:border-neutral-300 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
            >
              <RadioGroupItem
                value={v}
                id={`imm-${v}`}
                className="border-neutral-300 text-neutral-900"
              />
              {v === "ja" ? "Ja" : "Nein"}
            </label>
          ))}
        </RadioGroup>
      </div>

      {data.immobilienvermoegen === "ja" && (
        <div className="space-y-4">
          {data.immobilien.map((im, idx) => (
            <div key={idx} className="space-y-4 rounded-lg border border-neutral-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  Immobilie {idx + 1}
                </span>
                <Button
                  type="button" variant="ghost" size="sm"
                  onClick={() => setData((d) => ({ ...d, immobilien: d.immobilien.filter((_, i) => i !== idx) }))}
                >
                  <Trash2 className="h-4 w-4" /> Entfernen
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-2">
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
            className="rounded-lg border-neutral-300 text-neutral-800 hover:bg-neutral-50"
          >
            <Plus className="mr-1 h-4 w-4" /> Immobilie erfassen
          </Button>
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Unterschrift
// ===========================================================================

export function UnterschriftStep({
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
    <div className="space-y-6">
      <label className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <Checkbox
          checked={data.datenschutz}
          onCheckedChange={(c) => setData((d) => ({ ...d, datenschutz: Boolean(c) }))}
          className="mt-0.5 data-[state=checked]:border-neutral-900 data-[state=checked]:bg-neutral-900"
        />
        <span className="text-[15px] text-neutral-700">
          Ich bestätige die Richtigkeit meiner Angaben und die Datenschutzerklärung.
        </span>
      </label>
      <div className="grid gap-6 md:grid-cols-2">
        <TextField label="Ort" req value={data.ort} onChange={(v) => setData((d) => ({ ...d, ort: v }))} />
        <DateField label="Datum" value={today} onChange={(v) => setData((d) => ({ ...d, datum: v }))} />
      </div>
      <div>
        <Label className="mb-2 block text-[13px] font-medium text-neutral-600">
          Unterschrift {data.mitantragsteller ? "Hauptantragsteller" : ""}
          <span className="ml-0.5 text-neutral-400">*</span>
        </Label>
        <div>
          <SignaturePad ref={sigHaupt} />
        </div>
      </div>
      {data.mitantragsteller && (
        <div>
          <Label className="mb-2 block text-[13px] font-medium text-neutral-600">
            Unterschrift Mitantragsteller<span className="ml-0.5 text-neutral-400">*</span>
          </Label>
          <div>
            <SignaturePad ref={sigMit} />
          </div>
        </div>
      )}
    </div>
  );
}
