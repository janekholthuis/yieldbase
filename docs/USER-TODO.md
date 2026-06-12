# 🔑 Objektpilot — Deine offenen Aufgaben

> Dinge, die **nur du** erledigen kannst (Secrets, externe Accounts, Dashboard-Schritte). Sortiert nach Priorität. Abgehakt = fertig.
> Live: https://objelt-pilot.vercel.app · Details: [MIGRATION.md](MIGRATION.md) · [INVESTAGON-PLAN.md](INVESTAGON-PLAN.md) · [STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)

---

## 🔴 Kritisch — damit die App voll funktioniert

- [ ] **Reservierungs-Emails aktivieren:**
  - `RESEND_API_KEY` als Supabase-Secret: `supabase secrets set RESEND_API_KEY=...` (Key von https://resend.com)
  - Edge Functions deployen: `supabase functions deploy reservierungen-cron send-reservation-email seed-demo-users reset-demo-passwords`
  - Cron für `reservierungen-cron` einrichten (Supabase → Database → Cron, täglich)

## 🟣 Investagon-Sync aktivieren (Code fertig, siehe [INVESTAGON-PLAN.md](INVESTAGON-PLAN.md))

- [x] **Migration angewendet** (`investagon_sync`) — Spalten `investagon_id`/`raw` + Tabelle `investagon_sync_log` sind live in der DB
- [x] **Typen neu generiert** (`src/lib/supabase/types.ts`) + `as never`-Casts in `investagon.ts` entfernt
- [x] **Env-Vars** gesetzt (Vercel + `.env.local`) — API getestet: **funktioniert** (222 Projekte abrufbar)
- [x] **Mapping geprüft** (echte API-Antwort) + **Bug gefixt** (`project` kommt als Objekt, nicht als IRI-String → Einheiten wären sonst alle übersprungen worden)
- [ ] **Sync auslösen:** `syncInvestagon()` (admin-only) — Ergebnis in `investagon_sync_log`. ⚠️ Erst die 2 Punkte unten klären/umbauen.

> **⚠️ Erkenntnisse aus dem API-Test:**
> 1. **Die Investagon-API liefert KEINE Finanz-/Flächendaten.** Properties enthalten nur Adresse (Land/PLZ/Stadt/Straße inkl. Hausnr., Wohnungsnummer), `statusName`, Makler, Provisions-Flags — **kein Kaufpreis, keine Wohnfläche, keine Zimmer, keine Miete** (auch nicht im Einzel-Endpoint). Nach dem Sync sind in `einheiten` nur `wohnungsnummer`, `status`, `adresse` (am Projekt) + `raw` gefüllt; Preis/Fläche/Miete bleiben leer. **Klären: erweiterter Investagon-API-Zugang mit diesen Feldern?**
> 2. **`api_properties` (ungefiltert) ist sehr langsam** (>40 s, ignoriert `itemsPerPage`) → ein Voll-Sync läuft so in den **Vercel-Serverless-Timeout**. Empfehlung: Properties **pro Projekt** abrufen (Filter `project=<id>` lieferte 76 Einheiten sofort) oder als Hintergrund-Job. → vor dem Live-Voll-Sync umzubauen.

## 🔒 Sicherheit — bald erledigen

- [ ] `SUPABASE_SERVICE_ROLE_KEY` **rotieren** (stand evtl. in der Lovable-`.env`)
- [ ] `INVESTAGON_API_KEY` **rotieren** (war im Chat sichtbar)
- [ ] MCP-Token (`sbp_...` in `.mcp.json`) **rotieren** (war im Chat sichtbar)

## 🟡 Optional / später

- [ ] Eigene Domain verbinden (statt `objelt-pilot.vercel.app`)
- [ ] Auth-Email-Templates anpassen (Vorlagen: `OLD APP/docs/email-templates/`)
- [ ] RLS-Policies gegen das neue cookie-basierte `@supabase/ssr`-Auth gegenprüfen (User-Sessions statt Bearer-Header)
- [ ] Struktur-Gaps entscheiden ([STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)): Projektentwickler-Tabelle? Datenraum-Tabelle?

---

## ✅ Bereits erledigt

- [x] `SUPABASE_SERVICE_ROLE_KEY` in Vercel gesetzt
- [x] `NEXT_PUBLIC_MAPBOX_TOKEN` gesetzt
- [x] `NEXT_PUBLIC_SITE_URL` in Vercel gesetzt
- [x] Vercel Deployment Protection deaktiviert (Seite öffentlich)
- [x] App live deployed + bei jedem Push aktualisiert
- [x] Supabase Auth-URLs gesetzt (Site URL + Redirect URLs)
- [x] Test-User mit Rollen angelegt

> 💡 Nach dem Setzen neuer Env-Vars in Vercel ist ein **Redeploy** nötig (Env-Vars greifen nicht rückwirkend).

---

## 🛠️ Backlog — Claude baut auf Anfrage (kein User-Input nötig, nur Zeit)

Backend-Actions stehen meist schon; es fehlt v. a. die UI:

- [ ] **Reservierungs-Erstellung**: Modal + Signatur-Pad + Reservierungs-/Exposé-PDF (`signature_pad` + `@react-pdf/renderer` installiert)
- [ ] **Dokumenten-Upload** (Kunden-Dokumente, Objekt-Bilder/-Dokumente) — aktuell read-only/Platzhalter
- [ ] **Exposé-PDF** + **Präsentations-Modus** (`/objekte/[id]/praesentation`)
- [ ] **Finanzierer-Pool-UI** im Objekt-Detail (Backend existiert)
- [ ] Module **Provisionen / Team / Tickets** (noch Stubs)
