# Handoff: mobile engineer → mobile QA, 4.3.16 My gigs + Favourites (app)

## What I did
The app now has the two lists the web got in 4.3.12a and 4.3.12c, with the same data, rules, texts and operations. Both follow the app's My portfolio screen (`app/seller/portfolio/index.tsx`): cards, compact Ghost buttons, a confirm bottom sheet, Load more, and a quiet re-read when the screen gets focus again.

### Selling → Gigs `/seller/gigs` (`app/seller/gigs/index.tsx`, also `mytask://seller/gigs`)
- **Access**: no stored session or 401 → login. `getMe` comes first, as the web dashboard shell does: it refreshes an expired token, and a restricted account → `/restricted` (spec 01 AC-19).
- **List**: `listMyGigs` (`GET /gigs/mine`), 20 per page as the web, newest first, Load more (rows already shown are not repeated).
- **Each card** shows:
  - the thumbnail (a blank 3:2 box when there is none) and the title. Tapping either opens the gig screen. The screen reader hears "title, status", and `accessibilityLanguage` is set when the gig has only Georgian text.
  - a status pill: Active (success), Pending (warning), "Needs changes" (danger, legacy label for `rejected`);
  - Price and Orders in queue;
  - for a rejected gig, "Rejection reason: …" (AC-18).
- **Options** (Ghost buttons, each named with the gig for screen readers):
  - View → the gig screen;
  - Edit → the app's editor `/seller/gigs/{uid}/edit` (4.3.15d);
  - Analytics → **the website's** `/seller/gigs/{uid}/analytics` in the browser. There is no app analytics screen in the ROADMAP; see the open questions.
  - Delete → bottom sheet "Delete gig" with `t_are_u_sure_u_want_to_delete_gig`, Cancel / Delete (danger, busy) → `deleteGig`. On success the row goes away and `t_gig_deleted_successfull` shows. A 409 shows `t_this_gig_has_orders_in_queue_delete` (AC-24) and the row stays. Other errors show the API message.
- "Create a new gig" (primary) at the top opens `/create`. Empty list → `t_no_gigs_yet`. A load failure shows an error with Try again.

### Buying → Favourites `/account/favorite` (`app/account/favorite.tsx`, also `mytask://account/favorite`)
- **Access**: the same as My gigs.
- **List**: `listFavorites`, 42 per page (AC-36), Load more, in saving order (newest first).
- **Each card** shows:
  - the thumbnail and title, plus "Starting at" with the price. Tapping opens the gig screen.
  - "Seller: username", which opens the profile.
- **Remove**: "Remove from favorite" (named with the gig) → bottom sheet with `t_are_u_sure_u_want_to_remove_from_favorite_list`, Cancel / Remove → `deleteFavorite`. On success the row goes away and `t_gig_removed_from_ur_favorite_list` shows. A 404 also drops the row: it was already removed, or the gig is no longer public (EC-11). Other errors show the API message.
- Empty list → `t_no_favorites_yet`. Coming back from a gig whose heart was cleared re-reads the list.

### Wiring
- **Dashboard navigation** (`lib/dashboard.ts`): Selling "Gigs" → `/seller/gigs` and Buying "Favorite list" → `/account/favorite` now show in the Dashboard tab's lists.
- **Dashboard tab, Selling Home**: "Create a new gig" (spec 02 AC-7) is now shown in the same three places as the web. These are under the welcome text, the empty latest orders and the empty awarded projects. It was hidden until the app had the wizard (4.3.15).
- **"My gigs" no longer opens the website**:
  - the wizard's success screen after a pending create or edit and the editor's "Page not found" now use `router.dismissTo('/seller/gigs')`. This goes back to the list when the screen was opened from it, and the list then re-reads.
  - `myGigsUrl` was removed from `lib/web-pages.ts`. It now has `gigAnalyticsUrl(uid)` instead.
  - `MY_GIGS` is exported from `components/gig-wizard/gig-wizard.tsx`, as `MY_PORTFOLIO` is.
- **i18n**: no new keys. All 30 keys used were checked in `ka.json` and `en.json`.

### Checks
- Mobile `typecheck`, `lint` and prettier are green.
- `expo export` built iOS (1722 modules) and Android (1812 modules).
- **Not run on a device or simulator.**

## Files created/changed
- `apps/mobile/src/app/seller/gigs/index.tsx` (new)
- `apps/mobile/src/app/account/favorite.tsx` (new)
- `apps/mobile/src/lib/dashboard.ts`: screens for "Gigs" and "Favorite list"
- `apps/mobile/src/lib/web-pages.ts`: `myGigsUrl` → `gigAnalyticsUrl`
- `apps/mobile/src/app/(tabs)/dashboard.tsx`: "Create a new gig" on Selling Home
- `apps/mobile/src/app/seller/gigs/[uid]/edit.tsx`, `apps/mobile/src/components/gig-wizard/gig-wizard.tsx`: "My gigs" → the app's list
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.3.17 E2E**: the slice's end-to-end tests. Web specs `my-gigs.spec.ts` and `favorites.spec.ts` exist. For the app, include the main flows:
  - My gigs: list, a rejected gig with its reason, Delete with confirm, the 409 refusal, Edit → editor, View → gig screen;
  - Favourites: list, Remove with confirm, 404 drops the row, the empty state;
  - the Dashboard nav entries and "Create a new gig".
- **QA (4.3.18), on a device**:
  - 44 px targets and a wrapping options row on a 360 px screen;
  - Georgian-only gig titles read with `accessibilityLanguage`;
  - after a delete or remove, the success message stays at the top while the list keeps its scroll position;
  - Load more with more than 20 gigs or 42 favourites;
  - the pending-create success → "My gigs" path, both from the Dashboard (the list is not yet in the stack, so `dismissTo` pushes it) and from My gigs → Create.

## Open questions / risks
- **Analytics in the app**: the ROADMAP has no app analytics screen, so "Analytics" opens the website's page in the browser. The user must be signed in there too, or they land on the website's login first. This is the same interim pattern as "Upgrade to Premium" (subscription). It needs an Owner decision: keep the website page, or add a native analytics screen (a later micro-task, reusing `getGigAnalytics`, bar lists and the DB-IP credit).
- The legacy rating, sales, clicks and impressions columns are not on the list, as on the web: `GigOwnerListItem` does not carry them, and they are on the Analytics page.
