# 07 — Dual-dashboard switcher (Buying / Selling) and Selling home
Status: proposed | Author: ui-ux-designer (P2-C4) | Date: 2026-09-29
Specs: 02 AC-1…7 (both dashboards for everyone, switcher, last choice remembered, navigation lists, Selling home content, empty state); 00 AC-1…4 (dual role); 05 AC-27…28 (balances); vision priority 4. Components §6.7 RoleSwitcher, §6.8 DashboardShell, §7.5 StatTile/MoneyTile. Audit §3.9, §3.10. Preview: "Dashboard, old vs new".

## Kept from the live site (legacy Blade)
- Fixed 240 px left sidebar with the logo, the role badge ("დამკვეთის პროფილი" / "ფრილანსერის პროფილი") and the navigation.
- Top bar: hamburger (mobile), the **Freelancer / Buyer segmented switcher in the centre**, account menu on the right ("Logged in as", view profile, settings, password, logout).
- Buyer = blue, freelancer = green (Q-092, now with AA contrast).
- Selling home: welcome line + verified + member since, "Switch to buying", "Create a new gig", KPI tiles, new messages, latest orders, latest awarded projects.

## Changes
- Every user has both dashboards. There is no "Become a seller" (02 AC-1, Q-013).
- Switcher labels are **"ყიდვა" (Buying)** and **"გაყიდვა" (Selling)**, always visible, with icons. On phones it is full width (legacy was a fixed 400 px, icon-only, with no accessible name).
- The last chosen dashboard is stored on the account and shared by web and mobile. The default is Buying (02 AC-3).
- The account menu also has a "Switch to Selling/Buying" link (02 AC-2).
- The nav has one source for mobile and desktop (the legacy copies differed). The active item has `aria-current` plus an indicator bar.
- Selling home adds the Available and HOLD balance tiles (02 AC-6, 00 §3).
- Offers appear in the nav only if S-034 is ON; Unblock requests only when available (02 AC-4, AC-5).

## Desktop (≥ 1024) — Selling home
```
┌────────────┬─────────────────────────────────────────────────────────────────┐
│ [Logo]     │ ☰(md-)     ┌─────────────┬──────────────┐        🔔 ✉ ◉ Name ▾ │  top bar 64
│            │            │ 🛍 ყიდვა     │ 🏪 გაყიდვა ✓ │                     │  RoleSwitcher centred,
│ [ფრილანსე- │            └─────────────┴──────────────┘                     │  Selling = green tokens
│ რის პროფილი]├─────────────────────────────────────────────────────────────────┤
│ ▌Home      │ Welcome back, Nino ✓ · Member since 2023                         │
│  Orders  3 │ [ Switch to buying ]            [ + Create a new gig (primary) ] │
│  Gigs      │ ┌MoneyTile──────┐┌MoneyTile──────┐┌StatTile──┐┌StatTile──┐       │  grid 4 at xl,
│  Projects  │ │Available      ││HOLD / Pending ││Earnings  ││Total     │       │  3 at md, 2 phones
│  Offers*   │ │₾1,240.00      ││₾270.00 (i)    ││₾8,450.00 ││reach 1.2k│       │
│  Reviews   │ │[Withdraw]     ││               ││          ││          │       │
│  Refunds   │ └───────────────┘└───────────────┘└──────────┘└──────────┘       │
│  Unblock*  │ ┌Total gigs┐┌Awarded proj.┐┌Completed┐┌Pending┐┌In progress┐┌Canc.┐│
│  Portfolio │ └──────────┘└─────────────┘└─────────┘└───────┘└───────────┘└─────┘│
│  Earnings  │ ┌ New messages (≤ 6) ─────┐ ┌ Latest orders (7) ──────────────────┐│
│  Withdrawals│ │ ◉ name · preview   2   │ │ ResponsiveTable: gig, buyer, amount,││
│            │ │ …                       │ │ status, date                        ││
│            │ └─────────────────────────┘ └─────────────────────────────────────┘│
│            │ ┌ Latest awarded projects (7, only if S-075 ON) ───────────────────┐│
│            │ └──────────────────────────────────────────────────────────────────┘│
└────────────┴─────────────────────────────────────────────────────────────────┘
```
`*` Offers only if S-034 is ON. Unblock requests only when 06 AC-45 / S-029 make them available (P-5).

Buying dashboard: the same shell with the blue role tokens and the badge "დამკვეთის პროფილი". Nav: Projects (landing page, legacy), Orders ("შეძენილი სერვისები"), Offers*, My reviews, Refunds, Favourites.

## Switching behaviour
- Each segment is a link to that dashboard's home. When the current page has an equivalent on the other side (Orders ↔ Orders, Reviews ↔ Reviews, Refunds ↔ Refunds, Offers ↔ Offers), the switch keeps the user on it (components §6.7). Otherwise it opens that side's home: Selling → Home, Buying → Projects.
- The choice is saved on the account at once (02 AC-3). There is no new login (02 AC-2).
- Transition: the sidebar content cross-fades (`motion.duration.base`; none with reduced motion). The role badge and accent colour change with it.

## Mobile web (360)
```
┌──────────────────────────────────┐
│ ☰  [Logo]            🔔  ✉  ◉    │  top bar; ☰ opens the sidebar NavDrawer
├──────────────────────────────────┤
│ ┌───────────────┬──────────────┐ │
│ │ 🛍 ყიდვა       │ 🏪 გაყიდვა ✓ │ │  RoleSwitcher full width, labels visible
│ └───────────────┴──────────────┘ │
│ Welcome back, Nino ✓             │
│ [ + Create a new gig        ]    │
│ [ Switch to buying          ]    │
│ ┌Available────┐┌HOLD─────────┐   │  2 columns; labels wrap to 2 lines
│ │₾1,240.00    ││₾270.00 (i)  │   │
│ └─────────────┘└─────────────┘   │
│ … other tiles, 2 columns …       │
│ Latest orders → card list        │  ResponsiveTable becomes cards
└──────────────────────────────────┘
```

## Native app
- Tab 4 "პანელი" (Dashboard) opens the last used side. The RoleSwitcher is at the top of the screen, full width.
- Below it, the side's nav is a grouped list (Orders, Gigs, …). Selling Home content (tiles, lists) is the first section.
- The Account tab also shows the switcher (02 screens table: "Account tab with a segmented Buying / Selling control").

## Components
DashboardShell, SidebarNav, RoleSwitcher (SegmentedControl), Badge `role`, AccountMenu (Menu), NavDrawer (phones), MoneyTile, StatTile, InfoButton (HOLD hint `t_pending_balance_hint`), ConversationItem (new messages), ResponsiveTable, Button, EmptyState, Skeleton (`StatTileSkeleton`, `TableRowSkeleton`).

## States
| State | What shows | AC |
|---|---|---|
| Loading | Shell renders at once; tiles and lists show Skeletons | 02 screens |
| New user, no activity | Every tile shows 0; lists show EmptyState with "Create a new gig" | 02 AC-7 |
| Block error | That block shows a Banner with Retry; the other blocks stay | 02 screens |
| First visit ever | Buying dashboard | 02 AC-3 |
| Returning user | Last chosen side, on web and mobile | 02 AC-3 |
| Projects OFF (S-075) | Projects nav items and the awarded-projects list hidden | 02 AC-6, 10 AC-1 |
| Negative migrated balance | Available tile shows `−₾12.50` (the minus sign carries the meaning; `text.danger` colour is extra); "Withdraw" disabled | 00 EC-7 |
| Dark mode | Role tokens have dark variants | tokens §4 role |

## Accessibility
- The switcher is a nav with two links. The current one has `aria-current="page"`. Each segment's name is its text label, so the colour is never the only cue.
- Tiles are groups named by their label. HOLD's explanation is reachable by keyboard and touch (InfoButton, not a hover tooltip).
- Sidebar nav: `nav aria-label` ("Selling navigation"). Count badges are read as part of the link name ("Orders, 3 new").

## Georgian length
Tile labels such as "შეკვეთები მიმდინარეობს" wrap to 2 lines and tiles in a row keep equal height. Nav labels wrap rather than truncate. The switcher segments grow to fit their labels (max 400 on desktop, Q-107 size token in Phase 3).
