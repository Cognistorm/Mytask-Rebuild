# Handoff: security-reviewer → orchestrator: P2-B5 re-check after fixes
Date: 2026-09-30 | Branch `feat/blueprint` @ `5093853` | Supersedes the verdict in `2026-09-30-security-reviewer-to-orchestrator-p2-b5.md`

## What I did
- Re-checked the architect's fixes in the design documents only (ADR-002/004/009/010/012/013/015, architecture, CONVENTIONS, realtime.md, the rebuilt openapi.yaml). I diffed the contract script-wise against the 1aa3318 baseline: still 477 operations, security still consistent, nothing weakened, only additions.
- **SEC-01 (High) is closed.** ADR-013 §14–§19 fully defines the client-IP chain and its Phase 3 tests, referenced everywhere.
- Closed: SEC-02, 03, 04, 05 (technical part), 09, 10, 14, 15, 16, 17, 19, 20, 22, 23, 24, 25, 26, 27, 29. The conditions of items 11, 12 and 13 are met.
- Recorded as Owner decisions (not blocking): SEC-05 part 2 (cooling period), 06, 07, 08, 11, 12, 13, 18, 21.
- New from the re-check: **SEC-30 (Low)**: slow-mode slots can be used up by an attacker, which in practice locks the real user out; fix: trusted devices bypass the slot. **SEC-31 (Low)**: callbacks for already-final known payments are stored without a cap; fix: a per-payment cap or deduplication. **SEC-32 (Info)**: implementation notes for social-login binding, Redis criticality and the sanitiser `img` origin check.
- **Verdict: PASS with conditions. Gate item 9 is met.**

## Files created/changed
- Created `docs/06-qa/security/01-blueprint-recheck-2026-09-30.md` (status of every finding, new findings, conditions).
- Appended a short addendum to `docs/06-qa/security/00-blueprint-2026-09-30.md` pointing to it.
- No design documents or product code changed.

## What the next agent must do
1. **orchestrator:** open the architect's 8 Owner questions (fixes handoff, "Owner questions") in `open-questions.md`; update `docs/STATUS.md` gate item 9 = PASS with conditions. Tell the Owner that SEC-12 (data retention/erasure, legal) must be answered before Phase 5.
2. **solution-architect:** SEC-30 (ADR-002 §6) and SEC-31 (ADR-004 §3 / `handleBogWebhook` wording and a per-payment cap). Both can go in now while the contract is unapproved, or later with an ADR. Due at the latest by slice 01 / slice 05.
3. **product-analyst:** before slice 01, update spec 01 (SEC-02/03/04, the AC-41 note), spec 15 (the 2 NEW security emails) and specs 02/14 (emailed code for accounts without a password, with the Owner's confirmation).
4. **backend (Phase 3):** ADR-013 §19 tests; SEC-32 notes; the slice 01 security review checks them.
5. **Owner:** SEC-28 (revoke the Binance/findip keys and remove the bot on the legacy server now).

## Open questions / risks
- The gate may pass with the 8 Owner questions unanswered only if the Owner explicitly defers them. SEC-12 is a legal item and cannot be deferred past Phase 5.
- The technical constants chosen by the architect (20 failures/h, 10 codes/h, 30 s, SEC-23 limits, webhook 60/600 per min) are reasonable from a security view; the Owner should see them at the gate.
