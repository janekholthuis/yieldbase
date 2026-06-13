# PROJ-16: Objekte anlegen — Bauträger raus + Bulk-Einheiten (Excel-Paste)

## Status: In Progress (gebaut, QA/Deploy offen)
**Created:** 2026-06-13
**Last Updated:** 2026-06-13

> Auslöser: Praxis-Input von Chris zum „Objekt anlegen"-Flow
> (`ProjektWizard`). Zwei Punkte: (1) Bauträger nicht prominent machen,
> (2) Einheiten nicht mehr einzeln, sondern mehrere auf einmal — typische
> Ausgangslage ist eine **Excel-Kaufpreisliste** (Größe, Kaltmiete, Kaufpreis …),
> Objekte haben teils 20–30+ Einheiten.

## Dependencies
- Requires: PROJ-3 (Objekte) — `ProjektWizard`, `EinheitForm`, `createEinheit`
- Nutzt: `createEinheit` (Org-Guard `assertOrgAccess`) → Basis für Bulk-Variante

## Teil A — Bauträger nicht mehr erfassen/anzeigen

**Warum:** Eigentümer/Entwickler sollen **nicht offensichtlich** sein — gerade
bei fremden Projekten, die diskret gehalten werden.

**Umfang:**
- **Eingabe entfernen:** Bauträger-Feld aus `ProjektWizard` (Z. 64/83/115/276–277)
  entfernen; `createProjekt` lässt das Feld weg (Spalte bleibt, kein Pflichtfeld).
- **Anzeige entfernen/ausblenden:** `ProjektCard` (Metric „Bauträger"),
  `ProjektDetailView` (Bauträger-Zeile).
- **Suche/Filter:** „Bauträger" aus Such-Placeholder (`ObjekteListView`,
  `ObjekteFilterSidebar`) und Filter-Abschnitt entfernen bzw. neutral benennen.
- **DB-Spalte `projekte.bautraeger` bleibt** (keine Migration). Der Investagon-
  Sync befüllt sie weiterhin aus `object_operator_name` — siehe Open Questions,
  ob auch synchronisierte Werte ausgeblendet werden sollen.

## Teil B — Mehrere Einheiten auf einmal (Bulk-Erfassung)

Heute: Bei „Objekt mit mehreren Wohnungen" (mfh) wird **eine Einheit nach der
anderen** über `EinheitForm` erfasst (Key-Bump + „Fertig"). Das skaliert nicht.

**Ziel-MVP:** Nach dem Anlegen des Projekts ein **Bulk-Editor (Tabellen-Grid)**:
- Mehrere Zeilen (Einheiten) untereinander, Spalten = Kernfelder der
  Kaufpreisliste: **Wohnungsnummer, Etage, Zimmer, Wohnfläche (m²),
  Kaltmiete (€/Monat), Kaufpreis (€)** (+ optional Stellplatzpreis).
- **Aus Excel einfügen:** In das Grid (oder ein Paste-Feld) kann der Nutzer einen
  Bereich aus Excel kopieren (Tab-getrennt, Zeilen = `\n`) → wird in Zeilen/Spalten
  geparst. Deutsche Zahlen (`1.234,56`) korrekt interpretieren.
- **Spalten-Zuordnung:** Da Excel-Layouts variieren, beim Paste eine einfache
  **Spalten-Mapping-UI** (erkannte Spalten → Felder zuordnen; Header-Zeile
  optional erkennen/überspringen).
- Zeilen vor dem Speichern editier-/löschbar; Validierung je Zeile (Pflicht:
  Wohnungsnummer; Zahlen plausibel).
- **Bulk speichern** in einer Aktion → alle Einheiten ins Projekt.

**Next Level (Out of Scope MVP):** Datei-Upload (CSV/XLSX) statt Copy-Paste.

## User Stories
- Als **VP/Admin** möchte ich beim Anlegen eines Mehrfamilienhauses alle
  Einheiten in einem Schritt erfassen, statt jede einzeln, damit 20–30 Einheiten
  nicht je einzeln eingegeben werden müssen.
- Als **VP/Admin** möchte ich meine Excel-Kaufpreisliste direkt in die App
  einfügen können, damit ich Daten nicht abtippe.
- Als **Vertrieb** möchte ich den Bauträger/Eigentümer nicht im Frontend zeigen,
  damit fremde Projekte diskret bleiben.

## Out of Scope
- **CSV/XLSX-Datei-Upload** — spätere Ausbaustufe (MVP = Copy-Paste-Grid).
- **Bulk-Bearbeitung bestehender** Einheiten (nur Anlegen).
- Vollständiges Spaltentyp-Auto-Erkennen über simples Mapping hinaus.
- Bilder/Dokumente je Einheit im Bulk (weiter Einzel-Flow).
- Entfernen der DB-Spalte `bautraeger` (bleibt für Sync/Daten).

## Acceptance Criteria
- [ ] Angenommen ich öffne „Neues Projekt anlegen", wenn ich die Stammdaten sehe, dann gibt es **kein** Bauträger-Eingabefeld mehr.
- [ ] Angenommen ein Projekt hat einen (z. B. synchronisierten) Bauträger, wenn ich Projektkarte/Projekt-Detail ansehe, dann wird der Bauträger **nicht** angezeigt.
- [ ] Angenommen ich habe ein Mehrfamilienhaus angelegt, wenn ich zum Einheiten-Schritt komme, dann sehe ich ein **Tabellen-Grid** zum Erfassen mehrerer Einheiten statt eines Einzelformulars.
- [ ] Angenommen ich kopiere mehrere Zeilen aus Excel, wenn ich sie in das Grid/Paste-Feld einfüge, dann werden sie in Zeilen und Spalten zerlegt und als Einheiten-Entwürfe angezeigt.
- [ ] Angenommen die eingefügten Spalten passen nicht zur Standardreihenfolge, wenn ich das Mapping anpasse, dann werden die Werte den richtigen Feldern zugeordnet.
- [ ] Angenommen eine Zelle enthält eine deutsche Zahl wie „1.234,56", wenn sie geparst wird, dann wird sie korrekt als 1234,56 interpretiert.
- [ ] Angenommen eine Zeile hat keine Wohnungsnummer, wenn ich speichern will, dann wird die Zeile als ungültig markiert und das Speichern für diese Zeile verhindert.
- [ ] Angenommen ich bestätige das Grid mit N gültigen Zeilen, wenn ich „Speichern" klicke, dann werden N Einheiten im Projekt angelegt und die Anzahl bestätigt.
- [ ] Angenommen ich lege eine einzelne Wohnung (etw_einzeln) an, wenn ich den Wizard nutze, dann bleibt der bestehende Einzel-Flow unverändert.

## Edge Cases
- Paste mit/ohne **Header-Zeile** (erkennen/überspringen).
- Unterschiedliche Spaltenanzahl je Zeile / leere Zellen.
- **Doppelte Wohnungsnummern** innerhalb des Pastes oder im Projekt.
- Sehr viele Zeilen (50+): Performance + Bulk-Insert in Chunks.
- Ungültige Zahlen / Text in Zahlenspalten → Zeile markieren, nicht abbrechen.
- **Teilfehler beim Speichern:** atomar (alles oder nichts) vs. pro-Zeile —
  Entscheidung siehe Open Questions; Fehler je Zeile rückmelden.
- Abbruch nach Projekt-Anlage (Projekt existiert dann ohne Einheiten — ok).

## Product Decisions
| Decision | Rationale | Date |
|---|---|---|
| Bauträger-Eingabe entfernen, Anzeige ausblenden, DB-Spalte behalten | Diskretion gewünscht; Sync-Daten/Historie nicht zerstören | 2026-06-13 |
| Bulk via Copy-Paste-Grid im MVP, Datei-Upload später | Excel-Paste deckt die Praxis sofort ab, geringerer Aufwand | 2026-06-13 |
| etw_einzeln-Flow unverändert | Einzelwohnung braucht keine Bulk-Erfassung | 2026-06-13 |

## Open Questions
- [ ] **Standard-Spaltenreihenfolge** der typischen Kaufpreisliste? (Beispiel-Excel
      von Chris anfordern, um Default-Mapping festzulegen.)
- [ ] Sollen auch **synchronisierte** Bauträger-Werte ausgeblendet werden (ja
      laut Diskretion) — oder nur das manuelle Feld?
- [ ] Speichern **atomar** (Transaktion/RPC) oder pro Zeile mit Fehlerliste?
- [ ] Welche Spalten sind im MVP Pflicht vs. optional (z. B. Stellplatz, Hausgeld)?
- [ ] Priorität Datei-Upload (CSV/XLSX) als nächste Stufe?

## Tech-Hinweise (für die Umsetzung)
- Neue Bulk-Action `createEinheitenBulk({ projektId, einheiten[] })` analog zu
  `createEinheit` (gleicher `assertOrgAccess`-Guard), Insert in Chunks.
- Paste-Parsing: `clipboardData`/`onPaste`, Split `\n` → `\t`; de-Zahlen über
  vorhandene Parser-Logik (`num()`), Mapping-State im Client.
- Grid: shadcn `Table` + editierbare Zellen (Input) oder leichte Eigenbau-Tabelle.
- Bauträger-Ausblendung: Edits in `ProjektWizard`, `ProjektCard`,
  `ProjektDetailView`, `ObjekteListView`, `ObjekteFilterSidebar`.

---

## Tech Design (Solution Architect)
_Direkt im Build-Chat umgesetzt._

## Implementation Notes (2026-06-13)

**Teil A — Bauträger ausgeblendet:**
- `ProjektWizard.tsx`: Bauträger-State, Reset, `createProjekt`-Param und das
  Eingabefeld entfernt.
- Anzeige entfernt: `ProjektCard.tsx` (Metric + Feld aus `ProjektCardData`-Typ),
  `ProjektDetailView.tsx` (Bauträger-Zeile), `ObjekteListView.tsx`
  (Card-Plumbing `groupForGrid`).
- Suche: „Bauträger" aus den Such-Placeholdern (`ObjekteListView`,
  `ObjekteFilterSidebar`) und aus dem Volltext-Index (`objekte-filter.ts` —
  `bautraeger` aus `hay` entfernt) genommen; Filter-Kommentar neutralisiert.
- **DB-Spalte `projekte.bautraeger` bleibt** (keine Migration). `createProjekt`/
  `updateProjekt` akzeptieren das Feld weiterhin (für Investagon-Sync), das UI
  setzt/zeigt es aber nicht mehr. → Open Question „auch synchronisierte Werte
  ausblenden": **ja, Anzeige überall entfernt**; der Wert bleibt nur in der DB.

**Teil B — Bulk-Einheiten (Excel-Paste):**
- Neue Server-Action `createEinheitenBulk({ projekt_id, einheiten[] })` in
  `objekte-crud.ts`: gleicher `assertOrgAccess`-Guard wie `createEinheit`,
  Insert in Chunks à 100, gibt `{ count }` zurück. Entscheidung: **pro Chunk
  atomar** (kein Rollback über Chunks hinweg) — Fehler werden mit Kontext
  zurückgemeldet.
- Reine, getestete Hilfslogik in `src/lib/objekte-bulk.ts`: `parseDeNumber`
  (de-Zahlen „1.234,56" → 1234.56), `parseClipboardMatrix`, `looksLikeHeaderRow`,
  `guessFieldFromHeader`/`buildMapping` (Spalten-Auto-Mapping per Synonymen),
  `matrixToRows`, `rowError`. Tests: `objekte-bulk.test.ts` (24 Fälle).
- Neue Komponente `EinheitenBulkGrid.tsx`: editierbares Tabellen-Grid
  (Wohnungsnr.*, Etage, Zimmer, Fläche, Kaltmiete, Kaufpreis, Stellplatzpreis),
  Excel-Paste-Panel mit Spalten-Mapping-UI + Header-Erkennung, Zeilen-Validierung
  (Wohnungsnr. Pflicht, Zahlen plausibel) mit Inline-Fehler, gültig/ungültig-Zähler.
- `ProjektWizard.tsx` (mfh-Schritt): Standard ist jetzt das Bulk-Grid; ein
  Modus-Umschalter „Mehrere (Tabelle)" / „Einzeln mit Details" erhält den alten
  Einzel-Flow. Nach dem Speichern → `/objekte/projekt/[projektId]`.

**Offene Entscheidungen umgesetzt/zurückgestellt:**
- Standard-Spaltenreihenfolge = `wohnungsnummer, etage, zimmer, wohnflaeche,
  miete, kaufpreis, stellplatz_preis` (Fallback ohne Header). Beispiel-Excel von
  Chris für besseres Default-Mapping noch offen.
- Speichern: pro-Chunk atomar (s. o.).
- CSV/XLSX-Upload: weiterhin Out of Scope.

**Verifikation:** `tsc` ✓, `vitest run` → 137/137 ✓, `npm run build` ✓.
**Offen:** manuelle/E2E-QA gegen echte Excel-Liste; Deploy.

## QA Test Results (Code-Level QA + Security-Audit, 2026-06-13)

> **Methodik:** Statische Analyse (tsc + `npm run build` grün), 152 Unit-Tests
> grün (inkl. 24 für `objekte-bulk.ts`), Akzeptanzkriterien-Review gegen den Code,
> Red-Team-Audit der Server-Action. **Browser-E2E nicht ausgeführt** — erfordert
> laufende authentifizierte App + Seed-Daten; als Folgeschritt offen.

### Akzeptanzkriterien
| # | Kriterium | Status |
|---|---|---|
| 1 | Kein Bauträger-Eingabefeld | ✅ Pass (`ProjektWizard` Feld entfernt) |
| 2 | Synchronisierter Bauträger nicht angezeigt | ✅ Pass (Card + Detail entfernt) |
| 3 | mfh → Tabellen-Grid statt Einzelformular | ✅ Pass (Bulk = Default, Umschalter) |
| 4 | Excel-Paste → Zeilen/Spalten + Entwürfe | ✅ Pass (`parseClipboardMatrix` + Vorschau) |
| 5 | Spalten-Mapping anpassbar | ✅ Pass (Mapping-Selects + Auto-Mapping) |
| 6 | de-Zahl „1.234,56" → 1234,56 | ✅ Pass (getestet) |
| 7 | Zeile ohne Wohnungsnr. → ungültig, Speichern verhindert | ✅ Pass (`rowError`, gültig-Zähler) |
| 8 | N gültige Zeilen → N Einheiten + Bestätigung | ✅ Pass (`createEinheitenBulk` → count + Toast) |
| 9 | etw_einzeln-Flow unverändert | ✅ Pass |

### Security-Audit — `createEinheitenBulk`
- ✅ Rollen-Gate `requireRole(INTERNAL_ROLES)` (Kunde/extern ausgeschlossen).
- ✅ Mandanten-Isolation: `assertOrgAccess(session, parentProjekt.organisation_id)`
  vor dem Admin-Client-Insert; Einheiten erben `organisation_id` des Projekts.
  Cross-Org-Insert für VP/VL blockiert (nur admin/support dürfen cross-org).
- ✅ Zod-Validierung je Zeile (Wohnungsnr. Pflicht, Zahlen coerced).

### Gefundene Punkte
- **BUG-Q1 (Medium) — Doppelte Wohnungsnummern.** ✅ **Gefixt 2026-06-13.**
  Helper `duplicateWohnungsnummern()` (getestet) markiert Duplikate (im Paste +
  gegen bestehende Projekt-Einheiten) im Grid als „Wohnungsnr. doppelt" und
  schließt sie aus dem gültig-Zähler/Speichern aus. Zusätzlich serverseitiger
  Hard-Block in `createEinheitenBulk` (Batch-intern + gegen vorhandene Einheiten).
- **BUG-Q2 (Low) — Mengenlimit.** ✅ **Gefixt 2026-06-13.** `createEinheitenBulk`
  begrenzt auf `.max(500)` Einheiten pro Vorgang.

### Fazit
Keine Critical/High-Bugs; beide Funde (Q1 Medium, Q2 Low) gefixt, `tsc` + 156 Tests
+ `npm run build` grün. **Offen:** manuelle/E2E-Verifikation auf Staging. Bereit für
Deploy nach kurzer manueller Sichtprüfung.
