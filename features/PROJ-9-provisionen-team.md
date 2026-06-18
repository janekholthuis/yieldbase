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

---

## QA Test Results — 2026-06-18 (Provisionen-Reaktivierung)

**Tester:** QA Engineer (code-level audit + live Prod-DB-Verifikation; kein Browser/Staging-Seed in dieser Umgebung)
**Kontext:** PROJ-9 Provisionen wurde aus dem V1-Soft-Gate reaktiviert (Nav-`hidden` entfernt, `/provisionen` von `FeatureComingSoon` zurück auf echten View verdrahtet). Dieser Pass prüft den reaktivierten Code + den Stand der alten BUG-1…6.
**Production-ready:** ✅ **BUG-P1 (High) GEFIXT 2026-06-18** — Mandanten- + Tree-Guard in `updateProvisionStatus` (Zeile liest `organisation_id`/`vp_id`, dann `assertOrgAccess` + VL-Tree-Check vor dem Write); Note-P3 (Doc-Drift) ebenfalls behoben. tsc + 206 Tests grün. Restliche Alt-Bugs verifiziert geschlossen, Commission-Modell (altes Q-5) durch „Closing-VP-only" final geklärt. **Rest-Low:** BUG-P2 (Status-Transition/Audit) — Produktentscheidung, blockiert nicht.

### Verifikation der Alt-Befunde (gegen Prod-DB)
- **BUG-1 ✅ geschlossen (DB-verifiziert)** — `uq_provisionen_deal_vp` ist jetzt ein **non-partial** `UNIQUE (deal_id, vp_id)` (kein `WHERE` mehr) → `onConflict: "deal_id,vp_id"` inferiert sauber.
- **BUG-2 ✅ geschlossen (Code-verifiziert)** — `generateProvisionen` lässt `status` im Upsert weg (`actions/provisionen.ts:89-101`); Re-Run aktualisiert nur `provisionssatz`/`betrag`, bestehender Payout-Status bleibt.
- **Q-5 ✅ geklärt** — Modell ist jetzt **Closing-VP-only** (nur der VP auf der Reservierung bekommt seinen eigenen Satz, keine Upline-Beteiligung; `actions/provisionen.ts:4-6,84-87`). Damit entfällt die „Σ-Sätze über die Kette"-Frage.
- BUG-3/BUG-4/BUG-6 betreffen **Team** (nicht Provisionen) und waren im vorigen Pass abgehakt — hier nicht erneut getestet.

### Akzeptanzkriterien (abgeleitet)
| # | Kriterium | Ergebnis |
|---|-----------|----------|
| 1 | Rollen-gescopte Liste (admin=alle · VL=Baum · VP=selbst), fail-closed | ✅ Pass (`listProvisionen` org+tree-gescopt) |
| 2 | Summen je Status | ✅ Pass |
| 3 | admin/VL ändern Provisionsstatus | ⚠️ Funktioniert, **aber Autorisierungslücke (BUG-P1)** |
| 4 | Provisionen aus Reservierungen erzeugen (Closing-VP) | ✅ Pass (Constraint live ✓, Status-Erhalt ✓, org+tree-gescopt) |
| 5 | Reaktivierung: Route rendert echten View, Nav entgated | ✅ Pass (Build listet `/provisionen` dynamisch; tsc + 206 Tests + Build grün) |

### Bugs

**BUG-P1 — High · `updateProvisionStatus` umgeht Mandanten-/Tree-Isolation**
`src/lib/actions/provisionen.ts:125-142` autorisiert nur per `requireRole("admin","vertriebsleiter")` und schreibt dann via **Admin-Client (RLS-Bypass)** mit `.update({status}).eq("id", id)` — **ohne** Org-Scope und **ohne** Tree-Scope. Auf der DB ist provisionen-RLS bewusst geschichtet: RESTRICTIVE `org_isolation` (Mandanten-Guard) + nur `prov_admin_all` als PERMISSIVE-UPDATE-Policy; VL haben **nur SELECT**-Policies (`prov_vl_select`/`prov_vp_subtree`). Das RLS-Design sagt also: *nur admin darf schreiben, VL nur lesen, niemals cross-org*. Die Action hebelt das aus.
**Impact:** Ein `vertriebsleiter` kann den Status **jeder** Provision setzen — auch einer **fremden Organisation** (Tenant-Isolation gebrochen) oder eines VP **außerhalb seines Sub-Trees**. Das ist eine finanzielle Status-Mutation (z. B. `ausgezahlt`/`storniert`). Server-Actions sind direkt per POST aufrufbar; RLS ist hier **keine** Backstop, weil der Admin-Client sie umgeht.
**Mitigant:** Provision-IDs sind nicht-enumerierbare UUIDs (Angreifer braucht eine bekannte/geleakte ID). Innerhalb der eigenen Org sieht ein VL fremde Tree-IDs nicht in der UI.
**Fix-Richtung (Backend):** vor dem Update die Zeile lesen (`organisation_id`, `vp_id`), dann `assertOrgAccess(session, row.organisation_id)` (analog BUG-001 Objekt-CRUD) **und** für `vertriebsleiter` prüfen, dass `vp_id` im eigenen Baum liegt — oder Status-Writes ganz auf `admin` beschränken (deckt sich mit der RLS-Absicht). Gleiches Muster ist in `generateProvisionen` bereits korrekt (org+tree-gescopt) — nur der Status-Write fehlt.

**BUG-P2 — Low · keine Status-Übergangs-Prüfung / kein Audit-Trail**
`updateProvisionStatus` akzeptiert jeden der 5 Status bedingungslos — eine als `ausgezahlt` markierte Provision kann still auf `pipeline` zurückgesetzt werden, und es gibt keinen Audit-Eintrag (wer/wann) für eine finanzielle Status-Änderung. Business-Rule-/Compliance-Lücke, kein Sicherheitsbug.

**Note-P3 — Low/Doc · veralteter Kommentar**
Der Header von `src/lib/data/provisionen.ts` beschreibt noch „% of Kaufpreis **along the VP hierarchy**", was dem nun maßgeblichen Closing-VP-only-Modell (`actions/provisionen.ts`) widerspricht. Reine Doku-Drift.

**Note-P4 — Low/Obs · Admin-Cross-Org by design** (= Note-7, unverändert)
Reads/Writes laufen über den Admin-Client; ein Plattform-`admin` sieht/handelt über alle Orgs. Konsistent mit dem Plattform-Admin-Modell der PRD.

### Positives
- `listProvisionen`/`provisionenSummary` korrekt **org + tree** gescopt und fail-closed (support/roleless → eigene ID → sieht nichts).
- `generateProvisionen` org+tree-gescopt; BUG-1-Constraint live bestätigt; Status-Erhalt bei Re-Run (BUG-2) im Code verifiziert; Ketten-Walk entfällt im Closing-VP-Modell.
- Prod-DB: **0 ERROR**-Advisors, 55 WARN (unverändert); provisionen-RLS sauber geschichtet.
- tsc + **206 Tests** + Build grün; `/provisionen` baut als dynamische Server-Route.

### Nicht erledigt diese Runde
Keine Unit-/E2E-Tests ergänzt: kein Browser/Staging-Seed in der Umgebung, und der einzige umsetzbare Befund (BUG-P1) ist eine Autorisierungslücke, die sinnvoll **nach** dem Fix mit einem gezielten Test (`_org`-Guard-Regression, analog `src/lib/actions/_org.test.ts`) abgedeckt wird.

### Empfehlung
**BUG-P1 (High) vor dem Deploy fixen** — Mandanten-/Tree-Guard im `updateProvisionStatus` (Backend). BUG-P2 + Notes sind Low und blockieren nicht. Status bleibt **In Review**.
