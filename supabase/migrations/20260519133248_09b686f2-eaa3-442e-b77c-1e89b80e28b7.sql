
DROP VIEW IF EXISTS public.v_case_for_vp CASCADE;
DROP VIEW IF EXISTS public.v_case_for_finanzierer CASCADE;
DROP VIEW IF EXISTS public.v_case_kommentare_pseudonym CASCADE;

CREATE OR REPLACE FUNCTION public.request_finanzierung(
  p_kunde_id uuid,
  p_einheit_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_projekt_id uuid;
  v_finanzierer_ids uuid[];
  v_counter integer;
  v_chosen_finanzierer uuid;
  v_case_id uuid;
  v_kunde_vp uuid;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'support')
    OR public.has_role(auth.uid(), 'vp_l1')
    OR public.has_role(auth.uid(), 'vp_l2')
    OR public.has_role(auth.uid(), 'vp_l3')
    OR public.has_role(auth.uid(), 'vertriebsleiter')
  ) THEN
    RAISE EXCEPTION 'Nicht berechtigt' USING ERRCODE = '42501';
  END IF;

  SELECT vp_id INTO v_kunde_vp FROM public.kunden WHERE id = p_kunde_id;
  IF v_kunde_vp IS NULL THEN
    RAISE EXCEPTION 'Kunde nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.can_access_kunde(p_kunde_id) THEN
    RAISE EXCEPTION 'Kein Zugriff auf diesen Kunden' USING ERRCODE = '42501';
  END IF;

  SELECT projekt_id INTO v_projekt_id FROM public.einheiten WHERE id = p_einheit_id;
  IF v_projekt_id IS NULL THEN
    RAISE EXCEPTION 'Einheit nicht gefunden' USING ERRCODE = 'P0002';
  END IF;

  SELECT finanzierer_ids, finanzierer_round_robin_counter
    INTO v_finanzierer_ids, v_counter
    FROM public.projekte WHERE id = v_projekt_id
    FOR UPDATE;

  IF v_finanzierer_ids IS NULL OR array_length(v_finanzierer_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Kein Finanzierer-Pool für dieses Projekt hinterlegt' USING ERRCODE = 'P0002';
  END IF;

  v_chosen_finanzierer := v_finanzierer_ids[(v_counter % array_length(v_finanzierer_ids, 1)) + 1];

  UPDATE public.projekte
    SET finanzierer_round_robin_counter = v_counter + 1
    WHERE id = v_projekt_id;

  INSERT INTO public.finanzierungs_cases
    (kunde_id, einheit_id, vp_id, finanzierer_id, status, created_by, assigned_at)
  VALUES
    (p_kunde_id, p_einheit_id, v_kunde_vp, v_chosen_finanzierer, 'neu'::case_status,
     auth.uid(), now())
  RETURNING id INTO v_case_id;

  INSERT INTO public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
  VALUES ('case.created', 'finanzierungs_case', v_case_id, p_kunde_id, auth.uid(),
          jsonb_build_object(
            'finanzierer_id', v_chosen_finanzierer,
            'einheit_id', p_einheit_id,
            'vp_id', v_kunde_vp
          ));

  RETURN v_case_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_finanzierung(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_finanzierung(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.request_finanzierung(uuid, uuid) TO authenticated;

CREATE VIEW public.v_case_for_vp
WITH (security_invoker = true) AS
SELECT
  c.id, c.kunde_id, c.einheit_id, c.vp_id, c.status,
  c.zins_satz, c.tilgung_initial, c.laufzeit_jahre, c.sondertilgung_pa,
  c.monatliche_rate, c.finanzierungs_summe, c.gesamtkosten,
  c.notiz_finanzierer,
  c.created_at, c.assigned_at,
  c.offer_filled_at, c.offer_accepted_at, c.final_status_at,
  'Finanzierungspartner'::text AS finanzierer_label
FROM public.finanzierungs_cases c;

CREATE VIEW public.v_case_for_finanzierer
WITH (security_invoker = true) AS
SELECT
  c.id, c.kunde_id, c.einheit_id, c.finanzierer_id, c.status,
  c.zins_satz, c.tilgung_initial, c.laufzeit_jahre, c.sondertilgung_pa,
  c.monatliche_rate, c.finanzierungs_summe, c.gesamtkosten,
  c.notiz_finanzierer,
  c.created_at, c.assigned_at,
  c.offer_filled_at, c.offer_accepted_at, c.final_status_at,
  'Vertriebspartner'::text AS vp_label
FROM public.finanzierungs_cases c
WHERE c.finanzierer_id = auth.uid();

CREATE VIEW public.v_case_kommentare_pseudonym
WITH (security_invoker = true) AS
SELECT
  k.id,
  k.case_id,
  k.text,
  k.created_at,
  k.author_id,
  CASE
    WHEN public.has_role(k.author_id, 'admin') OR public.has_role(k.author_id, 'support')
      THEN COALESCE(NULLIF(trim(coalesce(p.vorname,'') || ' ' || coalesce(p.nachname,'')), ''), p.name, p.email, 'Support')
    WHEN public.has_role(k.author_id, 'finanzierer')
      THEN 'Finanzierungspartner'
    WHEN public.has_role(k.author_id, 'vp_l1')
      OR public.has_role(k.author_id, 'vp_l2')
      OR public.has_role(k.author_id, 'vp_l3')
      OR public.has_role(k.author_id, 'vertriebsleiter')
      THEN 'Vertriebspartner'
    ELSE COALESCE(NULLIF(trim(coalesce(p.vorname,'') || ' ' || coalesce(p.nachname,'')), ''), p.name, 'Nutzer')
  END AS author_label
FROM public.finanzierungs_case_kommentare k
JOIN public.profiles p ON p.id = k.author_id;

GRANT SELECT ON public.v_case_for_vp TO authenticated;
GRANT SELECT ON public.v_case_for_finanzierer TO authenticated;
GRANT SELECT ON public.v_case_kommentare_pseudonym TO authenticated;
