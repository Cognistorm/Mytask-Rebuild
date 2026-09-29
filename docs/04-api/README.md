# API contract — MyTask.ge
`openapi.yaml` is **the law** (CLAUDE.md golden rule 2, ADR-014): backend, web, admin and mobile build against it; `packages/types` and `packages/api-client` are generated from it. Only the solution-architect changes it — freely until the Owner approves it at the Phase 2 gate, afterwards only with an ADR and a handoff to the backend, web and mobile engineers.

Status (2026-09-29): **P2-B4 part 1 (foundation) done** — conventions, shared components, ownership map, tooling and the file endpoints. Domain paths are written next by six parallel group runs (D1…D6), then one integration run bundles, lints and merges the coverage table below. Not yet approved by the Owner.

## What lives where
| Path | What | Who edits |
|---|---|---|
| `openapi.yaml` | **Generated** bundle of the whole contract (OpenAPI 3.1). What clients generate from. | nobody by hand (`npm run bundle`) |
| `CONVENTIONS.md` | Binding rules: naming, ownership map, security/`x-permission`, errors, pagination, money, idempotency, BOG webhook, i18n, coverage format, tooling | architect |
| `realtime.md` | Socket.IO contract (connection, rooms, envelope) and event catalogue | architect (integration run fills §6 from `src/events`) |
| `coverage/NN.md`, `coverage/16-dN.md` | Spec AC → operationId tables, one per spec (format `coverage/_TEMPLATE.md`) | the group owning the spec |
| `coverage/SUMMARY.md` | Generated summary (by `npm run verify:final`), copied into the section below | generated |
| `src/openapi.base.yaml` | info, servers (local, staging, production, admin hosts), tags, security schemes | architect |
| `src/openapi.root.yaml` | **Generated** root: base + `$ref`s to every path and component | nobody by hand (`npm run build:root`) |
| `src/ownership.yaml` | Machine-readable ownership: path prefixes, schema/error prefixes, reserved operations, spec-16 delegations, staff permission catalogue | architect |
| `src/components/` | Shared schemas (Error, Money, CursorPage, UserSummary, EscrowSummary, CheckoutTarget, File…), parameters, responses, headers | architect |
| `src/paths/f0-files.yaml` | Foundation endpoints: uploads and private downloads (ADR-009) — also the reference example | architect |
| `src/paths/dN-*.yaml`, `src/schemas/dN.yaml`, `src/events/dN.yaml` | Domain paths, schemas and realtime events of group N | group run N (architect) |
| `scripts/` | `build-root`, `group-verify`, `check-contract`, `check-coverage`, `stamp-bundle` | architect |
| `redocly.yaml` | Lint rules (recommended + stricter errors + project assertions; overrides explained in CONVENTIONS §13) | architect |

Groups: D1 specs 00/01/02 · D2 03/04/07/17 · D3 05/09/14 · D4 06/12/13 · D5 08/10/11 · D6 15/16 (CONVENTIONS §4).

## Commands (run in `docs/04-api`)
Requires Node.js ≥ 20. Tools are pinned in `package.json` (`@redocly/cli` 2.55.0, `yaml` 2.8.1).
```bash
npm ci                          # install the pinned tools (once)

# group runs (parallel-safe sandbox in .build/dN, never touches shared generated files)
npm run verify:group -- D3

# integration run / architect
npm run lint                    # build src/openapi.root.yaml, then: redocly lint src/openapi.root.yaml --config redocly.yaml
npm run bundle                  # build root, then: redocly bundle src/openapi.root.yaml --config redocly.yaml -o openapi.yaml
npm run lint:bundle             # redocly lint openapi.yaml --config redocly.yaml
npm run verify                  # lint + bundle + lint:bundle + check-contract + check-coverage (warnings allowed)
npm run verify:final            # same with --final (gate mode) + writes coverage/SUMMARY.md
```
Without `npm ci`, the equivalent one-off commands are:
`node scripts/build-root.mjs && npx -y @redocly/cli@2.55.0 lint src/openapi.root.yaml --config redocly.yaml` and
`npx -y @redocly/cli@2.55.0 bundle src/openapi.root.yaml --config redocly.yaml -o openapi.yaml` (the scripts need the `yaml` package, so `npm ci` is recommended).

Last foundation result (2026-09-29): `npm run verify` → sources and bundle lint **0 errors, 0 warnings**; `check-contract` 0 errors (warnings = reserved operations and error-code stubs the group runs will write); `check-coverage` 0 errors (all coverage files still to be written).

## How clients use it (Phase 3)
- `packages/types`: `openapi-typescript openapi.yaml` → `paths`, `components` types.
- `packages/api-client`: `openapi-fetch` typed by `packages/types` + a thin wrapper for base URL, `Accept-Language`, auth/refresh, `Idempotency-Key` on `x-money` operations, `X-MyTask-Client`.
- API: request validation always, response validation in tests (ADR-014 §3); CI runs `npm run verify:final` and `oasdiff` for breaking changes.

## Coverage (spec AC → endpoint)
Filled by the integration run from `coverage/SUMMARY.md` (gate item 7: every approved AC covered). Per-spec detail in `coverage/NN.md`.

| Spec | Title | Owner | ACs | API | Not API | Delegated (open) | Missing | Detail |
|---|---|---|---|---|---|---|---|---|
| — | to be merged by the integration run | | 707 (at 2026-09-29) | | | | | |
