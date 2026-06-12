-- QA hardening (Supabase advisor lint 0025 public_bucket_allows_listing).
--
-- The broad public SELECT policy on storage.objects let any client LIST every
-- file in the objekt-bilder bucket. The app never lists the bucket (no storage
-- .list() calls anywhere) and public image URLs are served via the bucket's
-- `public` flag, which does not depend on this RLS policy. Drop it.
--
-- The admin/support write/update/delete policies on objekt-bilder remain
-- intact; the bucket stays public.
drop policy "objekt-bilder public read" on storage.objects;
