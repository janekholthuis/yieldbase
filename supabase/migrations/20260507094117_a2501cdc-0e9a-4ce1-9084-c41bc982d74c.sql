-- 1. Enums
CREATE TYPE public.anrede_typ AS ENUM ('herr', 'frau', 'divers');
CREATE TYPE public.kunde_status AS ENUM ('lead', 'aktiviert', 'bonitaet_geprueft', 'reserviert', 'beurkundet');

-- 2. profiles erweitern
ALTER TABLE public.profiles
  ADD COLUMN anrede public.anrede_typ,
  ADD COLUMN vorname text,
  ADD COLUMN nachname text,
  ADD COLUMN geburtsdatum date,
  ADD COLUMN plz text,
  ADD COLUMN stadt text,
  ADD COLUMN bundesland text;

-- 3. kunden erweitern
ALTER TABLE public.kunden
  ADD COLUMN verheiratet boolean NOT NULL DEFAULT false,
  ADD COLUMN bestehende_immobilien boolean NOT NULL DEFAULT false,
  ADD COLUMN brutto_jahreseinkommen numeric,
  ADD COLUMN eigenkapital numeric,
  ADD COLUMN persoenlicher_steuersatz numeric,
  ADD COLUMN kreditverpflichtungen_monatlich numeric NOT NULL DEFAULT 0,
  ADD COLUMN erwachsene_im_haushalt smallint NOT NULL DEFAULT 1 CHECK (erwachsene_im_haushalt IN (1,2)),
  ADD COLUMN kinder_anzahl smallint NOT NULL DEFAULT 0 CHECK (kinder_anzahl >= 0),
  ADD COLUMN max_finanzierbar numeric,
  ADD COLUMN max_monatsrate numeric,
  ADD COLUMN max_darlehen numeric,
  ADD COLUMN status public.kunde_status NOT NULL DEFAULT 'lead',
  ADD COLUMN email text,
  ADD COLUMN telefon text,
  -- Identitäts-Cache für Lead-Phase (vor Auth-Aktivierung)
  ADD COLUMN anrede public.anrede_typ,
  ADD COLUMN vorname text,
  ADD COLUMN nachname text,
  ADD COLUMN geburtsdatum date,
  ADD COLUMN adresse text,
  ADD COLUMN plz text,
  ADD COLUMN stadt text,
  ADD COLUMN bundesland text;

-- 4. Daten-Migration aus alten Spalten
UPDATE public.kunden SET
  brutto_jahreseinkommen = einkommen,
  eigenkapital = ek,
  persoenlicher_steuersatz = steuersatz;

ALTER TABLE public.kunden
  DROP COLUMN einkommen,
  DROP COLUMN ek,
  DROP COLUMN steuersatz;

-- 5. Trigger: Kunden dürfen System-Felder nicht selbst ändern
CREATE OR REPLACE FUNCTION public.kunden_protect_system_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nur prüfen, wenn der Caller die Rolle 'kunde' hat und KEINE höhere Rolle
  IF public.has_role(auth.uid(), 'kunde')
     AND NOT public.has_any_role(auth.uid(), ARRAY['admin','support','vertriebsleiter','vp_l1','vp_l2','vp_l3']::app_role[]) THEN
    IF NEW.vp_id IS DISTINCT FROM OLD.vp_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.max_finanzierbar IS DISTINCT FROM OLD.max_finanzierbar
       OR NEW.max_monatsrate IS DISTINCT FROM OLD.max_monatsrate
       OR NEW.max_darlehen IS DISTINCT FROM OLD.max_darlehen
       OR NEW.persoenlicher_steuersatz IS DISTINCT FROM OLD.persoenlicher_steuersatz
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Kunden dürfen System-Felder (vp_id, user_id, max_*, status) nicht ändern';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER kunden_protect_system_fields_trg
BEFORE UPDATE ON public.kunden
FOR EACH ROW
EXECUTE FUNCTION public.kunden_protect_system_fields();

-- 6. RLS-Policy: Kunde sieht eigene Zeile
CREATE POLICY kunden_self_select
ON public.kunden
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 7. RLS-Policy: Kunde darf eigene Zeile updaten (System-Felder via Trigger geschützt)
CREATE POLICY kunden_self_update
ON public.kunden
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 8. updated_at-Trigger für kunden (falls noch nicht vorhanden)
DROP TRIGGER IF EXISTS kunden_touch_updated_at ON public.kunden;
CREATE TRIGGER kunden_touch_updated_at
BEFORE UPDATE ON public.kunden
FOR EACH ROW
EXECUTE FUNCTION public.touch_updated_at();