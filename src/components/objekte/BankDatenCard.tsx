import { Card } from "@/components/ui/card";
import { Landmark } from "lucide-react";

// Display-only port of OLD APP BankDatenCard. The OLD APP version loaded and
// edited bank_kontoinhaber / bank_iban / bank_bic on the `projekte` row via
// Supabase queries + a save mutation. Those fields are NOT part of the
// read-only EinheitDetail data layer, so we render an informational card only.
// TODO(migration): bank data read/write server action (projekt bank fields).
export function BankDatenCard() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Landmark className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold tracking-tight">Bank-Daten (Reservierungsgebühr)</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Bank-Daten werden am Projekt gepflegt. Die Bearbeitung folgt mit der
        Reservierungs-Migration.
      </p>
    </Card>
  );
}
