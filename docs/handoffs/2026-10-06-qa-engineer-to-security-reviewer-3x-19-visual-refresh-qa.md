## What I did
- I wrote the 3X QA report `docs/06-qa/reports/3x-visual-refresh-2026-10-06.md`. Verdict: **PASS with notes**.
- I built a structure-parity check that compares the pre-3X build (`../mt-pre3x`, `main` 61c4e777) with the 3X build. It covers 18 screens at 1280 and 360 px, with the same stand-in API for both.
  - Accessibility tree: identical, except the Owner's 3X.10a change (the bar's category name became a link).
  - Elements: the same set on every screen; no test id gone; 0 reading-order flips.
- I re-ran every suite: all green.
- Accessibility checks:
  - Focus is visible on every keyboard stop (5 screens, light and dark).
  - The two 3X.18b "look in a real browser" items are capture artefacts.
  - The signed-in header over the hero is fine.
- I reviewed web ↔ app consistency in the code.

## Files created/changed
- `docs/06-qa/reports/3x-visual-refresh-2026-10-06.md` (new)
- `apps/web/e2e/qa/structure-parity.qa.ts`, `apps/web/playwright.parity.config.ts` (new; QA tool, not part of `test:e2e`; how to run it is in the script header)
- `docs/ROADMAP.md` (3X.18 and 3X.19 ticked), `docs/STATUS.md`

## What the next agent must do
- **3X.20 (security-reviewer):** run the short check:
  - the admin colour input: strict `#RRGGBB`, checked by the API and the DB check constraint;
  - no CSS injection through `categoryThemeProps` / `--mt-cat-*` inline variables on web and admin;
  - CSP unchanged;
  - the audit entry for colour changes.
- **3X.21:** fix the findings listed below, then re-run `structure-parity.qa.ts` (it needs the pre-3X worktree build on 3101, the 3X build on 3100 and `fake-api.mjs` on 3199).
  - **F-3X19-1:** take the 1 px border out of `.mt-chip`'s inline padding, so skill chips stop wrapping onto a second row. The Designer decides about the explore "Popular" chips on phone.
  - **F-3X19-2:** cap the app's M-15 and M-14 fades at 120 ms under Reduce Motion (`apps/mobile/src/ui/motion.ts`, `apps/mobile/src/ui/card.tsx`).
  - **F-3X18-1:** needs the Owner/Designer choice first.

## Open questions / risks
- Q-179 (switcher thumb colour) is still open for the Owner.
- The logo's dark "MY" on the teal hero is hard to see. This is unchanged from before 3X; the Owner can judge it in 3X.23.
- The app has not been run on a device. That happens through the Owner's device check list in 3X.23.
