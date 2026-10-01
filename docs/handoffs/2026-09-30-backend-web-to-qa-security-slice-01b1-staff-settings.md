# Handoff: backend + web (one session) → QA, security-reviewer — Slice 01 part B-1 (staff login + admin settings) and security fixes
Date: 2026-09-30 | Branch: `feat/auth` | Specs: 01 (AC-29, AC-51), 16 (AC-2, AC-7, AC-51…AC-56), 00 (register)

## What I did
**Owner decisions applied (2026-09-30):** Q-153 accepted (ADR-018 + S-130, contract 1.1.0); QA P3 finding 4 → Georgian drafts for all 51 English-only/empty legacy keys (`packages/i18n/translations/2026-09-30-ka-drafts.json`, for the Owner to refine); email 2FA stays switchable in the admin panel and is **OFF locally for now** (S-056 and staff 2FA S-060 seeded OFF by `pnpm preview`; `setting:set` helper for Docker databases, refused in production).

**Part B-1 (API):** `adminLogin` (username or email; legacy bcrypt upgrade; S-061; IP ban S-064 with the legacy "success clears the counter" rule, `legacy/APP/app/Livewire/Admin/Auth/LoginComponent.php:136`), `adminVerifyTwoFactor`, `adminResendTwoFactorCode` (staff 2FA under S-060, same tables, `STAFF_*` codes; wrong codes count towards the IP ban), `adminRefreshSession` (12 h, never extended), `adminLogout`, `adminReauthenticate` (password; 15-minute step-up bound to the session), `adminGetMe`, `adminListSettings`, `adminGetSetting`, `adminUpdateSetting` (area permission, register validation, optimistic version → 409, step-up → 403 `REAUTH_REQUIRED`, `setting_versions`, append-only `audit_log`, EV-124 to S-100 for critical rows). Staff tokens/cookies are separate (`staff` audience, `__Host-mt_staff_*`); user tokens never open `/admin/*` and vice versa. Code permission catalogue (compile-time equal to the contract enum), Super-admin system role, `pnpm db:seed` creates the first Super-admin (password printed once).
- Migration `20260930150000_staff_rbac_audit`: staff, roles, permissions, role_permissions, staff_roles, audit_log (append-only trigger), banned_ips, setting_versions, staff FKs.
- Settings registry now carries the admin metadata (area, type, limits, ka/en meaning, critical, step-up, write permission) for S-052…S-064, S-100, S-124, S-130 — the rows implemented so far; other rows arrive with their slices.

**Part B-1 (admin web):** `/login` (+ code step), `/settings` (grouped rows, switches for booleans, inputs for numbers/lists/enums, re-login prompt, save notice), logout. Form kit copied from the web app (to move into `packages/ui`).

**Security review (docs/06-qa/security/02-platform-core-and-slice-01a-2026-09-30.md, verdict PASS with conditions) — Medium findings fixed:**
- SEC-33 open redirect: `safeNext()` on the web login + E2E test.
- SEC-34 throttle races: login attempts, per-code attempts (atomic SQL), the 10/h code cap and the in-session counter are now **reserved before** the check; counters survive the lock; 2 concurrency tests (20 parallel requests).
- SEC-35 global per-IP limits (CONVENTIONS §14: 600 reads / 120 writes / 1,200 staff per minute, IPv6 per /64 — also SEC-42) + test; 429 treated as a global status by the response validator.
- SEC-36 production requires `SMTP_URL`; the worker never logs email content unless `MAIL_TRANSPORT=log` (itself refused in production).
- Also found by my tests and fixed: settings/register code read a setting on a second connection inside a transaction (deadlock until timeout) — reads moved before the transaction.

## Verification
API 53 tests (PGlite locally, real Postgres/Redis in CI). Web E2E 6 passed + 1 skipped (the 2FA flow skips itself while S-056 is OFF), incl. SEC-33. Admin E2E 2 passed: noindex login page; Super-admin switches S-056 on (re-login asked) and back off. lint/typecheck 9/9, format, i18n, gen:check green.

## What the next agent must do
- **Owner:** first Super-admin login locally: user `owner`, password printed once in the `pnpm preview` window on the first run (the seed never stores it). Turn 2FA on at http://localhost:3200/settings when you want it.
- **security-reviewer:** re-check SEC-33…SEC-36 fixes and review part B-1 (staff auth, step-up, settings write path, audit trigger, seed). Remaining Low items SEC-37…SEC-48 are open (list in the report).
- **qa-engineer:** slice 01 test plan incl. staff login/IP ban/settings; P3 minor findings.
- **solution-architect:** data-model gaps found: `staff.full_name` (contract `AdminMe.fullName` needs it; added as `full_name`), and no `twofa_purpose` value for staff re-authentication codes (`adminRequestReauthCode`, reauth `method: email_code` answers 400 until defined).
- **Next build step, part B-2:** social login (SEC-09/SEC-32(a) binding), restrictions + appeals (needs the files foundation F0: presigned uploads, scan), `createMyTwoFactorChallenge` for accounts without a password, banned-IP admin screen (AC-52), default roles of P-114.

## Open questions / risks
- The admin settings list shows only the rows implemented so far (15 of 130); the contract promises all rows — completes with slice 16.
- Georgian drafts need the Owner's review.
