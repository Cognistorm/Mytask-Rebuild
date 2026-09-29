# 04 — Project page (`/project/{pid}/{slug}`) + proposal form
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 10 AC-15…18 (visibility, English fallback, page content, closed for bidding), AC-22 (report); 11 AC-1…8 (proposal form, Premium gate, validation), AC-10…11 (who sees proposals, sort), AC-12…19 (edit/withdraw, report, award); 02 AC-41 (username masking); 08 AC-2 ("Chat now" for everyone). Audit §3.5. Preview: "Project page, old vs new".

## Kept from the live site
- Card-style breadcrumb with "Actions" (Share / Report) on the right.
- Left: "Project details" with the "Send a proposal" button, description, client block (masked name), yellow "Beware of scams" alert, then the proposals section with a sort menu.
- Right: "Project summary" (budget, number of proposals, average proposal, status, posted date).
- Proposal form opens as a modal over the page: amount, "Paid to you" (read-only), delivery days, description; "Go back" / "Continue".

## Changes
- The proposal modal's step 2 (paid upgrades) is removed (X-04). The form has one step and gains **Number of revisions** (11 AC-1, AC-4).
- The Premium check is also done on the server (11 AC-2). Standard users see the Premium-required box instead of the form.
- "Chat now" next to the client is open to every logged-in user (08 AC-2, Q-069b).
- The average proposal counts active proposals only (10 AC-17).
- Skills chips under the description (10 AC-17, P-73).
- The budget is written one way: `₾700.00 – ₾1,000.00` + "Fixed price".
- "Actions" reads "მოქმედებები" (Q-105).
- Mobile: stacked sections and a sticky "Bid on this project" bar; the form opens full screen.

## Desktop (≥ 1024)
```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header (solid) + category bar                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌ Card ────────────────────────────────────────────────────────────────────┐ │
│ │ მთავარი › Projects › AI videographer            მოქმედებები  [↗]  [⚑]    │ │  Breadcrumb + IconButtons
│ └──────────────────────────────────────────────────────────────────────────┘ │
│ Banner (owner only): pending approval / rejected + reason / hidden by staff  │
│ Banner (info): content shown in Georgian (English URL without English text)  │
├──────────────────────────────────────────────┬───────────────────────────────┤
│ ┌ Project details (Card) ─────────────────┐  │ ┌ Project summary (Card) ───┐ │
│ │ Title of the project (h1)               │  │ │ Budget    ₾700.00 – ₾1,000.00│ │
│ │ Posted 2 hours ago · [Active]           │  │ │           Fixed price      │ │  DescriptionList
│ │                  [ Bid on this project ]│  │ │ Proposals 12               │ │
│ │ ─────────────────────────────────────── │  │ │ Average   ₾850.00          │ │  or Pill "Premium
│ │ Description (plain text, line breaks)   │  │ │           (or 🔒 Premium)  │ │  only" + link
│ │ [Skill] [Skill] [Skill]                 │  │ │ Status    Active           │ │
│ │ ┌ thumbnail ┐                           │  │ │ Posted    29 Sep 2026      │ │
│ │ └───────────┘                           │  │ │ Project № 482913           │ │
│ └─────────────────────────────────────────┘  │ └────────────────────────────┘ │
│ ┌ Client (Card) ──────────────────────────┐  │                               │
│ │ ◉ My**sk                        [Chat now]│ │                               │
│ └─────────────────────────────────────────┘  │                               │
│ ┌ warning Banner: Beware of scams … ──────┐  │                               │
│ └─────────────────────────────────────────┘  │                               │
│ Proposals (12)                  Sort: Newest ▾│                               │
│ ┌ Proposal card ──────────────────────────┐  │                               │
│ │ ◉ username ✓ ★4.8   ₾800.00 · 5 days · ↻2│ │                               │
│ │ message (4 lines, "Show more")          │  │                               │
│ │ Owner: [Award] [Chat]   ⋯ Report        │  │                               │
│ └─────────────────────────────────────────┘  │                               │
│ … or, for non-Premium viewers:               │                               │
│ ┌ 🔒 12 proposals. Premium members can see ┐ │                               │
│ │ them.            [Upgrade to Premium]    │ │                               │
│ └─────────────────────────────────────────┘  │                               │
└──────────────────────────────────────────────┴───────────────────────────────┘
```
Main 8/12, summary 4/12. The summary box is not sticky (it isn't on the live page).

## Proposal form — desktop Dialog `lg` (800)
```
┌ Send a proposal ───────────────────────────────────────────── [✕] ┐
│ Project: AI videographer · Budget ₾700.00 – ₾1,000.00               │
│ ┌──────────────────────────────┐ ┌──────────────────────────────┐   │
│ │ Your amount *  [₾ 800.00   ] │ │ Paid to you  ₾800.00  (i)    │   │  PriceInput + read-only
│ └──────────────────────────────┘ └──────────────────────────────┘   │  companion; (i) = InfoButton
│ Delivery time (days) *  [ 5 ]        Number of revisions * [−][2][+] │  t_bid_paid_to_you_tooltip
│ Message *                                                           │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ Textarea                                                      │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                     0 / 3,500        │
├─────────────────────────────────────────────────────────────────────┤
│                                    [ Cancel ]  [ Send proposal (lg) ]│
└─────────────────────────────────────────────────────────────────────┘
```
With a single step, the legacy footer buttons "Go back / Continue" become "Cancel / Send proposal".

## Mobile web (360)
```
┌──────────────────────────────────┐
│ ☰ [Logo]               🔍  🛒    │
├──────────────────────────────────┤
│ ‹ Projects            [↗] [⚑]    │
│ Title of the project             │
│ Posted 2 h ago · [Active]        │
│ ┌ Summary (DescriptionList) ───┐ │  summary moves above the description
│ │ Budget ₾700.00 – ₾1,000.00   │ │  (stacked order of 10 AC-17)
│ │ Proposals 12 · Avg 🔒 Premium │ │
│ └──────────────────────────────┘ │
│ Description …                    │
│ [Skill] [Skill]                  │
│ Client ◉ My**sk      [Chat now]  │
│ ⚠ Beware of scams …              │
│ Proposals (12)       Sort ▾      │  sort → BottomSheet
│ proposal cards (actions in ⋯)    │
├──────────────────────────────────┤
│ [     Bid on this project (lg)  ]│  StickyActionBar
└──────────────────────────────────┘
```
The proposal form on phones is a BottomSheet `full` with the same fields and a sticky "Send proposal" bar that rises above the keyboard. On native it is a full-screen modal screen.

## Native app
Same stacked order. Stack header: back, Share (system sheet), ⋯ (Report). Sticky bar with "Bid on this project" or the closed-for-bidding text. Deep link `mytask://project/{pid}`.

## Components
Breadcrumb, IconButton, Banner (`warning` scams, owner notices, `info` language), Card, Heading, StatusBadge, DescriptionList, Price (range), Pill `premium` (locked value), Chip `link` (skills), Avatar, Button, Menu (sort; BottomSheet on phones), Proposal card (Card + Avatar + RatingStars + Price + Menu), EmptyState, Dialog `lg` / BottomSheet `full`, Field, PriceInput, Input (days), QuantityInput (revisions), Textarea with counter, InfoButton, StickyActionBar, Toast, ConfirmDialog (withdraw, award).

## States — project page
| State | What shows | AC |
|---|---|---|
| Loading | Skeleton of both columns | 10 screens |
| Active, viewer can bid | "Bid on this project" enabled | 11 AC-1 |
| Viewer without Premium | Button still visible; pressing it shows the Premium-required box (Dialog `sm` / BottomSheet) `t_warning_project_limit` + "Upgrade to Premium" | 11 AC-2 |
| Guest | Bid and Chat go to login and come back; username masked | 02 AC-41 |
| Closed for bidding (closed, hired, completed, refunded, award waiting) | Button replaced by `t_this_project_is_closed_for_bidding` + link `t_find_another_project` | 10 AC-18 |
| Own project | No bid button; proposals show owner actions (Award, Chat); "Edit project" in Actions | 11 AC-7, AC-16 |
| Already proposed | Button replaced by "Your proposal" card with Edit / Withdraw | 11 AC-7, AC-12…14 |
| Pending / rejected / hidden (owner or staff) | Owner Banner with the state (and reason when rejected); others get 404 | 10 AC-11…15 |
| Not found | EmptyState `notFound`, HTTP 404 | 10 AC-15 |
| English fallback | Georgian text + info Banner, HTTP 200 | 10 AC-16 |
| No proposals | EmptyState `t_no_proposals_on_project` | 11 screens |
| Proposals locked | Count + Premium upsell card | 11 AC-10 |
| Awarded | "Awarded" chip on the proposal; bid button replaced (award waiting) | 11 AC-16, 10 AC-18 |

## States — proposal form
| State | What shows | AC |
|---|---|---|
| Open | Amount empty; "Paid to you" updates as the user types | 11 AC-5 |
| Validation | Field errors: `t_pls_insert_bid_value_between_budget`, `t_validator_regex`, `t_validator_proposal_days`, `t_validator_revisions_range` | 11 AC-3, AC-4 |
| Refused by server | Banner in the form with the server message (already proposed, own project, award waiting, not active, `PREMIUM_REQUIRED`) | 11 AC-2, AC-7 |
| Submitting | Send button busy, fields read-only | — |
| Success | Dialog closes; Toast `t_ur_bid_has_been_posted` or `t_ur_bid_has_been_posted_pending_approval`; the page shows "Your proposal" | 11 AC-6 |
| Closing with typed text | ConfirmDialog "Discard changes?" | components §8.1 |

## Accessibility
- One h1 (project title). The summary is a `dl`.
- The masked username has an accessible name that says it is hidden (`t_ui_client_name_hidden`).
- The locked average is text ("Average proposal: available with Premium"), not an icon only.
- The dialog has a focus trap, the first field gets focus, and closing returns focus to the bid button.
