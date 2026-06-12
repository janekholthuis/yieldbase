"use client";

// Kunden-Dokumente — category-grouped checklist with upload, download (signed
// URL) and delete. Ported from the OLD APP KundenDokumenteListe, rewired to the
// Next server actions (listKundenDokumente / recordKundenDokument /
// deleteKundenDokument) instead of TanStack Query.
//
// Used both in the VP-facing Kunden detail (showUploader, canUpload depends on
// ownership) and the customer portal (canUpload = own folder).
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  CircleDashed,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  formatFileSize,
  formatRelative,
  sanitizeFilename,
  unterlagenFor,
  type UnterlageDef,
} from "@/lib/kunden-dokumente";
import {
  listKundenDokumente,
  recordKundenDokument,
  deleteKundenDokument,
  type KundenDokumentItem,
} from "@/lib/actions/dokumente";
import { FileUpload } from "@/components/dokumente/FileUpload";

interface Props {
  kundeId: string;
  berufStatus: string | null;
  /** Current user may upload into and delete from this folder (e.g. portal). */
  canUpload: boolean;
  currentUserId: string;
  /** Show the uploader name (VP view). */
  showUploader?: boolean;
}

export function KundenDokumenteListe({
  kundeId,
  berufStatus,
  canUpload,
  currentUserId,
  showUploader = false,
}: Props) {
  const kategorien = useMemo(() => unterlagenFor(berufStatus), [berufStatus]);
  const [docs, setDocs] = useState<KundenDokumentItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await listKundenDokumente({ kundeId });
      setDocs(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Laden fehlgeschlagen");
      setDocs([]);
    }
  }, [kundeId]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Most recent document per category slug. */
  const byKategorie = useMemo(() => {
    const m = new Map<string, KundenDokumentItem>();
    for (const d of docs ?? []) {
      if (!m.has(d.kategorie)) m.set(d.kategorie, d);
    }
    return m;
  }, [docs]);

  const uploadedCount = kategorien.filter((k) => byKategorie.has(k.slug)).length;
  const totalCount = kategorien.length;
  const pct = totalCount === 0 ? 0 : Math.round((uploadedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Fortschritt
            </div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              <span className="tabular-nums">{uploadedCount}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="tabular-nums">{totalCount}</span>{" "}
              <span className="text-base font-medium text-muted-foreground">
                Unterlagen hochgeladen
              </span>
            </div>
          </div>
          <div className="text-sm font-semibold tabular-nums text-primary">
            {pct}%
          </div>
        </div>
        <Progress value={pct} className="mt-4" />
      </Card>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {docs === null ? (
        <p className="text-center text-sm text-muted-foreground">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" aria-hidden="true" />
          Lade Unterlagen …
        </p>
      ) : (
        <div className="space-y-3">
          {kategorien.map((kat) => {
            const doc = byKategorie.get(kat.slug);
            return (
              <KategorieCard
                key={kat.slug}
                kat={kat}
                doc={doc}
                kundeId={kundeId}
                canUpload={canUpload}
                canDelete={canUpload && doc?.uploaded_by === currentUserId}
                showUploader={showUploader}
                currentUserId={currentUserId}
                onChange={load}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function KategorieCard({
  kat,
  doc,
  kundeId,
  canUpload,
  canDelete,
  showUploader,
  currentUserId,
  onChange,
}: {
  kat: UnterlageDef;
  doc: KundenDokumentItem | undefined;
  kundeId: string;
  canUpload: boolean;
  canDelete: boolean;
  showUploader: boolean;
  currentUserId: string;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleView(d: KundenDokumentItem) {
    if (!d.signed_url) {
      toast.error("Link konnte nicht erzeugt werden");
      return;
    }
    window.open(d.signed_url, "_blank", "noopener,noreferrer");
  }

  async function handleDelete() {
    if (!doc) return;
    setBusy(true);
    try {
      await deleteKundenDokument({ id: doc.id });
      toast.success("Dokument gelöscht");
      setConfirmDelete(false);
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Löschen fehlgeschlagen";
      toast.error("Löschen fehlgeschlagen", { description: msg });
    } finally {
      setBusy(false);
    }
  }

  const isUploaded = !!doc;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{kat.label}</span>
          </div>
          {isUploaded && doc && (
            <div className="mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="truncate">{doc.dateiname}</div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 tabular-nums">
                <span>{formatFileSize(doc.size_bytes)}</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelative(doc.uploaded_at)}</span>
                {showUploader && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>
                      {doc.uploaded_by === currentUserId ? "von dir" : "hochgeladen"}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <StatusPill uploaded={isUploaded} />
      </div>

      <div className="mt-4">
        {isUploaded && doc ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(doc)}
              className="min-h-[44px]"
            >
              <Eye className="h-4 w-4" /> Ansehen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(doc)}
              className="min-h-[44px]"
            >
              <Download className="h-4 w-4" /> Download
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDelete(true)}
                className="min-h-[44px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Löschen
              </Button>
            )}
          </div>
        ) : canUpload ? (
          <FileUpload
            bucket="kunden-dokumente"
            buildPath={({ safeName, id }) =>
              `${kundeId}/${kat.slug}/${id}-${sanitizeFilename(safeName)}`
            }
            label="Datei hierher ziehen oder klicken"
            onUploaded={async (meta) => {
              await recordKundenDokument({
                kundeId,
                dateiname: meta.dateiname,
                kategorie: kat.slug,
                mimeType: meta.mimeType as never,
                sizeBytes: meta.sizeBytes,
                storagePath: meta.storagePath,
              });
              onChange();
            }}
          />
        ) : (
          <p className="text-xs text-muted-foreground">Noch nicht hochgeladen.</p>
        )}
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument löschen?</DialogTitle>
            <DialogDescription>
              {doc?.dateiname
                ? `„${doc.dateiname}" wird entfernt. Du kannst es danach erneut hochladen.`
                : "Das Dokument wird entfernt."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
            >
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? "Lösche …" : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function StatusPill({ uploaded }: { uploaded: boolean }) {
  if (uploaded) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <CheckCircle2 className="h-3.5 w-3.5" /> Hochgeladen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5" /> Fehlt
    </span>
  );
}
