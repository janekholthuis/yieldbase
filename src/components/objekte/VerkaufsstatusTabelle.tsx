import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATUS_LABELS } from "@/lib/objekt-format";
import type { EinheitStatus, ObjektListItem } from "@/lib/data/objekte";

// Verkaufsstatus-Breakdown for a project: count + share per status, plus total.
// Order follows STATUS_LABELS (Frei · Auf Anfrage · Reserviert · Notarvorbereitung
// · Notartermin · Verkauft).
const STATUS_ORDER = Object.keys(STATUS_LABELS) as EinheitStatus[];

export function VerkaufsstatusTabelle({
  einheiten,
}: {
  einheiten: ObjektListItem[];
}) {
  const total = einheiten.length;
  const counts = STATUS_ORDER.reduce<Record<EinheitStatus, number>>(
    (acc, s) => {
      acc[s] = 0;
      return acc;
    },
    {} as Record<EinheitStatus, number>,
  );
  for (const e of einheiten) {
    if (e.status in counts) counts[e.status] += 1;
  }

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Verkaufsstatus</TableHead>
            <TableHead className="text-right">Einheiten</TableHead>
            <TableHead className="text-right">%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {STATUS_ORDER.map((s) => (
            <TableRow key={s}>
              <TableCell className="font-medium">{STATUS_LABELS[s]}</TableCell>
              <TableCell className="text-right tabular-nums">{counts[s]}</TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {pct(counts[s])}%
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="border-t-2 font-semibold">
            <TableCell>Gesamt</TableCell>
            <TableCell className="text-right tabular-nums">{total}</TableCell>
            <TableCell className="text-right tabular-nums">
              {total > 0 ? "100%" : "0%"}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
