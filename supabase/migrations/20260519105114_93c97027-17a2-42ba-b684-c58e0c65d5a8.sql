
-- Private Bucket für Kunden-Dokumente
insert into storage.buckets (id, name, public)
values ('kunden-dokumente', 'kunden-dokumente', false)
on conflict (id) do nothing;

-- Pfad-Pattern: {kunde_id}/{kategorie_slug}/{uuid}-{dateiname}
-- -> (storage.foldername(name))[1] = kunde_id

-- SELECT: sichtbar wenn can_access_kunde((foldername[1])::uuid)
create policy "kdok_storage_select"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'kunden-dokumente'
    and public.can_access_kunde( ((storage.foldername(name))[1])::uuid )
  );

-- INSERT (Upload): nur wenn Caller Zugriff auf kunde_id hat
create policy "kdok_storage_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'kunden-dokumente'
    and public.can_access_kunde( ((storage.foldername(name))[1])::uuid )
  );

-- Kein UPDATE / DELETE policy -> Überschreiben/Löschen gesperrt
-- (Soft-Delete erfolgt nur in der Metadaten-Tabelle kunden_dokumente)
