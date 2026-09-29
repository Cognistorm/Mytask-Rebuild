# 05 — Payments and wallet
Status: **approved** (Owner 2026-09-28; P-38…P-65 accepted)
Author: product-analyst (P2-A3) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-030…BR-035, BR-100, BR-101 (balances), BR-111; `integrations.md` (BOG); `notifications.md` (payment rows); `risks-and-debt.md` R-001, R-004, R-012, R-015, R-017. Owner decisions: Q-002, Q-006, Q-007, Q-008, Q-010, Q-011, Q-016, Q-030, Q-038, Q-039, Q-052, Q-053, Q-064, Q-070, Q-081, Q-087. Platform rules: `00-platform-rules.md` §3 (money glossary, R-3.1…R-3.9), §4.2 (S-010…S-018), §4.3 (S-019…S-024), X-07, X-10, X-19, EC-1, EC-7; ADR-003 (ledger), ADR-004 (BOG), ADR-005 (fees), ADR-016 (mobile).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-38…P-45, see "Open questions"). **P-135** (AC-44…AC-47, EC-11…EC-14, S-128) was added after approval on 2026-09-29 to close parity gap G-1 and awaits Owner sign-off at the Phase 2 gate.

Legacy code traced for this spec (read-only):
- **BOG client** `legacy/APP/app/Services/Bog/BogPayment.php`: create order `payment()` `:10-51` (hosted page, redirect URLs `success?key=…&type=…` / `fail?…` `:35-38`; `callback_url` points to `https://mytask.ge/callback`, a route that does not exist `:14`; junk payload `total_discount_amount: 7`, `delivery.amount: 5`, dummy basket `product123` `:23-33`; `test_amount` sends 0.01 GEL `:22`); receipt/details `getPaymentDetails()` `:91-113`; save card `saveSubscription()` `:115-123`; charge saved card `offlinePayment()` `:59-84`; OAuth with **hard-coded client credentials** `auth()` `:130-144` (R-001; not repeated here). Endpoints: `config/bog.php:5-13`.
- **Return handler** `app/Http/Controllers/Main/PaymentBogController.php` (routes `GET /success`, `GET /fail`, `routes/web.php:20-21`): trusts `key`/`type` from the query string, never asks BOG for the status (except subscriptions), not idempotent (R-004). Gig order `:51-95` (eager-loads a non-existent column `gig:id,gig_id`, R-016); offer `:97-126` (marks funded, no freelancer HOLD); project `:128-178` (also adds to the **client's** pending balance, R-012); top-up `:180-203` (credits the wallet on every hit, non-atomic, and creates the `DepositTransaction` **without `user_id`**, so it never shows in the user's deposit history `:191-199`); subscription `:211-262` (only path that calls `getPaymentDetails`).
- **Surcharge**: gig checkout `app/Livewire/Main/Checkout/CheckoutComponent.php` (CR line endings; `updatedSelectedMethod` adds `subtotal × 0.025` on top of the gateway fee, BR-032); project/offer checkout `UnifiedCheckoutComponent.php:255-262` (same, on top of `fee()` `:295-352`); top-up `Account/Deposit/DepositComponent.php:41-65, 187-191, 649` (`amount × 1.025`; min/max compared with the surcharge-inclusive amount `:671-703`; credited amount = entered amount, `webhook()` `:3324-3364`).
- **Wallet payment**: gig `CheckoutComponent.php` `wallet()` (buyer `balance_available −= total`, `balance_purchases += total`, BR-034); project `UnifiedCheckoutComponent.php:491-598`; offer `:606-646` (deducts the buyer but never adds the freelancer's HOLD).
- **Bank transfer (offline)**: gig checkout `offline()` creates the order with a pending invoice and emails `Admin/PendingOfflinePayment`; staff confirm in `Admin/Invoices/InvoicesComponent.php:66-155` (sets `balance_purchases = order total` instead of adding to it `:75-79`); top-up `DepositComponent.php:3373-3432` (pending deposit), staff approve/reject with reason `Admin/Users/Transactions/TransactionsComponent.php:68-141` (`DepositRejected`).
- **Balances page** `resources/views/livewire/main/seller/earnings/earnings.blade.php:98-141` (Net income = `balance_net`, a column only the admin edits; Withdrawn; Used for purchases; Pending clearance; Available for withdrawal). Deposit history `Account/Deposit/HistoryComponent.php:91-94` (40 per page). Saved cards `Account/Cards/CardsComponent.php:50-92` (list + delete). Billing info `Account/Billing/BillingComponent.php:168-199` (`BillingInfoUpdated` email).
- **Admin balance edit** `Admin/Users/Options/EditComponent.php:228` (typed balance, X-19). Points: `User::addPoints()/deductPoints()` `app/Models/User.php:415-436` (no history, no admin screen in `/dashboard`; Filament user form only).

---

## Goal
Give every payment on MyTask one safe, simple path: pay by BOG card (with the 2.5% surcharge where it applies) or from the wallet, top up the wallet by card, and see clear balances and a full transaction history. Every movement of money is a ledger entry confirmed by the server, never by the browser. Fees come from the Commission & Fee module; staff correct balances and points only through audited adjustments.

## Roles involved
- **Buyer** (any user): pays gig orders (spec 06), project payments (spec 11), custom offers (spec 12); tops up the wallet; manages saved cards and billing information.
- **Freelancer** (any user): sees HOLD/Pending, Available, Withdrawn and earnings; withdraws (spec 14).
- **Premium buyer**: pays the subscription (spec 09; no surcharge).
- **Staff** (Financial Manager / Super-admin, spec 16): sees payments and callbacks, confirms bank transfers (when S-021 is ON), posts balance and points adjustments, edits fee rules.
- **System**: BOG callback processing, reconciliation of pending payments.
- **BOG** (external): hosted card page, callback, payment details.

## User stories
- As a buyer, I want to see the exact total (price + card fee) before I pay, so that there are no surprises.
- As a buyer, I want to pay from my wallet in one click when I have enough balance, so that I do not type my card again.
- As a buyer, I want to top up my wallet by card, so that I can pay later from the balance.
- As a buyer, I want to know right away whether my card payment went through, and to be safe if I close the tab, so that I am never charged without getting what I paid for.
- As a freelancer, I want to see money on HOLD separately from money I can withdraw, and every movement in one history, so that I trust the numbers.
- As the Owner, I want to switch fees on or off and change them in the admin panel, and to correct a balance only with a recorded reason, so that the books stay provable.

## Acceptance criteria

### Payment methods (Q-016, Q-052, Q-070)
- AC-1 Given a checkout for a gig order, project payment or custom offer, When the payment methods are shown, Then they are "Card (Visa/Mastercard via BOG)" if S-019 is ON and "Wallet" if S-020 is ON; "Bank transfer" appears only for gig orders and only if S-021 is ON (P-42). Points are never offered. (LEGACY methods; CHANGE Q-016: other gateways removed X-07; Q-052)
- AC-2 Given a wallet top-up, When the methods are shown, Then only "Card" (S-019, S-022) and, if S-021 is ON, "Bank transfer" are offered. Wallet and points are not. (LEGACY `DepositComponent.php`; Q-030)
- AC-3 Given a Premium purchase, When the methods are shown, Then "Card" (no surcharge) and, for the monthly plan, "Points" are offered; Wallet and bank transfer are not. Detail in spec 09. (LEGACY BR-111, BR-114; Q-070; ADR-016 asked to confirm the wallet stays excluded)
- AC-4 Given a method's setting is switched OFF, When a user opens a checkout or calls the payment API with that method, Then the method is hidden on web and mobile and the API refuses it with "feature disabled". Payments already started with it finish normally. (00 AC-11, EC-1)

### Quote and surcharge (Q-007, Q-070, S-012)
- AC-5 Given a buyer opens a checkout, When the API builds the quote, Then it returns the breakdown in tetri: item price(s), buyer-side fees from the Commission & Fee module (today none), card surcharge (only if Card is selected), promo discount (only on platform services, spec 09), and total. Web and mobile only display these numbers; they never compute them. (NEW, architecture §2; ADR-005)
- AC-6 Given Card is selected for a gig order, project payment, custom offer or top-up, When the quote is built, Then the surcharge = S-012 (default 2.5%) × the surcharge base, rounded half up to the tetri, and it is shown as its own line `t_card_fee_line` ("Card fee 2.5%"). Example: base 100.00 GEL → surcharge 2.50 GEL, total 102.50 GEL; base 30.30 GEL → surcharge 0.76 GEL (0.7575 rounded half up), total 31.06 GEL. (CHANGE Q-007, Q-070: one surcharge, legacy added it on top of a gateway fee; R-3.8; base P-38)
- AC-7 Given Wallet or Bank transfer is selected, When the quote is built, Then there is no surcharge. Given a Premium purchase by card, Then there is no surcharge either. (LEGACY `UnifiedCheckoutComponent.php:210-214`; Q-070)
- AC-8 Given the admin changes S-012 or any fee rule while a buyer has an open checkout, When the buyer confirms, Then the API recomputes the quote; if the total changed, the payment is not started and the buyer sees `t_quote_changed` with the new total to confirm again. A payment already started keeps the fee it was created with. (00 AC-9; ADR-005 §5)

### Card payment through BOG (Q-087, ADR-004) — standard BOG flow, product level
- AC-9 Given a buyer confirms a card payment, When the API accepts it (with an idempotency key), Then it creates one payment record with the purpose, the payer, the amount breakdown and the fee versions, asks BOG for a payment page for exactly the quoted total in GEL, and returns BOG's page link. Web opens the BOG page in the same tab; mobile opens it in an in-app browser. A second press of "Pay" with the same key returns the same payment, not a new one. (LEGACY hosted page `BogPayment.php:10-51`; CHANGE: server-side amount and idempotency, R-004)
- AC-10 Given the buyer pays on the BOG page, When BOG informs the platform (callback), Then the platform records the raw event, asks BOG for the payment details itself, and marks the payment paid only if BOG reports it successful for the same order, amount and currency. Only then are the business effects applied (order/offer/project paid and HOLD funded, wallet credited, or subscription activated) together with their ledger entries, in one step. (CHANGE: legacy trusted the return URL, R-004; ADR-004 §3)
- AC-11 Given BOG sends the browser back to the platform (success or fail link), When the result page opens (`/payments/{id}/result` on web; deep link on mobile), Then it only reads the payment status from the API and shows it. Opening, refreshing or forging this link never changes any state or balance. (CHANGE, fixes R-004)
- AC-12 Given the result page opens before the payment is confirmed, When the status is still pending, Then the page shows `t_payment_processing` and checks again every few seconds for up to 60 seconds; after that it shows `t_payment_still_processing` ("we will notify you") with a link to the order/wallet. When the status becomes paid, it shows the success state with a link to the item (order, offer, project, wallet, subscription). When failed or expired, it shows `t_error_xendit_payment_failed` with "Try again" (new payment for the same item) and nothing is charged or credited. (NEW states; LEGACY failure text)
- AC-13 Given the callback never arrives, When a payment has stayed pending for more than a few minutes, Then a background check asks BOG for its details and applies the same verified path as AC-10; a payment BOG never completes becomes expired after BOG's order lifetime. (NEW, ADR-004 §4; legacy callback route did not exist, `BogPayment.php:14`)
- AC-14 Given BOG reports the same successful payment twice (callback retry, background check, double click), When it is processed again, Then nothing changes a second time: one ledger journal per BOG payment (`bog:{bogOrderId}:paid`). (CHANGE, fixes R-004 replay)
- AC-15 Given a verified successful payment arrives for an item that can no longer take it (order deleted by the buyer, offer expired or canceled, item already paid another way), When it is processed, Then the full amount charged (price + surcharge) is credited to the buyer's Available balance as "Unapplied payment", the buyer gets `t_payment_credited_to_wallet`, and staff see it in the payments list. (ACCEPTED P-40)
- AC-16 Given the BOG create-order request, When it is sent, Then it contains only real data: our payment id as the external order id, the total, currency GEL, basket lines with the real item names and amounts, the locale, the callback URL and the return URLs. No dummy discount, delivery or basket values. BOG credentials come from `.env` only. (CHANGE, fixes `BogPayment.php:23-33`, R-001; Q-042)
- AC-17 Given a non-production environment, When BOG test mode is used, Then real card payments of the smallest amount need the Owner's approval (Q-087). The legacy "send 0.01 GEL instead of the real total" switch does not exist in production builds. (CHANGE `config/bog.php:9`, `BogPayment.php:22`)

### Wallet payment (BR-034, Q-008)
- AC-18 Given Wallet is selected and the buyer's Available balance ≥ the total, When the buyer confirms, Then in one step the total leaves the buyer's Available balance, the item becomes paid and the freelancer's HOLD is funded (spec 06/11/12), and the buyer sees the success state immediately (no BOG page). (LEGACY BR-034; CHANGE Q-008: the freelancer's HOLD is funded for offers too, legacy `UnifiedCheckoutComponent.php:606-646` skipped it)
- AC-19 Given the Available balance is lower than the total (including a migrated negative balance, 00 EC-7), When Wallet is selected, Then the option shows `t_insufficient_funds_in_your_account` with a "Top up" link, the Pay button stays disabled, and the API refuses a direct call. No partial wallet + card payment exists. (LEGACY; R-3.6)
- AC-20 Given two wallet payments are started at the same moment for more than the balance, When they are processed, Then only one succeeds and the other is refused with `t_insufficient_funds_in_your_account`; the balance never goes below 0 because of them. (CHANGE, fixes R-017)

### Wallet top-up (Q-030, BR-100)
- AC-21 Given S-022 is ON and a user opens Top up (`/account/deposit`; mobile Wallet → Top up), When they enter an amount A (GEL, up to 2 decimals) and choose Card, Then the screen shows A, the card fee (S-012 × A, half up) and the total to pay, and the amount credited to the wallet = A. (LEGACY `DepositComponent.php:41-65`)
- AC-22 Given A is below S-023 (default 1 GEL) or above S-024 (default 900,000 GEL), When the user continues, Then it is refused with `t_min_deposit_amount_is_and_max_is` showing both limits. The limits apply to A, the amount credited. (LEGACY message; CHANGE P-39: legacy compared the limits with A + fee)
- AC-23 Given the card payment for a top-up is confirmed (AC-10), When it is applied, Then A is added to the user's Available balance, the surcharge goes to card-surcharge revenue, the top-up appears in the transaction history, and the user gets the in-app notification `t_wallet_topped_up` (plus push). (LEGACY credit; NEW notification P-43; fixes R-004 free top-ups)

### Bank transfer (S-021 OFF by default, Q-016) — P-42
- AC-24 Given S-021 is ON and a buyer chooses Bank transfer for a gig order, When they confirm, Then the order is created as "awaiting bank transfer" with the bank instructions from S-125 and the order reference, no surcharge, no money moves, and `Admin/PendingOfflinePayment` goes to every S-100 recipient. (LEGACY `CheckoutComponent.php` `offline()`; CHANGE recipients Q-026)
- AC-25 Given staff with the bank-transfer permission confirm that the money arrived, When they press "Confirm payment", Then the order becomes paid exactly like a card payment (HOLD funded, spec 06 notifications to the freelancer), and the buyer gets `t_ur_payment_has_been_received_offline`. When staff reject it (reason required), Then the order is canceled, nothing moves, and the buyer gets `t_bank_transfer_rejected` with the reason. (LEGACY `Admin/Invoices/InvoicesComponent.php:66-155`; reject NEW, P-42)
- AC-26 Given S-021 is ON and a user tops up by bank transfer, When they submit an amount (same limits as AC-22), Then a pending top-up is created with the instructions (`t_deposit_offline_pending_msg`). Staff confirm → A is credited to Available; staff reject with a reason → the user gets `DepositRejected` with the reason. (LEGACY `DepositComponent.php:3373-3432`, `TransactionsComponent.php:68-141`)

### Balances (00 §3, Q-008, Q-038)
- AC-27 Given a user opens Earnings (Selling → Earnings; mobile Selling → Earnings), When it loads, Then it shows: Available balance ("Available for withdrawal"), HOLD/Pending (`t_pending_balance` with `t_pending_balance_hint`), Withdrawn, Net income and Used for purchases, all from the ledger, plus buttons "Withdraw" (spec 14) and "Top up". (LEGACY `earnings.blade.php:98-141`; definitions 00 §3 and P-44)
- AC-28 Given a freelancer taps HOLD/Pending, When the list opens, Then it shows each open item whose money is on HOLD (gig order, project payment, custom offer) with its amount, status and, if delivered, the auto-release date when S-025 is ON; the sum equals the HOLD figure. (NEW, ADR-003: HOLD = sum of open escrows)
- AC-29 Given a buyer pays for any item, When they look at their own balances, Then no pending or escrow amount appears on the buyer side; the item shows as "Paid" (`t_paid`). (00 AC-13; CHANGE Q-008: the legacy BOG project path added to the client's pending balance, R-012)
- AC-30 Given a migrated user with a negative balance, When balances are shown, Then the negative value is displayed as is (with a minus sign) and wallet payments and withdrawals are refused until it is positive. (00 EC-7, Q-039)

### Transaction history (vision "payment/transaction history preserved") — NEW
- AC-31 Given a user opens Transactions (account menu → Wallet → Transactions; mobile Wallet → Transactions), When it loads, Then it lists every ledger movement that touched their Available or HOLD balance, newest first, 40 per page (cursor): date and time, type (`t_txn_type_*`: card payment, wallet payment, top-up, HOLD funded, released, refund, cancellation, withdrawal requested/paid/rejected, balance correction, unapplied payment, migrated opening balance), the linked item (order/project/offer/withdrawal number with a link), the amount with + or −, and which balance it affected. (NEW; replaces the legacy deposit history `HistoryComponent.php:91-94`)
- AC-32 Given the list, When the user filters by type or by a date range, Then only matching movements are shown. Empty result: `t_no_transactions_yet`. (NEW)
- AC-33 Given a card payment in the list, When the user opens it, Then a receipt view shows the breakdown (price, fees, card fee, discount, total), the payment method (card brand and masked number from BOG), the date, the BOG order reference and the billing information saved at that time. No PDF invoice is produced (legacy had none). (NEW view; LEGACY billing data on the invoice record)
- AC-34 Given migrated legacy transactions (deposits, withdrawals, orders), When a migrated user opens the history, Then they appear read-only with their original dates and amounts, and an opening-balance line reproduces the migrated balances. (ADR-003 §11; vision)

### Saved cards and billing information (LEGACY)
- AC-35 Given the account area "Payment methods" (`/account/cards`; mobile Account → Payment methods), When it opens, Then it lists the user's saved cards (brand, masked number, expiry, default mark). The user can delete a card after a confirmation; the card is also removed at BOG. If it is the card used for Premium auto-renewal, the dialog warns `t_delete_card_renewal_warning` and, after deletion, the subscription will not renew and ends at its end date. (LEGACY `CardsComponent.php:50-92`; warning ACCEPTED P-45)
- AC-36 Given Billing information (`/account/billing`), When the user saves first name, last name, company, country, address and VAT number, Then they are stored, copied onto later payment receipts, and the `BillingInfoUpdated` email is sent. (LEGACY `BillingComponent.php:168-199`)

### Commission & Fee module (Q-006 NEW, 00 §4.2)
- AC-37 Given a fee rule (S-010…S-018) with `enabled`, `type` (percent or fixed GEL), `value`, `payer`, `applies_to` and optional `plan`, When a quote or withdrawal is computed, Then every enabled rule that applies to the purpose (and plan) is applied: buyer-paid fees are added to the buyer's total as their own lines; freelancer-paid fees reduce the freelancer's HOLD amount (never the listed price). Disabled rules and zero values produce no line. (NEW Q-006; ADR-005 §6)
- AC-38 Given the default launch rules, When a 100.00 GEL gig order is paid by card, Then the buyer pays 102.50 GEL (100.00 + 2.50 card fee), the freelancer's HOLD increases by 100.00 GEL, and platform fee revenue is 0.00. Given the Owner later enables S-013 gig commission at 10% (payer freelancer), Then a new 100.00 GEL order still costs the buyer 102.50 GEL, the freelancer's HOLD is 90.00 GEL and fee revenue 10.00 GEL; orders paid before the change keep 100.00 GEL HOLD. (R-3.4, R-3.5; 00 AC-9)
- AC-39 Given a fee rule is changed in the admin panel, When it is saved, Then a new version with its effective date is stored and audited (who, when, old, new); every payment, escrow and withdrawal stores the rule versions it used. (00 AC-8, AC-9; ADR-005)
- AC-40 Given a promo code, When it is applied, Then it can only reduce the price of a platform service marked promo-eligible (today Premium, spec 09). It never reduces a fee, the card surcharge, a withdrawal fee, or a freelancer's price (gig, custom offer, project payment); the API refuses a promo code on those checkouts with `t_promo_not_applicable`. (NEW Q-053, Q-064a, R-3.9)

### Staff balance adjustments (ACCEPTED P-12) and points adjustments (Q-016)
- AC-41 Given a staff member with the balance-adjustment permission, When they open a user in the admin panel and post an adjustment (credit or debit, amount > 0, account = Available, required internal reason, optional public note, optional link to an order/project/offer/withdrawal), Then one ledger journal is posted between the user's Available balance and the platform adjustments account, the audit log records who, when, amount, reason and IP, and the user sees a "Balance correction" line (with the public note) in Transactions and the in-app notification `t_balance_adjusted`. There is no field to type a balance. (CHANGE P-12, X-19; visibility and notification ACCEPTED P-41)
- AC-42 Given a debit adjustment larger than the user's Available balance, When it is saved, Then it is refused with `t_adjustment_would_go_negative`. (R-3.6)
- AC-43 Given a staff member with the points permission, When they add or deduct points for a user (whole number > 0, required reason, optional public note), Then a points-ledger journal is posted (`admin_grant` or `admin_deduct`), audited, visible in the user's points history (spec 09) and notified in-app `t_points_adjusted`. A deduction larger than the user's points is refused. (NEW Q-016; ADR-003 §9; notification ACCEPTED P-41)

### Nightly ledger/BOG reconciliation (ADR-003 §10; data-model §6 "REC") — **PROPOSED P-135** (added 2026-09-29, parity gap G-1; awaiting Owner sign-off)
- AC-44 Given the daily time in S-128 `ledger.reconciliation.run_time` (PROPOSED, default 03:00 Georgian time, UTC+4), When that time is reached, Then the worker starts one reconciliation run for the previous Georgian calendar day (the "run day", 00:00–24:00 Georgian time) and records it: run day, start and end time, status (`no differences` | `differences found` | `failed`), number of checks and number of differences. There is at most one completed run per run day: a retry or a second start for the same run day does not create a second run. The run only reads data: it never posts, reverses or corrects a journal, balance, escrow, payment or withdrawal. (NEW ADR-003 §10, ADR-008 §5; schedule and one-run-per-day PROPOSED P-135)
- AC-45 Given a run, When it checks the books, Then it performs checks C-1…C-9 below with exact equality in tetri (a difference is any gap other than 0, even 1 tetri; there is no tolerance), and stores every difference with: check code, subject (journal, ledger account, escrow, user, withdrawal or payment, with its id), expected value, actual value and the gap. (NEW ADR-003 §10; checks = the invariants marked REC in data-model §6; PROPOSED P-135)
  - C-1 Every journal posted on the run day has at least 2 entries, no entry of 0, and its entries sum to 0 (I-1).
  - C-2 Every ledger account's stored balance equals the sum of all its entries, and the latest entry's running balance equals that sum (I-3).
  - C-3 The sum of all ledger account balances is 0 (I-4).
  - C-4 Every closed escrow has balance 0; no escrow is below 0 except a migrated legacy hold; each freelancer's HOLD equals the sum of their open escrow balances (I-6, I-13).
  - C-5 Each user's Withdrawn, Used for purchases and Net income figures equal the values recomputed from their migrated opening values and the journals (R-P7; data-model §5.4).
  - C-6 The `withdrawals_payable` balance equals the total payout amount of withdrawals that are pending or processing, and it is not below 0 (I-14).
  - C-7 For each card payment verified on the run day (paid or unapplied, AC-10, AC-15): the amount BOG confirmed = the payment total = the amount taken from `bog_clearing` by its journal. A verified card payment without a journal, or a card-payment journal without a verified payment, is also a difference (I-12).
  - C-8 The total taken from `bog_clearing` by journals of the run day equals the total of card payments verified on the run day (I-17).
  - C-9 When a BOG settlement report for the run day is available to the platform (how it is obtained is finalised against the BOG documentation, Q-087), each payment in it and its total match the card payments verified on the run day; a payment found on only one side is a difference. When no report is available, C-9 is recorded as "not available", which is not a difference.
- AC-46 Given a run ends with 1 or more differences, When it is recorded, Then EV-32 `Admin/ReconciliationDifference` (spec 15) is sent once for that run to every S-100 address, with `:count` = the number of differences of the run and `:date` = the run day, linking to the run in the admin panel. A run with no differences sends nothing. A retry of the same run day never sends EV-32 a second time. Given a run fails (it cannot finish after the worker's retries, ADR-008 §4), Then it is recorded as `failed`, shown in System health (spec 16 AC-69), EV-125 `Admin/SystemAlert` is sent at most once per run day, and EV-32 is not sent. (NEW ADR-003 §10; once-per-run and failure alert PROPOSED P-135)
- AC-47 Given staff with `payments.read` open Money → Reconciliation in the admin web app (spec 16 AC-44), When the list loads, Then runs are listed newest first, one row per run day: run day, start and end time, status (`t_admin_recon_status_*`), checks, differences, and how many differences are not yet reviewed; filters: status and date range; empty state `t_admin_recon_no_runs`. When staff open a run, Then each difference shows the check name (`t_admin_recon_check_*`), the subject with a link (ledger viewer 16 AC-45, payment detail 16 AC-36, escrow list 16 AC-39, withdrawal 16 AC-42, user), expected, actual and gap in GEL. Staff can mark a difference "reviewed" with a required note; this is audited and moves no money (same pattern as 16 AC-37). Reviewing does not remove a difference: if the cause remains, the next run reports it again. (NEW; screen named in 16 AC-44 and the `payments.read` row of 16 §permissions; review marking PROPOSED P-135)

---

## Business rules
- R-P1 **Methods by purpose** (Q-016, Q-052, Q-070): see the table below. Points only buy Premium; Wallet never buys Premium; bank transfer only when S-021 is ON and only for gig orders and top-ups (LEGACY scope, P-42).

  | Purpose | Card (BOG) | Surcharge S-012 | Wallet | Points | Bank transfer (S-021) |
  |---|---|---|---|---|---|
  | Gig order (spec 06) | yes | yes | yes | no | yes when ON |
  | Project payment (spec 11) | yes | yes | yes | no | no |
  | Custom offer (spec 12) | yes | yes | yes | no | no |
  | Wallet top-up | yes | yes | – | no | yes when ON |
  | Premium subscription and renewal (spec 09) | yes (web and mobile, Q-081) | **no** | no | monthly only | no |

- R-P2 **Server-confirmed state only** (ADR-004, Q-087): a card payment changes state only after the platform has verified it with BOG (callback, then payment details: same order, amount, currency, successful status). The return URL is display-only. Reconciliation heals missing callbacks. The lead developer finalises the exact BOG endpoints, signature check and sandbox against the official BOG documentation (Q-087); nothing in this spec depends on their names.
- R-P3 **Payment statuses** (display): created → pending (on the BOG page) → paid | failed | expired | canceled. Only "paid" has money effects.
- R-P4 **Idempotency**: every money-changing request carries an idempotency key; every journal has a unique reference (see "Money movements"). Replays post nothing.
- R-P5 **Surcharge** (Q-070, P-38): one surcharge S-012 on card payments of gig orders, project payments, custom offers and top-ups, computed once per checkout on the surcharge base (everything the buyer pays before the surcharge: prices + buyer-side fees; today = the prices), half up to the tetri. Not refundable (Q-011). Not a commission.
- R-P6 **Awaiting payment holds nothing** (ADR-003 §7): an item waiting for a card or bank payment has no HOLD and no ledger entry; deleting or canceling it moves nothing (fixes R-005, R-014).
- R-P7 **Balances are derived** (00 §3): Available and HOLD come from the ledger. Withdrawn = total of withdrawal requests not rejected (00 glossary). Used for purchases = total the user paid for gig orders, project payments and custom offers (card or wallet, surcharge excluded, refunds not deducted, LEGACY meaning). Net income = total released to the user as a freelancer (completion, auto-release, admin release) plus the migrated legacy `balance_net` opening value (P-44).
- R-P8 **No negative balances created** (R-3.6, Q-039): a wallet payment, withdrawal or debit adjustment that would take Available below 0 is refused; migrated negatives are shown and can only go up.
- R-P9 **Commission & Fee module** (Q-006, ADR-005): rules S-010…S-018 are versioned; `calculateFees` is the single source; buyer-paid fees add to the total, freelancer-paid fees reduce the HOLD amount; the listed price is never changed; fee amounts and versions are stored on each payment/escrow/withdrawal (AC-9 of 00). Future fees are created OFF.
- R-P10 **Promo codes** (R-3.9, Q-053, Q-064): only on promo-eligible platform services (today Premium). Rules for codes in spec 09.
- R-P11 **Corrections** (P-12, Q-016): money only through adjustment journals with reason and audit; points only through admin grant/deduct journals. Staff cannot edit HOLD directly: HOLD changes only through release, refund or cancellation (specs 06, 13).
- R-P12 **Refund destination** (Q-010, Q-011): money returned to a buyer always goes to Available (never to the card), item price only. Details in specs 06 and 13.
- R-P13 **Currency** GEL only; amounts in tetri in the API (00 AC-17, P-13).

## Money movements (ledger map for ADR-003 / P2-B2)
Account names follow ADR-003. "P" = item price; "P′" = freelancer amount after freelancer-paid fees (today P′ = P); "Fb" = buyer-paid fees (today 0); "S" = card surcharge; "A" = top-up amount. The item-specific versions for gig orders, project payments and custom offers are in specs 06, 11 and 12; they follow these templates.

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-05-01 | Card payment for an item verified (AC-10) | `platform:bog_clearing` → `escrow:{item}:hold` | P′ per item | `bog:{bogOrderId}:paid` (one journal for all lines) |
| | | `platform:bog_clearing` → `platform:fee_revenue:{rule}` | (P − P′) + Fb, only if a fee is ON | same |
| | | `platform:bog_clearing` → `platform:card_surcharge_revenue` | S | same |
| MM-05-02 | Wallet payment for an item confirmed (AC-18) | `user:{buyer}:available` → `escrow:{item}:hold` | P′ per item | `payment:{paymentId}:wallet` |
| | | `user:{buyer}:available` → `platform:fee_revenue:{rule}` | (P − P′) + Fb, only if a fee is ON | same |
| MM-05-03 | Card top-up verified (AC-23) | `platform:bog_clearing` → `user:{id}:available` | A | `bog:{bogOrderId}:paid` |
| | | `platform:bog_clearing` → `platform:card_surcharge_revenue` | S = S-012 × A | same |
| MM-05-04 | Bank transfer confirmed by staff, gig order (AC-25) | `platform:bank_transfer_clearing` → `escrow:{item}:hold` (+ fee revenue as MM-05-01) | P′ per item | `bank:{paymentId}:confirmed` |
| MM-05-05 | Bank transfer confirmed by staff, top-up (AC-26) | `platform:bank_transfer_clearing` → `user:{id}:available` | A | `bank:{paymentId}:confirmed` |
| MM-05-06 | Verified card payment that cannot be applied (AC-15, P-40) | `platform:bog_clearing` → `user:{buyer}:available` | full amount charged (P + Fb + S) | `bog:{bogOrderId}:unapplied` (never together with `:paid`) |
| MM-05-07 | Staff credit adjustment (AC-41) | `platform:adjustments` → `user:{id}:available` | X | `adjustment:{adjustmentId}` |
| MM-05-08 | Staff debit adjustment (AC-41, AC-42) | `user:{id}:available` → `platform:adjustments` | X ≤ Available | `adjustment:{adjustmentId}` |
| PM-05-01 | Staff points grant (AC-43) | `platform:points_issued` → `user:{id}:points` | N points | `points_adjustment:{id}` |
| PM-05-02 | Staff points deduction (AC-43) | `user:{id}:points` → `platform:points_issued` | N ≤ user points | `points_adjustment:{id}` |

Subscription payments (no surcharge, promo discounts) are MM-09-xx in spec 09; withdrawals are MM-14-xx in spec 14. Rejections, failures, expiries and deletions of unpaid items post nothing.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Checkout payment block (used by specs 06, 11, 12) | right column: method radio list (Wallet shows the balance; Card shows the card-fee line), breakdown (subtotal, fees, card fee, total), "Pay" button; bank-transfer option only when S-021 is ON | bottom sheet for methods; sticky total + "Pay" bar; Card opens the BOG page in an in-app browser and returns by deep link | loading quote (skeleton); quote changed (AC-8); insufficient balance (AC-19); error (retry); submitting (button busy, double press ignored) |
| Payment result `/payments/{id}/result` | status card with icon, amount, item link | full-screen status after the in-app browser closes | processing (AC-12, polling); still processing; success; failed/expired with "Try again" |
| Top up `/account/deposit` | amount field, method choice, live breakdown (amount, card fee, total to pay, credited) | Wallet → Top up, numeric keypad | validation error (limits); processing; success |
| Earnings / balances | Selling → Earnings: five tiles + HOLD list (AC-27, AC-28) | Selling → Earnings: tiles stacked, HOLD list below | loading; empty (all 0 with explanation); error (retry); success |
| Transactions | table with filters (type, dates), receipt drawer | list with filter sheet, receipt screen | loading; empty `t_no_transactions_yet`; error; success |
| Payment methods `/account/cards` | card list with delete | Account → Payment methods | empty `t_no_saved_cards`; delete confirmation (with renewal warning) |
| Billing `/account/billing` | form | form | validation errors; saved toast |
| Admin (spec 16): payments and callbacks list, bank-transfer confirmations, balance adjustment form, points adjustment form, fee rules editor | | | |
| Admin (spec 16 AC-44): Money → Reconciliation (AC-47, PROPOSED P-135) | run list (one row per run day) with status and filters; run detail with the differences table and "Mark as reviewed" dialog (required note) | – (admin is web only) | loading; empty `t_admin_recon_no_runs`; error (retry); success; run status `failed` shown with the error summary |

Accessibility: every amount has a text label (not colour only); the card-fee line reads the percentage; the Pay button shows the total in its label.

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `t_wallet_topped_up` | in-app + push | user | card or bank top-up credited (AC-23, AC-26) | **NEW, ACCEPTED P-43** |
| `Admin/PendingOfflinePayment` (`t_notification_admin_pending_offline_payment`) | email | all S-100 | bank-transfer gig order created (AC-24) | LEGACY (only when S-021 is ON), CHANGE recipients Q-026 |
| `t_ur_payment_has_been_received_offline` | in-app + push | buyer | staff confirm bank transfer (AC-25) | LEGACY (push NEW) |
| `t_bank_transfer_rejected` | in-app + push + email | buyer | staff reject bank transfer for an order (AC-25) | **NEW, ACCEPTED P-42** |
| `DepositRejected` (`t_subject_everyone_recent_deposit_rejected`) | email (+ in-app NEW) | user | staff reject a bank top-up (AC-26) | LEGACY |
| `BillingInfoUpdated` (`t_subject_everyone_billing_info_updated`) | email | user | billing information saved (AC-36) | LEGACY |
| `t_payment_credited_to_wallet` | in-app + push + email | buyer | unapplied payment credited (AC-15) | **NEW, ACCEPTED P-40** |
| `t_balance_adjusted` | in-app + push | user | staff balance adjustment (AC-41) | **NEW, ACCEPTED P-41** |
| `t_points_adjusted` | in-app + push | user | staff points grant/deduction (AC-43) | **NEW, ACCEPTED P-41** |
| Reconciliation difference alert, spec 15 EV-32 `Admin/ReconciliationDifference` (`t_subject_admin_reconciliation_difference`, body `t_admin_reconciliation_difference_body`) | email | all S-100 | a nightly run ends with 1 or more differences; once per run, with the count (AC-46) | NEW (architecture ADR-003 §10); trigger rule **PROPOSED P-135** |
| System alert, spec 15 EV-125 `Admin/SystemAlert` | email | all S-100 | a reconciliation run fails (AC-46), at most once per run day | NEW trigger on an ACCEPTED event (P-111); **PROPOSED P-135** |

Item-specific payment notifications (new order, offer funded, project funded) are in specs 06, 11, 12; subscription notifications in spec 09. **Not carried over:** `User/Buyer/WebhookPaymentFailed` (sent only by the removed foreign gateways' callback controllers, X-07); a failed BOG payment is shown on the result page (AC-12).

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_checkout` | Checkout | გადახდა |
| `t_payment_method` | Payment method | გადახდის მეთოდი |
| `t_wallet` | Wallet | საფულე |
| `t_subtotal` / `t_total` | Subtotal / Total | ჯამი / ჯამი |
| `t_order_summary` | Order summary | შეკვეთის შეჯამება |
| `t_pay` | Pay | გადახდა |
| `t_insufficient_funds_in_your_account` | Insufficient funds in your account | თქვენს ანგარიშზე არ არის საკმარისი თანხა |
| `t_error_xendit_payment_failed` | Payment failed, Please try again | გადახდა ვერ მოხერხდა, გთხოვთ სცადოთ თავიდან. |
| `t_payment_received_details` | Payment received – be sure to message the freelancer … (legacy text) | გადახდა მიღებულია - … (legacy text) |
| `t_add_funds` / `t_deposit` | Add funds / Deposit | ანგარიშის შევსება / ანგარიშის შევსება |
| `t_deposit_amount_incorrect` | The entered amount is invalid | შეყვანილი თანხა არასწორია |
| `t_min_deposit_amount_is_and_max_is` | The minimum deposit amount is :min and maximum is :max | მინიმალური დეპოზიტის რაოდენობა :min მაქსიმალური დეპოზიტის რაოდენობა is :max (Owner may fix the stray "is") |
| `t_deposit_offline_pending_msg` | Your transaction has completed, but payment is still pending | ტრანზაქცია წარმატებით განხორციელდა, მაგრამ გადახდა ჯერ კიდევ მოლოდინის რეჟიმშია |
| `t_transactions` | Transactions | ტრანზაქციები |
| `t_earnings` | Earnings | გამომუშავება |
| `t_net_income` | Net income | სუფთა შემოსავალი |
| `t_withdrawn` | Withdrawn | თანხის გატანა |
| `t_used_for_purchases` | Used for Purchases | გამოყენებულია შესყიდვისთვის |
| `t_pending_clearance` | Pending clearance | დაბლოკილი თანხები |
| `t_available_for_withdrawal` | Available for withdrawal | ხელმისაწვდომია განაღდებისთვის |
| `t_available_balance` / `t_pending_balance` / `t_pending_balance_hint` / `t_paid` / `t_feature_disabled` | see 00 | see 00 |
| `t_date` / `t_status` / `t_details` | Date / Status / Details | თარიღი / სტატუსი / დეტალები |
| `t_amount` | Amount | რაოდენობა (legacy ka means "quantity"; Owner may change to "თანხა") |
| `t_payment_methods` | Payment Methods | ჩემი ბარათები |
| `t_payment_method_deleted` | Payment method has been successfully deleted. | ბარათი წარმატებით წაიშალა. |
| `t_billing_information` | Billing information | მისამართი (Owner may refine: "ანგარიშსწორების მონაცემები") |
| `t_billing_information_subtitle` | Update your billing information below | (missing in legacy ka; NEW ka) განაახლეთ თქვენი ანგარიშსწორების მონაცემები |
| `t_firstname` / `t_lastname` / `t_company` / `t_address` | Firstname / Lastname / Company / Address | სახელი / გვარი / კომპანია / მისამართი |
| `t_vat_number` | VAT number | დ.ღ.გ. ნომერი (დამატებული ღირებულების გადასახადი) |
| `t_billing_info_updated_success` | Your billing information has been successfully updated | ინფორმაცია წარმატებით განახლდა |
| Email subjects and in-app keys in "Notifications" (legacy ones) | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_pay_by_card` | Card (Visa / Mastercard) | ბარათით გადახდა (Visa / Mastercard) |
| `t_pay_by_wallet` | Wallet balance (:amount available) | საფულის ბალანსი (ხელმისაწვდომია :amount) |
| `t_pay_by_bank_transfer` | Bank transfer | საბანკო გადარიცხვა |
| `t_card_fee_line` | Card fee :percent% | ბარათით გადახდის საკომისიო :percent% |
| `t_amount_credited` | Amount added to your wallet | საფულეზე ჩასარიცხი თანხა |
| `t_total_to_pay` | Total to pay | გადასახდელი ჯამი |
| `t_quote_changed` | The total has changed to :total. Please confirm the new amount. | ჯამური თანხა შეიცვალა და შეადგენს :total-ს. გთხოვთ, დაადასტუროთ ახალი თანხა. |
| `t_payment_processing` | We are confirming your payment with the bank… | ბანკთან თქვენი გადახდის დადასტურება მიმდინარეობს… |
| `t_payment_still_processing` | Your payment is still being confirmed. We will notify you as soon as it is done. | თქვენი გადახდა ჯერ კიდევ დადასტურების პროცესშია. დასრულებისთანავე შეგატყობინებთ. |
| `t_payment_successful` | Payment successful | გადახდა წარმატებით შესრულდა |
| `t_try_again` | Try again | თავიდან ცდა |
| `t_top_up` | Top up | ბალანსის შევსება |
| `t_wallet_topped_up` | :amount has been added to your wallet. | თქვენს საფულეს დაემატა :amount. |
| `t_payment_credited_to_wallet` | Your payment of :amount could not be applied to :item, so it has been added to your wallet. | თქვენი გადახდა (:amount) ვერ მიებმა :item-ს, ამიტომ თანხა თქვენს საფულეს დაემატა. |
| `t_bank_transfer_instructions` | Transfer :amount to the account below and write :reference in the payment description. | გადმორიცხეთ :amount ქვემოთ მითითებულ ანგარიშზე და დანიშნულებაში მიუთითეთ :reference. |
| `t_awaiting_bank_transfer` | Awaiting bank transfer | ველოდებით საბანკო გადარიცხვას |
| `t_bank_transfer_rejected` | Your bank transfer for order :order was not confirmed. Reason: :reason | შეკვეთაზე :order თქვენი საბანკო გადარიცხვა ვერ დადასტურდა. მიზეზი: :reason |
| `t_hold_items_title` | Money on hold | დაბლოკილი თანხები |
| `t_auto_release_on_date` | Released automatically on :date | ავტომატურად ჩაირიცხება :date-ს |
| `t_no_transactions_yet` | No transactions yet. | ტრანზაქციები ჯერ არ არის. |
| `t_receipt` | Receipt | ქვითარი |
| `t_txn_type_card_payment` | Card payment | ბარათით გადახდა |
| `t_txn_type_wallet_payment` | Wallet payment | საფულით გადახდა |
| `t_txn_type_topup` | Top-up | ბალანსის შევსება |
| `t_txn_type_hold_funded` | Payment received on hold | თანხა დაიბლოკა შეკვეთაზე |
| `t_txn_type_released` | Released to available | ჩაირიცხა ხელმისაწვდომ ბალანსზე |
| `t_txn_type_refund` | Refund | თანხის დაბრუნება |
| `t_txn_type_cancellation` | Order canceled, money returned | შეკვეთა გაუქმდა, თანხა დაბრუნდა |
| `t_txn_type_withdrawal_requested` | Withdrawal requested | თანხის გატანის მოთხოვნა |
| `t_txn_type_withdrawal_paid` | Withdrawal paid | თანხა გადმოირიცხა |
| `t_txn_type_withdrawal_rejected` | Withdrawal rejected, money returned | თანხის გატანა უარყოფილია, თანხა დაბრუნდა |
| `t_txn_type_adjustment` | Balance correction | ბალანსის კორექტირება |
| `t_txn_type_unapplied_payment` | Unapplied payment | მიუბმელი გადახდა |
| `t_txn_type_opening_balance` | Opening balance (previous platform) | საწყისი ბალანსი (ძველი პლატფორმიდან) |
| `t_filter_by_type` / `t_date_range` | Filter by type / Date range | ტიპის მიხედვით ფილტრი / პერიოდი |
| `t_no_saved_cards` | You have no saved cards. | შენახული ბარათები არ გაქვთ. |
| `t_delete_card_renewal_warning` | This card is used to renew your Premium plan. If you delete it, your plan will not renew and will end on :date. | ეს ბარათი გამოიყენება თქვენი პრემიუმ პაკეტის განახლებისთვის. თუ მას წაშლით, პაკეტი არ განახლდება და დასრულდება :date-ს. |
| `t_promo_not_applicable` | Promo codes can only be used for platform services such as Premium. | პრომო კოდის გამოყენება შესაძლებელია მხოლოდ პლატფორმის სერვისებზე, მაგალითად პრემიუმზე. |
| `t_balance_adjusted` | Your balance was corrected by :amount. :note | თქვენი ბალანსი დაკორექტირდა :amount-ით. :note |
| `t_points_adjusted` | Your points were changed by :points. :note | თქვენი ქულები შეიცვალა :points-ით. :note |
| `t_adjustment_would_go_negative` | This correction would make the balance negative. | ეს კორექტირება ბალანსს უარყოფითს გახდის. |

NEW admin keys for the reconciliation report (AC-47; **PROPOSED P-135**; English first, Georgian alongside, Q-058). The menu label `t_admin_reconciliation` and the EV-32 email keys already exist (spec 16 Texts, spec 15 Texts).
| Key | en | ka |
|---|---|---|
| `t_admin_recon_run_day` | Day checked | შემოწმებული დღე |
| `t_admin_recon_status_ok` | No differences | განსხვავება არ არის |
| `t_admin_recon_status_differences` | Differences found | აღმოჩენილია განსხვავებები |
| `t_admin_recon_status_failed` | Run failed | შემოწმება ვერ შესრულდა |
| `t_admin_recon_not_available` | Not available | მიუწვდომელია |
| `t_admin_recon_no_runs` | No reconciliation runs yet. | შეჯერება ჯერ არ ჩატარებულა. |
| `t_admin_recon_expected` | Expected | მოსალოდნელი |
| `t_admin_recon_actual` | Actual | ფაქტობრივი |
| `t_admin_recon_gap` | Difference | სხვაობა |
| `t_admin_recon_unreviewed` | Not reviewed | განუხილველი |
| `t_admin_recon_mark_reviewed` | Mark as reviewed | განხილულად მონიშვნა |
| `t_admin_recon_reviewed` | Reviewed by :name on :date | განიხილა :name, :date |
| `t_admin_recon_review_note` | Review note | განხილვის შენიშვნა |
| `t_admin_recon_check_journal_sum` | Journal does not balance to zero | ჟურნალის ჩანაწერის ჯამი ნულის ტოლი არ არის |
| `t_admin_recon_check_account_balance` | Account balance differs from its entries | ანგარიშის ნაშთი არ ემთხვევა მის ჩანაწერებს |
| `t_admin_recon_check_books_total` | Ledger total is not zero | ლეჯერის საერთო ჯამი ნულის ტოლი არ არის |
| `t_admin_recon_check_escrow` | Escrow or HOLD balance is wrong | დაბლოკილი თანხის ნაშთი არასწორია |
| `t_admin_recon_check_user_totals` | User totals differ from the ledger | მომხმარებლის ჯამები არ ემთხვევა ლეჯერს |
| `t_admin_recon_check_withdrawals_payable` | Withdrawals payable differ from open withdrawal requests | გასატანი თანხა არ ემთხვევა ღია მოთხოვნებს |
| `t_admin_recon_check_card_payment` | Card payment differs from its ledger entry | ბარათით გადახდა არ ემთხვევა ლეჯერის ჩანაწერს |
| `t_admin_recon_check_bog_day_total` | Card payments of the day differ from BOG clearing | დღის ბარათით გადახდები არ ემთხვევა BOG-ის ანგარიშსწორებას |
| `t_admin_recon_check_bog_settlement` | BOG settlement report differs | BOG-ის ანგარიშსწორების ამონაწერი განსხვავდება |

## Edge cases
- EC-1 The buyer closes the BOG tab after paying: the callback or the background check confirms the payment (AC-10, AC-13); the item becomes paid and the buyer is notified by the item's own notification (e.g. `OrderPlaced`, spec 06).
- EC-2 The buyer pays, then the gig is edited or its price changes: the order keeps the price in its quote (spec 06).
- EC-3 BOG confirms an amount different from the quote: the payment is not applied; it stays for staff review in the payments list (alert to S-100). No automatic credit.
- EC-4 A wallet payment and a withdrawal are requested at the same moment for more than the balance: only the first to lock the balance succeeds (AC-20; spec 14).
- EC-5 S-019 Card is switched OFF while a buyer is on the BOG page: the payment still completes and is applied (00 EC-1).
- EC-6 The surcharge rounds to 0.00 for tiny amounts (below 0.20 GEL): no surcharge line is shown. Top-up minimum S-023 (1 GEL) makes this rare.
- EC-7 A user deletes their only saved card while a renewal is running: the running charge finishes; the next period does not renew (AC-35).
- EC-8 Bank transfer is switched OFF while orders are awaiting a transfer: staff can still confirm or reject them (00 EC-1).
- EC-9 A staff member posts the same adjustment twice by double click: the idempotency key makes it one journal (R-P4).
- EC-10 A migrated legacy BOG payment that was never marked paid: imported as history only; no money effect in the new platform.
- EC-11 (PROPOSED P-135) The worker is down at the S-128 time: when it is running again, it runs every run day that has no completed run yet, oldest first, each with its own result and its own EV-32 (AC-46).
- EC-12 (PROPOSED P-135) S-128 is changed: the next run uses the new time; a run day is never run twice and never skipped (AC-44, EC-11).
- EC-13 (PROPOSED P-135) The same broken balance persists for several days: each run lists it again and each such run sends its own EV-32; marking it reviewed (AC-47) does not silence later runs. Fixing it is a staff adjustment (AC-41) or a developer correction journal, never an edit by the reconciliation job.
- EC-14 (PROPOSED P-135) A card payment is verified just after midnight for a BOG payment made before midnight: it belongs to the run day of its verification time (C-7, C-8); if the BOG settlement report (C-9) puts it on the other day, that difference is listed like any other and staff can mark it reviewed.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-05-1 | BOG OAuth credentials hard-coded (R-001) | `BogPayment.php:133` | AC-16 (`.env` only, Q-042) |
| D-05-2 | Return URL trusted, no status check, not idempotent: free top-ups, repeated HOLD credits (R-004) | `PaymentBogController.php:31-95, 180-203` | AC-10, AC-11, AC-14 |
| D-05-3 | `callback_url` points to a route that does not exist | `BogPayment.php:14, 69` | AC-10, AC-13 (callback + reconciliation) |
| D-05-4 | Dummy BOG payload (discount 7, delivery 5, basket `product123`) | `BogPayment.php:23-33` | AC-16 |
| D-05-5 | Double card fee: hard-coded 2.5% on top of the configured gateway fee | `UnifiedCheckoutComponent.php:255-262`; `CheckoutComponent.php` (BR-032) | AC-6, R-P5 (Q-070) |
| D-05-6 | "Send 0.01 GEL" test switch available through config in any environment | `config/bog.php:9`, `BogPayment.php:22`, `DepositComponent.php:721` | AC-17 |
| D-05-7 | Card top-up recorded without `user_id`, so it never appears in the user's history | `PaymentBogController.php:191-199` | AC-23, AC-31 |
| D-05-8 | Top-up limits compared with the fee-inclusive amount | `DepositComponent.php:649-703` | AC-22 (P-39) |
| D-05-9 | Custom-offer payment (wallet and card) never funds the freelancer's HOLD | `UnifiedCheckoutComponent.php:606-646`; `PaymentBogController.php:97-126` | AC-18 (details spec 12) |
| D-05-10 | Card-paid project adds the amount to the **client's** pending balance (R-012) | `PaymentBogController.php:136-141` | AC-29 |
| D-05-11 | Balances as text with float maths and non-atomic updates (R-017) | e.g. `PaymentBogController.php:185-187`, `UnifiedCheckoutComponent.php:621-623` | AC-20, ADR-003 |
| D-05-12 | Bank-transfer approval overwrites "used for purchases" with the order total | `Admin/Invoices/InvoicesComponent.php:75-79` | R-P7 (derived counter) |
| D-05-13 | Staff type balances directly (X-19) | `Admin/Users/Options/EditComponent.php:228` | AC-41, AC-42 (P-12) |
| D-05-14 | Exchange-rate stubs and multi-currency code paths | `UnifiedCheckoutComponent.php:364-413`, `DepositComponent.php:433-470` | R-P13 (GEL only, P-13) |
| D-05-15 | Tax line (X-10) and 28 foreign gateways with `WebhookPaymentFailed` (X-07) | `UnifiedCheckoutComponent.php:121-154`; callback controllers | removed (Q-007, Q-016) |

## Out of scope
- Refund requests and disputes (spec 13), gig order flows (spec 06), project payments (spec 11), custom offers (spec 12), subscriptions and promo codes (spec 09), withdrawals (spec 14).
- Refunds back to the card (Q-010: refunds go to the wallet; the provider method exists but is unused, ADR-004).
- PDF invoices / fiscal receipts (legacy had none).
- Split payments (part wallet, part card) and other gateways (X-07).
- Admin screens themselves (spec 16): this spec defines their rules.

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-38 Surcharge base.** The 2.5% card fee is computed once per checkout on everything the buyer pays before the fee (item prices plus any buyer-paid fee from the Commission & Fee module), rounded half up. Today there are no buyer fees, so the base is the price, exactly as legacy. (Legacy computed it on the subtotal; for custom offers the subtotal already included the buyer fee.)
- **P-39 Top-up limits on the credited amount.** S-023/S-024 are checked against the amount that reaches the wallet, not against amount + card fee (legacy compared the fee-inclusive total, so a 1.00 GEL top-up was refused unless the fee pushed it over the minimum).
- **P-40 Payments that arrive for an item that can no longer take them.** When BOG confirms a payment for an order that the buyer deleted, an offer that expired, or an item already paid another way, the full amount charged (including the card fee) goes to the buyer's wallet as "Unapplied payment", the buyer is notified and staff see it. Nothing is lost and nothing is applied twice.
- **P-41 Staff corrections are visible to the user.** A balance correction or points change appears in the user's history with a public note (the internal reason stays staff-only), and the user gets an in-app notification.
- **P-42 Bank transfer when switched ON.** Scope as legacy: gig orders and top-ups only, no card fee. Staff confirm or reject; a rejection needs a reason and tells the buyer (legacy had no reject for order invoices). The bank details shown to the buyer come from a new admin text setting **S-125 `payments.bank_transfer.instructions`** (localized text, ka/en, default empty; register row added to spec 00; legacy kept them in the offline gateway settings).
- **P-43 Top-up confirmation.** The user gets an in-app (and push) notification when a top-up is credited. Legacy sent nothing and redirected to the home page.
- **P-44 Balance figures.** Net income = money released to the user as a freelancer (from the ledger) plus the migrated legacy `balance_net` value (a column legacy only changed by admin edit). Used for purchases = what the user paid for gig orders, project payments and custom offers, card fee excluded, refunds not deducted (legacy meaning). Transactions replace the legacy deposit history with one list of every movement.
- **P-45 Deleting the renewal card.** Deleting the saved card used for Premium auto-renewal shows a warning; after deletion the plan does not renew and ends on its end date (legacy: the renewal would fail and cancel the plan silently).

Added after approval (2026-09-29, parity gap G-1) — **PROPOSED, awaiting Owner sign-off at the Phase 2 gate:**
- **P-135 Nightly money check.** Every night at 03:00 Georgian time (new admin setting **S-128 `ledger.reconciliation.run_time`**, register row added to spec 00 as PROPOSED) the system checks the previous day's books: every journal balances, every balance equals its entries, the books total 0, closed escrows are 0, users' Withdrawn / Used for purchases / Net income figures match, withdrawals payable match open withdrawal requests, each verified card payment matches its ledger entry, the day's card payments match BOG clearing, and, once BOG settlement reports are available, match those too. Any gap, even 1 tetri, is a difference. The check never changes money. If there is at least one difference, the admin recipients get one email per run with the count (EV-32); if the run fails, they get the system alert (EV-125). Staff with `payments.read` see every run and difference in Money → Reconciliation and can mark a difference "reviewed" with a note; it is reported again the next night while the cause remains. Missed nights are caught up, oldest first. (Legacy had no reconciliation; this makes ADR-003 §10 testable.)
