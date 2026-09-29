# Handoff: solution-architect → orchestrator — P2-B4 group run D3 (specs 05, 09, 14 + spec 16 delegations)
Date: 2026-09-29 | Task: P2-B4 part 2, group D3 | Result: `npm run verify:group -- D3` → **PASSED** (lint sources 0/0, lint bundle 0/0, check-contract 0 errors 0 warnings, check-coverage 0 errors, 2 expected warnings: D6's reserved `adminUpdateSetting` isn't in the D3 sandbox)

## What I did
- Wrote the D3 contract: **70 operations on 66 paths** (27 user/public/webhook, 43 admin), **~115 schemas** incl. `D3ErrorCode` (18 domain codes, stub removed), **5 realtime events**.
- **All 4 reserved operations written exactly as required:** `createCheckoutQuote` (POST /checkout/quote), `createPayment` (POST /payments), `getPayment` (GET /payments/{paymentId}), `handleBogWebhook` (POST /webhooks/bog).
- **One checkout for every purpose (CONVENTIONS §5.4).** `createCheckoutQuote` / `createPayment` take the shared `CheckoutTarget` and handle:
  - gig orders from the cart (with re-validation) and "Pay" again for an order awaiting payment (spec 06 AC-6…AC-11);
  - contract payments (spec 11 AC-26…AC-30);
  - custom offers (spec 12 AC-13…AC-19);
  - top-ups (spec 05 AC-21…AC-26);
  - Premium: promo codes, zero-total activation, and the S-126 mobile refusal via `X-MyTask-Client` (spec 09, ADR-016 §3).

  The effects for each purpose are documented in the `createPayment` description. The `x-covers` of these operations and of `handleBogWebhook` list the pay ACs of specs 06/11/12.
- **Money rules.** Every operation that can post a money or points journal has `x-money`, the `Idempotency-Key` header, and 409 + 422 responses (12 operations). `QUOTE_CHANGED` returns the new quote in `details.quote`. Wallet payments and withdrawals rely on the row lock plus the I-5 posting rule.
- **BOG webhook (CONVENTIONS §10 / ADR-004).**
  - Raw body is stored; the handler answers 200 with an empty body and processes asynchronously (job `bog-callback`). Unknown order ids also get 200; malformed bodies get 400.
  - The `Callback-Signature` header is optional and only checked if the lead developer confirms BOG signs our callbacks.
  - A payment is applied only after `getPaymentDetails` confirms the same order, amount and currency. The payment update, the journal (`bog:{bogOrderId}:paid`) and the business effect happen in one transaction.
  - Payments that can no longer be applied become `paid_unapplied` and go to the wallet.
  - Replays are no-ops. Pending payments are healed by job `bog-reconcile` every 5 minutes. Staff "Check status at BOG" (`adminCheckPaymentStatus`) runs the same verified path.
- **P-135 nightly reconciliation (PROPOSED).** Four admin operations, all with `payments.read`:
  - `adminListReconciliationRuns`
  - `adminGetReconciliationRun` (per-check results; C-9 can be `not_available`; `alertSentAt`)
  - `adminListReconciliationDifferences`
  - `adminMarkReconciliationDifferenceReviewed` (note required, audited, 409 if already reviewed).

  Runs come only from job `ledger-reconcile`; there is no operation to start a run (ADR-008 §7). Spec 05 AC-44…AC-46 are API+JOB and AC-47 is API.
- **Spec 16 delegations**, all implemented under D3 prefixes:
  - payments, unapplied payments, "Check status at BOG";
  - bank transfers;
  - ledger viewer (journals, accounts, per-user balances), balance adjustments, points adjustments;
  - legacy-hold release / write-off;
  - withdrawals queue;
  - plans (texts only — prices and limits go through D6 `adminUpdateSetting`, per CONVENTIONS §5.7);
  - subscriptions (gift / cancel), promo codes (CRUD + redemptions), referral-code benefits (CRUD);
  - `?userId=` filters for the user-page tabs (AC-31).

  Step-up (`stepUp: true`) is set on balance adjustment, points adjustment, withdrawal mark-paid / reject and legacy-hold release / write-off.

## Coverage totals
| Spec | ACs | API (incl. API+JOB) | NOT-API | DELEGATED | missing |
|---|---|---|---|---|---|
| 05 | 47 | 45 | 2 (AC-17 infra, AC-39 policy) | 0 | 0 |
| 09 | 37 | 28 | 9 (AC-10…AC-15 job, AC-23/25 policy, AC-24 email) | 0 | 0 |
| 14 | 20 | 19 | 1 (AC-20 policy) | 0 | 0 |
| 16 (D3 delegations: 31, 32, 36, 37, 42, 43, 44, 45, 57, 58, 59) | 11 | 11 | 0 | 0 | – |

## Files created/changed
- `docs/04-api/src/paths/d3-payments-subscriptions-withdrawals.yaml` (filled)
- `docs/04-api/src/schemas/d3.yaml` (filled; `D3ErrorCode` final)
- `docs/04-api/src/events/d3.yaml` (`payment.status_changed`, `wallet.balance_changed`, `subscription.changed`, `points.balance_changed`, `withdrawal.status_changed`)
- `docs/04-api/coverage/05.md`, `09.md`, `14.md`, `16-d3.md` (new)
- This handoff. Nothing else touched; nothing committed.

## What the next agent must do (integration run)
### Requests to the integration run
1. **Shared `SubscriptionCheckoutTarget.promoCode`.** Remove it. The promo code travels as the top-level `promoCode` of `CheckoutQuoteRequest` / `PaymentCreateRequest`, which is what lets any purpose get `PROMO_NOT_APPLICABLE` (spec 05 AC-40). Until it is removed, the D3 description says both fields must be equal if both are sent.
2. **New prefix `/admin/referrals`.** I'd like to move `adminListReferrals` there. It sits at `/admin/points/referrals` for now because D3 owns no referrals admin prefix. If you agree, rename the path only; the operationId stays the same.
3. **Cross-group `x-covers`:**
   - D4 cart, orders and offers and D5 contracts should name `createCheckoutQuote` / `createPayment` in their coverage rows for 06 AC-6…AC-11, 11 AC-26…AC-30 and 12 AC-13…AC-19. D3 already lists these ACs in its `x-covers`.
   - D6 should add `16 AC-57` to `adminUpdateSetting` (plan prices and limits).
   - D1 should cite 14 AC-20 (refuse account deletion with a pending or processing withdrawal, `t_cannot_delete_account_pending_withdrawal`, both self and staff deletion) and 09 AC-23…AC-26 (call the D3 referral service on every activation path: email link, staff activation, S-052 OFF, social sign-up) in its operations.
4. **D1 `PublicConfig`** must expose S-126 (mobile card purchase), plus S-019…S-024 and S-045/S-046 if clients need them before a quote.
5. **New i18n key** `t_payment_method_not_available` (for `CHECKOUT_METHOD_NOT_AVAILABLE`). Proposed EN: "This payment method is not available for this purchase." Georgian to be filled alongside it per Q-058.
6. **`PAYOUT_PASSWORD_INCORRECT`:** align its messageKey and HTTP status (422 here) with D1's current-password error of spec 02.
7. **data-model.md additions** (architect):
   - `reconciliation_runs` and `reconciliation_differences` tables (P-135);
   - payment "reviewed" columns (`reviewed_at`, `reviewed_by_staff_id`, `review_note`; spec 16 AC-37);
   - journal types `legacy_hold_release` / `legacy_hold_write_off` (used in `LedgerJournalType`);
   - `payment_events.event_kind` value `staff_check`.

## Open questions / risks (for `open-questions.md`; covered with the safest reading)
- **Q-D3-1 Withdrawals list permission.** Spec 14 AC-13 and spec 16 AC-42 say the Withdrawals screen needs `withdrawals.approve`, but the catalogue gives `payments.read` "withdrawals and refunds lists". I used `payments.read` for list and detail, and `withdrawals.approve` for mark-paid and reject. With this choice Customer Support sees withdrawals, including IBANs. Owner to confirm.
- **Q-D3-2 Step-up for legacy-hold release / write-off.** Spec 16 AC-7 does not list these actions explicitly. I treated them as balance adjustments (Q-096 says "audited adjustment") and set step-up. Owner to confirm.
- **Q-D3-3 Negative legacy-hold residuals.** "Release to Available" of a negative residual would lower Available and can hit I-5 (no new negatives). The API currently refuses it with `INSUFFICIENT_FUNDS` if Available would drop below 0. Should such residuals only be written off?
- **Q-D3-4 Deleting promo codes.** The spec 09 screen says "CRUD", but P-59 locks codes after the first use. I allowed delete only before the first redemption (409 afterwards; deactivate instead). Owner to confirm. Referral benefits can be deleted; gifts already granted stay.
- **Q-D3-5 Billing profile fields.** Spec 05 AC-36 lists first name, last name, company, country, address and VAT. Legacy also had city and zip (`EditValidator.php:32-34`), which are not included. This is a possible parity gap for QA.
- **Q-D3-6 Zero-total Premium (spec 09 AC-30).** This goes through `createPayment` with `method = bog_card`: the payment is created and marked paid without calling BOG (MM-09-03). This is a contract design choice, not a business rule; flagged for security review.
- **Q-D3-7 Limits I chose (not in the specs):**
  - `createPayment` rate limit: 20 per 10 minutes per user;
  - reconciliation review note: 1–1,000 characters (same as staff reasons);
  - adjustment public note: ≤ 500;
  - points adjustment: ≤ 1,000,000;
  - referral benefit months: ≤ 120;
  - plan feature list: ≤ 30 lines;
  - payout password confirmation has no dedicated rate limit (the global limits apply).

  P-B5 security review should confirm these.
- **Risk:** the spec 05 AC-44…AC-47 operations depend on P-135, which the Owner has not signed off yet.
