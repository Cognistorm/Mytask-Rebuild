## What I did
ROADMAP 4.2.19 for slice 2 (spec 03 Categories and search, branch `feat/catalog-search`).

The Owner's rule of 2026-10-02 says nothing is pushed and no PR is opened until Phase 4 is complete. So the branch stays local, and the GitHub CI was run here instead, step by step as `.github/workflows/ci.yml` runs it (2026-10-06, at `0398f2ee`):

| CI step | Result |
|---|---|
| contract `verify:final` (Redocly lint, bundle, contract + coverage) | PASS (715/715, 0 errors); committed bundle equals the sources |
| `pnpm gen:check` (generated types/client match the contract) | PASS |
| tokens build, no diff in `packages/tokens/dist` | PASS |
| `pnpm i18n:check` | PASS (en 3041 / ka 3047 keys) |
| `pnpm format:check` | PASS |
| `turbo run lint typecheck test --force` | 25/25 (API 615 passed, 6 skipped) |
| `pnpm build` | 4/4 |
| `pnpm test:e2e` | web 138 passed + 3 skipped; admin 16 passed + 6 skipped (full-stack ones) |
| Full-stack admin E2E on the real stack (throw-away DB) | 22/22, incl. `catalog-main-flow` and `profiles-main-flow` (web dev started with `--hostname localhost`, see BUG-01 below) |
| `expo export` (iOS + Android) | PASS |
| gitleaks, oasdiff, Docker / Caddy job | not run here (no Docker, tools only in CI); the first run is after the push |

Reviews:
- QA `docs/06-qa/reports/03-categories-search-2026-10-05.md`: **PASS with notes** (§15, after the 4.2.18 fixes).
- Security review 08 `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md`: **PASS with conditions, merge allowed**. SEC-76, SEC-77, SEC-78 and I-44 are fixed in 4.2.18.

## PR text (ready to paste)
**Title:** `feat: slice 2 — categories and search (spec 03)`

**Body:**

Slice 2 of Phase 4: spec 03 Categories and search, plus the staff catalogue of spec 16 (AC-60, AC-61). Contract 1.3.2, no contract change in this slice.

**API**
- Public reads:
  - gig category tree (60 s cache) and category pages at 3 levels (breadcrumb, Georgian fallback);
  - project categories and skills;
  - `searchGigs`: every keyword word, filters with the P-27 rules, Premium group first, Recommended = daily mix;
  - `listGigs`, `getHome`, `/sellers`, `/hire/{keyword}`, `searchProjects` (empty until slice 9).
- `SearchIndex` for slice 3. A single `PremiumStatus` seam replaces every hard-coded Premium value.
- Staff CRUD for gig categories (ka/en, SEO texts through the one allow-list sanitiser, icon/image, old slugs), project categories and skills; audited.
- Data model: categories, project categories, skills, slug redirects, gig core table, search documents. The local seed holds the live category tree.

**Web**
- Public header and footer: category bar with a keyboard mega-menu, phone search and drawer.
- Category pages, search, `/sellers`, `/hire`, explore projects, the real home page, the profile gigs block.
- Legacy URL parameters, canonical and hreflang.

**Admin**
- Category tree, project categories, skills.

**App**
- Home and Explore tabs, filter and sort sheets, categories, sellers, hire, explore projects.
- Guests may browse (Owner Q-167).

**Fixes from QA/security (4.2.18)**
- `/hire` slug ignores case, as legacy did.
- An out-of-range price filter answers 400, not 500.
- sanitize-html 2.17.7.
- Abandoned category images are cleaned up.
- Home shortcut tiles, `/sellers` title, account area masked for session recording.
- Featured categories ON (Q-168).

**Tests**
- API 615, web E2E 138, admin E2E 22 on the full stack, 10 QA probes.

**Known and accepted**
- BUG-01: under `pnpm local` the Georgian website pages loop. Deferred by the Owner (DEV-S1); testing moves to a staging subdomain.
- Later security items, as review 08 planned: SEC-79 (with SEC-73/74), the contract maxima (SEC-76/I-45), I-46 and I-48 for Phase 6.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Files created/changed
- This file, which holds the PR text above.
- `docs/ROADMAP.md`: 4.2.19 ticked.
- `docs/STATUS.md`: log lines and the next task.

## What the next agent must do
- **When Phase 4 is complete** (or earlier, if the Owner lifts the rule):
  1. `git push -u origin feat/catalog-search`.
  2. Open the PR with the text above.
  3. Check CI.
- **Branch order:** `feat/catalog-search` was cut from `feat/profiles` (53 commits of its own; 142 ahead of `main`), and `feat/profiles` sits on `feat/adr-019-followups`. Merge them in that order, or open one PR from `feat/catalog-search`, which contains all of them.
- **Next task: 4.2.20, the Owner click-through.** Checklist: `docs/06-qa/plans/03-categories-search-owner-click-through.md`.

## Open questions / risks
- **BUG-01 affects the click-through:** under a plain `pnpm local`, the Georgian website pages loop ("too many redirects"). English `/en/...` pages, the admin and the app work. The Owner chose to defer it; the click-through checklist explains the options.
- Owner decisions still open: DEV-M1, Q-160, Q-163, Q-164.
