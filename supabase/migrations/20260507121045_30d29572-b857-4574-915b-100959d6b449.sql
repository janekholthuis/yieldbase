
DROP POLICY IF EXISTS "objekt-dokumente authenticated read" ON storage.objects;

CREATE POLICY "objekt-dokumente scoped read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'objekt-dokumente'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'support'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.objekt_dokumente d
      WHERE d.url LIKE '%' || storage.objects.name || '%'
    )
  )
);

CREATE POLICY kommentare_context_participants_select
ON public.kommentare FOR SELECT TO authenticated
USING (
  (kontext_typ = 'ticket' AND EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = kommentare.kontext_id))
  OR (kontext_typ = 'case' AND EXISTS (SELECT 1 FROM public.finanzierungs_cases c WHERE c.id = kommentare.kontext_id))
  OR (kontext_typ = 'reservierung' AND EXISTS (SELECT 1 FROM public.reservierungen r WHERE r.id = kommentare.kontext_id))
  OR (kontext_typ = 'kunde' AND EXISTS (SELECT 1 FROM public.kunden k WHERE k.id = kommentare.kontext_id))
  OR (kontext_typ = 'objekt' AND EXISTS (SELECT 1 FROM public.projekte p WHERE p.id = kommentare.kontext_id))
  OR (kontext_typ = 'einheit' AND EXISTS (SELECT 1 FROM public.einheiten e WHERE e.id = kommentare.kontext_id))
);
