## What I did
ROADMAP 3.17d (security reviews 02/03: SEC-35 rest, SEC-42, SEC-50, SEC-51, SEC-39).
- **SEC-35:** `register` limited to 10 per IP per hour (Owner Q-157), IPv6 by /64; above → 429 `RATE_LIMITED` with `Retry-After`. Counted before reCAPTCHA.
- **SEC-42:** the S-062 login lock and the R-A9 link-email limits use `ipBucket` (IPv6 /64), like the global limiter and the staff IP ban.
- **SEC-50:** the global limiter runs as an early `app.use` in `configureApp`: request id → limiter → JSON parser → locale → cookies → CSRF → contract validator. Removed from `AppModule.configure` (app-version gate stays there).
- **SEC-39:** body-parser errors → 400 `VALIDATION_FAILED` (`fields[0]`: `body`, `invalid_json` or `too_large`); not logged (the raw body may hold a password); `X-Request-Id` set before parsing.
- **SEC-51:** Express `case sensitive routing` ON; CSRF, limiter and app-version compare the lower-cased path.
- Contract 1.2.2: `register` `x-rate-limit` text only; ADR-002 §6 revised.

## Files created/changed
- `apps/api/src/app.setup.ts`, `apps/api/src/app.module.ts`, `apps/api/src/platform/errors/error.filter.ts`, `apps/api/src/platform/csrf/csrf.middleware.ts`, `apps/api/src/platform/rate-limit/rate-limit.middleware.ts`, `apps/api/src/platform/app-version/app-version.middleware.ts`
- `apps/api/src/modules/auth/{auth.constants,auth.service,throttle.service}.ts`
- `apps/api/test/rate-limit.test.ts` (5 tests)
- `docs/04-api/src/{openapi.base.yaml,paths/d1-platform-auth-profiles.yaml}` → `docs/04-api/openapi.yaml` 1.2.2; `packages/types`, `packages/api-client` regenerated
- `docs/03-architecture/adr/002-auth-sessions-legacy-passwords-2fa.md`, `docs/01-discovery/open-questions.md` (Q-159), `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **backend-engineer, 3.17e** (next).
- **web/mobile:** show `RATE_LIMITED` on register like other 429s (the generic error display already does; check in 3.17h).
- **Owner:** Q-159 (EV-02 cap); then 3.17l.

## Open questions / risks
- Q-159 open. SEC-49 (per-user keying of the global limiter for signed-in calls) is still open and not part of slice 01.
