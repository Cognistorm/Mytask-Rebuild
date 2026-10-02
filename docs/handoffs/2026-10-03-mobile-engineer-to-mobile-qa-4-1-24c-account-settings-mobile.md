# 4.1.24c Mobile: Account → Settings + account links

From: mobile-engineer · To: mobile-engineer (4.1.24d), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

## What I did
I built spec 02 AC-29…AC-35 and EC-12 in the app. I followed the screens table (password confirm field; "Send code" + 6-digit code for accounts without a password when the email changes; wrong or expired code; pending-email banner; delete-account danger zone with the dialog). The fields, texts, rules and ops match the web 4.1.20a (legacy `SettingsComponent.php:156-354`).

- **`/account/settings`** (`src/app/account/settings.tsx`, outside the tab gate with its own `getMe`; signed out → login, restricted → `/restricted`):
  - **Form** (legacy labels and placeholders): username, email, full name, city (no country, Q-162/ADR-021), then the current password, shown only for accounts with a password.
    - Only changed fields are sent (trimmed). The password is always sent.
    - Field errors show under their field; others show above the form.
    - Success → `t_ur_account_settings_updated`, and the password is cleared.
  - **Email change (AC-30):** a save that answers with `pendingEmail` shows `t_email_change_pending` with the new address, and the field goes back to the current address. Opened again, the same text shows as a notice from `Me.pendingEmail`. The confirmation link in the email opens the website page `/auth/email-change` (built in 4.1.20a; no app intent filter for it).
  - **Accounts without a password (Q-144, EC-12):**
    - changing only other fields needs no code;
    - when the email differs from the current address, `t_confirm_with_email_code` and "Send a new code" appear (`createMyTwoFactorChallenge` purpose `email_change`, the API notice, resend countdown `t_2fa_resend_wait`), then the code field (digits only, ≤ 6, `oneTimeCode`);
    - Update stays disabled until 6 digits are entered. Wrong or expired codes show the API message under the code.
  - **Delete account (AC-32…AC-34):** a "Delete Account" danger button opens a bottom sheet titled `t_confirm_delete_account` with `t_delete_account_warning` and Cancel / Delete (`danger`).
    - A `deleteMe` refusal (active orders or projects, balance) shows in the sheet.
    - Success clears the stored session and goes to login (legacy: logged out and sent home; the app's start needs a session).
- **Account tab (AC-35):**
  - links in the web side card's order: Account settings (new), Edit profile, View profile, Password and security (password, 2FA, sessions), Logout;
  - the tab reads `getMe` again on focus, so a new username or email shows at once;
  - the verification centre joins in 4.1.24d. Billing, payment methods, subscription and referrals join with specs 05/09. The theme switch is web only (AC-35).
- **Edit profile:** "Update profile" links now include Account settings.

## Files created/changed
- New: `apps/mobile/src/app/account/settings.tsx`
- Changed:
  - `apps/mobile/src/app/(tabs)/account.tsx`: Settings link, re-read on focus
  - `apps/mobile/src/app/account/profile.tsx`: Settings link
  - `docs/SETUP-LOCAL.md` §4: new step 15
- No new i18n key. All keys used exist in en and ka.

## Checks
- Mobile typecheck + lint: OK.
- Prettier: clean. i18n check: OK.
- `expo export` iOS + Android: OK.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 15.

## What the next agent must do
- **4.1.24d:** Verification centre (AC-36…AC-39). Add its link to the Account tab (after Edit profile / View profile, before Password and security, as the web card) and to the edit-profile "Update profile" links.
- **QA:** compare with the web `/account/settings` on a phone:
  - wrong password;
  - username taken;
  - username change (the profile link follows);
  - email change + link + pending notice;
  - social-only account: code, wrong code, expired code, resend wait;
  - delete refused (balance or active order) and allowed.
- **Security 4.1.27:**
  - the password sits only in component state and is cleared after a save;
  - the code is never stored;
  - delete clears the SecureStore tokens (the device token stays, as logout does);
  - all checks are server-side (`updateMe`, `deleteMe`).

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Label clash (legacy texts):** the Account tab's own title is `t_account_settings` ("პროფილის მონაცემები"), the same text as the new Settings link and screen. The Owner may want another title for the tab screen (e.g. `t_ui_tab_account`) in the text pass. Left as is to avoid a new key.
- **Deviation:** after a delete the app shows the login screen instead of a home page (the app has none until slice 02).
- Not seen on a device yet. Check in Expo Go (step 15).
