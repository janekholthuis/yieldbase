
-- Trigger to sync einheiten.status with reservierungen state.
-- This lets VPs/VLs create reservations without needing direct UPDATE
-- rights on einheiten (which only admin/support hold via RLS).

CREATE OR REPLACE FUNCTION public.sync_einheit_status_from_reservierung()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.status = 'reserviert' THEN
      UPDATE public.einheiten
        SET status = 'reserviert', updated_at = now()
        WHERE id = NEW.einheit_id
          AND status = 'verfuegbar';
    ELSIF NEW.status IN ('storniert', 'abgelaufen') THEN
      -- Only release if this einheit is currently reserved by THIS reservation
      UPDATE public.einheiten e
        SET status = 'verfuegbar', updated_at = now()
        WHERE e.id = NEW.einheit_id
          AND e.status = 'reserviert'
          AND NOT EXISTS (
            SELECT 1 FROM public.reservierungen r2
            WHERE r2.einheit_id = e.id
              AND r2.id <> NEW.id
              AND r2.status = 'reserviert'
          );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_einheit_status ON public.reservierungen;
CREATE TRIGGER trg_sync_einheit_status
AFTER INSERT OR UPDATE OF status ON public.reservierungen
FOR EACH ROW
EXECUTE FUNCTION public.sync_einheit_status_from_reservierung();
