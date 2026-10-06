# 4.2.2b Spec 03 data model: catalog, old slugs, gig core, search documents + local seed + i18n

From: backend-engineer · To: backend-engineer (4.2.3–4.2.8), devops-engineer (new 4.2.0g) · Date: 2026-10-03

## What I did
- **Migration `20261003180000_catalog_gigs_core_search`** (data-model §3.C, §3.R, §3.D core, §3.S; nothing invented):
  - `gig_categories` (+ `gig_category_translations` with `description varchar(300)`, 4.2.2a): trigger sets `depth`
    from the parent (1…3, a 4th level is refused) and refuses moving a category to another parent (the contract has
    no `parentId` on update, so children's depth never goes stale); UK `(depth, slug)`, UK `(legacy_source,
    legacy_id)`; parent, gig and project-category FKs `ON DELETE RESTRICT`; icon/image FKs to `files`.
  - `project_categories` (+ translations): trigger allows a link only to a **top-level** gig category (P-31).
  - `skills` (+ translations): UK `(project_category_id, slug)`, delete of a used project category refused.
  - `slug_redirects` (4.2.2a): enum `slug_entity_type` with all three values; CK: `gig_category` ⇒ scope 1…3,
    others ⇒ 0.
  - **Gig core** `gigs` + `gig_translations` exactly as §3.D: CKs price ≥ 100 tetri, delivery list
    (0,1–7,14,21,30), revisions 0…100 (null only with `legacy_id`), non-negative counters, SEO title/description
    together, `deleted` ⇔ `deleted_at`; trigger checks the category → sub-category → child category branch on insert
    and on update; PIX owner where not deleted, IX `(status, published_at DESC)`, the three category IXs.
    `thumbnail_file_id` NOT NULL (as §3.D). The `ka` translation row being required is left to the slice 3 gig
    service (no DB rule).
  - `search_documents` (§3.S): `tsv` defaults to an empty tsvector (Prisma can create rows; the index service writes
    it by raw SQL), `status` is text (gig and project statuses differ); GIN `tsv`, GIN `search_text gin_trgm_ops`,
    `(entity_type, status, published_at DESC)`, partial IXs on the four category columns, `(entity_type, price)`.
  - Provenance block TM (`translation_source` enum + `source_locale`, `source_hash`, `updated_by_*` with FKs) on all
    five translation tables.
- **Local seed** `apps/api/prisma/seed-catalog.json` + `seed-catalog.ts`, called by `pnpm db:seed` (so by every
  `pnpm local`) **only while the catalogue is empty**. Source (also in the file): the live site's public header menu
  on `/` and `/?locale=en` — 7 / 49 / 189 categories, ka + en names, slugs in menu order (checked: same 245 paths in
  both languages, slugs unique per level, no Georgian in English names; 5 child categories keep their Latin brand
  names in Georgian too, e.g. WordPress) — and `/explore/projects/{slug}` in both languages for the **7 project
  categories** (each linked to the top-level gig category with the same slug, R-S8; their names differ from the gig
  ones, e.g. "გრაფიკული დიზაინი"). The live site lists **no project skills** (project cards carry empty skill lists;
  the legacy skills screen is disabled), so none are seeded; staff add them in 4.2.8. `is_visible` stays the default
  (true). Phase 5 loads the real rows into an empty database.
- **i18n**: the 9 missing keys, en + ka, sorted, `{{n}}` / `{{time}}` placeholders (the spec's `:n` / `:time`):
  `t_recommended`, `t_min_price_greater_than_max`, `t_rating_n_plus`, `t_up_to_delivery`, `t_show_results`,
  `t_featured_badge_hint`, `t_popular_categories`, `t_feature_disabled`, `t_content_shown_in_georgian`.
- **Tests** `apps/api/test/catalog-schema.test.ts` (19): seed file shape, the full live catalogue loaded inside a
  rolled-back transaction (depths from the trigger, links to depth 1), "existing catalogue is left alone", tree
  trigger, per-level slug uniqueness, delete restrictions and cascades, description length, project-category link,
  skill uniqueness, `slug_redirects` scopes and PK, gig checks and branch trigger (insert + update), search document
  defaults and a combined trigram + tsvector query.
- SETUP-LOCAL §3: one sentence on the catalogue loaded at start.

Results: API **452 passed / 6 skipped** (433 + 19), `turbo run lint typecheck` 20/20, `prettier --check .` clean,
i18n check OK (en 3018, ka 3024).

## Found while testing: local PGlite answers wrongly after an error inside a transaction → new ROADMAP 4.2.0g (devops)
After **any database error inside a Prisma transaction** (an interactive `$transaction` or a nested create, which
Prisma runs as one), the **next** query on local PGlite gets a wrong answer: a nested create reports "No 'X' record
was found for a nested create", a `count` returns `null`. Errors outside a transaction are fine. Reproduced with two
throw-away probes (both scenarios). CI uses real PostgreSQL, so CI is not affected; **local tests and `pnpm local`
are** (e.g. a unique-violation race inside a service transaction could make the following request read garbage).
Likely `@electric-sql/pglite-socket` 0.2.11 (with `@electric-sql/pglite` 0.5.8) mishandling the error/rollback of a
pipelined extended-protocol transaction. The 4.2.2b tests keep their expected failures outside transactions (comment
in the test). **4.2.7 and 4.2.8 tests (409 inside service transactions) need this fixed first**, or they must run
with `RUN_INTEGRATION=1` against real PostgreSQL.

## Files created/changed
- `apps/api/prisma/schema.prisma` (+ `User.gigs`), `apps/api/prisma/migrations/20261003180000_catalog_gigs_core_search/migration.sql`
- `apps/api/prisma/seed.ts`, `apps/api/prisma/seed-catalog.ts`, `apps/api/prisma/seed-catalog.json`
- `apps/api/test/catalog-schema.test.ts`
- `packages/i18n/en.json`, `packages/i18n/ka.json`
- `docs/SETUP-LOCAL.md`, `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.3 (backend)**: public catalogue reads (`listCategories` cached ≤ 60 s, `lookupCategory`, `getCategory`,
  `listProjectCategories`, `lookupProjectCategory`) on these tables; Georgian fallback from the translation rows.
- **4.2.0g (devops)**, before 4.2.7: fix or work around the PGlite transaction-error problem above, with a permanent
  regression test (the two probe scenarios).

## Open questions / risks
- None for the Owner.
- `search_documents.owner_listable` exists as designed; 4.2.4 still decides join vs refresh (4.2.1 handoff §E).
