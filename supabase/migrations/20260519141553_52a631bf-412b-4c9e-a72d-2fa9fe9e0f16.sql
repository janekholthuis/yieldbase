drop view if exists public.v_case_for_vp;

create view public.v_case_for_vp
with (security_invoker = true) as
select
  c.id, c.kunde_id, c.einheit_id, c.vp_id, c.status,
  c.zins_satz, c.tilgung_initial, c.laufzeit_jahre, c.sondertilgung_pa,
  c.monatliche_rate, c.finanzierungs_summe, c.gesamtkosten,
  c.notiz_finanzierer,
  c.created_at, c.assigned_at, c.offer_filled_at, c.offer_accepted_at, c.final_status_at,
  'Finanzierungspartner'::text as finanzierer_label
from public.finanzierungs_cases c
join public.kunden k on k.id = c.kunde_id
where
  k.vp_id = auth.uid()
  or public.is_descendant_of(auth.uid(), k.vp_id)
  or (
    public.has_role(auth.uid(), 'vertriebsleiter'::app_role)
    and exists (
      select 1 from public.vp_hierarchy vh
      where vh.vp_id = k.vp_id and vh.vertriebsleiter_id = auth.uid()
    )
  )
  or public.has_role(auth.uid(), 'admin'::app_role)
  or public.has_role(auth.uid(), 'support'::app_role);