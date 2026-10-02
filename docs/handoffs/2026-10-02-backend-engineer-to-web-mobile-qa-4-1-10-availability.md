# 4.1.10 Availability API and the availability-reset job

From: backend-engineer · To: web-engineer (4.1.18), mobile-engineer (4.1.23), backend-engineer (slices 04/12), QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **`putMyAvailability` (AC-22):** any user (Q-013), replaces the one notice (legacy deleted the old row and created a new one).
  - `unavailableUntil` (DateOnly) is stored as the **start of that day in Asia/Tbilisi** (UTC+4 all year).
    Legacy did the same: `Carbon::create($date)` at midnight, then `isFuture()`
    (`legacy/APP/app/Livewire/Main/Account/Profile/ProfileComponent.php:1079-1204`).
  - So **tomorrow is the earliest date**. Today or a past date → `400 VALIDATION_FAILED`, field `unavailableUntil`,
    `t_pls_select_availability_date_in_future`.
  - A date that does not exist (e.g. `2099-02-30`) → 400. If the contract validator lets the format pass, the API answers
    `t_invalid_carbon_date_format` (legacy key).
  - The message is trimmed. Blank → `t_validator_required` on field `message`. Length 1…750 comes from the contract.
  - Returns the `AvailabilityNotice` that was saved. The success toast is `t_ur_availability_settings_updated`.
- **`deleteMyAvailability` (AC-23):** clears the date and the message. 204, also when nothing was set.
- **Daily job `availability-reset` (AC-23, ADR-008 §5):** new `AvailabilityResetSweeper` in the worker. It is one UPDATE
  that clears rows whose `unavailable_until <= now()`, using the partial index from 4.1.7. It runs at worker start and
  then every hour. The dates are whole days, so in practice this is a daily reset, and a worker that was down at
  midnight catches up within an hour.
  - Readers already hide a passed date (`availabilityView`, 4.1.8a), so the notice is gone at midnight even before the
    job runs.
  - Legacy `UnavailableSellers.php` did the same, but only for sellers.

## Files created/changed
- `apps/api/src/modules/profiles/profiles.service.ts`: `availableFrom()`, `putAvailability`, `deleteAvailability`
- `apps/api/src/modules/profiles/profiles.controllers.ts`
- `apps/api/src/worker/availability-reset.sweeper.ts` (new), `apps/api/src/worker.module.ts`
- `apps/api/test/availability.test.ts` (new, 10 tests)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.1.11** (next): `updateMe`, `confirmEmailChange`, `updateMyPreferences`, `deleteMe` + 2FA purpose `email_change`.
- **Web/mobile availability modal:** the date picker's minimum is tomorrow (Georgian date). Show the 400 field message
  from `details.fields[].messageKey`.
- **Slices 04/12 (add-to-cart, offer requests, R-P5):** "unavailable" means `user_profiles.unavailable_until > now()`.
  Do not rely only on the column being null, because the job may run up to an hour late.

## Open questions / risks
- No new Owner question.
- The job's last-run time (`lastRunAt`) is not yet shown on readiness or on System health. The other sweepers do not
  show theirs either; that comes with ADR-008 §8 and spec 16 AC-69.
- `account.updated` (x-emits) is not sent yet; it waits for the realtime gateway (slice 08), as in 4.1.8a.
- Tests: API 311 passed / 5 skipped (was 301). Typecheck, lint and Prettier clean.
