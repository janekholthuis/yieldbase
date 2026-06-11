export function buildPraesentationPath(einheitId: string, kundeId?: string | null) {
  const base = `/objekte/${encodeURIComponent(einheitId)}/praesentation`;
  return kundeId ? `${base}/${encodeURIComponent(kundeId)}` : base;
}

export function openPraesentation(einheitId: string, kundeId?: string | null) {
  if (typeof window === "undefined") return;
  window.location.assign(buildPraesentationPath(einheitId, kundeId));
}
