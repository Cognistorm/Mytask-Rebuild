# Run MyTask on your computer

This guide starts the whole new platform on your own computer: the API, the website, the admin panel and the mobile app. Nothing here touches the live site, real money or real user data (CLAUDE.md rule 7).

No Docker, virtual machine or cloud account is needed (Owner 2026-10-02, ADR-020). Time needed the first time: about 15–20 minutes, mostly downloads.

---

## 1. Install the tools (once)

| Tool | Windows | macOS |
|---|---|---|
| **Git** | https://git-scm.com/download/win (defaults are fine) | Already installed, or run `xcode-select --install` |
| **Node.js 24 LTS** | https://nodejs.org → "LTS" installer | https://nodejs.org → "LTS" installer |
| **pnpm** (package manager) | Open **PowerShell** and run `npm install -g pnpm@12.8.1` | Open **Terminal** and run `npm install -g pnpm@12.8.1` |
| **Expo Go** app (for the mobile app) | On your phone: App Store / Google Play → "Expo Go" | same |

Check everything (in PowerShell or Terminal):
```
node -v        # v24.x
pnpm -v        # 12.8.1
```

## 2. Prepare the project (once)

Open PowerShell (Windows) or Terminal (macOS) **in the project folder** (`mytask-rebuild`). Tip for Windows: open the folder in Explorer, click the address bar, type `powershell`, press Enter.

```
pnpm install          # downloads the libraries (a few minutes)
pnpm setup:env        # creates your private .env file with random local passwords
```

`.env` holds local-only passwords. It is never uploaded to GitHub (it is in `.gitignore`). Do not paste its contents anywhere.

## 3. Start the platform (every time)

```
pnpm local
```
This one command starts everything in this window (stop it with `Ctrl + C`):

| Part | What runs | Your data is kept in |
|---|---|---|
| Database | PGlite — a full PostgreSQL that runs inside Node.js | `apps/api/.pglite` |
| Cache / queues | Redis 7.4 for Windows | `.local/data/redis` |
| File storage | SeaweedFS 4.48 (S3, same as in production) | `.local/data/s3` |
| Email catcher | Mailpit — every email the platform "sends" | `.local/data/mail` |
| Payments | a fake Bank of Georgia (no real payments) | — |
| API, worker, website, admin | `pnpm dev` | — |

The **first** run downloads Redis, SeaweedFS and Mailpit (about 70 MB, checked against fixed fingerprints) into `.local/tools`. It also prepares the database and prints the first Super-admin login once — copy it somewhere safe. Later starts take about a minute. While the database has no categories, a start also loads the live site's public category tree (7 categories, 49 sub-categories, 189 child categories in Georgian and English) and its 7 project categories; categories you edit later are never overwritten.

Windows may ask whether to allow `redis-server`, `weed` or `mailpit` through the firewall: everything listens only on this computer, so **"Cancel"** is fine. (For the mobile app on your phone, allow **Node.js**, see section 4.)

File storage is reached only through its S3 port (8333), which checks the keys: SeaweedFS's own file browser (port 8888) still listens but answers "not found" to everything, and `pnpm local` stops if it ever serves files. Its internal ports (9333, 8334, 18888, 19333) listen on this computer only; never open them in the firewall or forward them (security review 06, SEC-62).

Virus scanning of uploads is off on this computer (ClamAV is not installed): uploads are still checked for their real file type, and are marked "scan skipped". Scanning is on in staging and production.

Two windows instead of one: `pnpm infra:up` (database, cache, storage, email) in the first window, `pnpm dev` in a second one.

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
   and also `HOST=0.0.0.0`, then restart `pnpm local`. By default the API listens only on this computer
   (`127.0.0.1`), so the phone could not reach it. With `HOST=0.0.0.0` everyone on the same Wi-Fi can reach your
   local API: use it only on your home network and remove the line when you are done (security review SEC-71).
   The website and admin always stay on this computer only.
3. Keep `pnpm dev` running in one window. In a **second** window run:
   ```
   pnpm dev:mobile
   ```
4. A QR code appears. iPhone: scan it with the Camera app. Android: scan it inside Expo Go.
5. The app shows **"API მუშაობს"** when it can reach the API. If it says "API მიუწვდომელია", check the address in step 2 and allow Node.js through the Windows firewall when Windows asks.
6. Social-login buttons (Google, Facebook…) appear in the app only for providers switched ON with keys in the admin settings. In Expo Go they cannot finish the sign-in: the provider returns to `{APP_URL}/app-return/auth/{provider}`, which only a store/development build with verified App Links (https, Phase 6) can catch. Try social login on the website locally; on the phone it is tested with the first development build.
7. Password reset: the email's link (`{APP_URL}/auth/password/update?token=…&email=…`) opens the app only in a store/development build with verified App Links (https, Phase 6); locally it opens the website. To try the app's screen in Expo Go, take the `token` and `email` from the email (Mailpit, http://localhost:8025) and open `exp://<computer LAN IP>:8081/--/auth/password/update?token=…&email=…` on the phone (e.g. paste it in the phone's browser or send it as a link).
8. Email verification (when S-052 is ON with method email): the email's link (`{APP_URL}/auth/verify?token=…&email=…`) opens the app the same way as step 7 (store/development build, Phase 6). In Expo Go open `exp://<computer LAN IP>:8081/--/auth/verify?token=…&email=…`; on success the app shows login with "account activated". An expired or used link shows the message and a "Resend verification email" link; logging in to a pending account shows the same link.
9. Account → Security: after logging in, open the **Account** tab ("ანგარიში") and tap "Security". There you find "Change password", the two-factor switch (only while S-056 is ON; flipping it asks for the current password, or for an emailed code on accounts without one — the code arrives in Mailpit) and the sessions list with "Log out other browser sessions" (log in on the website too, to see a second session).
10. Dashboards: after logging in, the app opens the **Dashboard** tab ("პანელი") on the side you chose last (a new account starts on Buying — "ყიდვა"). Tap "გაყიდვა" (Selling) to see Selling Home: welcome line, "Switch to buying", the balance and order tiles (zeros for now), new messages and latest orders. The ⓘ next to the pending balance explains it. The choice is saved on your account: switch on the website (`/seller/home`), then restart the app: it opens the same side. The Account tab has the same Buying / Selling switch.
11. Public profile: on the **Account** tab ("ანგარიში") tap "პროფილის ნახვა" (View profile). Your profile opens: avatar with the online dot, name, @username, member since, verifications, languages, ratings ("No reviews yet" for now), About me (long text folds with "More"), your portfolio works (pending ones are marked), skills. "Share profile" opens the phone's share sheet with the website link. To see someone else's profile (with "Report user"), register a second account on the website, then open `exp://<computer LAN IP>:8081/--/profile/<its username>` in the phone's browser: Expo Go opens that profile (in the app, search and chat will lead there later). "Report user" with an empty reason says the field is required; a sent report says the profile was reported, and the report email reaches Mailpit. Signed out, the same link shows the profile and "Report user" asks you to log in. An unknown username shows "User not found".
12. Edit profile: on the **Account** tab tap "პროფილის განახლება" (Edit profile), or the same button on your own profile. Each block saves on its own and shows its own message. Photo: "ფოტოს გადაღება" (camera) or "გალერეიდან არჩევა" (gallery), crop to a square, wait for "Uploading / Processing", then the new photo shows; "წაშლა" removes it and the first letter shows. Headline and About me: "Edit", change, "Update" (an empty headline is refused). Availability: "Set availability" opens a sheet from the bottom with a date picker that starts tomorrow and a message; after saving, the block shows "Unavailable" with the date, "Change" and "Remove", and your public profile shows the notice. Skills and languages: type a name, choose a level, add; the same name twice is refused; Edit / Delete per row. Linked accounts show only when that setting is ON. Go back to your profile: the changes are there.
13. Portfolio: add a few works first (on the website `/seller/portfolio/create`, or in the app, step 14), and approve one in the admin `/portfolio` queue. On your profile in the app, tap a work: the item opens with the photos to swipe ("1 / 3" under them), the title, "Watch video" / "Live preview" when the work has those links (they open the browser), the description, "Share this project" (public works only; the share sheet carries the website link) and your box with "View profile". A work waiting for review shows the "Pending" note on top; a rejected one shows the reason. With more than 6 works, "ჩემი პორტფოლიოს ნახვა" (View my portfolio) under the preview opens the full list with "Load more" after 24. Signed out (or as the second account), your pending and rejected works are not listed and their link (`exp://<computer LAN IP>:8081/--/profile/<username>/portfolio/<slug>`) shows "Page not found".
14. My portfolio: on the **Dashboard** tab switch to Selling and tap "ჩემი ნამუშევრები" (My works / Portfolio). Your works show newest first with Pending / Active / Rejected (a rejected one also shows the reason), Edit and Delete. "Add a new work" opens the form: title, description, optional project and video links, a thumbnail and gallery photos ("ფოტოს გადაღება" camera or "გალერეიდან არჩევა" gallery; several at once from the gallery). Each photo shows "Uploading" then "Processing"; a photo of a type that is not allowed (e.g. WEBP or GIF) or too big shows the reason without uploading. Saving without a thumbnail or gallery photo says the field is required. After saving you are back on the list with the success message (and "waiting for review" while auto-approve is OFF). Edit shows the current photos; new ones replace them. Delete asks first in a sheet from the bottom. On your own profile with no works, "Create" opens the same form.
15. Account settings: on the **Account** tab tap "პროფილის მონაცემები" (Account settings; the same title as the tab screen). Change the full name or city, enter your current password, "Update": the success message shows and the Account tab shows the change when you go back. A wrong password shows its message under the field. Change the email: after saving, a notice says a confirmation link was sent to the new address; open that email in Mailpit and click the link (it opens the website page) to finish. The notice stays on the settings screen until then. With an account made by Google/Facebook login only (no password), changing the email shows "Send a new code"; the code arrives at the current address in Mailpit and "Update" works once 6 digits are entered. "Delete Account" opens a sheet from the bottom with the legacy warning; with a balance or an active order the refusal shows in the sheet; otherwise the account is deleted and the app goes to the login screen.
16. Verification centre: on the **Account** tab tap "ვერიფიკაცია" (Verification centre). Step 1: choose the document type; "Next" without a choice says the field is required. Step 2: take a photo of the front (and the back; a passport needs only the front) or choose one from the gallery; each shows "Uploading / Processing"; a PNG/JPG over 5 MB or another type is refused before upload. "Back" keeps the photos. Step 3: the selfie with the document opens the front camera. "Finish" shows the status card: pending with the review note, the date, and the three documents with "ნახვა" (View): the photo opens full screen inside the app through a short-lived link and is not saved to the phone; "Close" goes back (security review SEC-70 (b)). Approve or decline it in the admin `/kyc` queue, open the screen again: verified, or declined with the reason and "Send files again" (which starts the steps again).
17. Home and Explore (slice 2): after logging in, the app opens the **Home** tab ("მთავარი"): the teal block with the search field and "განცხადებები" (Gigs; "პროექტები" too when projects are ON), then the featured categories, "ტოპ განცხადებები" (Top gigs), one row per category with gigs and "მეტის ნახვა" (See more), and the best freelancers. Rows without gigs are hidden (a fresh database has no gigs yet: gigs arrive with slice 3). Pull down to refresh. Tap the search field: the **Explore** tab ("აღმოაჩინე") opens with the keyboard; type a word and tap search. "გაფილტვრა" (Filter) opens the full-screen filters with "შედეგების ჩვენება" (Show results) at the bottom; a minimum price above the maximum is refused with a message. The sort button opens the sort list from the bottom. Scrolling down loads the next 42.
18. Categories: on the Explore tab tap "მიმართულებები" (Browse categories): the category tree opens; tap a category to open its levels, type in the box to filter; tap a name to open its page (path, title, then the gigs with the same filters and sort). On Home, a category tile or "See more" opens the same page; the best freelancers' "See more" opens the freelancers list; a skill chip there (or on a profile) opens "Hire the best … experts". "Projects" on Home opens Explore projects (chips; "Latest projects" stays empty until slice 9).

## 5. Browser tests

Browser tests start their own website/admin server and **stop with "port is already used"** if something already runs on 3100/3200 (the website tests also start a small stand-in API on 3199). To run them while `pnpm local` is open, move them to free ports: `$env:E2E_WEB_PORT='3101'` (website) or `$env:E2E_ADMIN_PORT='3201'` (admin). To test against a running `pnpm local` on purpose, add `PW_REUSE=1` (PowerShell: `$env:PW_REUSE='1'; pnpm --filter @mytask/admin test:e2e`).

**Full-stack tests** (the real API, storage and worker; e.g. the profiles main flow in `apps/admin/e2e/profiles-main-flow.spec.ts` and the catalogue main flow in `catalog-main-flow.spec.ts`) sign in as the first Super-admin, so they read the password the seed prints. To keep your own local data out of it, start a throw-away database in an empty folder and save the output (PowerShell):
```
$env:LOCAL_PGLITE_DIR='C:\temp\mytask-test-db'; pnpm local *> C:\temp\local.log
```
In a second window: `$env:PW_REUSE='1'; $env:ADMIN_E2E_LOG='C:\temp\local.log'; pnpm --filter @mytask/admin test:e2e`. Without `ADMIN_E2E_LOG` these tests are skipped. Later starts with the same folder print no password, so keep the first log. Your normal `pnpm local` (without `LOCAL_PGLITE_DIR`) still uses `apps/api/.pglite`.

## 6. Stop, reset, update

| Task | Command |
|---|---|
| Stop everything (data is kept) | `Ctrl + C` in the `pnpm local` window. If the window was closed instead, the next `pnpm local` stops the leftovers by itself |
| **Delete all local data** and start fresh | stop first, then delete the folders `apps/api/.pglite` and `.local/data` (cannot be undone; only your local test data) |
| After pulling new code | `pnpm install`, then `pnpm local` (it applies new database changes by itself) |

## 7. Checks the developers run (you can too)

```
pnpm lint          # code style and architecture rules
pnpm typecheck     # type safety
pnpm test          # automated tests
pnpm build         # production build of everything
```
`pnpm test` needs nothing running: it starts its own temporary database. The same checks run automatically on GitHub for every pull request (`.github/workflows/ci.yml`), there also against a real PostgreSQL server.

## 8. If something goes wrong

| Symptom | Fix |
|---|---|
| Windows: `npm.ps1` / `pnpm.ps1 cannot be loaded because running scripts is disabled` | Run once in PowerShell: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, answer `Y`, then open a new PowerShell window |
| `pnpm setup:env` says `.env already exists` | Fine — you already have one. To regenerate, delete `.env` first (and the folder `.local/data/s3`, because the storage keys change) |
| `port … is used by another program` | Another program uses that port. Ours: 1025, 3000, 3001, 3002, 3100, 3200, 4100, 5432, 6379, 8025, 8333, 8334, 8888, 9333. Close it, or restart the computer |
| Website shows "API მიუწვდომელია" | Is `pnpm dev` running? Does http://localhost:3000/api/v1/health work? |
| `local: … did not start` or `SHA-256 mismatch` | Run `pnpm local` again; if it repeats, delete the folder `.local/tools` (the tools are downloaded again) |

Still stuck: copy the last 20 lines of the error (never your `.env`) into a new Claude Code session and ask for help.
