# 4.1.8a Profile API: getMyProfile, updateMyProfile, getUserProfile, putMyAvatar, deleteMyAvatar

From: backend-engineer · To: backend-engineer (4.1.8b onward), web-engineer (4.1.17/4.1.18), mobile-engineer, QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **New module `apps/api/src/modules/profiles`** (service + controller). Contract 1.3.0 is unchanged:
  - `GET /me/profile` (getMyProfile): headline, about, avatar, skills, languages (insertion order), the 7 linked
    accounts (always all keys, null when empty), `linkedAccountsEnabled` = S-123, availability.
  - `PATCH /me/profile` (updateMyProfile): only the fields sent change (AC-15, EC-7). Values are trimmed. Blank
    after trimming → `400 VALIDATION_FAILED` with `t_validator_required` on the field. The 100 / 1,500 limits come
    from the contract validator.
  - `PUT /me/avatar` (putMyAvatar): needs an own, `ready` file of purpose `avatar`. Otherwise
    `422 FILE_PURPOSE_MISMATCH` (wrong purpose, other owner, unknown, deleted) or `422 FILE_NOT_READY`. Returns `Me`.
    The old avatar file is deleted (row + storage + variants) through `FilesService.remove`. Compare-and-set on
    `user_profiles.avatar_file_id`, so parallel changes never delete the attached file. Same file again = no-op.
  - `DELETE /me/avatar` (deleteMyAvatar): 204, deletes the file. Without an avatar it is a no-op.
  - `GET /users/{username}` (getUserProfile): only active/verified and not deleted, else 404 (AC-9). An old username
    after a rename = 404 (EC-4). Restricted users stay visible (R-P3). Username is case-insensitive (citext).
- **Neutral values for later slices** (4.1.1 handoff §C): `ratings` both blocks empty (`count 0`,
  `averageTenths null`, star counts 0); `isPremium false`; `canRequestOffer false`; `isIndexable` = has a public
  (`active`) portfolio item (gigs and reviews join later). `lastDeliveryAt` reads the column (null until slice 5).
- **Real values already:** `timezone` (null → `Asia/Tbilisi`), `countryCode` (`countries.iso2`), `isIdVerified`
  (a `verified` KYC row), `portfolioCount` (status `active`), `isEmailVerified`, `availability` (only while
  `unavailable_until` is in the future; the date is the Asia/Tbilisi calendar date), `isOnline` from
  `users.last_activity_at` ≤ 10 minutes. **Nothing writes `last_activity_at` yet. That is 4.1.8b.**
- **Viewer flags:** `isOwnProfile`; `canContact` = not own (true for guests, AC-11); `canReport` = signed in and not own.
- **Optional-user audience** (contract `security: [{}, userBearer, userCookie]`): new `@OptionalUser()` route marker
  and `@OptionalAuth()` parameter in `auth.guard.ts`. A missing, broken, expired, revoked or banned session counts as
  a guest (never 401/403 on a public page). Restricted users count as signed in. Redis down still answers 503
  (fail closed). Reuse it for every later `optional-user` operation.
- **Avatar in `Me`:** new `AvatarReader` (auth module) fills `Me.avatar` in getMe, the login/register sessions and
  refresh. `imageVariants()` moved out of `FilesService` into `files/image-variants.ts`, so both share it.
- **deleteFile guard:** the current avatar file answers `409 STATE_CONFLICT` on `DELETE /files/{id}`
  (FileAttachments check registered by ProfilesService).
- **Not done here (by design):** `account.updated` (x-emits) waits for the realtime gateway (slice 08), like
  `file.processed`. The "100 px square" display of AC-16 is the clients' crop (`object-fit: cover`) of the `thumb`
  variant (320 px, fit inside). The worker makes no square crop.

## Files created/changed
- `apps/api/src/modules/profiles/profiles.module.ts`, `profiles.controllers.ts`, `profiles.service.ts` (new)
- `apps/api/src/modules/auth/auth.guard.ts` (OptionalUser / OptionalAuth), `avatar.reader.ts` (new),
  `auth.module.ts` (exports AccountService, AvatarReader), `me.mapper.ts`, `account.service.ts`, `auth.service.ts`
- `apps/api/src/modules/files/image-variants.ts` (new), `files.service.ts`
- `apps/api/src/app.module.ts`
- `apps/api/test/profiles.test.ts` (new, 17 tests)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.1.8b:** write `users.last_activity_at` (at most once a minute) + Redis presence on authenticated requests. Then
  switch `isOnline` in `ProfilesService.getPublic` (and later `UserSummary.isOnline`) to the presence check. Add
  `createUserReport` (EV-13).
- Web/mobile (4.1.17, 4.1.18, 4.1.23): avatar upload = `uploadFile` (purpose `avatar`) → poll `getFile` until
  `ready` → `putMyAvatar`. Show the profile's local time from `timezone`. `isIndexable false` → `noindex, follow`.

## Open questions / risks
- No new Owner question.
- If deleting the replaced avatar file fails (storage down), the profile is still right and a warning is logged.
  The old file then stays as an unattached `ready` file. No cleanup job covers those yet (the 24 h cleanup only
  covers `pending` uploads).
- Tests: API 270 passed / 5 skipped (was 253). Typecheck, lint and Prettier clean.
