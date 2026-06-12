"use server";

// Client-invokable server actions for document & image metadata.
//
// Architecture: file BYTES are uploaded directly from the browser via the
// authed Supabase client (RLS applies as the signed-in user). These actions
// only RECORD/READ metadata and issue signed URLs for the private buckets:
//   - kunden-dokumente   (PRIVATE) → kunden_dokumente
//   - objekt-bilder      (PUBLIC)  → objekt_bilder
//   - objekt-dokumente   (PRIVATE) → objekt_dokumente
//
// Every action authenticates via requireUser() and runs RLS-scoped queries as
// the signed-in user. Inputs are validated with zod and the upload RULES from
// @/lib/kunden-dokumente.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  ALLOWED_MIME,
  KDOK_BUCKET,
  MAX_UPLOAD_BYTES,
} from "@/lib/kunden-dokumente";

const OBJEKT_BILDER_BUCKET = "objekt-bilder";
const OBJEKT_DOKUMENTE_BUCKET = "objekt-dokumente";

const SIGNED_URL_TTL = 60 * 60; // 1h

const DOKUMENT_KATEGORIE = [
  "grundriss",
  "expose",
  "energieausweis",
  "teilungserklaerung",
  "mietvertrag",
  "kaufvertrag",
  "protokoll_eigentuemerversammlung",
  "sonstiges",
  "wirtschaftsplan",
] as const;

const allowedMime = z.enum(ALLOWED_MIME);

// ───────────────────────── Kunden-Dokumente (PRIVATE) ─────────────────────────

const recordKundenDokumentSchema = z.object({
  kundeId: z.string().uuid(),
  dateiname: z.string().trim().min(1).max(255),
  kategorie: z.string().trim().min(1).max(80),
  mimeType: allowedMime,
  sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES),
  storagePath: z.string().trim().min(1).max(512),
});

export async function recordKundenDokument(
  input: z.input<typeof recordKundenDokumentSchema>,
) {
  const { supabase, userId } = await requireUser();
  const data = recordKundenDokumentSchema.parse(input);

  // Defense-in-depth: the storage path must live under the kunde's folder.
  if (!data.storagePath.startsWith(`${data.kundeId}/`)) {
    throw new Error("Ungültiger Speicherpfad");
  }

  const { data: row, error } = await supabase
    .from("kunden_dokumente")
    .insert({
      kunde_id: data.kundeId,
      dateiname: data.dateiname,
      kategorie: data.kategorie,
      mime_type: data.mimeType,
      size_bytes: data.sizeBytes,
      storage_path: data.storagePath,
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/portal/dokumente");
  revalidatePath(`/kunden/${data.kundeId}`);
  return { ok: true as const, id: row.id };
}

export interface KundenDokumentItem {
  id: string;
  kunde_id: string;
  kategorie: string;
  dateiname: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  signed_url: string | null;
}

const listKundenDokumenteSchema = z.object({ kundeId: z.string().uuid() });

export async function listKundenDokumente(
  input: z.input<typeof listKundenDokumenteSchema>,
): Promise<KundenDokumentItem[]> {
  const { supabase } = await requireUser();
  const { kundeId } = listKundenDokumenteSchema.parse(input);

  const { data, error } = await supabase
    .from("kunden_dokumente")
    .select(
      "id, kunde_id, kategorie, dateiname, storage_path, mime_type, size_bytes, uploaded_at, uploaded_by",
    )
    .eq("kunde_id", kundeId)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  if (rows.length === 0) return [];

  // Batch-sign every storage path (private bucket — never expose raw paths).
  const { data: signed } = await supabase.storage
    .from(KDOK_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      SIGNED_URL_TTL,
    );
  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  return rows.map((r) => ({
    ...r,
    signed_url: urlByPath.get(r.storage_path) ?? null,
  }));
}

const deleteKundenDokumentSchema = z.object({ id: z.string().uuid() });

export async function deleteKundenDokument(
  input: z.input<typeof deleteKundenDokumentSchema>,
) {
  const { supabase } = await requireUser();
  const { id } = deleteKundenDokumentSchema.parse(input);

  const { data: row, error: selErr } = await supabase
    .from("kunden_dokumente")
    .select("storage_path, kunde_id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Dokument nicht gefunden");

  const { error } = await supabase
    .from("kunden_dokumente")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  // Best-effort storage cleanup — soft-delete already removed it from the list.
  await supabase.storage
    .from(KDOK_BUCKET)
    .remove([row.storage_path])
    .catch(() => undefined);

  revalidatePath("/portal/dokumente");
  revalidatePath(`/kunden/${row.kunde_id}`);
  return { ok: true as const };
}

// ───────────────────────── Objekt-Bilder (PUBLIC) ─────────────────────────

const recordObjektBildSchema = z
  .object({
    einheitId: z.string().uuid().optional(),
    projektId: z.string().uuid().optional(),
    url: z.string().url().max(1024),
    alt: z.string().trim().max(255).optional().nullable(),
    sortOrder: z.number().int().min(0).max(100000).optional(),
  })
  .refine((v) => v.einheitId || v.projektId, {
    message: "einheitId oder projektId erforderlich",
  });

export async function recordObjektBild(
  input: z.input<typeof recordObjektBildSchema>,
) {
  const { supabase, userId } = await requireUser();
  const data = recordObjektBildSchema.parse(input);

  const { data: row, error } = await supabase
    .from("objekt_bilder")
    .insert({
      url: data.url,
      alt: data.alt ?? null,
      einheit_id: data.einheitId ?? null,
      projekt_id: data.projektId ?? null,
      ebene: data.einheitId ? "einheit" : "projekt",
      sort_order: data.sortOrder ?? 0,
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (data.einheitId) revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true as const, id: row.id };
}

const deleteObjektBildSchema = z.object({ id: z.string().uuid() });

export async function deleteObjektBild(
  input: z.input<typeof deleteObjektBildSchema>,
) {
  const { supabase } = await requireUser();
  const { id } = deleteObjektBildSchema.parse(input);

  const { data: row, error: selErr } = await supabase
    .from("objekt_bilder")
    .select("url, einheit_id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Bild nicht gefunden");

  const { error } = await supabase.from("objekt_bilder").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Best-effort: derive the storage path from the public URL and remove the object.
  const path = extractStoragePath(row.url, OBJEKT_BILDER_BUCKET);
  if (path) {
    await supabase.storage
      .from(OBJEKT_BILDER_BUCKET)
      .remove([path])
      .catch(() => undefined);
  }

  if (row.einheit_id) revalidatePath(`/objekte/${row.einheit_id}`);
  return { ok: true as const };
}

// ───────────────────────── Objekt-Dokumente (PRIVATE) ─────────────────────────

const recordObjektDokumentSchema = z
  .object({
    einheitId: z.string().uuid().optional(),
    projektId: z.string().uuid().optional(),
    url: z.string().trim().min(1).max(1024), // storage path (private bucket)
    dateiname: z.string().trim().min(1).max(255),
    kategorie: z.enum(DOKUMENT_KATEGORIE),
    mimeType: z.string().trim().max(120).optional().nullable(),
    sizeBytes: z.number().int().min(1).max(MAX_UPLOAD_BYTES).optional().nullable(),
  })
  .refine((v) => v.einheitId || v.projektId, {
    message: "einheitId oder projektId erforderlich",
  });

export async function recordObjektDokument(
  input: z.input<typeof recordObjektDokumentSchema>,
) {
  const { supabase, userId } = await requireUser();
  const data = recordObjektDokumentSchema.parse(input);

  const { data: row, error } = await supabase
    .from("objekt_dokumente")
    .insert({
      url: data.url,
      dateiname: data.dateiname,
      kategorie: data.kategorie,
      mime_type: data.mimeType ?? null,
      size_bytes: data.sizeBytes ?? null,
      einheit_id: data.einheitId ?? null,
      projekt_id: data.projektId ?? null,
      ebene: data.einheitId ? "einheit" : "projekt",
      uploaded_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  if (data.einheitId) revalidatePath(`/objekte/${data.einheitId}`);
  return { ok: true as const, id: row.id };
}

const listObjektDokumenteSignedUrlsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/** Resolve fresh signed URLs for a set of objekt_dokumente rows (private bucket). */
export async function listObjektDokumenteSignedUrls(
  input: z.input<typeof listObjektDokumenteSignedUrlsSchema>,
): Promise<Record<string, string>> {
  const { supabase } = await requireUser();
  const { ids } = listObjektDokumenteSignedUrlsSchema.parse(input);

  const { data, error } = await supabase
    .from("objekt_dokumente")
    .select("id, url")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const out: Record<string, string> = {};
  if (rows.length === 0) return out;

  // The `url` column stores the storage path for newly-uploaded private docs.
  const paths = rows.map((r) => extractStoragePath(r.url, OBJEKT_DOKUMENTE_BUCKET) ?? r.url);
  const { data: signed } = await supabase.storage
    .from(OBJEKT_DOKUMENTE_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL);
  const urlByPath = new Map(
    (signed ?? []).map((s) => [s.path, s.signedUrl] as const),
  );

  rows.forEach((r, i) => {
    const signedUrl = urlByPath.get(paths[i]);
    if (signedUrl) out[r.id] = signedUrl;
  });
  return out;
}

const deleteObjektDokumentSchema = z.object({ id: z.string().uuid() });

export async function deleteObjektDokument(
  input: z.input<typeof deleteObjektDokumentSchema>,
) {
  const { supabase } = await requireUser();
  const { id } = deleteObjektDokumentSchema.parse(input);

  const { data: row, error: selErr } = await supabase
    .from("objekt_dokumente")
    .select("url, einheit_id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) throw new Error(selErr.message);
  if (!row) throw new Error("Dokument nicht gefunden");

  const { error } = await supabase
    .from("objekt_dokumente")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);

  const path = extractStoragePath(row.url, OBJEKT_DOKUMENTE_BUCKET) ?? row.url;
  await supabase.storage
    .from(OBJEKT_DOKUMENTE_BUCKET)
    .remove([path])
    .catch(() => undefined);

  if (row.einheit_id) revalidatePath(`/objekte/${row.einheit_id}`);
  return { ok: true as const };
}

// ───────────────────────── Helpers ─────────────────────────

/**
 * Given a Supabase public/sign URL OR a raw storage path, return the object key
 * relative to the bucket. Returns null if it cannot be derived.
 */
function extractStoragePath(value: string, bucket: string): string | null {
  // Raw path already (no protocol) — return as-is unless it embeds the bucket.
  if (!value.startsWith("http")) {
    const marker = `${bucket}/`;
    const idx = value.indexOf(marker);
    return idx >= 0 ? value.slice(idx + marker.length) : value;
  }
  try {
    const u = new URL(value);
    const marker = `/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}
