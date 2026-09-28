# ADR-003: Double-entry ledger, integer tetri, idempotency and the HOLD model
Date: 2026-09-28 | Status: proposed

## Context
- Vision "must not break": payment/transaction history and balances preserved exactly. Money is the area with the most legacy defects: varchar balances with float maths and non-atomic updates (R-017), inconsistent escrow bookkeeping across code paths (R-012), swapped commissions (R-013), negative pending from deleting unpaid orders (R-014), refunds of a non-existent column (R-015), free top-ups through a replayable return URL (R-004), cancel-unpaid-order credit (R-005), client-supplied points (R-006).
- Owner rules (spec 00 §3): buyer charged immediately, no buyer pending (Q-008); freelancer HOLD/Pending until completion, auto-release, refund or admin decision (Q-038, Q-051); one escrow payment per project (Q-050); refunds to wallet at item price only (Q-010, Q-011); no commission today but a Commission & Fee module (Q-006); fees snapshotted per transaction (AC-9); migrated negatives allowed, no new negatives (Q-039, R-3.6); staff corrections only as ledger adjustments (P-12); rounding half up to the tetri (R-3.8); points are a separate ledger and only buy Premium (Q-052).

## Decision
1. **Units.** Every amount is a signed 64-bit integer (`BIGINT`) in tetri; currency column fixed to `GEL` (P-13). No floating point anywhere in the API. Percentages are stored as basis points (integer, 250 = 2.5%) and applied with integer maths, rounding half up (R-3.8).
2. **Double entry.** A `journal` (one business event: "gig order paid", "escrow released", "refund accepted", "withdrawal requested", "withdrawal rejected", "top-up paid", "adjustment") has ≥ 2 `entries` (account, amount signed). **Sum of entries of a journal = 0.** Journals and entries are append-only (no UPDATE/DELETE; enforced by DB permissions and a trigger). Corrections are new journals (reversal or adjustment with a mandatory reason and staff id, P-12).
3. **Accounts.**
   - Per user: `user:{id}:available` (spendable/withdrawable; the only user account that can be paid from).
   - Per escrow: `escrow:{id}:hold` — one per gig order item, project payment and custom offer. Its payee is the freelancer. **Freelancer HOLD/Pending = sum of their open escrow accounts.** A release or refund moves exactly the escrow balance, so it cannot pay twice or pay what was never paid.
   - Per user informational counters kept for parity (`withdrawn`, `purchases`, spec 00 glossary) are derived from journals (withdrawal and purchase journal types), not separate balances that could drift.
   - Platform: `platform:bog_clearing` (money BOG owes/settles to us), `platform:card_surcharge_revenue`, `platform:fee_revenue:{fee_type}`, `platform:withdrawals_payable` (requested, not yet paid out), `platform:promo_discounts`, `platform:migration_opening_balance`, `platform:adjustments`, `platform:bank_transfer_clearing` (S-021, OFF).
   - The exact table design, posting templates for every flow and the migration of legacy balances are written in `data-model.md` (P2-B2). Examples of the intended templates:
     - Gig order paid by card (price P, surcharge S): `bog_clearing −(P+S)`, `escrow hold +P'`, `fee_revenue +(P−P')` (only if a commission is ON; today P' = P), `card_surcharge_revenue +S`. (Sign convention finalised in data-model.md.)
     - Paid by wallet: `user available −P`, `escrow hold +P`.
     - Completion / auto-release: `escrow hold −H`, `freelancer available +H` (H = escrow balance).
     - Refund accepted: `escrow hold −H`, `buyer available +H` (item price only; surcharge stays in revenue, Q-011).
     - Withdrawal requested (amount A, fee F by plan): `user available −A`, `withdrawals_payable +(A−F)`, `fee_revenue:withdrawal +F`; paid → `withdrawals_payable −(A−F)`, `bog/bank settlement +(A−F)`; rejected → reversal journal (legacy BR-101 refunds amount + fee).
4. **Balances.** A `balances` row per account caches the running total; it is updated in the **same transaction** as the entries, after `SELECT … FOR UPDATE` on the affected balance rows (locked in a fixed order to avoid deadlocks). A trigger (or the posting function) rejects a posting that would make a `user available` balance lower than both 0 and its previous value — migrated negative balances can only go up (Q-039, R-3.6); `escrow hold` can never go below 0.
5. **Business state and money move together.** A state transition (e.g. `delivered → completed`) is a compare-and-set update (`UPDATE … WHERE id = :id AND status = :expected`) inside the same DB transaction as the journal. If the row was already changed, nothing is posted.
6. **Idempotency.**
   - Every money-changing endpoint requires an `Idempotency-Key` header; the API stores (key, user, endpoint, request hash, response) for 24 h and replays the stored response for a repeat; a different body with the same key → 422.
   - Every journal has a unique `idempotency_ref` (e.g. `bog:{bogOrderId}:paid`, `escrow:{id}:release`, `withdrawal:{id}:reject`). A second attempt to post the same ref is a no-op. This makes webhook replays, double clicks and worker retries safe (R-004).
7. **Orders awaiting payment hold no money.** An order/project payment/offer paid by card is created as `awaiting_payment` with a `payment_intent`; no escrow account exists or has a balance until the verified payment journal posts. Cancelling or deleting it posts nothing (R-005, R-014).
8. **Fees.** Amounts for fees/commission/surcharge are computed by the Commission & Fee service (ADR-005) at quote/checkout time and stored on the order item / payment / withdrawal together with the fee-rule version ids. Later completion, refund or withdrawal processing uses the stored values (AC-9).
9. **Points ledger.** Same pattern with integer points: `points_journal` / `points_entries`, accounts `user:{id}:points`, `platform:points_issued`, `platform:points_redeemed`; extensible `event_type` (referral_signup, admin_grant, admin_deduct, premium_redemption, future events, Q-017). Premium purchase with points: request = plan + months; points = months × S-045 computed server-side (R-006).
10. **Reconciliation.** Nightly worker job verifies: every journal sums to 0; cached balances equal the sum of entries; closed escrows are 0; `bog_clearing` matches verified BOG payments for the day (when BOG settlement reports are available). Any difference alerts the admin recipients (S-100) and is shown in the admin finance area.
11. **Legacy migration principle** (details P2-B2): opening balances are posted as one journal per user against `migration_opening_balance`, reproducing legacy `balance_available`, `balance_pending` (as open escrow holds where the item can be identified, otherwise a per-user "legacy hold" escrow), `balance_withdrawn` and `balance_purchases` exactly as they are, negatives included (Q-039). Legacy transaction history is imported read-only for display.

## Alternatives considered
- **Balance columns updated in place (legacy style) with better locking** — still no audit trail and no way to prove balances are right. Rejected.
- **Decimal (NUMERIC(12,2)) instead of integer tetri** — safe in PostgreSQL but error-prone in JavaScript (floats); the contract requires integer tetri anyway. Rejected.
- **External ledger service (e.g. TigerBeetle, Formance)** — powerful but one more system to run and learn for one Owner. Rejected for now; the journal model can be moved later.
- **One HOLD account per freelancer instead of per escrow** — simpler, but loses the link between held money and the item, which is exactly how legacy double-paid (R-012). Rejected.
- **Event sourcing for all domains** — too heavy; only money needs an immutable log.

## Consequences
- Easier: balances are provable; every number in the UI can be traced to journals; refunds/releases cannot exceed what was paid; admin reports come from one source.
- Harder: every money flow must be written as a posting template with tests (unit tests for templates, integration tests for concurrency: two parallel completions post once).
- Must change: specs 05, 06, 09, 11–14 describe each money movement as "from → to, amount, trigger" (already planned in P2-A3); data-model.md defines tables, constraints and templates; openapi.yaml requires `Idempotency-Key` on money endpoints.
