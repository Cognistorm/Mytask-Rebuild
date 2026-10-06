# Handoff: security-reviewer → orchestrator, task 4.1.28 (security re-check of slice 02 "before merge" fixes)

## What I did
- Re-checked the four "before merge" conditions of security review 06 §6.1 on `feat/profiles` @ `b7db76ac` (commits `029822fd`, `e359934d`, `b7db76ac`).
- Read every changed file and the code around it (attach paths, views, Caddy, client-IP resolver, web `viewerApi`).
- Ran `pnpm --filter @mytask/api test`: 33 files passed, 1 skipped; 420 tests passed, 6 skipped.
- Probed a private SeaweedFS 4.48 on scratchpad ports with the new flags (filer HTTP 404; master admin GET deletes a bucket), then stopped it.
- Did not start `scripts/local.mjs` (coordinator instruction). I relied on the orchestrator’s `S3_INTEGRATION=1` run (6/6) for the integration test.
- **Verdict: PASS. Merge of `feat/profiles` to `main` is allowed from the security side.** All four conditions are met: SEC-62, SEC-63, the SEC-64 stop-gap, and SEC-65. SEC-70 (a) is also fixed.
- New findings: 2 Medium (SEC-72, SEC-73), 2 Low (SEC-74, SEC-75), 6 Info (I-38 … I-43). None blocks the merge.

## Files created/changed
- `docs/06-qa/security/07-slice-02-recheck-2026-10-03.md` (new)
- `docs/handoffs/2026-10-03-security-reviewer-to-orchestrator-4-1-28-security-recheck.md` (this file)
- No product code, ROADMAP or STATUS changed; nothing committed.

## What the next agent must do
- **orchestrator:**
  - mark 4.1.28 done in ROADMAP/STATUS (security side);
  - carry the review 07 §6 lists forward;
  - schedule SEC-73 + SEC-74 for the next backend pass (recommended before or right after the merge; before Phase 5 at the latest).
- **backend-engineer:**
  - SEC-73: move the "not attached" conditions into the candidate `SELECT` of `cleanupUnattachedPublic` (`apps/api/src/worker/files-scan.sweeper.ts:152-161`), loop, and extend the test;
  - SEC-74: attach marks the file row inside the save transaction, and the cleanup checks that mark; `portfolio.service.ts` `views()` must not throw for one bad item;
  - before slice 05/07: SEC-75 (verify the copy’s SHA-256, or put the scanned bytes) and I-38 (no ETag → refuse).
- **devops-engineer:**
  - SEC-72 before Phase 5: random master/volume ports in `scripts/local.mjs`, a credential if SeaweedFS supports one, and an ETL note in SETUP-LOCAL;
  - Phase 6 checklist: I-39 (quarantine lifecycle rule, Redis `noeviction` + persistence) and I-42 (CDN purge);
  - I-41: a CI check that proves the SSR visitor IP arrives.

## Open questions / risks
- SEC-73 makes the SEC-64 stop-gap a silent no-op once 500 attached images exist (at the latest at the Phase 5 avatar import). It must be fixed before then.
- SEC-72 means data loss, not disclosure: local data is synthetic today. It matters before real KYC images pass through the local stack.
- The Caddy-based CI step (`ci.yml:179-181`) has not run yet, and it does not by itself prove the forwarding (I-41).
