# 4.3.5b Gig page visits: `recordGigView`

From: backend-engineer · To: backend-engineer (4.3.5c), web-engineer (4.3.11/4.3.12), mobile-engineer (4.3.14), product-analyst (spec note), devops (Phase 6), QA + Security (info) · Date: 2026-10-07

## What I did
- **Owner decision Q-182 (a), 2026-10-07.** A visit counts **once per visitor per Tbilisi day and gig**.
  - Legacy (`legacy/APP/app/Jobs/Main/Service/Track.php`) counted once ever per IP + user agent. That needs stored IPs, which Q-055 / ADR-012 forbid.
  - Recorded in `docs/01-discovery/open-questions.md`.
- **`POST /gigs/{gigId}/views` (`recordGigView`, spec 04 AC-34)**, controller → `GigViews` (`apps/api/src/modules/gigs/gig-views.service.ts`). Optional sign-in. Optional body `{ referrer }`.
- **On the request (`accept`):**
  - The visibility is checked exactly as `getGig`. `GigPages.visible` is now public and also used by `listRelatedGigs`. Hidden gigs → 404.
  - Then 202 with no body.
  - The owner's own views are not recorded. Neither are bots (`isbot`); a request without a user agent counts as a bot.
  - The 429 comes from the global write limit (120 per IP per minute).
- **After the answer (`record`).** It runs in the API process. Running recordings are tracked (`idle()`) and drained before shutdown. A failure is logged and never reaches the visitor.
  - **Visitor.** HMAC-SHA256 of the IP (IPv6 by its /64, `ipBucket`) and the user agent. The key is a random salt per Tbilisi day, kept in Redis for 2 days only, so hashes cannot be linked across days. The IP is never stored.
  - **Once per day.** A Redis `SET NX` mark per gig, day and visitor (26 h). A repeat on the same day records nothing.
  - **One transaction:**
    - an `analytics_events` row (`gig_view`, platform, `/service/{slug}`, locale, user id, visitor hash, country, city, device, browser, OS, referrer domain);
    - `gigs.visits_count` + 1, in raw SQL so the gig's `updated_at` does not move;
    - `analytics_daily` upserts with metric `gig_view` and entity `gig`/id. The dimensions:
      - `total` (value `''`);
      - `device` (`desktop`, `mobile`, `tablet`, …), `browser` and `os`: names without versions, as legacy listed them, `unknown` when not detected;
      - `referrer` (domain), `country` (ISO code) and `city` (English name): only when known, as legacy listed only known values.
      - `count` and `uniques` both + 1; every counted visit is a daily unique.
  - **Device for the app.** For app clients with a bare user agent, the client kind fills in the device (`mobile`) and the OS (`iOS`/`Android`).
- **Local GeoIP** (`apps/api/src/platform/geoip/geoip.ts`, global `GeoIpModule`).
  - Reads an MMDB city file into memory on the first lookup (`maxmind`): DB-IP City Lite or MaxMind GeoLite2 City.
  - Without `GEOIP_CITY_DB_PATH`, or when the file is missing or unreadable, every answer is null. So tests and fresh setups need no download.
  - Never a third-party lookup.
  - Checked against the real DB-IP file (2026-10):
    - `31.146.10.10` → GE / Tbilisi;
    - `8.8.8.8` → US / Mountain View;
    - an IPv6 address → DE / Frankfurt am Main;
    - private addresses and non-IPs → null.
- **Download script.** `pnpm --filter @mytask/api geoip:download` (`apps/api/scripts/geoip-download.mjs`). It saves this month's DB-IP City Lite (or last month's) to `.local/geoip/dbip-city-lite.mmdb` (git-ignored, about 127 MB) and prints the `.env` line. `.env.example` now has `GEOIP_CITY_DB_PATH` and its explanation.
- **New dependencies.** `isbot` 5.2.2 (Unlicense) and `maxmind` 5.0.7 (MIT).
- **Tests.** New `apps/api/test/gigs-views.test.ts` (7), with a fake GeoIP. They cover:
  - once per visitor per day, with all breakdowns, the event row, the 32-byte hash, no IP in the row, and `updated_at` unchanged;
  - the next day counts again with a new hash;
  - owner, Googlebot and an empty user agent are ignored; a signed-in visitor gets their user id, platform and locale;
  - unknown place and referrer are left out;
  - 404 for a pending gig (guest), deleted and unknown gigs; the owner's view of their pending gig gives 202 without counting; 400 for a bad referrer;
  - `visitFacts` naming;
  - GeoIP null without a file.
  - Results: API **722 passed / 6 skipped**. Typecheck, lint and prettier (from the repo root) are green.

## Files created/changed
- `apps/api/src/modules/gigs/gig-views.service.ts` (new), `gigs.controllers.ts`, `gigs.module.ts`, `gig-pages.service.ts` (public `visible`)
- `apps/api/src/platform/geoip/geoip.ts` (new), `apps/api/src/app.module.ts`, `apps/api/src/platform/config/env.ts` (`GEOIP_CITY_DB_PATH`)
- `apps/api/scripts/geoip-download.mjs` (new), `apps/api/package.json` (`geoip:download`, `isbot`, `maxmind`), `pnpm-lock.yaml`, `.env.example`
- `apps/api/test/gigs-views.test.ts` (new)
- `docs/01-discovery/open-questions.md` (Q-182), `docs/ROADMAP.md` (4.3.5b ticked; 4.3.12 note), `docs/STATUS.md`

## What the next agent must do
- **4.3.5c (backend): `getGigAnalytics`.**
  - Totals: `clickCount` = `gigs.visits_count`, `impressionCount` = `gigs.impressions_count`. Sales and reviews are neutral until slices 5/6.
  - Breakdowns: sum `analytics_daily` over all days for metric `gig_view` and this gig, by dimension. Sort by count, descending.
  - Impressions from `searchGigs`: batched, with no write per card on the request path. Use metric `gig_impression` if daily rows are wanted.
  - The monthly `analytics_events` partition job (create next month, drop partitions older than 90 days).
- **Web (4.3.11).**
  - The gig page calls `recordGigView` once after it renders, from the browser, so the user agent and IP are the visitor's. Send `{ referrer: document.referrer || null }`, with `X-MyTask-Client: web` and the site origin (the CSRF rule applies to guests too).
  - Never call it from server-side rendering: the user agent and IP would be the Next.js server's.
- **Web (4.3.12).** The analytics screen must show the DB-IP credit under the country/city charts. It is a CC BY 4.0 condition: "IP Geolocation by DB-IP", linked to https://db-ip.com. The admin dashboard (spec 16) needs the same credit later.
- **Mobile (4.3.14).** Call `recordGigView` when the gig screen opens, with `referrer: null`.
- **Product-analyst.** Add Q-182 to spec 04 AC-34 as a CHANGE: once per visitor per day; legacy counted once ever.
- **Devops (Phase 6).**
  - Servers need the GeoIP file and its weekly update. Use the script's logic, or MaxMind GeoLite2 with `GEOIP_LICENSE_KEY`.
  - Set `GEOIP_CITY_DB_PATH`.
  - About 130 MB of memory per API process once the first visit is recorded.

## Open questions / risks
- **Recording in the API process, not a queue.** Visits still in flight are lost if the process crashes (a clean shutdown drains them). That is acceptable for analytics. If the volume grows, move `record` to a BullMQ job; the `accept`/`record` split already allows it.
- **Shared IPs.** Visitors behind the same IP with the same browser version on the same day count as one. City accuracy of the free database is moderate; ADR-012 accepts it.
- **Local `.env`.** The Owner's `.env` was not changed. Without `GEOIP_CITY_DB_PATH`, local visits have no country or city.
- Still open: Q-181, DEV-M1, Q-160, Q-163, Q-164 (none blocks slice 3).
