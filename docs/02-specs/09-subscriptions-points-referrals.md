# 09 — Subscriptions, points, referrals and promo codes
Status: **approved** (Owner 2026-09-28; P-38…P-65 accepted)
Author: product-analyst (P2-A3) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-110…BR-115, BR-001; `routes-and-pages.md` (`/subscription`, `/subscription/subscribe/{plan}`, `/subscription/purchase-with-points`, `/account/my-subscription`, `/account/referrals`, `/account/cards`, Filament `/console` subscriptions, plans, referral code benefits); `notifications.md` (subscription rows); `risks-and-debt.md` R-006, R-041. Owner decisions: Q-016, Q-017, Q-018, Q-019, Q-020, Q-021, Q-052, Q-053, Q-064, Q-066, Q-069, Q-070, Q-081. Platform rules: `00-platform-rules.md` §2 (plans), R-2.1, R-2.5, R-3.9, §4.1 (S-001…S-009), §4.9 (S-042…S-051), §4.18, P-10. Specs: 01 AC-6/AC-7/AC-38/EC-1 (referral capture), 03 AC-17/AC-18 (badge and boost), 05 (payments, AC-40, MM-05-xx, PM-05-xx), 11 (Premium gate). ADR-003 §9, ADR-004 §6, ADR-008, ADR-016.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-57…P-61, see "Open questions").

Legacy code traced for this spec (read-only):
- **Plans page** `app/Livewire/Main/Subscription/SubscriptionComponent.php`: monthly/yearly toggle `:35-54`; withdrawal fee text **hard-coded** "0%" for Premium, "10%" otherwise `:69-72`; points price **hard-coded 100** for monthly Premium `:88`; yearly savings % `:139-150`; buttons by current subscription `:98-123`. Plans seeded in `SubscriptionPlanSeeder.php` (9.99 / 99.99 GEL, features lists).
- **Subscribe by card** `app/Http/Controllers/SubscriptionController.php:22-53`: refuses if already subscribed to the same plan (`SubscriptionService::isAlreadySubscribed` `:217-224`); stores plan and period **in the session** `:38-39`; creates the BOG order and calls "save card" **before** payment `:42-45`; activation in `PaymentBogController.php:211-251` → `SubscriptionService::processSubscription` `:97-114`, which reads the **session** (`validateSubscriptionData` `:139-168`, R-041); stores the masked card `:62-88`; period = now + 1 month/year `:177-206`. No surcharge (plan price only, `buildPaymentConfig` `:265-274`).
- **Points purchase** `app/Http/Controllers/Main/SubscriptionController.php:19-78` (`POST /subscription/purchase-with-points`, `routes/web.php:999`): deducts the **client-sent** `points` (min 1) (R-006) `:21-50`; refused when any active subscription exists `:33-40`; always 1 month `:83-108`; `SubscriptionConfirmation` sent **twice** (`:60` and `:106`); points spend only written to the log file `:113-116`.
- **Renewal** `app/Console/Commands/ProcessSubscriptionPayments.php` (every minute): ended and not canceled subscriptions `:51-57`; `cancels_at` set → finalise cancellation `:78-82`; otherwise charge the saved card with BOG's `…/orders/:parent_order_id/subscribe` (repeats the parent order, `config/bog.php:13`, `BogPayment::offlinePayment` `:59-84`) `:95-124`; "success" guessed from the response (`id` present) `:149-170`; success → new period **from now** `:194-218`, email forced to Georgian `:215`; failure → subscription canceled **silently** `:220-230`. No reminder.
- **Cancel** `app/Livewire/Main/Account/Subscription/MySubscriptionComponent.php:41-62`: `cancels_at = ends_at`, Premium stays until then, `SubscriptionCancelled` email. No resume.
- **Premium check** `app/Models/User.php:326-334` (not canceled and `ends_at` in the future, cached 60 s; BR-113).
- **Admin (Filament)** `app/Filament/Resources/SubscriptionResource.php`: create (gift) for a user without an active subscription `:127-260`; cancel = immediate end `:108-119`; no notifications.
- **Points** `app/Models/User.php:415-436` (`addPoints` / `deductPoints`, balance column only).
- **Referrals** register `app/Livewire/Main/Auth/RegisterComponent.php:257-296` (pending referral), credit on email verification `app/Livewire/Main/Auth/VerifyComponent.php:78-92` or at once when verification is off `RegisterComponent.php:203-205`: referral verified, `ReferralEarning`, **+10 points hard-coded** `:290` (`app/Enums/ReferralEventType.php:16-21`), referral-code benefit applied. **Accounts activated by an admin are never credited** (no referral code in `app/Livewire/Admin`). Referral page `app/Livewire/Main/Account/Referrals/ReferralsComponent.php:28-139` (code, link `/auth/register?ref=CODE`, stats, 10 recent referrals).
- **Referral code benefits** `app/Models/ReferralCodeBenefit.php:9-37`, `app/Services/Referral/ReferralBenefitService.php:12-43`: an active benefit whose `code` equals the referral code used gives the new user `premium_duration_months` of Premium.

---

## Goal
Sell and manage the Premium plan (monthly 9.99 GEL, yearly 99.99 GEL, both editable) by BOG card on web and in the mobile app, or with points for one month; renew it automatically on the saved card with a reminder 3 days before; let users cancel. Keep a proper points ledger (10 points per verified referral, more events later), referral codes and links, and add admin promo codes that discount Premium only.

## Roles involved
- **User** (any): views plans, buys Premium (card or points), cancels/resumes, invites others, redeems promo codes.
- **Premium user**: proposals (Q-020), Featured badge and ranking boost (Q-069, spec 03), and the other §2 perks of spec 00.
- **Referrer / referred user**.
- **Staff** (Super-admin / Financial Manager / Customer Support per spec 16): plan prices and limits, gift/cancel subscriptions, promo codes, referral-code benefits, points adjustments (spec 05 AC-43).
- **System**: renewal charges, reminders, expiry.

## User stories
- As a freelancer, I want to buy Premium by card on the website or in the app, so that I can send proposals and appear higher in lists.
- As a user with 100 points, I want to get a month of Premium for my points.
- As a subscriber, I want to be reminded 3 days before my card is charged again, so that I can cancel in time (Q-019).
- As a subscriber, I want to cancel auto-renewal and keep Premium until the end of the period I paid for.
- As a user, I want to invite friends with my code and earn points when they join.
- As the Owner, I want promo codes with a percentage or fixed discount, one use per user and a total cap, that only discount Premium (Q-053, Q-064).

## Acceptance criteria

### Plans page (`/subscription`; mobile Account → Premium)
- AC-1 Given anyone opens the plans page, When it loads, Then it shows Standard and Premium side by side with a Monthly / Yearly switch (`t_billing_monthly` / `t_billing_yearly`): Premium price from S-008 (monthly) or S-009 (yearly); for yearly also the monthly equivalent and the saving in % compared with 12 × monthly; each plan's feature list (editable content, 00 R-2.6); each plan's withdrawal fee read from S-010 / S-011 (not hard-coded); and, for monthly Premium, the points price S-045 and the user's points balance. (LEGACY layout; CHANGE: fee and points values from settings, legacy hard-coded `SubscriptionComponent.php:69-72, :88`)
- AC-2 Given the viewer's state, When the Premium card is shown, Then: guests see "Subscribe" leading to login; users without active Premium see "Subscribe" (`t_buy_subscribe`) and, for monthly, "Buy with points"; users with active Premium see "Active until :date" (`t_subscription_active_until`) and a link to My subscription. Standard has no button. (LEGACY `:98-123`)

### Buying Premium by card — web and mobile (Q-019, Q-070, Q-081)
- AC-3 Given a user without active Premium chooses a period and presses "Subscribe", When the Premium checkout opens, Then it shows plan, period, price, a promo-code field (AC-27…AC-33), the total, **no card fee** (Q-070), the payment method "Card" only (plus "Points" for monthly, AC-8), and the notice `t_auto_renew_notice` (card saved, renewed automatically each period, reminder S-043 days before, cancel any time). (LEGACY no surcharge; notice NEW)
- AC-4 Given the user pays on the BOG page with the save-card option, When the payment is verified by the server (spec 05 AC-10), Then Premium starts now and ends 1 calendar month (monthly) or 1 year (yearly) later, the masked card is stored as the renewal card, the price paid and the price version are stored, and the user gets `SubscriptionConfirmation` (email) and `t_subscription_activated_message` (in-app + push). Premium perks apply everywhere within 60 seconds (BR-113). (LEGACY BR-111; CHANGE: activation from the verified payment, not the browser session, fixes R-041)
- AC-5 Given the user closes the BOG page or the app after paying, When the payment is confirmed later (callback or background check), Then Premium is activated the same way; the result page or the app shows the new status when reopened. (CHANGE, fixes R-041)
- AC-6 Given the user already has Premium that has not ended (active, or canceled but still running), When they try to buy Premium again (card, points or any period), Then it is refused with `t_already_have_active_subscription`. Switching monthly ↔ yearly is done by canceling and buying again after the end. (LEGACY `SubscriptionController.php:32-34`, `Main/SubscriptionController.php:33-40`)
- AC-7 Given the mobile app (iOS and Android), When a user buys Premium, Then the same card purchase is offered through the BOG page in an in-app browser with a deep-link return, as on the web (Q-081). If S-126 `subscriptions.mobile_card_purchase.enabled` is switched OFF (fallback if a store review requires it), Then the app hides the card purchase and keeps "Buy with points" and the status view; the web is not affected. (NEW Q-081; ADR-016 to be revised by the architect; S-126 ACCEPTED P-60)

### Buying Premium with points (Q-052, BR-114; fixes R-006)
- AC-8 Given a user without active Premium and with at least S-045 points (default 100), When they choose "Buy with points" for the monthly plan and confirm, Then S-045 points are taken from their points balance (the server computes the number; any number sent by the client is ignored), Premium runs for 1 month, no card is saved and it will not auto-renew, and the user gets `SubscriptionConfirmation` and `t_subscription_activated_message` **once**. (LEGACY 1 month; CHANGE: server-computed points, legacy trusted the client, R-006; single email, legacy sent it twice)
- AC-9 Given fewer points than S-045, When "Buy with points" is shown, Then it is disabled with `t_insufficient_points` and the number still needed; the API refuses a direct call. Points never buy the yearly plan or anything else. (LEGACY; 00 §4.18; Q-052)

### Auto-renewal (BR-111, BR-112, S-042)
- AC-10 Given S-042 is ON and a card-paid subscription reaches its end with auto-renewal on and a saved card, When the renewal job runs, Then it charges the saved card the **current** price for the same period (S-008 or S-009 at that moment; no card fee; no promo discount), and after the server verifies the charge, the next period starts at the previous end date, the user gets `SubscriptionRenewed` (email, in the user's language) and `t_subscription_updated_message` (in-app + push). (LEGACY renewal; CHANGE: verified result, period without drift, user's language; current price ACCEPTED P-57)
- AC-11 Given the renewal charge fails (declined, card deleted or expired, BOG error), When the result is known, Then Premium ends at the end date (no retry), and the user gets `SubscriptionRenewalFailed` (email + in-app + push) with a link to subscribe again. (LEGACY cancel on failure; NEW notification, ACCEPTED P-57)
- AC-12 Given S-042 is OFF, When subscriptions reach their end, Then nothing is charged, they simply end, and no reminders are sent. (LEGACY toggle)
- AC-13 Given the renewal job runs twice for the same subscription and period (retry, two workers), When it charges, Then at most one charge and one extension happen per period (`subscription:{id}:renewal:{period}`). (CHANGE, ADR-003/ADR-008)

### Renewal reminder (NEW Q-019, Q-066)
- AC-14 Given a subscription that will be charged at its end (card-paid, not canceled, saved card present, S-042 ON), When the time reaches end date − S-043 days (default 3), Then the user gets the reminder on every channel in S-044 (default email + in-app): plan, period, amount to be charged, charge date, masked card, and a link to cancel. It is sent once per period. (NEW Q-019, Q-066)
- AC-15 Given a subscription paid with points, gifted by staff, from a referral benefit, activated by a 100% promo code, or already canceled, When its end approaches, Then no renewal reminder is sent. (NEW, follows AC-14)

### Cancel and resume
- AC-16 Given an active card-paid subscription, When the user presses "Cancel subscription" and confirms (`t_premium_features_until_expiry`), Then auto-renewal is switched off, Premium stays until the end date, My subscription shows "Canceled — active until :date", and the user gets `SubscriptionCancelled` (email). (LEGACY `MySubscriptionComponent.php:41-62`)
- AC-17 Given a canceled subscription that has not ended and still has a saved card, When the user presses "Resume auto-renewal", Then renewal is switched on again for the next period (reminder and charge as AC-10, AC-14). (ACCEPTED P-58)

### My subscription (`/account/my-subscription`)
- AC-18 Given a user opens My subscription (web and mobile), When it loads, Then it shows: plan and period, status (Active / Canceled — active until / No subscription), start and end dates, next charge date and amount (if it will renew), renewal card (masked), how it was obtained (card, points, gift, referral benefit, promo), actions (Cancel, Resume, Subscribe), and a list of past Premium payments linking to their receipts (spec 05 AC-33). (LEGACY status; details NEW)
- AC-19 Given Premium ends (any reason), When the end date passes, Then the Premium perks stop (00 R-2.1): proposals are refused (Q-020), the Featured badge and boost disappear (spec 03 AC-17), existing gigs above the Standard limit stay published (00 R-2.5), and the withdrawal fee for new requests follows S-010 (spec 14).

### Points ledger (Q-016, Q-017, Q-052)
- AC-20 Given a user opens Points (account menu → Referrals & points; mobile Account → Points), When it loads, Then it shows the points balance and a history, newest first: date, event (`t_points_event_*`: referral sign-up, admin grant, admin deduction, Premium purchase, migrated opening balance), points + or −, and the balance after. (NEW; legacy had only a balance)
- AC-21 Given any points change, When it is posted, Then it is a points-ledger journal with an event type; the balance never goes below 0; new event types can be added later with their own amount setting (as S-046) without changing existing data. Points are never money and never pay for gigs, projects or offers. (NEW Q-017; Q-052; ADR-003 §9)

### Referrals (BR-115, Q-018 mode 1)
- AC-22 Given a user opens Referrals (`/account/referrals`), When it loads, Then it shows their referral code, their invitation link (registration page with `?ref=CODE`, final path per url-map), copy and share buttons, statistics (total referrals, referrals with paid Premium, referrals with bonus Premium, total points earned from referrals), and the 10 most recent referrals per page (username, date, status Pending / Verified, Premium yes/no). (LEGACY `ReferralsComponent.php:28-139`)
- AC-23 Given a new user registered with a referral code (spec 01 AC-6, AC-38), When their account becomes active by **any** path — email link, staff activation, immediately when S-052 is OFF, or social sign-up — Then the referral becomes Verified and the referrer receives S-046 points (default 10), exactly once per referred user. (LEGACY credit; CHANGE: staff activation now credits too, ACCEPTED P-61; value from S-046, legacy hard-coded)
- AC-24 Given a referral is credited, When the points are posted, Then the referrer gets `t_referral_points_earned` (in-app + push). (NEW, ACCEPTED P-61; legacy sent nothing)
- AC-25 Given the referred account is banned, rejected or deleted before it becomes active, When that happens, Then no points are credited and the referral stays Pending. A user cannot refer themselves, and a user can only be referred once. (LEGACY data rules)
- AC-26 Given staff created an active referral-code benefit (S-051: code, name, active, Premium months) for a referral code, When a new user who registered with that code becomes active, Then they receive Premium for that many months as a gift (no card, no renewal, `SubscriptionConfirmation` + `t_subscription_activated_message`), in addition to the referrer's points. (LEGACY `ReferralBenefitService.php:12-43`; notification ACCEPTED P-60)

### Admin promo codes (NEW Q-018 mode 2, Q-053, Q-064; P-10)
- AC-27 Given a staff member with the promo-code permission creates a code, When they save, Then it needs: the code (unique, case-insensitive, 4–20 characters A–Z, 0–9 and "-"), an internal name, the discount S-047 (percent 1–100, or fixed GEL > 0), what it applies to S-048 (Premium monthly and/or yearly), uses per user S-049 (default 1), total redemption cap S-050 (required, ≥ 1), active on/off, and optional valid-from / valid-until dates. A code without a cap is refused. After the first redemption, only active, valid-until and the cap (not below redemptions so far) can change. (NEW; P-10; dates and edit rule ACCEPTED P-59)
- AC-28 Given a user enters a code at the Premium checkout, When it is checked, Then a valid code shows its discount line and the new total. Otherwise the user sees one message: `t_promo_invalid` (unknown, inactive or outside its dates), `t_promo_wrong_plan` (not for this period), `t_promo_already_used` (per-user limit reached) or `t_promo_fully_redeemed` (cap reached). A code on any other checkout is refused (spec 05 AC-40). (NEW)
- AC-29 Given a percent code, When the discount is computed, Then discount = price × percent, rounded half up to the tetri; given a fixed code, Then discount = min(fixed amount, price). Total = price − discount. Example: 9.99 GEL with 20% → discount 2.00, total 7.99; 99.99 GEL with 10 GEL off → total 89.99; 9.99 with 15 GEL off → total 0.00. (NEW; R-3.8)
- AC-30 Given the total after the discount is 0.00, When the user confirms, Then Premium activates at once without a card payment, no card is saved, and it does not auto-renew (the user can subscribe normally after it ends). (ACCEPTED P-59)
- AC-31 Given a code is applied to a card payment, When the payment starts, Then one redemption is reserved for that user; it becomes final when the payment is verified and is released if the payment fails or expires. The per-user limit and the total cap are never exceeded, even when many users pay at the same moment. (NEW; ACCEPTED P-59)
- AC-32 Given a promo code was used for the first period, When the subscription renews, Then the renewal is at the full current price. Promo codes cannot be combined with points or with each other (one code per purchase). (ACCEPTED P-59; R-3.9)
- AC-33 Given a code, When staff open it, Then they see its redemptions (user, date, period, discount given, payment status) and the counts used / cap. (NEW)

### Staff actions on subscriptions and plans (spec 16 permissions)
- AC-34 Given staff open Subscriptions, When the list loads, Then it can be filtered by user, plan, period, source (card, points, gift, referral benefit, promo), status (active, canceled-running, ended) and dates. (LEGACY Filament list `SubscriptionResource.php:35-104`)
- AC-35 Given a user without a running Premium, When staff gift Premium (monthly, yearly or a custom end date) with a required reason, Then a subscription starts now with source "gift", no payment, no renewal; it is audit-logged; the user gets `SubscriptionConfirmation` and `t_subscription_activated_message`. A user with running Premium is refused (`t_already_have_active_subscription`). (LEGACY gift `:127-260`; notification ACCEPTED P-60)
- AC-36 Given a running subscription, When staff cancel it with a required reason, Then it ends immediately (Premium perks stop within 60 s), no refund is made, the action is audit-logged, and the user gets `SubscriptionCancelled` with the immediate end date. (LEGACY immediate cancel `:108-119`; reason and notification ACCEPTED P-60)
- AC-37 Given staff change S-008 or S-009, When saved, Then new purchases and later renewals use the new price; payments already made keep theirs; reminders (AC-14) show the price that will be charged. (00 AC-9; P-57)

---

## Business rules
- R-S1 **Premium** (00 R-2.1): a subscription is running when not ended (end date in the future), whatever its source; canceled-running still counts as Premium until the end.
- R-S2 **Purchase methods** (spec 05 R-P1): card (web and mobile, Q-081; no surcharge, Q-070) for monthly or yearly; points for monthly only (S-045, one month per purchase, LEGACY); never wallet, never bank transfer.
- R-S3 **One running subscription per user** (LEGACY): no purchase, points purchase or gift while one is running.
- R-S4 **Periods**: monthly = 1 calendar month, yearly = 1 year, starting at activation; renewals start at the previous end date (P-57).
- R-S5 **Renewal** (S-042): card-paid subscriptions only; current price (P-57); no promo; no retry; failure ends Premium at the end date and notifies (P-57); one charge per period.
- R-S6 **Reminder** (S-043, S-044): only for subscriptions that will be charged; once per period.
- R-S7 **Points** (Q-016, Q-017, Q-052): separate ledger, integer, never negative, never money; events: `referral_signup` (+S-046), `admin_grant`, `admin_deduct` (spec 05 AC-43), `premium_redemption` (−S-045), `migration_opening`; extensible.
- R-S8 **Referrals** (BR-115): code = 8 characters A–Z 0–9 (spec 01 AC-1); credited once when the referred account becomes active (any path, P-61); S-046 points; referral-code benefit S-051 gives the referred user Premium months.
- R-S9 **Promo codes** (Q-053, Q-064, R-3.9, P-10, P-59): only Premium (monthly/yearly as configured; later other promo-eligible platform services); percent or fixed GEL; 1 use per user by default; total cap required; optional dates; reserved at payment start, final at verification; first period only; zero total activates without card and without renewal.
- R-S10 **Store rules** (Q-081, ADR-016): the app sells Premium by BOG card; S-126 can hide that in the app only, if a store requires it.

## Money movements (ledger map for ADR-003 / P2-B2)
"C" = amount charged by card; "D" = promo discount; list price = C + D.

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-09-01 | Premium card purchase verified (AC-4) | `platform:bog_clearing` → `platform:subscription_revenue` | C (no surcharge) | `bog:{bogOrderId}:paid` |
| | promo code used | `platform:promo_discounts` → `platform:subscription_revenue` | D (records the discount; revenue shows the list price) | same |
| MM-09-02 | Renewal charge verified (AC-10) | `platform:bog_clearing` → `platform:subscription_revenue` | current price | `bog:{bogOrderId}:paid`; business guard `subscription:{id}:renewal:{period}` |
| MM-09-03 | Promo makes the total 0 (AC-30) | `platform:promo_discounts` → `platform:subscription_revenue` | list price | `promo_redemption:{redemptionId}` |
| PM-09-01 | Referral credited (AC-23) | `platform:points_issued` → `user:{referrer}:points` | S-046 | `referral:{referredUserId}:signup` |
| PM-09-02 | Premium bought with points (AC-8) | `user:{id}:points` → `platform:points_redeemed` | S-045 | `points_purchase:{subscriptionId}` |
| (none) | Gift, referral benefit, cancel, failed renewal (AC-11, AC-26, AC-35, AC-36) | – | 0 | – |

`platform:subscription_revenue` is a new platform account for ADR-003's list (the architect names it in data-model.md). Admin points grant/deduct: PM-05-01 / PM-05-02.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Plans | `/subscription`: two plan cards, Monthly/Yearly switch, savings badge, points price | Account → Premium: same cards stacked, switch at the top | loading; success; "Active until" state |
| Premium checkout | plan summary, promo field with "Apply", total, auto-renew notice, "Pay by card", "Buy with points" (monthly) | same as a screen; BOG page in an in-app browser (if S-126 ON) | promo error messages; zero-total "Activate"; processing; success; failed |
| My subscription | `/account/my-subscription`: status card, next charge, card, actions, payment list | Account → My subscription | no subscription (Subscribe CTA); active; canceled-running (Resume); ended |
| Points | balance + history table | balance + history list | empty `t_no_points_yet` |
| Referrals | `/account/referrals`: code, link, copy/share, stats, recent list | native share sheet | empty `t_no_referrals_yet`; copied toast |
| Admin (spec 16): Subscriptions (list, gift, cancel), Plans (prices S-008/S-009, limits S-001…S-007, feature texts), Promo codes (CRUD, redemptions), Referral-code benefits (CRUD), Points adjustments (spec 05) | | | |

Accessibility: the plan switch is a labelled toggle; prices are read with currency and period ("9.99 lari per month"); the Premium buy button uses the brand palette (Q-078).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Everyone/SubscriptionConfirmation` (`t_subject_subscription_confirmation`) + `t_subscription_activated_message` | email + in-app + push | user | Premium activated by card, points (once), promo 100%, gift, referral benefit (AC-4, AC-8, AC-30, AC-35, AC-26) | LEGACY (card, points); gift/benefit ACCEPTED P-60; duplicate email for points fixed |
| `User/Everyone/SubscriptionRenewed` (`t_subject_subscription_renewed`) + `t_subscription_updated_message` | email + in-app + push | user | renewal verified (AC-10) | LEGACY; CHANGE: user's language (legacy forced `ka`) |
| `SubscriptionRenewalReminder` (`t_subject_subscription_renewal_reminder`) + `t_subscription_renewal_reminder` | S-044 (email + in-app; push optional) | user | S-043 days before the charge (AC-14) | **NEW** (Q-019, Q-066) |
| `SubscriptionRenewalFailed` (`t_subject_subscription_renewal_failed`) + `t_subscription_renewal_failed` | email + in-app + push | user | renewal charge failed (AC-11) | **NEW, ACCEPTED P-57** |
| `User/Everyone/SubscriptionCancelled` (`t_subject_subscription_cancelled`) | email | user | user cancels (AC-16); staff cancel (AC-36, P-60) | LEGACY |
| `t_referral_points_earned` | in-app + push | referrer | referral credited (AC-23, AC-24) | **NEW, ACCEPTED P-61** |
| `t_points_adjusted` | in-app + push | user | staff points change (spec 05 AC-43) | NEW (spec 05, P-41) |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_subscription_plans` | Subscription plans | მომხმარებლის პაკეტები |
| `t_billing_monthly` / `t_billing_yearly` | Monthly / Yearly | ყოველთვიური / წლიური |
| `t_month` / `t_year` | month / year | თვე / წელი |
| `t_buy_subscribe` / `t_subscribe` | Subscribe / Subscribe | შეძენა / გამოწერა |
| `t_my_subscription` | My Subscription | ჩემი გამოწერა |
| `t_cancel_subscription` | Cancel Subscription | გამოწერის გაუქმება |
| `t_subscription_canceled_successfully` | Subscription canceled successfully | გამოწერა წარმატებით გაუქმდა |
| `t_subscription_active_until` | Your Premium subscription is now active until :date. | თქვენი პრემიუმ გამოწერა აქტიურია :date-მდე |
| `t_subscription_cancelled_message` | You have cancelled your Premium subscription. | თქვენ გააუქმეთ პრემიუმ გამოწერა. |
| `t_premium_features_until_expiry` | Premium features will remain available until the current plan expires. | თქვენი პროფილიდან პრემიუმ ფუნქციები გაქრება არსებული პაკეტის ვადის გასვლის შემდეგ. |
| `t_subscription_activated` | Subscription Activated | გამოწერა გააქტიურდა |
| `t_subscription_activated_message` | Your Premium subscription has been successfully activated and is now active until :expires_at. | თქვენი პრემიუმ გამოწერა წარმატებით გააქტიურდა და აქტიურია :expires_at-მდე. |
| `t_subscription_updated_message` | Your Premium subscription has been successfully updated and is now active until :expires_at. | თქვენი პრემიუმ გამოწერა წარმატებით განახლდა და აქტიურია :expires_at-მდე. |
| `t_subscription_renewed_message` | Your Premium subscription has been successfully renewed and is active until :date. | თქვენი პრემიუმ გამოწერა წარმატებით განახლდა და აქტიურია :date-მდე. |
| `t_subscription_purchased_successfully` | Subscription purchased successfully with points! | სუბსკრიფცია წარმატებით იქნა შეძენილი ქულებით! |
| `t_insufficient_points` | You do not have enough points to complete this purchase. | თქვენ არ გაქვთ საკმარისი ქულები ამ შეძენის დასასრულებლად. |
| `t_already_have_active_subscription` | You already have an active subscription. Please wait until it expires to purchase a new one. | თქვენ უკვე გაქვთ აქტიური გამოწერა. გთხოვთ დაელოდოთ მისი ამოწურვას ახლის შესაძენად. |
| `t_plan_not_found` / `t_purchase_failed` | Subscription plan not found. / Purchase failed. Please try again. | გამოწერის პლანი ვერ მოიძებნა. / შეძენა ვერ მოხერხდა. გთხოვთ სცადოთ ისევ. |
| `t_points` | Points | ქულები |
| `t_referrals` | Referrals | რეფერალები |
| `t_referral_code_optional` / `t_referral_code_invalid` | see 01 | see 01 |
| `t_premium_required` / `t_upgrade_to_premium` / `t_featured` | see 00 / 03 | see 00 / 03 |
| Email subjects in "Notifications" (legacy ones) | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_yearly_saving` | Save :percent% | დაზოგეთ :percent% |
| `t_per_month_equivalent` | :amount per month | თვეში :amount |
| `t_withdrawal_fee_plan` | Withdrawal fee: :percent% | თანხის გატანის საკომისიო: :percent% |
| `t_buy_with_points` | Buy with points (:points) | ქულებით შეძენა (:points) |
| `t_points_needed_more` | You need :points more points. | გჭირდებათ კიდევ :points ქულა. |
| `t_auto_renew_notice` | Your card will be saved and charged automatically at the end of each period. We will remind you :days days before. You can cancel at any time. | თქვენი ბარათი შეინახება და ყოველი პერიოდის ბოლოს თანხა ავტომატურად ჩამოიჭრება. :days დღით ადრე შეგახსენებთ. გაუქმება ნებისმიერ დროს შეგიძლიათ. |
| `t_subscription_renewal_reminder` | Your Premium plan renews on :date. :amount will be charged to your card :card. You can cancel before then. | თქვენი პრემიუმ პაკეტი განახლდება :date-ს. თქვენი ბარათიდან (:card) ჩამოიჭრება :amount. გაუქმება მანამდე შეგიძლიათ. |
| `t_subject_subscription_renewal_reminder` | Your Premium plan renews in :days days | თქვენი პრემიუმ პაკეტი :days დღეში განახლდება |
| `t_subscription_renewal_failed` | We could not renew your Premium plan. It ends on :date. You can subscribe again at any time. | თქვენი პრემიუმ პაკეტის განახლება ვერ მოხერხდა. ის დასრულდება :date-ს. ხელახლა გამოწერა ნებისმიერ დროს შეგიძლიათ. |
| `t_subject_subscription_renewal_failed` | Premium renewal failed | პრემიუმის განახლება ვერ მოხერხდა |
| `t_status_canceled_active_until` | Canceled — active until :date | გაუქმებულია — აქტიურია :date-მდე |
| `t_resume_auto_renewal` | Resume auto-renewal | ავტომატური განახლების აღდგენა |
| `t_auto_renewal_resumed` | Auto-renewal is on again. | ავტომატური განახლება კვლავ ჩართულია. |
| `t_next_charge` | Next charge: :amount on :date | შემდეგი ჩამოჭრა: :amount, :date |
| `t_renewal_card` | Renewal card | განახლების ბარათი |
| `t_subscription_source_card` / `_points` / `_gift` / `_referral` / `_promo` | Paid by card / Bought with points / Gift from MyTask / Referral bonus / Promo code | ბარათით გადახდილი / ქულებით შეძენილი / MyTask-ის საჩუქარი / რეფერალური ბონუსი / პრომო კოდი |
| `t_no_subscription` | You do not have a Premium plan. | პრემიუმ პაკეტი არ გაქვთ. |
| `t_promo_code` | Promo code | პრომო კოდი |
| `t_apply` | Apply | გამოყენება |
| `t_promo_discount_line` | Promo code :code | პრომო კოდი :code |
| `t_promo_invalid` | This promo code is not valid. | ეს პრომო კოდი არ არის ძალაში. |
| `t_promo_wrong_plan` | This promo code is not valid for this plan period. | ეს პრომო კოდი ამ პერიოდის პაკეტზე არ მოქმედებს. |
| `t_promo_already_used` | You have already used this promo code. | ეს პრომო კოდი უკვე გამოყენებული გაქვთ. |
| `t_promo_fully_redeemed` | This promo code has reached its usage limit. | ამ პრომო კოდის გამოყენების ლიმიტი ამოიწურა. |
| `t_activate_premium` | Activate Premium | პრემიუმის გააქტიურება |
| `t_points_history` | Points history | ქულების ისტორია |
| `t_points_balance` | Your points: :points | თქვენი ქულები: :points |
| `t_points_event_referral_signup` | Friend joined with your code | მეგობარი შემოგიერთდათ თქვენი კოდით |
| `t_points_event_admin_grant` | Added by MyTask | დაამატა MyTask-მა |
| `t_points_event_admin_deduct` | Deducted by MyTask | ჩამოაკლო MyTask-მა |
| `t_points_event_premium_redemption` | Premium bought with points | პრემიუმი შეძენილია ქულებით |
| `t_points_event_migration_opening` | Opening balance (previous platform) | საწყისი ბალანსი (ძველი პლატფორმიდან) |
| `t_no_points_yet` | You have no points yet. Invite friends to earn points. | ქულები ჯერ არ გაქვთ. მოიწვიეთ მეგობრები და დააგროვეთ ქულები. |
| `t_your_referral_code` | Your referral code | თქვენი რეფერალური კოდი |
| `t_your_invite_link` | Your invitation link | თქვენი მოწვევის ბმული |
| `t_invite_and_earn` | Invite friends and earn :points points for each friend who joins. | მოიწვიეთ მეგობრები და მიიღეთ :points ქულა თითოეული შემოსული მეგობრისთვის. |
| `t_referral_stats_total` / `_paid_premium` / `_bonus_premium` / `_points` | Referrals / With paid Premium / With bonus Premium / Points earned | რეფერალები / ფასიანი პრემიუმით / ბონუს პრემიუმით / დაგროვილი ქულები |
| `t_referral_status_pending` / `_verified` | Pending / Verified | მოლოდინში / დადასტურებული |
| `t_no_referrals_yet` | You have not invited anyone yet. | ჯერ არავინ მოგიწვევიათ. |
| `t_referral_points_earned` | :username joined with your code. You earned :points points. | :username შემოგიერთდათ თქვენი კოდით. თქვენ მიიღეთ :points ქულა. |
| `t_link_copied` | Link copied | ბმული დაკოპირებულია |

## Edge cases
- EC-1 The user pays for Premium and the callback arrives after the user already bought Premium with points in another tab: the second activation is refused by R-S3; the verified card payment is credited to the wallet as an unapplied payment (spec 05 AC-15, P-40).
- EC-2 A renewal is due while S-042 is switched OFF: nothing is charged; the subscription ends (AC-12). Switching it ON later does not revive ended subscriptions.
- EC-3 The reminder has been sent and the user cancels: no charge happens (AC-16).
- EC-4 The user deletes the renewal card after the reminder: the charge fails and AC-11 applies (spec 05 AC-35 warns first).
- EC-5 The plan price changes after the reminder was sent: the reminder showed the price valid when it was sent; the renewal uses the price valid at charge time (P-57). Staff should change prices with more than S-043 days' notice; the admin screen warns about this.
- EC-6 A promo code's cap is reached while a user is on the BOG page with a reserved redemption: their payment still gets the discount (reservation, AC-31); new users are refused.
- EC-7 A monthly subscription starting on 31 January ends on 28/29 February (calendar month), and renews to 28/29 March (from the previous end date).
- EC-8 Referred user registers with a code, then the referrer is banned: points are still credited to the (banned) referrer's ledger; they have no use until the ban ends.
- EC-9 A referral-benefit code gives 3 months, and the new user also buys Premium: refused while the gift runs (R-S3).
- EC-10 A migrated legacy subscription with a saved card: it keeps its end date and renews by AC-10 at the current price; migrated points become an opening balance journal.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-09-1 | Points purchase trusts the client-sent number of points: Premium for 1 point (R-006) | `Main/SubscriptionController.php:21-50` | AC-8, AC-9 |
| D-09-2 | Subscription activation depends on the browser session (R-041) | `SubscriptionService.php:139-168` | AC-4, AC-5 |
| D-09-3 | Card saved at BOG before the payment exists | `SubscriptionController.php:44-45` | AC-4 (card stored from the verified payment) |
| D-09-4 | `SubscriptionConfirmation` sent twice for points purchases | `Main/SubscriptionController.php:60, 106` | AC-8 |
| D-09-5 | Points spending only written to a log file (no history) | `Main/SubscriptionController.php:113-116`; `User.php:415-436` | AC-20, AC-21 (points ledger) |
| D-09-6 | Renewal "success" guessed from an `id` in the response | `ProcessSubscriptionPayments.php:149-170` | AC-10 (verified result) |
| D-09-7 | Renewed period starts when the job runs (drift); renewal email forced to Georgian | `ProcessSubscriptionPayments.php:194-218` | AC-10 (P-57) |
| D-09-8 | Failed renewal cancels Premium silently | `ProcessSubscriptionPayments.php:220-230` | AC-11 (P-57) |
| D-09-9 | Withdrawal fee % and points price hard-coded on the plans page | `SubscriptionComponent.php:69-72, 88` | AC-1 (S-010, S-011, S-045) |
| D-09-10 | Referral points hard-coded to 10 | `RegisterComponent.php:290`, `VerifyComponent.php:90`, `ReferralEventType.php:16-21` | AC-23 (S-046) |
| D-09-11 | Accounts activated by staff never credit the referrer | no referral handling in `app/Livewire/Admin` | AC-23 (P-61) |
| D-09-12 | Renewal charge repeats the original parent-order amount (price changes and promo discounts would carry into renewals) | `BogPayment.php:59-84`, `config/bog.php:13` | AC-10, AC-32 (P-57, P-59) |

## Out of scope
- Apple/Google in-app purchase (ADR-016 option B; not decided).
- More plans than Standard/Premium; upgrading mid-period with proration.
- Refunds of subscription payments (not in legacy).
- New points-earning events (the ledger is ready; each needs an Owner decision and a setting like S-046).
- Admin screens themselves (spec 16).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-57 Renewal price and failure.** Renewals charge the price valid at renewal time (S-008/S-009), shown in the 3-day reminder; the new period starts at the previous end date (legacy restarted from the moment the job ran, so periods drifted). No automatic retry (legacy). A failed renewal ends Premium at the end date and the user is told by email, in-app and push (legacy canceled silently). Note for the lead developer (Q-087): legacy used BOG's automatic-payment call, which repeats the original amount; the integration must use BOG's saved-card charge that accepts the current amount.
- **P-58 Resume after cancel.** A user who canceled can switch auto-renewal back on before the end date, as long as the saved card still exists (legacy had no way back).
- **P-59 Promo code details.** Code format 4–20 characters (A–Z, 0–9, "-"), case-insensitive; optional valid-from/until dates; after the first use only active, valid-until and the cap can change; a redemption is reserved when the payment starts and final when it is verified; first period only (renewals at full price); not combinable with points or other codes; a discount that makes the total 0.00 activates Premium without a card and without auto-renewal.
- **P-60 Staff and mobile controls.** (a) Gifts and referral-benefit Premium send the normal activation notification; a staff cancel needs a reason and sends `SubscriptionCancelled` (legacy sent nothing). (b) NEW register row **S-126 `subscriptions.mobile_card_purchase.enabled`** (boolean, default ON; register row added to spec 00): lets you hide the card purchase of Premium in the mobile apps only, if Apple or Google require it (Q-081 risk); points purchase and status stay.
- **P-61 Referral credit and notice.** The referrer is credited whenever the referred account becomes active, including activation by staff (legacy only credited email-link verification and "no verification", so with admin approval ON the referrer never got points). The referrer gets an in-app/push notice with the points earned.
