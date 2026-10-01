# 06 — Order detail (buyer `/account/orders/{itemId}`, freelancer `/seller/orders/{itemId}`)
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Final paths come from `url-map.md`. Specs: 06 AC-11…45 (awaiting payment, order details, start, cancel, deliver, revisions, complete, auto-release, thread, access, unblock); 07 AC-1 (review prompt); 13 AC-1 (refund request); 05 (payment). The same layout serves project contracts (11 AC-32…44) and custom offers (12 AC-21…33). Audit §3.9, §3.10.

## Kept from the live site
- The order sits inside the dashboard shell (sidebar + top bar with the switcher, screen 07).
- The same content as the legacy order cards: status, "contact seller/buyer", the order-details (requirements) form, delivered work with download, refund request, review, cancel while not started.
- A separate delivery thread per order (BR-122), not the Inbox.

## Changes
- One page per order item instead of stacked cards. It has a header, a status timeline, an action bar, and the content blocks below.
- **Revisions** (NEW): "Request a revision" with "N of M revisions left" (06 AC-25…29).
- **Automatic completion** notice with the date (06 AC-33, `t_auto_complete_notice`).
- Every delivery stays in a numbered history; there is no replace/resubmit (X-16).
- Delivery files open through short-lived signed links (06 AC-24).
- Unblock request only while auto-release is OFF (06 AC-45).

## Desktop (≥ 1024) — buyer view
```
┌ DashboardShell: sidebar 240 (Buying) | top bar: [Buying | Selling] switcher ┐
├──────────────────────────────────────────────────────────────────────────────┤
│ ‹ Orders                                                                     │
│ ┌ Order header (Card) ─────────────────────────────────────────────────────┐ │
│ │ [thumb] Gig title (link)                        [Delivered]  StatusBadge │ │
│ │ ◉ freelancer · Order #A1B2C3-1 · Paid ₾270.00 · Source file (+₾20.00)   │ │
│ │ Delivery 4 days · Expected 3 Oct · ↻ 2 of 3 revisions left               │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌ info Banner ─────────────────────────────────────────────────────────────┐ │
│ │ ⏱ This order will be completed automatically on 6 Oct, 14:00 unless you  │ │  t_auto_complete_notice
│ │ request a revision or open a refund request.                             │ │  + Countdown
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ [ Complete order (primary) ] [ Request a revision ] [ Request refund ]  ⋯    │  action bar: the next
├───────────────────────────────────────────────┬──────────────────────────────┤  action first
│ Deliveries                                    │ Timeline                     │
│ ┌ Delivery 2 · 4 Oct 14:00 ────────────────┐  │ ● Paid          29 Sep       │  ordered list
│ │ message text …                            │  │ ● Details sent  29 Sep       │
│ │ 📄 final-logo.zip (4.2 MB)  [Download]    │  │ ● Started       30 Sep       │
│ └───────────────────────────────────────────┘  │ ● Delivered #1  2 Oct        │
│ ┌ Revision requested · 3 Oct ───────────────┐  │ ● Revision      3 Oct        │
│ │ buyer's revision message                  │  │ ● Delivered #2  4 Oct        │
│ └───────────────────────────────────────────┘  │ ○ Completed                  │
│ ┌ Delivery 1 · 2 Oct … ─────────────────────┐  │                              │
│ Order details (what the buyer sent)           │ Order summary                │
│ ┌ formatted text, read-only after start ────┐  │ Base ₾250.00                 │
│ └───────────────────────────────────────────┘  │ Upgrades ₾20.00              │
│ Messages about this order                      │ Paid ₾270.00                 │
│ ┌ thread: ChatBubbles + Composer (≤ 750) ───┐  │ Revisions 3 (1 used)         │
│ └───────────────────────────────────────────┘  │                              │
└───────────────────────────────────────────────┴──────────────────────────────┘
```
Content 8/12, side 4/12. The action bar shows only the actions that are allowed in the current state (table below).

## Desktop — freelancer view (differences)
- Header shows the buyer, "You receive ₾270.00" (P′) and HOLD status.
- Action bar by state: **Start** (with a confirm dialog) when paid + details sent; **Deliver** opens the delivery form (message ≤ 2,500 required, one file ≤ S-086 MB with progress); **Cancel order** before the start; **Request release of funds** only when 06 AC-45 allows.
- Waiting for details: info Banner "`t_buyer_didnt_send_requirements_yet_continue`" and Start disabled.
- Delivered: info Banner "Waiting for the buyer. Completes automatically on …".
- Revision requested: the revision message is highlighted at the top of Deliveries, and the Deliver form is open.

## Mobile web (360) and native
```
┌──────────────────────────────────┐
│ ‹  Order #A1B2C3-1   [Delivered] │
├──────────────────────────────────┤
│ [th] Gig title                   │
│ ◉ freelancer · Paid ₾270.00      │
│ Expected 3 Oct · ↻ 2 of 3 left   │
│ ⏱ Completes automatically on     │
│   6 Oct, 14:00 …                 │
│ Tabs: Deliveries | Details |     │  scrollable Tabs (dashboards keep tabs)
│       Messages | Timeline        │
│ … tab content …                  │
├──────────────────────────────────┤
│ [Request revision] [Complete (lg)]│  StickyActionBar: 1 primary + 1 secondary;
└──────────────────────────────────┘  the rest (refund, cancel) in the ⋯ header menu
```
Files open in the system viewer. The native deliver form uses Camera / Photo library / Files.

## Components
DashboardShell, Breadcrumb/back Link, Card, StatusBadge, Price, Countdown, Banner, Button group, Menu (⋯), Timeline (ordered list with StatusBadge dots; a layout of existing primitives, not a new component), DescriptionList, file chips (FileUpload `button` variant for the freelancer), RichTextEditor (order details), Textarea, ChatBubble + Composer (thread), ConfirmDialog (start, cancel, complete), Dialog (revision request, delivery form; BottomSheet on phones), Tabs (phones), StickyActionBar, Skeleton, Toast.

## States and actions
| Item state | Buyer sees | Freelancer sees | AC |
|---|---|---|---|
| Awaiting payment | Banner "Awaiting payment"; **Pay**, **Delete** (refused if items are no longer orderable → only Delete) | not visible to the freelancer | 06 AC-9, AC-11, AC-12 |
| Paid, waiting for details | Prominent "Send order details" box (RichTextEditor, 1–5,000); **Cancel order** | Banner "waiting for details"; Start disabled; **Cancel order** | 06 AC-13, AC-16, AC-18, AC-19 |
| Details sent, not started | Details editable; **Cancel order** | **Start** (confirm), **Cancel order** | 06 AC-14, AC-17 |
| In progress | Expected date (+ "Late" chip when passed); **Request refund** disabled until the date passes (`t_u_can_request_refund_when_expected_date_finish`) | **Deliver** | 06 AC-17, AC-20; 13 AC-1 |
| Delivered | Auto-complete notice + Countdown; **Complete order**, **Request a revision** (if revisions left), **Request refund** | "Waiting for the buyer" + date; **Request release of funds** only if 06 AC-45 allows | 06 AC-22, AC-25, AC-30, AC-33, AC-45 |
| No revisions left | "Request a revision" hidden; text "No revisions left" | — | 06 AC-27 |
| Revision requested | Revision message shown; Complete hidden until the next delivery | Revision highlighted; **Deliver** | 06 AC-26, AC-28, AC-32 |
| Refund/dispute open | Banner linking to the refund; Complete refused during a dispute (`t_cannot_complete_during_dispute`); auto-complete notice hidden | Banner linking to the refund | 06 AC-31, AC-34 |
| Completed | StatusBadge Completed; **Leave a review** until written; thread read-only | same; **Leave a review** | 06 AC-30, AC-41; 07 AC-1 |
| Canceled / refunded | Read-only page, StatusBadge danger; thread read-only | same | 06 AC-18, AC-41 |
| Race (status changed meanwhile) | Toast `t_order_status_changed` and the page reloads the state | same | 06 AC-21 |
| Not buyer, freelancer or permitted staff | 404 page | 404 page | 06 AC-44 |
| Loading | Skeleton of header, action bar and blocks | same | 06 screens |

## Accessibility
- The status is text in the header and the timeline. The timeline is an ordered list and the current step has `aria-current="step"`.
- The countdown is plain text with the absolute date ("completes automatically on 6 October, 14:00"). It is not a live ticker for screen readers (06 screens note).
- Destructive actions (cancel, delete) use ConfirmDialog with the least destructive button focused.
- The thread is `role="log"` with polite announcements.
