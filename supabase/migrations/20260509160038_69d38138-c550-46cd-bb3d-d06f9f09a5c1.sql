
-- 1. reservierungen: neue Felder
ALTER TABLE public.reservierungen
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS reservierungsgebuehr numeric NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS bank_kontoinhaber text,
  ADD COLUMN IF NOT EXISTS bank_iban text,
  ADD COLUMN IF NOT EXISTS bank_bic text,
  ADD COLUMN IF NOT EXISTS signatur_data_url text,
  ADD COLUMN IF NOT EXISTS audit_user_agent text,
  ADD COLUMN IF NOT EXISTS audit_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS bemerkungen text;

-- 2. projekte: Bankverbindung
ALTER TABLE public.projekte
  ADD COLUMN IF NOT EXISTS bank_kontoinhaber text,
  ADD COLUMN IF NOT EXISTS bank_iban text,
  ADD COLUMN IF NOT EXISTS bank_bic text;

-- 3. RLS reservierungen: Insert/Update für VP + Subtree, Select für Kunde
DROP POLICY IF EXISTS res_vp_insert ON public.reservierungen;
CREATE POLICY res_vp_insert ON public.reservierungen
  FOR INSERT TO authenticated
  WITH CHECK (
    (vp_id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter']::app_role[])
  );

DROP POLICY IF EXISTS res_vp_update ON public.reservierungen;
CREATE POLICY res_vp_update ON public.reservierungen
  FOR UPDATE TO authenticated
  USING (
    (vp_id = auth.uid())
    OR public.is_descendant_of(auth.uid(), vp_id)
    OR (public.has_role(auth.uid(), 'vertriebsleiter'::app_role)
        AND EXISTS (SELECT 1 FROM public.vp_hierarchy h
                    WHERE h.vp_id = reservierungen.vp_id
                      AND h.vertriebsleiter_id = auth.uid()))
  )
  WITH CHECK (
    (vp_id = auth.uid())
    OR public.is_descendant_of(auth.uid(), vp_id)
    OR (public.has_role(auth.uid(), 'vertriebsleiter'::app_role)
        AND EXISTS (SELECT 1 FROM public.vp_hierarchy h
                    WHERE h.vp_id = reservierungen.vp_id
                      AND h.vertriebsleiter_id = auth.uid()))
  );

DROP POLICY IF EXISTS res_kunde_select ON public.reservierungen;
CREATE POLICY res_kunde_select ON public.reservierungen
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kunden k
      WHERE k.id = reservierungen.kunde_id
        AND k.user_id = auth.uid()
    )
  );

-- 4. Storage-Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reservierungen', 'reservierungen', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage-Policies (Pfad-Konvention: <einheit_id>/<reservierung_id>.pdf)
DROP POLICY IF EXISTS reservierungen_admin_all ON storage.objects;
CREATE POLICY reservierungen_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'reservierungen' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'reservierungen' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS reservierungen_vp_write ON storage.objects;
CREATE POLICY reservierungen_vp_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'reservierungen'
    AND public.has_any_role(auth.uid(),
        ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter']::app_role[])
  );

DROP POLICY IF EXISTS reservierungen_vp_read ON storage.objects;
CREATE POLICY reservierungen_vp_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reservierungen'
    AND public.has_any_role(auth.uid(),
        ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter','support']::app_role[])
  );

DROP POLICY IF EXISTS reservierungen_kunde_read ON storage.objects;
CREATE POLICY reservierungen_kunde_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'reservierungen'
    AND EXISTS (
      SELECT 1 FROM public.reservierungen r
      JOIN public.kunden k ON k.id = r.kunde_id
      WHERE k.user_id = auth.uid()
        AND r.pdf_url LIKE '%' || storage.objects.name
    )
  );
