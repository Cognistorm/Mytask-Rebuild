# 4.3.3b `createGig`

From: backend-engineer · To: backend-engineer (4.3.3c, 4.3.4, 4.3.8), QA + security-reviewer (info: uploads, permissions) · Date: 2026-10-07

## What I did
- **`POST /gigs` (`createGig`)** in `modules/gigs/gigs.service.ts`. Spec 04 AC-3…AC-16, AC-19, AC-33, EC-8, R-G3.
- **Order of checks:**
  1. The contract schema.
  2. Every field rule, all collected into one `400 VALIDATION_FAILED` (summary `t_toast_form_validation_error`, one `FieldError` per field, AC-19).
  3. 403 FEATURE_DISABLED for documents while S-080 is OFF.
  4. The files (422 FILE_PURPOSE_MISMATCH / FILE_NOT_READY).
  5. The transaction: plan limit, then the save.
- **Field rules** are in `modules/gigs/gig-input.ts`, one function per wizard block, so 4.3.3c can run only the blocks that were sent:
  - **Titles:** 3–100 on the normalised text; `ka` R-5.3a, `en` R-5.4.
  - **Descriptions:** sanitised with `user_text`; ≥ 10 characters of text without formatting; R-5.3a / R-5.4 on that text.
  - **Category chain:** `categoryId` top level; `subcategoryId` under it; `childCategoryId` under that (`not_allowed`, `t_validator_exists`).
  - **Price:** ≥ 100 tetri (`t_price_min` {min: 1}). Above 999,999,999 tetri, legacy's "10 characters" (`t_validator_max` {max: 10}, which is literally the legacy message).
  - **Revisions:** ≤ S-041 now (`t_validator_revisions_range` {max}).
  - **Upgrades and FAQs:** blank title/question/answer → `required`. Upgrade price uses the price rule.
  - **SEO:** both blank = none; one blank → `t_seo_both_fields_required` on `seo`. The schema requires both keys, so a blank value is the only way to send "one alone".
  - **Gallery:** each id once, in order, ≤ S-077 (`max_items`, `t_validator_max_array`). Documents: each id once, ≤ S-081.
- **Blank optional English fields count as not given.** Legacy allowed an English title without an English description and the reverse (`legacy/APP/app/Http/Validators/Main/Create/OverviewValidator.php:49-61`). Our `en` row needs both columns, so the missing one is stored as `''`. `catalog/localized.ts` already treats empty as missing and falls back to Georgian per field, and `ownerView` returns `''` as `null`. No schema change and no new rule.
- **Files:**
  - Each file must be the caller's own upload, of the expected purpose (`gig_thumbnail` / `gig_image` / `gig_document`), not deleted, and not used by another gig. Otherwise FILE_PURPOSE_MISMATCH. A file that is not yet ready gets FILE_NOT_READY.
  - Inside the transaction, `attached_at` is set and every file is re-checked as `ready` (as portfolio does, SEC-74).
  - Gig files are registered with `FileAttachments`, so `deleteFile` answers 409 while a gig uses them.
  - Gig files are now part of the 24 h unattached-public cleanup (`worker/files-scan.sweeper.ts`): purposes plus `NOT EXISTS` on `gigs.thumbnail_file_id`, `gig_images` and `gig_documents`. Before this, abandoned gig uploads stayed public for ever.
- **Plan limit:**
  - `GigLimits.limitFor` reads the plan and S-001/S-002 **before** the transaction (a settings read inside it would wait for a second connection).
  - `lockAndCheck` runs `SELECT … FOR UPDATE` on the owner's `users` row inside the transaction, then counts the non-deleted gigs.
  - Over the limit → 422 PLAN_LIMIT_REACHED (`details.limit`, `details.settingId`). The test sends two submits at once and exactly one passes.
- **Saved gig:**
  - `uid = newPublicUid()`, `slug = uidSlug(title.ka, uid)`.
  - S-070 OFF → `pending` + `submitted_at`, plus EV-19 to every S-100 address in the outbox (same transaction).
  - S-070 ON → `active` + `published_at`, no email.
  - Children: upgrades, FAQs, images and documents, each with its `position`.
  - `SearchIndex.indexGig(id, tx)` runs in the same transaction.
- **EV-19:** outbox type plus the `Admin/PendingGig` template (`legacy/APP/app/Notifications/Admin/PendingGig.php:44-54`, existing keys, button to `{ADMIN_URL}/gigs`, the queue of 4.3.13).
- **`ownerView(gig)`** returns the contract's `GigOwnerView`:
  - Image variants from the media URL; documents as `{ media }/{ objectKey }` public links (R-G11).
  - A thumbnail without variants is logged and answers 500 (never expected).
  - 4.3.4 `getGigOwnerView` reuses it.
- **Tests:** new `test/gigs-create.test.ts` (14).
  - Saved gig: pending + EV-19 + search document + attached files; active with S-070 ON; sanitising and per-field English; documents ON and OFF.
  - Validation: all errors at once (13 fields); lengths on trimmed plain text; blank optional fields.
  - Files: 5 file refusals plus a file reused by another gig; deleteFile 409 plus the cleanup keeping attached files and deleting a stray one.
  - Plan limit: limit plus a deleted gig freeing the slot (EC-1); the race; guest 401, restricted 403.
  - The EV-19 email.
- Full API run: **684 passed / 6 skipped**. Typecheck, lint and prettier are green.

## Files created/changed
- `apps/api/src/modules/gigs/gig-input.ts`, `gigs.service.ts` (new); `gig-limits.ts`, `gigs.controllers.ts`, `gigs.module.ts`
- `apps/api/src/platform/outbox/outbox.service.ts`, `apps/api/src/platform/mail/templates.ts` (EV-19)
- `apps/api/src/worker/files-scan.sweeper.ts` (gig files in the unattached cleanup)
- `apps/api/test/gigs-create.test.ts` (new)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
**4.3.3c `updateGig` + `deleteGig` (backend):**
- **Validation:** reuse the `gig-input.ts` blocks for the fields that were sent. `revisionsAllowed` uses today's S-041 (AC-10).
- **Lists** replace the whole list in order:
  - **Gallery:** delete the old rows and insert the new ones inside the transaction (the position key is deferred).
  - **Upgrades:** keep the identity when `id` is sent; soft-delete (`deleted_at`) the removed ones, because placed orders reference them.
- **Files:** `checkFiles(userId, gigId, …)` already excludes the gig itself. Files the gig no longer uses → `FilesService.purgeDetached` after commit.
- **Documents and S-080:** while S-080 is OFF, keep existing documents and refuse only new ones (EC-8). The create rule is stricter; adapt it for edits.
- **Plan limit:** never checked on edit (AC-25).
- **Slug:** changes only when `title.ka` changes (AC-33). The old slug resolves by uid.
- **S-070 OFF:** → `pending` + `submitted_at` + EV-19, with rejection reason cleared. Spec 04 says every edit sends it (AC-22). Portfolio skips the email while the item is already pending (Owner Q-166 (a) was for portfolio only). Check spec 15 EV-19 before copying that.
- **S-070 ON:** → `active`.
- **Deleted gigs:** 404.
- **Search index:** `SearchIndex.indexGig` in the transaction.
- **`deleteGig`:** 409 GIG_HAS_ORDERS_IN_QUEUE while `orders_in_queue > 0`. Otherwise `status = deleted`, `deleted_at`, `deleted_by = owner` in one update, plus `SearchIndex.removeGig`. Keep the files (past orders).

## Open questions / risks
- None for the Owner.
- **Security reviewer (4.3.19):**
  - A `public_media` PDF is served from the media domain with its stored type. The magic-byte check already refuses non-PDFs. Confirm the CDN sends `Content-Disposition: attachment` / `X-Content-Type-Options: nosniff` for `files/*` (an ADR-009 deployment item).
  - There is no `x-rate-limit` on `createGig` in the contract (the plan limit caps it anyway).
- The ADR-009 bucket wording for gig documents is still open with the architect (see the 4.3.3a handoff).
