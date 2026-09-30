# Handoff: security-reviewer -> orchestrator — P3 platform core re-check (ROADMAP task 3.1)
Date: 2026-09-30 | Branch: `feat/auth` @ `02434b76` | Report: `docs/06-qa/security/03-platform-core-recheck-2026-09-30.md`

## What I did
- Independent security re-review of the platform core (P3-1 … P3-7) on the delta `ede8d42e..02434b76`: rate limiter, idempotency, SecretBox (settings encryption), app-version gate, audit service, outbox + worker dispatcher, env schema, mail templates, contract validator changes, api-client refresh/sign-out and 426 handling, `create-local-env.mjs`, `preview.mjs`, plus the new local tools `db:seed` and `setting:set`. `app.setup.ts` also changed (Accept-Language normaliser) and was reviewed although it was not in the task list; `preview.mjs` was modified, not new.
- Re-verified the review 02 platform items with file:line evidence; quick regression pass over Caddyfile, compose, Dockerfiles, `.dockerignore`, CI, gitleaks, `pnpm-workspace.yaml`, SETUP-LOCAL (all unchanged since `ede8d42e`).
- Ran `pnpm install --frozen-lockfile` (OK), `pnpm --filter @mytask/api test` (**9 files, 73 tests passed**), `pnpm audit --prod` (**0 critical, 0 high, 3 moderate**, same mobile-toolchain items as I-9). Two throw-away probes (scratchpad only, nothing added to the repository) confirmed middleware order, SEC-39 and the mixed-case CSRF bypass.
- **Verdict: PASS with conditions.** 0 Critical, 0 High, 1 Medium (SEC-49), 7 Low (SEC-50 … SEC-56), 8 Info (I-12 … I-19).

## Files created/changed
- Created `docs/06-qa/security/03-platform-core-recheck-2026-09-30.md`
- Created `docs/handoffs/2026-09-30-security-reviewer-to-orchestrator-p3-platform-core-recheck.md` (this file)
- No product code changed. Nothing committed.

## What the next agent must do
- **Orchestrator:** tick ROADMAP 3.1 with verdict PASS with conditions; log in `docs/STATUS.md`; route the items below; keep slice 01 "done" blocked on review 02 condition 2 plus the new items in report section 6.2.
- **backend-engineer:** SEC-49 (limiter by user id for authenticated calls), SEC-50 (limiter before body parser / CSRF / validator; staff writes at 120), SEC-51 (case-sensitive routing or lower-cased path checks), SEC-52 (idempotency: never delete after successful work; Postgres record for money ops), SEC-53 (SecretBox AAD, authTagLength 16, key rotation, tests), SEC-55 (one outbox row per recipient), SEC-56 (local tools only against local DB; audit/version row for `setting:set`); still open from review 02: rest of SEC-35 (register per-IP limit, EV-02 cap), SEC-39, SEC-40, SEC-42 in per-operation keys, SEC-45 tests (Redis 503, env refusals, body-parser, SecretBox), I-3.
- **web-engineer:** SEC-49 (`apps/web/src/lib/api.ts` must forward visitor IP/UA with the service credential before any SSR data fetch); SEC-44 client (`packages/api-client/src/index.ts:134-136` — sign out only on 401/403); SEC-48 CSP in web and admin.
- **devops-engineer:** SEC-54 (`.dockerignore` `**/.pglite`, `.claude`; slim `migrate` image), SEC-46, SEC-45 CI probe through Caddy, SEC-43, SEC-48 Caddy headers, I-8 (`SEED_ADMIN_EMAIL`), I-13, I-14 (SETUP-LOCAL: `SETTINGS_ENCRYPTION_KEY`, first Super-admin, preview turns S-056/S-060 off, `setting:set`).
- **qa-engineer:** make Probe 1/Probe 2 permanent tests (SEC-39, SEC-50, SEC-51).
- **security-reviewer (task 3.16):** check SEC-42 in feature throttles and IP bans, the unique ledger ref of the referral credit (SEC-52), forced password change of the seeded Super-admin (SEC-56).

## Open questions / risks
- **Product-analyst:** is 120 writes per IP-minute acceptable behind Georgian carrier NAT, or should authenticated users be limited only per user (SEC-49)? Register per-IP number still unconfirmed (review 02).
- **Limit:** Docker is not installed on this machine; Caddy, compose and images were reviewed by reading only. The CI `docker` job is still their first real run, and it still does not probe header spoofing through Caddy (SEC-45).
- **Risk:** SEC-49 is latent today (only `/health` is fetched during SSR and it is exempt) but becomes a site-wide 429 outage with the first SSR data read; it must be fixed before that slice, not at Phase 6.
- **Risk:** SEC-54 matters the moment an image is built on a developer machine that has run `pnpm preview` and is pushed anywhere.
