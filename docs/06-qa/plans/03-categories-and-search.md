# QA test plan: slice 03 — Categories and search (spec 03)
Date: 2026-10-05 | QA: ROADMAP 4.2.17b + 4.2.17c (independent sessions; did not write slice 2 code) | Branch: `feat/catalog-search`
Spec: `docs/02-specs/03-categories-and-search.md` (37 ACs, R-S1…R-S9, EC-1…EC-10) + spec 16 AC-60/AC-61 (staff catalogue). Contract 1.3.2. Report: `docs/06-qa/reports/03-categories-search-2026-10-05.md`. Security review: `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md` (4.2.17a).
AC → operation map: `docs/handoffs/2026-10-03-orchestrator-to-architect-backend-web-mobile-4-2-1-spec-03-check.md` (33 API ACs; 4 NOT-API).

**Limit of this slice:** gigs can only be created from slice 3 on. Filled gig lists (Featured order, filters, pages) are proven in the API tests (gigs written straight into the database) and in the web E2E on the stand-in API. On the local stack the lists are empty.

## Method
- **Layer A — automated (4.2.17b).** Every suite forced (no Turborepo cache): lint, typecheck, API tests, contract drift, i18n, format; the new QA probes `apps/api/test/qa-slice03.test.ts` (real HTTP pipeline, contract validation, PGlite + in-process Redis, in-memory object storage); web E2E on the production build (stand-in API); admin E2E incl. the full-stack `catalog-main-flow` and `profiles-main-flow` on `pnpm local` with a **throw-away database** (`LOCAL_PGLITE_DIR` in the session scratchpad; the Owner's `apps/api/.pglite` is never used); `expo export` of the app; HTTP checks against the running stack (`S-*`).
- **Layer B — parity and screens (4.2.17c).** The same pages on the live site (public pages only) and in `/legacy/` vs the new web, app and admin; ka + en at 390 px and 1280 px; i18n of every new key (Q-058); cross-client web ↔ app (a category made in the admin shows on web and app; hire from a profile chip on both).

Test-ID prefixes: `catalog` / `gig-search` / `seller-lists` / `home` / `admin-categories` / `admin-project-catalog` / `catalog-schema` / `rich-text` = the matching `apps/api/test/*.test.ts`; `QA-*` = QA probes in `qa-slice03.test.ts`; `S-*` = stack checks; `web:<file>` / `admin:<file>` = Playwright specs; `B-*` = layer-B manual checks.

## AC → test cases
| AC | What | Test cases (layer A) | Layer B |
|---|---|---|---|
| AC-1 | 3-level tree, ka/en names, unique slug, SEO text, icon/image top only | catalog "returns the 3-level tree…", "returns the icon and image… never below the top level"; catalog-schema (7 / 49 / 189, names ≤ 60, slugs unique per level, 4th level refused); admin-categories "allows 3 levels…", "takes a ready own category_image… top-level only"; **S-CAT** | B-HDR tree vs live header |
| AC-2 | Header row + mega panel (hover/focus/keyboard); mobile accordion | web:site-header "desktop: … keyboard mega-menu", "narrow desktop: … More", "phone: … drawer has the category accordion" | B-HDR web + app accordion with search |
| AC-3 | 3 levels, title, breadcrumb, list; wrong parent / unknown → 404 | catalog "resolves every level…", "answers 404 for an unknown slug, a level under the wrong parent…"; gig-search "lists the gigs of a node at every level"; web:category-pages "levels 2 and 3 resolve; wrong parent… 404"; admin:catalog-main-flow; **S-CAT**, **S-WEB** | B-CAT vs live `/categories/…` |
| AC-4 | `/en/` Georgian fallback + note | catalog "shows Georgian SEO texts on an English page…", "never shows English body text on a Georgian page"; web:category-pages "English page of a Georgian-only category…" | B-CAT en |
| AC-5 | Hidden category: no home row; header, pages, search stay | catalog "keeps a hidden top-level category in the tree…", "still serves a hidden category page"; home "hidden categories get no row"; **QA-HOME-1** | – |
| AC-6 | Listing eligibility (R-S1, P-29) | gig-search "lists only active gigs of active/verified owners…"; home "leaves out gigs that are not listed"; seller-lists (listable users) | – |
| AC-7 | `/en/` lists Georgian-only gigs with Georgian title | gig-search "includes Georgian-only gigs on English requests…" | – |
| AC-8 | 42 per page (web pages / mobile infinite) | gig-search paging ("refuses page together with cursor…"); **QA-PAGE-1** (50 → 42 + 8, page 3 empty); web:category-pages "level 1: … 42 cards…numbered pages" | B-APP infinite scroll (SETUP-LOCAL §4 17) |
| AC-9 | Rating ≥ N, 5 = 5.0 | gig-search "rating: average ≥ N…"; web:category-pages "filters and sort live in the URL…" | – |
| AC-10 | Price limits; min > max refused, results stay | gig-search "price: limits included; min above max → 400"; web:category-pages "min price above max is refused…" | B-APP filter sheet |
| AC-11 | Delivery ≤ N days, 0 included | gig-search "delivery time: at most N days…" | – |
| AC-12 | Filters/sort in the URL (legacy names), page 1 on change, Reset | web:category-pages "filters and sort live in the URL with the legacy names; GEL → tetri", web:search-page "the keyword stays through filters, sort and pages; Reset keeps it" | B-CAT URL vs live |
| AC-13 | Sort menu: 7 options, Recommended default | gig-search "Recommended (default)…"; web:category-pages (sort) | B-CAT, B-APP sort sheet |
| AC-14 | Premium group A first; each sort; daily mix; ties newest | gig-search "most popular, most selling and newest: group A first…", "Recommended (default)…", "the daily mix key is the Tbilisi date…" | – |
| AC-15 | Price sorts: no boost, numeric, badge still shown | gig-search AC-16 example (price), "shows the Featured flag… also on the price sorts" | – |
| AC-16 | Worked example | gig-search "AC-16 worked example…" (Premium test double) | – |
| AC-17 | Premium on/off within 60 s | gig-search "gains and loses the boost with the Premium status…" | slice 8 (real Premium) |
| AC-18 | Featured frame + badge with text | gig-search "shows the Featured flag…"; web:category-pages "level 1: … Featured badge" | B-CARD web + app card |
| AC-19 | Every word, any order, both languages, separators, superset of legacy | gig-search "normalises separators and case…", "lists gigs where every word appears…", "finds every legacy phrase match…"; **QA-KW-1** (Mtavruli/Latin capitals, no transliteration R-S9), **QA-KW-3** (markup words not matched, entities decoded); web:search-page "the header search opens /search?q=…" | B-SRCH same keyword live vs new |
| AC-20 | Empty keyword lists all | gig-search "treats a separators-only keyword as empty…"; web:search-page "an empty keyword lists every gig…" | – |
| AC-21 | Empty state + Reset | web:search-page "no match: the empty state…"; web:category-pages "empty category: the empty state…" | B-SRCH text vs live |
| AC-22 | Phone search icon in the header | web:site-header "phone: search icon opens a full-width search (AC-22)…" | B-HDR 390 px |
| AC-23 | Heading `t_search_results_for_q` | web:search-page "the header search opens /search?q= with the heading…" | B-SRCH |
| AC-24 | Top gigs: 4, Premium first, topped up | home (top gigs, Premium double) | – |
| AC-25 | Category rows: visible, random, ≤ 4, Premium first, See more on phones | home "one row per visible top-level category…", "a visible category without listed gigs gets an empty row"; web:home "home on a phone: 'See more' stays visible…" | B-HOME 390 px |
| AC-26 | Best sellers (S-108) | home "blocks of switched-off settings are null", "switched-on blocks… empty until their slices" (real list = slice 5) | B-HOME |
| AC-27 | `/sellers`: membership, daily mix, 40, card content | seller-lists "lists listable users with at least one active gig…", "shows the user summary and the first 3 skills…", "pages…", "the mix changes with the Tbilisi date"; web:seller-and-project-lists "/sellers: …" | B-SELL vs live `/sellers` |
| AC-28 | `/hire/{slug}`: title, contains match, daily mix, 42 | seller-lists "returns the skill and users…", "two users with the same slug… (EC-7)", "treats LIKE wildcards…"; **QA-HIRE-1**, **QA-HIRE-2** (Georgian slug percent-encoded); web:seller-and-project-lists "/hire/{slug}…" | B-SELL vs live `/hire/…` |
| AC-29 | No exact slug → redirect `/search?q=` (+ for spaces) | seller-lists "404 when no user skill has exactly this slug…"; **QA-HIRE-1** (case of the exact check vs legacy collation); web:seller-and-project-lists "unknown slug → /search?q="; **S-WEB** | B-SELL redirect vs live |
| AC-30 | Profile skill chip → `/hire/{slug}` | web:home / profile chips (4.2.11), mobile 4.2.15 | B-X web + app chip |
| AC-31 | Project categories + skills | catalog "lists active project categories with their active skills…"; admin-project-catalog (14); catalog-schema (R-S8 link by slug) | B-PROJ |
| AC-32 | `/explore/projects` list | seller-lists "S-075 OFF → 403…; ON → an empty page until slice 9"; web:seller-and-project-lists "explore projects: search bar, 'Popular:' chips…" | B-PROJ vs live (list itself = slice 9) |
| AC-33 | Category / skill pages, else 404 | catalog "resolves a category and a skill inside it, else 404"; seller-lists "404 for an unknown or inactive category or skill…"; web:seller-and-project-lists "unknown category or a skill outside it → 404…"; admin:catalog-main-flow | B-PROJ |
| AC-34 | S-075 OFF → feature disabled, links hidden | catalog "answers 403 FEATURE_DISABLED while S-075 is OFF"; seller-lists; web:seller-and-project-lists "S-075 OFF → feature disabled" | B-PROJ app |
| AC-35 | `/en/` works with the same slugs | web:site-header "language switch keeps the page and the query…"; web:category-pages (en); **S-WEB** (`/en/…` pages 200) | B-I18N |
| AC-36 | `?locale=` → 301 | web:site-header "legacy ?locale= and ?theme= answer one 301…"; **S-WEB** | – |
| AC-37 | Canonical + hreflang; filters dropped | web:category-pages "canonical and hreflang…", "?page=1 is the clean list: one 301"; web:search-page (noindex, canonical `/search`); **S-WEB** | – |

## Rules, edge cases, roles
| Item | Test cases |
|---|---|
| R-S1 eligibility | AC-6 tests |
| R-S2 filters | AC-9…AC-11 tests |
| R-S3 Premium ranking | AC-14…AC-16 tests; home Premium double |
| R-S5 keyword rule | AC-19 tests, **QA-KW-1…3** |
| R-S6 page sizes 42/40/42/40 | **QA-PAGE-1**, seller-lists, web:seller-and-project-lists (40 / 42) |
| R-S8 project taxonomy | catalog-schema "links every project category to a top-level gig category with the same slug"; admin-project-catalog "refuses a gig category below the top level (422)…" |
| R-S9 no transliteration | **QA-KW-1** |
| EC-2 delete in use refused | admin-categories "refuses a category with children, gigs… or project categories"; admin-project-catalog "refuses a category with skills…"; admin:catalog "in-use refusals are shown"; admin:catalog-main-flow |
| EC-5 separators only | gig-search "treats a separators-only keyword as empty…" |
| EC-6 keyword > 100 cut | gig-search "…cuts the keyword to 100 characters…"; **QA-KW-2** (through HTTP) |
| EC-7 same slug, two users | seller-lists "two users with the same slug…" |
| EC-8 daily mix at midnight | gig-search "the daily mix key is the Tbilisi date (UTC+4)…" |
| EC-1, EC-9 gig page, EC-10 migrated statuses | slices 3 / 5 (Phase 5) — not testable now |
| Staff SEO text sanitised (CONVENTIONS §19, spec 16 AC-60) | rich-text (11); admin-categories "…sanitises the SEO texts…"; **QA-SAN-1** (through the public lookup); admin:catalog-main-flow (`<script>` does not survive to the website) |
| Old slugs (spec 16 AC-60, spec 17 AC-10 store) | admin-categories "records the old slug…"; catalog-schema "gives an old slug to one item at a time…" |
| Public tree cache ≤ 60 s, staff change at once | catalog "is cached…"; admin-categories "a new name shows in the public tree at once" |
| **Wrong role tries it** | admin-categories / admin-project-catalog "needs a staff session with catalog.write"; **QA-ROLE-1** (guest and user Bearer → 401 on all 15 staff catalogue ops, nothing written); **QA-ROLE-2** (staff with another permission → 403 on all 15) |
| Notifications | none in spec 03 (BR-053 → spec 10) |

## Stack checks (on `pnpm local`, throw-away DB)
- **S-CAT** `GET /api/v1/categories` → 7 top / 49 / 189 seeded; `lookupCategory` at levels 1–3 → 200; a sub-category slug at the top level → 404.
- **S-API** `searchGigs` → 200 empty page with `totalCount 0`; min > max → 400 `t_min_price_greater_than_max`; page + cursor → 400; `getHome` 200; `listSellers` 200; `/hire/<unknown>` 404; project categories 200 (S-075 ON).
- **S-WEB** website on 3100: `/`, a category at levels 1 and 3, `/search?q=…`, `/sellers`, `/explore/projects` → 200 with canonical + hreflang; wrong parent → 404; `/hire/<unknown>` → redirect to `/search?q=`; `/?locale=en` → 301 `/en`; `/en/…` pages 200.

## Layer B checklist (4.2.17c)
- B-HDR, B-CAT, B-SRCH, B-HOME, B-SELL, B-PROJ, B-CARD: each screen on web (ka + en, 390 px and 1280 px) and in the app (source + `expo export`; device steps SETUP-LOCAL §4 17–18) vs the live site and legacy Blade/Livewire: fields, order, labels, links, messages, the states in spec 03 "Screens"; the admin catalogue screens vs the legacy Filament resources.
- B-I18N: every NEW key of spec 03 Texts present in en + ka with the spec values; NEW keys added during the slice (4.2.2b, 4.2.7, 4.2.8, 4.2.9a, 4.2.13, 4.2.14, 4.2.15) have en first and ka alongside; no hard-coded strings in the slice's screens.
- B-X: a category made in the admin shows on web and app; a profile skill chip opens `/hire` on both; filters shared by link.
- Re-check Q-167 / DEV-M1 (guests in the app) for the Owner.
