# 4.2.10: search results page (web)

## What I did
- `app/[locale]/(public)/search/page.tsx` on the shared gig list of 4.2.9b (`GigList` with `keepKeyword`):
  - Heading `t_search_results_for_q` with the keyword (AC-23); without a keyword "Search" and every listed gig (AC-20).
  - The keyword stays through the filter form (hidden field), the sort links, the page links and "Reset filter" (AC-12).
  - `noindex, follow`, canonical `/search` (or `/en/search`) and its hreflang (url-map §8).
  - The card, Featured frame + badge, quiet `t_no_reviews_yet`, legacy filter names and `sort_by` values, GEL → tetri, min > max refusal, numbered pages with `totalCount` and the empty state with "Reset filter" come from 4.2.9b.
- The header search field shows the keyword on the results page (desktop and phone field).
- `lib/zones.ts`: `/search` is public.
- `e2e/search-page.spec.ts` (4).

## Files created/changed
- `apps/web/src/app/[locale]/(public)/search/page.tsx` (new), `src/lib/zones.ts`, `src/components/site/header-client.tsx`
- `apps/web/e2e/search-page.spec.ts` (new)

## What the next agent must do
- 4.2.11: `/sellers`, `/hire/{keyword}`, explore projects.

## Open questions / risks
- None new. Keyword rules (every word, separators, 100-character cut) are the API's (4.2.4); the input also stops at 100 characters.
