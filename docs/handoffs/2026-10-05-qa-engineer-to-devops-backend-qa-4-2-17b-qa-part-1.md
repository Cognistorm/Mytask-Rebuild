# Handoff: qa-engineer → devops-engineer, backend-engineer, qa (part 2) — 4.2.17b QA part 1, slice 2

## What I did
- Wrote the test plan `docs/06-qa/plans/03-categories-and-search.md`: spec 03 AC → test case → evidence, rules, edge cases, wrong roles, stack checks and the layer-B list.
- Ran every suite, forced: lint + typecheck + test 25/25 (API 608 passed / 6 skipped), contract drift, i18n, format, web E2E 138/3 skipped (production build), `expo export` (iOS 1307 / Android 1460 modules).
- Ran the 10 QA probes `apps/api/test/qa-slice03.test.ts` (written in the earlier 4.2.17 session, not committed until now): 10/10 PASS.
- Started `pnpm local` on a throw-away DB in the session scratchpad and ran admin E2E incl. both full-stack flows, plus 28 stack checks.
- Report part 1: `docs/06-qa/reports/03-categories-search-2026-10-05.md` §1–§6.
- **Interim result: 1 major bug (BUG-01), 1 minor parity finding (F-01), 3 notes.**

## Files created/changed
- `docs/06-qa/plans/03-categories-and-search.md` (new)
- `docs/06-qa/reports/03-categories-search-2026-10-05.md` (new, part 1)
- `apps/api/test/qa-slice03.test.ts` (new QA probes)
- `docs/ROADMAP.md` (4.2.17 split into a/b/c; a and b ticked), `docs/STATUS.md`
- This handoff

## What the next agent must do
- **devops-engineer (4.2.18), BUG-01 major:**
  - Problem: since b1051723 (SEC-71) `apps/web` `dev` runs `next dev --hostname 127.0.0.1`. Under `pnpm local` every unprefixed (Georgian) website page then answers 301 to itself, and the browser shows `ERR_TOO_MANY_REDIRECTS`.
  - Cause: Next.js dev proxies the `/x` → `/ka/x` rewrite as an external URL, and the proxied `/ka` hits the "`/ka` → `/`" 301.
  - Fix it while keeping loopback-only (SEC-71). `--hostname localhost` gave 200 and listens on `::1` only, but then `127.0.0.1` does not answer, so check that against the SSR visitor-IP logic before choosing it.
  - Add a check that would fail on this.
- **backend-engineer (4.2.18), F-01 minor (or the Owner accepts it):** make the `/hire/{keyword}` exact-slug check case-insensitive, like legacy MySQL `utf8mb4_unicode_ci`. Plus the security items from review 08 (SEC-76, SEC-77, I-44).
- **qa-engineer (4.2.17c):**
  - Screen parity, i18n, cross-client and mobile on a phone, then the verdict.
  - Until BUG-01 is fixed, run the website as in report §Environment, run 2: `local.mjs --infra-only` + `turbo run dev` for API/admin with the `.env` + the web dev server without `--hostname`. Or use the production build.
  - Retry F-01 on the live site with a real skill slug.

## Open questions / risks
- **The Owner's own `pnpm local` website is affected right now:** the Georgian pages will not open until BUG-01 is fixed. English pages (`/en`) and the admin work.
- N-1: `getWebCustomCode` has no API route until 4.15.14, so every public page load logs a contract-violation 500 once a minute (harmless; the website falls back to "no custom code").
- Filled gig lists can only be seen on the real stack from slice 3 on.
