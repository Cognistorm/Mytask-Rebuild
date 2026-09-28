# ADR-001: Technology stack and monorepo
Date: 2026-09-28 | Status: proposed

## Context
- The vision needs one backend API for a website and an iOS/Android app, high performance, strong SEO, a clean codebase and room for AI features (`docs/00-vision.md` Goals 1–3).
- Constraints: one Owner, runs locally first (`docker compose up`, CLAUDE.md rule 7), affordable hosting, all code written by Claude agents on a Pro budget (vision "Constraints"). So we want one language, mainstream tools with good documentation, and nothing that needs a paid licence.
- CLAUDE.md requires TypeScript `strict` everywhere, shared types generated from the OpenAPI contract, and shared tokens/UI/i18n/assets packages.
- Legacy is Laravel 10 + Livewire + MySQL with rules inside 304 page components (`inventory.md`). Its data problems (varchar money, enum drift, missing columns, R-015, R-016, R-017, R-033) come from untyped code and a loose schema.

## Decision
Confirm the default stack, with small additions:

| Layer | Choice | Why (against the constraints) |
|---|---|---|
| Language | TypeScript 5.x, `strict: true`, Node.js LTS (22 or 24) | One language for API, web, admin, mobile and tooling; agents and the Owner only need one toolchain |
| Monorepo | pnpm workspaces + Turborepo | Shared packages without publishing; cached builds keep CI and local runs cheap |
| API | NestJS 11 (Express adapter), modular (one module per domain) | Structure for a large domain (auth, ledger, escrow, admin); DI makes policies, providers (BOG, mail, push, storage) swappable and testable; first-class WebSockets and queues (BullMQ) in the same codebase |
| Database | PostgreSQL 17 | Transactions with row locks for the ledger, CHECK constraints and enums against drift, full-text + `pg_trgm` for search (ADR-011), `pgvector` for later AI features, free and runs in Docker |
| ORM | Prisma (schema + migrations + typed client); raw SQL (`$queryRaw`, typed) for ledger locking, sweepers (`FOR UPDATE SKIP LOCKED`) and search ranking | Typed queries turn "non-existent column" bugs (R-015, R-016) into compile errors; one schema file is readable by the Owner and the migration engineer |
| Validation | Request/response validated against `openapi.yaml` (ADR-014) + zod for internal config | The contract is the law (CLAUDE.md) |
| Cache / queue | Redis 7 + BullMQ | Retries, delayed jobs, dashboards; one small service |
| Web | Next.js (App Router, React Server Components), self-hosted with `output: standalone` | SSR/ISR for SEO, file-based routing that fits `/en/` prefixes, no dependency on a specific host |
| Admin | Separate Next.js app (`apps/admin`), client-rendered (ADR-010) | Same skills and `packages/ui`; separate origin for security |
| Mobile | React Native + Expo (Expo Router, EAS Build or local builds, expo-secure-store, expo-notifications) | One codebase for iOS and Android, React skills shared with web, Expo Push is free, over-the-air updates for JS fixes |
| UI sharing | `packages/tokens` (single source, exported as CSS variables and an RN theme object); `packages/ui` with two entry points `@mytask/ui/web` and `@mytask/ui/native` that share props, variants and tokens but render natively on each platform | Web stays light for SEO (no react-native-web bundle); the app gets real native components; both look the same because they share tokens and variant definitions. Final component list: P2-C2 |
| i18n | i18next (+ react-i18next) on web, admin and mobile, JSON from `packages/i18n` | Works identically in Next.js and React Native (ADR-006) |
| Testing | Vitest/Jest for unit, Supertest + real Postgres/Redis (Docker) for API integration, Playwright for web E2E, Maestro or Detox for mobile E2E | CLAUDE.md: every endpoint tested, every screen has an E2E test |
| Code quality | ESLint (with import-boundary rules), Prettier, `.editorconfig`, `.gitattributes` (`eol=lf`, fixes R-044), gitleaks | |

Layout: `apps/api` (HTTP + WebSocket entry `main.ts`, worker entry `worker.ts`), `apps/web`, `apps/admin`, `apps/mobile`, `packages/{types,api-client,tokens,ui,i18n,assets,config}`, `tools/{migrate-legacy,bog-mock}` — see `architecture.md` §4.

## Alternatives considered
- **Keep Laravel (PHP) as an API-only backend** — the Owner's team knows the domain in PHP, but the clients are TypeScript, types would be duplicated, and the rebuild would invite copying legacy code with its money bugs. Rejected.
- **Fastify/Hono without a framework** — lighter and faster, but for ~30 domain modules the agents would have to invent structure (DI, guards, modules) themselves. NestJS gives that structure for free. Performance difference is irrelevant at MyTask's scale.
- **Drizzle ORM instead of Prisma** — closer to SQL and very good for raw queries; Prisma was chosen for its readable schema and migrations and mature tooling. Where Prisma is weak (locks, `SKIP LOCKED`, ranking) we use typed raw SQL. Revisit only if Prisma blocks something.
- **MySQL 8 (same as legacy)** — would ease migration slightly, but weaker CHECK/enum handling, no `pgvector`, weaker full-text for our needs. Migration is an ETL anyway (Phase 5).
- **Flutter or native Swift/Kotlin for mobile** — two extra languages or no code sharing with web. Rejected.
- **One Next.js app with the API inside (route handlers / server actions)** — simplest to start, but it puts business logic inside the web app, which is exactly what makes a mobile app hard today. Rejected on principle.
- **react-native-web to share one UI codebase** — heavier web bundles and weaker SEO/semantics. Rejected for the public web.

## Consequences
- Easier: one language; types flow from the contract to every client; money and schema bugs become compile or constraint errors; everything runs in Docker for free.
- Harder: NestJS and Prisma have learning curves; Prisma needs raw SQL for a few hot paths (documented in code). Two UI entry points must be kept visually in sync (mitigated by shared tokens and variant definitions, and by the design preview in P2-C3).
- Must change: Phase 3 scaffolding follows this layout; P2-C2 produces tokens in a format that exports both CSS variables and an RN theme; the legacy MySQL data is moved by an ETL (`tools/migrate-legacy`, Phase 5).
