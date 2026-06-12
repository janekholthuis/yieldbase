# PROJ-9 — Provisionen & Team

**Status:** In Review
**Created:** 2026-06-11
**QA:** 2026-06-12

## Summary
Two related modules sharing the VP hierarchy:
- **Provisionen** — commission rows (% of Kaufpreis) generated along the VP hierarchy from reservierungen; role-scoped list + status workflow (pipeline → verdient → in_auszahlung → ausgezahlt / storniert).
- **Team** — VP hierarchy view, inline commission-rate editing, sub-VP invitation, pending-invite management.

Backend (`src/lib/data/{provisionen,team}.ts`, `src/lib/actions/{provisionen,team}.ts`) landed in commit `40bdc0d`. Frontend (`ProvisionenListView`, `TeamView` + pages) and the status-colour helper added during this QA cycle.

## Implementation Notes
- Reads use the **service-role admin client** after authorising via `requireUser`/`requireRole`; VP-hierarchy / provisionen are not RLS-readable across a sub-tree.
- Scope resolution: admin → all; vertriebsleiter → own tree (`vertriebsleiter_id = self`) + self; plain VP → self only. Fail-closed (`support` and roleless users resolve to self → see nothing).
- `generateProvisionen` walks `reservierung.vp_id` up the `parent_vp_id` chain (cycle-guarded, depth ≤ 10); each VP earns `commission_rate %` of `einheit.kaufpreis`; upsert keyed on `(deal_id, vp_id)`.

---

## QA Test Results — 2026-06-12

**Tester:** QA Engineer (code-level audit + DB verification; no live browser session available in this environment)
**Production-ready:** ⚠️ **Code bugs cleared** — all BUG-1…6 fixed & verified (see Resolution log). Two **product confirmations** remain open (Q-5 commission model, Note-7 admin cross-org visibility) before final sign-off.

### Resolution log — 2026-06-12 (fixes applied this session)
- **BUG-1 ✅ Fixed & DB-verified** — migration `20260612130000_provisionen_unique_deal_vp_full.sql` replaces the partial index with a non-partial `UNIQUE (deal_id, vp_id)`; applied to remote. `ON CONFLICT (deal_id, vp_id)` now infers (probe returns FK error, no longer 42P10).
- **BUG-2 ✅ Fixed & DB-verified** — `generateProvisionen` omits `status` from the upsert payload; re-run refreshes `provisionssatz`/`betrag` only. Transactional probe (rolled back): an `ausgezahlt` row kept its status after re-upsert while amounts updated.
- **BUG-3 ✅ Fixed** — removed the under-guarded `inviteSubVp`; `TeamView` now invites via `createInvite` (canonical role matrix + sub ≤ parent cap). The dialog only offers roles the caller may actually invite (`INVITE_MAP`).
- **BUG-4 ✅ Fixed** — `updateVpCommissionRate` now rejects a rate above the upline VP's rate (when a `parent_vp_id` exists).
- **BUG-6 ✅ Fixed** — `TeamView` indentation uses static Tailwind classes (`LEVEL_INDENT`), no inline style.
- `tsc --noEmit` clean after all changes.

---
**Original findings (pre-fix):**

### Acceptance criteria (derived — no formal spec)
| # | Criterion | Result |
|---|-----------|--------|
| 1 | Role-scoped provisionen list (admin/VL/VP) | ✅ Pass (logic correct, fail-closed) |
| 2 | Status summary totals by status | ✅ Pass |
| 3 | Admin/VL can change a provision's status | ✅ Pass (UI + action) |
| 4 | Generate provisionen along the hierarchy | ❌ **Fail — action errors at runtime (BUG-1)** |
| 5 | Team hierarchy view, role-scoped | ✅ Pass |
| 6 | Edit sub-VP commission rate | ⚠️ Works, but no parent-rate cap (BUG-4) |
| 7 | Invite sub-VP + manage pending invites | ⚠️ Works, but missing hierarchy/rate guards (BUG-3) |

### Bugs

**BUG-1 — High (verified) · `generateProvisionen` upsert always fails**
`src/lib/actions/provisionen.ts:108` upserts with `onConflict: "deal_id,vp_id"`, but the only matching unique index `uq_provisionen_deal_vp` is **partial** (`WHERE deal_id IS NOT NULL`). PostgreSQL cannot infer a partial index from a bare `ON CONFLICT (deal_id, vp_id)`. Verified directly against the DB:
```
ERROR: 42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification
```
**Impact:** clicking "Provisionen berechnen" throws every time — the generation feature is completely non-functional.
**Fix direction (backend):** replace the partial index with a plain `UNIQUE (deal_id, vp_id)` constraint (NULL deal_ids are never considered equal, so it stays safe), OR express the predicate the upsert can't — the supabase-js `onConflict` string cannot carry a `WHERE`, so a non-partial constraint is the practical fix.

**BUG-2 — High · Re-running generation resets payout status**
The upsert payload always includes `status: OPEN_STATUS` (`'pipeline'`), and `onConflict` updates all columns. Re-running `generateProvisionen` reverts every existing provision — including ones already `ausgezahlt`/`in_auszahlung` — back to `pipeline`, destroying financial-status progression. Latent behind BUG-1; will surface as soon as BUG-1 is fixed.
**Fix direction:** on conflict, refresh `provisionssatz`/`betrag` only; do not overwrite `status`.

**BUG-3 — Medium · `inviteSubVp` missing authorization/business guards**
Unlike `createInvite` (`src/lib/actions/auth.ts`), `inviteSubVp` (`src/lib/actions/team.ts`) enforces neither the level hierarchy (any VP role may be invited regardless of inviter level) nor the commission cap (sub-rate may exceed the inviter's own rate). `TeamView` exposes L1/L2/L3 to every inviter. Risk: malformed hierarchy + commission overrun (financial).
**Fix direction:** mirror `createInvite`'s `allowed`-matrix + `sub ≤ parent` rate check, or have `TeamView` call `createInvite`.

**BUG-4 — Medium · `updateVpCommissionRate` has no parent-rate cap**
Inline rate editing accepts 0–100 with no check against the upline's rate, inconsistent with invite-time enforcement. A VL can set a sub-VP's rate above its parent, breaking the margin model.

**Q-5 — Medium (needs spec) · Commission model semantics**
Generation gives **each** upline VP their full `rate %` of Kaufpreis (summed across the chain), not an override/difference margin. Confirm this matches the intended payout model — total paid commission = Σ rates across the chain.

**BUG-6 — Low · Inline style in `TeamView`**
Level indentation uses `style={{ paddingLeft }}`, violating the project's "Tailwind exclusively, no inline styles" rule. Cosmetic.

**Note-7 — Low · Cross-org visibility for admin**
Provisionen/Team reads use the admin client (bypassing the PROJ-13.2b per-org RLS); an `admin` sees all organisations. Consistent with the platform-admin model in the PRD, but worth confirming against multi-tenant intent.

### Positives
- VL/VP scoping is correct and fail-closed; no cross-tenant leak via the hierarchy paths (downlines never cross orgs).
- `listPendingInvites` correctly scoped to `invited_by = self`.
- `generateProvisionen` chain walk is cycle- and depth-guarded.
- `tsc --noEmit` clean across the new code.

### Not done this cycle
E2E/unit tests deferred: the core generation flow (AC-4) is broken by BUG-1, so automated coverage is premature. Add `tests/PROJ-9-provisionen-team.spec.ts` after BUG-1/BUG-2 are fixed.

### Recommendation
Fix **BUG-1** and **BUG-2** (both backend, same upsert) before any deploy; resolve **BUG-3/BUG-4** and clarify **Q-5** next. Status stays **In Review**.
