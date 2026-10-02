# 4.1.6a Appeal files: API

From: backend-engineer · To: web-engineer + mobile-engineer (4.1.6b), QA and security (4.1.26, 4.1.27) · Date: 2026-10-02 · Branch `feat/profiles` (local only, Owner rule 2026-10-02)

4.1.6 was split: **4.1.6a** = API (this handoff), **4.1.6b** = the web, mobile and admin screens.

## What I did
- **Settings S-091…S-093**: already in the registry with the Q-154 values (S-091 = 2 files, S-092 = 100 MB, S-093 = jpg, jpeg, png, gif, webp, pdf, doc, docx, txt, mp4, mov, avi, mkv, webm). No change.
- **Table `restriction_appeal_files`** (data-model §3.A): `appeal_id`, `file_id`, `position`, PK `(appeal_id, file_id)`. Migration `20261002200000_restriction_appeal_files`; the FK to `files` is in SQL, like the other FKs of this area.
- **`appeal_file` purpose** (`purposes.ts`):
  - Uploaded by users through `createFileUpload`. Restricted users are already allowed for this purpose.
  - Extensions from S-093, size limit from S-092; `FILE_TOO_LARGE` carries `details.settingId = 'S-092'`.
  - Stored in the `private` bucket with `processing: 'none'`: the worker copies the clean upload unchanged to `files/<id>`.
  - `MIME_BY_EXTENSION` now covers the Q-154 types with the names browsers and phones really send:
    - `video/avi` and `video/msvideo` as well as `video/x-msvideo`; `audio/webm` as well as `video/webm`;
    - `application/octet-stream` for doc, docx, mov, avi and mkv, because many systems know no type for them.
  - The magic-byte check in the worker decides the real type (4.1.4).
- **`createRestrictionAppeal` with `fileIds`:**
  - Duplicate ids are counted once; the order is kept (`position`).
  - When the restriction has `filesRequired`, no files → 400 `VALIDATION_FAILED` (`fileIds`, code `required`).
  - More than S-091 files → 400 (`fileIds`, code `max_items`, `t_validator_max_array` with `{max}`). This limit applies even when files are not required: legacy saved files in that case too, without checks.
  - Each file must be the caller's own `appeal_file` and not deleted, else 422 `FILE_PURPOSE_MISMATCH`. Unknown ids get the same answer.
  - Not `ready` yet → 422 `FILE_NOT_READY` (`t_file_not_ready`).
  - On a refusal nothing is saved, and the restriction stays `pending`.
  - Type and size are not checked again at submit: they were checked at upload and by the scan.
- **Views:** `Restriction.appeal.files` (listMyRestrictions, createRestrictionAppeal) and `AdminRestrictionAppeal.files` / `AdminRestriction.appeal.files` (admin lists, approve, reject) now list the attachments in order: `fileId`, `fileName`, `contentType` (detected type), `sizeBytes`.
- **Attached appeal files cannot be deleted:** `deleteFile` answers 409, through a `FileAttachments` check registered by `RestrictionsService`.
- **`adminGetRestrictionAppealFileDownload`** (`GET /admin/restriction-appeals/{appealId}/files/{fileId}/download`):
  - Needs `users.restrict`.
  - The file must belong to this appeal, the restriction must not be deleted, and the file must be `ready`; otherwise 404.
  - Signed through the new shared `FilesService.signDownload`: 5 minutes, attachment, original name.
  - 302 by default, `mode=json` → `SignedUrl`; `Cache-Control: no-store`.
  - Every access writes audit `restriction_appeal.file_view` (target = the user, `after = {appealId, fileId}`).
- **Owner decision 2026-10-02:** restricted users keep no download of their own appeal files (`getFileDownload` stays 403 `ACCOUNT_RESTRICTED` for them). No download button in the user screens.
- **Test helper** `test/test-staff.ts` (`makeStaff(app, 'super' | 'none' | permissions[])`). `files-download-admin.test.ts` uses it now, and a header type error in that file from 4.1.5 is fixed.

## Files created/changed
- New:
  - `apps/api/prisma/migrations/20261002200000_restriction_appeal_files/migration.sql`
  - `apps/api/test/appeal-files.test.ts` (9 tests)
  - `apps/api/test/test-staff.ts`
- Changed:
  - `apps/api/prisma/schema.prisma` (`RestrictionAppealFile`)
  - `apps/api/src/modules/files/{purposes,files.service}.ts`
  - `apps/api/src/modules/restrictions/{restrictions.service,restrictions.controllers,restrictions.module}.ts`
  - `apps/api/test/files-download-admin.test.ts`
- Docs: `docs/ROADMAP.md` (4.1.6 split), `docs/STATUS.md`, note added to the 4.1.5 handoff
- Results: API 247 passed / 5 skipped. Typecheck and lint are clean; prettier is clean except generated Prisma code.

## What the next agent must do (4.1.6b)
- **Web `/restricted` and mobile `restricted.tsx`:** add a file picker to the appeal form (mobile: camera or files, spec 01 screens table). For each file:
  1. `createFileUpload` with `{purpose: 'appeal_file', fileName, sizeBytes, contentType}`. Send the type the system reports; send `application/octet-stream` when it reports none.
  2. POST the file to `upload.url` with the returned `fields`.
  3. Call `completeFileUpload`.
  4. Poll `getFile` until `ready`. On `rejected`, show `rejectReason`.
  5. Send `fileIds` with the appeal.
- **Form rules:**
  - Read S-091…S-093 from the public config to show the limits and to filter the picker. Show the picker always, and mark it as required when the restriction has `filesRequired`.
  - The user can remove a file before sending it (`deleteFile`).
  - No download link for the user.
- **Admin appeal queue** (`apps/admin/src/app/restrictions/page.tsx`): list `files` (name, size) with a link to `adminGetRestrictionAppealFileDownload`. A plain link works: 302 with the staff cookie; open it in a new tab.
- i18n: reuse the existing keys where possible. Any new key needs en + ka.

## Open questions / risks
- **Files on restrictions that do not require them** are accepted (≤ S-091), because legacy stored them as well. The legacy UI showed the picker only when files were required, and the legacy admin screen showed files only in that case. If the Owner wants files only when required, the change is one condition in `RestrictionsService.appeal`.
- `application/octet-stream` is accepted only for doc/docx/mov/avi/mkv. The worker still rejects anything whose content is not one of the purpose's types.
- `txt` is detected as "valid UTF-8 text", so an HTML file renamed to `.txt` passes as text. That is harmless here: staff get it only as a download (`attachment`), never shown inline.
- No business rule invented beyond the legacy behaviour noted above; no contract change.
