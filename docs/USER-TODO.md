# 🔑 Objektpilot — Offene Aufgaben

> Nur noch offene Punkte (erledigte entfernt). Live: https://objelt-pilot.vercel.app

## 🔒 Sicherheit — bald erledigen
- [ ] `SUPABASE_SERVICE_ROLE_KEY` **rotieren** (stand evtl. in der Lovable-`.env`)
- [ ] `INVESTAGON_API_KEY` **rotieren** (war im Chat sichtbar; liegt jetzt auch an der „Erfolg mit Immobilien"-Org in der DB → danach dort aktualisieren)
- [ ] MCP-Token (`sbp_...` in `.mcp.json`) **rotieren** (war im Chat sichtbar)

## 🟡 Optional / später
- [ ] Eigene Domain verbinden (statt `objelt-pilot.vercel.app`)
- [ ] Auth-Email-Templates anpassen (Vorlagen: `OLD APP/docs/email-templates/`)
- [ ] RLS-Policies gegen das cookie-basierte `@supabase/ssr`-Auth gegenprüfen
- [ ] Struktur-Gaps entscheiden ([STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)): Projektentwickler-Tabelle? Datenraum-Tabelle?

## 🛠️ Claude baut auf Anfrage (kein User-Input nötig)
- [x] **Provisionen**-Modul (% vom Kaufpreis entlang VP-Hierarchie) — PROJ-9, deployed 2026-06-12 (Modell: nur abschließender VP)
- [x] **Team**-Modul (Hierarchie, Sub-VP-Einladung, Provisionssätze verwalten) — PROJ-9, deployed 2026-06-12
- [ ] **Multi-Tenant 13.2** — echte Daten-Trennung pro Organisation (RLS-Umbau) · _13.2a/13.2b committed — Abschluss/Verifikation offen_

## ⚙️ Nach dem Provisionen-Deploy (2026-06-12)
- [ ] **`NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel** setzen (Settings → Environment Variables), sonst bleibt die Karte in Production leer
- [ ] Prod-Deploy verifizieren: `/provisionen` + `/team` auf objelt-pilot.vercel.app

## ℹ️ Offene Frage (Investagon)
Die Investagon-API liefert **keine** echten Preise/Flächen/Mieten → aktuell **synthetische Sample-Werte**. Falls es einen erweiterten API-Zugang mit diesen Feldern gibt: Bescheid geben, dann erweitere ich das Mapping (Rohdaten liegen in `raw`).
