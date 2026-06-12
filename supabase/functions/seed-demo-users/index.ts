// Yieldbase Demo-Seed (idempotent)
// Bootstrap-Aufruf erlaubt, solange noch kein Admin-User existiert.
// Sobald ein Admin existiert, muss der Aufrufer Admin sein (JWT im Authorization-Header).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEMO_PW = "Yieldbase2026!";

type Role =
  | "admin"
  | "support"
  | "vertriebsleiter"
  | "vp_l1"
  | "vp_l2"
  | "vp_l3"
  | "kunde"
  | "finanzierer";

interface DemoUser {
  key: string;
  email: string;
  name: string;
  role: Role;
}

const USERS: DemoUser[] = [
  { key: "admin", email: "admin@yieldbase.example.com", name: "Admin", role: "admin" },
  { key: "support", email: "support@yieldbase.example.com", name: "Support", role: "support" },
  { key: "vl_martin", email: "martin@yieldbase.example.com", name: "Martin (VL)", role: "vertriebsleiter" },
  { key: "vl_2", email: "vl2@yieldbase.example.com", name: "Demo VL2", role: "vertriebsleiter" },
  { key: "vp_l1_a", email: "vp-l1-a@yieldbase.example.com", name: "VP L1-A", role: "vp_l1" },
  { key: "vp_l1_b", email: "vp-l1-b@yieldbase.example.com", name: "VP L1-B", role: "vp_l1" },
  { key: "vp_l1_c", email: "vp-l1-c@yieldbase.example.com", name: "VP L1-C", role: "vp_l1" },
  { key: "vp_l2_a", email: "vp-l2-a@yieldbase.example.com", name: "VP L2-A", role: "vp_l2" },
  { key: "vp_l2_b", email: "vp-l2-b@yieldbase.example.com", name: "VP L2-B", role: "vp_l2" },
  { key: "vp_l2_c", email: "vp-l2-c@yieldbase.example.com", name: "VP L2-C", role: "vp_l2" },
  { key: "vp_l3_a", email: "vp-l3-a@yieldbase.example.com", name: "VP L3-A", role: "vp_l3" },
  { key: "vp_l3_b", email: "vp-l3-b@yieldbase.example.com", name: "VP L3-B", role: "vp_l3" },
  { key: "vp_l3_c", email: "vp-l3-c@yieldbase.example.com", name: "VP L3-C", role: "vp_l3" },
  { key: "kunde_a", email: "kunde-a@yieldbase.example.com", name: "Kunde A", role: "kunde" },
  { key: "kunde_b", email: "kunde-b@yieldbase.example.com", name: "Kunde B", role: "kunde" },
  { key: "kunde_c", email: "kunde-c@yieldbase.example.com", name: "Kunde C", role: "kunde" },
  { key: "fin1", email: "fin1@yieldbase.example.com", name: "Finanzierer 1", role: "finanzierer" },
  { key: "fin2", email: "fin2@yieldbase.example.com", name: "Finanzierer 2", role: "finanzierer" },
  { key: "fin3", email: "fin3@yieldbase.example.com", name: "Finanzierer 3", role: "finanzierer" },
];

// VP-Hierarchie: vp_id -> { parent, level, vl, rate }
const HIERARCHY: Record<
  string,
  { parent: string | null; level: number; vl: string; rate: number }
> = {
  vp_l1_a: { parent: null, level: 1, vl: "vl_martin", rate: 5.0 },
  vp_l1_b: { parent: null, level: 1, vl: "vl_martin", rate: 4.5 },
  vp_l1_c: { parent: null, level: 1, vl: "vl_2", rate: 4.5 },
  vp_l2_a: { parent: "vp_l1_a", level: 2, vl: "vl_martin", rate: 4.0 },
  vp_l2_b: { parent: "vp_l1_b", level: 2, vl: "vl_martin", rate: 3.5 },
  vp_l2_c: { parent: "vp_l1_c", level: 2, vl: "vl_2", rate: 3.5 },
  vp_l3_a: { parent: "vp_l2_a", level: 3, vl: "vl_martin", rate: 3.0 },
  vp_l3_b: { parent: "vp_l2_b", level: 3, vl: "vl_martin", rate: 2.5 },
  vp_l3_c: { parent: "vp_l2_c", level: 3, vl: "vl_2", rate: 2.0 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- Auth gate: Bootstrap erlaubt, solange kein Admin existiert ----
  const { count: adminCount } = await admin
    .from("user_roles")
    .select("*", { count: "exact", head: true })
    .eq("role", "admin");

  if ((adminCount ?? 0) > 0) {
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Admin auth required" }, 401);
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u?.user) return json({ error: "Invalid JWT" }, 401);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", u.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin role required" }, 403);
  }

  try {
    const log: string[] = [];

    // ---- 1. Wipe demo data (idempotent) ----
    log.push("Cleaning previous demo data...");
    await admin.from("provisionen").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("finanzierungs_cases").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("reservierungen").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("kunden").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("objekt_dokumente").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("objekt_bilder").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("vp_objekt_visibility").delete().neq("projekt_id", "00000000-0000-0000-0000-000000000000");
    await admin.from("einheiten").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("projekte").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await admin.from("vp_hierarchy").delete().neq("vp_id", "00000000-0000-0000-0000-000000000000");

    // Existing demo users (by email) löschen, sonst können wir Hierarchie clean neu aufbauen
    const { data: existingList } = await admin.auth.admin.listUsers({ perPage: 200 });
    const demoEmails = new Set(USERS.map((u) => u.email));
    for (const u of existingList?.users ?? []) {
      if (u.email && demoEmails.has(u.email)) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }

    // ---- 2. Create users + roles ----
    const ids: Record<string, string> = {};
    for (const u of USERS) {
      const { data, error } = await admin.auth.admin.createUser({
        email: u.email,
        password: DEMO_PW,
        email_confirm: true,
        user_metadata: { name: u.name },
      });
      if (error || !data.user) throw new Error(`createUser ${u.email}: ${error?.message}`);
      ids[u.key] = data.user.id;
      const { error: roleErr } = await admin
        .from("user_roles")
        .insert({ user_id: data.user.id, role: u.role });
      if (roleErr) throw new Error(`role ${u.email}: ${roleErr.message}`);
    }
    log.push(`Created ${USERS.length} users`);

    // ---- 3. VP-Hierarchie (top-down: L1 zuerst) ----
    const order = ["vp_l1_a", "vp_l1_b", "vp_l1_c", "vp_l2_a", "vp_l2_b", "vp_l2_c", "vp_l3_a", "vp_l3_b", "vp_l3_c"];
    for (const k of order) {
      const h = HIERARCHY[k];
      const { error } = await admin.from("vp_hierarchy").insert({
        vp_id: ids[k],
        parent_vp_id: h.parent ? ids[h.parent] : null,
        level: h.level,
        commission_rate: h.rate,
        vertriebsleiter_id: ids[h.vl],
      });
      if (error) throw new Error(`vp_hierarchy ${k}: ${error.message}`);
    }
    log.push("VP-Hierarchie aufgebaut");

    // ---- 4. Projekte (6) ----
    const projektDefs = [
      {
        key: "A",
        name: "Wohnpark Friedrichshain",
        adresse: "Beispielstraße 1, 10245 Berlin",
        stadt: "Berlin", plz: "10245", bundesland: "Berlin",
        bautraeger: "Demo-Bauträger AG",
        projekt_typ: "mfh", baujahr: 1985,
        cover: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&q=80",
        mietrendite: 4.2,
      },
      {
        key: "B",
        name: "Eigentumswohnung Schwabing",
        adresse: "Maximilianstraße 22, 80801 München",
        stadt: "München", plz: "80801", bundesland: "Bayern",
        bautraeger: null,
        projekt_typ: "etw_einzeln", baujahr: 2002,
        cover: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80",
        mietrendite: 3.5,
      },
      {
        key: "C",
        name: "Stadtwohnung Eppendorf",
        adresse: "Eppendorfer Landstraße 45, 20251 Hamburg",
        stadt: "Hamburg", plz: "20251", bundesland: "Hamburg",
        bautraeger: null,
        projekt_typ: "etw_einzeln", baujahr: 1998,
        cover: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=80",
        mietrendite: 3.8,
      },
      {
        key: "D",
        name: "Quartier Plagwitz",
        adresse: "Karl-Heine-Straße 12, 04229 Leipzig",
        stadt: "Leipzig", plz: "04229", bundesland: "Sachsen",
        bautraeger: "Plagwitz Immobilien GmbH",
        projekt_typ: "mfh", baujahr: 2015,
        cover: "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=80",
        mietrendite: 4.8,
      },
      {
        key: "E",
        name: "Altbau-Juwel Belgisches Viertel",
        adresse: "Brüsseler Straße 88, 50674 Köln",
        stadt: "Köln", plz: "50674", bundesland: "Nordrhein-Westfalen",
        bautraeger: null,
        projekt_typ: "etw_einzeln", baujahr: 1908,
        cover: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80",
        mietrendite: 3.6,
      },
      {
        key: "F",
        name: "Skyline Residenz Westend",
        adresse: "Bockenheimer Landstraße 200, 60323 Frankfurt am Main",
        stadt: "Frankfurt am Main", plz: "60323", bundesland: "Hessen",
        bautraeger: "Westend Capital Partners",
        projekt_typ: "mfh", baujahr: 2020,
        cover: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80",
        mietrendite: 4.0,
      },
    ] as const;

    const projektIds: Record<string, string> = {};
    for (const p of projektDefs) {
      const { data, error } = await admin
        .from("projekte")
        .insert({
          name: p.name,
          adresse: p.adresse,
          stadt: p.stadt, plz: p.plz, bundesland: p.bundesland,
          bautraeger: p.bautraeger,
          projekt_typ: p.projekt_typ,
          baujahr: p.baujahr,
          cover_image_url: p.cover,
          mietrendite_brutto: p.mietrendite,
          created_by: ids.admin,
        })
        .select("id")
        .single();
      if (error) throw new Error(`projekt ${p.key}: ${error.message}`);
      projektIds[p.key] = data.id;
    }
    log.push(`${projektDefs.length} Projekte angelegt`);

    // ---- 5. Einheiten ----
    // Helper: realistische Finanz-Defaults pro Einheit
    const stadtFaktor: Record<string, { hgU: number; hgN: number; ruecklage: number; qm: number; anteilPct: number }> = {
      "Berlin":            { hgU: 2.20, hgN: 1.10, ruecklage: 0.45, qm: 35, anteilPct: 22 },
      "München":           { hgU: 2.50, hgN: 1.20, ruecklage: 0.50, qm: 30, anteilPct: 25 },
      "Hamburg":           { hgU: 2.30, hgN: 1.05, ruecklage: 0.45, qm: 32, anteilPct: 22 },
      "Leipzig":           { hgU: 1.60, hgN: 0.85, ruecklage: 0.30, qm: 55, anteilPct: 15 },
      "Köln":              { hgU: 2.10, hgN: 1.00, ruecklage: 0.40, qm: 40, anteilPct: 20 },
      "Frankfurt am Main": { hgU: 2.40, hgN: 1.15, ruecklage: 0.45, qm: 28, anteilPct: 23 },
    };
    const finFields = (
      stadt: string,
      wohnflaeche: number,
      kaufpreis: number,
      opts: { sev?: boolean; bewegliche?: Record<string, number> } = {},
    ) => {
      const f = stadtFaktor[stadt] ?? stadtFaktor["Berlin"];
      const round = (n: number) => Math.round(n);
      return {
        hausgeld_umlagefaehig: round(f.hgU * wohnflaeche),
        hausgeld_nicht_umlagefaehig: round(f.hgN * wohnflaeche),
        instandhaltungsruecklage: round(f.ruecklage * wohnflaeche),
        sondereigentumsverwaltung: opts.sev ? 30 : null,
        grundstuecksanteil_qm: f.qm,
        grundstueckswert_anteil: round(kaufpreis * (f.anteilPct / 100)),
        afa_satz: 2.0,
        erhaltungsaufwand: 0,
        bewegliche_wg: opts.bewegliche ? Object.entries(opts.bewegliche).map(([name, wert]) => ({ name, wert })) : [],
      };
    };

    // Projekt A: 7 Einheiten je Status (für Workflow-Tests)
    const statusList = [
      "verfuegbar", "reserviert", "in_finanzierung",
      "kaufvertrag_bestellt", "notartermin", "verkauft", "abgebrochen",
    ];
    const einheitIds: Record<string, string> = {};
    const allEinheitenForGrundriss: { id: string; label: string }[] = [];
    for (let i = 0; i < statusList.length; i++) {
      const s = statusList[i];
      const flaeche = 55 + i * 5;
      const miete = 800 + i * 50;
      const kaufpreis = 250000 + i * 25000;
      const bewegliche = i === 1 ? { Einbauküche: 6000, Möbel: 3000 } : (i === 4 ? { Einbauküche: 8500 } : undefined);
      const { data, error } = await admin
        .from("einheiten")
        .insert({
          projekt_id: projektIds.A,
          wohnungsnummer: `WE${i + 1}`,
          etage: i,
          wohnflaeche: flaeche,
          zimmer: 2 + (i % 3),
          miete, kaufpreis,
          status: s,
          vermietet: s === "verkauft" || s === "notartermin",
          balkon: i % 2 === 0,
          keller: true, aufzug: i >= 2,
          ...finFields("Berlin", flaeche, kaufpreis, { sev: i % 2 === 0, bewegliche }),
        })
        .select("id")
        .single();
      if (error) throw new Error(`einheit ${s}: ${error.message}`);
      einheitIds[s] = data.id;
      allEinheitenForGrundriss.push({ id: data.id, label: `WE${i + 1}` });
    }

    // Projekt B: 1 ETW verfügbar
    {
      const { data, error } = await admin.from("einheiten").insert({
        projekt_id: projektIds.B, wohnungsnummer: "ETW-1", etage: 3,
        wohnflaeche: 95, zimmer: 3, miete: 1800, kaufpreis: 720000,
        status: "verfuegbar", balkon: true, keller: true, aufzug: true,
        ...finFields("München", 95, 720000, { sev: true, bewegliche: { Einbauküche: 12000, Möbel: 5000 } }),
      }).select("id").single();
      if (error) throw error;
      allEinheitenForGrundriss.push({ id: data.id, label: "ETW-1" });
    }

    // Projekt C: 1 ETW verfügbar (Hamburg)
    {
      const { data, error } = await admin.from("einheiten").insert({
        projekt_id: projektIds.C, wohnungsnummer: "ETW-1", etage: 2,
        wohnflaeche: 78, zimmer: 3, miete: 1450, kaufpreis: 580000,
        status: "verfuegbar", balkon: true, keller: true, aufzug: false,
        ...finFields("Hamburg", 78, 580000, { sev: true }),
      }).select("id").single();
      if (error) throw error;
      allEinheitenForGrundriss.push({ id: data.id, label: "ETW-1" });
    }

    // Projekt D: 4 Einheiten in verschiedenen Status (Leipzig)
    const dEinheiten = [
      { wn: "WE1", fl: 42, zi: 1.5, miete: 480, kp: 185000, st: "verfuegbar" },
      { wn: "WE2", fl: 68, zi: 2.5, miete: 720, kp: 285000, st: "verfuegbar" },
      { wn: "WE3", fl: 85, zi: 3.0, miete: 920, kp: 365000, st: "reserviert" },
      { wn: "WE4", fl: 110, zi: 4.0, miete: 1180, kp: 465000, st: "verkauft" },
    ];
    for (let i = 0; i < dEinheiten.length; i++) {
      const e = dEinheiten[i];
      const bewegliche = i === 1 ? { Einbauküche: 5500 } : undefined;
      const { data, error } = await admin.from("einheiten").insert({
        projekt_id: projektIds.D, wohnungsnummer: e.wn, etage: i,
        wohnflaeche: e.fl, zimmer: e.zi, miete: e.miete, kaufpreis: e.kp,
        status: e.st, vermietet: e.st === "verkauft",
        balkon: true, keller: true, aufzug: true,
        ...finFields("Leipzig", e.fl, e.kp, { sev: i % 2 === 0, bewegliche }),
      }).select("id").single();
      if (error) throw error;
      allEinheitenForGrundriss.push({ id: data.id, label: e.wn });
    }

    // Projekt E: 1 ETW reserviert (Köln)
    {
      const { data, error } = await admin.from("einheiten").insert({
        projekt_id: projektIds.E, wohnungsnummer: "ETW-1", etage: 1,
        wohnflaeche: 88, zimmer: 3, miete: 1320, kaufpreis: 495000,
        status: "reserviert", balkon: false, keller: true, aufzug: false,
        ...finFields("Köln", 88, 495000, { sev: true, bewegliche: { Einbauküche: 7000, Möbel: 4000 } }),
      }).select("id").single();
      if (error) throw error;
      allEinheitenForGrundriss.push({ id: data.id, label: "ETW-1" });
    }

    // Projekt F: 3 Einheiten alle verfügbar (Frankfurt)
    const fEinheiten = [
      { wn: "WE1", fl: 55, zi: 2.0, miete: 825, kp: 320000 },
      { wn: "WE2", fl: 72, zi: 2.5, miete: 1080, kp: 410000 },
      { wn: "WE3", fl: 95, zi: 3.5, miete: 1425, kp: 560000 },
    ];
    for (let i = 0; i < fEinheiten.length; i++) {
      const e = fEinheiten[i];
      const { data, error } = await admin.from("einheiten").insert({
        projekt_id: projektIds.F, wohnungsnummer: e.wn, etage: i + 1,
        wohnflaeche: e.fl, zimmer: e.zi, miete: e.miete, kaufpreis: e.kp,
        status: "verfuegbar", balkon: true, keller: true, aufzug: true,
        ...finFields("Frankfurt am Main", e.fl, e.kp, { sev: i === 0 }),
      }).select("id").single();
      if (error) throw error;
      allEinheitenForGrundriss.push({ id: data.id, label: e.wn });
    }
    log.push(`${allEinheitenForGrundriss.length} Einheiten angelegt`);

    // ---- 5b. Bilder pro Projekt (1 Cover + 2 Innen) ----
    const innenraumImages = [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80",
      "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=80",
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80",
    ];
    const bilderRows: Array<Record<string, unknown>> = [];
    for (const p of projektDefs) {
      bilderRows.push({
        projekt_id: projektIds[p.key], url: p.cover,
        alt: `${p.name} – Außenansicht`, sort_order: 0, uploaded_by: ids.admin,
      });
      bilderRows.push({
        projekt_id: projektIds[p.key], url: innenraumImages[0],
        alt: `${p.name} – Wohnzimmer`, sort_order: 1, uploaded_by: ids.admin,
      });
      bilderRows.push({
        projekt_id: projektIds[p.key], url: innenraumImages[1],
        alt: `${p.name} – Küche`, sort_order: 2, uploaded_by: ids.admin,
      });
    }
    // Grundriss-Platzhalter pro Einheit
    const grundrissUrl = "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1200&q=80";
    for (const e of allEinheitenForGrundriss) {
      bilderRows.push({
        einheit_id: e.id, url: grundrissUrl,
        alt: `Grundriss ${e.label}`, sort_order: 0, uploaded_by: ids.admin,
      });
    }
    {
      const { error } = await admin.from("objekt_bilder").insert(bilderRows);
      if (error) throw new Error(`objekt_bilder: ${error.message}`);
    }
    log.push(`${bilderRows.length} Bilder angelegt`);

    // ---- 5c. Dokumente pro Projekt (3) + Grundriss-PDF pro Einheit ----
    const dokRows: Array<Record<string, unknown>> = [];
    const placeholderPdf = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
    for (const p of projektDefs) {
      dokRows.push({
        projekt_id: projektIds[p.key], kategorie: "energieausweis",
        url: placeholderPdf, dateiname: `Energieausweis_${p.key}.pdf`,
        uploaded_by: ids.admin,
      });
      dokRows.push({
        projekt_id: projektIds[p.key], kategorie: "teilungserklaerung",
        url: placeholderPdf, dateiname: `Teilungserklaerung_${p.key}.pdf`,
        uploaded_by: ids.admin,
      });
      dokRows.push({
        projekt_id: projektIds[p.key], kategorie: "sonstiges",
        url: placeholderPdf, dateiname: `Hausgeldabrechnung_${p.key}.pdf`,
        uploaded_by: ids.admin,
      });
    }
    for (const e of allEinheitenForGrundriss) {
      dokRows.push({
        einheit_id: e.id, kategorie: "grundriss",
        url: placeholderPdf, dateiname: `Grundriss_${e.label}.pdf`,
        uploaded_by: ids.admin,
      });
    }
    {
      const { error } = await admin.from("objekt_dokumente").insert(dokRows);
      if (error) throw new Error(`objekt_dokumente: ${error.message}`);
    }
    log.push(`${dokRows.length} Dokumente angelegt`);

    // ---- 6. Kunden: je 1 unter L1-A, L2-A, L3-A ----
    const kunden = [
      { vp: "vp_l1_a", user: "kunde_a", name: "Kunde A" },
      { vp: "vp_l2_a", user: "kunde_b", name: "Kunde B" },
      { vp: "vp_l3_a", user: "kunde_c", name: "Kunde C" },
    ];
    const kundenIds: Record<string, string> = {};
    for (const k of kunden) {
      const { data, error } = await admin
        .from("kunden")
        .insert({
          vp_id: ids[k.vp],
          user_id: ids[k.user],
          persoenliche_daten: { name: k.name },
          beruf_status: "angestellt",
          einkommen: 65000,
          ek: 50000,
          steuersatz: 0.42,
        })
        .select("id")
        .single();
      if (error) throw new Error(`kunde ${k.name}: ${error.message}`);
      kundenIds[k.user] = data.id;
    }

    // ---- 7. Reservierungen (2) ----
    await admin.from("reservierungen").insert([
      {
        einheit_id: einheitIds["reserviert"],
        kunde_id: kundenIds.kunde_a,
        vp_id: ids.vp_l1_a,
        status: "reserviert",
      },
      {
        einheit_id: einheitIds["in_finanzierung"],
        kunde_id: kundenIds.kunde_b,
        vp_id: ids.vp_l2_a,
        status: "angefragt",
      },
    ]);

    // ---- 8. Finanzierungs-Cases (2) ----
    await admin.from("finanzierungs_cases").insert([
      {
        kunde_id: kundenIds.kunde_b,
        einheit_id: einheitIds["in_finanzierung"],
        vp_id: ids.vp_l2_a,
        finanzierer_id: ids.fin1,
        status: "in_pruefung",
      },
      {
        kunde_id: kundenIds.kunde_c,
        einheit_id: einheitIds["kaufvertrag_bestellt"],
        vp_id: ids.vp_l3_a,
        finanzierer_id: ids.fin2,
        status: "genehmigt",
      },
    ]);

    // ---- 9. Provisionen (4 — alle non-stornierten Status) ----
    await admin.from("provisionen").insert([
      { vp_id: ids.vp_l1_a, betrag: 5000, provisionssatz: 5.0, status: "pipeline" },
      { vp_id: ids.vp_l2_a, betrag: 4200, provisionssatz: 4.0, status: "verdient" },
      { vp_id: ids.vp_l3_a, betrag: 3100, provisionssatz: 3.0, status: "in_auszahlung" },
      { vp_id: ids.vp_l1_b, betrag: 6800, provisionssatz: 4.5, status: "ausgezahlt" },
    ]);

    log.push("Demo-Daten komplett");

    return json({
      ok: true,
      log,
      users: USERS.map((u) => ({ email: u.email, role: u.role, password: DEMO_PW })),
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}
