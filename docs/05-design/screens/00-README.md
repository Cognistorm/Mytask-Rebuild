# Key screen layouts (P2-C4)
Status: **proposed** — the Owner approves them with the design at the Phase 2 gate (gate item 8)
Author: ui-ux-designer (P2-C4) | Date: 2026-09-29

These are the layouts for the eight key screens of the Phase 2 plan. Every other screen is designed per feature in Phase 4, from the same components and the same rules.

| # | Screen | Owning specs | File |
|---|---|---|---|
| 01 | Home | 03 AC-24…26, 17 AC-35…37 | [01-home.md](01-home.md) |
| 02 | Gig page | 04 AC-26…38 | [02-gig-page.md](02-gig-page.md) |
| 03 | Gig create / edit wizard | 04 AC-1…19 | [03-gig-create-wizard.md](03-gig-create-wizard.md) |
| 04 | Project page + proposal form | 10 AC-15…18, AC-22; 11 AC-1…15 | [04-project-page-and-proposal-form.md](04-project-page-and-proposal-form.md) |
| 05 | Checkout (gig order; the same payment block serves project payments and custom offers) | 05 AC-1…8, AC-18…19; 06 AC-1…12 | [05-checkout.md](05-checkout.md) |
| 06 | Order detail (buyer and freelancer views) | 06 AC-11…45; 07 AC-1; 13 AC-1 | [06-order-detail.md](06-order-detail.md) |
| 07 | Dual-dashboard switcher (Buying / Selling) + Selling home | 02 AC-1…7 | [07-dashboard-switcher.md](07-dashboard-switcher.md) |
| 08 | Chat (Inbox list + conversation) | 08 AC-1…28 | [08-chat.md](08-chat.md) |

## Rules every layout follows
1. **Same places, cleaner surfaces** (audit §4.1). Each file starts with a "Kept from the live site" list. Nothing on that list moves. Where an approved spec moves something, the file says so under "Changes" and cites the AC.
2. **Components only from `components.md`**, tokens only from `tokens.md`. No new component was needed for these eight screens. Two component notes were corrected in this task (§ "Changes to components.md").
3. **Breakpoints** (tokens §6.5): phone < 768 (one column, 16 px gutters), tablet 768–1023 (dashboard sidebar visible; public pages still one column), desktop ≥ 1024 (two columns, 24/32 px gutters), container 1280 (home rows 1400).
4. **Three targets per screen:** desktop web, mobile web (360 px is the design width, checked at 390 and 430), native app (Expo; TabBar of components §6.9). Mobile web keeps the live slide-over menu; the native app has the tab bar.
5. **Money on screen** is the `Price` component from API values in tetri. Screens never add up prices themselves (spec 05 AC-5).
6. **Texts** are translation keys. Keys named here come from the owning spec's text table or from the legacy files. Labels in the wireframes are written in English for reading only.
7. **States** use the shared vocabulary: loading = Skeleton of the final layout, empty = EmptyState, error = Banner with Retry (or EmptyState `error` for a whole page), success = Toast. Every screen lists its own states.
8. **Accessibility baseline** (components §0.4): zoom allowed, visible focus, 44 px targets, labels on every field, `aria-current` in navigation, dialogs with a focus trap, live regions where content changes by itself.

## How to read the wireframes
- Boxes are regions, not pixels. `[Button]` is a button, `( )` a radio, `[x]` a checkbox, `▾` a menu or select, `‹ ›` carousel controls, `…` more of the same.
- Widths are written as columns of the 12-column grid or in px tokens.

## Changes to components.md made in this task
- §9.3 Composer: Enter inserts a new line; Ctrl/Cmd+Enter or Send sends (the approved spec 08 AC-11; the component note said the opposite).
- §5.3 QuantityInput: needed at launch for the "number of revisions" field (spec 04 AC-9, spec 11 proposal form stepper), not only for a future quantity.
- §12 New UI strings: 7 built-in texts added for these screens (`t_ui_sending`, `t_ui_message_not_sent`, `t_ui_send_shortcut_hint`, `t_ui_staff_read_only_view`, `t_ui_client_name_hidden`, `t_ui_form_progress`, `t_ui_purchase`), English first with Georgian drafts.

## Points for the Owner at the gate (non-blocking)
- Checkout column order: the live checkout has payment methods on the left and the order summary + Confirm on the right. Approved specs 05/06 put the item list on the left and the whole payment block (methods + totals + Pay) on the right. The totals and the pay button stay on the right, as live; only the method list moves across. The layout follows the approved specs. Swapping back is a one-line change if the Owner prefers the live arrangement (see [05-checkout.md](05-checkout.md)).
