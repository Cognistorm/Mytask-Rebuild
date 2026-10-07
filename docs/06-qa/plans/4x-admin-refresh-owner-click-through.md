# Phase 4X admin refresh: Owner click-through, ROADMAP 4X.11

About 15 minutes, admin only. Admin https://mytask.1kk.ge/admin · login `owner`, then the code from the test inbox
https://mytask.1kk.ge/__mail/ (when staff 2FA is ON). Try it once on a computer (wide window) and once on a phone
(or a window narrower than 1024 px).

**What to judge.** Your request of 2026-10-07 (brief `docs/05-design/admin-refresh.md`): **AR-1** a fixed left
sidebar with every section, **AR-2** the chosen section's settings and controls on the right, **AR-3** modern
controls in the 3X look. What each screen does is unchanged: the same buttons, the same "Save" per row, the same
re-login step before security settings, the same permissions. QA checked that (`docs/06-qa/reports/4x-admin-refresh-*.md`).

**Deployed:** 2026-10-07, commit `9cd7fdff` (branch `feat/admin-refresh`, CI green). The PR to `main` is opened by you (no `gh` on this PC).

Tick each line. Anything that looks wrong: write one line under "Notes" (what, where, what you expected).

## Sidebar (AR-1)
- [ ] After login the sidebar is on the left: logo with "მართვის პანელი", then Users, Portfolios, Projects,
      Categories, Settings (the legacy order), and at the bottom your name, "Change password" and "Logout".
- [ ] Users, Projects and Settings open and close with their arrow; the group of the screen you are on is open,
      and the current item is marked (teal tint and a bar at its start).
- [ ] Portfolios and Categories are plain links (one item each, no open step).
- [ ] Every old link is there: Verifications, User restrictions, Portfolios, Project categories, Skills,
      Categories, each settings area, Banned IPs, Change password.
- [ ] Choice made in the brief §7, keep or change: **Banned IPs sits under Settings** (the legacy "Security
      settings" place).

## Settings by area (AR-2)
- [ ] Settings lists one item per area (Plans and limits, Payment methods and wallet, Escrow …, Login and security,
      Uploads and media, Chat, Notifications, Content …, System; only areas that have settings today).
- [ ] Choosing an area shows only that area's settings on the right, with the area name as the title and
      "პარამეტრები" above it. `/settings` opens the first area.
- [ ] Are the 12 new area names right in Georgian and English? (`t_settings_area_*`, refine freely.)

## Controls (AR-3)
- [ ] A setting row: the meaning in bold, under it a small grey line with the register ID (e.g. `S-056`), the
      unit and, for security rows, a "პაროლის დადასტურება" badge; the switch or field on the right.
- [ ] Number fields show the unit inside the field. "Save" is a light button until you change the value, then it
      turns teal.
- [ ] Switch a security setting (e.g. S-056): the password check now opens **inside** the page (sidebar stays),
      with Continue and Close.
- [ ] Login keys (Google, Facebook …): each is a card with its switch at the top right, the fields under their
      labels, the "Client secret" state as a pill and "Save" at the bottom right.
- [ ] Portfolios and Verifications: the status tabs are one segmented control; the white thumb slides to the
      chosen status. Each item is a card: who and when on top, then the work or documents, then the reason field
      and the buttons (Approve teal, Reject red).
- [ ] User restrictions: appeals and history as the same cards; "Delete" is a small red-text button.
- [ ] Banned IPs: IP field, note and "Add" on one line; each banned IP is a row with "Unban" in red text.
- [ ] Categories, Project categories, Skills: rows tint on hover; sub-categories are indented with thin guide
      lines; "Delete" is red text. The create / edit form is a card with Georgian and English side by side.
- [ ] Empty lists show a centred "nothing here" message.

## Phone (or a narrow window)
- [ ] The sidebar is hidden; the ☰ button at the top opens it as a drawer. Close, tapping outside, Escape or
      choosing an item closes it.
- [ ] No screen scrolls sideways. The status tabs keep whole words (the tab row itself may scroll).

## Decision
- [ ] **Approve 4X** → merge PR `feat/admin-refresh` → `main`, rebase `feat/gigs` on `main`, Phase 4 resumes at 4.3.1.

## Notes
-
