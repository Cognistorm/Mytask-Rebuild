# 4.3.3a Gig foundations: upload purposes, content-language rules, uid/slug, plan limit + `getGigCreationEligibility`

From: backend-engineer · To: backend-engineer (4.3.3b/c), web-engineer + mobile-engineer (4.3.9/4.3.15, info), solution-architect (one ADR wording point) · Date: 2026-10-07

## What I did
4.3.3 was too big for one step, so I split it in ROADMAP into **4.3.3a** (this one), **4.3.3b** `createGig` and **4.3.3c** `updateGig` + `deleteGig`.

- **Gig upload purposes** (`modules/files/purposes.ts`, 4.3.1 handoff §E.2):
  - `gig_thumbnail` and `gig_image`: JPG/JPEG/PNG up to S-078 MB, stored as public WebP variants (`public_media`).
  - `gig_document`: PDF up to S-082 MB. After the virus scan it is stored unchanged in `public_media` (`processing: 'none'`), because spec 04 R-G11 and data-model §3.D say documents are public downloads.
  - New optional `PurposePolicy.enabledBy`. `FilesService.slot` checks it before the type and size checks, and before any presigned POST exists. While S-080 is OFF, a new document upload gets **403 FEATURE_DISABLED** (`t_feature_disabled`, `details.settingId: 'S-080'`) (EC-8). Documents already attached are not touched.
  - The file count rules (1…S-077 images, 0…S-081 documents) belong to the save (4.3.3b), not the upload.
- **R-5.3a / R-5.4 rules in one shared file** (§E.3): `packages/i18n/content-language.json`, exported as `@mytask/i18n/content-language.json`. It holds the allowed code-point ranges, the characters treated as spaces and the cap of 10 listed characters.
  - Why a JSON file and not shared TypeScript: the API only imports types and JSON from workspace packages, because `nest build` does not compile package TS. This is the same pattern as `@mytask/rich-text/allow-list.json`.
  - The API validator is `src/platform/content-language.ts`:
    - `checkGeorgianField(field, text, formatted?)` returns `georgian_field_characters` (with `refusedCharacters`, each listed once in order of first appearance, at most 10, counted by code point, plus `params.chars` joined by a space), else `georgian_letter_required` (`refusedCharacters: []`), else null.
    - `checkEnglishField` returns `georgian_letters_not_allowed` / `t_validator_english_only` when the text has a Georgian letter **or** no Latin letter (AC-6, legacy `EnglishTextOnly.php`).
    - `contentFieldError(issue, t)` adds the translated `message`.
    - With `formatted = true`, the text first goes through `richTextPlainText` (markup removed, entities decoded, so `&#58;` is refused as `:`). U+00A0, U+200B and U+FEFF become spaces, then the text is trimmed.
    - Lengths are **not** checked here. Each spec counts them.
- **Shared uid and slug** (§E.9): `newPublicUid()` (20 uppercase hex) and `uidSlug(title, uid)` = `slugify(title).slice(0, 138) + '-' + uid`, exactly as legacy did (`legacy/APP/app/Livewire/Main/Create/CreateComponent.php:676`). They live in `platform/slug.ts`. Portfolio's private copies were replaced with these (no behaviour change).
- **Plan limit** (§E.8 groundwork): new `modules/gigs`.
  - `GigLimits.eligibility(userId, db?)` counts the owner's non-deleted gigs against S-001 (Standard) or S-002 (Premium, from `PremiumStatus.isActive`). A null limit means unlimited.
  - `GET /gigs/creation-eligibility` returns the contract's `GigCreationEligibility`. The guard handles 401 and 403 ACCOUNT_RESTRICTED.
- **Tests:**
  - `test/content-language.test.ts` (11): the AC-5 and AC-6 examples, order / once each / cap 10, Cyrillic, Mtavruli, archaic letters, emoji, markup and entities, spaces.
  - `test/gigs.test.ts` (9): eligibility for guest, Standard, the deleted gig not counted, S-001 override, Premium with S-002 null and S-002 = 1, restricted user; uploads by type and size against S-078 / S-082, S-080 OFF with no presigned POST, the bucket policy.
  - `test/slug.test.ts` (+3).
  - Full API run: **670 passed / 6 skipped**. Typecheck, lint and the i18n check are green.

## Files created/changed
- `packages/i18n/content-language.json` (new), `packages/i18n/package.json` (export)
- `apps/api/src/platform/content-language.ts` (new), `apps/api/src/platform/slug.ts`
- `apps/api/src/modules/files/purposes.ts`, `apps/api/src/modules/files/files.service.ts`
- `apps/api/src/modules/gigs/gig-limits.ts`, `gigs.controllers.ts`, `gigs.module.ts` (new); `apps/api/src/app.module.ts`
- `apps/api/src/modules/profiles/portfolio.service.ts` (uses the shared uid/slug)
- `apps/api/test/content-language.test.ts`, `apps/api/test/gigs.test.ts` (new), `apps/api/test/slug.test.ts`
- `docs/ROADMAP.md` (4.3.3 split, 4.3.3a ticked), `docs/STATUS.md`

## What the next agent must do
**4.3.3b `createGig` (backend):**
- Collect **all** field errors in one `VALIDATION_FAILED` (AC-19):
  - `checkGeorgianField('title.ka', …)`
  - `checkGeorgianField('description.ka', html, true)` on the **sanitised** description (`RichText.sanitize(…, 'user_text')`)
  - `checkEnglishField` for the `en` fields
  - Length rules on the normalised or plain text, per AC-4.
- **Plan limit inside the transaction:** lock the owner row first (`SELECT … FROM users WHERE id = $1 FOR UPDATE`), then call `GigLimits.eligibility(userId, tx)`. Refuse with 422 PLAN_LIMIT_REACHED, `details.limit` + `details.settingId`. Test the race with two parallel submits.
- **Files:** `ready`, owned by the caller, of the right purpose. Set `attached_at` in the same transaction, otherwise the unattached-public cleanup deletes them (data-model `files`, SEC-74).
- **Slug and uid:** `uid = newPublicUid()`, `slug = uidSlug(title.ka, uid)`.
- **S-070:** OFF → `pending` + `submitted_at = now()` + EV-19; ON → `active` + `published_at`.
- **Search index:** `SearchIndex.indexGig` in the same transaction.

**4.3.9 / 4.3.15 (web/mobile):** run the same pre-check from `@mytask/i18n/content-language.json`. Do not copy the ranges into the apps.

## Open questions / risks
- **For the architect (wording only, no Owner question):** ADR-009 §2's bucket table still lists "gig documents" under `private`. Data-model §3.D ("bucket `public-media`"), spec 04 R-G11 and the 4.3.1 handoff say public. Also, `getFileDownload` serves only signed-in users, while legacy documents were public with no sign-in. I followed the data model and the spec. Please update ADR-009's table, or tell me to switch the bucket.
- `apps/api/test/gigs-schema.test.ts` (from 4.3.2b) fails `prettier --check`. I left it unchanged because it is outside this task. Run `prettier --write` on it in the next backend task.
