# Migration: Lovable (TanStack Start) → Next.js 16

> Master roadmap for porting the Objektpilot app from the Lovable codebase (`/OLD APP`, TanStack Start + Vite + Cloudflare) into this Next.js 16 App Router starter kit. Multi-session effort — update status as we go.

## Decisions (locked)

- **Framework:** Next.js 16 App Router (port away from TanStack Start). ✅
- **GraphQL:** No. Direct typed Supabase access. Supabase `pg_graphql` can be enabled later if ever needed. ✅
- **Backend:** Supabase (existing DB, project `ffagjzkkzlywejzjfgue`) — schema, RLS, edge functions reused as-is.
- **Auth model:** `@supabase/ssr` cookie-based sessions (idiomatic Next.js) instead of the OLD APP's manual Bearer-token middleware + service-role admin client. RLS enforced per-user; service-role client used only where the OLD APP genuinely needs to bypass RLS (invites, portal activation, cron).
- **Server logic:** OLD APP `createServerFn()` RPCs → Next.js **Server Actions** (1:1 callable mapping, keep Zod validators) grouped per domain in `src/lib/actions/`.
- **Data fetching:** `@tanstack/react-query` (as in OLD APP) on the client; Server Components for initial loads where natural.

## Source app at a glance (`/OLD APP`)

Immobilien-/Finanzierungs-Vertriebsplattform (German real estate sales + financing). Roles: `admin, support, vertriebsleiter, vp_l1, vp_l2, vp_l3, kunde, finanzierer`.

- ~25 routes (internal app + customer portal + public links)
- 15 server-function modules (`src/api/*.functions.ts`)
- ~50 business components + full shadcn/ui set
- 38 SQL migrations + 4 Deno edge functions
- Integrations: Mapbox GL, @react-pdf/renderer (Exposé + Reservierungs-PDF), signature_pad, recharts

## Route mapping (TanStack → Next.js App Router)

| Source (TanStack) | Target (Next.js) | Purpose | Access |
|---|---|---|---|
| `index.tsx` | `app/page.tsx` | Redirect → dashboard/login/portal | public |
| `login.tsx` | `app/(auth)/login/page.tsx` | Email+pw / magic link | public |
| `forgot-password.tsx` | `app/(auth)/forgot-password/page.tsx` | Reset request | public |
| `reset-password.tsx` | `app/(auth)/reset-password/page.tsx` | Reset complete | public |
| `invite.$token.tsx` | `app/(auth)/invite/[token]/page.tsx` | Signup via invite | public |
| `kunde-portal.$token.tsx` | `app/kunde-portal/[token]/page.tsx` | Public kundenlink view | public |
| `_authenticated.tsx` | `app/(app)/layout.tsx` | Auth guard + AppShell | guarded |
| `_authenticated/dashboard.tsx` | `app/(app)/dashboard/page.tsx` | Internal dashboard | internal |
| `_authenticated/objekte.tsx` | `app/(app)/objekte/page.tsx` | Objects index | internal |
| `_authenticated/objekte.$einheitId.tsx` | `app/(app)/objekte/[einheitId]/page.tsx` | Unit detail | internal |
| `_authenticated/objekte.$einheitId.praesentation.{-$kundeId}.tsx` | `app/(app)/objekte/[einheitId]/praesentation/[[...kundeId]]/page.tsx` | Presentation | internal |
| `_authenticated/kunden.tsx` | `app/(app)/kunden/page.tsx` | Customer list | internal |
| `_authenticated/kunden.neu.tsx` | `app/(app)/kunden/neu/page.tsx` | New customer | internal |
| `_authenticated/kunden.$kundeId.tsx` | `app/(app)/kunden/[kundeId]/page.tsx` | Customer detail | internal |
| `_authenticated/reservierungen.tsx` | `app/(app)/reservierungen/page.tsx` | Reservations | internal |
| `_authenticated/finanzierungen.index.tsx` | `app/(app)/finanzierungen/page.tsx` | Financing cases | internal + finanzierer |
| `_authenticated/finanzierungen.$caseId.tsx` | `app/(app)/finanzierungen/[caseId]/page.tsx` | Case detail | internal + finanzierer |
| `_authenticated/provisionen.tsx` | `app/(app)/provisionen/page.tsx` | Commissions (stub) | internal |
| `_authenticated/team.tsx` | `app/(app)/team/page.tsx` | Team (stub) | vl/vp |
| `_authenticated/tickets.tsx` | `app/(app)/tickets/page.tsx` | Tickets (stub) | internal+kunde |
| `_authenticated/profil.tsx` | `app/(app)/profil/page.tsx` | User profile | internal |
| `portal.tsx` | `app/(portal)/layout.tsx` | Portal shell | kunde |
| `portal/index.tsx` | `app/(portal)/portal/page.tsx` | Portal dashboard | kunde |
| `portal/dokumente.tsx` | `app/(portal)/portal/dokumente/page.tsx` | Documents | kunde |
| `portal/status.tsx` | `app/(portal)/portal/status/page.tsx` | Status | kunde |
| `portal/nachrichten.tsx` | `app/(portal)/portal/nachrichten/page.tsx` | Messages | kunde |
| `portal/profil.tsx` | `app/(portal)/portal/profil/page.tsx` | Profile | kunde |
| `portal/selbstauskunft.tsx` | `app/(portal)/portal/selbstauskunft/page.tsx` | Self-disclosure | kunde |

## Server functions → Server Actions (15 modules)

Each `src/api/X.functions.ts` → `src/lib/actions/X.ts`. Keep Zod schemas verbatim. Replace `createServerFn().middleware([requireSupabaseAuth]).handler()` with an `'use server'` action that calls a shared `requireUser()` helper (reads cookie session) and runs the same query body.

`auth, bonitaet, empfehlungen, finanzierer-pool, finanzierung, kalkulation, kunden, kundenlinks, notifications, objekte, portal, praesentation, reservierungen, selbstauskunft, visibility`

## Phases & status

| Phase | Scope | Status |
|---|---|---|
| 0 | Docs + roadmap (this file, PRD, INDEX) | ⏳ In progress |
| 1 | Deps install + framework-agnostic foundation (types, lib business logic) | ⏳ |
| 2 | Supabase clients (`@supabase/ssr`) + env + `requireUser()` helper | ⏳ |
| 2.5 | **Design system**: port OLD APP Tailwind theme tokens + extended shadcn (badge variants `primary/accent/success/muted`, `section-card`, `stat-row`, `chart`) + globals.css. Prereq for all components. Re-port `status-colors.ts`. | ⏳ |
| 3 | Auth slice: login, forgot/reset, invite, AuthProvider, middleware guard | ⏳ |
| 4 | App shell: layout, sidebar, topbar, command palette, mobile nav, notifications | ⏳ |
| 5 | Objekte (list, detail, tabs, Mapbox, Exposé PDF, presentation) | ⏳ |
| 6 | Kunden (list, new, detail, bonität, documents) | ⏳ |
| 7 | Reservierungen (list, modal, signature, PDF, email) | ⏳ |
| 8 | Finanzierungen (cases list, detail, finanzierer pool) | ⏳ |
| 9 | Customer portal (dashboard, dokumente, selbstauskunft, profil) | ⏳ |
| 10 | Edge functions (cron, email, seed) + deploy config | ⏳ |
| 11 | QA pass (RLS audit, role tests, security) + cleanup `/OLD APP` | ⏳ |

## Portability notes

**Copy ~verbatim (framework-agnostic):** `lib/bonitaet.ts`, `kalkulation.ts`, `kunden-dokumente.ts`, `objekte-filter.ts`, `objekt-format.ts`, `status-colors.ts`, `user-initial.ts`, `password.ts`, `portal-finanzierung-hint.ts`, `praesentation-navigation.ts`, and `integrations/supabase/types.ts`. Most shadcn `components/ui/*`.

**Rewrite (framework-specific):** Supabase clients, `auth-context.tsx`, `auth-middleware.ts`, `auth-attacher.ts`, `server-fn-auth.ts`, `navigation.ts` (route paths), all `api/*.functions.ts` (→ server actions), all `routes/*` (→ pages).

**Env vars:** `VITE_SUPABASE_URL`→`NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`→`NEXT_PUBLIC_SUPABASE_ANON_KEY`, plus server-only `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`, `RESEND_API_KEY` (edge functions).
