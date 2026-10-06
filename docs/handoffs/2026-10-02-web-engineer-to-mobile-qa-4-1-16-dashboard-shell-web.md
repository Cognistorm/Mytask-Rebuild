# 4.1.16 Web: dashboard shell + switcher, Selling Home, Buying dashboard

From: web-engineer · To: mobile-engineer (4.1.22), qa-engineer (4.1.25/4.1.26), web-engineer (4.1.17+) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Spec 02 AC-1…AC-7 on the web, after design `docs/05-design/screens/07-dashboard-switcher.md` and components §6.7, §6.8,
§7.5, §7.9, §7.10, §7.15, §8.5, §8.6.

- **Shared pieces in `@mytask/ui/web`** (`packages/ui/src/web/dashboard.tsx` + `dashboard.css`, tokens only):
  `DashboardLayout` (240 px sidebar, 64 px top bar, drawer below `lg` with Esc/scrim close), `RoleSwitcher` (nav of
  two links, labels + icons always visible, `aria-current`, role colours, full width below `md`), `SidebarNav` (role
  badge, `aria-current` + indicator bar), `AccountMenu` (disclosure, Esc/outside click), `StatTile`/`StatGrid`
  (2 / 3 / 4 columns, wrapping labels), `InfoButton` (popover, touch + keyboard), `Price`/`formatMoney` (`₾1,234.50`,
  negatives `−₾12.50` in `text.danger`), `ResponsiveTable` (table → stacked rows below `md`), `EmptyState`,
  `Skeleton`, `Panel`, plus `.mt-button` / `.mt-button-primary` for link buttons. Components take a `Link` prop so
  the web passes Next.js `Link`.
- **Shell** `apps/web/src/components/dashboard/shell.tsx`: loads `getMe` (guest → login with `?next=`, restricted →
  `/restricted`) and the public config; sidebar from `components/dashboard/nav.ts` (one list for desktop and drawer);
  account menu = "Logged in as", View profile, Switch to Selling/Buying, Account settings, Update password, Logout
  (legacy `dashboard-app.blade.php`). Switcher, account-menu switch and the "Switch to buying" button call
  `updateMyPreferences { lastDashboard }` (AC-3), no new login (AC-2). The switch keeps the user on the twin page when
  one exists (Orders, Offers, Reviews, Refunds), else the other side's home.
- **Navigation** (legacy sidebars + AC-4/AC-5): Selling — Home, Orders, Gigs, Awarded projects (S-075), Personal offers
  (S-034), Reviews, Refunds, Unblock money requests (`escrow.unblockRequestAvailable`, P-5), Portfolio, Earnings,
  Withdrawals. Buying — Ordered projects (S-075), Purchased services, Personal offers (S-034), My reviews, Refunds,
  Favourites. Items behind a setting stay hidden while the config loads.
- **Selling Home** `/seller/home`: reads only `getSellingDashboard`. Welcome line `t_welcome_back, {fullName}!`,
  `t_verified_account` badge, member since; "Switch to buying" + "Create a new gig" (`/create`); 10 KPI tiles (HOLD tile
  with `t_pending_balance_hint` in an InfoButton); new messages (≤ 6, links `/inbox/{id}`), latest orders (links
  `/seller/orders/{displayId}`), latest awarded projects only when not `null` (S-075). Empty states (AC-7):
  `t_no_orders_yet` / `t_no_projects_yet` with "Create a new gig"; messages keep the legacy `t_no_messages_yet` text.
  Loading skeleton; error → alert + "Try again".
- **Buying dashboard** `/account/projects`: shell with the Buying navigation, heading `t_ordered_projects` and the
  `t_no_projects_yet` empty state. The list comes with spec 10.
- **"My dashboard"** link on the `/account` placeholder opens the side chosen last (AC-3).
- Page titles: `t_seller_dashboard` / `t_buyer_dashboard`.
- Dates use the legacy numeric `d.m.Y` (`10.05.2023`, `lib/format.ts`): Chromium has no Georgian month names, so
  `ka-GE` long dates came out in English.

## Files created/changed
- `packages/ui/src/web/dashboard.tsx`, `dashboard.css` (new); `packages/ui/src/web/index.ts` (exports)
- `apps/web/src/components/dashboard/shell.tsx`, `nav.ts`, `dashboard.css` (new)
- `apps/web/src/app/[locale]/(private)/seller/home/page.tsx`, `layout.tsx` (new)
- `apps/web/src/app/[locale]/(private)/account/projects/page.tsx`, `layout.tsx` (new)
- `apps/web/src/app/[locale]/(private)/account/page.tsx` ("My dashboard" link)
- `apps/web/src/lib/format.ts` (new)
- `apps/web/e2e/dashboard.spec.ts` (new, 10 tests); `apps/web/e2e/social.spec.ts` (fake config now has `projects`,
  as the real API always sends it)
- `packages/i18n/en.json`, `ka.json`: 8 NEW keys (en + ka) — `t_account_menu`, `t_buying_navigation`,
  `t_selling_navigation`, `t_dashboard_switcher`, `t_no_orders_yet`, `t_revision_requested`, `t_ui_more_info`,
  `t_ui_open_menu`

Checks: web E2E 52 passed / 3 skipped (the full-stack ones), repo typecheck + lint 10/10, i18n check, Prettier clean.

## What the next agent must do
- **Mobile 4.1.22:** same data and keys. Use `t_buying` / `t_selling` for the switcher, the nav lists and settings
  conditions in `apps/web/src/components/dashboard/nav.ts`, `updateMyPreferences` on switch, `lastDashboard` to pick
  the side to open. Money: same `formatMoney` rule (copy it into `@mytask/ui/native` when that entry exists).
- **Web 4.1.17+:** every new `/seller/*` or `/account/*` dashboard page wraps its content in
  `<DashboardShell side=… active=…>` (key from `nav.ts`). 4.1.20 should point the account-menu "Account settings"
  link at `/account/settings` (it goes to the `/account` placeholder for now).
- **QA:** `e2e/dashboard.spec.ts` covers AC-2…AC-7 on routed data; full-stack check with `pnpm preview` after login.

## Open questions / risks
- No Owner question, no contract or data-model change.
- Nav links to pages of later slices (`/seller/orders`, `/seller/gigs`, `/account/orders`, …, `/profile/{username}`,
  `/create`) answer 404 until those slices build them. With projects OFF (S-075) the Buying side lands on
  `/account/orders` (slice 5).
- Not done here: the screen-reader currency word of `Price` (§7.9, needs a key per language), nav icons and count
  badges (no data yet), the sidebar cross-fade.
- After login the user still lands on `/account` (slice 01 behaviour). The last dashboard opens from "My dashboard" and
  the account menu. Sending users straight to their last dashboard after login would change slice 01 flows, so it is
  left for the Owner click-through (4.1.30).
