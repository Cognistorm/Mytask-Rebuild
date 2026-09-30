# API contract — MyTask.ge
`openapi.yaml` is **the law** (CLAUDE.md golden rule 2, ADR-014): backend, web, admin and mobile build against it; `packages/types` and `packages/api-client` are generated from it. Only the solution-architect changes it.

**Status: approved by the Owner on 2026-09-30 as the contract (Phase 2 gate), version 1.0.0.** From now on **every change to the contract needs an ADR** in `docs/03-architecture/adr/` (Context / Decision / Alternatives / Consequences) **and a handoff to the backend, web and mobile engineers** (CLAUDE.md golden rule 2). Additive changes only within `/api/v1` (ADR-014 §5); breaking changes are checked with `oasdiff` in CI. The approved 1.0.0 baseline already contains the Owner's gate answers (Q-109…Q-121, Q-137, Q-144…Q-146) and the P2-B5 re-check fixes SEC-30, SEC-31 and SEC-32, applied on 2026-09-30 (`docs/handoffs/2026-09-30-solution-architect-to-orchestrator-gate-answers.md`).

Status (2026-09-30): **approved, 1.0.0** — P2-B4 (foundation, six group runs D1…D6, integration run), the P2-B5 security fixes and the Owner's gate answers. The contract has **477 operations on 398 paths, 768 component schemas, 34 realtime events** (+ `file.processed`), and covers **all 715 acceptance criteria of the 18 specs** (707 at P2-B4 + NEW 01 AC-53…AC-55, 02 AC-42, 14 AC-21…AC-23, 16 AC-74a). P-135, P-136 and P-137 are accepted. `npm run verify:final`: 0 errors, 0 warnings.

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

Last result (2026-09-30, gate answers applied): `npm run verify:final` → Redocly lint of the sources **0 errors, 0 warnings**; bundle `openapi.yaml` rebuilt (info.version 1.0.0); Redocly lint of the bundle **0 errors, 0 warnings**; `check-contract --final` **0 errors, 0 warnings**; `check-coverage --final` **0 errors, 0 warnings**, `coverage/SUMMARY.md` written (715 ACs, 0 missing, 0 open DELEGATED). The checkers accept AC ids with a letter suffix (`16 AC-74a`, CONVENTIONS §12.1).

## How clients use it (Phase 3)
- `packages/types`: `openapi-typescript openapi.yaml` → `paths`, `components` types.
- `packages/api-client`: `openapi-fetch` typed by `packages/types` + a thin wrapper for base URL, `Accept-Language`, auth/refresh, `Idempotency-Key` on `x-money` operations, `X-MyTask-Client`.
- API: request validation always, response validation in tests (ADR-014 §3); CI runs `npm run verify:final` and `oasdiff` for breaking changes.

## Coverage (spec AC → endpoint)
Gate item 7: every approved AC is covered exactly once per coverage file — `API` (operations implement it), `API+JOB` (operations plus a background job, ADR-008) or `NOT-API:<reason>` (client-only, email template, job only, infrastructure, migration, cross-cutting policy, editorial content). The full AC → operationId table is in the per-spec files linked below (`coverage/NN.md`; spec 16 ACs implemented by other groups are in `coverage/16-d1.md … 16-d5.md`, and each `DELEGATED` row in `coverage/16.md` names the real rows). Generated table (`coverage/SUMMARY.md`, "API" = API + API+JOB):

| Spec | Title | Owner | ACs | API | Not API | Delegated (open) | Missing | Detail |
|---|---|---|---|---|---|---|---|---|
| 00 | Platform rules (cross-cutting) | D1 | 26 | 15 | 11 | 0 | 0 | [coverage/00.md](coverage/00.md) |
| 01 | Auth and accounts | D1 | 55 | 55 | 0 | 0 | 0 | [coverage/01.md](coverage/01.md) |
| 02 | Profiles and dashboards | D1 | 42 | 35 | 7 | 0 | 0 | [coverage/02.md](coverage/02.md) |
| 03 | Categories and search | D2 | 37 | 33 | 4 | 0 | 0 | [coverage/03.md](coverage/03.md) |
| 04 | Gigs | D2 | 39 | 37 | 2 | 0 | 0 | [coverage/04.md](coverage/04.md) |
| 05 | Payments and wallet | D3 | 47 | 46 | 1 | 0 | 0 | [coverage/05.md](coverage/05.md) |
| 06 | Gig orders | D4 | 45 | 43 | 2 | 0 | 0 | [coverage/06.md](coverage/06.md) |
| 07 | Reviews | D2 | 21 | 20 | 1 | 0 | 0 | [coverage/07.md](coverage/07.md) |
| 08 | Messaging (Inbox chat) | D5 | 34 | 28 | 6 | 0 | 0 | [coverage/08.md](coverage/08.md) |
| 09 | Subscriptions, points, referrals and promo codes | D3 | 37 | 30 | 7 | 0 | 0 | [coverage/09.md](coverage/09.md) |
| 10 | Projects (post, moderate, project page) | D5 | 29 | 26 | 3 | 0 | 0 | [coverage/10.md](coverage/10.md) |
| 11 | Proposals and hiring (award, one escrow payment, delivery, completion) | D5 | 45 | 43 | 2 | 0 | 0 | [coverage/11.md](coverage/11.md) |
| 12 | Custom offers | D4 | 36 | 35 | 1 | 0 | 0 | [coverage/12.md](coverage/12.md) |
| 13 | Refunds, disputes and unblock requests | D4 | 34 | 32 | 2 | 0 | 0 | [coverage/13.md](coverage/13.md) |
| 14 | Withdrawals | D3 | 23 | 23 | 0 | 0 | 0 | [coverage/14.md](coverage/14.md) |
| 15 | Notifications (catalogue, channels, notification centre, preferences, push) | D6 | 39 | 19 | 20 | 0 | 0 | [coverage/15.md](coverage/15.md) |
| 16 | Admin panel (admin.mytask.ge): staff, RBAC, audit, moderation, users, money, fees, settings, content, analytics, logs | D6 | 79 | 74 | 5 | 0 | 0 | [coverage/16.md](coverage/16.md) |
| 17 | Content and SEO: CMS pages, Terms & Privacy, blog, contact, newsletter, home content, `/gita`, SEO meta, sitemap, robots, redirects | D2 | 47 | 35 | 12 | 0 | 0 | [coverage/17.md](coverage/17.md) |
| **All** | | | **715** | **629** | **86** | **0** | **0** | |

Breakdown by coverage kind (gate answers applied 2026-09-30):

| Spec | ACs | API | API+JOB | NOT-API: ui | job | email | infra | migration | policy | content |
|---|---|---|---|---|---|---|---|---|---|---|
| 00 | 26 | 13 | 2 | – | 2 | – | 3 | 1 | 4 | 1 |
| 01 | 55 | 55 | – | – | – | – | – | – | – | – |
| 02 | 42 | 34 | 1 | 6 | – | – | – | – | 1 | – |
| 03 | 37 | 33 | – | 3 | – | – | 1 | – | – | – |
| 04 | 39 | 37 | – | 2 | – | – | – | – | – | – |
| 05 | 47 | 38 | 8 | – | – | – | 1 | – | – | – |
| 06 | 45 | 38 | 5 | 1 | – | 1 | – | – | – | – |
| 07 | 21 | 20 | – | – | – | – | – | 1 | – | – |
| 08 | 34 | 26 | 2 | 2 | – | – | 1 | 1 | 1 | 1 |
| 09 | 37 | 27 | 3 | – | 6 | 1 | – | – | – | – |
| 10 | 29 | 24 | 2 | 1 | – | – | – | 1 | 1 | – |
| 11 | 45 | 40 | 3 | – | – | – | – | 1 | 1 | – |
| 12 | 36 | 33 | 2 | – | – | – | – | 1 | – | – |
| 13 | 34 | 29 | 3 | – | – | 1 | – | 1 | – | – |
| 14 | 23 | 22 | 1 | – | – | – | – | – | – | – |
| 15 | 39 | 17 | 2 | 4 | 5 | 4 | 1 | 1 | 5 | – |
| 16 | 79 | 73 | 1 | – | – | – | 1 | 1 | 3 | – |
| 17 | 47 | 35 | – | 5 | 1 | – | 4 | 2 | – | – |
| **All** | **715** | **594** | **35** | **24** | **14** | **7** | **12** | **11** | **16** | **2** |

Spec 05 AC-44…AC-47 (reconciliation), the S-128 setting (area `payments`), spec 00 R-5.3a / spec 04 AC-5 / spec 10 AC-3…AC-4 (Georgian-field rule) and spec 04 AC-32 ("You may also like") follow P-135, P-136 and P-137, **accepted by the Owner on 2026-09-30** (Q-109…Q-111, Q-137); their operations are binding.
