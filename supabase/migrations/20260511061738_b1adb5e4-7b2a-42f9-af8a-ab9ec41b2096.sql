
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  typ TEXT NOT NULL,
  titel TEXT NOT NULL,
  body TEXT,
  link TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_self_select" ON public.notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_self_update" ON public.notifications
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "notif_self_delete" ON public.notifications
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "notif_admin_all" ON public.notifications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.reservierungen
  ADD COLUMN IF NOT EXISTS reminder_7d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_3d_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expired_notified_at TIMESTAMPTZ;
