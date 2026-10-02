# 4.1.8b Online status (presence) and createUserReport

From: backend-engineer · To: backend-engineer (4.1.9 onward, later report slices), web-engineer (4.1.17, 4.1.20), mobile-engineer, QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **Online status (R-P4, BR-012).** New `PresenceService` (`apps/api/src/modules/auth/presence.service.ts`), called
  by the auth guard after every successful user authentication. This covers user routes, restricted-user routes and
  signed-in visitors on `@OptionalUser` routes. Staff sessions do not count.
  - Each request: one Redis `SET presence:gate:{userId} NX EX 60`. The first request of a minute also sets
    `presence:user:{userId}` (TTL 10 min) and writes `users.last_activity_at` in the background. So the column is
    written **at most once a minute**.
  - The guard awaits the Redis part (the next request already sees the user online). It never fails a request: errors
    are logged.
  - `PresenceService.online(users)` = one `MGET` for a list. When Redis cannot answer, it falls back to
    `last_activity_at` ≤ 10 min, so public pages still render. Use `online()` for `UserSummary.isOnline` in later
    slices' lists. The realtime `presence.heartbeat` (slice 08) should call `touch()` as well.
  - `getUserProfile.isOnline` now uses it.
- **`createUserReport`** (`POST /users/{username}/reports`, spec 02 AC-14):
  - Reason trimmed; blank → `400 VALIDATION_FAILED` `t_validator_required`; > 1,500 → contract validator.
  - Guests 401 (client shows `t_u_must_login_to_report_this_profile`); yourself → `403 FORBIDDEN`; pending, banned,
    deleted or unknown profile → 404; restricted callers → 403 ACCOUNT_RESTRICTED (audience `user`).
  - One report per reporter and profile (`reports` UK). The first answers **201**. A second one answers **200** with
    the same id, replaces the reason and puts the report back to `pending` (decision fields cleared), like legacy
    `updateOrCreate(... seen = false)` (`legacy/APP/app/Livewire/Main/Profile/ProfileComponent.php:316-326`).
  - **EV-13** `Admin/ProfileReported` goes through the outbox to every S-100 address on **every** report, as legacy
    did. The email template is in `platform/mail/templates.ts` (legacy `Notifications/Admin/ProfileReported.php`:
    subject `t_subject_admin_profile_reported`, line `t_notification_admin_reported_profile`, button
    `t_reported_users` → admin `/reports`). The keys already existed in `packages/i18n`, so no new keys.
  - **SEC-23 limit:** new `ReportLimiter` (`modules/profiles/report-limiter.ts`, exported by `ProfilesModule`):
    10 reports per user per hour (fixed window), shared key for all four report operations → `429 RATE_LIMITED` with
    `Retry-After`. `createGigReport`, `createProjectReport` and `createProposalReport` must call the same limiter.

## Files created/changed
- `apps/api/src/modules/auth/presence.service.ts` (new), `auth.guard.ts`, `auth.module.ts`
- `apps/api/src/modules/profiles/report-limiter.ts` (new), `profiles.service.ts`, `profiles.controllers.ts`,
  `profiles.module.ts`
- `apps/api/src/platform/outbox/outbox.service.ts` (EV-13 type), `apps/api/src/platform/mail/templates.ts` (EV-13)
- `apps/api/test/profiles.test.ts` (24 tests now, 7 new)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- 4.1.9: languages + skills CRUD, `putMyLinkedAccounts`.
- 4.1.15: EV-13's email is done here. The remaining spec 02 templates are EV-11, EV-12, EV-14…EV-18 and EV-126.
- Web 4.1.17/4.1.20: the report modal shows `t_profile_has_been_successfully_reported` on both 200 and 201.

## Open questions / risks
- No new Owner question.
- **Owner text check:** the existing Georgian value of `t_notification_admin_reported_profile` in
  `packages/i18n/ka.json` is the legacy English sentence (legacy `lang/ka` was never translated). I left it as it is.
  The Owner may want to translate it by hand.
- Presence adds one Redis round trip to every authenticated request. Redis down already answers 503 in the guard, so
  this adds no new failure mode.
- Tests: API 277 passed / 5 skipped (was 270). Typecheck, lint, Prettier and the i18n check pass.
