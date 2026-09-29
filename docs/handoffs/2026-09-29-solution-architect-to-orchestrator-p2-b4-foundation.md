# Handoff: solution-architect → orchestrator — P2-B4 part 1 (API contract foundation)
Date: 2026-09-29 | Task: P2-B4 (Step 7), part 1 of 3 (foundation → 6 parallel group runs → integration run)

## What I did
- Designed the source layout of the contract so six architect runs can write domain paths in parallel without touching the same file: each group has its own path, schema and events file; the root document is **generated** (`scripts/build-root.mjs`) from a hand-written base plus `$ref`s to every path/component, so nobody edits a shared list.
- Wrote the shared components every group references (errors, money, pagination, i18n, idempotency, users, escrow, payments/checkout target, conversations, reviews, reports, files, realtime envelope), the security schemes (user/staff × bearer/cookie per ADR-002/010) and all tags (one owner each).
- Wrote the foundation endpoints (`/files`, `/admin/files`, ADR-009) as the reference example of every convention.
- Fixed the ownership model in a machine-readable map (`src/ownership.yaml`): path prefixes per group (longest-prefix wins), schema-name and error-code prefixes, 51 reserved cross-group operationIds (F0 8 written, D1 10, D2 3, D3 4, D4 10, D5 6, D6 10), spec-16 delegations, the spec-16 staff permission catalogue. The build refuses paths or schemas a group does not own.
- Admin rule chosen: **the group that owns a resource also owns `/admin/<resource>`** and implements its own specs' staff ACs plus the listed spec-16 ACs; D6 owns only the admin platform (staff auth, staff/roles, audit, dashboard, reports queue, settings, fee rules, custom code, translations, analytics, system). Spec 16 coverage: D6 writes `coverage/16.md` with `DELEGATED:Dn` rows; delegates write `coverage/16-dn.md`.
- Cross-group design decisions baked into the conventions: one checkout for every purpose (`createCheckoutQuote` / `createPayment` with a shared `CheckoutTarget`, D3); one set of escrow operations (deliveries, revision requests, completion) shared by gig order items, contracts and custom offers (D4, per data-model §3.I); all threads are D5 conversations referenced by `ConversationRef`; report creation stays with the reported resource, the queue is D6; no cross-group path nesting (filters such as `?userId=` instead).
- Tooling: pinned Redocly CLI 2.55.0 + `yaml`; `redocly.yaml` (recommended + stricter errors + assertions for `x-permission`/`x-covers`/camelCase/tags, overrides justified); `check-contract.mjs` (x-permission content and security blocks, staff permission in catalogue, admin prefix/audience, Accept-Language on every path item, Error body on all 4xx/5xx, 401 on authenticated ops, Idempotency-Key + 409/422 on `x-money`, cursor pagination shape, no floats, Money not `*Tetri`, `*At` = Timestamp, camelCase properties, error-code prefixes/uniqueness, events); `check-coverage.mjs` (every AC of every spec exactly once, valid coverage kinds, operation ids exist, x-covers agreement, merged summary); `group-verify.mjs` (parallel-safe sandbox per group). Negative-tested: the rules fire.
- Results: `npm run verify` → sources lint **0 errors, 0 warnings**; bundle `openapi.yaml` lint **0 errors, 0 warnings**; checks 0 errors (warnings = work of the group runs). `npm run verify:group -- D1…D6` → all PASSED.

## Files created/changed
- `docs/04-api/CONVENTIONS.md` (new, binding rules §1–§18 incl. coverage format §12)
- `docs/04-api/README.md` (rewritten: what lives where, commands, coverage section placeholder)
- `docs/04-api/realtime.md` (new: Socket.IO contract, rooms, envelope, event ownership, catalogue table)
- `docs/04-api/openapi.yaml` (generated bundle, 7 paths / 8 operations, 67 schemas)
- `docs/04-api/redocly.yaml`, `package.json`, `package-lock.json`, `.gitignore`
- `docs/04-api/scripts/`: `lib.mjs`, `build-root.mjs`, `stamp-bundle.mjs`, `group-verify.mjs`, `check-contract.mjs`, `check-coverage.mjs`
- `docs/04-api/src/openapi.base.yaml`, `src/openapi.root.yaml` (generated), `src/ownership.yaml`
- `docs/04-api/src/components/`: `schemas.yaml`, `parameters.yaml`, `responses.yaml`, `headers.yaml`
- `docs/04-api/src/paths/f0-files.yaml` + stubs `d1-platform-auth-profiles.yaml`, `d2-catalog-gigs-reviews-content.yaml`, `d3-payments-subscriptions-withdrawals.yaml`, `d4-orders-offers-refunds.yaml`, `d5-messaging-projects-proposals.yaml`, `d6-notifications-admin.yaml`
- `docs/04-api/src/schemas/d1.yaml … d6.yaml` (stubs with `DnErrorCode`), `src/events/d1.yaml … d6.yaml` (empty lists)
- `docs/04-api/coverage/_TEMPLATE.md`
- Not changed: specs, legacy, STATUS.md, ADRs, architecture/data-model/url-map. Nothing committed.

## What the next agent must do
**Six group runs (solution-architect, parallel), one per group D1…D6:**
1. Follow `docs/04-api/CONVENTIONS.md` §18 (checklist). Edit only `src/paths/dN-*.yaml`, `src/schemas/dN.yaml`, `src/events/dN.yaml`, `coverage/NN.md` (+ `coverage/16-dn.md` for D1–D5), and their own handoff `docs/handoffs/2026-09-29-solution-architect-to-orchestrator-p2-b4-dN.md`.
2. Verify with `cd docs/04-api && npm ci && npm run verify:group -- Dn` (must print PASSED, 0 errors). **Do not** run `npm run lint/bundle/verify` (they rewrite shared generated files).
3. Create every reserved operation of the group exactly (CONVENTIONS §5.1) and read the cross-spec sections of §4.4.
4. Put needs for shared changes under "Requests to the integration run" in the handoff.

**Integration run (solution-architect, after all six):** apply the requested foundation changes; `npm run verify:final` until 0 errors (no stubs, all reserved operations present, every AC covered, no open `DELEGATED` rows); resolve cross-group `x-covers`; fill `realtime.md` §6 from `src/events`; copy `coverage/SUMMARY.md` into `README.md`; handoff for P2-B5 (security review).

**Orchestrator:** decide whether to commit the foundation before launching the group runs (recommended, so each run can diff its own work); update STATUS.md.

## Open questions / risks
- **AC count is 707, not 703.** The coverage checker counts list items "- AC-n" in each spec's "Acceptance criteria" section live: 00:26, 01:52, 02:41, 03:37, 04:39, 05:47, 06:45, 07:21, 08:34, 09:37, 10:29, 11:45, 12:36, 13:34, 14:20, 15:39, 16:78, 17:47. The working tree currently has uncommitted edits to specs 00, 04, 05, 10, 15, 16 (another agent, G-1…G-3 handoff present); the checker will follow whatever the specs say when the group runs start. Group runs should start after those spec edits are settled/committed.
- `@self` staff operations (own session, own profile, re-auth, own upload status) have no RBAC permission; spec 16 AC-9 says "exactly one permission". Documented as the exception in CONVENTIONS §6.1; D6 should list it for the Owner at the gate (no business-rule change).
- `adminCreateFileUpload` checks one permission chosen by purpose (`permissionByPurpose`: category image → `catalog.write`; blog image, home logo → `content.write`).
- New contract-level names (not business rules) that the Owner/security review should see: cookie names `mt_at`, `mt_rt`, `mt_staff_at`, `mt_staff_rt`; download `?mode=json` for mobile; `/…/lookup?uid=` for legacy public ids; `QUOTE_CHANGED` flow via `quoteId` = quote hash (data-model `payments.quote_hash`); global rate-limit defaults (CONVENTIONS §14: 600 reads / 120 writes per minute per user or IP; staff 1,200) — these defaults are an architect proposal for P2-B5 to confirm.
- `openapi-typescript` generation from the bundle is not yet tried (Phase 3); the `ErrorCode` `anyOf` of group enums and the discriminated `CheckoutTarget` bundle correctly (checked in `openapi.yaml`).
