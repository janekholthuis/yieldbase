"use client";

// Reusable drop-zone / file-input upload control.
//
// Flow: validate (mime + size) → upload BYTES to the given bucket+path via the
// browser Supabase client (RLS as the signed-in user) → call the matching
// `record*` server action with the resulting metadata → toast + router.refresh().
//
// File bytes never go through the server action; only metadata does.
import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_MIME,
  ALLOWED_EXT_HINT,
  MAX_UPLOAD_BYTES,
  formatFileSize,
  randomId,
  sanitizeFilename,
} from "@/lib/kunden-dokumente";

export type StorageBucket = "kunden-dokumente" | "objekt-bilder" | "objekt-dokumente";

export interface UploadedFileMeta {
  /** Object key relative to the bucket (always set). */
  storagePath: string;
  /** Public URL — only for public buckets. */
  publicUrl: string | null;
  dateiname: string;
  mimeType: string;
  sizeBytes: number;
}

interface FileUploadProps {
  bucket: StorageBucket;
  /**
   * Builds the object key for one file. Receives the (sanitized) original name
   * plus a per-upload random id so callers can mirror the OLD APP path shape.
   */
  buildPath: (args: { safeName: string; id: string; file: File }) => string;
  /** Restrict accepted mime types (defaults to PDF/JPG/PNG from the rules). */
  acceptedMime?: readonly string[];
  /** `accept` attribute for the native input. */
  accept?: string;
  /** Max bytes (defaults to 20 MB from the rules). */
  maxBytes?: number;
  /** Allow selecting multiple files at once. */
  multiple?: boolean;
  /** Disable the control (e.g. missing category selection). */
  disabled?: boolean;
  /** Label shown inside the drop-zone. */
  label?: string;
  /**
   * Called after a successful storage upload with the file metadata. Should
   * invoke the matching `record*` server action. Throw to signal failure (the
   * uploaded object is then removed best-effort).
   */
  onUploaded: (meta: UploadedFileMeta) => Promise<void>;
  className?: string;
}

export function FileUpload({
  bucket,
  buildPath,
  acceptedMime = ALLOWED_MIME,
  accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png",
  maxBytes = MAX_UPLOAD_BYTES,
  multiple = false,
  disabled = false,
  label = "Datei hierher ziehen oder klicken",
  onUploaded,
  className,
}: FileUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleOne = useCallback(
    async (file: File) => {
      if (!acceptedMime.includes(file.type)) {
        toast.error(`${file.name}: Dateiformat nicht erlaubt`, {
          description: ALLOWED_EXT_HINT,
        });
        return false;
      }
      if (file.size > maxBytes) {
        toast.error(`${file.name}: Datei zu groß`, {
          description: `Maximal ${formatFileSize(maxBytes)} erlaubt. Diese Datei ist ${formatFileSize(file.size)} groß.`,
        });
        return false;
      }

      const supabase = createClient();
      const safeName = sanitizeFilename(file.name);
      const path = buildPath({ safeName, id: randomId(), file });

      const up = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (up.error) {
        // TODO(user): storage RLS policy — if uploads are denied here, the
        // signed-in user lacks INSERT on this bucket. Do NOT switch to the
        // service-role client; add a storage RLS policy instead.
        toast.error(`${file.name}: Upload fehlgeschlagen`, {
          description: up.error.message,
        });
        return false;
      }

      const publicUrl =
        bucket === "objekt-bilder"
          ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
          : null;

      try {
        await onUploaded({
          storagePath: path,
          publicUrl,
          dateiname: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        });
      } catch (e) {
        // Roll back the orphaned object if metadata recording failed.
        await supabase.storage.from(bucket).remove([path]).catch(() => undefined);
        const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
        toast.error(`${file.name}: ${msg}`);
        return false;
      }
      return true;
    },
    [acceptedMime, maxBytes, bucket, buildPath, onUploaded],
  );

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0 || disabled) return;
      setBusy(true);
      let ok = 0;
      try {
        const files = Array.from(list);
        for (const f of files) {
           
          if (await handleOne(f)) ok++;
        }
        if (ok > 0) {
          toast.success(
            ok === 1 ? "Datei hochgeladen" : `${ok} Dateien hochgeladen`,
          );
          router.refresh();
        }
      } finally {
        setBusy(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [disabled, handleOne, router],
  );

  return (
    <label
      className={[
        "flex min-h-[96px] cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm transition-colors",
        dragOver
          ? "border-primary bg-primary/5 text-primary"
          : "border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:border-primary hover:text-primary",
        busy || disabled ? "pointer-events-none opacity-60" : "",
        className ?? "",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={busy || disabled}
        onChange={(e) => void handleFiles(e.target.files)}
        aria-label={label}
      />
      {busy ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>Lade hoch …</span>
        </>
      ) : (
        <>
          <Upload className="h-5 w-5" aria-hidden="true" />
          <span className="font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">{ALLOWED_EXT_HINT}</span>
        </>
      )}
    </label>
  );
}
