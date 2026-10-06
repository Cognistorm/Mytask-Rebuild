# 3X.5 Category colours: ADR-023, data model, contract 1.4.0

From: solution-architect · To: ui-ux-designer (3X.6); also backend-engineer (3X.7), web/admin (3X.8…3X.15), mobile (3X.16, 3X.17) · Date: 2026-10-06

## What I did
- **ADR-023 "Category colours"** (`docs/03-architecture/adr/023-category-colours.md`, accepted). Decisions:
  - **Storage**: `gig_categories.color char(7) null`. CK `gig_categories_color_ck` = `color IS NULL OR (depth = 1 AND color ~ '^#[0-9A-F]{6}$')` (format, upper case and top level in one constraint). Partial UK `gig_categories_color_top_key (color) WHERE depth = 1 AND color IS NOT NULL` (the real guard for EC-2). Requests accept any case; the API upper-cases before checking and storing. Derived shades are never stored or sent.
  - **`null`** = no colour, so clients use the brand values. Staff can change a colour but not clear it (`CategoryUpdateRequest.color` is not nullable).
  - **Resolution in the API**: every node of `listCategories`, `CategoryDetail` plus each breadcrumb and children item, the `getHome` rows and tiles, and `ProjectCategory` carry the **resolved** top-level colour. `AdminCategory` has `color` (stored) and `resolvedColor`. `AdminProjectCategory.color` is the linked category's colour.
  - **Default for a new top-level category: server side.** If `color` is omitted, the API assigns the first starter colour that is not in use (§8.1 order: 7 starters, then S1…S5). When all 12 are used, it stores `null`. The palette's single source is `packages/tokens` `categoryStarter`, which the API reads from `@mytask/tokens/tokens.json`. The admin form pre-selects the same swatch.
  - **Errors** follow CONVENTIONS §7.3 (common codes, field codes and message keys; no new top-level `code`). This matches how slugs and images already report the same cases:
    - bad format → `400 VALIDATION_FAILED`, field `color`, code `pattern`, `t_category_color_invalid`;
    - colour below the top level → `400 VALIDATION_FAILED`, field `color`, code `top_level_only`, `t_category_color_top_level_only`;
    - colour already taken → `409 DUPLICATE`, `details.field = color`, `details.category {id, name}`, `t_category_color_taken` (also after a race, through the unique index).
  - **Warnings** ("very similar" ΔE < 0.08, "reserved" ΔE < 0.06) are computed **by the admin client** with `packages/tokens` against `adminListCategories`. The API returns no warnings, because they never block a save.
  - **Level changes**: impossible today (the depth trigger refuses any new `parent_id`; the contract has no `parentId` on update). If a level change is ever allowed, the CK drops the colour (EC-3). A delete frees the colour (EC-4).
  - **Cache, audit, permission**: no new cache. The colour is in the 60 s tree cache, which staff writes already empty; the other reads are not cached. The colour is in the existing `category.create` / `category.update` audit snapshots. The permission stays `catalog.write`.
  - **ETL**: legacy has no colour. Phase 5 assigns the starter colours in `position` order, the same rule as the 3X.7 migration.
- **Data model** (`docs/03-architecture/data-model.md`): revision note, the §3.C column row with CK/UK, a resolution paragraph, and the §12.2 ETL note. No new table.
- **Contract 1.4.0** (additive): new D2 schemas `CategoryColor`, `CategoryColorInput` and `CategoryColorRef` (flat). The fields listed above, operation descriptions with the errors, and `x-covers`. `info.version` 1.3.2 → 1.4.0, with the changelog line in `src/openapi.base.yaml`.
- **NEW ACs**: spec 03 **AC-38** (resolved colour on every public category read) and **AC-39** (visible within 60 s); spec 16 **AC-60a** (top-level colour: format, level, unique, default, warnings, audit) and **AC-61a** (inherited colour shown read-only in admin). Coverage rows: `coverage/03.md`, `coverage/16.md` (DELEGATED:D2), `coverage/16-d2.md`. `ownership.yaml` delegates 60a/61a to D2. README counts: 719 ACs.

### Verification
- `pnpm contract:verify` (= `npm ci` + `verify:final` in `docs/04-api`): Redocly lint of the sources **valid**, bundle rebuilt (1.4.0), Redocly lint of the bundle **valid**, `check-contract --final` **0 errors, 0 warnings**, `check-coverage --final` **0 errors, 0 warnings**. Coverage: **719 ACs, 633 API, 86 NOT-API, 0 delegated open, 0 missing** (spec 03 39/39, spec 16 81/81).
- **oasdiff v1.32.1** (the CI version, the Windows release binary run locally because Docker is not running), `breaking main→branch --fail-on ERR --severity-levels oasdiff-severity-levels.txt`: **"No breaking changes", exit 0**. The same with `--fail-on WARN`: exit 0. Changelog: 25 INFO (23 `response-required-property-added`, 2 `new-optional-request-property`).
  - A first draft modelled `CategoryColorRef` as `allOf [CategoryRef, {color}]` and swapped the `oneOf` branch of `AdminProjectCategory.gigCategory`. oasdiff reported that as 28 ERR, because it compares `allOf` branches one by one and treats a `oneOf` branch swap as a break.
  - Fix: the schema is flat, and `gigCategory` stays `CategoryRef` with the colour on `AdminProjectCategory.color` (ADR-023 §10).
- **Generated types not regenerated here (deliberate).** I ran `pnpm gen`, which produced 1.4.0 types. `@mytask/api` typecheck then failed with 9 errors in `categories.service.ts`, `home.service.ts`, `project-categories.service.ts`, `admin-categories.service.ts` and `admin-project-catalog.service.ts`, because the new fields are required. So I reverted `packages/types/src/generated` and `packages/api-client/src/generated` to 1.3.2. `@mytask/api` typecheck is green again. **3X.7 runs `pnpm gen` together with the backend change.** Until then `pnpm gen:check` shows a difference on this branch. (Separately, `@mytask/web` typecheck has an existing failure from a stale `.next/dev/types/validator.ts` entry for a `zz-exp` route that does not exist in `src`. It is unrelated to this task.)

## Files created/changed
- created `docs/03-architecture/adr/023-category-colours.md`
- created this handoff
- `docs/03-architecture/data-model.md`
- `docs/02-specs/03-categories-and-search.md` (AC-38, AC-39, "Updated" line)
- `docs/02-specs/16-admin-panel.md` (AC-60a, AC-61a, "Updated" line)
- `docs/04-api/src/schemas/d2.yaml`, `docs/04-api/src/paths/d2-catalog-gigs-reviews-content.yaml`, `docs/04-api/src/openapi.base.yaml`, `docs/04-api/src/ownership.yaml`
- generated: `docs/04-api/openapi.yaml`, `docs/04-api/src/openapi.root.yaml`, `docs/04-api/coverage/SUMMARY.md`
- `docs/04-api/coverage/03.md`, `coverage/16.md`, `coverage/16-d2.md`, `docs/04-api/README.md`

## What the next agent must do
**3X.6 (ui-ux-designer, tokens).** Beyond the visual-refresh §11 list, ADR-023 needs these:
1. `categoryStarter` in `tokens.json` (not only in JS). The 12 colours go in the exact §8.1 order (violet, rose, blue, gold, sky, navy, leaf green, then S1…S5), upper-case `#RRGGBB`. The API reads this JSON for the default pick (ADR-023 §4), so the order is behaviour.
2. `categorySimilarDeltaE` 0.08, `categoryReservedDeltaE` 0.06 and the reserved colours with a meaning id (`brand` for teal 600 and 700, `error`, `success`, `featured`). The meaning id selects `t_category_color_meaning_*`.
3. An exported OKLab distance helper (plus a small `findSimilar` / `findReserved` if convenient) beside `deriveCategoryColor`, so the admin warnings (3X.15) use the same maths as the 3X.2 checks.
4. `deriveCategoryColor(null)` / `categoryStyle(null)` should return the brand defaults, or be documented as "do not call with null". Clients receive `null` (ADR-023 §2).

**3X.7 (backend).** See ADR-023 "Consequences":
- the migration: column, CK, partial UK, and starter colours in `position` then `id` order;
- the `@mytask/tokens` workspace dependency;
- resolution in the five catalog services;
- create/update: level check → advisory lock → duplicate check → default pick, with the unique-violation race mapped to 409 `DUPLICATE` (`details.field = color`, `details.category`);
- `PATTERN_KEYS.color = 't_category_color_invalid'` in `error.filter.ts`;
- `color` in the audit snapshots;
- `pnpm gen`;
- the three API keys in `packages/i18n`;
- tests for every row of ADR-023 §3 and §5, the default (including "all 12 used → null"), the "same colour again is not a duplicate" case and the cache.

**3X.15 (admin).** Add the remaining admin keys below. Compute the warnings on the client. Pre-select the first unused starter swatch on a new top-level form. Show read-only inherited colours from `resolvedColor` / `AdminProjectCategory.color`.

**Web/mobile.** Read `color` exactly where ADR-023 §3 says. Never walk the tree. `null` → brand values.

### New i18n keys (English first, Georgian alongside; full table in ADR-023 §11)
| Key | English | Georgian |
|---|---|---|
| `t_category_color` | Category color | კატეგორიის ფერი |
| `t_category_color_help` | Pick any color. Text and shades are adjusted automatically so they stay readable. Each top-level category needs its own color. | აირჩიეთ ნებისმიერი ფერი. ტექსტი და ელფერები ავტომატურად მოერგება, რომ ყოველთვის კარგად იკითხებოდეს. ყოველ მთავარ კატეგორიას საკუთარი ფერი უნდა ჰქონდეს. |
| `t_category_color_invalid` (API) | Enter the color as # followed by 6 hex digits, for example #7C3AED. | შეიყვანეთ ფერი # სიმბოლოთი და 6 თექვსმეტობითი ციფრით, მაგალითად #7C3AED. |
| `t_category_color_top_level_only` (API) | Only top-level categories have a color. Sub-categories use the color of their top-level category. | ფერი მხოლოდ მთავარ კატეგორიას აქვს. ქვეკატეგორიები თავიანთი მთავარი კატეგორიის ფერს იყენებენ. |
| `t_category_color_taken` (API) | This color is already used by {{category}}. Choose another color. | ეს ფერი უკვე გამოყენებულია კატეგორიაში „{{category}}". აირჩიეთ სხვა ფერი. |
| `t_category_color_similar` | This color is very similar to {{category}}. Visitors may confuse the two categories. | ეს ფერი ძალიან ჰგავს კატეგორიის „{{category}}" ფერს. მომხმარებლებმა შეიძლება ორი კატეგორია ერთმანეთში აურიონ. |
| `t_category_color_reserved` | This color may be confused with the {{meaning}} color. | ეს ფერი შეიძლება აგერიოთ {{meaning}} ფერში. |
| `t_category_color_meaning_brand` | MyTask brand | MyTask-ის ბრენდის |
| `t_category_color_meaning_error` | error | შეცდომის |
| `t_category_color_meaning_success` | success | წარმატების |
| `t_category_color_meaning_featured` | Featured badge | „Featured" ნიშნის |
| `t_category_color_inherited` | Color inherited from {{category}} | ფერი აღებულია კატეგორიიდან „{{category}}" |
| `t_category_color_none` | No linked category: the brand color is used | დაკავშირებული კატეგორია არ არის: გამოიყენება ბრენდის ფერი |
| `t_category_color_used_by` | Used by {{category}} | იყენებს: {{category}} |
| `t_category_color_suggested` | Suggested colors | შემოთავაზებული ფერები |
| `t_category_color_preview` | Preview | გადახედვა |

These are not added to `packages/i18n` yet. The repo adds keys in the task that first uses them (3X.7 for the three API keys, 3X.15 for the rest). The Georgian values are drafts for the Owner to refine (Q-058). No visitor-facing text changes.

## Open questions / risks
- **No Owner questions.** All business rules come from spec 3X and Q-169…Q-178. Two technical choices are recorded in ADR-023 and are not business rules: "change but not clear", and "null when all 12 starters are used".
- **Deviation from the spec wording, recorded in ADR-023 §5.** The spec says "new error codes for the format, level and duplicate cases". These are delivered as distinct field codes and message keys under the existing `VALIDATION_FAILED` / `DUPLICATE`, per CONVENTIONS §7.3, not as new top-level `ErrorCode` values. Clients can tell them apart through `field = color` + `code`/`messageKey`.
- **Risk:** until 3X.7 lands, the generated types (1.3.2) lag the contract (1.4.0) on this branch, so `pnpm gen:check` fails. Do not merge between 3X.5 and 3X.7.
- **Risk:** the default pick depends on the order of `categoryStarter` in `packages/tokens`. Reordering it later changes which colour new categories get, but never changes existing ones.
