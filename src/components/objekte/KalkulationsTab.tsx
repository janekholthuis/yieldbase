"use client";

import {
  useEinheitKalkulation,
  KpiStrip,
  AnnahmenPanel,
  DiagrammePanel,
  CashflowDetailCard,
  RenditenCard,
} from "@/components/objekte/EinheitKalkulationPanel";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";
import type { KalkulationsEinheit } from "@/lib/data/objekte";

interface Props {
  einheit: KalkulationsEinheit;
  kalkContext: KalkulationsContext;
  readOnly?: boolean;
}

/**
 * Standalone calculation tab. Builds the shared calculation state via
 * `useEinheitKalkulation` and lays out KPIs, assumptions (incl. scenario
 * switch) and the charts + detail tables. All surfaces read the same state,
 * so editing an input updates the KPIs and charts live.
 */
export function KalkulationsTab({ einheit, kalkContext, readOnly = false }: Props) {
  const k = useEinheitKalkulation(einheit, kalkContext, readOnly);

  return (
    <div className="space-y-5">
      <KpiStrip k={k} />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <AnnahmenPanel k={k} />
        </div>
        <div className="space-y-4 lg:col-span-2">
          <DiagrammePanel k={k} headline={false} />
          <CashflowDetailCard r={k.result} />
          <RenditenCard r={k.result} />
        </div>
      </div>
    </div>
  );
}
