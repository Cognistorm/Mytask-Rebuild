# 4.2.4 Gig search, profile gig list, SearchIndex, PremiumStatus seam

From: backend-engineer · To: backend-engineer (4.2.5, 4.2.6, slice 3, slice 8), web-engineer (4.2.9b, 4.2.10, 4.2.12), mobile-engineer (4.2.14, 4.2.15) · Date: 2026-10-03

## What I did
Contract 1.3.2, no contract change, no data-model change, no new i18n key.

- **`searchGigs`** (`GET /search/gigs`, `catalog/gig-search.service.ts`):
  - **Listed** (R-S1, P-29): gig `active`; owner `active`/`verified`, `deleted_at` null, not `is_restricted` (a ban
    sets `banned`). The owner is **joined at query time**, so a ban, a restriction, its lifting, a deletion or
    a verification shows on the next request with no refresh path to maintain (4.2.1 handoff §E).
  - **Keyword** (AC-19, P-28, EC-5, EC-6): `catalog/search-text.ts`. The keyword is cut to 100 characters,
    `- _ ' " / \ ` +` become spaces, it is lower-cased, and repeated words are dropped. **Every** word must be a
    substring (`LIKE`, wildcards escaped) of `search_documents.search_text`. That text holds the normalised
    title + description (HTML stripped) of both languages, one line per field. No fuzzy-only matches.
    Separators only → everything.
  - **Filters**: `categoryId` at any level (column chosen by depth; unknown → 404); price in tetri with the
    limits included; `minPrice > maxPrice` → 400 field `minPrice`, `t_min_price_greater_than_max`;
    `deliveryTime` ≤ N, so 0-day gigs are included; `rating` N → `rating_sum ≥ N × rating_count` (exact, no
    division; "5" = 5.0; gigs without reviews never match).
  - **Order** (R-S3, AC-14…AC-16):
    - Group A (owner has active Premium per `PremiumStatus.activeUsersSql()`) comes before group B for
      recommended, most_popular, best_rating, most_selling and newest. The price sorts have no groups.
    - Recommended = `md5(id || Tbilisi date)`, the daily mix.
    - Ties = `published_at DESC NULLS LAST, created_at DESC, id DESC`.
  - **Paging**: `page` (web) or `cursor` (app), both an offset into the same order. The cursor is opaque
    base64url `o:<offset>`, at most 100 000. Both together → 400. A cursor the API did not make → 400.
    `totalCount` is always returned. The limit defaults to 20 (contract); clients send `limit=42`.
  - **Filters and counters are read from the live `gigs` row**, not from the copies in `search_documents`.
    Visits, sales and rating counters change in later slices, and reading them live keeps every list exact.
    The document is used only for the text match. Its other columns are still written on every index call,
    for a later engine (ADR-011 §3) and for diagnostics.
- **`listGigs`** (`GET /gigs?sellerUsername=`): the profile list. Active gigs of a listable owner, newest
  first, no boost (R-S3.7), offset cursor. An unknown or non-listable seller gets an empty page. Cards still
  carry the Featured flag.
- **`GigCard`** (`catalog/gig-cards.ts`, `GigCards` exported for home rows, favourites and so on):
  - Title in the request language with the Georgian fallback (`contentLocale`).
  - Thumbnail = CDN variants of `thumbnail_file_id`; price `{amount, GEL}`; `deliveryDays`.
  - `rating` = `{count, averageTenths}`, half up with integer arithmetic (`ratingSummary`).
  - `seller` = `UserSummary`; `isFeatured` = `seller.isPremium`.
  - `isFavorite` = `null` for guests, `false` for a signed-in caller until slice 3.
- **`SearchIndex`** (`catalog/search-index.ts`, exported by `CatalogModule`):
  - `indexGig(gigId, tx?)` upserts the gig's document: `search_text`, a `tsvector` that also includes the
    category names, and the filter columns.
  - A missing or `deleted` gig has its document removed. `removeGig(gigId, tx?)` does the same directly.
  - Both run inside the caller's transaction.
- **`PremiumStatus`** (`modules/subscriptions/premium-status.ts`, global `PremiumModule`): `activeAmong(ids)`,
  `isActive(id)`, `state(id)` → `{isActive, endsAt}`, `activeUsersSql()`. Until slice 8 nobody has Premium. It
  replaces every hard-coded value:
  - `isPremium` in the public profile, `UserSummaries` and the restrictions summaries;
  - `plan`/`premiumEndsAt` in `Me` and `AdminUser`;
  - `plan` in both `ModerationOwnerSummary` builders.

  The old comments said "slice 9 (spec 10)"; they now say slice 8 (spec 09).
- **Impressions** are not recorded yet (no gig analytics until slice 3, 4.2.1 handoff §D).

Tests `apps/api/test/gig-search.test.ts` (24). They use a `PremiumStatus` test double and validate responses
against the contract:
- keyword rule: units, every word in both languages, a legacy phrase, separators, `%`, separators only;
- listing rules: pending gig or user, banned, deleted, restricted → lifted → banned on the next request;
- English fallback on cards; the full card shape; rating rounding;
- category filter at 3 levels and the 404; price filter with the 400; delivery and rating filters;
- **AC-16 worked example** (Best rating P1, P2, S1, S2; price ↑ S1, P2, S2, P1; "4+" P1, S1, S2), Featured
  flag, losing the boost (AC-17);
- popular, selling and newest with ties; Recommended: group A first, the same on every request, page and
  cursor walks equal, the page after the last;
- Tbilisi day key and its order; page + cursor and a foreign cursor → 400;
- `listGigs` order, cursor, no boost, empty for banned and unknown sellers;
- re-index after an edit, a deleted gig removed, indexing inside a transaction;
- the seam in `Me`, the profile, and signed-in `isFavorite: false`.

Also fixed `catalog-schema.test.ts` "loads into the database…". It counted every category except `t-` slugs,
so categories left by `catalog.test.ts` (`c-`) and now `gig-search.test.ts` (`gs-`) made it fail depending on
file order. This was the "flaky" test of the 4.2.3 handoff. It now counts only the seed's own slugs.

Results: API **489 passed / 6 skipped** (was 465), `tsc` and `eslint` green, `prettier` clean (only the generated
Prisma client is unformatted, as before).

## Files created/changed
- New:
  - `apps/api/src/modules/subscriptions/premium-status.ts`
  - `apps/api/src/modules/catalog/search-text.ts`, `search-index.ts`, `gig-cards.ts`, `gig-search.service.ts`
  - `apps/api/test/gig-search.test.ts`
- Changed:
  - `apps/api/src/modules/catalog/catalog.controllers.ts` (`GigListsController`), `catalog.module.ts` (imports
    `ProfilesModule`; exports `GigCards`, `SearchIndex`)
  - `apps/api/src/app.module.ts` (`PremiumModule`)
  - `apps/api/src/modules/auth/me.mapper.ts`, `auth/account.service.ts`, `staff/admin-users.service.ts`,
    `profiles/profiles.service.ts`, `profiles/user-summaries.ts`, `restrictions/restrictions.service.ts`
  - `apps/api/test/catalog-schema.test.ts`
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.5 (backend)**:
  - `listSellers` and `listHireSellers` can reuse the `LISTABLE_OWNER` SQL and the md5 daily mix
    (`tbilisiDay`) from `gig-search.service.ts`; export them if needed.
  - `searchProjects` can reuse `keywordWords`/`containsPattern`.
- **4.2.6 (backend)**: home rows use `GigCards.cards(ids, …)` and `PremiumStatus` (Top gigs: Premium first,
  random inside each group).
- **Slice 3 (gig writes)**:
  - Call `SearchIndex.indexGig(id, tx)` inside every gig create, edit, moderation and delete transaction.
  - Fill `isFavorite`, record impressions for listed cards (`searchGigs` description, spec 04 AC-39), and
    give the profile `isIndexable` its active-gig condition (spec 17 AC-41).
  - Its `/gigs` controller must not clash with `GET /gigs` in `GigListsController`: move `listGigs` into the
    gigs module then.
- **Slice 8 (subscriptions)**: replace the bodies of `PremiumStatus` (subscriptions table, cached at most 60 s,
  BR-113). `activeUsersSql()` must return the same set as `activeAmong`. Ranking and badge then follow
  automatically. Optionally refresh `search_documents.owner_is_premium`, which the listing does not read.
- **Web (4.2.9b, 4.2.10) and mobile (4.2.14)**:
  - Web sends `page` + `limit=42` and shows `totalCount`; mobile sends `cursor` + `limit=42`.
  - Prices go in tetri.
  - Map the legacy `sort_by` values: `popular`→`most_popular`, `rating`→`best_rating`,
    `sales`→`most_selling`, `newest`→`newest`, `price_low_high`→`price_asc`, `price_high_low`→`price_desc`.

## Open questions / risks
- None for the Owner.
- **For the architect, to note only:** ADR-011 §1 describes filtering on the `search_documents` columns. 4.2.4
  reads them from the live `gigs` and `users` rows and uses the document only for the text match, so the
  counters of later slices cannot go stale. No contract or data-model change; the columns stay and are written.
- Offset paging. With the daily mix and at today's volume (thousands of gigs) this is fine. If lists grow very
  long, a keyset cursor can replace the opaque `o:` cursor without a contract change.
- Words of 1–2 characters cannot use the trigram index (sequential filter on the already-narrowed rows). This is
  fine at launch volume.
