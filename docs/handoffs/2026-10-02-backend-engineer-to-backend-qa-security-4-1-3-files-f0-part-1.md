# 4.1.3 Files F0 part 1: `files` table, S3 client, upload/complete/get/delete

From: backend-engineer · To: backend-engineer (4.1.4, 4.1.5), QA and security (4.1.26, 4.1.27) · Date: 2026-10-02 · Branch `feat/profiles` (local only, Owner rule 2026-10-02)

## What I did
- **Table `files`** exactly as data-model §3.Q: enums `file_purpose`, `file_bucket`, `file_status`; UK `(bucket, object_key)`, IX `(owner_user_id, purpose)`, PIX `created_at WHERE status = 'pending'` (for the cleanup job). Extra guards in SQL: FKs to `users`/`staff`, at most one owner, `size_bytes > 0`, partial UK on `(legacy_source, legacy_id)`. Migration `20261002120000_files`.
- **Object storage** `src/platform/storage/storage.ts`: abstract `ObjectStorage` (presigned POST, presigned GET, head, delete) plus the S3 implementation (AWS SDK v3, path-style). There are two clients: one for the API's own calls (`S3_ENDPOINT`) and one that signs the URLs given to browsers and apps (`S3_PUBLIC_ENDPOINT`, falls back to `S3_ENDPOINT`). They are separate because a presigned GET signs the host, and inside compose the API reaches `s3:8333` while the browser uses `localhost:8333`. If S3 is not configured, every file operation answers `503` (Docker-free preview). Production refuses to start without `S3_ENDPOINT`, the keys and `PUBLIC_MEDIA_BASE_URL`.
- **Four contract operations** `src/modules/files/`, all `@AllowRestricted`:
  - `createFileUpload` (201): the order of checks is fixed, and all of them run before anything is signed (ADR-009 §3, P2-B5 item 12):
    1. Per-user limit, 60 per 10 min (contract `x-rate-limit`), then `429`.
    2. A restricted user asking for any purpose except `appeal_file` gets `403 ACCOUNT_RESTRICTED`.
    3. A purpose without a policy gets `403 FORBIDDEN` (deny by default).
    4. The extension must be on the purpose list **and** `contentType` must match that extension; otherwise `422 FILE_TYPE_NOT_ALLOWED`.
    5. Size above the limit gives `422 FILE_TOO_LARGE` with `details.limit` (MB) and `details.settingId` when a register row sets the limit.

    After that the API signs a presigned POST for one opaque key `quarantine/<uuid>`, with `content-length-range` 1…declared size and an exact `Content-Type`, valid 15 min. Then it creates the `pending` row. Signing comes first so that a storage outage leaves no orphan row. The file name has path parts and control characters stripped.
  - `getFile` (200): own files only. Other users, unknown ids and deleted files get `404`. A restricted owner gets `403` except for `appeal_file`.
  - `completeFileUpload` (202): same ownership and restriction re-check. While `pending`, the API runs a HEAD on the object. A missing object gives `422 FILE_NOT_READY`. Otherwise a compare-and-set moves the file `pending` → `scanning`. Calling it again returns the current state.
  - `deleteFile` (204): same checks. An attached file gets `409 STATE_CONFLICT` (`details.currentState: attached`). Otherwise the API deletes the storage object and its variants first, then marks the row `deleted` + `deleted_at`.
- **Enabled purposes** (`purposes.ts`). Only the purposes this slice needs, with spec rules:
  - `avatar`: JPG/JPEG/PNG/WEBP ≤ 2 MB (spec 02 AC-16, P-24).
  - `portfolio_image`: JPG/PNG ≤ S-090 MB, read live (AC-24).
  - `kyc_document`: JPG/JPEG/PNG ≤ 5 MB (AC-36). Its quarantine is in the `kyc` bucket too, so KYC never passes through `private`.

  Everything else is refused with `403 FORBIDDEN` until its slice adds the policy and its context rule. That includes `appeal_file`, which comes in 4.1.6.
- **`FileAttachments`** (exported by `FilesModule`): slices that attach files register a check, so `deleteFile` can refuse attached files without knowing every table.
- **ADR-017 §3 proven.** `test/storage.integration.test.ts` ran against **SeaweedFS 4.48** (the same version as compose; run here as the Windows binary because this machine has no Docker):
  - An upload within the policy gets through.
  - A presigned GET returns the same bytes with `Content-Disposition: attachment`.
  - Oversize → `400 EntityTooLarge`.
  - Wrong Content-Type → `403 Policy Condition failed`.
  - A tampered GET signature → `403`.

  **No switch to the RustFS fallback needed.** CI now starts the same SeaweedFS image in the `quality` job and runs the test (`S3_INTEGRATION=1`). `turbo.json` passes the S3 variables to `test`; without that, turbo's strict env would have skipped the test silently.

## Files created/changed
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261002120000_files/migration.sql`
- `apps/api/src/platform/storage/storage.ts` (new), `apps/api/src/platform/config/env.ts` (S3_* + `S3_PUBLIC_ENDPOINT`, production checks)
- `apps/api/src/modules/files/{files.module,files.controller,files.service,purposes}.ts` (new), `apps/api/src/app.module.ts`
- `apps/api/test/files.test.ts` (17), `test/storage.integration.test.ts` (4, opt-in), `test/memory-storage.ts`, `test/app.ts` (optional provider overrides), `test/env.test.ts` (+3 production refusals)
- `apps/api/package.json` + `pnpm-lock.yaml`: `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/s3-request-presigner` 3.1144.0 (pinned)
- `.env.example` (`S3_PUBLIC_ENDPOINT`), `docker-compose.yml` (`S3_PUBLIC_ENDPOINT: http://localhost:8333` for the app containers), `.github/workflows/ci.yml` (SeaweedFS + S3 env in `quality`), `turbo.json`

## What the next agent must do
- **4.1.4 (worker pipeline):**
  - Pick up files in status `scanning`. `completeFileUpload` does not enqueue anything yet: no BullMQ in the repo. Either add the `files-scan` queue (ADR-008 §4) and enqueue it from `FilesService.complete`, or add a sweeper over `status = 'scanning'` with `FOR UPDATE SKIP LOCKED`; a sweeper is also needed for jobs lost from Redis.
  - Then: magic bytes, size re-check, ClamAV (limits ≥ 100 MB, Q-154), `sharp` variants.
  - Move ready images to `public_media` (avatar, portfolio) or to the final key in `kyc`. Set `bucket`/`object_key`/`variants`/`width`/`height`/`detected_type`/`checksum_sha256`/`ready_at`.
  - Every state change must be a compare-and-set on `status = 'scanning'`, because the owner may delete the file meanwhile.
  - Emit `file.processed`, and add the 24 h cleanup of `pending` rows (contract `createFileUpload`).
- **4.1.5:** `getFileDownload` can use `ObjectStorage.presignedGet` (it already sets `attachment` with an RFC 6266 UTF-8 name). Add `adminCreateFileUpload` for the staff purposes (`category_image`, `blog_image`, `home_logo` → `422 FILE_PURPOSE_MISMATCH` for others, per the contract). Note that getPublicConfig still answers null for image file ids (3.5); resolve them once ready files exist.
- **4.1.6:** add the `appeal_file` policy (S-092/S-093) to `PURPOSE_POLICIES`. The restricted-user rule already lets it through.
- **Slices that attach files** (4.1.8a avatar, 4.1.12 portfolio, 4.1.13 KYC) register a `FileAttachments` check and require `status = 'ready'`, the right purpose and the right owner (`422 FILE_NOT_READY` / `FILE_PURPOSE_MISMATCH`).

## Open questions / risks
- **Browser CORS on SeaweedFS:** web uploads POST straight from `localhost:8080` to `localhost:8333`. SeaweedFS has to allow that origin. Check this when the first web upload screen is built (4.1.18). Production buckets need the same CORS rule (ADR-015, DevOps).
- **Size of 1 MB = 1,048,576 bytes** (legacy Laravel `max:` is in KB, so 2 MB = 2048 KB). This is my reading, not a spec statement.
- The SeaweedFS proof ran on Windows without Docker. The first run inside the compose network will be the CI `docker` job (no push until Phase 4 is done).
- No business rule invented. Purposes without a stated rule stay refused, and no Owner question is needed.
