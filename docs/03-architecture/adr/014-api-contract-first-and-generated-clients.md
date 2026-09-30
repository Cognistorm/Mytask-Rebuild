# ADR-014: API contract first — OpenAPI 3.1 as the law, generated types and client, contract tests, versioning
Date: 2026-09-28 | Status: accepted (Owner 2026-09-30)

## Context
- CLAUDE.md: `docs/04-api/openapi.yaml` is the law; only the Architect changes it, with an ADR; shared types in `packages/types` are generated from it, never hand-written.
- Web and mobile must behave identically (vision goal 2). Mobile apps in the stores cannot be updated instantly, so the API must stay backwards compatible for released app versions.
- Conventions required by the architect role: resource-based REST, errors `{code, message, details}`, cursor pagination, ISO UTC dates, money as integer tetri + `GEL`, `Accept-Language: ka|en`, JWT auth, idempotency keys on money endpoints.

## Decision
1. **Contract first.** `docs/04-api/openapi.yaml` (OpenAPI 3.1) is written by the architect (P2-B4) before endpoints are built. The API implements it; the contract is not generated from code.
2. **Generation.**
   - `packages/types`: `openapi-typescript` generates TypeScript types (`paths`, `components`).
   - `packages/api-client`: `openapi-fetch` (tiny, typed by `packages/types`) plus a thin hand-written wrapper for cross-cutting headers only: base URL, `Accept-Language`, `Authorization`/cookies, token refresh, `Idempotency-Key` generation for money calls, `X-MyTask-Client`. No business logic.
   - Web uses the client in server components and client components; mobile and admin use the same package. Optional TanStack Query hooks are thin wrappers.
   - Generation runs in `pnpm build` (Turborepo task depending on the yaml); committing hand edits to generated files fails CI.
3. **Enforcement in the API.**
   - Request validation and **response validation** against the contract in tests and in development (`express-openapi-validator` mounted on the Express adapter, or an equivalent compiled Ajv validator). In production, request validation stays on; response validation is off for speed.
   - Every endpoint has integration tests that go through the validator, so a response that does not match the contract fails the build.
   - Redocly CLI lints the contract in CI (0 errors required, plan P2-B4) with custom rules: every operation has `operationId`, tags, security, an error response using the shared `Error` schema, `x-permission` (user policy or staff permission name); money fields use the shared `Money` schema; list endpoints use the shared cursor pagination schema; money-changing operations declare the `Idempotency-Key` header.
4. **Conventions (fixed in components):** `Error {code, message, details}` with a documented list of `code` values; `Money {amount: integer (tetri), currency: "GEL"}`; `CursorPage<T> {data, nextCursor}`; date-time strings in UTC; `Accept-Language` parameter (`ka` default, `en`); security schemes: `bearerAuth` (JWT) and `cookieAuth` (web), `staffBearer`/`staffCookie` for admin; the BOG webhook is unauthenticated but documented with its signature header.
5. **Versioning and compatibility.** Base path `/api/v1`. Additive changes (new endpoints, new optional fields, new enum values that clients treat as "unknown") are allowed in v1; clients must ignore unknown fields and handle unknown enum values gracefully. Breaking changes need `/api/v2` for the affected resources and must keep v1 running until the minimum supported app version no longer uses it. The API returns `X-Min-App-Version` (from a setting) so the app can ask users to update.
6. **Change process.** Before Owner approval, the architect edits freely. After approval, any change needs a new ADR (or an amendment ADR) and a handoff to backend, web and mobile engineers (architect rules). A CI diff check (`oasdiff`) reports breaking changes on every pull request.
7. **Realtime events** (ADR-007) are documented next to the contract (`docs/04-api/realtime.md` or `x-events` in the yaml) with payload schemas from the same components, and typed into `packages/types`.

## Alternatives considered
- **Code first (NestJS decorators → generated OpenAPI)** — convenient for backend developers, but makes the backend the source of truth and lets the contract drift with the code; CLAUDE.md makes the contract the law. Rejected.
- **GraphQL** — flexible for clients, but harder HTTP caching for SEO pages, and harder to secure per field; REST + OpenAPI fits the rules. Rejected.
- **tRPC** — ties clients to TypeScript server code and has no language-neutral contract. Rejected.
- **Orval (generates clients + hooks + zod)** — viable; `openapi-typescript` + `openapi-fetch` is smaller and has fewer generated lines to review. Orval can still be adopted later.

## Consequences
- Easier: web, admin and mobile get identical types; drift fails CI; a future partner or AI client needs only the yaml.
- Harder: the contract must be written before code, and every change goes through review (intended).
- Must change: P2-B4 writes the yaml and the coverage table; Phase 3 adds generation, lint and diff steps to CI.
