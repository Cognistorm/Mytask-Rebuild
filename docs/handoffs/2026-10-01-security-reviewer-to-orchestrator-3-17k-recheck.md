# Handoff: security-reviewer → orchestrator — ROADMAP 3.17k security re-check of 3.17a–n
Date: 2026-10-01 | Branch: `feat/auth` @ `210a2660` | Report: `docs/06-qa/security/05-slice-01-recheck-2026-10-01.md`

## What I did
- Re-checked every fix of ROADMAP 3.17a–n (commits `69864862` … `210a2660`) against the conditions of review 04 §6 (and the review 02/03 items it carried): read each commit and the changed services, middleware, migrations, client code and tests at HEAD.
- Confirmed the permanent tests for probes P1 (staff burst), P2 (staff reset), P3 (social cross-client), P4 (path case) assert what they claim.
- Ran `pnpm --filter @mytask/api test`: **17 files, 167 tests passed**. `pnpm audit --prod`: **0 critical, 0 high, 3 moderate** (unchanged I-9, mobile toolchain only).
- Ran two scratchpad probes on the real pipeline: P5 (staff login with the public Origin on 11 path spellings: percent-encoding, double slash, dot segments, trailing slash, matrix parameter, upper-case prefix; none reaches a staff handler) and P6 (IP canonicalisation and /64 buckets; one harmless edge case, I-27).
- **Verdict: PASS.** (a) **Merge of `feat/auth` to `main` is allowed** (SEC-57 points 1–3 + 5 fixed with tests). (b) **Slice 01 may be marked done from the security side** (SEC-58, SEC-59, SEC-60, SEC-39, SEC-35 incl. register 10/h/IP and EV-02 cap, SEC-50, SEC-51, SEC-45, SEC-37 incl. staff, SEC-41 + I-23, SEC-42, SEC-44, SEC-47 incl. staff login, SEC-48 replaceState: all **Fixed**). QA 3.17j is still needed for slice 01, as a QA condition.
- New findings: **0 Critical, 0 High, 0 Medium, 0 Low, 5 Info** (I-25 refresh-grace residuals, I-26 reCAPTCHA clients not wired, I-27 `ipBucket` leading-`::` edge case, I-28 manual IPv6 bans single address only, I-29 EV-02 cap can be filled on purpose).
- No product code changed; no commit made; ROADMAP and STATUS not edited.

## Files created/changed
- `docs/06-qa/security/05-slice-01-recheck-2026-10-01.md` (new, uncommitted)
- `docs/handoffs/2026-10-01-security-reviewer-to-orchestrator-3-17k-recheck.md` (this file, new, uncommitted)

## What the next agent must do
- **orchestrator:** tick 3.17k; record in STATUS that the security merge gate is met and that slice 01 is security-clear (pending QA 3.17j). Carry review 05 §4 forward unchanged. Add I-26 to the S-061 / Q-160 item and I-28 to slice 16 (next to SEC-57 point 4, ROADMAP 4.15.2).
- **backend-engineer (no deadline inside slice 01):** I-27 (`ipBucket` expansion for addresses starting with `::`, plus a test case); I-25 only if app users report sign-outs after a lost refresh answer.
- **web-engineer / admin:** I-26: wire reCAPTCHA v3 with the exact actions `login`, `register` (web, APP_URL) and `staff_login` (admin, ADMIN_URL) before S-061 is ever turned ON.
- **devops-engineer:** watch the first CI `docker` run of the new spoofed-header probe through Caddy (`.github/workflows/ci.yml:170-174`); it has not run yet.

## Open questions / risks
- No Owner decision is needed for the merge or for slice 01.
- Still open, unchanged timing (review 05 §4): SEC-49 before SSR data fetches; SEC-53 + SEC-61 + real sign-in + I-21 before any social provider is ON outside local; SEC-52 before money; SEC-40/SEC-55 by slice 15; SEC-57 point 4, I-20, I-22, I-28 in slice 16; SEC-38, SEC-56 before cutover; SEC-43, SEC-46, SEC-48 headers, SEC-54, I-1, I-6, I-8, I-9, I-13, I-14 on the Phase 5/6 checklists.
- Owner awareness (already decided, no new question): the staff IP counter is cleared by any completed staff login from that IP, as in legacy (ADR-002 §6); until the slice 16 per-account slow mode exists, a staff member with a working login can reset the counter of their own IP. Q-160 (mobile bot check) stays open until S-061 is turned ON.
