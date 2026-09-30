# QA report: Phase 3 platform core (P3-1…P3-7)
Date: 2026-09-30 | QA: qa-engineer (independent, did not build this) | Branch: `feat/platform-core` @ `9a341ec9`
Judged against: `docs/03-architecture/phase-3-plan.md` ("Done when" column), the handoff `docs/handoffs/2026-09-30-devops-engineer-to-orchestrator-p3-platform-core.md`, CLAUDE.md, ADR-001/006/013/014/015/017, `docs/04-api/CONVENTIONS.md`, `docs/04-api/realtime.md`.

## Verdict: **FAIL**
1 blocker, 2 major, 11 minor. The monorepo, generated packages, i18n import and the three app shells work locally and match the handoff numbers. But the container images for web and admin **cannot be built** (BUG-01), so `docker compose --profile apps` and the CI `docker` job will fail on their first real run. P3-5 and P3-6 are therefore not done, and P3-7 fails for the mobile step (BUG-03). The API also breaks a contract-wide rule: validation errors carry no `X-Request-Id` (BUG-02).

## Environment and method
- Windows 11, Node 24.21.0, pnpm 12.8.1, Playwright Chromium already installed. **Docker is not installed**, so no container was run. Compose, the Dockerfiles, the Caddyfile and the CI workflow were checked by reading them and by simulating the Docker build context (see BUG-01). This limit is noted, not counted against the code.
- This QA worktree had been created on another branch, so I checked out `feat/platform-core` there. It was free because the main checkout is now on `feat/auth`. The HEAD is the same commit as the one reviewed.
- **Turborepo cache:** the first `pnpm lint/typecheck/test` were replayed from a shared local Turbo cache ("FULL TURBO", logs from the main checkout's paths). To get real results I re-ran all three with `turbo run <task> --force`. The results below come from the forced runs.
- **Ports 3000/3100/3200 were already taken** by another checkout's dev servers. The first Playwright run passed against *those* servers (`reuseExistingServer`), not this build (see BUG-07). I re-ran the committed E2E specs against **this** build on ports 3110/3210, using a QA-only Playwright config in the session scratchpad and API on 3010. The results below come from that run.

## 1. Verification commands (P3-1, P3-2, P3-4)
| # | Command | Result | Notes |
|---|---|---|---|
| V-1 | `pnpm install --frozen-lockfile` | **PASS** | 1093 packages. The allow-listed install scripts ran (esbuild, @swc/core, prisma). |
| V-2 | `pnpm gen:check` | **PASS** | `398 paths, 768 schemas, 35 realtime events`, `21 money operations`, no diff. |
| V-3 | `pnpm i18n:check` | **PASS** | `en 2750 keys, ka 2700 keys` |
| V-4 | `pnpm format:check` | **PASS** | |
| V-5 | `pnpm turbo run lint --force` | **PASS** | 9/9, 0 cached |
| V-6 | `pnpm turbo run typecheck --force` | **PASS** | 9/9, 0 cached |
| V-7 | `pnpm turbo run test --force` | **PASS** | api 18 passed + 2 skipped (integration, no DB); api-client 3 passed; i18n check OK |
| V-8 | `pnpm build` | **PASS** | api, web, admin (+ tokens) |
| V-9 | Web E2E (committed `apps/web/e2e/shell.spec.ts`, this build) | **PASS** | 4/4 |
| V-10 | Admin E2E (committed `apps/admin/e2e/shell.spec.ts`, this build) | **PASS** | 1/1 |
| V-11 | `expo export --platform android` | **PASS** | 1 Hermes bundle, fonts and PNGs in assets |
| V-12 | `pnpm contract:verify` | **PASS** | check-contract 0 errors / 0 warnings; coverage 715/715 ACs, 0 errors |
| V-13 | Built API from a `pnpm deploy --prod` bundle, `NODE_ENV=production` | **PASS** | `GET /api/v1/health` → `{"status":"ok"}`, no error logs |
| V-14 | Web SSR → API via `@mytask/api-client` | **PASS** | home HTML has `data-up="true"` when the API runs |
| V-15 | ESLint import boundaries (probe via `eslint --stdin`, no file written) | **PASS** | web: `@prisma/client` and `../../api/src/...` rejected; mobile: `ioredis` rejected; packages/i18n importing `apps/web` rejected |
| V-16 | `legacy/` untouched (`git diff main...HEAD -- legacy`) | **PASS** | empty |

## 2. Generated code (P3-2, ADR-014 §2)
| # | Check | Result | Evidence |
|---|---|---|---|
| G-1 | `packages/types` generated only from `docs/04-api/openapi.yaml` + `src/events/*.yaml` | **PASS** | `packages/types/scripts/generate.mjs`. `src/index.ts` only re-exports generated types or aliases them. |
| G-2 | Repeatable and drift-checked | **PASS** | V-2. CI runs `pnpm gen:check`. `-diff` in `.gitattributes` still makes `git diff --exit-code` fail on change. |
| G-3 | Realtime event count | **PASS** | I compared the 35 names in `realtimeEventNames` with the 35 rows of the `realtime.md` §6 table (34 from d1–d6 + `file.processed`, F0): identical sets. |
| G-4 | Idempotency-Key guard = all `x-money` operations | **PASS** | A separate script walked `openapi.yaml`: 21 `x-money` operations, 21 operations with an `Idempotency-Key` header, the same 21 (all required). No money operation lacks the header and no header op lacks `x-money`. `operations.ts` lists exactly these 21. |
| G-5 | No hand-written duplicates of contract types | **PASS with minor** | The health controller uses `components['schemas']['HealthStatus']`, and errors use the generated `ErrorCode`/`ErrorDetails`. But see BUG-08 (`ClientKind`, `Locale` typed by hand). |

## 3. i18n (P3-3, ADR-006 §3, Q-058)
| # | Check | Result | Evidence |
|---|---|---|---|
| I-1 | Only 2 NEW keys, both en + ka | **PASS** | `t_platform_api_status_ok` = "The API is running" / "API მუშაობს"; `t_platform_api_status_unreachable` = "The API cannot be reached" / "API მიუწვდომელია". Key counts = legacy unique counts + 2 in both files. |
| I-2 | `i18n:check` enforces Q-058 (negative tests on a scratch copy) | **PASS** | new key en-only → exit 1 "missing"; ka empty → exit 1; placeholder mismatch → exit 1; ka-only new key → exit 1 "English value first"; fixed → exit 0. |
| I-3 | Legacy import faithful: 13 keys spot-checked in both languages against `legacy/APP/lang/{en,ka}/messages.php` | **PASS** | `t_home`, `t_hello_username`, `t_available_balance_amount`, `t_gig_title_validation_max_words` (en-only), `t_by_signup_u_agree_to_terms_privacy` (HTML + 2 params), `t_cancel` (dup), `t_too_many_login_attempts_pls_try_after_seconds` (HTML, ka curly quotes kept byte-exact), `t_page_not_fount`, `t_you` (empty ka), `t_congratulations_employer_awarded_u_their_project_title` (param mismatch), `t_created_on_date`, `t_share_on_linkedin` (dup, last wins "Linkedin"), `t_min_deposit_amount_is_and_max_is`. All values are byte-equal after `:param` → `{{param}}`. |
| I-4 | IMPORT-REPORT.md counts | **PASS** | I counted separately with a regex: en 2753 entries / 2748 unique (5 dups), ka 2701 / 2698 (3 dups), 56 en-only, 6 ka-only. These match the report. (ADR-006 "Consequences" quotes 59/9 from `i18n.md`. The report's 56/6 matches the repository copy.) |
| I-5 | IMPORT-REPORT.md statements | **FAIL (minor)** | BUG-04: the claim "the client shows English" for en-only keys is wrong. |
| I-6 | No hard-coded user-facing strings in apps/web, apps/admin, apps/mobile | **PASS with minor** | Every visible text goes through `t()`. BUG-06 covers the brand `alt` text and the admin `<title>`. The `ka`/`en` switcher labels use the legacy keys `ka`/`en`. |
| I-7 | API error messages localized | **PASS** | `Accept-Language: en` → "Page not found"; default/unknown → "გვერდი ვერ მოიძებნა". `details.fields[].message` is English validator text (known; the handoff assigns it to slice 01). |

## 4. ADR-006 URL rules and admin noindex (P3-4)
| # | Request (this build, `next start`) | Expected | Result |
|---|---|---|---|
| U-1 | `/` | 200, `lang="ka"`, Georgian | **PASS** |
| U-2 | `/en` | 200, `lang="en"`, English | **PASS** |
| U-3 | `/ka` | 301 → `/` | **PASS** |
| U-4 | `/ka/some/page?x=1` | 301 → `/some/page?x=1` (query kept) | **PASS** |
| U-5 | `/ka/` | one redirect to `/` | **PASS with minor**: 308 → `/ka`, then 301 → `/`, two hops (BUG-11) |
| U-6 | `/en/` | → `/en` | **PASS** (308, Next trailing-slash rule) |
| U-7 | `/kapital`, `/fr`, `/KA` | not treated as a locale | **PASS** (404, no false redirect) |
| U-8 | `/fonts/…woff2`, `/brand/…png` | served, not rewritten | **PASS** |
| U-9 | Admin `/` | `X-Robots-Tag: noindex, nofollow` + `<meta name="robots" content="noindex…">` | **PASS** (also set by Caddy on the admin host) |
| U-10 | Legacy `/?locale=en` | 301 per url-map | **Not in P3 scope** (returns 200 Georgian; url-map 301s belong to spec 17). Not a bug here. |
| U-11 | hreflang / canonical | every public page | **Not in P3 scope**. The placeholder page has none; spec 17. |

## 5. Design tokens only (shell styles)
| # | Check | Result |
|---|---|---|
| T-1 | Colours, spacing and font family in `apps/web/src/app/[locale]/globals.css`, `apps/admin/src/app/globals.css` and mobile `StyleSheet` all come from tokens, and every referenced variable exists in `packages/tokens/dist/tokens.css` | **PASS** |
| T-2 | No raw sizes | **FAIL (minor)**: BUG-05. `max-width: 40rem` appears in both CSS files, although the header comment says "no raw … sizes". The logo uses `height={40}`/`{32}`, and mobile uses `logo: { height: 40, width: 160 }`. |

## 6. SETUP-LOCAL.md (P3-7): can the Owner follow it alone?
| # | Check | Result |
|---|---|---|
| S-1 | Every command named exists in `package.json` (`setup:env`, `infra:up`, `infra:down`, `db:deploy`, `dev`, `dev:mobile`, `lint`, `typecheck`, `test`, `build`) | **PASS** |
| S-2 | Ports and links: 3100, 3100/en, 3200, 3000/api/v1/health, 8025, 8080, admin.localhost:8080 | **PASS**. They match compose, the Next scripts and the API defaults. |
| S-3 | `pnpm setup:env` → `.env` works for `pnpm dev`, `db:deploy` and compose | **PASS** by reading: `prisma.config.ts` and `dotenv.ts` read the root `.env`, and compose overrides the host names. |
| S-4 | Mobile step 4 (set `EXPO_PUBLIC_API_URL` in `.env`, run `pnpm dev:mobile`) | **FAIL (major)**: BUG-03 |
| S-5 | Plain language, Windows + macOS | **PASS with minor**: BUG-09 (PowerShell script policy, `docker compose ps` hides exited `s3-init`, incomplete port list) |
| S-6 | Section 5 (`docker compose --profile apps up -d --build`) | **FAIL (blocker)**: BUG-01 |

## 7. Static review: compose, Dockerfiles, Caddyfile, CI (P3-5, P3-6)
| # | Item | Result |
|---|---|---|
| D-1 | `.dockerignore` vs build needs | **FAIL (blocker)**: BUG-01 |
| D-2 | Ports: api 3000, readiness 3001/3002, web 3100, admin 3200, Caddy 8080, S3 8333 (+ master 9333 for the healthcheck), mailpit 1025/8025, bog-mock 4100 | **PASS**. Consistent across compose, the Dockerfiles, `env.ts`, `create-local-env.mjs`, the Caddyfile and CI. |
| D-3 | Env names: compose `environment` overrides the `.env` host names (`DATABASE_URL`, `REDIS_URL`, `APP_URL`, `NODE_ENV=production`, `TRUSTED_PROXY_IPS=172.30.0.10`) | **PASS**. `.env` sets no `OPENAPI_VALIDATE_RESPONSES`/`STAFF_BODY_TOKENS_ENABLED`, so the production refusals in `env.ts` are not triggered. Every ADR-013 variable name (35) is in `.env.example`. |
| D-4 | Healthchecks and `depends_on` chain: postgres → migrate (completed) → api (image `HEALTHCHECK` on :3000) → web/admin (image `HEALTHCHECK`) → caddy; worker overrides the healthcheck to :3002 | **PASS** |
| D-5 | API image: `pnpm deploy --prod` output, openapi.yaml copied, `OPENAPI_SPEC_PATH` set, user `node`, read-only root FS + tmpfs | **PASS**. Simulated outside Docker: filtered install, `prisma generate`, `nest build`, `pnpm deploy --prod`, then ran in production: health 200. |
| D-6 | Next image: standalone layout `apps/<APP>/server.js` with `outputFileTracingRoot` = repo root; `public/` created by the `assets` step before `next build` | **PASS** (checked in the local build output), except for D-1 |
| D-7 | bog-mock image runs `node src/server.ts` without a `package.json` | **PASS with note**. Node 24 type stripping + module-syntax detection work, but print a `MODULE_TYPELESS_PACKAGE_JSON` warning (BUG-12). |
| D-8 | Caddy: strips `X-Forwarded-*`, `X-Real-IP`, `Forwarded`, `True-Client-IP`, `CF-*`, `X-MyTask-Client-IP/-Country/-Visitor-*/-Service-Auth`; sets `X-MyTask-Client-IP {client_ip}`; drops the default `X-Forwarded-*` on `header_up`; removes `Server`; `/api/v1/admin/*` → 404 on the public host; no `trusted_proxies` locally | **PASS** by reading (ADR-013 §15/§16). Leaving the rest of the header work to the security review. |
| D-9 | SeaweedFS + `s3-init` | **PASS with minor**: BUG-10 (the healthcheck probes the master, not the S3 gateway; one attempt only; failures are masked) |
| D-10 | Postgres init + migration: extensions `pg_trgm`, `btree_gist`, `citext`, `vector` | **PASS** by reading; the CI smoke test checks them. Init script is LF and mode 100755. |
| D-11 | CI workflow: action majors exist (checkout v7, setup-node v7, pnpm/action-setup v6.1 supports pnpm 12, upload-artifact v7); service containers for PG/Redis; `RUN_INTEGRATION` passed through turbo `env`; `CI=true` disables server reuse in E2E; oasdiff on PRs only; smoke test covers health, request id, `Server` header, SSR → API, admin 404, noindex, readiness, extensions, buckets, bog-mock, mailpit | **PASS by reading**, but the `docker` job will fail at "Build images" because of BUG-01. The P3-6 "green on the pull request" condition is therefore not met. |
| D-12 | Worker uses `image: mytask-api:local` built by the `api` service | **PASS with note**. CI builds first, so this is fine. With `up --build`, very old Compose versions may try to pull it. `pull_policy: never` on `worker` would make that explicit (no bug filed). |

## 8. Handoff claims checked
| Claim | True? |
|---|---|
| 398 paths, 768 schemas, 35 events (34 + `file.processed`) | Yes |
| 21 `x-money` operations guarded | Yes (and it is exactly the set of Idempotency-Key operations) |
| 2,748 en / 2,698 ka legacy keys; 122 `:param`; 5 dups; 14 HTML strings; 56 en-only, 6 ka-only; 4 placeholder mismatches; 5 non-`t_*`; 4 empty ka | Yes (independent count). The dups are 5 en / 3 ka. |
| 2 NEW keys, en first, ka alongside | Yes |
| "server-generated `X-Request-Id`" | **Partly**. Only for requests that pass the contract validator (BUG-02). |
| "`{code,message,details}` error filter localized" | Yes |
| 18 unit/HTTP/contract + 2 integration tests; web 4 + admin 1 Playwright | Yes |
| `expo export` Android | Yes |
| Built API in production from a `pnpm deploy` bundle | Yes |
| Contract `verify:final` 0 errors, 715/715 | Yes |
| `.env.example` lists every ADR-013 name | Yes (35/35) |
| Import boundaries enforced | Yes |
| "Turborepo AGENTS.md disabled; CLAUDE.md stays the single rules file" | **Not fully**. Next.js-generated `apps/web/{CLAUDE,AGENTS}.md` and `apps/admin/{CLAUDE,AGENTS}.md` are committed (BUG-13). |
| ADR-017 "proposed"; STATUS "not pushed" | **Stale**. ADR-017 was accepted in `ae17e141`, and `origin/feat/platform-core` exists (BUG-14, docs only). |
| Docker not verified | Correct, and BUG-01 shows the first run would fail. |

## 9. Bugs

### BUG-01: **BLOCKER**. Web and admin Docker images cannot be built: `.dockerignore` removes the committed tokens `dist/`
- File: `.dockerignore` (line `**/dist`) + `infra/docker/next.Dockerfile`
- Why: `packages/tokens/dist/` is committed on purpose (packages/tokens/README.md, commit `e2c8953e`), and web/admin import `@mytask/tokens/tokens.css` and `fonts.css` (`apps/web/src/app/[locale]/layout.tsx:1-2`, `apps/admin/src/app/layout.tsx:1-2`), which point to `./dist/*.css`. `**/dist` drops it from the build context. The Dockerfile then runs only `pnpm --filter "@mytask/${APP}" build`, which does not build `@mytask/tokens` (that only happens through turbo's `^build`).
- Steps to reproduce (without Docker, as done here): (1) `git archive HEAD` into an empty folder; apply `.dockerignore` (delete `legacy/`, `docs/**` except `docs/04-api/openapi.yaml`, and `packages/tokens/dist`). (2) `pnpm install --frozen-lockfile --filter "@mytask/web..."`. (3) In `apps/web`: `node ../../packages/assets/copy-web-assets.mjs public && next build`.
- Actual: `Turbopack build failed with 2 errors: Module not found: Can't resolve '@mytask/tokens/fonts.css' … '@mytask/tokens/tokens.css'`. The same applies to admin. So `docker compose --profile apps up --build` (SETUP-LOCAL §5) and the CI `docker` job fail at "Build images".
- Expected: images build. Possible fixes for devops: add `!packages/tokens/dist` (and `!packages/tokens/dist/**`) after `**/dist` in `.dockerignore`, or build through turbo in the Dockerfile (`pnpm turbo run build --filter=@mytask/${APP}`).

### BUG-02: **MAJOR**. Requests rejected by the contract validator get no `X-Request-Id` and are not logged
- Files: `apps/api/src/app.setup.ts:30-33` (validator registered with `app.use` before `app.init()`), `apps/api/src/platform/logging/logging.module.ts` (request id set by pino-http middleware, which Nest registers later)
- Rule broken: `docs/04-api/CONVENTIONS.md:90`: "All error responses carry the `Error` body and `X-Request-Id`." Also architecture §7.11 (request id in logs and on client error screens).
- Steps: build the API and run it (`NODE_ENV=production`, dummy DB/Redis URLs). Then:
  - `curl -D - "http://127.0.0.1:3010/api/v1/gigs?page=abc"` → 400 VALIDATION_FAILED, **no `X-Request-Id`**
  - `curl -D - -X POST -H "Content-Type: text/plain" --data x http://127.0.0.1:3010/api/v1/auth/login` → 400, **no `X-Request-Id`**
  - `curl -D - http://127.0.0.1:3010/api/v1/nope` and `POST /api/v1/health` → 404, **no `X-Request-Id`**
  - Compare: `GET /api/v1/users/abc` (a contract path the validator lets through) → 404 **with** `X-Request-Id`.
- Also: none of the rejected requests appears in the pino log (only `/api/v1/users/abc` was logged). This affects every future slice, because every 400 from request validation will be untraceable. The test `health.test.ts` only checks the id on a 200.
- Expected: every response, including validator errors, has a server-generated `X-Request-Id` and a log line. For example, register the request-id/pino middleware before the validator, and add a test that asserts `X-Request-Id` on a 400 and on an unknown-path 404.

### BUG-03: **MAJOR**. Mobile setup step fails: Expo ignores `EXPO_PUBLIC_API_URL` in the repository-root `.env`
- Files: `docs/SETUP-LOCAL.md` §4 step 2, `apps/mobile/app.config.ts:18`, `scripts/create-local-env.mjs` (writes the value only to the root `.env`)
- Steps: (1) root `.env` containing `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api/v1`. (2) `cd apps/mobile && npx expo config --type public --json`.
- Actual: `"apiUrl":"http://localhost:3000/api/v1"`. Expo CLI loads `.env` from the app's own folder (`apps/mobile/.env`), not from the monorepo root. With the same line in `apps/mobile/.env`, it shows `"apiUrl":"http://192.168.1.20:3000/api/v1"`. The phone therefore calls its own `localhost` and shows "API მიუწვდომელია". The Owner cannot pass the mobile part of the P3-7 "done when" or gate item 1.
- Expected: the documented step works. Possible fixes: load the root `.env` in `app.config.ts` (e.g. `process.loadEnvFile('../../.env')` when it exists), or document and generate `apps/mobile/.env`.

### BUG-04: minor. IMPORT-REPORT.md describes the fallback wrongly: Georgian UI shows raw keys for en-only keys
- File: `packages/i18n/IMPORT-REPORT.md` ("Keys only in English (56; … the client shows English)"), `packages/i18n/src/index.ts` (`fallbackLng: 'ka'`)
- Steps: i18next with the shared `i18nextOptions`, `lng: 'ka'`: `t('t_gig_title')` → `"t_gig_title"` (the raw key), and `t('t_you')` → `""` (4 empty ka values).
- Expected: either the report says what really happens, or the fallback is `ka → en` for these legacy gaps. This is a product decision; it must be settled before slices use these 56 keys.

### BUG-05: minor. Raw sizes in shell styles despite "tokens only"
- Files: `apps/web/src/app/[locale]/globals.css` and `apps/admin/src/app/globals.css` (`max-width: 40rem`; `--mt-size-layout-prose` exists), `apps/web/src/app/[locale]/page.tsx` (`height={40}`), `apps/admin/src/app/page.tsx` (`height={32}`), `apps/mobile/src/app/index.tsx` (`logo: { height: 40, width: 160 }`)
- Expected: token values (or a token added by the designer).

### BUG-06: minor. Hard-coded English in the admin document title
- File: `apps/admin/src/app/layout.tsx` (`title: 'MyTask.ge admin'`). The brand-only `alt="MyTask.ge"` / `accessibilityLabel="MyTask.ge"` and web `title: 'MyTask.ge'` are acceptable as a brand name, but "admin" is a translatable word.

### BUG-07: minor. Local Playwright silently reuses any server already on 3100/3200, so it can pass against the wrong build
- Files: `apps/web/playwright.config.ts`, `apps/admin/playwright.config.ts` (`reuseExistingServer: !process.env.CI`)
- Seen during this review: with another checkout's servers on 3100/3200, `pnpm --filter @mytask/web test:e2e` "passed" without starting this build (`next start` on 3100 fails with `EADDRINUSE`). CI is not affected (`CI=true`).
- Expected: an explicit opt-in (e.g. `PW_REUSE=1`), or a port check that fails loudly.

### BUG-08: minor. Contract enums typed by hand
- Files: `packages/api-client/src/index.ts:9-11` (`Locale`, `ClientKind` = the contract `XMyTaskClient` enum), `apps/api/src/platform/errors/messages.ts:6` (`Locale`)
- Expected (CLAUDE.md "never hand-written duplicates"): derive them from `@mytask/types` (e.g. the generated header parameter type) so a contract change breaks the build.

### BUG-09: minor. SETUP-LOCAL.md gaps a non-developer will hit
- File: `docs/SETUP-LOCAL.md`
- (a) On a fresh Windows PC, PowerShell's default script policy can block `npm`/`pnpm` (`pnpm.ps1 cannot be loaded`). Add the one-line fix (`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`) to the troubleshooting table.
- (b) §3: "`docker compose ps` … `s3-init` says `exited (0)`". Plain `docker compose ps` does not list exited containers; it should be `docker compose ps -a`.
- (c) §8 "port is already allocated" lists 5432, 6379, 3000, 3100, 3200, 8025, 8080, but 1025, 3001, 3002, 4100 and 8333 are also used.

### BUG-10: minor. `s3-init` can finish "successfully" without buckets
- File: `docker-compose.yml` (`s3` healthcheck on master `:9333/cluster/status`, `s3-init` command)
- The S3 gateway on `:8333` may not be ready when the master is healthy. `s3-init` tries once (`restart: 'no'`), and the script's exit code is that of the last `list-buckets`, so a failed `create-bucket` is hidden. The CI smoke test would catch it (it greps `kyc`), but the Owner's `pnpm infra:up` would not.
- Expected: a healthcheck on the S3 port and a retry loop with `set -e`.

### BUG-11: minor. `/ka/` takes two redirects
- `GET /ka/` → 308 `/ka` → 301 `/`. One 301 is enough (SEO, url-map). File: `apps/web/src/proxy.ts` (runs after Next's trailing-slash redirect).

### BUG-12: minor. Error details and small runtime nits
- (a) The 415 validation field name is a mangled path: `{"field":".api.v1.auth.login","code":"unsupported_content_type"}` (`apps/api/src/platform/errors/error.filter.ts`, field mapping). It should be empty or `body`.
- (b) `tools/bog-mock/Dockerfile` copies `src` without `package.json` (`"type": "module"`). It works through syntax detection but warns `MODULE_TYPELESS_PACKAGE_JSON` on every start.
- (c) The readiness servers listen on all interfaces (`apps/api/src/platform/health/readiness.ts:37`), so with `pnpm dev`, `:3001` is reachable from the LAN. It only returns ok/fail, but it is flagged for the security review (architecture §7.11 says internal).
- (d) `infra/postgres/init/01-test-database.sh` creates `<db>_test` "so `pnpm test` never touches the development data", but nothing points tests at it. The integration tests use `DATABASE_URL` (the dev DB) when `RUN_INTEGRATION=1` runs locally.

### BUG-13: minor. Second agent-rules file committed
- Files: `apps/web/CLAUDE.md`, `apps/web/AGENTS.md`, `apps/admin/CLAUDE.md`, `apps/admin/AGENTS.md` (Next.js-generated "This is NOT the Next.js you know"). This contradicts the handoff ("CLAUDE.md stays the single rules file"). The orchestrator should decide whether to keep them (they are re-created by `next dev`) or to disable them.

### BUG-14: minor (docs). Stale statements
- `docs/handoffs/2026-09-30-devops-engineer-to-orchestrator-p3-platform-core.md` and `docs/03-architecture/phase-3-plan.md` P3-5 ("minio") say ADR-017 is *proposed*, but it is accepted (commit `ae17e141`; compose comment agrees). `docs/STATUS.md` says "not pushed", but `origin/feat/platform-core` exists.

## 10. Phase 3 plan "Done when": result per task
| Task | Done when | Result |
|---|---|---|
| P3-1 | `pnpm install`, `pnpm lint`, `pnpm typecheck` pass | **PASS** |
| P3-2 | `pnpm gen` repeatable; CI fails on drift or hand edits | **PASS** |
| P3-3 | import repeatable; report lists HTML-bearing strings | **PASS** (minor BUG-04) |
| P3-4 | typecheck, unit/contract tests and builds pass | **PASS** for the criterion, but BUG-02 (major) is an API platform defect |
| P3-5 | `docker compose up` starts infra; `--profile apps` serves web/admin/api via Caddy | **FAIL**: BUG-01 (the apps profile cannot build). The infra part was not runnable here (no Docker); I found no static defect that would stop it apart from BUG-10. |
| P3-6 | CI green on the pull request | **FAIL (expected)**: the `docker` job breaks on BUG-01. The other jobs reproduce green locally. |
| P3-7 | Owner can follow SETUP-LOCAL without help | **FAIL**: BUG-03 (mobile) and BUG-01 (§5), plus minor BUG-09 |

## 11. What the responsible engineers must do (handoff)
- **devops-engineer**: fix BUG-01 (then run `docker compose --profile apps build` in CI or on a machine with Docker), BUG-03 (together with the SETUP-LOCAL text), BUG-09, BUG-10, BUG-11, BUG-12(b)(d), BUG-07, BUG-13 (with the orchestrator), BUG-14.
- **backend-engineer**: fix BUG-02 with tests (request id + log line on a validator 400, unknown-path 404 and 415), BUG-12(a), BUG-08 (`messages.ts`). Look at BUG-12(c) with the security reviewer.
- **web-engineer / mobile-engineer**: BUG-05, BUG-06, BUG-08 (`packages/api-client`).
- **Owner / product-analyst**: decide the fallback for the 56 en-only legacy keys and the 4 empty Georgian values (BUG-04).
- **QA re-test** after the fixes: V-1…V-16 again, the BUG-01 build (ideally the real CI `docker` job), BUG-02 curl checks, BUG-03 `expo config` check.
