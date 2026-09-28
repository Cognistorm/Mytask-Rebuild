# ADR-002: Authentication — tokens for web and mobile, legacy bcrypt passwords, email 2FA
Date: 2026-09-28 | Status: proposed

## Context
- Web and mobile must use the same API and the same login rules. Legacy uses Laravel session cookies (`config/auth.php:38-50`), which do not suit a mobile app.
- Vision "must not break": existing users log in with their current passwords. Legacy stores bcrypt hashes, 10 rounds (`config/hashing.php:18,32`, BR-005), PHP prefix `$2y$`. Staff accounts (`admins`) also use bcrypt.
- Legacy bugs: social login ignores banned/pending status (R-020); no user login throttling (R-043); reCAPTCHA optional.
- Owner decisions: email 2FA optional per user with a global admin toggle, code only from a new device/IP (Q-043, Q-063); toggle ON at launch, OFF suspends 2FA for all users and remembers choices (Q-072); staff 2FA is an admin toggle, default ON (P-4 adjusted, S-060); social login keys entered in the admin panel (Q-032); keep restrictions, appeals, IP banning (Q-057).
- Settings: S-052…S-069.

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
   - Applies to a user when S-056 is ON **and** the user enabled it; to staff when S-060 is ON.
   - After a correct password on an untrusted device/IP: API answers `202 { challengeId, channel: "email", expiresAt }` and queues an email with a 6-digit code (stored as a hash; TTL S-057 = 10 min; S-058 = 5 wrong attempts invalidates it; resend is rate-limited).
   - `POST /auth/2fa/verify { challengeId, code }` → tokens + a **trusted-device** record (device id from a long-lived random cookie on web / a random install id in SecureStore on mobile, plus the IP) valid S-059 = 30 days.
   - Toggle OFF (S-056) suspends user 2FA but keeps each user's choice (Q-072).
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
- Must change: spec 01 defines exact error codes and UX; data-model.md adds `sessions`, `trusted_devices`, `two_factor_challenges`, `password_algo`, `user.locale`; security review (P2-B5) checks the token and CSRF design.
- **Question for the Owner** (handoff): "new device/IP" — should a known device on a new IP (common on mobile networks) ask for a code? The proposal: ask when the **device** is unknown or the trusted period expired; an IP change alone does not trigger a code (it is logged and can trigger a "new login" email).
