-- Kunden dürfen die Einheiten sehen, zu denen eine eigene Reservierung existiert.
DROP POLICY IF EXISTS einheiten_kunde_reservierung_select ON public.einheiten;
CREATE POLICY einheiten_kunde_reservierung_select
ON public.einheiten
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'kunde'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.reservierungen r
    JOIN public.kunden k ON k.id = r.kunde_id
    WHERE r.einheit_id = einheiten.id
      AND k.user_id = auth.uid()
  )
);

-- Kunden dürfen Projektdaten sehen, sobald eine Einheit aus dem Projekt ihnen zugewiesen
-- oder für sie reserviert wurde. Dadurch kann das Portal Projektname und Adresse anzeigen.
DROP POLICY IF EXISTS projekte_kunde_assigned_or_reserved_select ON public.projekte;
CREATE POLICY projekte_kunde_assigned_or_reserved_select
ON public.projekte
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'kunde'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.einheiten e
    WHERE e.projekt_id = projekte.id
      AND (
        EXISTS (
          SELECT 1
          FROM public.objekt_kunde_zuweisungen z
          JOIN public.kunden k ON k.id = z.kunde_id
          WHERE z.einheit_id = e.id
            AND k.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.reservierungen r
          JOIN public.kunden k ON k.id = r.kunde_id
          WHERE r.einheit_id = e.id
            AND k.user_id = auth.uid()
        )
      )
  )
);

-- Backfill: aktive Reservierungen ohne Zuweisung im Kundenportal sichtbar machen.
INSERT INTO public.objekt_kunde_zuweisungen (einheit_id, kunde_id, vp_id, status)
SELECT r.einheit_id, r.kunde_id, k.vp_id, 'reserviert'::public.zuweisung_status
FROM public.reservierungen r
JOIN public.kunden k ON k.id = r.kunde_id
WHERE r.status::text IN ('reserviert', 'angefragt')
  AND NOT EXISTS (
    SELECT 1
    FROM public.objekt_kunde_zuweisungen z
    WHERE z.einheit_id = r.einheit_id
      AND z.kunde_id = r.kunde_id
  );