DROP POLICY IF EXISTS okz_vp_update ON public.objekt_kunde_zuweisungen;
DROP POLICY IF EXISTS okz_vp_delete ON public.objekt_kunde_zuweisungen;
DROP POLICY IF EXISTS okz_vp_subtree_select ON public.objekt_kunde_zuweisungen;

CREATE POLICY okz_vp_subtree_select ON public.objekt_kunde_zuweisungen
FOR SELECT TO authenticated
USING (
  vp_id = auth.uid()
  OR is_descendant_of(auth.uid(), vp_id)
  OR (
    has_role(auth.uid(), 'vertriebsleiter'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = objekt_kunde_zuweisungen.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  )
);

CREATE POLICY okz_vp_update ON public.objekt_kunde_zuweisungen
FOR UPDATE TO authenticated
USING (
  vp_id = auth.uid()
  OR is_descendant_of(auth.uid(), vp_id)
  OR (
    has_role(auth.uid(), 'vertriebsleiter'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = objekt_kunde_zuweisungen.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  )
)
WITH CHECK (
  vp_id = auth.uid()
  OR is_descendant_of(auth.uid(), vp_id)
  OR (
    has_role(auth.uid(), 'vertriebsleiter'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = objekt_kunde_zuweisungen.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  )
);

CREATE POLICY okz_vp_delete ON public.objekt_kunde_zuweisungen
FOR DELETE TO authenticated
USING (
  vp_id = auth.uid()
  OR is_descendant_of(auth.uid(), vp_id)
  OR (
    has_role(auth.uid(), 'vertriebsleiter'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = objekt_kunde_zuweisungen.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  )
);