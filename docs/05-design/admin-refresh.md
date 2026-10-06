# Admin refresh — shell, sidebar and controls (Phase 4X)
Status: **brief, written 2026-10-07 (ROADMAP 4X.1)** from the Owner's request of the same day. The Owner approves the result at the 4X.11 click-through.
Builds on: `visual-refresh.md` (3X look: gradients, buttons, switches, motion, all unchanged), `components.md` §6.8 (DashboardShell + SidebarNav), spec 16 "Screens" (Settings = "area navigation, rows table").

## 1. The Owner's request (2026-10-07)
- **AR-1 Sidebar.** The row of text links at the top of every admin screen becomes a fixed, clean **left sidebar**. Every top-level section lives in it.
- **AR-2 Content on the right.** Choosing a sidebar item shows that section's settings, controls and fields in the content area on the right.
- **AR-3 Modern controls.** Forms, switches, inputs and action buttons follow the 3X design system.
- Done **before Phase 4 resumes at 4.3.1**, on its own branch `feat/admin-refresh` (cut from `feat/gigs` = `main` + the 3X.23 STATUS commit).

This is a **return to the legacy shape**, not a new idea: the legacy admin has a left sidebar with Phosphor icons and expandable groups (`legacy/APP/app/Livewire/Admin/Includes/Sidebar.php:33-625`, `legacy/APP/resources/views/livewire/admin/includes/sidebar.blade.php`). The new admin lost it in Phase 3 because only a few screens existed.

## 2. Must not change
- What each screen does: the same API calls, the same per-row "Save", the same re-login step (AC-7), the same permission rules (links hidden without the permission, AC-9 cosmetic; the API decides).
- Existing texts and keys, `data-testid`s, form labels and roles that the E2E tests use (`getByRole('switch', { name: /^S-056 / })`, `getByLabel(...)`, `getByRole('link', { name: 'დაბლოკილი IP მისამართები' })`).
- Routes: `/settings`, `/security`, `/restrictions`, `/portfolio`, `/kyc`, `/categories`, `/project-categories`, `/skills`, `/account`, `/login`. A settings area is chosen with `?area=<area>` on `/settings`, so `/settings` (the login landing page) still works and opens the first area.
- The admin stays light only (`data-theme="light"`); the login page keeps its centred card (audit §3.8).

## 3. Shell (AR-1, AR-2)
Built on the shared dashboard frame (`packages/ui/src/web/dashboard.css` `.mt-dashboard*`, `.mt-sidebar-link`), so the admin and the user dashboard share one sidebar look.

| | ≥ 1024 px (`lg`) | < 1024 px |
|---|---|---|
| Sidebar | fixed on the start edge, `size.layout.sidebar-width` wide, full height, scrolls on its own | drawer from the start edge, opened by the ☰ button, closed by Close, the scrim, Escape or choosing an item |
| Top bar | none | sticky translucent bar: ☰ + logo + page title |
| Content | to the right of the sidebar, max width `size.layout.container-max`, desktop gutter | full width, mobile gutter, no sideways scroll at 360 px |

**Sidebar, top to bottom:**
1. Logo (`/brand/mytask-logo-wordmark-trimmed.png`) and the label "Admin" (`t_dashboard` → "მართვის პანელი").
2. `nav` named `t_admin_navigation`, groups in **legacy order** (only the screens built so far; later slices add theirs in the same order):

| Group (icon, key) | Items (key → route) | Permission |
|---|---|---|
| Users (`users`, `t_users`) | Verifications `t_verifications` → `/kyc`; User restrictions `t_user_restrictions` → `/restrictions` | `kyc.review`; `users.read` |
| Portfolios (`paint-brush`, `t_portfolios`) | single item → `/portfolio` | `portfolio.moderate` |
| Projects (`briefcase-metal`, `t_projects`) | Project categories `t_project_categories` → `/project-categories`; Skills `t_skills` → `/skills` | `catalog.write` |
| Categories (`list-dashes`, `t_categories`) | single item → `/categories` | `catalog.write` |
| Settings (`gear`, `t_settings`) | one item per settings area (§4) → `/settings?area=…`; Banned IPs `t_banned_ips` → `/security` | `settings.read`; `security.ip_bans` |

   - A group with one item is a plain link (no expand step).
   - Groups expand and collapse like the legacy sidebar (button with `aria-expanded`, chevron turns). The group of the current page is open on load; others start closed.
   - Current item: `aria-current="page"` + the 3X sidebar look (brand tint fading out, 3 px start bar in **brand** colour, since the admin has no buyer/seller role).
   - A group with no permitted item is not shown.
3. Account block pinned to the bottom: staff full name, "Change password" (`t_change_password` → `/account`) and "Logout" (`t_logout`, Ghost button).

Icons: Phosphor regular, inline SVG (as `RoleIcon` in `dashboard.tsx`), 20 px, `aria-hidden`, text always visible.

**Content area:** every screen starts with a page header: a small group line (e.g. "Settings") above the `h1` (unchanged texts), then its sections as cards (`admin-section`, 3X surface). Success and error notices stay at the top of the content.

## 4. Settings by area (AR-2)
- Today `/settings` shows every area on one long page (13 areas in the API registry today: auth, notifications, system, plans, payments, escrow, withdrawals, marketplace, subscriptions, moderation, media, chat, content).
- New: each area the API returns is its own sidebar item under Settings, in the contract `SettingArea` order. Choosing it shows only that area's rows on the right.
- The area list comes from the same `GET /admin/settings` list the screen already uses. It is loaded once per page load and kept in memory, so changing area does not reload it.
- Missing area titles get new keys `t_settings_area_<area>` for all 15 contract areas (12 new; English first, Georgian alongside, Q-058). The three that exist stay (`auth`, `notifications`, `system`).

## 5. Controls (AR-3)
All from `packages/ui` + tokens; no new colour or motion values.
- **Setting row:** a two-column row. The start column has the meaning (semibold), then a muted line with the register ID as a mono tag, the unit and the re-login badge. The end column has the control. Switches sit at the end edge. Number and text fields carry the unit inside the field as a suffix. "Save" is Secondary at rest and takes the Primary look once the value differs from the saved one; it stays clickable as today. Rows are separated by hairlines; the row is tinted on hover (pointer only).
- **Social provider card** (S-065…S-069): a card with a header row (name + switch at the end). Labels sit above the fields, the "secret set / not set" state is a pill, and "Save" is at the end of the card.
- **Status tabs** of the queues (portfolio, KYC, restrictions): a segmented control on the track gradient with a sliding thumb (as the role switcher, M-9), still `aria-pressed` buttons.
- **Queue items:** a card each. The header has who and when, then the body, then an action bar: Approve = Primary, Reject = Danger, other actions Secondary, reason field above the bar.
- **Catalogue tree and lists:** rows with hover tint, depth shown by an indent guide line, row actions as compact Ghost buttons (Delete in danger text). Forms open in a card with labels above fields, a two-column `ka` / `en` pair on wide screens.
- **Inline add forms** (banned IP, skills): field + Primary button on one line, wrapping on phones.
- **Empty lists:** the shared `EmptyState`.

## 6. Accessibility and checks
- Landmarks: one `nav` (`t_admin_navigation`) and one `main` per screen. The skip order is sidebar → content.
- Keyboard: every group button and link is reachable; Escape closes the drawer; focus stays visible.
- Contrast: axe `color-contrast` 0 and the measured pass (3X.18c) on the new shell at 1280 and 360 px.
- Reduced motion: the drawer, group chevrons and the tab thumb jump instead of sliding.
- E2E: the existing admin suites stay green with at most selector updates for the moved links; new shell tests (sidebar items per permission, current item, group expand, drawer at 360 px, no sideways scroll, settings area switching).

## 7. Open points
None blocking. Choices made here that the Owner can change at 4X.11: Banned IPs sits under Settings (the legacy "Security settings" place); one-item groups are plain links; the Dashboard item appears only when the dashboard is built (slice 16, `/` keeps sending staff to Settings).
