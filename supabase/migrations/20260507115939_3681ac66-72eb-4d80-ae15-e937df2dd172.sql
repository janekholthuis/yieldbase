
DROP POLICY IF EXISTS kunden_vp_insert ON public.kunden;

CREATE POLICY kunden_vp_insert ON public.kunden
  FOR INSERT TO authenticated
  WITH CHECK (
    vp_id = auth.uid()
    AND public.has_any_role(
      auth.uid(),
      ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter']::public.app_role[]
    )
  );
