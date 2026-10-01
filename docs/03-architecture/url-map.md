# URL map — legacy → new (SEO, redirects, hreflang, sitemap, deep links)
Status: **accepted (Owner 2026-09-30)** | Author: solution-architect (P2-B3) | Date: 2026-09-28
Inputs: `docs/01-discovery/routes-and-pages.md` (every legacy route, `legacy/APP/routes/web.php`, `routes/admin.php`), a read-only check of https://mytask.ge (2026-09-28: no hreflang or canonical tags on the live home page; gig URLs `/service/{slug}-{UID20}`, project URLs `/project/{pid}/{slug}`, `?locale=` and `?theme=` links in the header), ADR-006, ADR-008, ADR-010, specs 00 (R-5.6, AC-3, AC-24), 02 (EC-4), 03 (AC-12, AC-29, AC-35…AC-37), 04 (AC-33, P-33), 05 (AC-11), 06; Owner answers Q-013, Q-023, Q-024, Q-025, Q-088.
Items that depend on specs 08, 10–13 and 17 (being written) are marked "to confirm against spec NN".

Contents: 1. Rules · 2. Query parameters · 3. Public pages · 4. Gig, project and profile slugs · 5. Account, dashboard and flow pages · 6. Removed, technical and admin URLs · 7. BOG return and mobile deep links · 8. hreflang and canonical · 9. Sitemap and robots.txt · 10. Implementation notes

---

## 1. Rules
1. **Georgian is unprefixed, English is under `/en/`** (Q-024, R-5.6). Every page exists at `/{path}` (ka) and `/en/{path}` (en). The language comes **only from the path**, never from a cookie, the session or `Accept-Language`, so each URL has exactly one language.
2. **Legacy paths are kept wherever they exist**, so almost every legacy URL is already the new Georgian URL and needs no redirect. Redirects are only for query-based language/theme, changed paths, removed features and old slugs.
3. **All permanent redirects are 301** and go to the final URL in **one hop** (a language parameter, a trailing slash and an old slug are fixed together). Redirects that depend on changing data (for example `/hire/{kw}` without a matching skill) are 302.
4. **Host and scheme:** `http://` → `https://` (301, Caddy); `www.mytask.ge` → `mytask.ge` (301); the admin panel lives only on `admin.mytask.ge` (Q-088).
5. **Trailing slash:** none. `/path/` → `/path` (301). The home pages are `/` and `/en`.
6. **Case:** paths are lower case, except the gig uid, which is matched case-insensitively and then redirected to its stored form.
7. **Unknown `/ka/…` paths:** `/ka/{path}` → `/{path}` (301), because `ka` is the unprefixed default. `/ka` → `/`.
8. **Tracking parameters** (`utm_*`, `fbclid`, `gclid`) are kept on redirects and removed from canonical URLs.

## 2. Query parameters
| Legacy parameter | Where | New behaviour |
|---|---|---|
| `?locale=ka` | any URL | 301 to the same path **without** the prefix and without `locale` (other parameters kept). |
| `?locale=en` | any URL | 301 to `/en` + the same path, without `locale`. |
| `?locale=` other or empty | any URL | 301 to the same URL without `locale` (Georgian). |
| `?theme=dark` / `?theme=light` | any URL | 301 to the same URL without `theme`, and the redirect response sets the `theme` preference cookie (1 year; for a logged-in user the API also saves `users.theme`). Note: browsers may cache a 301 and skip the cookie on a second visit to the exact same URL; this is harmless (the theme switch in the header still works). |
| `?locale=…&theme=…` together | any URL | one 301 that applies both rules. |
| `?page=N` | lists | kept (`?page=1` → 301 without the parameter). The API uses cursors internally (ADR-011); the web maps page numbers to cursors. |
| `q`, `min_price`, `max_price`, `delivery_time`, `rating`, `sort_by` | `/search`, category pages | kept with the same names (spec 03 AC-12). |
| `?ref=CODE` | `/auth/register` | kept (spec 01 AC-6); also works under `/en/`. |
| `?gigs=true` | `/subscription` | kept. |
| `?period=month|year` | `/subscription/subscribe/{plan}` | carried into the new checkout URL (§5). |
| `?orderId=&itemId=` | `/account/orders/requirements`, `/account/orders/files` | 301 to `/account/orders/{itemUid}` (§5). |
| `?key=&type=` | `/success`, `/fail` | ignored; never changes state (R-004, §7). |
| `?token=` | `/newsletter/verify`, `/auth/verify`, `/auth/password/update` | kept (legacy tokens are not migrated, so old links show the "expired" state with a resend action). |

## 3. Public pages (indexable unless noted)
"Same" = the legacy path is the new Georgian path; English is the same path under `/en/`.
| Legacy URL | New Georgian URL | New English URL | Rule | Source |
|---|---|---|---|---|
| `/` | `/` | `/en` | same | home |
| `/categories/{c}` | same | `/en/categories/{c}` | same; unknown slug → 404 | spec 03 AC-3 |
| `/categories/{c}/{s}` | same | `/en/categories/{c}/{s}` | same; child not under parent → 404 | spec 03 AC-3 |
| `/categories/{c}/{s}/{child}` | same | `/en/…` | same | spec 03 AC-3 |
| `/service/{slug}` | `/service/{currentSlug}` | `/en/service/{currentSlug}` | same; old slug → 301 by uid (§4.1) | spec 04 AC-33, P-33 |
| `/reviews/{gigUid}` | same | `/en/reviews/{gigUid}` | same (`noindex, follow`: duplicate of the gig page tab) | spec 07 AC-15 |
| `/search` (+ `?q=` and filters) | same | `/en/search` | same; `noindex, follow` (internal search results, §8) | spec 03 AC-19 |
| `/hire/{keyword}` | same | `/en/hire/{keyword}` | same when a skill has this exact slug; otherwise **302** → `/search?q={keyword}` (under `/en/` for English) | spec 03 AC-28/29 |
| `/sellers` | same | `/en/sellers` | same | spec 03 AC-27 |
| `/explore/projects` (+ `?q=`) | same | `/en/explore/projects` | same; with S-075 OFF the page shows "feature disabled" (200, `noindex`) | spec 03 AC-32/34 |
| `/explore/projects/{category}` | same | `/en/…` | same; unknown → 404 | spec 03 AC-33 |
| `/explore/projects/{category}/{skill}` | same | `/en/…` | same; skill must belong to the category (P-31) | spec 03 AC-33 |
| `/project/{pid}/{slug}` | `/project/{pid}/{currentSlug}` | `/en/project/{pid}/{currentSlug}` | same; wrong or old slug → 301 by pid (§4.2); non-public statuses → 404 for non-owners (to confirm spec 10) | spec 10 |
| `/profile/{username}` | same | `/en/profile/{username}` | same; pending/banned/deleted → 404; old username → 404 (spec 02 EC-4) | spec 02 AC-8/9 |
| `/profile/{username}/portfolio` | same | `/en/…` | same | spec 02 AC-28 |
| `/profile/{username}/portfolio/{slug}` | same | `/en/…` | same | spec 02 AC-28 |
| `/page/{slug}` (about-company, contact-information, terms-of-service, privacy-policy, payments, mytask-faq, how-platform-works) | same | `/en/page/{slug}` | same | spec 17 |
| `/blog` | same | `/en/blog` | same (live today it renders the home page; the new blog works, Q-025) | spec 17 |
| `/blog/{slug}` | same | `/en/blog/{slug}` | same | spec 17 |
| `/subscription` | same | `/en/subscription` | same | spec 09 AC-1 |
| `/help/contact` | same | `/en/help/contact` | same | spec 17 |
| `/ka/gita` | `/gita` | – | **301** → `/gita` (Georgian is unprefixed) | routes l.8-13, spec 17 |
| `/en/gita` | – | `/en/gita` | same (already fits the scheme) | routes l.8-13 |
| `/newsletter/verify?token=` | same | `/en/newsletter/verify` | same, `noindex` | spec 17 |
| `/redirect?…` (outbound link redirector) | `/redirect?to=` | `/en/redirect?to=` | kept as a `noindex` interstitial that only accepts `http(s)` targets and shows the destination before leaving (no silent open redirect); to confirm against spec 17 | routes l.148 |
| `/sitemap.xml` (404 live) | `/sitemap.xml` | – | new, working (§9, Q-025) | R-042 |
| `/robots.txt` | `/robots.txt` | – | new (§9) | |
| `/start_selling` | – | – | **301** → `/auth/register?next=/seller/home` (English: `/en/…`). A logged-in visitor on the register page is sent straight to `next` (302), so logged-in users land on the freelancer dashboard and guests on registration (00 AC-3, Q-013). | X-06 |
| `/post/service` | – | – | **301** → `/create` | spec 04 AC-1 |
| `/post/project` | same | `/en/post/project` | same (login required) | spec 10 |
| `/create` | same | `/en/create` | same (login required, `noindex`) | spec 04 |

## 4. Gig, project and profile slugs
### 4.1 Gigs (P-33)
- Canonical form: `/service/{slug}` where `slug` = transliterated Georgian title (≤ 138 characters) + `-` + `uid` (20 characters, e.g. `veb-developeri-B1FC0AABEEF8071D2AC2`).
- Resolution: take the text after the **last** `-` of the requested slug as the uid, look the gig up by `gigs.uid` (case-insensitive). If the gig exists and is public and the requested slug differs from `gigs.slug` (an old title, the legacy English-UI slug created by edits in English, P-33, or different case) → **301** to `/service/{gigs.slug}` (same language prefix). If the uid does not exist, the gig is pending (non-owner), rejected or deleted → 404.
- No slug history table is needed because the uid is always part of the slug (data-model §3.D).

### 4.2 Projects
- Canonical form: `/project/{pid}/{slug}`; the pid (6 digits) identifies the project. A request with a different slug, or `/project/{pid}` without a slug → **301** to the current slug.

### 4.3 Profiles, portfolio
- `/profile/{username}` by current username. An old username after a rename returns 404 (spec 02 EC-4, legacy behaviour). A username-history redirect is possible later; it is Owner question 10 in the handoff, not a rule.
- Portfolio slugs contain the portfolio uid; a changed title slug → 301 by uid (same rule as gigs).

## 5. Account, dashboard and flow pages (all `noindex`, login required, excluded from the sitemap)
Legacy paths are kept for bookmarks and old emails; detail pages move from query strings to path segments. English = same path under `/en/`. Paths marked "to confirm" follow specs 08, 10–13.
| Legacy URL | New URL | Rule |
|---|---|---|
| `/cart` | `/cart` | same |
| `/checkout` | `/checkout` | same (gig checkout) |
| `/checkout/{uid}/project` | `/checkout/project/{pid}` | 301 (lookup of the legacy project uid; to confirm spec 11) |
| `/checkout/{uid}/offer` | `/checkout/offer/{offerUid}` | 301 (to confirm spec 12) |
| `/subscription/subscribe/{planSlug}?period=` | `/subscription/checkout?plan=premium&period=month|year` | 301 |
| `/account/settings`, `/account/password`, `/account/sessions`, `/account/verification`, `/account/cards`, `/account/billing`, `/account/my-subscription`, `/account/referrals`, `/account/favorite`, `/account/deposit` | same | same |
| `/account/deposit/history` | `/account/transactions` | 301 (spec 05 AC-31 replaces the deposit history) |
| `/account/profile` (404 today) | `/account/profile` | now exists (spec 02 P-23) |
| `/account/orders` | `/account/orders` | same |
| `/account/orders/requirements?orderId=&itemId=` | `/account/orders/{itemUid}` | 301 (item looked up by legacy ids) |
| `/account/orders/files?orderId=&itemId=` | `/account/orders/{itemUid}` | 301 |
| `/account/reviews` | `/account/reviews` | same |
| `/account/reviews/create/{itemId}` | `/account/reviews/create/{itemUid}` | 301 when the legacy numeric id is given |
| `/account/reviews/edit/{id}` | `/account/reviews/{reviewId}/edit` | 301 |
| `/account/refunds` | `/account/refunds` | same (to confirm spec 13) |
| `/account/refunds/request/{id}`, `/account/refunds/details/{id}` | `/account/refunds/{refundUid}` (request form: `/account/orders/{itemUid}/refund`) | 301 |
| `/account/projects` | `/account/projects` | same |
| `/account/projects/payments/{id}`, `/payments/{id}/create`, `/milestones/{id}` | `/account/projects/{pid}` (the payment is part of the project page, Q-034; milestones removed X-01) | 301 (to confirm spec 11) |
| `/account/projects/checkout/{id}` (promotion) | `/account/projects` | 301 (X-03) |
| `/account/projects/edit/{id}` | `/account/projects/{pid}/edit` | 301 |
| `/account/projects/files` | `/account/projects` | 301 |
| `/account/project-refunds/request/{id}`, `/details/{id}` | `/account/refunds/{refundUid}` | 301 (one refund list, Q-037; to confirm spec 13) |
| `/account/offers` | `/account/offers` | same (to confirm spec 12) |
| `/seller/home` | `/seller/home` | same |
| `/seller/gigs`, `/seller/gigs/analytics/{id}`, `/seller/gigs/edit/{id}` | `/seller/gigs`, `/seller/gigs/{gigUid}/analytics`, `/seller/gigs/{gigUid}/edit` | 301 for the id forms |
| `/seller/reviews`, `/seller/reviews/details/{id}` | `/seller/reviews`, `/seller/reviews/{reviewId}` | 301 for details |
| `/seller/orders` | `/seller/orders` | same |
| `/seller/orders/details/{id}`, `/deliver/{id}`, `/requirements/{id}` | `/seller/orders/{itemUid}` | 301 |
| `/seller/portfolio`, `/create`, `/edit/{id}` | `/seller/portfolio`, `/seller/portfolio/create`, `/seller/portfolio/{uid}/edit` | 301 for edit |
| `/seller/earnings` | `/seller/earnings` | same |
| `/seller/withdrawals`, `/settings`, `/create` | same | same |
| `/seller/refunds`, `/seller/refunds/details/{id}` | `/seller/refunds`, `/seller/refunds/{refundUid}` | 301 for details |
| `/seller/unblock-requests`, `/create/{uid}/{type}` | `/seller/unblock-requests`, `/seller/unblock-requests/new?item={itemUid|pid}` | 301 (to confirm spec 13) |
| `/seller/projects`, `/seller/projects/deliver/{id}`, `/milestones/{id}` | `/seller/projects`, `/seller/projects/{pid}` | 301 (X-01) |
| `/seller/projects/bids`, `/bids/edit/{id}` | `/seller/proposals`, `/seller/proposals/{proposalUid}/edit` | 301 (to confirm spec 11) |
| `/seller/projects/bids/checkout/{id}` (bid upgrade) | `/seller/proposals` | 301 (X-04) |
| `/seller/offers` | `/seller/offers` | same |
| `/inbox` (Chatify) | `/inbox` | same (to confirm spec 08) |
| `/inbox/{id}` (Chatify: `id` = the other user's legacy id) | `/inbox/{conversationId}` | 301 by lookup (legacy user id → direct conversation with that user; unknown → `/inbox`) |
| `/messages`, `/messages/{conversationId}` (old chat, X-11) | `/inbox` | 301 |
| `/messages/new/{username}` | `/inbox/u/{username}` | 301 (opens or starts the chat) |
| `/restricted` | `/restricted` | same |
| `/auth/login`, `/auth/register`, `/auth/verify`, `/auth/request`, `/auth/password/reset`, `/auth/password/update` | same | same (`noindex`) |
| `/auth/{google,facebook,github,linkedin,twitter}` and `/callback` | same paths | kept so provider redirect URIs registered for the legacy site stay valid; the web page forwards the code to the API (ADR-002) |
| `/auth/logout` (GET) | `/auth/logout` | shows a confirmation page; the logout itself is a POST (no state change on GET) |
| New pages (no legacy URL) | `/account/transactions`, `/account/points`, `/account/orders/{itemUid}`, `/seller/orders/{itemUid}`, `/payments/{paymentId}/result`, `/inbox/{conversationId}`, `/subscription/checkout` | – |

## 6. Removed, technical and admin URLs
| Legacy URL | New behaviour | Reason |
|---|---|---|
| `/callback/*` (29 foreign gateways) | **410 Gone** | X-07 |
| `/success`, `/fail` (legacy BOG return, `?key=&type=`) | **302** → `/payments/legacy-return` (informational page: "check your orders or wallet"; changes nothing) | R-004; only payments started on the old site before cutover can still arrive here |
| `/update`, `/tasks/queue`, `/tasks/schedule`, `/te`, `/install/*` | **404** (not routed) | R-010, R-011, X-20 |
| `/livewire/*`, `/api/user` | 404 | the new API is `/api/v1` |
| `/uploads/documents/{uid}` (public gig documents) | **301** to the public media URL of the migrated document | R-G11 |
| `/uploads/restrictions/…`, `/uploads/requirements/…`, `/uploads/delivered/…`, `/uploads/verifications/…`, `/uploads/offers/…`, `/uploads/project-delivered/…` | **410 Gone** | private files are only served through signed links from their item pages (ADR-009, R-039) |
| `/dashboard`, `/dashboard/*` (legacy admin) | **301** → `https://admin.mytask.ge/` (root, no deep mapping) | Q-088, X-17 |
| `/console`, `/console/*` (Filament) | **301** → `https://admin.mytask.ge/` | X-17 |
| `admin.mytask.ge/*` | staff panel only: `X-Robots-Tag: noindex, nofollow`, its own `robots.txt` with `Disallow: /`, never linked from the public site | ADR-010 |

## 7. BOG return and mobile deep links
### 7.1 Return URLs sent to BOG (ADR-004, spec 05 AC-11)
When the API creates a BOG order it sets the redirect URLs from `payments.return_client` and the payer's locale:
| Client | Success / fail redirect | What happens |
|---|---|---|
| Web | `https://mytask.ge/payments/{paymentId}/result` (English: `/en/payments/{paymentId}/result`) | The page polls `GET /api/v1/payments/{paymentId}` (processing → success / failed / expired). It never changes state; any `status` in the query string is ignored. |
| Mobile app | `https://mytask.ge/app-return/payments/{paymentId}` | A tiny https "bounce" page that immediately redirects to the app scheme `mytask://payments/{paymentId}/result`. The app opens the BOG page with `expo-web-browser` `openAuthSessionAsync(bogUrl, "mytask://payments/")`, so the in-app browser (ASWebAuthenticationSession / Chrome Custom Tabs) closes as soon as the scheme URL loads, and the app shows its result screen, which polls the same API. An https URL is used towards BOG in case BOG accepts only https redirect URLs (the lead developer confirms, Q-087); if the app is not installed, the bounce page shows a "return to MyTask" link and the web result. |
| Subscriptions and saved cards | same URLs | the result screen shows the new Premium status (spec 09 AC-5/AC-7). S-126 OFF hides card purchase in the app only. |

The callback URL for BOG is `https://mytask.ge/api/v1/webhooks/bog` (not a page).

**Social-login return for the apps (ADR-002 §7, SEC-09; added 2026-09-30).** The apps register `https://mytask.ge/app-return/auth/{provider}` (with `{provider}` = `google`, `facebook`, `github`, `linkedin`, `twitter`) as the OAuth redirect URI wherever the provider accepts https. It is covered by the verified App Link claim `/app-return/*` (§7.2), so only the MyTask app (or, without the app, the browser) can receive it; a custom scheme is used only for a provider that refuses https redirect URIs. If the app is not installed, the page shows a "open the MyTask app" notice and never processes the code. The web callback pages `/auth/{provider}/callback` stay as in §5. `noindex`, disallowed in robots.txt like the rest of `/app-return/`.

### 7.2 App links (universal links / Android App Links)
- `https://mytask.ge/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (served from the web app's `public/`, ADR-013) claim these paths, with and without `/en`: `/service/*`, `/project/*`, `/profile/*`, `/inbox/*`, `/account/orders/*`, `/seller/orders/*`, `/account/projects/*`, `/seller/projects/*`, `/account/offers*`, `/seller/offers*`, `/payments/*/result`, `/app-return/*`, `/auth/password/update` (password reset link, spec 01 AC-33, AC-34) and `/auth/verify` (email verification link, spec 01 AC-7) (both added 2026-10-01, spec 01 screens table; the Android filter is in the app since tasks 3.10/3.11, iOS follows with the Phase 6 `.well-known` files).
- Custom scheme `mytask://` mirrors the same paths without the host (`mytask://service/{slug}`, `mytask://payments/{id}/result`). It is used for the BOG return and push notifications.
- Push notifications carry `notifications.target_path` (locale-free); the app opens the matching screen.
- Emails use https links (they open the app when installed, the website otherwise), with the recipient's locale prefix.

## 8. hreflang and canonical
| Page type | Canonical | hreflang alternates | Robots |
|---|---|---|---|
| Home, category pages, `/sellers`, `/explore/projects…`, `/hire/{kw}`, `/subscription`, `/help/contact`, `/gita` | self (clean path + `?page=N` when N > 1; filters and sort removed, spec 03 AC-37) | `ka` → unprefixed, `en` → `/en/…`, `x-default` → unprefixed | index, follow |
| Filtered or sorted list variants | the unfiltered page (same language, same page number) | same as the unfiltered page | index, follow (canonical consolidates) |
| `/search?q=…` | `/search` | ka/en/x-default of `/search` | **noindex, follow** |
| Gig, project, blog article, CMS page **with** an English translation | self | `ka`, `en`, `x-default` (= ka) | index |
| Gig, project, blog article, CMS page **without** English content (the `/en/` page shows Georgian text, Q-023) | the **Georgian** URL | only `ka` and `x-default` on the Georgian page; the `/en/` page is not listed as an alternate | the `/en/` page: `noindex, follow` (it still returns 200 for users; this avoids duplicate content until AI translation fills English) |
| Profile, portfolio | self | ka/en/x-default (the UI is translated; the user text is the same) | index |
| `/reviews/{gigUid}` | self | ka/en/x-default | noindex, follow |
| Auth, cart, checkout, account, seller, inbox, payments, create, restricted, redirect | – | – | noindex, nofollow (and `Disallow` in robots.txt, §9) |

"Has an English translation" means the entity's `en` translation row exists with the required fields (title and description) filled, regardless of `source` (`human` or `machine`). The API returns `contentLocale`; the web builds canonical and hreflang from it.

## 9. Sitemap and robots.txt (Q-025, S-116, ADR-008 §6)
- `/sitemap.xml` is a **sitemap index**; the parts are Next.js route handlers that read keyset-paginated data from the API and are cached for 1 hour (revalidated when content changes). No per-minute regeneration (R-042).
- Parts (each at most 10,000 URLs, well under the 50,000 limit):
  | File | Contents |
  |---|---|
  | `/sitemaps/static.xml` | home, `/sellers`, `/explore/projects`, `/subscription`, `/help/contact`, `/blog`, `/gita` (+ English) |
  | `/sitemaps/pages.xml` | active CMS pages |
  | `/sitemaps/categories.xml` | all three gig category levels, project categories and project category/skill pages |
  | `/sitemaps/gigs-{n}.xml` | active gigs of listable owners (spec 03 R-S1) |
  | `/sitemaps/projects-{n}.xml` | projects with status active or completed (to confirm spec 10) |
  | `/sitemaps/profiles-{n}.xml` | active/verified users with at least one active gig or one visible review |
  | `/sitemaps/hire.xml` | skill slugs that have at least one listable user |
  | `/sitemaps/blog.xml` | published articles |
- Each `<url>` lists the Georgian URL with `<lastmod>` (entity `updated_at`) and `<xhtml:link rel="alternate" hreflang="ka|en|x-default">`. English URLs are listed only when English content exists (§8).
- S-116 OFF → `/sitemap.xml` returns 404 and robots.txt omits the `Sitemap:` line.
- `robots.txt` (mytask.ge):
  ```
  User-agent: *
  Disallow: /account/
  Disallow: /seller/
  Disallow: /en/account/
  Disallow: /en/seller/
  Disallow: /cart
  Disallow: /checkout
  Disallow: /inbox
  Disallow: /payments/
  Disallow: /app-return/
  Disallow: /api/
  Disallow: /redirect
  Sitemap: https://mytask.ge/sitemap.xml
  ```
  (`/en/…` variants of the other private paths are listed the same way in the real file.)

## 10. Implementation notes
- Redirects run in the Next.js middleware of `apps/web` from one rules table (this document), plus two API look-ups: gig by uid (canonical slug) and legacy id → new id for dashboard deep links (`GET /api/v1/redirects/resolve?legacyPath=…`, defined in P2-B4). Look-ups are cached.
- Every 301 in §2–§6 gets an automated test (Playwright request tests) with the legacy URL and the expected target; the list of real legacy URLs for the test comes from the production sitemap-like crawl plus the ~250 live category URLs (routes-and-pages "Live-only").
- Notification links stored in migrated `notifications` are rewritten to the new paths during migration (data-model §12.2).
- Social-provider callback paths are unchanged (§5), so provider apps need no reconfiguration if their keys are re-entered (Q-032).
