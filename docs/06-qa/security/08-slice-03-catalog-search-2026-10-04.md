# Security review 08: slice 2 catalogue and search (spec 03 + spec 16 AC-60/AC-61), ROADMAP task 4.2.17
Date: 2026-10-04 | Reviewer: security-reviewer (independent; did not write this code) | Branch reviewed: `feat/catalog-search` @ `8bb9e651` | Scope: `git diff main...HEAD -- apps packages`, commits of 4.2.2b … 4.2.16 plus `8bb9e651` (4.2.0a–g were covered by review 07) | Inputs: CLAUDE.md; reviews 06 and 07; ADR-013, ADR-019; CONVENTIONS §19; handoffs `docs/handoffs/2026-10-0{3,4}-*4-2-*.md`.

## Verdict: **PASS with conditions**
- **Merge of `feat/catalog-search` to `main`: ALLOWED** from the security side. No Critical or High findings. **No finding blocks the merge.**
- **New findings: 0 Critical, 0 High, 0 Medium, 4 Low (SEC-76 … SEC-79), 8 Info (I-44 … I-51).**
- Conditions (not merge gates):
  - SEC-76 and SEC-77: next backend pass (both are small).
  - SEC-78: before Phase 6, and before any S-110 session-recording code is turned on.
  - SEC-79: with the SEC-73/SEC-74 follow-up pass.
- No product code was changed by this review. Probes ran from the session scratchpad only. The Owner's `pnpm local` was not stopped or restarted; only GET requests were sent to it.

## 1. Method
1. Read at HEAD:
   - `apps/api/src/platform/rich-text/rich-text.ts`, `packages/rich-text/allow-list.json`, `packages/rich-text/src/index.ts`;
   - `apps/api/src/modules/catalog/*` (admin services, controllers, `category-images.ts`, `gig-search.service.ts`, `seller-lists.service.ts`, `project-search.service.ts`, `list-rules.ts`, `search-text.ts`, `gig-cards.ts`, `home.service.ts`, `categories.service.ts`);
   - `apps/api/prisma/seed-catalog.ts`;
   - `packages/api-client/src/upload.ts`, `apps/admin/src/components/catalog.tsx`;
   - web: `apps/web/src/proxy.ts`, `lib/zones.ts`, `lib/site-data.ts`, `lib/list-query.ts`, `components/site/header-client.tsx`, `app/[locale]/(public)/layout.tsx`, `categories/[...path]/page.tsx`, `hire/[keyword]/page.tsx`;
   - mobile: `apps/mobile/src/lib/web-pages.ts`, `components/catalog.tsx`.
2. Commands and probes:

| Command / probe | Result |
|---|---|
| `npx vitest run test/rich-text.test.ts test/catalog.test.ts test/admin-project-catalog.test.ts test/gig-search.test.ts` (apps/api) | **4 files, 100 tests passed** |
| P1 sanitiser probe (`tsx`, the real `sanitizeRichText`), about 45 payloads | Every payload neutralised: `javascript:` with entities/tabs, `data:`, backslash and triple-slash host tricks (`/\host`, `\host`, `/&#92;host`, `///host`, `/%09/host`, `https:\host`), userinfo links, event handlers, `style`/`class`/`id`, `colspan` injection, `img` outside the media base (`..`, `%2e%2e`, `@host`, other prefix), noscript/svg/math/table mXSS, comments. `alt` is escaped. `user_text` drops links and images |
| P2 sanitize-html advisories GHSA-jxwj-j7wr-gfrw (textarea solidus close) and GHSA-g8qq-57p8-ggw5 (SVG SMIL) against our options | Not exploitable with our allow-list: `textarea` and `svg` are in `dropWithContent`, so the content is removed (SEC-77) |
| P3 in-process API (test app, PGlite) via a scratchpad vitest config | `search/gigs?minPrice=99999999999999999999` → **500**; `maxPrice=1e30` → **500**; `minPrice=9223372036854775807` → **500** (SEC-76). 50-word keyword with `%` and `_` → 200, empty. `/hire/<5000 chars>` → 400 maxLength. `page=1000&limit=100` → 200. `gigs?sellerUsername=x' OR 1=1--` → 200 empty (parameterised). `categories/lookup?path=a/../b` → 404 |
| P4 web proxy on `localhost:3100` (GET, `curl --path-as-is`) | `//evil.com/?locale=en` → 308 `/evil.com/`; raw backslash path `?locale=ka` → 308 `/evil.com`; `/%5Cevil.com/?locale=ka` → 301 `/%5Cevil.com`; `/%2F%2Fevil.com/?page=1` → 301 `/%2F%2Fevil.com`; `/%09/evil.com/?locale=ka` → 301 `/%09/evil.com`; `/ka/%5Cevil.com` → 301 `/%5Cevil.com`; CRLF in the path stays percent-encoded in `Location`. No redirect leaves the site; the theme cookie is only ever `dark`/`light` |
| `pnpm audit --prod` | 7 advisories (5 moderate, 2 high). API: the two sanitize-html ones (SEC-77). The rest are mobile/dev tool chains (`node-forge`, `braces`, `yaml`, `uuid`, `decode-uri-component` under expo/metro/eslint), not in the API or web runtime; no change from this slice |
| `localhost:3000/api/v1` | The running API is an older build: `/search/gigs` 404, `/home` and `/sellers` 500. So I probed the branch code in-process (P3) instead |

3. Limits: no concurrent probes (PGlite has one connection), so SEC-79 comes from reading the code. No real PostgreSQL size test for I-46.

## 2. What is correct (checked, no finding)
- **Sanitiser (4.2.7a, SEC-22, CONVENTIONS §19).**
  - One allow-list, used on every write of `contentTop`/`contentBottom` (`admin-categories.service.ts:305-309`).
  - Links are parsed with `URL`, never string tests. Noise characters are stripped first, and userinfo is refused.
  - `img` must be inside `PUBLIC_MEDIA_BASE_URL` (parsed); without it there are no images (fail closed).
  - `allowProtocolRelative: false`, no styles, no classes.
  - The only other stored-HTML source, the seed, has no HTML (`seed-catalog.ts:19-24`).
  - The web renders only this API output (`categories/[...path]/page.tsx:97, 114`). Mobile does not render these fields.
- **Staff catalogue CRUD.**
  - Every route is `@StaffRoute('catalog.write')` (`admin-catalog.controllers.ts`).
  - Every write is audited inside its transaction, with before/after.
  - An image must be a `category_image` file that this staff member owns, not deleted, `ready`, and not shown by another category (`admin-categories.service.ts:377-389`, `admin-project-catalog.service.ts:483-495`). Images are top level only.
  - The SEC-74 compare-and-set `UPDATE … status = 'ready'` runs inside the transaction (`:395-410`, `:500-512`).
  - A file shown by a category cannot be deleted through `/admin/files` (`FileAttachments.register`, `:66-68`).
  - Replaced files are purged after the commit, only when no category shows them.
  - Slug changes take `pg_advisory_xact_lock` per (type, depth, slug) in sorted order. They refuse current slugs and old slugs of other categories, and keep §3.R rules 1 and 3.
  - Delete is refused while the category is in use, and the FK RESTRICT race is mapped to 409.
- **Staff uploads.** `uploadFile(..., { staff: true })` uses only `/admin/files*`. The purpose `category_image` needs `catalog.write` (`modules/files/purposes.ts:121`) and accepts PNG/JPEG only. The admin preview uses a `blob:` URL of the local file or the media thumbnail.
- **Public reads.**
  - All SQL is `Prisma.sql` with bound parameters.
  - `containsPattern` escapes backslash, `%` and `_` (`search-text.ts:249-251`).
  - The keyword is cut to 100 characters, and the contract caps `q` at 1000.
  - The listable-owner rule (`list-rules.ts:175`) is joined live on every list (search, profile gigs, sellers, hire).
  - Paging: `limit` ≤ 100, `page` ≤ 1000, cursor offset ≤ 100,000 with a strict format.
  - `/hire/{keyword}` has a maxLength in the contract and matches the slug exactly before the ILIKE list.
  - `searchProjects` honours S-075 (403 when off).
  - Gig cards carry only public fields (`UserSummary`). `isFavorite` is not leaked to guests.
- **Website.**
  - `proxy.ts`: the legacy `?locale=`/`?theme=`/`?page=1` 301s are relative to the request origin. The new `//` guard (`proxy.ts:22`) works, and Next.js already normalises `//` and backslashes itself (P4).
  - `zones.ts`: the new public patterns are anchored; unknown paths stay private (strict CSP).
  - `site-data.ts`: only `username`, `avatar` and `lastDashboard` reach the browser.
  - The header-wide `getMe` refresh (`header-client.tsx:57-67`) runs once per page, and only when the device cookie says this browser has signed in before.
  - `list-query.ts` allow-lists every filter value, and prices are ≤ 9 digits, so the website itself cannot trigger SEC-76.
  - The hire redirect target is built from `href()` + `encodeURIComponent`, so it stays same-site.
- **Mobile.** Gigs open `${appUrl}/service/${encodeURIComponent(slug)}` (`web-pages.ts:24`). There are no WebViews and no HTML rendering in the new screens.

## 3. New findings — Low

| ID | Title | Where | Exploit (in words) | Fix | Owner / when |
|---|---|---|---|---|---|
| SEC-76 | An out-of-range price filter makes `searchGigs` answer 500 | `apps/api/src/modules/catalog/gig-search.service.ts:93-96` (`BigInt(query.minPrice)` bound as `int8`); contract `docs/04-api/openapi.yaml:21363-21378` (`minPrice`/`maxPrice` have `minimum: 0` but no `maximum`) | Anyone sends `minPrice=99999999999999999999` (or `1e30`). The validator accepts it as an integer, and PostgreSQL fails on the bigint overflow → `INTERNAL_ERROR` 500 (probe P3). There is no data impact, but anyone can create error-log noise and 5xx alerts on demand | Architect: add a `maximum` to both parameters (e.g. 100,000,000,000 tetri, or the gig price cap of spec 04), with an ADR note. Until then, backend refuses values above int8/`MAX_SAFE_INTEGER` with `fieldError(…, 'range')`. Add a test | architect + backend; next pass |
| SEC-77 | sanitize-html 2.17.5 has two published XSS advisories | `apps/api/package.json:45` (`"sanitize-html": "2.17.5"`, pinned) | GHSA-jxwj-j7wr-gfrw (textarea mutation XSS, fixed in 2.17.6) and GHSA-g8qq-57p8-ggw5 (SVG SMIL scheme bypass, vulnerable ≤ 2.17.6). **Not exploitable with our options:** both need `textarea`/`svg` to be allowed, and our allow-list removes them with their content (probe P2). The risk is a later allow-list change, or the Phase 5 ETL reusing the library with other options | Upgrade to the first release that fixes both (≥ 2.17.7; check the changelog). Re-run `rich-text.test.ts` and add both advisory payloads as regression cases | backend; next pass |
| SEC-78 | The ADR-019 §5 masking attribute is missing, now that every public page shows the signed-in visitor | `apps/web/src/components/site/header-client.tsx:193-210` (desktop `AccountMenu` with avatar and username) and `:256` (drawer). There is no `data-clarity-mask` anywhere in `apps/web` or `packages/ui` | ADR-019 §5 requires `data-clarity-mask="true"` on the header account area, because S-110 session-recording code (Clarity is used on the live site) runs on public pages. Since 4.2.9a the header with username and avatar appears on home, search, categories, sellers, hire and profiles. Once the Super-admin re-enters the Clarity snippet (ADR-019 §7), a third party records each signed-in visitor's identity unless the Owner remembered "Strict" masking. That is personal data sent to a processor without the agreed safeguard | Add `data-clarity-mask="true"` to the account menu wrapper and the drawer's account block, and to any later header element with user data (cart, bell). Add an e2e or unit assertion | web-engineer; before Phase 6 / before S-110 recording code is enabled |
| SEC-79 | Category image uniqueness and purge are checked outside the write | `admin-categories.service.ts:383` (`isUsed` before the transaction) and `:449-457` (`purgeReplaced` after the commit); the same pattern in `admin-project-catalog.service.ts:489` and `:515-521` | (a) Two concurrent saves with the same new file both pass `isUsed` and both mark it attached, so one file is shown by two categories. That breaks the "never shown twice" rule of `category-images.ts`. (b) A staff save on X replaces icon F, and just after X commits a second save puts F on Y. If `purgeReplaced`'s `isUsed(F)` ran before Y committed, F's objects are deleted and the row is marked `deleted` while Y shows it: a broken image on a public category page until someone fixes it. Both need the **same** staff member (owner check) and tight timing; the impact is cosmetic | Move the "in use" check into the transaction after locking the file row (`SELECT … FOR UPDATE` on `files`), or add a uniqueness constraint across the image columns. In `purgeReplaced`, lock the file row and re-check usage in one transaction before purging (compare-and-set), so `markAttached` and the purge are serialised. Same pass as SEC-73/SEC-74 | backend; with SEC-73/SEC-74 |

## 4. Info
- **I-44 Abandoned `category_image` uploads are never cleaned.** The admin picker uploads as soon as a file is chosen (`apps/admin/src/components/catalog.tsx:93-115`), so a cancelled form leaves a ready public image behind. The SEC-64 stop-gap covers only `avatar` and `portfolio_image` (`apps/api/src/worker/files-scan.sweeper.ts:168`). Uploads need `catalog.write`, so the only cost is storage. Add `category_image` to the 24 h cleanup (it already sets `attached_at`).
- **I-45 No length limit on staff SEO HTML, no maximum on `position`.** `contentTop`/`contentBottom` are `LocalizedString` without `maxLength` (`openapi.yaml:27353`, `:27434`); the only bound is the 1 MB JSON body. `position` has no `maximum`, so a value above int4 returns 500. Staff only. Add a sensible `maxLength` (e.g. 50,000) and a `maximum` in the next contract bump.
- **I-46 Search query cost.**
  - A 100-character keyword can hold about 50 one-letter words. Each becomes `LIKE '%x%'`, which the trigram index cannot serve (below 3 characters).
  - Each request also runs `count(*)` plus the page query (`search-text.ts:242-246`, `gig-search.service.ts:81-83, 110-119`).
  - The global limit is 600 reads/min/IP. At legacy volume this is fine.
  - Before Phase 6: set a `statement_timeout` for public reads, and measure with the imported data. Capping the number of words would change AC-19, so that is an Owner question, not a security fix.
- **I-47 Stored HTML is trusted at render time.** `categories/[...path]/page.tsx:97, 114` render API output with `dangerouslySetInnerHTML`. That is correct under CONVENTIONS §19, but it rests on the rule that every write path sanitises. Today there is exactly one write path (`admin-categories.service.ts:306`). The Phase 5 ETL, and any future machine-translation writer of these columns, must call `sanitizeRichText(…, 'staff_content')`. Add this to the Phase 5 checklist.
- **I-48 Admin app has no CSP (pre-existing).** This slice adds no HTML rendering to admin: names and SEO texts are shown in inputs, and images are blob or media URLs. Still, the admin handles staff tokens. Give it the strict nonce CSP of the web private zone before Phase 6.
- **I-49 External links in `staff_content` are not yet signed through `/redirect`** (spec 17 AC-47, deferred in `rich-text.ts:4`). They carry `rel="noopener"` only. Do it when the signer exists (slice 17).
- **I-50 `/hire/{keyword}` pages come from user-chosen skill slugs** (legacy parity, spec 03 AC-28/EC-7). Any user can create a public, indexable `/hire/<slug>` page whose title contains their skill name. The name is rendered as text, so the only risk is SEO spam. If wanted, consider `noindex` for skills held by a single unverified user (Owner question).
- **I-51 The proxy guard is correct but mostly redundant.** Next.js already answers `//host` and raw backslash paths with a same-site 308 before the proxy runs (P4). Keep the guard and the e2e. If the proxy ever decodes the pathname before building `target`, `%5C` and `%09` would become dangerous, so keep using the raw `nextUrl.pathname`.

## 5. Not changed by this slice (still open; owners and timing as in reviews 06/07)
- **Owner:** SEC-66, SEC-67.
- **devops, before Phase 5:** SEC-72.
- **backend:** SEC-73, SEC-74. **Added:** SEC-79 to the same pass.
- **Before slice 05/07:** SEC-75, I-38.
- **Phase 6 checklist:** SEC-70 (c), SEC-71, I-35, I-36, I-39, I-42. **Added:** SEC-78, I-46, I-48.

## 6. Handoff
- **orchestrator:** the security gate for merging `feat/catalog-search` is met. Record SEC-76 … SEC-79 and I-44 … I-51 in the follow-up lists.
- **backend-engineer:** SEC-76 (guard + test), SEC-77 (upgrade + regression payloads), I-44. Then SEC-79 together with SEC-73/SEC-74.
- **solution-architect:** the SEC-76 contract `maximum` for `minPrice`/`maxPrice`; the I-45 `maxLength`/`maximum` in the next contract bump.
- **web-engineer:** SEC-78 masking attribute; I-48 admin CSP (Phase 6).
- **devops-engineer:** I-46 `statement_timeout` and a load check with imported data (Phase 6).
