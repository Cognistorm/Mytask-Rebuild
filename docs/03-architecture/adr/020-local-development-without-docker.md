# ADR-020: Local development without Docker
Date: 2026-10-02 | Status: **accepted** (Owner 2026-10-02: "Docker is off the table … choose whatever alternative works best") | Amends: ADR-015 §1 (local part only), ADR-017 §1 (how SeaweedFS runs locally), CLAUDE.md rule 7

## Context
- ADR-015 §1 runs the local stack with `docker compose up` (PostgreSQL + pgvector, Redis, SeaweedFS, Mailpit, bog-mock, optional ClamAV).
- The Owner cannot enable Docker Desktop or WSL on their computer, because they conflict with other software. Docker Desktop on Windows needs WSL 2 or Hyper-V; without them its engine never starts (checked 2026-10-02).
- Rule 7 still applies: everything runs on the Owner's computer, and nothing touches production. A cloud database would put development data and keys outside the computer, and every developer would need an account. Rejected for that reason.
- What the platform needs locally:
  - PostgreSQL with `pg_trgm`, `btree_gist`, `citext` and `vector`;
  - one Redis shared by the API and the worker processes;
  - an S3 API with presigned POST and GET (ADR-017 §3);
  - an SMTP catcher;
  - the BOG mock.

## Decision
1. **`pnpm local`** (`scripts/local.mjs`) starts the whole platform in one window, with no Docker. `pnpm infra:up` starts only the infrastructure, so `pnpm dev` can run in a second window.
   - **PostgreSQL = PGlite** (`apps/api/scripts/pglite-server.mjs`, data in `apps/api/.pglite`). It is real PostgreSQL compiled to WebAssembly, with all four extensions, and it is already the engine of `pnpm test`.
   - **Redis = native `redis-server` 7.4.11** (Windows build of `redis-windows/redis-windows`, the same version as compose). It runs with AOF and `noeviction`, like compose, and is shared by the API and the worker.
   - **S3 = native SeaweedFS 4.48** (`weed.exe`, the same version as ADR-017). The script creates the three buckets.
   - **Email = native Mailpit 1.31.3** (SMTP :1025, inbox :8025).
   - **Payments = `tools/bog-mock`** run by Node.
2. Each native tool is downloaded once into `.local/tools` (git-ignored) from its official GitHub release, and the download is checked against a **SHA-256 pinned in `scripts/local/tools.mjs`** before it is unpacked. There is no installer, no admin rights and no Windows service. Data lives in `.local/data`.
3. **Virus scanning is off locally** (`SCAN_PROVIDER=none`, already allowed outside production by ADR-009 §6). Uploads still pass the file-type check and image re-encoding, and are marked `scan_skipped`. Staging and production keep ClamAV, and `env.ts` refuses a production start without a scanner.
4. **Docker stays where it is not on the Owner's computer:**
   - CI keeps real PostgreSQL 17 + pgvector and Redis service containers (`RUN_INTEGRATION=1`), so locking and concurrency are always tested on real PostgreSQL;
   - deployment (Phase 6, ADR-015 §2–§3) keeps its images.

   `docker-compose.yml` stays as the reference for those environments.
5. A start stops leftovers of an earlier run that was killed hard (window closed). It only stops processes listening on the stack's ports that are clearly its own: tools from `.local`, or Node processes started from this repository. Anything else is reported, never stopped.

## Alternatives considered
- **Native PostgreSQL** (EnterpriseDB zip binaries): this would be real PostgreSQL, but no official Windows build of `pgvector` exists. Building it needs Visual Studio, and the community DLLs are unsigned. Rejected for now. If a later slice needs server-level PostgreSQL behaviour locally, revisit this decision.
- **Cloud services** (Neon, Upstash, Cloudflare R2): rejected by rule 7, and they need accounts and keys on the computer.
- **In-process Redis stand-in** (`memory://`, still used by `pnpm test`): it is not shared between the API and worker processes. Rejected for running the platform.
- **Memurai, Garnet** (Windows Redis alternatives): Memurai needs an installer and a Windows service. Garnet is not Redis, and its BullMQ compatibility is unproven. The native Redis 7.4 build is the same code as production.

## Consequences
- Easier: the Owner runs one command. The tools are about 70 MB instead of 1–2 GB of images, and nothing needs virtualization.
- Harder: PGlite is a single in-process PostgreSQL. It serves only one database: the database name in `DATABASE_URL` is ignored, so do not run `RUN_INTEGRATION=1` tests against the running local stack. It is not a load or concurrency test bed, and CI covers that. The PGlite build is Postgres 18 (CI and production: 17).
- The Owner's machine has no virus scanning. Treat local uploads as test data only.
- Updated together with this ADR:
  - `docs/SETUP-LOCAL.md`;
  - CLAUDE.md rule 7;
  - `architecture.md` §6;
  - `START-HERE.md`;
  - `scripts/create-local-env.mjs` (writes `SCAN_PROVIDER=none`).
