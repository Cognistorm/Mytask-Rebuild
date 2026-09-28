# 13 — Refunds, disputes and unblock requests
Status: **approved** (Owner 2026-09-29; P-66…P-105 accepted)
Author: product-analyst (P2-A4) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-080…BR-086, BR-122; `routes-and-pages.md` (`/account/refunds/*`, `/account/project-refunds/*`, `/seller/refunds/*`, `/seller/unblock-requests/*`, admin refunds / project refunds / unblock requests); `notifications.md` (refund, dispute and unblock rows); `data-model.md` (`refunds`, `refund_conversation`, `project_refunds`, `project_refund_conversations`, `unblock_money_requests`); `risks-and-debt.md` **R-012**, R-017, R-037. Owner decisions: Q-008, Q-010, Q-011, Q-012, Q-015, Q-026, Q-037, Q-051, Q-065, Q-067, Q-071, Q-084. Platform rules: `00-platform-rules.md` §3 (R-3.1, R-3.3, R-3.5, R-3.6), §4.4 (S-025…S-029), §4.5 (S-030), §4.18 (one pending refund per item, one pending unblock request per item), AC-15, AC-18, AC-19, AC-21, EC-3; P-5. Specs: 05 (R-P12), 06 (AC-18…AC-21, AC-30, AC-31, AC-34…AC-38, AC-45, MM-06-xx), 07 EC-2 (reviews after decisions), 08 (threads, staff access), 11 (MM-11-xx), 12 (MM-12-xx), 16 (staff permissions). ADR-003, ADR-007, ADR-008.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-98…P-105, see "Open questions").

Legacy code traced for this spec (read-only):
- **Gig refund request** `app/Livewire/Main/Account/Refunds/Options/RequestComponent.php:32-88, :161-239`: buyer's item, not finished, **started** (`expected_delivery_date` not null), status `pending|proceeded|delivered`, and delivered **or** expected date passed; **one refund per item ever** (an existing one redirects to `account/refunds/{uid}`, a route that does not exist, R-037); reason required ≤ 1,500 (`Validators/Main/Account/Refunds/RequestValidator.php:26`); `RefundRequest` email + in-app `t_buyer_opened_new_refund_request` to the seller.
- **Buyer refund page** `Account/Refunds/Options/DetailsComponent.php`: messages ≤ 750 (`MessageValidator.php:25`) **only while pending**, broadcast `NewRefundMessage`, email + in-app to the seller, `Admin/NewRefundMessage` when a dispute is open `:136-208`; close while pending → `RefundClosed` + in-app `:217-268`; raise a dispute when `rejected_by_seller` — the check lets the buyer **raise it again and again** (duplicate admin emails) `:277-326`.
- **Seller refund page** `Seller/Refunds/Options/DetailsComponent.php` (gig and project): accept gig refund → item `refunded` + finished, buyer `+ total_value`, seller pending `− profit` clamped at 0 `:201-251`; accept project refund → client `+ amount + employer commission` from **all funded milestones**, **all** milestones (also paid ones) set to refunded, project set to **completed**, client pending reduced, in-app only `:253-313`; decline → `rejected_by_seller` `:344-395`. **The seller cannot write in the refund thread** (no send method).
- **Project refund** `Account/ProjectRefunds/Options/RequestComponent.php:30-62, :124-190`: only requires project `pending_final_review` with a funded/paid milestone — **the "delivered or deadline passed" rule is only in the page button** (`PayComponent.php:1396-1415`); in-app only, no email; `DetailsComponent.php:100-134`: conversation removed, dispute flag set **without any admin notification**.
- **Auto-reject** `app/Console/Commands/AutoRejectStaleRefunds.php:29-46` (hourly): pending gig and project refunds older than 2 days → `rejected_by_seller`; **no notification**.
- **Admin gig refund** `app/Livewire/Admin/Refunds/Options/DetailsComponent.php:80-240`: accept or decline when `rejected_by_seller` (with or without a dispute); decline pays the seller (pending → available) and finishes the item without changing its status; in-app only. **Admin project refund** `Admin/ProjectRefunds/Options/DetailsComponent.php:65-200`: also acts on **pending** requests; accept uses the **first milestone whatever its status** and does not reduce the client's pending; decline credits the freelancer's available **without reducing pending** (double money, R-012); both set the project to completed.
- **Unblock request** `app/Livewire/Main/Seller/UnblockRequests/CreateComponent.php:41-311`: order item `delivered` and unfinished, or project `pending_final_review` without refunded milestones; **72 h** after the latest delivery (hard-coded); reason 10–1,000 (English-only messages in code); amount = order profit or **the gross bid amount** for projects `:125-137`; one pending per resource; **no admin notification**. Admin: **two different approvals** — list page moves pending → available and completes the item `UnblockRequestsComponent.php:58-140`; detail page **only adds available** (pending never reduced → double pay possible) `Options/DetailsComponent.php:62-125`; decline without a reason.
- Statuses: `refunds.status` (pending, rejected_by_seller, rejected_by_admin, accepted_by_seller, accepted_by_admin, closed) + `request_admin_intervention` (= dispute); `app/Enums/ProjectRefundStatus.php` (same values); `app/Enums/UnblockMoneyRequestStatus.php` (pending, approved, rejected, closed).

---

## Goal
Give buyers one fair way to get their money back when paid work is late or wrong — for gig orders, projects and custom offers alike: ask the freelancer for a refund, and if the freelancer refuses (or stays silent for 2 days), let MyTask staff decide. Refunds always go to the buyer's wallet, item price only. Keep the 72-hour auto-release consistent with open requests and disputes, and keep the freelancer's "unblock request" as a fallback only while auto-release is switched off. One money implementation serves every path, so the legacy double-payment bugs (R-012) cannot return.

## Roles involved
- **Buyer / client**: requests a refund, writes in the refund thread, closes the request, raises a dispute.
- **Freelancer / seller**: accepts or declines, writes in the thread, asks for release of funds (unblock request) when available.
- **Staff** (Customer Support / Financial Manager / Super-admin, spec 16): decides disputes, writes in refund threads as "MyTask", approves or declines unblock requests, uses the exceptional "Release funds" and "Refund buyer" tools.
- **System**: 2-day auto-reject sweeper, timer changes (ADR-008).

## User stories
- As a buyer, I want to request a refund when the work is late or not what we agreed, so that I do not lose my money.
- As a freelancer, I want to answer a refund request and explain my side, so that I am not refunded unfairly.
- As a buyer, I want MyTask to decide when the freelancer refuses, so that there is a neutral judge.
- As a freelancer, I want to ask MyTask to release my money when a silent buyer blocks it and automatic release is switched off.
- As the Owner, I want every refund and release to use the same, provable money movements, so that nobody is paid twice.

## Acceptance criteria

### When a refund can be requested (BR-080, BR-085; P-98, P-99)
- AC-1 Given a paid gig order item that is **in progress with its expected delivery date passed**, **delivered**, or **revision requested**, and not finished, When its buyer opens it, Then "Request refund" is shown. Before the start the buyer cancels instead (06 AC-18); in progress before the expected date the button is disabled with `t_u_can_request_refund_when_expected_date_finish`. (LEGACY `RequestComponent.php:32-82`; revision requested added, ACCEPTED P-98)
- AC-2 Given a paid project contract (spec 11) or a paid custom offer (spec 12) that is in progress with its expected delivery date passed, delivered, or revision requested, When its buyer opens it, Then "Request refund" is shown; otherwise it is disabled with `t_refund_available_after_delivery_time_expires`. The API enforces the same rule. (LEGACY project rule from the page `PayComponent.php:1396-1415`, now server-side; offers NEW; ACCEPTED P-98)
- AC-3 Given the item already has a refund request (in any status), When the buyer looks for "Request refund", Then it is not offered; the page links to the existing request. The API refuses a second one with `t_refund_already_requested`. (LEGACY one per item `RequestComponent.php:50-58`; fixes the broken redirect R-037; ACCEPTED P-99)
- AC-4 Given a canceled, completed or refunded item, or an unpaid one, When a refund is attempted, Then it is refused with `t_u_cant_request_refund_for_this_item_now`. (LEGACY)

### Opening a request (Q-012, Q-067c)
- AC-5 Given an eligible item, When the buyer submits a reason (required, 1–1,500 characters), Then in one step: a refund request is created with status **pending** and a seller deadline = now + S-030 days (default 2, stored); the item gets the `refund_open` flag; its auto-release deadline is removed (timer stopped); the buyer lands on the refund page (`t_ur_refund_request_has_been_sent`); and the freelancer gets `RefundRequest` (email, `t_subject_seller_refund_request`) and `t_buyer_opened_new_refund_request` (in-app + push) — the same for gig orders, projects and offers. (LEGACY gig flow; CHANGE: projects get the email too, legacy in-app only; timer Q-067c, spec 06 AC-34)

### Freelancer's answer (BR-081, BR-082)
- AC-6 Given a pending request, When the freelancer presses "Accept refund" and confirms (`t_accept_refund_confirm`), Then in one step: the item becomes **refunded** (for gig orders the gig's queue −1), the item price P returns to the buyer's Available balance (card fee and buyer-paid fees are not returned, Q-010, Q-011), the freelancer's HOLD decreases by the item's escrow balance, the request becomes **accepted by seller**, and the buyer gets `RefundAccepted` (email, `t_subject_buyer_refund_accepted`) and `t_seller_has_accepted_ur_refund` (in-app + push). No reviews are possible (spec 07 R-V1). (LEGACY `Seller/Refunds/Options/DetailsComponent.php:201-313`; CHANGE: one implementation for all item types, projects no longer marked "completed"; MM-13-01)
- AC-7 Given a pending request, When the freelancer presses "Decline refund" (optional message ≤ 1,500, added to the thread) and confirms, Then the request becomes **rejected by seller**, the buyer gets `RefundDeclined` (email, `t_subject_buyer_refund_declined`) and `t_seller_has_declined_ur_refund` (in-app + push) with a "Raise a dispute" link. (LEGACY `:344-395`; optional message ACCEPTED P-100)
- AC-8 Given a pending request whose seller deadline has passed without an answer, When the sweeper runs (every minute), Then the request becomes **rejected by seller** (marked "no answer in time"), and the buyer (`t_refund_auto_rejected_buyer`, with the dispute link) and the freelancer (`t_refund_auto_rejected_seller`) get in-app + push notifications. (LEGACY rule Q-012, BR-082; CHANGE: every minute and editable S-030, legacy hourly and hard-coded; notifications NEW ACCEPTED P-100)
- AC-9 Given S-030 is changed, When it is saved, Then requests already open keep their stored deadline (00 EC-2).

### Buyer closes or disputes (BR-083; Q-071)
- AC-10 Given a pending request, When the buyer presses "Close refund" and confirms, Then it becomes **closed**, `refund_open` is removed, and the freelancer gets `RefundClosed` (email, `t_subject_seller_refund_closed`) and `t_a_refund_has_closed` (in-app + push). (LEGACY `Account/Refunds/Options/DetailsComponent.php:217-268`)
- AC-11 Given a request ends **without money moving** — closed by the buyer (AC-10), or rejected by the seller manually or automatically (AC-7, AC-8) — When the item is delivered (not in revision), Then a fresh, full S-026 period starts from that moment (auto-release deadline = now + S-026). If the item is not delivered, nothing starts until the next delivery. If a dispute is raised later, it stops the timer again (AC-13). (Q-071b; spec 06 AC-35)
- AC-12 Given a request **rejected by seller** on an item whose money is still on HOLD (not completed, not auto-released), When the buyer presses "Raise a dispute" and confirms (`t_raise_dispute_confirm`), Then the request gets the **dispute** flag (once only; the button disappears), `Admin/RefundDispute` (`t_subject_admin_refund_dispute_raised`) goes to every S-100 address, and the freelancer gets `t_buyer_opened_new_refund_dispute` (in-app + push). This works the same for gig orders, projects and offers. (LEGACY gig flow; CHANGE: projects notify staff too, legacy set the flag silently; raising twice impossible, legacy sent duplicates; ACCEPTED P-100)
- AC-13 Given a dispute is raised, When it is open, Then the item's auto-release deadline is removed and never restarts afterwards (Q-071c); the buyer cannot complete the item (`t_cannot_complete_during_dispute`, spec 06 P-51) nor request a revision; the freelancer may still deliver — deliveries are stored as evidence and do not start the timer. (Q-067c, Q-071c; revision and deliveries ACCEPTED P-104)
- AC-14 Given a pending request, When the buyer completes the item instead (06 AC-30, 11 AC-36, 12 AC-25), Then the request becomes **closed** automatically (legacy "pending refund closed") and the money is released to the freelancer. Given the freelancer delivers while a request is pending, Then the delivery is stored and the timer stays stopped until the request ends. (LEGACY completion closes pending refunds `FilesComponent.php:266-347`)

### Staff decision on a dispute (BR-084; Q-037; P-102)
- AC-15 Given a staff member with permission `refunds.resolve`, When they open Admin → Disputes, Then they see open disputes oldest first with item type, buyer, freelancer, price paid, escrow amount, request reason, days open, and on the detail page: the item with all deliveries and files, the item thread (spec 06/11/12), the refund thread, and a link to the parties' direct conversation (opening it is audit-logged, spec 08 AC-30). (LEGACY admin refund pages; merged list NEW)
- AC-16 Given an open dispute, When staff choose **"Refund the buyer"** with an internal reason (required) and an optional public note, Then in one step: the item becomes **refunded**, P returns to the buyer's Available balance (not the card fee or buyer fees), the freelancer's HOLD decreases by the escrow balance, the request becomes **accepted by MyTask**, and the buyer (`t_app_name_has_approved_ur_refund_request`) and the freelancer (`t_app_name_has_approved_refund_request_from_buyer`) get in-app + push and the email `RefundDecided` (`t_subject_refund_decided`), with the public note. (LEGACY accept `Admin/Refunds/Options/DetailsComponent.php:80-180`; CHANGE: emails NEW, one implementation for all types; MM-13-02)
- AC-17 Given an open dispute, When staff choose **"Release to the freelancer"** with an internal reason (required) and an optional public note, Then in one step: the item becomes **completed** (for gig orders sales +1 and queue −1), the escrow balance moves to the freelancer's Available balance, the request becomes **rejected by MyTask**, the buyer (`t_app_name_has_declined_ur_refund_request`) and the freelancer (`t_app_name_released_funds_after_dispute`) get in-app + push and `RefundDecided`, and both may review each other (spec 07 EC-2). (LEGACY decline `:184-240`; CHANGE: item status completed, legacy only set "finished"; freelancer message NEW; MM-13-03)
- AC-18 Given staff decide, When the decision is saved, Then the audit log records staff member, time, decision, amounts and reasons; the decision is final in the product (no appeal flow); the refund thread becomes read-only. (NEW audit, spec 16)
- AC-19 Given a request that is pending or rejected without a dispute, When staff open it, Then they can read and write in its thread but cannot decide it; only disputes are decided (exceptional cases use AC-32/AC-33). (CHANGE: legacy admin could decide undisputed gig refunds and pending project refunds; ACCEPTED P-102)
- AC-20 Given two staff members decide the same dispute at the same moment, or a decision meets the buyer closing the request, When both are processed, Then only the first changes anything; the second gets `t_order_status_changed`. (CHANGE, fixes R-017)

### Refund thread (BR-122; Q-065; P-101)
- AC-21 Given a refund request, When the buyer, the freelancer or staff open it, Then they see its thread (oldest first) and can write (required, ≤ 750 characters) while the request is pending, rejected by seller, or disputed; staff messages show as "MyTask". Messages arrive in real time. After the request is accepted, closed or decided, the thread is read-only. (LEGACY thread and realtime `NewRefundMessage`; CHANGE: the freelancer can write too, and writing continues during the dispute; legacy: buyer only, pending only; project refund threads existed but had no screen)
- AC-22 Given a new thread message, When it is saved, Then the other party gets `t_new_message_about_refund` (in-app + push) and the email `NewRefundMessage` (`t_subject_buyer_new_refund_message` / `t_subject_seller_new_refund_msg`) at most once per 10 minutes per sender per request; when a dispute is open, `Admin/NewRefundMessage` goes to every S-100 address with the same throttle. (LEGACY notifications; throttle ACCEPTED P-101)

### Unblock request — only while auto-release is OFF (BR-086; P-5; P-103)
- AC-23 Given S-025 is OFF (or S-029 is ON), a delivered item (gig order, project contract or custom offer) with no open refund request or dispute, at least S-028 hours (default 72) since its latest delivery, and no pending unblock request for it, When its freelancer opens the item, Then "Request release of funds" is shown. While S-025 is ON and S-029 is OFF, it is hidden and the API refuses it. Before S-028 hours it shows `t_unblock_request_72_hour_wait` with the remaining time. (LEGACY 72 h rule; CHANGE P-5; value S-028 instead of hard-coded; spec 06 AC-45)
- AC-24 Given the form, When the freelancer submits a reason (10–1,000 characters), Then a request is created (**pending**) with amount = the item's escrow balance (what is actually on HOLD), shown in Selling → Unblock requests; the freelancer sees `t_unblock_request_submitted_successfully`; and `Admin/UnblockRequestPending` (`t_subject_admin_unblock_request_pending`) goes to every S-100 address. (LEGACY form; CHANGE: amount from the escrow — legacy used the gross bid amount for projects, R-012; admin email NEW ACCEPTED P-103)
- AC-25 Given a pending unblock request, When staff with `escrow.release` approve it, Then in one step the item is **completed** exactly like a buyer completion (escrow balance → freelancer's Available; gig sales +1, queue −1), the request becomes **approved**, the freelancer gets `t_app_name_has_approved_ur_unblock_request` (in-app + push) and the buyer gets `t_funds_released_by_mytask` (in-app + push, email), and both may review. The list page and the detail page use this one action. (LEGACY two different approvals, R-012; Q-037 one implementation; buyer notice NEW P-103; MM-13-04)
- AC-26 Given a pending unblock request, When staff decline it with a reason (required), Then it becomes **rejected** and the freelancer gets `t_app_name_has_declined_ur_unblock_request` with the reason (in-app + push). The freelancer may send a new request later (one pending at a time). (LEGACY decline; reason NEW ACCEPTED P-103)
- AC-27 Given a pending unblock request, When the item is completed by the buyer, refunded, or a refund request is opened on it, Then the unblock request becomes **closed** automatically and the freelancer gets `t_unblock_request_closed` (in-app). (LEGACY status `closed`; automatic rule ACCEPTED P-103)
- AC-28 Given S-025 is switched back ON while unblock requests are pending, When that happens, Then the pending requests stay for staff to decide and the items get a fresh S-026 period (Q-084, spec 06 AC-37); whichever releases first wins (`escrow:{item}:release`), and the other closes the request (AC-27). No new requests can be created. (ACCEPTED P-103)

### Staff exceptional tools (P-5; P-102)
- AC-29 Given a paid, unfinished item without an open dispute, When staff with `escrow.release` press "Release funds", enter an internal reason (required) and an optional public note, and confirm, Then the item is completed exactly as AC-25 (open refund request closed as "closed by MyTask", pending unblock request approved), and both parties get `t_funds_released_by_mytask` (in-app + push, email) with the public note. (ACCEPTED P-5 manual release; MM-13-05)
- AC-30 Given a paid, unfinished item (with or without a refund request), When staff with `escrow.refund` press "Refund buyer", enter an internal reason and an optional public note, and confirm, Then the item is refunded exactly as AC-16 (an open request becomes "accepted by MyTask", a pending unblock request is closed), and both parties get `t_refunded_by_mytask` (in-app + push, email). (NEW tool replacing legacy admin order deletion R-015, spec 06 D-06-17; MM-13-06)
- AC-31 Given any staff money action (AC-16, AC-17, AC-25, AC-29, AC-30), When it runs, Then it uses the same service and ledger references as the buyer's completion and the seller's refund acceptance (`escrow:{item}:release` / `escrow:{item}:refund`), so the escrow can be released or refunded **once** in total; a second attempt changes nothing and returns `t_order_status_changed`. (Q-037; fixes R-012)

### Lists, pages and access
- AC-32 Given Buying → Refunds (`/account/refunds`) and Selling → Refunds (`/seller/refunds`), When they open, Then they list the user's refund requests (all item types) newest first: item (type and title, link), amount, status chip (`t_refund_requested`, rejected by seller, `t_disputed`, accepted by seller, `t_accepted_by_admin`, `t_rejected_by_admin`, closed), dates, and the next action. Selling → Unblock requests lists the freelancer's requests with status and amount. Empty: `t_no_refunds_yet` / `t_no_unblock_requests_yet`. (LEGACY lists; all types in one list NEW)
- AC-33 Given a refund page (`/account/refunds/{uid}`, `/seller/refunds/{uid}`), When it opens, Then it shows the item summary, the reason, the status with an explanation for the viewer (`t_info_*` texts), the seller deadline countdown while pending, the actions allowed for the viewer (Accept, Decline, Close, Raise a dispute), and the thread. Any user who is not the buyer, the freelancer or staff with permission gets 404. (LEGACY pages + info texts `ProjectRefundStatus.php:109-187`; access CHANGE)

### Migration (Q-065; P-105)
- AC-34 Given legacy gig refunds, project refunds, their conversations and unblock requests, When they are migrated, Then each keeps its item, parties, reason, status, dispute flag, dates and messages (legacy authors mapped to buyer / freelancer / MyTask). Legacy requests that are **pending** get a fresh seller deadline of go-live + S-030; open disputes stay open for staff; pending unblock requests stay pending with the amount recomputed from the migrated escrow. (Q-065; ACCEPTED P-105)

---

## Business rules
- R-R1 **Items** covered: gig order item (spec 06), project contract payment (spec 11), custom offer (spec 12). Every rule below applies to all three unless stated.
- R-R2 **Eligibility** (P-98): paid, unfinished, and (delivered, or revision requested, or in progress with the expected delivery date passed). Not before start (gig orders use cancel). One refund request per item for its whole life (P-99).
- R-R3 **Refund statuses**: `pending` → `accepted_by_seller` | `rejected_by_seller` (by seller, or by system after S-030) | `closed` (by buyer; or by system when the item is completed); `rejected_by_seller` → `disputed` flag → `accepted_by_admin` | `rejected_by_admin`; staff "Refund buyer" → `accepted_by_admin`; staff "Release funds" → `closed` (by MyTask). Legacy values map one to one; `request_admin_intervention` = the dispute flag.
- R-R4 **Money** (Q-010, Q-011, R-3.3, R-3.5): a refund returns exactly the item price P to the buyer's Available balance: the escrow balance H (= P′) plus the reversal of any freelancer-paid commission (P − P′; 0 today). The card surcharge and buyer-paid fees are never returned. Nothing goes back to the card. A release moves exactly H to the freelancer. No split decisions.
- R-R5 **One implementation** (Q-037, R-012): buyer completion, auto-release, staff dispute release, unblock approval and staff "Release funds" all call one release operation with ref `escrow:{item}:release`; seller acceptance, staff dispute refund, staff "Refund buyer" and gig cancel-before-start (06 MM-06-05) call one refund operation with ref `escrow:{item}:refund`. Only one of the two refs can ever post for an escrow; the escrow balance can never go below 0 (ADR-003 §4). No user balance other than Available and the escrow itself is touched (no client "pending", fixes R-012).
- R-R6 **Timers** (Q-067c, Q-071, Q-084): a refund request or a dispute removes the auto-release deadline at once; a request ending without money moving on a delivered item starts a fresh full S-026 period; a dispute never restarts it; staff decide. Seller deadline = request time + S-030 (stored).
- R-R7 **Unblock request** (P-5, BR-086): exists only while S-025 is OFF or S-029 is ON; delivered item, no open refund/dispute, ≥ S-028 hours since the latest delivery, one pending per item, amount = H.
- R-R8 **Threads** (BR-122, P-101): refund thread per request; writers: buyer, freelancer, staff ("MyTask"); open while pending, rejected-awaiting-dispute or disputed; ≤ 750 characters; email throttle 10 minutes per sender per request.
- R-R9 **Permissions** (spec 16): `refunds.resolve` (decide disputes), `escrow.release` (approve unblock requests, Release funds), `escrow.refund` (Refund buyer), `chat.read` (read threads and chats). Every staff action is audited with reason.
- R-R10 **Concurrency** (R-017): every state change is compare-and-set inside the same transaction as its ledger journal; the loser of a race gets `t_order_status_changed`.

## Money movements (ledger map for ADR-003 / P2-B2)
`{item}` = the escrow of a gig order item, a project contract payment or a custom offer. "H" = its escrow balance (P′); "P − P′" = freelancer-paid commission or fee on that item (S-013, S-015 or S-018; 0 today), booked in `platform:fee_revenue:{rule}` when the item was paid.

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-13-01 | Freelancer accepts the refund (AC-6) | `escrow:{item}:hold` → `user:{buyer}:available` | H | `escrow:{item}:refund` |
| | | `platform:fee_revenue:{rule}` → `user:{buyer}:available` | P − P′ (reversal, so the buyer gets exactly P) | same |
| MM-13-02 | Staff decide the dispute for the buyer (AC-16) | same as MM-13-01 | H + (P − P′) | `escrow:{item}:refund` |
| MM-13-03 | Staff decide the dispute for the freelancer (AC-17) | `escrow:{item}:hold` → `user:{freelancer}:available` | H | `escrow:{item}:release` |
| MM-13-04 | Staff approve an unblock request (AC-25) | same as MM-13-03 | H | `escrow:{item}:release` |
| MM-13-05 | Staff "Release funds" (AC-29) | same as MM-13-03 | H | `escrow:{item}:release` |
| MM-13-06 | Staff "Refund buyer" (AC-30) | same as MM-13-01 | H + (P − P′) | `escrow:{item}:refund` |
| (none) | Request opened, declined, auto-rejected, closed, dispute raised, unblock request created / declined / closed, thread messages | – | 0 | – |

The refs are shared with specs 06 (MM-06-03/04/05), 11 (MM-11-03/04) and 12 (MM-12-03/04/05): `escrow:{item}:release` and `escrow:{item}:refund` are mutually exclusive, so each escrow is paid out exactly once. The surcharge and buyer-paid fees stay in revenue (Q-011).

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Request refund form | `/account/refunds/request/{item}` (paths in `url-map.md`): item summary, reason with counter, warning that the card fee is not refunded | full screen | not eligible (tooltip text); already requested (link); submitting |
| Refund page (buyer / freelancer) | status card with explanation, seller countdown, actions, thread | stacked; sticky action bar; thread as chat | pending; rejected (dispute button, fresh auto-release date if delivered); disputed (`t_admin_intervention_in_progress`); accepted / decided (read-only, amount returned); closed |
| Unblock request form + list | Selling → Unblock requests: form with remaining-time hint; list with statuses | same | hidden while auto-release ON; wait (remaining time); pending; approved; rejected (reason); closed |
| Refund lists | Buying → Refunds, Selling → Refunds | tabs with filter chips | empty; loading; error |
| Admin → Disputes / Unblock requests / item money actions (spec 16) | queues, detail with evidence, decision form (reason, public note), confirmation | – | – |

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Seller/RefundRequest` (`t_subject_seller_refund_request`) + `t_buyer_opened_new_refund_request` | email + in-app + push | freelancer | request opened (AC-5) | LEGACY; CHANGE: also for projects (legacy in-app `t_subject_freelancer_client_requested_project_refund`, merged) and offers |
| `User/Buyer/RefundAccepted` (`t_subject_buyer_refund_accepted`) + `t_seller_has_accepted_ur_refund` | email + in-app + push | buyer | freelancer accepts (AC-6) | LEGACY; project variant `t_freelancer_has_accepted_ur_refund` merged |
| `User/Buyer/RefundDeclined` (`t_subject_buyer_refund_declined`) + `t_seller_has_declined_ur_refund` | email + in-app + push | buyer | freelancer declines (AC-7) | LEGACY; project variant `t_freelancer_has_declined_ur_refund` merged |
| `t_refund_auto_rejected_buyer` / `t_refund_auto_rejected_seller` | in-app + push | buyer / freelancer | auto-reject after S-030 (AC-8) | **NEW, ACCEPTED P-100** |
| `User/Seller/RefundClosed` (`t_subject_seller_refund_closed`) + `t_a_refund_has_closed` | email + in-app + push | freelancer | buyer closes (AC-10) | LEGACY |
| `Admin/RefundDispute` (`t_subject_admin_refund_dispute_raised`) | email | all S-100 | dispute raised (AC-12) | LEGACY (gig); CHANGE: projects and offers too; recipients Q-026 |
| `t_buyer_opened_new_refund_dispute` | in-app + push | freelancer | dispute raised (AC-12) | LEGACY |
| `User/Buyer/NewRefundMessage` / `User/Seller/NewRefundMessage` (`t_subject_buyer_new_refund_message` / `t_subject_seller_new_refund_msg`) + `t_new_message_about_refund` | email (throttled) + in-app + push | other party | thread message (AC-22) | LEGACY; CHANGE throttle P-101, freelancer can write |
| `Admin/NewRefundMessage` (`t_subject_admin_new_refund_message`) | email (throttled) | all S-100 | thread message during a dispute (AC-22) | LEGACY; CHANGE recipients, throttle |
| `RefundDecided` (`t_subject_refund_decided`) + `t_app_name_has_approved_ur_refund_request` / `t_app_name_has_approved_refund_request_from_buyer` | email + in-app + push | buyer / freelancer | staff refund the buyer (AC-16) | LEGACY in-app; email **NEW, ACCEPTED P-102** |
| `RefundDecided` + `t_app_name_has_declined_ur_refund_request` / `t_app_name_released_funds_after_dispute` | email + in-app + push | buyer / freelancer | staff release to the freelancer (AC-17) | LEGACY in-app (buyer); freelancer key and email **NEW** |
| `Admin/UnblockRequestPending` (`t_subject_admin_unblock_request_pending`) | email | all S-100 | unblock request created (AC-24) | **NEW, ACCEPTED P-103** |
| `t_app_name_has_approved_ur_unblock_request` | in-app + push | freelancer | unblock approved (AC-25) | LEGACY; list-page variant `t_admin_approved_unblock_request` merged |
| `t_funds_released_by_mytask` (subject `t_subject_funds_released_by_mytask`) | email + in-app + push | buyer (unblock); both (Release funds) | AC-25, AC-29 | **NEW, ACCEPTED P-103** |
| `t_app_name_has_declined_ur_unblock_request` | in-app + push | freelancer | unblock declined (AC-26) | LEGACY; list-page variant `t_admin_declined_unblock_request` merged; reason NEW |
| `t_unblock_request_closed` | in-app | freelancer | unblock auto-closed (AC-27) | **NEW, ACCEPTED P-103** |
| `t_refunded_by_mytask` (subject `t_subject_refunded_by_mytask`) | email + in-app + push | buyer and freelancer | staff "Refund buyer" (AC-30) | **NEW** |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged unless noted):
| Key | en | ka |
|---|---|---|
| `t_refunds` / `t_request_refund` / `t_refund_details` / `t_refund_reason` / `t_reason` | Refunds / Request refund / Refund details / Refund reason / Reason | თანხის დაბრუნება / მოითხოვე თანხის დაბრუნება / თანხის დაბრუნების დეტალები / თანხის დაბრუნების მოთხოვნის მიზეზი / მიზეზი |
| `t_u_cant_request_refund_for_this_item_now` | You cannot request refund for this item | თქვენ ვერ მოითხოვთ თანხის დაბრუნებას ამ პროდუქტისთვის |
| `t_u_can_request_refund_when_expected_date_finish` | You can request a refund for this item when expected delivery date expires | ამ პროდუქტზე თანხის დაბრუნების მოთხოვნა შესაძლებელია მხოლოდ მას შემდეგ, რაც ამოიწურება მიწოდების სავარაუდო თარიღი. |
| `t_refund_available_after_delivery_time_expires` | You can request a refund only after the project deadline has passed. (Owner may generalise "project") | თანხის დაბრუნების მოთხოვნა შეგიძლიათ მხოლოდ მაშინ, როცა პროექტის დასრულების ვადა ამოიწურება. |
| `t_refund_not_available` | Refund request is not available at this time | თანხის დაბრუნების მოთხოვნა ამ დროს შეუძლებელია |
| `t_ur_refund_request_has_been_sent` | (used in legacy code but missing in both language files; NEW) Your refund request has been sent. | თქვენი მოთხოვნა თანხის დაბრუნებაზე გაიგზავნა. |
| `t_refund_msg_posted_success` | Your message has been successfully sent | შეტყობინება წარმატებით გაიგზავნა |
| `t_close_refund` / `t_u_have_closed_refund_success` | Close refund / You have successfully closed this refund dispute | თანხის დაბრუნების მოთხოვნის გაუქმება / თქვენ წარმატებით დახურეთ თანხის დაბრუნების ეს დავა |
| `t_raise_dispute_request_received_success` | Your request has been successfully received | **ka fix needed** (legacy ka repeats the "closed" text): NEW ka თქვენი მოთხოვნა წარმატებით მიღებულია |
| `t_refund_requested` / `t_disputed` / `t_rejected_by_admin` / `t_accepted_by_admin` | Refund Requested / Disputed / Rejected By MyTask / Accepted By MyTask | თანხის დაბრუნება მოთხოვნილია / სადავო / უარყოფილია MyTask-ის მიერ / დამტკიცებულია MyTask-ის მიერ |
| `t_admin_intervention_in_progress` | You have already initiated a dispute on this project. (Owner may generalise "project") | თქვენ უკვე წამოიწყეთ დავა აღნიშნულ პროექტზე. |
| `t_new_message_about_refund` | You have new message about a refund | თქვენ გაქვთ ახალი შეტყობინებები თანხის უკან დაბრუნების შესახებ. |
| `t_a_refund_has_closed` / `t_buyer_opened_new_refund_request` / `t_buyer_opened_new_refund_dispute` | :buyer has closed a refund / :buyer requested a refund / :buyer has opened a new refund dispute | :buyer დახურა თანხის დაბრუნების მოთხოვნა / :buyer მოითხოვა თანხის დაბრუნება / :buyer გახსნა დავა თანხის დაბრუნებისთვის |
| `t_seller_has_accepted_ur_refund` / `t_seller_has_declined_ur_refund` | :seller has accepted your refund / :seller has declined your refund | :seller განაცხადა თანხმობა თქვენს მიერ გაგზავნილ თანხის დაბრუნების მოთხოვნაზე. / :seller უარი თქვა თანხის დაბრუნებაზე |
| `t_subject_seller_refund_request` / `t_subject_seller_refund_closed` / `t_subject_seller_new_refund_msg` | New refund request / Refund has closed / New refund message | თანხის დაბრუნების ახალი მოთხოვნა / თანხის დაბრუნების მოთხოვნა დაიხურა / ახალი შეტყობინება თანხის დაბრუნების შესახებ |
| `t_subject_buyer_refund_accepted` / `t_subject_buyer_refund_declined` / `t_subject_buyer_new_refund_message` | Your refund request has accepted / Your refund request has declined by seller / New message on your refund request (Owner may fix grammar: "has been accepted/declined") | მოთხოვნა თანხის დაბრუნების შესახებ მიღებულია / მოთხოვნა თანხის დაბრუნების შესახებ უარყოფილია ფრილანსერის მიერ / ახალი შეტყობინება თანხის დაბრუნების მოთხოვნაზე |
| `t_subject_admin_refund_dispute_raised` / `t_subject_admin_new_refund_message` | Refund dispute raised / New refund message | თანხის დაბრუნების დავა წამოჭრილია / ახალი შეტყობინება თანხის დაბრუნების მოთხოვნის შესახებ |
| `t_app_name_has_approved_ur_refund_request` / `t_app_name_has_approved_refund_request_from_buyer` / `t_app_name_has_declined_ur_refund_request` | :app_name has accepted your refund request for :username / :app_name has accepted refund request from :username / :app_name has declined your refund request | :app_name -მა დაადასტურა თანხის დაბრუნების მოთხოვნა / :app_name -მა დაადასტურა თანხის დაბრუნების მოთხოვნა :username -სგან / :app_name -მა უარყო თანხის დაბრუნების მოთხოვნა |
| `t_create_unblock_request` | Create Unblock Request | თანხის განბლოკვის მოთხოვნა |
| `t_unblock_request_submitted_successfully` | Your unblock request has been submitted successfully and is now pending admin review. | თქვენი განბლოკვის მოთხოვნა წარმატებით გაიგზავნა და ახლა ადმინისტრატორის განხილვას ელის. |
| `t_unblock_request_72_hour_wait` | **CHANGED value:** You can ask for release :hours hours after your latest delivery. You can submit in :time. | **CHANGED value:** თანხის გათავისუფლების მოთხოვნა შეგიძლიათ ბოლო მიწოდებიდან :hours საათის შემდეგ. დარჩენილი დრო: :time |
| `t_unblock_request_no_delivery_found` | No delivery found for this order/project. Cannot submit unblock request. | ამ ორდერის/პროექტისთვის მიწოდება ვერ მოიძებნა. განბლოკვის მოთხოვნის გაგზავნა შეუძლებელია. |
| `t_you_already_have_request_for_this_order` / `t_you_already_have_request_for_this_project` | You already have a pending or approved unblock request for this order. / You already have a pending or approved unblock request for this project. | (missing in legacy ka; NEW ka) ამ შეკვეთაზე უკვე გაქვთ მოლოდინში მყოფი ან დამტკიცებული მოთხოვნა. / ამ პროექტზე უკვე გაქვთ მოლოდინში მყოფი ან დამტკიცებული მოთხოვნა. |
| `t_app_name_has_approved_ur_unblock_request` / `t_app_name_has_declined_ur_unblock_request` | :app_name has approved your unblock request for :amount. / :app_name has declined your unblock request for :amount. (decline gains " Reason: :reason") | ადმინმა-მ დაამტკიცა თქვენი განბლოკვის მოთხოვნა :amount-ის ოდენობით. / ადმინმა-მ უარყო თქვენი განბლოკვის მოთხოვნა :amount-ის ოდენობით. (Owner may fix "ადმინმა-მ" → "MyTask-მა"; decline gains " მიზეზი: :reason") |
| `t_request_release_of_funds` / `t_order_status_changed` / `t_cannot_complete_during_dispute` | see 06 | see 06 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_refund_already_requested` | A refund has already been requested for this item. | ამ შეკვეთაზე თანხის დაბრუნება უკვე მოთხოვნილია. |
| `t_refund_card_fee_notice` | Refunds go to your MyTask wallet. The card fee is not refunded. | თანხა დაბრუნდება თქვენს MyTask-ის საფულეზე. ბარათით გადახდის საკომისიო არ ბრუნდება. |
| `t_accept_refund` / `t_accept_refund_confirm` | Accept refund / :amount will be returned to the buyer's wallet and the order will be closed. | თანხის დაბრუნებაზე თანხმობა / :amount დაუბრუნდება დამკვეთს საფულეზე და შეკვეთა დაიხურება. |
| `t_decline_refund` / `t_decline_refund_message` | Decline refund / Explain why (optional) | თანხის დაბრუნებაზე უარი / ახსენით მიზეზი (არასავალდებულო) |
| `t_seller_must_answer_by` | The freelancer must answer by :date. | ფრილანსერმა პასუხი უნდა გასცეს :date-მდე. |
| `t_refund_auto_rejected_buyer` | The freelancer did not answer your refund request in time. You can raise a dispute and MyTask will decide. | ფრილანსერმა დროულად არ უპასუხა თქვენს მოთხოვნას თანხის დაბრუნებაზე. შეგიძლიათ დაიწყოთ დავა და MyTask გადაწყვეტს. |
| `t_refund_auto_rejected_seller` | You did not answer the refund request for :item in time, so it was marked as declined. The buyer may raise a dispute. | :item-ზე თანხის დაბრუნების მოთხოვნას დროულად არ უპასუხეთ, ამიტომ ის უარყოფილად მოინიშნა. დამკვეთს შეუძლია დავის დაწყება. |
| `t_raise_dispute` / `t_raise_dispute_confirm` | Raise a dispute / MyTask staff will review the case and decide whether the money goes to you or to the freelancer. The decision is final. | დავის დაწყება / MyTask-ის თანამშრომლები განიხილავენ საქმეს და გადაწყვეტენ, თანხა თქვენ დაგიბრუნდებათ თუ ფრილანსერს ჩაერიცხება. გადაწყვეტილება საბოლოოა. |
| `t_status_rejected_by_seller` / `t_status_accepted_by_seller` / `t_status_refund_closed` | Declined by freelancer / Accepted by freelancer / Closed | უარყოფილია ფრილანსერის მიერ / დადასტურებულია ფრილანსერის მიერ / დახურულია |
| `t_no_answer_in_time` | No answer in time | პასუხი დროულად არ გაცემულა |
| `t_mytask_staff` | MyTask | MyTask |
| `t_subject_refund_decided` | MyTask decided your refund case | MyTask-მა მიიღო გადაწყვეტილება თქვენს დავაზე |
| `t_app_name_released_funds_after_dispute` | :app_name reviewed the dispute and released :amount to your available balance. | :app_name-მა განიხილა დავა და თქვენს ხელმისაწვდომ ბალანსზე ჩაგირიცხათ :amount. |
| `t_decision_refund_buyer` / `t_decision_release_freelancer` | Refund the buyer / Release to the freelancer | თანხის დაბრუნება დამკვეთისთვის / თანხის ჩარიცხვა ფრილანსერისთვის |
| `t_internal_reason` / `t_public_note` | Internal reason (staff only) / Note to both parties (optional) | შიდა მიზეზი (მხოლოდ თანამშრომლებისთვის) / შენიშვნა ორივე მხარისთვის (არასავალდებულო) |
| `t_subject_admin_unblock_request_pending` | New request to release funds | თანხის გათავისუფლების ახალი მოთხოვნა |
| `t_unblock_reason_hint` | Explain why the funds should be released (10–1,000 characters). | ახსენით, რატომ უნდა გათავისუფლდეს თანხა (10–1 000 სიმბოლო). |
| `t_unblock_request_closed` | Your request to release funds for :item was closed because the order changed. | თქვენი მოთხოვნა :item-ის თანხის გათავისუფლებაზე დაიხურა, რადგან შეკვეთის სტატუსი შეიცვალა. |
| `t_funds_released_by_mytask` / `t_subject_funds_released_by_mytask` | MyTask released the payment for :item to the freelancer. :note / Payment released by MyTask | MyTask-მა :item-ის საფასური ფრილანსერს ჩაურიცხა. :note / თანხა გაათავისუფლა MyTask-მა |
| `t_refunded_by_mytask` / `t_subject_refunded_by_mytask` | MyTask refunded :amount for :item to the buyer's wallet. :note / Refund by MyTask | MyTask-მა :item-ზე :amount დაუბრუნა დამკვეთს საფულეზე. :note / თანხა დააბრუნა MyTask-მა |
| `t_release_funds` / `t_refund_buyer` | Release funds / Refund buyer | თანხის გათავისუფლება / თანხის დაბრუნება დამკვეთისთვის |
| `t_no_refunds_yet` / `t_no_unblock_requests_yet` | No refund requests yet. / No release requests yet. | თანხის დაბრუნების მოთხოვნები ჯერ არ არის. / თანხის გათავისუფლების მოთხოვნები ჯერ არ არის. |

The legacy `t_info_*` explanation texts (`t_info_refund_request_buyer`, `t_info_disputed_buyer`, … `t_info_refund_accepted_by_admin_seller`, `ProjectRefundStatus.php:109-187`) are reused for the status explanations with their legacy values.

## Edge cases
- EC-1 The freelancer accepts the refund one second after the auto-reject sweeper ran: the request is already rejected; accept is refused with `t_order_status_changed`; the buyer can dispute (AC-12).
- EC-2 The buyer raises a dispute at the same moment auto-release fires (fresh period ended): compare-and-set; if the release posted first, the dispute is refused and the item is completed.
- EC-3 A late (undelivered) item: refund request → rejected → no timer runs (not delivered); the buyer can dispute any time until the freelancer delivers and a fresh period passes, or until staff act.
- EC-4 Migrated negative buyer balance (00 EC-7): a refund adds to it; the balance may stay negative.
- EC-5 A custom offer canceled by the freelancer while a refund is pending: cancel is allowed only before the first delivery (12 AC-29) and closes the request as "closed" with the money returned by the cancel.
- EC-6 Staff "Release funds" on an item with a pending refund request: the request closes ("closed by MyTask"), the freelancer is paid; the buyer is notified with the public note.
- EC-7 S-025 OFF, unblock request pending, buyer opens a refund request: the unblock request closes (AC-27).
- EC-8 S-029 switched ON while S-025 is ON: unblock requests become available in addition to auto-release; whichever releases first wins.
- EC-9 A refund thread email throttle: the freelancer writes 4 messages in 5 minutes: one email to the buyer, four in-app notifications.
- EC-10 The buyer's account is banned during a dispute: staff still decide; a refund still goes to the (banned) buyer's wallet.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-13-1 | Client "pending" balance kept on some paths and not others (R-012) | `PaymentBogController.php:136-150`; `Seller/Refunds/Options/DetailsComponent.php:277-278`; `Admin/ProjectRefunds/Options/DetailsComponent.php:92, :181` | R-R5 (no client pending; one refund operation) |
| D-13-2 | Admin project refund decline credits the freelancer's available without reducing pending (double money, R-012) | `Admin/ProjectRefunds/Options/DetailsComponent.php:166-175` | AC-17, R-R5 |
| D-13-3 | Admin project refund accept uses the first milestone whatever its status | `Admin/ProjectRefunds/Options/DetailsComponent.php:79-87` | AC-16 (escrow balance) |
| D-13-4 | Two unblock approvals: list page moves pending → available; detail page only adds available (double pay, R-012) | `UnblockRequestsComponent.php:58-140` vs `Options/DetailsComponent.php:62-125` | AC-25, AC-31 |
| D-13-5 | Project unblock amount = gross bid amount (R-012) | `Seller/UnblockRequests/CreateComponent.php:125-137` | AC-24 (escrow balance) |
| D-13-6 | Seller refund accept on projects refunds all milestones (also paid ones) and marks the project "completed" | `Seller/Refunds/Options/DetailsComponent.php:263-297` | AC-6 (item refunded; spec 10 R-P3 `refunded`) |
| D-13-7 | Project refund eligibility enforced only by the page button | `Account/ProjectRefunds/Options/RequestComponent.php:34-44` vs `PayComponent.php:1396-1415` | AC-2 |
| D-13-8 | Project disputes raise no admin notification; project refunds send no email | `Account/ProjectRefunds/Options/DetailsComponent.php:107-134`; `RequestComponent.php:149-154` | AC-5, AC-12 |
| D-13-9 | Buyer can raise the same dispute repeatedly (duplicate admin emails) | `Account/Refunds/Options/DetailsComponent.php:282` | AC-12 |
| D-13-10 | Seller cannot write in the refund thread; buyer only while pending; project threads without a screen | `Seller/Refunds/Options/DetailsComponent.php`; `Account/Refunds/Options/DetailsComponent.php:141`; `Account/ProjectRefunds/Options/DetailsComponent.php:100` | AC-21 |
| D-13-11 | Auto-reject sends no notification; hourly; hard-coded 2 days | `AutoRejectStaleRefunds.php:29-46` | AC-8, S-030 |
| D-13-12 | Admin decides undisputed gig refunds and pending project refunds (two rule sets) | `Admin/Refunds/Options/DetailsComponent.php:85`; `Admin/ProjectRefunds/Options/DetailsComponent.php:68` | AC-19 (one rule, disputes only) |
| D-13-13 | Admin decline pays the seller but leaves the item status unchanged | `Admin/Refunds/Options/DetailsComponent.php:198-215` | AC-17 (completed) |
| D-13-14 | Redirect to a non-existent refund URL (R-037) | `Account/Refunds/Options/RequestComponent.php:56` | AC-3 |
| D-13-15 | Unblock request: no admin notification, decline without reason, 72 h hard-coded, English-only messages | `Seller/UnblockRequests/CreateComponent.php:24-32, :174, :286` | AC-23, AC-24, AC-26 |
| D-13-16 | Balances updated non-atomically, clamped with `max(0, …)` hiding errors (R-017) | e.g. `Seller/Refunds/Options/DetailsComponent.php:233-235` | R-R10, ADR-003 §4 |

## Out of scope
- Partial refunds or split decisions (not in legacy; could be added later as a new decision type with its own ledger template).
- Refunds to the card (Q-010).
- Attachments in refund threads (not in legacy; evidence files go through the item deliveries and chat).
- An appeal against a staff decision.
- Chargebacks from the card network (handled outside the product; staff use adjustments, spec 05 AC-41).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-98 Eligibility for all item types.** A refund can be requested on a paid, unfinished item when it is delivered, when a revision was requested, or when it is in progress and its expected delivery date has passed — for gig orders (legacy rule plus "revision requested", a new status), projects (legacy rule, now checked by the server, not only by the page) and custom offers (new). Before the work starts, gig orders are canceled instead (spec 06).
- **P-99 One refund request per item.** As legacy: one request per item for its whole life. This stops a buyer from pausing the 72 h auto-release again and again with new requests. If the buyer closes it, the order continues to delivery, completion or auto-release.
- **P-100 Freelancer answer and dispute.** The freelancer may add an optional message when declining. NEW: when the 2-day deadline passes without an answer, both sides are notified (legacy: silent). The buyer can raise a dispute once, at any time while the money is still on HOLD. Projects and offers now notify staff and send emails like gig refunds (legacy project refunds: in-app only, disputes without any staff notice).
- **P-101 Refund thread.** Buyer, freelancer and staff ("MyTask") can all write while the request is open or disputed (legacy: only the buyer, only while pending). Emails for thread messages at most once per 10 minutes per sender per request (like chat, BR-120); in-app/push for every message.
- **P-102 Staff decisions.** Staff decide only disputed requests, with two outcomes — full refund to the buyer or full release to the freelancer (no split, as legacy), a required internal reason and an optional note to both parties. NEW emails to both parties about the decision (legacy: in-app only). Exceptional tools for staff: "Release funds" (P-5) and "Refund buyer" on any paid, unfinished item, with reason and audit (replacing the legacy admin order deletion).
- **P-103 Unblock requests (only while auto-release is OFF, P-5).** Amount = what is actually on HOLD for the item (legacy used the gross bid amount for projects). NEW admin email when a request arrives; a decline needs a reason; on approval the buyer is told that MyTask released the payment; a pending request closes automatically if the item is completed, refunded or gets a refund request. Pending requests stay for staff when auto-release is switched back ON.
- **P-104 Work during a dispute.** The freelancer may still deliver during a dispute; the delivery is kept as evidence and does not start the 72 h timer (Q-071c: after a dispute, staff decide). The buyer cannot request a revision or complete the item while the dispute is open (completion: spec 06 P-51).
- **P-105 Moving legacy refunds.** Legacy refunds, project refunds, their messages and unblock requests are migrated with their statuses. Pending requests get a fresh 2-day answer deadline from go-live (so no freelancer is auto-rejected at launch); open disputes stay open for staff; pending unblock requests keep their state with the amount taken from the migrated HOLD.
