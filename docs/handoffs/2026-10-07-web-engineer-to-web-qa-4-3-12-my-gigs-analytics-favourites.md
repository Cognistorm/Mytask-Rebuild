## What I did
Finished **4.3.12c**, which completes **4.3.12**: the web My gigs, gig analytics and favourites pages, plus visit recording on the gig page. Ready for QA.
- **4.3.12a My gigs** `/seller/gigs` (spec 04 AC-20, AC-24):
  - a table on desktop, cards on phones: gig, price, orders in queue, status (Active / Pending / legacy "Needs changes" + "Rejection reason: …")
  - options: View, Edit, Analytics, and Delete with the confirm (409 → "has orders in queue", the row stays)
  - Load more, the empty state with "Create a new gig"
  - legacy `/seller/gigs/edit|analytics/{uid}` → 301
- **4.3.12b Analytics** `/seller/gigs/{uid}/analytics` (spec 04 AC-39):
  - owner only; anyone else, or an unknown gig, gets "Page not found"
  - KPI tiles (sales, clicks, impressions, reviews)
  - six bar lists (devices, browsers, OS, referrers, countries in the page language, cities), with the value printed on every row
  - the DB-IP credit, and the recent orders table (empty until slice 5)
  - new shared `BarList` in `@mytask/ui/web`
- **4.3.12c Favourites** `/account/favorite` (spec 04 AC-35, AC-36):
  - 42 per page with Load more; columns gig (to its page), seller (to the profile), starting price
  - "Remove from favorite" with the legacy confirm (a 404 also removes the row); the empty state
- **4.3.12c visit recording:** the gig page now calls `recordGigView` once after render (spec 04 AC-34), with `document.referrer` or null. It is never sent for the owner, and a failure is silent.
- **Test setup:** local e2e workers are capped at 4 in `apps/web/playwright.config.ts`. With the default 8, the single `next start` test server could not keep up (7 of 204 tests timed out). With 4 there were no failures in three runs, at half the time. CI is unchanged.

## Files created/changed
- My gigs: `apps/web/src/components/my-gigs/*`, `app/[locale]/(private)/seller/gigs/{page,layout}.tsx`, `seller/gigs/{edit,analytics}/[uid]/route.ts`, `e2e/my-gigs.spec.ts`
- Analytics: `apps/web/src/components/gig-analytics/*`, `app/[locale]/(private)/seller/gigs/[uid]/analytics/*`, `packages/ui/src/web/bars.{tsx,css}`, `e2e/gig-analytics.spec.ts`
- Favourites + visits: `apps/web/src/components/favorites/favorites.tsx`, `app/[locale]/(private)/account/favorite/*`, `components/gig-page/record-view.tsx`, gig page `page.tsx`, `e2e/favorites.spec.ts`, `e2e/gig-page.spec.ts` (+2)
- `packages/i18n` en/ka: 5 NEW keys in 4.3.12b (`t_ui_device_desktop|mobile|tablet`, `t_ui_most_visits_by_countries`, `t_ui_dbip_credit`); none in a or c
- `apps/web/playwright.config.ts` (workers)

## What the next agent must do
- **QA (web):** parity of the three pages against the live site (`/seller/gigs`, `/seller/gigs/analytics/{uid}`, `/account/favorite`). Run at least once against the real API (`pnpm local`), above all to see real analytics after a few gig page visits (local GeoIP file needed: `pnpm --filter @mytask/api geoip:download`).
- **Next micro-task 4.3.13:** admin gig moderation queue.
- Slice 5: recent orders in Analytics and the orders-in-queue numbers come alive.

## Open questions / risks
- **Deviations to approve (Owner):**
  - My gigs has no rating / sales / clicks / impressions columns: the contract's list item does not carry them, and they are on the Analytics page.
  - Analytics shows bar lists instead of the legacy pies and visitors map.
  - Favourites has no "date" column: `GigCard` has no saved date.
- Country names come from the browser (`Intl.DisplayNames`). The Playwright test browser has no Georgian region names; desktop browsers do.
- Not yet run against the real API.
