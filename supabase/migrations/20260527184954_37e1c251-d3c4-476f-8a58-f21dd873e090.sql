CREATE OR REPLACE FUNCTION public.kunden_dokumente_protect_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Bypass-Pfad 1: Service-Role / Migration (kein Auth-Kontext)
  if auth.uid() is null then
    return NEW;
  end if;

  -- Bypass-Pfad 2: SECURITY-DEFINER-RPC mit explizitem System-Bypass
  -- Nutzung: PERFORM set_config('app.kunden_dokumente_rpc_bypass', 'true', true);
  if current_setting('app.kunden_dokumente_rpc_bypass', true) = 'true' then
    return NEW;
  end if;

  if NEW.id is distinct from OLD.id
     or NEW.kunde_id is distinct from OLD.kunde_id
     or NEW.kategorie is distinct from OLD.kategorie
     or NEW.dateiname is distinct from OLD.dateiname
     or NEW.storage_path is distinct from OLD.storage_path
     or NEW.mime_type is distinct from OLD.mime_type
     or NEW.size_bytes is distinct from OLD.size_bytes
     or NEW.uploaded_at is distinct from OLD.uploaded_at
     or NEW.uploaded_by is distinct from OLD.uploaded_by
  then
    raise exception 'kunden_dokumente: nur deleted_at darf via Update geändert werden';
  end if;
  return NEW;
end;
$function$;