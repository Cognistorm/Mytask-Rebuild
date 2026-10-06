# 4.1.17 Web: public profile + portfolio list/item

From: web-engineer · To: mobile-engineer (4.1.23/4.1.24), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27),
web-engineer (4.1.18+), devops-engineer (note below) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Spec 02 AC-8…AC-13, AC-18 (About me folding), AC-28, AC-42 (owner view), EC-4, EC-10 on the web, after design
`components.md` §7.4 ProfileCard, §7.7 Avatar, §7.8 RatingSummary, §5.14 Chip, §7.6 Pill, §8.1 Dialog, audit §3.6,
and the legacy views `livewire/main/profile/{profile,portfolio,project}.blade.php` (layout and order kept).

- **Server-rendered public pages** under `app/[locale]/(public)/` (in the AC-73 allow-list, `src/lib/zones.ts`):
  - `/profile/{username}`: left card (avatar with online dot, the name as the page's only `h1`, `@username`,
    online/offline text, headline, "Edit profile" for the owner or "Contact me", "Share profile", local time, last
    delivery when set, member since, verifications (ID, email), languages with level, linked accounts when the API
    sends them (S-123)); main column (availability notice, two rating blocks "As a freelancer" / "As a client" with
    5→1 breakdown or "No reviews yet", About me with More/Less, portfolio preview of 6 with "View my portfolio",
    skill chips → `/hire/{slug}` with the level in the accessible name). Hidden users → real HTTP 404 (AC-9).
    `noindex, follow` when `isIndexable` is false (spec 17 AC-41). Title `<username> | <site>` (legacy).
  - `/profile/{username}/portfolio`: owner box (avatar, username, verified mark, headline, Contact me, View
    profile), `h1` "{username} portfolio", grid of 24 with "Load more" (cursor, browser call), empty
    `t_no_portfolio_yet`.
  - `/profile/{username}/portfolio/{slug}`: thumbnail, title, Watch video / Live preview (external,
    `rel="noopener noreferrer nofollow ugc"`), gallery, description, "Share this project", owner box. Old title slug
    → permanent redirect to the current slug by uid (url-map §4.3); a username that is not the owner's → 404.
    Owner of a pending item: `t_portfolio_pending_review` note; rejected: "Rejected" pill +
    `t_portfolio_rejected_reason` with the reason; both `noindex, nofollow`, no share button.
- **Viewer-dependent server render** (`src/lib/api.ts` `viewerApi`): the page calls the API with
  `Authorization: Bearer` from the `__Host-mt_at` cookie (ADR-002 §2), so the owner gets "Edit profile", the empty
  gigs block and their pending/rejected works (marked) in the preview. An expired access cookie = guest view; when
  the browser has the device cookie (signed in before), `SessionRefresh` calls `getMe` once (the API client
  refreshes) and re-renders the page. The visitor IP is passed (`X-MyTask-Visitor-IP` + `X-MyTask-Service-Auth`)
  only when Caddy's `X-MyTask-Client-IP` is present and `INTERNAL_SERVICE_TOKEN` is set (ADR-013 §17), so guest
  SSR calls do not share one rate-limit bucket.
- **Contact me**: signed in → `/inbox/u/{username}` (url-map §5, chat comes with slice 8); guests →
  `/auth/login?next=…` (AC-11). Links into private pages are plain `<a>` (full page load, ADR-019 §2).
- **CSP**: `img-src` now includes the origin of `PUBLIC_MEDIA_BASE_URL` (`mediaOrigin` in `src/lib/csp.ts`);
  before this, every avatar and portfolio image from the media CDN would have been blocked.
- **Shared components in `@mytask/ui/web`** (`packages/ui/src/web/profile.tsx` + `profile.css`, tokens only):
  `Avatar` (image or initial, broken-image fallback, online dot), `OnlineStatus`, `RatingStars` (tenths, partial
  stars), `RatingSummary`, `ChipLink`, `Pill`, `ExpandableText` (toggle only when the text is cut), `Dialog`
  (native `<dialog>`: focus kept inside, Esc, backdrop click, focus returns; bottom sheet below `md`).
- `href()` moved to `src/lib/href.ts` so server components can use it (`lib/client.ts` re-exports it);
  `pageTitle(locale, text)` added to `lib/page-title.ts`; `formatDateOnly` (`15.10.2026`) in `lib/format.ts`.

## Files created/changed
- `apps/web/src/app/[locale]/(public)/profile/[username]/page.tsx`, `portfolio/page.tsx`,
  `portfolio/[slug]/page.tsx` (new)
- `apps/web/src/components/profile/data.ts`, `parts.tsx`, `client.tsx`, `profile.css` (new)
- `apps/web/src/lib/api.ts` (`viewerApi`), `href.ts` (new), `client.ts`, `csp.ts`, `format.ts`, `page-title.ts`,
  `zones.ts`; `apps/web/src/proxy.ts`
- `packages/ui/src/web/profile.tsx`, `profile.css` (new); `packages/ui/src/web/index.ts`
- `apps/web/e2e/profile.spec.ts` (new, 13 tests), `e2e/fake-profiles.mjs` + `.d.mts` (new server-side fixtures),
  `e2e/fake-api.mjs`, `playwright.config.ts` (`PUBLIC_MEDIA_BASE_URL`)
- `packages/i18n/en.json`, `ka.json`: 1 NEW key `t_profile_no_gigs_yet` ("You have no gigs yet." /
  "თქვენ ჯერ არ გაქვთ განცხადებები.")
- `.env.example`: comment that the web reads `PUBLIC_MEDIA_BASE_URL`

Checks: web E2E 65 passed / 3 skipped (the full-stack ones), repo typecheck + lint 10/10, i18n check, Prettier clean,
`next build` OK.

## What the next agent must do
- **Web 4.1.18:** "Edit profile" points at `/account/profile`. **4.1.19:** the owner's empty portfolio links to
  `/seller/portfolio/create`. **4.1.20:** add "Report user" to the profile card (`canReport`; guests
  `t_u_must_login_to_report_this_profile`) — the `Dialog` component is ready for the report modal.
- **Mobile 4.1.23/4.1.24:** same data and keys; reuse the rating block rules (average = `averageTenths / 10` with
  one decimal, breakdown 5→1, empty `t_no_reviews_yet`), the guest rule (`!isOwnProfile && !canReport`), and the
  skill/language level keys (`pro` → `t_expert`).
- **QA:** `e2e/profile.spec.ts` covers AC-8…AC-11, AC-13, AC-28, AC-42 (owner), EC-4, EC-10, spec 17 AC-41 on
  routed data. Full-stack check with `pnpm local`: open `/profile/<your username>` signed in and signed out.
- **Security 4.1.27:** please look at `viewerApi` (Bearer from the cookie on SSR; visitor IP forwarded only from
  Caddy's `X-MyTask-Client-IP` — the web must stay reachable only through Caddy, ADR-013 §15) and the external
  links of linked accounts and portfolio items (rendered directly with `nofollow ugc noopener noreferrer`; the
  legacy `redirect?to=` interstitial is not built).
- **DevOps:** `docker-compose.yml` (reference for CI/deploy) gives the `web` service no `PUBLIC_MEDIA_BASE_URL`;
  add it next to `S3_PUBLIC_ENDPOINT` so the CSP allows CDN images there. `pnpm local` already passes the root `.env`.

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Redirect status:** Next.js `permanentRedirect` answers **308**, url-map rule 3 says 301. Both are permanent for
  search engines; the test accepts either. If 301 is required, it needs a route handler or the proxy (same issue for
  gig slugs in slice 3).
- `t_verifications` is still English in `ka` ("Verifications"; design §7.4 wants a Georgian heading) — for the
  Owner's text pass, with `t_basic` (spec 02 note).
- Not built here (by plan): Report user (4.1.20), the gigs list (slice 3, D2), "Request an offer" (slice 11; the API
  sends `canRequestOffer: false`), the screen-reader currency word, a branded 404 page (default Next 404 for now),
  canonical/hreflang tags (slice 16), the site header/footer (no public header exists yet).
- Nav/links to pages of later slices (`/inbox/u/…`, `/hire/…`, `/create`, `/account/profile`) answer 404 until
  those tasks build them.
