## What I did
ROADMAP 4.1.14 — `getSellingDashboard` (`GET /api/v1/me/dashboard/selling`, spec 02 AC-6, AC-7).

- Every signed-in active user gets it (no seller check, R-P1). Restricted users get 403 `ACCOUNT_RESTRICTED` from the
  global auth guard (the contract audience is `user`, not `restricted-user`).
- `user`: `fullName` = profile full name, else the username (same rule as `getUserProfile`); `isIdVerified` = a
  `verified` KYC verification exists; `createdAt` = account creation (member-since).
- KPIs, `unreadContacts`, `latestOrders`, `latestAwardedProjects`: the contract's neutral values (money `{0, GEL}`,
  counts `0`, lists `[]`), per handoff 4.1.1 §C — nothing invented. `latestAwardedProjects` is `null` while S-075
  (projects) is OFF, `[]` while ON.
- Each neutral value carries a comment naming the slice that fills it: ledger → slice 4 (spec 05); gigs + reach →
  slice 3 (spec 04); orders + latest 7 paid orders → slice 5 (spec 06); awards → slice 10 (spec 11); unread
  contacts → slice 7 (spec 08).

## Files created/changed
- `apps/api/src/modules/profiles/dashboard.service.ts` (new) — `DashboardService.getSelling`
- `apps/api/src/modules/profiles/profiles.controllers.ts` — `DashboardController`
- `apps/api/src/modules/profiles/profiles.module.ts` — registered both
- `apps/api/test/dashboard.test.ts` (new) — 401 without session; new user = welcome data + zeros + empty lists (AC-7);
  verified badge; `latestAwardedProjects: null` with S-075 OFF

## What the next agent must do
- **Web 4.1.16 / mobile 4.1.22:** Selling Home reads only this operation. Render the AC-7 empty states with the
  "Create a new gig" call to action whenever the lists are empty; hide the awarded-projects block when
  `latestAwardedProjects` is `null`. `pendingBalance` tile shows `t_pending_balance_hint`. `availableBalance` may be
  negative (R-3.6) — format the sign.
- **Later slices (3, 4, 5, 7, 10):** replace your part of the neutral values in `DashboardService.getSelling`; your
  spec-check task must confirm it.

## Open questions / risks
- None. No contract, data-model or i18n change.
