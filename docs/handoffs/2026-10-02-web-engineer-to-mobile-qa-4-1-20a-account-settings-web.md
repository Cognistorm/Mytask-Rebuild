# 4.1.20a Web: account settings + email-change link page

From: web-engineer · To: mobile-engineer (4.1.24), qa-engineer (4.1.25+), security-reviewer (4.1.27),
solution-architect (url-map), web-engineer (4.1.20b–d) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
4.1.20 was too big for one step, so I split it in ROADMAP.md into 4.1.20a settings, b verification centre,
c report user, and d theme switch. This handoff covers 4.1.20a: spec 02 AC-29…AC-35, EC-12 on the web, after the legacy
`Account/Settings/SettingsComponent.php:156-354` + `account/settings/settings.blade.php`.

- **`/account/settings`** (dashboard shell, Buying side, no nav item active; title "Account settings"):
  - **Side card (AC-35):** avatar, username, then the links Account settings (marked `aria-current`), Edit profile,
    Update password, Verification center, Browser sessions and Logout. Billing, payment methods, subscription and
    referrals come with specs 05/09. The theme switch comes in 4.1.20d.
  - **Form (legacy fields, labels and placeholders):** username, email, full name, country (new: legacy had it
    commented out; list from `listCountries`, empty = none), city, then the current password (only for accounts
    with a password). Only changed fields are sent (trimmed; an emptied country → `null`). The password is
    always sent. Field errors show under their field and other errors above the form. Success →
    `t_ur_account_settings_updated`, and the password is cleared.
  - **Email change (AC-30):** the save answers with `pendingEmail` → `t_email_change_pending` with the new address.
    The field goes back to the current address. After a reload, the same text shows as a banner from
    `Me.pendingEmail`.
  - **Accounts without a password (Q-144, EC-12):** changing only other fields needs no code. When the email
    field differs from the current address, `t_confirm_with_email_code` and "Send a new code" appear
    (`createMyTwoFactorChallenge` purpose `email_change`, 60 s resend countdown), then the 6-box code. Update stays
    disabled until 6 digits are entered. Wrong/expired codes show the API message.
  - **Username change (AC-31):** the account menu shows the new name at once (the shell context now has `setMe`).
  - **Delete account (AC-32…AC-34):** a danger block with "Delete Account" opens a dialog with the legacy
    `t_confirm_delete_account` + `t_delete_account_warning` and Cancel / Delete. `deleteMe` refusal (422) → the
    reason shows in the dialog. Success → full page load to the home page (legacy redirect `/`).
- **`/auth/email-change?token=`** (private layout, title "Confirm new email"): calls `confirmEmailChange` once and
  removes the token from the address bar (SEC-48, as `/auth/verify`). Success shows `t_email_changed_success`,
  then a link to Account settings (signed in) or Login (signed out). An error shows the API text
  (invalid/expired/taken) and a link to settings.
- **Links:** the account menu ("Account settings", `data-testid="menu-settings"`), the edit-profile links and the
  password and sessions pages now point to `/account/settings`. The slice-01 `/account` page stays the post-login
  landing with the 2FA switch and got a link to settings.
- **API:** `listCountries` (`GET /countries`, public, D2) was in the contract but not built. I added it in
  `apps/api/src/modules/profiles/countries.controller.ts`; it moves to the catalog module in slice 03. It returns
  active countries only, names in the request language, sorted by name. There is a test in
  `test/account-settings.test.ts`.
- **Shared:** `Select` in `@mytask/ui/web` (`form.tsx`, styles with the other `.auth-field` controls).

## Files created/changed
- `apps/web/src/app/[locale]/(private)/account/settings/layout.tsx`, `page.tsx` (new)
- `apps/web/src/app/[locale]/(private)/auth/email-change/layout.tsx`, `page.tsx` (new)
- `apps/web/src/components/account-settings/account-settings.tsx`, `account-nav.tsx`, `settings.css` (new)
- `apps/web/src/components/dashboard/shell.tsx` (`setMe` in the context, menu link),
  `components/profile-edit/edit-profile.tsx`, `app/[locale]/(private)/account/page.tsx`, `password/page.tsx`,
  `sessions/page.tsx` (links)
- `packages/ui/src/web/form.tsx`, `form.css`, `index.ts` (`Select`)
- `apps/api/src/modules/profiles/countries.controller.ts` (new), `profiles.module.ts`,
  `apps/api/test/account-settings.test.ts` (+1 test)
- `apps/web/e2e/account-settings.spec.ts` (new, 8 tests)
- No i18n key added (all texts existed).

Checks: API 395 passed / 5 skipped; web E2E 89 passed / 3 skipped; repo typecheck + lint 10/10; Prettier;
i18n check; `next build` OK.

## What the next agent must do
- **Web 4.1.20b:** verification centre `/account/verification`. The side card already links it; reuse
  `AccountNav` with `current="verification"`.
- **Mobile 4.1.24:**
  - Use the same form and rules: only changed fields; password for accounts with one; `email_change` code only
    when the email changes on accounts without one.
  - Show the pending text from `pendingEmail` and the delete dialog with the same keys.
  - Get countries from `GET /countries`.
  - The email-change link opens on the web.
- **Architect:** add `/auth/email-change` to `docs/03-architecture/url-map.md` (private, `noindex`, `?token=`),
  as asked in the 4.1.11 handoff, and decide whether the app claims it.
- **QA:** `e2e/account-settings.spec.ts` covers the menu entry, prefill, links, field errors, the changed-fields
  body, the pending email, the no-password code flow, delete refused/ok, signed out, and the link page.
  - Full stack with `pnpm local`: change the email and open the EV-11 link from the mail catcher; change the
    username and open `/profile/{old}` (404).
  - Delete an account and try to log in.
- **Security 4.1.27:** the token is read once and removed from the address bar. Deletion has no re-authentication
  (legacy and contract: none). Flag it if wanted.

## Open questions / risks
- No Owner question. No contract or data-model change: `listCountries` was already in the contract.
- **Deviation (for QA/Owner):** legacy hid the country field (commented out in the blade). It is shown here
  because spec 02 AC-29 lists it, and only Georgia is active.
- **Deviation:** legacy "Delete Account" checked active orders before the dialog. Here the check is the API's on
  confirm, and the refusal shows inside the dialog (the API guards come with later slices).
- `/account` (slice-01 placeholder with the 2FA switch) still exists, because login, register and social callbacks
  land there. Spec 01 puts the 2FA card on the Password page. Moving it and retiring `/account` (redirect to
  settings or to the last dashboard) touches the slice-01 E2E tests. I suggest a separate micro-task.
- The password and sessions pages still use the centred auth panel, not the account side card. Moving them into
  the shell is a small follow-up (the same micro-task as above would fit).
