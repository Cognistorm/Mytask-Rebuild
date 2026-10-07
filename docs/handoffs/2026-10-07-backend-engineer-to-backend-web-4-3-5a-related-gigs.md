# 4.3.5a "You may also like": `listRelatedGigs`

From: backend-engineer · To: backend-engineer (4.3.5b/c), web-engineer (4.3.11), mobile-engineer (4.3.14), QA (info) · Date: 2026-10-07

## What I did
- **Split 4.3.5** in `docs/ROADMAP.md` into 4.3.5a (`listRelatedGigs`), 4.3.5b (`recordGigView` + GeoIP) and 4.3.5c (`getGigAnalytics`, impressions, partition job). It was too big for one step.
- **`GET /gigs/{gigId}/related` (`listRelatedGigs`)**, `GigPages.related` in `apps/api/src/modules/gigs/gig-pages.service.ts` (spec 04 AC-32, P-137, EC-13).
  - **Visibility.** The rule of the page (AC-28, P-29) is now one private method, `GigPages.visibleOwner`, used by `getGig`/`lookupGig` and by the related list. So the viewed gig answers 404 exactly when `getGig` would (pending/rejected for the owner only, deleted for everyone).
  - **Candidates.** Other `active` gigs whose owner is listable (`LISTABLE_OWNER`). The same seller's gigs are included (legacy has no such filter).
  - **Match.** M1 same sub-category; M2 title contains the viewed title; M3 description contains the viewed title; M4 description contains the viewed description. All joined by OR.
  - **Texts.** `relatedTexts(locale)` builds each gig's title and plain description in SQL. The viewed gig and the candidates go through the same expressions, so they always compare like with like.
    - Language: the page language, with the fallback of `localized()`. On English pages each field falls back to Georgian. On Georgian pages only the title may borrow the English one.
    - Plain text: tags removed, then `&lt; &gt; &quot; &amp;` decoded (the only entities the sanitiser writes), whitespace runs as one space, trimmed. These are the `richTextPlainText` rules.
    - Case: `lower()` on both sides. Matching uses `strpos`, so `%` and `_` are ordinary characters. An empty viewed text matches nothing.
  - **Order and size.** `ORDER BY random() LIMIT 40`: a new order on every call, no Premium boost, no filling up. The cards come from `GigCards.cards`. `isFavorite` is `null` for guests and `false` for signed-in users until 4.3.6.
- **Tests.** New `apps/api/test/gigs-related.test.ts` (7). It covers:
  - M1, including the same seller in another child category, and that the viewed gig is never listed;
  - card shape for guests and signed-in users;
  - M2–M4 in any letter case, with formatting inside the matched text;
  - `%`/`_` taken literally: a title that would match as a LIKE wildcard is not listed;
  - entities in descriptions;
  - the language fallback on both sides (`ka` and `en` pages give different matches);
  - the 40 cap;
  - restricted, banned, deleted and pending gigs left out, giving an empty list;
  - the viewed gig's visibility: pending for the owner only, deleted and unknown ids get 404.
  - Every case uses its own category chain and unique words, so gigs of other test files cannot match.
  - Results: API **715 passed / 6 skipped**. Typecheck, lint and prettier are green.

## Files created/changed
- `apps/api/src/modules/gigs/gig-pages.service.ts` (`related`, `visibleOwner`, `relatedTexts`; `GigCards` injected)
- `apps/api/src/modules/gigs/gigs.controllers.ts` (`GET :gigId/related`, optional user)
- `apps/api/test/gigs-related.test.ts` (new)
- `docs/ROADMAP.md` (4.3.5 split, 4.3.5a ticked), `docs/STATUS.md`

## What the next agent must do
**4.3.5b (backend): `recordGigView`** (AC-34). Requirements:
- Owner views and bots are not counted.
- Increase the visit counter.
- Record device, browser, OS and referrer domain.
- Look up country and city in a local GeoIP file (DB-IP Lite, or null when the file is missing; never a third-party lookup). Get the client IP per ADR-013 (`ClientIpResolver`).
- Never store the IP.
- Answer 202 and keep the write off the request path. Apply the rate limit (429).
- Use the same visibility as `getGig`: `visibleOwner` is private now, so make it reachable from where the view is recorded instead of copying it.

**Web (4.3.11) / mobile (4.3.14):** call `listRelatedGigs` after the page loads and hide the "You may also like" section when `gigs` is empty (EC-13). The order is random on every call, so do not cache it across page views.

## Open questions / risks
- **Performance.** Every call compares texts across all active gigs, with no index help for M2–M4. Legacy did the same (`LIKE '%…%'`). This is fine at the current catalogue size (a few thousand gigs). If it gets slow later, cache per gig for a short time or store the plain description. No change needed now.
- **Letter case of non-Latin scripts** depends on the database's `LC_CTYPE`. Georgian Mkhedruli has no case. Mtavruli capitals fold only under a UTF-8 locale; legacy `utf8mb4_unicode_ci` did not fold them either, so parity is kept.
- No new Owner question. Still open: Q-181, DEV-M1, Q-160, Q-163, Q-164 (none blocks slice 3).
