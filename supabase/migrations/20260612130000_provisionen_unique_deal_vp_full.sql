-- BUG-1 (PROJ-9 QA): generateProvisionen() upserts with ON CONFLICT (deal_id, vp_id),
-- but the previous unique index was PARTIAL (WHERE deal_id IS NOT NULL). PostgreSQL
-- cannot infer a partial index from a bare `ON CONFLICT (deal_id, vp_id)` — every
-- upsert failed with 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification"), breaking commission generation entirely.
--
-- Fix: replace it with a NON-partial unique index on (deal_id, vp_id). NULL deal_ids
-- are never considered equal in a unique index, so legacy rows with deal_id IS NULL
-- remain allowed (multiple per vp) — same tolerance the partial index gave us, but now
-- the conflict target is inferrable by supabase-js (which cannot emit a WHERE predicate).

DROP INDEX IF EXISTS public.uq_provisionen_deal_vp;

CREATE UNIQUE INDEX IF NOT EXISTS uq_provisionen_deal_vp
  ON public.provisionen (deal_id, vp_id);
