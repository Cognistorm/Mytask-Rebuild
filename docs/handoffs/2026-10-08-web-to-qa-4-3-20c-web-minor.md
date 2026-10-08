# Handoff — web → QA: 4.3.20c web minor fixes (slice 04 report BUG-04, BUG-05, BUG-06, N-14)

## What I did
- **BUG-04** (gig page, 390 px): the "You may also like" heading now uses the same band as the carousel's ‹ › buttons (min height 44 px, centred) and keeps `space-24` (96 px) free at its end, as the Home rows do. A long title wraps beside the buttons instead of running under them. The gap between heading and cards went from `space-6` to `space-1`, so the buttons (48 px above the list, `catalog.css`) line up with the heading.
- **N-14** (My gigs, phones): the "Gig" cell (thumbnail + title) fills the rest of the phone card row (`flex: 1 1 0` below 768 px), so the thumbnail always sits in the same place, whatever the title length.
- **BUG-05** (dashboard role switcher): the current side's link is now `localePath(pathname, locale)` instead of the raw `usePathname()`. A rewritten `/ka/…` pathname on the server becomes `/…`; `/en/…` is unchanged.
  - **Could not reproduce on this machine.** The old code gave no `/ka/` href in the server HTML on the production build or on `next dev`, for a guest or signed in (`owner-token`). QA saw it on the full stack (`pnpm local`). The fix holds whatever `usePathname()` returns. Please re-check on `pnpm local`.
- **BUG-06** (gig page): every tab `content` element passed from the server page to `Tabs` has a `key` (its tab id). On `next dev`, the "Each child in a list should have a unique key … Tabs … GigPage" warning shows on the old code and is gone with the fix.
- **F-02** not done: it waits for the Owner's text choice. Moved to the new task **4.3.20d** (`[!]`).

## Files created/changed
- `apps/web/src/components/gig-page/gig-page.css` (BUG-04)
- `apps/web/src/components/my-gigs/my-gigs.css` (N-14)
- `apps/web/src/components/dashboard/shell.tsx` (BUG-05)
- `apps/web/src/app/[locale]/(public)/service/[slug]/page.tsx` (BUG-06)
- Tests:
  - `apps/web/e2e/gig-page.spec.ts`: heading text ends before the buttons at 390 px, and the buttons sit in the heading's band.
  - `apps/web/e2e/my-gigs.spec.ts`: thumbnail x is the same on 3 rows at 390 px.
  - `apps/web/e2e/dashboard.spec.ts`: no `/ka` href in the server HTML; the switcher href is right; no hydration error in the console.
  - The BUG-04 and N-14 tests fail on the old code. The BUG-05 test passes on the old code too, because the bug does not reproduce here, so it only guards against a return.
- Visual baselines renewed (production build): `gig-{light,dark}-{desktop,phone}-visual-win32.png`.
- `docs/ROADMAP.md`, `docs/STATUS.md`.

No new translation keys, no contract change, no mobile change.

## Checks
- Root `format:check`, `typecheck`, `lint`: PASS.
- Web E2E on the production build: 291 passed, 3 skipped.

## What the next agent must do
- **QA:** re-check BUG-04, N-14 and BUG-06 in the browser at 390 px and in the dev console. Re-check BUG-05 on `pnpm local`, where it was first seen.
- **Orchestrator:** next is 4.3.24. 4.3.20d waits for the Owner.

## Open questions / risks
- **F-02** (Owner): gallery hint text. Either (a) add only a full stop between the two texts, or (b) add a NEW hint key (en + ka).
- **N-15 (new, note, not fixed):** on `next dev`, every public page logs a React hydration message for the custom-code `<div data-custom-code="head|footer">`. The server HTML has `<script nonce="…">`, but the browser hides nonce values, so React reads `nonce=""`. It is dev only and has no visible effect, because the scripts already ran. Proposal: a small fix later, e.g. `suppressHydrationWarning` on those two divs, or rendering the custom code outside React's comparison.
