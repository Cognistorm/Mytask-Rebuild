# 4.3.2b Gigs data model: the rest of §3.D, removal columns, analytics tables, S-070, i18n

From: backend-engineer · To: backend-engineer (4.3.3–4.3.8), QA (info) · Date: 2026-10-07

## What I did
- **Migration `apps/api/prisma/migrations/20261007120000_gigs_details_analytics`** (data-model §3.D, §3.S, ADR-012, ADR-024):
  - `gigs`: enum `gig_deleted_by` (`owner`, `staff`), `deleted_by`, `deleted_by_staff_id` (FK `staff`),
    `removal_reason varchar(1000)`, `submitted_at`. `gigs_deleted_ck` replaced: `deleted` ⇔ `deleted_at` ⇔
    `deleted_by`. New `gigs_removal_ck`: staff id and reason only with `deleted_by = 'staff'` — written with
    `IS NOT DISTINCT FROM`, because with a plain `=` the check is NULL while `deleted_by` is NULL and Postgres lets
    the row through (the new test caught it; data model and 4.3.2a handoff corrected). Index
    `gigs_pending_submitted_ix (status, submitted_at) WHERE status = 'pending'`.
  - `gig_upgrades` (price ≥ 100 tetri, extra days from the delivery list, `deleted_at` kept for placed orders),
    `gig_faqs` (100 / 300 chars), `gig_images` + `gig_documents` (FK `files`, UK `(gig_id, position)`
    **DEFERRABLE INITIALLY DEFERRED** so a reorder can swap positions in one transaction), `favorites`
    (PK user + gig, index `(user_id, created_at DESC)`). Children cascade with the gig row (gigs are never
    hard-deleted in the product; status `deleted` keeps them).
  - `analytics_events` partitioned by range on `occurred_at`, PK `(id, occurred_at)`, platform check, a DEFAULT
    partition only; `analytics_daily` with the natural key as a unique expression index
    (`COALESCE(entity_id, zero uuid)`) and a surrogate `id` (recorded in data-model §3.S).
  - Gig reports: no new table, the slice 2 `reports` table has `target_type = 'gig'` and the UK for AC-37.
- **Prisma** models `GigUpgrade`, `GigFaq`, `GigImage`, `GigDocument`, `Favorite`, `AnalyticsEvent`,
  `AnalyticsDaily`; `Gig` relations and removal fields; `User.favorites`.
- **S-070** `moderation.gigs.auto_approve` in `src/platform/settings/registry.ts` (boolean, default OFF as in
  production, area moderation, `settings.moderation.write`); default asserted in `test/settings-registry.test.ts`.
- **i18n**: 23 keys in `packages/i18n/en.json` + `ka.json` (19 from the 4.3.1 handoff §F, 4 from spec 16 /
  ADR-024), placeholders `{{…}}`; `node scripts/check.mjs` OK.
- **Tests**: new `apps/api/test/gigs-schema.test.ts` (11: removal checks incl. migrated staff removal and restore,
  unknown staff id, `submitted_at`, upgrade/FAQ checks, deferred image reorder, document duplicates and cascade,
  favourites order, partitioned events + platform check, daily key incl. the `ON CONFLICT` upsert the aggregation
  job will use). Four older tests that mark gigs deleted now also set `deletedBy: 'owner'`
  (`admin-categories`, `catalog-schema`, `gig-search`). Full API run: **647 passed / 6 skipped**; typecheck and
  lint green.

## Files created/changed
- `apps/api/prisma/migrations/20261007120000_gigs_details_analytics/migration.sql` (new)
- `apps/api/prisma/schema.prisma`, `apps/api/src/generated/prisma/*` (generated)
- `apps/api/src/platform/settings/registry.ts`
- `apps/api/test/gigs-schema.test.ts` (new), `test/settings-registry.test.ts`, `test/admin-categories.test.ts`,
  `test/catalog-schema.test.ts`, `test/gig-search.test.ts`
- `packages/i18n/en.json`, `packages/i18n/ka.json`
- `docs/03-architecture/data-model.md` (§3.D CK wording, deferred UK, upgrade timestamps; §3.S surrogate id)
- `docs/handoffs/2026-10-07-solution-architect-to-backend-product-analyst-4-3-2a-gig-removal-restore.md` (CK wording)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
**4.3.3 (backend):** `createGig`, `getGigCreationEligibility`, `updateGig`, `deleteGig` with the checklist in
ROADMAP 4.3.3 and the 4.3.1 handoff §E. Owner delete sets `status = deleted`, `deleted_at`, `deleted_by = owner`
in one update (the check needs all three). Set `submitted_at = now()` whenever a create/edit puts the gig in
`pending`. Gallery reorder: update all positions inside one transaction (the key is checked at commit).
**4.3.5** owns the monthly partition job (next month's partition + drop after 90 days).

## Open questions / risks
- None for the Owner.
- `revisions_allowed` of migrated gigs stays an Owner question for Phase 5 (data-model §3.D "Owner question 1").
- `t_revisions_included` uses `{{count}}`: i18next will look for `_one` / `_other` forms first and falls back to
  the base key, so "1 revisions included" reads oddly in English. If the Owner wants it, add
  `t_revisions_included_one` later (not in the spec).
