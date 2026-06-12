# PROJ-15: Standort-Highlights

## Status: In Progress
**Created:** 2026-06-12
**Last Updated:** 2026-06-12

> Spec im Interview-Kurzverfahren entstanden; auf Wunsch des Nutzers direkt
> umgesetzt ("Baue einfach mal so wie du denkst und ich optimiere am Ende").
> Dieses Dokument hält den finalen Scope + die Entscheidungen fest.

## Dependencies
- Requires: PROJ-3 (Objekte) — Einheiten-Detailseite, Karte-Tab, Adressdaten
- Requires: PROJ-8 (Präsentation/Exposé) — `SlideLage` hatte den Platzhalter
- Nutzt: bestehende Mapbox-Integration (`src/lib/mapbox.ts`, `NEXT_PUBLIC_MAPBOX_TOKEN`)

## User Stories
- Als **Vertriebspartner** möchte ich auf der Einheiten-Detailseite die nächstgelegenen Einrichtungen je Kategorie sehen, um die Lage schnell einzuschätzen.
- Als **Vertriebspartner** möchte ich diese Highlights automatisch (ohne Tipparbeit) in der Präsentation/Exposé vor dem Kunden zeigen, um die Lagequalität zu verkaufen.
- Als **Kunde** möchte ich in der Präsentation auf einen Blick sehen, wie weit ÖPNV, Einkauf, Bildung und Gesundheit entfernt sind.
- Als **Nutzer ohne konfigurierten Karten-Token** möchte ich keine kaputten/leeren Module sehen — das Modul blendet sich still aus.

## Scope (MVP)
- **Automatisch**, keine VP-Kuratierung: je Kategorie der **nächstgelegene** POI.
- 5 fixe Kategorien: **ÖPNV, Einkauf, Bildung, Gesundheit, Autobahn**.
- **Luftlinien-Distanz** (Haversine), kein Routing.
- Anzeige: **Einheiten-Detailseite** (Karte-Tab) + **Präsentation** (`SlideLage`).
- Quelle: **Mapbox Search Box Category Search** (per-request, kein Session-Token).

## Out of Scope
- **Isochronen / Erreichbarkeits-Polygone** — spätere Ausbaustufe (teuer, eigene API).
- **Lagebewertung / Score** — vom Nutzer explizit gestrichen (nicht im MVP).
- **VP-Kuratierung** (Auswählen/Ausblenden/eigene Highlights) — bewusst nicht; voll automatisch.
- **Routen-Distanz/-Zeit** (Geh-/Fahrweg) — bewusst Luftlinie.
- **Projekt-Detailseite** und **Exposé-PDF-Export** — vorerst nur Einheit + Live-Präsentation; spätere Optimierung.
- **Konfigurierbare Kategorien** — fix verdrahtet.

## Acceptance Criteria
- [ ] Angenommen eine Einheit hat eine geokodierbare Adresse und ein gültiger Mapbox-Token ist konfiguriert, wenn der Nutzer den Karte-Tab öffnet, dann erscheint unter der Karte das Modul „Standort-Highlights" mit je Kategorie dem nächstgelegenen POI und der Luftlinien-Distanz.
- [ ] Angenommen das Modul lädt noch, wenn die Daten geholt werden, dann werden Skeleton-Platzhalter angezeigt (kein Layout-Sprung).
- [ ] Angenommen kein gültiger Mapbox-Token ist konfiguriert, wenn der Nutzer den Karte-Tab oder die Präsentation öffnet, dann wird das Highlights-Modul still ausgeblendet (kein Fehler, kein leerer Kasten).
- [ ] Angenommen eine Adresse ist nicht geokodierbar oder liefert keine POIs, wenn das Modul lädt, dann wird im Karte-Tab nichts gerendert und in der Präsentation ein dezenter Hinweis („keine Standortdaten verfügbar") gezeigt.
- [ ] Angenommen eine Distanz liegt unter 1 km, wenn sie angezeigt wird, dann erscheint sie auf 10 m gerundet in Metern (z. B. „420 m"); ab 1 km in km mit deutschem Dezimalkomma (z. B. „1,2 km").
- [ ] Angenommen der Nutzer öffnet die Präsentation, wenn die Lage-Slide erscheint, dann ersetzt die echte Highlights-Liste den früheren Platzhaltertext.

## Edge Cases
- **Kein/ungültiger Token:** `hasMapbox()` false → `fetchStandortHighlights` gibt `[]`, Modul rendert nichts (Karte) bzw. Hinweis (Präsentation).
- **Adresse nicht geokodierbar:** keine Koordinaten → keine Highlights.
- **Kategorie ohne Treffer:** wird übersprungen (Liste zeigt nur gefundene Kategorien).
- **Unbekannte/unsupported canonical_id:** API-Antwort nicht ok → leer, sauberer Skip (mehrere Kandidaten-IDs je Kategorie als Absicherung).
- **Tab-Wechsel / Re-Render:** Ergebnisse werden modul-seitig gecacht (Key = gerundete Koordinaten + Kategorie), keine doppelten API-Calls.

## Technical Requirements
- Graceful Degradation ohne Token (kein Build-/Runtime-Fehler) — analog `src/lib/mapbox.ts`.
- Distanzen rein clientseitig aus Koordinaten (kein zusätzlicher Routing-Call).
- Caching, um API-Kosten bei Re-Renders/Tab-Switches niedrig zu halten.

## Open Questions
- [ ] **Autobahn-Kategorie:** `motorway_junction` ist als Mapbox-Search-Box-Kategorie nicht verifiziert (lokaler Token war ein Dummy → kein Live-Test). Ggf. mit echtem Token prüfen und canonical_id anpassen.
- [ ] **Canonical IDs generell** mit funktionierendem Token gegen Live-API verifizieren (`/list/category`) und Kandidatenlisten in `HIGHLIGHT_CATEGORIES` straffen.
- [ ] Soll das Modul auch auf der **Projekt-Detailseite** und im **Exposé-PDF** erscheinen? (aktuell out of scope)

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Zielgruppe C: VP **und** Kunde | Plattform ist Vertrieb/Präsentation; Wert auf beiden Seiten | 2026-06-12 |
| Voll automatisch, keine Kuratierung | Sofortwert ohne Tipparbeit; einfacher Scope | 2026-06-12 |
| Nur POIs + Distanzen im MVP, Isochronen out | Isochronen teuer & nicht kaufentscheidend | 2026-06-12 |
| 5 fixe Kategorien (ÖPNV, Einkauf, Bildung, Gesundheit, Autobahn) | Vertriebsrelevanteste Typen; kein Konfig-UI | 2026-06-12 |
| Luftlinie statt Routen-Distanz | Nutzer-Entscheidung; spart zweite API-Ebene | 2026-06-12 |
| Keine Lagebewertung/Score | Vom Nutzer gestrichen | 2026-06-12 |

### Technical Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Mapbox statt Google Places | Mapbox bereits voll integriert (Geocoding, Karte); kein zweiter Vendor/Key/Billing nötig | 2026-06-12 |
| Search Box Category Search (per-request) | Liefert nächste POIs je Kategorie ohne Session-Token | 2026-06-12 |
| Mehrere Kandidaten-IDs je Kategorie, nächster Treffer gewinnt | Robust gegen unverifizierte canonical_ids | 2026-06-12 |
| Caching nach gerundeten Koordinaten + Kategorie | API-Kosten bei Re-Renders begrenzen | 2026-06-12 |

---

## Tech Design (Solution Architect)
Umgesetzt (nicht über `/architecture` formalisiert):
- `src/lib/standort-highlights.ts` — Typen, Kategorie-Config, Haversine, `formatDistance`, `fetchStandortHighlights` (+ Cache).
- `src/components/objekte/StandortHighlights.tsx` — Hook `useStandortHighlights` + Light-Komponente `StandortHighlights`; Icon-Map.
- Einbindung: `EinheitDetailView.tsx` (Karte-Tab), `PraesentationView.tsx` (`SlideLage`, Platzhalter ersetzt).
- Tests: `src/lib/standort-highlights.test.ts` (Haversine + Distanzformat, 6/6 grün).

## QA Test Results
_To be added by /qa_ — insbesondere Live-Verifikation der canonical_ids mit echtem Token (siehe Open Questions).

## Deployment
_To be added by /deploy_
