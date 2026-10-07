## What I did
Finished **4.3.11d**, which completes **4.3.11, the web gig page** `/service/{slug}`, ready for QA. Earlier parts:
- 4.3.11a frame: 301 / 404, SEO, notices, header, purchase box
- 4.3.11b gallery and lightbox
- 4.3.11c tabs and "You may also like"

Their handoffs are `2026-10-07-web-engineer-to-web-4-3-11a…c-*.md`.

4.3.11d adds the purchase box's **Actions** row for everyone (spec 04 AC-30, AC-35, AC-37; screen 02; legacy `ServiceComponent.php:212-303`, `:444-525`):
- **Share**: the profile `ShareButton`, now with an optional `dialogTitle` (here "Share this gig"). It offers Facebook, X, LinkedIn, WhatsApp and Copy link → "Copied".
- **Report** opens the "Report this gig" dialog:
  - guest: `t_pls_login_or_register_to_report_this_gig` + Login (`?next=` this page)
  - owner: `t_gig_owner_cant_report_his_gig`
  - already reported (`viewer.hasReported`, a 409, or a second opening after sending): `t_looks_like_alrdy_reported_this_gig`
  - everyone else: the Reason form (legacy placeholder, max 500, pre-check required / at least 6), then `createGigReport` with the trimmed text, then `t_gig_reported_successfully`. A 401 meanwhile switches to the login message. Other API errors (403 restricted, 404, 429) show the API's localized message.
- **Favourite** (not shown to the owner, who has "Edit gig" there): a heart button "Add to favorite" / "Remove from favorite" that calls `putFavorite` / `deleteFavorite`. The legacy messages appear in a status line. A guest gets the login message + link, and no call is made.
- The gig page is in `e2e/screens.ts` as `gig`: visual baselines (light/dark × desktop/phone), the contrast check and the reduced-motion check.

## Files created/changed
- `apps/web/src/components/gig-page/actions.tsx` (new), `gig-page.css`, `app/[locale]/(public)/service/[slug]/page.tsx`
- `apps/web/src/components/profile/client.tsx` (`ShareButton` `dialogTitle`)
- `apps/web/e2e/fake-gigs.mjs` (`viewer-token` has saved and reported gig 2), `gig-page.spec.ts` (+4 tests, axe on both dialogs), `screens.ts` (+`gig`), `visual-screens.spec.ts-snapshots/gig-*.png` (4 new)
- No new translation keys

## What the next agent must do
- **QA (web)**: parity check of the whole gig page against the live site and screen 02:
  - `/service/{slug}`: 301 from old / different-case slugs, 404 rules, SEO and hreflang
  - notices, gallery + lightbox, purchase box, tabs / phone sections, related gigs, the Actions row
  - run against the real API (`pnpm local`) at least once: every e2e test so far used the stand-in API
- **4.3.12** (next micro-task): my gigs + analytics + favourites pages; the gig page calls `recordGigView` once after render.
- Slices 5 / 7: "Add to cart" (+ mobile StickyActionBar) and "Contact seller" in the purchase box; the review list in the Reviews tab.

## Open questions / risks
- Q-142 (display of a migrated gig without a revisions value) is built per its recommendation, "Number of revisions not specified"; the Owner may confirm.
- Not yet run against the real API.
- The Next server logs "The destination stream closed early" during the gig page tests, when a test leaves a page that is still streaming (redirect / 404 / quick navigations). No test fails because of it.
- Tests: web e2e chromium 184 passed / 3 skipped. 2 unrelated timing flakes (`dashboard.spec.ts`, `social.spec.ts`) passed when rerun alone. Visual 84/84. The gig page spec passed 48/48 over 3 repeats.
