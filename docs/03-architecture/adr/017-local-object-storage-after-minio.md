# ADR-017: Local object storage after MinIO stopped publishing images
Date: 2026-09-30 | Status: **accepted** (Owner 2026-09-30, Q-152 (a)) | Amends: ADR-009 §1 (local part only), ADR-015 §1

## Context
- ADR-009 §1 and ADR-015 §1 say "MinIO locally (docker compose, buckets created by an init container)". Production was always a different S3-compatible provider (Cloudflare R2 or Hetzner Object Storage, ADR-015 §3).
- While setting up the Phase 3 stack (2026-09-30) we found that MinIO no longer publishes a server image: `minio/minio` is gone from Docker Hub (the `minio` namespace lists only tools such as `mint`, `warp`, `operator`), and `quay.io/minio/minio` requires authentication. Building MinIO from source for every developer machine is not reasonable for a one-Owner project (CLAUDE.md rule 7: `docker compose up` must just work).
- Nothing in the platform depends on MinIO itself: the API uses only the S3 API with a configurable endpoint (`S3_*` variables, ADR-009 §1). What matters locally is S3 compatibility for **presigned POST uploads and presigned GET downloads** (ADR-009 §2–§3), three buckets, and a free licence.

## Decision
1. Locally, use **SeaweedFS** (`chrislusf/seaweedfs`, Apache-2.0, pinned `4.48`) in S3 mode as the object store. The compose service is named neutrally `s3`; an `s3-init` container (AWS CLI) creates `public-media`, `private` and `kyc`.
2. Keep every variable name (`S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_*`, `PUBLIC_MEDIA_BASE_URL`), so swapping the local server later only changes one image line in `docker-compose.yml`.
3. The files slice (F0 uploads, first used by profiles/avatars in slice 02) must prove presigned POST (with a policy: size limit, content type) and presigned GET against the local server in its integration tests. If SeaweedFS fails that, switch the `s3` service to the fallback below without an ADR change.
4. Production and staging are unchanged (ADR-015 §3).

## Alternatives considered
- **Pin an old MinIO image from a mirror** — works today, but unmaintained and it may disappear the same way; security fixes stop. Rejected.
- **RustFS** (`rustfs/rustfs`, Apache-2.0, MinIO-compatible API and console) — closest drop-in, but still published as "preview" releases in 2026-09. **Fallback** if SeaweedFS lacks a needed S3 feature.
- **Garage** (`dxflrs/garage`) — solid, but needs a cluster layout set-up step and is AGPL; more set-up for the Owner.
- **LocalStack** — heavy, and recent versions need an account token. Rejected.
- **Use the production provider (R2) from local machines** — breaks "local first" (CLAUDE.md rule 7) and needs real keys on the Owner's computer. Rejected.

## Consequences
- Easier: `docker compose up` works with public images only; no code change anywhere (S3 API + env names unchanged).
- Harder: SeaweedFS's S3 layer is not 100% of AWS S3 (bucket policies in particular). Public-read for `public-media` is therefore served through the API/CDN path decided in the files slice, not by a local bucket policy.
- Changed 2026-09-30 (after acceptance): ADR-009 §1, ADR-015 §1 and `architecture.md` §3, §6, §10, §11 now say SeaweedFS locally.
