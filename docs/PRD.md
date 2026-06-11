# Product Requirements Document — Objektpilot

## Vision
Objektpilot is a B2B sales and financing platform for German real estate distribution (Kapitalanlage-Immobilien). It gives sales organizations a single system to manage projects and units, qualify customers by creditworthiness (Bonität), run investment calculations and presentations, handle reservations with legally-signed PDFs, and coordinate financing cases with lenders — plus a self-service portal for end customers.

## Target Users
- **Vertriebsleiter (Sales leads)** — manage the VP hierarchy, project visibility, and commissions.
- **Vertriebspartner VP L1–L3 (Sales partners)** — manage their own customers, assign units, build calculations, run presentations, create reservations.
- **Admin / Support** — full operational access, invites, financer pools, demo data.
- **Finanzierer (Lenders)** — receive and process financing cases, submit offers.
- **Kunde (End customer)** — self-service portal: see assigned unit, upload documents, complete the self-disclosure (Selbstauskunft), track reservation/financing status.

## Core Features (Roadmap)

| Priority | Feature | Status |
|----------|---------|--------|
| P0 (MVP) | Auth + invites + role-based access (8 roles) | Migrating |
| P0 (MVP) | App shell: sidebar, topbar, command palette, notifications | Migrating |
| P0 (MVP) | Objekte: projects/units, calculation, images, docs, map | Migrating |
| P0 (MVP) | Kunden: pipeline, Bonität scoring, documents | Migrating |
| P0 (MVP) | Reservierungen: signed PDF, expiry, email | Migrating |
| P1 | Finanzierungen: lender cases, offers, finanzierer pool | Migrating |
| P1 | Customer portal: dashboard, documents, Selbstauskunft | Migrating |
| P1 | Präsentation / Exposé PDF generation | Migrating |
| P2 | Investagon API sync (mirror project/unit data into Supabase) | Planned |
| P2 | Provisionen, Team, Tickets (currently stubs) | Planned |

## Success Metrics
- Time from lead → reservation (pipeline velocity)
- Share of customers passing Bonität qualification
- Reservation → financing conversion rate
- Customer portal self-service completion (Selbstauskunft submitted without VP help)

## Constraints
- Existing Supabase database (project `ffagjzkkzlywejzjfgue`) — schema, RLS, and edge functions are reused as-is; the rebuild must stay compatible.
- German-language UI and domain terminology (legal/tax sensitive: Bonität, AfA, Reservierungsgebühr).
- Reservation PDFs must capture signature + audit metadata (IP, user-agent, timestamp).
- External data source: **Investagon API** (https://api.investagon.com) — source of truth for much project/unit data; sync into Supabase.

## Non-Goals
- No GraphQL layer (direct typed Supabase access).
- No re-design of the existing UI in this migration — port functionality faithfully first, improve later.
- Provisionen/Team/Tickets remain stubs until the core flows are live.

---

See `docs/MIGRATION.md` for the technical port roadmap. Use `/write-spec` to detail individual features before re-implementing them.
