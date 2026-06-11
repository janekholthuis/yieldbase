"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, LayoutGrid, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEUR } from "@/lib/objekt-format";
import type { KundeListItem } from "@/lib/data/kunden";

const STATUS_LABEL: Record<string, string> = {
  lead: "Lead",
  aktiviert: "Aktiviert",
  bonitaet_geprueft: "Bonität geprüft",
  reserviert: "Reserviert",
  beurkundet: "Beurkundet",
};

function fullName(k: KundeListItem) {
  return `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || "(ohne Name)";
}

type SortKey = "new" | "name" | "kp";
type View = "grid" | "table";

export function KundenListView({ kunden }: { kunden: KundeListItem[] }) {
  const [view, setView] = useState<View>("grid");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("alle");
  const [sort, setSort] = useState<SortKey>("new");

  const filtered = useMemo(() => {
    let r = kunden;
    if (statusF !== "alle") r = r.filter((x) => x.status === statusF);
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((x) =>
        [x.vorname, x.nachname, x.email, x.stadt]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    const arr = [...r];
    if (sort === "new")
      arr.sort(
        (a, b) =>
          +new Date(b.created_at ?? 0) - +new Date(a.created_at ?? 0),
      );
    if (sort === "name")
      arr.sort((a, b) => fullName(a).localeCompare(fullName(b), "de"));
    if (sort === "kp")
      arr.sort((a, b) => (b.max_finanzierbar ?? 0) - (a.max_finanzierbar ?? 0));
    return arr;
  }, [kunden, q, statusF, sort]);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">Kunden</h1>
        <Badge variant="secondary">{kunden.length}</Badge>
        <div className="ml-auto flex gap-2">
          <Button asChild>
            <Link href="/kunden/neu">
              <Plus className="mr-1 h-4 w-4" /> Neuer Kunde
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen nach Name, Email, Stadt …"
            aria-label="Kunden suchen"
            className="pl-8"
          />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="w-[180px]" aria-label="Status filtern">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px]" aria-label="Sortierung">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Neueste zuerst</SelectItem>
            <SelectItem value="name">Name A bis Z</SelectItem>
            <SelectItem value="kp">Max. Kaufpreis ↓</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1 rounded-md border p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("grid")}
            aria-label="Kartenansicht"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-label="Tabellenansicht"
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "Kunde" : "Kunden"}
      </p>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="mb-3 text-muted-foreground">
            {kunden.length === 0
              ? "Noch keine Kunden."
              : "Keine Kunden für diese Filter."}
          </p>
          <Button asChild>
            <Link href="/kunden/neu">
              <Plus className="mr-1 h-4 w-4" /> Ersten Kunden anlegen
            </Link>
          </Button>
        </div>
      )}

      {view === "grid" && filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((k) => (
            <Link
              key={k.id}
              href={`/kunden/${k.id}`}
              className="rounded-lg border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h3 className="font-medium">{fullName(k)}</h3>
                <Badge variant="outline">
                  {STATUS_LABEL[k.status] ?? k.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {k.email ?? "—"} · {k.stadt ?? "—"}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground">Brutto/Jahr</div>
                  <div className="font-medium">
                    {formatEUR(k.brutto_jahreseinkommen)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Max. KP</div>
                  <div className="font-medium">
                    {formatEUR(k.max_finanzierbar)}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {view === "table" && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stadt</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead className="text-right">Max. KP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((k) => (
                <TableRow key={k.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/kunden/${k.id}`} className="block">
                      {fullName(k)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STATUS_LABEL[k.status] ?? k.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{k.email ?? "—"}</TableCell>
                  <TableCell>{k.stadt ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatEUR(k.brutto_jahreseinkommen)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatEUR(k.max_finanzierbar)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
