-- Cleanup test data
DELETE FROM public.vp_objekt_visibility;

-- Recursive ancestor-aware visibility check
CREATE OR REPLACE FUNCTION public.vp_sees_projekt(_projekt_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH RECURSIVE ancestors AS (
    SELECT vp_id, parent_vp_id
    FROM public.vp_hierarchy
    WHERE vp_id = auth.uid()
    UNION ALL
    SELECT h.vp_id, h.parent_vp_id
    FROM public.vp_hierarchy h
    JOIN ancestors a ON h.vp_id = a.parent_vp_id
  )
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.vp_objekt_visibility v
    WHERE v.projekt_id = _projekt_id
      AND v.vp_id IN (SELECT vp_id FROM ancestors)
  );
$function$;