import type { ObjektListItem } from "@/lib/data/objekte";
import type { ObjekteFilters } from "@/components/objekte/ObjekteFilterSidebar";

export function applyObjekteFilters(
  items: ObjektListItem[],
  f: ObjekteFilters,
): ObjektListItem[] {
  const q = f.q.trim().toLowerCase();
  return items.filter((it) => {
    if (q) {
      const hay = [
        it.projekt_name,
        it.stadt,
        it.bautraeger,
        it.wohnungsnummer,
        it.plz,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.statuses.length > 0 && !f.statuses.includes(it.status)) return false;
    if (f.stadt && it.stadt !== f.stadt) return false;
    if (f.plz && !(it.plz ?? "").startsWith(f.plz)) return false;
    if (it.kaufpreis != null) {
      if (it.kaufpreis < f.preisMin || it.kaufpreis > f.preisMax) return false;
    }
    if (it.wohnflaeche != null) {
      if (it.wohnflaeche < f.flaecheMin || it.wohnflaeche > f.flaecheMax)
        return false;
    }
    if (f.zimmer.length > 0) {
      const z = it.zimmer ?? 0;
      const bucket = z >= 4 ? 4 : Math.floor(z);
      if (!f.zimmer.includes(bucket)) return false;
    }
    if (f.renditeMin > 0 && (it.mietrendite_brutto ?? 0) < f.renditeMin)
      return false;
    if (f.vermietet === "vermietet" && !it.vermietet) return false;
    if (f.vermietet === "leer" && it.vermietet) return false;
    if (f.projekte.length > 0 && !f.projekte.includes(it.projekt_id))
      return false;
    return true;
  });
}
