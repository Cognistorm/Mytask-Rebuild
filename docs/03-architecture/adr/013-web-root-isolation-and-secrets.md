# ADR-013: Web-root isolation and secrets management
Date: 2026-09-28 | Status: proposed

## Context
- Legacy deploys the whole project into `public_html` with `index.php` at the root; files that exist are served directly by Apache, so `.env`, `error_log`, `composer.json` could be reachable (R-021; Owner reports `.env` is not downloadable, Q-054). `error_log` in the repo exposes DB user and server paths.
- Public maintenance endpoints: `/update` (R-010), `/tasks/queue`, `/tasks/schedule`, `/te` (R-011). Web log viewer.
- Hard-coded secrets: BOG (R-001), Binance (R-002), Pusher and findip (R-003). Many credentials stored in plain DB columns.
- `Access-Control-Allow-Origin: *` on every response (R-022).
- Owner: all keys strictly in `.env` (Q-042); strict web-root isolation — only the public folder is web-served, logs and config never reachable, logs viewable inside the admin panel (Q-054); remove the Binance bot and keys (Q-041); social-login keys configurable in admin (Q-032). CLAUDE.md rule 8: secrets never in files; `.env` git-ignored; `.env.example` lists names only.

## Decision
### Web-root isolation
1. **Containers, one entry point.** Every process runs in its own container. Only the reverse proxy (Caddy) publishes ports 80/443. API, worker, web, admin, PostgreSQL, Redis, ClamAV and MinIO are on internal Docker networks; the database and Redis are on a network the web/admin containers are not attached to.
2. **Nothing from the repository is served as files.** Caddy has no `file_server` for any project path; it reverse-proxies to the Next.js servers and the API. Next.js (`output: standalone`) serves only its compiled assets (`/_next/static`) and its `public/` folder (images, fonts, `robots.txt`, `.well-known` files for app links). The API serves no static files. Production images contain only build output (multi-stage Docker builds): no `.env`, no source maps publicly served (uploaded to error tracking privately), no `.git`, no tests.
3. **Hardening.** Containers run as non-root, with read-only root filesystems where possible and dropped Linux capabilities. Logs go to stdout/stderr (Docker log driver with rotation), never to files under an app directory. Warnings/errors are also stored in the `system_log` table for the admin log page (`system.logs.read`), with secrets redacted by the logger.
4. **No maintenance over HTTP.** No self-updater, installer, HTTP cron, debug route or web log viewer (X-20). Database migrations run in the deploy script (`prisma migrate deploy`) before the new API version starts. Debug features are compiled out of production builds; `NODE_ENV=production` disables stack traces in error responses (clients get `code`, `message`, request id).
5. **HTTP security headers** (Caddy + Next.js): HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'` (except where BOG requires otherwise), a strict Content-Security-Policy with nonces on web and admin. Request body size limits at the proxy (uploads go directly to storage, ADR-009).
6. **CORS.** Web and admin call the API on their own origin, so production CORS is an empty allow-list (fixes R-022). Local development allows `http://localhost:*` only when `NODE_ENV=development`. Mobile apps do not need CORS.
7. **S-110 custom code** (admin-entered head/footer HTML/JS, legacy) conflicts with a strict CSP and is an XSS vector for anyone with that permission. Decision: keep it Super-admin only, render it only on public web pages (never in admin or dashboards), and allow-list the script hosts it needs in the CSP through a setting; the security review (P2-B5) must accept this or the Owner may drop the feature.

### Secrets
8. **Where secrets live.** All secrets are environment variables loaded from `.env` (git-ignored) locally and from the host's secret store in staging/production (Docker Compose `env_file` with file permissions 600 owned by root, or Docker secrets). `.env.example` lists every variable **name** with a comment, no values. Initial names: `DATABASE_URL`, `REDIS_URL`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `SETTINGS_ENCRYPTION_KEY`, `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_PUBLIC`, `S3_BUCKET_PRIVATE`, `S3_BUCKET_KYC`, `PUBLIC_MEDIA_BASE_URL`, `BOG_API_BASE_URL`, `BOG_CLIENT_ID`, `BOG_CLIENT_SECRET`, `BOG_CALLBACK_PUBLIC_KEY`, `BOG_CALLBACK_URL`, `SENDGRID_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `SMTP_URL` (local Mailpit), `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `EXPO_ACCESS_TOKEN`, `GEOIP_LICENSE_KEY`, `SENTRY_DSN_*`, `CLAMAV_HOST`, `APP_URL`, `ADMIN_URL`. (Final list in Phase 3 `.env.example`.)
9. **Validation at boot.** A zod schema validates all variables when each process starts; missing or malformed secrets (e.g. a too-short encryption key) stop the process with a clear message naming the variable (never its value).
10. **In-database secrets** only for social-login provider keys (Q-032, S-065…S-069): AES-256-GCM encrypted with `SETTINGS_ENCRYPTION_KEY`, write-only via the API (ADR-005).
11. **Scanning.** gitleaks runs as a pre-commit hook and in CI on every push; a finding fails the build. The logger redacts known secret fields (`authorization`, `cookie`, `password`, `code`, `*_secret`, `token`).
12. **Legacy secrets.** The new code never contains or reuses legacy key values. Before production cutover the Owner (or the host) must rotate/revoke: BOG client credentials (R-001), Binance API key (R-002, and remove the bot from the legacy server), Pusher app secret and findip key (R-003; both services are not used by the new system, so revoking is enough). Also change the legacy DB password exposed in `error_log`.
13. **Rotation.** JWT signing keys and the settings-encryption key carry a key id so a new key can be introduced while old tokens/ciphertexts remain readable during the transition.

## Alternatives considered
- **Shared hosting / cPanel like legacy** — cannot run Node.js services, Redis and workers reliably and invites the same web-root mistakes. Rejected.
- **Secrets manager service (Vault, Doppler, AWS Secrets Manager)** — good for teams; for one Owner with one server, a root-only env file is enough. Can be adopted later without code changes (still env vars).
- **Secrets in the database for everything (legacy style)** — mixes credentials with data and backups. Rejected except for the Owner's social-login exception.

## Consequences
- Easier: there is no path from a URL to a config or log file; secrets are in one place; leaks are caught before commit.
- Harder: deployment needs Docker and a small deploy script (ADR-015); the admin log page shows warnings/errors, not every debug line.
- Must change: Phase 3 creates `.env.example`, the Caddyfile, Dockerfiles and the gitleaks hook; the Owner schedules key rotation before cutover (handoff).
