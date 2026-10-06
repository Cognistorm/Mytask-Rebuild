# 4.2.5 Project search, `/sellers`, `/hire/{keyword}`

From: backend-engineer · To: backend-engineer (4.2.6, slice 9), web-engineer (4.2.10–4.2.12), mobile-engineer (4.2.14, 4.2.15) · Date: 2026-10-03

## What I did
Contract 1.3.2. No contract change, no data-model change, no new i18n key.

- **Shared list rules** (`catalog/list-rules.ts`, moved out of `gig-search.service.ts`, behaviour unchanged):
  - `LISTABLE_OWNER` (AC-27 / R-S1 status rules);
  - `tbilisiDay` and `dailyMix(idSql, now)` = `md5(id || Tbilisi date)`;
  - `offsetPaging` (`page` or the opaque `o:` cursor; both together → 400; a foreign cursor → 400);
  - `pageTail` (`nextCursor` + `totalCount`), `encodeOffset`, `fieldError`.
- **`listSellers`** (`GET /sellers`, `catalog/seller-lists.service.ts`, AC-27, P-30):
  - Lists users who are active or verified, not deleted, not restricted (banned users have status `banned`),
    and have at least one `active` gig. The user is joined live, so a ban or a restriction shows on the next
    request. One card per user, however many gigs.
  - Order: the daily mix, then `id`. No Premium boost (R-S3.7). `totalCount` is returned. Clients send `limit=40`.
  - Card = `UserSummary` ("ID verified" = `isIdVerified`) + the user's first 3 skills, oldest first (LEGACY
    `skills()->limit(3)`; the profile shows the same order).
- **`listHireSellers`** (`GET /hire/{keyword}`, AC-28, AC-29, EC-7):
  - No `user_skills.slug` equals the keyword exactly → 404 `NOT_FOUND`. The web then answers 302 to `/search?q=`.
  - Otherwise `skill` = `{name, slug}` of the **oldest** skill with that slug (LEGACY `first()`); the title uses
    its name.
  - The list: users with the AC-27 status rules (no gig needed) who have a skill whose slug **or** name contains
    the keyword. The match is `ILIKE` (legacy MySQL `LIKE` is case-insensitive) and the LIKE wildcards are escaped.
    The skill that decides the title may belong to a user who is not listed (legacy did the same).
  - Same daily mix and card. Clients send `limit=42`.
- **`searchProjects`** (`GET /search/projects`, `catalog/project-search.service.ts`, AC-32…AC-34):
  - S-075 OFF → 403 `FEATURE_DISABLED` (`details.settingId`). This check comes first.
  - Then the paging checks (400).
  - Then 404 `NOT_FOUND` when `projectCategoryId` is unknown or inactive, `skillId` is unknown or inactive, or the
    skill is outside the given category. `skillId` alone only has to exist and be active.
  - Result: always `{data: [], nextCursor: null, totalCount: 0}` until projects exist (slice 9, 4.2.1 handoff §D).
    `q` is accepted but has nothing to search yet.
  - The route carries `@OptionalUser()`, so slice 9 can mask the client (R-P6) without changing the route.

Tests `apps/api/test/seller-lists.test.ts` (11), all validated against the contract:
- `/sellers`: who is listed (pending gig only, no gig, banned, restricted, deleted, pending user are left out);
  one entry per user; the daily-mix order over the whole list; card skills (first 3, oldest first); page and cursor
  walks are equal; the page after the last is empty; page + cursor → 400; foreign cursor → 400; the order is
  stable within a Tbilisi day and changes at 20:00 UTC.
- `/hire`: a contains-only slug gives 404; slug and name matches (case-insensitive), no gig needed, banned,
  restricted and deleted users left out, the mix order; chips show the user's own skills; EC-7 (two users with one
  slug, title from the oldest); `_` matched literally; page and cursor.
- `searchProjects`: S-075 OFF → 403 and ON → empty page; the 404 cases; 400 for paging and a malformed uuid.

Results: API **500 passed / 6 skipped** (was 489). `tsc`, `eslint` and `prettier` are green.

## Files created/changed
- New:
  - `apps/api/src/modules/catalog/list-rules.ts`, `seller-lists.service.ts`, `project-search.service.ts`
  - `apps/api/test/seller-lists.test.ts`
- Changed:
  - `apps/api/src/modules/catalog/gig-search.service.ts` (uses `list-rules.ts`)
  - `catalog.controllers.ts` (new `ProjectAndSellerListsController`), `catalog.module.ts`
  - `apps/api/test/gig-search.test.ts` (imports `tbilisiDay` from `list-rules.ts`)
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.6 (backend)**: `getHome`. Use `GigCards`, `PremiumStatus`, `LISTABLE_OWNER` and `dailyMix` from
  `list-rules.ts`.
- **Slice 9 (projects, spec 10)**: fill `ProjectSearchService.search`. Keep the checks in the same order
  (S-075, paging, 404). The list: status active + completed, newest first, `keywordWords`/`containsPattern` on the
  title and description in either language (English requests include Georgian-only projects), masked client.
- **Web (4.2.10 `/sellers`, `/hire`; 4.2.11 explore projects)**:
  - `/sellers`: `page` + `limit=40`. `/hire/{keyword}`: `page` + `limit=42`; on 404 answer **302** to
    `/search?q={keyword, spaces as +}` (`/en/search` for English).
  - Title `t_hire_the_best_skill_name_experts` and subtitle use `skill.name`.
  - Each skill chip links to `/hire/{slug}` (AC-30).
  - Explore projects: on 403 `FEATURE_DISABLED` show the feature-disabled state (00 AC-11). Resolve the category and
    skill with `lookupProjectCategory` first, then call `searchProjects` with the ids.
- **Mobile (4.2.14/4.2.15)**: the same calls with `cursor` and `limit=40`/`42`.

## Open questions / risks
- None for the Owner.
- `/hire` contains-match: a short keyword can match many skills. The match uses a sequential scan of
  `user_skills` (only `slug` is indexed, as an equality index). This is fine at launch volume.
