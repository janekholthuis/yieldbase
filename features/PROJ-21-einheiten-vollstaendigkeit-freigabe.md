# PROJ-21 — Einheiten-Vollständigkeit + Freigabe-Gate

**Status:** In Progress (gebaut 2026-06-16; lokal tsc + 184 Tests + Build + Lint grün; Deploy & manuelle/E2E-Verifikation offen)
**Created:** 2026-06-16

## Kontext / Auslöser
Kunden-Input (Chris Matthewes / Leon QM, 15.6.2026): Jede Einheit soll einen vollständigen Datensatz tragen (große Feldliste), und es braucht ein hartes Qualitätstor: eine Einheit kann jederzeit als **Entwurf** angelegt werden, lässt sich aber erst **freigeben (online)**, wenn **alle** Pflichtfelder vorhanden sind. Excel-Bulk-Upload importiert unvollständige Einheiten trotzdem (als Entwurf) und **warnt** über fehlende Felder. Pro Einheit eine **„Fehlende Daten"-Ansicht**.

**Geklärte Produktentscheidungen:**
- Pflichtfelder = alle Datenfelder; Anlegen vorher jederzeit als Entwurf möglich.
- „Freigegeben" = nur „online/vollständig". Es sperrt (vorerst) **keine** Aktionen (Reservierung/Exposé/Präsentation/Portal bleiben nutzbar). Der einzige harte Gate: Hochschalten auf „freigegeben" nur bei Vollständigkeit.
- MEA = `miteigentumsanteil` (existierte bereits). Objektart = `nutzungsart`.

## Umsetzung

### Datenmodell (Migration `20260616000000_einheit_vollstaendigkeit_freigabe.sql`, auf Prod angewandt)
Neuer Enum `einheit_freigabe_status` (`entwurf | in_bearbeitung | freigegeben`), orthogonal zum Verkaufs-`status`. Neue Spalten auf `einheiten` (additiv, RLS unverändert):
`freigabe_status` (default `entwurf`), `freigegeben_at`, `kaufpreis_wohnung`, `kaufpreis_moebel`, `instandhaltungsruecklage_gesamt`, `renovierungen` (jsonb `[{gewerk,jahr}]`), `lage_im_haus`, `tags` (text[]), `standort_highlights`. Index auf `freigabe_status`. Advisors: keine neuen ERROR.
**`kaufpreis` bleibt der maßgebliche GESAMT-Wert** für die Kalkulations-Engine; die Split-Felder sind informativ.

### Single Source of Truth — `src/lib/einheit-vollstaendigkeit.ts` (neu, pure)
`REQUIRED_FOR_FREIGABE` (alle Pflichtfelder, inkl. bedingt: `vermietet_seit` nur bei `vermietet`, `renovierungen` nur bei `objektzustand='bestand'`). KI-Felder (`tags`, `standort_highlights`) sind als Gruppe hinterlegt, aber via Flag `kiPflichtAktiv` **erst mit PROJ-22 scharf** (sonst wäre keine Freigabe möglich). Funktionen `fehlendeFelder`, `istFreigebbar`, `vollstaendigkeitProzent`. Wird vom Server-Gate, der „Fehlende Daten"-Ansicht und dem Bulk-Import gleichermaßen genutzt.

### Server-Actions — `src/lib/actions/objekte-crud.ts`
- Neue optionale Felder in Zod (`kaufpreis_wohnung/_moebel`, `instandhaltungsruecklage_gesamt`, `lage_im_haus`, `standort_highlights`, `tags`, `renovierungen`) + in alle compact-Blöcke (create/update/bulk). Create & Bulk setzen `freigabe_status` **nie** vom Client → DB-Default `entwurf`.
- Neue Action **`setFreigabeStatus({id,status})`**: harter Gate. Lädt frische DB-Werte (inkl. `projekte.adresse/baujahr`), erzwingt `assertOrgAccess`, und lehnt `freigegeben` mit Liste der fehlenden Pflichtfelder ab, wenn `istFreigebbar` false. `entwurf`/`in_bearbeitung` jederzeit erlaubt.

### UI
- **EinheitForm:** „Lage im Haus" (Technisch), Kaufpreis-Aufteilung (Wohnung/Möbel/Stellplatz) + Live-Summen-Hinweis + Instandhaltungsrücklage gesamt (Wirtschaftlich), neuer **Renovierungen-Tab** (Tabellen-Editor Gewerk/Jahr), Tags + Standort-Highlights (Extras).
- **CompletenessCard** (jetzt Client): Pflichtfeld-% + Freigabe-Status-Badge, **„Fehlende Daten"-Liste**, Freigabe-Button (disabled mit Tooltip bei Lücken) inkl. Übergängen Entwurf/In Bearbeitung/Freigeben. Bilder/Dokumente/Bank bleiben als informative Signale.
- **Badges:** Entwurf/In-Bearbeitung-Badge in Einheiten-Liste (`ProjektTabs`) und Detail-Titel (`EinheitDetailView`); `FREIGABE_LABELS`/`FREIGABE_BADGE_CLASS` in `objekt-format.ts`.
- **Detail-Anzeige:** Renovierungen als Tabelle, Tags als Chips, Standort-Highlights als Text in `EinheitDetailView`.
- **Bulk-Import:** neue Spalten (lage_im_haus, kaufpreis_wohnung/_moebel, rücklage gesamt) inkl. Header-Synonyme; Text-Felder werden unparsed übernommen. Weiche, **nicht blockende** Freigabe-Warnung je Zeile (amber) + Summenzeile „X als Entwurf importiert, davon Y mit fehlenden Freigabe-Feldern".

### Tests
`einheit-vollstaendigkeit.test.ts` (8) neu; `objekte-bulk.test.ts` um PROJ-21-Fälle erweitert; `objekte-filter.test.ts`-Fixture ergänzt. Gesamt: **184 Tests grün**, tsc + Build + Lint grün.

## Akzeptanzkriterien
- [x] Einheit ohne Pflichtdaten anlegbar (bleibt Entwurf).
- [x] „Fehlende Daten"-Liste je Einheit korrekt (SSOT).
- [x] Freigabe nur bei Vollständigkeit möglich; Server lehnt unvollständige Freigabe ab (auch bei Direktaufruf).
- [x] Excel-Bulk importiert unvollständig als Entwurf + Warnung, blockiert nicht.
- [x] Entwurf/In-Bearbeitung-Badges in Listen + Detail sichtbar.
- [ ] Manuelle/E2E-Verifikation auf Prod (eingeloggter VP: anlegen → fehlende Daten → freigeben).
- [ ] Deploy auf Vercel.

## Offen / Folgearbeiten
- Optionaler Listen-Filter nach `freigabe_status` (Plan: optional; noch nicht gebaut).
- **PROJ-22**: KI-Lageeinschätzung + Tags füllen `standort_highlights`/`tags`; danach `kiPflichtAktiv` scharfschalten.
- Optional später: „Freigegeben" als echtes Tor für Portal/Reservierung (aktuell bewusst nicht gatend).
