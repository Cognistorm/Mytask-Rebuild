# Staging: https://mytask.1kk.ge

Owner decision 2026-10-06: Owner click-throughs happen on staging (DEV-S1). Staging runs on the Owner's
DigitalOcean droplet `161.35.198.132` (2 GB RAM, 1 vCPU since 2026-10-06), next to MyTrades (mytrades.1kk.ge) and
the 1kk.ge dashboard. n8n and Cognistorm were removed from it on 2026-10-06 (Owner).
This is an interim setup. ADR-015 §2 (the proper staging environment for Phase 5–6) still applies later.

## Redeploy (the only command you normally need)

```bash
bash scripts/deploy-staging.sh
```

- Deploys the **committed** HEAD of the current branch (API, worker, web, admin). Uncommitted changes are not included. Nothing goes through GitHub.
- Staging is **down for about 5–10 minutes** while it builds. The apps are stopped during the build so it has the RAM.
- If the build or a migration fails, the previous release starts again. The release before the current one stays in `/opt/mytask-staging/app.prev`.
- SSH alias `mytask-staging` (root, key `~/.ssh/id_ed25519_mytask_staging`) is in `~/.ssh/config` on the Owner's computer.

## Access

| What                                                             | Where                                                                                                                      |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Website                                                          | https://mytask.1kk.ge (open: no general password, Owner 2026-10-06)                                                        |
| Admin (staff panel)                                              | https://mytask.1kk.ge/admin: own staff login, then a code by email (read it in the test inbox)                             |
| Super-admin                                                      | login `owner`. The seed printed the password once on 2026-10-06 and it was given to the Owner                              |
| Test inbox (every staging email lands here, nothing is sent out) | https://mytask.1kk.ge/__mail/: **still behind basic auth** (Owner has the login; not in git), because it holds reset links |
| API                                                              | https://mytask.1kk.ge/api/v1/… (phone app: `EXPO_PUBLIC_API_URL=https://mytask.1kk.ge/api/v1`)                             |

`noindex` header + `robots.txt` disallow all, so the copy of the site never competes with mytask.ge in search.

**Admin on the same host, not its own host as in ADR-010/ADR-013:** the Owner chose `/admin` (2026-10-06, no extra
DNS name). The admin build gets `ADMIN_BASE_PATH=/admin` (`apps/admin/next.config.ts`); `ADMIN_URL` is
`https://mytask.1kk.ge/admin`, so the CSRF check accepts staff calls from this origin and email links point to `/admin/…`.
Staff cookies keep their own names (`__Host-mt_staff_*`), separate from the website's. Locally and in production
the admin stays on its own host with no base path.

## Layout on the server

| Part     | Detail                                                                                                                                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Folder   | `/opt/mytask-staging` (user `mytask`): `app/` (current release, `DEPLOYED_COMMIT`), `app.prev/`, `.env` (secrets, mode 600, generated on the server), `data/s3`, `data/mail`, `bin/` (weed, mailpit)                                                                                                                     |
| Services | `mytask-api` 127.0.0.1:3300 (readiness 3301), `mytask-worker` (readiness 3302), `mytask-web` localhost:3310, `mytask-admin` localhost:3320, `mytask-s3` SeaweedFS 127.0.0.1:8333, `mytask-mail` Mailpit SMTP 1025 / UI 8025, plus system `postgresql` (16, db `mytask`) and `redis-server` (7.0, 64 MB, noeviction, AOF) |
| Nginx    | `/etc/nginx/sites-available/mytask.1kk.ge` = `nginx-mytask.1kk.ge.conf` (TLS by certbot, Let's Encrypt, auto-renew). Inbox basic-auth file `/etc/nginx/mytask-staging.htpasswd`. Object storage: `/etc/nginx/sites-available/s3.1kk.ge` = `nginx-s3.1kk.ge.conf` → SeaweedFS (`S3_PUBLIC_ENDPOINT=https://s3.1kk.ge`)    |
| Logs     | `journalctl -u mytask-api -u mytask-worker -u mytask-web -u mytask-admin -f`                                                                                                                                                                                                                                             |
| Backups  | `/root/backups`: the removed n8n data and Cognistorm code, the old dashboard page and Nginx files (2026-10-06)                                                                                                                                                                                                           |

**Why the Next.js apps listen on `localhost` (::1), not 127.0.0.1:** the web proxy (`apps/web/src/proxy.ts`) rewrites
`/` to `http://localhost:<port>/ka`. When the server's own host differs, Next.js treats that as an external rewrite: it
fetches `/ka`, which is answered with a 301 to `/`, and the page loops. This is the same cause as **BUG-01** under
`pnpm local`. Nginx therefore proxies to `[::1]:3310` and `[::1]:3320`. The real fix in the web app stays on the
devops list (DEV-S1).

## Files here

| File                       | Use                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server-setup.sh`          | One-time setup, idempotent: packages, user, PostgreSQL/Redis tuning, DB + extensions, SeaweedFS, Mailpit, `.env` with fresh secrets, infra units                                               |
| `app-units.sh`             | systemd units for API, worker, web and admin                                                                                                                                                   |
| `remote-deploy.sh`         | Run on the server by `scripts/deploy-staging.sh`                                                                                                                                               |
| `create-buckets.cjs`       | Creates the three ADR-009 buckets (idempotent)                                                                                                                                                 |
| `nginx-s3.1kk.ge.conf`     | Nginx site of https://s3.1kk.ge, the browsers' upload/download endpoint (presigned URLs). Fresh server: `certbot --nginx -d s3.1kk.ge --redirect`                                              |
| `nginx-mytask.1kk.ge.conf` | The live Nginx site. For a fresh server: install it without the certbot lines, run `certbot --nginx -d mytask.1kk.ge --redirect`, and `htpasswd -cB /etc/nginx/mytask-staging.htpasswd <user>` |

## Known limits of this staging

- Uploads go from the browser straight to https://s3.1kk.ge (DNS record added by the Owner 2026-10-06). Tested 2026-10-06 from outside: CORS preflight, presigned POST 204, wrong content type 403, presigned GET 200, unsigned GET 403. SeaweedFS answers CORS with `*`; every write still needs a signed policy. Processed public images are served read-only under https://mytask.1kk.ge/media/.
- `SCAN_PROVIDER=none` (no ClamAV, it needs ~1 GB RAM): uploads would be marked `scan_skipped`.
- Emails never leave the server (Mailpit).
