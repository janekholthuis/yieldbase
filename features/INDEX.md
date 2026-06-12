# Feature Index

> Central tracking for all features. Updated by skills automatically.
> Migration context: features below are being ported from `/OLD APP` (Lovable / TanStack Start) into Next.js. See `docs/MIGRATION.md`.

## Status Legend
- **Roadmap** - `/init` done, feature identified in feature map, no spec file yet
- **Planned** - `/write-spec` done, full spec written, architecture not yet designed
- **Architected** - `/architecture` done, tech design approved, ready to build
- **In Progress** - `/frontend` or `/backend` active or completed, not yet in QA
- **In Review** - `/qa` active, testing in progress
- **Approved** - `/qa` passed, no critical/high bugs, ready to deploy
- **Deployed** - `/deploy` done, live in production

## Features

> **Status-Audit 2026-06-12 (PROJ-11):** Stati an die Realität angeglichen — die V1-Kernmodule sind live auf objekt-pilot.vercel.app. **V1-Scope:** aktiv sind Objekte, Kunden, Reservierungen, Team, Profil, Einstellungen/Org-Branding. **V2-zurückgestellt** (im Front-End ausgegraut/gegated, Code bleibt): Provisionen, Finanzierungen, KI. Supabase-Advisors: **keine ERROR-Level-Befunde** (RLS intakt); offene Tuning-/Config-Punkte siehe `docs/USER-TODO.md`. Formale Per-Feature-QA (E2E) steht noch aus.

> **QA-Pass 2026-06-12:** Unit-Tests für finanzkritische Kernlogik angelegt (`npm test` → **107/107 grün**, 10 Dateien), Build (Typecheck) grün, Security-Audit der Server-Action-Autorisierung durchgeführt. Voller Bericht: `docs/QA-RESULTS-2026-06-12.md`.
> **Fixes 2026-06-12:** **BUG-001 (High)** — Objekt-CRUD umging Mandanten-Isolation (Admin-Client-Writes per id ohne Org-Check) → neuer Guard `assertOrgAccess()` in `src/lib/actions/_org.ts`, in allen Objekt-CRUD-Writes erzwungen (admin/support: Cross-Org per Konvention). **BUG-002 (Low)** — `createProjekt` lehnt jetzt null-Org ab. Regressionstest `src/lib/actions/_org.test.ts`. **Offen:** E2E (Playwright, braucht Staging+Seed), Advisor-WARN-Tuning (`docs/USER-TODO.md`), `npm run lint` repo-weit defekt (Next 16 entfernte `next lint` → auf `eslint .` umstellen).

| ID | Feature | Status | Spec | Created |
|----|---------|--------|------|---------|
| PROJ-1 | Auth, invites & role-based access (8 roles) | Deployed | — | 2026-06-11 |
| PROJ-2 | App shell (sidebar, topbar, command palette, notifications) | Deployed | — | 2026-06-11 |
| PROJ-3 | Objekte (projects/units, calculation, images, docs, map) | Deployed | — | 2026-06-12 |
| PROJ-4 | Kunden (pipeline, Bonität scoring, documents) | Deployed | — | 2026-06-12 |
| PROJ-5 | Reservierungen (signed PDF, expiry, email) | Deployed | — | 2026-06-11 |
| PROJ-6 | Finanzierungen (lender cases, offers, finanzierer pool) | Deferred (V1 ausgegraut) | — | 2026-06-11 |
| PROJ-7 | Customer portal (dashboard, dokumente, Selbstauskunft, profil) | Deployed | — | 2026-06-11 |
| PROJ-8 | Präsentation / Exposé PDF generation | Deployed | — | 2026-06-11 |
| PROJ-9 | Provisionen (% vom Kaufpreis entlang VP-Hierarchie) + Team (Hierarchie, Sub-VP-Einladung, Provisionssätze) | Team Deployed · Provisionen Deferred (V1) | features/PROJ-9-provisionen-team.md | 2026-06-11 |
| PROJ-10 | Investagon API sync (mirror project/unit data into Supabase) | In Progress (echte Daten, Volllauf erledigt + UI-Trigger; Deploy ausstehend) | docs/INVESTAGON-PLAN.md | 2026-06-11 |
| PROJ-11 | Domain structure audit (compare entity diagram vs. existing schema) | Deployed | — | 2026-06-11 |
| PROJ-12 | Objekte-Revision (expert feedback: simplified project mgmt, grouped fields, new fields, doc upload) | Deployed | docs/OBJEKTE-REVISION-PLAN.md | 2026-06-12 |
| PROJ-13 | Multi-Tenant Organisationen mit eigenem Branding + Org-Switcher (VP/Finanzierer) | In Progress (13.1+13.2 live) | docs/MULTI-TENANT-PLAN.md | 2026-06-12 |
| PROJ-14 | „Neue Objekte"-Feed (Partner-Feed, Schlagzeilen-Posts mit Projekt-Link) | Planned (V2, Nav ausgegraut, nicht gebaut) | features/PROJ-14-neue-objekte-feed.md | 2026-06-12 |
| PROJ-15 | Standort-Highlights-Modul (nächste POIs je Kategorie + Luftlinien-Distanz; Mapbox Search Box) | In Progress (MVP gebaut; Score & Isochronen out) | features/PROJ-15-standort-highlights.md | 2026-06-12 |

<!-- Add features above this line -->

> **Objekte-Revision Runde 2 (Refine 2026-06-12, PROJ-3/PROJ-12):** Projekt-Detailseite (`/objekte/projekt/[projektId]`) mit Kaufpreisliste + Einheiten-Anzahl + Verkaufsstatus-Breakdown geplant; Status-Taxonomie auf strikt 6 Werte (Frei · Auf Anfrage · Reserviert · Notarvorbereitung · Notartermin · Verkauft). Listen-Aggregation/Ranges existieren bereits. Plan: `docs/OBJEKTE-PROJEKT-DETAIL-PLAN.md`. Noch nicht gebaut.

> **Backlog (für `/goal`-Session, 2026-06-12):** (1) ~~**UI-Politur-Pass**~~ **✓ erledigt 2026-06-12** — „Vertriebsplattform"-Marketing-Pills aus Objekte-Header (`ObjekteListView.tsx`) & Dashboard (`dashboard/page.tsx`) entfernt, dekorativer Akzent-Strich unter „Objekte" entfernt, 👋-Emojis aus Kundenportal (`PortalDashboardView.tsx`, `PortalShell.tsx`) entfernt. Funktionale Elemente (Benachrichtigungs-/Timeline-Dots, Lade-Skeletons, dezente Karten-Hover, „Bald"-Gating) bewusst belassen — professionell üblich. Typecheck grün. (2) ~~**PROJ-15 Standort-Highlights**~~ **✓ MVP gebaut 2026-06-12** — Mapbox Search Box Category Search, 5 Kategorien (ÖPNV/Einkauf/Bildung/Gesundheit/Autobahn), nächster POI je Kategorie + Luftlinien-Distanz, im Einheiten-Karte-Tab & in der Präsentation (`SlideLage`-Platzhalter ersetzt). Score & Isochronen bewusst out. Spec: `features/PROJ-15-standort-highlights.md`. **Offen (siehe Spec Open Questions):** canonical_ids mit echtem Token live verifizieren (lokal nur Dummy-Token), v. a. `motorway_junction`.

> **PROJ-10 Echtdaten-Sync (2026-06-12):** Investagon-Sync auf **echte Daten** umgestellt. Befund: Die `Api*`-Listen-Endpoints liefern nur Adresse+Status — die echten Finanz-/Struktur-/Medien-Daten liegen auf den **vollen** `Project`/`Property`-Ressourcen (`GET /api/projects/{id}`, `/api/properties/{id}`; 48 bzw. 114 Felder). Der frühere synthetische Generator (Zufalls-Finanzen) ist **entfernt**. Neu: `fetchFullProject/fetchFullProperty` im Client; `sync-core` mappt echte Felder (Wohnfläche, Zimmer, Etage, Kaufpreis, Miete, Energieklasse, Heizung, Zustand, vermietet …), reichert Projekt-Adresse/Geo aus erster Einheit an und synct Fotos→`objekt_bilder` + Dateien→`objekt_dokumente` (idempotent, CDN-URL-scoped). Live verifiziert an 1 Projekt (Halle, 76 Einheiten, 20 Fotos) — echte Werte korrekt. **Volllauf erledigt (2026-06-12):** 222 Projekte, 2108 Einheiten, 7023 Fotos, 9703 Dokumente in 155,8 s in die Prod-DB synchronisiert (2 Projekt-404s graceful abgefangen). **UI-Trigger gebaut:** Karte „Investagon-Synchronisierung" in Einstellungen (admin/support), zeigt letzten Sync-Status und startet einen **inkrementellen** Abgleich (`syncInvestagon({incremental:true})`, `updated_after` seit letztem Erfolg − 1 h Overlap) — Volllauf bleibt das Seed-Skript (Vercel-Timeout). Neue Actions: `getInvestagonStatus`, `syncInvestagon(incremental)`. **Offen:** Deploy auf Vercel; optional Cron für inkrementellen Sync. Details: `docs/INVESTAGON-PLAN.md`.

## Next Available ID: PROJ-16
