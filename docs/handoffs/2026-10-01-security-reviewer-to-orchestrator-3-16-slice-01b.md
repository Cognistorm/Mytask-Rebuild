# Handoff: security-reviewer -> orchestrator — slice 01 part B security review (ROADMAP task 3.16)
Date: 2026-10-01 | Branch: `feat/auth` @ `ee83b479` | Report: `docs/06-qa/security/04-slice-01b-2026-10-01.md`

## What I did
- Independent security review of slice 01 part B: B-1 `1d54358b` (staff login, IP ban, staff 2FA, admin settings, SEC-33…36 fixes), B-2a `5f485806` (banned IPs, staff own password, activate/ban users, default roles), B-2b `31cc5073` (restrictions + appeals, web/mobile/admin), B-2c `aa4ebe63` + `7e15c99b` (social login with the SEC-09 binding, encrypted provider keys S-065…S-069), and the client tasks touching this scope (3.6, 3.7a, 3.7b, 3.8–3.12).
- Compared every in-scope operation with the contract (`x-permission`, `stepUp`, `x-audit`, `x-rate-limit`), re-checked the review 02 fixes and every earlier open item in this scope with file:line evidence, and checked the legacy holes R-010, R-011, R-020, R-022, R-034, R-043 and the raw-HTML appeal text.
- Ran `pnpm install --frozen-lockfile` (OK), `pnpm --filter @mytask/api test` (**13 files, 113 tests passed**), `pnpm audit --prod` (**0 critical, 0 high, 3 moderate**, the unchanged mobile-toolchain items of I-9). Four throw-away probes in the session scratchpad (nothing added to the repository): P1 parallel staff-login burst, P2 counter reset by another staff password, P3 web social flow finished as `ios`, P4 mixed-case admin path.
- **Verdict: PASS with conditions.** 0 Critical, 0 High, **1 Medium** (SEC-57), **4 Low** (SEC-58 … SEC-61), **5 Info** (I-20 … I-24). SEC-09 is implemented correctly; SEC-33 fixed; SEC-34 fixed for users but not applied to the staff login (SEC-57).

## Files created/changed
- Created `docs/06-qa/security/04-slice-01b-2026-10-01.md`
- Created `docs/handoffs/2026-10-01-security-reviewer-to-orchestrator-3-16-slice-01b.md` (this file)
- No product code changed; nothing committed (the orchestrator commits).

## What the next agent must do
- **Orchestrator:**
  - Tick ROADMAP 3.16 and log it in `docs/STATUS.md`.
  - **Extend ROADMAP 3.17**: besides the review 03 items, it must contain SEC-57 (before merge to `main`), SEC-58, SEC-59, SEC-60, and the review 02 slice-01 items it currently omits: SEC-37 (now also staff), SEC-41, SEC-42 per-operation keys, SEC-44, SEC-47 (incl. staff login), SEC-48 replaceState on web reset/verify.
  - Add SEC-53, SEC-61 and the App Link `.well-known` files (I-21) to ROADMAP 6.8 (social keys on staging).
- **backend-engineer:** SEC-57 first (atomic reservation before the password check, reset only after a full login, /64 key, staff write budget, burst + reset tests), then SEC-58 (deliver by stored client kind), SEC-59 (contract audit names, `staff.logout`), SEC-60 (canonical IPs), SEC-61 (provider timeouts, 422 mapping).
- **solution-architect:** ADR-002 §6 note for a per-account staff login counter (SEC-57 point 4); I-22 (`is_system` never writable) in ADR-010 / slice 16 notes; I-20 masking of setting versions in ADR-005 §8.
- **web-engineer:** SEC-48 replaceState on `auth/password/update` and `auth/verify`; SEC-44 client sign-out rule.
- **qa-engineer:** make P1–P4 permanent tests.
- **product-analyst:** SEC-57 point 2 (may "success clears the staff IP counter" require a completed 2FA and clear only that account?).
- **Security re-check** after 3.17: SEC-57 before the merge to `main`; the rest before slice 01 is marked done.

## Open questions / risks
- SEC-57 point 4 (per-account staff lock) is a change to ADR-002 §6, which kept only the legacy IP rule; the architect decides, escalating to the Owner only if staff would notice a behaviour change.
- With S-060 (staff 2FA) OFF, as it is locally today, SEC-57 means a guessed staff password is a full admin session. Keep S-060 ON on every shared or exposed environment.
- Docker is installed now but the review used the PGlite + in-process Redis test stack; the compose stack and real providers were not exercised. Real sign-in with each social provider is still untested (keys do not exist yet).
