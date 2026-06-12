
-- ============================================================
-- 1) Enum case_status erweitern (idempotent)
-- ============================================================
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'in_bearbeitung';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'unterlagen_fehlen';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'angebot_vorhanden';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'angebot_beim_kunden';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'angebot_akzeptiert';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'bewilligt';
ALTER TYPE public.case_status ADD VALUE IF NOT EXISTS 'storniert';

-- ============================================================
-- 2) finanzierungs_cases: neue Spalten
-- ============================================================
ALTER TABLE public.finanzierungs_cases
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS zins_satz numeric,
  ADD COLUMN IF NOT EXISTS tilgung_initial numeric,
  ADD COLUMN IF NOT EXISTS laufzeit_jahre integer,
  ADD COLUMN IF NOT EXISTS sondertilgung_pa numeric,
  ADD COLUMN IF NOT EXISTS monatliche_rate numeric,
  ADD COLUMN IF NOT EXISTS finanzierungs_summe numeric,
  ADD COLUMN IF NOT EXISTS gesamtkosten numeric,
  ADD COLUMN IF NOT EXISTS notiz_finanzierer text,
  ADD COLUMN IF NOT EXISTS offer_filled_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS final_status_at timestamptz;

-- vp_id: spec sagt VP-Insert über RPC, vp_id soll trotzdem korrekt sein:
-- Bestehende NOT NULL Constraint bleibt — die RPC füllt vp_id aus dem Kunden.

-- ============================================================
-- 3) projekte: Finanzierer-Pool + Round-Robin
-- ============================================================
ALTER TABLE public.projekte
  ADD COLUMN IF NOT EXISTS finanzierer_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS finanzierer_round_robin_counter integer NOT NULL DEFAULT 0;

-- ============================================================
-- 4) Kommentare-Tabelle
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finanzierungs_case_kommentare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.finanzierungs_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id),
  text text NOT NULL CHECK (length(trim(text)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fck_case_created
  ON public.finanzierungs_case_kommentare (case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fck_author
  ON public.finanzierungs_case_kommentare (author_id);

ALTER TABLE public.finanzierungs_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzierungs_case_kommentare ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5) Helper-Funktion: kann auth.uid() den Case sehen?
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_access_case(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.finanzierungs_cases c
    WHERE c.id = _case_id
      AND (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'support')
        OR (public.has_role(auth.uid(), 'finanzierer') AND c.finanzierer_id = auth.uid())
        OR c.vp_id = auth.uid()
        OR public.is_descendant_of(auth.uid(), c.vp_id)
        OR (
          public.has_role(auth.uid(), 'vertriebsleiter')
          AND EXISTS (
            SELECT 1 FROM public.vp_hierarchy h
            WHERE h.vp_id = c.vp_id AND h.vertriebsleiter_id = auth.uid()
          )
        )
      )
  );
$$;

-- ============================================================
-- 6) RLS-Policies finanzierungs_cases
-- ============================================================
-- Bestehende Policies droppen (wir bauen sie sauber neu)
DROP POLICY IF EXISTS case_admin_all ON public.finanzierungs_cases;
DROP POLICY IF EXISTS case_finanzierer_select ON public.finanzierungs_cases;
DROP POLICY IF EXISTS case_finanzierer_update_status ON public.finanzierungs_cases;
DROP POLICY IF EXISTS case_vl_select ON public.finanzierungs_cases;
DROP POLICY IF EXISTS case_vp_subtree ON public.finanzierungs_cases;

CREATE POLICY case_admin_support_all ON public.finanzierungs_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY case_vp_subtree_select ON public.finanzierungs_cases
  FOR SELECT TO authenticated
  USING (
    vp_id = auth.uid()
    OR public.is_descendant_of(auth.uid(), vp_id)
  );

CREATE POLICY case_vl_select ON public.finanzierungs_cases
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'vertriebsleiter')
    AND EXISTS (
      SELECT 1 FROM public.vp_hierarchy h
      WHERE h.vp_id = finanzierungs_cases.vp_id
        AND h.vertriebsleiter_id = auth.uid()
    )
  );

CREATE POLICY case_finanzierer_select ON public.finanzierungs_cases
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'finanzierer') AND finanzierer_id = auth.uid());

-- VP/VL UPDATE (Spaltenfilter via Trigger; siehe unten)
CREATE POLICY case_vp_update ON public.finanzierungs_cases
  FOR UPDATE TO authenticated
  USING (
    vp_id = auth.uid()
    OR public.is_descendant_of(auth.uid(), vp_id)
    OR (
      public.has_role(auth.uid(), 'vertriebsleiter')
      AND EXISTS (
        SELECT 1 FROM public.vp_hierarchy h
        WHERE h.vp_id = finanzierungs_cases.vp_id
          AND h.vertriebsleiter_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    vp_id = auth.uid()
    OR public.is_descendant_of(auth.uid(), vp_id)
    OR (
      public.has_role(auth.uid(), 'vertriebsleiter')
      AND EXISTS (
        SELECT 1 FROM public.vp_hierarchy h
        WHERE h.vp_id = finanzierungs_cases.vp_id
          AND h.vertriebsleiter_id = auth.uid()
      )
    )
  );

-- Finanzierer UPDATE (Spaltenfilter via Trigger)
CREATE POLICY case_finanzierer_update ON public.finanzierungs_cases
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'finanzierer') AND finanzierer_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'finanzierer') AND finanzierer_id = auth.uid());

-- INSERT: nur über RPC (SECURITY DEFINER). Keine direkte Insert-Policy.

-- ============================================================
-- 7) Trigger: Spaltenschutz beim Update
-- ============================================================
CREATE OR REPLACE FUNCTION public.cases_protect_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'support');
  v_is_fin boolean := public.has_role(v_uid, 'finanzierer') AND NEW.finanzierer_id = v_uid;
  v_is_vp boolean := (
    OLD.vp_id = v_uid
    OR public.is_descendant_of(v_uid, OLD.vp_id)
    OR (
      public.has_role(v_uid, 'vertriebsleiter')
      AND EXISTS (
        SELECT 1 FROM public.vp_hierarchy h
        WHERE h.vp_id = OLD.vp_id AND h.vertriebsleiter_id = v_uid
      )
    )
  );
BEGIN
  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Identitätsfelder dürfen nie verändert werden (außer Admin)
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.kunde_id IS DISTINCT FROM OLD.kunde_id
     OR NEW.einheit_id IS DISTINCT FROM OLD.einheit_id
     OR NEW.vp_id IS DISTINCT FROM OLD.vp_id
     OR NEW.finanzierer_id IS DISTINCT FROM OLD.finanzierer_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.assigned_at IS DISTINCT FROM OLD.assigned_at
  THEN
    RAISE EXCEPTION 'Identitäts-/Zuweisungs-Felder dürfen nicht geändert werden' USING ERRCODE = '42501';
  END IF;

  IF v_is_fin THEN
    -- Finanzierer darf NUR: status, Eckdaten, notiz_finanzierer, offer_*_at, final_status_at
    IF NEW.kreditverpflichtungen_monatlich IS DISTINCT FROM OLD.kreditverpflichtungen_monatlich
       -- alle übrigen Felder existieren nicht auf Case, sodass diese Liste klein bleibt
    THEN
      RAISE EXCEPTION 'Finanzierer darf dieses Feld nicht ändern' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF v_is_vp THEN
    -- VP darf NUR status setzen (auf angebot_beim_kunden / angebot_akzeptiert)
    -- alle anderen Spalten müssen unverändert bleiben
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status NOT IN ('angebot_beim_kunden'::case_status, 'angebot_akzeptiert'::case_status)
    THEN
      RAISE EXCEPTION 'VP darf nur angebot_beim_kunden oder angebot_akzeptiert setzen' USING ERRCODE = '42501';
    END IF;

    IF NEW.zins_satz IS DISTINCT FROM OLD.zins_satz
       OR NEW.tilgung_initial IS DISTINCT FROM OLD.tilgung_initial
       OR NEW.laufzeit_jahre IS DISTINCT FROM OLD.laufzeit_jahre
       OR NEW.sondertilgung_pa IS DISTINCT FROM OLD.sondertilgung_pa
       OR NEW.monatliche_rate IS DISTINCT FROM OLD.monatliche_rate
       OR NEW.finanzierungs_summe IS DISTINCT FROM OLD.finanzierungs_summe
       OR NEW.gesamtkosten IS DISTINCT FROM OLD.gesamtkosten
       OR NEW.notiz_finanzierer IS DISTINCT FROM OLD.notiz_finanzierer
       OR NEW.offer_filled_at IS DISTINCT FROM OLD.offer_filled_at
    THEN
      RAISE EXCEPTION 'VP darf Angebots-Eckdaten nicht ändern' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Nicht berechtigt' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_cases_protect_update ON public.finanzierungs_cases;
CREATE TRIGGER trg_cases_protect_update
  BEFORE UPDATE ON public.finanzierungs_cases
  FOR EACH ROW EXECUTE FUNCTION public.cases_protect_update_columns();

-- ============================================================
-- 8) RLS-Policies finanzierungs_case_kommentare
-- ============================================================
CREATE POLICY fck_select ON public.finanzierungs_case_kommentare
  FOR SELECT TO authenticated
  USING (public.can_access_case(case_id));

CREATE POLICY fck_insert ON public.finanzierungs_case_kommentare
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_access_case(case_id));

CREATE POLICY fck_admin_all ON public.finanzierungs_case_kommentare
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));
