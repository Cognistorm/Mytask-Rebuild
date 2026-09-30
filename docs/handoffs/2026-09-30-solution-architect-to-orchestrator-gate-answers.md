# Handoff: solution-architect → orchestrator: Owner Phase 2 gate answers applied to architecture, data model and API contract
Date: 2026-09-30 | Branch `feat/blueprint` (not committed) | Inputs: `docs/01-discovery/open-questions.md` "Owner answers at the Phase 2 gate (2026-09-30)", `docs/handoffs/2026-09-30-product-analyst-to-orchestrator-gate-answers.md` (15 changes), `docs/06-qa/security/01-blueprint-recheck-2026-09-30.md` (SEC-30, SEC-31, SEC-32)

## What I did
All 15 contract and data-model changes from the product-analyst handoff, plus SEC-30, SEC-31 and SEC-32, the status changes and the version bump. Specs and `/legacy` were not touched.

1. **Withdrawal pause (Q-144, S-129, 14 AC-21/AC-22).** `createWithdrawal`: new `422 WITHDRAWAL_SECURITY_PAUSE` (`details.pausedUntil`, `params.datetime`, messageKey `t_cant_withdraw_reason_security_pause`). It is checked after the pending-request check and before the period check (14 AC-6 order). The pause ends at the latest of `emailChangedAt` / `passwordChangedAt` / `payoutDetailsChangedAt` + S-129, using the S-129 value at request time. `WithdrawalQuote.securityPauseUntil` was added, and `eligibility` now reports the pause. The pause starts in `putPayoutDetails` (every save, including the first), `changeMyPassword`, `completePasswordReset` and `confirmEmailChange` (including email changes started by staff).
2. **Timestamps (data model).** `users.email_changed_at` is NEW. `users.password_changed_at` already existed and is now used for the pause. `payout_details.changed_at` is NEW. All three are null after migration (14 EC-9). Audit rows for payout saves store the IBAN masked.
3. **Approver flag (14 AC-23, 16 AC-42).** `AdminWithdrawal` gets `detailsChangedRecently`, `recentChangeKinds` (new enum `WithdrawalSecurityChangeKind`), `lastEmailChangedAt`, `lastPasswordChangedAt` and `lastPayoutDetailsChangedAt`. The flag is computed on read: 7 days before `createdAt`, or any change after it while the request is pending/processing (Q-151 default).
4. **Q-113.** `adminListWithdrawals` and `adminGetWithdrawal` now need `withdrawals.approve`. I checked the other staff operations: no other `payments.read` operation returns an IBAN or holder name. Only the withdrawal operations use `PayoutDetailsSnapshot` / `AdminWithdrawal`, and `SavedCard.holderName` is shown to its owner only.
5. **Settings register.** S-128 is in area `payments` and is no longer "proposed". S-129 is in area `withdrawals`. `registerStatus` is `approved` for S-001…S-129. The reconciliation operations and schemas no longer carry PROPOSED.
6. **Portfolio `rejected` (Q-117, 02 AC-42).**
   - `PortfolioItem.rejectedAt` was added (`rejectionReason` ≤ 1,000 already existed). Both are shown to the owner only.
   - `adminRejectPortfolioItem` emits EV-126 through the outbox.
   - Owner edits send the item back to pending/active per S-071. Public reads answer 404.
   - `x-covers` 02 AC-26 and AC-42 were added.
7. **Step-up (Q-119, Q-145, 16 AC-7).**
   - `stepUp: true` on `adminChangeUserEmail` and `adminDisableUserTwoFactor`.
   - `stepUpFor` on `adminUpdateSetting` / `adminRestoreSettingVersion` now also lists S-008, S-009, S-052, S-053, S-056…S-064 and S-124.
   - Promo codes use a conditional step-up (notes + description + `403 REAUTH_REQUIRED`) on `adminCreatePromoCode`, and also on `adminUpdatePromoCode` when an edit makes the code free, so the create rule cannot be bypassed. A code counts as "free" when the percent is 100, or the fixed discount is at least the current S-008/S-009 price.
   - Legacy-hold release/write-off already had `stepUp`; the descriptions now cite Q-119.
8. **Staff switch-off of a user's 2FA (16 AC-32).** `adminDisableUserTwoFactor` has `users.edit` (Q-132 default), a required reason, step-up, `x-audit` and EV-127. It now covers 16 AC-32; before, it covered nothing.
9. **Q-120.** `adminReleaseLegacyHold` on a negative residual → `422 LEDGER_LEGACY_HOLD_WRITE_OFF_ONLY` (`t_admin_negative_residual_write_off_only`). The old INSUFFICIENT_FUNDS rule was removed. The write-off posts `platform:adjustments` ↔ `legacy_hold` and never touches Available. I used the `LEDGER_` prefix instead of the suggested `LEGACY_HOLD_…` because D3's error prefixes require it.
10. **Q-121.** `adminRefundEscrow` returns `422 DISPUTE_OPEN` with messageKey `t_admin_refund_blocked_dispute_open`.
11. **S-127 (Q-146, 16 AC-74a).**
    - New schemas `CustomCodeAllowedHostsValue { hosts: [CustomCodeAllowedHost {host, fixedCodeConfirmed: const true, confirmedBy, confirmedAt}] }`.
    - New `422 CUSTOM_CODE_FIXED_VENDOR_REQUIRED` (`t_custom_code_fixed_vendor_required`).
    - The public `WebCustomCode.allowedHosts` stays a plain list of hostnames.
    - ADR-013 §7 records Q-146 (c) and the Phase 3 isolation study (a sandboxed cookieless origin, plus an optional built-in deny list of tag managers).
    - The wrapper object is deliberate: `structured` values are objects.
12. **Security messageKeys.**
    - `AUTH_LOGIN_THROTTLED` → `t_login_slow_mode` (`params.seconds`).
    - `TWO_FACTOR_LOCKED` / `STAFF_TWO_FACTOR_LOCKED` → `t_2fa_locked` (`params.minutes`).
    - `RATE_LIMITED` keeps `t_too_many_login_attempts`.
13. **Events.** EV-126 on `adminRejectPortfolioItem`. EV-127 on `adminDisableUserTwoFactor`. EV-128 on `login`. EV-129 on `verifyTwoFactorLogin`, `adminVerifyTwoFactor` and `adminReauthenticate`. `NotificationEventId` is a pattern, not an enum, so no schema change was needed. `15 AC-11` coverage names the security events.
14. **Wording clean-up.**
    - Removed the "Owner question / to be added to spec 15 / cooling period" notes for Q-111…Q-121, Q-137 and Q-144…Q-146.
    - The remaining "handoff Q" notes now cite their slice Q-IDs (Q-116, Q-122, Q-123, Q-130, Q-133, Q-140, Q-141, Q-142).
    - P-135, P-136 and P-137 are marked accepted in the contract, coverage (04, 05, 10), ADR-008 §5a and data-model §3.J/§3.K/§13.
15. **SEC-30 (ADR-002 §6, `login`).**
    - Attempts that present a trusted device (`__Host-mt_did` / `deviceToken`), and web attempts with a passed reCAPTCHA, bypass the 30-second slot. They still count towards the S-062 lock and, when wrong, the per-account counter.
    - Attempts refused by slow mode or by the account+IP lock never use the slot.
16. **SEC-31 (ADR-004 §3, `handleBogWebhook`).**
    - The steps now run in this order: size cap → parse → look up our payment → store → 200 → queue.
    - For known payments, identical bodies (SHA-256) only increment `repeat_count` / `last_received_at`, and at most 20 rows are stored per payment per hour.
    - `AdminPaymentEvent.repeatCount` / `lastReceivedAt` and `payment_events.body_sha256 / repeat_count / last_received_at` were added. CONVENTIONS §10 was updated.
17. **SEC-32 notes.**
    - (a) `completeSocialLogin` and ADR-002 §7: the binding check comes from the client kind stored with `state`; there is no null=null match.
    - (b) `completePasswordReset`, `login`, ADR-002 §6 and CONVENTIONS §14: password reset is outside every counter.
    - (c) ADR-015 §6 and ADR-002 Consequences: Redis is monitored like the database (noeviction for security keys, AOF, alert after 1 minute down).
    - (d) CONVENTIONS §19: `img src` is checked by parsed scheme, host, port and path prefix, never by a raw string prefix.
18. **Status and version.**
    - `architecture.md`, ADR-001…016, `data-model.md` and `url-map.md` are **accepted (Owner 2026-09-30)**. ADR-015 notes that the concrete hosting provider still needs Owner approval before Phase 6.
    - Contract `info.version` 1.0.0 (package.json and lock also bumped), with info and README status "approved by the Owner 2026-09-30 as the contract".
    - The README and CONVENTIONS say that every change from now on needs an ADR and a handoff to the backend, web and mobile engineers.
19. **Tooling.** The checkers accept AC ids with a letter suffix (spec 16 AC-74a): `scripts/lib.mjs`, `check-coverage.mjs`, `check-contract.mjs` and CONVENTIONS §12.1.

**Verify:** `npm run verify:final` in `docs/04-api` gives:
- Redocly lint of the sources: 0 errors, 0 warnings.
- The bundle `openapi.yaml` was rebuilt (1.0.0), and its lint gives 0 errors, 0 warnings.
- `check-contract --final`: 0 errors, 0 warnings.
- `check-coverage --final`: 0 errors, 0 warnings.

**Coverage:** **715 ACs**, all covered: 629 API (594 API + 35 API+JOB) and 86 NOT-API, 0 missing, 0 open DELEGATED. That is 707 + 8 NEW ACs: 01 AC-53…AC-55, 02 AC-42, 14 AC-21…AC-23 and 16 AC-74a.

**Size:** 477 operations, 398 paths, 768 component schemas.

## Files created/changed
- **Contract sources:**
  - `docs/04-api/src/openapi.base.yaml`, `src/components/schemas.yaml`
  - `src/paths/d1-platform-auth-profiles.yaml`, `d2-catalog-gigs-reviews-content.yaml`, `d3-payments-subscriptions-withdrawals.yaml`, `d4-orders-offers-refunds.yaml`, `d5-messaging-projects-proposals.yaml`, `d6-notifications-admin.yaml`
  - `src/schemas/d1.yaml` … `d6.yaml` (d1, d2, d3, d4, d5, d6)
- **Contract, generated:** `docs/04-api/openapi.yaml` (bundle), `docs/04-api/coverage/SUMMARY.md`
- **Coverage:** `docs/04-api/coverage/01.md`, `02.md`, `04.md`, `05.md`, `10.md`, `14.md`, `15.md`, `16.md`, `16-d1.md`, `16-d3.md`
- **Contract docs and tooling:** `docs/04-api/README.md`, `CONVENTIONS.md`, `package.json`, `package-lock.json`, `scripts/lib.mjs`, `scripts/check-coverage.mjs`, `scripts/check-contract.mjs`
- **Architecture:** `docs/03-architecture/architecture.md`, `data-model.md`, `url-map.md`, `adr/001`…`adr/016`
  - Content changes in 002, 004, 008, 010, 013 and 015; the rest are status only.
- This handoff.

## What the next agent must do
- **Orchestrator:**
  - Update `docs/STATUS.md`: Phase 2 artefacts accepted, contract 1.0.0 approved, 715/715 ACs covered.
  - Route QA to re-judge the NEW ACs against the contract.
  - Route the security reviewer to close SEC-30 and SEC-31 in the design and to confirm the SEC-32 notes are placed.
- **Backend (slice 01):**
  - SEC-30 slot bypass.
  - SEC-32(a)/(b) tests.
  - The new messageKeys.
  - EV-128/EV-129 templates.
- **Backend (slice 05):** SEC-31 caps and the new `payment_events` columns.
- **Backend (slice 14):** the pause, timestamps and approver flag.
- **Backend (slice 16):**
  - Step-up list.
  - S-127 host confirmation.
  - Negative legacy-hold refusal.
  - EV-126/EV-127.
- **Web/mobile:**
  - Regenerate `packages/types` / `packages/api-client` from 1.0.0.
  - New fields: `securityPauseUntil`, `PortfolioItem.rejectedAt`, the `AdminWithdrawal` flag fields, and `CustomCodeAllowedHostsValue` for the admin S-127 editor.
- From now on, every contract change needs an ADR and a handoff (CLAUDE.md rule 2).

## Open questions / risks
- **Owner decisions still open:**
  - Q-151 (flag window and first-save pause; defaults applied; slice 14).
  - Q-147 (data retention, before the Phase 5 KYC import).
  - Q-097 (by Phase 5).
  - Q-104 (deferred).
  - Slice items Q-116, Q-118, Q-122…Q-136, Q-138…Q-143, Q-148…Q-150.
  - Q-132: the permission for switching off a user's 2FA is `users.edit` until the Owner answers.
  - SEC-28: the Owner revokes the leaked keys by hand.
- **Interpretations for the Owner or QA to confirm:**
  - The 100% promo step-up also applies to an **edit** that makes a code free (loophole closed). If the Owner meant "percent = 100 only", the fixed-amount half comes out of 16 AC-7 (analyst risk).
  - An existing S-127 value has no confirmations. Legacy had no S-127, so it starts empty, and each host must be confirmed when added.
- **Phase 3:** the architect's custom-code isolation study (ADR-013 §7) must be done before S-110 is switched ON in production.
- **Tooling:** AC ids with letters (AC-74a) are now accepted by the checkers. QA/test tooling that parses AC ids must accept the suffix too.
