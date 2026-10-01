# 06 — Gig orders
Status: **approved** (Owner 2026-09-28; P-38…P-65 accepted)
Author: product-analyst (P2-A3) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-030…BR-041, BR-080, BR-086, BR-122; `routes-and-pages.md` (`/cart`, `/checkout`, `/account/orders/*`, `/seller/orders/*`); `notifications.md` (order rows); `risks-and-debt.md` R-004, R-005, R-014, R-016, R-017, R-031, R-036. Owner decisions: Q-008, Q-009, Q-010, Q-011, Q-038, Q-045, Q-051, Q-056, Q-061, Q-065, Q-067, Q-071, Q-084. Platform rules: `00-platform-rules.md` §3, §4.4 (S-025…S-029), §4.8 (S-041), §4.13 (S-084…S-087), §4.18, AC-13, AC-14, AC-18, AC-19, EC-2, EC-3, X-16; P-1, P-2, P-5. Specs: 04 (gig data, R-G6, R-G8, R-G9), 05 (payments, MM-05-xx), 07 (reviews), 13 (refunds, disputes, unblock requests). ADR-003, ADR-004, ADR-008, ADR-009.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-46…P-53, see "Open questions").

Legacy code traced for this spec (read-only):
- **Add to cart** `app/Livewire/Main/Service/ServiceComponent.php:310-437`: seller unavailable → refused `:314-326`; own gig → refused `:329-338`; quantity 1–10 `:341-350`; the same gig added again replaces the old line `:359-373`; price and upgrades stored in the **session** cart `:376-418`. Guests can add to cart (the route has no auth); checkout needs login (`routes/web.php:177-190`).
- **Cart** `app/Livewire/Main/Cart/CartComponent.php`: line total = gig price + checked upgrades, **quantity forced to 1** ("services are purchased one at a time") `:172-231, :453-455`; checkout button re-checks that the gig is active and upgrades exist `:342-513` but keeps the **price stored in the session** (not re-read).
- **Checkout** `app/Livewire/Main/Checkout/CheckoutComponent.php` (CR line endings): order + items + invoice created **before** payment for BOG, admin email `NewPayment` at creation (BR-035); wallet path (BR-034); commission only when `commission_from = orders` (BR-033); upgrades persisted with a stale variable (R-036).
- **BOG success** `app/Http/Controllers/Main/PaymentBogController.php:51-95`: adds `profit_value` to the seller's pending balance on every hit of the return URL (R-004), eager-loads `gig:id,gig_id` (column does not exist, R-016), sends `PendingOrder` + in-app `t_notification_buyer_order_placed`, marks the invoice paid.
- **Buyer orders** `app/Livewire/Main/Account/Orders/OrdersComponent.php`: order details (free text in a modal, only when item `pending` and invoice paid, **no validation or length limit**) `:121-199`; buyer cancel while `pending` **without checking the invoice** → wallet credit of `total_value` (R-005) `:209-301`; "Pay" rebuilds the cart from current gig prices `:309-359`; delete unpaid order also subtracts seller pending (R-014) `:367-402`.
- **Seller orders** `app/Livewire/Main/Seller/Orders/OrdersComponent.php`: cancel only when `pending` and invoice paid `:175-259`; start needs order details, confirmation dialog `:269-330`, status `proceeded`, expected delivery = now + **current** gig delivery time + upgrade days `:340-442`.
- **Deliver** `app/Livewire/Main/Seller/Orders/Options/DeliverComponent.php`: allowed when `proceeded|delivered` `:81`; message required ≤ 2,500, one optional file zip/rar/7z ≤ 10 MB (hard-coded, `app/Http/Validators/Main/Seller/Orders/DeliverValidator.php:22-32`); status `delivered`, `delivered_at` `:184-403`; **re-submit deletes the previous delivery and its file** `:419-495`; seller messages in the delivery thread ≤ 750 chars, no notification to the buyer `:511-574`.
- **Buyer delivered-work page** `app/Livewire/Main/Account/Orders/Options/FilesComponent.php`: mount condition always true `:69`; buyer message ≤ 750 → `DeliveredWorkNewMessage` + in-app `:154-257` (`SendMessageValidator.php:26`); **complete** only when `delivered` and not finished: seller pending → available (non-atomic), queue −1, sales +1, pending refund closed, `OrderItemCompleted` to both, redirect to the review form `:266-347`.
- **Auto-complete** `app/Console/Commands/CompleteOrders.php:30-62`: not scheduled (R-031), window `delivered_at >= now − 1h` and an inverted refund filter; no notifications.
- **Unblock request** `app/Livewire/Main/Seller/UnblockRequests/CreateComponent.php` (BR-086; 72h after latest delivery). Detailed in spec 13.

---

## Goal
Take a buyer from "Add to cart" to a completed gig order in a way that is safe for both sides: the buyer pays once, immediately; the money sits on the freelancer's HOLD while the work is done; delivery, the agreed number of revisions, and completion (by the buyer or automatically after 72 hours of silence) move the money to the freelancer. This is vision priority 3 (escrow).

## Roles involved
- **Buyer** (any user; guest until checkout): cart, checkout, order details, cancel before start, revisions, completion, delivery-thread messages, review (spec 07).
- **Freelancer** (the gig owner): start, cancel before start, deliver, re-deliver after a revision request, delivery-thread messages, unblock request when available (spec 13).
- **System**: auto-release sweeper (ADR-008), BOG confirmation (spec 05).
- **Staff**: read orders and threads (Q-015), manual release/refund for exceptions and disputes (specs 13, 16).

## User stories
- As a buyer, I want to put one or more gigs with extras in a cart and pay for all of them at once, so that ordering is quick.
- As a buyer, I want the money to stay protected until I accept the work, so that I can order safely from someone new.
- As a buyer, I want to ask for the revisions the freelancer promised, so that I get what I agreed to.
- As a freelancer, I want to see the money on HOLD as soon as the buyer pays, so that I can start work safely (Q-038).
- As a freelancer, I want to be paid automatically if the buyer goes silent after my delivery, so that I do not have to chase anyone (Q-051).
- As either side, I want to talk about the delivery in the order itself, so that the history is kept with the order.

## Acceptance criteria

### Cart (BR-030)
- AC-1 Given a gig page (spec 04 AC-26), When a guest or logged-in user presses "Add to cart" with any upgrades ticked, Then the gig is added with quantity 1 and the chosen upgrades (`t_gig_added_to_ur_cart`), and the header cart count updates. Adding the same gig again replaces its line (new upgrade choice). (LEGACY `ServiceComponent.php:359-418`; quantity 1 ACCEPTED P-46)
- AC-2 Given the seller is unavailable or restricted, or the viewer owns the gig, When "Add to cart" is pressed, Then it is refused (spec 04 AC-29, AC-30). (LEGACY)
- AC-3 Given the cart page (`/cart`; mobile cart screen), When it opens, Then each line shows thumbnail, gig title (link), seller, base price, each chosen upgrade with its price and "+ N days", line total, and "Remove"; below: subtotal and "Checkout". An empty cart shows `t_ur_cart_is_empty` with "Continue shopping". (LEGACY `CartComponent.php`)
- AC-4 Given a logged-in user, When they add to cart on web, Then the same cart is visible on mobile (and back). A guest's cart is kept on the device and merged into the account cart at login (same gig: the newer line wins). (ACCEPTED P-47; legacy session cart)
- AC-5 Given a guest presses "Checkout", When they are not logged in, Then they are sent to login/registration and come back to checkout afterwards. (LEGACY `routes/web.php:177`)
- AC-6 Given the checkout opens or is confirmed, When the API validates the cart, Then each line is re-checked against current data: the gig is active and listable (spec 03 R-S1), the owner is available and not restricted, the buyer is not the owner, each upgrade still exists. A failing gig line is removed with `t_an_item_in_your_cart_doesnot_exist`, a missing upgrade with `t_an_upgrade_in_item_in_cart_not_found`, and the buyer sees the updated total. Prices and delivery times always come from current gig data, never from the cart. (LEGACY checks `CartComponent.php:342-513`; CHANGE: price re-read, legacy used the session price)

### Order creation and payment (Q-008, Q-038; spec 05)
- AC-7 Given a valid cart, When the buyer confirms payment (spec 05 checkout block), Then one order is created with one order item per gig. Each item stores a snapshot: gig title, freelancer, base price, chosen upgrades (title, price, extra days), delivery time, number of revisions allowed (spec 04 R-G6), fee amounts and fee-rule versions, and item price P = base price + upgrade prices. (LEGACY structure; snapshot of revisions NEW Q-056; ADR-005 §5)
- AC-8 Given Wallet is chosen and the balance covers the total, When the buyer confirms, Then in one step the total leaves the buyer's Available balance, every item becomes **paid** (status "Waiting for order details"), each freelancer's HOLD increases by that item's freelancer amount P′ (today P′ = P), each gig's "orders in queue" increases by 1, and the buyer lands on the order with `t_payment_received_details`. (LEGACY BR-034; MM-06-02)
- AC-9 Given Card is chosen, When the buyer confirms, Then the order is created as **awaiting payment** (no HOLD, no ledger entry, not visible to the freelancer) and the BOG page opens (spec 05 AC-9). When the payment is verified (spec 05 AC-10), Then the same effects as AC-8 happen, with the card surcharge recorded separately. (CHANGE Q-038: card-paid orders now fund the freelancer's HOLD reliably; legacy success path was broken, R-016, and replayable, R-004; MM-06-01)
- AC-10 Given an order becomes paid (wallet, card or confirmed bank transfer), When it happens, Then each freelancer gets `PendingOrder` (email) and `t_u_received_new_order_seller` (in-app + push) linking to the order; the buyer gets `OrderPlaced` (email); and, for card payments, `Admin/NewPayment` goes to every S-100 recipient. (LEGACY notifications; CHANGE P-52: `OrderPlaced` for every method, legacy only wallet; admin email after verification, legacy at order creation before payment)
- AC-11 Given an order still awaiting payment (card failed, expired or abandoned), When the buyer opens Buying → Orders, Then it shows "Awaiting payment" with "Pay" and "Delete". "Pay" starts a new card or wallet payment for the same order at the prices stored on it, if every gig is still orderable (AC-6 checks); otherwise it is refused with `t_order_items_no_longer_available` and only "Delete" remains. "Delete" removes the order and moves no money. (LEGACY buttons `OrdersComponent.php:309-402`; CHANGE: stored prices, P-53; delete posts nothing, fixes R-014)
- AC-12 Given an order awaiting payment, When the buyer or anyone tries to cancel it through the cancel action, Then there is nothing to refund: the only action is "Delete" (AC-11). No wallet credit is ever created for an unpaid order. (CHANGE, fixes R-005)

### Order details (requirements, BR-036)
- AC-13 Given a paid item waiting for order details, When the buyer opens it, Then a prominent "Send order details" box asks for the information the freelancer needs: formatted text (bold, italic, lists, links), required, 1–5,000 characters, sanitised. After saving, the item shows the details to both sides. (LEGACY free-text modal `OrdersComponent.php:121-199`; limits and required ACCEPTED P-48)
- AC-14 Given order details were sent, When the freelancer has not started yet, Then the buyer can edit them; after the start they are read-only. (LEGACY: editable while `pending`)
- AC-15 Given the buyer sends (or edits) order details, When they are saved, Then the freelancer gets `t_buyer_sent_order_details` (in-app + push). (NEW, ACCEPTED P-48; legacy sent nothing)

### Start (BR-037)
- AC-16 Given a paid item without order details, When the freelancer presses "Start", Then it is refused with `t_buyer_didnt_send_requirements_yet_continue`. (LEGACY `Seller/Orders/OrdersComponent.php:289-297`)
- AC-17 Given a paid item with order details, When the freelancer presses "Start" and confirms (`t_start_order_confirmation` / `t_are_you_ready_to_start_working_on_this_order` / `t_yes_start`), Then the status becomes **in progress**, the start time is stored, the expected delivery date = start + the item's delivery time + the sum of its upgrades' extra days (from the snapshot), and the buyer gets `OrderItemInProgress` (email) and `t_seller_has_started_ur_order` (in-app + push). (LEGACY `:340-442`; CHANGE: snapshot, legacy re-read the current gig delivery time)

### Cancel before start (BR-038; fixes R-005, R-014)
- AC-18 Given a paid item that is not started, When the buyer presses "Cancel order" and confirms (`t_are_u_sure_u_want_to_cancel_order`), Then the item becomes **canceled**, the item price P returns to the buyer's Available balance (the card fee and buyer-paid fees are not returned), the freelancer's HOLD decreases by P′, the gig's queue decreases by 1, an open refund request on it is closed, and the freelancer gets `User/Seller/OrderItemCanceled` (email) and `t_buyer_has_canceled_order` (in-app + push). (LEGACY `Account/Orders/OrdersComponent.php:209-301`; Q-010, Q-011; MM-06-05)
- AC-19 Given a paid item that is not started, When the freelancer presses "Cancel order" and confirms, Then the same money movement as AC-18 happens and the buyer gets `User/Buyer/OrderItemCanceled` (email) and `t_seller_has_canceled_ur_order` (in-app + push). (LEGACY `Seller/Orders/OrdersComponent.php:175-259`)
- AC-20 Given an item that is in progress, delivered or in revision, When either side looks for "Cancel", Then it is not offered and the API refuses it; the buyer's route is a refund request (spec 13, BR-080). (LEGACY: cancel only while `pending`)
- AC-21 Given buyer and freelancer cancel the same item at the same moment, When both are processed, Then the money moves once and the second action gets `t_order_status_changed` (compare-and-set, `escrow:{id}:refund`). (CHANGE, fixes R-017)

### Deliver (BR-039; X-16)
- AC-22 Given an item in progress or with a revision requested, When the freelancer delivers with a message (required, ≤ 2,500 chars) and optionally one file (≤ S-086 MB, type in S-087), Then a new delivery is stored (numbered 1, 2, 3 …), the status becomes **delivered**, the delivery time is stored, the auto-release deadline is set to delivery time + S-026 hours (value stored with the item), and the buyer gets `OrderDelivered` (email) and `t_seller_has_delivered_ur_order` (in-app + push). When S-025 is ON, both texts include the automatic completion date (`t_auto_complete_notice`). (LEGACY `DeliverComponent.php:184-403`; timer CHANGE Q-051; file rules P-49)
- AC-23 Given an item already delivered (no revision requested), When the freelancer tries to deliver again, Then it is refused with `t_looks_like_u_already_uploaded_completed_work`. There is no "re-submit" that replaces a delivery; every delivery stays in the item's history. (CHANGE X-16, Q-045; legacy re-submit deleted the previous delivery and file, `DeliverComponent.php:419-495`)
- AC-24 Given a delivery file, When anyone opens or downloads it, Then only the buyer, the freelancer and staff with the orders permission get a short-lived signed link; others get 404. (CHANGE, ADR-009; legacy files under public storage)

### Revisions (NEW Q-056, Q-061, P-1, P-2)
- AC-25 Given a delivered item whose revisions used < revisions allowed, When the buyer opens it, Then "Request a revision" is shown with `t_revisions_left` ("2 of 3 revisions left"). (NEW)
- AC-26 Given the buyer requests a revision with a message (required, ≤ 750 chars), When it is saved, Then the status becomes **revision requested**, revisions used increases by 1, the auto-release deadline is removed (timer stopped), the expected delivery date does not change, the message appears in the delivery thread, and the freelancer gets `RevisionRequested` (email) and `t_buyer_requested_revision` (in-app + push). (NEW Q-061b; details P-50)
- AC-27 Given revisions used = revisions allowed (including gigs with 0 revisions), When the buyer opens the delivered item, Then "Request a revision" is not shown, the API refuses it with `t_no_revisions_left`, and the buyer can only complete the order, open a refund request or dispute (spec 13), or write in the delivery thread. (ACCEPTED P-2)
- AC-28 Given a revision was requested, When the freelancer delivers again (AC-22), Then a fresh, full S-026 period (72h) starts from that delivery. (Q-071a)
- AC-29 Given the gig's number of revisions is edited after the order was placed, When the buyer views the order, Then the order keeps the number it was bought with. (spec 04 AC-10, R-G6)

### Completion by the buyer (BR-040)
- AC-30 Given a delivered item, When the buyer presses "Complete order" and confirms (`t_complete_order_confirm`), Then in one step: status **completed**, the item's HOLD is released to the freelancer's Available balance, the gig's queue −1 and sales +1, an open refund request is closed, the freelancer gets `User/Seller/OrderItemCompleted` (email) and `t_order_id_completed` (in-app + push), the buyer gets `User/Buyer/OrderItemCompleted` (email), and the buyer is taken to the review form (spec 07). (LEGACY `FilesComponent.php:266-347`; MM-06-03)
- AC-31 Given a dispute is open on the item (spec 13), When the buyer presses "Complete order", Then it is refused with `t_cannot_complete_during_dispute`; the admin decides. (ACCEPTED P-51)
- AC-32 Given an item with a revision requested (not yet re-delivered), When the buyer looks for "Complete order", Then it is not offered until the next delivery. (LEGACY: completion only when `delivered`)

### Automatic release (Q-051, Q-067, Q-071, Q-084; S-025, S-026)
- AC-33 Given S-025 is ON and a delivered item's auto-release deadline has passed with no revision requested, no open refund request and no open dispute, When the sweeper runs (every minute), Then the item is completed exactly as in AC-30 (actor "system"), and both sides are notified: freelancer `t_order_auto_completed_seller`, buyer `t_order_auto_completed_buyer` (email + in-app + push). Both may then write reviews. (CHANGE Q-051; legacy never ran, R-031; notifications NEW P-52; MM-06-04)
- AC-34 Given the buyer opens a refund request or a dispute on a delivered item, When it is opened, Then the deadline is removed immediately and no automatic release happens while it is open. (Q-067c)
- AC-35 Given a refund request on a delivered item ends without money moving (the buyer closes it, or it is rejected by the seller and no dispute follows), When it ends, Then a fresh, full S-026 period starts from that moment. Given a dispute ends, Then no timer restarts; the admin's decision releases or refunds the money (spec 13). (Q-071b, Q-071c)
- AC-36 Given S-025 is switched OFF, When the sweeper runs, Then nothing is released automatically; buyers complete manually, the automatic-completion date is hidden, and the freelancer's unblock request becomes available per S-028/S-029 (AC-45). (00 EC-3, ACCEPTED P-5)
- AC-37 Given S-025 is switched back ON, When the switch happens, Then every delivered item whose deadline is already in the past (and that is not paused) gets a fresh S-026 period from that moment; nothing is released at the next check. Items whose deadline is still in the future keep it. (Q-084)
- AC-38 Given S-026 is changed (e.g. 72 → 48), When it is saved, Then items already delivered keep their stored deadline; deliveries after the change use the new value. (00 EC-2)
- AC-39 Given the buyer completes the item at the same moment as the sweeper, When both run, Then the money is released once; the second action does nothing (`escrow:{id}:release`). (CHANGE, fixes R-017)

### Delivery thread (BR-122; Q-015, Q-065)
- AC-40 Given an item that is in progress, delivered or in revision, When the buyer or the freelancer writes a message (required, ≤ 750 chars) in the order's thread, Then it is added with sender and time. A buyer message sends `DeliveredWorkNewMessage` (email) and `t_buyer_sent_u_message_about_delivered_files` (in-app + push) to the freelancer; a freelancer message sends `t_seller_sent_u_message_about_order` (in-app + push) to the buyer. (LEGACY thread and buyer notification; freelancer-side notification NEW P-52)
- AC-41 Given an item that is completed, canceled or refunded, When the thread is opened, Then it is read-only. Staff with the chat permission can read it (spec 08/16). Migrated legacy delivery threads appear on their orders (Q-065). (LEGACY `is_finished` check; Q-015)

### Lists, detail and access
- AC-42 Given Buying → Orders (`/account/orders`), When it opens, Then it lists the buyer's order items newest first with gig, freelancer, amount paid, status chip, dates and the next action (Send order details, Pay, Request a revision, Complete order, Review). Filters: all, awaiting payment, active (paid, in progress, delivered, revision requested), completed, canceled/refunded. (LEGACY list; statuses NEW)
- AC-43 Given Selling → Orders (`/seller/orders`), When it opens, Then it lists the freelancer's paid items with buyer, amount (P′), status, expected delivery date (with a "Late" chip when passed and not delivered), and the next action (Start, Deliver). Filters as AC-42 plus "waiting for order details". Awaiting-payment orders never appear. (LEGACY; CHANGE: unpaid orders hidden)
- AC-44 Given any order item page or its API, When a user who is neither its buyer nor its freelancer (nor staff with permission) requests it, Then the answer is 404. (CHANGE, IDOR by design)

### Unblock request (BR-086; ACCEPTED P-5) — flow in spec 13
- AC-45 Given S-025 is OFF (or S-029 is ON), a delivered item, and at least S-028 hours (72) since the latest delivery, When the freelancer opens the item, Then "Request release of funds" is shown (one pending request per item). While S-025 is ON and S-029 is OFF, the button is hidden and the API refuses it. (ACCEPTED P-5; LEGACY 72h rule)

---

## Business rules
- R-O1 **Statuses** (item level): `awaiting_payment` (order not paid) → `paid` ("waiting for order details" until sent) → `in_progress` → `delivered` ⇄ `revision_requested` → `completed`; `paid` → `canceled` (before start); any paid, unfinished status → `refunded` (spec 13). Flags: `refund_open`, `dispute_open`. Legacy `proceeded` = `in_progress`; legacy `delivered` + `is_finished` = `completed`.
- R-O2 **Snapshot** (spec 04 R-G6, R-G9): price, upgrades, delivery time, revisions allowed, fees and fee versions are copied at order creation; later gig edits or setting changes do not change placed orders (00 AC-9, EC-2).
- R-O3 **Quantity**: always 1 per gig line (ACCEPTED P-46). One order item = one delivery flow = one review per side (Q-045).
- R-O4 **Money** (00 R-3.1…R-3.5): buyer charged at payment; HOLD = P′ per item; completion, auto-release or admin release move exactly the escrow balance to the freelancer; cancel before start and accepted refunds return P to the buyer's Available (Q-010, Q-011). Unpaid orders hold nothing.
- R-O5 **Revisions** (Q-056, P-1, P-2): allowed = snapshot (0…S-041); a request counts when made; no request when used = allowed; a request stops the timer; re-delivery restarts a full period (Q-071a).
- R-O6 **Auto-release** (ADR-008): deadline = delivery time + S-026 (stored hours), cleared by a revision request, refund request or dispute, reset to now + S-026 when a refund request ends without money moving, never reset after a dispute; the sweeper acts only while S-025 is ON; switching ON again gives overdue items a fresh period (Q-084).
- R-O7 **Orders in queue** (spec 04 R-G8): +1 when an item becomes paid; −1 when it is completed, canceled or refunded. Sales +1 on completion (including auto-release).
- R-O8 **Who may act**: buyer — order details, cancel before start, revision, complete, thread, refund (spec 13), review; freelancer — start, cancel before start, deliver, thread, unblock request (when available); system — auto-release; staff — spec 13/16.
- R-O9 **Deliveries** are append-only: each has a message, an optional file and a time; none is deleted by the users (dispute evidence, Q-065).
- R-O10 **Limits** (LEGACY fixed rules): delivery message ≤ 2,500; thread message ≤ 750; revision message ≤ 750 (P-50); order details ≤ 5,000 (P-48).

## Money movements (ledger map for ADR-003 / P2-B2)
"P" = item price (base + upgrades); "P′" = freelancer amount (P minus freelancer-paid commission S-013; today P′ = P); "S" = card surcharge on the order (spec 05 R-P5); "H" = the item's escrow balance (always P′ while open).

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-06-01 | Card payment for the order verified (AC-9) | `platform:bog_clearing` → `escrow:{item}:hold` for each item | P′ each | `bog:{bogOrderId}:paid` |
| | | `platform:bog_clearing` → `platform:fee_revenue:gig_order_commission` | Σ(P − P′), only if S-013 is ON | same |
| | | `platform:bog_clearing` → `platform:card_surcharge_revenue` | S | same |
| MM-06-02 | Wallet payment confirmed (AC-8) | `user:{buyer}:available` → `escrow:{item}:hold` for each item | P′ each | `payment:{paymentId}:wallet` |
| | | `user:{buyer}:available` → `platform:fee_revenue:gig_order_commission` | Σ(P − P′), only if S-013 is ON | same |
| MM-06-03 | Buyer completes the item (AC-30) | `escrow:{item}:hold` → `user:{freelancer}:available` | H | `escrow:{item}:release` |
| MM-06-04 | Auto-release by the system (AC-33) | same as MM-06-03 | H | `escrow:{item}:release` (same ref: only one of MM-06-03/04 or an admin release can post) |
| MM-06-05 | Cancel before start by buyer or freelancer (AC-18, AC-19) | `escrow:{item}:hold` → `user:{buyer}:available` | H | `escrow:{item}:refund` (same ref as an accepted refund in spec 13) |
| | | `platform:fee_revenue:gig_order_commission` → `user:{buyer}:available` | P − P′ (commission reversal, 0 today), so the buyer gets exactly P | same |
| (none) | Order awaiting payment deleted, card failed/expired (AC-11, AC-12) | – | 0 | – |

Bank-transfer confirmation uses MM-05-04. A verified payment for a deleted order uses MM-05-06. Accepted refunds, dispute decisions and admin releases are specified in spec 13 with the refs above. The surcharge S and buyer-paid fees are never returned (Q-011).

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Cart | `/cart`: lines with upgrades, remove, subtotal, "Checkout" | Cart tab/screen with the same lines; sticky "Checkout" bar | empty; loading; line removed notice (AC-6) |
| Checkout | `/checkout`: order summary left (items, upgrades, delivery times, revisions), payment block right (spec 05) | summary list, payment bottom sheet, sticky total + "Pay" | loading quote; quote changed; insufficient balance; error; submitting |
| Buyer order item | `/account/orders/{itemId}` (url-map decides the final path): header (gig, freelancer, price paid, upgrades, delivery time, revisions left), status timeline, order-details box, deliveries history (message, file, time), delivery thread, action bar (Complete, Request a revision, Refund request, Cancel) | same content as stacked sections; sticky action bar; files open in the system viewer | loading skeleton; awaiting payment (Pay/Delete); waiting for details (form); in progress (expected date, "Late"); delivered (auto-complete notice); revision requested; completed (review prompt); canceled/refunded (read-only) |
| Freelancer order item | `/seller/orders/{itemId}`: same header, order details, Start / Deliver form (message, file upload with progress), deliveries history, thread, unblock button when available | same; camera/file picker for the delivery file | waiting for details (Start refused hint); in progress (Deliver form); delivered (waiting for buyer, auto-release date); revision requested (revision message highlighted, Deliver form) |
| Order lists | Buying → Orders; Selling → Orders with filters (AC-42, AC-43) | tabs with filter chips | empty `t_no_orders_yet`; loading; error; success |

Key screen for design P2-C4: checkout and order detail. Accessibility: status chips have text, timeline is a list, the countdown to automatic completion is text ("completes automatically on 1 October, 14:00").

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Seller/PendingOrder` (`t_subject_seller_pending_order`) + `t_u_received_new_order_seller` | email + in-app + push | freelancer | item paid (AC-10) | LEGACY; in-app key unified (legacy BOG path used `t_notification_buyer_order_placed`, merged) |
| `User/Buyer/OrderPlaced` (`t_subject_buyer_order_has_placed`) | email | buyer | order paid by any method (AC-10) | LEGACY (wallet only), CHANGE P-52 all methods |
| `Admin/NewPayment` (`t_new_online_payment`) | email | all S-100 | card payment verified (AC-10) | LEGACY, CHANGE timing P-52 and recipients Q-026 |
| `t_buyer_sent_order_details` | in-app + push | freelancer | order details sent or edited (AC-15) | **NEW, ACCEPTED P-48** |
| `User/Buyer/OrderItemInProgress` (`t_subject_buyer_order_item_in_progress`) + `t_seller_has_started_ur_order` | email + in-app + push | buyer | start (AC-17) | LEGACY |
| `User/Buyer/OrderItemCanceled` (`t_subject_buyer_order_canceled`) + `t_seller_has_canceled_ur_order` | email + in-app + push | buyer | freelancer cancels (AC-19) | LEGACY |
| `User/Seller/OrderItemCanceled` (`t_subject_seller_order_item_canceled`) + `t_buyer_has_canceled_order` | email + in-app + push | freelancer | buyer cancels (AC-18) | LEGACY |
| `User/Buyer/OrderDelivered` (`t_subject_buyer_order_delivered`) + `t_seller_has_delivered_ur_order` | email + in-app + push | buyer | delivery and re-delivery (AC-22) | LEGACY; text gains the auto-complete date (NEW) |
| `RevisionRequested` (`t_subject_seller_revision_requested`) + `t_buyer_requested_revision` | email + in-app + push | freelancer | revision requested (AC-26) | **NEW** (Q-056) |
| `User/Seller/OrderItemCompleted` (`t_subject_seller_order_item_completed`) + `t_order_id_completed` | email + in-app + push | freelancer | buyer completes (AC-30) | LEGACY |
| `User/Buyer/OrderItemCompleted` (`t_subject_buyer_order_item_completed_thanks`) | email | buyer | buyer completes (AC-30) | LEGACY |
| `t_order_auto_completed_seller` / `t_order_auto_completed_buyer` (email subjects `t_subject_order_auto_completed`) | email + in-app + push | freelancer / buyer | auto-release (AC-33) | **NEW** (Q-051), ACCEPTED P-52 |
| `User/Seller/DeliveredWorkNewMessage` (`t_subject_seller_delivered_work_new_msg`) + `t_buyer_sent_u_message_about_delivered_files` | email + in-app + push | freelancer | buyer thread message (AC-40) | LEGACY |
| `t_seller_sent_u_message_about_order` | in-app + push | buyer | freelancer thread message (AC-40) | **NEW, ACCEPTED P-52** |

Refund, dispute and unblock notifications are in spec 13; review notifications in spec 07; bank-transfer notifications in spec 05.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_shopping_cart` | Shopping cart | კალათა |
| `t_ur_cart_is_empty` | Your shopping cart is empty | კალათა ცარიელია |
| `t_continue_shopping` | Continue shopping | შეძენის გაგრძელება |
| `t_remove` | Remove | წაშლა |
| `t_gig_added_to_ur_cart` | Gig has been added to your cart | განცხადება დამატებულია თქვენს კალათაში |
| `t_an_item_in_your_cart_doesnot_exist` | Looks like an item in your cart no longer exists | როგორც ჩანს, თქვენს კალათაში აღარ არის პროდუქტები (Owner may refine: "კალათაში არსებული ერთ-ერთი განცხადება აღარ არსებობს") |
| `t_an_upgrade_in_item_in_cart_not_found` | An upgrade in your cart is no longer exists | თქვენს კალათაში აღარ არის განახლებული პროდუქტი |
| `t_u_cant_add_ur_own_gigs_to_shopping_cart` | You can't add your own gigs to shopping cart | თქვენ ვერ დაამატებთ საკუთარ განცხადებას კალათაში |
| `t_orders` / `t_my_orders` | Orders / My orders | შეკვეთები / შეკვეთები |
| `t_order_details` | Order details | შეკვეთის დეტალები |
| `t_requirements` | Requirements | მოთხოვნები |
| `t_u_cant_submit_requirements_for_item` | You cannot submit required information for this item | თქვენ ვერ გაგზავნით მოთხოვნილ ინფორმაციას ამ პროდუქტისთვის |
| `t_we_are_waiting_for_payment_first` | We are waiting for a payment first | ჯერ ველოდებით გადახდას |
| `t_buyer_didnt_send_requirements_yet_continue` | Please make sure that the client has provided all necessary materials … (legacy text) | გთხოვთ, სამუშაოს დაწყებამდე გადაამოწმოთ … (legacy text) |
| `t_start_order_confirmation` | Start Order Confirmation | შეკვეთის დაწყების დადასტურება |
| `t_are_you_ready_to_start_working_on_this_order` | Are you ready to start working on this order? | მზად ხართ დაიწყოთ ამ შეკვეთაზე მუშაობა? |
| `t_yes_start` | Yes, Start | დაწყება |
| `t_order_has_been_successfully_marked_progress` | Order has been successfully marked as in progress | შეკვეთა წარმატებით მოინიშნა, როგორც მიმდინარე |
| `t_expected_delivery_date` | Expected delivery date | მიწოდების სავარაუდო დრო |
| `t_cancel_order` | Cancel order | შეკვეთის გაუქმება |
| `t_are_u_sure_u_want_to_cancel_order` | Are you sure you want to cancel this order? | დარწმუნებული ხართ რომ გსურთ შეკვეთის გაუქმება ? |
| `t_order_has_been_successfully_canceled` | Order item has been successfully canceled | შეკვეთა წარმატებით გაუქმდა |
| `t_deliver_work` | Deliver work | მიაწოდე ნამუშევარი |
| `t_delivered_work` | Delivered work | გამოგზავნილი ნამუშევარი |
| `t_quick_response` | Quick response | ნამუშევრის მოკლე აღწერა |
| `t_looks_like_u_already_uploaded_completed_work` | It looks like you already uploaded a completed work | როგორც ჩანს, თქვენ უკვე ატვირთეთ დასრულებული ნამუშევარი |
| `t_pending` / `t_in_progress` / `t_delivered` / `t_completed` / `t_canceled` | Pending / In progress / Delivered / Completed / Canceled | მომლოდინე / პროცესშია / მიწოდებული / დასრულებული / უარყოფილი (Owner may change `t_canceled` to "გაუქმებული") |
| `t_delete_order` | Delete order | შეკვეთის წაშლა |
| `t_pending_order_deleted_successfully` | Pending order has been deleted successfully | მოლოდინში მყოფი შეკვეთა წარმატებით წაიშალა |
| `t_order_item_could_not_be_found` | Order item could not be found | შეკვეთის ITEAM ვერ მოიძებნა (Owner may fix: "შეკვეთა ვერ მოიძებნა") |
| `t_message` / `t_send` | Message / Send | შეტყობინება / გაგზავნა |
| `t_toast_operation_success` | The operation was successful | ოპერაცია წარმატებით შესრულდა |
| `t_payment_received_details` / `t_paid` / `t_revisions_included` / `t_no_revisions` | see 05 / 00 / 04 | see 05 / 00 / 04 |
| Email subjects and in-app keys in "Notifications" (legacy ones) | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_status_awaiting_payment` | Awaiting payment | გადახდის მოლოდინში |
| `t_status_waiting_for_details` | Waiting for order details | ველოდებით შეკვეთის დეტალებს |
| `t_status_revision_requested` | Revision requested | მოთხოვნილია შესწორება |
| `t_status_refunded` | Refunded | თანხა დაბრუნებულია |
| `t_late` | Late | დაგვიანებული |
| `t_send_order_details` | Send order details | შეკვეთის დეტალების გაგზავნა |
| `t_send_order_details_hint` | Tell the freelancer everything they need to start: goals, texts, links, examples. You can edit this until the work starts. | მიაწოდეთ ფრილანსერს ყველაფერი, რაც სამუშაოს დასაწყებად სჭირდება: მიზნები, ტექსტები, ბმულები, მაგალითები. რედაქტირება შეგიძლიათ სამუშაოს დაწყებამდე. |
| `t_buyer_sent_order_details` | :buyer sent the details for order :order. You can start now. | :buyer-მა გამოგზავნა :order შეკვეთის დეტალები. შეგიძლიათ დაიწყოთ მუშაობა. |
| `t_order_items_no_longer_available` | Some gigs in this order can no longer be ordered. Please delete the order and add the gigs again. | ამ შეკვეთის ზოგიერთი განცხადების შეკვეთა აღარ არის შესაძლებელი. გთხოვთ, წაშალოთ შეკვეთა და განცხადებები ხელახლა დაამატოთ. |
| `t_order_status_changed` | This order has just changed. Please refresh the page. | ეს შეკვეთა ახლახან შეიცვალა. გთხოვთ, განაახლოთ გვერდი. |
| `t_request_revision` | Request a revision | შესწორების მოთხოვნა |
| `t_revisions_left` | :left of :total revisions left | დარჩენილია :left შესწორება :total-დან |
| `t_revision_message_hint` | Describe clearly what should be changed. | ნათლად აღწერეთ, რა უნდა შეიცვალოს. |
| `t_no_revisions_left` | You have used all revisions included in this order. You can complete the order or open a refund request. | ამ შეკვეთაში შემავალი ყველა შესწორება გამოყენებულია. შეგიძლიათ დაასრულოთ შეკვეთა ან მოითხოვოთ თანხის დაბრუნება. |
| `t_buyer_requested_revision` | :buyer requested a revision for order :order. | :buyer-მა :order შეკვეთაზე შესწორება მოითხოვა. |
| `t_subject_seller_revision_requested` | Revision requested | მოთხოვნილია შესწორება |
| `t_complete_order` | Complete order | შეკვეთის დასრულება |
| `t_complete_order_confirm` | Confirm that you accept the delivered work. The payment will be released to the freelancer. | დაადასტურეთ, რომ იღებთ მიწოდებულ სამუშაოს. თანხა ჩაერიცხება ფრილანსერს. |
| `t_cannot_complete_during_dispute` | This order has an open dispute. Our team will decide how the payment is released. | ამ შეკვეთაზე მიმდინარეობს დავა. თანხის განაწილებას ჩვენი გუნდი გადაწყვეტს. |
| `t_auto_complete_notice` | This order will be completed automatically on :date unless you request a revision or open a refund request. | ეს შეკვეთა ავტომატურად დასრულდება :date-ს, თუ არ მოითხოვთ შესწორებას ან თანხის დაბრუნებას. |
| `t_order_auto_completed_seller` | Order :order was completed automatically and :amount was added to your available balance. | შეკვეთა :order ავტომატურად დასრულდა და თქვენს ხელმისაწვდომ ბალანსს დაემატა :amount. |
| `t_order_auto_completed_buyer` | Order :order was completed automatically because no revision or refund was requested in time. You can now leave a review. | შეკვეთა :order ავტომატურად დასრულდა, რადგან დროულად არ მოითხოვეთ შესწორება ან თანხის დაბრუნება. ახლა შეგიძლიათ დატოვოთ შეფასება. |
| `t_subject_order_auto_completed` | Order completed automatically | შეკვეთა ავტომატურად დასრულდა |
| `t_seller_sent_u_message_about_order` | :seller sent you a message about order :order. | :seller-მა :order შეკვეთასთან დაკავშირებით შეტყობინება გამოგიგზავნათ. |
| `t_delivery_number` | Delivery :number | მიწოდება :number |
| `t_delivery_file_hint` | One file, up to :size MB (:types). | ერთი ფაილი, მაქსიმუმ :size MB (:types). |
| `t_request_release_of_funds` | Request release of funds | თანხის გათავისუფლების მოთხოვნა |
| `t_no_orders_yet` | You have no orders yet. | შეკვეთები ჯერ არ გაქვთ. |

## Edge cases
- EC-1 The buyer pays by card, closes the tab, and the callback arrives later: the order becomes paid and all AC-10 notifications are sent then (spec 05 EC-1).
- EC-2 The buyer deletes an awaiting-payment order, then BOG confirms the old payment: the full charged amount goes to the buyer's wallet as "Unapplied payment" (spec 05 AC-15, P-40).
- EC-3 A gig is deleted or set to pending while it is in someone's cart: it is removed at checkout (AC-6). A gig with paid items cannot be deleted (spec 04 AC-24).
- EC-4 The freelancer becomes unavailable or restricted after an order is paid: existing orders continue; only new cart additions are refused.
- EC-5 One order has items from two freelancers: each item has its own HOLD, status, delivery, timer and review; canceling one does not affect the other.
- EC-6 A gig with 0 revisions: "Request a revision" never appears (AC-27).
- EC-7 The buyer requests a revision one minute before the auto-release: the request stops the timer; if the sweeper already locked the row, the revision request gets `t_order_status_changed` and the order is completed (compare-and-set decides).
- EC-8 The expected delivery date passes while the item is in progress: the list shows "Late"; the buyer may open a refund request (spec 13, BR-080). Nothing happens automatically.
- EC-9 A migrated legacy item that is `delivered` and not finished: it gets an auto-release deadline of go-live + S-026 (fresh period; same principle as Q-084), unless a refund is open. Legacy `proceeded` items migrate as in progress. (ACCEPTED P-53b)
- EC-10 Auto-release is OFF, then ON: an item delivered 5 days ago gets 72 fresh hours from the switch (AC-37).
- EC-11 A buyer's account is banned while an order is delivered: the timer continues and auto-release pays the freelancer (the buyer can no longer act). Staff may pause via a dispute (spec 13).

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-06-1 | Buyer cancels an unpaid card order and gets wallet credit (R-005) | `Account/Orders/OrdersComponent.php:209-241` | AC-12, AC-18 (only paid items), R-P6 of spec 05 |
| D-06-2 | Deleting an unpaid order subtracts seller pending that was never added → negative pending (R-014) | `Account/Orders/OrdersComponent.php:367-400` | AC-11 (delete posts nothing) |
| D-06-3 | Card success path selects a non-existent column; queue counters and HOLD unreliable (R-016, Q-038) | `PaymentBogController.php:55-61, 84` | AC-9, MM-06-01 |
| D-06-4 | Return URL re-credits seller pending on every hit (R-004) | `PaymentBogController.php:63-70` | AC-9 (verified payment, `bog:{id}:paid`) |
| D-06-5 | Upgrades persisted with a stale variable (R-036) | `CheckoutComponent.php` (CR) `wallet()`/`bog()` | AC-7 (snapshot of every chosen upgrade) |
| D-06-6 | Checkout uses the price stored in the session cart | `ServiceComponent.php:387`, `CartComponent.php:342-513` | AC-6 (price re-read) |
| D-06-7 | Quantity 1–10 offered, silently reset to 1 in the cart | `ServiceComponent.php:341`, `CartComponent.php:187-189, 453-455` | AC-1, R-O3 (P-46) |
| D-06-8 | Expected delivery computed from the gig's current delivery time, not the purchased one | `Seller/Orders/OrdersComponent.php:423-441` | AC-17 (snapshot) |
| D-06-9 | Order details saved with no validation, length limit or notice | `Account/Orders/OrdersComponent.php:164-199` | AC-13…AC-15 (P-48) |
| D-06-10 | Unlimited re-submits that delete the previous delivery and file (X-16) | `DeliverComponent.php:419-495` | AC-23, R-O9 |
| D-06-11 | Auto-complete command unscheduled, wrong 1-hour window, inverted refund filter (R-031) | `CompleteOrders.php:30-62` | AC-33…AC-39, ADR-008 |
| D-06-12 | Completion and cancel update balances non-atomically (R-017) | `FilesComponent.php:288-294`; `Seller/Orders/OrdersComponent.php:191-203` | AC-21, AC-39 (compare-and-set + refs) |
| D-06-13 | Admin email `NewPayment` sent before the buyer pays | `CheckoutComponent.php` (CR) `bog()` | AC-10 (P-52) |
| D-06-14 | Freelancer messages in the delivery thread notify nobody | `DeliverComponent.php:511-574` | AC-40 (P-52) |
| D-06-15 | Delivered-work page guard is always true | `FilesComponent.php:69` | AC-44 (access rule) |
| D-06-16 | Level recalculation after completion (X-05) | `FilesComponent.php:341` | removed (Q-014) |
| D-06-17 | Admin order delete "refunds" a non-existent column (R-015) | `Admin/Orders/OrdersComponent.php:101` | no delete; staff use refund/release (spec 13) |

## Out of scope
- Refund requests, disputes, admin resolution and the unblock-request flow itself (spec 13).
- Reviews (spec 07). General chat (spec 08). Custom offers (spec 12). Project orders (spec 11).
- Structured requirement questions and requirement files (not in the live wizard, spec 04 P-32); buyers can send files in chat (spec 08).
- Tips, order extensions, order-level discounts: not in legacy.

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-46 Quantity is always 1.** Legacy lets the buyer choose 1–10 on the gig page, but the cart silently resets it to 1 ("services are purchased one at a time"), so buyers pay for 1 anyway. Proposal: remove the quantity selector; one order item = one delivery = one review (Q-045). **This corrects spec 04 AC-26** ("quantity 1–10" in the purchase box), which is already approved, so it needs your OK. A buyer who wants two can order twice.
- **P-47 One cart on all devices.** A logged-in user's cart is stored on the account (web and mobile share it); a guest's cart is kept on the device and merged at login. Prices are always re-read at checkout (legacy kept the price from the moment of "Add to cart").
- **P-48 Order details.** Required, formatted text up to 5,000 characters, editable until the work starts; the freelancer is notified when they arrive (legacy had no limit, no validation and no notification, so freelancers did not know when they could start). No file upload in this box; files go through chat.
- **P-49 Delivery file.** One optional file per delivery, limits from the register: size S-086 (50 MB) and types S-087. S-087 had no known production value (Q-068); proposed fallback **zip, rar, 7z** (the only list in legacy code, `DeliverValidator.php:30`, which also hard-coded 10 MB; the register's 50 MB applies). Every delivery is kept; there is no re-submit that replaces a delivery (X-16).
- **P-50 Revision request details.** The buyer writes what to change (required, up to 750 characters, same as thread messages); the request counts immediately; the order shows "Revision requested"; the expected delivery date is not moved.
- **P-51 Completing during a dispute.** "Complete order" closes an open refund request (legacy) but is refused while a dispute is open, because the admin decides then (Q-071c).
- **P-52 Order notifications.** (a) `OrderPlaced` goes to the buyer for every payment method (legacy: wallet only). (b) `Admin/NewPayment` is sent after the card payment is verified (legacy sent it when the order was created, before payment, so abandoned checkouts also produced emails). (c) NEW: automatic completion notifies both sides; a freelancer message in the delivery thread notifies the buyer in-app (legacy notified only the freelancer side).
- **P-53 Unpaid and migrated orders.** (a) "Pay" retries the same order at the prices stored on it, if every gig can still be ordered; otherwise the buyer deletes it and orders again (legacy rebuilt the cart at current prices and left the old unpaid order behind). (b) Migrated legacy items that are delivered but not finished get a fresh S-026 period (72h) from go-live, the same principle you chose for re-enabling auto-release (Q-084), so no buyer loses the chance to react; items with an open refund stay paused.
