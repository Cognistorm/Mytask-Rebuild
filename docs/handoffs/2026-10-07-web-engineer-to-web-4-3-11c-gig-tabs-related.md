## What I did
Built **4.3.11c** on the gig page (spec 04 AC-26, AC-32, EC-13; screen 02; components.md §6.6, §7.13):
- New shared `Tabs` in `@mytask/ui/web`:
  - WAI-ARIA tablist with matching `{id}-tab` / `{id}-panel` ids
  - Arrow, Home and End keys with automatic activation, optional count badge
  - `stack` mode for the gig page: below lg the tab bar is hidden and every panel shows with its h2. At lg the h2 is visually hidden and the inactive panels are `display: none`. The switch is pure CSS, so the server HTML fits every width without a layout shift.
- New shared `Accordion`: buttons with `aria-expanded` / `aria-controls`, several rows may be open, the caret turns (no transition under reduced motion).
- `Carousel` gains `size="card"`: 80% per view on phones, 2 from md, 4 from lg.
- Gig page tabs, labelled "Gig details" (NEW `t_ui_gig_details`):
  - Description
  - FAQ: only when there are FAQs, as an Accordion; answers keep their line breaks
  - Reviews with the count badge: stars + average + `t_based_on_number_reviews`, or `t_no_reviews_yet`. The review list and the 5→1 breakdown wait for slice 7 (`listReviews`; `Gig.rating` has no star counts)
  - Documents: only when there are documents; name, size and a "Download" link (its `aria-label` adds the file name); the list is `data-nosnippet`, as in legacy
- "You may also like": `listRelatedGigs` is loaded on the server next to the page and shown as GigCards in the Carousel. It is hidden when the list is empty or the call fails.

## Files created/changed
- `packages/ui/src/web/tabs.tsx`, `tabs.css` (new); `carousel.tsx`, `catalog.css` (card size); `index.ts`
- `apps/web/src/app/[locale]/(public)/service/[slug]/page.tsx`, `components/gig-page/data.ts` (`loadRelated`), `gig-page.css`
- `packages/i18n/en.json`, `ka.json`: `t_ui_gig_details`
- `apps/web/e2e/fake-gigs.mjs` (gig 1: 2 FAQs, 1 document, 3 related gigs; `/gigs/{id}/related` route), `gig-page.spec.ts` (+3 tests)

## What the next agent must do
- 4.3.11d: the Actions row for everyone (Share dialog, Report dialog with `createGigReport`, favourite toggle with `putFavorite` / `deleteFavorite`); put the gig page into `e2e/screens.ts` (visual + contrast baselines).
- Slice 7: fill the Reviews panel (`listReviews?gigId=`, RatingSummary with the star breakdown once the API gives it).

## Open questions / risks
- The related list is random on every call (P-137), so it differs between page loads. Fine for the page, but the 4.3.11d visual baselines need fixed fake data (they have it).
- Tests: web e2e chromium 181 passed / 3 skipped (1 timing flake in `portfolio-edit.spec.ts`, passed when rerun alone); visual 75/75; the gig page spec passed 36/36 over 3 repeats.
