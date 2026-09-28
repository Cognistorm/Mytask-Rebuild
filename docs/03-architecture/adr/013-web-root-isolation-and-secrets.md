# ADR-013: Web-root isolation and secrets management
Date: 2026-09-28 | Status: proposed

> **Revised 2026-09-28** to match Owner decision Q-085: keep the S-110 custom HTML/JS setting, restricted strictly to the Super-admin and to public pages (e.g. analytics tracking scripts). Also records Q-086 (legacy keys rotated during the final production deployment) and Q-088 (`admin.mytask.ge`). Changed: Context, Decision §7 and §12, Consequences.

## Context
- Legacy deploys the whole project into `public_html` with `index.php` at the root; files that exist are served directly by Apache, so `.env`, `error_log`, `composer.json` could be reachable (R-021; Owner reports `.env` is not downloadable, Q-054). `error_log` in the repo exposes DB user and server paths.
- Public maintenance endpoints: `/update` (R-010), `/tasks/queue`, `/tasks/schedule`, `/te` (R-011). Web log viewer.
- Hard-coded secrets: BOG (R-001), Binance (R-002), Pusher and findip (R-003). Many credentials stored in plain DB columns.
- `Access-Control-Allow-Origin: *` on every response (R-022).
- Owner: all keys strictly in `.env` (Q-042); strict web-root isolation — only the public folder is web-served, logs and config never reachable, logs viewable inside the admin panel (Q-054); remove the Binance bot and keys (Q-041); social-login keys configurable in admin (Q-032); keep S-110 custom code for the Super-admin on public pages only (Q-085); rotate the BOG, Pusher and database keys during the final production deployment (Q-086). CLAUDE.md rule 8: secrets never in files; `.env` git-ignored; `.env.example` lists names only.

## Decision
### Web-root isolation
1. **Containers, one entry point.** Every process runs in its own container. Only the reverse proxy (Caddy) publishes ports 80/443. API, worker, web, admin, PostgreSQL, Redis, ClamAV and MinIO are on internal Docker networks; the database and Redis are on a network the web/admin containers are not attached to.
2. **Nothing from the repository is served as files.** Caddy has no `file_server` for any project path; it reverse-proxies to the Next.js servers and the API. Next.js (`output: standalone`) serves only its compiled assets (`/_next/static`) and its `public/` folder (images, fonts, `robots.txt`, `.well-known` files for app links). The API serves no static files. Production images contain only build output (multi-stage Docker builds): no `.env`, no source maps publicly served (uploaded to error tracking privately), no `.git`, no tests.
3. **Hardening.** Containers run as non-root, with read-only root filesystems where possible and dropped Linux capabilities. Logs go to stdout/stderr (Docker log driver with rotation), never to files under an app directory. Warnings/errors are also stored in the `system_log` table for the admin log page (`system.logs.read`), with secrets redacted by the logger.
4. **No maintenance over HTTP.** No self-updater, installer, HTTP cron, debug route or web log viewer (X-20). Database migrations run in the deploy script (`prisma migrate deploy`) before the new API version starts. Debug features are compiled out of production builds; `NODE_ENV=production` disables stack traces in error responses (clients get `code`, `message`, request id).
5. **HTTP security headers** (Caddy + Next.js): HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (except where BOG requires otherwise), a strict Content-Security-Policy with nonces on web and admin. Request body size limits at the proxy (uploads go directly to storage, ADR-009).
6. **CORS.** Web and admin call the API on their own origin, so production CORS is an empty allow-list (fixes R-022). Local development allows `http://localhost:*` only when `NODE_ENV=development`. Mobile apps do not need CORS.
7. **S-110 custom code is kept (Q-085), fenced in:**
   - **Who:** only the Super-admin role can read or write S-110 (permission `settings.custom_code.write`, which is not grantable to other roles). Every change is audit-logged with old and new values (AC-8) and needs re-authentication (ADR-010 §2).
   - **Where it renders:** only on **public** pages of `apps/web` (home, categories, gigs, projects, profiles, CMS, blog, search, subscription). It never renders on login/register, account and seller dashboards, cart, checkout, payment result, inbox, the restrictions page, the mobile app, or `admin.mytask.ge`. Slots: head and footer per public layout (legacy parity).
   - **CSP:** public pages send a CSP whose `script-src` / `connect-src` / `img-src` / `frame-src` include only the hosts listed in a companion Super-admin setting (`appearance.custom_code.allowed_hosts`, part of S-110), plus nonces for our own scripts. Pages without custom code keep the strict CSP. Inline scripts from S-110 get the page nonce at render time.
   - **Storage:** stored as text; never interpolated into API responses for the mobile app.
   - The security review (P2-B5) checks this fence; the risk that a compromised Super-admin account can inject scripts on public pages is accepted by the Owner (Q-085) and mitigated by staff 2FA (S-060), re-authentication and the audit log.

### Secrets
8. **Where secrets live.** All secrets are environment variables loaded from `.env` (git-ignored) locally and from the host's secret store in staging/production (Docker Compose `env_file` with file permissions 600 owned by root, or Docker secrets). `.env.example` lists every variable **name** with a comment, no values. Initial names: `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `SETTINGS_ENCRYPTION_KEY`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_KYC`, `PUBLIC_MEDIA_BASE_URL`, `BOG_API_BASE_URL`, `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, `BOG_CALLBACK_PUBLIC_KEY`, `BOG_CALLBACK_URL`, `SENDGRID_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `SMTP_URL` (local Mailpit), `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `EXPO_ACCESS_TOKEN`, `GEOIP_LICENSE_KEY`, `SENTRY_DSN_*`, `CLAMAV_HOST`, `APP_URL`, `ADMIN_URL`. (Final list in Phase 3 `.env.example`.)
9. **Validation at boot.** A zod schema validates all variables when each process starts; missing or malformed secrets (e.g. a too-short encryption key) stop the process with a clear message naming the variable (never its value).
10. **In-database secrets** only for social-login provider keys (Q-032, S-065…S-069): AES-256-GCM encrypted with `SETTINGS_ENCRYPTION_KEY`, write-only via the API (ADR-005).
11. **Scanning.** gitleaks runs as a pre-commit hook and in CI on every push; a finding fails the build. The logger redacts known secret fields (`authorization`, `cookie`, `password`, `code`, `*_secret`, `token`).
12. **Legacy secrets.** The new code never contains or reuses legacy key values. Owner decision (Q-086): the BOG, Pusher and database keys are rotated **during the final production deployment**; the Binance bot and key are removed (Q-041) and findip is dropped (Q-055), which revokes their keys. Until then the old keys remain in every copy of the legacy code (accepted risk). The list: BOG client credentials (R-001), Binance API key (R-002, and remove the bot from the legacy server), Pusher app secret and findip key (R-003; both services are not used by the new system, so revoking is enough). Also change the legacy DB password exposed in `error_log`.
13. **Rotation.** JWT signing keys and the settings-encryption key carry a key id so a new key can be introduced while old tokens/ciphertexts remain readable during the transition.

## Alternatives considered
- **Shared hosting / cPanel like legacy** — cannot run Node.js services, Redis and workers reliably and invites the same web-root mistakes. Rejected.
- **Secrets manager service (Vault, Doppler, AWS Secrets Manager)** — good for teams; for one Owner with one server, a root-only env file is enough. Can be adopted later without code changes (still env vars).
- **Secrets in the database for everything (legacy style)** — mixes credentials with data and backups. Rejected except for the Owner's social-login exception.

## Consequences
- Easier: there is no path from a URL to a config or log file; secrets are in one place; leaks are caught before commit.
- Harder: deployment needs Docker and a small deploy script (ADR-015); the admin log page shows warnings/errors, not every debug line.
- S-110 needs a list of allowed script hosts next to the code slots (`appearance.custom_code.allowed_hosts`); the product-analyst adds it to the S-110 register row in spec 16/17 (handoff).
- Must change: Phase 3 creates `.env.example`, the Caddyfile, Dockerfiles and the gitleaks hook; the Owner schedules key rotation before cutover (handoff).
