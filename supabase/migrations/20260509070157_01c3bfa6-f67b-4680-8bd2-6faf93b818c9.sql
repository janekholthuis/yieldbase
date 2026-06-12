
CREATE TABLE public.kundenlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id uuid NOT NULL,
  einheit_id uuid NOT NULL,
  vp_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  accessed_count integer NOT NULL DEFAULT 0,
  last_accessed_at timestamptz
);

CREATE INDEX idx_kundenlinks_token ON public.kundenlinks(token);
CREATE INDEX idx_kundenlinks_einheit ON public.kundenlinks(einheit_id);
CREATE INDEX idx_kundenlinks_kunde ON public.kundenlinks(kunde_id);

ALTER TABLE public.kundenlinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY kundenlinks_admin_all ON public.kundenlinks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY kundenlinks_vp_subtree_select ON public.kundenlinks
  FOR SELECT TO authenticated
  USING (
    vp_id = auth.uid()
    OR is_descendant_of(auth.uid(), vp_id)
    OR (
      has_role(auth.uid(), 'vertriebsleiter'::app_role)
      AND EXISTS (SELECT 1 FROM vp_hierarchy h WHERE h.vp_id = kundenlinks.vp_id AND h.vertriebsleiter_id = auth.uid())
    )
  );

CREATE POLICY kundenlinks_vp_insert ON public.kundenlinks
  FOR INSERT TO authenticated
  WITH CHECK (
    vp_id = auth.uid()
    AND has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3','vertriebsleiter']::app_role[])
  );

CREATE POLICY kundenlinks_vp_delete ON public.kundenlinks
  FOR DELETE TO authenticated
  USING (vp_id = auth.uid() OR is_descendant_of(auth.uid(), vp_id));
