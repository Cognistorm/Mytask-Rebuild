# 4.1.27 Security review of slice 02 (spec 02 Profiles and dashboards, incl. files F0)

From: security-reviewer (independent; did not write this code) · To: devops-engineer, backend-engineer, web-engineer, mobile-engineer, solution-architect, orchestrator (Owner questions) · Date: 2026-10-03

## What I did
- Reviewed `feat/profiles` @ `984d6dfd` against `main` (merge-base `d2d31496`, 72 commits): files F0, appeal files, profiles, presence, reports, lists, linked accounts, availability, account settings (`updateMe`, email change, `deleteMe`), portfolio + staff queue, KYC user + staff, dashboard, `@OptionalUser()`, web SSR `viewerApi`, CSP, theme, admin queues, mobile upload/KYC, `pnpm local` SeaweedFS, Caddy.
- Ran `pnpm --filter @mytask/api test` (33 files passed, 1 skipped; 414 tests passed, 5 skipped) and `pnpm audit --prod` (2 high + 3 moderate, all build/mobile tooling, I-36).
- Probes from the scratchpad only: a separate SeaweedFS 4.48 on other ports with the `pnpm local` flags (P1–P5), a throw-away `next start` of the built web app (P6). All stopped.
- Answered the QA notes: N-1 → I-30 (accepted), N-2 → I-31 (intended, document it), N-4 → SEC-66 (Owner decision), N-5 → I-34.
- **Verdict: PASS with conditions.** 0 Critical, 0 High; 5 Medium (SEC-62 … SEC-66), 5 Low (SEC-67 … SEC-71), 8 Info (I-30 … I-37). Merge is allowed after the four items below.

## Files created/changed
- `docs/06-qa/security/06-slice-02-profiles-2026-10-03.md` (the review).
- `docs/handoffs/2026-10-03-security-reviewer-to-backend-web-mobile-4-1-27-security-review-slice-02.md` (this file).
- No product code, tests, ROADMAP or STATUS changed. Nothing committed.

## What the next agent must do
**Before merge of `feat/profiles` (review §6.1):**
1. **devops-engineer, SEC-62:** add `-filer.disableHttp` to the `weed server` arguments in `scripts/local.mjs:184-200` (verified: S3 still works, the filer answers 404); protect or document master 9333 / volume 8334; start-up check that `http://127.0.0.1:8888/` is refused. Today the filer serves and lists every bucket incl. `kyc` without credentials and with `Access-Control-Allow-Origin: *`, and accepts writes into `public-media`.
2. **backend-engineer, SEC-63:** in `file-scan.service.ts` pass the ETag of the scan's `GetObject` as `CopySourceIfMatch` to the `copy` of `processing: 'none'` files (or write the scanned bytes); reject on mismatch; test that swaps the object between read and copy; shorten `UPLOAD_EXPIRES_SECONDS`; remove `quarantine/` keys of rows that are no longer `pending`.
3. **backend-engineer, SEC-64 stop-gap:** sweeper deleting `ready` `avatar` / `portfolio_image` files that are not attached within 24 hours (+ test).
4. **devops-engineer, SEC-65:** in `infra/caddy/Caddyfile` set the canonical `X-MyTask-Client-IP` header (Caddy's client_ip placeholder) on the `web` and `admin` `reverse_proxy` upstreams too, so `viewerApi` forwards the visitor IP; test that SSR calls of two visitors land in different rate-limit buckets.

**Slice 02 follow-ups (4.1.28 or the next pass):**
- backend: SEC-69 (EV-14 only on entering `pending` + per-user save limit, contract via the architect), SEC-70 (a) `ResponseCacheControl: 'private, no-store'` on `kyc`/`private` signed GETs, I-33 pixel limit.
- mobile: SEC-70 (b) show the owner's KYC image in-app instead of `Linking.openURL` of an `attachment` link (`apps/mobile/src/app/account/verification.tsx:140`).
- solution-architect: ADR-009 amendment "publish public images only when they become public" (SEC-64), contract text for I-31 ("every attempt counts") and the SEC-69 limit, one sentence in ADR-002 §2 for I-30.

**Before Phase 5:** SEC-64 publish-on-approval, SEC-66 public-variant removal on `deleteMe`, SEC-67 if the Owner chooses it, SEC-68 (verify the password before answering "email taken", or a per-user limit), I-32 (ETL keeps only `http(s)` links), KYC retention (Q-147).

**Phase 6 checklist additions:** SEC-70 (c) encryption at rest for `kyc`, SEC-71 (Next.js servers only behind Caddy; `pnpm local` servers on 127.0.0.1), I-35 admin CSP incl. storage origin, I-36 audit re-run, SEC-49 per-user keying, SEC-54 add `.local/` and `apps/api/.pglite` to `.dockerignore`.

**Orchestrator:** tick 4.1.27 in ROADMAP/STATUS (I did not edit them); add the four §6.1 items as micro-tasks before the merge task; carry review 05 §4 forward unchanged.

## Open questions / risks
- **Owner decision, SEC-66 (with Q-147 / SEC-12):** when a user deletes the account, should their avatar and portfolio images stop being public at once (recommended: yes, delete or move the public copies), and how long are KYC ID images kept (proposal in Q-147: delete 90 days after the decision, and at account deletion unless a legal hold applies)?
- **Owner decision, SEC-67:** should "Delete account" ask for the current password (or an emailed code for accounts without one)? Legacy asked only for a confirmation; the deletion cannot be undone by the user.
- Risk: until SEC-62 is fixed, do not load any real (legacy) data or real KYC files into `pnpm local`.
- Not tested: real ClamAV, Caddy at runtime, production object storage (R2/Hetzner: confirm `CopySourceIfMatch`, `response-content-disposition`, encryption at rest), mobile on a device.
