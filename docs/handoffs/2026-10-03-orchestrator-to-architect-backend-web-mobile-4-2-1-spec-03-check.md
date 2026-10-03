# 4.2.1 Spec check — spec 03 Categories and search vs contract 1.3.2, data model, screens and the 4.2 task list

From: orchestrator · To: solution-architect, backend-engineer, web-engineer, mobile-engineer (slice 2, branch `feat/catalog-search`) · Date: 2026-10-03

## What I did
Checked spec 03 (approved, 37 ACs) against `docs/04-api/openapi.yaml` 1.3.2, `docs/04-api/coverage/03.md`,
`docs/03-architecture/data-model.md` §3.C/§3.D/§3.S, ADR-011, `url-map.md` §2/§3/§8, spec 16 AC-60/AC-61,
spec 17 AC-10, `docs/05-design/screens/01-home.md`, the current code (`apps/api`, `apps/web`, `apps/mobile`,
`packages/i18n`) and the 4.2 tasks in `docs/ROADMAP.md`. No code was written.

**Result: the contract is complete for spec 03.** All 33 API ACs map to operations that exist and list `03 AC-n`
in `x-covers` (checked one by one with a script over the contract). The 4 NOT-API ACs (AC-22 and AC-30 UI, AC-36
infra, AC-37 UI) are correct. **No contract change. No new Owner question.** There are **two data-model gaps**
(architect, section B), one **big dependency** (search needs the `gigs` table, which ROADMAP put in slice 3,
section C), and gaps in the **task list** (no public site header/footer or real home page exists yet, several
operations and screens no task names). ROADMAP 4.2 has been updated (section G).

## A. Contract operations (all present, contract 1.3.2)
| Operation | ACs | Audience | ROADMAP task |
|---|---|---|---|
| `listCategories` | AC-1, 2, 4 | public, cached ≤ 60 s | 4.2.3 |
| `lookupCategory`, `getCategory` | AC-3, 4, 35 | public | 4.2.3 |
| `listProjectCategories` | AC-31 | public | 4.2.3 |
| `lookupProjectCategory` | AC-33, 34 | public, S-075 toggle → 403 FEATURE_DISABLED | 4.2.3 |
| `searchGigs` | AC-3, 6…21, 23 | optional-user (`isFavorite`) | 4.2.4 |
| `listGigs` (spec 04 op, profile gig list, newest first, no boost) | AC-18 | optional-user | 4.2.4 |
| `searchProjects` | AC-32…34 | optional-user (masking), S-075 | 4.2.5 |
| `listSellers` | AC-27 | public | 4.2.5 |
| `listHireSellers` (404 → web 302 to `/search?q=`) | AC-28, 29 | public | 4.2.5 |
| `getHome` | AC-5, 24, 25, 26 (+ spec 17 blocks) | optional-user | 4.2.6 |
| `adminListCategories`, `adminCreateCategory`, `adminGetCategory`, `adminUpdateCategory`, `adminDeleteCategory` | AC-1, 5; spec 16 AC-60 | staff `catalog.write` | 4.2.7 |
| `adminList/Create/Get/Update/DeleteProjectCategory`, `adminList/Create/Get/Update/DeleteSkill` (10 ops) | AC-31; spec 16 AC-61 | staff `catalog.write` | 4.2.8 |

`catalog.write` already exists (`apps/api/src/modules/staff/permissions.ts`). File purpose `category_image` is
enabled for staff since 4.1.5. Settings rows S-075, S-076, S-103, S-107, S-108, S-109, S-117, S-119 all exist in
`registry.ts`. `t_category_in_use` exists. `pg_trgm` is installed by migration `00000000000000_extensions`.

## B. Data-model gaps (architect first, CLAUDE.md rule 2) → 4.2.2a
1. **Category description.** The contract has `description` (per language, `CategoryDescriptionInput`, ≤ 300,
   spec 16 AC-60) on `CategoryCreateRequest`/`UpdateRequest`, `AdminCategory` and `CategoryDetail`. Data-model
   §3.C `gig_category_translations` has only `name`, `content_top`, `content_bottom`. Legacy keeps one
   untranslated `description text` on each of `categories`, `subcategories`, `childcategories`
   (`legacy/APP/database/migrations/2022_06_27_123223_create_categories_table.php`, `…2022_06_28_211650…`,
   `…2023_09_11_090751…`). Proposed: `description varchar(300) null` on `gig_category_translations`; migration
   puts the legacy value in the `ka` row (§12.2 mapping line). No contract change.
2. **Old category slugs.** `AdminCategory.previousSlugs`, spec 16 AC-60 ("changing a slug makes the old URL answer
   301") and spec 17 AC-10/EC-3 (one hop after several changes; an old slug cannot be reused while it redirects;
   changing back removes that redirect) need a store of old slugs. The data model has none (url-map §4 only says
   gigs need no history because the uid is in the slug). The same store serves CMS pages and blog articles in
   slice 16, so the architect should design it once (e.g. one `slug_redirects` table keyed by entity type).
   The 301 itself is served by `resolveRedirect` (spec 17, slice 16); slice 2 only has to **record** old slugs
   when staff change one (4.2.7) and return `previousSlugs`.

## C. The big dependency: search needs gigs, ROADMAP had them in slice 3
`searchGigs`, `listGigs`, `getHome` gig rows and `listSellers` ("at least one active gig", P-30) cannot be built
or tested without the `gigs` and `gig_translations` tables (`GigCard` needs uid, slug, title, price, delivery days,
rating, owner) — and those were in 4.3.2. **Decision (task order only, no design change):** 4.2.2b creates the
**core of §3.D exactly as designed**: `gigs` + `gig_translations` (with the three category FKs and their depth
trigger), plus `search_documents` (§3.S). Slice 3 keeps everything else of §3.D (upgrades, FAQs, images,
documents, favourites, reports, views) and all gig writes. Until slice 3, the API is tested with fixture gigs
inserted by the tests; the local site shows the empty states. 4.3.2 is reworded accordingly.

Search index: 4.2.4 builds one `SearchIndex` (`indexGig(gigId)`, `removeGig(gigId)`, later `indexProject`) per
ADR-011 §3 (`SearchProvider` / `PostgresSearchProvider`); slice 3 calls it in the same transaction as every gig
write; slice 9 does the same for projects. **4.3.1 and 4.9.1 must confirm this.**

## D. Dependencies on slices not built yet — neutral values, never invented data
Same rule as 4.1.1 §C. Each later slice's spec check must confirm it fills its part.
| Field / behaviour | Neutral value now | Filled by |
|---|---|---|
| Premium: `GigCard.isFeatured`, `search_documents.owner_is_premium`, group A of R-S3, home "Top gigs" Premium group | `false` (everyone in group B; ranking still follows the chosen sort) | slice 8 (spec 09): the subscription start/end updates the owner's search documents ≤ 60 s (AC-17) |
| One `PremiumStatus` seam (`isActive(userId)`, cached ≤ 60 s, R-2.1) | always `false` | slice 8. 4.2.4 creates it and replaces the four hard-coded `isPremium: false` (`me.mapper.ts`, `profiles.service.ts:263`, `user-summaries.ts:51`, `restrictions.service.ts:65`, plus `premiumEndsAt` in `admin-users.service.ts:40`); their comments say "slice 9 (spec 10)" — Premium is **slice 8 (spec 09)** |
| Gig rating (`rating_count`, `rating_sum`) → "Best rating" sort, rating filter, card rating | 0 → card shows `t_no_reviews_yet`; any rating filter excludes the gig | slice 6 (spec 07) |
| `sales_count` → "Most selling", home best sellers (S-108) | 0; best sellers block = `[]` while S-108 is ON (nobody has sales), `null` while OFF | slice 5 (spec 06, R-O7) |
| `visits_count` ("Most popular"), impressions ("every listed card counts as an impression", `searchGigs` description, spec 04 AC-39) | 0; no impression recorded | slice 3 (`recordGigView`, gig analytics) |
| `GigCard.isFavorite` | `null` guests, `false` signed in | slice 3 (favourites) |
| `GigCard.thumbnail` | from `gigs.thumbnail_file_id` (`gig_thumbnail` purpose not enabled until slice 3) | slice 3 |
| `searchProjects` results, home projects row, explore project rows | empty page (S-075 check and the category/skill 404 are real now) | slice 9 (spec 10) |
| `Home.logos` (S-109, `home_logos`), `Home.recentArticles` (S-117 + S-119), announcement (S-112), CMS footer links | `[]` when ON, `null` when OFF | slice 16 (spec 17) |
| Category old-slug 301 (`resolveRedirect`) | old slugs are recorded (B.2); the 301 answers once `resolveRedirect` exists | slice 16 |
| S-076 max skills per project; BR-053 "notify freelancers in the category" via the project category → gig category link (R-S8) | not used | slice 9 |
| Gig create wizard category picker (spec 04 AC-4) uses `listCategories` | — | slice 3 |

## E. Implementation notes (from the approved texts; no question needed)
- **Keyword rule.** ADR-011 §1 says "whole words **or** trigram similarity", but also says the exact rule comes
  from spec 03. Spec 03 AC-19 (approved, P-28): **every** word must appear (any order, case-insensitive) in the
  title or description, either language; a superset of the legacy `LIKE %phrase%`. So: normalise (`- _ ' " / \ ` +`
  → spaces, cut to 100 characters, separators only = empty, EC-5/EC-6), then require **each** word as a substring
  of the normalised `search_text` (`ILIKE`, served by the `gin_trgm_ops` index). No fuzzy-only matches (they would
  list gigs where a word does not appear). No relevance ordering is needed: every sort is defined by AC-13…AC-15
  ("Recommended" is the daily mix). Same rule for `searchProjects` (AC-32).
- **Daily mix** (Recommended, `/sellers`, `/hire`): `hash(entity_id, Tbilisi date)` in the query (data-model §3.S),
  ties newest first; stable across pages within a day (EC-8).
- **Listable owner (P-29, R-S1)** must be exact on every request. A stored `owner_listable` flag goes stale unless
  every path that changes it also refreshes it. Prefer the **join at query time** (user status active/verified,
  not deleted, no open restriction) and keep the `search_documents.owner_listable` column only if the backend also
  refreshes it from every such path today: `admin-users.service.ts` (`activate`, ban at `:111`),
  `restrictions.service.ts` (create, appeal approved, delete — restrictions have no time expiry), `deleteMe`
  (`account-settings.service.ts`), email verification (pending → verified). Backend decides; tests must cover a
  ban, a restriction and its lifting.
- **Rating filter**: average = `rating_sum / rating_count` exactly (P-56); "5" = exactly 5.0; gigs without reviews
  never match a rating filter. **Delivery filter** values 1–6, 7, 14, 21, 30 days, "≤ N" includes 0-day gigs.
- **Web URL keeps the legacy names** (url-map §2, AC-12): `q`, `min_price`, `max_price` (GEL, as legacy),
  `delivery_time`, `rating`, `sort_by` with legacy values `popular`, `rating`, `sales`, `newest`, `price_low_high`,
  `price_high_low` (`SearchComponent.php:205-265`), mapped to `SearchGigSort` and to tetri for the API; `?page=N`
  kept, `?page=1` → 301 without it. Min > max is refused before the request with `t_min_price_greater_than_max`.
- **Pagination**: web uses `page` + `totalCount` (shared `PageNumber`), mobile uses the cursor (infinite scroll).
  Page sizes: gigs 42, `/sellers` 40, `/hire` 42, projects 40 (R-S6).
- **`/hire/{keyword}`**: 404 from the API when no user skill (`user_skills.slug`, spec 02 4.1.9) has exactly that
  slug → the web answers **302** (url-map §1.3, data-dependent) to `/search?q=…` (`/en/search` for English).
- **Category tree** for header + mobile accordion: one `listCategories` call, cached ≤ 60 s.
- **English fallback** (AC-4, AC-7, R-S9): `contentLocale` on every category/gig; the note
  `t_content_shown_in_georgian` only where body content is shown (category SEO text), never on cards.
- **Local seed (4.2.2b)**: legacy has no seeder or dump for categories. Use the live site's **public** category
  tree (3 levels, ka + en names, slugs) and the project categories / skills shown on `/explore/projects`, local
  development only, source recorded in the seed file; Phase 5 migration loads the real rows.

## F. Gaps in the task list and screens
1. **No public site header, footer or real home page exists.** `apps/web/src/app/[locale]/(public)/page.tsx` is the
   Phase 3 placeholder ("until the real header (slice 02)"). Spec 03 AC-2, AC-22 and design `01-home.md` need the
   public header (logo, pill search with the category menu, theme toggle, Explore menu, Login/Register or the
   account menu, category bar with "More ▾", keyboard mega-menu, phone search icon, slide-over drawer with the
   category accordion and its search box, language switch) and a footer shell. Cart, bell, "Subscription" and the
   invite banner wait for their slices (hidden, not dead links). → new **4.2.9a**.
2. **AC-36 `?locale=` 301** (url-map §2: any URL; also `?theme=`) is not in the web proxy yet. → 4.2.9a.
   **AC-37 canonical + hreflang** on the list pages (url-map §8; filtered/sorted variants point to the unfiltered
   page) → 4.2.9b, 4.2.10, 4.2.11.
3. **Real home page** (hero, featured categories S-107, Top gigs, category rows with "See more", best sellers S-108)
   is broader than "home gig rows". → 4.2.12 reworded. Projects row hidden until slice 9; logos, articles,
   announcement in slice 16.
4. **Profile gigs block** (spec 02 AC-8, EC-10) waited for `listGigs` → wire it on web (4.2.12) and app (4.2.15).
5. **Mobile**: Home and Explore tabs join the tab bar in this slice (4.1.22 note). Spec 03 screens also need
   `/sellers`, `/hire/{keyword}` and explore projects in the app, and the profile skill chips must open `/hire`
   (comment in `apps/mobile/src/app/profile/[username]/index.tsx:5`; the web chip already links). → 4.2.14 / 4.2.15
   extended.
6. **Admin screens** (spec 16 AC-60, AC-61): category tree at 3 levels with ka/en fields, description, SEO text,
   icon + image upload (`category_image`), visibility, position, delete refused with `t_category_in_use`; project
   categories with the linked top-level gig category; skills. → 4.2.13.
7. **i18n**: 9 keys missing from both `en.json` and `ka.json`: the 7 NEW keys of spec 03 (`t_recommended`,
   `t_min_price_greater_than_max`, `t_rating_n_plus`, `t_up_to_delivery`, `t_show_results`,
   `t_featured_badge_hint`, `t_popular_categories`) and 2 keys of spec 00 used here (`t_content_shown_in_georgian`,
   AC-4; `t_feature_disabled`, AC-34). Values are in the spec "Texts" tables (00 lines 480–481). → 4.2.2b.
   All legacy keys of the spec Texts table exist.

## G. ROADMAP changes
4.2.1 ticked. 4.2.2 split into **4.2.2a** (architect: B.1, B.2) and **4.2.2b** (backend: tables incl. the gigs core,
`search_documents`, seed, i18n keys). 4.2.3–4.2.8 extended with the notes above. 4.2.9 split into **4.2.9a** (public
header + footer shell + `?locale=`/`?theme=` 301) and **4.2.9b** (category pages). 4.2.10–4.2.15 extended. 4.3.2
reworded (gigs core already exists).

## Files created/changed
- `docs/handoffs/2026-10-03-orchestrator-to-architect-backend-web-mobile-4-2-1-spec-03-check.md` (this file)
- `docs/ROADMAP.md`: 4.2.1 ticked; 4.2.2 → a/b; 4.2.9 → a/b; 4.2.3–4.2.15 and 4.3.2 extended/reworded
- `docs/STATUS.md`: micro-task log + next micro-task

## What the next agent must do
**4.2.2a (solution-architect):** data-model §3.C category `description` per language and the old-slug store
(section B), migration mapping lines in §12.2; no contract change expected (if one is needed: ADR first). Then
4.2.2b (backend) uses sections C, D and F.7 as its checklist.

## Open questions / risks
- No new Owner question. Still open from before: DEV-M1, Q-160 (not blocking slice 2).
- Risk: until slice 3 the local site has no gigs, so every gig list shows its empty state; the API is proven with
  fixture gigs in tests and E2E stand-ins. The Owner click-through (4.2.20) will show empty lists unless a demo
  data seed is added — decide at 4.2.16.
- Risk: the neutral Premium value hides the whole Q-069 behaviour until slice 8. The AC-14/AC-16 ranking must still
  be proven in 4.2.4 with a test double of `PremiumStatus` (the AC-16 worked example as a test).
- Risk: a category slug changed by staff before slice 16 answers 404 at its old URL until `resolveRedirect`
  exists (nothing is in production before Phase 6, so no real links break).
