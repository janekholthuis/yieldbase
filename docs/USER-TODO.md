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
- [ ] **Provisionen**-Modul (% vom Kaufpreis entlang VP-Hierarchie)
- [ ] **Team**-Modul (Hierarchie, Sub-VP-Einladung, Provisionssätze verwalten)
- [ ] **Multi-Tenant 13.2** — echte Daten-Trennung pro Organisation (RLS-Umbau) · _in Arbeit_

## ℹ️ Offene Frage (Investagon)
Die Investagon-API liefert **keine** echten Preise/Flächen/Mieten → aktuell **synthetische Sample-Werte**. Falls es einen erweiterten API-Zugang mit diesen Feldern gibt: Bescheid geben, dann erweitere ich das Mapping (Rohdaten liegen in `raw`).
