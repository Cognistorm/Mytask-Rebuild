# 4.1.5 Files F0 part 3: downloads and staff uploads

From: backend-engineer · To: backend-engineer (4.1.6, 4.1.8a, 4.1.12, 4.1.13, later slices with attachments), web/admin (staff upload screens, slices 03/16/17), QA and security (4.1.26, 4.1.27) · Date: 2026-10-02 · Branch `feat/profiles` (local only, Owner rule 2026-10-02)

## What I did
- **`getFileDownload`** (`GET /files/{fileId}/download`, `FilesService.download`):
  - Who may download: the file's owner (`owner_user_id`), or a user that a rule registered in the new **`FileDownloadAccess`** allows. Everyone else, unknown ids and deleted files get `404 NOT_FOUND`, never 403. Nothing is signed for them.
  - `FileDownloadAccess` works like `FileAttachments`: slices register `(file, userId) => Promise<boolean>`. Today no rule is registered, so only owners can download.
  - Staff-owned files have no user owner, so users cannot open them.
  - Not `ready` (pending, scanning, rejected) → `422 FILE_NOT_READY`, message key `t_file_not_ready` (NEW, en + ka).
  - Presigned GET on the file's current `bucket` / `object_key`, with `Content-Disposition: attachment` and the original name (`attachmentDisposition`, UTF-8 safe). Public images point to the large WebP variant, so the name's extension becomes `.webp`.
  - Lifetime: 5 minutes; 2 minutes for the `kyc` bucket (ADR-009 §2, §4). `expiresAt` is returned.
  - `mode=redirect` (default) → `302 Location`; `mode=json` → `200 SignedUrl`. Both send `Cache-Control: no-store`. Any other mode → 400 (contract validator).
  - Audience `user` per the contract: a restricted user gets 403 `ACCOUNT_RESTRICTED` from the guard. Downloading one's own appeal file is not in the restricted allow-list of the contract; I left it so.
- **Staff side** (`AdminFilesController`, `/admin/files`):
  - `adminCreateFileUpload`: staff purposes only, other purposes get `422 FILE_PURPOSE_MISMATCH`. Exactly one permission is checked, the one for the purpose: `category_image` → `catalog.write`; `blog_image` and `home_logo` → `content.write`. Super-admin passes. On failure: `403 FORBIDDEN` with `details.permission`. Audit `file.upload` with that permission code.
  - The row has `owner_staff_id` set and `owner_user_id` null. The rest is the user flow: same type/size checks, presigned POST to `quarantine/<uuid>` in `private`.
  - No rate limit: the contract has no `x-rate-limit` on it.
  - `adminGetFile` / `adminCompleteFileUpload`: only the staff member who uploaded the file; others get 404. Complete reuses the user `queueScan` (HEAD check, then compare-and-set `pending` → `scanning`, idempotent). Audit `file.upload.complete` is written only when the call actually moved the file out of `pending`.
  - The worker pipeline (4.1.4) needs no change: staff purposes use `processing: 'public_image'` → WebP variants in `public_media`.
- **Purpose policies** (`purposes.ts`): each policy now has `uploader` (`user`, or `staff` + permission). `createFileUpload` refuses staff purposes with 403 FORBIDDEN, as before for purposes without a policy.
- **Staff image rules = Owner answer Q-161 (option a):**
  | Purpose | Types | Limit |
  |---|---|---|
  | category image | JPG / JPEG / PNG | 5 MB |
  | blog image | JPG / JPEG / PNG / GIF | 5 MB |
  | home logo | JPG / JPEG / PNG / WEBP / GIF | 5 MB |

  These are the legacy types without SVG. They are fixed rules, not settings.

## Files created/changed
- Changed: `apps/api/src/modules/files/{files.service,files.controller,files.module,purposes}.ts`, `apps/api/test/memory-storage.ts` (records presigned GETs in `gets`), `packages/i18n/{en,ka}.json` (`t_file_not_ready`)
- New test: `apps/api/test/files-download-admin.test.ts` (14 tests). It covers:
  - JSON and 302 modes, the `no-store` header
  - KYC 2 min vs public 5 min, the `.webp` name
  - 404 for others, unknown and deleted files; 422 for pending/scanning/rejected files
  - a `FileDownloadAccess` rule; 401 without a session; 400 for an unknown mode
  - staff upload and audit, the per-purpose permission, `FILE_PURPOSE_MISMATCH`
  - the Q-161 types and the 5 MB limit
  - user tokens refused on the admin route; users cannot upload staff purposes
  - adminGet/adminComplete for the uploader only; idempotent complete with a single audit row
- Docs: `docs/01-discovery/open-questions.md` (Q-161), `docs/ROADMAP.md`, `docs/STATUS.md`
- Results: API tests 237 passed / 5 skipped (the storage integration tests need a live SeaweedFS). Typecheck, eslint and prettier OK.

## What the next agent must do
- **4.1.6 (appeal files):** add the `appeal_file` policy with `uploader: USER`, `processing: 'none'`, `finalBucket: 'private'` (see the 4.1.4 handoff). `adminGetRestrictionAppealFileDownload` is a staff operation: it checks the staff permission, writes the audit log, and then signs with `ObjectStorage.presignedGet` itself. It does not go through `getFileDownload`.
- **Slices with shared files** (deliveries and requirement files in 06, chat in 08, offers in 12, …): register a `FileDownloadAccess` rule for the parties. Keep the answer `false` for unrelated users, so they still get 404.
- **Admin screens (slices 03/16/17):** upload with `adminCreateFileUpload`, then POST to storage, `adminCompleteFileUpload`, and poll `adminGetFile` until `ready`. Then attach the file id to the category, article or logo.
- **Not done (outside the task):** `getPublicConfig` still answers null for image file ids (noted in 3.5 / 4.1.3). Resolve them when the slice that sets those images exists.

## Open questions / risks
- **Restricted users and their own appeal files:** `getFileDownload` has audience `user`, so a restricted user cannot download an appeal file they uploaded. They can still see it through `getFile`. If the appeal screen (4.1.6) needs a download, the architect must allow it in the contract.
- The 302 is the API's first redirect response. The contract validator accepts it (tested). Web links must open it in a new tab or as a download, not through `fetch` (the redirect goes to the storage host).
- No business rule invented: the staff image types and limit are the Owner's answer Q-161. No contract change.
