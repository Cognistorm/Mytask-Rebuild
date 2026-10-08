# Handoff: backend → QA — 4.3.24 staff removal takes the gig's files offline

## What I did
- Owner Q-185 (b), security review 10 I-57. Scope: **staff removal only** (pending, rejected and owner-deleted gigs keep their files public).
- Architect note: ADR-009 note 2026-10-08 and data-model §3.D. No contract change, no schema change.
- `GigMedia` (`apps/api/src/modules/gigs/gig-media.ts`):
  - after `adminRemoveGig` commits, the thumbnail, every gallery variant (thumb/medium/large) and every document move from `public_media` to `private` under the **same keys**; file ids and rows stay, only `files.bucket` changes. The S3 copy keeps all stored headers (`MetadataDirective: COPY`): content type, the variants' `Cache-Control: immutable`, the documents' `Content-Disposition: attachment`.
  - runs under the gig row lock; retry-safe: a key is copied only when the target lacks it, deletes are idempotent, the rows switch last.
  - a removal whose move fails still answers 200 (the removal stands) and logs an error; the new worker sweeper `apps/api/src/worker/gig-media.sweeper.ts` (start + every 5 min, `SKIP LOCKED`) moves the files of any gig whose ready files sit in the wrong bucket.
- `adminRestoreGig`: after the checks, copies the private files back to `public_media` and switches the rows **inside the restore transaction** (the gig is never active with private files); private copies are deleted after the commit. If the transaction fails after a copy, the public copies are deleted again (gig stays removed, files stay offline).
- Admin list and detail: private gig images and documents are shown through 5-minute presigned GETs (same `ImageVariants` / `GigDocument` shapes).
- `files.service.ts`: `purge` deletes image variants from the file's own bucket (was always `public_media`); `downloadName` keys on `variants` (WebP name also while private), now exported.
- `ObjectStorage.copy`: `contentType` optional — without it the object keeps all its headers.

## Files created/changed
- new: `apps/api/src/modules/gigs/gig-media.ts`, `apps/api/src/worker/gig-media.sweeper.ts`
- changed: `apps/api/src/modules/gigs/admin-gigs.service.ts`, `gigs.module.ts`, `apps/api/src/worker.module.ts`, `apps/api/src/modules/files/files.service.ts`, `apps/api/src/platform/storage/storage.ts`
- tests: `apps/api/test/gigs-admin.test.ts` (5 new: removal → private + presigned staff view → restore serves again; owner deletion untouched; failed move finished by the sweeper; interrupted move finished by the next run; failed restore keeps the files offline), `test/memory-storage.ts` (`failCopyAt`, headers kept on copy), `test/storage.integration.test.ts` (cross-bucket move with headers on SeaweedFS)
- docs: ADR-009, data-model §3.D, ROADMAP, STATUS

## Results
- Root format:check, typecheck, lint PASS.
- API 782 passed / 7 skipped (57 files).
- `S3_INTEGRATION=1` storage integration 7/7 on local SeaweedFS (started with `pnpm infra:up` for the run, then stopped).

## What the next agent must do
- QA (re-check before 4.3.21): on `pnpm local`, publish a gig with a PDF, open its image and PDF media URLs, remove it in admin → both URLs fail (404/403), admin detail still shows them; restore → URLs work again with the same addresses. Check the owner-deleted case keeps them.
- Next micro-task: 4.3.25.

## Open questions / risks
- Phase 6: a CDN in front of `public-media` must purge the moved keys on removal (variants are cached `immutable`). Added to the ADR-009 note.
- A process crash in the millisecond between a restore's copy and its rollback could leave a public copy of a removed gig (the compensation runs only when the process lives); not detectable from the database. Accepted as very unlikely.
- A restored gig's private copies are deleted after the commit; if that delete fails, a harmless private copy remains (logged).
