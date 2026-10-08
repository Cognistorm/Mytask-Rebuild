# Handoff: QA engineer → orchestrator (and web for 4.3.20f, security for 4.3.20g), 4.3.20e re-check of the slice 3 fixes

## What I did
- Re-checked 4.3.20a–d, 4.3.24 and 4.3.25 against the list in report 04 §14. Independent session (wrote none of the fixes). Branch `feat/gigs` @ `b4aba456`.
- Suites:
  - `format:check` and turbo lint + typecheck + test (`--force`, 26/26) pass. API: 782 passed, 7 skipped.
  - gen, i18n and `verify:final` pass.
  - Admin E2E: 77 passed, 7 skipped.
  - `expo export`: iOS 1722 and Android 1812 modules.
  - Web E2E: 287 passed, 3 skipped, **4 failed**. The failures are the pixel baselines (BUG-07).
- Real stack on a throw-away DB (`LOCAL_PGLITE_DIR` in the scratchpad; the Owner's `.pglite` was not used):
  - Card hearts on the website: checked on all 6 lists (Home, category, search, "You may also like", 2 profiles). Guests get the login message with `?next=`. There is no heart on the viewer's own gigs. A toggle is saved and still shows after a reload.
  - BUG-04, BUG-05 and BUG-06 are gone.
  - EV-21 greets by the full name, in ka and en.
  - The F-02 and 4.3.25 hints show in ka and en.
  - 4.3.24: media URLs went 200 → 404 → 200.
  - SEC-80 (a) and (b) hold.
- Clean-up: deleted 20 sample files (55 objects) from the shared local storage, stopped every process, and left no listener.
- **Verdict: PASS with notes** (report §15). Slice 3 is done from QA.

## Files created/changed
- `docs/06-qa/reports/04-gigs-2026-10-07.md`: §15, plus the re-check line at the top.
- `docs/ROADMAP.md`: 4.3.20e ticked; 4.3.20f and 4.3.20g added.
- `docs/STATUS.md`
- This handoff.
- No product code changed. The QA scripts (`recheck/data.mjs`, `recheck/browser.mjs`) stay in the session scratchpad.

## What the next agent must do
- **4.3.20f (web), BUG-07:**
  - Run `pnpm --filter @mytask/web build`.
  - Then, in `apps/web`, run `npx playwright test e2e/visual-screens.spec.ts -g "gig-create|gig-edit" --update-snapshots=all`.
  - Look at the 4 new images. The only expected change is the hint text in Gallery, about 29 px taller.
  - Run the full web E2E until it is green.
- **4.3.20g (security):** re-check SEC-80 (a)+(b), SEC-82 and 4.3.24 (review 10 "before merge"). QA already saw SEC-80 hold on the stack (report §15.2).
- Then **4.3.21**: PR + STATUS.

## Open questions / risks
- The app hearts were checked from the source and the build only. The app has still never run on a device (report §12, SETUP-LOCAL §4 steps 19–20).
- N-10 (heart shown to guests, approved in the spec) should be seen in the Owner click-through.
- Optional, later: each gig card renders its own closed login `<dialog>`. One shared dialog per list would be lighter.
