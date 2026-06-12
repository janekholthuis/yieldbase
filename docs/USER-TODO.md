# 🔑 Dinge, die DU erledigen musst (Objektpilot)

> Claude baut autonom weiter und kann diese Dinge nicht selbst tun (Secrets, externe Accounts, manuelle Dashboard-Schritte). Abgearbeitet? Haken setzen.

## Secrets / Env-Variablen

- [x] **`SUPABASE_SERVICE_ROLE_KEY`** in Vercel gesetzt ✅ (ggf. auch lokal in `.env.local` für `npm run dev`).
  - Wird gebraucht für: Einladungen, Kunden-Portal-Aktivierung, Reservierungen, Demo-Seed — alle Server-Actions mit Admin-Client.
- [x] **`NEXT_PUBLIC_MAPBOX_TOKEN`** gesetzt ✅ (greift live ab dem nächsten Deploy; lokal für `npm run dev` ebenfalls eintragen).
- [ ] **`RESEND_API_KEY`** in Supabase Edge Functions Secrets setzen (für Reservierungs-Emails).
  - Wert: https://resend.com → API Keys. Setzen via `supabase secrets set RESEND_API_KEY=...`.
- [ ] **`SUPABASE_SERVICE_ROLE_KEY` rotieren** — der alte stand evtl. in der Lovable-`.env`. Sicherheitshalber neu generieren.
- [ ] **MCP-Token rotieren** — der `sbp_...` Token in `.mcp.json` war im Chat sichtbar.

## Supabase Dashboard

- [ ] **Auth → URL Configuration**: Site URL = `https://objelt-pilot.vercel.app`, Redirect URLs ergänzen (`https://objelt-pilot.vercel.app/**`, `http://localhost:3000/**`). Sonst funktionieren Magic-Link / Passwort-Reset / Invite-Emails nicht.
- [ ] **Auth → Email Templates**: anpassen (Lovable-Templates lagen unter `OLD APP/docs/email-templates/`).
- [ ] **Edge Functions deployen** (sobald portiert): `supabase functions deploy` für `reservierungen-cron`, `send-reservation-email`, `seed-demo-users`, `reset-demo-passwords`.
- [ ] **Cron** für `reservierungen-cron` einrichten (Supabase → Database → Cron oder pg_cron), täglich.

## Vercel

- [x] Deployment Protection deaktiviert (Seite ist öffentlich). ✅
- [ ] Nach dem Setzen neuer Env-Vars **Redeploy** (Env-Vars greifen nicht rückwirkend) — oder Claude deployed beim nächsten Push.
- [ ] (Optional) Eigene Domain verbinden statt `objelt-pilot.vercel.app`.

## Daten / Test

- [ ] **Test-User anlegen** in Supabase Auth (oder Demo-Seed-Function ausführen) mit Rollen in `user_roles`, damit Login + Rollen-Routing testbar ist.
- [ ] Prüfen, ob die **RLS-Policies** mit dem cookie-basierten `@supabase/ssr` Auth weiterhin greifen (Claude nutzt jetzt User-Sessions statt Bearer-Header).

---

## Was Claude in dieser autonomen Session gebaut hat (alles deployed)

- ✅ **Objekte**: Liste (Filter/Suche/Grid/Tabelle), Detail (Übersicht, **interaktive Kalkulation** mit Charts, Bilder, Dokumente, Bankdaten, **Mapbox-Karte**), Kunden-Zuweisung
- ✅ **Kunden**: Liste, Anlegen (mit Bonitäts-Vorschau), Detail (Daten/Bonität/Zuweisungen), **Kundenportal-Aktivierung**
- ✅ **Reservierungen**: Liste (Stornieren, Verlängern, PDF-Download, Email erneut senden)
- ✅ **Finanzierungen**: rollenbasierte Fall-Liste + Fall-Detail (Angebot, Status, Kommentare)
- ✅ **Kunden-Portal**: eigene Shell, Dashboard, Selbstauskunft-Wizard, Profil
- ✅ **Auth komplett**: Login, Passwort vergessen/zurücksetzen, Einladung annehmen, Magic-Link-Callback
- ✅ Edge Functions + 62 Migrationen ins Repo übernommen (`supabase/`)
- ✅ Struktur-Audit (`docs/STRUCTURE-AUDIT.md`)

## Noch offen (von Claude, kein User-Input nötig — nur Zeit)

- [ ] **Reservierungs-Erstellung**: Modal + Signatur-Pad + Reservierungs-/Exposé-PDF (`@react-pdf/renderer` + `signature_pad` sind installiert). Backend-Actions existieren bereits.
- [ ] **Dokumenten-Upload** (Kunden-Dokumente + Objekt-Bilder/-Dokumente): Storage-Actions + Upload-UI. Aktuell read-only / Platzhalter.
- [ ] **Exposé-PDF** + **Präsentations-Modus** (`/objekte/[id]/praesentation`).
- [ ] **Finanzierer-Pool-UI** im Objekt-Detail (Backend existiert).
- [ ] Module **Provisionen / Team / Tickets** (noch Stubs).
- [ ] **Investagon-Integration** (`docs/INVESTAGON-PLAN.md`) — letzter Punkt.

## Deine offenen Punkte (Dashboard / Secrets)

- [ ] **Edge Functions deployen**: `supabase functions deploy reservierungen-cron send-reservation-email seed-demo-users reset-demo-passwords` + `RESEND_API_KEY` als Secret.
- [ ] **Investagon-Sync aktivieren** (Code ist fertig, siehe `docs/INVESTAGON-PLAN.md`):
  1. Migration anwenden: `supabase/migrations/20260612000000_investagon_sync.sql` (fügt `investagon_id`+`raw` zu projekte/einheiten + `investagon_sync_log` hinzu). Via `supabase db push` oder Dashboard SQL-Editor. _(Konnte ich nicht selbst anwenden — lokaler Supabase-MCP ist read-only.)_
  2. Danach Supabase-Typen neu generieren und `src/lib/supabase/types.ts` ersetzen (dann können die `as never`-Casts in `src/lib/actions/investagon.ts` raus).
  3. Env-Vars setzen (Vercel + `.env.local`): **`INVESTAGON_ORG_ID`** (deine Organisations-ID — war in deiner Nachricht leer!) und **`INVESTAGON_API_KEY`** (`d7540…` — rotieren, war im Chat sichtbar).
  4. Sync auslösen: `syncInvestagon()` aus `@/lib/actions/investagon` (admin-only) — z. B. über einen Admin-Button oder eine Route. Ergebnis landet in `investagon_sync_log`.
  5. Offene Frage: Preis-/Flächen-Felder waren in der API-Spec-Zusammenfassung nicht enthalten — gegen eine echte API-Antwort prüfen und das Mapping in `investagon.ts` ergänzen (Rohdaten liegen sicher in `raw`).
- [ ] Struktur-Gaps entscheiden (`docs/STRUCTURE-AUDIT.md`): Projektentwickler-Tabelle? Datenraum-Tabelle?
