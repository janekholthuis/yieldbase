DROP POLICY IF EXISTS okz_vp_insert ON public.objekt_kunde_zuweisungen;

CREATE POLICY okz_insert_allowed ON public.objekt_kunde_zuweisungen
FOR INSERT TO authenticated
WITH CHECK (
  vp_id = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      has_any_role(auth.uid(), ARRAY['vp_l1'::app_role,'vp_l2'::app_role,'vp_l3'::app_role,'vertriebsleiter'::app_role])
      AND EXISTS (
        SELECT 1 FROM public.kunden k
        WHERE k.id = objekt_kunde_zuweisungen.kunde_id
          AND (
            k.vp_id = auth.uid()
            OR is_descendant_of(auth.uid(), k.vp_id)
            OR (
              has_role(auth.uid(), 'vertriebsleiter'::app_role)
              AND EXISTS (
                SELECT 1 FROM public.vp_hierarchy h
                WHERE h.vp_id = k.vp_id AND h.vertriebsleiter_id = auth.uid()
              )
            )
          )
      )
    )
  )
);