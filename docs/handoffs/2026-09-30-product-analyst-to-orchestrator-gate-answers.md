# Handoff: product-analyst → orchestrator (and solution-architect): Owner Phase 2 gate answers applied to the specs
Date: 2026-09-30 | Branch `feat/blueprint` (not committed) | Input: `docs/01-discovery/open-questions.md` "Owner answers at the Phase 2 gate (2026-09-30)", `docs/handoffs/2026-09-30-solution-architect-to-orchestrator-p2-b5-fixes.md`, `docs/06-qa/security/01-blueprint-recheck-2026-09-30.md` §4

## What I did
- Wrote every Owner gate answer (Q-109…Q-121, Q-137, Q-144…Q-146) into the specs as Owner decisions with their Q-IDs. All specs keep `Status: approved`; each changed spec has a dated header line "Updated 2026-09-30 with Owner gate answers".
- P-135, P-136, P-137 changed from PROPOSED to ACCEPTED in specs 00, 04, 05, 10, 15 and 16. S-128 is a normal register row (counted; register = 129 rows) in the **payments** settings area (Q-137).
- Q-113: withdrawals list and detail (IBANs) need `withdrawals.approve` (specs 14, 16, permission catalogue).
- Q-117: portfolio `rejected` state with reason shown to the owner + NEW notification EV-126 (specs 02, 15, 16).
- Q-120: negative legacy held residuals can only be written off (spec 16).
- Q-144: 24-hour withdrawal pause after an email, password or payout-details change (NEW setting **S-129**), "details changed recently" flag for approvers, and the emailed code for accounts without a password (email change, payout details, log out other sessions) — specs 00, 01, 02, 14, 16.
- Q-145: step-up list extended (spec 16 AC-7) and NEW event EV-127 when staff switch off a user's 2FA.
- Q-146: S-127 = fixed-code vendors only, confirmed per host (spec 16 NEW AC-74a, S-127 wording in 00 and 16).
- Security conditions before slice 01 (recheck §4.2): spec 01 NEW AC-53 (SEC-02 slow mode), AC-54 (SEC-03 code lock), AC-55 (SEC-04 in-session check throttle), AC-41 note (SEC-09); spec 15 NEW security emails EV-128 and EV-129. SEC-30 itself remains the architect's (ADR-002 §6); AC-53 delegates the slot/bypass detail to it.
- Q-112, Q-114, Q-115, Q-119, Q-121: cited where the specs mention them (16 AC-9, AC-40, AC-24, AC-7/AC-44; 08 AC-29; 13 AC-30). For Q-121 I added the staff refusal text key, because 13 AC-30 read as if "Refund buyer" also worked during a dispute.
- Raised one follow-up question **Q-151** (slice 14; testable defaults in spec 14): the look-back window of the approver flag (default 7 days before the request) and whether the first save of payout details starts the pause (default yes).
- Updated `docs/02-specs/README.md` and `docs/06-qa/plans/00-parity-master.md` §10 (G-1…G-3 no longer "pending Owner acceptance").

## Files created/changed
- `docs/02-specs/00-platform-rules.md` (header; S-127, S-128, NEW S-129 rows; register count 129; §4.6 pointer; R-5.3a; key tag; Open questions)
- `docs/02-specs/01-auth.md` (header; AC-33, AC-35, AC-41, AC-44; NEW AC-53…AC-55; R-A5; screens; notifications; NEW keys; EC-4, EC-8; Open questions)
- `docs/02-specs/02-profiles-and-dashboards.md` (header; AC-26, AC-28, AC-29, AC-30; NEW AC-42; R-P6; screens; notifications; NEW keys; EC-11, EC-12; Open questions)
- `docs/02-specs/04-gigs.md`, `05-payments-and-wallet.md`, `10-projects.md` (PROPOSED → ACCEPTED, headers)
- `docs/02-specs/08-messaging.md` (AC-29 cites Q-114), `13-refunds-disputes-unblock.md` (AC-30 cites Q-121, one staff key)
- `docs/02-specs/14-withdrawals.md` (header; AC-3, AC-5, AC-6, AC-13; NEW AC-21…AC-23; R-W6, NEW R-W9; screens; notifications; NEW keys; EC-9…EC-12; Open questions)
- `docs/02-specs/15-notifications.md` (header; EV-06; NEW EV-126…EV-129; EV-32/EV-125 tags; AC-11; counts; NEW keys; Open questions)
- `docs/02-specs/16-admin-panel.md` (header; AC-7, AC-9, AC-21, AC-24, AC-32, AC-40, AC-42, AC-44; NEW AC-74a; permission catalogue; settings areas; money movements; R-A10; S-127 row; notifications; NEW keys; EC-12…EC-14; Out of scope; Open questions)
- `docs/02-specs/README.md`, `docs/06-qa/plans/00-parity-master.md` §10, `docs/01-discovery/open-questions.md` (NEW Q-151 at the end)
- This handoff. `/legacy`, `docs/03-architecture` and `docs/04-api` are untouched.

## What the next agent must do

### New or changed AC IDs (for coverage)
| Spec | NEW | Changed (wording / rule) | Tag-only (PROPOSED → ACCEPTED) |
|---|---|---|---|
| 00 | S-129 (register row) | S-127 row (Q-146), R-5.3a note | S-128 row, R-5.3a, `t_validator_georgian_field_characters` |
| 01 | AC-53, AC-54, AC-55 | AC-33, AC-35 (pause starts), AC-41 (unverified provider email = missing), AC-44 (emailed code), EC-4, EC-8 | – |
| 02 | AC-42 | AC-26, AC-28, AC-29 (emailed code on email change), AC-30 (pause starts); EC-11, EC-12 | – |
| 04 | – | – | AC-5, AC-32, EC-12, EC-13 |
| 05 | – | – | AC-44…AC-47, EC-11…EC-14 |
| 08 | – | AC-29 (Q-114 citation, behaviour unchanged vs contract) | – |
| 10 | – | – | AC-3, AC-4 |
| 13 | – | AC-30 (refused while a dispute is open, Q-121) | – |
| 14 | AC-21, AC-22, AC-23 | AC-3, AC-5, AC-6 (rule order), AC-13 (permission + flag); EC-9…EC-12 | – |
| 15 | EV-126, EV-127, EV-128, EV-129 | EV-06 (purposes), AC-11 (security list) | EV-32, EV-125 |
| 16 | AC-74a | AC-7, AC-9, AC-21, AC-24, AC-32, AC-40, AC-42, AC-44; EC-12…EC-14 | AC-44 reconciliation reference |

### New settings and events
| ID | Key | Detail |
|---|---|---|
| S-129 | `withdrawals.security_change_pause_hours` | integer hours ≥ 0, default 24 (0 = no pause; flag still shown); settings area **withdrawals** (`settings.withdrawals.write`); NEW Q-144 |
| S-128 | `ledger.reconciliation.run_time` | unchanged definition; now accepted; settings area **payments** (`settings.payments.write`), Q-137 |
| S-127 | `appearance.custom_code.allowed_hosts` | now a list of hosts **each with a fixed-code confirmation** (Q-146) |

| EV | Template | Keys (EN first, KA in the spec) | Recipient / channels / category | Owning AC |
|---|---|---|---|---|
| EV-126 | `PortfolioRejected` | `t_subject_seller_portfolio_rejected`, `t_portfolio_rejected_email_body`, in-app `t_ur_portfolio_title_has_been_rejected` (texts in spec 02) | owner; email + in-app + push; T | 02 AC-42 |
| EV-127 | `TwoFactorDisabledByStaff` | `t_subject_2fa_disabled_by_staff`, `t_2fa_disabled_by_staff_email_body`, in-app `t_2fa_disabled_by_staff` (spec 15) | user; email + in-app; S | 16 AC-32 |
| EV-128 | `LoginSlowMode` | `t_subject_security_many_failed_logins`, `t_security_many_failed_logins_body` (spec 15) | user; email only; S; at most once per hour | 01 AC-53 |
| EV-129 | `TwoFactorLocked` | `t_subject_security_2fa_locked`, `t_security_2fa_locked_body` (`:minutes`) (spec 15) | user or staff; email only; S; once per lock | 01 AC-54 |

Other NEW keys: spec 01 `t_login_slow_mode` (`:seconds`), `t_2fa_locked` (`:minutes`); spec 02 `t_portfolio_status_rejected`, `t_portfolio_rejected_reason`; spec 14 `t_cant_withdraw_reason_security_pause` (`:datetime`), `t_admin_details_changed_recently`, `t_admin_security_change_email` / `_password` / `_payout_details` / `_none`, `t_admin_security_last_changes`; spec 16 `t_admin_turn_off_2fa`, `t_admin_turn_off_2fa_confirm`, `t_admin_negative_residual_write_off_only`, `t_custom_code_fixed_vendor_confirm`, `t_custom_code_fixed_vendor_required`, `t_custom_code_fixed_vendor_hint`; spec 13 `t_admin_refund_blocked_dispute_open`.

### solution-architect: exact contract and data-model changes (additive unless noted)
1. **Withdrawal pause (Q-144, 14 AC-21/AC-22).** `createWithdrawal`: new `422` reason (suggested `WITHDRAWAL_SECURITY_PAUSE`, `details.pausedUntil`, messageKey `t_cant_withdraw_reason_security_pause`), checked **after** the pending-request check and before the period check (14 AC-6 order). The withdraw form / fee-preview response gets nullable `securityPauseUntil`. Pause end = latest security change + current S-129 at request time.
2. **Security-change timestamps (data model).** Record per user, on the new platform only: `email_changed_at` (when the new email becomes active, also staff-started), `password_changed_at` (change and reset), `payout_details_changed_at` (every save incl. the first, Q-151 default), with the actor (user/staff) in the audit log. Migration sets them to null (14 EC-9).
3. **Approver flag (Q-144, 14 AC-23, 16 AC-42).** `AdminWithdrawal` (list row and detail): `detailsChangedRecently: boolean`, `lastEmailChangedAt`, `lastPasswordChangedAt`, `lastPayoutDetailsChangedAt` (nullable; supersedes the single `payoutDetailsChangedAt` hook). Flag = a change within 7 days before `createdAt` or any change after `createdAt` while pending/processing (Q-151 default).
4. **Withdrawal permissions (Q-113).** `adminListWithdrawals` and `adminGetWithdrawal`: `x-permission` → `withdrawals.approve` (was `payments.read`). Check that no other `payments.read` operation returns IBAN or holder name (e.g. user balances/transactions, ledger viewer); if one does, remove those fields there. Catalogue text of `payments.read` / `withdrawals.approve` changed in spec 16 (no new permission).
5. **S-129 and S-128 in the settings register schema:** add S-129 (area `withdrawals`); move S-128 to area `payments` and drop its PROPOSED marks; drop PROPOSED from the reconciliation operations (P-135 accepted).
6. **Portfolio rejection (Q-117, 02 AC-42).** Portfolio status enum: `pending | active | rejected`; add `rejectionReason` (≤ 1,000) and `rejectedAt`; visible only to the owner (owner endpoints), public endpoints 404 for rejected items; owner edit of a rejected item returns it to `pending` (or `active` with S-071 ON). The reject operation emits EV-126 (outbox).
7. **Step-up (Q-145, Q-119, 16 AC-7).** `stepUp: true` (or `stepUpFor` values) on: admin change of a user's email; admin switch-off of a user's 2FA; settings updates of S-052, S-053, S-056…S-064, S-124; plan price update (S-008/S-009); promo-code create when percent = 100 or fixed ≥ current price of a covered service (conditional step-up, `403 REAUTH_REQUIRED`); legacy-hold release/write-off (confirm it is already set, Q-119).
8. **Staff 2FA switch-off (Q-145, 16 AC-32).** Operation with `users.edit` (Q-132 default), required reason, step-up, audited, emits EV-127.
9. **Legacy hold (Q-120, 16 AC-44).** Release of a negative residual → `422` (suggested `LEGACY_HOLD_WRITE_OFF_ONLY`, messageKey `t_admin_negative_residual_write_off_only`); write-off of a negative residual posts adjustments ↔ `legacy_hold`, never Available.
10. **Refund buyer (Q-121).** Keep `422 DISPUTE_OPEN` on `adminRefundEscrow`; messageKey `t_admin_refund_blocked_dispute_open`.
11. **S-127 (Q-146, 16 AC-74a).** Value shape: list of `{ host, fixedCodeConfirmed: true, confirmedBy, confirmedAt }`; save without confirmation → `422` (messageKey `t_custom_code_fixed_vendor_required`). ADR-013 §7: record Q-146 (c) and the Phase 3 isolation study.
12. **Security messageKeys (spec 01).** `AUTH_LOGIN_THROTTLED` → `t_login_slow_mode` (`seconds` = `retryAfterSeconds`); `TWO_FACTOR_LOCKED` and `STAFF_TWO_FACTOR_LOCKED` → `t_2fa_locked` (`minutes`). `RATE_LIMITED` for SEC-04 keeps `t_too_many_login_attempts`.
13. **Notification events.** Add EV-126…EV-129 (names above) to the event/outbox catalogue and the notification-type enum; EV-128/EV-129 are security (never capped, never pushed). EV-06 purposes unchanged (already in the contract).
14. **Wording clean-up.** Remove "Owner to confirm" / pending notes for Q-111…Q-115, Q-117, Q-119…Q-121, Q-137, Q-144…Q-146 and SEC-05 part 2; SEC-05 technical part is confirmed by the Owner.
15. Still yours: **SEC-30** (ADR-002 §6 slot bypass for trusted devices; spec 01 AC-53 refers to it) and **SEC-31** (slice 05).

### orchestrator
- Update `docs/STATUS.md`; route the architect (items above), then QA to re-judge the NEW ACs (01 AC-53…AC-55, 02 AC-42, 14 AC-21…AC-23, 16 AC-74a) and the security reviewer to confirm the slice-01 condition "spec 01 and spec 15 updated" is met.
- Put **Q-151** to the Owner before slice 14 (defaults apply meanwhile).

## Open questions / risks
- **Q-151** (NEW, slice 14): flag look-back window (default 7 days) and whether the first payout-details save starts the pause (default yes). Not blocking.
- "100% promo code" is read as "makes a covered service free": percent = 100, or a fixed discount ≥ the current price of a covered service. If the Owner meant percent = 100 only, drop the second half of 16 AC-7.
- Q-146 enforcement is a per-host confirmation by the Super-admin (the system cannot tell a tag manager from a pixel by itself). A built-in deny list of known tag-manager hosts could be added by the architect in the Phase 3 study.
- The pause also follows staff-started email changes (Q-144 option (b) as recommended by the architect); staff cannot edit payout details or passwords, so no other staff path exists.
- Parity master summary lines (§1 "NEW notification events 42") still show the P2-A6 numbers; the §10 update note gives the new totals (129 events, 46 NEW). QA may refresh the summary on its next pass.
