# 11 — Proposals and hiring (award, one escrow payment, delivery, completion)
Status: **ready for Owner**
Author: product-analyst (P2-A4) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-055…BR-060, BR-070…BR-075, BR-085, BR-086; `routes-and-pages.md` (`/project/{pid}/{slug}`, `/seller/projects`, `/seller/projects/bids`, `/seller/projects/bids/edit/{id}`, `/seller/projects/deliver/{id}`, `/account/projects/payments/{id}`, `/checkout/{uid}/project`); `notifications.md` (bid, award, project and milestone rows); `risks-and-debt.md` R-012, R-013, R-018, R-019, R-031, R-032. Owner decisions: Q-005, Q-006, Q-008, Q-020, Q-028, Q-034, Q-035, Q-036, Q-046, Q-050, Q-051, Q-056, Q-061, Q-062, Q-067, Q-069, Q-071, Q-084. Platform rules: `00-platform-rules.md` §2 (plans: proposals and proposal visibility Premium-only), §3 (R-3.1…R-3.5), §4.2 (S-014, S-015), §4.4 (S-025…S-029), §4.8 (S-041), §4.11 (S-073), §4.13 (S-086, S-087), §4.18, AC-7, AC-13, AC-14, AC-18…AC-20, EC-2, EC-3, EC-5, X-01, X-02, X-04; P-1, P-2, P-5. Specs: 05 (checkout, MM-05-xx, AC-15 unapplied payments), 06 (delivery, revisions, auto-release — rules reused, not repeated), 07 AC-2 (project reviews), 08 (chat), 09 (Premium state R-2.1), 10 (projects), 13 (refunds, disputes, unblock), 16 (moderation). ADR-003, ADR-005, ADR-008, ADR-009.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-80…P-89, see "Open questions").

Legacy code traced for this spec (read-only):
- **Send proposal** `app/Livewire/Main/Project/ProjectComponent.php:416-821`: login; `account_type = seller`; project `active`; not awarded; not own; one bid per freelancer per project; then `Validators/Main/Project/BidValidator.php:24-31` (amount `^\d+(\.\d{1,2})?$` ≤ 10 chars, days any integer, message required ≤ 3,500) and amount within `budget_min…budget_max` `:534-550`. **No Premium check on the server** (R-019); the "Bid" button is Premium-gated in the view only (`project.blade.php`). Status `pending_payment` (upgrades), `pending_approval` (auto-approve OFF) or `active` `:903-923`; `NewBidReceived` + in-app to the client only when active `:1027-1045`; `Admin/BidPendingApproval` to the first admin when pending `:1049-1055`.
- **Proposal list** `ProjectComponent.php:274-296`: only for Premium, owner or admin; only `active`; **sponsored bids excluded** from the list; sort newest/oldest/fastest/cheapest (no default order). Card `app/Livewire/Main/Cards/Bid.php`: sealed bids hide amount/days/message except to owner, bidder, admin `:185-218`; chat button for the client: every bidder until an award, then only the awarded one `:82-98`; report (`reason_1…4`, description ≤ 1,500, one unseen per user, `Admin/BidReported`) `:285-439`.
- **Edit proposal** `app/Livewire/Main/Seller/Projects/Bids/Options/EditComponent.php:50-79, :236-482`: while not awarded and the project is active and unawarded; same validation; status recomputed; **`NewBidReceived` re-sent to the client on every edit** `:462-474`.
- **Delete proposal** `app/Livewire/Main/Seller/Projects/Bids/BidsComponent.php:142-250`: **hard delete** of any non-awarded bid (in any project state), after which the freelancer can bid again.
- **Award / revoke** `Cards/Bid.php:480-686` / `:708-849`: owner only; bid active; project active; awarding another bid un-awards the previous one and **silently deletes its award notification**; `ProjectAwarded` email + in-app `t_congratulations_employer_awarded_u_their_project_title` (text says "24 hours"); revoke only before acceptance, **deletes the freelancer's notifications before the permission check** `:726`, and notifies nobody.
- **Freelancer accept / reject** `app/Livewire/Main/Seller/Projects/ProjectsComponent.php:156-391`: accept → project `under_development`, bid accepted, a milestone row (`status = request`, amount = bid, **commissions swapped and not %-converted** `:327-329`, R-013), `FreelancerAcceptedYourProject` + in-app with a link to the payments page; reject → reason `reason_1…8` required, bid `hidden`, project un-awarded, `FreelancerRejectedYourProject` + in-app. Accept does not check the award age.
- **Award expiry** `app/Console/Commands/ExpiredAwardedBids.php:30-71`: **daily** (Kernel), un-awards after **24 h** (description says 36 h, live says 48 h; R-032); no notification.
- **Payment** (`/payments` flow, Q-034): `Account/Projects/Options/PayComponent.php` (wallet `create()` `:470-694` deducts the client but **never adds the freelancer's pending**; release `:1265-1365` allowed any time the milestone is funded, even before delivery; expected delivery = acceptance date + bid days `:80-96`; refund button rules `:1396-1415`) and `Checkout/UnifiedCheckoutComponent.php` (project checkout **without an ownership check** `:76-90`, R-018; wallet `:491-598` re-funds an existing milestone without checking that it was already funded; card `:690-752` creates the milestone as `funded` **before** payment; both fall back to `project_bid->freelancer_id`, a column that does not exist `:532, :731`). BOG return `PaymentBogController.php:128-178` also adds to the **client's** pending balance (R-012).
- **Delivery and thread** `app/Livewire/Main/Seller/Projects/Options/DeliverComponent.php`: allowed when the project is `pending_final_review` or **`completed`** `:56-58`; one work record **overwritten** on every delivery and deleted by "resubmit" `:124-311`; email `ProjectCompleted` (subject "Project has been completed") + in-app `t_freelancer_has_delivered_project_work` on every delivery `:209-218`; thread messages ≤ 750 (reuses the order `MessageValidator`), **no notification** `:318-377`; client side `Account/Projects/Options/FilesComponent.php:91-144`.
- Statuses: `app/Enums/ProjectStatus.php`, `ProjectWorkDeliveryStatus.php`; milestones `project_milestones` (one per project in practice, Q-050).

---

## Goal
Let a client hire one Premium freelancer for a posted project and pay once, safely: Premium freelancers send proposals with their price, time and number of revisions; the client awards one; the freelancer accepts within 48 hours; the client pays one escrow payment (wallet or card + 2.5%); the money sits on the freelancer's HOLD during the work; delivery, the agreed revisions and completion (by the client or automatically after 72 hours) release it. Both sides then review each other. The data model stays ready for milestones and hourly work later.

## Roles involved
- **Premium freelancer** (active Premium, R-2.1): sends, edits proposals (Q-020, Q-069).
- **Freelancer** (any user who has a proposal): withdraws own proposal, accepts or declines an award, delivers, writes in the thread; does not need Premium after the proposal was sent (P-81).
- **Client** (project owner, any plan): sees proposals, awards, revokes, pays, requests revisions, completes, reviews.
- **Premium user / staff**: may see all proposals on any project (BR-057).
- **Staff**: moderates proposals when S-073 is OFF; handles reports; refunds/disputes/manual release (spec 13).
- **System**: award expiry and auto-release sweepers (ADR-008), BOG confirmation (spec 05).

## User stories
- As a Premium freelancer, I want to send a proposal with my price, delivery time and number of revisions, so that the client can compare me with others.
- As a client, I want to see all proposals, sort them and chat with freelancers, so that I choose well.
- As a client, I want to award the project and pay once, so that the freelancer can start safely.
- As a freelancer, I want 48 hours to accept or decline an award, so that I only take work I can do.
- As a freelancer, I want to see the client's money on my HOLD before I start, and be paid automatically if the client goes silent after delivery.
- As a client, I want to ask for the revisions the freelancer promised, and to open a refund request if the work is late or wrong (spec 13).

## Acceptance criteria

### Sending a proposal (BR-055; Q-020, Q-056; P-80)
- AC-1 Given a logged-in user with active Premium on an active project that has no award waiting and no accepted award, who does not own it and has no proposal on it (other than withdrawn ones), When they press "Bid on this project", Then the proposal form opens (web modal; mobile full screen) with: amount in GEL, delivery time in days, number of revisions, and message. (LEGACY checks `ProjectComponent.php:416-522`; revisions NEW Q-056)
- AC-2 Given a user **without** active Premium, When they press "Bid on this project" or call the proposal API directly, Then the web shows the Premium-required box (`t_warning_project_limit` with "Upgrade to Premium" → `/subscription`), mobile shows the same as a bottom sheet, and the API refuses with `PREMIUM_REQUIRED` — whatever the client sends. (CHANGE Q-020, R-019, 00 AC-7; legacy UI-only)
- AC-3 Given the amount, When the proposal is saved, Then it must be a number with up to 2 decimals, at most 10 characters, at least 1.00 GEL, and between the project's budget min and max inclusive; otherwise `t_validator_regex` or `t_pls_insert_bid_value_between_budget`. (LEGACY `BidValidator.php:26`, `:534-550`; 1.00 minimum PROPOSED P-80)
- AC-4 Given delivery time, When it is saved, Then a whole number of days from 1 to 365 is accepted (`t_validator_proposal_days`). Given the number of revisions, Then a whole number from 0 to S-041 (default 10) is required (`t_validator_revisions_range`, spec 04). Given the message, Then 1–3,500 characters of plain text are required. (LEGACY message; days range PROPOSED P-80; revisions NEW Q-056, P-1)
- AC-5 Given the form, When the freelancer types an amount, Then "Paid to you" shows the amount minus any freelancer project commission (S-015; today equal to the amount) with `t_bid_paid_to_you_tooltip`. (LEGACY `EditComponent.php:85-99`; value from the Commission & Fee module, ADR-005)
- AC-6 Given a valid proposal and S-073 ON (launch), When it is submitted, Then it becomes **active**, the freelancer sees `t_ur_bid_has_been_posted`, and the client gets `NewBidReceived` (email) and `t_u_received_new_bid_on_ur_project` (in-app + push). Given S-073 OFF, Then it becomes **pending approval** (`t_ur_bid_has_been_posted_pending_approval`) and `Admin/BidPendingApproval` goes to every S-100 address; the client is notified only when staff approve it. (LEGACY `:903-1055`; CHANGE recipients Q-026)
- AC-7 Given the project already has a proposal from this freelancer that is not withdrawn, When they try to send another, Then it is refused with `t_u_already_submitted_a_bid_to_this_project`. Given the project owner tries, Then `t_u_cant_submit_bids_to_urself`. Given the project has an award waiting or accepted, Then `t_u_cant_submit_bids_to_this_project`. Given the project is not active, Then `t_project_not_active_to_send_proposals`. (LEGACY messages; R-1.3)
- AC-8 Given paid proposal upgrades (sponsored, sealed, highlight), When anyone looks for them, Then they do not exist (X-04, Q-028). Migrated sealed or sponsored proposals are shown like every other proposal. (CHANGE Q-028)

### Moderation of proposals (S-073)
- AC-9 Given a pending proposal, When staff approve it, Then it becomes active, the freelancer gets `YourBidApproved` (email) and `t_ur_bid_approved` (in-app + push), and the client gets the AC-6 notifications. When staff reject it with a reason, Then it becomes **rejected**, the freelancer gets `YourBidRejected` (email, with the reason) and `t_ur_bid_rejected` (in-app + push), and can edit it to resubmit (AC-12). (LEGACY `Admin/Projects/Bids/BidsComponent.php:73-179`; in-app NEW P-83)

### Who sees proposals (BR-057; Q-069; restated)
- AC-10 Given a project page, When the proposals section loads, Then:
  - the project owner, users with active Premium, and staff see every **active** proposal (freelancer avatar, username, country, "ID verified", freelancer rating of spec 07, amount, delivery days, number of revisions, message, date, "Awarded" chip);
  - each freelancer always sees their own proposal (any status), even without Premium;
  - everyone else (guests and Standard users) sees only the number of active proposals and `t_warning_bids_limit` with "Upgrade to Premium".
  The API returns proposal details only to these viewers. (LEGACY `ProjectComponent.php:274-296`; server enforcement CHANGE, R-019 style; sealed hiding removed X-04)
- AC-11 Given the proposals section, When a viewer changes the sort, Then it orders by Newest (default), Oldest, Fastest (fewest days) or Cheapest (lowest amount); ties newest first. (LEGACY sorts; default NEW)

### Editing and withdrawing (P-81, P-82, P-83)
- AC-12 Given the freelancer's own proposal that is pending approval, active or rejected, on a project that is active with no award, When they edit it (Selling → Proposals → Edit, or on the project page), Then amount, days, revisions and message can be changed with the AC-3/AC-4 rules; the proposal returns to pending approval if S-073 is OFF; the client is **not** notified again. Editing requires active Premium (`PREMIUM_REQUIRED` otherwise). (LEGACY edit rules `EditComponent.php:69-79`; CHANGE: no repeated `NewBidReceived`, Premium on edit; PROPOSED P-81, P-83)
- AC-13 Given the freelancer's own proposal that is not awarded, When they press "Withdraw proposal" and confirm (`t_withdraw_proposal_confirm`), Then it becomes **withdrawn**, disappears from the project's proposal list and counts, stays in the freelancer's list as withdrawn, and the freelancer may send a new proposal on the same project while it is open (AC-1). Withdrawing does not need Premium. An awarded proposal cannot be withdrawn; the freelancer declines the award instead (AC-21). (CHANGE: legacy hard delete `BidsComponent.php:228-250`; PROPOSED P-82)
- AC-14 Given Selling → Proposals (`/seller/projects/bids`; mobile Selling → Proposals), When it opens, Then it lists the freelancer's proposals newest first with project title (link), amount, days, revisions, status chip (pending approval, active, awarded, accepted, declined, rejected, withdrawn, not selected) and actions (Edit, Withdraw). 42 per page. Empty: `t_no_proposals_yet`. (LEGACY list 42 per page; statuses NEW)

### Reporting proposals (LEGACY)
- AC-15 Given a logged-in user who is not the proposal's author, When they report an active proposal with a reason (`t_report_bid_reason_1…4`) and a description (required, ≤ 1,500), Then it is saved (`t_we_have_received_bid_report_success`) and `Admin/BidReported` goes to every S-100 address. A second report by the same user while the first is unreviewed is refused with `t_u_already_reported_this_bid`. (LEGACY `Cards/Bid.php:285-439`; CHANGE recipients Q-026)

### Award, move, revoke (BR-058; P-84)
- AC-16 Given the project owner on an active project, When they press "Award" on an active proposal and confirm (`t_bid_confirmation` / `t_are_you_sure_accept_bid`), Then the proposal becomes **awarded** with an acceptance deadline = now + S-027 hours (default 48, value stored), the project shows "Awarded — waiting for the freelancer", new proposals are closed, and the freelancer gets `ProjectAwarded` (email) and `t_congratulations_employer_awarded_u_their_project_title` (in-app + push) stating the deadline (`:hours`). (LEGACY `Cards/Bid.php:480-686`; CHANGE Q-005 48 h configurable, text no longer says "24 hours")
- AC-17 Given another proposal is already awarded and not yet accepted, When the owner awards a different proposal, Then the first award is withdrawn (its proposal returns to active) and its freelancer gets `t_award_withdrawn` (in-app + push); the new award follows AC-16. (LEGACY move; notification NEW PROPOSED P-84; legacy deleted the notification silently)
- AC-18 Given an awarded, not yet accepted proposal, When the owner presses "Revoke" and confirms, Then the award is removed, the proposal returns to active, proposals reopen, and the freelancer gets `t_award_withdrawn` (in-app + push). Only the owner can revoke; the permission check comes before anything changes. (LEGACY `:708-849`; CHANGE: notification, and legacy deleted notifications before checking permission)
- AC-19 Given the owner is restricted, or the project is closed, hidden or not active, When they try to award, Then it is refused (`t_project_is_not_open_for_bid`). Given the proposal is not active, Then `t_this_bid_is_not_active_yet`. (LEGACY)

### Freelancer accepts or declines (BR-059; Q-005; P-85)
- AC-20 Given an awarded proposal before its deadline, When its freelancer presses "Accept" (Selling → Projects, or the notification link) and confirms, Then in one step the proposal becomes **accepted**, a work contract is created with status **awaiting payment** (amount = proposal amount, days, revisions, fee versions — a snapshot), the project becomes **hired** (spec 10 R-P3), and the client gets `FreelancerAcceptedYourProject` (email) and `t_subject_employer_freelancer_accepted_ur_project` (in-app + push) linking to the payment page. No milestone request is created. Premium is not required to accept. (LEGACY accept `Seller/Projects/ProjectsComponent.php:280-391`; CHANGE Q-036, Q-050, X-01: one payment, no milestone request; snapshot fixes R-013)
- AC-21 Given an awarded proposal before its deadline, When its freelancer presses "Decline", chooses a reason and confirms, Then the proposal becomes **declined** (hidden from the list), the project returns to active (open for proposals), and the client gets `FreelancerRejectedYourProject` (email) and `t_subject_employer_freelancer_rejected_ur_project` (in-app + push) with the reason. The reasons are `t_freelancer_reject_project_reason_1, _2, _4, _5, _6, _7, _8`; reason 3 (milestone) is not offered. A freelancer who declined cannot send a new proposal on that project. (LEGACY `:156-270`; reason 3 removed PROPOSED P-85; no re-proposal PROPOSED P-82)
- AC-22 Given an awarded proposal whose deadline has passed, When the sweeper runs (every minute), Then the award is removed (proposal back to active, project open again) and both the freelancer (`t_award_expired_freelancer`) and the client (`t_award_expired_client`) get in-app + push notifications. An "Accept" after the deadline is refused with `t_award_expired` even if the sweeper has not run yet. (CHANGE Q-005: 48 h configurable, every minute, legacy daily 24 h R-032; notifications NEW P-84)
- AC-23 Given S-027 is changed, When it is saved, Then awards already made keep their stored deadline; new awards use the new value. (00 EC-2)
- AC-24 Given Selling → Projects (`/seller/projects`), When it opens, Then it lists the freelancer's awarded proposals (with the countdown to the deadline and Accept / Decline) and their contracts (awaiting payment, in progress with expected delivery date and "Late" chip, delivered with the auto-release date when S-025 is ON, revision requested, completed, refunded) with the next action (Deliver). 42 per page. (LEGACY list `:126-146`; statuses NEW)

### Before payment (P-86)
- AC-25 Given a contract awaiting payment, When the client or the freelancer presses "Cancel hire" and confirms (`t_cancel_hire_confirm`), Then the contract becomes **canceled**, the proposal becomes "hire canceled", the project returns to **active** (open for proposals, other proposals unchanged), no money moves, and the other side gets `t_hire_canceled` (in-app + push, email). There is no automatic payment deadline. (NEW, PROPOSED P-86; legacy had no way out and projects stayed "under development" unpaid)

### One escrow payment (Q-008, Q-034, Q-036, Q-050; spec 05)
- AC-26 Given a contract awaiting payment, When the client opens the payment page (`/account/projects/payments/{uid}`; mobile Buying → Projects → project → Pay), Then it shows the project, freelancer, proposal amount, delivery days, revisions and the checkout block of spec 05: Wallet (S-020) and Card (S-019, with the S-012 card fee line); points and bank transfer are not offered. The quote = proposal amount P + client project commission Fb if S-014 is ON (today 0) + card surcharge on card (spec 05 AC-5…AC-8). (LEGACY `/payments` flow Q-034; methods Q-016, Q-070)
- AC-27 Given a user who is not the project owner, When they open the payment page or call the payment API for that contract, Then the answer is 404. (CHANGE, fixes R-018)
- AC-28 Given Wallet is chosen with enough Available balance, When the client confirms, Then in one step the total leaves the client's Available balance, the contract becomes **in progress**, the freelancer's HOLD increases by P′ = P − freelancer commission (S-015; today P′ = P), the expected delivery date = payment time + proposal days, and the freelancer gets `EmployerFundedMilestone` (email, `t_subject_freelancer_employer_deposited_funds`) and `t_username_has_deposited_amount_in_project` (in-app + push). (CHANGE Q-008: freelancer HOLD funded, legacy wallet `create()` never funded it; MM-11-02; expected date PROPOSED P-86)
- AC-29 Given Card is chosen, When the client confirms, Then the contract stays **awaiting payment** (no HOLD, no ledger entry) and the BOG page opens (spec 05 AC-9). When the payment is verified (spec 05 AC-10), Then the same effects as AC-28 happen, the surcharge is recorded separately, and nothing is added to the client's balances. (CHANGE Q-008, fixes R-012 client pending and the "funded before payment" defect; MM-11-01)
- AC-30 Given the contract is already paid (or canceled), When another payment for it is verified (second tab, double click, late callback), Then that payment is not applied to the contract; the full charged amount goes to the client's wallet as "Unapplied payment" (spec 05 AC-15, P-40). A wallet payment for an already-paid contract is refused with `t_order_status_changed`. (CHANGE, fixes legacy re-funding `UnifiedCheckoutComponent.php:523-559`)
- AC-31 Given the client pays, When they look at their balances, Then no pending or escrow amount appears on their side; the project shows "Paid" (00 AC-13; spec 05 AC-29). (CHANGE Q-008)

### Work, delivery and revisions (rules of spec 06 applied to the contract)
- AC-32 Given a contract in progress or with a revision requested, When the freelancer delivers (message required ≤ 2,500; optionally one file ≤ S-086 MB of a type in S-087), Then a new numbered delivery is stored (append-only, spec 06 R-O9), the status becomes **delivered**, the auto-release deadline = delivery time + S-026 hours (stored), and the client gets `ProjectCompleted` (email, subject `t_subject_employer_project_delivered`) and `t_freelancer_has_delivered_project_work` (in-app + push), including the automatic completion date when S-025 is ON (`t_auto_complete_notice`). Delivery is refused on a completed, refunded or canceled contract (`t_u_cant_send_delivered_work_anymore_status_wrong`). (LEGACY delivery + notifications; CHANGE X-16: no overwrite/resubmit, legacy allowed delivery on completed projects; timer Q-051; subject PROPOSED P-88; same rules as 06 AC-22…AC-24)
- AC-33 Given a delivered contract, When the client requests a revision, Then revisions follow spec 06 AC-25…AC-29 with the contract's snapshot number of revisions (from the proposal): the counter, the message (≤ 750), the timer stop, the fresh full S-026 period at re-delivery (Q-071a), and "no revisions left" (P-2). The freelancer gets `RevisionRequested` (email) and `t_client_requested_revision_project` (in-app + push). (NEW Q-056, Q-061, P-1, P-2)
- AC-34 Given a contract in progress whose expected delivery date has passed, When it is shown, Then both sides see a "Late" chip; the client may open a refund request (spec 13). Nothing happens automatically. (LEGACY `PayComponent.php:1384-1394`)
- AC-35 Given a delivery file, When anyone opens it, Then only the client, the freelancer and staff with the orders permission get a short-lived signed link; others get 404. (CHANGE ADR-009)

### Completion (BR-073; P-87)
- AC-36 Given a delivered contract with no open dispute, When the client presses "Complete project" and confirms (`t_confirm_release_of_payment_for_username`, `t_pls_ensure_that_u_are_satisfied_with_work_freelancer`), Then in one step: contract **completed**, project **completed**, the contract's HOLD moves to the freelancer's Available balance, an open refund request is closed, the freelancer gets `EmployerReleasedMilestone` (email, `t_subject_freelancer_employer_released_funds`) and `t_username_has_released_amount_in_project` (in-app + push), and the client is taken to the review form (spec 07 AC-2). (LEGACY release `PayComponent.php:1265-1365`; CHANGE: only after a delivery, PROPOSED P-87; MM-11-03)
- AC-37 Given a contract in progress (not delivered) or with a revision requested, When the client looks for "Complete project", Then it is not offered and the API refuses it. Given a dispute is open, Then it is refused with `t_cannot_complete_during_dispute` (spec 06 P-51). (CHANGE: legacy allowed release any time the payment was funded)
- AC-38 Given the client completes at the same moment as the auto-release sweeper or a staff release, When both run, Then the money moves once (`escrow:{payment}:release`); the second action does nothing. (CHANGE, fixes R-017)

### Automatic release (Q-051, Q-067a, Q-071, Q-084)
- AC-39 Given S-025 is ON and a delivered contract's deadline has passed with no revision requested, no open refund request and no open dispute, When the sweeper runs, Then the contract is completed exactly as in AC-36 (actor "system"), and both sides get `t_project_auto_completed_freelancer` / `t_project_auto_completed_client` (email + in-app + push). Pausing, restarting, switching S-025 OFF and ON, and changing S-026 follow spec 06 AC-34…AC-38 exactly. (CHANGE Q-051, Q-067a; MM-11-04)

### Project thread (BR-122; P-88)
- AC-40 Given a contract that is awaiting payment, in progress, delivered or with a revision requested, When the client or the freelancer writes in the project thread (required, ≤ 750 characters), Then the message is added with sender and time in real time, and the other side gets `t_client_sent_message_about_project` or `t_freelancer_sent_message_about_project` (in-app + push). After completion, refund or cancellation the thread is read-only; staff with `chat.read` can read it (spec 08 AC-29). Migrated legacy project threads appear on their projects (Q-065). (LEGACY thread `DeliverComponent.php:318-377`; notifications NEW PROPOSED P-88; legacy compared the project status with a delivery-status value)

### Pages and access
- AC-41 Given the client's project work page (`/account/projects/payments/{uid}`), When it opens, Then it shows: header (project, freelancer, amount paid, delivery days, revisions left, expected delivery date), status timeline (awarded → accepted → paid → delivered → completed), Pay / Cancel hire (awaiting payment), deliveries history, revision request, Complete project, Request refund (spec 13), thread. (LEGACY page; layout NEW)
- AC-42 Given the freelancer's work page (`/seller/projects/deliver/{uid}`), When it opens, Then it shows the same header, Cancel hire (awaiting payment), the delivery form (file from camera or files on mobile), deliveries history, the revision message when one is requested, the thread, and "Request release of funds" when available (spec 06 AC-45 rule; flow in spec 13). (LEGACY page)
- AC-43 Given any contract page or its API, When a user who is neither its client nor its freelancer (nor staff with permission) requests it, Then the answer is 404. (CHANGE, IDOR by design)

### Reviews (Q-046, Q-062)
- AC-44 Given a completed contract (by the client, auto-release, staff release or a dispute decision paying the freelancer), When the client or the freelancer opens it, Then each can review the other once (spec 07 AC-2). Canceled or refunded contracts cannot be reviewed. (NEW Q-046, Q-062)

### Migration (Q-050; P-89)
- AC-45 Given legacy projects with bids and one `project_milestones` row, When they are migrated, Then they map as in R-H10: each milestone becomes the contract's single payment; funded-and-unreleased payments become open escrows on the freelancer's HOLD (ADR-003 §11); delivered-and-unfinished contracts get a fresh S-026 period from go-live (same principle as spec 06 P-53b and Q-084); awards waiting for acceptance get a fresh S-027 period from go-live; commissions stored on legacy milestones are kept for history but not recomputed (Q-006). (Q-050; PROPOSED P-89)

---

## Business rules
- R-H1 **Premium gate** (Q-020, Q-069): submitting and editing a proposal require active Premium at request time (R-2.1); viewing other proposals requires Premium unless owner or staff; accepting an award, delivering and being paid do not.
- R-H2 **Proposal** (BR-055, P-80): amount 1.00…budget max and within budget, ≤ 2 decimals, ≤ 10 characters; days 1–365; revisions 0…S-041 (required); message ≤ 3,500. One non-withdrawn proposal per freelancer per project; none after declining an award on it.
- R-H3 **Proposal statuses**: `pending_approval` → `active` | `rejected` (staff; editable → back); `active` → `awarded` → `accepted` | `declined` | back to `active` (moved, revoked, expired); `withdrawn` (freelancer, not when awarded); `accepted` → `hire_canceled` (AC-25). Others on a hired project show "not selected" to their authors.
- R-H4 **Award** (Q-005): one awarded proposal at a time; deadline = award time + S-027 (stored); moving or revoking allowed until acceptance; expiry by the minute sweeper; late acceptance refused.
- R-H5 **Contract** (Q-036, Q-050): created at acceptance with a snapshot (amount P, days, revisions, fee rule versions, client and freelancer). Statuses: `awaiting_payment` → `in_progress` → `delivered` ⇄ `revision_requested` → `completed`; `awaiting_payment` → `canceled`; `in_progress | delivered | revision_requested` → `refunded` (spec 13). Flags `refund_open`, `dispute_open`. The project status follows (spec 10 R-P3: hired → completed / refunded; canceled → active).
- R-H6 **One payment** (Q-008, Q-034, Q-050): exactly one payment per contract = P (+ Fb); buyer charged at payment; HOLD P′ on an escrow account per payment (ADR-003); unpaid contracts hold nothing; ownership enforced (R-018).
- R-H7 **Extensibility** (Q-035, Q-036): the contract has a type (`fixed`) and a payment schedule with one item today; milestones (several scheduled payments) or hourly billing can be added later as new schedule types without changing proposals, projects or the ledger model. No UI or endpoint exists for them now (X-01, X-02).
- R-H8 **Delivery, revisions, timers**: identical to spec 06 R-O5, R-O6, R-O9, R-O10 (append-only deliveries, revisions from the snapshot, 72 h auto-release paused by revision/refund/dispute, fresh period on re-delivery or when a refund ends without money moving, never after a dispute, fresh period when S-025 is switched back ON).
- R-H9 **Who may act**: freelancer — propose, edit, withdraw, accept, decline, cancel hire (before payment), deliver, thread, unblock request (when available); client — award, revoke, cancel hire (before payment), pay, revision, complete, thread, refund (spec 13), review; staff — moderate proposals, spec 13 tools; system — expiry and auto-release.
- R-H10 **Legacy mapping** (P-89):
  | Legacy state | New state |
  |---|---|
  | bid `active`, not awarded | proposal `active` (sealed/sponsored/highlight flags dropped) |
  | bid `pending_approval` / `rejected` | same |
  | bid `pending_payment` (unpaid upgrade) | proposal `active` without the upgrade (X-04) |
  | bid `hidden` with `freelancer_rejection_reason` | proposal `declined` with the reason |
  | bid awarded, not accepted | proposal `awarded`, deadline = go-live + S-027 |
  | project `under_development`, milestone `request` (unpaid) | contract `awaiting_payment` |
  | milestone `funded`, no delivery | contract `in_progress` (HOLD = legacy amount − freelancer commission) |
  | milestone `funded` + delivered work | contract `delivered`, deadline = go-live + S-026 (unless a refund is open) |
  | milestone `paid` | contract `completed` |
  | milestone `refunded` | contract `refunded` |
  | legacy deliveries (one per project) and thread | delivery no. 1 and the project thread |

## Money movements (ledger map for ADR-003 / P2-B2)
"P" = proposal amount (contract price); "P′" = freelancer amount = P − freelancer project commission (S-015; today P′ = P); "Fb" = client project commission (S-014; today 0); "S" = card surcharge on P + Fb (spec 05 R-P5, P-38); "H" = the payment's escrow balance (P′ while open). `{payment}` = the contract's payment id.

| ID | Trigger | From → To | Amount | Idempotency reference |
|---|---|---|---|---|
| MM-11-01 | Card payment for the contract verified (AC-29) | `platform:bog_clearing` → `escrow:{payment}:hold` | P′ | `bog:{bogOrderId}:paid` |
| | | `platform:bog_clearing` → `platform:fee_revenue:project_freelancer_commission` | P − P′, only if S-015 is ON | same |
| | | `platform:bog_clearing` → `platform:fee_revenue:project_client_commission` | Fb, only if S-014 is ON | same |
| | | `platform:bog_clearing` → `platform:card_surcharge_revenue` | S | same |
| MM-11-02 | Wallet payment confirmed (AC-28) | `user:{client}:available` → `escrow:{payment}:hold` | P′ | `payment:{paymentId}:wallet` |
| | | `user:{client}:available` → `platform:fee_revenue:project_freelancer_commission` / `…:project_client_commission` | P − P′ / Fb, only if ON | same |
| MM-11-03 | Client completes (AC-36) | `escrow:{payment}:hold` → `user:{freelancer}:available` | H | `escrow:{payment}:release` |
| MM-11-04 | Auto-release by the system (AC-39) | same as MM-11-03 | H | `escrow:{payment}:release` (shared with MM-11-03, spec 13 staff release and dispute decision) |
| (none) | Award, accept, decline, expiry, cancel hire before payment, card failed/expired (AC-16…AC-25) | – | 0 | – |

A second verified payment for a paid or canceled contract uses MM-05-06 (unapplied). Refunds (seller-accepted, dispute decision, staff refund) use `escrow:{payment}:refund` and are in spec 13 (MM-13-xx). The surcharge S and Fb are never returned (Q-011).

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Proposal form | modal on the project page: amount (with "Paid to you"), days, revisions (stepper 0…S-041), message with counter | full screen with sticky "Send proposal" | Premium required (box / sheet); validation errors; submitting; success (pending approval or posted) |
| Proposals section | cards with sort menu; owner actions Award / Revoke / Chat; Report on each card | list with sort sheet; actions in a card menu | empty `t_no_proposals_on_project`; locked for non-Premium (count + upgrade); awarded chip |
| Selling → Proposals / Projects | lists (AC-14, AC-24) with countdown for awards | tabs with filter chips | empty; loading; error |
| Accept / decline award | dialog with countdown; decline reason list | bottom sheet | expired (refused) |
| Payment page | spec 05 checkout block, contract summary | summary + payment sheet | awaiting payment; quote changed; insufficient balance; processing; paid; canceled |
| Client / freelancer work pages | AC-41 / AC-42 | stacked sections, sticky action bar | in progress (expected date, Late); delivered (auto-complete date); revision requested; completed (review prompt); refunded/canceled (read-only); dispute open |

Key screen for design P2-C4: project page + proposal form (with spec 10).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `User/Everyone/NewBidReceived` (`t_subject_everyone_u_received_new_bid`) + `t_u_received_new_bid_on_ur_project` | email + in-app + push | client | proposal becomes active (AC-6, AC-9) | LEGACY; CHANGE not on edits (P-83) |
| `Admin/BidPendingApproval` (`t_notification_admin_bid_pending_approval`) | email | all S-100 | proposal pending approval (AC-6, AC-12) | LEGACY (S-073 OFF only); CHANGE recipients Q-026 |
| `User/Everyone/YourBidApproved` (`t_subject_everyone_ur_bid_approved`) + `t_ur_bid_approved` | email + in-app + push | freelancer | staff approve (AC-9) | LEGACY email; in-app NEW P-83 |
| `User/Everyone/YourBidRejected` (`t_subject_everyone_ur_bid_needs_changes`) + `t_ur_bid_rejected` | email + in-app + push | freelancer | staff reject (AC-9) | LEGACY email; in-app NEW P-83 |
| `Admin/BidReported` (`t_subject_admin_bid_reported`) | email | all S-100 | proposal reported (AC-15) | LEGACY; CHANGE recipients |
| `User/Freelancer/ProjectAwarded` (`t_subject_freelancer_u_awarded_a_project`) + `t_congratulations_employer_awarded_u_their_project_title` | email + in-app + push | freelancer | award (AC-16) | LEGACY; CHANGE text with `:hours` |
| `t_award_withdrawn` | in-app + push | previous freelancer | award moved or revoked (AC-17, AC-18) | **NEW, PROPOSED P-84** |
| `t_award_expired_freelancer` / `t_award_expired_client` | in-app + push | freelancer / client | award expired (AC-22) | **NEW, PROPOSED P-84** |
| `User/Employer/FreelancerAcceptedYourProject` (`t_subject_employer_freelancer_accepted_ur_project`) + same key in-app | email + in-app + push | client | acceptance (AC-20) | LEGACY |
| `User/Employer/FreelancerRejectedYourProject` (`t_subject_employer_freelancer_rejected_ur_project`) + same key in-app | email + in-app + push | client | decline (AC-21) | LEGACY |
| `t_hire_canceled` (email subject `t_subject_hire_canceled`) | email + in-app + push | other side | cancel hire before payment (AC-25) | **NEW, PROPOSED P-86** |
| `User/Freelancer/EmployerFundedMilestone` (`t_subject_freelancer_employer_deposited_funds`) + `t_username_has_deposited_amount_in_project` | email + in-app + push | freelancer | payment confirmed (AC-28, AC-29) | LEGACY (class name kept for the one project payment) |
| `User/Employer/ProjectCompleted` (subject `t_subject_employer_project_delivered`) + `t_freelancer_has_delivered_project_work` | email + in-app + push | client | delivery and re-delivery (AC-32) | LEGACY; CHANGE subject (legacy "Project has been completed"), PROPOSED P-88 |
| `RevisionRequested` (spec 06) + `t_client_requested_revision_project` | email + in-app + push | freelancer | revision requested (AC-33) | **NEW** (Q-056) |
| `User/Freelancer/EmployerReleasedMilestone` (`t_subject_freelancer_employer_released_funds`) + `t_username_has_released_amount_in_project` | email + in-app + push | freelancer | client completes (AC-36) | LEGACY |
| `t_project_auto_completed_freelancer` / `t_project_auto_completed_client` (subject `t_subject_project_auto_completed`) | email + in-app + push | freelancer / client | auto-release (AC-39) | **NEW** (Q-051) |
| `t_client_sent_message_about_project` / `t_freelancer_sent_message_about_project` | in-app + push | other side | thread message (AC-40) | **NEW, PROPOSED P-88** |

**Not carried over:** `FreelancerRequestedMilestone`, `RejectMilestone` and their in-app keys (X-01, Q-036). Staff completion (legacy `t_congts_freelancer_ur_project_completed`) is the staff release of spec 13. Refund, dispute and unblock notifications: spec 13. Review notifications: spec 07.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged unless noted):
| Key | en | ka |
|---|---|---|
| `t_bid_on_this_project` | Bid on this project | შეთავაზების გაგზავნა |
| `t_bid_details` / `t_bid_amount` | Bid details / Bid amount | წინადადების დეტალები / წინადადების ღირებულება |
| `t_paid_to_you` / `t_bid_paid_to_you_tooltip` | Paid to you / This is the net amount paid to you | შენთვის გადახდილია / ეს არის თქვენთვის გადახდილი სუფთა თანხა |
| `t_this_project_will_be_delivered_in` / `t_days` | This project will be delivered in / Days | პროექტის განსახორციელებლად საჭირო დრო / დღე |
| `t_describe_ur_proposal` / `t_describe_ur_proposal_placeholder` | Describe your proposal / enter a detailed description of your quotation that addresses the client’s requirements for the project | აღწერეთ წინადადება / აღწერეთ შეთავაზება დეტალურად, რომელიც პასუხობს დამკვეთის მოთხოვნებს |
| `t_pls_insert_bid_value_between_budget` | Please insert a value between the budget | გთხოვთ, მიუთითოთ ღირებულება ბიუჯეტის ფარგლებში |
| `t_project_not_active_to_send_proposals` | This project is not active to send proposals | ეს პროექტი არ არის აქტიური წინადადებების გასაგზავნად |
| `t_u_cant_submit_bids_to_urself` | You cannot bid on your projects. | თქვენ არ შეგიძლიათ გაგზავნოთ შეთავაზებები თქვენსავე პროექტებში. |
| `t_u_cant_submit_bids_to_this_project` | You cannot bid on this project because it is already Awarded. | შეთავაზების გაგზავნა შეუძლებელია, რადგან დამკვეთვა უკვე დაამტკიცა პროექტზე სხვა ფრილანსერი. (Owner may fix "დამკვეთვა" → "დამკვეთმა") |
| `t_u_already_submitted_a_bid_to_this_project` | You already submitted your bid on this project | თქვენ უკვე წარადგინეთ წინადადება ამ პროექტზე |
| `t_ur_bid_has_been_posted` / `t_ur_bid_has_been_posted_pending_approval` | You bid on this project has been successfully posted (Owner may fix "You" → "Your") / Your bid on this project has been added and pending approval | პროექტზე შეთავაზება გაგზავნილია / შეთავაზება ამ პროექტზე დამატებულია და ელოდება დამტკიცებას |
| `t_proposals` / `t_newest` / `t_oldest` / `t_fastest` / `t_cheapest` | Proposals / Newest / Oldest / Fastest / Cheapest | წინადადებები / ახალი / ძველი / სწრაფი / იაფი |
| `t_warning_bids_limit` / `t_warning_project_limit` / `t_premium_required` / `t_upgrade_to_premium` | see 00 | see 00 |
| `t_edit_bid` / `t_my_bids` | Edit bid / My bids | შემოთავაზების რედაქტირება / ჩემი წინადადებები |
| `t_report_bid_reason_1` … `_4` | Bidder did not read project description / Unclear or does not provide enough information / Contains contact information / Other | პრეტენდენტმა არ წაიკითხა პროექტის აღწერა / გაურკვეველია ან არ იძლევა საკმარის ინფორმაციას / შეიცავს საკონტაქტო ინფორმაციას / სხვა |
| `t_pls_login_or_register_report_bid` / `t_u_cannot_report_ur_own_bids` / `t_u_already_reported_this_bid` | Please login or register to report this bid / You cannot report your own bids / You already reported this bid | საჩივრის გამოსაგზავნად გთხოვთ გაიარეთ ავტორიზაცია ან დარეგისტრირდით / თქვენ არ შეგიძლიათ გაასაჩივროთ საკუთარი შეთავაზებები / თქვენ უკვე გაასაჩივრეთ ეს წინადადება |
| `t_subject_admin_bid_reported` / `t_notification_admin_bid_pending_approval` | Someone has reported a bid / Bid pending approval | ვიღაცამ გაასაჩივრა შეთავაზება / წინადადება ელოდება დადასტურებას |
| `t_award` / `t_awarded` / `t_revoke` | Award / Awarded / Revoke | დამტკიცება / დამტკიცებული / გაუქმება |
| `t_bid_confirmation` / `t_are_you_sure_accept_bid` | Bid Confirmation / Are you sure you want to accept this bid? | წინადადების დადასტურება / დარწმუნებული ხართ რომ გსურთ ამ წინადადების მიღება. |
| `t_u_have_accepted_this_bid_success` / `t_u_have_success_revoked_this_bid` | You have successfully accepted this offer / You have successfully revoked this offer | თქვენ დათანხმდით შემოთავაზებას / თქვენ გააუქმეთ შეთავაზება |
| `t_this_bid_is_not_active_yet` / `t_project_is_not_open_for_bid` / `t_this_bid_is_not_awarded_to_revoke_it` | This bid is not active yet. Please try again later. / This project is not open for bid right now / This bid is not awarded to revoke it | ეს შეთავაზება ჯერ არ არის აქტიური. გთხოვთ სცადოთ მოგვიანებით. / ეს პროექტი ამჟამად არ არის ღია ტენდერისთვის / ეს წინადადება არ არის დამტკიცებული რომ გააუქმოთ ის. |
| `t_congratulations_employer_awarded_u_their_project_title` | **CHANGED value:** Congratulations! :username awarded you their project :title. Please accept or decline within :hours hours. | **CHANGED value:** გილოცავთ! :username-მა დაგამტკიცათ პროექტზე :title. გთხოვთ, დაადასტუროთ ან უარი თქვათ :hours საათის განმავლობაში. |
| `t_subject_freelancer_u_awarded_a_project` | You have awarded a project (Owner may fix: "You have been awarded a project") | თქვენ დაგამტკიცეს პროექტზე |
| `t_awarded_projects` | Awarded projects | დამტკიცებული პროექტები |
| `t_rejection_reason` / `t_pls_select_rejection_reason` | Rejection reason / Please select a rejection reason first | უარის მიზეზი / გთხოვთ, ჯერ აირჩიეთ უარის მიზეზი |
| `t_freelancer_reject_project_reason_1, _2, _4 … _8` | Project is spam or fraud / The employer is unclear about what they want / We do not agree on the budget / I already have enough work / I do not have the skills to do the project / I do not have time to take on the project / Other | პროექტი არის სპამი ან თაღლითობა / გაუგებარია რა სურთ დამსაქმებლებს / ჩვენ ვერ შევთანხმდით ბიუჯეტზე / უკვე მაქვს საკმარისი სამუშაო / მე არ მაქვს ამ პროექტზე მუშაობისთვის საჭირო უნარები / მე არ მაქვს დრო ამ პროექტზე მუშაობისთვის / სხვა |
| `t_freelancer_u_have_accepted_this_project_success` / `t_freelancer_u_have_reject_this_project_success` | You have successfully accepted this project / You have successfully rejected this project | თქვენ წარმატებით დათანხმდით პროექტში მონაწილეობას / თქვენ უარი თქვით პროექტში მონაწილეობაზე. |
| `t_subject_employer_freelancer_accepted_ur_project` | Your project has been accepted by the freelancer | ფრილანსერი დათანხმდა თქვენს პროექტში მონაწილეობაზე, გთხოვთ გადაიხადოთ პროექტის საფასური |
| `t_subject_employer_freelancer_rejected_ur_project` | Your project has been rejected by the freelancer | ფრილანსერმა უარი თქვა თქვენს პროექტში მონაწილეობაზე |
| `t_subject_everyone_u_received_new_bid` / `t_u_received_new_bid_on_ur_project` | New bid has been received / You have received a new bid for your project | ახალი წინადადება მიღებულია / თქვენს პროექტზე გამოგზავნილია ახალი შემოთავაზება |
| `t_subject_everyone_ur_bid_approved` / `t_subject_everyone_ur_bid_needs_changes` | Your bid has been approved / You bid needs changes (Owner may fix "You" → "Your") | წინადადება მიღებულია / თქვენს წინადადებას სჭირდება ცვლილებები |
| `t_subject_freelancer_employer_deposited_funds` / `t_username_has_deposited_amount_in_project` | Employer has deposited funds / :username has deposited an :amount into your project | დამსაქმებელმა შეიტანა ანგარიშზე თანხა / :username გადაიხადა პროექტის საფასური :amount |
| `t_freelancer_has_delivered_project_work` | Freelancer has delivered project work. | ფრილანსერმა მოგაწოდათ ნამუშევარი |
| `t_confirm_release_of_payment_for_username` / `t_pls_ensure_that_u_are_satisfied_with_work_freelancer` | confirm release of payment for :username / Please ensure that you are satisfied with the work :username has submitted, as payment cannot be returned once released. | გთხოვთ დაადასტუროთ გადახდა შემდეგი მომხმარებლისთვის :username / გთხოვთ, დარწმუნდეთ, რომ კმაყოფილი ხართ :username-ის მიერ წარმოდგენილი ნამუშევრით, რადგან თანხა ვერ დაბრუნდება ბლოკის მოხსნის და ფრილანსერთან გაგზავნის შემდეგ. |
| `t_subject_freelancer_employer_released_funds` / `t_username_has_released_amount_in_project` | Employer has released a payment / :username has released an amount of :amount into your account. | დამკვეთმა ბლოკიდან გაანთავისუფლა პროდუქტის საფასური. / :username მოხსნა ბლოკი პროექტის საფასურს, :amount გადმოირიცხა თქვენს ანგარიშზე |
| `t_milestone_payment_released_success` | Payment has been successfully released. | ტრანზაქცია წარმატებით შესრულდა |
| `t_u_cant_send_delivered_work_anymore_status_wrong` | You can't submit any files for this order because it not active | ამ შეკვეთისთვის ფაილების გაგზავნა შეუძლებელია, რადგან ის არ არის აქტიური |
| `t_insufficient_funds_in_your_account` / `t_order_status_changed` / `t_cannot_complete_during_dispute` / `t_auto_complete_notice` / `t_revisions_left` / `t_no_revisions_left` / `t_request_revision` / `t_delivery_number` / `t_late` | see 05 / 06 | see 05 / 06 |
| `t_validator_revisions_range` / `t_number_of_revisions` | see 04 | see 04 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_validator_proposal_days` | Enter a whole number of days from 1 to 365. | შეიყვანეთ დღეების მთელი რიცხვი 1-დან 365-მდე. |
| `t_proposal_revisions_hint` | How many revisions the client can ask for after your delivery. | რამდენი შესწორების მოთხოვნა შეეძლება დამკვეთს თქვენი მიწოდების შემდეგ. |
| `t_send_proposal` | Send proposal | შეთავაზების გაგზავნა |
| `t_withdraw_proposal` / `t_withdraw_proposal_confirm` | Withdraw proposal / Your proposal will be removed from this project. You can send a new one while the project is open. | შეთავაზების გაწვევა / თქვენი შეთავაზება ამ პროექტიდან მოიხსნება. პროექტის ღიად ყოფნის განმავლობაში შეგიძლიათ ახალი გაგზავნოთ. |
| `t_proposal_status_withdrawn` / `t_proposal_status_declined` / `t_proposal_status_not_selected` / `t_proposal_status_hire_canceled` | Withdrawn / Declined / Not selected / Hire canceled | გაწვეულია / უარყოფილია თქვენ მიერ / არ შეირჩა / დაქირავება გაუქმდა |
| `t_no_proposals_yet` | You have not sent any proposals yet. | შეთავაზება ჯერ არ გაგიგზავნიათ. |
| `t_no_proposals_on_project` | No proposals yet. | შეთავაზებები ჯერ არ არის. |
| `t_ur_bid_approved` | Your proposal on ":title" was approved and is now visible to the client. | თქვენი შეთავაზება პროექტზე ":title" დამტკიცდა და დამკვეთისთვის ხილულია. |
| `t_ur_bid_rejected` | Your proposal on ":title" needs changes: :reason | თქვენს შეთავაზებას პროექტზე ":title" სჭირდება ცვლილებები: :reason |
| `t_award_withdrawn` | The client withdrew the award for ":title". Your proposal is active again. | დამკვეთმა გააუქმა თქვენი დამტკიცება პროექტზე ":title". თქვენი შეთავაზება ისევ აქტიურია. |
| `t_award_expired` | The time to accept this award has passed. | დამტკიცების მიღების ვადა ამოიწურა. |
| `t_award_expired_freelancer` | You did not accept the award for ":title" in time, so it was withdrawn. | პროექტზე ":title" დამტკიცება დროულად არ მიიღეთ, ამიტომ ის გაუქმდა. |
| `t_award_expired_client` | :username did not accept your project ":title" in time. You can award another proposal. | :username-მა დროულად არ დაადასტურა თქვენი პროექტი ":title". შეგიძლიათ სხვა შეთავაზება დაამტკიცოთ. |
| `t_accept_award_before` | Accept or decline before :date. | დაადასტურეთ ან უარი თქვით :date-მდე. |
| `t_awaiting_freelancer_acceptance` | Awarded — waiting for the freelancer to accept | დამტკიცებულია — ველოდებით ფრილანსერის თანხმობას |
| `t_cancel_hire` / `t_cancel_hire_confirm` | Cancel hire / The hire will be canceled before any payment and the project will reopen for proposals. | დაქირავების გაუქმება / დაქირავება გაუქმდება გადახდამდე და პროექტი შეთავაზებებისთვის ხელახლა გაიხსნება. |
| `t_hire_canceled` / `t_subject_hire_canceled` | The hire for ":title" was canceled before payment. / Hire canceled | პროექტზე ":title" დაქირავება გაუქმდა გადახდამდე. / დაქირავება გაუქმდა |
| `t_pay_for_project` | Pay for the project | პროექტის საფასურის გადახდა |
| `t_contract_awaiting_payment` / `t_contract_in_progress` | Waiting for the client's payment / In progress | ველოდებით დამკვეთის გადახდას / მიმდინარეობს |
| `t_complete_project` | Complete project | პროექტის დასრულება |
| `t_subject_employer_project_delivered` | Work delivered for your project | თქვენს პროექტზე ნამუშევარი მოწოდებულია |
| `t_client_requested_revision_project` | :client requested a revision for the project ":title". | :client-მა პროექტზე ":title" შესწორება მოითხოვა. |
| `t_project_auto_completed_freelancer` | The project ":title" was completed automatically and :amount was added to your available balance. | პროექტი ":title" ავტომატურად დასრულდა და თქვენს ხელმისაწვდომ ბალანსს დაემატა :amount. |
| `t_project_auto_completed_client` | The project ":title" was completed automatically because no revision or refund was requested in time. You can now leave a review. | პროექტი ":title" ავტომატურად დასრულდა, რადგან დროულად არ მოითხოვეთ შესწორება ან თანხის დაბრუნება. ახლა შეგიძლიათ დატოვოთ შეფასება. |
| `t_subject_project_auto_completed` | Project completed automatically | პროექტი ავტომატურად დასრულდა |
| `t_client_sent_message_about_project` / `t_freelancer_sent_message_about_project` | :username sent you a message about the project ":title". | :username-მა პროექტთან ":title" დაკავშირებით შეტყობინება გამოგიგზავნათ. |
| `t_project_thread` | Project messages | პროექტის მიმოწერა |
| `t_payment_in_progress` | A payment is being processed. Please wait a moment. | გადახდა მუშავდება. გთხოვთ, ცოტა ხანს მოიცადოთ. |

## Edge cases
- EC-1 Premium expires between opening and submitting the form: the server refuses at submit (00 EC-5).
- EC-2 Premium expires after the proposal was sent: the proposal stays active and can be awarded; editing needs Premium again (P-81).
- EC-3 The owner awards while the freelancer withdraws at the same moment: compare-and-set; the second action gets `t_order_status_changed`.
- EC-4 The freelancer accepts one minute before the deadline while the sweeper runs: whichever locks the award first wins; the other gets `t_award_expired` or `t_order_status_changed`.
- EC-5 The client pays by card, then cancels the hire in another tab before the callback: cancel is refused while a card payment for the contract is pending (`t_payment_in_progress`); if the payment then fails, cancel is allowed.
- EC-6 The freelancer's account is banned after payment: the contract continues; the client may request a refund (spec 13); staff may intervene.
- EC-7 The project's budget was edited after a proposal was sent (spec 10 AC-24): the proposal can still be awarded at its amount.
- EC-8 S-073 is switched from ON to OFF: active proposals stay active; new and edited ones need approval.
- EC-9 A client awards, revokes and re-awards the same proposal: each award gets a fresh S-027 deadline.
- EC-10 A proposal with 0 revisions: "Request a revision" never appears (spec 06 EC-6).
- EC-11 Auto-release OFF, then ON: an overdue delivered contract gets a fresh 72 h (Q-084; spec 06 AC-37).
- EC-12 The freelancer delivers during an open dispute: the delivery is stored as evidence and does not start the timer (spec 13).

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-11-1 | Premium gate for proposals only in the page (R-019) | `ProjectComponent.php:416-450` | AC-2, R-H1 |
| D-11-2 | Any logged-in user can fund someone else's project and become its employer (R-018) | `UnifiedCheckoutComponent.php:76-90` | AC-27 |
| D-11-3 | Card path marks the payment "funded" before paying; wallet path re-funds an already funded payment | `UnifiedCheckoutComponent.php:523-559, :723-739` | AC-29, AC-30 |
| D-11-4 | Wallet funding through `PayComponent::create()` never adds the freelancer's HOLD | `PayComponent.php:470-694` | AC-28, MM-11-02 |
| D-11-5 | Card-paid projects add the amount to the client's pending balance (R-012) | `PaymentBogController.php:136-150` | AC-29, AC-31 |
| D-11-6 | Commissions swapped and not %-converted on the milestone (R-013) | `Seller/Projects/ProjectsComponent.php:327-329` | AC-20 (snapshot from the Commission & Fee module) |
| D-11-7 | Milestone falls back to a non-existent `project_bid->freelancer_id` | `UnifiedCheckoutComponent.php:532, :731` | R-H5 (contract stores both parties) |
| D-11-8 | Award expiry daily after 24 h, contradicting live 48 h (R-032); late acceptance possible | `ExpiredAwardedBids.php:23, 49`; `Kernel.php:19` | AC-22, AC-23 |
| D-11-9 | Revoke deletes the freelancer's notifications before checking permission; moved/revoked awards notify nobody | `Cards/Bid.php:609, :726` | AC-17, AC-18 |
| D-11-10 | `NewBidReceived` re-sent to the client on every edit | `Bids/Options/EditComponent.php:462-474` | AC-12 |
| D-11-11 | Hard delete of proposals | `Bids/BidsComponent.php:228-250` | AC-13 |
| D-11-12 | Release allowed before any delivery | `PayComponent.php:1265-1275` | AC-36, AC-37 |
| D-11-13 | One delivery record overwritten; "resubmit" deletes it (X-16); delivery allowed on completed projects | `Seller/Projects/Options/DeliverComponent.php:56, :165-311` | AC-32 |
| D-11-14 | Delivery email subject says "Project has been completed" | `DeliverComponent.php:210`; `t_subject_employer_project_completed` | AC-32 (P-88) |
| D-11-15 | Project thread messages notify nobody; status compared with a delivery-status enum | `DeliverComponent.php:318-377` | AC-40 |
| D-11-16 | Sponsored proposals excluded from the list; sealed hiding (X-04) | `ProjectComponent.php:287`; `Cards/Bid.php:185-218` | AC-8, AC-10 |
| D-11-17 | Award text hard-codes "24 hours" | `lang/*/messages.php` `t_congratulations_employer_awarded_u_their_project_title` | AC-16 |
| D-11-18 | Milestone request / reject screens (X-01) | `Seller/Projects/Milestones`, `Account/Projects/Options/MilestonesComponent.php` | removed (Q-036) |

## Out of scope
- Refund requests, disputes, unblock requests and staff release/refund tools (spec 13).
- Milestones and hourly billing (X-01, X-02; R-H7 keeps the model ready).
- Paid proposal upgrades (X-04); "invite freelancer to bid" (not in legacy).
- Project reviews themselves (spec 07); chat (spec 08); project posting and page (spec 10).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-80 Proposal fields.** Amount at least 1.00 GEL and inside the budget (legacy allowed 0); delivery time a whole number of days from 1 to 365 (legacy accepted any integer); message up to 3,500 characters (legacy); number of revisions required, 0 to 10 (Q-056, P-1).
- **P-81 When Premium ends after sending.** The proposal stays active and can still be awarded, accepted, delivered and paid (legacy checked nothing after sending). Editing a proposal requires active Premium again, because an edit is a new offer; withdrawing does not.
- **P-82 Withdraw instead of delete.** "Withdraw" keeps the proposal as history (legacy deleted it permanently). The freelancer may send a new proposal on the same project while it is open (the legacy delete allowed this too). A freelancer who **declined** an award cannot send a new proposal on that project.
- **P-83 Proposal notifications.** The client is notified once, when a proposal becomes active — not on every edit (legacy re-sent the email on each edit). NEW in-app/push messages to the freelancer when staff approve or reject a proposal (legacy: email only).
- **P-84 Award notifications.** NEW: when an award is moved to another proposal, revoked, or expires, the affected freelancer is told; on expiry the client is told too (legacy: silent; it even deleted the freelancer's notification). The award message shows the real acceptance window (48 h from S-027) instead of the hard-coded "24 hours". An acceptance after the deadline is refused even if the minute job has not run yet.
- **P-85 Decline reasons.** Reason 3 "The employer did not create a milestone" is no longer offered (milestones are removed, X-01); the other seven legacy reasons stay; migrated reason-3 values are kept for history.
- **P-86 Between acceptance and payment.** The payment is requested right after the freelancer accepts; there is no automatic payment deadline. Until the client pays, **either side may "Cancel hire"**: no money moves, the project reopens for proposals, the other side is notified (legacy had no way out: unpaid projects stayed "under development" forever). The expected delivery date counts from the **payment** (legacy counted from the acceptance, although the freelancer was told not to start before payment).
- **P-87 Completion after delivery.** "Complete project" is available once the freelancer has delivered (as for gig orders); legacy allowed releasing the money at any time after payment, even before any work. The client then goes to the review form.
- **P-88 Delivery and thread messages.** The delivery email gets a correct subject, "Work delivered for your project" (legacy used "Project has been completed" for every delivery). NEW in-app/push messages when the client or the freelancer writes in the project thread (legacy notified nobody).
- **P-89 Moving legacy projects.** Mapping as in R-H10. In particular: a delivered, unfinished project gets a fresh 72 h from go-live (like spec 06 P-53b); an award still waiting for acceptance gets a fresh 48 h from go-live; commissions stored on legacy milestones are kept for history, not recomputed.
