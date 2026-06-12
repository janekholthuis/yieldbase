# E2E tests (Playwright)

End-to-end tests for Objektpilot. Config: [`playwright.config.ts`](../playwright.config.ts)
(baseURL `http://localhost:3000`, projects: Desktop Chrome + Mobile Safari).
Playwright starts the app itself via `npm run dev` (`webServer`), reusing an
already-running dev server if present.

## Run

```bash
npm run test:e2e            # headless, all specs
npm run test:e2e:ui        # interactive UI mode
npx playwright test tests/PROJ-1-auth.spec.ts --project=chromium   # one file
```

One-time per machine (browser binaries, ~300 MB):

```bash
npx playwright install chromium
```

## Test tiers

- **Unauthenticated specs** (login page render, route-guard redirects) are
  read-only and safe to run against any environment, including prod.
- **Authenticated specs** are gated behind test credentials and `test.skip`
  themselves when those are absent — so the suite stays green without them.

## Test credentials

Authenticated specs read two env vars (never commit real values):

| Var | Purpose |
|-----|---------|
| `E2E_TEST_EMAIL` | Login email of a dedicated test account |
| `E2E_TEST_PASSWORD` | Its password |

Provide them via `.env.local` (loaded by the `npm run dev` webServer) or export
them in the shell before `npm run test:e2e`.

> ⚠️ Authenticated E2E currently runs against the **production** Supabase
> project. Before expanding write-path coverage (creating Kunden/Objekte/
> Reservierungen), set up a dedicated **staging** Supabase project + seeded
> test accounts per role (admin, vp_l1–l3, finanzierer, kunde) and point
> `.env.local` at it for the E2E run. Track this as its own task.

## Conventions

- One spec file per feature: `tests/PROJ-<n>-<feature>.spec.ts`.
- Shared login/setup helpers live in `tests/helpers/`.
- Prefer role/label/id selectors over brittle CSS. Reuse `login()` from
  `tests/helpers/auth.ts`.
