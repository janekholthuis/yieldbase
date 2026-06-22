# Staging-Environment & „The Loop"

> Ziel: Änderungen **vor** dem Roll-out gefahrlos testen können — der fehlende
> „Iterate in Sim → Real-life test"-Schritt. Heute geht jede Änderung direkt
> `main` → Vercel → Prod (deshalb stehen in `features/INDEX.md` überall
> „E2E braucht Staging+Seed" und „Prod-Verifikation offen").

## Entscheidungen (2026-06-22, mit Nutzer)

| Frage | Wahl |
|---|---|
| Ansatz | **Supabase Pro** (25 $/Mo) — löst zugleich die Prod-Contention **und** schaltet **Branching** frei (ephemere DB pro Git-Branch) |
| Testdaten | **Synthetischer Seed** (`supabase/seed.sql`) — keine echte Kunden-PII |
| Test-Tiefe | **Manuell zuerst**, Playwright-E2E-Gerüst vorbereitet, Suite wächst schrittweise |

## „The Loop" → konkreter Dev-Workflow

```
DEFINE PROBLEM        →  Issue / Spec (features/PROJ-X-*.md, /write-spec)
CLAUDE ENUMERATES     →  Lösungs-Optionen (Chat / /architecture)
HAND-SELECT FEASIBLE  →  Auswahl + Plan
DESIGN SIMULATIONS    →  Branch anlegen: git switch -c feat/PROJ-X
ITERATE IN SIM        →  Vercel Preview-Deploy (auto) auf ephemerer Branch-DB
                         + npm test (unit) + npm run test:e2e (gegen Preview-URL)
REAL-LIFE TEST        →  manuelle Abnahme auf der Preview-URL mit Seed-Daten
ROLL OUT              →  PR → merge main → Prod (emi-hub.de)
                         ↑ zurück zu DEFINE PROBLEM
```

Der Kreis schließt sich, weil jeder Branch eine **eigene, wegwerfbare DB** bekommt
— kaputt-seeden, migrieren, zurücksetzen ohne Prod-Risiko.

---

## Setup — Reihenfolge

### Phase 0 — DU (Dashboard/Billing, einmalig)
Diese Schritte kann/darf ich nicht auslösen (Zahlung + OAuth):

1. **Supabase Org auf Pro upgraden** — Supabase Dashboard → Organization → Billing → *Upgrade to Pro* (25 $/Mo). Wirkt sofort gegen die Free-Tier-Contention (kein Auto-Pause, größere Compute, Daily Backups).
2. **Branching aktivieren** — Projekt `ffagjzkkzlywejzjfgue` → *Branching* → Enable. Verbindet das GitHub-Repo (`janekholthuis/yieldbase`) via Supabase-GitHub-App. **Production-Branch = `main`.**
3. **Vercel ↔ Supabase Integration** — In Vercel das Supabase-Integration-Add-on verbinden (falls noch nicht). Dann injiziert Supabase die **Preview**-Env-Vars (`NEXT_PUBLIC_SUPABASE_URL`, `_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) pro Branch **automatisch** auf die jeweils zugehörige ephemere DB. → **Kein manuelles Preview-Env-Setzen nötig.**
4. Sicherstellen, dass die **Production**-Env-Vars in Vercel weiterhin auf das Prod-Supabase-Projekt zeigen (unverändert).

### Phase 1 — ICH (Code, bereits erledigt)
- `supabase/seed.sql` — synthetischer Seed (Org, 3 Demo-User mit Login, Projekte, Einheiten, Kunden). Branches/Local laufen damit befüllt hoch.
- `supabase/config.toml` — Seed aktiviert.
- Cron (`investagon-sync`) gehärtet: läuft nur bei `VERCEL_ENV=production` → feuert nie gegen eine Branch-DB.
- Playwright staging-fähig: `E2E_BASE_URL` steuert die Ziel-URL; neuer Smoke-Test.

### Phase 2 — ICH (nach Phase 0, gemeinsam verifizieren)
- **Migrations-Drift abgleichen:** Laut QA-Notizen sind die Repo-Migrationen unvollständig ggü. Prod (z. B. `org_isolation`-RESTRICTIVE-Policies existieren live, aber nicht im Repo). Branching applied **nur die Repo-Migrationen** auf neue Branches → ohne Abgleich fehlen diese Policies in der Sim. Schritt: ersten Branch hochziehen, `org_isolation` & Co. gegen Prod prüfen, fehlende Objekte als Reconciliation-Migration nachziehen, bis ein Branch Prod-Schema 1:1 erzeugt. (Erst nach Phase 0 testbar.)
- Seed gegen den ersten echten Branch validieren (Auth-Trigger, `organisation_members`-Sichtbarkeit unter RLS).

---

## Demo-Login (Seed)

| E-Mail | Passwort | Rolle |
|---|---|---|
| `admin@staging.test` | `staging-demo-123` | admin |
| `vp@staging.test` | `staging-demo-123` | vp_l1 |
| `finanzierer@staging.test` | `staging-demo-123` | finanzierer |

> Nur synthetische Daten — niemals echte Prod-PII in Staging.

## E2E gegen eine Preview-URL

```bash
E2E_BASE_URL=https://<branch>-yieldbase.vercel.app npm run test:e2e
```
Ohne `E2E_BASE_URL` läuft Playwright wie bisher gegen den lokalen Dev-Server.

## Wichtig
- **Branch-DBs sind ephemer** — keine Daten dort aufheben, die du brauchst.
- **Cron läuft nicht auf Branches** (per `VERCEL_ENV`-Guard + Vercel feuert Crons nur auf Prod).
- **Migrations sind die Quelle der Wahrheit für Branches** — neue Schema-Änderungen IMMER als Migration ins Repo (nicht nur per MCP auf Prod), sonst driftet die Sim von Prod weg (genau die heutige Lücke).
