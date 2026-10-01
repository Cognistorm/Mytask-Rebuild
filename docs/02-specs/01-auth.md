# 01 — Auth and accounts
Status: **approved** (Owner 2026-09-28; P-14…P-37 accepted, P-15 adjusted by Q-082)
Updated 2026-09-30 with Owner gate answers and the security conditions before slice 01 (security PASS with conditions approved at the gate; `docs/06-qa/security/01-blueprint-recheck-2026-09-30.md` §4.2): NEW AC-53 login slow mode (SEC-02) and AC-54 2FA code lock (SEC-03) with the NEW security emails spec 15 EV-128 / EV-129; NEW AC-55 throttle on in-session password/code checks (SEC-04); AC-41 note on unverified provider emails (SEC-09); AC-44 emailed code for accounts without a password (Q-144 / SEC-05); AC-33, AC-35 start the withdrawal pause (Q-144, S-129); EC-8 staff 2FA switch-off needs re-login and notifies the user (Q-145, EV-127).
Author: product-analyst (P2-A2) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-001…BR-008, BR-115; `roles-and-permissions.md`; `risks-and-debt.md` R-020, R-043; `notifications.md` (auth rows); `integrations.md` (social login, reCAPTCHA). Owner decisions: Q-013, Q-032, Q-042, Q-043, Q-057, Q-063, Q-072, P-4, P-7, P-8. Platform rules: `00-platform-rules.md` (settings S-052…S-069, S-091…S-093, S-100; rules R-1.4, R-5.7).

Tags: **LEGACY** = as the old platform; **CHANGE** = differs from legacy (Owner Q-ID cited); **NEW** = new requirement (Q-ID cited); **PROPOSED** = analyst recommendation, needs Owner approval (numbered P-14…, see "Open questions").

Legacy code traced for this spec (read-only):
- Register: `legacy/APP/app/Livewire/Main/Auth/RegisterComponent.php:129-235` (status, referral code `:242-249`, referral `:257-296`); validator `app/Http/Validators/Main/Auth/RegisterValidator.php:21-29`; username rule `app/Rules/UsernameRule.php:28`.
- Login: `app/Livewire/Main/Auth/LoginComponent.php:117-195` (remember me default `:23`; inactive status → generic error `:146-162`); `LoginValidator.php:25-33`.
- Verify / resend: `Auth/VerifyComponent.php:32-76` (sets `active` without checking the old status); `Auth/RequestComponent.php:92-179`.
- Reset: `Auth/Password/ResetComponent.php:92-144` (always the same success message; only `active|verified|pending` users with a password), `Auth/Password/UpdateComponent.php:134-187`; validator `UpdatePasswordValidator.php:26` (min 6).
- Change password: `Account/Password/PasswordComponent.php:96-155`; validator `Account/Password/EditValidator.php:26-30` (min 6).
- Social: `Auth/Social/Google/CallbackComponent.php:76-189` (same pattern for Facebook, GitHub, LinkedIn, Twitter): no status check, no referral code.
- reCAPTCHA v3, score > 0.5: `app/Rules/Recaptcha.php:21-38`; used on register, login, contact, blog comments, admin login.
- Sessions: `Account/Sessions/SessionsComponent.php:97-237`. Web middleware `AuthenticateSession` ends other sessions after a password change (`app/Http/Kernel.php:163-176`).
- Restrictions: `app/Http/Middleware/Restricted.php:21-31`; appeal `app/Livewire/Restricted/IndexComponent.php:113-190`, validator `app/Http/Validators/Restricted/AppealValidator.php:24-46`; admin `app/Livewire/Admin/Users/Options/RestrictComponent.php:89-397`.
- Staff login / IP ban: `app/Livewire/Admin/Auth/LoginComponent.php:130-236`, `app/Http/Middleware/isIpBanned.php:26`. There is no admin screen for banned IPs.

---

## Goal
Let people create an account, log in and out on web and mobile, and recover or change their password, exactly as today. Add what the Owner asked for: optional email 2FA, login throttling, working social-login configuration and account-status checks on every login path. Every legacy user must be able to log in with their current password.

## Roles involved
- **Guest**: registers, logs in, resets a password.
- **User** (buyer + freelancer, Q-013): logs in and out, changes password, manages 2FA and sessions.
- **Pending / banned / restricted user** (BR-002, BR-004, BR-008).
- **Staff** (separate staff accounts, legacy `admins`): staff login, IP-ban rule, staff 2FA (S-060). Staff also activate pending users and decide on restrictions and appeals. The permission names are defined in spec 16.
- **System**: sends emails and expires links and codes.

## User stories
- As a guest, I want to register with my name, username, email and password (or with Google/Facebook when enabled), so that I can buy and sell at once.
- As a legacy user, I want my old password to keep working, so that the move to the new platform is invisible to me.
- As a user, I want to turn on an email code for logins from a new device, so that a stolen password alone is not enough.
- As a user, I want to reset my password by email, so that I can recover my account.
- As a user, I want to see my active sessions and sign out of the other ones, so that I control where I am logged in.
- As a restricted user, I want to read why I was restricted and send an appeal with files, so that I can get my account back.
- As the Owner, I want to switch reCAPTCHA, 2FA, email verification and social providers on or off in the Admin Panel, so that I do not need a developer.

## Acceptance criteria

### Registration
- AC-1 Given a guest on the register screen (web or mobile), When they submit a full name (3–60 chars), a username (3–60 chars, only `a-z A-Z 0-9 _`, not only digits, unique), an email (valid, domain resolves, ≤ 60 chars, unique), a password that meets R-A2, the terms box ticked and (if S-061 is ON) a passing reCAPTCHA, Then the account is created with both roles (00 AC-1) and a unique 8-character referral code made of `A–Z 0–9`. (LEGACY BR-001, BR-002; Q-013)
- AC-2 Given the register form, When the username is `12345`, `ab`, `john-doe` or an existing username, or the email already belongs to any account (including a deleted one), Then the account is not created and the field shows its own error (`t_validator_username`, `t_validator_min`, `t_validator_unique`). (LEGACY)
- AC-3 Given S-052 `auth.email_verification.required` is OFF, When registration succeeds, Then the user is logged in straight away and taken to the home page (web) or the home tab (mobile). (LEGACY BR-002)
- AC-4 Given S-052 is ON and S-053 `auth.email_verification.method` = email, When registration succeeds, Then the account status is `pending`, a `VerifyEmail` message is sent with a link valid for S-054 minutes, the user is not logged in, and the screen shows `t_register_verification_email_sent`. (LEGACY BR-003)
- AC-5 Given S-052 is ON and S-053 = admin, When registration succeeds, Then the status is `pending`, the admin email `PendingUser` goes to every address in S-100, and the screen shows `t_register_verification_admin_pending`. When a staff member activates the account, the user gets `AccountActivated` and can log in. (LEGACY BR-003; CHANGE recipients Q-026)
- AC-6 Given a referral code is entered, or arrives through a `?ref=CODE` link (the field is pre-filled), When the code matches an existing user, Then a pending referral is stored. It is credited when the account becomes active (spec 09, S-046). When the code does not exist, Then registration is refused with `t_referral_code_invalid`. (LEGACY BR-115)

### Email verification
- AC-7 Given a pending account and a valid, unexpired verification link, When the link is opened, Then the status becomes `active`, the email is marked verified, the link is deleted, the pending referral is processed (spec 09), and the user lands on login with `t_ur_account_has_been_successfully_verified_email`. A link for an account that is not `pending` (for example banned) changes nothing. (LEGACY BR-003; CHANGE: legacy activated any status, `VerifyComponent.php:65`)
- AC-8 Given an expired link, When it is opened, Then the user sees `t_verification_email_link_expired` and a "resend" form. Given an unknown link, Then `t_verification_email_not_exists`. (LEGACY)
- AC-9 Given the resend form, When a pending account's email is entered, Then all older links for that email stop working and a new `VerifyEmail` is sent (`t_a_new_verification_link_has_been_sent_to_ur_email`). When the account is not pending, Then `t_already_verified_user` is shown. Resends are limited by R-A9. (LEGACY; limit ACCEPTED P-19)

### Login
- AC-10 Given an `active` or `verified` account, When the correct email and password are submitted (and the reCAPTCHA passes if S-061 is ON), Then the user is logged in on web or mobile and returned to the page they came from, or to home. "Remember me" is ticked by default on web; mobile always stays signed in until logout. (LEGACY BR-004, `LoginComponent.php:23,144`)
- AC-11 Given a wrong email or password, When login is submitted, Then the message is `t_invalid_login_credentials_pls_try_again`, and it is the same whether or not the email exists. (LEGACY)
- AC-12 Given a migrated legacy user whose password hash is bcrypt `$2y$10$…`, When they log in with their old password on web and on mobile, Then login succeeds. The hash is upgraded to the new platform's algorithm in the same request (ADR-002), and the next login works with the upgraded hash. (vision "Must NOT break"; BR-005)
- AC-13 Given a `pending` account and the correct password, When login is submitted, Then the user is not logged in and sees `t_account_pending_verification` with a "resend verification email" action (method email), or `t_account_pending_admin_review` (method admin). (ACCEPTED P-16; legacy showed the generic `t_toast_something_went_wrong`)
- AC-14 Given a `banned` account and the correct password, When login is submitted, Then the user is not logged in and sees `t_account_suspended`. (LEGACY block; ACCEPTED P-16 message)
- AC-15 Given a deleted (soft-deleted) account, When login is submitted, Then it behaves like wrong credentials (AC-11). (LEGACY)
- AC-16 Given S-062 = 5 attempts per 15 minutes and S-063 = 15 minutes, When the same account is tried from the same IP with a wrong password 5 times within 15 minutes, Then the 6th attempt is refused even with the right password, with `t_too_many_login_attempts` showing the remaining minutes. After the lock ends, login works. A successful login resets the counter. The rule applies equally to web, mobile and direct API calls. (NEW, P-8, fixes R-043)
- AC-17 Given the admin changes S-062 or S-063, When the next login attempt happens, Then the new values apply with no deployment. (00 AC-8)
- AC-18 Given S-061 `auth.recaptcha.enabled` is ON, When register or login is submitted without a valid token (the score must be above 0.5), Then it is refused with `t_validator_recaptcha`. Given S-061 is OFF, Then no captcha is shown or checked. Web only for now; the app: R-A10 (Q-160). (LEGACY `Recaptcha.php:21-38`)
- AC-19 Given a restricted user (`is_restricted`), When they log in, Then login succeeds but the web app sends every page to the Restrictions centre (`/restricted`), the mobile app shows only the Restrictions screen, and the API answers every other call with the error `ACCOUNT_RESTRICTED`. The exceptions are: own account summary, restrictions and appeals, and logout. (LEGACY BR-008, `Restricted.php:27-31`; applies to both roles, R-1.4)

### Email two-factor authentication (NEW, Q-043, Q-063, Q-072, P-4, P-7)
- AC-20 Given S-056 `auth.two_factor.enabled` is ON, When a user opens Account settings → Security, Then they see the "Two-factor authentication (email)" switch, OFF by default. Given S-056 is OFF, Then the switch is hidden and the API refuses to change it.
- AC-21 Given a user switches 2FA ON or OFF, When they confirm, Then they must first re-authenticate: current password, or, for an account without a password (social only), a 6-digit code sent to their email. On success the choice is saved and the user gets `t_2fa_enabled` / `t_2fa_disabled`. (ACCEPTED P-15)
- AC-22 Given S-056 is ON and the user has 2FA ON, When they log in with the correct password from a device that is not trusted (never confirmed, or its trust is older than S-059 days), Then no session is created yet. A 6-digit code is emailed (`t_2fa_email_subject`) and the user sees the code screen (`t_2fa_code_sent`). (Q-063 "new device/IP"; device-based definition ACCEPTED P-15, aligned with ADR-002)
- AC-23 Given the code screen, When the correct code is entered within S-057 minutes (default 10), Then the login completes, and the device is remembered as trusted for S-059 days (default 30). The IP of the login is recorded in the session list (AC-43). (P-7)
- AC-24 Given a trusted device whose trust is not older than S-059 days, When the user logs in from it, also from a different IP address, Then no code is asked. (ACCEPTED P-15)
- AC-25 Given the code screen, When a wrong code is entered S-058 times (default 5), Then that code stops working and the user sees `t_2fa_too_many_attempts`. They must ask for a new code. (P-7)
- AC-26 Given a code older than S-057 minutes, When it is entered, Then it is refused with `t_2fa_code_expired`.
- AC-27 Given the code screen, When the user taps "Send a new code", Then a new code is sent and the old one stops working. The button is disabled for 60 seconds after each send, and at most 5 codes per account are sent in 15 minutes (`t_2fa_resend_wait`). (ACCEPTED P-15)
- AC-28 Given users who switched 2FA ON, When the admin switches S-056 OFF, Then those users log in without a code, and their choice is kept. When S-056 is switched back ON, Then the code is asked again under AC-22. (Q-072)
- AC-29 Given S-060 `auth.two_factor.staff_required` is ON, When a staff member logs in to the Admin Panel from a device that is not trusted (same rule as AC-22), Then the same email-code step is required, whatever S-056 says. Given S-060 is OFF, Then no code is asked for staff. (NEW, P-4 adjusted)
- AC-30 Given a user with 2FA ON logs in through a social provider, When the device is not trusted, Then the same code step is required before the session is created. (ACCEPTED P-15)
- AC-31 Given a user switches 2FA OFF or changes or resets their password, When this is saved, Then all their trusted devices are forgotten. (ACCEPTED P-15)

### Password reset and change
- AC-32 Given the "forgot password" form, When any email is submitted, Then the screen always shows `t_password_reset_link_sent_success`. A `PasswordReset` email with a link valid for S-055 minutes is sent only if an account with that email has a password and has status active, verified or pending. Older reset links for that email stop working. (LEGACY `ResetComponent.php:107-144`)
- AC-33 Given a valid reset link, When a new password meeting R-A2 and a matching confirmation are submitted, Then the password is changed, the link is deleted, `PasswordChanged` is sent, every session of the user ends (web and mobile), the withdrawal pause of spec 14 AC-21 starts (S-129), and the user lands on login with `t_password_has_been_updated`. (LEGACY; password rule ACCEPTED P-14; pause NEW, Owner 2026-09-30 Q-144)
- AC-34 Given an expired reset link, When it is opened or submitted, Then `t_password_reset_link_expired` is shown and nothing changes. An unknown link goes to login. (LEGACY)
- AC-35 Given a logged-in user on the password page, When the correct current password, a new password meeting R-A2 and a matching confirmation are submitted, Then the password changes, `PasswordChanged` is sent, all other sessions end, the current session stays, and the withdrawal pause of spec 14 AC-21 starts (S-129). When the current password is wrong, Then `t_ur_current_pass_does_not_match` is shown (and AC-55 counts it). (LEGACY `PasswordComponent.php:96-155`, `AuthenticateSession`; pause NEW, Owner 2026-09-30 Q-144)
- AC-36 Given reset requests for one email or from one IP, When more than 3 are made within 1 hour, Then no further email is sent in that hour, and the screen still shows the same message. (ACCEPTED P-19)

### Social login (Q-032)
- AC-37 Given a provider (S-065 Google, S-066 Facebook, S-067 GitHub, S-068 LinkedIn, S-069 Twitter/X) is enabled and its keys are saved, When the login or register screen opens (web and mobile), Then that provider's button is shown. Given it is disabled or has no keys, Then no button is shown and its callback is refused. (LEGACY architecture, keys in Admin, Q-032)
- AC-38 Given a first social login with an email that is not yet registered, When the provider returns the profile, Then an account is created with status active, email verified, both roles, the provider avatar, a username made from the nickname or name (lower-case Latin, `_` separators, with a 4-character suffix if taken), and a referral code (AC-1). A `?ref=` code carried through the flow is applied as in AC-6. (LEGACY BR-006; referral code and `?ref=` ACCEPTED P-17)
- AC-39 Given the email already belongs to an account with a password, or to an account linked to another provider, When social login completes, Then it is refused with `t_socialite_error_email_exists`. (LEGACY BR-006)
- AC-40 Given an existing social account whose status is banned, pending or deleted, When social login completes, Then no session is created and the same messages as AC-13…AC-15 apply. (CHANGE, fixes R-020; 00 R-1.4)
- AC-41 Given the provider returns no email address, or an email address the provider does not mark as verified, When social login completes, Then no account is created or matched and `t_social_email_missing` is shown. (NEW; legacy would fail; unverified provider emails count as missing, ADR-002 §7, SEC-09)

### Sessions and logout
- AC-42 Given a logged-in user, When they log out (web or mobile), Then the current session is ended on the server, and the device can no longer call the API with it. (LEGACY)
- AC-43 Given the Sessions page (Account settings), When it opens, Then it lists every active session of the user: device/browser/OS, IP address, last activity, and a "This device" marker. (LEGACY `SessionsComponent.php:97-130`; now web and mobile sessions)
- AC-44 Given the Sessions page, When the user chooses "Log out other browser sessions" and enters the correct current password — or, for an account without a password (social login only), the 6-digit code emailed to the account's current address (EV-06; valid only for this purpose and only once; S-057/S-058 and the resend limits of AC-27 apply) — Then every other session ends and the current one stays. A wrong password shows `t_ur_current_pass_does_not_match`; a wrong or expired code shows `t_2fa_code_invalid` / `t_2fa_code_expired`; nothing ends. (LEGACY; emailed code **CHANGE** from "not asked", Owner 2026-09-30 Q-144 / SEC-05)
- AC-45 Given staff ban a user (status `banned`), When the ban is saved, Then all sessions of that user end, and their next API call is refused with `t_account_suspended`. (ACCEPTED P-16; legacy only blocked new logins)

### Restrictions, appeals and IP banning (Q-057)
- AC-46 Given a staff member restricts a user with a message and a "files required" flag, When the restriction is saved, Then the user becomes restricted (AC-19) and receives the restriction email with the message. (LEGACY `RestrictComponent.php:89-124`)
- AC-47 Given a restricted user with a restriction in status `pending`, When they submit an appeal with a message (required, ≤ 1,500 chars) and, if files are required, 1 to S-091 files each ≤ S-092 MB of the types in S-093, Then the appeal is saved, the restriction becomes `submitted`, and the admin email `NewRestrictionAppeal` goes to every address in S-100. (LEGACY; CHANGE recipients Q-026)
- AC-48 Given a submitted appeal, When staff approve it, Then the restriction becomes `approved`, the user is no longer restricted (if no other active restriction exists), and `AppealAccepted` is sent. (LEGACY)
- AC-49 Given a submitted appeal, When staff reject it, Then the restriction becomes `rejected`, the user stays restricted, `AppealRejected` is sent, and that restriction cannot be appealed again. (LEGACY `IndexComponent.php:120-124`)
- AC-50 Given staff delete a restriction, When the user has no other restriction left, Then the user is no longer restricted. (LEGACY `RestrictComponent.php:183-235`)
- AC-51 Given S-064 `security.staff_login.ip_ban_threshold` = 3, When the failed staff logins from one IP reach the threshold, Then that IP is banned from the staff login, and every later staff-login request from it is refused. User logins are not affected by this ban (they are throttled by AC-16). (LEGACY BR-004, `isIpBanned.php:26`)
- AC-52 Given a staff member with the security permission (spec 16), When they open "Banned IPs", Then they can see each banned IP with its attempt count and date, remove a ban, and add an IP by hand. (ACCEPTED P-20; legacy had no screen, so a banned IP could only be cleared in the database)

### Per-account brute-force protection (NEW, security conditions before slice 01; ADR-002 §5, §6; SEC-02, SEC-03, SEC-04)
Fixed technical values chosen in ADR-002 and shown to the Owner at the Phase 2 gate (not register rows): 20 failed logins per account per hour; 1 evaluated attempt per 30 seconds; 10 wrong codes per account per hour.
- AC-53 Given one account has 20 failed logins (wrong password) within one hour, from any number of IP addresses, When further login attempts for that account arrive during the rest of that hour, Then at most one password attempt per 30 seconds is evaluated for the account; the other attempts are refused with `t_login_slow_mode` (seconds to wait) without checking the password; on web, reCAPTCHA is required for that account's logins while S-061 is ON; a correct password in an evaluated attempt logs the user in (no hard lock); and the account owner gets the security email EV-128 `LoginSlowMode` at most once per hour. A successful login resets the counter. The per-account + IP lock of AC-16 still applies on top. Which attempts may bypass the 30-second slot (for example a trusted device, SEC-30) and which attempts use it up are defined in ADR-002 §6. (NEW SEC-02)
- AC-54 Given one account (user or staff) has 10 wrong 2FA codes within one hour, counted across all its code challenges and purposes (login, social login, 2FA switch, email change, payout details, log out other sessions, staff login and staff re-authentication), When another code is entered for that account, Then it is refused, even when correct, with `t_2fa_locked` for S-063 minutes (default 15), and the account owner gets the security email EV-129 `TwoFactorLocked` once per lock. After the lock ends, a valid code works again. For staff, every wrong staff login code also counts as a failed staff login towards the S-064 IP ban (AC-51). The per-code limit S-058 (AC-25) still applies. (NEW SEC-03)
- AC-55 Given S-062 = 5 and S-063 = 15, When a logged-in user enters a wrong current password or a wrong re-authentication code 5 times within 15 minutes, summed over account settings (spec 02 AC-29), password change (AC-35), the 2FA switch (AC-21), "Log out other browser sessions" (AC-44) and payout details (spec 14 AC-3), Then every further password or code check of that account is refused for 15 minutes with `t_too_many_login_attempts`, even when correct; these failures also count towards the AC-53 counter, and wrong codes towards AC-54. The same applies to staff re-authentication and staff password change (spec 16 AC-6, AC-7). Password reset by email link (AC-33) is not blocked by these counters. (NEW SEC-04)

---

## Business rules

### R-A1 Account basics — LEGACY
- Login is by **email + password** (not username). (BR-004)
- Account statuses: `pending`, `active`, `verified`, `banned`. `active` and `verified` may log in. Deleted accounts are soft-deleted; their email and username stay reserved. (data-model users; BR-004)
- Every account is buyer and freelancer (00 R-1.1). No `account_type`, no level on registration (Q-013, Q-014; legacy `level_id = 1` is dropped).
- The Georgian/English UI language of the user does not affect login. Emails are sent in the user's current UI language (spec 15).

### R-A2 Password rule — ACCEPTED P-14
- 8–60 characters, with at least one uppercase Latin letter and one digit, for **register, reset and change**. Legacy used this rule only at registration (`RegisterValidator.php:24`); reset and change allowed 6+ characters (`UpdatePasswordValidator.php:26`, `EditValidator.php:26-30`).
- Existing passwords that do not meet the rule keep working. The rule applies only when a password is set.
- The legacy key `t_password_validation_message` has a value in both legacy language files (`lang/en/messages.php`, `lang/ka/messages.php`); it is reused unchanged (corrected 2026-10-01, QA 3.15 F-04).

### R-A3 Legacy password migration
- Legacy hashes are bcrypt, cost 10 (`config/hashing.php`). The new platform accepts them on login and upgrades them (ADR-002). Accounts without a password (social only) stay without one. (BR-005; vision)

### R-A4 Email verification — LEGACY values, from the register
- S-052 required (prod → OFF), S-053 method email/admin (prod → admin), S-054 link validity 60 min. Verification activates only `pending` accounts (AC-7).

### R-A5 Throttling and bans
- Users: S-062/S-063, per account + IP (NEW, P-8). Wrong 2FA codes are counted per code (S-058), not in S-062.
- Per account, any IP (NEW SEC-02, AC-53): 20 failures per hour → slow mode (1 evaluated attempt per 30 s), security email EV-128, no hard lock.
- Codes per account (NEW SEC-03, AC-54): 10 wrong codes per hour across all challenges and purposes → code checks blocked S-063 minutes, security email EV-129.
- In-session checks (NEW SEC-04, AC-55): one per-account counter (S-062 / S-063) for wrong current passwords and wrong re-authentication codes.
- Staff: IP ban after S-064 failed logins (LEGACY), plus the 2FA of S-060.
- Email-sending endpoints (reset request, verification resend, 2FA code): fixed limits R-A9 (ACCEPTED P-19, P-15).

### R-A6 Two-factor authentication — NEW (Q-043, Q-063, Q-072, P-4, P-7)
- Optional per user; available only while S-056 is ON (launch ON). The code is 6 digits, valid S-057 = 10 min, invalid after S-058 = 5 wrong tries.
- **When a code is asked (ACCEPTED P-15, same as the ADR-002 recommendation):** the user has 2FA ON, S-056 is ON, and the device is not trusted (never confirmed, or confirmed more than S-059 = 30 days ago). "Device" = a random device identifier the server issues (a secure cookie on web, an install identifier stored in the app on mobile). An IP change on a trusted device does not ask for a code, because mobile networks change IP addresses often. Owner decision (Q-082): this is the DEFAULT, and the trigger is admin-configurable through setting S-124 `auth.two_factor.trigger` = `new_device` (default) or `new_device_or_ip` (also ask on every new IP).
- A successful code marks the device as trusted for S-059 days.
- Applies to email+password and social logins (P-15). Staff: S-060 (P-4 adjusted).
- Resend: 60-second cooldown, at most 5 codes per account per 15 minutes (P-15). These are fixed rules, not settings.

### R-A7 Social login — LEGACY architecture, Q-032
- Providers S-065…S-069. Keys are entered in the Admin Panel, write-only and encrypted (00 §4 rules; the security reviewer confirms, see P2-A1 handoff). OFF until keys exist.
- Linking rule (LEGACY): the account is found by email + provider id. The login is refused if the email already exists with a password or with another provider.
- Status checks on every social login (CHANGE, R-020). New social users get a referral code (ACCEPTED P-17, fixes a legacy gap: `CallbackComponent.php:151-181` never sets `referral_code`).

### R-A8 Restrictions and appeals — LEGACY (Q-057)
- A restriction has: message, files-required flag, status `pending → submitted → approved | rejected`. One appeal per restriction. A rejected restriction cannot be appealed again. Staff may delete a restriction.
- While restricted, the whole account is blocked (both roles, R-1.4). Scheduled jobs still run for the user's orders (auto-release, refund timers), so money flows are not frozen by a restriction.
- Appeal files are stored privately and only staff can download them (legacy route `auth:admin`, `routes/web.php:821-824`).

### R-A9 Fixed limits on email-sending endpoints — ACCEPTED P-19
- Password-reset requests and verification resends: at most 3 emails per email address and per IP per hour. The response text never changes (no account enumeration).

### R-A10 reCAPTCHA — LEGACY
- S-061 (prod → OFF; recommended ON, R-043). v3 score threshold 0.5. Covered here: register and login. Contact form and blog comments: spec 17. Staff login: always subject to S-061 (legacy `Admin/Auth/LoginValidator`).
- Mobile (aligned with ADR-002 §6, 2026-10-01, QA 3.15 F-01): the app has **no reCAPTCHA check yet**; AC-18 applies to the web (and the staff login). The app is protected by the throttles of ADR-002 §6 (S-062 lock, slow mode, `register` 10 per IP per hour, global limits). Whether the app gets a bot check (Firebase App Check or reCAPTCHA Enterprise) is Owner question **Q-160**; until then a mobile request without a token is not refused while S-061 is ON.

---

## Screens (web + mobile) and states
Layouts keep the live structure (audit §3.8): a centred panel with logo, title, fields, "Remember me", a full-width primary button, an "or" divider with social buttons, and links.

| Screen | Web | Mobile | States |
|---|---|---|---|
| Register | `/auth/register` (+ `/en/…`) | Auth stack "Register" | loading (button spinner); error (inline field errors + summary; focus the first error); success (redirect, or message screen for pending) |
| Login | `/auth/login` | "Login" | loading; error (credentials, locked with countdown, slow mode with seconds countdown `t_login_slow_mode`, pending/banned message); success |
| 2FA code | step after login | full-screen code entry, 6 boxes, paste support, numeric keyboard | loading; error (wrong/expired/too many; account code lock `t_2fa_locked` with minutes); resend countdown; success |
| Verify email result | `/auth/verify?token&email` | deep link opens the app, or falls back to web | success / expired / invalid |
| Resend verification | `/auth/request` | "Resend email" | success / already verified |
| Forgot password | `/auth/password/reset` | "Forgot password" | always the same success text |
| Set new password | `/auth/password/update?token&email` | deep link | expired / success |
| Change password | Account settings → Password | Account → Security → Password | wrong current / success |
| Security (2FA switch + Sessions) | Account settings → Password page gets a "Two-factor authentication" card; Sessions page `/account/sessions` | Account → Security | empty (only this device); loading; error (retry); "Log out other sessions" asks for the password, or for an emailed code on accounts without a password (AC-44) |
| Restrictions centre | `/restricted` (restricted layout) | full-screen "Restricted" | list of restrictions with status chips (pending, submitted, approved, rejected), "Read more", "Appeal" modal/sheet with message + file picker (mobile: camera or files) |

**Panel texts and links (legacy, kept; QA 3.15 BUG-01…BUG-04, decided 2026-10-01, ROADMAP 3.17h).**
- Login: title `t_welcome_back`, subtitle `t_pls_login_to_continue`, "back to homepage" `t_back_to_homepage` (web, small screens only); remember me; Login; "or" + social; link list: `t_create_account`, `t_forgot_password`, `t_resend_verification_email`, `t_privacy_policy`, `t_terms_of_service` (pages `/page/privacy-policy`, `/page/terms-of-service`, spec 17).
- Register: title `t_welcome_to_app_name` (site title S-111), subtitle `t_pls_signup_to_continue`, "back to homepage" (web); fields **full name, email, username, password**, referral code; the terms checkbox label is the **legacy sentence `t_by_signup_u_agree_to_terms_privacy`** with its two links (product-analyst decision for BUG-04: the legacy text is kept; the interim key `t_i_agree_terms_privacy` is removed). Its HTML links are rendered as real links by `splitLegacyLinks` (`@mytask/i18n`), never as HTML. Button `t_create_account`; link list: `t_already_have_account` + `t_login`, `t_resend_verification_email`, `t_privacy_policy`, `t_terms_of_service` (QA BUG-05).
- Forgot password: title `t_reset_ur_password`, subtitle `t_reset_ur_password_subtitle`, button `t_reset_password`, link `t_back_to_sign_in`. Resend verification: subtitle `t_resend_verification_email_subtitle`, button `t_send`, link `t_back_to_sign_in`. Set new password: subtitle `t_update_password_subtitle`, button `t_update`.
- Web page titles as legacy: "<page> <S-111 separator> <S-111 site title>" with `t_login`, `t_signup`, `t_reset_password`, `t_update_password`, `t_request_verification_link`, `t_verify_email`.
- Mobile deviation (proposed; listed for QA and the Owner at the Phase 3 gate): no "back to homepage" in the app while its home tab is signed-in only (slice 01); it returns with the public home (slice 02).
| Staff login + staff 2FA | Admin login | – (no admin app) | banned IP → refused |

Mobile differences: social buttons use the native provider SDKs where available. File picker for appeals offers camera and files. Deep links for verify and reset open the app when installed.

Accessibility (audit §3.8): visible labels, not placeholders only. The password show/hide button has an accessible name. Errors are announced (`aria-live`).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `VerifyEmail` (`t_subject_everyone_verify_ur_email`) | email | user | register (AC-4), resend (AC-9) | LEGACY |
| `Admin/PendingUser` (`t_subject_admin_pending_user`) | email | all S-100 recipients | register with admin method (AC-5) | LEGACY, CHANGE recipients (Q-026) |
| `AccountActivated` (`t_subject_everyone_ur_account_activated`) | email | user | staff activates a pending user (AC-5) | LEGACY |
| `PasswordReset` (`t_subject_everyone_reset_ur_password`) | email | user | reset request (AC-32) | LEGACY |
| `PasswordChanged` (`t_subject_everyone_password_changed`) | email | user | reset completed (AC-33), password changed (AC-35) | LEGACY |
| Restriction notice (direct mailable `RestrictEmail`) | email | user | restriction created (AC-46) | LEGACY |
| `Admin/NewRestrictionAppeal` (`t_hi_admin`) | email | all S-100 recipients | appeal submitted (AC-47) | LEGACY, CHANGE recipients |
| `AppealAccepted` / `AppealRejected` | email | user | staff decision (AC-48, AC-49) | LEGACY |
| 2FA login code (`t_2fa_email_subject`) | email only (never push/SMS) | user or staff | AC-22, AC-27, AC-29, AC-30; re-auth code AC-21, AC-44 (and spec 02 AC-29, spec 14 AC-3 for accounts without a password, Q-144) | **NEW** (Q-043) |
| Many failed logins — spec 15 EV-128 `LoginSlowMode` (`t_subject_security_many_failed_logins`) | email only | user | slow mode starts (AC-53); at most once per hour | **NEW** (SEC-02, security condition before slice 01) |
| Code entry locked — spec 15 EV-129 `TwoFactorLocked` (`t_subject_security_2fa_locked`) | email only | user or staff | code lock starts (AC-54); once per lock | **NEW** (SEC-03, security condition before slice 01) |
| 2FA switched off by staff — spec 15 EV-127 `TwoFactorDisabledByStaff` (`t_subject_2fa_disabled_by_staff`) + in-app `t_2fa_disabled_by_staff` | email + in-app | user | EC-8, spec 16 AC-32 | **NEW** (Owner 2026-09-30, Q-145) |
| Referral credit to the referrer | in-app/email per spec 09 | referrer | account activated with a referral (AC-6, AC-7) | LEGACY (spec 09 owns it) |
| `Welcome` | – | – | still not sent, as in legacy | LEGACY (dead) |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_signup` | Sign up | რეგისტრაცია |
| `t_login` | Login | ავტორიზაცია |
| `t_logout` | Logout | გასვლა |
| `t_create_account` | Create account | რეგისტრაცია |
| `t_fullname` | Fullname | სახელი და გვარი |
| `t_username` | Username | მომხმარებელი |
| `t_email_address` | E-mail address | ელ-ფოსტა |
| `t_password` | Password | პაროლი |
| `t_password_confirmation` | Password confirmation | დაადასტურეთ პაროლი |
| `t_remember_me` | Remember me | დამიმახსოვრე |
| `t_forgot_password` | Forgot password? | დაგავიწყდა პაროლი? |
| `t_or` | Or | ან |
| `t_welcome_back` | Welcome back | მოგესალმებით |
| `t_terms_of_service` | Terms of service | მომსახურების წესები და პირობები |
| `t_privacy_policy` | Privacy policy | კონფიდენციალურობის პოლიტიკა |
| `t_you_must_agree_to_terms` | You must agree to the terms and privacy policy to continue. | გაგრძელებისთვის უნდა დაეთანხმოთ წესებსა და კონფიდენციალურობის პოლიტიკას. |
| `t_referral_code_invalid` | The referral code you entered is invalid or does not exist. | თქვენ მიერ შეყვანილი რეფერალური კოდი არასწორია ან არ არსებობს. |
| `t_validator_username` | username must contain only letters,numbers and underscores | მომხმარებლის სახელი უნდა შეიცავდეს მხოლოდ ლათინურ ასოებს, რიცხვებს და ქვედა ხაზებს |
| `t_validator_required` | Field required | ველის შევსება აუცილებელია |
| `t_validator_min` | Must be at least :min characters | უნდა იყოს მინიმუმ :min სიმბოლო |
| `t_validator_unique` | Value has already been taken | უკვე გამოყენებულია |
| `t_validator_recaptcha` | Failed to validate ReCaptcha | (missing in legacy ka; NEW ka) reCAPTCHA-ს შემოწმება ვერ მოხერხდა |
| `t_invalid_login_credentials_pls_try_again` | Invalid login credentials. Please try again | არასწორი ავტორიზაციის მონაცემები, გთხოვთ სცადოთ ხელახლა |
| `t_register_verification_email_sent` | We've sent and email to :email to verify your email address and activate your account. The link in the email will expire in :minutes minutes | ჩვენ გამოვაგზავნეთ შეტყობინება :email -ზე, რათა მოახდინოთ ელ-ფოსტის ვერიფიკაცია და გაააქტიუროთ მომხმარებლის პროფილი. აქტივაციის ლინკს ვადა გაუვა :minutes წუთში. |
| `t_register_verification_admin_pending` | Thank you for sign up, your account is under review now and we will notify you when it is activated | გმადლობთ დარეგისტრირებისთვის, თქვენი ანგარიში ახლა განხილვის პროცესშია. ჩვენ შეგატყობინებთ როცა ანგარიში გააქტიურდება |
| `t_verify_email` | Verify email address | ელ-ფოსტის ვერიფიკაცია |
| `t_resend_verification_email` | Resend verification email | ვერიფიკაციის შეტყობინების ხელახლა გაგზავნა |
| `t_verification_email_not_exists` | This verification link is invalid. Please request new one | ვერიფიკაციის ლინკი არასწორია, გთხოვთ მოითხოვოთ ახალი |
| `t_verification_email_link_expired` | This verification link has expired. Please request new one | ვერიფიკაციის ლინკს გაუვიდა ვადა, გთხოვთ მოითხოვოთ ახალი |
| `t_a_new_verification_link_has_been_sent_to_ur_email` | A new verification link has been sent to your email address | ახალი ბმული ვერიფიკაციისთვის გაიგზავნა თქვენი ელ-ფოსტის მისამართზე |
| `t_already_verified_user` | Your email address has already been verified. | თქვენი ელ-ფოსტის მისამართი უკვე ვერიფიცირებულია. |
| `t_ur_account_has_been_successfully_verified_email` | Your account has been successfully activated | ანგარიში წარმატებით გააქტიურდა |
| `t_reset_password` | Reset password | პაროლის განახლება |
| `t_update_password` | Update password | პაროლის განახლება |
| `t_password_reset_link_sent_success` | A password reset link has been sent to you via email | პაროლის განახლებისთვის ბმული გამოგზავნილია თქვენს ელ-ფოსტაზე |
| `t_password_reset_link_expired` | This password reset link has expired. Please try again | პაროლის განახლების ბმულს გაუვიდა ვადა. გთხოვთ სცადოთ თავიდან |
| `t_password_has_been_updated` | Password has been successfully updated | პაროლი წარმატებით განახლდა |
| `t_change_password` | Change password | პაროლის ცვლილება |
| `t_current_password` | Current password | ამჟამინდელი პაროლი |
| `t_new_password` | New password | ახალი პაროლი |
| `t_ur_current_pass_does_not_match` | Your current password does not match | პაროლი არასწორია |
| `t_ur_account_password_updated` | Your password has been successfully updated | პაროლი წარმატებით შეიცვალა |
| `t_socialite_error_email_exists` | Oops! The email address you are trying to login with, already exists in our records | ეს ელ-ფოსტის მისამართი უკვე არსებობს ჩვენს ჩანაწერებში |
| `t_google_login` | Google login | Google-ით ავტორიზაცია (legacy ka; corrected 2026-10-01, QA 3.15 F-04) |
| `t_browser_sessions` | Browser sessions | გამოყენებული მოწყობილობები |
| `t_logout_other_browser_sessions` | Logout other browser sessions | ბრაუზერის სხვა სესიებიდან გამოსვლა |
| `t_this_device` | This device | მოცემულ მომენტში სარგებლობთ ამ კონკრეტული მოწყობილობით |
| `t_toast_something_went_wrong` | Oops! Something went wrong. Please try again | მოხდა შეცდომა ! გთხოვთ სცადეთ კიდევ ერთხელ |
| `t_restrictions_removal_center` | Restrictions removal center | (missing in legacy ka; NEW ka) შეზღუდვების მოხსნის ცენტრი |
| `t_restriction_resolved` | Restriction resolved | (NEW ka) შეზღუდვა მოხსნილია |
| `t_restriction_rejected` | Rejected | (NEW ka) უარყოფილია |
| `t_restriction_submitted` | Appeal received | (NEW ka) საჩივარი მიღებულია |
| `t_restriction_read_reason` | Read more | (NEW ka) ვრცლად |
| `t_appeal_the_closure` | Appeal the closure | (NEW ka) შეზღუდვის გასაჩივრება |
| `t_type_ur_response_here` | Type your response here | (NEW ka) დაწერეთ თქვენი პასუხი აქ |
| `t_attach_a_file` | Attach a file | ფაილის მიმაგრება |
| `t_restrictions_files_allowed_info_explain` | File must be less than :size MB and allowed types are :extensions | (NEW ka) ფაილი უნდა იყოს :size მბ-ზე ნაკლები, დაშვებული ტიპებია: :extensions |
| `t_pending` | Pending | მომლოდინე |
| `t_submit` | Submit | გაგზავნა |
| Email subjects/bodies listed in "Notifications" | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_password_validation_message` (legacy value) | Password must contain at least one uppercase letter and one number. | პაროლი უნდა შეიცავდეს მინიმუმ ერთ დიდ ასოსა და ერთ ციფრს. |
| `t_account_pending_verification` | Your account is not activated yet. Please confirm your email address. | თქვენი ანგარიში ჯერ არ არის გააქტიურებული. გთხოვთ, დაადასტუროთ ელ-ფოსტის მისამართი. |
| `t_account_pending_admin_review` | Your account is under review. We will notify you when it is activated. | თქვენი ანგარიში განხილვის პროცესშია. გააქტიურებისას შეგატყობინებთ. |
| `t_account_suspended` | Your account has been suspended. Please contact support. | თქვენი ანგარიში შეჩერებულია. გთხოვთ, დაუკავშირდეთ მხარდაჭერის სამსახურს. |
| `t_account_restricted_notice` | Your account is restricted. Read the reason below and send an appeal if you disagree. | თქვენი ანგარიში შეზღუდულია. გაეცანით მიზეზს ქვემოთ და თუ არ ეთანხმებით, გააგზავნეთ საჩივარი. |
| `t_too_many_login_attempts` | Too many failed login attempts. Please try again in :minutes minutes. | ავტორიზაციის ძალიან ბევრი წარუმატებელი მცდელობა. გთხოვთ, სცადოთ :minutes წუთის შემდეგ. |
| `t_two_factor_auth` | Two-factor authentication (email) | ორსაფეხურიანი ავტორიზაცია (ელ-ფოსტით) |
| `t_two_factor_auth_hint` | When you log in from a new device, we will email you a 6-digit code. | ახალი მოწყობილობიდან შესვლისას ელ-ფოსტაზე გამოგიგზავნით 6-ნიშნა კოდს. |
| `t_2fa_enabled` | Two-factor authentication is on. | ორსაფეხურიანი ავტორიზაცია ჩართულია. |
| `t_2fa_disabled` | Two-factor authentication is off. | ორსაფეხურიანი ავტორიზაცია გამორთულია. |
| `t_2fa_enter_code_title` | Enter the verification code | შეიყვანეთ დადასტურების კოდი |
| `t_2fa_code_sent` | We sent a 6-digit code to :email. It is valid for :minutes minutes. | 6-ნიშნა კოდი გამოგზავნილია :email-ზე. კოდი მოქმედებს :minutes წუთის განმავლობაში. |
| `t_2fa_code_invalid` | The code is incorrect. | კოდი არასწორია. |
| `t_2fa_code_expired` | The code has expired. Please request a new one. | კოდს ვადა გაუვიდა. გთხოვთ, მოითხოვოთ ახალი. |
| `t_2fa_too_many_attempts` | Too many incorrect codes. Please request a new code. | ძალიან ბევრი არასწორი კოდი. გთხოვთ, მოითხოვოთ ახალი კოდი. |
| `t_2fa_resend_code` | Send a new code | ახალი კოდის გაგზავნა |
| `t_2fa_resend_wait` | You can request a new code in :seconds seconds. | ახალი კოდის მოთხოვნა შეგიძლიათ :seconds წამში. |
| `t_2fa_email_subject` | Your MyTask login code | თქვენი MyTask-ის შესვლის კოდი |
| `t_2fa_email_body` | Your login code is :code. It is valid for :minutes minutes. If you did not try to log in, change your password now. | თქვენი შესვლის კოდია :code. კოდი მოქმედებს :minutes წუთის განმავლობაში. თუ შესვლას არ ცდილობდით, დაუყოვნებლივ შეცვალეთ პაროლი. |
| `t_confirm_with_password` | Enter your current password to continue. | გასაგრძელებლად შეიყვანეთ ამჟამინდელი პაროლი. |
| `t_confirm_with_email_code` | Enter the code we sent to your email to continue. | გასაგრძელებლად შეიყვანეთ ელ-ფოსტაზე გამოგზავნილი კოდი. |
| `t_social_email_missing` | We could not get an email address from :provider. Please sign up with your email instead. | :provider-დან ელ-ფოსტის მისამართის მიღება ვერ მოხერხდა. გთხოვთ, დარეგისტრირდეთ ელ-ფოსტით. |
| `t_continue_with_provider` | Continue with :provider | გაგრძელება :provider-ით |
| `t_banned_ips` (staff) | Banned IPs | დაბლოკილი IP მისამართები |
| `t_unban_ip` (staff) | Remove ban | ბლოკის მოხსნა |

NEW keys added 2026-09-30 (security conditions before slice 01; English first, Georgian alongside, Q-058). The email subjects and bodies of EV-127…EV-129 are listed in spec 15 Texts.
| Key | en | ka |
|---|---|---|
| `t_login_slow_mode` | Too many failed login attempts on this account. Please wait :seconds seconds and try again. | ამ ანგარიშზე ავტორიზაციის ძალიან ბევრი წარუმატებელი მცდელობაა. გთხოვთ, დაელოდოთ :seconds წამს და სცადოთ ხელახლა. |
| `t_2fa_locked` | Too many incorrect codes. Code entry for this account is blocked for :minutes minutes. | ძალიან ბევრი არასწორი კოდი. ამ ანგარიშზე კოდის შეყვანა დაბლოკილია :minutes წუთით. |

## Edge cases
- EC-1 A user registers with a referral code and S-052 is OFF: the referral is credited immediately (LEGACY `RegisterComponent.php:203-205`).
- EC-2 A pending user asks for a password reset: the reset email is sent (LEGACY includes `pending`), but after resetting they still cannot log in until verified (AC-13).
- EC-3 A social-only user (no password) opens "forgot password": no email is sent (LEGACY), and the screen shows the same message. The change-password page shows the social notice instead of the form. Setting a first password for a social account is out of scope (not in legacy).
- EC-4 The lock of AC-16 is per account + IP. An attacker who rotates IPs is slowed by reCAPTCHA (S-061), by the email-code step for 2FA users, and by the per-account slow mode with its security email (AC-53, EV-128; NEW SEC-02).
- EC-5 A user changes their email (spec 02) while a reset or verification link for the old email is open: the old links stop working.
- EC-6 Staff switch S-053 from admin to email while users are pending: pending users can use "resend verification" to get a link. Staff can still activate them by hand.
- EC-7 A restricted user has an order delivered: auto-release (S-025/S-026) still runs; money moves as normal (R-A8).
- EC-8 The 2FA email does not arrive: the user can resend (AC-27). There is no backup code (email is the account identity). Staff can switch a user's 2FA off from the Admin Panel after checking identity (spec 16 AC-32, audited, with a reason); the staff member must re-authenticate first (spec 16 AC-7), and the user gets EV-127 (email + in-app). (re-login and notification NEW, Owner 2026-09-30 Q-145; permission `users.edit` = contract default pending slice item Q-132)
- EC-9 A legacy account with status `verified` is treated like `active` everywhere.
- EC-10 Mobile install deleted and reinstalled: it is a new device, so a 2FA code is asked (R-A6).
- EC-11 A social provider is disabled while users have accounts linked to it: they cannot log in with it. They can use "forgot password" only if they have a password. Otherwise support helps (spec 16).

## Out of scope
- Account settings, profile editing, email/username change and account deletion: spec 02.
- Referral points and codes: spec 09. Admin screens for users, staff roles and permissions: spec 16. The contact form's reCAPTCHA: spec 17.
- SMS or authenticator-app 2FA (vision: SMS later; not requested).
- Token formats and lifetimes (ADR-002), password-hash algorithm choice (ADR-002), reCAPTCHA mobile mechanism (ADR-002).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-14 Password rule everywhere.** The register rule (8–60, one uppercase letter, one digit) also applies to reset and change. Legacy allowed 6+ there. Existing passwords keep working.
- **P-15 2FA details.** (a) A code is asked when the **device** is new or its 30-day trust has expired. A new IP on a trusted device does not ask for a code. This is the same recommendation as ADR-002 (question 2 in the P2-B1 handoff): mobile phones change IP often, so "new IP" would ask for codes very often. ACCEPTED with the Owner adjustment (Q-082): new unrecognized device is the default, and the behaviour is admin-configurable (S-124: `new_device` / `new_device_or_ip`). (b) Trusted devices are forgotten when 2FA is switched off or the password changes. (c) Resend: 60 s cooldown, at most 5 codes per 15 min. (d) Switching 2FA on or off needs the current password (or an email code for social-only accounts). (e) 2FA also applies to social logins.
- **P-16 Clear status messages and instant ban.** After a correct password, pending and banned users see a clear message (legacy showed "something went wrong"). A ban ends all sessions of that user at once (legacy only blocked new logins).
- **P-17 Social sign-ups get a referral code, and a `?ref=` link also works for social sign-ups.** Legacy social accounts never got a referral code, so they could not invite anyone.
- **P-19 Email-sending limits.** At most 3 reset/verification emails per email address and per IP per hour. The on-screen answer never changes.
- **P-20 Banned-IP screen.** Staff with the security permission can list, remove and add banned IPs. Legacy had no screen, so a mistaken ban (for example the Owner's own IP) needed a database edit.
(P-18 is in spec 02.)

Applied on 2026-09-30 (no new questions): Owner gate answers **Q-144** (emailed code for accounts without a password; withdrawal pause after password changes) and **Q-145** (re-login before staff switch off a user's 2FA; user notified, EV-127); security conditions before slice 01 (AC-53…AC-55, AC-41 note; EV-128, EV-129). Still open for this slice: Q-130, Q-132 (contract defaults apply).
