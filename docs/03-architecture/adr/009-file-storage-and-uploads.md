# ADR-009: File storage and uploads — S3-compatible buckets, private by default, signed URLs, type and virus checks
Date: 2026-09-28 | Status: proposed

> **Revised 2026-09-30** after the P2-B5 security review: §3.1 the purpose check runs before the presigned POST and `completeFileUpload` re-checks the stored purpose (review item 12). KYC retention stays open (SEC-12, Owner question).

## Context
- Files: gig images/documents/video links, avatars, portfolio images, category/blog images, project thumbnails and shared files, buyer requirement files, delivered work, chat and custom-offer attachments, refund evidence, restriction-appeal files, KYC selfie + ID front/back (Q-048).
- Legacy: local `public/storage` or S3/Wasabi/Cloudinary chosen in admin (`integrations.md`); KYC images web-accessible by filename (R-039); upload limits in settings (now S-077…S-099, S-037…S-040; delivered-work and appeal types unknown, Q-068).
- Must run locally (MinIO) and be affordable in production.

## Decision
1. **S3 API only.** The API uses the AWS S3 SDK against a configurable endpoint: MinIO locally (docker compose, buckets created by an init container), an S3-compatible provider in production (ADR-015 proposes one with low egress cost, e.g. Cloudflare R2 or Hetzner Object Storage). Credentials and endpoint in `.env`.
2. **Three buckets.**
   | Bucket | Contents | Access |
   |---|---|---|
   | `public-media` | processed public images (gig gallery, avatars, portfolio after approval, category, blog, logos) | public read of processed variants only, via CDN or proxy; no listing |
   | `private` | originals, deliveries, requirement files, chat/offer attachments, project shared files, refund evidence, appeal files, gig documents | no public access; presigned GET (5 minutes) after an API policy check |
   | `kyc` | ID documents and selfies | no public access; server-side encryption; presigned GET (1–2 minutes) only for staff with `kyc.review`; every access audit-logged; retention rule decided in spec 02/16 |
3. **Upload flow (direct to storage, API-controlled).**
   1. `POST /api/v1/files { purpose, fileName, size, contentType }` → the API checks the user may upload for this purpose (e.g. only the seller of an order can upload a delivery; a restricted user only `appeal_file`) and validates size/extension against the purpose's settings. **All purpose and permission checks run before the presigned POST is created** (no storage credential or URL is issued for a refused purpose), and `completeFileUpload` re-checks the purpose stored on the file row against the caller's current state (e.g. restricted → only `appeal_file`) (review item 12).
   2. The API creates a `files` row (`status = pending`) and returns a **presigned POST** limited to one key under `quarantine/`, a `content-length-range`, the declared content type, and a short expiry.
   3. The client uploads directly to storage (web and mobile use the same flow; large files never pass through the API).
   4. `POST /api/v1/files/{id}/complete` → queue `files-scan`.
   5. The worker: reads the object, checks **magic bytes** (real type must be in the allow-list, e.g. a `.jpg` that is really HTML is rejected), re-checks size, **scans with ClamAV** (clamd container), for images **re-encodes** with `sharp` (strips EXIF/GPS, generates variants such as thumb/medium/large, converts to WebP/AVIF for web), then moves the object to its final key/bucket and sets `status = ready` (or `rejected` with a reason and notifies the uploader).
   6. Only `ready` files can be attached to gigs, messages, deliveries, etc.
4. **Downloads.** `GET /api/v1/files/{id}/download` → policy check (owner, counterpart in the order/conversation, staff with permission) → 302 to a presigned GET with `Content-Disposition: attachment` and the original file name (prevents stored-XSS through inline HTML/SVG). Public images use stable CDN URLs of processed variants.
5. **Allowed types** come from the settings register per purpose; SVG uploads by users are not accepted (script risk) unless spec 04 requires them, in which case they are sanitised. The two unknown lists (S-087 delivered work, S-093 appeal files) must be filled before those slices ship (Q-068 fallback rule applies).
6. **Scanner availability.** ClamAV needs about 1–1.5 GB RAM. Locally it runs under the optional compose profile `scan`; without it, files are marked `ready` after type checks with a `scan_skipped` flag (development only; production refuses to start without a scanner unless `SCAN_PROVIDER=none` is set explicitly, which the Owner must approve).
7. **Legacy files** are copied during migration (Phase 5) into the new buckets through the same processing (types re-checked, images re-encoded), with the legacy path kept for reference.

## Alternatives considered
- **Uploads through the API (multipart)** — simpler, but large deliveries (50 MB) tie up API processes and memory. Rejected.
- **Local disk on the server** — cheap, but mixes user files with the application host and repeats R-039/R-021 risks; hard to scale or back up. Rejected.
- **Cloudinary / image SaaS** — convenient transforms but cost and lock-in; `sharp` covers our needs.
- **No virus scanning** — deliveries and attachments are exchanged between strangers; scanning is cheap insurance.

## Consequences
- Easier: private files are never guessable URLs; identical flow on web and mobile; storage can move providers by changing `.env`.
- Harder: a file is usable only after the scan (seconds); clients must show "processing" states; one more container in production.
- Must change: data-model.md adds `files` (purpose, owner, bucket, key, status, size, mime, checksum, variants, legacy_path); specs define per-purpose limits; openapi.yaml defines the file endpoints.
