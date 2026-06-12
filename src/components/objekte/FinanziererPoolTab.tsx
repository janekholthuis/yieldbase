"use client";

// Finanzierer-Pool management for a project (admin/support only). Lists the
// current round-robin pool, shows the next assignee, and lets admins add/remove
// financiers. Loads via the getFinanziererPool server-action wrapper (the
// underlying data fn is `server-only`); mutations go through addFinanziererToPool
// / removeFinanziererFromPool. Ported from the OLD APP FinanziererPoolTab
// (TanStack Query → local state + router.refresh).

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, ArrowRight, Banknote, Plus, Trash2 } from "lucide-react";
import {
  addFinanziererToPool,
  getFinanziererPool,
  removeFinanziererFromPool,
} from "@/lib/actions/finanzierung";
import type {
  FinanziererPoolMember,
  FinanziererPoolResult,
} from "@/lib/data/finanzierung";
import { cn } from "@/lib/utils";

interface Props {
  projektId: string;
}

function displayName(m: {
  name: string | null;
  vorname: string | null;
  nachname: string | null;
}) {
  const full = [m.vorname, m.nachname].filter(Boolean).join(" ").trim();
  return full || m.name || "—";
}

export function FinanziererPoolTab({ projektId }: Props) {
  const router = useRouter();
  const [data, setData] = useState<FinanziererPoolResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<FinanziererPoolMember | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await getFinanziererPool({ projektId });
      if (result.error) {
        setLoadError(result.error);
      }
      setData(result);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Pool konnte nicht geladen werden.",
      );
    } finally {
      setLoading(false);
    }
  }, [projektId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loadError) toast.error(loadError);
  }, [loadError]);

  const handleAdd = async (member: FinanziererPoolMember) => {
    setMutating(true);
    try {
      await addFinanziererToPool({ projektId, finanziererId: member.id });
      toast.success(`${displayName(member)} hinzugefügt`);
      setAddOpen(false);
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setMutating(false);
    }
  };

  const handleRemove = async (member: FinanziererPoolMember) => {
    setMutating(true);
    try {
      await removeFinanziererFromPool({ projektId, finanziererId: member.id });
      toast.success(`${displayName(member)} entfernt`);
      setConfirmRemove(null);
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setMutating(false);
    }
  };

  const onRemoveClick = (member: FinanziererPoolMember, poolSize: number) => {
    if (poolSize <= 1) {
      setConfirmRemove(member);
    } else {
      handleRemove(member);
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="p-6 text-sm text-destructive">{loadError}</Card>
    );
  }

  const members = data?.members ?? [];
  const pool = data?.pool ?? [];
  const available = members.filter((m) => !m.in_pool);
  const next = data?.nextAssignee ?? null;

  return (
    <div className="space-y-4">
      {pool.length === 0 ? (
        <Card className="flex items-start gap-3 border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Pool ist leer, keine automatische Zuweisung möglich.</p>
        </Card>
      ) : (
        <Card className="flex items-center gap-3 p-4 text-sm">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
            <ArrowRight className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Nächste Anfrage geht an
            </div>
            <div className="font-semibold">{next ? displayName(next) : "—"}</div>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b p-4">
          <Banknote className="h-4 w-4 text-brand-primary" />
          <h3 className="font-semibold">Finanzierer im Pool</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {pool.length} Mitglied{pool.length === 1 ? "" : "er"}
          </span>
        </div>
        {pool.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Noch keine Finanzierer im Pool.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-right">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pool.map((m, idx) => (
                <TableRow key={m.id}>
                  <TableCell className="text-right text-muted-foreground tabular-nums">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="font-medium">{displayName(m)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.email ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={mutating}
                      onClick={() => onRemoveClick(m, pool.length)}
                      aria-label={`${displayName(m)} entfernen`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="border-t p-4">
          {available.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Alle Finanzierer sind bereits im Pool.
            </p>
          ) : (
            <Popover open={addOpen} onOpenChange={setAddOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={mutating}>
                  <Plus className="mr-2 h-4 w-4" />
                  Finanzierer hinzufügen
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Finanzierer suchen…" />
                  <CommandList>
                    <CommandEmpty>Keine Treffer.</CommandEmpty>
                    <CommandGroup>
                      {available.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={`${displayName(m)} ${m.email ?? ""}`}
                          onSelect={() => handleAdd(m)}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{displayName(m)}</span>
                            {m.email ? (
                              <span className="text-xs text-muted-foreground">
                                {m.email}
                              </span>
                            ) : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </Card>

      <AlertDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Letzter Finanzierer entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRemove ? displayName(confirmRemove) : ""} ist der einzige
              Finanzierer im Pool. Nach dem Entfernen schlagen alle neuen
              Finanzierungs-Anfragen für dieses Projekt fehl, bis du wieder einen
              Finanzierer hinzufügst. Trotzdem entfernen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutating}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutating}
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={(e) => {
                e.preventDefault();
                if (confirmRemove) handleRemove(confirmRemove);
              }}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
