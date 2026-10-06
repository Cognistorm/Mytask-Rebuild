# 4.1.9 Skills, languages and linked accounts API

From: backend-engineer · To: web-engineer (4.1.18), mobile-engineer (4.1.23), backend-engineer (slice 04 slugs), QA · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
- **Skills (AC-19):** `createMySkill` (201), `updateMySkill`, `deleteMySkill` (204).
  - Name: trimmed, inner spaces collapsed; blank → `400 VALIDATION_FAILED` `t_validator_required`. The 30-character
    limit and the level enum (`beginner|intermediate|pro`) come from the contract validator.
  - The same name twice per user (case-insensitive; the DB index on `lower(name)` decides) → `409 DUPLICATE`
    `t_add_skill_already_exists` (`details.field = name`). This also applies on rename.
  - The slug is made from the name on create and on rename.
- **Languages (AC-20):** `createMyLanguage`, `updateMyLanguage`, `deleteMyLanguage`. Same rules (≤ 100 characters,
  levels `basic|conversational|fluent|native`); a duplicate → `409 DUPLICATE` `t_add_language_already_exists`.
- Another user's skill or language, and unknown ids, answer 404. Update takes only the fields sent.
- **Linked accounts (AC-21, P-25):** `putMyLinkedAccounts` replaces all seven at once. A missing or null URL clears
  that provider. Returns all seven keys.
  - S-123 OFF → `403 FEATURE_DISABLED` (`details.settingId = S-123`).
  - **Only `http`/`https` URLs are accepted** (`t_validator_url` on the field). The contract's `format: uri` would also
    let `javascript:` or `data:` URLs onto the public profile. Length ≤ 160 comes from the contract.
- **New `platform/slug.ts` `slugify()`** = legacy Laravel `Str::slug`. Georgian letters are transliterated (table
  checked against live slugs: ქ→q, ხ→kh, ღ→gh, ყ→y, ჟ→zh, წ/ც→ts, ჭ/ჩ→ch, თ/ტ→t, ძ→dz). Mtavruli capitals are
  mapped too; accents are stripped; `_` → `-`, `@` → `-at-`; other symbols are dropped. ADR-006 §8 said the table
  would be checked in slice 04. **It is now checked and reusable for gig slugs** (spec 04 AC-33).
- Row mappers moved to `modules/profiles/profile-views.ts` (shared by both profile services).
- Also in this commit: the Georgian text of `t_notification_admin_reported_profile` is now translated (it was the legacy
  English sentence; Owner asked 2026-10-02).

## Files created/changed
- `apps/api/src/modules/profiles/profile-lists.service.ts`, `profile-views.ts` (new); `profiles.controllers.ts`
  (new `ProfileListsController`), `profiles.module.ts`, `profiles.service.ts`
- `apps/api/src/platform/slug.ts` (new)
- `apps/api/test/profile-lists.test.ts` (new, 9), `apps/api/test/slug.test.ts` (new, 15)
- `packages/i18n/ka.json` (`t_notification_admin_reported_profile`)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- 4.1.10: `putMyAvailability`, `deleteMyAvailability` + daily job `availability-reset`.
- Web/mobile edit profile: show the 409 message from `details.messageKey`. Success toasts are
  `t_skill_added_to_ur_profile`, `t_language_added_to_ur_profile` and `t_linked_accounts_has_been_updated`.
- **A skill name made only of symbols or emoji gets an empty slug** (legacy behaviour too, see live
  `/service/-5E10A3A397AD21773518`). Clients must not link such a skill to `/hire/`.

## Open questions / risks
- No new Owner question.
- No upper limit on the number of skills or languages (legacy had none).
- Tests: API 301 passed / 5 skipped (was 277). Typecheck, lint and Prettier clean.
