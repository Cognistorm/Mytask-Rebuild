# 3X.7 Category colours in the API

From: backend-engineer · To: web-engineer (3X.8 onwards); also mobile-engineer (3X.16–3X.17), qa-engineer · Date: 2026-10-06

## What I did
- **Migration** `apps/api/prisma/migrations/20261006120000_category_colors/migration.sql` (ADR-023 §1, §4):
  - adds `gig_categories.color char(7)`;
  - adds CK `gig_categories_color_ck`: top level only, `^#[0-9A-F]{6}$`;
  - adds the partial UK `gig_categories_color_top_key` (`WHERE depth = 1 AND color IS NOT NULL`);
  - gives the existing top-level categories the 12 starter colours in `position`, then `id` order. Rows after the 12th stay `null`.
  - The SQL lists the colours as literals, because a migration must not change later. A test checks them against `category.starter` in `packages/tokens/tokens.json`.
- **Prisma**: `GigCategory.color String? @db.Char(7)`.
- **Palette**: `apps/api/src/modules/catalog/category-colors.ts` reads `@mytask/tokens/tokens.json` (new workspace dependency of `@mytask/api`) and exports:
  - `CATEGORY_STARTER`;
  - `firstUnusedStarter`;
  - `normalizeColor`.
  - The API keeps no copy of the palette.
- **Public reads** return the resolved colour (ADR-023 §3):
  - `listCategories`: every node has its top-level ancestor's colour (part of the 60 s cached tree);
  - `lookupCategory` / `getCategory`: `color`, every `breadcrumb[]` item and every `children[]` item;
  - `getHome`: `categoryRows[].category.color` and `featuredCategories[].category.color`;
  - `listProjectCategories` / `lookupProjectCategory`: the linked category's colour, or `null`.
- **Admin**:
  - `AdminCategory` has `color` (stored, always `null` below the top level) and `resolvedColor`;
  - `AdminProjectCategory.color`;
  - create/update:
    - upper-cases the colour;
    - refuses `color` below the top level with `400 VALIDATION_FAILED` (field `color`, code `top_level_only`);
    - refuses a taken colour with `409 DUPLICATE`, `details.field = color`, `details.category {id, name}` (name in the request language), `t_category_color_taken`;
  - a create without `color` takes the first unused starter colour, or `null` when all 12 are used;
  - saving a category's own colour again is accepted;
  - every colour write takes one advisory lock, after the slug locks (same order in create and update);
  - a unique-index violation from a race returns the same 409 for the colour. A slug clash still returns 409 with field `slug`;
  - `category.create` / `category.update` audit snapshots include `color`;
  - the public tree cache is emptied as before.
- **Errors**: `PATTERN_KEYS.color` → `t_category_color_invalid` for the schema `pattern` failure.
- **i18n**: `t_category_color_invalid`, `t_category_color_top_level_only` and `t_category_color_taken` are filled in English and Georgian. The other 13 keys of ADR-023 §11 are added in 3X.15.
- **Seed**: `pnpm db:seed` gives each seeded top-level category the first unused starter colour. On an empty catalogue this is position order.
- **Generated clients**: `pnpm gen` brings `packages/types` and `packages/api-client` to contract **1.4.0**, so `pnpm gen:check` passes again.

### Verification
- `test/category-colors.test.ts`: 20 tests, covering:
  - the palette is the same in tokens, the migration and the API;
  - the migration's assignment re-run on real rows (order, 13th and later → `null`, children never get one);
  - the database refuses a colour on a sub-category, lower case, a bad format and a second holder;
  - the default pick, including "all 12 used → `null`" and three concurrent creates getting three different colours;
  - upper-casing; `pattern` / `top_level_only` / 409 with the holder's name in `ka` and `en`;
  - two concurrent saves of the same colour (one 201, one 409);
  - a slug clash still reports `slug`; update: change + audit before/after + the public tree shows it at once, own colour again, cannot be cleared;
  - the 60 s cache for writes outside the admin API;
  - every public and admin read in ADR-023 §3, including the `null` brand fallback.
- The full `@mytask/api` suite passes: 44 files, 635 passed, 6 skipped. Two existing expectations were updated for the new `color` field in `catalog.test.ts`. The seed now takes the first unused starter colour, so a load into a database that already has coloured categories does not hit the unique index. `tsc --noEmit` passes for api, admin, mobile, ui, api-client and types; ESLint, Prettier and the i18n check pass.

## Files created/changed
- created: the migration, `src/modules/catalog/category-colors.ts`, `test/category-colors.test.ts`, this handoff
- changed: `apps/api/package.json`, `pnpm-lock.yaml`, `prisma/schema.prisma`, `prisma/seed-catalog.ts`, `src/modules/catalog/{categories,home,project-categories,admin-categories,admin-project-catalog}.service.ts`, `src/platform/errors/error.filter.ts`, `packages/i18n/{en,ka}.json`, `packages/types/src/generated/*`, `packages/api-client/src/generated/operations.ts`, `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **3X.8 web foundation**: the colour is now in every response listed above. Read `color` (public) or `resolvedColor` (admin). A `null` colour means the brand values, which are the `--mt-cat-*` defaults in `tokens.css`.
- **Local DB**: run `pnpm --filter @mytask/api db:deploy` (or `pnpm local`, which migrates) to get the column and the starter colours on the existing categories.
- **Staging**: the migration runs with the next `bash scripts/deploy-staging.sh`.

## Open questions / risks
- None for the Owner.
- The `apps/web` `tsc` reports a missing `zz-exp` page from a stale `.next/dev/types` file. No such page exists in `src`. It is a local build cache, not part of this change; deleting `apps/web/.next` clears it.
- `apps/api/src/app.module.ts` was modified before this task and is still left uncommitted.
