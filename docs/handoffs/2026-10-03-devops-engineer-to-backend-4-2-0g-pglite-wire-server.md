# 4.2.0g Local PGlite: right answers after an error inside a transaction

From: devops-engineer · To: backend-engineer (4.2.7, 4.2.8), qa-engineer · Date: 2026-10-03

## What I did
**Cause** (found with a protocol trace; `@electric-sql/pglite-socket` 0.2.11 and `@electric-sql/pglite` 0.5.8 are
the newest releases, so no upgrade fixes it):
1. When an extended-protocol message fails (Parse/Bind/Describe/Execute), PGlite answers ErrorResponse **plus**
   ReadyForQuery, and then a second ReadyForQuery for the client's Sync. Real PostgreSQL sends only one.
   - Inside a transaction, Prisma sends `ROLLBACK` at once. The `pg` driver takes the extra ReadyForQuery as the
     end of the ROLLBACK.
   - From then on, every answer on that pooled connection is one query late. This gave "No 'X' record was found for
     a nested create" and `count` → null.
   - Outside a transaction the extra signal usually arrived while the connection was idle, so it went unnoticed.
2. A second bug, found with the same trace: pglite-socket sent one protocol message at a time to the one PGlite
   session. Two connections' Parse/Bind/Execute could therefore interleave. Both use the unnamed statement and
   portal, so concurrent queries could fail with `portal "" does not exist` or run the wrong statement.

**Fix:** our own small wire server `apps/api/scripts/pglite-wire-server.mjs` (+ `.d.mts` types). It replaces
pglite-socket in `test/global-setup.mts` and in `scripts/pglite-server.mjs` (`pnpm local`):
- Each client batch up to its Sync (or a simple Query, Flush or startup message) runs as one unit.
- A connection keeps the session until it is back at "ready for query" outside a transaction (the same rule
  pglite-socket used for transactions).
- After an extended-protocol error, that connection's messages are skipped until its Sync (the PostgreSQL rule), and
  PGlite's early ReadyForQuery is dropped.
- A connection that closes inside a transaction is rolled back.
- SSL/GSS requests are answered `N`; a cancel request is ignored.

The direct `@electric-sql/pglite-socket` devDependency is removed. `@prisma/dev` still brings its own older copy.

**Regression test** `apps/api/test/db-transaction-errors.test.ts` (4). It also runs in CI on real PostgreSQL:
- an interactive `$transaction` fails, and the next counts are right;
- a nested create fails, and the next nested create and count are right;
- repeated failures, then a failing create in parallel with 8 counts on other connections, then 3 parallel nested
  creates;
- 40 parallel parameterised queries each get their own value.

All 4 fail on the old server. The last one, run alone, fails with `portal "" does not exist`. All 4 pass on the new
server.

The two 4.2.2b workaround comments in `test/catalog-schema.test.ts` were removed. Their tests are unchanged.

Results: API **512 passed / 6 skipped** (was 508). `tsc` and `eslint` are green. A smoke test of
`scripts/pglite-server.mjs` with a data directory on disk passed (error inside BEGIN → ROLLBACK → right count; 20
parallel queries right). The full suite takes about 240 s (was about 215 s), because a batch now holds the session
until its Sync.

## Files created/changed
- New:
  - `apps/api/scripts/pglite-wire-server.mjs`, `apps/api/scripts/pglite-wire-server.d.mts`
  - `apps/api/test/db-transaction-errors.test.ts`
- Changed:
  - `apps/api/test/global-setup.mts`, `apps/api/scripts/pglite-server.mjs`, `apps/api/test/catalog-schema.test.ts`
    (comments only)
  - `apps/api/package.json`, `pnpm-lock.yaml`
- `docs/ROADMAP.md`, `docs/STATUS.md`, this handoff

## What the next agent must do
- **4.2.7 / 4.2.8 (backend)**: 409/422 tests inside service transactions now work locally. There is no need to keep
  expected failures outside transactions any more.
- **Owner / anyone running `pnpm local`**: restart `pnpm local` once so the new server is used. The data in
  `apps/api/.pglite` is unchanged.

## Open questions / risks
- None for the Owner.
- The server is for local use only: one session, no authentication, bound to 127.0.0.1 by default. CI and production
  use real PostgreSQL.
- If a future PGlite release fixes the double ReadyForQuery, the server still works: it only drops a ReadyForQuery
  that directly follows an error in a non-Sync message.
