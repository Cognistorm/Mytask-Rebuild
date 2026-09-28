# 12 — Custom offers
Status: **approved** (Owner 2026-09-29; P-66…P-105 accepted)
Author: product-analyst (P2-A4) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-013, BR-090, BR-091; `routes-and-pages.md` (`/account/offers`, `/seller/offers`, `/checkout/{uid}/offer`, `/offers/{file}`); `notifications.md` (offer rows); `data-model.md` (`custom_offers`, `custom_offer_attachments`, `custom_offer_work`). Owner decisions: Q-021, Q-027, Q-053, Q-056, Q-060, Q-061, Q-067, Q-068c, Q-070, Q-071. Platform rules: `00-platform-rules.md` §2 (custom-offer limit), §3, §4.1 (S-005…S-007), §4.2 (S-017, S-018), §4.4 (S-025…S-029), §4.7 (S-034…S-040), §4.8 (S-041), §4.13 (S-086, S-087), AC-11, AC-13, AC-18, EC-1; P-3, P-6, P-9. Specs: 02 AC-12 ("Request an offer" on profiles), 05 (checkout, AC-15 unapplied payments, D-05-9), 06 (delivery, revisions, auto-release — rules reused), 07 AC-3 (offer reviews, P-54), 08 AC-27 (offers in chat), 13 (refunds, disputes, unblock), 16 (admin). ADR-003, ADR-008, ADR-009.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-90…P-97, see "Open questions").

This is a **NEW flow** (Q-027: legacy custom offers are switched off in production because the flow was incomplete). Legacy behaviour is shown for reference; the Owner's decisions (Q-060) define the new direction: **freelancers create offers; buyers can request one**; no admin approval; 3-day expiry.

Legacy code traced for this spec (read-only):
- **Create (client → freelancer)** `app/Livewire/Main/Profile/ProfileComponent.php:437-670`: feature switch `enable_custom_offers` `:456`; refused when the freelancer is unavailable `:488-500` (BR-013); buyer fee and freelancer fee from `settings_publish` (percent or fixed) `:508-558`; `admin_status` pending if approval is required, else approved `:584`; `expires_at = now + custom_offers_expiry_days` `:586`; `NewOfferReceived` + in-app `t_a_new_custom_offer_received` to the freelancer, or `Admin/NewCustomOfferPending` `:638-668`. Validator `app/Http/Validators/Main/Profile/OfferValidator.php:24-72`: message required ≤ 2,500; expected duration 1–365 days; budget `^\d+(\.\d{1,2})?$` ≤ 10 chars; attachments per S-037…S-040.
- **Freelancer side** `app/Livewire/Main/Seller/Offers/OffersComponent.php`: accept / reject (with reasons) while `freelancer_status = pending` `:156-318`; upload work files with notes, a checkbox marks the final one (`freelancer_status = completed`, `delivered_at`) `:324-400`; **cancel** while approved — if funded, the buyer gets **budget + buyer fee** back on the wallet `:530-600`; delete own work files `:619-660`.
- **Buyer side** `app/Livewire/Main/Account/Offers/OffersComponent.php` (CR line endings): edit/delete own offer (delete of a funded offer refunds the buyer), wallet funding, **release** after the final file → freelancer `balance_available += budget − freelancer fee` directly (no HOLD ever existed), `OfferPaymentReleased` + in-app.
- **Payment** `app/Livewire/Main/Checkout/UnifiedCheckoutComponent.php:98-114, :606-646, :754-790`: subtotal = budget + buyer fee; wallet path deducts the buyer but **never funds the freelancer's HOLD** (D-05-9) and **resets `expires_at`** after payment `:629`; card path `PaymentBogController.php:97-126` same.
- **Expiry**: only a model accessor `app/Models/CustomOffer.php:94-97`; nothing expires offers.
- **Admin** `app/Livewire/Admin/Offers/OffersComponent.php`: approve (→ freelancer notified) / reject (`YourOfferNeedsChanges` to the client) `:96-182`; release `:326-365`.

---

## Goal
Let a freelancer turn a conversation into a paid job in one step: they send a custom offer (description, price, delivery time, number of revisions, attachments) to a buyer, usually from the chat; the buyer pays by wallet or card (+2.5%) to accept it, or declines; the money sits on the freelancer's HOLD; delivery, revisions and completion (by the buyer or automatically after 72 hours) work exactly like gig orders; both sides then review each other. Buyers can also ask a freelancer for an offer. The admin can switch the feature on and off (S-034, ON at launch).

## Roles involved
- **Freelancer** (any user; the offer's author): sends, withdraws offers; answers offer requests; delivers; cancels a paid offer before the first delivery.
- **Buyer** (any user; the offer's recipient): requests offers; pays (accepts) or declines; requests revisions; completes; refund requests (spec 13); reviews.
- **Staff**: approves offers only if S-035 is switched ON; views offers; spec 13 tools.
- **System**: expiry and auto-release sweepers (ADR-008).

## User stories
- As a freelancer, I want to send a tailored offer to a client from our chat, so that we can start without creating a new gig.
- As a buyer, I want to ask a freelancer for an offer when no gig fits, so that I get a price for exactly what I need.
- As a buyer, I want to accept an offer by paying once, so that the freelancer starts right away and my money is protected.
- As a freelancer, I want the buyer's money on my HOLD before I start and the same protection as for gig orders.
- As the Owner, I want to switch custom offers off in the admin panel without breaking offers already paid.

## Acceptance criteria

### Feature toggle and plan limit (S-034, S-005…S-007)
- AC-1 Given S-034 `custom_offers.enabled` is ON (launch value, Q-068c), When a user is in a direct conversation (08 AC-27), on a freelancer's profile (02 AC-12), or in Selling → Offers, Then the entry points "Create an offer" (freelancer side) and "Request an offer" (buyer side) are shown. Given S-034 is OFF, Then they are hidden and the API refuses new offers, requests and payments of unpaid offers with "feature disabled"; paid offers continue to delivery, completion, refund and dispute (00 AC-11, EC-1). (NEW Q-027; OFF behaviour ACCEPTED P-95)
- AC-2 Given S-007 is ON and the freelancer's counted offers (pending approval, sent, in progress, delivered, revision requested — P-9) reach S-005 (Standard) or S-006 (Premium), When they try to send another offer, Then it is refused with `t_plan_offer_limit_reached` and, for Standard users, "Upgrade to Premium". Given S-007 is OFF (launch), Then no offer limit applies. (NEW Q-021, Q-060e, P-9)

### Buyer requests an offer (Q-060a; P-92)
- AC-3 Given a logged-in buyer on a freelancer's profile or in their direct conversation, When they press "Request an offer", fill a description of the need (required, 10–2,500 characters) and optionally a budget idea (GEL) and a wished delivery time (days), Then an **offer request** card appears in the direct conversation, the freelancer gets `t_buyer_requested_an_offer` (in-app + push) and the email `OfferRequested` (`t_subject_offer_requested`). (NEW Q-060a)
- AC-4 Given the freelancer is unavailable (BR-013), restricted, banned or deleted, or the buyer is the freelancer, When a request is attempted, Then the button is hidden and the API refuses it (`t_this_user_is_not_available_right_now_msg` with the date, or `t_user_cannot_receive_messages`). (LEGACY BR-013 rule applied to requests; 02 AC-12)
- AC-5 Given an open request, When the freelancer presses "Send an offer" on its card, Then the offer form opens pre-filled with the request's budget idea and delivery time; sending the offer links it to the request and marks the request "answered". When the freelancer presses "Decline request" (optional note ≤ 500), Then the request is "declined" and the buyer gets `t_offer_request_declined` (in-app + push). A request has no expiry; the buyer can cancel it while open. (NEW, ACCEPTED P-92)

### Creating and sending an offer (Q-060; P-90, P-91)
- AC-6 Given a user who has a direct conversation with the other person (or answers their request), When they press "Create an offer", Then the offer form opens with: description (required, 10–2,500 characters), price in GEL (required), delivery time in days (required), number of revisions (required, 0…S-041, no pre-selected value), attachments (if S-037 is ON: up to S-039 files, each ≤ S-038 MB, types S-040). (LEGACY fields `OfferValidator.php:60-72`; revisions NEW P-3; recipient rule ACCEPTED P-90)
- AC-7 Given the price, When it is saved, Then it must be a number with up to 2 decimals, at most 10 characters, and at least 1.00 GEL. Given delivery time, Then a whole number of days from 1 to 365. (LEGACY budget regex and 1–365; 1.00 minimum ACCEPTED P-91)
- AC-8 Given the form, When the freelancer types a price, Then it shows "You receive" = price − freelancer fee (S-018; today equal to the price) and "Buyer pays" = price + buyer fee (S-017; today equal to the price), without the card fee (added only at card checkout). (LEGACY fee settings; values from the Commission & Fee module, P-6)
- AC-9 Given a valid offer, When the freelancer sends it, Then it gets status **sent** (or **pending approval** when S-035 is ON, AC-11), an expiry = sending time + S-036 days (default 3, stored), a snapshot of all fields and fee versions, and an **offer card** appears in the direct conversation (description excerpt, price, delivery days, revisions, attachments count, expiry countdown, status). The buyer gets `NewOfferReceived` (email, `t_subject_freelancer_new_offer_received`) and `t_a_new_custom_offer_received` (in-app + push). (CHANGE Q-060a: legacy sent client → freelancer, the notifications now go to the buyer; Q-060c)
- AC-10 Given the recipient is banned, restricted, deleted or pending, or is the sender, When an offer is sent, Then it is refused (`t_user_cannot_receive_messages`; R-1.3). (LEGACY own-offer rule; account rule 08 AC-3)

### Admin approval, only if switched ON (S-035 OFF at launch)
- AC-11 Given S-035 is ON, When an offer is sent, Then it is **pending approval**, invisible to the buyer, and `Admin/NewCustomOfferPending` goes to every S-100 address. Staff approve → status **sent**, the expiry starts from the approval, and AC-9 notifications go to the buyer. Staff reject with a reason → status **rejected**, the freelancer gets `YourOfferNeedsChanges` (email) and `t_an_offer_needs_changes_rejected_admin` (in-app + push). (LEGACY option; Q-060b default OFF; CHANGE recipient of the rejection: the freelancer is now the author)

### Buyer's answer: pay or decline (P-90)
- AC-12 Given a sent offer before its expiry, When the buyer opens the card or Buying → Offers, Then they see the full offer (description, attachments with signed links, price, delivery days, revisions, expiry) with "Accept and pay" and "Decline". (NEW)
- AC-13 Given the buyer presses "Accept and pay", When the checkout opens (spec 05 checkout block), Then the methods are Wallet (S-020) and Card (S-019, with the S-012 card fee line); points and bank transfer are not offered; the quote = price P + buyer fee Fb (S-017; today 0) + surcharge on card. (LEGACY checkout `UnifiedCheckoutComponent.php`; CHANGE: one 2.5% surcharge, Q-070)
- AC-14 Given Wallet with enough Available balance, When the buyer confirms, Then in one step the total leaves the buyer's Available balance, the offer becomes **in progress**, the freelancer's HOLD increases by P′ = P − freelancer fee (S-018; today P′ = P), the expected delivery date = payment time + delivery days, and the freelancer gets `OfferFunded` (email, `t_subject_freelancer_offer_funded`) and `t_a_custom_order_has_been_funded` (in-app + push). (CHANGE Q-008: HOLD now funded, fixes D-05-9; expiry no longer reset after payment; MM-12-02)
- AC-15 Given Card, When the buyer confirms, Then the offer stays **sent** (no HOLD, no ledger entry) and the BOG page opens (spec 05 AC-9). When the payment is verified, Then the effects of AC-14 happen and the surcharge is recorded separately. (CHANGE Q-008; MM-12-01)
- AC-16 Given the buyer presses "Decline" (optional reason ≤ 500) on a sent offer, When they confirm, Then the offer becomes **declined** and the freelancer gets `BuyerDeclinedYourOffer` (email, `t_subject_buyer_declined_ur_offer`) and `t_buyer_declined_ur_offer` (in-app + push). (NEW direction; replaces legacy "freelancer rejected your offer")
- AC-17 Given a sent offer, When the freelancer presses "Withdraw offer" before it is paid, Then it becomes **withdrawn** and the buyer gets `t_freelancer_withdrew_offer` (in-app + push). A withdrawn, declined, expired or rejected offer cannot be paid (API refuses with `t_offer_no_longer_available`). (NEW, ACCEPTED P-94)

### Expiry (Q-060c; S-036; P-95)
- AC-18 Given a sent offer whose expiry has passed and that is not paid, When the sweeper runs (every minute), Then it becomes **expired** and both sides get `t_offer_expired_freelancer` / `t_offer_expired_buyer` (in-app + push). "Accept and pay" after the expiry is refused even if the sweeper has not run yet. (NEW; legacy never expired offers)
- AC-19 Given the buyer started a card payment before the expiry and BOG confirms it after the expiry, When the payment is verified, Then the offer is **not** started: the full charged amount goes to the buyer's wallet as "Unapplied payment" (spec 05 AC-15, P-40) and both sides see the offer as expired. (ACCEPTED P-95; spec 05 P-40)
- AC-20 Given S-036 is changed, When it is saved, Then offers already sent keep their stored expiry (00 EC-2).

### Work, delivery, revisions (rules of spec 06 applied to the offer; P-93)
- AC-21 Given an offer in progress or with a revision requested, When the freelancer delivers (message required ≤ 2,500; optionally one file ≤ S-086 MB of a type in S-087), Then a new numbered delivery is stored (append-only), the status becomes **delivered**, the auto-release deadline = delivery time + S-026 hours (stored), and the buyer gets `NewFinishedOfferFile` (email, `t_subject_employer_offer_new_file_received`) and `t_a_new_file_received_offer` (in-app + push), with the automatic completion date when S-025 is ON (`t_auto_complete_notice`). (CHANGE: legacy uploaded several work files plus a "final" checkbox and allowed deleting them; same rules as 06 AC-22…AC-24; ACCEPTED P-93)
- AC-22 Given a delivered offer, When the buyer requests a revision, Then spec 06 AC-25…AC-29 apply with the offer's snapshot number of revisions (P-3): counter, message ≤ 750, timer stop, fresh full S-026 period at re-delivery (Q-071a), and no request when none are left (P-2). The freelancer gets `RevisionRequested` (email) and `t_buyer_requested_revision_offer` (in-app + push). (NEW Q-056, Q-061, P-3)
- AC-23 Given an offer in progress whose expected delivery date has passed, When it is shown, Then both sides see "Late"; the buyer may open a refund request (spec 13). (NEW, same as 06 EC-8)
- AC-24 Given an offer that is in progress, delivered or with a revision requested, When the buyer or the freelancer writes in the offer thread (≤ 750 characters), Then the message is added in real time and the other side gets `t_new_message_about_offer` (in-app + push). After completion, cancellation or refund the thread is read-only; staff with `chat.read` can read it. General talk stays in the direct conversation. (NEW, ACCEPTED P-93; conversation type `custom_offer`, 08 R-M2)

### Completion and auto-release
- AC-25 Given a delivered offer with no open dispute, When the buyer presses "Complete order" and confirms, Then in one step: status **completed**, HOLD → the freelancer's Available balance, an open refund request is closed, the freelancer gets `OfferPaymentReleased` (email, `t_subject_freelancer_offer_payment_released`) and `t_u_received_a_new_payment_offer` (in-app + push), and the buyer is taken to the review form (spec 07 AC-3, P-54). (LEGACY release; CHANGE: from HOLD, after a delivery; MM-12-03)
- AC-26 Given an offer in progress (not delivered) or with a revision requested, When the buyer looks for "Complete order", Then it is not offered. Given a dispute is open, Then it is refused with `t_cannot_complete_during_dispute`. (spec 06 AC-31, AC-32)
- AC-27 Given S-025 is ON and a delivered offer's deadline has passed with no revision requested and no open refund or dispute, When the sweeper runs, Then it is completed as in AC-25 (actor "system") and both sides get `t_offer_auto_completed_freelancer` / `t_offer_auto_completed_buyer` (email + in-app + push). Pausing, restarting, switching S-025 OFF/ON and changing S-026 follow spec 06 AC-34…AC-38. (CHANGE Q-051, Q-067a; MM-12-04)
- AC-28 Given completion by the buyer, the sweeper and a staff release at the same moment, When they run, Then the money moves once (`escrow:{offer}:release`). (fixes R-017)

### Cancellation (P-94)
- AC-29 Given a paid offer that has **no delivery yet** (in progress), When the freelancer presses "Cancel order" and confirms, Then the offer becomes **canceled**, the price P returns to the buyer's Available balance (the card fee and the buyer fee are not returned, Q-011), the freelancer's HOLD decreases by P′, an open refund request is closed, and the buyer gets `FreelancerCanceledYourOffer` (email, `t_subject_employer_freelancer_canceled_ur_offer`) and `t_freelancer_has_canceled_ur_offer` (in-app + push). (LEGACY freelancer cancel `Seller/Offers/OffersComponent.php:530-600`; CHANGE: buyer fee no longer returned, only before the first delivery; ACCEPTED P-94; MM-12-05)
- AC-30 Given a paid offer, When the buyer looks for "Cancel", Then it is not offered; their route is a refund request (spec 13). Given the offer was delivered, Then the freelancer cannot cancel it either. (CHANGE: legacy let the buyer delete funded offers with a refund; ACCEPTED P-94)

### Lists, pages and access
- AC-31 Given Buying → Offers (`/account/offers`; mobile Buying → Offers), When it opens, Then it has tabs "Received offers" (status chips: pending, in progress, delivered, revision requested, completed, declined, expired, withdrawn, canceled, refunded) and "My requests" (open, answered, declined, canceled), newest first, each with the next action (Accept and pay, Decline, Complete order, Request a revision, Review). (LEGACY list page; tabs NEW)
- AC-32 Given Selling → Offers (`/seller/offers`), When it opens, Then it has tabs "Sent offers" (same statuses, with the expiry countdown for sent ones) and "Requests" (open requests with Send an offer / Decline). (LEGACY page; tabs NEW)
- AC-33 Given an offer page (`/account/offers/{uid}` and `/seller/offers/{uid}`; final paths in `url-map.md`), When it opens, Then it shows the header (other party, price paid, delivery days, revisions left, expected date), status timeline, attachments, deliveries history, thread, and the actions allowed for the viewer. Only the two parties and staff with permission can open it or its files (signed links); others get 404. (NEW; ADR-009)

### Staff
- AC-34 Given staff with the offers permission, When they open Admin → Custom offers, Then they can filter by status, freelancer, buyer and date, open any offer read-only (with its thread and files), approve or reject pending ones (only when S-035 is ON), and use the spec 13 tools (release funds, refund buyer) on paid, unfinished offers. (LEGACY admin list; tools spec 13)

### Reviews and migration
- AC-35 Given a completed offer (by the buyer, auto-release, staff release or a dispute decision paying the freelancer), When either side opens it, Then each can review the other once (spec 07 AC-3); canceled, refunded, declined and expired offers cannot be reviewed. (ACCEPTED P-54)
- AC-36 Given legacy `custom_offers` rows, When they are migrated, Then they are imported as read-only history with their amounts, parties, status and files; legacy offers that are funded but not released are listed for staff before go-live and are not turned into escrows automatically (legacy never funded a HOLD for them). (ACCEPTED P-96)

---

## Business rules
- R-C1 **Direction** (Q-060a): the freelancer is the offer's author and seller; the buyer is the recipient and payer. Buyers do not create offers; they create requests.
- R-C2 **Recipient** (P-90): an offer can be sent only to a user with whom the freelancer has a direct conversation, or in answer to that user's request; never to oneself or to an inactive account.
- R-C3 **Offer content** (P-91, P-3): description 10–2,500; price ≥ 1.00 GEL, ≤ 2 decimals, ≤ 10 characters; delivery 1–365 days; revisions 0…S-041 (required); attachments per S-037…S-040; snapshot of everything plus fee rule versions at sending.
- R-C4 **Statuses**: `pending_approval` (only S-035 ON) → `sent` | `rejected`; `sent` → `in_progress` (paid) | `declined` | `withdrawn` | `expired`; `in_progress` → `delivered` ⇄ `revision_requested` → `completed`; `in_progress` → `canceled` (freelancer, before the first delivery); `in_progress | delivered | revision_requested` → `refunded` (spec 13). Flags `refund_open`, `dispute_open`.
- R-C5 **Requests** (P-92): `open` → `answered` (offer sent) | `declined` (freelancer) | `canceled` (buyer). No expiry. Not counted in plan limits.
- R-C6 **Expiry** (Q-060c, S-036): stored at sending (or approval); the sweeper expires unpaid offers; payments verified after expiry become unapplied payments (MM-05-06).
- R-C7 **Money** (00 R-3.1…R-3.5, P-6): buyer charged at payment (P + Fb, + surcharge on card); HOLD = P′ on `escrow:{offer}:hold`; completion / auto-release / staff release move H to the freelancer; cancel and accepted refunds return P to the buyer's Available; S and Fb never returned (Q-011). No promo codes (R-3.9).
- R-C8 **Delivery, revisions, timers**: identical to spec 06 R-O5, R-O6, R-O9, R-O10.
- R-C9 **Plan limit** (Q-060e, S-007): only when S-007 is ON; counts pending approval, sent, in progress, delivered and revision requested offers of the freelancer (P-9).
- R-C10 **Who may act**: freelancer — send, withdraw (unpaid), deliver, cancel (paid, before first delivery), thread, answer/decline requests, unblock request (when available, spec 13); buyer — request, pay, decline, revision, complete, thread, refund (spec 13), review; staff — approve/reject (S-035 ON), spec 13 tools; system — expiry, auto-release.

## Money movements (ledger map for ADR-003 / P2-B2)
"P" = offer price; "P′" = P − freelancer fee (S-018; today P′ = P); "Fb" = buyer fee (S-017; today 0); "S" = card surcharge on P + Fb (spec 05 R-P5); "H" = the offer's escrow balance (P′ while open).

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-12-01 | Card payment for the offer verified (AC-15) | `platform:bog_clearing` → `escrow:{offer}:hold` | P′ | `bog:{bogOrderId}:paid` |
| | | `platform:bog_clearing` → `platform:fee_revenue:custom_offer_freelancer_fee` | P − P′, only if S-018 is ON | same |
| | | `platform:bog_clearing` → `platform:fee_revenue:custom_offer_buyer_fee` | Fb, only if S-017 is ON | same |
| | | `platform:bog_clearing` → `platform:card_surcharge_revenue` | S | same |
| MM-12-02 | Wallet payment confirmed (AC-14) | `user:{buyer}:available` → `escrow:{offer}:hold` | P′ | `payment:{paymentId}:wallet` |
| | | `user:{buyer}:available` → `platform:fee_revenue:custom_offer_freelancer_fee` / `…:custom_offer_buyer_fee` | P − P′ / Fb, only if ON | same |
| MM-12-03 | Buyer completes (AC-25) | `escrow:{offer}:hold` → `user:{freelancer}:available` | H | `escrow:{offer}:release` |
| MM-12-04 | Auto-release (AC-27) | same as MM-12-03 | H | `escrow:{offer}:release` (shared with MM-12-03 and spec 13) |
| MM-12-05 | Freelancer cancels before the first delivery (AC-29) | `escrow:{offer}:hold` → `user:{buyer}:available` | H | `escrow:{offer}:refund` (shared with spec 13 refunds) |
| | | `platform:fee_revenue:custom_offer_freelancer_fee` → `user:{buyer}:available` | P − P′ (fee reversal; 0 today), so the buyer gets exactly P | same |
| (none) | Send, request, decline, withdraw, expire, staff approve/reject, card failed | – | 0 | – |

A verified payment for an expired, declined, withdrawn or already paid offer uses MM-05-06 (unapplied, full amount charged). Refunds and dispute decisions: spec 13 (`escrow:{offer}:refund` / `:release`).

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Offer form | modal from the chat header / request card / Selling → Offers | full screen; attachments from camera, library or files | validation errors; plan limit reached; uploading; sending; sent / pending approval |
| Request form | modal from profile / chat | full screen | freelancer unavailable (with date); sent |
| Offer card in chat | card with status chip, countdown, actions | same, full width | sent; pending approval (author only); paid → link to the offer page; declined / withdrawn / expired (grey) |
| Offer checkout | spec 05 checkout block with offer summary | payment sheet | quote changed; insufficient balance; offer expired; processing |
| Offer page (buyer / freelancer) | AC-33 | stacked sections, sticky action bar | in progress (expected date, Late); delivered (auto-complete date); revision requested; completed (review prompt); canceled / refunded (read-only); dispute open |
| Buying → Offers / Selling → Offers | tabs (AC-31, AC-32) | segmented tabs, filter chips | empty `t_no_offers_yet` / `t_no_offer_requests_yet`; loading; error |
| Admin → Custom offers (spec 16) | table, detail, approve/reject (S-035 ON) | – | – |

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `OfferRequested` (`t_subject_offer_requested`) + `t_buyer_requested_an_offer` | email + in-app + push | freelancer | request sent (AC-3) | **NEW** (Q-060a) |
| `t_offer_request_declined` | in-app + push | buyer | request declined (AC-5) | **NEW, ACCEPTED P-92** |
| `User/Freelancer/NewOfferReceived` (`t_subject_freelancer_new_offer_received`) + `t_a_new_custom_offer_received` | email + in-app + push | **buyer** | offer sent or approved (AC-9, AC-11) | LEGACY; CHANGE recipient (Q-060a) |
| `Admin/NewCustomOfferPending` (`t_subject_admin_new_offer_pending_approval`) | email | all S-100 | offer pending approval (AC-11, S-035 ON) | LEGACY; CHANGE recipients Q-026 |
| `User/Employer/YourOfferNeedsChanges` (`t_subject_employer_ur_offer_needs_changes`) + `t_an_offer_needs_changes_rejected_admin` | email + in-app + push | **freelancer** | staff reject (AC-11) | LEGACY; CHANGE recipient |
| `BuyerDeclinedYourOffer` (`t_subject_buyer_declined_ur_offer`) + `t_buyer_declined_ur_offer` | email + in-app + push | freelancer | buyer declines (AC-16) | **NEW** (replaces legacy `FreelancerRejectedYourOffer`, P-97) |
| `t_freelancer_withdrew_offer` | in-app + push | buyer | offer withdrawn (AC-17) | **NEW, ACCEPTED P-94** |
| `t_offer_expired_freelancer` / `t_offer_expired_buyer` | in-app + push | freelancer / buyer | expiry (AC-18) | **NEW, ACCEPTED P-95** |
| `User/Freelancer/OfferFunded` (`t_subject_freelancer_offer_funded`) + `t_a_custom_order_has_been_funded` | email + in-app + push | freelancer | offer paid (AC-14, AC-15) | LEGACY |
| `User/Employer/NewFinishedOfferFile` (`t_subject_employer_offer_new_file_received`) + `t_a_new_file_received_offer` | email + in-app + push | buyer | delivery (AC-21) | LEGACY (now per delivery) |
| `RevisionRequested` (spec 06) + `t_buyer_requested_revision_offer` | email + in-app + push | freelancer | revision requested (AC-22) | **NEW** (Q-056) |
| `t_new_message_about_offer` | in-app + push | other party | offer thread message (AC-24) | **NEW, ACCEPTED P-93** |
| `User/Freelancer/OfferPaymentReleased` (`t_subject_freelancer_offer_payment_released`) + `t_u_received_a_new_payment_offer` | email + in-app + push | freelancer | buyer completes (AC-25) | LEGACY |
| `t_offer_auto_completed_freelancer` / `t_offer_auto_completed_buyer` (subject `t_subject_order_auto_completed`) | email + in-app + push | freelancer / buyer | auto-release (AC-27) | **NEW** (Q-051) |
| `User/Employer/FreelancerCanceledYourOffer` (`t_subject_employer_freelancer_canceled_ur_offer`) + `t_freelancer_has_canceled_ur_offer` | email + in-app + push | buyer | freelancer cancels (AC-29) | LEGACY |

**Not carried over** (P-97): `User/Employer/FreelancerAcceptedYourOffer` + `t_notification_username_has_accpted_ur_offer` (there is no freelancer-accept step: the freelancer is the author; payment is the acceptance and sends `OfferFunded`); `User/Employer/FreelancerRejectedYourOffer` + `t_notification_username_has_rejected_ur_offer` (replaced by `BuyerDeclinedYourOffer`). Refund, dispute and unblock notifications: spec 13.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged unless noted):
| Key | en | ka |
|---|---|---|
| `t_offers` | Custom Offers | მორგებული შეთავაზებები |
| `t_submitted_offers` | Submitted offers | გაგზავნილი პერსონალური შეთავაზებები |
| `t_expected_duration` | Expected duration | მოსალოდნელი ხანგრძლივობა |
| `t_attachments` | Attachments | დანართები |
| `t_a_new_custom_offer_received` | A new custom offer received. | მიღებულია ახალი შემოთავაზება. |
| `t_a_custom_order_has_been_funded` | A custom order has been funded now. | შეკვეთის საფასური გადახდილია |
| `t_a_new_file_received_offer` | Freelancer sent you a file regarding your offer. (Owner may refine: "The freelancer delivered work for your offer.") | ფრილანსერმა გამოგიგზავნათ ფაილი თქვენს შეთავაზებასთან დაკავშირებით. |
| `t_freelancer_has_canceled_ur_offer` | Freelancer has canceled your order. | ფრილანსერმა გააუქმა შეკვეთა. |
| `t_u_received_a_new_payment_offer` | Employer has released a payment to you. | დამკვეთმა პროდუქტის საფასური გადაიხადა |
| `t_subject_freelancer_new_offer_received` | You have received a new offer | თქვენ მიიღეთ ახალი შეთავაზება |
| `t_subject_freelancer_offer_funded` | A payment has been funded | (legacy ka is English; NEW ka) შეთავაზების საფასური გადახდილია |
| `t_subject_freelancer_offer_payment_released` | You have received a new payment from an offer | თქვენ მიიღეთ ახალი გადახდა |
| `t_subject_employer_offer_new_file_received` | You have received a new file | თქვენ მიიღეთ ახალი ფაილი |
| `t_subject_employer_freelancer_canceled_ur_offer` | Your offer has been canceled | შეთავაზება გაუქმდა |
| `t_subject_employer_ur_offer_needs_changes` | Your offers needs changes (Owner may fix: "Your offer needs changes") | თქვენს შეთავაზებებს სჭირდება ცვლილებები |
| `t_subject_admin_new_offer_pending_approval` | A new offer pending approval | ახალი შეთავაზება ელოდება დადასტურებას |
| `t_an_offer_needs_changes_rejected_admin` | Your offer needs some changes before it can be visible. | იმისთვის რომ გამოჩნდეს თქვენი შეთავაზება, საჭიროა გარკვეული ცვლილებები |
| `t_this_user_is_not_available_right_now_msg` | This user is not available right now, and he will be back on :date | ეს მომხმარებელი არ არის ხელმისაწვდომი, ის დაბრუნდება :date |
| `t_payment_in_progress` | see 11 | see 11 |
| `t_plan_offer_limit_reached` / `t_feature_disabled` / `t_premium_required` | see 00 | see 00 |
| `t_auto_complete_notice` / `t_complete_order` / `t_request_revision` / `t_revisions_left` / `t_no_revisions_left` / `t_cannot_complete_during_dispute` / `t_late` / `t_delivery_number` / `t_subject_order_auto_completed` | see 06 | see 06 |
| `t_number_of_revisions` / `t_validator_revisions_range` | see 04 | see 04 |
| `t_user_cannot_receive_messages` / `t_create_an_offer` / `t_request_an_offer` | see 08 | see 08 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_offer_description` / `t_offer_description_hint` | Offer description / Describe exactly what you will deliver. | შეთავაზების აღწერა / ზუსტად აღწერეთ, რას მიაწვდით დამკვეთს. |
| `t_offer_price` / `t_offer_delivery_days` | Price / Delivery time (days) | ფასი / შესრულების ვადა (დღე) |
| `t_offer_you_receive` / `t_offer_buyer_pays` | You receive :amount / The buyer pays :amount (+ card fee if paid by card) | თქვენ მიიღებთ :amount-ს / დამკვეთი გადაიხდის :amount-ს (+ ბარათის საკომისიო ბარათით გადახდისას) |
| `t_validator_offer_price_min` | The minimum price is 1.00 GEL. | მინიმალური ფასია 1.00 ლარი. |
| `t_validator_offer_days` | Enter a whole number of days from 1 to 365. | შეიყვანეთ დღეების მთელი რიცხვი 1-დან 365-მდე. |
| `t_send_offer` / `t_offer_sent` | Send offer / Your offer has been sent. | შეთავაზების გაგზავნა / თქვენი შეთავაზება გაიგზავნა. |
| `t_offer_sent_pending_approval` | Your offer was sent for review and will reach the buyer after approval. | თქვენი შეთავაზება გადაიგზავნა განსახილველად და დამკვეთთან დამტკიცების შემდეგ მივა. |
| `t_offer_expires_on` | Expires on :date | ვადა იწურება :date-ს |
| `t_accept_and_pay` / `t_decline_offer` / `t_withdraw_offer` | Accept and pay / Decline / Withdraw offer | მიღება და გადახდა / უარყოფა / შეთავაზების გაწვევა |
| `t_decline_reason_optional` | Reason (optional) | მიზეზი (არასავალდებულო) |
| `t_offer_no_longer_available` | This offer is no longer available. | ეს შეთავაზება აღარ არის ხელმისაწვდომი. |
| `t_buyer_declined_ur_offer` / `t_subject_buyer_declined_ur_offer` | :buyer declined your offer. :reason / The buyer declined your offer | :buyer-მა უარყო თქვენი შეთავაზება. :reason / დამკვეთმა უარყო თქვენი შეთავაზება |
| `t_freelancer_withdrew_offer` | :freelancer withdrew their offer. | :freelancer-მა გაიწვია თავისი შეთავაზება. |
| `t_offer_expired_freelancer` | Your offer to :buyer expired because it was not paid in time. | თქვენი შეთავაზება :buyer-თან ვადაგასულია, რადგან დროულად არ გადაიხადეს. |
| `t_offer_expired_buyer` | The offer from :freelancer has expired. You can ask for a new one. | :freelancer-ის შეთავაზებას ვადა გაუვიდა. შეგიძლიათ ახალი მოითხოვოთ. |
| `t_status_offer_sent` / `t_status_offer_declined` / `t_status_offer_withdrawn` / `t_status_offer_expired` | Waiting for the buyer / Declined / Withdrawn / Expired | ელოდება დამკვეთს / უარყოფილია / გაწვეულია / ვადაგასულია |
| `t_offer_request_description` / `t_offer_request_budget_idea` / `t_offer_request_days_idea` | What do you need? / Budget idea (optional) / Wished delivery time in days (optional) | რა გჭირდებათ? / სავარაუდო ბიუჯეტი (არასავალდებულო) / სასურველი ვადა დღეებში (არასავალდებულო) |
| `t_send_request` / `t_offer_request_sent` | Send request / Your request has been sent to :freelancer. | მოთხოვნის გაგზავნა / თქვენი მოთხოვნა გაეგზავნა :freelancer-ს. |
| `t_buyer_requested_an_offer` / `t_subject_offer_requested` | :buyer asked you for a custom offer. / New offer request | :buyer-მა ინდივიდუალური შეთავაზება მოგთხოვათ. / შეთავაზების ახალი მოთხოვნა |
| `t_send_an_offer` / `t_decline_request` / `t_cancel_request` | Send an offer / Decline request / Cancel request | შეთავაზების გაგზავნა / მოთხოვნის უარყოფა / მოთხოვნის გაუქმება |
| `t_offer_request_declined` | :freelancer declined your offer request. :note | :freelancer-მა უარყო თქვენი მოთხოვნა შეთავაზებაზე. :note |
| `t_request_status_open` / `t_request_status_answered` / `t_request_status_declined` / `t_request_status_canceled` | Open / Answered / Declined / Canceled | ღია / პასუხგაცემული / უარყოფილი / გაუქმებული |
| `t_received_offers` / `t_my_offer_requests` / `t_sent_offers` / `t_offer_requests` | Received offers / My requests / Sent offers / Requests | მიღებული შეთავაზებები / ჩემი მოთხოვნები / გაგზავნილი შეთავაზებები / მოთხოვნები |
| `t_no_offers_yet` / `t_no_offer_requests_yet` | No offers yet. / No requests yet. | შეთავაზებები ჯერ არ არის. / მოთხოვნები ჯერ არ არის. |
| `t_buyer_requested_revision_offer` | :buyer requested a revision for your custom offer. | :buyer-მა თქვენს ინდივიდუალურ შეთავაზებაზე შესწორება მოითხოვა. |
| `t_new_message_about_offer` | :username sent you a message about a custom offer. | :username-მა ინდივიდუალურ შეთავაზებასთან დაკავშირებით შეტყობინება გამოგიგზავნათ. |
| `t_offer_auto_completed_freelancer` | Your custom offer for :buyer was completed automatically and :amount was added to your available balance. | თქვენი ინდივიდუალური შეთავაზება :buyer-თვის ავტომატურად დასრულდა და თქვენს ხელმისაწვდომ ბალანსს დაემატა :amount. |
| `t_offer_auto_completed_buyer` | The custom offer from :freelancer was completed automatically because no revision or refund was requested in time. You can now leave a review. | :freelancer-ის ინდივიდუალური შეთავაზება ავტომატურად დასრულდა, რადგან დროულად არ მოითხოვეთ შესწორება ან თანხის დაბრუნება. ახლა შეგიძლიათ დატოვოთ შეფასება. |
| `t_cancel_offer_order_confirm` | The buyer will get :amount back to their wallet. You can cancel only before your first delivery. | დამკვეთს საფულეზე დაუბრუნდება :amount. გაუქმება შესაძლებელია მხოლოდ პირველ მიწოდებამდე. |

## Edge cases
- EC-1 The buyer pays by wallet at the same moment the sweeper expires the offer: compare-and-set decides; if expired first, the wallet payment is refused (`t_offer_no_longer_available`) and nothing moves.
- EC-2 The freelancer withdraws while the buyer's card payment is pending: withdrawal is refused (`t_payment_in_progress`, spec 11) until the payment ends.
- EC-3 Two offers to the same buyer at the same time: allowed; each has its own card, expiry and HOLD.
- EC-4 S-034 switched OFF with sent, unpaid offers: they can no longer be paid and expire normally; open requests are closed as canceled (P-95).
- EC-5 S-007 switched ON with the freelancer already above the limit: existing offers stay; new ones are blocked (R-2.3).
- EC-6 The buyer's account is restricted after paying: the offer continues; auto-release runs (01 R-A8).
- EC-7 The freelancer sets 0 revisions: "Request a revision" never appears.
- EC-8 An offer attachment type is removed from S-040 after sending: the file stays downloadable.
- EC-9 The buyer and the freelancer are both Premium or Standard: no difference; offers are not Premium-gated.
- EC-10 A deleted user: offers and requests show "Deleted user"; unpaid offers to them are expired at once.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-12-1 | Offer payment never funds the freelancer's HOLD; release credits Available directly (D-05-9) | `UnifiedCheckoutComponent.php:606-646`; `PaymentBogController.php:97-126`; `Account/Offers` release | AC-14, AC-15, AC-25, MM-12-01…03 |
| D-12-2 | Offers never expire (accessor only); expiry reset after payment | `CustomOffer.php:94-97`; `UnifiedCheckoutComponent.php:629` | AC-18, R-C6 |
| D-12-3 | Buyer can delete a funded offer and get the money back, even after work started | `Account/Offers/OffersComponent.php` (`delete`) | AC-30 |
| D-12-4 | Freelancer cancel after work files were uploaded refunds budget + buyer fee | `Seller/Offers/OffersComponent.php:530-600` | AC-29 (before first delivery, price only, Q-011) |
| D-12-5 | Work files deletable; "final" flag instead of deliveries; no revisions | `Seller/Offers/OffersComponent.php:324-400, :619-660` | AC-21, AC-22 |
| D-12-6 | Double card fee (2.5% on top of the gateway fee) | `UnifiedCheckoutComponent.php:255-262` | AC-13 (Q-070) |
| D-12-7 | Buyer fee seeds 1.5% / 2.5% (not used) | `SettingsPublishTableSeeder.php` | S-017/S-018 OFF at 0 (P-6) |
| D-12-8 | Incomplete flow disabled in production (Q-027) | `settings_publish.enable_custom_offers` | this spec + QA before S-034 goes ON (Q-068c) |

## Out of scope
- Offers with milestones or several payments; offers linked to gigs as "extras" (not in legacy).
- Promo codes on offers (never allowed, R-3.9).
- Buyer-created offers (legacy direction, replaced by requests, Q-060a).
- Refund requests, disputes, unblock requests and staff tools (spec 13).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-90 One step for the buyer.** The freelancer sends the offer; the buyer accepts it **by paying**, or declines (optional reason). There is no separate "accept, then pay later" step (legacy: client offer → freelancer accept → client funds). Offers can be sent only to someone you already have a conversation with, or in answer to their request (prevents unsolicited offers). With S-035 ON (not at launch), staff approve first and the 3 days start at approval.
- **P-91 Offer fields.** Legacy fields (description ≤ 2,500, price, delivery 1–365 days, attachments per S-037…S-040) plus the mandatory number of revisions (P-3). NEW minimum price 1.00 GEL (legacy had none).
- **P-92 Offer requests.** The buyer describes the need (10–2,500 characters) with an optional budget idea and wished delivery time. The request appears in the chat and notifies the freelancer (email + in-app). The freelancer answers with an offer (pre-filled) or declines with an optional note. Requests do not expire and do not count in plan limits; the buyer can cancel an open request. Not possible while the freelancer is unavailable (BR-013).
- **P-93 Delivery and thread like gig orders.** A delivery = message + one optional file, kept forever and numbered; revisions and the 72 h auto-release as for gig orders. Legacy offers had several deletable "work files" and a "final" checkbox. Each paid offer gets its own thread (like the order delivery thread) with in-app notifications; general talk stays in the chat.
- **P-94 Cancel, withdraw, decline.** Before payment: the freelancer can withdraw, the buyer can decline. After payment: only the freelancer can cancel, and only before the first delivery; the buyer gets the price back to the wallet — the card fee and any buyer fee are not returned (Q-011; legacy returned the buyer fee). The buyer cannot cancel a paid offer (legacy let the buyer delete a funded offer with a refund); their route is a refund request (spec 13).
- **P-95 Expiry and switching off.** Unpaid offers expire 3 days (S-036) after sending; both sides are notified. A card payment confirmed after the expiry does not start the offer; the full amount goes to the buyer's wallet as "Unapplied payment" (spec 05 P-40). When S-034 is switched OFF: unpaid offers can no longer be paid (they expire), open requests are canceled, paid offers finish normally.
- **P-96 Legacy offer data.** Legacy offers are imported as read-only history. Any legacy offer that is funded but not released (legacy never put its money on the freelancer's HOLD) is listed for staff to settle manually before go-live, instead of creating an escrow automatically. Expected to be none, because the feature was switched off (Q-027); please confirm with a production check in Phase 5.
- **P-97 Notification mapping.** Because the direction changed, "new offer received" now goes to the buyer; "offer needs changes" (staff) goes to the freelancer; "freelancer accepted/rejected your offer" are not used (payment is the acceptance; "buyer declined your offer" is NEW). NEW: request received, request declined, offer withdrawn, offer expired, revision requested, offer thread message, automatic completion.
