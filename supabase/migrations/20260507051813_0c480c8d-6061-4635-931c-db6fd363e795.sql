
-- 1. Spalte ergänzen (Tabelle ist leer, daher direkt NOT NULL möglich nach Backfill — hier leer => direkt)
ALTER TABLE public.vp_hierarchy
  ADD COLUMN vertriebsleiter_id uuid NOT NULL;

CREATE INDEX idx_vp_hierarchy_vertriebsleiter ON public.vp_hierarchy(vertriebsleiter_id);

-- 2. Trigger-Funktion erweitern: VL-Vererbung + Role-Check
CREATE OR REPLACE FUNCTION public.validate_vp_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  parent_rate numeric(6,3);
  parent_level smallint;
  parent_vl uuid;
BEGIN
  -- Vertriebsleiter-User muss Rolle 'vertriebsleiter' haben
  IF NOT public.has_role(NEW.vertriebsleiter_id, 'vertriebsleiter') THEN
    RAISE EXCEPTION 'vertriebsleiter_id (%) hat nicht die Rolle vertriebsleiter', NEW.vertriebsleiter_id;
  END IF;

  IF NEW.parent_vp_id IS NULL THEN
    IF NEW.level <> 1 THEN
      RAISE EXCEPTION 'VP ohne parent_vp_id muss level=1 sein';
    END IF;
    RETURN NEW;
  END IF;

  SELECT commission_rate, level, vertriebsleiter_id
    INTO parent_rate, parent_level, parent_vl
  FROM public.vp_hierarchy WHERE vp_id = NEW.parent_vp_id;

  IF parent_rate IS NULL THEN
    RAISE EXCEPTION 'Parent-VP nicht gefunden';
  END IF;

  IF NEW.commission_rate > parent_rate THEN
    RAISE EXCEPTION 'Sub-Provision (%) darf Parent-Provision (%) nicht übersteigen', NEW.commission_rate, parent_rate;
  END IF;

  IF NEW.level <> parent_level + 1 THEN
    RAISE EXCEPTION 'Level muss parent_level+1 sein (parent=%, neu=%)', parent_level, NEW.level;
  END IF;

  IF NEW.vertriebsleiter_id <> parent_vl THEN
    RAISE EXCEPTION 'vertriebsleiter_id (%) muss vom Parent geerbt werden (%)', NEW.vertriebsleiter_id, parent_vl;
  END IF;

  RETURN NEW;
END;
$function$;

-- Trigger anlegen falls noch nicht vorhanden
DROP TRIGGER IF EXISTS trg_validate_vp_hierarchy ON public.vp_hierarchy;
CREATE TRIGGER trg_validate_vp_hierarchy
  BEFORE INSERT OR UPDATE ON public.vp_hierarchy
  FOR EACH ROW EXECUTE FUNCTION public.validate_vp_hierarchy();

-- 3. is_in_my_subtree: VL-Zweig scoped auf eigene VPs
CREATE OR REPLACE FUNCTION public.is_in_my_subtree(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    _target = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'vertriebsleiter')
      AND _target IN (
        SELECT vp_id FROM public.vp_hierarchy
        WHERE vertriebsleiter_id = auth.uid()
      )
    )
    OR public.is_descendant_of(auth.uid(), _target);
$function$;

-- 4. RLS-Policies neu fassen — VL-Selects scoped

-- vp_hierarchy
DROP POLICY IF EXISTS vp_hier_vl_select ON public.vp_hierarchy;
CREATE POLICY vp_hier_vl_select ON public.vp_hierarchy
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND vertriebsleiter_id = auth.uid()
  );

-- profiles
DROP POLICY IF EXISTS profiles_vl_select ON public.profiles;
CREATE POLICY profiles_vl_select ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND (
      id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.vp_hierarchy h
        WHERE h.vp_id = profiles.id AND h.vertriebsleiter_id = auth.uid()
      )
    )
  );

-- kunden
DROP POLICY IF EXISTS kunden_vl_select ON public.kunden;
CREATE POLICY kunden_vl_select ON public.kunden
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = kunden.vp_id AND h.vertriebsleiter_id = auth.uid()
    )
  );

-- reservierungen
DROP POLICY IF EXISTS res_vl_select ON public.reservierungen;
CREATE POLICY res_vl_select ON public.reservierungen
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = reservierungen.vp_id AND h.vertriebsleiter_id = auth.uid()
    )
  );

-- finanzierungs_cases
DROP POLICY IF EXISTS case_vl_select ON public.finanzierungs_cases;
CREATE POLICY case_vl_select ON public.finanzierungs_cases
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = finanzierungs_cases.vp_id AND h.vertriebsleiter_id = auth.uid()
    )
  );

-- provisionen
DROP POLICY IF EXISTS prov_vl_select ON public.provisionen;
CREATE POLICY prov_vl_select ON public.provisionen
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = provisionen.vp_id AND h.vertriebsleiter_id = auth.uid()
    )
  );

-- 5. Invites: vertriebsleiter_id Spalte
ALTER TABLE public.invites
  ADD COLUMN vertriebsleiter_id uuid;

-- VL-Invite-Policy verschärfen: bei VP-Invite muss vertriebsleiter_id = auth.uid() sein
DROP POLICY IF EXISTS invites_vl_insert ON public.invites;
CREATE POLICY invites_vl_insert ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND public.has_role(auth.uid(),'vertriebsleiter')
    AND role = ANY (ARRAY['vp_l1'::app_role,'kunde'::app_role])
    AND (
      role = 'kunde'
      OR vertriebsleiter_id = auth.uid()
    )
  );
