# Plan: Selbstauskunft & Reservierung als App-Formulare (Fillout-Nachbau)

> **Status:** ✅ **Gebaut 2026-06-13** (tsc + 152 Tests + `npm run build` grün;
> Migration auf Prod angewendet). Manuelle/E2E-QA + visuelle Verifikation offen.
> Umsetzungs-Notizen am Ende dieses Dokuments.
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

---

## Umsetzungs-Notizen (2026-06-13)

**Migration (Prod ffagjzkkzlywejzjfgue, freigegeben):**
`supabase/migrations/20260613090000_fillout_selbstauskunft_reservierung.sql`.
Neu: `selbstauskuenfte` (1:1 kunde, `daten jsonb` + Auswertungsspalten + Audit +
versteckte CRM-Felder), `selbstauskunft_immobilien` (Subform). `reservierungen`
um `steuer_id, staatsangehoerigkeit, antragsteller_iban, mitantragsteller,
datenschutz_bestaetigt, gebuehr_ueberwiesen, ort, datum, daten jsonb, close_*,
berater_*` erweitert. RLS analog `kunden` (Self/VP-Subtree/VL/Support/Admin).
Supabase-Advisors: 0 ERROR. Types neu generiert.

**Selbstauskunft (PROJ-7) — neuer 8-Schritt-Wizard ersetzt den alten 5-Schritt:**
- `src/lib/selbstauskunft.ts` — reines Domänenmodell (Optionen exakt nach FORMSPEC,
  `PersonData`/`SelbstauskunftData`, `parseEuro`, Summen-Ableitung für
  Auswertung/Bonität, `applyPrefill`, bedingte Validierung). Tests:
  `selbstauskunft.test.ts` (15 Fälle).
- `src/lib/actions/selbstauskunft.ts` — `getMySelbstauskunftContext`,
  `saveSelbstauskunftDraft` (Autosave/Upsert, authed/RLS-self),
  `submitMySelbstauskunft` (finalisiert, Immobilien-Subform ersetzt, **kunden-
  Mirror + Bonität via Admin-Client** — der `kunden_protect_system_fields`-
  Trigger greift mangels auth.uid() nicht). Audit ip/user_agent aus Headers.
- `src/components/portal/SelbstauskunftWizard.tsx` — 7 Inhalts-Schritte
  (Persönlich · Tätigkeit · Einnahmen · Vermögen · Immobilien · Ausgaben ·
  Unterschrift), `PersonBlock` 2× (Haupt + Mitantragsteller), bedingte Felder,
  Immobilien-`useState`-Liste, Autosave je „Weiter", `SignaturePad` (Haupt + Mit).
- `src/app/(portal)/portal/selbstauskunft/page.tsx` — Prefill: URL-Param
  (`vorname,nachname,mail|email,telefon`) vor DB (`kunden`), versteckte CRM-Felder
  (`close_lead_id,close_opportunity_id,berater_*`) aus URL bzw. gespeicherter Zeile/VP.

**Bonität aus Netto-Einnahmen:** Die Selbstauskunft erfasst (wie Fillout) NETTO.
Als Einkommensbasis dient die annualisierte Gesamteinnahme → konservativ
(netto < brutto). Nur gerechnet, wenn Beschäftigung einen Bonitäts-Status ergibt
(Angestellt/Beamter→angestellter, Freiberufler→selbststaendiger). VP kann
`brutto_jahreseinkommen` im Bonitäts-Tab nachschärfen.

**Reservierung (PROJ-5) — Felder ergänzt + Prefill:**
- `reservierungen.ts` `createReservierung`: persistiert Steuer-ID,
  Staatsangehörigkeit, Antragsteller-IBAN, Mitantragsteller-Flag, Datenschutz-/
  Überweisungs-Bestätigung, Ort/Datum, `daten` (Mitantragsteller-Block).
- `data/reservierungen.ts`: Context liefert Prefill aus eingereichter
  Selbstauskunft (Staatsangehörigkeit + kompletter Mitantragsteller-Block).
- `ReservierungModal.tsx`: neue Abschnitte „Angaben Antragsteller" (Steuer-ID/
  IBAN/Staatsangehörigkeit, vorausgefüllt), Mitantragsteller-Toggle + Block,
  Ort/Datum, Zusatz-Bestätigung „Gebühr überwiesen".
- `ReservierungPdfDocument.tsx`: zeigt Antragsteller-Zusatzfelder,
  Mitantragsteller-Tabelle und Bestätigungs-Häkchen.

**Read-only Selbstauskunft-Tab (VP, `KundeDetailView`)** bleibt unverändert —
er liest die flachen `kunden`-Felder, die der Submit weiter spiegelt → konsistent.
Eine reichere VP-Ansicht (Einnahmen-/Ausgaben-Breakdown, Immobilien, Mitantrag-
steller) aus `selbstauskuenfte` wäre ein optionaler Folgeschritt.

**Offen:** manuelle/E2E-QA (Portal-Flow inkl. Prefill-URL aus Close); exakte
URL-Param-Namen am Close-Mapping verifizieren (`mail` vs. `email`, `telefon`);
Immobilien-Subform-Spalten ggf. erweitern; optionaler Close-Sync der versteckten
CRM-IDs.

---

## QA-Ergebnisse (Code-Level QA + Security-Audit, 2026-06-13)

> **Methodik:** tsc + `npm run build` grün, 152 Unit-Tests grün (inkl. 15 für
> `selbstauskunft.ts`), Feldabgleich gegen `FILLOUT-FORMSPEC.md`, Red-Team-Audit
> der Server-Actions. **Browser-E2E nicht ausgeführt** — braucht laufende
> authentifizierte App + Portal-Kunde-Seed + Live-Supabase. Offen als Folgeschritt
> (idealerweise auf Staging mit Beispiel-Prefill-URL aus Close).

### Feldabdeckung Selbstauskunft (vs. FORMSPEC)
- ✅ 7 Inhalts-Schritte: Persönlich, Tätigkeit, Einnahmen, Vermögen, Immobilien,
  Ausgaben, Unterschrift. Optionen exakt nach FORMSPEC.
- ✅ Mitantragsteller doppelt (Toggle), bedingte Felder (Beruf nur bei
  Erwerbstätigkeit; Befristet-bis nur bei „Befristet bis"; PKV nur bei privat;
  Betragsfelder nur bei gewählter Quelle).
- ✅ Immobilien-Subform (Ja/Nein + wiederholbare Liste).
- ✅ Unterschrift Haupt + (bedingt) Mitantragsteller, Datenschutz, Ort, Datum.
- ✅ Prefill: URL-Param (`vorname/nachname/mail|email/telefon`) vor DB; versteckte
  CRM-Felder (`close_*`, `berater_*`) durchgereicht, nicht angezeigt.

### Security-Audit — neue Actions
- ✅ `saveSelbstauskunftDraft` / `submitMySelbstauskunft`: `kunde_id` wird aus
  `findMyKunde(userId)` abgeleitet, **nicht** aus Input → kein IDOR. Schreiben via
  authed Client (RLS `sa_self_*`). Immobilien via `sai_self_all` (Parent-Ownership).
- ✅ kunden-Mirror via Admin-Client ist auf `eq("id", eigene kunde.id)` beschränkt;
  setzt **nicht** `status/vp_id/user_id` → keine Rechte-Eskalation. Bonität wird
  serverseitig neu gerechnet.
- ✅ `submitMySelbstauskunft` validiert alle Pflicht-Schritte **serverseitig**
  (vertraut nicht dem Client), Unterschrift Pflicht.
- ✅ `createReservierung`: unveränderter Auth-Pfad (`requireUser`, `vp_id=userId`),
  nur zusätzliche Spalten — keine neue Autorisierungslücke. RLS unverändert.
- ✅ Supabase-Advisors nach Migration: **0 ERROR**.

### Gefundene Punkte
- **BUG-Q3 (Low–Medium) — Unterschrift ohne Längenlimit.** `submitMySelbstauskunft`
  `signaturHaupt/signaturMit` = `z.string().min(1)` ohne Max (Reservierung cappt bei
  2 MB). Großer DataURL landet ungebremst in `text`-Spalte. *Empfehlung:* `.max(2_000_000)`.
- **BUG-Q4 (Low) — IP-Audit ungeprüft.** `ip: ipRaw as never` (inet). Ein
  manipulierter `x-forwarded-for` mit ungültigem Wert könnte den inet-Cast und
  damit den Submit brechen (Self-DoS). Auf Vercel ist XFF plattformkontrolliert →
  Realrisiko gering. *Empfehlung:* IP validieren / try-catch / bei Ungültigkeit null.
- **BUG-Q5 (Low, by design) — Kundengetriebene Bonität.** Der Kunde kann durch
  Selbstauskunft seine eigenen Bonitäts-Kennzahlen (max_*) beeinflussen (Admin-Client
  umgeht den protect-Trigger — konsistent mit der bestehenden `submit_selbstauskunft`-
  RPC). VP-Review im Bonitäts-Tab bleibt die Kontrolle. *Optional:* Bonität erst nach
  VP-Freigabe als „bestätigt" markieren.
- **INFO — PII.** Steuer-ID/IBAN werden als Klartext gespeichert (konsistent mit
  bestehendem `bank_iban`). Kein neues Risiko; für Compliance vormerken.
- **OFFEN — Close-URL-Param-Namen** (`mail` vs. `email`, `telefon` vs. `telefonnr`)
  am echten Fillout-Share-Link/Close-Mapping verifizieren, sonst greift Prefill nicht.

### Fazit
Keine Critical/High-Bugs; Auth/RLS/Org-Isolation sauber. **Empfehlung:** BUG-Q3
(Längenlimit) vor Deploy fixen, BUG-Q4 defensiv härten; danach manuelle/E2E-QA auf
Staging + Close-Param-Verifikation.

### Fixes nach QA (2026-06-13)
- **BUG-Q3** ✅ gefixt: `signaturHaupt/signaturMit` in `submitMySelbstauskunft` auf
  `.max(2_000_000)` begrenzt (wie Reservierung).
- **BUG-Q4** ✅ gefixt: `sanitizeIp()` validiert den `x-forwarded-for`-Wert vor dem
  inet-Cast (ungültig → null), kein Submit-Bruch mehr möglich.
- **BUG-Q5 / PII / Close-Params:** unverändert (by design bzw. offen — s. o.).
- Verifikation: `tsc` + **156 Tests** + `npm run build` grün.
