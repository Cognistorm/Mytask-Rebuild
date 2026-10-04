# 4.2.15: mobile category screens, sellers, hire, explore projects, profile links

## What I did
- **Categories menu** `/categories` (spec 03 AC-2 mobile, screens table): the 3-level tree as an accordion with a search box that filters it (matching branches open by themselves), "Browse {category}" on each open branch; reached from Explore ("Browse categories").
- **Category screen** `/categories/[...path]` (AC-3, AC-4): lookupCategory (unknown / misplaced → "Page not found" with "Go back"), breadcrumb line (Home › … › name), title, plain description, Georgian-fallback note when the app shows English and the text is Georgian; then the same gig results as Explore (filters, sort, 42 per load). The staff SEO texts are HTML for the website and are not shown in the app.
- **Freelancers** `/sellers` (AC-27): title + subtitle, 40 per load (cursor) with infinite scroll and pull to refresh; skill chips open `/hire/{slug}`. Reached from Home's best sellers "See more".
- **Hire** `/hire/[keyword]` (AC-28, AC-29): title/subtitle with the skill name, 42 per load; API 404 → Explore search for the keyword (replaces the screen).
- **Explore projects** `/explore-projects/[[...path]]` (AC-32…AC-34): search field, "Popular:" chips (categories, or the category's skills), "Latest projects" with the empty state until slice 9; S-075 OFF → "feature disabled"; unknown category / skill outside it → "Page not found". Reached from Home's Projects shortcut (shown only with S-075 ON).
- **Home**: category tiles and "See more" of category rows open the category screen (was Explore filtered, 4.2.14); best sellers get "See more" → `/sellers`; Projects shortcut.
- **Profile** (spec 02 AC-8, EC-10; spec 03 AC-30): gigs block via `listGigs` (6 + "Load more"), owner-only empty state without gigs; skill chips open `/hire/{slug}`.
- `components/catalog.tsx`: `SellerResults` (infinite list), `openCategoryPath`.
- Checks: mobile typecheck + lint green; `expo export` iOS 1328 / Android 1460 modules. No new i18n keys.

## Files created/changed
- `apps/mobile/src/app/categories/index.tsx`, `categories/[...path].tsx`, `sellers.tsx`, `hire/[keyword].tsx`, `explore-projects/[[...path]].tsx` (new)
- `apps/mobile/src/app/(tabs)/home.tsx`, `(tabs)/explore.tsx`, `profile/[username]/index.tsx`, `components/catalog.tsx`

## What the next agent must do
- 4.2.16 E2E, 4.2.17 QA: click through on a phone (no device run in this session).

## Open questions / risks
- Q-167 (guests in the app) still open: all these screens sit behind the slice 1 login gate only when reached through the tabs; the stack screens themselves (`/categories`, `/sellers`, …) do not check a session, like the public profile.
