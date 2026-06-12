# Investagon → Supabase Sync

Pulls projects and properties from the Investagon API and upserts them into
the local `projekte` / `einheiten` tables, keyed on a new `investagon_id`
column. The full raw API object for every record is stored in a `raw` jsonb
column so no data is lost — even for fields not yet mapped to dedicated
columns.

## Endpoints used

Base URL: `https://api.investagon.com/api/`
Auth: every request carries `organization_id` and `api_key` as query params.
Collections are API Platform / Hydra envelopes; pagination follows
`hydra:view → hydra:next` until no next link remains.

| Endpoint                  | Used for                          |
|---------------------------|-----------------------------------|
| `GET /api/api_projects`   | Projects → `projekte`             |
| `GET /api/api_properties` | Properties (units) → `einheiten`  |
| `GET /api/api_parking_spots` | not synced yet (future)        |
| `GET /api/reservations`   | not synced yet (future)           |

Both list endpoints accept `updated_after` (`Y-m-d H:i:s`) for incremental
sync and `?page=N`. Properties also accept `?project=`.

## Env vars (required)

Never hardcoded — read from the environment, with a clear error if missing:

```
INVESTAGON_ORG_ID=...      # Investagon organization_id
INVESTAGON_API_KEY=...     # Investagon api_key
```

The sync writes with the service-role client, so it also needs the existing
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

> Add `INVESTAGON_ORG_ID` and `INVESTAGON_API_KEY` to `.env.local` (local)
> and to the deployment environment. Document dummy values in
> `.env.local.example`.

## Field → column mapping

### ApiProject → `projekte` (upsert on `investagon_id`)

| Investagon field    | projekte column   | Notes                                       |
|---------------------|-------------------|---------------------------------------------|
| `id`                | `investagon_id`   | conflict key (unique)                        |
| `name`              | `name`            | direct                                       |
| `name` (fallback)   | `adresse`         | `adresse` is NOT NULL; placeholder if no name. Overwritten later from the linked property's address (best-effort). |
| _entire object_     | `raw` (jsonb)     | full payload preserved                       |
| `properties`, `updated`, `external_id`, `prototypeId`, `externalSyncId`, `propertiesCount`, … | — | **stored in `raw` only** |

### ApiProperty → `einheiten` (upsert on `investagon_id`)

| Investagon field            | einheiten column  | Notes                                  |
|-----------------------------|-------------------|----------------------------------------|
| `id`                        | `investagon_id`   | conflict key (unique)                  |
| `project` (IRI)             | `projekt_id`      | resolved to the `projekte` row via its `investagon_id`. If unresolvable, the property is **skipped** (FK is NOT NULL). |
| `object_apartment_number`   | `wohnungsnummer`  | falls back to `id` if empty            |
| `statusName`                | `status` (enum)   | best-effort map → `einheit_status`     |
| _entire object_             | `raw` (jsonb)     | full payload preserved                 |
| `object_country/postal_code/city/street/house_number` | — | no einheiten columns; **stored in `raw`**, and combined into the parent projekt's `adresse` (best-effort). |
| `active`, `visibility`, `commission`, `selling_price_commission`, `listing_broker`, `prototypeId`, `updated`, … | — | **stored in `raw` only** |

#### `statusName` → `einheit_status` mapping

The local enum is
`verfuegbar | reserviert | in_finanzierung | kaufvertrag_bestellt | notartermin | verkauft | abgebrochen`.

| `statusName` contains (case-insensitive) | mapped status          |
|------------------------------------------|------------------------|
| `verkauft` / `sold`                      | `verkauft`             |
| `notar`                                  | `notartermin`          |
| `kaufvertrag` / `beurkund`               | `kaufvertrag_bestellt` |
| `finanzier`                              | `in_finanzierung`      |
| `reserv`                                 | `reserviert`           |
| `abgebrochen` / `storniert` / `cancel`   | `abgebrochen`          |
| anything else (incl. frei/verfügbar)     | `verfuegbar`           |

## What's mapped vs. stored-in-raw-only

- **Mapped to columns:** project `name`; property `wohnungsnummer`, `status`,
  parent `projekt_id`; and `investagon_id` on both tables.
- **Raw-only:** everything else (prices, areas, commission, address parts,
  visibility/active flags, prototype/external ids, parking spots, …) lives in
  the `raw` jsonb column. Promote any of these to real columns later once the
  exact field names are confirmed against a live response.

## How to run the sync

`syncInvestagon()` is a server action in
`src/lib/actions/investagon.ts`. It is **admin/support-only**
(`requireRole("admin","support")`) and writes via the service-role admin
client (bypassing RLS).

Wire it to either:

1. **An admin button** (client component):
   ```tsx
   import { syncInvestagon } from "@/lib/actions/investagon";
   // onClick: const { projects, properties } = await syncInvestagon();
   ```
2. **A route / cron** that imports and calls `syncInvestagon()`.

Optional incremental sync: pass `{ updatedAfter: "2026-06-01 00:00:00" }`.

Each run inserts a row into `investagon_sync_log` (`status='running'`), then
updates it with `projects_synced` / `properties_synced` and
`status='success'` or `status='error'` (+ `error` message). The table is
admin-only via RLS.

## Before it works: apply the migration

`supabase/migrations/20260612000000_investagon_sync.sql` adds:

- `projekte.investagon_id` (text, unique) + `projekte.raw` (jsonb)
- `einheiten.investagon_id` (text, unique) + `einheiten.raw` (jsonb)
- `investagon_sync_log` table + admin-only RLS policy
- supporting indexes

This migration is **not applied automatically**. Apply it (e.g.
`supabase db push` / via the Supabase dashboard) and **regenerate the
Supabase types** afterwards. Until the types are regenerated, the upserts on
the new `investagon_id` / `raw` columns use narrow `as` casts in
`src/lib/actions/investagon.ts`; once types are regenerated those casts can be
removed.

## Open questions

- **Price / area fields:** the OpenAPI summary for `ApiProperty` does not list
  price/area fields (e.g. Kaufpreis, Wohnfläche, Zimmer, Miete). They are
  currently captured only in `raw`. Confirm the exact field names against a
  live response, then map them to `einheiten.kaufpreis` / `wohnflaeche` /
  `zimmer` / `miete`.
- **Project address:** projects carry no address in Investagon; the parent
  projekt's `adresse` is filled best-effort from its first property's address.
  Confirm whether a canonical project-level address is available.
- **Parking spots & reservations:** endpoints exist but are not synced yet.
