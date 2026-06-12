-- Provisionen: support idempotent generation keyed on (deal_id, vp_id).
-- generateProvisionen() upserts one provision per VP per deal (reservierung).
-- A partial unique index lets the ON CONFLICT target match while tolerating
-- legacy rows where deal_id is NULL (deal_id is nullable: FK ON DELETE SET NULL).

-- De-duplicate any pre-existing rows that would violate the new constraint,
-- keeping the most recently updated row per (deal_id, vp_id).
DELETE FROM public.provisionen p
USING public.provisionen q
WHERE p.deal_id IS NOT NULL
  AND p.deal_id = q.deal_id
  AND p.vp_id = q.vp_id
  AND (p.updated_at, p.id) < (q.updated_at, q.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_provisionen_deal_vp
  ON public.provisionen (deal_id, vp_id)
  WHERE deal_id IS NOT NULL;

-- Speeds up deal-scoped lookups / joins from reservierungen.
CREATE INDEX IF NOT EXISTS idx_provisionen_deal ON public.provisionen (deal_id);
