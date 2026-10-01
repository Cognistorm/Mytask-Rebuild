## What I did
ROADMAP 3.17c: the emailed staff re-authentication code (data-model §3.A `staff_reauth`, ADR-002 §5, spec 16 AC-7).
- `twofa_purpose` gains `staff_reauth` (Prisma enum + migration `20261001090000_twofa_staff_reauth`).
- `adminRequestReauthCode` (`POST /admin/auth/reauth/code`, 202 `AdminAuthTwoFactorChallenge`): only while S-060 is ON (else 422 `BUSINESS_RULE_VIOLATION`, `t_2fa_disabled`); EV-06 to the staff email; the login-code send limits apply (60 s cooldown, 5 per 15 min per staff account, shared with staff login codes); audit `staff.reauth_code.request`.
- `adminReauthenticate` `method: email_code`: S-060 ON only; accepts only a `staff_reauth` code of the same staff member, once. An unknown, used, other-purpose or other-staff challenge answers 422 `STAFF_TWO_FACTOR_CODE_EXPIRED` (the contract declares no 404). Wrong codes, including the one that exhausts the challenge, count on the SEC-04 in-session counter; the SEC-03 account cap applies through `TwoFactorService.verify`. Success opens the 15-minute step-up window of this session; audit `staff.reauth`.

## Files created/changed
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261001090000_twofa_staff_reauth/migration.sql`
- `apps/api/src/modules/staff/staff-auth.service.ts`, `apps/api/src/modules/staff/staff.controllers.ts`
- `apps/api/src/modules/auth/two-factor.service.ts` (`ChallengeView.purpose` limited to the user-side contract purposes)
- `apps/api/test/staff.test.ts` (4 tests)
- `docs/ROADMAP.md` (3.17c ticked; 3.17e, 4.15.2, 4.15.15 extended), `docs/STATUS.md`

## What the next agent must do
- **backend-engineer, 3.17d** (next): SEC-35 rest, SEC-42 per-operation keys, SEC-50, SEC-51, SEC-39.
- **backend-engineer, 3.17e** (added): the user re-auth code path has the same two gaps fixed here for staff: a stale challenge answers 404 (not in the `updateMyTwoFactor` / `revokeMyOtherSessions` contract → response validation turns it into 500), and the exhausting wrong code (`TWO_FACTOR_TOO_MANY_ATTEMPTS`) is not counted on SEC-04.
- **web-engineer (admin), 4.15.15:** the step-up dialog may offer "email me a code" while S-060 is ON.

## Open questions / risks
- None for the Owner. No contract or i18n change.
