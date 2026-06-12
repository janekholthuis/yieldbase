update public.objekt_kunde_zuweisungen z
set vp_id = k.vp_id,
    updated_at = now()
from public.kunden k
where k.id = z.kunde_id
  and z.vp_id is distinct from k.vp_id;

drop policy if exists okz_insert_allowed on public.objekt_kunde_zuweisungen;

create policy okz_insert_allowed
on public.objekt_kunde_zuweisungen
for insert
to authenticated
with check (
  has_role(auth.uid(), 'admin'::app_role)
  or (
    has_any_role(auth.uid(), array['vp_l1','vp_l2','vp_l3','vertriebsleiter']::app_role[])
    and exists (
      select 1
      from public.kunden k
      where k.id = objekt_kunde_zuweisungen.kunde_id
        and k.vp_id = objekt_kunde_zuweisungen.vp_id
        and (
          k.vp_id = auth.uid()
          or is_descendant_of(auth.uid(), k.vp_id)
          or (
            has_role(auth.uid(), 'vertriebsleiter'::app_role)
            and exists (
              select 1
              from public.vp_hierarchy h
              where h.vp_id = k.vp_id
                and h.vertriebsleiter_id = auth.uid()
            )
          )
        )
    )
  )
);