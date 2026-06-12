
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Bestehenden Job (falls vorhanden) entfernen, um doppelte Schedules zu vermeiden.
DO $$
BEGIN
  PERFORM cron.unschedule('reservierungen-cron-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'reservierungen-cron-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ffagjzkkzlywejzjfgue.supabase.co/functions/v1/reservierungen-cron',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYWdqemtremx5d2VqempmZ3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMjkyMjEsImV4cCI6MjA5MzcwNTIyMX0.KBam-ijOwvmAIWGz0JAuppLM2Jy1TvI4L01ygyNFBEc"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
