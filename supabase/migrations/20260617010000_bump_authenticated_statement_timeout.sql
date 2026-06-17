-- Performance/Resilienz: statement_timeout für `authenticated` von 8s auf 15s.
-- Die Objekte-Liste lädt aktuell alle ~2.100 Einheiten ungebremst; im Normalfall
-- ~0,2–0,6s, aber unter Instanz-Contention (Checkpoints, Investagon-Sync,
-- parallele Nutzer) springt sie über 8s und wird gecancelt
-- ("canceling statement due to statement timeout" → UI: "Fehler beim Laden").
-- 15s gibt Headroom als Sofort-Entlastung. DURABLE FIX bleibt: serverseitige
-- Pagination/Filterung der Objekte-Liste (nicht mehr alle Zeilen pro Aufruf laden).
--
-- Bereits live appliziert (ALTER ROLE) + `notify pgrst, 'reload config'`.
alter role authenticated set statement_timeout = '15s';

-- PostgREST die geänderte Rollenkonfiguration neu laden lassen.
notify pgrst, 'reload config';
