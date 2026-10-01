## What I did
ROADMAP 3.17e (split into 3.17e / 3.17m / 3.17n first).
- **SEC-37:** `TwoFactorService.cancelOpen` cancels every open code of the account on password change, password reset and 2FA off (users) and on the staff password change. Resend refuses consumed, replaced, cancelled and more than 30 minutes old challenges (ADR-002 §5, technical constant). An exhausted challenge (S-058) can still be resent, as `t_2fa_too_many_attempts` tells the user. A cancelled or replaced code answers 422 `*_TWO_FACTOR_CODE_EXPIRED`.
- **User re-auth code:** stale challenge → 422 `TWO_FACTOR_CODE_EXPIRED` (was an undeclared 404 → 500); the exhausting wrong code counts on SEC-04 (same as the staff fix in 3.17c).

## Files created/changed
- `apps/api/src/modules/auth/{auth.constants,two-factor.service,account.service,auth.service}.ts`, `apps/api/src/modules/staff/admin-security.service.ts`
- `apps/api/test/two-factor-challenges.test.ts` (new, 5 tests)
- `docs/03-architecture/adr/002-auth-sessions-legacy-passwords-2fa.md` (§5), `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **3.17m** (architect + backend): SEC-41 + I-23 `remember_me` on the session row (data-model + migration).
- **web/mobile (3.17g/h):** after "Send a new code" answers 404 (challenge too old or replaced), send the user back to the login form; check the current screens do that.
- **Slice 15 admin (4.15.x):** when `adminSetPassword` and "disable a user's 2FA" are built, call `cancelOpen` too.

## Open questions / risks
- None for the Owner.
