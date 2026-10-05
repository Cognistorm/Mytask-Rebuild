# QA report: slice 03 — Categories and search (spec 03)
Date: 2026-10-05 | QA: ROADMAP 4.2.17b (independent session; did not write slice 2 code) | Branch: `feat/catalog-search` @ `8bb9e651`
Plan: `docs/06-qa/plans/03-categories-and-search.md`. Judged against spec 03 (37 ACs, R-S1…R-S9, EC-1…EC-10), spec 16 AC-60/AC-61, contract 1.3.2, the slice handoffs 4.2.1–4.2.16 and the old platform. Security review (4.2.17a): `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md`.

**Status of this report: part 1 of 2** (part 1 = 4.2.17b, §1–§6; part 2 = 4.2.17c, screen parity, i18n, cross-client and the verdict).

## Interim result of part 1: 1 major bug (BUG-01), 1 minor parity finding (F-01), 3 notes
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
- **Impact:** small. Generated links use the stored lower-case slug. Only hand-typed or external links with capitals land on the search page instead of the hire page. Not confirmed on the live site: `php` is not a skill slug there (`/hire/php` and `/hire/PHP` both 302 to search), so 4.2.17c retries with a real slug.
- **Proposal:** make the exact check case-insensitive (`lower(slug) = lower($1)`), or accept it as a deviation. Backend 4.2.18 or the Owner.

### Notes (no action in this slice)
- **N-1** `GET /config/web-custom-code` is called by the website proxy on every public page (60 s cache) but has no API route until 4.15.14. The API's 404 is not in the contract for that operation, so the response validator turns it into **500** and logs a level-50 "contract violation" every minute. The website already treats it as "no custom code". Noise only. 4.15.14 removes it, or the route could answer `{ enabled: false }` earlier.
- **N-2** S-API-4 confirms security SEC-76 on the real stack (out-of-range `minPrice` → 500). Already in 4.2.18 through review 08.
- **N-3** The 4.2.16 full-stack main flow was not run before QA. A dev-mode break like BUG-01 can only be found on `pnpm local`, so each slice's E2E step should run the full-stack flows once on a throw-away DB.

## 6. What part 2 (4.2.17c) must do
- Screen parity vs the live site and `/legacy/` (B-HDR, B-CAT, B-SRCH, B-HOME, B-SELL, B-PROJ, B-CARD, admin catalogue) in ka + en, 390 px and 1280 px. Until BUG-01 is fixed, use the web dev server without `--hostname` (method of run 2) or the production build.
- F-01 on the live site with a real skill slug (from a live profile's skill chips).
- i18n check of the NEW keys of spec 03 and of the slice (4.2.2b, 4.2.7, 4.2.8, 4.2.9a, 4.2.13–4.2.15).
- Cross-client: an admin-made category on web and app; profile skill chip → hire on both.
- Mobile screens on a phone (SETUP-LOCAL §4 17–18). Q-167 (guests in the app) stays open for the Owner.
- The verdict. Under the QA rule, BUG-01 (major) must be fixed in 4.2.18 and re-checked before slice 2 counts as done.
