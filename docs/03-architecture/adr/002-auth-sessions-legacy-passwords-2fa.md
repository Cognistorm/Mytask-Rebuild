# ADR-002: Authentication — tokens for web and mobile, legacy bcrypt passwords, email 2FA
Date: 2026-09-28 | Status: proposed

> **Revised 2026-09-28** to match Owner decisions made after P2-B1: Q-082 (2FA trigger is the admin setting S-124 `auth.two_factor.trigger`, default `new_device`, option `new_device_or_ip`) and P-4 as adjusted by the Owner (staff 2FA is the admin toggle S-060, default ON, never hard-coded). Changed: Context, Decision §5, Consequences. The data tables are in `data-model.md` §3.A.

## Context
- Web and mobile must use the same API and the same login rules. Legacy uses Laravel session cookies (`config/auth.php:38-50`), which do not suit a mobile app.
- Vision "must not break": existing users log in with their current passwords. Legacy stores bcrypt hashes, 10 rounds (`config/hashing.php:18,32`, BR-005), PHP prefix `$2y$`. Staff accounts (`admins`) also use bcrypt.
- Legacy bugs: social login ignores banned/pending status (R-020); no user login throttling (R-043); reCAPTCHA optional.
- Owner decisions: email 2FA optional per user with a global admin toggle, code only from a new device/IP (Q-043, Q-063); toggle ON at launch, OFF suspends 2FA for all users and remembers choices (Q-072); staff 2FA is an admin toggle, default ON, never hard-coded (P-4 adjusted, S-060); the 2FA trigger is admin-configurable, default new/unrecognised device (Q-082, S-124); social login keys entered in the admin panel (Q-032); keep restrictions, appeals, IP banning (Q-057).
- Settings: S-052…S-069 and S-124.

## Decision
1. **Tokens.**
   - Access token: JWT signed with Ed25519 (EdDSA), lifetime 15 minutes, claims `sub`, `aud` (`user` | `staff`), `sid` (session id), `iat/exp`. Private key only in the API's `.env`; the public key allows other internal services to verify later.
   - Refresh token: opaque 256-bit random string; only its SHA-256 hash is stored in `sessions` (user, device info, IP, created, last used, expires). Rotated on every refresh. If an already-used refresh token is presented, the whole session family is revoked (theft detection). User refresh lifetime 30 days sliding (spec 01 may tune); staff 12 hours.
   - Revocation: logout, password change (all other sessions), admin ban/restrict, session list "revoke". Access tokens are short, so revocation takes effect within 15 minutes; for bans the API also checks a small Redis deny-list of revoked `sid`s on each request.
2. **Where tokens live.**
   - Web (`mytask.ge`): `HttpOnly; Secure; SameSite=Lax` cookies set by the API (access cookie path `/`, refresh cookie path `/api/v1/auth`). Cookie-authenticated unsafe requests (POST/PUT/PATCH/DELETE) must include the header `X-MyTask-Client: web` and an `Origin` equal to the site origin, otherwise 403 (CSRF protection without tokens in JavaScript). Next.js server components read the cookie and call the API with `Authorization: Bearer`.
   - Mobile: `expo-secure-store` (Keychain/Keystore); `Authorization: Bearer`; refresh handled by `packages/api-client` wrapper.
   - Admin (`admin.mytask.ge`): host-only cookies for the `staff` audience, same CSRF rule. User tokens are never accepted on staff endpoints and vice versa.
3. **Legacy password compatibility.** Migrated users keep their hash with `password_algo = 'bcrypt_legacy'`. Login: verify with a maintained bcrypt library after normalising the prefix `$2y$` → `$2b$` (identical algorithm, only the label differs). On success, immediately re-hash the plain password with **Argon2id** (memory 19–64 MiB, parameters tuned for the host) and set `password_algo = 'argon2id'`. The same applies to staff accounts. Users with `password = NULL` (social-only) can log in with their provider or set a password with "forgot password". Legacy sessions/remember tokens are not migrated: every user logs in once after cutover.
4. **One login pipeline.** Password login, social login callback, 2FA verification and refresh all end in one `issueSession()` function that checks: account status (active/verified allowed; pending, banned, trashed refused with specific error codes), restriction (restricted users get a limited token that only reaches the restriction/appeal endpoints, BR-008, Q-057), IP ban list, and the 2FA requirement. This fixes R-020 by construction.
5. **Email 2FA.**
   - **Who:** a user when S-056 is ON **and** the user switched 2FA on; a staff member when **S-060** `auth.two_factor.staff_required` is ON (Admin Panel toggle, default ON, P-4 as adjusted by the Owner). S-060 is independent of S-056. S-060 OFF means no code for staff.
   - **When a code is asked: setting S-124 `auth.two_factor.trigger`** (Q-082), read at each login, same rule for users and staff:
     - `new_device` (**default**): a code is asked when the device is not trusted, i.e. never confirmed or its trust is older than S-059 days. "Device" = a random device identifier issued by the server (a long-lived secure cookie on web and admin, an install id in SecureStore on mobile), stored only as a hash. A new IP on a trusted device does not ask for a code (mobile networks change IP often); the IP is recorded in the session list.
     - `new_device_or_ip`: a code is also asked when the IP is not yet confirmed for that trusted device within S-059 days.
     - Data: `trusted_devices` plus `trusted_device_ips` (every successful code confirms the device **and** the current IP). Both tables are always written, so the Owner can switch S-124 at any time without data changes; the new value applies from the next login.
   - After a correct password (or social callback, spec 01 AC-30) on an untrusted device/IP: the API answers `202 { challengeId, channel: "email", expiresAt }` and queues an email with a 6-digit code (stored as a hash; TTL S-057 = 10 min; S-058 = 5 wrong attempts invalidate it; resend: 60 s cooldown, at most 5 codes per 15 minutes, spec 01 R-A6).
   - `POST /auth/2fa/verify { challengeId, code }` → tokens + trust for the device (and the IP) for S-059 = 30 days.
   - Switching 2FA on or off needs re-authentication (password, or an email code for social-only accounts, P-15). Switching it off or changing/resetting the password forgets all trusted devices (spec 01 AC-31).
   - Toggle OFF (S-056) suspends user 2FA but keeps each user's choice (Q-072); staff are not affected by S-056.
6. **Brute-force protection.** Per-account+IP counters in Redis: S-062 (5 failures / 15 min) → lock S-063 (15 min), with a generic error message. Staff login keeps the legacy IP-ban rule (S-064 = 3 failures). reCAPTCHA (S-061) verified server-side on web register/login/contact when ON; mobile relies on throttling and may use reCAPTCHA Enterprise / App Check later (spec 01 decides).
7. **Social login.** OAuth 2.0 / OIDC "authorization code + PKCE". Provider client secrets come from the settings register (encrypted, write-only, ADR-005). Mobile uses the system browser (`expo-auth-session`) and exchanges the code with the API; the API does all token handling. Linking rules follow legacy BR-006 unless spec 01 changes them.
8. **Passwords.** Legacy rules kept (8–60 chars, one uppercase, one digit, BR-001); reset tokens single-use, hashed, TTL S-055; password change notifies the user (legacy `PasswordChanged`).

## Alternatives considered
- **Server sessions (cookie) for web + separate tokens for mobile** — two auth systems to secure and test. Rejected.
- **Access and refresh token in `localStorage` on web** — readable by any XSS. Rejected in favour of HttpOnly cookies.
- **Long-lived JWT without refresh** — cannot be revoked. Rejected.
- **Force all users to reset passwords at cutover** — breaks the vision requirement. Rejected.
- **Keep bcrypt forever** — acceptable security, but Argon2id is the current recommendation and the re-hash-on-login costs nothing.
- **Hosted identity (Auth0, Clerk, Cognito)** — monthly cost per user, harder legacy-hash import, data outside our control. Rejected.
- **TOTP (authenticator app) 2FA** — stronger, but the Owner asked for email codes; can be added later as a second method without changing the pipeline.

## Consequences
- Easier: one auth flow for all clients; legacy users notice nothing; banned/pending checks cannot be skipped by any login method.
- Harder: CSRF discipline on cookie-authenticated web requests (enforced centrally in a guard); key management for Ed25519 signing keys (rotation supported with a `kid` header).
- Must change: spec 01 defines exact error codes and UX; data-model.md defines `sessions`, `refresh_tokens`, `trusted_devices`, `trusted_device_ips`, `two_factor_challenges`, `users.password_algo`, `users.locale` (§3.A); security review (P2-B5) checks the token and CSRF design.
- Answered (Q-082): the trigger is not fixed in code; it is setting S-124 with the default "new or expired device". A stricter mode (`new_device_or_ip`) is available to the Owner in the Admin Panel. Trade-off documented for the Owner: with `new_device_or_ip`, mobile users on changing networks will be asked for codes often.
