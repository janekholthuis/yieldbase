CREATE OR REPLACE FUNCTION public.cases_protect_update_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_is_fin boolean;
  v_is_vp boolean;
BEGIN
  -- Bypass-Pfad 1: Service-Role / Migration (kein Auth-Kontext)
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Bypass-Pfad 2: SECURITY-DEFINER-RPC mit explizitem System-Bypass
  -- Custom-GUC-Pattern (LOCAL = nur in aktueller Transaktion).
  -- Nutzung: PERFORM set_config('app.cases_rpc_bypass', 'true', true);
  -- vor System-Operationen, die den Spaltenschutz nicht durchlaufen sollen.
  IF current_setting('app.cases_rpc_bypass', true) = 'true' THEN
    RETURN NEW;
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'support');
  v_is_fin   := public.has_role(v_uid, 'finanzierer') AND NEW.finanzierer_id = v_uid;
  v_is_vp    := (
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

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Identitätsfelder dürfen nie verändert werden (außer Admin / Bypass)
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
    IF NEW.kreditverpflichtungen_monatlich IS DISTINCT FROM OLD.kreditverpflichtungen_monatlich
    THEN
      RAISE EXCEPTION 'Finanzierer darf dieses Feld nicht ändern' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF v_is_vp THEN
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
$function$;