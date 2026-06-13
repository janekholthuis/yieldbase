"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ClipboardPaste, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { createEinheitenBulk } from "@/lib/actions/objekte-crud";
import {
  BULK_FIELDS,
  type BulkFieldKey,
  type BulkRow,
  type ColumnMapping,
  buildMapping,
  emptyRow,
  looksLikeHeaderRow,
  matrixToRows,
  parseClipboardMatrix,
  rowError,
  rowHasContent,
  duplicateWohnungsnummern,
  normWohnungsnummer,
} from "@/lib/objekte-bulk";

const IGNORE = "__ignore__";

export interface EinheitenBulkGridProps {
  projektId: string;
  /** Bereits im Projekt vorhandene Wohnungsnummern (für Duplikat-Prüfung). */
  existingWohnungsnummern?: string[];
  onSaved?: (count: number) => void;
}

export function EinheitenBulkGrid({
  projektId,
  existingWohnungsnummern = [],
  onSaved,
}: EinheitenBulkGridProps) {
  const [rows, setRows] = useState<BulkRow[]>(() =>
    Array.from({ length: 3 }, emptyRow),
  );
  const [saving, setSaving] = useState(false);

  // Paste / mapping state.
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [matrix, setMatrix] = useState<string[][] | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>([]);
  const [hasHeader, setHasHeader] = useState(false);
  const pasteRef = useRef<HTMLTextAreaElement>(null);

  // ---- Row editing ----------------------------------------------------------

  function setCell(idx: number, key: BulkFieldKey, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)),
    );
  }
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  // ---- Paste parsing --------------------------------------------------------

  function parsePaste(text: string) {
    const m = parseClipboardMatrix(text);
    if (m.length === 0) {
      toast.error("Keine Daten erkannt.");
      return;
    }
    const colCount = Math.max(...m.map((r) => r.length));
    const header = looksLikeHeaderRow(m[0]);
    setMatrix(m);
    setHasHeader(header);
    setMapping(buildMapping(colCount, header ? m[0] : undefined));
  }

  function onTextareaPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const text = e.clipboardData.getData("text");
    if (text && text.includes("\t")) {
      e.preventDefault();
      setPasteText(text);
      parsePaste(text);
    }
  }

  function applyPaste() {
    if (!matrix) return;
    const dataRows = hasHeader ? matrix.slice(1) : matrix;
    const parsed = matrixToRows(dataRows, mapping).filter(rowHasContent);
    if (parsed.length === 0) {
      toast.error("Keine übernehmbaren Zeilen.");
      return;
    }
    // Replace empty starter rows; otherwise append.
    setRows((prev) => {
      const kept = prev.filter(rowHasContent);
      return [...kept, ...parsed];
    });
    toast.success(`${parsed.length} Zeile(n) übernommen.`);
    resetPaste();
  }

  function resetPaste() {
    setPasteOpen(false);
    setPasteText("");
    setMatrix(null);
    setMapping([]);
    setHasHeader(false);
  }

  // ---- Validation -----------------------------------------------------------

  const filledRows = useMemo(() => rows.filter(rowHasContent), [rows]);
  const dupes = useMemo(
    () => duplicateWohnungsnummern(filledRows, existingWohnungsnummern),
    [filledRows, existingWohnungsnummern],
  );
  // Per-row error: field-level (rowError) OR duplicate Wohnungsnummer.
  const rowErr = (r: BulkRow): string | null => {
    const e = rowError(r);
    if (e) return e;
    if (dupes.has(normWohnungsnummer(r.wohnungsnummer)))
      return "Wohnungsnr. doppelt";
    return null;
  };
  const errors = useMemo(
    () => rows.map((r) => (rowHasContent(r) ? rowErr(r) : null)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, dupes],
  );
  const validCount = useMemo(
    () => filledRows.filter((r) => rowErr(r) === null).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filledRows, dupes],
  );
  const invalidCount = filledRows.length - validCount;

  // ---- Save -----------------------------------------------------------------

  async function handleSave() {
    if (saving) return;
    const valid = rows.filter((r) => rowHasContent(r) && rowErr(r) === null);
    if (valid.length === 0) {
      toast.error("Keine gültigen Zeilen zum Speichern.");
      return;
    }
    if (invalidCount > 0) {
      toast.error(
        `${invalidCount} Zeile(n) sind ungültig — bitte korrigieren oder leeren.`,
      );
      return;
    }
    setSaving(true);
    try {
      const res = await createEinheitenBulk({
        projekt_id: projektId,
        einheiten: valid.map((r) => ({
          wohnungsnummer: r.wohnungsnummer.trim(),
          etage: r.etage || undefined,
          zimmer: r.zimmer || undefined,
          wohnflaeche: r.wohnflaeche || undefined,
          miete: r.miete || undefined,
          kaufpreis: r.kaufpreis || undefined,
          stellplatz_preis: r.stellplatz_preis || undefined,
        })),
      });
      toast.success(`${res.count} Einheiten angelegt.`);
      onSaved?.(res.count);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Paste panel */}
      {!pasteOpen ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPasteOpen(true);
            setTimeout(() => pasteRef.current?.focus(), 0);
          }}
        >
          <ClipboardPaste className="mr-2 h-4 w-4" />
          Aus Excel einfügen
        </Button>
      ) : (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <div className="space-y-1.5">
            <Label>Excel-Bereich einfügen</Label>
            <Textarea
              ref={pasteRef}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onPaste={onTextareaPaste}
              placeholder="Kopierte Zellen hier einfügen (Strg+V)…"
              rows={4}
              className="font-mono text-xs"
            />
            {!matrix && pasteText.trim() !== "" && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => parsePaste(pasteText)}
              >
                Spalten erkennen
              </Button>
            )}
          </div>

          {matrix && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="bulk-header"
                  checked={hasHeader}
                  onCheckedChange={(c) => setHasHeader(Boolean(c))}
                />
                <Label htmlFor="bulk-header" className="cursor-pointer font-normal">
                  Erste Zeile ist eine Überschrift (überspringen)
                </Label>
              </div>

              {/* Column mapping preview */}
              <div className="overflow-x-auto rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {mapping.map((field, col) => (
                        <TableHead key={col} className="min-w-[140px] align-top">
                          <Select
                            value={field ?? IGNORE}
                            onValueChange={(v) =>
                              setMapping((prev) =>
                                prev.map((f, i) =>
                                  i === col
                                    ? v === IGNORE
                                      ? null
                                      : (v as BulkFieldKey)
                                    : f,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={IGNORE}>Ignorieren</SelectItem>
                              {BULK_FIELDS.map((bf) => (
                                <SelectItem key={bf.key} value={bf.key}>
                                  {bf.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(hasHeader ? matrix.slice(1) : matrix)
                      .slice(0, 4)
                      .map((cells, ri) => (
                        <TableRow key={ri}>
                          {mapping.map((_, col) => (
                            <TableCell key={col} className="text-xs">
                              {cells[col] ?? ""}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={applyPaste}>
                  Zeilen übernehmen
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetPaste}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Editable grid */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              {BULK_FIELDS.map((f) => (
                <TableHead key={f.key} className="min-w-[110px] whitespace-nowrap">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, idx) => {
              const err = errors[idx];
              return (
                <TableRow key={idx} className={err ? "bg-destructive/5" : undefined}>
                  <TableCell className="text-center align-middle">
                    {err ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="mx-auto h-4 w-4 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent>{err}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-xs text-muted-foreground">{idx + 1}</span>
                    )}
                  </TableCell>
                  {BULK_FIELDS.map((f) => (
                    <TableCell key={f.key} className="p-1">
                      <Input
                        value={row[f.key]}
                        onChange={(e) => setCell(idx, f.key, e.target.value)}
                        inputMode={f.type === "num" ? "decimal" : "text"}
                        className="h-8"
                      />
                    </TableCell>
                  ))}
                  <TableCell className="p-1 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeRow(idx)}
                      aria-label="Zeile entfernen"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" />
          Zeile hinzufügen
        </Button>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            {validCount} gültig
            {invalidCount > 0 && (
              <span className="text-destructive"> · {invalidCount} ungültig</span>
            )}
          </span>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || validCount === 0}
          >
            {saving ? "Speichern…" : `${validCount} Einheiten speichern`}
          </Button>
        </div>
      </div>
    </div>
  );
}
