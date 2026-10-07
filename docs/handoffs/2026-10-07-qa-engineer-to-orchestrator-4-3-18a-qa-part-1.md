# Handoff: QA engineer → orchestrator (and web / mobile / backend for 4.3.20), 4.3.18a QA part 1 of slice 3 (Gigs)

## What I did
- **Test plan** `docs/06-qa/plans/04-gigs.md`. It maps each spec 04 AC, R-G rule and EC, and spec 16 AC-20, to its test case and evidence (API test, QA probe, web / admin E2E, stack check, or part 2 / later slice).
- **Ran every automated suite**, forced with no cache. A production build was used for the web and admin E2E.
  - Lint: PASS.
  - Typecheck: **FAIL in `@mytask/api` (BUG-01)**.
  - API tests: 772 passed, 6 skipped (incl. 18 new QA probes); api-client 10/10.
  - `gen:check`: PASS (contract 1.5.0).
  - `verify:final`: PASS (719 ACs, 0 errors).
  - i18n: PASS (en 3143 / ka 3149).
  - `format:check`: **FAIL (BUG-02)**.
  - Web E2E: 285 passed, 3 skipped.
  - Admin E2E: 77 passed, 7 skipped.
  - `expo export`: iOS 1704 / Android 1812 modules.
- **New QA probes** `apps/api/test/qa-slice04.test.ts` (18, all pass). They cover:
  - wrong role on all 6 staff gig operations;
  - strangers on all 10 page, owner and action operations;
  - staff removal seen from the owner and buyers, and restore with pending + rejected gigs in the limit;
  - the plan limit, including S-001 = null (unlimited);
  - fields the client may not set (mass assignment);
  - other users' files on edit and delete;
  - boundary values;
  - sanitising through `getGig`;
  - report reason boundaries and hidden gigs.
- **Full stack on a throw-away database** (`LOCAL_PGLITE_DIR` in the scratchpad; the Owner's `.pglite` was not touched):
  - profiles, catalogue and gigs main flows: **3/3 PASS**;
  - my own stack checks: **41/41 PASS**. They include real uploads through storage and the worker, wrong type / size / fake PNG refused, public image variants and documents served, anonymous bucket listing 403, staff publish / remove / restore through the admin API, and EV-20 / EV-130 in Mailpit.
  - The seed password was never printed.
  - The stack is **fully stopped**. Every process the run started was ended by PID; no listener is left on 3000/3100/3200/4100/5432/6379/8025/1025/8333/8888/9333, and none were running before.
- **Report part 1** `docs/06-qa/reports/04-gigs-2026-10-07.md` (§1–§6). Interim result: **2 major bugs (BUG-01, BUG-03), 1 minor (BUG-02), 6 notes.**

## Files created/changed
- `docs/06-qa/plans/04-gigs.md` (new)
- `docs/06-qa/reports/04-gigs-2026-10-07.md` (new, part 1)
- `apps/api/test/qa-slice04.test.ts` (new, 18 probes)
- `docs/ROADMAP.md` (4.3.18 split into a/b, kept from the orchestrator; 4.3.18a ticked), `docs/STATUS.md`
- This handoff

## What the next agent must do
- **4.3.18b (QA part 2):** follow §6 of the report.
  - Screen parity vs the live site and `/legacy/`.
  - i18n of the slice's new keys.
  - Notifications in Mailpit (EV-19 needs an S-100 address).
  - Cross-client web ↔ app, and the verdict.
- **4.3.20 fixes** (from part 1; part 2 may add more):
  - **BUG-01 (major), web engineer + backend:** `apps/api/test/content-language.test.ts` imports the TypeScript entry of `@mytask/i18n` (ESM). The API's Node16 CommonJS typecheck refuses it, so `pnpm typecheck` fails and CI would be red (since 4.3.9 `90d93305`). Make the parity test type-check under the API settings, then run `pnpm typecheck` at the root.
  - **BUG-02 (minor), web engineer:** `pnpm prettier --write apps/admin/e2e/sidebar.spec.ts` (CI `format:check`).
  - **BUG-03 (major), web + mobile engineers:** add the favourite heart to gig cards (spec 04 AC-35 "gig page or a gig card"). These are `@mytask/ui/web` `GigCard` and its lists, and the app `GigCardView`.
    - Legacy is `cards/gig.blade.php:78-107`; the design is `components.md` §IconButton `overlay` and §card.
    - Use `GigCard.isFavorite` (`null` = guest → the login message), `putFavorite` / `deleteFavorite`, and the existing keys.
    - Do not show it on the viewer's own gigs (R-G10).
    - No contract or key change is needed.
- **Orchestrator:** consider adding "root `pnpm typecheck` + `pnpm format:check`" to every engineer's handoff checklist (N-6).

## Open questions / risks
- No new question for `open-questions.md`. BUG-03 follows the approved spec. If the Owner does **not** want hearts on cards, that would be a spec change and needs an Owner decision.
- N-1: slug redirects answer 308, not the 301 the specs name (known since 4.1.17; both are permanent). The Owner may confirm once for all slug redirects.
- N-5 for the security review (4.3.19): unknown body properties are accepted and ignored (no mass assignment found).
- The app screens (4.3.14–4.3.16) have still never run on a device. Part 2 covers them from source; the device steps (SETUP-LOCAL §4 19–20) need the Owner's phone or the click-through.
