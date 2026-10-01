# Phase 3 plan — Platform core (Foundation)
Date: 2026-09-30 | Author: orchestrator (session, no sub-agents) | Status: in progress

Inputs: `docs/STATUS.md` (Phase 2 closed 2026-09-30), `architecture.md` §4 and §6, ADR-001, ADR-006 §3, ADR-013, ADR-014, ADR-015 §1 and §6, `START-HERE.md` (Phase 3 row).

## Goal
The Owner runs `docker compose up` + `pnpm dev` and gets an empty but real platform: API, web, admin and mobile all talking to the same API through the generated contract client. CI checks every pull request. Then slice 01 (auth) is built on top of it.

## Tasks
| ID | Task | Role | Output | Done when |
|---|---|---|---|---|
| P3-1 | Monorepo scaffold: pnpm workspaces + Turborepo, TypeScript 5.x strict, shared config (tsconfig, ESLint with import-boundary rules, Prettier), `.editorconfig`, `.gitattributes` (`eol=lf`, R-044) | devops-engineer | root files, `packages/config` | `pnpm install`, `pnpm lint`, `pnpm typecheck` pass |
| P3-2 | Generated contract packages: `packages/types` (openapi-typescript) and `packages/api-client` (openapi-fetch + thin header wrapper) | devops-engineer | `packages/types`, `packages/api-client` | `pnpm gen` is repeatable; CI fails on drift or hand edits (ADR-014 §2) |
| P3-3 | Shared i18n: `packages/i18n` with legacy `t_*` keys imported once, `:param` → `{{param}}` (ADR-006 §3) | devops-engineer | `packages/i18n/{ka,en}.json`, import report | import script repeatable; report lists HTML-bearing strings for later cleanup |
| P3-4 | App skeletons: `apps/api` (NestJS 11: config validation, `/api/v1/health`, error shape, request id, contract validator, worker entry, Prisma wired), `apps/web` + `apps/admin` (Next.js), `apps/mobile` (Expo) — each calls `getHealth` through `packages/api-client` | devops-engineer (skeleton only; features belong to backend/web/mobile engineers in slices) | `apps/*` | typecheck, unit/contract tests and builds pass |
| P3-5 | Local stack: `docker-compose.yml` (postgres 17 + pg_trgm + pgvector, redis 7, SeaweedFS S3 + bucket init (ADR-017, accepted; MinIO no longer ships an image), mailpit, bog-mock, clamav profile `scan`, apps profile with caddy), Caddyfile with the ADR-013 §15 header rules, Dockerfiles, `.env.example` | devops-engineer | root + `infra/` | `docker compose up` starts the infra; `--profile apps` serves web/admin/api through Caddy |
| P3-6 | CI (GitHub Actions): contract verify + oasdiff, generated-code drift, gitleaks, lint, typecheck, test (real Postgres/Redis), build, Docker image build + compose smoke test | devops-engineer | `.github/workflows/ci.yml` | green on the pull request |
| P3-7 | `docs/SETUP-LOCAL.md` for the Owner (Windows + macOS) | devops-engineer | doc | Owner can follow it without help |
| P3-9 | Study: isolating S-110 custom code (Owner answer Q-146: "study isolating custom code in Phase 3"; ADR-013 §7) | solution-architect | note or ADR in `docs/03-architecture/` | recommendation ready before slice 17 (content/SEO) — **done 2026-10-01: ADR-019 accepted (Q-158 (a))** |
| P3-8 | Slice 01 auth (`/feature 01-auth.md`), including the ADR-013 §19 client-IP tests (a)(b)(c)(e) before its security review, the `ClientIpResolver`, the seed (Super-admin, test users incl. one legacy `$2y$` hash) | backend → web → mobile → QA → security | slice 01 | Phase 3 gate: login works on web AND the app (START-HERE.md) |

Order: P3-1 → P3-2/P3-3 → P3-4 → P3-5 → P3-6 → P3-7 → review of P3-1…P3-7 → P3-8.

## Deliberately NOT in P3-1…P3-7
- Any business rule, database model or endpoint other than `getHealth` (they come with their slice, from `data-model.md`).
- The token-refresh logic of `packages/api-client` (slice 01 builds it with the auth endpoints).
- `packages/ui` components (built per slice from `docs/05-design/components.md`, first ones in slice 01).
- BOG mock behaviour beyond a health endpoint (slice 05).
- Staging/production deployment, backups, Cloudflare firewall (Phase 6, Owner approval).

## Phase 3 gate (Owner)
1. `docker compose up` + `pnpm dev` work on the Owner's computer following `docs/SETUP-LOCAL.md`.
2. CI green on the pull request.
3. Slice 01: register / log in / log out on the web and in the mobile app, QA PASS, security review PASS (incl. ADR-013 §19 tests).
