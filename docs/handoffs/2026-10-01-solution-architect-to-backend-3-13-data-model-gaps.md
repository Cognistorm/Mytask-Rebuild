## What I did
Task 3.13 (ROADMAP). Recorded the two data-model gaps found in slice 01 B-1 and completed the App Link claim list.
- `staff.full_name varchar(100)` is now in the data model (§3.P). The Prisma schema already had it (B-1); the contract needs it (`AdminMe.fullName`, staff create/edit). Legacy `admins` has no name column, so the Phase 5 ETL fills `full_name` with `username` (§11 mapping row). The Owner can rename staff afterwards in the Admin Panel.
- `twofa_purpose` gains `staff_reauth` (§3.A): the code emailed by `adminRequestReauthCode`, accepted only by `adminReauthenticate` with `method: email_code`, `principal_type = staff`. Same table, limits and Redis counters as the other purposes (ADR-002 §5). No contract change: `TwoFactorPurpose` in openapi.yaml is the user-side enum for `createMyTwoFactorChallenge`; the staff code has its own endpoint.
- url-map §7.2: App Link claims now include `/auth/password/update` and `/auth/verify` (with and without `/en`), as the spec 01 screens table requires. The Android filter has been in the app since 3.10/3.11; iOS follows with the `.well-known` files (Phase 6, store ids).

## Files created/changed
- `docs/03-architecture/data-model.md` (revision note, §3.A two_factor_challenges, §3.P staff, §11 `admins` row)
- `docs/03-architecture/url-map.md` (§7.2)
- `docs/ROADMAP.md` (3.13 ticked; backend part added to 3.17), `docs/STATUS.md`

## What the next agent must do
- **backend-engineer (task 3.17):** add `staff_reauth` to the Prisma `TwofaPurpose` enum + migration; build `adminRequestReauthCode` (S-060 ON only; 60 s cooldown, 5 per 15 min) and `method: email_code` in `StaffAuthService.reauthenticate` (today it answers 400, `apps/api/src/modules/staff/staff-auth.service.ts`), with tests (wrong purpose refused, SEC-03/SEC-04 counters).
- **devops-engineer (Phase 6):** the `.well-known` files list the §7.2 paths including the two new ones.

## Open questions / risks
- `full_name = username` for migrated staff is an ETL default for a required column, not a business rule; listed for the Owner with Q-097 (legacy admin accounts) if a different value is wanted.
