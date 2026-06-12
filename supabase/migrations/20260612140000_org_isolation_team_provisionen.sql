-- PROJ-13.2c — extend per-org tenant isolation to the remaining scoped tables:
-- vp_hierarchy, invites, provisionen. Mirrors the pattern already on projekte/
-- kunden/einheiten/reservierungen/finanzierungs_cases:
--   1. organisation_id column (FK → organisationen)
--   2. backfill existing rows
--   3. index on organisation_id
--   4. BEFORE INSERT trigger set_default_org_id() (defaults to current_org_id())
--   5. RESTRICTIVE org_isolation policy: row visible only when
--      organisation_id = current_org_id(), OR current_org_id() IS NULL (the
--      service-role / no-active-org fallback — app code scopes those paths).

-- 1) Columns ---------------------------------------------------------------
ALTER TABLE public.vp_hierarchy
  ADD COLUMN IF NOT EXISTS organisation_id uuid
  REFERENCES public.organisationen(id) ON DELETE SET NULL;
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS organisation_id uuid
  REFERENCES public.organisationen(id) ON DELETE SET NULL;
ALTER TABLE public.provisionen
  ADD COLUMN IF NOT EXISTS organisation_id uuid
  REFERENCES public.organisationen(id) ON DELETE SET NULL;

-- 2) Backfill --------------------------------------------------------------
-- vp_hierarchy: the VP's own active organisation.
UPDATE public.vp_hierarchy h
SET organisation_id = p.active_organisation_id
FROM public.profiles p
WHERE p.id = h.vp_id AND h.organisation_id IS NULL;

-- provisionen: prefer the deal's organisation (reservierung), else the VP's.
UPDATE public.provisionen pr
SET organisation_id = r.organisation_id
FROM public.reservierungen r
WHERE r.id = pr.deal_id AND pr.organisation_id IS NULL;
UPDATE public.provisionen pr
SET organisation_id = p.active_organisation_id
FROM public.profiles p
WHERE p.id = pr.vp_id AND pr.organisation_id IS NULL;

-- invites: 0 rows today — nothing to backfill.

-- 3) Indexes ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_vp_hierarchy_org ON public.vp_hierarchy (organisation_id);
CREATE INDEX IF NOT EXISTS idx_invites_org      ON public.invites (organisation_id);
CREATE INDEX IF NOT EXISTS idx_provisionen_org  ON public.provisionen (organisation_id);

-- 4) Default-org trigger (defaults organisation_id = current_org_id()) -------
DROP TRIGGER IF EXISTS trg_default_org ON public.vp_hierarchy;
CREATE TRIGGER trg_default_org BEFORE INSERT ON public.vp_hierarchy
  FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();
DROP TRIGGER IF EXISTS trg_default_org ON public.invites;
CREATE TRIGGER trg_default_org BEFORE INSERT ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();
DROP TRIGGER IF EXISTS trg_default_org ON public.provisionen;
CREATE TRIGGER trg_default_org BEFORE INSERT ON public.provisionen
  FOR EACH ROW EXECUTE FUNCTION public.set_default_org_id();

-- 5) RESTRICTIVE org isolation ---------------------------------------------
DROP POLICY IF EXISTS org_isolation ON public.vp_hierarchy;
CREATE POLICY org_isolation ON public.vp_hierarchy AS RESTRICTIVE FOR ALL
  USING (organisation_id = current_org_id() OR current_org_id() IS NULL)
  WITH CHECK (organisation_id = current_org_id() OR current_org_id() IS NULL);

DROP POLICY IF EXISTS org_isolation ON public.invites;
CREATE POLICY org_isolation ON public.invites AS RESTRICTIVE FOR ALL
  USING (organisation_id = current_org_id() OR current_org_id() IS NULL)
  WITH CHECK (organisation_id = current_org_id() OR current_org_id() IS NULL);

DROP POLICY IF EXISTS org_isolation ON public.provisionen;
CREATE POLICY org_isolation ON public.provisionen AS RESTRICTIVE FOR ALL
  USING (organisation_id = current_org_id() OR current_org_id() IS NULL)
  WITH CHECK (organisation_id = current_org_id() OR current_org_id() IS NULL);
