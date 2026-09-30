# Run MyTask on your computer

This guide starts the whole new platform on your own computer: the API, the website, the admin panel and the mobile app. Nothing here touches the live site, real money or real user data (CLAUDE.md rule 7).

Time needed the first time: about 30–45 minutes, mostly downloads.

---

## 1. Install the tools (once)

| Tool | Windows | macOS |
|---|---|---|
| **Git** | https://git-scm.com/download/win (defaults are fine) | Already installed, or run `xcode-select --install` |
| **Node.js 24 LTS** | https://nodejs.org → "LTS" installer | https://nodejs.org → "LTS" installer |
| **pnpm** (package manager) | Open **PowerShell** and run `npm install -g pnpm@12.8.1` | Open **Terminal** and run `npm install -g pnpm@12.8.1` |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop — during setup keep "Use WSL 2" ticked, then restart the computer | https://www.docker.com/products/docker-desktop (pick Apple chip or Intel) |
| **Expo Go** app (for the mobile app) | On your phone: App Store / Google Play → "Expo Go" | same |

After installing Docker Desktop, open it once and wait until it says **"Engine running"**. Docker must be running whenever you use the platform.

Check everything (in PowerShell or Terminal):
```
node -v        # v24.x
pnpm -v        # 12.8.1
docker -v      # Docker version 2x.x
```

## 2. Prepare the project (once)

Open PowerShell (Windows) or Terminal (macOS) **in the project folder** (`mytask-rebuild`). Tip for Windows: open the folder in Explorer, click the address bar, type `powershell`, press Enter.

```
pnpm install          # downloads the libraries (a few minutes)
pnpm setup:env        # creates your private .env file with random local passwords
```

`.env` holds local-only passwords. It is never uploaded to GitHub (it is in `.gitignore`). Do not paste its contents anywhere.

## 3. Start the platform (every time)

**Step A — start the databases and helpers** (keeps running in the background):
```
pnpm infra:up
```
The first time this downloads about 1–2 GB. It starts: PostgreSQL (database), Redis (cache), file storage, Mailpit (catches every email), and a fake Bank of Georgia (no real payments).

Check that everything is up: `docker compose ps` — every service should say `running` or `healthy` (`s3-init` says `exited (0)`, which is correct: it only creates the storage folders).

**Step B — prepare the database** (first time, and after each update that changes the database):
```
pnpm db:deploy
```

**Step C — start the API, website and admin panel** (keeps this window busy; stop with `Ctrl + C`):
```
pnpm dev
```

Now open:

| What | Address |
|---|---|
| Website (Georgian) | http://localhost:3100 |
| Website (English) | http://localhost:3100/en |
| Admin panel | http://localhost:3200 |
| API health check | http://localhost:3000/api/v1/health → `{"status":"ok"}` |
| All emails the platform "sends" | http://localhost:8025 |

The home page shows **"API მუშაობს"** (API is running) when everything is connected. At this stage the pages are placeholders; real screens arrive feature by feature (Phase 4).

## 4. The mobile app on your phone

Your phone and computer must be on the **same Wi-Fi**.

1. Find your computer's local address:
   - Windows: `ipconfig` → "IPv4 Address", e.g. `192.168.1.20`
   - macOS: System Settings → Wi-Fi → Details → IP address
2. Open `.env` in a text editor and set:
   `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1` (your address)
3. Keep `pnpm dev` running in one window. In a **second** window run:
   ```
   pnpm dev:mobile
   ```
4. A QR code appears. iPhone: scan it with the Camera app. Android: scan it inside Expo Go.
5. The app shows **"API მუშაობს"** when it can reach the API. If it says "API მიუწვდომელია", check the address in step 2 and allow Node.js through the Windows firewall when Windows asks.

## 4b. Quick look without Docker (`pnpm preview`)

If Docker is not installed yet, run `pnpm preview` instead of steps 3A–3C. It starts a built-in test database, the API, the website and the admin panel. Emails (for example the 6-digit login code) are **printed in the same window** instead of being sent. Open http://localhost:3100/auth/register to create an account and http://localhost:3100/auth/login to log in. Data is kept in `apps/api/.pglite` (delete that folder to start fresh). This is for looking around only — never for real data.

Browser tests start their own website/admin server and **stop with "port is already used"** if something already runs on 3100/3200. To test against a running `pnpm preview` on purpose, add `PW_REUSE=1` (PowerShell: `$env:PW_REUSE='1'; pnpm --filter @mytask/admin test:e2e`).

## 5. Run everything in containers (optional, closer to production)

Instead of `pnpm dev`, you can run the built apps behind the same kind of proxy (Caddy) as production:
```
docker compose --profile apps up -d --build
```
Then open http://localhost:8080 (website) and http://admin.localhost:8080 (admin). The first build takes several minutes.

## 6. Stop, reset, update

| Task | Command |
|---|---|
| Stop the apps | `Ctrl + C` in the `pnpm dev` window |
| Stop the databases (data is kept) | `pnpm infra:down` |
| **Delete all local data** and start fresh | `docker compose down -v` (cannot be undone; only your local test data) |
| After pulling new code | `pnpm install`, then `pnpm db:deploy` |

## 7. Checks the developers run (you can too)

```
pnpm lint          # code style and architecture rules
pnpm typecheck     # type safety
pnpm test          # automated tests
pnpm build         # production build of everything
```
The same checks run automatically on GitHub for every pull request (`.github/workflows/ci.yml`).

## 8. If something goes wrong

| Symptom | Fix |
|---|---|
| `docker: command not found` / "cannot connect to the Docker daemon" | Start Docker Desktop and wait for "Engine running" |
| `pnpm setup:env` says `.env already exists` | Fine — you already have one. To regenerate, delete `.env` first (then run `docker compose down -v`, because the database password changes) |
| `port is already allocated` | Another program uses that port (5432, 6379, 3000, 3100, 3200, 8025, 8080). Close it, or restart the computer |
| Website shows "API მიუწვდომელია" | Is `pnpm dev` running? Does http://localhost:3000/api/v1/health work? |
| `pnpm db:deploy` fails | Is `pnpm infra:up` done and `docker compose ps` showing postgres `healthy`? |

Still stuck: copy the last 20 lines of the error (never your `.env`) into a new Claude Code session and ask for help.
