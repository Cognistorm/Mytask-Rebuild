# 4.2.14: mobile Home tab + Explore tab

## What I did
- **Tabs**: Home and Explore join Dashboard and Account (Phosphor House / MagnifyingGlass, Regular inactive, Fill active). The app start (`/`, also where login and register land) now opens **Home** (design 01-home "Tab 1"); the Dashboard tab still opens the side chosen last (spec 02 AC-3).
- **Home** (`(tabs)/home.tsx`, design 01-home "Native app", spec 03 AC-24…AC-26): logo bar; compact teal hero (S-113 title or `t_find_best`, a search field that opens Explore with the keyboard up, Gigs shortcut); featured categories (S-107) as image tiles; Top gigs; one row per visible category with gigs and "See more"; best sellers (S-108) as freelancer mini cards. Rows are horizontal lists (cards 80 % of the screen, snap, next card peeks). Null/empty rows hidden; a failed getHome shows an error notice; pull to refresh.
- **Explore** (`(tabs)/explore.tsx`, spec 03 screens mobile column): heading (`t_search_results_for_q` with the keyword, else "Explore"), search field (submit = search), then the results:
  - Toolbar: result count, "Filter (n)" → full-screen filter sheet (rating, price min/max in GEL → tetri, delivery time; min > max refused with `t_min_price_greater_than_max`; "Reset filter"; sticky "Show results" bar), sort button → bottom sheet with the seven sorts.
  - 42 per load with `cursor` (infinite scroll), pull to refresh, empty state with "Reset filter" when filters are set, error state with Retry.
- Shared pieces `components/catalog.tsx` (GigCardView with Featured frame + "♛ Featured" text badge and quiet "No reviews yet", SellerMini, FilterSheet, SortSheet, GigResults) and `lib/catalog.ts` (same options and rules as the web's `list-query.ts`, without the URL part).
- A gig opens the website's gig page until the gig screen exists (slice 3, `gigUrl`); the seller row opens the profile screen.
- Until 4.2.15, a category (tile, "See more") opens Explore filtered to that category with its name as the heading.
- Checks: mobile typecheck + lint green; `expo export` iOS 1323 / Android 1454 modules. No new i18n keys.

## Files created/changed
- `apps/mobile/src/app/(tabs)/home.tsx`, `explore.tsx` (new); `(tabs)/_layout.tsx`, `app/index.tsx`
- `apps/mobile/src/components/catalog.tsx`, `src/lib/catalog.ts` (new); `components/dashboard.tsx` (icons), `lib/web-pages.ts` (`gigUrl`)

## What the next agent must do
- 4.2.15: category screen (and point Home's category taps at it), `/sellers`, `/hire/{keyword}`, explore projects; Projects shortcut on Home.

## Open questions / risks
- **Guests**: the tab layout is still the slice 1 session gate, so Home and Explore need a signed-in user. Opening them to guests (as the website is) changes the app's start flow: **Owner question** (recorded in the 4.2.14 STATUS line; proposed: open Home/Explore/profile to guests, keep Dashboard/Account behind login).
- No device test was run in this session (bundles build; QA should click through on a phone).
