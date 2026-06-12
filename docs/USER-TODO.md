# 🔑 Objektpilot — Offene Aufgaben

> Live: **https://objekt-pilot.vercel.app** (Vercel, deployt von `main`)

## 🎯 V1-Scope (Stand 2026-06-12)
**V1 aktiv:** Objekte (inkl. Kalkulation, Bilder, Dokumente, Karte), Kunden,
Reservierungen (inkl. Mailing), **Mein Team** (VP anlegen & verwalten), Profil.

**In V1 NICHT gebraucht** — im Front-End ausgegraut/gegated, Code bleibt erhalten:
- **Provisionen** (Nav „Bald", Seite soft-gated)
- **Finanzierungen** (Nav „Bald", Seite + Case-Detail soft-gated)
- **KI-Features** (z. B. KI-Standort-Modul in der Objekt-Karte → „Bald")

Reaktivierung später: Wiring liegt als Kommentar in den jeweiligen Page-Dateien.

## 🛠️ V1 — offene Bauarbeiten (Claude, kein User-Input nötig)
- [x] **`/profil`** ausgebaut: persönliche Daten + Adresse + persönl. Steuersatz, Passwort ändern, Abmelden (2026-06-12)
- [ ] **V1-Kernflows QA + INDEX-Status angleichen** (Objekte/Kunden/Reservierungen/Team) — viele stehen in INDEX noch auf „In Progress", sind aber live
- [x] **Einladungs-Mail** gebaut: `send-invite-email` Edge-Function + Versand in `createInvite` + Accept-Link-Fallback in TeamView (2026-06-12)
- [ ] **Resend für echten Versand konfigurieren** (deine Seite): eigene Domain in Resend verifizieren + `RESERVATION_FROM_EMAIL`/`INVITE_FROM_EMAIL` als Supabase-Edge-Secrets setzen — sonst liefert `onboarding@resend.dev` nur an den Resend-Account-Owner

## 🟡 Optional / später
- [ ] Eigene Domain verbinden (statt `objekt-pilot.vercel.app`)
- [ ] Auth-Email-Templates anpassen (Vorlagen: `OLD APP/docs/email-templates/`)
- [ ] RLS-Policies gegen das cookie-basierte `@supabase/ssr`-Auth gegenprüfen
- [ ] Struktur-Gaps entscheiden ([STRUCTURE-AUDIT.md](STRUCTURE-AUDIT.md)): Projektentwickler-Tabelle? Datenraum-Tabelle?
- [ ] Reaktivierung Provisionen/Finanzierungen/KI (V2)

## ✅ Erledigt (2026-06-12)
- [x] Sicherheit: `SUPABASE_SERVICE_ROLE_KEY`, `INVESTAGON_API_KEY`, MCP-Token **rotiert**
- [x] `NEXT_PUBLIC_MAPBOX_TOKEN` in Vercel gesetzt → Karte in PROD funktioniert
- [x] **Provisionen** + **Team** (PROJ-9) gebaut, deployed (Modell: nur abschließender VP)
- [x] **Multi-Tenant 13.2** abgeschlossen (Org-Isolation auf allen scoped Tabellen + App-Layer-Filter)
- [x] **Mapbox** v5→v6-Geocoding migriert
- [x] **V1-Scoping** (Provisionen/Finanzierungen/KI ausgegraut + gegated)

## ℹ️ Offene Frage (Investagon)
Die Investagon-API liefert **keine** echten Preise/Flächen/Mieten → aktuell **synthetische Sample-Werte**. Falls es einen erweiterten API-Zugang mit diesen Feldern gibt: Bescheid geben, dann erweitere ich das Mapping (Rohdaten liegen in `raw`).
