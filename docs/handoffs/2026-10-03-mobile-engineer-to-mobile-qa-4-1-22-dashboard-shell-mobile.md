# 4.1.22 Mobile: dashboard shell + switcher, home screens

From: mobile-engineer · To: mobile-engineer (4.1.23/4.1.24), qa-engineer (4.1.25/4.1.26) · Date: 2026-10-03 · Branch `feat/profiles`

## What I did
Built spec 02 AC-1…AC-7 in the app, following design `07-dashboard-switcher.md` "Native app", components §6.7 and §6.9, and the web 4.1.16.

- **Tab bar** `src/app/(tabs)/_layout.tsx` (§6.9):
  - two tabs for now: **პანელი** Dashboard and **ანგარიში** Account. Home, Explore and Messages join with slices 02, 03 and 08;
  - Phosphor icons, Regular when inactive and Fill when active; labels always visible; tokens only;
  - the layout is the session gate: it loads `getMe` once and shares it through `lib/me.tsx`. Signed out → login, restricted → `/restricted`.
- **`/` now redirects to the Dashboard tab**. Login and register land there, so the user sees the side chosen last (AC-3). The old home screen (account summary + Security + Logout) is now the Account tab.
- **Dashboard tab** `src/app/(tabs)/dashboard.tsx`:
  - Buying / Selling switcher on top (`RoleSwitcher`, full width, label + icon, role colours, selected state);
  - role badge (`t_seller_dashboard` / `t_buyer_dashboard`);
  - the side's first section, then its nav list.
- **Selling Home** reads only `getSellingDashboard` and reloads every time the tab is shown:
  - welcome line, `t_verified_account`, member since (`d.m.Y`, Asia/Tbilisi);
  - "Switch to buying" button;
  - 10 KPI tiles in 2 columns with wrapping labels. Money is formatted like the web (`₾1,234.50`, negatives `−₾12.50` in `text.danger`). The HOLD tile has a touch info toggle with `t_pending_balance_hint`;
  - new messages, latest orders (stacked rows) and latest awarded projects (only when not `null`, S-075);
  - empty states `t_no_messages_yet` / `t_no_orders_yet` / `t_no_projects_yet`;
  - skeleton while loading; error → notice + "Try again".
- **Buying landing**: `t_ordered_projects` + `t_no_projects_yet`. While projects are OFF it shows `t_buy_services` + `t_no_orders_yet` instead (same as the web landing on `/account/orders`).
- **Switching** (AC-2/AC-3) works from the Dashboard tab, the "Switch to buying" button and the Account tab's switcher (which then opens the Dashboard tab):
  - it shows the new side at once and saves `updateMyPreferences { lastDashboard }`;
  - the first side comes from `Me.lastDashboard`, shared with the web (`lib/dashboard.ts` store);
  - no new login.
- **Nav lists** in `lib/dashboard.ts` match the web lists and settings: S-075 projects, S-034 offers, unblock requests (P-5). An item shows only once its app screen exists (`screen`), so in slice 1 no nav rows show yet; Portfolio appears with 4.1.24.

## Files created/changed
- New:
  - `apps/mobile/src/app/(tabs)/_layout.tsx`, `dashboard.tsx`, `account.tsx`
  - `apps/mobile/src/components/dashboard.tsx` (Icon, RoleSwitcher, RoleBadge, StatTile, StatGrid, Section, EmptyState, Skeleton, SecondaryButton, Row, NavList)
  - `apps/mobile/src/lib/dashboard.ts` (nav lists + current-side store), `lib/format.ts` (`formatDate`, `formatMoney`, `formatCount` = the web rules), `lib/me.tsx` (Me context, `useSwitchDashboard`)
- Changed:
  - `apps/mobile/src/app/index.tsx` (now redirects to `/dashboard`)
  - `docs/SETUP-LOCAL.md` §4: step 9 now starts from the Account tab; new step 10 (dashboards)
  - `packages/i18n/en.json`, `ka.json`: 2 NEW keys, `t_ui_tab_dashboard` (Dashboard / პანელი) and `t_ui_tab_account` (Account / ანგარიში). The existing `t_dashboard` is "მართვის პანელი", too long for a tab label.

## Checks
- Repo typecheck + lint: 19/19.
- Prettier and i18n check: OK.
- `expo export` iOS + Android: OK.
- `formatMoney` / `formatDate` checked in Node: `₾1,234.50`, `−₾12.50`, `2023-05-09T22:30Z` → `10.05.2023`.
- There is still no mobile E2E harness. Expo Go steps are in SETUP-LOCAL §4 step 10.

## What the next agent must do
- **4.1.23 / 4.1.24 (mobile):**
  - give each new screen its `screen` route in `lib/dashboard.ts` (e.g. Portfolio → `/seller/portfolio`) so it appears in the nav list;
  - add the AC-35 account links (Settings, Edit profile, Verification centre…) to the Account tab.
- **QA (4.1.25/4.1.26):** on a phone, check AC-2/AC-3 against the web: switch in the app → the web opens the same side, and the other way round.

## Open questions / risks
- No Owner question, no contract or data-model change.
- **"Create a new gig" (AC-7)** is not shown in the app yet. It would open a dead end until the app has the gig wizard (spec 04, slice 3); a `createGig` placeholder in `dashboard.tsx` marks the spot. The web shows the button (its `/create` page answers 404 until slice 3).
- Nav rows for the later slices' screens are hidden, not shown disabled. If the Owner prefers to see the full list now, I can show them with a "coming later" note (needs one new key).
- Message, order and project rows can't be tapped until chat, orders and projects exist in the app.
- The tab-bar icon paths were drawn from the Phosphor set on the 256 grid and have not been seen on a device yet. Look at them in Expo Go (step 10).
