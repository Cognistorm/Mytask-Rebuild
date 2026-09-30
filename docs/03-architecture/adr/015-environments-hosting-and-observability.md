# ADR-015: Environments, hosting proposal, backups and observability
Date: 2026-09-28 | Status: proposed (hosting choice needs Owner approval before Phase 6)

> **Revised 2026-09-30** after the P2-B5 security review: §2 staging cookie isolation (SEC-15); §3 edge and client-IP rule, normative text in ADR-013 §14–§19 (SEC-01); §6 Bull Board read-only, admin host only, `system.health.read` (SEC-20).

## Context
- CLAUDE.md rule 7: local first (`docker compose up`); nothing touches production until Phase 6 with explicit Owner approval.
- Vision: affordable, high performance, one Owner, Claude-only development. Legacy runs on cPanel shared hosting (`inventory.md` §4), which cannot run the new stack.
- Legacy backup: monthly DB backup (`Kernel.php:23`). Money data needs better.

## Decision
1. **Local (Phase 3 onward).** `docker-compose.yml` services: `postgres` (17, with `pg_trgm`, `pgvector`), `redis` (7), `minio` + `minio-init` (creates the three buckets and policies), `mailpit` (SMTP + web UI), `bog-mock`, `clamav` (profile `scan`). Apps run with `pnpm dev` on the host (fast reload) or as containers with `--profile apps` (`api`, `worker`, `web`, `admin`, `caddy`). Seed script creates a Super-admin, test users (including one with a legacy `$2y$` bcrypt hash to prove ADR-002), categories and settings defaults. `docs/SETUP-LOCAL.md` (Phase 3) explains it for the Owner.
2. **Staging (Phase 5–6, after approval).** The same compose file on a small VPS (or the production VPS as a separate compose project with separate DB, buckets and keys), protected by basic auth and `noindex`, used for the migration rehearsal. **Cookie isolation (SEC-15):** preferably staging gets its own registrable domain (chosen in Phase 5); if it stays on `staging.mytask.ge` / `admin.staging.mytask.ge`, every cookie in both environments is host-only with the `__Host-`/`__Secure-` names of ADR-002 §2, staging never sets a `Domain` attribute, and staging runs only our own build (no S-110 custom code). Staging is used with a copy of production data (the Owner must provide a local copy of the production DB before Phase 5, phase-2-plan §7).
3. **Production proposal (decided in Phase 6).**
   | Part | Proposal | Rough monthly cost (2026 prices, to be re-checked) |
   |---|---|---|
   | Compute | One VPS, 4 vCPU / 8–16 GB RAM, SSD (e.g. Hetzner Cloud CPX31/CCX23 or similar in the EU, low latency to Georgia) running Docker Compose: caddy, web, admin, api (2 instances), worker, postgres, redis, clamav | ~€15–35 |
   | Object storage | S3-compatible with low/zero egress (Cloudflare R2 or Hetzner Object Storage) | ~€5 at launch volume |
   | CDN / DNS | Cloudflare free plan in front of the site and `public-media` | €0 |
   | Email | SendGrid (existing account, Q-033) | existing |
   | Push | Expo Push Service | €0 |
   | Mobile builds | EAS Build free tier or local builds; Apple Developer (~$99/yr) and Google Play ($25 once) accounts | stores' fees |
   | Error tracking | Sentry free tier or self-hosted GlitchTip | €0 |
   | Uptime | external monitor (e.g. UptimeRobot/Better Stack free tier) | €0 |
   **Edge and client IP (normative, ADR-013 §14–§19, SEC-01).** With Cloudflare in front, the origin firewall accepts 80/443 only from Cloudflare's ranges; Caddy trusts only those ranges, takes the client IP from `CF-Connecting-IP` only from them, strips every client-sent forwarding header and sets the one canonical header `X-MyTask-Client-IP`; the API trusts that header only from Caddy; the Next.js servers pass a visitor IP only with the internal service credential. Without Cloudflare, Caddy uses the TCP peer. No other "trusted proxy header" configuration exists.
   Growth path without re-architecture: move PostgreSQL to a managed service, add a second VPS for API/worker behind the proxy, move search to Meilisearch.
4. **Deployment.** GitHub Actions builds and tests on every push; on a tagged release it builds images, pushes them to a registry (GHCR), and a deploy script on the server pulls images, runs `prisma migrate deploy`, and restarts services with a health-check gate. Rollback = previous image tag (migrations written to be backwards compatible for one release: expand → migrate → contract).
5. **Backups.** Nightly `pg_dump` (compressed, encrypted with a key held by the Owner) to the object storage provider in a different bucket/region, plus continuous WAL archiving (pgBackRest or WAL-G) for point-in-time recovery of money data; retention 30 daily + 12 monthly. Object storage versioning on `private` and `kyc`. A monthly automated restore test into a scratch database.
6. **Observability.**
   - Logs: pino JSON to stdout; request id in every line and in the `X-Request-Id` response header; warnings/errors also in `system_log` for the admin page (ADR-013).
   - Errors: Sentry-compatible SDK in api, worker, web, admin and mobile; PII scrubbing; no IPs (ADR-012).
   - Health: public `/api/v1/health` (liveness only); internal readiness (DB, Redis, storage, sweepers' last run); external uptime checks on web, API and the BOG webhook path.
   - Queue dashboard (SEC-20): Bull Board runs in **read-only mode** (`readOnlyMode: true`: no retry, clean, promote or remove), is served only on `admin.mytask.ge` under the admin CSP and CSRF rules, and needs the staff permission `system.health.read` (spec 16 catalogue: "job health, queues"). Retrying work is possible only through contract operations that are audited (e.g. the email retry of spec 16 P-121).
   - Metrics: request latency and error rate per route, queue depth and failures (read-only Bull Board in admin), sweeper last-run times, payment intents pending > N minutes, reconciliation results. Alerts go to the admin recipients (S-100) by email.
7. **Performance budget** (checked in Phase 4 QA): public page TTFB < 500 ms from Tbilisi on cached pages; API p95 < 300 ms for reads; Lighthouse performance ≥ 90 on mobile for home, gig page and project page.

## Alternatives considered
- **Vercel for web + a separate host for the API** — easy web hosting, but cost grows with traffic, and the API/worker/DB still need a server; splitting hosts adds latency for SSR calls. Kept as an option, not default.
- **Kubernetes** — far too much operation for one Owner. Rejected.
- **Platform-as-a-service (Render, Railway, Fly.io)** — simple, but several paid services (web, admin, api, worker, DB, Redis) add up to more than one VPS. Option if the Owner prefers no server administration.
- **Managed PostgreSQL from day one** — safer operations, higher cost; recommended once revenue justifies it.

## Consequences
- Easier: identical environments from laptop to production; low fixed cost; clear backup and restore story for money data.
- Harder: someone must apply OS/security updates to the VPS (unattended upgrades + a monthly check).
- Must change: Phase 3 devops task creates compose, Dockerfiles, CI, `.env.example`, `docs/SETUP-LOCAL.md`; Phase 6 needs the Owner's approval of the hosting choice and budget.
