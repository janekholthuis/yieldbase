# Plan: Selbstauskunft & Reservierung als App-Formulare (Fillout-Nachbau)

> **Status:** Geplant 2026-06-13. Noch nicht gebaut. Dieser Plan ist so
> geschrieben, dass er in einem **frischen Chat** ohne Vorwissen ausgeführt
> werden kann.
>
> **Quellen (im Repo-Root):** `Selbstauskunft.json`, `Reservierung EMI.json`
> (Fillout-Exporte). **Exakte Feldliste:** [`docs/FILLOUT-FORMSPEC.md`](FILLOUT-FORMSPEC.md)
> (maschinell extrahiert). Bei Unklarheit dort nachsehen oder mit dem Node-Snippet
> am Ende neu extrahieren.

## 1. Ziel & Entscheidungen (mit User abgestimmt)

- **Beide Formulare im Kundenportal** — der **Kunde füllt selbst** aus (ersetzt
  bzw. erweitert den bestehenden `SelbstauskunftWizard`).
- **Unterschrift = einfaches Zeichnen** (Canvas), **kein** echtes E-Signing.
  Wiederverwenden: `src/components/reservierung/SignaturePad.tsx`.
- Der **read-only Selbstauskunft-Tab** in der internen Kunden-Detailseite
  (`KundeDetailView`) ist bereits gebaut & committet (Commit `5051c28`) — er
  zeigt die eingereichten Daten dem VP an. Dieser Plan baut die **Eingabe**.
- Reservierung existiert heute als `ReservierungModal` + PDF, hat aber **weniger
  Felder** als das Fillout-Formular (es fehlen u. a. Steuer-ID, IBAN,
  Staatsangehörigkeit, Mitantragsteller, Bestätigungs-Checkboxen).

## 2. Vorhandene Assets (wiederverwenden, nicht neu bauen)

| Asset | Pfad | Rolle im Plan |
|---|---|---|
| SignaturePad | `src/components/reservierung/SignaturePad.tsx` | Zeichnen-Unterschrift, beide Formulare |
| ReservierungModal | `src/components/reservierung/ReservierungModal.tsx` | Basis für erweitertes Reservierungs-Formular |
| ReservierungPdfDocument | `src/components/reservierung/ReservierungPdfDocument.tsx` | PDF-Erzeugung (erweitern um neue Felder) |
| SelbstauskunftWizard | `src/components/portal/SelbstauskunftWizard.tsx` (853 Z.) | bestehender Wizard — **prüfen: erweitern vs. ersetzen** |
| Portal-Route | `src/app/(portal)/portal/selbstauskunft/page.tsx` | Einstieg Kunde |
| kunden-dokumente | Upload-Infra | Signatur-Bild als Datei ablegen (optional) |
| reservierungen | `src/lib/{data,actions}/reservierungen.ts` | Reservierungs-Persistenz |

**Erste Aufgabe im neuen Chat:** `SelbstauskunftWizard.tsx` lesen und gegen
`FILLOUT-FORMSPEC.md` abgleichen — entscheiden, ob der bestehende Wizard die 8
Schritte schon (teilweise) abdeckt. Wahrscheinlich: erweitern (Felder/Schritte
ergänzen) statt Neubau.

## 3. Formular-Struktur (Kurzfassung, Details in FORMSPEC)

### Selbstauskunft — 8 Schritte
1. **Persönliche Daten** — Name, E-Mail, Telefon, Geburtsdatum, Adresse, PLZ,
   Ort, Wohnsituation, wohnhaft seit, Familienstand, Kinder, Staatsangehörigkeit.
   **Toggle „Mitantragsteller"** → alle Personenfelder ein zweites Mal.
   (+ versteckte Close Lead/Opportunity ID — siehe Open Questions.)
2. **Aktuelle Tätigkeit** — Beschäftigungsverhältnis, Beruf, Arbeitgeber,
   tätig seit, Dauer (unbefristet/Probezeit/befristet → „befristet bis").
3. **Einnahmen** — Mehrfachauswahl Einnahmequellen; je gewählter Quelle ein
   Betragsfeld (bedingt eingeblendet).
4. **Vermögenssituation** — Mehrfachauswahl liquide Werte; je Wert ein Betrag.
5. **Immobilienvermögen** — Ja/Nein; bei Ja **Subform „Immobilien"**
   (wiederholbar, „Immobilie erfassen"). **Spalten unbekannt — klären.**
6. **(Ende/Danke — Branching-Ziel)**
7. **Ausgaben** — Lebenshaltung, KV-Status (+ PKV-Beitrag), weitere Ausgaben
   (Wohnkosten/Kredite/Unterhalt/sonstige) je bedingt.
8. **Unterschrift** — Datenschutz-Bestätigung, Ort, Datum, **Signature**
   (auch für Mitantragsteller).

Alle Personen-/Finanzfelder gibt es **doppelt** (Haupt- + Mitantragsteller),
Mitantragsteller-Block nur sichtbar wenn Toggle aktiv.

### Reservierung — 1 Datenschritt + Unterschrift
- **Objekt:** Anschrift, Nummer der WE, Kaufpreis €.
- **Person(en):** Mitantragsteller-Toggle; je Person Vorname, Nachname, E-Mail,
  Telefon, Straße & Hausnr., PLZ, Ort, Geburtsdatum, Staatsangehörigkeit,
  **Steuer-ID**, **IBAN**.
- **Unterschrift-Schritt:** Datenschutz bestätigt, „Reservierungsgebühr
  überwiesen" bestätigt, Ort, Datum, **Signature**.

## 4. Datenmodell (Vorschlag — Migration nötig, RLS-Freigabe einholen)

> ⚠️ Migrationen + RLS-Policies erfordern laut Projektregeln **explizite
> User-Freigabe**. Im neuen Chat zuerst Schema mit `list_tables` prüfen und den
> Migrationsentwurf zur Freigabe vorlegen.

**Selbstauskunft** — die `kunden`-Tabelle hat nur grobe Felder
(beruf_status, brutto_jahreseinkommen, eigenkapital …). Das Fillout-Formular hat
~60 Felder × 2 Personen + wiederholbare Immobilien. Empfehlung:

- Neue Tabelle **`selbstauskuenfte`** (1:1 zu `kunden`, `kunde_id` FK):
  - Schlüsselspalten für Auswertung/Bonität (Einkommen, Vermögen, Ausgaben-Summen,
    KV-Status, Beschäftigung) **+** ein **`daten jsonb`** mit dem vollständigen,
    strukturierten Formularzustand (Haupt + Mitantragsteller), damit nichts
    verloren geht und das Formular 1:1 rehydrierbar ist.
  - `status` (entwurf/eingereicht), `step` (Fortschritt), `submitted_at`,
    `signature_haupt_url`, `signature_mit_url`, Audit (`ip`, `user_agent`).
  - `mitantragsteller boolean`.
- Kind-Tabelle **`selbstauskunft_immobilien`** (`selbstauskunft_id` FK) für die
  Subform (Spalten erst nach Klärung, s. Open Questions).
- Beim Einreichen zusätzlich die groben `kunden`-Felder + Bonität
  (`calculateBonitaet`) aktualisieren, damit Dashboard/`SelbstauskunftTab`
  konsistent bleiben.

**Reservierung** — `reservierungen` um die fehlenden Felder erweitern bzw. in
`daten jsonb` ablegen: Steuer-ID, IBAN, Staatsangehörigkeit, Mitantragsteller-
Block, Bestätigungs-Flags (Datenschutz, Gebühr überwiesen), Ort/Datum. Audit +
Signatur sind laut PRD ohnehin Pflicht (IP, User-Agent, Timestamp).

## 5. Komponenten-Architektur

- **Mehrschritt-Wizard** (Client) mit Fortschrittsanzeige, Vor/Zurück,
  Validierung pro Schritt, **Autosave je Schritt** (Server-Action `upsert`),
  Wiederaufnahme über gespeicherten `step`/`daten`.
- **Bedingte Felder** per `react-hook-form` + `watch()` (Toggle Mitantragsteller,
  Einnahme-/Vermögens-/Ausgaben-Checkboxen blenden Betragsfelder ein).
- **Pro-Person-Wiederverwendung:** eine `PersonFieldset`-Komponente, zweimal
  gerendert (Haupt + Mitantragsteller).
- **Immobilien-Subform:** `useFieldArray` (Liste, „Immobilie erfassen").
- **Validierung:** Zod-Schema je Schritt; finale Schema-Validierung vor Submit.
- **Feldtypen-Mapping:** ShortAnswer→Input, EmailInput→Input[type=email],
  NumberInput→Input[inputMode=numeric], CurrencyInput→Euro-Input (de-DE),
  DatePicker→Date-Input, Dropdown→Select, MultipleChoice→RadioGroup,
  Checkboxes→Checkbox-Gruppe, Switch/Checkbox→Switch, Signature→SignaturePad.

## 6. Unterschrift & PDF

- SignaturePad liefert ein PNG/DataURL → in Supabase Storage ablegen
  (`signature_*_url`) oder als DataURL in der Zeile (klein halten).
- Audit-Metadaten (IP via Request-Header, User-Agent, Timestamp) in der
  Server-Action erfassen (PRD-Pflicht für Reservierungs-PDF).
- Reservierungs-PDF (`ReservierungPdfDocument`) um neue Felder + beide
  Unterschriften erweitern. Selbstauskunft-PDF optional (später).

## 7. Server-Actions (neu/anzupassen)

- `saveSelbstauskunftStep({ kundeId, step, daten })` — Autosave (Upsert,
  RLS: Kunde nur eigene Zeile).
- `submitSelbstauskunft({ kundeId, daten, signatures })` — finalisiert,
  setzt `kunden`-Felder + Bonität, `submitted_at`, Audit.
- `getSelbstauskunft(kundeId)` — Rehydrierung des Wizards.
- Reservierung: bestehende Actions in `src/lib/actions/reservierungen.ts` um die
  neuen Felder + Mitantragsteller + Bestätigungen erweitern.

## 8. Edge Cases

- Kein Mitantragsteller → Mitantragsteller-Felder weder gefordert noch gespeichert.
- Teilausfüllung → Autosave + Wiederaufnahme; `status='entwurf'`.
- Bedingte Pflichtfelder nur validieren, wenn sichtbar.
- IBAN/Steuer-ID-Format validieren (IBAN-Regex; Steuer-ID 11 Ziffern).
- Doppeltes Einreichen verhindern (`submitted_at` gesetzt → read-only).
- Signatur leer → Submit blockieren.

## 9. Build-Checkliste (Reihenfolge für den neuen Chat)

1. `FILLOUT-FORMSPEC.md` + `SelbstauskunftWizard.tsx` lesen; Reuse-Entscheidung.
2. Schema prüfen (`list_tables`), Migrationsentwurf (`selbstauskuenfte`,
   `selbstauskunft_immobilien`, `reservierungen`-Erweiterung) → **User-Freigabe**.
3. Migration anwenden, Supabase-Types neu generieren.
4. Zod-Schemas + Feldtyp-Mapping-Komponenten (`PersonFieldset`, Currency-Input).
5. Selbstauskunft-Wizard: 8 Schritte, bedingte Felder, Mitantragsteller,
   Immobilien-Subform, Autosave, Rehydrierung.
6. Unterschrift-Schritt + Audit; Submit-Action (+ kunden/Bonität-Update).
7. Reservierungs-Formular erweitern (Felder + Mitantragsteller + Bestätigungen)
   + PDF erweitern.
8. read-only `SelbstauskunftTab` an die neuen Felder/Quelle anpassen.
9. `tsc` + Tests + `npm run build`; QA gegen FORMSPEC (Feld-für-Feld).

## 10. Open Questions (vor/while Bau klären)

- [ ] **Immobilien-Subform-Spalten** — im Fillout-Export nicht enthalten
      (verlinkte Form). Genaue Spalten beim User erfragen (z. B. Objektart,
      Verkehrswert, Restdarlehen, Mieteinnahme, Eigennutzung?).
- [ ] **Close Lead/Opportunity ID** — CRM-Felder. In der App speichern oder
      ignorieren? (Vermutlich für CRM-Sync — klären.)
- [ ] Bestehenden `SelbstauskunftWizard` **erweitern oder ersetzen**?
- [ ] Reservierungs-Felder (Steuer-ID/IBAN) als Spalten vs. `jsonb`?
- [ ] Müssen Selbstauskunft & Reservierung auch **VP-seitig** ausfüllbar sein?
      (Aktuell: nur Portal/Kunde. Read-only VP-Tab existiert.)

---

### Re-Extraktion (falls FORMSPEC neu erzeugt werden muss)
`node` im Repo-Root; Steps liegen in `template.steps` (Objekt, key=id), verkettet
über `template.firstStep` → `step.nextStep.defaultNextStep`; Widgets unter
`step.template.widgets`, Label in `widget.template.label.logic.value` (HTML),
Optionen in `widget.template.options.staticOptions[].label.logic.value`,
Pflicht via `widget.template.required.logic === true`. Das Generator-Snippet
steht in der Git-Historie dieses Commits (Bash-Aufruf, der FORMSPEC erzeugt hat).
