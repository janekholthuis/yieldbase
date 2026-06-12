
-- =========================================================================
-- Table: kunden_dokumente
-- =========================================================================
create table public.kunden_dokumente (
  id uuid primary key default gen_random_uuid(),
  kunde_id uuid not null references public.kunden(id) on delete cascade,
  kategorie text not null,
  dateiname text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid not null references public.profiles(id),
  deleted_at timestamptz
);

create index kunden_dokumente_kunde_active_idx
  on public.kunden_dokumente (kunde_id) where deleted_at is null;
create index kunden_dokumente_uploader_idx
  on public.kunden_dokumente (uploaded_by);

alter table public.kunden_dokumente enable row level security;

-- ---- helper: who can see a given kunde_id? -------------------------------
create or replace function public.can_access_kunde(_kunde_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.kunden k
    where k.id = _kunde_id
      and (
        -- Admin / Support: alles
        public.has_role(auth.uid(), 'admin'::app_role)
        or public.has_role(auth.uid(), 'support'::app_role)
        -- Kunde selbst
        or k.user_id = auth.uid()
        -- VP zugeordnet (direkt oder via Subtree)
        or k.vp_id = auth.uid()
        or public.is_descendant_of(auth.uid(), k.vp_id)
        -- Vertriebsleiter über vp_hierarchy
        or (
          public.has_role(auth.uid(), 'vertriebsleiter'::app_role)
          and exists (
            select 1 from public.vp_hierarchy h
            where h.vp_id = k.vp_id
              and h.vertriebsleiter_id = auth.uid()
          )
        )
      )
  );
$$;

-- ---- SELECT policy -------------------------------------------------------
create policy "kdok_select"
  on public.kunden_dokumente
  for select
  to authenticated
  using (public.can_access_kunde(kunde_id));

-- ---- INSERT policy -------------------------------------------------------
-- Kunden, zugeordnete VPs, Admin/Support dürfen einfügen; uploaded_by muss auth.uid() sein
create policy "kdok_insert"
  on public.kunden_dokumente
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and deleted_at is null
    and public.can_access_kunde(kunde_id)
  );

-- ---- UPDATE policy (nur Soft-Delete) -------------------------------------
-- Sichtbar = updatebar. Trigger sorgt dafür, dass nur deleted_at gesetzt werden darf.
create policy "kdok_update_soft_delete"
  on public.kunden_dokumente
  for update
  to authenticated
  using (public.can_access_kunde(kunde_id))
  with check (public.can_access_kunde(kunde_id));

-- Kein DELETE policy -> harte Löschung gesperrt

-- ---- Trigger: Updates dürfen nur deleted_at ändern -----------------------
create or replace function public.kunden_dokumente_protect_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
$$;

create trigger kunden_dokumente_protect_update_trg
  before update on public.kunden_dokumente
  for each row execute function public.kunden_dokumente_protect_update();

-- ---- Audit-Trigger -------------------------------------------------------
create or replace function public.kunden_dokumente_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
    values (
      'kunden_dokument.upload',
      'kunden_dokument',
      NEW.id,
      NEW.kunde_id,
      NEW.uploaded_by,
      jsonb_build_object(
        'kategorie', NEW.kategorie,
        'dateiname', NEW.dateiname,
        'size_bytes', NEW.size_bytes,
        'mime_type', NEW.mime_type
      )
    );
  elsif TG_OP = 'UPDATE'
        and OLD.deleted_at is null
        and NEW.deleted_at is not null then
    insert into public.audit_logs (action, entity_type, entity_id, kunde_id, by_user_id, meta)
    values (
      'kunden_dokument.delete',
      'kunden_dokument',
      NEW.id,
      NEW.kunde_id,
      coalesce(auth.uid(), NEW.uploaded_by),
      jsonb_build_object(
        'kategorie', NEW.kategorie,
        'dateiname', NEW.dateiname
      )
    );
  end if;
  return NEW;
end;
$$;

create trigger kunden_dokumente_audit_trigger
  after insert or update on public.kunden_dokumente
  for each row execute function public.kunden_dokumente_audit();
