# 4.2.9b: category pages at 3 levels (web)

## What I did
- `app/[locale]/(public)/categories/[...path]/page.tsx`: `lookupCategory` (1–3 slugs; unknown, wrong parent, empty segment or a 4th level → 404), then `searchGigs?categoryId=` with the URL filters (spec 03 AC-3).
  - Breadcrumb Home › … › current (paths built from the breadcrumb slugs), h1 = name, `description` as the meta description.
  - Staff SEO texts `contentTop` above and `contentBottom` below the list, rendered as the API sanitised them (`staff_content`, 4.2.7a).
  - AC-4: on `/en` when the category's texts are Georgian (`contentLocale: ka`), `lang="ka"` on them and the note `t_content_shown_in_georgian` (only when body content is shown).
  - AC-37: canonical = the clean path in the page language + `?page=N` (N > 1), filters and sort dropped; hreflang ka / en / x-default (absolute on `APP_URL`, `lib/seo.ts`).
- **The shared gig list** (used again by `/search` in 4.2.10): `components/catalog/gig-list.tsx` (server) + `filter-panel.tsx`, `sort-menu.tsx` (client):
  - Filters as a GET form with the legacy names (`rating`, `min_price`/`max_price` in GEL → tetri for the API, `delivery_time`); keeps the sort (and the keyword on search), goes back to page 1, empty fields left out.
  - Rating options show stars + text ("4+ stars"; 5 = "5 stars"); delivery "Up to 1 week" (`t_up_to_delivery`).
  - Min > max refused in the browser before leaving the page (AC-10, previous results stay); a shared URL with min > max shows the message and calls the API without the price filter.
  - Sort menu: Recommended + the six legacy sorts, legacy `sort_by` values (`popular`, `rating`, `sales`, `newest`, `price_low_high`, `price_high_low`) ↔ `SearchGigSort` (`lib/list-query.ts`).
  - Result count (`t_n_results`), 42 cards, numbered pages with Previous/Next (page in the URL, AC-8), empty state with "Reset filter" (AC-21), error state with Retry.
  - Phones: "Filter" button → full-screen sheet with a sticky "Show results" bar.
- **GigCard** in `@mytask/ui/web` (`catalog.tsx`, server-renderable): image 3:2 (placeholder until gig images exist), Featured frame + crown badge "Featured" with the Premium hint (AC-18), seller mini-row (avatar, online dot, ID verified), 2-line title = the one link (hit area covers the card), stars + "4.8 (12)" or the quiet `t_no_reviews_yet`, "Starting at" + price. Favourite button joins with spec 04. Also `Breadcrumb`, `Pagination`, `GigGrid`.
- `formatMoney` moved to a plain module (`packages/ui/src/web/money.ts`) so server pages can call it.
- Proxy: `?page=1` → 301 to the clean list (url-map §2), in the same hop as the other fixes.
- `lib/zones.ts`: `/categories/{1..3 segments}` is public (custom code allowed, AC-73).
- i18n NEW (en + ka): `t_breadcrumb` Breadcrumb / ნავიგაციის ზოლი; `t_n_results` "{{count}} results" / "{{count}} შედეგი"; `t_retry` Retry / თავიდან ცდა; `t_pagination` Pagination / გვერდები; `t_page_n` "Page {{n}}" / "გვერდი {{n}}".
- `e2e/category-pages.spec.ts` (8) on `e2e/fake-catalog.mjs` (lookup, 50 gigs, `/__last-search` probe per category).

## Files created/changed
- `apps/web/src/app/[locale]/(public)/categories/[...path]/page.tsx` (new)
- `apps/web/src/components/catalog/*` (new), `src/lib/list-query.ts`, `gig-card.ts`, `seo.ts` (new); `src/lib/zones.ts`, `src/proxy.ts`
- `packages/ui/src/web/catalog.tsx`, `catalog.css`, `money.ts` (new); `dashboard.tsx`, `index.ts`
- `apps/web/e2e/category-pages.spec.ts` (new), `e2e/fake-catalog.mjs`
- `packages/i18n/en.json`, `ka.json`

## What the next agent must do
- 4.2.10: `/search` page on `GigList` with `keepKeyword`, title `t_search_results_for_q`, `noindex, follow`, canonical `/search`.

## Open questions / risks
- Renamed categories answer 404 until `resolveRedirect` (4.16.6); the old slugs are already recorded (4.2.7b).
- The card image is the placeholder until slice 3 gives gigs thumbnails.
