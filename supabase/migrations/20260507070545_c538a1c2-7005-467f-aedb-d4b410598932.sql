-- ============================================================
-- 5b2: Kalkulations-Schema-Erweiterungen
-- ============================================================

-- 1. einheiten: neue Spalten
ALTER TABLE public.einheiten
  ADD COLUMN IF NOT EXISTS hausgeld_umlagefaehig numeric,
  ADD COLUMN IF NOT EXISTS hausgeld_nicht_umlagefaehig numeric,
  ADD COLUMN IF NOT EXISTS instandhaltungsruecklage numeric,
  ADD COLUMN IF NOT EXISTS sondereigentumsverwaltung numeric,
  ADD COLUMN IF NOT EXISTS grundstuecksanteil_qm numeric,
  ADD COLUMN IF NOT EXISTS grundstueckswert_anteil numeric,
  ADD COLUMN IF NOT EXISTS afa_satz numeric NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS erhaltungsaufwand numeric,
  ADD COLUMN IF NOT EXISTS bewegliche_wg jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. profiles: neue Spalten
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS persoenlicher_steuersatz numeric,
  ADD COLUMN IF NOT EXISTS kalkulations_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 3. admin_kalkulations_defaults: Singleton
CREATE TABLE IF NOT EXISTS public.admin_kalkulations_defaults (
  id boolean PRIMARY KEY DEFAULT true,
  standard_zins numeric NOT NULL DEFAULT 4.0,
  standard_tilgung numeric NOT NULL DEFAULT 2.0,
  standard_haltedauer integer NOT NULL DEFAULT 10,
  standard_afa numeric NOT NULL DEFAULT 2.0,
  standard_ek_prozent numeric NOT NULL DEFAULT 12.5,
  standard_wertsteigerung numeric NOT NULL DEFAULT 2.0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = true)
);

INSERT INTO public.admin_kalkulations_defaults (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_kalkulations_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS akd_authenticated_read ON public.admin_kalkulations_defaults;
CREATE POLICY akd_authenticated_read
  ON public.admin_kalkulations_defaults
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS akd_admin_write ON public.admin_kalkulations_defaults;
CREATE POLICY akd_admin_write
  ON public.admin_kalkulations_defaults
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER akd_touch_updated_at
  BEFORE UPDATE ON public.admin_kalkulations_defaults
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 4. kalkulationen
CREATE TABLE IF NOT EXISTS public.kalkulationen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id uuid NOT NULL REFERENCES public.kunden(id) ON DELETE CASCADE,
  einheit_id uuid NOT NULL REFERENCES public.einheiten(id) ON DELETE CASCADE,
  ersteller_vp_id uuid NOT NULL,
  zins numeric,
  tilgung numeric,
  haltedauer integer,
  ek_prozent numeric,
  ek_betrag numeric,
  wertsteigerung numeric,
  afa numeric,
  erhaltungsaufwand numeric,
  kaufnebenkosten_finanziert boolean NOT NULL DEFAULT false,
  steuersatz numeric,
  miete_override numeric,
  notiz text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS kalkulationen_kunde_einheit_idx
  ON public.kalkulationen (kunde_id, einheit_id);
CREATE INDEX IF NOT EXISTS kalkulationen_ersteller_idx
  ON public.kalkulationen (ersteller_vp_id);

ALTER TABLE public.kalkulationen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kalk_admin_all ON public.kalkulationen;
CREATE POLICY kalk_admin_all
  ON public.kalkulationen
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS kalk_vp_self ON public.kalkulationen;
CREATE POLICY kalk_vp_self
  ON public.kalkulationen
  FOR SELECT TO authenticated
  USING (ersteller_vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), ersteller_vp_id));

DROP POLICY IF EXISTS kalk_vl_subtree ON public.kalkulationen;
CREATE POLICY kalk_vl_subtree
  ON public.kalkulationen
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = kalkulationen.ersteller_vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS kalk_kunde_self ON public.kalkulationen;
CREATE POLICY kalk_kunde_self
  ON public.kalkulationen
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kunden k
      WHERE k.id = kalkulationen.kunde_id AND k.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS kalk_vp_write ON public.kalkulationen;
CREATE POLICY kalk_vp_write
  ON public.kalkulationen
  FOR INSERT TO authenticated
  WITH CHECK (
    ersteller_vp_id = auth.uid()
    AND public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::app_role[])
  );

DROP POLICY IF EXISTS kalk_vp_update ON public.kalkulationen;
CREATE POLICY kalk_vp_update
  ON public.kalkulationen
  FOR UPDATE TO authenticated
  USING (ersteller_vp_id = auth.uid())
  WITH CHECK (ersteller_vp_id = auth.uid());

DROP POLICY IF EXISTS kalk_vp_delete ON public.kalkulationen;
CREATE POLICY kalk_vp_delete
  ON public.kalkulationen
  FOR DELETE TO authenticated
  USING (ersteller_vp_id = auth.uid());

CREATE TRIGGER kalk_touch_updated_at
  BEFORE UPDATE ON public.kalkulationen
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();