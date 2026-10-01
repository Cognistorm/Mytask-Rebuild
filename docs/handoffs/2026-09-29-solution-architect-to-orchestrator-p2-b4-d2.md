# Handoff: solution-architect → orchestrator — P2-B4 group run D2 (specs 03, 04, 07, 17 + spec 16 delegations)
Date: 2026-09-29 | Task: P2-B4 part 2, group D2 | Verification: `npm run verify:group -- D2` → **PASSED** (build-root, lint sources, bundle, lint bundle: 0 errors 0 warnings; check-contract 0/0; check-coverage 0 errors, 3 warnings = D1 reserved operations `getUserProfile` / `getPublicConfig` not in the D2 sandbox)

## What I did
- Wrote the D2 part of the API contract: **105 operations** (51 public/user, 54 staff) on 82 paths, all under D2 prefixes, following CONVENTIONS §18.
  - Catalog: `listCategories`, `lookupCategory`, `getCategory`, `listProjectCategories`, `lookupProjectCategory`, `listCountries`; staff CRUD for categories (3 levels), project categories, skills, countries.
  - Search: `searchGigs` (one operation for `/search` and all category levels: word search, P-27 filters, P-26 Premium-first ranking, `isFeatured`), `searchProjects`, `listSellers`, `listHireSellers`.
  - Gigs: `listGigs` (by seller), `listMyGigs`, `getGigCreationEligibility`, `createGig`, `getGig`, `lookupGig` (by uid → 301 logic), `getGigOwnerView`, `updateGig`, `deleteGig`, `listRelatedGigs` (P-137 M1–M4), `recordGigView`, `getGigAnalytics`, `createGigReport`; favourites `listFavorites`, `putFavorite`, `deleteFavorite`; staff `adminListGigs` (queue), `adminGetGig`, `adminPublishGig`, `adminRejectGig`, `adminRemoveGig`, `adminRestoreGig`.
  - Reviews: `createReview`, `listReviews` (gig / profile / my written-received scopes), `getReview`, `updateReview`, `getReviewEligibility`, `listReviewableItems`, `getUserReviewSummary`; staff list/get/hide/unhide.
  - Content: pages (`listPages`, `lookupPage`, `getPage` + staff list/create/get/update), blog (articles, comments, staff articles, comment queue and publish/hide/delete), `createContactMessage` + staff support inbox (list/get/mark-seen/reply/close), newsletter (sign-up, confirm, unsubscribe; staff list/export/delete/resend/send email), `getHome` + staff logo cloud.
  - SEO: `getSitemapIndex`, `getSitemapPart`, `resolveRedirect`, `verifyOutboundLink`, `createOutboundLinkSignatures`.
- Reserved operations written exactly: `createReview` (POST /reviews), `listReviews` (GET /reviews), `resolveRedirect` (GET /redirects/resolve).
- `D2ErrorCode`: CATEGORY_IN_USE, COUNTRY_IN_USE, GIG_HAS_ORDERS_IN_QUEUE, GIG_RESTORE_WINDOW_EXPIRED, REVIEW_NOT_ALLOWED, REVIEW_ALREADY_EXISTS, CONTACT_CAPTCHA_FAILED, NEWSLETTER_TOKEN_INVALID, OUTBOUND_LINK_INVALID. Everything else uses common codes + the spec's `t_*` messageKey.
- Realtime events (src/events/d2.yaml): `gig.status_changed` (room `user:{ownerUserId}`), `review.received` (room `user:{subjectUserId}`).
- P-137 (04 AC-32) written exactly as the spec text in `listRelatedGigs` (M1–M4, case-insensitive substring on plain text, page-language texts with Georgian fallback, random, max 40, no boost, no fill-up, empty = hidden). P-136 (04 AC-5): `createGig`/`updateGig` return `VALIDATION_FAILED` with field codes `georgian_field_characters` / `georgian_letter_required` and the R-5.3a messageKeys, using D1's stand-in shape `I18nGeorgianFieldError` (not referenced by `$ref`, per the no-cross-group-ref rule).

### Coverage totals
| Spec | ACs | API | NOT-API | DELEGATED |
|---|---|---|---|---|
| 03 | 37 | 33 | 4 (ui 3, infra 1) | 0 |
| 04 | 39 | 37 | 2 (ui) | 0 |
| 07 | 21 | 20 | 1 (migration) | 0 |
| 17 | 47 | 35 | 12 (infra 4, ui 5, migration 2, job 1) | 0 |
| 16 (D2 delegations 19, 20, 25, 26, 31, 60, 61, 62, 63) | 9 | 9 | 0 | 0 |

## Files created/changed
- `docs/04-api/src/paths/d2-catalog-gigs-reviews-content.yaml` (filled)
- `docs/04-api/src/schemas/d2.yaml` (filled; stub removed)
- `docs/04-api/src/events/d2.yaml` (2 events)
- `docs/04-api/coverage/03.md`, `04.md`, `07.md`, `17.md`, `16-d2.md` (new)
- This handoff. Nothing else touched; nothing committed.

## What the next agent must do (integration run)
### Requests to the integration run
- **R-1 Web page numbers.** Public lists that the web renders with numbered pages in the URL (spec 03 AC-8, spec 17 AC-15, spec 07 AC-15; url-map §2 `?page=N`; ADR-011 §4) take an optional inline `page` query parameter (1-based, ≤ 1000) as an alternative to `cursor`, and return `totalCount`: `searchGigs`, `searchProjects`, `listSellers`, `listHireSellers`, `listReviews`, `listBlogArticles`. Please ratify this CONVENTIONS §8 addition and consider a shared `PageNumber` parameter (then I'd swap the inline ones).
- **R-2 Checker edge case.** `check-contract` treats any 200 schema whose name ends with `Page` as a list. D2 owns the schema prefix `Page` (CMS pages), so the CMS page schemas are named `PageDetail` / `AdminPageDetail`. Consider checking for `CursorPage` in `allOf` instead of the name suffix.
- **R-3 P-136 shared FieldError** (same as D1 request 1): add `params` / `refusedCharacters` to the shared `FieldError`; D2 gig titles/descriptions already use D1's codes and messageKeys.
- **R-4 Public config (D1 `getPublicConfig`)** must include, for D2 clients: S-041 (revisions max), S-070 not needed, S-075 (projects enabled, menus), S-077, S-078, S-080, S-081, S-082 (gig wizard file limits), S-104, S-107…S-109 (optional, home already returns null blocks), S-111, S-112, S-113, S-114, S-115, S-116, S-117, S-118, S-119, S-120.
- **R-5 D1 profile indexability.** Spec 17 AC-41 (P-133): `getUserProfile` should expose whether the profile is indexable (active gig, public portfolio item or visible review) so the web can emit `noindex, follow`; D2's sitemap applies the same rule. D1 should add `17 AC-41` to that operation's x-covers or the integration run keeps the D2 row as is.
- **R-6 Cross-group x-covers (D4).** The "Add to cart" refusals of spec 04 AC-29 (seller unavailable/restricted, `t_seller_wont_be_able_to_receive_orders_date`) and AC-30 (own gig, `t_u_cant_add_ur_own_gigs_to_shopping_cart`) are enforced by D4's cart operation; D4 should list `04 AC-29`, `04 AC-30` in its x-covers. D2 exposes the data (`Gig.seller.isAcceptingOrders`, `unavailableUntil`, `viewer.isOwner`).
- **R-7 Reserve `listGigs`** (GET /gigs?sellerUsername=) so D1 can cite it for the profile gig list (spec 02 AC-8), and `getUserReviewSummary` (GET /reviews/summary) for the profile rating blocks (spec 02 AC-10).
- **R-8 Explore projects duplication.** `searchProjects` (GET /search/projects, own schema `SearchProjectCard`) covers spec 03 AC-32…AC-34 because `/projects` belongs to D5. If D5 also wrote a public project list, keep one (D5 list + D2 coverage rows pointing to it via a reserved id, or D2's as is).
- **R-9 New i18n keys** (for the Owner/i18n files, English first): `t_country_in_use` ("This country is used by at least one user and cannot be deleted."), `t_gig_restore_window_expired` ("A removed gig can be restored only within 30 days."), `t_recaptcha_failed` (check whether a legacy reCAPTCHA key already exists and reuse it).
- **R-10 Realtime catalogue**: add `gig.status_changed`, `review.received` to realtime.md §6.

### Notes for other groups
- D4/D5 items embed `ReviewRef` and can call `getReviewEligibility?itemType=&itemId=` for "Leave a review".
- Reports of gigs are created by `createGigReport` (EV-22); the D6 reports queue's "remove gig" shortcut calls `adminRemoveGig`.
- Staff upload purposes used: `category_image` (icon/image), `blog_image` (cover), `home_logo` via F0 `adminCreateFileUpload`.

## Open questions / risks (for `docs/01-discovery/open-questions.md`, not decided here)
1. **Staff "Restore" of a removed gig (spec 16 AC-20)**: the contract restores it to `active`. Unclear: (a) does a restored gig count against the owner's plan limit again (it may push a Standard user above S-001)? (b) with S-070 OFF should it go to `pending` instead? (c) is the owner notified of removal/restore? The spec names no notification; none is sent.
2. **S-107 "featured categories" vs the home category rows.** Legacy (`home.blade.php:165` vs `:576`) has two blocks: featured-category tiles governed by S-107 and the category gig rows, always shown. `getHome` follows legacy (tiles null when S-107 OFF, rows always). Confirm this is what spec 17 AC-35 means.
3. **Legacy home "Latest projects" block** (`home.blade.php:440`, shown while projects are enabled) is in no D2 AC; `getHome` does not return it. Clients can call `searchProjects?limit=…`. Confirm whether the block is kept (spec 10 / 17 owner).
4. **Outbound link signing for plain-text user content (spec 17 AC-47)**: staff HTML is rewritten server-side; for user plain text the contract offers `createOutboundLinkSignatures` (anyone may sign any http/https URL, rate-limited). That keeps the interstitial but makes the signature only an integrity check, not an allow-list. Alternative: the API returns pre-linkified signed text in every user-content field (touches D1/D4/D5 schemas). Security review (P2-B5) should decide.
5. **Support reply subject/body limits** and newsletter staff email limits are not in spec 17; the contract uses technical maxima (subject ≤ 200) and no body maximum.
6. **Catalog reads use `catalog.write`** (the spec 16 catalogue has no read permission for catalog screens); likewise content screens use their write/manage permission for reads.
7. **Migrated gigs with `revisionsAllowed = null`** (data-model Owner question 1) are exposed as `null`; clients need a display rule for null (not in spec 04).
