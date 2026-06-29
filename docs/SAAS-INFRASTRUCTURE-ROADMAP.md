# SaaS-Infrastruktur-Roadmap

> Aufbau von „App" zu professionellem, verkaufbarem SaaS. Strategie: **als Custom-Plattform verkaufen** (höherer Preis), aber technisch **eine** konfigurierbare Engine — „custom" ist immer Daten/Konfiguration, **nie** geforkter Code pro Kunde.
> Firma: **Enablence Ltd. (Zypern)**. Zielmarkt: **DACH**. Stand: 2026-06-28.

## Leitprinzipien

1. **Config statt Code-Fork.** Kein `if (org === "x")`. Unterschiede pro Kunde = Zeilen in der DB.
2. **Entitlements zentral in der App, Billing außerhalb.** Du schaltest Features pro Org manuell frei; Rechnung läuft separat.
3. **Server-seitig erzwingen.** Feature-Gates in Server-Actions/RLS, nicht nur in der UI.

---

## Entscheidungen (2026-06-28)

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Umfang | Alles Buildbare umsetzen; Kern zuerst |
| 2 | Billing | **Manuell via Easybill** (Enablence Ltd., Zypern) bis 2–3 Kunden. **Kein** In-App-Billing, kein Stripe, keine Preise-Seite. |
| 3 | Observability | **Umsetzen** (Sentry + Uptime + PostHog) |
| 4 | Marketing | **Nur Landing Page jetzt**, restlicher Funnel → Roadmap |
| 5 | Design | Landing Page im **Porsche-Theme** (PROJ-25 Design-System) |
| 6 | Recht | Impressum von Enablence übernehmen; Rechts-Layer für **Zypern-Ltd. + DACH** neu bewertet (s. u.) |

---

## Arbeitspakete

### PROJ-31 — Org-Entitlements (Feature-Freischaltung pro Kunde) — **In Progress**
Der strategische Kern. Macht aus der App eine pro-Kunde-konfigurierbare „Custom"-Plattform.
- **DB:** `organisationen.entitlements jsonb` (additiv, non-breaking). Override-Map über sinnvolle Defaults.
- **Code:** `src/lib/entitlements.ts` — Katalog (Key, Label, Default) + `hasEntitlement()`-Helper.
- **Navigation:** `requiresFeature` auf `NavItem`; `visibleNav(roles, entitlements)` filtert.
- **Enforcement:** Gate in Server-Actions der gated Features (nicht nur Nav).
- **Admin-UI:** Schalter pro Org (admin/support) — du schaltest manuell frei, was vertraglich vereinbart ist.
- **Status:** Fundament (Katalog + Helper + Nav-Erweiterung + Migration) gebaut. Offen: Admin-UI + per-Action-Enforcement + Wiring aller Nav-Flächen.

### PROJ-32 — Custom-Integrationen (Webhooks + API-Keys) — Roadmap
„Custom"-Integrationen pro Kunde ohne Kern-Code-Änderung.
- Webhooks raus (Events `reservierung.created`, `kunde.qualifiziert`, `selbstauskunft.eingereicht`, `case.angebot`) → pro Org konfigurierte URL, HMAC-signiert → **n8n/Make** baut die eigentliche Anbindung.
- Eingehende API: `/api/v1/...` + Org-API-Keys (wiederverwendet bestehende Server-Actions).
- Hängt hinter Entitlement `integrationen`.

### PROJ-33 — Observability — **vom Nutzer vertagt (2026-06-28), braucht Accounts**
> Nutzer: „Sentry-Plan festhalten, kümmere ich mich später drum." Plan bleibt wie unten; Umsetzung erfolgt, sobald Sentry-DSN + PostHog-Key vorliegen.
- **Sentry** (Error-Tracking, Next.js + Supabase) — DSN nötig.
- **Uptime** (UptimeRobot/Better Stack) auf `/login`, Dashboard, kritische Routen.
- **PostHog** (Product-Analytics + Session-Replay + Feature-Flags, DSGVO-freundlich) — Key nötig.
- SDKs lesen aus Env; gehen live, sobald die Keys in Vercel gesetzt sind.

### PROJ-34 — Marketing-Site — **Landing jetzt, Rest Roadmap**
- **Jetzt:** Landing Page (`/start`) im Porsche-Theme; Impressum + Datenschutz-Seiten.
- **Roadmap:** Feature-Seiten, Demo-Buchung (Cal.com), Blog/SEO (MDX), Lifecycle-Mails (Loops.so), eigenes Vertriebs-CRM (Close/HubSpot via vorhandenem MCP), Reporting.

### Compliance-Track (DACH) — **teils Nutzer-Aktion**
Siehe Rechts-Bewertung unten.

---

## Rechts-Bewertung: Zypern-Ltd. mit DACH-Zielmarkt

Recherche-Befund (e-recht24, it-recht-kanzlei, IHK): Das **Herkunftslandprinzip greift NICHT**, sobald ein Anbieter den deutschen Markt **gezielt bewirbt/bedient**. Damit gilt:

- **Impressum nach § 5 DDG** (löste § 5 TMG ab, Mai 2024) — deutschsprachig, leicht auffindbar. Verstoß: Bußgeld bis 50.000 € + Abmahnrisiko. → Inhalt von Enablence übernehmen (Firmenname, Zypern-Anschrift, Vertretungsberechtigte, Register-Nr., USt-ID, Kontakt).
- **DSGVO** gilt EU-weit ohnehin (Verarbeitung personenbezogener Daten: Bonität, Finanzdaten, PII) → **Datenschutzerklärung** Pflicht.
- **AVV/DPA:** Du bist **Auftragsverarbeiter** für deine Kunden-Orgs → du musst Kunden einen AVV anbieten (inkl. **TOM**-Anlage: RLS, Verschlüsselung, Backups — vieles vorhanden, nur zu dokumentieren — und **Sub-Prozessoren-Liste**: Supabase, Vercel, Resend, OpenAI, Easybill).
- ⚠️ **OpenAI:** EU-Datenverarbeitung / AVV prüfen, da Kundendaten in Prompts fließen.
- **Hinweis:** Finale Rechtstexte (Impressum-Vollständigkeit, AVV, Steuer/USt zwischen Zypern-Ltd. und DACH-Kunden) gehören vor Verkaufsstart anwaltlich/steuerlich geprüft — die App-Bausteine (Impressum-/Datenschutz-Seite) baue ich, die Texte liefert/freigibt der Nutzer.

---

## Empfohlene Reihenfolge

1. **PROJ-31 Entitlements** (Kern, baut gerade) — macht das Produkt verkaufbar als Custom-Plattform.
2. **Impressum + Datenschutz-Seite** (sobald Enablence-Quelle da) — Verkaufs-Blocker.
3. **PROJ-33 Observability** (sobald Sentry/PostHog-Accounts da) — du hattest Prod-Incidents.
4. **PROJ-34 Landing Porsche** — sobald verkaufbar.
5. **PROJ-32 Integrationen** + restlicher Marketing-Funnel — laufend.

## Offene Nutzer-Aktionen
- [ ] Enablence-Impressum: URL/Text liefern (für Übernahme in die App).
- [ ] Sentry-Account + DSN, PostHog-Account + Key (für PROJ-33).
- [ ] Anwaltliche/steuerliche Freigabe der Rechtstexte (AVV, Impressum-Vollständigkeit, USt Zypern↔DACH).
- [ ] Easybill für laufende Fakturierung (manuell, außerhalb der App).
