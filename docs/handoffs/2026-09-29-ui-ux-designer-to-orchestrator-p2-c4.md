# Handoff: ui-ux-designer → orchestrator — P2-C4 key screen layouts
Date: 2026-09-29

## What I did
- Wrote layouts for the 8 key screens of the Phase 2 plan in `docs/05-design/screens/`. Each has: what is kept from the live site, what changes (each change cites an approved AC, an Owner decision or the audit), desktop and mobile-web wireframes, native-app notes, the component list, all states (with AC references) and accessibility.
- Built every screen from existing `components.md` components and `tokens.md` tokens. No new component or token was needed.
- Applied the Owner's answers of 2026-09-29: the "Actions" label is "მოქმედებები" (Q-105) on gig and project pages (also in the preview page); the wordmark keeps the light plate (Q-106); fixed widths are named as Phase 3 size tokens (Q-107).
- Corrected components.md where it disagreed with approved specs or these layouts:
  - §9.3 Composer: Enter = new line; Ctrl/Cmd+Enter or Send sends (spec 08 AC-11).
  - §5.3 QuantityInput: needed at launch for "number of revisions".
  - §12: 7 new built-in UI strings (English + Georgian drafts).

## Files created/changed
- `docs/05-design/screens/00-README.md` (index, rules, points for the Owner)
- `docs/05-design/screens/01-home.md`
- `docs/05-design/screens/02-gig-page.md`
- `docs/05-design/screens/03-gig-create-wizard.md`
- `docs/05-design/screens/04-project-page-and-proposal-form.md`
- `docs/05-design/screens/05-checkout.md`
- `docs/05-design/screens/06-order-detail.md`
- `docs/05-design/screens/07-dashboard-switcher.md`
- `docs/05-design/screens/08-chat.md`
- `docs/05-design/components.md` (§5.3, §9.3, §12)
- `docs/05-design/preview/index.html` (Q-105 label; committed with the approvals)

## What the next agent must do
- **Owner (gate)**: review the layouts with the design (gate item 8). One non-blocking point: the checkout column order. Approved specs 05/06 put the item list left and the payment block (methods + totals + Pay) right. The live site had the method list on the left. Totals and Pay stay on the right as live. Say if you prefer the live order; it is a layout-only swap.
- **product-analyst**: add the 7 new `t_ui_*` strings (components.md §12) to the text tables when `packages/i18n` is created.
- **web-engineer / mobile-engineer (Phase 3–4)**: build the screens from these files. Home: check the order of the optional blocks (best sellers, logo cloud, articles) against the legacy home template in Slice 16.
- **ui-ux-designer (Phase 3 start)**: add the Q-107 size tokens (tooltip 280, menu 320, switcher 400, empty state 480, drawer 320).
- Other screens are designed per feature in Phase 4.

## Open questions / risks
- No new Q-IDs.
- The order-detail and chat layouts are based on the legacy Blade (not seen live, audit §3.9–§3.12). Screenshots (Q-108, optional) would let me check them.
