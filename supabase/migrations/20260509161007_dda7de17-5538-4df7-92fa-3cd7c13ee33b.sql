
-- Helper: can a user read a given projekt
create or replace function public.can_read_projekt(_projekt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role(auth.uid(), array['admin','support','vertriebsleiter']::public.app_role[])
    or (public.has_any_role(auth.uid(), array['vp_l1','vp_l2','vp_l3']::public.app_role[])
        and public.vp_sees_projekt(_projekt_id))
    or (public.has_role(auth.uid(),'finanzierer'::public.app_role)
        and public.finanzierer_sees_projekt(_projekt_id))
    or exists (
      select 1
      from public.objekt_kunde_zuweisungen z
      join public.einheiten e on e.id = z.einheit_id
      join public.kunden k on k.id = z.kunde_id
      where e.projekt_id = _projekt_id and k.user_id = auth.uid()
    );
$$;

-- Helper: can a user read a given einheit
create or replace function public.can_read_einheit(_einheit_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_any_role(auth.uid(), array['admin','support','vertriebsleiter']::public.app_role[])
    or (public.has_any_role(auth.uid(), array['vp_l1','vp_l2','vp_l3']::public.app_role[])
        and exists (
          select 1 from public.einheiten e
          where e.id = _einheit_id and public.vp_sees_projekt(e.projekt_id)
        ))
    or (public.has_role(auth.uid(),'finanzierer'::public.app_role)
        and public.finanzierer_sees_einheit(_einheit_id))
    or exists (
      select 1 from public.objekt_kunde_zuweisungen z
      join public.kunden k on k.id = z.kunde_id
      where z.einheit_id = _einheit_id and k.user_id = auth.uid()
    )
    or exists (
      select 1 from public.kalkulationen kk
      join public.kunden k on k.id = kk.kunde_id
      where kk.einheit_id = _einheit_id and k.user_id = auth.uid()
    );
$$;

-- Add explicit kunde SELECT policy on einheiten so kunden can read units assigned to them
drop policy if exists einheiten_kunde_select on public.einheiten;
create policy einheiten_kunde_select on public.einheiten
for select
using (
  public.has_role(auth.uid(), 'kunde'::public.app_role)
  and (
    exists (
      select 1 from public.objekt_kunde_zuweisungen z
      join public.kunden k on k.id = z.kunde_id
      where z.einheit_id = einheiten.id and k.user_id = auth.uid()
    )
    or exists (
      select 1 from public.kalkulationen kk
      join public.kunden k on k.id = kk.kunde_id
      where kk.einheit_id = einheiten.id and k.user_id = auth.uid()
    )
  )
);

-- Tighten dok_select: gate on projekt/einheit visibility, not just row existence
drop policy if exists dok_select on public.objekt_dokumente;
create policy dok_select on public.objekt_dokumente
for select
using (
  (projekt_id is not null and public.can_read_projekt(projekt_id))
  or (einheit_id is not null and public.can_read_einheit(einheit_id))
);

-- Tighten bilder_select likewise
drop policy if exists bilder_select on public.objekt_bilder;
create policy bilder_select on public.objekt_bilder
for select
using (
  (projekt_id is not null and public.can_read_projekt(projekt_id))
  or (einheit_id is not null and public.can_read_einheit(einheit_id))
);

-- Storage: replace loose URL-substring policy on objekt-dokumente with permission-gated check
drop policy if exists "objekt-dokumente scoped read" on storage.objects;
create policy "objekt-dokumente scoped read" on storage.objects
for select
using (
  bucket_id = 'objekt-dokumente' and (
    public.has_role(auth.uid(),'admin'::public.app_role)
    or public.has_role(auth.uid(),'support'::public.app_role)
    or exists (
      select 1 from public.objekt_dokumente d
      where d.url like '%/' || objects.name
        and (
          (d.projekt_id is not null and public.can_read_projekt(d.projekt_id))
          or (d.einheit_id is not null and public.can_read_einheit(d.einheit_id))
        )
    )
  )
);

-- Storage: scope reservation PDF reads to the owning VP / subtree / vertriebsleiter
drop policy if exists reservierungen_vp_read on storage.objects;
create policy reservierungen_vp_read on storage.objects
for select
using (
  bucket_id = 'reservierungen' and (
    public.has_role(auth.uid(),'support'::public.app_role)
    or exists (
      select 1 from public.reservierungen r
      where r.pdf_url = objects.name and (
        r.vp_id = auth.uid()
        or public.is_descendant_of(auth.uid(), r.vp_id)
        or (public.has_role(auth.uid(),'vertriebsleiter'::public.app_role)
            and exists (
              select 1 from public.vp_hierarchy h
              where h.vp_id = r.vp_id and h.vertriebsleiter_id = auth.uid()
            ))
      )
    )
  )
);
