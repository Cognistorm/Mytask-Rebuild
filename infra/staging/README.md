# Staging: https://mytask.1kk.ge

Owner decision 2026-10-06: Owner click-throughs happen on staging (DEV-S1). Staging runs on the Owner's shared
DigitalOcean droplet `161.35.198.132`, next to MyTrades (mytrades.1kk.ge) and the 1kk.ge dashboard.
This is an interim setup. ADR-015 §2 (the proper staging environment for Phase 5–6) still applies later.

## Redeploy (the only command you normally need)

```bash
bash scripts/deploy-staging.sh
```

- Deploys the **committed** HEAD of the current branch. Uncommitted changes are not included. Nothing goes through GitHub.
- Staging is **down for about 6–8 minutes** while it builds. The droplet has 1 GB RAM, so the app and the build cannot run together.
- If the build or a migration fails, the previous release starts again. The release before the current one stays in `/opt/mytask-staging/app.prev`.
- SSH alias `mytask-staging` (root, key `~/.ssh/id_ed25519_mytask_staging`) is in `~/.ssh/config` on the Owner's computer.

## Access

| What                                                             | Where                                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Website                                                          | https://mytask.1kk.ge (basic auth: the Owner has the login; it is not stored in git)                             |
| Test inbox (every staging email lands here, nothing is sent out) | https://mytask.1kk.ge/__mail/                                                                                    |
| API                                                              | https://mytask.1kk.ge/api/v1/… (requests with a `Bearer` token skip basic auth; the API checks the token itself) |
| Super-admin                                                      | login `owner`. The seed printed the password once on 2026-10-06 and it was given to the Owner                    |

`noindex` header + `robots.txt` disallow all. `/api/v1/admin/*` answers 404 on this host (as in the Caddyfile).

## Layout on the server

| Part     | Detail                                                                                                                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Folder   | `/opt/mytask-staging` (user `mytask`): `app/` (current release, `DEPLOYED_COMMIT`), `app.prev/`, `.env` (secrets, mode 600, generated on the server), `data/s3`, `data/mail`, `bin/` (weed, mailpit)                                                                                      |
| Services | `mytask-api` 127.0.0.1:3300 (readiness 3301), `mytask-worker` (readiness 3302), `mytask-web` localhost:3310, `mytask-s3` SeaweedFS 127.0.0.1:8333, `mytask-mail` Mailpit SMTP 1025 / UI 8025, plus system `postgresql` (16, db `mytask`) and `redis-server` (7.0, 64 MB, noeviction, AOF) |
| Nginx    | `/etc/nginx/sites-available/mytask.1kk.ge` = `nginx-mytask.1kk.ge.conf` plus the TLS lines certbot added (Let's Encrypt, auto-renew). Basic auth file `/etc/nginx/mytask-staging.htpasswd`                                                                                                |
| Logs     | `journalctl -u mytask-api -u mytask-worker -u mytask-web -f`                                                                                                                                                                                                                              |

**Why the web server listens on `localhost` (::1), not 127.0.0.1:** the proxy (`apps/web/src/proxy.ts`) rewrites `/` to
`http://localhost:<port>/ka`. When the server's own host differs, Next.js treats that as an external rewrite: it fetches
`/ka`, which is answered with a 301 to `/`, and the page loops. This is the same cause as **BUG-01** under `pnpm local`.
Nginx therefore proxies to `[::1]:3310`. The real fix in the web app stays on the devops list (DEV-S1).

## Files here

| File                       | Use                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server-setup.sh`          | One-time setup, idempotent: packages, user, PostgreSQL/Redis tuning, DB + extensions, SeaweedFS, Mailpit, `.env` with fresh secrets, infra units                                            |
| `app-units.sh`             | systemd units for API, worker and web                                                                                                                                                       |
| `remote-deploy.sh`         | Run on the server by `scripts/deploy-staging.sh`                                                                                                                                            |
| `create-buckets.cjs`       | Creates the three ADR-009 buckets (idempotent)                                                                                                                                              |
| `nginx-mytask.1kk.ge.conf` | The Nginx site, before certbot's TLS lines. For a fresh server: install it, then `certbot --nginx -d mytask.1kk.ge --redirect` and `htpasswd -cB /etc/nginx/mytask-staging.htpasswd <user>` |

## Known limits of this staging

- **No admin app yet** (memory). The slice-2 checklist's admin section needs it. See the open question in STATUS.
- **Browser uploads do not work yet.** Presigned upload URLs point at the internal S3 address, and a public S3 host would need its own DNS name. Public images are served read-only under `/media/`.
- **Phone app (Expo Go):** signed-out requests carry no Bearer token and would hit basic auth. Open question for the Owner.
- `SCAN_PROVIDER=none` (no ClamAV on 1 GB RAM): uploads would be marked `scan_skipped`.
- Emails never leave the server (Mailpit).
