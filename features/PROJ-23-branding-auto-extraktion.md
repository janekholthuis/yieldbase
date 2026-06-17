# PROJ-23: Branding-Auto-Extraktion aus Website-URL

## Status: Planned
**Created:** 2026-06-17
**Last Updated:** 2026-06-17

## Summary
Beim Onboarding einer Organisation (und jederzeit später im Branding-Bereich der
Einstellungen) gibt ein Admin eine Website-URL ein. Das System ruft die Seite ab
und extrahiert automatisch das Branding — **Logo**, **Primärfarbe**,
**Akzentfarbe** — und schlägt diese als Vorschau vor. Der Nutzer kann die Werte
prüfen/anpassen und übernimmt sie dann ins Org-Branding (`organisationen.logo_url`,
`primary_color`, `accent_color`), das die App über `src/lib/branding.ts` live als
Theme rendert.

Ziel: Eine neue Vertriebsorganisation ist in Sekunden „in ihren Farben", ohne dass
jemand Hex-Codes heraussuchen oder ein Logo manuell hochladen muss.

## Dependencies
- Requires: **PROJ-13** (Multi-Tenant Organisationen mit Branding) — liefert die
  Felder `logo_url`/`primary_color`/`accent_color`, den Org-Switcher und das
  Theming (`buildOrgThemeCss`).
- Requires: **PROJ-1** (Auth/Rollen) — nur `admin`/`support` (bzw. Org-Owner)
  dürfen Branding setzen.

## User Stories
- Als **Admin/Org-Owner** möchte ich beim Anlegen meiner Organisation nur meine
  Website-URL eingeben, damit Logo und Farben automatisch gesetzt werden und ich
  mich nicht mit Hex-Codes beschäftigen muss.
- Als **Admin** möchte ich die automatisch erkannten Werte in einer **Vorschau**
  sehen und einzeln korrigieren können, bevor sie gespeichert werden, damit ein
  Fehlgriff der Erkennung nicht ungefragt mein Branding überschreibt.
- Als **Support** möchte ich den „Aus Website übernehmen"-Button auch später im
  Branding-Bereich der Einstellungen nutzen, damit ich das Branding einer
  bestehenden Org aktualisieren kann, ohne PROJ-13-Felder von Hand zu pflegen.
- Als **Admin** möchte ich bei einer nicht erreichbaren oder unbrauchbaren URL
  eine klare Meldung bekommen und trotzdem manuell weitermachen können, damit der
  Onboarding-Flow nie blockiert ist.
- Als **Vertriebspartner/Kunde** möchte ich, dass das übernommene Branding sofort
  in der ganzen App und in Exposé/Präsentation/Reservierungs-PDF erscheint, damit
  der Auftritt durchgängig konsistent ist.

## Out of Scope
- **Schriftart-/Webfont-Erkennung** — bewusst ausgeschlossen; es gibt aktuell
  keine Font-Theming-Infrastruktur (nur Farben + Logo werden vom Theme genutzt).
  Kandidat für ein späteres Feature.
- **Vollständiges Logo-Redesign / Freisteller / Hintergrund-Entfernung** — es wird
  das vorgefundene Logo (Favicon/`og:image`/`<img>`-Logo) übernommen, keine
  Bildbearbeitung.
- **Dunkelmodus-spezifische Logovarianten** (helles vs. dunkles Logo) — nur ein
  Logo wird übernommen.
- **Mehrseitiges Crawling** — es wird nur die angegebene URL (eine Seite + deren
  direkt referenzierte Assets) ausgewertet, kein Folgen von Unterseiten.
- **Periodische Re-Synchronisierung** des Brandings bei Website-Änderungen — die
  Extraktion ist immer manuell ausgelöst.
- **Markenrechts-/Genehmigungsprüfung** — die Org ist selbst verantwortlich, dass
  sie das Logo verwenden darf.
- Änderungen an der bestehenden manuellen Branding-Pflege (Color-Picker, Logo-
  Upload) — bleibt wie in PROJ-13, dieses Feature ergänzt nur einen zusätzlichen
  Befüllweg.

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Admin legt eine neue Organisation an, wenn er eine gültige
  Website-URL eingibt und „Branding übernehmen" auslöst, dann werden Logo,
  Primär- und Akzentfarbe erkannt und in einer Vorschau angezeigt.
- [ ] Angenommen die Extraktions-Vorschau wird angezeigt, wenn der Nutzer eine
  vorgeschlagene Farbe oder das Logo ändert/entfernt und „Speichern" klickt, dann
  werden genau die in der Vorschau sichtbaren (ggf. korrigierten) Werte ins
  Org-Branding gespeichert.
- [ ] Angenommen Branding-Werte wurden gespeichert, wenn der Nutzer die App neu
  lädt, dann erscheinen Logo und Farben sofort in Sidebar, Topbar und in den
  generierten PDFs (Exposé/Präsentation/Reservierung).
- [ ] Angenommen der Nutzer gibt eine URL ohne Schema ein (z. B. `meinefirma.de`),
  wenn er die Extraktion startet, dann wird die URL normalisiert (https://
  ergänzt) und trotzdem ausgewertet.
- [ ] Angenommen die eingegebene URL ist unerreichbar oder kein HTML, wenn die
  Extraktion läuft, dann wird eine verständliche Fehlermeldung gezeigt und der
  Nutzer kann das Branding manuell eingeben (kein Blockieren des Onboardings).
- [ ] Angenommen es kann nur ein Teil erkannt werden (z. B. Logo ja, Akzentfarbe
  nein), wenn die Vorschau erscheint, dann sind die erkannten Felder vorbefüllt
  und die nicht erkannten leer/auf Default, klar als „nicht erkannt" markiert.
- [ ] Angenommen ein Nutzer ohne Admin-/Support-Rolle ruft die Extraktions-Aktion
  auf, wenn die Server-Action ausgeführt wird, dann wird sie mit einem
  Berechtigungsfehler abgelehnt (keine Branding-Änderung).
- [ ] Angenommen ein bestehendes Org-Branding existiert, wenn der Nutzer im
  Einstellungen-Bereich „Aus Website übernehmen" nutzt, dann werden die
  bisherigen Werte erst nach expliziter Bestätigung in der Vorschau überschrieben.

## Edge Cases
- **URL ohne Schema / mit `www` / mit Pfad** → normalisieren (https voranstellen,
  Pfad erlauben).
- **Redirects (http→https, Apex→www)** → folgen (begrenzte Anzahl), Endseite
  auswerten.
- **Logo nur als SVG / Favicon / `og:image` / inline-Data-URI** → bestmögliche
  Quelle wählen (Priorität: explizites Logo-`<img>` > `og:image` > apple-touch-icon
  > Favicon); SVG/PNG bevorzugen.
- **Sehr große Bilder / langsame Seiten** → Timeout + Größenlimit, danach
  Teilergebnis + Hinweis.
- **Keine klar dominante Markenfarbe** (z. B. viele Grautöne) → bestmögliche
  Heuristik (z. B. häufigste gesättigte Farbe = Primär, zweite = Akzent),
  Ergebnis ist in der Vorschau editierbar.
- **Farben nur als CSS-Variablen / in externem Stylesheet** → so weit möglich
  auswerten; sonst „nicht erkannt".
- **JS-only / Single-Page-App ohne SSR-Markup** → evtl. nur Favicon/Meta
  verfügbar; Teilergebnis liefern statt Fehler.
- **Nicht-Bild-Antwort / 404 / Login-Wall / Zertifikatsfehler** → klarer Fehler,
  manueller Fallback.
- **SSRF-Schutz:** interne/loopback/Metadata-Adressen (z. B. `localhost`,
  `169.254.169.254`, RFC-1918) müssen serverseitig abgelehnt werden.
- **Doppelte Übernahme / paralleles Bearbeiten** der Org → letzte bestätigte
  Speicherung gewinnt; keine stille Hintergrund-Überschreibung.

## Technical Requirements (optional)
- Extraktion läuft **serverseitig** (Server Action / Route Handler), nicht im
  Browser (CORS + SSRF-Kontrolle + Secret-Handling).
- **Sicherheit:** Authentifizierung + Rollen-Gate (`admin`/`support`/Org-Owner);
  SSRF-Allowlist/Denylist für Ziel-Hosts; Timeout & Antwort-Größenlimit.
- Logo wird in den bestehenden Branding-Storage-Bucket geladen und als
  `logo_url` referenziert (gleiche Ablage wie der manuelle Upload aus PROJ-13).
- Farben werden als `#RRGGBB` normalisiert (kompatibel zu `parseHex` in
  `src/lib/branding.ts`).
- Erkennungs-Dauer als „gefühlt schnell" (Spinner/Progress); harte Obergrenze per
  Timeout, danach Teilergebnis.

## Open Questions
- [x] ~~Erkennungs-Engine~~ → **entschieden (2026-06-17): eigene server-side
  Heuristik, kein LLM** (siehe Tech Design / Technical Decisions).
- [x] ~~Speicherort des Logos~~ → **bestehender PROJ-13-Branding-Bucket** über
  `updateOrgBranding`. Detail offen: erlaubte Formate/Max-Größe (Build-Detail).
- [ ] Genaues Akzentfarben-Verhalten: nur Primär+Akzent vorbefüllen (Vorschau
  editierbar) — reicht das, oder eine kleine vorgeschlagene Palette zur Auswahl?
  (Architektur-Default: genau 2, editierbar.)
- [ ] Logo-Hintergrund (hell/dunkel/Transparenz) automatisch erkennen für besseren
  Kontrast — oder Rohlogo übernehmen? (Build-Detail, kann später folgen.)
- [ ] Erlaubte Logo-Formate (SVG zulassen?) + Max-Dateigröße beim Download.

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| Trigger sowohl beim Onboarding als auch als Button im Branding-Bereich der Einstellungen | Onboarding ist der Haupt-Nutzen, aber Orgs ändern ihr CI auch später / wurden ohne URL angelegt | 2026-06-17 |
| Umfang = Logo + Primär- + Akzentfarbe (keine Schrift) | Genau diese 3 Felder nutzt das Theme heute (`branding.ts`); Font-Theming fehlt komplett → eigener, größerer Scope | 2026-06-17 |
| Ergebnis als Vorschau mit Bestätigen/Editieren statt direktem Anwenden | Auto-Erkennung ist fehleranfällig; stilles Überschreiben des Brandings wäre riskant/irritierend | 2026-06-17 |
| Extraktion nie blockierend — manueller Fallback immer möglich | Onboarding darf nicht an einer schlecht erkennbaren Website scheitern | 2026-06-17 |
| Nur die angegebene Seite auswerten (kein Crawling) | Einfach, schnell, vorhersehbar; reicht für Logo + CI-Farben | 2026-06-17 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Erkennung als eigene server-side Heuristik (kein LLM) | Kein API-Key/Kosten/Datenabfluss, kein Headless-Browser auf Vercel; „Vorschau+editieren" fängt Ungenauigkeit ab | 2026-06-17 |
| Erkennung serverseitig (Server Action), nicht im Browser | CORS umgehen + SSRF-/Timeout-/Größen-Kontrolle | 2026-06-17 |
| Keine Schema-Änderung — vorhandene Felder `logo_url`/`primary_color`/`accent_color` befüllen | PROJ-13 liefert bereits Felder, Theming (`branding.ts`) und Speicherweg | 2026-06-17 |
| Speichern über bestehenden `updateOrgBranding` + Branding-Bucket | Ein einziger, getesteter Write-Pfad für Branding | 2026-06-17 |
| Logo-Priorität: `<img>`-Logo › og:image › apple-touch-icon › Manifest › Favicon | Liefert i. d. R. das schärfste echte Marken-Logo statt eines 16px-Favicons | 2026-06-17 |
| `node-html-parser` + `node-vibrant` als Engine-Bausteine | Leichtgewichtig, server-tauglich, etabliert; keine schweren Dienste | 2026-06-17 |
| Erkennungsergebnis flüchtig (erst auf Bestätigung gespeichert) | Verhindert stilles Überschreiben des bestehenden Brandings | 2026-06-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

**Architektur-Kurzfassung:** Ein wiederverwendbarer „Branding-aus-Website"-Dialog
ruft eine **serverseitige** Erkennung auf (Heuristik, kein LLM), zeigt das
Ergebnis als editierbare Vorschau und speichert erst auf Bestätigung über den
**bestehenden** PROJ-13-Branding-Speicherweg. Keine Schema-Änderung.

### A) Komponenten-Struktur
```
BrandingExtractDialog  (neu, gemeinsam genutzt)
├── URL-Eingabe + „Erkennen"-Button
├── Lade-/Fortschritts-Zustand (Spinner, „Website wird ausgelesen …")
├── Vorschau
│   ├── Logo-Vorschau (erkanntes Logo, „nicht erkannt"-Hinweis, entfernen/ersetzen)
│   ├── Primärfarbe  (Farb-Swatch + Color-Picker, editierbar)
│   ├── Akzentfarbe  (Farb-Swatch + Color-Picker, editierbar)
│   └── Fehler-/Teilergebnis-Hinweis
└── Aktionen: „Übernehmen" (speichert) · „Abbrechen"

Einbindung:
├── Onboarding / „Organisation anlegen" → URL-Feld + Button öffnet Dialog
└── Einstellungen → Branding-Bereich → „Aus Website übernehmen"-Button öffnet Dialog
```
Die Vorschau nutzt vorhandene UI-Primitive (Dialog, Input, Button) und denselben
Color-Picker/Logo-Upload wie die bestehende manuelle Branding-Pflege (PROJ-13).

### B) Datenfluss / Backend
Zwei Server-Actions, beide rollen-gegated (admin/support/Org-Owner, gleicher Guard
wie die übrige Org-Verwaltung):

1. **Erkennen** (`extractBrandingFromUrl`) — ändert NICHTS, liefert nur Vorschlag:
   - URL normalisieren (https ergänzen), Host validieren, **SSRF-Schutz**
     (interne/loopback/Metadaten-/RFC-1918-Adressen ablehnen).
   - HTML serverseitig laden (Timeout, Größenlimit, begrenzte Redirects).
   - Logo-Kandidaten sammeln & priorisieren: explizites Logo-`<img>` (alt/Name
     enthält „logo") › `og:image` › `apple-touch-icon` › Manifest-Icon › Favicon.
   - Farben ableiten: `<meta name="theme-color">` falls vorhanden; sonst
     dominante/akzentuierte Farben aus Logo bzw. `og:image` (Vibrant-Palette).
     Primär = theme-color/dominant, Akzent = kräftigste Sekundärfarbe.
   - Rückgabe: `{ logoCandidateUrl, primaryHex, accentHex, detected: {logo,primary,accent} }`.
2. **Übernehmen** (Wiederverwendung des PROJ-13-Speicherwegs): gewähltes Logo in
   den bestehenden Branding-Bucket laden → `logo_url`; bestätigte Hex-Farben über
   die vorhandene `updateOrgBranding`-Action in `primary_color`/`accent_color`.

### C) Datenmodell
- **Keine** neue Tabelle/Spalte. Es werden ausschließlich die existierenden Felder
  `organisationen.logo_url` / `primary_color` / `accent_color` befüllt.
- Das Erkennungsergebnis ist **flüchtig** (lebt nur im Dialog bis zur Bestätigung).
- Optional (nice-to-have): Quell-URL in `organisationen.settings` (jsonb) ablegen,
  damit man später „erneut aus Website" anbieten kann — nicht MVP-kritisch.
- Farben werden als `#RRGGBB` normalisiert (kompatibel zu `parseHex` in
  `src/lib/branding.ts`, das daraus das Live-Theme baut).

### D) Tech-Entscheidungen (warum so)
- **Serverseitige Erkennung** statt im Browser: umgeht CORS, erlaubt SSRF-Kontrolle
  und Größen-/Timeout-Limits.
- **Heuristik statt LLM**: kein neuer API-Key, keine Pro-Onboarding-Kosten, keine
  Seitendaten an Dritte, kein Headless-Browser auf Vercel. Die „Vorschau +
  editieren"-UX fängt Erkennungsfehler ab, daher reicht „gut genug".
- **Wiederverwendung des PROJ-13-Speicherwegs** (Bucket + `updateOrgBranding`)
  statt eigener Logo-Ablage — ein einziger Pfad für Branding-Writes.
- **Nie blockierend**: Bei Fehler/Teilergebnis bleibt die manuelle Eingabe offen.

### E) Abhängigkeiten (zu installieren)
- `node-html-parser` (oder `cheerio`) — HTML nach Logo-/Meta-Tags durchsuchen.
- `node-vibrant` — dominante/akzentuierte Farben aus Logo/`og:image` ziehen
  (bringt Bilddekodierung mit; ggf. `sharp` als Peer für den Node-Server-Pfad).
- Kein neues Auth-/LLM-Paket.

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
