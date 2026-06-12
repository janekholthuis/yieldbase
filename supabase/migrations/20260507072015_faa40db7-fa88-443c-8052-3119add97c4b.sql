-- Backfill realistische Finanzfelder für Demo-Einheiten basierend auf Stadt
WITH faktor AS (
  SELECT * FROM (VALUES
    ('Berlin',            2.20, 1.10, 0.45, 35, 0.22),
    ('München',           2.50, 1.20, 0.50, 30, 0.25),
    ('Hamburg',           2.30, 1.05, 0.45, 32, 0.22),
    ('Leipzig',           1.60, 0.85, 0.30, 55, 0.15),
    ('Köln',              2.10, 1.00, 0.40, 40, 0.20),
    ('Frankfurt am Main', 2.40, 1.15, 0.45, 28, 0.23)
  ) AS f(stadt, hg_u, hg_n, ruecklage, qm, anteil)
)
UPDATE einheiten e SET
  hausgeld_umlagefaehig       = round(f.hg_u * e.wohnflaeche),
  hausgeld_nicht_umlagefaehig = round(f.hg_n * e.wohnflaeche),
  instandhaltungsruecklage    = round(f.ruecklage * e.wohnflaeche),
  grundstuecksanteil_qm       = f.qm,
  grundstueckswert_anteil     = round(e.kaufpreis * f.anteil),
  afa_satz                    = 2.0
FROM projekte p, faktor f
WHERE e.projekt_id = p.id AND p.stadt = f.stadt;

-- Sondereigentumsverwaltung bei ~50% (deterministisch über etage)
UPDATE einheiten SET sondereigentumsverwaltung = 30
WHERE etage % 2 = 0;

-- bewegliche_wg bei ausgewählten Einheiten
UPDATE einheiten SET bewegliche_wg = '[{"name":"Einbauküche","wert":6000},{"name":"Möbel","wert":3000}]'::jsonb
WHERE wohnungsnummer = 'WE2' AND projekt_id IN (SELECT id FROM projekte WHERE stadt = 'Berlin');

UPDATE einheiten SET bewegliche_wg = '[{"name":"Einbauküche","wert":12000},{"name":"Möbel","wert":5000}]'::jsonb
WHERE wohnungsnummer = 'ETW-1' AND projekt_id IN (SELECT id FROM projekte WHERE stadt = 'München');

UPDATE einheiten SET bewegliche_wg = '[{"name":"Einbauküche","wert":7000},{"name":"Möbel","wert":4000}]'::jsonb
WHERE wohnungsnummer = 'ETW-1' AND projekt_id IN (SELECT id FROM projekte WHERE stadt = 'Köln');

UPDATE einheiten SET bewegliche_wg = '[{"name":"Einbauküche","wert":5500}]'::jsonb
WHERE wohnungsnummer = 'WE2' AND projekt_id IN (SELECT id FROM projekte WHERE stadt = 'Leipzig');