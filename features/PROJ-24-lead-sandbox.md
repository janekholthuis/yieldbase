# PROJ-24: Personalisierte Lead-Sandbox („Branded Demo-Link")

## Status: Deployed
**Created:** 2026-06-18
**Last Updated:** 2026-06-18

> **Gebaut & deployed 2026-06-18:** DB `demo_links` + `demo_link_leads` (RLS admin/support; Lead-Zugriffe via Service-Role gescopt auf den Slug), Actions `extractDemoBranding`/`createDemoLink`/`listDemoLinks`/`setDemoLinkActive`/`submitDemoLead`, Admin-UI `/demo-links` (Branding-Vorschau editierbar, Kill-Switch, Öffnungs-Tracking), öffentliche Sandbox `/fuer/[slug]` (gebrandetes Theme via `buildOrgThemeCss`, Willkommens-Screen, Musterobjekte, client-seitiger `calculate()`-Rechner, Kontakt-CTA, noindex). Smoke-Test Prod 200. **Offen:** visuelle Verifikation als eingeloggter Admin (Link erstellen → öffnen); optional Logo-Hotlink-Härtung; Rate-Limit auf Kontaktformular.

## Dependencies
- Requires: PROJ-23 (Branding-Auto-Extraktion) — Logo/Farben aus der Lead-Website ziehen
- Requires: PROJ-13 (Multi-Tenant-Theming) — `buildOrgThemeCss` rendert die Demo in den Lead-Farben
- Requires: PROJ-8/PROJ-20 (Kalkulations-Engine) — `calculate()` treibt den interaktiven Sandbox-Rechner
- Pattern: PROJ-7 (Token-Link ohne Login) — öffentliche Route `/fuer/[slug]`

## Übersicht
Akquise-Tool: Admin/Support erzeugt einen personalisierten Token-Link für einen B2B-Lead (Immobilien-Vertriebsfirma). Der Lead öffnet den Link **ohne Login** und sieht eine **interaktive, ephemere Demo-Instanz** von EMI Hub, die bereits mit **seinem Logo + seinen Markenfarben** gebrandet ist (automatisch aus seiner Website) und mit **generischen Musterobjekten** gefüllt ist. Ziel: „So sieht deine Plattform in 5 Minuten aus" → Conversion in ein Gespräch.

## User Stories
- Als **Admin/Support** möchte ich aus Firmenname + Website-URL einen gebrandeten Demo-Link erzeugen, damit ich einem Lead eine personalisierte Vorschau schicken kann.
- Als **Admin/Support** möchte ich vor dem Versenden Logo/Farben prüfen und manuell korrigieren, damit die Demo seriös aussieht, auch wenn die Extraktion nichts findet.
- Als **Admin/Support** möchte ich sehen, ob/wann/wie oft ein Lead seinen Link geöffnet hat, damit ich den richtigen Moment fürs Follow-up erwische.
- Als **Admin/Support** möchte ich einen Link jederzeit deaktivieren können (Kill-Switch), falls der Lead widerspricht oder der Link veraltet ist.
- Als **Lead (ohne Account)** möchte ich eine echte, auf mein Unternehmen gebrandete Oberfläche durchklicken und einen Rechner ausprobieren, damit ich den Wert sofort erlebe.
- Als **Lead** möchte ich mit einem Klick Kontakt aufnehmen können, damit ich unkompliziert ein Gespräch anstoßen kann.

## Out of Scope
- **Echter persistenter Demo-Mandant** pro Lead (gespeicherte Änderungen) — bewusst verworfen zugunsten der ephemeren Sandbox (keine Schreibzugriffe auf echte Daten, kein Tenant-Cleanup).
- **Echte Objekte des Leads / Scraping seines Bestands** — nur generische Musterobjekte (Datenschutz + Recht).
- **Investagon-Echtbestand** in der Demo — bewusst generische Daten.
- **Detail-Tracking** (Verweildauer, besuchte Bereiche) — nur leichtes Öffnungs-Tracking.
- **Geführte Pflicht-Tour** — Freiroam mit optionalen Highlights.
- Erstellung durch VPs (L1–L3) — nur Admin/Support.

## Acceptance Criteria
- [ ] Angenommen ein Admin gibt Firmenname + Website-URL ein und klickt „Branding laden", wenn die Website Logo/Farben hergibt, dann werden diese als editierbare Vorschau angezeigt.
- [ ] Angenommen die Extraktion findet kein Branding, wenn der Admin den Link erstellt, dann wird auf neutrales EMI-Hub-Branding zurückgefallen und der Admin kann Logo/Farben manuell setzen.
- [ ] Angenommen ein Admin erstellt einen Demo-Link, wenn die Erstellung erfolgreich ist, dann erhält er einen kopierbaren Link `/fuer/[slug]` mit 30 Tagen Gültigkeit.
- [ ] Angenommen ein Lead öffnet einen gültigen Link, wenn die Seite lädt, dann sieht er einen gebrandeten Willkommens-Screen mit seinem Logo/Farben und einem dezenten „Demo erstellt von EMI Hub"-Hinweis.
- [ ] Angenommen der Lead ist in der Sandbox, wenn er ein Musterobjekt öffnet und die Rechner-Regler bewegt, dann aktualisieren sich Cashflow/Vermögenswerte live (keine Schreibzugriffe auf echte Daten).
- [ ] Angenommen der Lead klickt den CTA, wenn er das Kontaktformular absendet, dann wird seine Anfrage gespeichert und der Ersteller benachrichtigt.
- [ ] Angenommen ein Lead öffnet den Link, wenn die Seite geladen wird, dann werden Öffnungs-Zeitpunkt und -Zähler erhöht und dem Ersteller in der Liste angezeigt.
- [ ] Angenommen ein Admin deaktiviert einen Link, wenn der Lead ihn danach öffnet, dann sieht er eine neutrale „Demo nicht verfügbar"-Seite statt der Sandbox.
- [ ] Angenommen ein Link ist älter als 30 Tage, wenn er geöffnet wird, dann ist er abgelaufen und zeigt „Demo nicht verfügbar".
- [ ] Angenommen die Demo-Seite wird aufgerufen, wenn Suchmaschinen sie crawlen, dann ist sie auf `noindex` gesetzt.

## Edge Cases
- Ungültiger/unbekannter Slug → neutrale „Demo nicht verfügbar"-Seite (kein Oracle, kein Stacktrace).
- Branding-Extraktion schlägt fehl / Timeout / SSRF-geblockt → neutraler Fallback, Erstellung trotzdem möglich.
- Logo-Re-Hosting schlägt fehl → graceful auf Hotlink/neutral zurück, kein harter Fehler.
- Lead spammt das Kontaktformular → einfache Validierung; (Rate-Limit als spätere Härtung notiert).
- Mobiler Aufruf → Sandbox muss responsiv sein (Lead öffnet oft am Handy).
- Sehr dunkle/grelle Markenfarbe → Theme bleibt lesbar (Tokens leiten weiche Töne ab).

## Technical Requirements
- Öffentliche Route `/fuer/[slug]` in `proxy.ts` `PUBLIC_PREFIXES` freigeben.
- Lead-Reads/Open-Tracking/Lead-Capture laufen serverseitig über den Service-Role-Client, strikt auf den Slug gescopt (kein client-geliefertes Vertrauen) — analog Selbstauskunft-Public.
- `demo_links`-Reads/Writes der Verwaltung: RLS `has_role(admin|support)`.
- KEINE Schreibzugriffe der Sandbox auf echte App-Daten; Rechner läuft rein client-seitig über die pure `calculate()`-Engine.
- Branding hell/seriös/kantig konsistent zur App.

## Open Questions
- [ ] **Rechtlich (UWG/Markenrecht):** Nutzung fremder Logos/Farben für eine personalisierte Demo vor dem breiten Live-Einsatz anwaltlich prüfen. Mitigation umgesetzt: nur öffentlich verfügbares Branding, klarer „Demo erstellt von EMI Hub"-Hinweis (kein Endorsement suggeriert), Kill-Switch, kein fremder Objektbestand.
- [ ] Rate-Limit auf das öffentliche Kontaktformular (spätere Härtung).

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Interaktive Sandbox statt statischer Landing/Deck | Maximaler Wow-Effekt — der Lead erlebt die echte App | 2026-06-18 |
| Generische Musterobjekte statt Lead-Echtdaten | Datenschutz + rechtlich am unkompliziertesten | 2026-06-18 |
| Ephemer, keine echten Schreibzugriffe, 30 Tage + Kill-Switch | Sicherheit, kein Tenant-Cleanup, immer gepflegter Demo-Bestand | 2026-06-18 |
| Nur Admin/Support dürfen Links erzeugen | Akquise-Werkzeug der Betreiberebene, kein Wildwuchs | 2026-06-18 |
| Branding-Fallback: neutral + manuell überschreibbar | Link nie kaputt, auch wenn Website nichts hergibt | 2026-06-18 |
| Leichtes Öffnungs-Tracking (ob/wann/wie oft) | Guter Follow-up-Trigger bei minimalem Datenschutz-Fußabdruck | 2026-06-18 |

### Technical Decisions
_To be added by /architecture_

---

## Tech Design (Solution Architect)
_To be added by /architecture_

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
