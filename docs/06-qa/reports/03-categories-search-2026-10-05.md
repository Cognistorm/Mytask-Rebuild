# QA report: slice 03 — Categories and search (spec 03)
Date: 2026-10-05 | QA: ROADMAP 4.2.17b + 4.2.17c (independent; did not write slice 2 code) | Branch: `feat/catalog-search` @ `8bb9e651` (part 1) and `817750ed` (part 2; no product change in between)
Plan: `docs/06-qa/plans/03-categories-and-search.md`. Judged against spec 03 (37 ACs, R-S1…R-S9, EC-1…EC-10), spec 16 AC-60/AC-61, contract 1.3.2, the slice handoffs 4.2.1–4.2.16 and the old platform. Security review (4.2.17a): `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md`.

**Status of this report: complete** (part 1 = 4.2.17b, §1–§6; part 2 = 4.2.17c, §7–§14).

## Verdict (4.2.17c): **FAIL** — 1 major bug (BUG-01); 2 minor bugs, 2 minor parity findings; 1 Owner question (Q-168)
- The product behaviour of spec 03 is sound. It works on the real stack with sample gigs:
  - category pages at 3 levels, search, filters, sort, pages, `/sellers`, `/hire`, explore projects, home rows and the admin catalogue all behave like the old platform or as the spec changes them;
  - filters and sort give the same results through the website URL (legacy parameter names) and the API, and the API answers byte-identically to web, iOS and Android;
  - i18n is complete (99 new keys, en + ka, spec values exact, no hard-coded strings in the slice's screens);
  - no broken image and no sideways overflow on any page at 1280 or 390 px.
- **BUG-01 (major, part 1) is still open:** under `pnpm local` the Georgian website pages loop with "too many redirects". Under the QA rule (a major bug means the feature is not done), slice 2 is **not done until BUG-01 is fixed in 4.2.18** and QA re-checks it.
- Minor items for 4.2.18 or the Owner:
  - BUG-02: home hero shortcut tiles on desktop;
  - BUG-03: the 5-star filter label;
  - F-01: `/hire` slug case, now confirmed on the live site;
  - F-02: `/sellers` browser title.
- Owner question Q-168 (S-107 starting value) is not blocking.
- Expected after the 4.2.18 fixes and a re-check: **PASS with notes**.

### Interim result of part 1 (kept for the record): 1 major bug (BUG-01), 1 minor parity finding (F-01), 3 notes
- The product behaviour of spec 03 is sound. Every suite passes, forced and with nothing replayed from cache. The 10 QA probes pass. Every API AC has at least one passing check (§4).
- **BUG-01 (major):** under `pnpm local` (Next.js dev) every Georgian page of the website answers `301` to itself, so the browser shows "too many redirects". English pages (`/en/…`) work. The cause is the `--hostname 127.0.0.1` flag added to `web` `dev` in b1051723 (SEC-71). The production build is not affected, which is why the website E2E (production build) stayed green. This blocks the Owner's click-through (4.2.20) and all local use of the website, and the 3 full-stack admin tests fail on it.
- With only that flag removed from the web dev server (same stack, same throw-away DB), **everything passes**: stack checks 28/28 and admin E2E 22/22, including both full-stack main flows.

## Environment and method
- Windows 11, Node 24.21.0, pnpm, Turborepo 2.11.5, Next.js 16.3.7, Playwright Chromium, Expo SDK 57.
- Turborepo runs used `--force` (0 cached).
- API tests: PGlite, the in-process Redis and the in-memory object storage, through the real HTTP pipeline with contract response validation.
- Web E2E: production build (`next build` + `next start`) against the stand-in API on 3199.
- Full stack: `LOCAL_PGLITE_DIR=<session scratchpad>/qa-db pnpm local`. The seed printed a new Super-admin. **The Owner's `apps/api/.pglite` was not used.** Redis, SeaweedFS and Mailpit data are the shared `.local/data` folders (slice 02 F-02, unchanged).
  - Run 1: `pnpm local` as is → BUG-01.
  - Run 2 (diagnosis): `local.mjs --infra-only` + `turbo run dev` for API and admin with the `.env` of `pnpm local` (`SCAN_PROVIDER=none`, `MAIL_TRANSPORT=smtp`) + the web dev server **without** `--hostname`. No product file changed.
- Every process I started was stopped at the end. No listener is left on 3000/3100/3101/3199/3200/5432/6379/8333/8025/1025/4100. `expo export` went to the scratchpad. The working tree has only QA and docs files.

## 1. Automated suites
| # | Command | Result |
|---|---|---|
| A-1 | `pnpm turbo run lint typecheck test --force` | **PASS** 25/25 tasks, 0 cached |
| A-2 | API tests (in A-1) | **PASS** 608 passed + 6 skipped (43 files + 1 skipped: `storage.integration`), incl. the 10 QA probes; api-client 9/9; i18n check |
| A-3 | `pnpm gen:check` | **PASS** (no drift; contract 1.3.2, 398 paths, 771 schemas) |
| A-4 | `pnpm i18n:check` | **PASS** en 3041 / ka 3047 keys (the 6 extra ka keys are the same as in slice 02) |
| A-5 | `pnpm format:check` | **PASS** (includes the new QA files) |
| A-6 | QA probes `apps/api/test/qa-slice03.test.ts` (alone) | **PASS 10/10** (§2) |
| A-7 | Web E2E: `pnpm --filter @mytask/web build` + `test:e2e` (production build) | **PASS** 138 passed, 3 skipped (the slice-01 full-stack `auth.spec`, needs `AUTH_E2E_MAIL_LOG`). Slice-02 specs: site-header 9, category-pages 8, search-page 4, seller-and-project-lists 4, home 3 |
| A-8 | Admin E2E on the full stack, run 1 (`PW_REUSE=1`, `ADMIN_E2E_LOG`, `pnpm local` as is) | **FAIL** 19 passed, 3 failed: `catalog-main-flow`, `profiles-main-flow`, `restrictions` → all `net::ERR_TOO_MANY_REDIRECTS` on `http://localhost:3100/…` = **BUG-01** |
| A-9 | Admin E2E on the full stack, run 2 (web dev without `--hostname`) | **PASS 22/22**, incl. `catalog-main-flow` (staff branch → website header data, category pages L1/L3 with the sanitised SEO text, 404 for a misplaced slug, explore projects chip and skill page, in-use delete refused, cleanup) and `profiles-main-flow` |
| A-10 | `expo export --platform all` (apps/mobile, output in the scratchpad) | **PASS** iOS 1307 modules, Android 1460 modules |
| A-11 | Stack checks (§3) | Run 1: 15/28 (every unprefixed web page = BUG-01). Run 2: **PASS 28/28** |

## 2. QA probes (`qa-slice03.test.ts`, new; all PASS)
| ID | Checks | Spec |
|---|---|---|
| QA-KW-1 | Mtavruli capitals (`ᲚᲝᲒᲝᲡ`) and Latin capitals match lower case; `logo` does not find `ლოგო` (no transliteration) | AC-19, R-S9 |
| QA-KW-2 | A keyword > 100 characters is cut through HTTP; words after the cut do not narrow the list | EC-6 |
| QA-KW-3 | Words of the HTML markup (`strong`) are not matched; visible text and decoded entities are | AC-19, R-S5 |
| QA-PAGE-1 | 50 gigs: page 1 = 42, page 2 = 8 with no next cursor, `totalCount` 50, no repeats; page 3 empty 200 | AC-8, R-S6 |
| QA-HOME-1 | A hidden top category: no home row, but tree entry, 3-level lookup, category list and keyword search stay | AC-5 |
| QA-HIRE-1 | Exact-slug check before the list is case-sensitive (`/hire/QA3PHP…` → 404 when the slug is lower case) → **F-01** | AC-28, AC-29 |
| QA-HIRE-2 | A Georgian skill slug, percent-encoded in the path, works | AC-28 |
| QA-SAN-1 | Staff SEO text with `<script>`, `onclick`, `onerror`, a `javascript:` link and a foreign image reaches `lookupCategory` without any of them; a good link keeps `href` and gets `rel` | spec 16 AC-60, CONVENTIONS §19 |
| QA-ROLE-1 | Guest and signed-in user (Bearer) → 401 on all 15 staff catalogue operations; nothing written | spec 16 AC-60/AC-61 |
| QA-ROLE-2 | Staff with another permission (`kyc.review`) → 403 on all 15; nothing written | spec 16 AC-60/AC-61 |

## 3. Stack checks (scratchpad script, GET only)
| ID | Check | Run 1 | Run 2 |
|---|---|---|---|
| S-CAT-1 | `/categories` = seeded tree 7 / 49 / 189 (both runs counted 8 / 50 / 190: one test branch left behind by the main flow that failed on BUG-01; the check then accepts ≥) | PASS | PASS |
| S-CAT-2…4 | `lookupCategory` at levels 1, 2, 3 with breadcrumb length 1, 2, 3 | PASS | PASS |
| S-CAT-5 | A sub-category slug at the top level → 404 | PASS | PASS |
| S-CAT-6 | English lookup → English name, `contentLocale` en | PASS | PASS |
| S-API-1 | `searchGigs` → 200, empty, `totalCount` 0 (no gigs before slice 3) | PASS | PASS |
| S-API-2 | min > max → 400 `t_min_price_greater_than_max` | PASS | PASS |
| S-API-3 | page + cursor → 400 | PASS | PASS |
| S-API-4 | `minPrice=99999999999999999999` → **500** (recorded; = security SEC-76, open, fix in 4.2.18) | – | – |
| S-API-5…9 | `getHome` 200 (8 rows, `featuredCategories` null = S-107 OFF by default), `listSellers` 200, `/hire/<unknown>` 404, `listProjectCategories` 200, `searchProjects` 200 empty | PASS | PASS |
| S-WEB-1…6 | `/`, category L1, category L3, `/search?q=logo`, `/sellers`, `/explore/projects` → 200 with canonical + hreflang | **FAIL** (301 → same URL) | PASS |
| S-WEB-7, 8 | `/en/categories/{c}/{s}`, `/en/sellers` → 200 with canonical + hreflang | PASS | PASS |
| S-WEB-9 | Wrong-parent category path → 404 | **FAIL** (301) | PASS |
| S-WEB-10, 11 | `/hire/<unknown>` → redirect `/search?q=…`; spaces → `+` | **FAIL** (301) | PASS (307, as the 4.2.11 handoff says) |
| S-WEB-12 | `?locale=en` → 301 `/en/…` | PASS | PASS |
| S-WEB-13 | Home HTML links every seeded top category in the header | **FAIL** | PASS |

## 4. Spec 03 coverage (from the plan; layer A)
- **Covered by passing tests:** AC-1…AC-29, AC-31…AC-37, R-S1…R-S9, EC-2, EC-5…EC-8, staff catalogue roles (spec 16 AC-60/AC-61), sanitiser, old slugs, tree cache.
- **Filled gig lists** (Featured frame and badge, AC-14…AC-18, AC-24, AC-25) are proven in the API tests (gigs written to the database, Premium test double) and the web E2E (stand-in API). They cannot be seen on the real stack until slice 3 creates gigs, and real Premium comes with slice 8 (AC-17).
- **UI only / later:** AC-30 (profile chip → `/hire`) is in layer B (4.2.17c). AC-26's real list = slice 5. AC-32's project rows = slice 9. EC-1, EC-9 = slice 3. EC-10 = Phase 5.
- **Mobile:** export only in this part. Screens on a phone (SETUP-LOCAL §4 17–18) = 4.2.17c.

## 5. Findings
### BUG-01 (major) — `pnpm local`: every Georgian website page redirects to itself
- **Where:** `apps/web/package.json` `dev` script: `next dev --port 3100 --hostname 127.0.0.1` (since b1051723, 2026-10-03, SEC-71). `apps/web/src/proxy.ts:64-67` rewrites `/x` to `/ka/x`.
- **Steps:** `pnpm local` → open `http://localhost:3100/` (or `127.0.0.1`), or any unprefixed page (`/sellers`, `/categories/…`, `/auth/login`).
- **Expected:** 200, the Georgian page. **Actual:** `301`, `Location:` the same path. The browser stops with `ERR_TOO_MANY_REDIRECTS`. `/en/…` pages answer 200.
- **Evidence:** the web dev log shows `Failed to proxy http://localhost:3100/ka Error: read ECONNRESET`. With a bound hostname, Next.js dev treats the proxy's rewrite target `http://localhost:3100/ka` as an external URL and proxies it over HTTP. The proxied request for `/ka` then gets the proxy's own "`/ka` → `/`" 301, which goes back to the browser.
- **Proof of cause:** the same stack with the web dev server started **without** `--hostname` → `/` 200, stack checks 28/28, admin E2E 22/22. With `--hostname localhost` → `/` 200 and still loopback only (listens on `::1`), but then `127.0.0.1:3100` does not answer. Devops must check that against SEC-71 (SSR visitor IP, `INTERNAL_SERVICE_TOKEN`) before choosing it.
- **Not affected:** the production build (`next start`, no `--hostname`; web E2E 138 PASS) and admin dev (has the same flag but no rewrite; admin E2E pages work).
- **Impact:** the Owner cannot use the local website for the click-through (4.2.20). The security reviewer's note "restart `pnpm local`" would not help. The admin full-stack tests fail. No CI job runs `next dev`, so CI would not catch it.
- **Owner:** devops-engineer, 4.2.18. Fix the dev start so the rewrite stays internal while keeping SEC-71 (loopback only), and add a check that fails on this (for example `curl` of `/` on the started `pnpm local` in the local smoke, or a dev-mode Playwright case).

### F-01 (minor, parity) — `/hire/{keyword}` exact-slug check is case-sensitive; legacy was not
- **Legacy:** `UserSkill::where('slug', $keyword)` (`legacy/APP/app/Livewire/Main/Hire/HireComponent.php:38`) on MySQL `utf8mb4_unicode_ci` (`legacy/APP/config/database.php:56`) = case-insensitive. So `/hire/PHP` showed the `php` skill page.
- **New:** `/hire/PHP` → API 404 → website redirect to `/search?q=PHP` (QA-HIRE-1). The list match after the check is already case-insensitive (`ILIKE`).
- **Impact:** small. Generated links use the stored lower-case slug. Only hand-typed or external links with capitals land on the search page instead of the hire page. Not confirmed on the live site at first (`php` is not a skill slug there). **Confirmed in 4.2.17c** with a real slug: `/hire/adobe-illustrator`, `/hire/ADOBE-ILLUSTRATOR` and `/hire/Adobe-Illustrator` all answer 200 on mytask.ge (§13).
- **Proposal:** make the exact check case-insensitive (`lower(slug) = lower($1)`), or accept it as a deviation. Backend 4.2.18 or the Owner.

### Notes (no action in this slice)
- **N-1** `GET /config/web-custom-code` is called by the website proxy on every public page (60 s cache) but has no API route until 4.15.14. The API's 404 is not in the contract for that operation, so the response validator turns it into **500** and logs a level-50 "contract violation" every minute. The website already treats it as "no custom code". Noise only. 4.15.14 removes it, or the route could answer `{ enabled: false }` earlier.
- **N-2** S-API-4 confirms security SEC-76 on the real stack (out-of-range `minPrice` → 500). Already in 4.2.18 through review 08.
- **N-3** The 4.2.16 full-stack main flow was not run before QA. A dev-mode break like BUG-01 can only be found on `pnpm local`, so each slice's E2E step should run the full-stack flows once on a throw-away DB.

## 6. Part 2 (4.2.17c) plan (done in §7–§14)
- Screen parity vs the live site and `/legacy/` (B-HDR, B-CAT, B-SRCH, B-HOME, B-SELL, B-PROJ, B-CARD, admin catalogue) in ka + en, 390 px and 1280 px. Until BUG-01 is fixed, use the web dev server without `--hostname` (method of run 2) or the production build.
- F-01 on the live site with a real skill slug (from a live profile's skill chips).
- i18n check of the NEW keys of spec 03 and of the slice (4.2.2b, 4.2.7, 4.2.8, 4.2.9a, 4.2.13–4.2.15).
- Cross-client: an admin-made category on web and app; profile skill chip → hire on both.
- Mobile screens on a phone (SETUP-LOCAL §4 17–18). Q-167 (guests in the app) stays open for the Owner.
- The verdict. Under the QA rule, BUG-01 (major) must be fixed in 4.2.18 and re-checked before slice 2 counts as done.

## 7. Method (part 2)
- **Live site** (public pages only, fetched 2026-10-05; GET only, no login, no form sent). Pages:
  - `/`, `/categories/graphics-design`, `/categories/graphics-design/logo-brand-identity/logo-design`;
  - `/search?q=ლოგო`, `/sellers`, `/hire/adobe-illustrator`, `/explore/projects`;
  - `/profile/vakhtangi_` (for real skill slugs).

  Playwright screenshots at 1280 and 390 px, and the text order extracted from the HTML.
- **Legacy** (read only): `Livewire/Main/{Sellers/SellersComponent.php, Hire/HireComponent.php}` (titles), `config/database.php` (collation), spec 03's legacy citations.
- **New platform on the real stack.** Throw-away DB `LOCAL_PGLITE_DIR=<scratchpad>/qa-db` (the Owner's `apps/api/.pglite` was not used).
  - Started as in part 1 run 2, because of BUG-01: `local.mjs --infra-only` + `turbo run dev` (API, admin) with the `.env` + web dev **without** `--hostname`. That web server listened on all interfaces during the session; it is stopped.
  - **Sample data** (scratchpad script, not committed), written with the API's own compiled `PrismaService` and `SearchIndex` (so the search documents are built by the product code):
    - 3 sellers with skills (2 with avatars);
    - 56 active gigs: 45 in one child category (for paging), 6 in another top category, 5 Georgian-only in a third;
    - varied price, delivery time, rating, sales and visits; ka titles, en on two thirds;
    - images = real WebP variants in the local SeaweedFS.
  - Premium stays OFF (slice 8), so no Featured badge on the real stack. The badge is covered by the stand-in E2E.
  - The 24 sample images were deleted from the shared local bucket afterwards.
- Playwright Chromium: 12 web pages × 2 widths (incl. English pages, page 2, an empty search), admin `/categories`, `/project-categories`, `/skills` × 2 widths. For every page: HTTP status, title, sideways overflow, broken images. Screenshots stay in the scratchpad.
- **App:**
  - no device in this session; mobile E2E waits for Phase 6 (Owner 2026-10-03);
  - evidence = source review (operations, filter mapping, i18n), the export from part 1 (A-10), and API answers per client header;
  - §12 lists what only a phone can show.
- Every process I started was stopped. No listener is left on 3000–3200/5432/6379/8333/8025/1025/4100.

## 8. Screen parity: live site + legacy vs new web and admin
| Screen | Live / legacy | New (ka + en, 1280 + 390 px) | Result |
|---|---|---|---|
| Header | Logo, search icon, language flag, theme, cart, "გამოწერა", "აღმოაჩინე ▾", Login, Register | Logo, pill search with "სარჩევი ▾", theme, Explore ▾, Login, Join; second row = top categories (AC-2) with mega-menu (E2E). Language switch in the footer and phone drawer, as in design `01-home.md`. Cart, Subscription and the invite banner are hidden until their slices (4.2.9a) | **PASS** |
| Category page (L1, L3) | Title with accent bar, sort top right, left filters (rating stars, min/max price, 10 delivery options, "გაფილტვრა"), 3-column cards, numbered pages | Breadcrumb + h1, "N შედეგი", "დალაგება: რეკომენდებული ▾", the same filter groups and order ("4+ ვარსკვლავი", "მაქსიმუმ 3 დღე" = the P-27 rules), 4-column cards, page numbers + "შემდეგი"; 45 gigs → 42 + 3 over 2 pages; phone: "გაფილტვრა" button + sheet. **BUG-03** on the 5-star label | **PASS** (BUG-03 minor) |
| Gig card | Image, avatar + username, title, stars or "შეფასების გარეშე (0)", heart, "საწყისი ფასი ₾…" | Image, avatar (+ online dot) + username, title (2 lines), stars with "4.5 (6)" or quiet `t_no_reviews_yet`, "საწყისი ფასი ₾76.00". The heart comes with favourites (spec 04, slice 3) | **PASS** |
| Search `/search?q=…` | Title "ძიების შედეგი ლოგო" | Same heading and title. Keyword kept in the header field. Empty: "გთხოვთ სცადეთ ხელახლა" + "ფილტრის გასუფთავება" (AC-21) | **PASS** |
| English pages | – (legacy `?locale=en`) | `/en/categories/…`: English UI, breadcrumb, "5 results"; Georgian-only gigs listed with Georgian titles (AC-7) | **PASS** |
| Home | Hero (h1, search, "invite and earn points" button, 2 white round tiles with icon + label), featured categories, projects row, Top gigs, a row per category with "მეტის ნახვა", footer with 4 link columns | Hero h1 + search, Top gigs, a row per category with gigs (empty rows hidden), "მეტის ნახვა" → `/search` and the category pages, exactly like live. Featured categories: S-107 is OFF on the local DB (**Q-168**). Projects row = slice 9, invite banner = slice 8, footer links = slice 16 (4.16.13). **BUG-02** on the shortcut tiles | **PASS** (BUG-02 minor) |
| `/sellers` | "საუკეთესო ფრილანსერები" + subtitle; cards: avatar, username, "Level …" (removed, Q-014), skill chips, "შეტყობინების გაგზავნა", "პროფილის ნახვა"; page numbers. Title `t_sellers` "ფრილანსერები" | Same heading, subtitle, card content (without levels; "ID verified" when KYC is approved), 1 column on phones. Browser title uses `t_top_sellers` (**F-02**) | **PASS** (F-02 minor) |
| `/hire/{slug}` | Title `t_hire_the_best_skill_name_experts` with the skill **name** (`HireComponent.php:81`); cards as `/sellers` | Same title and subtitle with the skill name, cards with chips → `/hire/…`. Case of the slug: **F-01** | **PASS** (F-01 minor) |
| Explore projects | Search bar, category chips, "უახლესი პროექტები" list | Search bar, "პოპულარული:" chips, empty latest list until slice 9; en page OK | **PASS** |
| Admin catalogue | Legacy Filament: name per language, slug, description, icon, image, `is_visible`; project categories with SEO description and image | `/categories` tree with level names, counts (45 gigs on the design branch), old slugs, add sub-category, edit, delete; `/project-categories` with the linked category and skill count; `/skills` with category filter and search; usable at 390 px (nav wraps, no overflow) | **PASS** |

## 9. Real-stack behaviour with sample data
| Check | Result |
|---|---|
| `searchGigs` without filters | 56 total, 42 on the first page, images 200 `image/webp` |
| Keyword `ლოგოს დიზაინი` | 45 (every word, Georgian) |
| `minPrice=1000&maxPrice=20000&rating=4&deliveryTime=7&sort=best_rating` | 17 gigs, all rating ≥ 4, 10–200 ₾, ≤ 7 days incl. 0 ("None"), best rating first. **The same 17 on the website** for `/search?min_price=10&max_price=200&delivery_time=7&rating=4&sort_by=rating` (legacy names, GEL → tetri) |
| Website `min_price=200&max_price=10` | 200 with `t_min_price_greater_than_max` shown |
| `getHome` | Top gigs 4; rows only for categories with gigs (4 + 4 + 4) |
| `/sellers`, `/hire/logo-design` | 3 sellers with their skills; hire lists both users with a `logo-design` skill (EC-7), title from the oldest one |

## 10. i18n (Q-058)
- Keys added on the branch since `main` (slices 1 and 2 together): **99 en / 99 ka**. None missing, none empty, none left with the English text in ka. English values of existing keys are unchanged except `t_u_wont_be_able_to_receive_orders_until_date` (slice 1, recorded there).
- The spec 03 NEW keys have the spec values exactly: `t_recommended`, `t_min_price_greater_than_max`, `t_rating_n_plus`, `t_up_to_delivery`, `t_show_results`, `t_featured_badge_hint`, `t_popular_categories`. The reused legacy keys keep their legacy values.
- No hard-coded user text in the slice's web components (`components/catalog`, `home`, `site`, `(public)` pages) or app screens (`(tabs)`, `categories`, `sellers`, `hire`, `explore-projects`, `components/catalog.tsx`). The only literals are the logo's `alt`/`accessibilityLabel` "MyTask.ge" (brand name).
- **BUG-03:** the 5-star rating option uses the legacy key `t_5_stars`, ka "5 ⭐️". Next to "4+ ვარსკვლავი" it shows as "★★★★★ 5 ⭐". The value is legacy, so the fix is a text choice for the Owner (for example ka "5 ვარსკვლავი"; en "5 stars" stays).
- `pnpm i18n:check` PASS (A-4).

## 11. Cross-client (web ↔ app)
| Check | Result |
|---|---|
| Same operations | App and website call the same catalogue operations: `/categories`, `/categories/lookup`, `/search/gigs`, `/home`, `/sellers`, `/hire/{keyword}`, `/project-categories`, `/project-categories/lookup`, `/search/projects` |
| Same filter rules | Both convert GEL with ≤ 2 decimals to tetri (`Math.round(x * 100)`) and refuse min > max before the call (`apps/mobile/src/lib/catalog.ts:46-56`, `apps/web/src/lib/list-query.ts:56-60`) |
| Same answers | `/categories`, the filtered search, `/sellers`, `/hire/logo-design`, `/project-categories`, `lookupCategory`: the body is **byte-identical** for `X-MyTask-Client: web` and `ios`, and for `android` vs `web` in English |
| Staff change reaches both | `catalog-main-flow` (A-9) proves admin → website at once; the app reads the same tree, which a staff write empties from the cache (`CategoriesService.invalidate()`, 4.2.7) |
| On a phone | Not possible here, see §12 |

## 12. App: what QA could not see, for the Owner on the phone (SETUP-LOCAL §4 steps 17–18)
- Home tab: hero search opens Explore; rows scroll sideways; "See more" opens the category; pull to refresh.
- Explore: the count, filter sheet with sticky "შედეგების ჩვენება" (min > max refused), sort sheet, infinite scroll by 42.
- Categories menu: the accordion with its search box; category screens at 3 levels with breadcrumb.
- `/sellers` (40 per load), `/hire` from a profile skill chip, explore projects chips.
- Gigs open on the website until slice 3 (4.2.14 handoff).
- **Q-167** (guests in the app) is still open: today a guest must sign in before Home/Explore.

## 13. Bugs, findings and questions (part 2)
| ID | Severity | What | Owner of the fix |
|---|---|---|---|
| BUG-01 | **major** | `pnpm local` website loop (part 1, §5). Still open | devops, 4.2.18 |
| BUG-02 | minor | **Home hero shortcuts at desktop width:** "განცხადებები" and "პროექტები" render as two ~96 px outlined circles. The labels are wider than the circles and spill over their edges, and there are no icons. Design `01-home.md:8, :29-31` asks for "two round shortcut tiles" with an icon; live has 128 px white circles with an icon above the label. Cause: `.mt-home-shortcuts a` is a pill (`--mt-radius-pill`) in a grid of auto-width columns (`apps/web/src/components/home/home.css:54-70`). At 390 px the 2-button row is correct | web, 4.2.18 |
| BUG-03 | minor | 5-star filter label "5 ⭐" (§10) | Owner text choice, or web drops the label for 5 |
| F-01 | minor | `/hire/{keyword}` exact slug is case-sensitive. **Confirmed on live:** `/hire/ADOBE-ILLUSTRATOR` and `/hire/Adobe-Illustrator` → 200 there, a redirect to search here | backend, 4.2.18 (`lower(slug) = lower($1)`), or accept |
| F-02 | minor | `/sellers` browser title: legacy `t_sellers` "ფრილანსერები \| My Task" (`SellersComponent.php:32`); new `t_top_sellers` "საუკეთესო ფრილანსერები \| MyTask". The h1 is the same as live | web, 4.2.18 |
| Q-168 | question | S-107 featured categories: the register says OFF in prod, the live site shows it (`open-questions.md`) | Owner, before Phase 5 |
| N-4 | note | Title brand "MyTask" vs live "My Task" (`settings('general')->title`), and home title "MyTask.ge" vs "My Task \| Freelance Service Marketplace": these come from the site-title/SEO settings (spec 17, slice 16) and the settings migration | slice 16 / Phase 5 |
| N-5 | note | The failed run-1 main flow left a "ტესტ კატეგორია …" branch, project category and skill in the **throw-away** DB only. A failing full-stack test does not clean up after itself; harmless on a throw-away DB | – |

## 14. What 4.2.18 must do, then QA re-checks
- **BUG-01** (major, devops). Then QA re-runs on a plain `pnpm local` (throw-away DB): admin E2E incl. both main flows, stack checks S-WEB-1…13.
- BUG-02 (web), F-01 (backend), F-02 (web); BUG-03 if the Owner picks a text.
- Security review 08 items for 4.2.18 (SEC-76, SEC-77, I-44; contract maxima by the architect).
- Then the Owner click-through 4.2.20 with `docs/06-qa/plans/03-categories-search-owner-click-through.md`, plus Q-167 and Q-168.
