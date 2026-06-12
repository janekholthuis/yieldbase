
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.zuweisung_status AS ENUM (
    'vorgeschlagen','zugewiesen','in_bearbeitung','abgeschlossen','abgelehnt'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.objekt_kunde_zuweisungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  einheit_id uuid NOT NULL,
  kunde_id uuid NOT NULL,
  vp_id uuid NOT NULL,
  status public.zuweisung_status NOT NULL DEFAULT 'zugewiesen',
  notiz text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (einheit_id, kunde_id)
);

CREATE INDEX IF NOT EXISTS okz_einheit_idx ON public.objekt_kunde_zuweisungen(einheit_id);
CREATE INDEX IF NOT EXISTS okz_kunde_idx   ON public.objekt_kunde_zuweisungen(kunde_id);
CREATE INDEX IF NOT EXISTS okz_vp_idx      ON public.objekt_kunde_zuweisungen(vp_id);

ALTER TABLE public.objekt_kunde_zuweisungen ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS okz_touch ON public.objekt_kunde_zuweisungen;
CREATE TRIGGER okz_touch BEFORE UPDATE ON public.objekt_kunde_zuweisungen
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS Policies
CREATE POLICY okz_admin_all ON public.objekt_kunde_zuweisungen
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY okz_support_select ON public.objekt_kunde_zuweisungen
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'support'));

CREATE POLICY okz_vp_subtree_select ON public.objekt_kunde_zuweisungen
  FOR SELECT TO authenticated
  USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

CREATE POLICY okz_vl_select ON public.objekt_kunde_zuweisungen
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = objekt_kunde_zuweisungen.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  );

CREATE POLICY okz_kunde_select ON public.objekt_kunde_zuweisungen
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.kunden k
    WHERE k.id = objekt_kunde_zuweisungen.kunde_id
      AND k.user_id = auth.uid()
  ));

CREATE POLICY okz_vp_insert ON public.objekt_kunde_zuweisungen
  FOR INSERT TO authenticated
  WITH CHECK (
    vp_id = auth.uid()
    AND public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter']::app_role[])
    AND EXISTS (
      SELECT 1 FROM public.kunden k
      WHERE k.id = kunde_id
        AND (k.vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), k.vp_id))
    )
  );

CREATE POLICY okz_vp_update ON public.objekt_kunde_zuweisungen
  FOR UPDATE TO authenticated
  USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id))
  WITH CHECK (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

CREATE POLICY okz_vp_delete ON public.objekt_kunde_zuweisungen
  FOR DELETE TO authenticated
  USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));
