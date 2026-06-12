-- ============================================================
-- Investagon -> Supabase sync
-- Adds external-id link columns + a raw payload column on the
-- domain tables, plus an admin-only sync-log table.
-- NOTE: do NOT apply automatically — review first.
-- ============================================================

-- ---------- external link + raw payload on projekte ----------
ALTER TABLE public.projekte
  ADD COLUMN IF NOT EXISTS investagon_id text UNIQUE;

ALTER TABLE public.projekte
  ADD COLUMN IF NOT EXISTS raw jsonb;

-- ---------- external link + raw payload on einheiten ----------
ALTER TABLE public.einheiten
  ADD COLUMN IF NOT EXISTS investagon_id text UNIQUE;

ALTER TABLE public.einheiten
  ADD COLUMN IF NOT EXISTS raw jsonb;

-- Indexes for the lookup columns used during upsert / resolution.
-- (UNIQUE already creates a btree index, but be explicit for clarity
-- and to mirror existing migration conventions.)
CREATE INDEX IF NOT EXISTS idx_projekte_investagon_id
  ON public.projekte(investagon_id)
  WHERE investagon_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_einheiten_investagon_id
  ON public.einheiten(investagon_id)
  WHERE investagon_id IS NOT NULL;

-- ============================================================
-- investagon_sync_log
-- One row per sync run; admin-only visibility.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investagon_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  projects_synced int DEFAULT 0,
  properties_synced int DEFAULT 0,
  status text,
  error text,
  raw jsonb
);

CREATE INDEX IF NOT EXISTS idx_investagon_sync_log_started
  ON public.investagon_sync_log(started_at DESC);

ALTER TABLE public.investagon_sync_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access (mirrors the *_admin_all pattern used across the schema).
-- The service-role key used by the sync action bypasses RLS, so the action
-- itself keeps working regardless of these policies; this policy governs
-- direct client access for admins inspecting the log.
CREATE POLICY "investagon_sync_log_admin_all" ON public.investagon_sync_log
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
