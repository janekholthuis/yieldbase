
-- Modul 2 DB-Foundation: Schema-Ergänzungen für Objekt-Onboarding

-- 1. Enum objekt_ebene
DO $$ BEGIN
  CREATE TYPE public.objekt_ebene AS ENUM ('projekt','einheit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. dokument_kategorie: rename + add values (Q1 Variante b erweitert)
ALTER TYPE public.dokument_kategorie RENAME VALUE 'protokoll' TO 'protokoll_eigentuemerversammlung';
ALTER TYPE public.dokument_kategorie ADD VALUE IF NOT EXISTS 'wirtschaftsplan';

-- 3. projekte: neue Felder
ALTER TABLE public.projekte
  ADD COLUMN IF NOT EXISTS visibility_reviewed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS geo jsonb NULL,
  ADD COLUMN IF NOT EXISTS kalkulations_defaults jsonb NULL;

-- 4. objekt_bilder: neue Felder
ALTER TABLE public.objekt_bilder
  ADD COLUMN IF NOT EXISTS is_cover boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ebene public.objekt_ebene NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS public_url text NULL;

UPDATE public.objekt_bilder SET ebene = CASE WHEN einheit_id IS NOT NULL THEN 'einheit'::objekt_ebene ELSE 'projekt'::objekt_ebene END WHERE ebene IS NULL;
ALTER TABLE public.objekt_bilder ALTER COLUMN ebene SET NOT NULL;
ALTER TABLE public.objekt_bilder ALTER COLUMN ebene SET DEFAULT 'projekt'::objekt_ebene;

-- FKs für objekt_bilder (L7: gleich sauber mit ON DELETE CASCADE)
DO $$ BEGIN
  ALTER TABLE public.objekt_bilder ADD CONSTRAINT objekt_bilder_projekt_id_fkey FOREIGN KEY (projekt_id) REFERENCES public.projekte(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.objekt_bilder ADD CONSTRAINT objekt_bilder_einheit_id_fkey FOREIGN KEY (einheit_id) REFERENCES public.einheiten(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Partial-Unique-Index: max. ein Cover pro Galerie
CREATE UNIQUE INDEX IF NOT EXISTS objekt_bilder_one_cover_per_galerie
  ON public.objekt_bilder (projekt_id, einheit_id, ebene)
  WHERE is_cover = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS objekt_bilder_projekt_idx ON public.objekt_bilder (projekt_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS objekt_bilder_einheit_idx ON public.objekt_bilder (einheit_id) WHERE deleted_at IS NULL;

-- 5. objekt_dokumente: neue Felder
ALTER TABLE public.objekt_dokumente
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ebene public.objekt_ebene NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS size_bytes bigint NULL,
  ADD COLUMN IF NOT EXISTS mime_type text NULL;

UPDATE public.objekt_dokumente SET ebene = CASE WHEN einheit_id IS NOT NULL THEN 'einheit'::objekt_ebene ELSE 'projekt'::objekt_ebene END WHERE ebene IS NULL;
ALTER TABLE public.objekt_dokumente ALTER COLUMN ebene SET NOT NULL;
ALTER TABLE public.objekt_dokumente ALTER COLUMN ebene SET DEFAULT 'projekt'::objekt_ebene;

DO $$ BEGIN
  ALTER TABLE public.objekt_dokumente ADD CONSTRAINT objekt_dokumente_projekt_id_fkey FOREIGN KEY (projekt_id) REFERENCES public.projekte(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.objekt_dokumente ADD CONSTRAINT objekt_dokumente_einheit_id_fkey FOREIGN KEY (einheit_id) REFERENCES public.einheiten(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS objekt_dokumente_projekt_idx ON public.objekt_dokumente (projekt_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS objekt_dokumente_einheit_idx ON public.objekt_dokumente (einheit_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS objekt_dokumente_kategorie_idx ON public.objekt_dokumente (kategorie);

-- RLS-Hinweis: Bestehende Policies bleiben unverändert (Lese-Pattern via can_read_projekt/can_read_einheit deckt admin/support/vp/kunde/finanzierer schon ab). Schreib-Policy bilder_admin_support_write / dok_admin_support_write existiert bereits. Soft-Delete via UPDATE deleted_at fällt unter dieselbe Write-Policy.
