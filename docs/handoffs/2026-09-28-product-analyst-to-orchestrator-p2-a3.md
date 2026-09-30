## What I did
Task P2-A3 from `docs/03-architecture/phase-2-plan.md` (money wave): specs 05, 06, 07, 09 and 14, written on top of the approved `00-platform-rules.md` and specs 01–04. Settings S-xxx, rules R-x.x, removed features X-xx and accepted P-1…P-37 are referenced, not repeated. All Owner answers Q-002…Q-089 were applied. I traced the legacy money code in `/legacy/APP` (checkout, cart, BOG client and return handler, orders, delivery, completion, auto-complete command, top-up, bank transfer, withdrawals, subscriptions, renewal job, points, referrals, reviews); each spec lists file:line evidence at the top and a "Legacy defects not carried over" table (D-xx-n).

Every money movement is written as a ledger-map table (trigger, from → to account, amount formula, idempotency reference) for ADR-003 / data-model P2-B2: MM-05-01…08, PM-05-01…02, MM-06-01…05, MM-09-01…03, PM-09-01…02, MM-14-01…03.

| Spec | Status | ACs | Key money rules |
|---|---|---|---|
| `05-payments-and-wallet.md` | ready for Owner | 43 | Methods by purpose (card, wallet; points only Premium; bank transfer OFF, gig orders + top-ups only); one 2.5% surcharge S-012 on gig orders, project payments, custom offers, top-ups, not subscriptions (Q-070); standard BOG flow at product level, state changes only after server verification, return URL display-only, reconciliation (Q-087, ADR-004); top-up credits A, charges A + 2.5%; balances Available / HOLD (freelancer only) / Withdrawn / Net income / Used for purchases, all derived; ledger-based transaction history (NEW); Commission & Fee module rules; promo codes never on fees or freelancer prices; staff balance adjustments only as audited journals (P-12); admin points add/deduct (Q-016) |
| `06-gig-orders.md` | ready for Owner | 45 | Buyer charged at payment, HOLD = P′ per item (Q-008, Q-038); unpaid orders hold nothing (fixes R-005, R-014, R-016, R-004); snapshot of price/upgrades/delivery/revisions; cancel before start returns item price to wallet; revisions from the gig (P-1, P-2) stop the timer; fresh 72h after re-delivery or after a refund request ends with no money moving (Q-071); fresh 72h on re-enable (Q-084); manual completion; unblock request only while auto-release is OFF (P-5); delivery thread |
| `07-reviews.md` | ready for Owner | 21 | Mutual reviews (Q-062) on completed gig orders and projects (Q-046), 1–5 stars + text ≤ 800, one per side per item; gig rating and the two profile blocks exclude hidden reviews; staff hide/unhide instead of delete. No money |
| `09-subscriptions-points-referrals.md` | ready for Owner | 37 | Premium 9.99 / 99.99 GEL (S-008/S-009) by card on web and mobile (Q-081), no surcharge; points 100 = 1 month, server-computed (fixes R-006); activation from the verified payment (fixes R-041); auto-renew on the saved card at the current price, reminder 3 days before by email + in-app (Q-019, Q-066), failure ends Premium with a notice; cancel/resume; points ledger with extensible events (Q-017); referral 10 points on any activation path; admin promo codes % or fixed GEL, 1 per user, required cap, Premium only (Q-053, Q-064, P-10); gift/cancel |
| `14-withdrawals.md` | ready for Owner | 20 | Fee by plan fixed at request (Standard 10%, Premium 0%, Q-004, 00 EC-6); min S-031, period S-032 since the latest paid request, one pending; A leaves Available at request; manual payout marked paid (Q-029); reject with reason returns A including the fee; BOG Payout-ready statuses (processing) behind `PayoutProvider` |

## Files created/changed
- `docs/02-specs/05-payments-and-wallet.md` (new; the README previously named it `05-payments-wallet.md`, renamed per the task)
- `docs/02-specs/06-gig-orders.md` (new)
- `docs/02-specs/07-reviews.md` (new)
- `docs/02-specs/09-subscriptions-points-referrals.md` (new)
- `docs/02-specs/14-withdrawals.md` (new)
- `docs/02-specs/README.md` (rows 05, 06, 07, 09, 14 → ready for Owner; last-update line)
- `docs/STATUS.md` (P2-A3 lines only)
- `docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a3.md` (this file)
- `docs/01-discovery/open-questions.md`: **not changed**. No genuinely undecidable item was found; every open point is a PROPOSED item with a recommendation.
Nothing was committed to git.

## What the next agent must do
- **Owner:** review the five specs and accept or correct PROPOSED items **P-38…P-65** (listed at the end of each spec). Items that touch other documents:
  - **P-46** (spec 06) corrects the **approved** spec 04 AC-26: the gig page's quantity selector (1–10) is removed, because legacy silently resets quantity to 1 in the cart. If accepted, the product-analyst edits 04 AC-26 (needs your OK, 04 is approved).
  - **P-42** proposes register row **S-125 `payments.bank_transfer.instructions`** (localized text, default empty) and **P-60** proposes **S-126 `subscriptions.mobile_card_purchase.enabled`** (boolean, default ON, a fallback to hide Premium card sales in the apps if a store requires it). If accepted, the product-analyst adds them to `00-platform-rules.md` §4.3 / §4.9 (00 is approved, so this needs your OK).
  - **P-49** proposes the fallback for S-087 (delivery file types, unknown production value, Q-068): zip, rar, 7z.
  - **P-65** adds a refusal reason to account deletion (spec 02 AC-32/AC-33).
- **solution-architect (P2-B2 data model, P2-B4 openapi):**
  - Map every MM-/PM- row to posting templates. New platform accounts used: `platform:subscription_revenue` (MM-09-xx), `platform:payout_clearing` (MM-14-02; may be your "bank settlement"), `platform:promo_discounts` (already in ADR-003). One idempotency ref per escrow release (`escrow:{item}:release`) shared by buyer completion, auto-release and admin release; one per escrow refund (`escrow:{item}:refund`) shared by cancel-before-start and accepted refunds (spec 13).
  - Unapplied payments (spec 05 AC-15, P-40): `bog:{id}:unapplied` credits the buyer the full charged amount; never posted together with `bog:{id}:paid`.
  - Snapshot columns: order items (price, upgrades, delivery time, revisions allowed/used, fee versions, auto-release hours used and deadline), withdrawals (plan, fee rule version, fee, payout, payout details copy), subscription payments (price version, promo redemption).
  - Promo redemptions need a reservation state (reserved → final | released) so the per-user limit and the total cap hold under concurrency (spec 09 AC-31).
  - Points ledger event types: `referral_signup`, `admin_grant`, `admin_deduct`, `premium_redemption`, `migration_opening` (extensible).
  - Reviews: `direction` (about_freelancer / about_client), item type (gig order item, project, custom offer), status visible/hidden; aggregates per gig and per user × direction.
  - Subscription `source` values: card, points, gift, referral_benefit, promo (ADR-016 already reserves apple/google).
  - openapi: `canRequestRevision`, `revisionsLeft`, `autoReleaseAt`, `canComplete`, `canCancel`, `canRequestUnblock` flags on order items; withdrawal quote endpoint (fee + payout preview); promo validation inside the Premium quote.
  - **ADR-016 revision** (Q-081): Premium is sold by BOG card in the apps; spec 09 AC-7 and P-60 (S-126) give the fallback switch.
  - **ADR-004 note** (spec 09 P-57): renewals must charge the current price; legacy used BOG's automatic-payment call that repeats the parent amount. The lead developer confirms the right BOG saved-card endpoint (Q-087).
  - **ADR-008:** already reflects Q-084 in spec 00 EC-3; spec 06 AC-37 and EC-9 (P-53b, migrated delivered items get a fresh 72h at go-live) add one more "fresh period" case.
- **product-analyst (P2-A4):** spec 11 must reuse the MM-05 templates for project payments (surcharge, HOLD, release/refund refs) and trigger project reviews (spec 07 AC-2); spec 12 must fund the freelancer's HOLD on offer payment (spec 05 AC-18, D-05-9) and, if P-54 is accepted, enable offer reviews; spec 13 must implement the timer rules exactly as spec 06 AC-34/AC-35 (refund request stops, ends-without-money restarts 72h, dispute never restarts), use `escrow:{item}:refund` / `escrow:{item}:release`, the unblock visibility of spec 06 AC-45, and completion refused during a dispute (P-51).
- **ui-ux-designer (P2-C4):** checkout and order detail are key screens (spec 06 "Screens"); the payment result page has four states (processing, still processing, success, failed); order detail needs a status timeline, deliveries history, the revisions-left counter and the auto-complete date as text.
- **Spec 15 (P2-A5):** NEW notifications from this wave: `t_wallet_topped_up`, `t_bank_transfer_rejected`, `t_payment_credited_to_wallet`, `t_balance_adjusted`, `t_points_adjusted`, `t_buyer_sent_order_details`, `RevisionRequested`, auto-completed (buyer/seller), `t_seller_sent_u_message_about_order`, `SubscriptionRenewalReminder`, `SubscriptionRenewalFailed`, `t_referral_points_earned`, `PayoutDetailsChanged`, reconciliation alert. Dropped: `WebhookPaymentFailed` (X-07). Merged: `t_notification_buyer_order_placed` into `t_u_received_new_order_seller`. Changed: `ReviewReceived` now also to buyers; `SubscriptionRenewed` in the user's language; `OrderPlaced` for every method; `Admin/NewPayment` after verification.

## Open questions / risks
- No new Q-IDs. 28 PROPOSED items (P-38…P-65) wait for the Owner. Two new register rows are proposed (S-125, S-126).
- **App-store risk (Q-081):** selling Premium by card inside the iOS/Android apps may be rejected by Apple/Google review. The Owner chose it; S-126 (P-60) is the fallback switch; the architect documents the risk in ADR-016.
- **BOG specifics (Q-087):** callback signature, sandbox, saved-card charge with a new amount, and the card-delete call must be confirmed by the lead developer against BOG's current documentation. The specs describe behaviour only.
- **Spec 04 conflict:** approved 04 AC-26 shows quantity 1–10; legacy effectively sells quantity 1 (P-46). Until the Owner decides, spec 06 is written for quantity 1.
- **Production unknowns:** S-087 delivery file types (P-49); whether production has pending bank-transfer invoices or offline deposits (S-021 is OFF, but migrated pending rows must be handled, spec 05 EC-10 / spec 14 EC-8); the size of legacy `balance_net` values used as the Net-income opening (P-44).
- Translation quality to check by the Owner: legacy `t_amount` (ka "რაოდენობა" = quantity), `t_canceled` (ka "უარყოფილი" = rejected), `t_billing_information` (ka "მისამართი" = address), `t_order_item_could_not_be_found` (ka contains "ITEAM"), `t_min_deposit_amount_is_and_max_is` (ka contains English "is"). They are reused unchanged and flagged in the text tables.
