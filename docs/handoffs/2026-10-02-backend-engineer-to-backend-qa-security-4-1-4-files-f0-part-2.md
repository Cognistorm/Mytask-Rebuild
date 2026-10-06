# 4.1.4 Files F0 part 2: worker scan pipeline (`scanning` → `ready` / `rejected`)

From: backend-engineer · To: backend-engineer (4.1.5, 4.1.6, 4.1.8a, 4.1.12, 4.1.13), QA and security (4.1.26, 4.1.27), DevOps (Phase 6) · Date: 2026-10-02 · Branch `feat/profiles` (local only, Owner rule 2026-10-02)

## What I did
- **How files are picked up: a sweeper, not a BullMQ queue.** `apps/api/src/worker/files-scan.sweeper.ts` does the job `files-scan` (ADR-008 §4). It works the same way as the outbox dispatcher:
  - Every 2 s it reads up to 100 `scanning` files, oldest first. A new partial index `files_scanning_created_ix` keeps this cheap.
  - It scans at most 10 files per pass.
  - Each file is claimed with a Redis lease (`files:scan:lease:<id>`, 10 min). A scan of a 100 MB video must not keep a database transaction open, so `FOR UPDATE SKIP LOCKED` is not used here.
  - Why no queue: there is no BullMQ in the repo yet, `completeFileUpload` needs no change, and nothing is lost if Redis loses data. The handoff of 4.1.3 already asked for a sweeper in any case.
  - Infrastructure errors (storage or clamd down) keep the file `scanning`. The lease then serves as the back-off: 30 s, 1 min, 2 min, … up to 30 min. Attempts are counted in `files:scan:attempts:<id>`.
  - Every hour, `cleanupPending` deletes `pending` uploads older than 24 h together with their object (contract `createFileUpload`). It does a compare-and-set first, so a `completeFileUpload` that runs at the same time wins.
- **The pipeline** is in `apps/api/src/modules/files/scan/file-scan.service.ts`. One streamed read of the quarantine object feeds all of these at once:
  - SHA-256 (`checksum_sha256`, taken from the uploaded bytes).
  - The size count. More than the declared size → `rejected`. Above the purpose's current limit → `rejected`.
  - The first 64 KB for the magic-byte check (`scan/magic.ts`). The real type must be one of the types the purpose's extensions allow. A PNG named `.jpg` passes for avatar, because PNG is allowed. HTML or SVG named `.jpg` is rejected. The sniffer already knows the Q-154 appeal types (doc, docx, txt, mp4, mov, avi, mkv, webm) and does not mistake HEIC/AVIF photos for MP4.
  - ClamAV, through `INSTREAM` over TCP (`platform/scanner/scanner.ts`).
- **Order of verdicts:** virus → size → type → image decode.
- **Processing** (new `processing` field in `PURPOSE_POLICIES`):
  - `public_image` (avatar, portfolio_image): auto-rotated, EXIF/GPS dropped, WebP variants `images/<id>/{thumb,medium,large}.webp`. The longest side is 320, 800 or 1600 px; images are never enlarged. They go to `public_media` with `Cache-Control: immutable`. `object_key` = large. `width`/`height` are the size as displayed (after rotation).
  - `private_image` (kyc_document): re-encoded in the same format without metadata, stored at `documents/<id>.jpg|png` in `kyc`. It never leaves that bucket.
  - `none` (for later purposes: documents, videos): server-side copy to `files/<id>` in the final bucket.
  - `sharp` 0.35.5 (pinned, same as web) with `limitInputPixels` 100 MP and `failOn: 'error'`. A broken image is `rejected` (`t_file_rejected_unreadable`) and is not retried.
- **Every state change is a compare-and-set on `status = 'scanning'`:**
  - If the owner deleted the file during the scan, the objects this pass wrote are removed again.
  - The raw upload is always deleted afterwards: it is never kept after processing, and never kept after a rejection.
  - `deleteFile` is now safe against a scan that finishes at the same moment. The row is marked deleted only if `status` + `object_key` are still the ones whose objects were removed. Otherwise it reloads the row and also removes the new final objects.
- **Reject reasons** are stored as i18n keys: `t_file_rejected_type`, `t_file_rejected_virus`, `t_file_rejected_unreadable`, `t_selected_file_size_big`, `t_file_not_found`. `getFile`, `createFileUpload` and `completeFileUpload` translate them using `Accept-Language`. The 3 NEW keys are in en + ka.
- **Scanner configuration** (ADR-009 §6):
  - New variables `SCAN_PROVIDER` (`clamav`|`none`), `CLAMAV_HOST`, `CLAMAV_PORT` (3310).
  - When unset: `clamav` if `CLAMAV_HOST` is set, otherwise `none`. With `none`, files become `ready` with `scan_skipped = true`.
  - Production refuses to start without a scanner, unless `SCAN_PROVIDER=none` is set explicitly (that needs Owner approval).
  - The worker's readiness has a `clamav` check (PING) when a scanner is configured.
  - clamd's answer "size limit exceeded" is an error that gets retried. It is never treated as clean.
- **ClamAV limits (Q-154):** `tools/clamav/clamd.conf` sets StreamMaxLength / MaxFileSize to 110M and MaxScanSize to 400M, with `AlertExceedsMax yes`. Compose mounts it over the image's config. Compose app containers get `SCAN_PROVIDER: ${SCAN_PROVIDER:-clamav}`.

## Files created/changed
- New: `apps/api/src/modules/files/scan/{file-scan.service,magic}.ts`, `apps/api/src/platform/scanner/scanner.ts`, `apps/api/src/worker/files-scan.sweeper.ts`, `apps/api/prisma/migrations/20261002180000_files_scanning_index/migration.sql`, `tools/clamav/clamd.conf`
- Changed: `apps/api/src/platform/storage/storage.ts` (`read` stream, `put`, `copy`), `apps/api/src/modules/files/{files.service,files.controller,purposes}.ts`, `apps/api/src/platform/config/env.ts`, `apps/api/src/worker.module.ts`, `apps/api/src/worker.ts`, `apps/api/package.json` + `pnpm-lock.yaml` (`sharp` 0.35.5)
- Tests:
  - `test/files-scan.test.ts` (12): real HTTP + worker services. Covers ready/variants/EXIF, PNG-as-jpg, KYC, scan_skipped, HTML-as-jpg with en/ka reason, virus, broken image, size re-check, retry back-off, lease held by another worker, delete during scan, 24 h cleanup.
  - `test/files-scan-units.test.ts` (21): sniffer, clamd wire format against a fake clamd, back-off.
  - `test/env.test.ts` (+3).
  - `test/storage.integration.test.ts` (+1: read/put/copy). It ran 5/5 against SeaweedFS 4.48 (Windows binary, no Docker on this machine).
  - `test/memory-storage.ts` now holds bytes.
- Docs: `docs/03-architecture/data-model.md` §3.Q (new partial index; `reject_reason` = i18n key), `.env.example`, `docker-compose.yml`, `packages/i18n/{en,ka}.json`

## What the next agent must do
- **4.1.5:**
  - `getFileDownload` → `ObjectStorage.presignedGet` on the file's current `bucket`/`object_key`. Only for `ready` files.
  - Staff purposes (`category_image`, `blog_image`, `home_logo`) need a policy in `PURPOSE_POLICIES` with `processing: 'public_image'`. The pipeline handles staff-owned rows as they are.
  - `getPublicConfig` can now resolve image file ids to `ready` variants.
- **4.1.6 (`appeal_file`):** add the policy with `processing: 'none'` and `finalBucket: 'private'`. Also add the Q-154 extensions to `MIME_BY_EXTENSION`. Browsers send e.g. `video/quicktime`, `video/x-msvideo` or `video/avi`, and `text/plain`. Check the declared MIME types that real browsers and apps send. The magic-byte side (`DETECTED_BY_EXTENSION`) is ready.
- **Attaching slices (4.1.8a, 4.1.12, 4.1.13):** require `status = 'ready'`, the right purpose and the right owner, then register a `FileAttachments` check (unchanged from 4.1.3).
- **Realtime `file.processed`:** not emitted yet, because there is no Socket.IO gateway (slice 08). The place to emit it is right after the compare-and-set in `FileScanService.process` / `reject`, through the outbox once that carries realtime events. Until then web and mobile poll `getFile` (contract allows it: "poll getFile or wait for the realtime event").
- **QA/security (4.1.26/4.1.27), please check:**
  - The magic-byte rule: the real type must be in the purpose's allow-list, not equal to the declared extension.
  - That HTML/SVG never become `ready` for an image purpose.
  - The KYC re-encode (`documents/<id>.*` in `kyc` only).
  - Deletion of the raw upload after processing.
  - The decompression-bomb limit (100 MP).

## Open questions / risks
- **Not run inside Docker yet:**
  - clamd with the mounted `clamd.conf` (this machine has no Docker). Settings are written from the official image's defaults plus the size limits.
  - The first real run will be `docker compose --profile scan up` or CI. Verify there that an EICAR upload is rejected and that a 100 MB file scans.
  - The Alpine image needs `@img/sharp-linuxmusl-x64`, which is in the lockfile.
- **Variant sizes (320/800/1600, WebP q82)** are a technical choice. Specs and legacy give no sizes. Design (4.1.16+) may ask for others; changing them later only affects new uploads.
- **Without `--profile scan`**, compose app containers keep uploads in `scanning`, because `CLAMAV_HOST=clamav` and the worker is "not ready". For quick local tests, set `SCAN_PROVIDER=none` in `.env`. With `pnpm dev` and an empty `CLAMAV_HOST`, scans are skipped automatically.
- **Deviation from ADR-008 §4** (BullMQ queue `files-scan`): the job is a sweeper with a Redis lease. Latency is ≤ 2 s and nothing is lost on a Redis flush. No ADR change made. If the architect wants the queue anyway, it can be added in front of the same `FileScanService.process`.
- **Not done here:** the System health tile and `sweeper_runs` (that table does not exist yet; spec 16 slice), and server-side encryption for the `kyc` bucket (ADR-009 §2, provider setting, DevOps Phase 6).
- No business rule invented; no contract change. Owner-visible: 3 new i18n texts (en + ka) for rejection reasons.
