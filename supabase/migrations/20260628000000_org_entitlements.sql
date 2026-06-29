-- PROJ-31: Org-Entitlements (Feature-Freischaltung pro Organisation).
--
-- Additive, non-breaking: eine jsonb-Override-Map auf organisationen. Leeres
-- Objekt = die Org nutzt ueberall die Katalog-Defaults (siehe src/lib/entitlements.ts).
-- Bestands-Orgs verlieren nichts, da live ausgerollte Features auf default=true stehen
-- und ein leeres {} keine Overrides setzt.
--
-- Geschrieben wird ausschliesslich serverseitig (Admin-UI, admin/support). Lesen ist
-- nicht geheim (welche Features eine Org hat) und laeuft ueber die bestehende
-- Branding-Lese-Schicht; daher hier keine zusaetzliche RLS-Policy noetig — die
-- bestehenden organisationen-Policies gelten.

ALTER TABLE public.organisationen
  ADD COLUMN IF NOT EXISTS entitlements jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organisationen.entitlements IS
  'PROJ-31: Feature-Override-Map (jsonb). Keys siehe src/lib/entitlements.ts EntitlementKey. Leeres {} = Katalog-Defaults.';
