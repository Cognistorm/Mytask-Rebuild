# ADR-012: Analytics without third-party IP geolocation
Date: 2026-09-28 | Status: proposed

> **Revised 2026-09-30** (P2-B5, SEC-01): the client IP and edge country come only from Caddy's canonical headers or the internal service credential (ADR-013 §14–§19).

## Context
- Vision: custom admin dashboard analytics — registration trends, country/city, device types, browsers.
- Legacy: tracker middleware sends every visitor IP to findip.net (hard-coded key, R-003) and ip-api.com over plain HTTP for gig visits (R-040); UA parsing with jenssegers/agent, matomo device-detector, snowplow referer-parser; `tracker_*` tables (`integrations.md`, features N).
- Owner: drop findip.net and ip-api.com completely (Q-055); logs only visible in admin (Q-054).
- Privacy: raw IPs are personal data; storing less is safer.

## Decision
1. **First-party collection only.**
   - Web: Next.js middleware/server records a page view (path template, locale, referrer domain, UTM, user id if logged in) by calling an internal API endpoint asynchronously (no third-party script, no cookie banner needed for this first-party, minimal data; the Owner's legal text decides).
   - Mobile: the app posts `app_open` and `screen_view` events to `POST /api/v1/analytics/events` (batched).
   - Server events: registration, login, gig view, project view, order paid, etc. are emitted by the API itself (more reliable than client events).
2. **Enrichment on our server.**
   - User agent → device type, OS, browser with a maintained local library (e.g. `ua-parser-js`, or Matomo device-detector's JS port); bots filtered.
   - IP → country and city with a **local GeoIP database file** loaded in memory: MaxMind GeoLite2 City (free licence key in `.env`, weekly update job, attribution shown in the admin analytics page) or DB-IP Lite (CC BY 4.0, no key) as an alternative. If production runs behind Cloudflare, Cloudflare's country can be used without any lookup, but only as `X-MyTask-Client-Country`, which Caddy sets from `CF-IPCountry` for Cloudflare peers only; the API never reads `CF-*` headers itself. The IP used here, and the visitor IP forwarded by the Next.js server for page views, follow the normative client-IP rules of ADR-013 §14–§19 (SEC-01).
   - No IP is ever sent to an external service.
3. **Storage minimisation.** Raw events keep country, city, device, browser, OS, referrer domain, path template, user id (if any) and a **daily-salted hash of the IP** (for unique-visitor counts; the salt rotates daily and old salts are deleted, so hashes cannot be linked across days). Raw events are kept 90 days (spec 16 may change it), then only daily aggregates remain.
4. **Aggregation.** Worker rollups (hourly/nightly) into `analytics_daily` tables (by date × dimension). The admin dashboard reads aggregates through `/api/v1/admin/analytics/*` (permission `analytics.read`).
5. **Legacy data.** Legacy `tracker_*` data may be imported as aggregates only (P2-B2 decides), not raw IPs.
6. **Error tracking** (Sentry-compatible, ADR-015) is configured to not send IP addresses.

## Alternatives considered
- **Keep findip/ip-api** — the Owner dropped them (Q-055).
- **Google Analytics / third-party analytics** — sends visitor data to a third party and needs consent handling; the Owner wants custom admin analytics. Can be added by the Owner through S-110 custom code if ever wanted (their decision).
- **Self-hosted Plausible/Umami/Matomo** — good products, but another service and database; our needs (registrations, geo, device, browser) are small and tie into user data we already have.
- **No geo at all** — the vision asks for country/city.

## Consequences
- Easier: no external calls, no leaked keys, privacy-friendlier, works offline locally.
- Harder: a GeoIP file must be updated weekly (job) and its licence respected; city accuracy of free databases is moderate (fine for trends).
- Must change: data-model.md adds `analytics_events` and aggregate tables; spec 16 defines dashboard widgets and retention; `.env.example` adds `GEOIP_LICENSE_KEY` (name only).
