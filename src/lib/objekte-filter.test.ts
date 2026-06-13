import { describe, it, expect } from "vitest";
import { applyObjekteFilters } from "./objekte-filter";
import type { ObjektListItem } from "@/lib/data/objekte";
import type { ObjekteFilters } from "@/components/objekte/ObjekteFilterSidebar";

// PROJ-3 / PROJ-12: Objekte list filtering.

const DEFAULTS: ObjekteFilters = {
  q: "",
  statuses: [],
  stadt: "",
  plz: "",
  preisMin: 0,
  preisMax: 10_000_000,
  flaecheMin: 0,
  flaecheMax: 10_000,
  zimmer: [],
  renditeMin: 0,
  vermietet: "alle",
  projekte: [],
};

function item(over: Partial<ObjektListItem>): ObjektListItem {
  return {
    einheit_id: "e1",
    projekt_id: "p1",
    projekt_name: "Sonnenhof",
    projekt_typ: "mfh",
    bautraeger: "Bauträger GmbH",
    cover_image_url: null,
    adresse: "Hauptstr. 1",
    stadt: "Berlin",
    plz: "10115",
    bundesland: "Berlin",
    baujahr: 1990,
    mietrendite_brutto: 4,
    wohnungsnummer: "WE1",
    etage: 1,
    wohnflaeche: 60,
    zimmer: 2,
    kaufpreis: 250000,
    miete: 800,
    status: "frei",
    vermietet: true,
    balkon: true,
    keller: false,
    aufzug: false,
    afa_satz: 2,
    created_at: "2026-01-01",
    ...over,
  };
}

const f = (over: Partial<ObjekteFilters>): ObjekteFilters => ({
  ...DEFAULTS,
  ...over,
});

describe("applyObjekteFilters", () => {
  it("returns everything with default filters", () => {
    const items = [item({}), item({ einheit_id: "e2", stadt: "Hamburg" })];
    expect(applyObjekteFilters(items, DEFAULTS)).toHaveLength(2);
  });

  it("free-text search matches across name, city, unit, PLZ", () => {
    const items = [
      item({ einheit_id: "a", projekt_name: "Sonnenhof" }),
      item({ einheit_id: "b", projekt_name: "Mondblick", stadt: "München" }),
    ];
    expect(applyObjekteFilters(items, f({ q: "sonnen" }))).toHaveLength(1);
    expect(applyObjekteFilters(items, f({ q: "münchen" }))[0].einheit_id).toBe(
      "b",
    );
    expect(applyObjekteFilters(items, f({ q: "10115" }))).toHaveLength(2);
    expect(applyObjekteFilters(items, f({ q: "nichtsda" }))).toHaveLength(0);
  });

  it("filters by status set", () => {
    const items = [
      item({ einheit_id: "a", status: "frei" }),
      item({ einheit_id: "b", status: "verkauft" }),
    ];
    const res = applyObjekteFilters(items, f({ statuses: ["verkauft"] }));
    expect(res).toHaveLength(1);
    expect(res[0].einheit_id).toBe("b");
  });

  it("filters by exact city and PLZ prefix", () => {
    const items = [
      item({ einheit_id: "a", stadt: "Berlin", plz: "10115" }),
      item({ einheit_id: "b", stadt: "Hamburg", plz: "20095" }),
    ];
    expect(applyObjekteFilters(items, f({ stadt: "Berlin" }))).toHaveLength(1);
    expect(applyObjekteFilters(items, f({ plz: "200" }))[0].einheit_id).toBe(
      "b",
    );
  });

  it("filters by price and area ranges (null values pass through)", () => {
    const items = [
      item({ einheit_id: "a", kaufpreis: 150000, wohnflaeche: 40 }),
      item({ einheit_id: "b", kaufpreis: 500000, wohnflaeche: 120 }),
      item({ einheit_id: "c", kaufpreis: null, wohnflaeche: null }),
    ];
    const res = applyObjekteFilters(
      items,
      f({ preisMin: 200000, preisMax: 600000 }),
    );
    expect(res.map((r) => r.einheit_id).sort()).toEqual(["b", "c"]);
  });

  it("buckets rooms with 4+ collapsing into bucket 4", () => {
    const items = [
      item({ einheit_id: "a", zimmer: 2 }),
      item({ einheit_id: "b", zimmer: 5 }),
      item({ einheit_id: "c", zimmer: 4 }),
    ];
    const res = applyObjekteFilters(items, f({ zimmer: [4] }));
    expect(res.map((r) => r.einheit_id).sort()).toEqual(["b", "c"]);
  });

  it("filters by minimum yield and rented state", () => {
    const items = [
      item({ einheit_id: "a", mietrendite_brutto: 3, vermietet: true }),
      item({ einheit_id: "b", mietrendite_brutto: 5, vermietet: false }),
    ];
    expect(applyObjekteFilters(items, f({ renditeMin: 4 }))[0].einheit_id).toBe(
      "b",
    );
    expect(
      applyObjekteFilters(items, f({ vermietet: "vermietet" }))[0].einheit_id,
    ).toBe("a");
    expect(
      applyObjekteFilters(items, f({ vermietet: "leer" }))[0].einheit_id,
    ).toBe("b");
  });

  it("filters by project membership", () => {
    const items = [
      item({ einheit_id: "a", projekt_id: "p1" }),
      item({ einheit_id: "b", projekt_id: "p2" }),
    ];
    expect(
      applyObjekteFilters(items, f({ projekte: ["p2"] }))[0].einheit_id,
    ).toBe("b");
  });

  it("combines multiple filters (AND semantics)", () => {
    const items = [
      item({ einheit_id: "a", stadt: "Berlin", status: "frei", kaufpreis: 300000 }),
      item({ einheit_id: "b", stadt: "Berlin", status: "verkauft", kaufpreis: 300000 }),
      item({ einheit_id: "c", stadt: "Hamburg", status: "frei", kaufpreis: 300000 }),
    ];
    const res = applyObjekteFilters(
      items,
      f({ stadt: "Berlin", statuses: ["frei"] }),
    );
    expect(res).toHaveLength(1);
    expect(res[0].einheit_id).toBe("a");
  });
});
