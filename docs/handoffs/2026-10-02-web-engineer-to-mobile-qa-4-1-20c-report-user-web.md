# 4.1.20c Web: report user

From: web-engineer · To: mobile-engineer (4.1.23), qa-engineer (4.1.25+), security-reviewer (4.1.27),
web-engineer (4.1.20d) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Built spec 02 AC-14 (and the AC-13 owner rule) on the web, after the legacy `ProfileComponent.php:275-352` and the
report modal in `profile.blade.php`. The texts are the legacy ones; no new i18n key.

- **Button:** "Report user" (`t_report_user`) sits in the profile card actions next to "Share profile". Legacy
  had an icon button with a tooltip; here the button has visible text, like Share (design §7.4, 44 px targets).
  It is not shown on the own profile (AC-13).
- **Dialog for a signed-in visitor** (`canReport` from the server render):
  - Title `t_report_user`, a textarea `t_reason` with `t_report_user_reason_placeholder` and max 1,500, and the
    buttons Cancel / `t_report`.
  - The reason is trimmed. An empty reason → `t_validator_required`, and no request is sent.
  - `createUserReport` → `t_profile_has_been_successfully_reported` in the dialog, plus Close. The 201 (first
    report) and the 200 (replaces the earlier one) show the same message.
  - API errors show in the dialog and the text stays, e.g. the SEC-23 limit, 429.
- **Guests** (and a session that ended after the page rendered: 401): the dialog shows
  `t_u_must_login_to_report_this_profile` and a Login button with `next` back to the profile. Legacy hid the
  button from guests; spec AC-14 asks for the message, as the 4.1.17 handoff planned.
- **Test fix:** the 4.1.18 availability E2E compared the date picker's `min` with "UTC date + 1". Between 20:00
  and 24:00 UTC it is already the next day in Tbilisi, so the test failed in that window. It now expects
  tomorrow in Asia/Tbilisi exactly. The page itself was right.

## Files created/changed
- `apps/web/src/components/profile/client.tsx` (`ReportButton`), `profile.css`
- `apps/web/src/app/[locale]/(public)/profile/[username]/page.tsx`
- `apps/web/e2e/report-user.spec.ts` (new, 5 tests), `apps/web/e2e/edit-profile.spec.ts` (date fix)

Checks: web E2E 101 passed / 3 skipped; repo typecheck + lint 10/10; Prettier; i18n check; `next build` OK.

## What the next agent must do
- **Web 4.1.20d:** theme switch (AC-35, S-105/S-106).
- **Mobile 4.1.23:** use a bottom sheet with the same keys and rules (screens table "Report user: bottom sheet,
  success toast"). Guests get the login message, and there is no button on the own profile.
- **QA:** `e2e/report-user.spec.ts` covers the signed-in report, the empty check, a second report, the 429, the
  guest message, the own profile and Georgian. Full stack with `pnpm local`: report a profile and check that
  EV-13 reaches every S-100 address in Mailpit.
- **Security 4.1.27:** the reason is plain text, shown later only in the admin reports queue (spec 16). The admin
  screen must render it as text.

## Open questions / risks
- No Owner question. No contract change.
- **Deviation:** legacy closed the modal and showed a toast. Here the success message shows inside the dialog,
  which stays open until Close. There is no shared toast component yet; the screens table says "success toast".
  It can switch when a toast exists.
