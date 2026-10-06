# 4.1.11 Account settings API: updateMe, confirmEmailChange, preferences, deleteMe

From: backend-engineer · To: web-engineer (4.1.20), mobile-engineer (4.1.24), solution-architect (URL map), backend-engineer (slices 4, 5, 10, 11, 13), QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **`updateMe` (AC-29, AC-31):** username, email, full name, country, city. Omitted fields stay as they are.
  - Full name and city are trimmed; a blank value → 400 `t_validator_required`.
  - `countryCode` must be an active row in `countries` (only `GE` today), else 400 `t_validator_exists`. `null` clears it.
  - A taken username or email → 400 field code `unique` (`t_validator_unique`). Deleted accounts keep theirs reserved.
    The case-insensitive `citext` columns make the check case-insensitive.
  - **Accounts with a password:** `currentPassword` is required on every save (legacy `SettingsComponent.php:156-223`).
    Missing → `t_validator_required`; wrong → `t_ur_current_pass_does_not_match`. The SEC-04 in-session throttle applies,
    as it does for the other re-authentication operations.
  - **Accounts without a password (Q-144):** only an email change needs `challengeId` + `code` from an
    `email_change` challenge. Other saves need neither (EC-12). A code is accepted once and only for its own purpose.
    A code of another purpose → 422 `TWO_FACTOR_CODE_EXPIRED`, the same as the other re-authentication operations.
  - The unique checks run **before** the password or code check, so a save that would fail anyway does not use up a
    correct code.
  - A new username moves the profile at once. `/users/{old}` answers 404 (AC-31, EC-4).
  - Returns `Me`. The client shows `t_ur_account_settings_updated`, or `t_email_change_pending` when `pendingEmail` is set.
- **Email change (AC-30, P-18):** the email does **not** change on save.
  - An `auth_tokens` row (`email_change`, `new_email`, valid for S-054 minutes) is created, and any older open link
    stops working.
  - EV-11 goes to the **new** address with the link `{APP_URL}[/en]/auth/email-change?token=…`. EV-12, the notice,
    goes to the **old** address.
  - `Me.pendingEmail` now shows the open link's address. It was always `null` before.
  - Link emails are capped at **3 per hour per account and per IP**. Over the cap → 429 `RATE_LIMITED`. This reuses the
    R-A9 link-email limit and stops anyone using the form to spam addresses.
- **`confirmEmailChange` (public):**
  - Unknown, used or other-purpose token, or a deleted account → 422 `AUTH_LINK_INVALID` (`t_email_change_link_invalid`).
  - Expired → 422 `AUTH_LINK_EXPIRED` (`t_email_change_link_expired`).
  - Address taken meanwhile → 409 `DUPLICATE` (`t_validator_unique`); nothing changes.
  - On success the email is replaced and `emailVerifiedAt` and **`emailChangedAt`** are set. `emailChangedAt` starts the
    spec 14 AC-21 pause. Open verification and reset links stop working.
  - Answers `t_email_changed_success`.
- **`updateMyPreferences`:** saves `lastDashboard`, `theme` (`null` = platform default S-106) and `locale`.
  - Returns `Me`.
  - When the S-105 switcher is OFF, the theme is still stored. Clients hide the switch, and the contract defines no
    refusal.
- **`deleteMe`:** returns 204.
  - Soft delete: sets `deleted_at`, ends every session, removes trusted devices and cancels open codes and links.
  - Web: the session cookies are cleared.
  - Login, the auth guard and public profiles already skip deleted accounts. Email and username stay reserved.
  - **Pluggable refusals:** `AccountDeletionGuards` (`apps/api/src/modules/auth/account-deletion.guards.ts`) is
    exported from `AuthModule` and is empty in slice 1. A refusal → 422 `BUSINESS_RULE_VIOLATION` with the guard's
    message key.
- **`createMyTwoFactorChallenge` `email_change`:** already passed the purpose through. It now has tests: 202 for
  accounts without a password, 409 `STATE_CONFLICT` for accounts with a password.
- **`Me` mapper:** `countryCode`, `city` and `pendingEmail` are now real values. Login, refresh and `getMe` all use
  `AccountService.me()`.
- **Emails EV-11 / EV-12:** templates are added now, because the flow does not work without the link email.
  4.1.15 does not need to build them again.
- **i18n (NEW, en + ka):** `t_confirm_new_email`, `t_email_change_confirm_body`, `t_email_change_link_invalid`,
  `t_email_change_link_expired`.

## Files created/changed
- `apps/api/src/modules/auth/account-settings.service.ts` (new), `account-deletion.guards.ts` (new)
- `apps/api/src/modules/auth/account.service.ts` (`me()` with country + pending email; `reauthenticate` public with
  `email_change`), `auth.service.ts` (uses `AccountService.me`), `me.mapper.ts`, `me.controller.ts`,
  `auth.controller.ts`, `auth.module.ts`
- `apps/api/src/platform/mail/templates.ts` (EV-11, EV-12), `apps/api/src/platform/outbox/outbox.service.ts`
- `apps/api/test/account-settings.test.ts` (new, 17 tests)
- `packages/i18n/en.json`, `packages/i18n/ka.json`
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.1.12** (next): the portfolio API and the admin portfolio queue.
- **Web 4.1.20:**
  - Build the page `/auth/email-change?token=…` (plus `/en`). It calls `confirmEmailChange` and works with or without
    a session.
  - On success, call `getMe` again if signed in.
  - In settings, show the pending banner from `Me.pendingEmail`.
  - Accounts without a password: show "Send code" (purpose `email_change`) and the code field only when the email
    field changed.
- **Mobile 4.1.24:** the same settings form. The confirmation link opens on the web. The app does not claim the path
  yet; that is the architect's decision below.
- **Architect:** add `/auth/email-change` to `docs/03-architecture/url-map.md` (public, `noindex`, `?token=`). Decide
  whether the app's universal links claim it. I chose the path to match `/auth/verify`; the contract does not name it.
- **Later slices:** register your deletion guard in your module's `onModuleInit`:
  - slices 5, 10, 11: active orders or projects;
  - slice 4: balance;
  - slice 13: pending withdrawal. Add the key `t_cannot_delete_account_pending_withdrawal` then.

  The guard check runs before the delete transaction. If a slice needs it to be race-free against new orders, lock
  the user row in both places.

## Open questions / risks
- No new Owner question.
- **Technical default to confirm (QA/Security):** the 3-per-hour cap on email-change links (R-A9 pattern).
- Push tokens are not removed on delete yet, because the table comes with slice 14. `session.revoked` and
  `account.updated` are not emitted, because they wait for the realtime gateway (slice 8).
- No audit row for these user operations: the contract declares no `x-audit` for them.
- Tests: API 328 passed / 5 skipped (was 311). Typecheck, lint, Prettier and the i18n check are clean.
