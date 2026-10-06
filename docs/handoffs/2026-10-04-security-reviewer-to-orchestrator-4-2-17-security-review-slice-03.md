# Handoff: security-reviewer → orchestrator — 4.2.17 security review of slice 2 (catalogue and search)

## What I did
- Independent security review of `feat/catalog-search` @ `8bb9e651`: commits 4.2.2b … 4.2.16 plus the proxy guard fix. Scope:
  - the sanitiser;
  - staff catalogue CRUD and staff uploads;
  - public catalogue and search reads;
  - website proxy, zones, header, list parsing and hire redirect;
  - mobile catalogue screens.
- Checks run:
  - the four catalogue/sanitiser test files: 100 tests passed;
  - a sanitiser payload probe;
  - an in-process API probe (scratchpad vitest config);
  - GET-only probes of the running web on :3100;
  - `pnpm audit --prod`.
- No product code changed; `pnpm local` untouched; nothing committed.
- **Verdict: PASS with conditions — merge ALLOWED.** 0 Critical, 0 High, 0 Medium, 4 Low (SEC-76 … SEC-79), 8 Info (I-44 … I-51). No finding blocks the merge.

## Files created/changed
- `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md` (new, the review)
- `docs/handoffs/2026-10-04-security-reviewer-to-orchestrator-4-2-17-security-review-slice-03.md` (this file)

## What the next agent must do
- **orchestrator:** tick 4.2.17 (security) and record SEC-76 … SEC-79 and I-44 … I-51 in the STATUS follow-ups.
- **backend-engineer (next pass):**
  - SEC-76: refuse out-of-range `minPrice`/`maxPrice` instead of answering 500, plus a test.
  - SEC-77: upgrade sanitize-html to a release that fixes GHSA-jxwj-j7wr-gfrw and GHSA-g8qq-57p8-ggw5, and add both payloads to `rich-text.test.ts`.
  - I-44: add `category_image` to the unattached-image cleanup.
  - Then SEC-79 together with SEC-73/SEC-74.
- **solution-architect:** a `maximum` on `searchGigs` `minPrice`/`maxPrice` (SEC-76); a `maxLength` on category SEO HTML and a `maximum` on `position` (I-45).
- **web-engineer:** SEC-78 `data-clarity-mask="true"` on the header account area (ADR-019 §5), before Phase 6; I-48 admin CSP (Phase 6).
- **devops-engineer:** I-46 `statement_timeout` and a load check with imported data (Phase 6).

## Open questions / risks
- The local API on :3000 runs an older build (`/search/gigs` 404, `/home` and `/sellers` 500), so the API probes ran in-process against the branch code. Restart `pnpm local` before the Owner's click-through.
- I-46 (capping keyword words) and I-50 (`noindex` for single-user hire pages) would change spec 03 behaviour. They are Owner questions, not security fixes.
