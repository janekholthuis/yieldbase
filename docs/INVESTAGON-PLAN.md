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
| `GET /api/api_projects`   | **Enumerate** projects (ids/names) |
| `GET /api/projects/{id}`  | **Full** project → `projekte` + photos/files |
| `GET /api/api_properties` | **Enumerate** units per project (ids + status) |
| `GET /api/properties/{id}`| **Full** unit → `einheiten` + photos/files |
| `GET /api/api_parking_spots` | not synced yet (future)        |
| `GET /api/reservations`   | not synced yet (future)           |

**Two-tier model (important):** the `Api*` list endpoints are *thin* — they
only expose address + status. The real financials/structure/media live on the
**full** `Project` / `Property` resources (schemas `Project-project.read` ~48
fields, `Property-property.read` ~114 fields). The sync therefore enumerates via
the list endpoints and then fetches the full resource **per entity** (N+1, run
with limited concurrency). Earlier versions synthesised fake financials because
they only read the thin endpoints — that is gone; data is now real.

Both list endpoints accept `updated_after` (`Y-m-d H:i:s`) for incremental
sync and `?page=N`. Properties also accept `?project=`. `runInvestagonSync`
also accepts `projectLimit` to cap how many projects are processed (testing /
partial syncs).

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

## Real field → column mapping (current)

Verified against live data (org `erfolg-mit-immobilien`, 222 projects).

### `Property-property.read` → `einheiten` (upsert on `investagon_id`)

| Investagon field                     | einheiten column            |
|--------------------------------------|-----------------------------|
| `object_size`                        | `wohnflaeche`               |
| `object_rooms`                       | `zimmer`                    |
| `object_floor` (parsed, "2.OG"→2, "EG"→0) | `etage`                |
| `purchase_price_apartment`           | `kaufpreis`                 |
| `purchase_price_parking`             | `stellplatz_preis` (+ `stellplaetze_anzahl` = 1 if > 0) |
| `rent_apartment_month`               | `miete`                     |
| `object_balcony` ("ja"/"nein")       | `balkon`                    |
| `rent_status` ("rented")             | `vermietet`                 |
| `rented_since`                       | `vermietet_seit`            |
| `depreciation_rate_building_manual`  | `afa_satz` (fallback 2.0)   |
| `energy_efficiency_class` (upcased)  | `energieklasse`             |
| `heating_type`                       | `heizungsart`               |
| `property_kind` → bestand/neubau     | `objektzustand`             |
| `property_usage` → wohnen/gewerbe    | `nutzungsart`               |
| `operation_cost_tenant_apartment`    | `hausgeld_umlagefaehig`     |
| `operation_cost_landlord_apartment`  | `hausgeld_nicht_umlagefaehig` |
| `operation_cost_reserve_apartment`   | `instandhaltungsruecklage`  |
| `object_share_owner`                 | `miteigentumsanteil`        |
| `statusName`                         | `status` (6-value enum)     |
| `photos[].filename` (CDN URL)        | `objekt_bilder` (ebene einheit) |
| `files[].filename` (CDN URL)         | `objekt_dokumente` (ebene einheit) |
| _entire object_                      | `raw` (jsonb)               |

### `Project-project.read` → `projekte` (upsert on `investagon_id`)

| Investagon field             | projekte column     |
|------------------------------|---------------------|
| `name`                       | `name`, `adresse` (until enriched) |
| `object_building_year`       | `baujahr`           |
| `object_operator_name`       | `bautraeger`        |
| `photos[0].filename`         | `cover_image_url` + `objekt_bilder` (ebene projekt) |
| `files[].filename`           | `objekt_dokumente` (ebene projekt) |
| _entire object_              | `raw` (jsonb)       |

Project address/coords are enriched from the first property:
`adresse`, `stadt`, `plz`, `bundesland` (← property `province`), `geo`
(← property `lat`/`lng`).

**Media idempotency:** on re-sync, previously-synced media (rows whose `url`
starts with `https://tool.investagon.com`) are deleted for the touched objects
before re-insert, so manually-uploaded images/docs are preserved.

---

## Legacy mapping notes (thin endpoints — superseded)

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

## Scheduled incremental sync (Vercel Cron)

`vercel.json` registers a daily cron (`0 4 * * *`) hitting
`GET /api/cron/investagon-sync`. The route:

- is protected by **`CRON_SECRET`** — it requires `Authorization: Bearer <CRON_SECRET>`
  (Vercel Cron sends this automatically when the env var is set). **Add
  `CRON_SECRET` to the Vercel project env** (and `.env.local` for local testing).
- runs an **incremental** sync for every org with Investagon credentials, using
  `updated_after` = last successful sync − 1h overlap;
- **skips** orgs with no prior successful sync (the long initial backfill must be
  run once via `scripts/seed-investagon.ts`), so the cron never times out.

Adjust the cadence in `vercel.json` as needed.

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

## Open questions / follow-ups

- ~~Price / area fields~~ **RESOLVED** — they live on the full `Property`
  resource (`object_size`, `object_rooms`, `purchase_price_apartment`,
  `rent_apartment_month`, …) and are now mapped to real columns.
- ~~Project address~~ **RESOLVED** — enriched from the first property; coords
  also captured into `projekte.geo`.
- **Full backfill:** the verified run only processed 1 of 222 projects
  (`projectLimit`). A full sync (all 222 projects, ~thousands of units +
  photos) still needs to be triggered — it makes one full-Property GET per unit
  (N+1), so it takes several minutes. Run via the admin action `syncInvestagon`
  or `npx tsx scripts/seed-investagon.ts erfolg-mit-immobilien`.
- **Incremental semantics:** `updated_after` filters the *list* endpoints
  independently for projects and properties. A property changing does not bump
  its project's `updated`, so incremental runs may miss the parent project row
  (units still sync). Full runs are exhaustive.
- **Parking spots & reservations:** endpoints exist but are not synced yet.
- **More mappable fields:** the full `Property` has ~114 fields; many finance
  details (transaction rates, M3 financing, MaBV phases on the project) are
  preserved in `raw` but not yet promoted to columns/`kalkulation`.
