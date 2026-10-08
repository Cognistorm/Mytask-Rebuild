# 4.3.4 Gig reads: `getGig`, `lookupGig`, `getGigOwnerView`, `listMyGigs`

From: backend-engineer · To: backend-engineer (4.3.5–4.3.7), web-engineer (4.3.11/4.3.12), mobile-engineer (4.3.14/4.3.16), QA (info) · Date: 2026-10-07

## What I did
- **`GET /gigs/{gigId}` (`getGig`) and `GET /gigs/lookup?uid=` (`lookupGig`)**, new `GigPages` in `apps/api/src/modules/gigs/gig-pages.service.ts` (spec 04 AC-26…AC-30, AC-33, EC-8).
  - **Visibility (AC-28, P-29, contract `x-permission`).**
    - Guests and other users see only `active` gigs whose owner is listable (status `active`/`verified`, not deleted, not restricted; the same rule as `LISTABLE_OWNER` of the lists).
    - The owner also sees their `pending` and `rejected` gigs, and their own gigs while restricted.
    - `deleted` → 404 for everyone, the owner too. Staff read through `adminGetGig` (4.3.7).
    - The contract (owner sees rejected) wins over the spec 04 AC-28 wording ("rejected → 404 except staff").
  - **Texts (AC-27).** Title and description fall back to Georgian one field at a time (`catalog/localized.ts`). `contentLocale` is `ka` as soon as one shown field fell back. `hasEnglish` is true only when both English texts are non-empty (spec 17 AC-4). Category names use the same fallback.
  - **`lookupGig`.** The uid must be 20 hex characters (else 404) and is matched case-insensitively. The response carries the current `slug`; the web answers 301 when the URL slug differs (4.3.11).
  - **Seller (AC-29).**
    - `unavailableUntil` is shown only while in the future.
    - `isAcceptingOrders` is false while the seller is unavailable or restricted.
    - The seller's freelancer rating stays neutral (`count 0`, `null`) until slice 6, as on profiles.
  - **Viewer (AC-30, AC-37).** `null` for guests. `isOwner`, plus `isFavorite` and `hasReported`, read from the real `favorites` and `reports` tables (nothing writes gig favourites or gig reports until 4.3.6).
  - **Documents** stay visible with S-080 OFF (EC-8).
  - `isFeatured` = the seller's Premium (PremiumStatus, false until slice 8). The gig `rating` comes from the stored counters. `ordersInQueueCount` is the stored counter (0 until slice 5).
  - A GET never counts a visit (`recordGigView`, 4.3.5).
- **`GET /gigs/{gigId}/owner-view` (`getGigOwnerView`)** = `GigsService.getOwnerView` (the existing `ownGig` + `ownerView`). Another user's or a deleted gig → 404; the rejection reason only while rejected.
- **`GET /gigs/mine` (`listMyGigs`, AC-20)**, `GigPages.listMine`.
  - The caller's non-deleted gigs, newest first (`createdAt`, `id` desc), with the keyset cursor of `platform/pagination.ts`. Default page 20.
  - `status` filter: one value or several (`?status=active&status=pending`).
  - Title with the Georgian fallback, thumbnail variants, price, status, rejection reason only while `rejected`, orders in queue.
- **Shared helpers.** `gigDocument()` and `money()` are now exported functions of `gigs.service.ts` (they were private there), plus `FULL`, `FullGig` and `notFound`.
- **Routes.** `mine` and `lookup` are declared before `:gigId` in `gigs.controllers.ts`.
- **Tests.** New `test/gigs-read.test.ts` (12): the page with fallback, categories, upgrades, FAQs, documents with S-080 OFF, seller; per-field fallback; seller unavailable; viewer facts; pending/rejected for the owner only; restricted and banned owners; deleted and unknown ids; lookup in any case + bad uid; lookup visibility; owner view (owner, other user, guest 401, deleted); my gigs (order, deleted and other users' gigs left out, status filter single + multiple, cursor paging, empty list, 401).
  - API **708 passed / 6 skipped**. Typecheck, lint and prettier are green.

## Files created/changed
- `apps/api/src/modules/gigs/gig-pages.service.ts` (new)
- `apps/api/src/modules/gigs/gigs.service.ts` (`getOwnerView`, exported `FULL`, `FullGig`, `notFound`, `money`, `gigDocument`)
- `apps/api/src/modules/gigs/gigs.controllers.ts`, `gigs.module.ts` (imports `ProfilesModule` for `UserSummaries`)
- `apps/api/test/gigs-read.test.ts` (new)
- `docs/ROADMAP.md` (4.3.4 ticked), `docs/STATUS.md`

## What the next agent must do
**4.3.5 (backend): `listRelatedGigs`, `recordGigView`, `getGigAnalytics`** and the rest of the ROADMAP line (partition job, batched impressions from `searchGigs`, local GeoIP or null).
- `listRelatedGigs` must apply the viewed gig's visibility exactly as `getGig`. Reuse `GigPages` (for example, make its visibility check a small public method) rather than copying the rule.
- Related cards come from `GigCards.cards` (catalog).

**Web (4.3.11):** call `lookupGig` with the text after the last `-` of `/service/{slug}` and answer 301 when `slug` differs. Show `t_this_gig_not_activated_yet` when `status` is `pending`, and `t_content_shown_in_georgian` when `contentLocale` differs from the UI language.

## Open questions / risks
- None new. Still open: Q-181 (Owner), DEV-M1, Q-160, Q-163, Q-164 (none blocks slice 3).
- `viewer.isFavorite` on `getGig` is already real. `GigCard.isFavorite` in the lists becomes real in 4.3.6, as planned.
