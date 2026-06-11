"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  listMyKundenForPicker,
  assignKundeToEinheit,
} from "@/lib/actions/objekte";

interface KundenPick {
  id: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  einheitId: string;
  title?: string;
  description?: string;
  /** Called after a customer was successfully assigned. */
  onAssigned?: () => void;
}

export function KundenPickerModal({
  open,
  onOpenChange,
  einheitId,
  title = "Kunde zuweisen",
  description,
  onAssigned,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [kunden, setKunden] = useState<KundenPick[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await listMyKundenForPicker();
        if (!cancelled) setKunden(data as KundenPick[]);
      } catch (e) {
        if (!cancelled)
          toast.error(
            e instanceof Error ? e.message : "Kunden konnten nicht geladen werden",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!q.trim()) return kunden;
    const s = q.toLowerCase();
    return kunden.filter((k) =>
      `${k.vorname ?? ""} ${k.nachname ?? ""} ${k.email ?? ""}`
        .toLowerCase()
        .includes(s),
    );
  }, [kunden, q]);

  const handlePick = async (k: KundenPick) => {
    setAssigningId(k.id);
    try {
      await assignKundeToEinheit({ einheitId, kundeId: k.id });
      const name =
        `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || "Kunde";
      toast.success(`${name} zugewiesen`);
      onOpenChange(false);
      onAssigned?.();
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zuweisen fehlgeschlagen");
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <Input
          placeholder="Suche nach Name oder Email …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : filtered.length === 0 ? (
            <div className="space-y-3 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Keine Kunden gefunden.
              </p>
            </div>
          ) : (
            filtered.map((k) => {
              const name =
                `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() ||
                "(ohne Name)";
              const initials = name
                .split(" ")
                .map((s) => s[0])
                .filter(Boolean)
                .slice(0, 2)
                .join("")
                .toUpperCase();
              return (
                <button
                  key={k.id}
                  onClick={() => handlePick(k)}
                  disabled={assigningId != null}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {initials || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {k.email ?? "—"}
                    </div>
                  </div>
                  {assigningId === k.id && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      …
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
