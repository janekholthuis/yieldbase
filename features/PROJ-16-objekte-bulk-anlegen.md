# PROJ-16: Objekte anlegen — Bauträger raus + Bulk-Einheiten (Excel-Paste)

## Status: Planned
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
_To be added by /architecture (oder direkt im Build-Chat)._

## QA Test Results
_To be added by /qa._
