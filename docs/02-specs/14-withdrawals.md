# 14 — Withdrawals
Status: **approved** (Owner 2026-09-28; P-38…P-65 accepted)
Updated 2026-09-30 with Owner gate answers: Q-144 (24-hour withdrawal pause after an email, password or payout-details change, S-129; "details changed recently" flag for approvers; emailed code for accounts without a password: AC-3, AC-5, AC-6, AC-13, NEW AC-21…AC-23, R-W6, R-W9, EC-9…EC-12) and Q-113 (withdrawals list and detail need `withdrawals.approve`: AC-13). Follow-up question Q-151 (flag window, first save) has testable defaults.
Author: product-analyst (P2-A3) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-101; `routes-and-pages.md` (`/seller/withdrawals`, `/seller/withdrawals/create`, `/seller/withdrawals/settings`, admin `/dashboard/withdrawals`); `notifications.md` (withdrawal rows); `integrations.md` (payouts); `risks-and-debt.md` R-017. Owner decisions: Q-002, Q-004, Q-006, Q-029, Q-039, Q-048, Q-068. Platform rules: `00-platform-rules.md` §3 (Withdrawn, withdrawal fee), R-3.6, R-3.8, §4.2 (S-010, S-011), §4.6 (S-031…S-033), §4.18 (one pending withdrawal), EC-6, EC-7, AC-16, X-07. Specs: 02 AC-33 (account deletion), 05 (balances, transactions, R-P8), 09 (plan). ADR-003, ADR-004 §1 (`PayoutProvider`), ADR-005.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-62…P-65, see "Open questions").

Legacy code traced for this spec (read-only):
- **Payout settings** `app/Livewire/Main/Seller/Withdrawals/SettingsComponent.php:30-190`: one record per user; PayPal (disabled, `config/payouts.php:5-11`) or "offline" = **free text** (`offline_info`, no validation, `app/Http/Validators/Main/Seller/Withdrawals/SettingsValidator.php:26-28`); hint `t_payouts_detail_pl` (bank account number, owner name must match the user).
- **Request** `app/Livewire/Main/Seller/Withdrawals/CreateComponent.php:569-803`: amount regex `^\d+(\.\d{1,2})?$`, ≤ 20 chars (`MakeValidator.php:26`); no payout settings → redirect to settings `:580-588`; amount > available → `t_withdrawal_money_not_enough` `:600-616`; a pending request exists → `t_cant_withdraw_reason_pending_request` `:620-630`; period measured from the **creation time of the latest paid** request: daily 24h, weekly 168h, monthly 720h `:634-692`; below minimum → `t_cant_withdraw_reason_min_amount` `:696-714`; fee only if `commission_from = withdrawals`, one global percent or fixed value for everyone `:718-762`; stored `amount = requested − fee`, `fee` `:766-780`; user `balance_withdrawn += requested`, `balance_available −= requested`, non-atomic `:784-790`; emails `Admin/PendingWithdrawal` (first admin) and `User/Seller/PendingWithdrawal` `:794-798`.
- **Admin** `app/Livewire/Admin/Withdrawals/WithdrawalsComponent.php`: list 42 per page `:55`; approve = mark `paid` (manual transfer), `PaymentApproved` + in-app `t_withdrawal_amount_paid` `:67-108` (notification sent before the status is saved); reject = `rejected`, returns amount + fee to available and removes it from withdrawn, `PaymentRejected` + `t_withdrawal_amount_rejected`, **no reason** `:118-164`.
- **Settings** `app/Livewire/Admin/Settings/WithdrawalComponent.php` (`settings_withdrawal`: min amount, period). Plans page promises Standard 10% / Premium 0% (`SubscriptionComponent.php:69-72`) but the code applies one fee to all (Q-004).

---

## Goal
Let freelancers move their Available balance to their bank account: they request an amount, the platform fixes the fee by plan at that moment (Standard 10%, Premium 0%), staff pay it by bank transfer and mark it paid, or reject it and return the money. The design is ready for BOG Payout to replace the manual step later (Q-029).

## Roles involved
- **Freelancer** (any user with an Available balance): payout details, withdrawal requests, history.
- **Premium user**: 0% fee (S-011) at the time of the request.
- **Staff** (Financial Manager / Super-admin): mark paid, reject (spec 16 permission `withdrawals.approve`).
- **System / payout provider**: `manual` now, `bog_payout` later (S-033).

## User stories
- As a freelancer, I want to save my bank details once, so that every withdrawal goes to the right account.
- As a freelancer, I want to see the fee and the exact amount I will receive before I confirm.
- As a Premium freelancer, I want my 0% fee to apply to the requests I make while I am Premium.
- As a freelancer, I want to know when my money was sent, or why it was refused.
- As the Owner, I want to pay withdrawals by hand now and switch to BOG Payout later without changing the user flow.

## Acceptance criteria

### Payout details (Q-029)
- AC-1 Given a user opens Payout settings (`/seller/withdrawals/settings`; mobile Selling → Withdrawals → Payout details), When they save the account holder's full name (required, 3–100 chars) and an IBAN, Then the IBAN is accepted only if it is a valid Georgian IBAN (starts with `GE`, 22 characters, correct check digits; spaces ignored) and the details are stored for payouts. The hint `t_payouts_detail_pl` is shown (holder name must match the user's name). (CHANGE, ACCEPTED P-62; legacy free text)
- AC-2 Given a migrated user whose legacy details are free text, When they open Payout settings, Then the old text is shown read-only as "Previous details" and stays usable for manual payouts until the user saves structured details. (ACCEPTED P-62)
- AC-3 Given a user saves new or changed payout details, When they confirm with their current password — or, for an account without a password (social login only), with a 6-digit code emailed to the account's **current** address (spec 15 EV-06; valid only for this purpose and only once; S-057/S-058 and the resend limits of spec 01 AC-27 apply) — Then the details are saved, the withdrawal pause of AC-21 starts, and the user gets the email `PayoutDetailsChanged` (to the account email) and an in-app notice. A wrong password shows `t_ur_current_pass_does_not_match`; a wrong or expired code shows `t_2fa_code_invalid` / `t_2fa_code_expired`, and nothing is saved. (NEW, ACCEPTED P-63; emailed code for accounts without a password **CHANGE** from "not asked", Owner 2026-09-30 Q-144 / SEC-05)
- AC-4 Given a user without payout details, When they open "Withdraw", Then they are sent to Payout settings with `t_add_payout_details_first`. (LEGACY `CreateComponent.php:580-588`)

### Requesting a withdrawal (BR-101, Q-004)
- AC-5 Given a user with payout details opens "Withdraw" (`/seller/withdrawals/create`), When the form loads, Then it shows the Available balance, the minimum S-031, the period rule S-032 in words, the fee for their plan right now (S-010 or S-011) and the payout details that will be used; during a security pause it shows the pause notice instead of the request button (AC-22). While they type an amount, the API returns the fee and "You will receive" (the client never computes them). (LEGACY form; live preview NEW, architecture §2)
- AC-6 Given the user submits an amount A, When it is checked, Then these rules apply in this order, each with its message: A must be a number with up to 2 decimals (`t_validator_regex`); A ≤ Available (`t_withdrawal_money_not_enough`); no other pending request (`t_cant_withdraw_reason_pending_request`); no security pause running (AC-21, `t_cant_withdraw_reason_security_pause`; NEW Q-144); at least 24h / 168h / 720h (S-032 daily / weekly / monthly) since the creation time of the user's latest paid request (`t_cant_withdraw_reason_period_24_hours` / `_7_days` / `_monthly`); A ≥ S-031 (default 10 GEL, `t_cant_withdraw_reason_min_amount`); the payout amount after the fee must be > 0 (`t_withdrawal_amount_too_low`). (LEGACY order and messages `CreateComponent.php:596-762`; last rule NEW for future fixed fees; security-pause rule NEW Owner 2026-09-30 Q-144)
- AC-7 Given all rules pass, When the request is created, Then in one step: status **pending**; fee F = the withdrawal fee rule for the user's plan at this moment (percent × A rounded half up, or a fixed amount if the rule is fixed), payout amount = A − F, the plan and the fee-rule version are stored on the request; A leaves the user's Available balance; Withdrawn increases by A; `Admin/PendingWithdrawal` goes to every S-100 recipient; the user gets `User/Seller/PendingWithdrawal` (email) and sees `t_ur_withdrawal_request_under_review`. (LEGACY; CHANGE Q-004 fee by plan; MM-14-01)
- AC-8 Given the default settings, When a Standard user requests 100.00 GEL, Then F = 10.00 and the payout is 90.00; a Premium user: F = 0.00, payout 100.00; a Standard user requesting 55.55 GEL: F = 5.56 (5.555 rounded half up), payout 49.99. (00 AC-16; R-3.8)
- AC-9 Given a request was created while the user was Standard, When they buy Premium before it is paid (or Premium ends before it is paid), Then the fee and payout stored on the request do not change. (00 EC-6, confirmed here)
- AC-10 Given the user sends two requests at the same moment (two tabs, double tap), When both arrive, Then only one is created; the other gets `t_cant_withdraw_reason_pending_request` (or `t_withdrawal_money_not_enough`). The balance never goes below 0. (CHANGE, fixes R-017)
- AC-11 Given a migrated negative or zero Available balance, When the user opens "Withdraw", Then the form explains that there is nothing to withdraw and the API refuses any amount. (00 EC-7, R-3.6)
- AC-12 Given a user with no ID verification, When they request a withdrawal, Then it is allowed; KYC is not required. (Q-048; spec 02 AC-40)

### Staff processing — manual payout (S-033 = manual, Q-004, Q-029)
- AC-13 Given staff with `withdrawals.approve` open Withdrawals in the admin panel, When the list loads, Then pending requests come first (oldest first) with user, amount requested, fee, payout amount, plan at request, payout details (holder, IBAN or previous text), date, status and the "details changed recently" flag (AC-23); filters by status and date; each row opens a detail with the user's recent transactions. Given a staff member without `withdrawals.approve` (for example only `payments.read`), When they request the withdrawals list or a withdrawal detail, Then the API answers 403 and no IBAN or holder name is returned. (LEGACY list; details NEW; permission Owner 2026-09-30 Q-113, closes SEC-08)
- AC-14 Given a pending request, When staff transfer the money by bank and press "Mark as paid" (optional bank reference and payout date), Then the status becomes **paid**, the ledger records the payout, the action is audit-logged, and the user gets `PaymentApproved` (email) and `t_withdrawal_amount_paid` (in-app + push). (LEGACY `WithdrawalsComponent.php:67-108`; MM-14-02)
- AC-15 Given a pending request, When staff press "Reject" and enter a reason (required, ≤ 500 chars), Then the status becomes **rejected**, the full amount A (including the fee) returns to the user's Available balance, Withdrawn decreases by A, the action is audit-logged, and the user gets `PaymentRejected` (email, with the reason) and `t_withdrawal_amount_rejected` (in-app + push, with the reason). (LEGACY refund amount + fee `:118-164`; reason ACCEPTED P-64; MM-14-03)
- AC-16 Given two staff members act on the same request at the same moment, When both press a button, Then only the first action applies; the second gets `t_withdrawal_already_processed`. (CHANGE, compare-and-set)

### BOG Payout readiness (Q-029) — NEW, not active at launch
- AC-17 Given S-033 = `bog_payout` (selectable only when the integration exists), When a request is created, Then the platform sends it to the payout provider and the status becomes **processing**; when the provider confirms, it becomes **paid** (same effects as AC-14 with the provider reference); when the provider reports a failure, it becomes **rejected** with the reason "payout failed" and the money returns as in AC-15. Users see the same screens and notifications. Staff can still reject a request before it is sent. (NEW Q-029; ADR-004 §1 `PayoutProvider`)

### History (user side)
- AC-18 Given a user opens Withdrawals (`/seller/withdrawals`; mobile Selling → Withdrawals), When it loads, Then it shows a "Withdraw" button and the history, newest first: date, amount requested, fee, payout amount, status (Pending, Processing, Paid, Rejected), the rejection reason, and the paid date/reference when paid. Empty: `t_no_withdrawals_yet`. (LEGACY history; columns NEW)
- AC-19 Given any withdrawal event, When the user opens Transactions (spec 05 AC-31), Then "Withdrawal requested", "Withdrawal paid" and "Withdrawal rejected, money returned" appear with their amounts. (spec 05)
- AC-20 Given a user with a pending or processing withdrawal, When they choose "Delete account", Then it is refused with `t_cannot_delete_account_pending_withdrawal`. (ACCEPTED P-65; adds to spec 02 AC-32/AC-33)

### Security pause after account changes (NEW, Owner 2026-09-30 Q-144; SEC-05, SEC-06)
- AC-21 Given S-129 `withdrawals.security_change_pause_hours` = 24 (default) and a "security change" of the user's account at time T — the new email became active (spec 02 AC-30, also when the change was started by staff, spec 16 AC-32), the password was changed or reset (spec 01 AC-33, AC-35), or payout details were saved (AC-3, including the first save, Q-151 default) — When the user submits a withdrawal request before T + 24 h, Then no request is created and the API refuses it with `t_cant_withdraw_reason_security_pause` giving the date and time T + 24 h (Georgian time, UTC+4); When they submit it at or after T + 24 h, Then the rules of AC-6 apply as usual. With several changes, T is the latest one. The pause is checked at request time with the current S-129 value; S-129 = 0 means no pause. (NEW Q-144)
- AC-22 Given a user inside the pause of AC-21, When they open "Withdraw" (web or mobile), Then the form shows `t_cant_withdraw_reason_security_pause` with the end date and time, the "Request withdrawal" button is disabled, and the fee preview is still available; after the end time a reload shows the normal form. (NEW Q-144)
- AC-23 Given staff with `withdrawals.approve` open the withdrawals list or a withdrawal detail, When the user had a security change (AC-21) in the 7 days before the request was created, or at any time after it was created while it is still pending or processing, Then the row and the detail show the flag `t_admin_details_changed_recently` with the kind(s) of change (`t_admin_security_change_email` / `_password` / `_payout_details`) and the date of the latest one; otherwise no flag is shown. The detail always lists the date of the latest change of each kind, or `t_admin_security_change_none`. The flag is information only: it does not block "Mark as paid" or "Reject". (NEW Q-144 option (d); 7-day window = analyst default, Q-151)

---

## Business rules
- R-W1 **Fee by plan** (Q-004, S-010, S-011): the plan is read when the request is created (R-2.1); the fee rule (percent or fixed, via the Commission & Fee module) is applied and stored with its version; later plan or fee changes do not touch the request (00 AC-9, EC-6).
- R-W2 **Amounts**: A in GEL with up to 2 decimals; F rounded half up to the tetri (R-3.8); payout = A − F > 0.
- R-W3 **Limits** (LEGACY, S-031, S-032): A ≥ S-031; A ≤ Available; one pending (or processing) request per user (00 §4.18); period since the creation time of the latest **paid** request (24h / 168h / 720h). Rejected requests do not count for the period.
- R-W4 **Balances** (00 §3): at request, A leaves Available and is added to Withdrawn (includes pending requests, LEGACY meaning); rejection returns A to Available and removes it from Withdrawn; payment changes neither.
- R-W5 **Statuses**: pending → paid | rejected (manual); pending → processing → paid | rejected (provider, future).
- R-W6 **Payout details** (P-62): holder name + Georgian IBAN; migrated free text allowed for manual payouts until replaced; changes need the password, or an emailed code for accounts without a password (Q-144 / SEC-05), and trigger an email notice (P-63). The details used are copied onto each request.
- R-W9 **Security pause** (NEW, Q-144, S-129): no new request for S-129 hours (default 24) after the latest email, password or payout-details change, by the user or started by staff; approvers see a "details changed recently" flag (AC-21…AC-23). Requests created before the change are not paused; they carry the flag instead.
- R-W7 **Provider** (S-033, Q-029): `manual` at launch; `bog_payout` plugs in behind the same statuses and notifications.
- R-W8 **No KYC requirement** (Q-048).

## Money movements (ledger map for ADR-003 / P2-B2)
"A" = amount requested; "F" = fee stored on the request; payout = A − F.

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-14-01 | Request created (AC-7) | `user:{id}:available` → `platform:withdrawals_payable` | A − F | `withdrawal:{id}:request` |
| | | `user:{id}:available` → `platform:fee_revenue:withdrawal` | F (0 for Premium by default) | same |
| MM-14-02 | Marked paid by staff, or provider confirms (AC-14, AC-17) | `platform:withdrawals_payable` → `platform:payout_clearing` (bank / BOG Payout settlement) | A − F | `withdrawal:{id}:paid` |
| MM-14-03 | Rejected by staff, or provider failure (AC-15, AC-17) | `platform:withdrawals_payable` → `user:{id}:available` | A − F | `withdrawal:{id}:reject` (never together with `:paid`) |
| | | `platform:fee_revenue:withdrawal` → `user:{id}:available` | F | same |

The Withdrawn counter is derived from MM-14-01 minus MM-14-03 (ADR-003 §3). `platform:payout_clearing` may be the architect's "bank settlement" account (ADR-003 §3 example).

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Withdrawals (history) | `/seller/withdrawals`: balance tiles (Available, Withdrawn), "Withdraw" button, history table | Selling → Withdrawals: tiles + list | empty; loading; error; success |
| Withdraw form | `/seller/withdrawals/create`: amount field, live breakdown (fee, you will receive), payout details summary, rules text | same; numeric keypad; sticky "Request withdrawal" bar | refused with the rule message (AC-6); nothing to withdraw (AC-11); security pause notice with end time, button disabled (AC-22); submitting; success toast `t_ur_withdrawal_request_under_review` |
| Payout settings | `/seller/withdrawals/settings`: holder name, IBAN, password confirm (accounts without a password: "Send code" + 6-digit code field, `t_confirm_with_email_code`), previous details (read-only) | same; code field with numeric keypad and paste support | validation errors (IBAN); wrong password / wrong or expired code; saved toast |
| Admin withdrawals (spec 16, `withdrawals.approve` only) | list with filters and the "details changed recently" flag, detail with the latest change dates, "Mark as paid" (reference, date), "Reject" (reason) | – | processed-by-other conflict (AC-16); 403 without `withdrawals.approve` |

Accessibility: the fee and payout lines are text with labels; the IBAN field accepts spaces and shows the formatted value.

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `Admin/PendingWithdrawal` (`t_subject_admin_pending_withdrawal`) | email | all S-100 | request created (AC-7) | LEGACY, CHANGE recipients Q-026 |
| `User/Seller/PendingWithdrawal` (`t_subject_seller_pending_withdrawal`) | email | user | request created (AC-7) | LEGACY |
| `User/Everyone/PaymentApproved` (`t_subject_everyone_payment_approved`) + `t_withdrawal_amount_paid` | email + in-app + push | user | marked paid / provider paid (AC-14, AC-17) | LEGACY (push NEW) |
| `User/Everyone/PaymentRejected` (`t_subject_everyone_payment_rejected`) + `t_withdrawal_amount_rejected` | email + in-app + push | user | rejected / provider failed (AC-15, AC-17) | LEGACY; reason added (P-64) |
| `PayoutDetailsChanged` (`t_subject_payout_details_changed`) + `t_payout_details_changed` | email + in-app | user | payout details saved or changed (AC-3) | **NEW, ACCEPTED P-63** |
| Re-authentication code, spec 15 EV-06 `TwoFactorCode` (`t_2fa_email_subject`) | email only | user without a password (current address) | "Send code" on Payout settings (AC-3) | NEW purpose on an existing NEW event (Q-144 / SEC-05) |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_withdrawals` | Withdrawals | განაღდება |
| `t_withdrawal` | Withdrawal | განაღდება |
| `t_withdraw_funds` | Withdraw funds | თანხის გატანა |
| `t_withdrawals_history` | Withdrawals history | თანხის გატანის ისტორია |
| `t_withdrawal_settings` | Withdrawal settings | თანხის გატანის პარამეტრები |
| `t_withdrawal_fee` | Withdrawal fee | თანხის გატანის საკომისიო |
| `t_payouts_detail_pl` | Please provide us with your bank account number. Note that the account owner's first and last name must match the user's data. | გთხოვთ მოგვაწოდოთ თქვენი ბანკის ანგარიშის ნომერი. გაითვალისიწინეთ, რომ ანგარიშის მფლობელის სახელი და გვარი  უნდა ემთხვეოდეს მომხმარებელის მონაცემებს! |
| `t_withdrawal_money_not_enough` | You do not have this amount in your account, please try again | თქვენ არ გაქვთ ეს თანხა თქვენს ანგარიშზე, გთხოვთ სცადოთ ხელახლა |
| `t_cant_withdraw_reason_pending_request` | You cannot withdrawal right now because you have a pending withdrawal request | თქვენ ვერ გაიტანთ თანხას ანგარიშდან, რადგან თქვენ უკვე მოთხოვნილი გაქვთ თანხის გატანა |
| `t_cant_withdraw_reason_min_amount` | The minimum amount you can withdraw from your account is :amount | გასატანი თანხის მინიმალური რაოდენობა :amount |
| `t_cant_withdraw_reason_period_24_hours` | You can make only one withdrawal per day. Please try again later | თანხის გატანა შესაძლებელია მხოლოდ დღეში ერთხელ. გთხოვთ სცადოთ მოგვიანებით |
| `t_cant_withdraw_reason_period_7_days` | You can make only one withdrawal per week. Please try again later | თანხის გატანა შესაძლებელია მხოლოდ კვირაში ერთხელ. გთხოვთ სცადოთ მოგვიანებით |
| `t_cant_withdraw_reason_period_monthly` | You can make only one withdrawal per month. Please try again later | თანხის გატანა შესაძლებელია მხოლოდ თვეში ერთხელ. გთხოვთ სცადოთ მოგვიანებით |
| `t_ur_withdrawal_request_under_review` | Your withdrawal request is currently under review | თანხის გატანის მოთხოვნა განხილვის პროცესშია |
| `t_withdrawal_amount_paid` | Your recent withdrawal has been approved | თანხის გატანის მოთხოვნა დამტკიცებულია |
| `t_withdrawal_amount_rejected` | Your recent withdrawal has rejected | თანხის გატანის მოთხოვნა უარყოფილია (the NEW reason is appended via `t_rejection_reason_value`) |
| `t_payment_approved_successfully` | Payment has been successfully approved | გადახდა წარმატებით დადასტურდა |
| `t_available_balance` / `t_withdrawn` / `t_amount` / `t_date` / `t_status` / `t_rejection_reason` | see 00 / 05 / 04 | see 00 / 05 / 04 |
| Email subjects in "Notifications" (legacy ones) | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_payout_details` | Payout details | გადარიცხვის რეკვიზიტები |
| `t_account_holder_name` | Account holder name | ანგარიშის მფლობელის სახელი და გვარი |
| `t_iban` | IBAN | IBAN (ანგარიშის ნომერი) |
| `t_iban_invalid` | Enter a valid Georgian IBAN (GE + 20 characters). | შეიყვანეთ სწორი ქართული IBAN (GE + 20 სიმბოლო). |
| `t_previous_payout_details` | Previous details (from the old platform) | წინა რეკვიზიტები (ძველი პლატფორმიდან) |
| `t_confirm_with_password` | Enter your current password to confirm | დასადასტურებლად შეიყვანეთ მიმდინარე პაროლი |
| `t_add_payout_details_first` | Add your payout details before requesting a withdrawal. | თანხის გატანის მოთხოვნამდე დაამატეთ გადარიცხვის რეკვიზიტები. |
| `t_payout_details_changed` | Your payout details were changed. If this was not you, contact support immediately. | თქვენი გადარიცხვის რეკვიზიტები შეიცვალა. თუ ეს თქვენ არ გაგიკეთებიათ, დაუყოვნებლივ დაუკავშირდით მხარდაჭერას. |
| `t_subject_payout_details_changed` | Payout details changed | გადარიცხვის რეკვიზიტები შეიცვალა |
| `t_you_will_receive` | You will receive | თქვენ მიიღებთ |
| `t_fee_for_your_plan` | Fee for your plan (:plan): :percent% | საკომისიო თქვენი პაკეტისთვის (:plan): :percent% |
| `t_withdrawal_rules_text` | Minimum :min. One withdrawal per :period. One request at a time. | მინიმუმ :min. თანხის გატანა :period ერთხელ. ერთდროულად მხოლოდ ერთი მოთხოვნა. |
| `t_period_day` / `t_period_week` / `t_period_month` | day / week / month | დღეში / კვირაში / თვეში |
| `t_withdrawal_amount_too_low` | The amount after the fee must be more than 0. | საკომისიოს გამოკლების შემდეგ თანხა 0-ზე მეტი უნდა იყოს. |
| `t_nothing_to_withdraw` | You have no available balance to withdraw. | გასატანი ხელმისაწვდომი ბალანსი არ გაქვთ. |
| `t_request_withdrawal` | Request withdrawal | თანხის გატანის მოთხოვნა |
| `t_status_processing` | Processing | მუშავდება |
| `t_status_paid` | Paid | გადარიცხულია |
| `t_rejection_reason_value` | Reason: :reason | მიზეზი: :reason |
| `t_paid_on_reference` | Paid on :date (ref. :reference) | გადარიცხულია :date-ს (რეფ. :reference) |
| `t_no_withdrawals_yet` | You have not requested any withdrawals yet. | თანხის გატანა ჯერ არ მოგითხოვიათ. |
| `t_withdrawal_already_processed` | This request has already been processed. | ეს მოთხოვნა უკვე დამუშავებულია. |
| `t_mark_as_paid` | Mark as paid | გადარიცხულად მონიშვნა |
| `t_bank_reference` | Bank reference | საბანკო რეფერენსი |
| `t_cannot_delete_account_pending_withdrawal` | You cannot delete your account while a withdrawal is pending. | ანგარიშის წაშლა შეუძლებელია, სანამ თანხის გატანის მოთხოვნა განიხილება. |

NEW keys added 2026-09-30 (Owner gate answer Q-144; English first, Georgian alongside, Q-058). The code-confirmation texts reuse spec 01 keys (`t_confirm_with_email_code`, `t_2fa_resend_code`, `t_2fa_code_invalid`, `t_2fa_code_expired`).
| Key | en | ka |
|---|---|---|
| `t_cant_withdraw_reason_security_pause` | For your security, withdrawals are paused until :datetime because your email, password or payout details were changed recently. | უსაფრთხოების მიზნით, თანხის გატანა შეჩერებულია :datetime-მდე, რადგან ცოტა ხნის წინ შეიცვალა თქვენი ელ-ფოსტა, პაროლი ან გადარიცხვის რეკვიზიტები. |
| `t_admin_details_changed_recently` (staff) | Details changed recently: :changes (:date) | მონაცემები ახლახან შეიცვალა: :changes (:date) |
| `t_admin_security_change_email` (staff) | email | ელ-ფოსტა |
| `t_admin_security_change_password` (staff) | password | პაროლი |
| `t_admin_security_change_payout_details` (staff) | payout details | გადარიცხვის რეკვიზიტები |
| `t_admin_security_change_none` (staff) | No changes recorded | ცვლილებები არ დაფიქსირებულა |
| `t_admin_security_last_changes` (staff) | Last changes | ბოლო ცვლილებები |

## Edge cases
- EC-1 The admin changes S-010 from 10% to 8% while a Standard request is pending: that request keeps 10%; new requests use 8% (AC-9, 00 AC-9).
- EC-2 The admin changes S-032 from daily to weekly: the next request is checked against the new period from the creation time of the latest paid request.
- EC-3 The latest request was rejected: it does not count for the period; only the latest **paid** request does, so the user may request again at once unless an earlier paid request is still inside the period.
- EC-4 The user changes payout details while a request is pending: the pending request keeps the details copied onto it; staff see both (AC-13) and the user received the change notice (AC-3).
- EC-5 Available is exactly the minimum (10 GEL) for a Standard user: payout 9.00, allowed.
- EC-6 A withdrawal is requested at the same moment as a wallet payment: whichever locks the balance first wins; the other is refused if the rest is not enough (spec 05 EC-4).
- EC-7 A user is banned with a pending request: staff decide (pay or reject); the request stays visible in the admin list.
- EC-8 Migrated legacy pending requests: imported as pending with their stored amount and fee (legacy `amount` = payout, `fee`), processed by staff as usual; migrated paid/rejected requests appear in history.
- EC-9 (Q-144) Migrated accounts: legacy stored no change times, so the migration itself is not a security change; the pause and the flag count only changes made on the new platform. Migrated free-text details shown as "Previous details" (AC-2) are not a change; the first structured save is (AC-21).
- EC-10 (Q-144) The user changes the IBAN while a request is pending: the pending request keeps the copied details (EC-4) and is not paused, but it now shows the flag (AC-23); a new request is paused until the change + S-129.
- EC-11 (Q-144) The admin changes S-129 from 24 to 48 hours: every later request is checked against the latest change + 48 h (the value at request time), including pauses already running.
- EC-12 (Q-144) A user changes the password at 10:00 and the email at 20:00: the pause ends 24 h after 20:00; the flag names both kinds with the latest date.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-14-1 | One global withdrawal fee for everyone; live page promises Premium 0% (Q-004) | `CreateComponent.php:718-762` vs `SubscriptionComponent.php:69-72` | AC-7, AC-8, R-W1 |
| D-14-2 | Pending check and balance update not atomic: two parallel requests possible (R-017) | `CreateComponent.php:620-630, 784-790` | AC-10 |
| D-14-3 | Rejection without a reason | `Admin/Withdrawals/WithdrawalsComponent.php:118-164` | AC-15 (P-64) |
| D-14-4 | Notification sent before the status is saved; two staff can process the same request | `WithdrawalsComponent.php:72-82, 123-133` | AC-16 (compare-and-set) |
| D-14-5 | Free-text payout details with no validation | `SettingsValidator.php:26-28` | AC-1 (P-62) |
| D-14-6 | Admin emails to the first admin only (X-18); PayPal payouts code (X-07) | `CreateComponent.php:794`; `config/payouts.php` | S-100 recipients; removed |

## Out of scope
- The BOG Payout integration itself (Q-029: design-ready only) and PayPal payouts (X-07).
- User-side cancellation of a pending request (not in legacy).
- Multiple payout accounts per user; payouts to cards.
- Admin screens themselves (spec 16).

## Open questions
Owner gate answers (2026-09-30): **Q-144** — 24-hour pause (S-129) plus the approver flag, and the emailed code for accounts without a password (AC-3, AC-21…AC-23); **Q-113** — the withdrawals list and detail need `withdrawals.approve` (AC-13). Still open for this slice: **Q-148** (card top-up cash-out rule) and the new **Q-151** (two details of the Q-144 flag and pause; the defaults written in AC-21 and AC-23 apply until the Owner answers, so the slice is not blocked).

Proposed items (all accepted by the Owner on 2026-09-28):
- **P-62 Structured bank details.** Payout details become two fields: account holder name and a validated Georgian IBAN (legacy: one free-text box). This prevents payouts to mistyped accounts and is what BOG Payout needs later (Q-029). Migrated free-text details stay visible and usable for manual payouts until the user saves structured details.
- **P-63 Protecting payout details.** Changing payout details needs the current password and sends an email and in-app notice ("if this was not you, contact support"), because a hijacked account's first move is usually to change where money goes.
- **P-64 Reject reason.** Staff must enter a reason when rejecting a withdrawal; the user sees it in the email, the notification and the history (legacy rejected with no explanation).
- **P-65 Account deletion.** Deleting an account is refused while a withdrawal is pending or processing (the money has already left Available, so the balance check of spec 02 AC-33 does not catch it).
