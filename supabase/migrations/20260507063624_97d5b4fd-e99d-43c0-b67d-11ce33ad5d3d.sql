
-- 1. Enum für Projekt-Typ
CREATE TYPE public.projekt_typ AS ENUM ('mfh', 'etw_einzeln');

-- 2. Enum für Dokument-Kategorie
CREATE TYPE public.dokument_kategorie AS ENUM (
  'grundriss', 'expose', 'energieausweis', 'teilungserklaerung',
  'mietvertrag', 'kaufvertrag', 'protokoll', 'sonstiges'
);

-- 3. projekte erweitern
ALTER TABLE public.projekte
  ADD COLUMN name text,
  ADD COLUMN stadt text,
  ADD COLUMN plz text,
  ADD COLUMN bundesland text,
  ADD COLUMN bautraeger text,
  ADD COLUMN projekt_typ public.projekt_typ NOT NULL DEFAULT 'mfh',
  ADD COLUMN cover_image_url text,
  ADD COLUMN mietrendite_brutto numeric(6,3);

-- 4. einheiten erweitern
ALTER TABLE public.einheiten
  ADD COLUMN vermietet boolean NOT NULL DEFAULT false,
  ADD COLUMN mietvertrag_ende date,
  ADD COLUMN balkon boolean NOT NULL DEFAULT false,
  ADD COLUMN keller boolean NOT NULL DEFAULT false,
  ADD COLUMN aufzug boolean NOT NULL DEFAULT false,
  ADD COLUMN kalkulation jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 5. objekt_bilder
CREATE TABLE public.objekt_bilder (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id uuid REFERENCES public.projekte(id) ON DELETE CASCADE,
  einheit_id uuid REFERENCES public.einheiten(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  sort_order int NOT NULL DEFAULT 0,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bild_target_check CHECK (
    (projekt_id IS NOT NULL AND einheit_id IS NULL)
    OR (projekt_id IS NULL AND einheit_id IS NOT NULL)
  )
);
CREATE INDEX idx_objekt_bilder_projekt ON public.objekt_bilder(projekt_id);
CREATE INDEX idx_objekt_bilder_einheit ON public.objekt_bilder(einheit_id);

-- 6. objekt_dokumente
CREATE TABLE public.objekt_dokumente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id uuid REFERENCES public.projekte(id) ON DELETE CASCADE,
  einheit_id uuid REFERENCES public.einheiten(id) ON DELETE CASCADE,
  kategorie public.dokument_kategorie NOT NULL,
  url text NOT NULL,
  dateiname text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dok_target_check CHECK (
    (projekt_id IS NOT NULL AND einheit_id IS NULL)
    OR (projekt_id IS NULL AND einheit_id IS NOT NULL)
  )
);
CREATE INDEX idx_objekt_dok_projekt ON public.objekt_dokumente(projekt_id);
CREATE INDEX idx_objekt_dok_einheit ON public.objekt_dokumente(einheit_id);

-- 7. vp_objekt_visibility (Deny-List)
CREATE TABLE public.vp_objekt_visibility (
  vp_id uuid NOT NULL,
  projekt_id uuid NOT NULL REFERENCES public.projekte(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  PRIMARY KEY (vp_id, projekt_id)
);

-- 8. Helper: Sichtbarkeit für Finanzierer
CREATE OR REPLACE FUNCTION public.finanzierer_sees_projekt(_projekt_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.finanzierungs_cases c
    JOIN public.einheiten e ON e.id = c.einheit_id
    WHERE c.finanzierer_id = auth.uid() AND e.projekt_id = _projekt_id
  );
$$;

CREATE OR REPLACE FUNCTION public.finanzierer_sees_einheit(_einheit_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.finanzierungs_cases c
    WHERE c.finanzierer_id = auth.uid() AND c.einheit_id = _einheit_id
  );
$$;

-- 9. Helper: VP darf Projekt sehen (nicht in Deny-List)
CREATE OR REPLACE FUNCTION public.vp_sees_projekt(_projekt_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.vp_objekt_visibility
    WHERE vp_id = auth.uid() AND projekt_id = _projekt_id
  );
$$;

-- 10. RLS projekte: alte SELECT/WRITE droppen, neue setzen
DROP POLICY IF EXISTS projekte_internal_select ON public.projekte;
DROP POLICY IF EXISTS projekte_admin_write ON public.projekte;

CREATE POLICY projekte_admin_or_support_write ON public.projekte
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

CREATE POLICY projekte_admin_support_select ON public.projekte
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support') OR has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY projekte_vp_select ON public.projekte
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::app_role[])
    AND public.vp_sees_projekt(id)
  );

CREATE POLICY projekte_finanzierer_select ON public.projekte
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'finanzierer')
    AND public.finanzierer_sees_projekt(id)
  );

-- 11. RLS einheiten
DROP POLICY IF EXISTS einheiten_internal_select ON public.einheiten;
DROP POLICY IF EXISTS einheiten_admin_write ON public.einheiten;

CREATE POLICY einheiten_admin_or_support_write ON public.einheiten
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

CREATE POLICY einheiten_admin_support_select ON public.einheiten
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support') OR has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY einheiten_vp_select ON public.einheiten
  FOR SELECT TO authenticated
  USING (
    has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::app_role[])
    AND public.vp_sees_projekt(projekt_id)
  );

CREATE POLICY einheiten_finanzierer_select ON public.einheiten
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'finanzierer')
    AND public.finanzierer_sees_einheit(id)
  );

-- 12. RLS objekt_bilder
CREATE POLICY bilder_admin_support_write ON public.objekt_bilder
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

CREATE POLICY bilder_select ON public.objekt_bilder
  FOR SELECT TO authenticated
  USING (
    (projekt_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projekte p WHERE p.id = projekt_id))
    OR (einheit_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.einheiten e WHERE e.id = einheit_id))
  );

-- 13. RLS objekt_dokumente
CREATE POLICY dok_admin_support_write ON public.objekt_dokumente
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'));

CREATE POLICY dok_select ON public.objekt_dokumente
  FOR SELECT TO authenticated
  USING (
    (projekt_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.projekte p WHERE p.id = projekt_id))
    OR (einheit_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.einheiten e WHERE e.id = einheit_id))
  );

-- 14. RLS vp_objekt_visibility
CREATE POLICY visibility_admin_all ON public.vp_objekt_visibility
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY visibility_vl_all ON public.vp_objekt_visibility
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'vertriebsleiter'))
  WITH CHECK (has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY visibility_self_select ON public.vp_objekt_visibility
  FOR SELECT TO authenticated
  USING (vp_id = auth.uid());

-- 15. updated_at Trigger für neue Felder
CREATE TRIGGER touch_projekte BEFORE UPDATE ON public.projekte
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_einheiten BEFORE UPDATE ON public.einheiten
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 16. Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('objekt-bilder', 'objekt-bilder', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('objekt-dokumente', 'objekt-dokumente', false)
  ON CONFLICT (id) DO NOTHING;

-- 17. Storage Policies: objekt-bilder (public read, admin/support write)
CREATE POLICY "objekt-bilder public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'objekt-bilder');

CREATE POLICY "objekt-bilder admin/support write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'objekt-bilder'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );

CREATE POLICY "objekt-bilder admin/support update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'objekt-bilder'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );

CREATE POLICY "objekt-bilder admin/support delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'objekt-bilder'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );

-- 18. Storage Policies: objekt-dokumente (privat, RLS-gesteuert)
CREATE POLICY "objekt-dokumente authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'objekt-dokumente');

CREATE POLICY "objekt-dokumente admin/support write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'objekt-dokumente'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );

CREATE POLICY "objekt-dokumente admin/support update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'objekt-dokumente'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );

CREATE POLICY "objekt-dokumente admin/support delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'objekt-dokumente'
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'support'))
  );
