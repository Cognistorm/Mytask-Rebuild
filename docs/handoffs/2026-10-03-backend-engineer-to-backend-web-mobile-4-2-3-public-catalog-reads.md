# 4.2.3 Public catalogue reads: gig category tree, category pages, project categories

From: backend-engineer · To: backend-engineer (4.2.4–4.2.8), web-engineer (4.2.9), mobile-engineer (4.2.14) · Date: 2026-10-03

## What I did
New module `apps/api/src/modules/catalog` (registered in `app.module.ts`), five public operations of contract 1.3.2,
no contract change:
- **`listCategories`** (`GET /categories`): the whole 3-level tree, siblings by `position` (then id), `path` =
  slug path from the top, names in the request language with the Georgian fallback (`contentLocale: ka`).
  `icon`/`image` (CDN variants) on the top level only, `isVisibleOnHome` = `is_visible` on the top level, always
  `true` below (AC-5: hidden categories stay in the tree and their pages work). **Cached in process for 60 s**
  (the raw rows + image variants; the tree is built per request language). `CategoriesService.invalidate()` is
  there for 4.2.7 staff writes and tests.
- **`lookupCategory`** (`GET /categories/lookup?path=`): 1–3 slugs, each at its depth and inside the level above;
  unknown slug, wrong parent, empty segment or more than 3 levels → **404** (AC-3). Not cached (fresh read).
- **`getCategory`** (`GET /categories/{id}`): same `CategoryDetail`, any level.
  `CategoryDetail`: `breadcrumb` top → self, direct `children` by position, `description`/`contentTop`/
  `contentBottom` as stored (4.2.7 sanitises on write), `updatedAt` = latest of the category and its translations.
- **`listProjectCategories`** (`GET /project-categories`): active categories by `position`, their **active**
  skills sorted by name in the request language.
- **`lookupProjectCategory`** (`GET /project-categories/lookup?slug=&skillSlug=`): S-075 OFF → **403
  `FEATURE_DISABLED`** (`settingId: S-075`, message `t_feature_disabled`, AC-34); inactive/unknown category, or a
  skill that is not an active skill of that category → 404 (AC-33, P-31).

**Fallback rule** (`catalog/localized.ts`, ADR-006 §6): each field in the requested language; on an English request
a missing/empty field takes the Georgian text and the resource gets `contentLocale: ka` as soon as one shown field
fell back. A Georgian request never shows English body text (only the name, if a row had no Georgian name at all).
`hasEnglish` = the English **name** exists (contract wording). The web shows `t_content_shown_in_georgian` next to
the SEO texts only (AC-4) and builds canonical/hreflang from `contentLocale`/`hasEnglish` (url-map §8).

Tests `apps/api/test/catalog.test.ts` (13, responses validated against the contract): tree levels, paths, order,
fallback, hidden category, icon/image variants top level only, the 60 s cache (clock moved), lookup at 1 and 3
levels with breadcrumb, every 404 case, SEO-text fallback both ways, project categories (inactive category and
skill left out, skill order, fallback), skill of another category → 404, S-075 → 403.

Results: API **465 passed / 6 skipped**, `tsc` + `eslint` green, `prettier --check` clean.

## Files created/changed
- `apps/api/src/modules/catalog/catalog.module.ts`, `catalog.controllers.ts`, `categories.service.ts`,
  `project-categories.service.ts`, `localized.ts`
- `apps/api/src/app.module.ts`
- `apps/api/test/catalog.test.ts`
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.4 (backend)**: `searchGigs`/`listGigs` + `SearchIndex` + `PremiumStatus` in this module;
  `searchGigs?categoryId=` can use `CategoriesService.get` for the 404 of an unknown category.
- **4.2.7 (backend)**: call `CategoriesService.invalidate()` after every staff category write (this process; other
  processes catch up within 60 s, which is the contract promise).
- Web 4.2.9a/b and mobile 4.2.14: one `listCategories` call for header/accordion; category pages use
  `lookupCategory` and, on 404, `resolveRedirect` once slice 16 has it.

## Open questions / risks
- None for the Owner.
- Flaky test seen once in the full run: `catalog-schema.test.ts` "loads the full live catalogue" (245 categories
  inside one rolled-back transaction) failed once and passed alone and on the next full run. Probably time/load
  on local PGlite; worth a look together with **4.2.0g** (PGlite transaction problem).
