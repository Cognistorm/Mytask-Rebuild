# 4.3.5c Gig analytics, impressions and the analytics partitions

From: backend-engineer · To: backend-engineer (4.3.6, slice 5/6), web-engineer (4.3.12), mobile-engineer (4.3.16), QA (parity), devops (info) · Date: 2026-10-07

## What I did
- **`GET /gigs/{gigId}/analytics` (`getGigAnalytics`, spec 04 AC-39)**, `GigAnalytics` in `apps/api/src/modules/gigs/gig-analytics.service.ts`.
  - **Who.** Owner only. Another user, a deleted gig or an unknown id → 404. Guests → 401.
  - **Totals** (all-time counters of the gig):
    - `clickCount` = `visits_count`: counted visits, once per visitor per day (4.3.5b, Q-182).
    - `impressionCount` = `impressions_count`: appearances in search lists (below).
    - `salesCount` = `sales_count` and `reviewCount` = `rating_count`. Both are 0 until slices 5 and 6 write them.
  - **Breakdowns.** `analytics_daily` rows of metric `gig_view` for this gig, summed over all days. Most frequent first, ties by label.
    - `devices`, `browsers`, `operatingSystems` and `countries` are complete lists. `referrers` and `cities` are the top 10, as legacy showed them (`Seller/Gigs/Options/AnalyticsComponent.php`).
    - Labels as stored by 4.3.5b: `desktop`/`mobile`/`tablet`; browser and OS names; `unknown`; referrer domain; ISO country code; English city name.
  - **`recentOrders`** is `[]` until orders exist (slice 5; 4.3.1 handoff §D).
- **Impressions** (`apps/api/src/modules/catalog/gig-impressions.ts`, `GigImpressions`). The contract says every card of a `searchGigs` page counts as an impression.
  - **Counting.** `searchGigs` passes the page's card ids and the visitor's user agent (`ClientIpResolver`, so SSR calls use the visitor's user agent). Bots and requests without a user agent are not counted. The counts are kept in memory; nothing is written per card on the request path.
  - **Writing.** Every 10 s, or at once at 5,000 waiting gig/day pairs, one transaction writes:
    - `gigs.impressions_count` + n, in raw SQL so `updated_at` does not move;
    - the `analytics_daily` row with metric `gig_impression`, dimension `total`, per Tbilisi day (for later charts and the admin dashboard).
  - **Failures.** A failed batch is merged back and retried with the next one. A clean shutdown writes what is left. Each API process counts on its own, and the counts add up.
  - Only `searchGigs` counts (search and category pages), as the contract says. Profile lists, home rows and "You may also like" do not.
- **Worker job `analytics-partitions`** (`apps/api/src/worker/analytics-partitions.sweeper.ts`). Runs at worker start, then every 6 hours. Running it twice is harmless.
  - Makes sure this month and next month have their own `analytics_events_YYYY_MM` partition (UTC months). Rows of that month already in the DEFAULT partition are moved into it in the same transaction; Postgres refuses to attach the range otherwise.
  - Drops month partitions that ended more than 90 days ago, and deletes DEFAULT rows older than 90 days (ADR-012 §3). `analytics_daily` is kept.
- **Tests.** New `apps/api/test/gigs-analytics.test.ts` (4). They cover:
  - impressions from search: two counted, Googlebot and an empty user agent not counted, nothing written before the flush, `updated_at` unchanged, a second batch adds to the same day row;
  - analytics totals and breakdowns summed over two days, with ordering and the top-10 limits;
  - an empty new gig; 404 for other users, unknown and deleted gigs; 401 for guests;
  - the partition job: creates months, moves a DEFAULT row into its month, drops 2020 partitions and an old DEFAULT row, routes new rows directly, and a second pass does nothing.
  - Results: API **726 passed / 6 skipped**. Typecheck, lint and prettier are green.

## Files created/changed
- `apps/api/src/modules/gigs/gig-analytics.service.ts` (new), `gigs.controllers.ts`, `gigs.module.ts`
- `apps/api/src/modules/catalog/gig-impressions.ts` (new), `catalog.controllers.ts` (searchGigs counts), `catalog.module.ts`
- `apps/api/src/worker/analytics-partitions.sweeper.ts` (new), `apps/api/src/worker.module.ts`
- `apps/api/test/gigs-analytics.test.ts` (new)
- `docs/ROADMAP.md` (4.3.5c and 4.3.5 ticked), `docs/STATUS.md`

## What the next agent must do
- **4.3.6 (backend):** `listFavorites`, `putFavorite`, `deleteFavorite`, `createGigReport` (EV-22, SEC-23). `GigCard.isFavorite` becomes real in `catalog/gig-cards.ts`.
- **Web (4.3.12): the analytics screen.**
  - Show the four totals and the six lists. Translate the device labels and `unknown` with the existing keys, or add new ones (en + ka).
  - Countries arrive as ISO codes; show the country name in the UI language.
  - Show the DB-IP credit under the country/city lists (CC BY 4.0, see 4.3.5b).
  - Show an empty state for the recent orders until slice 5.
- **Slice 5 (orders):** fill `recentOrders` (20 newest order items of the gig, contract `GigAnalyticsOrder`) and keep `sales_count` current.
- **Slice 6 (reviews):** `reviewCount` follows `rating_count`. If hidden reviews ever count in `rating_count`, switch to a count of visible reviews (AC-39: "visible reviews").
- **QA (4.3.18), parity deviation to list:**
  - Legacy `counter_impressions` counted page re-visits by an already-counted visitor (`Jobs/Main/Service/Track.php`). The approved contract (`searchGigs`, `GigAnalytics.impressionCount`) defines impressions as appearances in search lists, so the numbers mean something else now.
  - Spec 02 AC-6 "total reach" (Selling Home) is the sum of these impressions.
  - Also listed: once per visitor per day for clicks (Q-182).
- **Devops:** the worker must run for the partitions to be kept. Without it, rows land in the DEFAULT partition and are never deleted after 90 days.

## Open questions / risks
- **Impressions are lost if an API process crashes.** At most about 10 seconds of counts per process. A clean shutdown writes them. Acceptable for a counter.
- **The ATTACH takes a short exclusive lock on `analytics_events`.** It happens twice a month, and the table is append-only, so the lock is momentary.
- No new Owner question. Still open: Q-181, DEV-M1, Q-160, Q-163, Q-164 (none blocks slice 3).
