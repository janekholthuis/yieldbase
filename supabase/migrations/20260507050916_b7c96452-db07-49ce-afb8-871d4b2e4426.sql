
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM (
  'admin','support','vertriebsleiter','vp_l1','vp_l2','vp_l3','kunde','finanzierer'
);

CREATE TYPE public.reservierung_status AS ENUM (
  'entwurf','angefragt','reserviert','abgelaufen','storniert','konvertiert'
);

CREATE TYPE public.case_status AS ENUM (
  'neu','in_pruefung','angefragt','genehmigt','abgelehnt','ausgezahlt'
);

CREATE TYPE public.provision_status AS ENUM (
  'offen','faellig','ausgezahlt','storniert'
);

CREATE TYPE public.ticket_status AS ENUM (
  'offen','in_bearbeitung','wartet_auf_kunde','geschlossen'
);

CREATE TYPE public.feedback_status AS ENUM (
  'neu','in_review','geplant','implementiert','abgelehnt'
);

CREATE TYPE public.feedback_kategorie AS ENUM (
  'ui_ux','bug','feature','performance','sonstiges'
);

CREATE TYPE public.kommentar_kontext AS ENUM (
  'objekt','einheit','case','kunde','reservierung','ticket'
);

CREATE TYPE public.einheit_status AS ENUM (
  'verfuegbar','reserviert','verkauft','gesperrt'
);

CREATE TYPE public.ticket_typ AS ENUM (
  'support','technisch','rueckfrage','sonstiges'
);

-- ============================================================
-- UTILITY: updated_at trigger function
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- profiles (1:1 auth.users)
-- KEIN role-Feld hier – Rollen leben in user_roles
-- ============================================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text,
  avatar_url text,
  address text,
  iban text,
  branding_logo_url text,
  branding_color text,
  calc_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_profiles_touch
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- user_roles (separate Tabelle gegen Privilege-Escalation)
-- ============================================================
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============================================================
-- SECURITY DEFINER helper functions (vor RLS-Policies anlegen)
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS public.app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role), ARRAY[]::public.app_role[])
  FROM public.user_roles
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_internal_non_kunde(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','support','vertriebsleiter','vp_l1','vp_l2','vp_l3','finanzierer')
  );
$$;

-- ============================================================
-- vp_hierarchy
-- ============================================================
CREATE TABLE public.vp_hierarchy (
  vp_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_vp_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  level smallint NOT NULL CHECK (level BETWEEN 1 AND 3),
  commission_rate numeric(6,3) NOT NULL CHECK (commission_rate >= 0 AND commission_rate <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vp_hierarchy_parent ON public.vp_hierarchy(parent_vp_id);

CREATE TRIGGER trg_vp_hierarchy_touch
BEFORE UPDATE ON public.vp_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Validation trigger: commission_rate <= parent.commission_rate
CREATE OR REPLACE FUNCTION public.validate_vp_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_rate numeric(6,3);
  parent_level smallint;
BEGIN
  IF NEW.parent_vp_id IS NULL THEN
    -- L1 nur direkt unter Vertriebsleiter erlaubt; level muss 1 sein
    IF NEW.level <> 1 THEN
      RAISE EXCEPTION 'VP ohne parent_vp_id muss level=1 sein';
    END IF;
    RETURN NEW;
  END IF;

  SELECT commission_rate, level INTO parent_rate, parent_level
  FROM public.vp_hierarchy WHERE vp_id = NEW.parent_vp_id;

  IF parent_rate IS NULL THEN
    RAISE EXCEPTION 'Parent-VP nicht gefunden';
  END IF;

  IF NEW.commission_rate > parent_rate THEN
    RAISE EXCEPTION 'Sub-Provision (%) darf Parent-Provision (%) nicht übersteigen', NEW.commission_rate, parent_rate;
  END IF;

  IF NEW.level <> parent_level + 1 THEN
    RAISE EXCEPTION 'Level muss parent_level+1 sein (parent=%, neu=%)', parent_level, NEW.level;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vp_hierarchy_validate
BEFORE INSERT OR UPDATE ON public.vp_hierarchy
FOR EACH ROW EXECUTE FUNCTION public.validate_vp_hierarchy();

-- Recursive descendants helper
CREATE OR REPLACE FUNCTION public.is_descendant_of(_ancestor uuid, _descendant uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT vp_id, parent_vp_id FROM public.vp_hierarchy WHERE vp_id = _descendant
    UNION ALL
    SELECT v.vp_id, v.parent_vp_id
    FROM public.vp_hierarchy v
    JOIN tree t ON v.vp_id = t.parent_vp_id
  )
  SELECT EXISTS (SELECT 1 FROM tree WHERE parent_vp_id = _ancestor OR vp_id = _ancestor)
     AND _ancestor <> _descendant;
$$;

CREATE OR REPLACE FUNCTION public.is_in_my_subtree(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _target = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR (
      public.has_role(auth.uid(), 'vertriebsleiter')
      -- Vertriebsleiter sieht alle VPs in seinem Tree:
      -- Vereinfachung Phase 1: Vertriebsleiter sieht ALLE VPs.
      -- Differenzierung kommt mit echter Vertriebsleiter↔VP-Verknüpfung.
      AND _target IN (SELECT vp_id FROM public.vp_hierarchy)
    )
    OR public.is_descendant_of(auth.uid(), _target);
$$;

-- ============================================================
-- DOMAIN STUB-TABELLEN
-- ============================================================
CREATE TABLE public.projekte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adresse text NOT NULL,
  baujahr smallint,
  energieausweis jsonb,
  lage_daten jsonb,
  hausunterlagen jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_projekte_touch BEFORE UPDATE ON public.projekte FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.einheiten (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projekt_id uuid NOT NULL REFERENCES public.projekte(id) ON DELETE CASCADE,
  wohnungsnummer text NOT NULL,
  etage smallint,
  wohnflaeche numeric(8,2),
  zimmer numeric(4,1),
  kaufpreis numeric(12,2),
  miete numeric(10,2),
  status public.einheit_status NOT NULL DEFAULT 'verfuegbar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_einheiten_projekt ON public.einheiten(projekt_id);
CREATE TRIGGER trg_einheiten_touch BEFORE UPDATE ON public.einheiten FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.kunden (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vp_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  persoenliche_daten jsonb NOT NULL DEFAULT '{}'::jsonb,
  beruf_status text,
  einkommen numeric(12,2),
  ek numeric(12,2),
  steuersatz numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kunden_vp ON public.kunden(vp_id);
CREATE TRIGGER trg_kunden_touch BEFORE UPDATE ON public.kunden FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.reservierungen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  einheit_id uuid NOT NULL REFERENCES public.einheiten(id) ON DELETE RESTRICT,
  kunde_id uuid NOT NULL REFERENCES public.kunden(id) ON DELETE RESTRICT,
  vp_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status public.reservierung_status NOT NULL DEFAULT 'entwurf',
  signatur_pdf text,
  signed_at timestamptz,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reservierungen_vp ON public.reservierungen(vp_id);
CREATE INDEX idx_reservierungen_kunde ON public.reservierungen(kunde_id);
CREATE TRIGGER trg_reservierungen_touch BEFORE UPDATE ON public.reservierungen FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.finanzierungs_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kunde_id uuid NOT NULL REFERENCES public.kunden(id) ON DELETE RESTRICT,
  einheit_id uuid REFERENCES public.einheiten(id) ON DELETE SET NULL,
  vp_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  finanzierer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.case_status NOT NULL DEFAULT 'neu',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cases_finanzierer ON public.finanzierungs_cases(finanzierer_id);
CREATE INDEX idx_cases_vp ON public.finanzierungs_cases(vp_id);
CREATE TRIGGER trg_cases_touch BEFORE UPDATE ON public.finanzierungs_cases FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.provisionen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.reservierungen(id) ON DELETE SET NULL,
  vp_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provisionssatz numeric(6,3) NOT NULL,
  betrag numeric(12,2) NOT NULL,
  status public.provision_status NOT NULL DEFAULT 'offen',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_provisionen_vp ON public.provisionen(vp_id);
CREATE TRIGGER trg_provisionen_touch BEFORE UPDATE ON public.provisionen FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ersteller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  typ public.ticket_typ NOT NULL DEFAULT 'support',
  betreff text NOT NULL,
  beschreibung text,
  status public.ticket_status NOT NULL DEFAULT 'offen',
  zugewiesen_an uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_ersteller ON public.tickets(ersteller_id);
CREATE INDEX idx_tickets_zugewiesen ON public.tickets(zugewiesen_an);
CREATE TRIGGER trg_tickets_touch BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.kommentare (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kontext_typ public.kommentar_kontext NOT NULL,
  kontext_id uuid NOT NULL,
  autor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_kommentare_kontext ON public.kommentare(kontext_typ, kontext_id);

CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titel text NOT NULL,
  beschreibung text NOT NULL,
  kategorie public.feedback_kategorie NOT NULL,
  screenshot_url text,
  status public.feedback_status NOT NULL DEFAULT 'neu',
  admin_kommentar text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedback_submitter ON public.feedback(submitter_id);
CREATE TRIGGER trg_feedback_touch BEFORE UPDATE ON public.feedback FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  role public.app_role NOT NULL,
  parent_vp_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_email ON public.invites(email);

-- ============================================================
-- RLS aktivieren (rls_auto_enable existiert; explizit zur Klarheit)
-- ============================================================
ALTER TABLE public.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vp_hierarchy        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projekte            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.einheiten           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kunden              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservierungen      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finanzierungs_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisionen         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kommentare          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES
-- ============================================================

-- ---------- profiles ----------
-- Eigenes Profil immer lesbar/änderbar
CREATE POLICY "profiles_self_select" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin sieht alle
CREATE POLICY "profiles_admin_all" ON public.profiles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Vertriebsleiter sieht alle Profile (Phase 1: globale Org-Sicht; spätere Differenzierung möglich)
CREATE POLICY "profiles_vl_select" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

-- VPs sehen Profile in ihrem eigenen Subtree
CREATE POLICY "profiles_vp_subtree_select" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::public.app_role[])
  AND public.is_descendant_of(auth.uid(), id)
);

-- Support sieht NUR Kunden-Profile + sich selbst (keine VPs, keine Finanzierer)
CREATE POLICY "profiles_support_select_kunden" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'support')
  AND public.has_role(id, 'kunde')
);

-- Finanzierer: sehen nur Profile von Kunden, deren Case ihm zugewiesen ist
CREATE POLICY "profiles_finanzierer_select_kunden" ON public.profiles
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'finanzierer')
  AND EXISTS (
    SELECT 1
    FROM public.finanzierungs_cases c
    JOIN public.kunden k ON k.id = c.kunde_id
    WHERE c.finanzierer_id = auth.uid() AND k.user_id = public.profiles.id
  )
);

-- ---------- user_roles ----------
-- Jeder kann eigene Rollen lesen
CREATE POLICY "user_roles_self_select" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admin: alles
CREATE POLICY "user_roles_admin_all" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- vp_hierarchy ----------
CREATE POLICY "vp_hier_self_select" ON public.vp_hierarchy
FOR SELECT TO authenticated
USING (vp_id = auth.uid());

CREATE POLICY "vp_hier_admin_all" ON public.vp_hierarchy
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "vp_hier_vl_select" ON public.vp_hierarchy
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY "vp_hier_subtree_select" ON public.vp_hierarchy
FOR SELECT TO authenticated
USING (
  public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::public.app_role[])
  AND (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id))
);

-- ---------- projekte ----------
CREATE POLICY "projekte_internal_select" ON public.projekte
FOR SELECT TO authenticated
USING (public.is_internal_non_kunde(auth.uid()));

CREATE POLICY "projekte_admin_write" ON public.projekte
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- einheiten ----------
CREATE POLICY "einheiten_internal_select" ON public.einheiten
FOR SELECT TO authenticated
USING (public.is_internal_non_kunde(auth.uid()));

CREATE POLICY "einheiten_admin_write" ON public.einheiten
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- kunden ----------
-- Eigener VP + dessen Subtree (Sub-VP sieht eigene Kunden, L1 sieht zusätzlich L2/L3 Kunden)
CREATE POLICY "kunden_vp_subtree" ON public.kunden
FOR SELECT TO authenticated
USING (
  vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id)
);

CREATE POLICY "kunden_vl_select" ON public.kunden
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY "kunden_admin_all" ON public.kunden
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "kunden_support_select" ON public.kunden
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'support'));

-- Finanzierer: nur Kunden, zu denen er einen Case hat
CREATE POLICY "kunden_finanzierer_select" ON public.kunden
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'finanzierer')
  AND EXISTS (
    SELECT 1 FROM public.finanzierungs_cases c
    WHERE c.finanzierer_id = auth.uid() AND c.kunde_id = public.kunden.id
  )
);

-- VP darf eigene Kunden anlegen/aktualisieren
CREATE POLICY "kunden_vp_insert" ON public.kunden
FOR INSERT TO authenticated
WITH CHECK (
  vp_id = auth.uid()
  AND public.has_any_role(auth.uid(), ARRAY['vp_l1','vp_l2','vp_l3']::public.app_role[])
);

CREATE POLICY "kunden_vp_update" ON public.kunden
FOR UPDATE TO authenticated
USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id))
WITH CHECK (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

-- ---------- reservierungen ----------
CREATE POLICY "res_vp_subtree" ON public.reservierungen
FOR SELECT TO authenticated
USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

CREATE POLICY "res_vl_select" ON public.reservierungen
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY "res_admin_all" ON public.reservierungen
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- finanzierungs_cases ----------
-- VP sieht eigene + Subtree, ABER Spalte finanzierer_id wird in App über View v_case_for_vp ausgeblendet
CREATE POLICY "case_vp_subtree" ON public.finanzierungs_cases
FOR SELECT TO authenticated
USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

CREATE POLICY "case_vl_select" ON public.finanzierungs_cases
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY "case_admin_all" ON public.finanzierungs_cases
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Finanzierer: nur ihm zugewiesene Cases (vp_id über View ausgeblendet)
CREATE POLICY "case_finanzierer_select" ON public.finanzierungs_cases
FOR SELECT TO authenticated
USING (finanzierer_id = auth.uid() AND public.has_role(auth.uid(), 'finanzierer'));

CREATE POLICY "case_finanzierer_update_status" ON public.finanzierungs_cases
FOR UPDATE TO authenticated
USING (finanzierer_id = auth.uid() AND public.has_role(auth.uid(), 'finanzierer'))
WITH CHECK (finanzierer_id = auth.uid());

-- ---------- provisionen ----------
CREATE POLICY "prov_vp_subtree" ON public.provisionen
FOR SELECT TO authenticated
USING (vp_id = auth.uid() OR public.is_descendant_of(auth.uid(), vp_id));

CREATE POLICY "prov_vl_select" ON public.provisionen
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'vertriebsleiter'));

CREATE POLICY "prov_admin_all" ON public.provisionen
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Support + Finanzierer: kein Zugriff (keine Policy = kein Zugriff)

-- ---------- tickets ----------
CREATE POLICY "tickets_self_creator" ON public.tickets
FOR ALL TO authenticated
USING (ersteller_id = auth.uid())
WITH CHECK (ersteller_id = auth.uid());

CREATE POLICY "tickets_assignee_select" ON public.tickets
FOR SELECT TO authenticated
USING (zugewiesen_an = auth.uid());

CREATE POLICY "tickets_assignee_update" ON public.tickets
FOR UPDATE TO authenticated
USING (zugewiesen_an = auth.uid())
WITH CHECK (zugewiesen_an = auth.uid());

CREATE POLICY "tickets_support_all" ON public.tickets
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'support'))
WITH CHECK (public.has_role(auth.uid(), 'support'));

CREATE POLICY "tickets_admin_all" ON public.tickets
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- kommentare ----------
CREATE POLICY "kommentare_self" ON public.kommentare
FOR ALL TO authenticated
USING (autor_id = auth.uid())
WITH CHECK (autor_id = auth.uid());

CREATE POLICY "kommentare_admin_all" ON public.kommentare
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- Sichtbarkeit pro Kontext wird über App-Layer (Join auf RLS-protected Parent) geregelt;
-- breitere Lese-Policy folgt mit Kontext-spezifischen Folge-Prompts.

-- ---------- feedback ----------
-- Submitter sieht/insertet eigene
CREATE POLICY "feedback_self_select" ON public.feedback
FOR SELECT TO authenticated
USING (submitter_id = auth.uid());

CREATE POLICY "feedback_self_insert" ON public.feedback
FOR INSERT TO authenticated
WITH CHECK (
  submitter_id = auth.uid()
  -- Kunden dürfen NICHT submitten
  AND NOT public.has_role(auth.uid(), 'kunde')
);

-- Admin: alles
CREATE POLICY "feedback_admin_all" ON public.feedback
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---------- invites ----------
CREATE POLICY "invites_admin_all" ON public.invites
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "invites_inviter_select" ON public.invites
FOR SELECT TO authenticated
USING (invited_by = auth.uid());

-- Vertriebsleiter darf einladen (alle Sub-Rollen)
CREATE POLICY "invites_vl_insert" ON public.invites
FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.has_role(auth.uid(), 'vertriebsleiter')
  AND role IN ('vp_l1','kunde')
);

-- L1 darf L2 + Kunden einladen
CREATE POLICY "invites_l1_insert" ON public.invites
FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.has_role(auth.uid(), 'vp_l1')
  AND role IN ('vp_l2','kunde')
  AND parent_vp_id = auth.uid()
);

-- L2 darf L3 + Kunden einladen
CREATE POLICY "invites_l2_insert" ON public.invites
FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.has_role(auth.uid(), 'vp_l2')
  AND role IN ('vp_l3','kunde')
  AND parent_vp_id = auth.uid()
);

-- L3 darf nur Kunden einladen
CREATE POLICY "invites_l3_insert" ON public.invites
FOR INSERT TO authenticated
WITH CHECK (
  invited_by = auth.uid()
  AND public.has_role(auth.uid(), 'vp_l3')
  AND role = 'kunde'
);

-- ============================================================
-- ANONYMISIERTE VIEWS
-- ============================================================

-- VP-Sicht: Finanzierer-Identität maskiert
CREATE OR REPLACE VIEW public.v_case_for_vp
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.kunde_id,
  c.einheit_id,
  c.vp_id,
  c.status,
  c.created_at,
  c.updated_at,
  CASE
    WHEN c.finanzierer_id IS NULL THEN NULL
    ELSE 'Bank-Partner-' || left(md5(c.finanzierer_id::text), 6)
  END AS finanzierer_alias
FROM public.finanzierungs_cases c;

-- Finanzierer-Sicht: VP-Identität maskiert
CREATE OR REPLACE VIEW public.v_case_for_finanzierer
WITH (security_invoker = true) AS
SELECT
  c.id,
  c.kunde_id,
  c.einheit_id,
  c.finanzierer_id,
  c.status,
  c.created_at,
  c.updated_at,
  'VP-' || left(md5(c.vp_id::text), 6) AS vp_alias
FROM public.finanzierungs_cases c;

-- ============================================================
-- INDEX hint
-- ============================================================
CREATE INDEX idx_profiles_email ON public.profiles(email);
