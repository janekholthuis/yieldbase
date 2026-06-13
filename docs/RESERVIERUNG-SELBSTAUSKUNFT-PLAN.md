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
- **Leitprinzip: „Der Kunde füllt nur, was relevant ist."** Alles, was schon
  bekannt ist (Prefill aus URL/CRM bzw. aus der Selbstauskunft), wird
  **vorausgefüllt** und nicht erneut abgefragt (read-only/zusammengeklappt,
  editierbar nur bei Bedarf). Siehe Abschnitt 3b.

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

## 3b. Prefill & CRM (Close.io) — „nur Relevantes ausfüllen"

Das heutige Fillout-Formular wird per **prefilled URL aus Close.io** geöffnet.
Die Felder kommen als **URL-Parameter** rein; die Close-IDs + Berater sind
**versteckte** Felder (nicht im UI sichtbar, aber gespeichert/durchgereicht).

**URL-Parameter (Quelle = Close.io):**

| Param | Ziel-Feld | Sichtbar? |
|---|---|---|
| `vorname` | Vorname (Hauptantragsteller) | ja (vorausgefüllt) |
| `nachname` | Nachname | ja (vorausgefüllt) |
| `mail` | E-Mail | ja (vorausgefüllt) |
| `telefon` (Telefonnr.) | Telefon | ja (vorausgefüllt) |
| `berater_vorname` | Berater/VP Vorname | **versteckt** |
| `berater_nachname` | Berater/VP Nachname | **versteckt** |
| `close_lead_id` | CRM Lead-ID | **versteckt** |
| `close_opportunity_id` | CRM Opportunity-ID | **versteckt** |

> Exakte Param-Namen am Fillout-Share-Link/Close-Mapping verifizieren
> (insb. `telefon` vs. `telefonnr`). Im Fillout-Export tauchen `Close Lead ID`
> und `Close Opportunity ID` als versteckte ShortAnswer-Felder auf.

**Prefill-Strategie im App-Nachbau (Priorität, erstes Nicht-Leeres gewinnt):**
1. **URL-Query-Parameter** (für den Close-Link-Flow / Leads ohne Portal-Login),
2. **DB-Datensatz** des eingeloggten Kunden (`kunden`) + zugewiesener **VP**
   (Berater) — im Portal der Normalfall,
3. leer.

**Versteckte Felder:** `close_lead_id`, `close_opportunity_id`,
`berater_vorname/nachname` werden aus URL (oder DB) übernommen, **nie angezeigt**,
aber in der Selbstauskunft/Reservierung gespeichert (für späteren CRM-Sync,
siehe Open Questions). Niemals als Klartext-Query im Browserverlauf „verlieren":
nach dem Lesen in den State übernehmen.

**Reservierung wird aus der Selbstauskunft vorausgefüllt.** Hat der Kunde die
Selbstauskunft bereits eingereicht, übernimmt das Reservierungs-Formular alle
überlappenden Daten (Name, Kontakt, Adresse, Geburtsdatum, Staatsangehörigkeit,
ggf. Steuer-ID/IBAN falls dort erfasst, Mitantragsteller). Der Kunde bestätigt
nur noch objektspezifische Felder + Unterschrift. Quelle = `selbstauskuenfte`
(bzw. `kunden`), Fallback URL-Param/leer.

**UX „nur Relevantes":** Vorausgefüllte Personenblöcke standardmäßig kompakt
anzeigen („Deine Daten — bearbeiten"), Fokus auf die noch offenen Pflichtfelder.
Bedingte Felder erst einblenden, wenn relevant (s. Abschnitt 5).

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
  - **CRM/versteckt:** `close_lead_id`, `close_opportunity_id`,
    `berater_vorname`, `berater_nachname` (aus URL-Param/CRM, nie im UI gezeigt;
    für späteren Close-Sync). Analog auf `reservierungen` mitführen.
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
5. **Prefill-Layer** (Abschnitt 3b): URL-Param-Parser + DB/VP-Fallback,
   versteckte CRM-Felder (close_*, berater_*) durchreichen, Personenblöcke
   kompakt/vorausgefüllt rendern.
6. Selbstauskunft-Wizard: 8 Schritte, bedingte Felder, Mitantragsteller,
   Immobilien-Subform, Autosave, Rehydrierung.
7. Unterschrift-Schritt + Audit; Submit-Action (+ kunden/Bonität-Update).
8. Reservierungs-Formular erweitern (Felder + Mitantragsteller + Bestätigungen)
   + **Prefill aus Selbstauskunft** + PDF erweitern.
9. read-only `SelbstauskunftTab` an die neuen Felder/Quelle anpassen.
10. `tsc` + Tests + `npm run build`; QA gegen FORMSPEC (Feld-für-Feld) inkl.
    Prefill-Test mit Beispiel-URL aus Close.

## 10. Open Questions (vor/while Bau klären)

- [ ] **Immobilien-Subform-Spalten** — im Fillout-Export nicht enthalten
      (verlinkte Form). Genaue Spalten beim User erfragen (z. B. Objektart,
      Verkehrswert, Restdarlehen, Mieteinnahme, Eigennutzung?).
- [x] **Close Lead/Opportunity ID** — ENTSCHIEDEN: aus URL-Param übernehmen,
      versteckt speichern (für späteren Close-Sync). Param-Namen verifizieren.
- [ ] **Exakte URL-Param-Namen** am Close/Fillout-Mapping bestätigen
      (`vorname`, `nachname`, `mail`, `telefon?`, `berater_vorname`,
      `berater_nachname`, `close_lead_id`, `close_opportunity_id`).
- [ ] **Prefill-Quelle im Portal:** primär eingeloggter Kunde + VP, oder soll
      der Close-URL-Link (auch für Leads ohne Login) der Haupt-Einstieg sein?
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
