# Handoff: backend + web + mobile (one session) → QA, security-reviewer — Slice 01 part A (auth core)
Date: 2026-09-30 | Branch: `feat/auth` (on top of `feat/platform-core`) | Spec: `docs/02-specs/01-auth.md`

## What I did
**Scope of part A** (Owner request "Login, Register, OTP"): register, email verification, login incl. legacy passwords, throttling, email 2FA, refresh/logout, `getMe`, password reset and change, sessions list / log out others, 2FA switch. **Part B (not done):** social login (S-065…S-069 OFF anyway), restrictions and appeals (need the files slice), staff login + IP bans + staff 2FA (admin), `createMyTwoFactorChallenge` / emailed codes for accounts without a password (only exist with social login), push-token removal on logout (spec 15), referral points (slice 09; the pending referral is stored and `ReferralService.creditSignup` is the single hook).

- **API (16 contract operations):** `register`, `login`, `verifyTwoFactorLogin`, `resendTwoFactorCode`, `refreshSession`, `logout`, `verifyEmail`, `resendVerificationEmail`, `requestPasswordReset`, `validatePasswordResetToken`, `completePasswordReset`, `getMe`, `changeMyPassword`, `listMySessions`, `revokeMyOtherSessions`, `updateMyTwoFactor`.
  - ADR-002: Ed25519 JWT 15 min; rotating refresh tokens with reuse detection (family revoked); Redis deny-list on every revocation; global guard denies by default, fails closed (503) without Redis; banned → `ACCOUNT_SUSPENDED`, restricted → `ACCOUNT_RESTRICTED` except `@AllowRestricted`; one `issueSession()`; web = host-only `__Host-mt_at` / `__Secure-mt_rt` (path `/api/v1/auth`) / `__Host-mt_did`, mobile = body tokens + device token.
  - Legacy `$2y$`/`$2a$` bcrypt verified (72-byte semantics kept) and upgraded to Argon2id in the same request; dummy Argon2 verify for unknown emails.
  - Throttles: S-062/S-063 per account+IP; slow mode 20/h with trusted-device and reCAPTCHA slot bypass (SEC-30) + EV-128; code cap 10/h across challenges + EV-129; in-session counter (SEC-04); link emails 3/h per address and per IP (R-A9); resend 60 s / 5 per 15 min.
  - Global CSRF rule (ADR-002 §2); `ClientIpResolver` (ADR-013 §16–§17); settings read from the `settings` table with register defaults (S-052…S-063, S-100, S-124); reCAPTCHA check (web, while S-061 ON).
  - Migration `20260930120000_auth_identity` (users, profiles(fullname), auth_tokens, sessions, refresh_tokens, trusted devices + IPs, 2FA challenges, settings, referrals, outbox + CHECKs/partial indexes of data-model §3.A).
  - Worker: outbox dispatcher (claim with `FOR UPDATE SKIP LOCKED`, deliver outside the transaction, retry, scrub codes/tokens after sending) + email templates EV-01/02/04/05/06/128/129 from legacy keys; `MAIL_TRANSPORT=log` for Docker-free previews (refused in production).
  - QA P3 bug 2 fixed: `X-Request-Id` on requests refused before routing.
- **Web:** `/auth/login` (+ 2FA code step with 6 boxes, paste, resend countdown), `/auth/register` (`?ref=` pre-fill), `/auth/password/reset`, `/auth/password/update`, `/auth/verify`, `/auth/request`, `/account` (summary, 2FA switch, logout); `/en/…` variants. Tokens-only CSS. `packages/api-client` got refresh-on-401 (single flight; reads retried, writes never replayed).
- **Mobile:** Login (+ code step), Register, Account/Logout; tokens and device token in SecureStore; QA P3 bug 3 fixed (Expo reads `EXPO_PUBLIC_API_URL` from the root `.env`).
- **i18n:** spec 01 + spec 15 (EV-128/129) texts and `t_ui_*` from components.md imported with their approved en/ka values; 1 NEW key `t_i_agree_terms_privacy` (en first, ka alongside) — the legacy `t_by_register_agree_terms_privacy` embeds HTML (ADR-006 §3).
- **Docker-free preview:** `pnpm preview` = PGlite (Postgres 17 in WebAssembly with pg_trgm/citext/btree_gist/pgvector) + in-process Redis + emails printed in the console. Not for real data.

## Verification (this machine, Windows, no Docker)
- API: **43 tests pass** (PGlite + in-process Redis; CI runs them on real Postgres + Redis), incl. legacy `$2y$` + Georgian password, refresh reuse → family revoked, logout deny-list, account+IP lock, 2FA challenge/verify/trusted device/resend throttle, reset flow ends sessions, CSRF foreign Origin / missing client header, ADR-013 §19 (a)(b)(c). Every response validated against `openapi.yaml`.
- Web: **6 Playwright tests pass** in Chromium against `pnpm preview`, incl. register → 2FA on → logout → new device → emailed code → signed in (ka), and the English wrong-password message.
- Mobile: typecheck, lint, Android bundle (`expo export`). **Not run on a device.**
- lint 9/9, typecheck 9/9, format, i18n check: green.

## What the next agent must do
1. **security-reviewer** (required: auth): the P3 platform-core review **did not finish** (the review agent hit a usage limit). Review `feat/platform-core` **and** this slice together: ADR-002 §1–§8 checklist, cookie flags on real HTTPS, CSRF middleware, `ClientIpResolver`, throttles, outbox secret scrubbing, `memory://`/`log` guards, ADR-013 §19(e) (Socket.IO — no gateway yet).
2. **qa-engineer:** test plan `docs/06-qa/plans/01-auth.md`, parity vs legacy login/register, mobile on a real phone (Expo Go), re-test P3 bugs 1–3 (1 fixed in `fix(ci)`, 2 and 3 fixed here).
3. **backend (part B):** items listed under "Part B" above; `messageKey` per common error code confirmed against spec 00 (Phase 3 uses legacy keys).
4. **devops:** remaining P3 QA minors (§11 of `docs/06-qa/reports/P3-platform-core-2026-09-30.md`).

## Open questions / risks
- Owner: QA P3 bug 4 — the 56 English-only legacy keys show the raw key in Georgian; choose a fallback (show English, or translate them).
- reCAPTCHA on mobile is not checked (ADR-002 §6: throttling only) — known limit.
- Emailed codes and link tokens sit in `outbox_events.payload` until sent (then scrubbed) — the security review should confirm this is acceptable or ask for encryption at rest.
- Q-153 (ADR-018 app version header) still waits for the Owner.
