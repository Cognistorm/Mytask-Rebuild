# ADR-023: Category colours
Date: 2026-10-06 | Status: **accepted** (architect, ROADMAP 3X.5; business rules approved by the Owner in spec 3X, Q-169…Q-171, Q-174, Q-178) | Amends: contract 1.3.2 → **1.4.0** (additive), data model §3.C, spec 03 (NEW AC-38, AC-39), spec 16 (NEW AC-60a, AC-61a)

## Context
- Spec 3X R-1 (approved 2026-10-06) gives every **top-level gig category** its own colour, chosen freely by staff (Q-169), unique (Q-170), inherited by sub-/child categories and by project categories through their linked top-level gig category (Q-171). The approved visual language (`docs/05-design/visual-refresh.md` §8, §9) defines the starter palette (Q-174), the shared derivation function `deriveCategoryColor(hex)` in `packages/tokens`, and two warnings: "very similar" (OKLab ΔE < 0.08 to another top-level colour) and "reserved" (ΔE < 0.06 to brand teal 600/700, error red, success green, Featured orange; Q-178).
- The spec fixes the shape of the change: one nullable column on top-level gig categories, a unique index, a check constraint, the colour on `CategoryNode`, `CategoryDetail` (incl. breadcrumb), the `getHome` tiles and rows, project category reads, `AdminCategory` and the create/update requests, **resolved** on child nodes so clients never walk the tree; derived shades are never stored or sent.
- What exists today (code read 2026-10-06):
  - `gig_categories` is one tree with `depth` 1…3 set by trigger `gig_categories_set_depth`, which also **refuses any change of `parent_id`** (`apps/api/prisma/migrations/20261003180000_catalog_gigs_core_search/migration.sql:279-294`); the contract has no `parentId` on `CategoryUpdateRequest`. A category therefore never changes level.
  - `project_categories.gig_category_id` is nullable (legacy rows) and a trigger allows only a depth-1 target (same migration, lines 296-306).
  - `listCategories` is cached in-process for 60 s (`apps/api/src/modules/catalog/categories.service.ts:19`); every staff write in `admin-categories.service.ts` is audited in its transaction (before/after snapshot) and calls `CategoriesService.invalidate()`. `getHome` and project category reads are not cached.
  - Top-level-only fields already have a precedent: an icon/image on a sub-category → `400 VALIDATION_FAILED`, field code `top_level_only`, `t_category_images_top_level_only` (`admin-categories.service.ts:374-376`). A slug clash → `409 DUPLICATE` with `details.field = slug` (line 36). A schema `pattern` failure becomes field code `pattern`, with a field-specific message key from `PATTERN_KEYS` (`apps/api/src/platform/errors/error.filter.ts:58-82`).
  - `apps/api` does not depend on `@mytask/tokens` yet; `apps/web` and `apps/admin` do.

## Decision

### 1. Storage (data model §3.C)
- Column **`gig_categories.color char(7) null`** (Prisma `color String? @db.Char(7)`).
- **Check constraint** `gig_categories_color_ck`: `color IS NULL OR (depth = 1 AND color ~ '^#[0-9A-F]{6}$')`. One constraint covers format, upper case and level. A sub-/child category can never hold a colour.
- **Unique index** `gig_categories_color_top_key`: `CREATE UNIQUE INDEX … ON gig_categories (color) WHERE depth = 1 AND color IS NOT NULL` (partial, top level only; raw SQL in the migration, Prisma cannot express it, same as the existing triggers). Because the CK forces upper case, the index is effectively case-insensitive. It is the real guard for spec 3X EC-2 (two staff saving the same colour at once).
- **Case**: requests accept `#RRGGBB` in any case; the API upper-cases before the checks and stores upper case. Responses are always upper case.
- **Derived shades** (text-on, tints, gradient ends, dark variants, indicator, glow) are **not** stored and **not** sent. Every client computes them with `deriveCategoryColor` from `packages/tokens` (3X.6).
- No change to `project_categories`: their colour is always read through `gig_category_id`.

### 2. Meaning of `null`
- On a top-level category, `null` means "no colour chosen". Clients then use the brand values (the `--mt-cat-*` defaults = brand teal, visual-refresh §8.3), exactly like an unlinked project category (R-1.2). It can happen only when every starter colour is taken and staff create a category without choosing one (§4), or for a row loaded by the Phase 5 ETL before colours are assigned (§9).
- Staff can **change** a colour but cannot **clear** it: `CategoryUpdateRequest.color` is not nullable (the approved picker has no "no colour" choice and Q-170 wants every top-level category to have one).

### 3. Resolution (what the API returns)
| Read | Field | Value |
|---|---|---|
| `listCategories` | `CategoryNode.color` on every node | the top-level ancestor's colour (own colour at depth 1) or `null` |
| `lookupCategory`, `getCategory` | `CategoryDetail.color`, every `breadcrumb[]` item and every `children[]` item (`CategoryColorRef.color`) | the top-level ancestor's colour (all equal on one page) or `null` |
| `getHome` | `categoryRows[].category.color`, `featuredCategories[].category.color` (`CategoryColorRef`) | the top-level category's own colour or `null` |
| `listProjectCategories`, `lookupProjectCategory` | `ProjectCategory.color` | the linked top-level gig category's colour; `null` when there is no link or the linked category has no colour |
| `adminListCategories`, `adminGetCategory`, `adminCreateCategory`, `adminUpdateCategory` | `AdminCategory.color` (stored, editable; always `null` below the top level) and `AdminCategory.resolvedColor` (what visitors see) | |
| admin project category reads/writes | `AdminProjectCategory.color` (`gigCategory` stays a plain `CategoryRef`, see §10) | the linked category's colour or `null` |

Clients never walk the tree or join lists to find a colour. The admin UI takes the top-level category **name** for "inherited from {category}" from `adminListCategories`, which it already loads to build the tree.

### 4. Default colour for a new top-level category (R-1.5, AC-6) — server side
- When `adminCreateCategory` creates a **top-level** category and `color` is **omitted**, the API assigns the **first starter colour** (visual-refresh §8.1 order: the 7 starter colours, then spares S1…S5) that no top-level category uses. If all 12 are taken, the colour is `null` (brand fallback) and staff choose one later.
- The palette has **one source**: `categoryStarter` in `packages/tokens` (3X.6). `apps/api` reads it from `@mytask/tokens/tokens.json` (3X.7 adds the workspace dependency); it never keeps its own copy.
- The admin form (3X.15) pre-selects the same first unused swatch so the preview shows it, and normally sends it explicitly; the server default covers any client that omits it and keeps the rule in the API (business rules live only in the API).
- The 3X.7 migration assigns the starter colours to the existing top-level categories in `position` order (then `id`), with the same palette. Spares stay free.

### 5. Validation and errors (CONVENTIONS §7: common codes + field codes + message keys; no new top-level `code`)
| Case | Status / `code` | `details` | messageKey |
|---|---|---|---|
| Not `#RRGGBB` (schema pattern) | `400 VALIDATION_FAILED` | `fields[] = {field: color, code: pattern}` | `t_category_color_invalid` (the API adds `color` to `PATTERN_KEYS`) |
| `color` sent for a sub-/child category (create with a `parentId`, or update of depth 2/3) | `400 VALIDATION_FAILED` | `fields[] = {field: color, code: top_level_only}` (the existing icon/image precedent) | `t_category_color_top_level_only` |
| Another top-level category already has the colour (checked first; the unique index is the backstop for a race, mapped to the same answer) | `409 DUPLICATE` | `field: color`, `category: {id, name}` (the holder, name in the request language), `messageKey`, `params: {category}` | `t_category_color_taken` ("already used by {{category}}") |
- Why no new `CATEGORY_COLOR_*` codes: the spec asks for distinct errors for format, level and duplicate, and they are distinct through `details.fields[].code` / `details.field` + `messageKey`, which is how the contract already reports the same three cases for slugs and images. Clients show `message`; the admin form puts it under the colour field because `field = color`. A new top-level code would add an enum value to `ErrorCode` (an oasdiff WARN) without giving any client a new branch.
- Order of checks in the service: level → duplicate (the format is refused by the request validator before the handler). Saving the category's own current colour again is not a duplicate.
- Writes that set a colour take `pg_advisory_xact_lock` on one fixed key for "top-level category colours" before the duplicate check and the default pick, so two concurrent creates do not both pick the same first unused starter colour; a unique-index violation is still mapped to `409 DUPLICATE` as above.

### 6. Warnings ("very similar", "reserved") — computed by the admin client, not the API
- The API returns **no warnings**. The admin form computes both with `packages/tokens` (`categorySimilarDeltaE` 0.08, `categoryReservedDeltaE` 0.06, the reserved colours, OKLab distance) against the colours in `adminListCategories`, live while staff type, before saving (R-1.8, visual-refresh §9).
- Reasons: they never block a save (R-1.3, Q-178), so the API has nothing to enforce; the thresholds and the reserved colours are design tokens that already live in `packages/tokens`; one function in one package gives the same answer on every client; a "warnings" member on a 2xx response would be a new response pattern that no other operation uses. The exact-duplicate rule, which **does** block, stays in the API (and the database).

### 7. Level changes and deletes
- A category cannot change level: the depth trigger refuses any change of `parent_id`, and the contract has no `parentId` on update. Spec 3X EC-3 therefore cannot happen today. If moving is ever added, the CK forces the colour to be dropped (`NULL`) when a top-level category becomes a sub-category, and the moved node then inherits (EC-3); a node promoted to the top level would get the default of §4. That would be a separate ADR.
- Deleting a top-level category frees its colour at once (the row is gone; EC-4). Delete rules are unchanged (`CATEGORY_IN_USE`).

### 8. Cache, audit, permissions
- **Cache**: the colour is part of the cached category tree. `adminCreateCategory` / `adminUpdateCategory` already call `CategoriesService.invalidate()`, so the instance that saved shows it at once and every other API instance within the 60 s cache time (R-1.7, AC-7, EC-5). `getHome`, `lookupCategory`, `getCategory` and project category reads are not cached, so they show it on the next request. No new cache.
- **Audit**: no new audit action. `category.create` / `category.update` snapshots include `color` (before/after), so a colour change is one audited `category.update` like any edit (spec 16 AC-60, spec 3X R-1.7). The server-assigned default (§4) is in the `category.create` snapshot.
- **Permission**: `catalog.write`, as for every catalogue operation. No new permission.

### 9. Legacy data (Phase 5 ETL)
Legacy has no category colour. The ETL (§12.2) loads `gig_categories` with `color = NULL`, then applies the same assignment as the 3X.7 migration (starter colours in `position` order) in the same run, so after cutover every top-level category has a distinct colour (AC-6).

### 10. Contract 1.4.0 (additive)
- New D2 schemas: `CategoryColor` (response, `^#[0-9A-F]{6}$`), `CategoryColorInput` (request, `^#[0-9A-Fa-f]{6}$`), `CategoryColorRef` (the four `CategoryRef` fields + required nullable `color`, written out flat, not as `allOf`).
- Required nullable `color` added to `CategoryNode`, `CategoryDetail`, `ProjectCategory`, `AdminProjectCategory`; `color` + `resolvedColor` to `AdminCategory`; `CategoryDetail.breadcrumb[]` / `children[]`, `HomeCategoryRow.category` and `HomeFeaturedCategory.category` now use `CategoryColorRef`.
- Two shape choices made for the breaking-change check: (a) `CategoryColorRef` is flat, because oasdiff compares `allOf` branches one at a time and reported the `allOf` form as "required property removed" (28 ERR in a first local run); (b) `AdminProjectCategory.gigCategory` keeps `oneOf [CategoryRef, null]`, because swapping a `oneOf` branch is reported as `response-property-one-of-added` (ERR); the colour is on `AdminProjectCategory.color` instead.
- Optional `color` on `CategoryCreateRequest` and `CategoryUpdateRequest` (not nullable).
- The shared `CategoryRef` (used by carts, orders, reviews, gigs…) is **not** changed: gigs and projects get no colour of their own (spec 3X "Out of scope"), and R-1.6 lists exactly the places above.
- Operation descriptions list the new errors; `x-covers` gains `03 AC-38`, `03 AC-39`, `16 AC-60a`, `16 AC-61a`.
- Breaking-change check: only response properties and optional request properties are added; no enum, path, parameter or required request field changes. oasdiff v1.32.1 (the CI version, run locally from the release binary with the repo's `oasdiff-severity-levels.txt`) against `main`: **no breaking changes, 0 ERR, 0 WARN**; changelog 25 INFO (23 `response-required-property-added`, 2 `new-optional-request-property`).

### 11. New i18n keys (English first, Georgian alongside, CLAUDE.md / Q-058)
Added to `packages/i18n` by the task that first uses them (3X.7 for the three API messages, 3X.15 for the admin form), as for every earlier contract change.

| Key | English | Georgian | Used by |
|---|---|---|---|
| `t_category_color` | Category color | კატეგორიის ფერი | admin form label |
| `t_category_color_help` | Pick any color. Text and shades are adjusted automatically so they stay readable. Each top-level category needs its own color. | აირჩიეთ ნებისმიერი ფერი. ტექსტი და ელფერები ავტომატურად მოერგება, რომ ყოველთვის კარგად იკითხებოდეს. ყოველ მთავარ კატეგორიას საკუთარი ფერი უნდა ჰქონდეს. | admin form help |
| `t_category_color_invalid` | Enter the color as # followed by 6 hex digits, for example #7C3AED. | შეიყვანეთ ფერი # სიმბოლოთი და 6 თექვსმეტობითი ციფრით, მაგალითად #7C3AED. | API 400 + admin form |
| `t_category_color_top_level_only` | Only top-level categories have a color. Sub-categories use the color of their top-level category. | ფერი მხოლოდ მთავარ კატეგორიას აქვს. ქვეკატეგორიები თავიანთი მთავარი კატეგორიის ფერს იყენებენ. | API 400 |
| `t_category_color_taken` | This color is already used by {{category}}. Choose another color. | ეს ფერი უკვე გამოყენებულია კატეგორიაში „{{category}}". აირჩიეთ სხვა ფერი. | API 409 + admin form |
| `t_category_color_similar` | This color is very similar to {{category}}. Visitors may confuse the two categories. | ეს ფერი ძალიან ჰგავს კატეგორიის „{{category}}" ფერს. მომხმარებლებმა შეიძლება ორი კატეგორია ერთმანეთში აურიონ. | admin warning |
| `t_category_color_reserved` | This color may be confused with the {{meaning}} color. | ეს ფერი შეიძლება აგერიოთ {{meaning}} ფერში. | admin warning |
| `t_category_color_meaning_brand` | MyTask brand | MyTask-ის ბრენდის | `{{meaning}}` |
| `t_category_color_meaning_error` | error | შეცდომის | `{{meaning}}` |
| `t_category_color_meaning_success` | success | წარმატების | `{{meaning}}` |
| `t_category_color_meaning_featured` | Featured badge | „Featured" ნიშნის | `{{meaning}}` |
| `t_category_color_inherited` | Color inherited from {{category}} | ფერი აღებულია კატეგორიიდან „{{category}}" | sub-category and project category forms |
| `t_category_color_none` | No linked category: the brand color is used | დაკავშირებული კატეგორია არ არის: გამოიყენება ბრენდის ფერი | project category without a link |
| `t_category_color_used_by` | Used by {{category}} | იყენებს: {{category}} | used starter swatch (name + tooltip) |
| `t_category_color_suggested` | Suggested colors | შემოთავაზებული ფერები | swatch group name |
| `t_category_color_preview` | Preview | გადახედვა | live preview heading (light/dark use the existing `t_light` / `t_dark`) |

No visitor-facing text changes (spec 3X "Texts").

## Alternatives considered
- **Colour on every level, or on `project_categories`** — contradicts Q-171 (inherit) and would let children drift from their top level. Rejected.
- **Plain unique index on `color`** — works (NULLs are distinct) but the partial index states the rule (top level only) and stays correct if a later ADR ever lets other levels hold a value.
- **Case-insensitive comparison (`lower(color)` index, `citext`)** — not needed once the API normalises and the CK forces upper case.
- **Return only the stored colour and let clients find the top-level ancestor** — rejected by the spec ("clients never walk the tree") and would repeat the rule in web, admin and mobile.
- **Add `color` to the shared `CategoryRef`** — would put a colour on every cart line, order, review and gig reference (out of scope) and make carts/orders read the category tree. A D2 superset schema touches only R-1.6 places.
- **New error codes `CATEGORY_COLOR_INVALID` / `…_NOT_TOP_LEVEL` / `…_TAKEN`** — see §5; the existing field-code pattern already distinguishes them.
- **API returns similar/reserved warnings** — a second implementation of OKLab distance in the API (or a dependency of the API on design maths), a new 2xx response member, and a round-trip per keystroke for live feedback. Rejected (§6).
- **Default colour chosen only by the admin client** — puts a business rule (AC-6) in one client; any other caller would create colourless categories. Rejected in favour of §4 (the client still pre-selects the same value).
- **Store derived shades** — the spec forbids it; they would go stale when `deriveCategoryColor` improves.

## Consequences
- **Backend (3X.7)**: migration (column, CK, partial unique index, starter colours in `position` order); `@mytask/tokens` dependency for `categoryStarter`; resolution in `categories.service.ts`, `home.service.ts`, project category services and `views()`; create/update validation, advisory lock, default pick, duplicate mapping (incl. the unique-violation race), `PATTERN_KEYS.color`; `color` in audit snapshots; the three API keys in `packages/i18n`; tests for every row of §3 and §5, the default (incl. "all 12 used → null"), and the 60 s cache.
- **Tokens (3X.6)**: `categoryStarter` (12, §8.1 order), `categorySimilarDeltaE`, `categoryReservedDeltaE`, the reserved colours and an exported OKLab distance helper beside `deriveCategoryColor`, so admin warnings and the API default use the same data.
- **Web, admin, mobile (3X.8…3X.17)**: read `color` from the API responses listed in §3, call `deriveCategoryColor`, fall back to brand values on `null`. Admin computes the warnings (§6) and adds the remaining i18n keys.
- **Generated clients**: `pnpm gen` regenerates `packages/types` / `packages/api-client` from the 1.4.0 bundle in **3X.7**, together with the API code that fills the new required fields. Regenerating in 3X.5 alone would break `@mytask/api` typecheck (9 errors in the five catalog services that build these responses), so the generated files stay at 1.3.2 until then and `pnpm gen:check` is expected to differ on the branch until 3X.7.
- **Harder**: one more invariant in the category write path (lock + duplicate check); admin colour warnings are not repeated by the API, so a non-admin caller of the admin API never sees them (acceptable: warnings only).
