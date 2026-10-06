# 4.2.6 `getHome`

From: backend-engineer · To: devops-engineer (4.2.0g), backend-engineer (4.2.7, slices 5 and 16), web-engineer (4.2.12), mobile-engineer (4.2.14) · Date: 2026-10-03

## What I did
Contract 1.3.2. No contract change, no data-model change, no new i18n key.

`GET /home` (`catalog/home.service.ts`, `HomeController` in `catalog.controllers.ts`, `@OptionalUser()`), following
LEGACY `Main/Home/HomeComponent.php`:

- **`topGigs`** (AC-24): 4 listed gigs. Listed = gig `active` and the owner listable (`LISTABLE_OWNER`, joined live).
  Order: active-Premium owners first (`PremiumStatus.activeUsersSql()`), random inside each group. The second group
  tops the row up. Legacy counted any subscription row; now only active Premium counts (R-2.1).
- **`categoryRows`** (AC-5, AC-25): one row for each visible top-level category, in random order. Each row has up to
  4 listed gigs of that category (`gigs.category_id`), Premium owners first, random inside each group. One SQL query
  for all rows (`row_number() OVER (PARTITION BY category_id …)`). A category without listed gigs gets an **empty
  row**; clients hide it (contract `Home`).
- **`featuredCategories`** (S-107): the same visible top-level categories, in the same order as the rows (legacy uses
  one collection for both), with the category `image` (or `null`). `null` while S-107 is OFF.
- **`bestSellers`** (S-108): `[]` while ON, `null` while OFF. Nobody has completed sales until slice 5 (4.2.1 handoff §D).
- **`logos`** (S-109): `[]` while ON, `null` while OFF, until slice 16.
- **`recentArticles`** (S-117 **and** S-119): `[]` while both are ON, otherwise `null`, until slice 16.
- Cards come from `GigCards`. `isFavorite` is `null` for guests and `false` for a signed-in caller.
- Nothing is cached, because the picks are random on every request (as in legacy). Category names and images come from
  `CategoriesService.listTree` (its own 60 s cache, invalidated by the staff writes of 4.2.7).
- Names fall back to Georgian like every other list (`contentLocale`). Legacy hid gigs without an English translation
  on the English site (`withEnglishTranslation()`). The rebuild follows the platform fallback rule that `searchGigs`
  already uses.

Tests `apps/api/test/home.test.ts` (8, responses validated against the contract):
- rows: one per visible top-level category, hidden category and sub-levels get no row, 4 of 6 listed gigs, pending /
  banned / restricted left out, random picks across requests, an empty row, Premium first (2 Premium gigs lead, `isFeatured`);
- top gigs: 1 Premium gig first + 3 others; 5 Premium gigs fill the row; a banned Premium owner left out; signed-in
  `isFavorite: false`;
- settings: every block `null` while OFF (including S-117 ON + S-119 OFF and the reverse); while ON, featured tiles =
  the rows' categories in the same order, and the other blocks are `[]`.

Results: API **508 passed / 6 skipped** (was 500). `tsc`, `eslint` and `prettier` are green.

## Files created/changed
- New: `apps/api/src/modules/catalog/home.service.ts`, `apps/api/test/home.test.ts`
- Changed: `catalog.controllers.ts` (`HomeController`), `catalog.module.ts`
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.0g (devops)**: next, and it must be done before 4.2.7.
- **4.2.7 (backend)**: call `CategoriesService.invalidate()` after every category write. The home rows and the
  featured tiles read the cached tree.
- **Slice 5**: fill `bestSellers` (AC-26): up to 12 listable users with the most completed sales, most first;
  `HomeBestSeller` = `UserSummary` + 3 skills + freelancer rating + `salesCount`.
- **Slice 16**: fill `logos` (active logos in order) and `recentArticles` (3 newest published articles), keeping
  the `null`-when-OFF rule.
- **Web 4.2.12 / mobile 4.2.14**: hide a `null` block and an empty row; "See more" on every row links to
  `/categories/{slug}`; the projects row comes from `searchProjects` (empty until slice 9, hidden while S-075 is OFF).

## Open questions / risks
- None for the Owner.
- `random()` over all listed gigs in each request is a full scan of active gigs. Legacy did the same, and it is fine at
  launch volume. If the home page gets slow, cache the picks for a short time (the contract allows it, except for `isFavorite`).
