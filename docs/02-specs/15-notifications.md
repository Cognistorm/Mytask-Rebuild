# 15 — Notifications (catalogue, channels, notification centre, preferences, push)
Status: **approved** (Owner 2026-09-29; P-106…P-113 accepted)
Updated 2026-09-30 with Owner gate answers and the security conditions before slice 01: P-135 triggers of EV-32/EV-125 accepted (Q-111); NEW EV-126 portfolio item rejected (Q-117), EV-127 2FA switched off by staff (Q-145), EV-128 many failed logins (SEC-02), EV-129 code entry locked (SEC-03); EV-06 also carries the re-authentication codes for accounts without a password (Q-144 / SEC-05). Catalogue total 129 events, 46 NEW.
Author: product-analyst (P2-A5) | Date: 2026-09-29
Legacy reference: `docs/01-discovery/notifications.md` (every email class, every in-app text key, every direct mailable: all accounted for below); `features.md` BR-120; `risks-and-debt.md`; `roles-and-permissions.md` ("System admin inbox"). Owner decisions: Q-013, Q-016, Q-026, Q-033, Q-036, Q-043, Q-058, Q-065, Q-066, Q-076, Q-100, Q-103. Platform rules: `00-platform-rules.md` §4.15 (S-100 `notifications.admin_recipients`, S-101 `notifications.push.enabled`, S-102 `notifications.sms.enabled`), S-043/S-044 (renewal reminder), X-01, X-06, X-07, X-11, X-18; ACCEPTED P-11 (push). Specs 01–14 (each owns the trigger of its notifications; this spec does not repeat their ACs), 16 (admin screens), 17 (content notifications). ADR-007 §8–§12 (NotificationService, channels, catalogue test), ADR-006 §2 (user locale), data-model §1 ("Writes that must notify": outbox) and §3.O (`notifications`, `push_tokens`, `notification_preferences`, `notification_deliveries`), url-map §7.2 (deep links, email links).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **ACCEPTED** (P-106…P-113, see "Open questions").

Legacy code traced for this spec (read-only):
- In-app helper `app/Utils/Helper/helpers.php:1530-1553` (`notification()` stores `user_id`, text key, action URL, params).
- Header bell `app/Livewire/Main/Includes/Header.php:59` (loads **unread only**), `:231-240` (`readNotification` = mark one as read; the item disappears, there is no history); view `resources/views/livewire/main/includes/header.blade.php:1` renders `{!! __('messages.' . $n->text, $n->params) !!}` (**unescaped HTML with user-supplied params**), button `t_mark_as_read`, empty text `t_no_notification_right_now`.
- Email locale: most classes use `->locale(config('app.locale'))` (e.g. `Admin/Users/UsersComponent.php:1` activate, `Help/Contact/ContactComponent.php:133`); renewal forced `ka` (`Console/Commands/ProcessSubscriptionPayments.php:215`); offline chat email in app locale (`Chat/MessagesController.php:282`).
- Admin recipient: `Admin::first()` at 24 call sites (e.g. `ContactComponent.php:133`, `Blog/ArticleComponent.php:208`, `System/MaintenanceComponent.php:124`).
- Maintenance email carries the bypass secret (`MaintenanceComponent.php:104-124`).
- Direct mailables `app/Mail/Admin/{Newsletter/SendEmail, Settings/TrySmtp, Support/Reply, Users/RestrictEmail, Users/SendEmail}.php`, `app/Mail/User/Everyone/{NewsletterVerification, NewsletterApproved}.php`.
- No unsubscribe or preference feature exists anywhere in legacy (search for "unsubscribe" finds only vendor JavaScript).

---

## Goal
One catalogue that says, for every event on the platform, who is told, on which channel (email, in-app, push, SMS-ready) and with which text — keeping every notification the old platform sends (CLAUDE.md), adding the NEW ones decided in specs 01–14, and delivering them in the recipient's language, with the current logo, through SendGrid. Users get a notification centre on web and mobile, and can switch off the few notifications that are not transactional or security-related.

## Roles involved
- **User** (both roles): receives emails, in-app notifications and push; manages preferences.
- **Guest / subscriber**: receives newsletter double opt-in emails (spec 17) and contact-form replies.
- **Admin recipients**: every address in S-100 (default `ir.gvazava@gmail.com`, Q-026) receives admin notifications. They need not be staff accounts.
- **Staff**: 2FA code, staff invitation (spec 16); staff with `system.health.read` see delivery failures (spec 16).
- **System**: NotificationService, outbox dispatcher, email/push workers, SMS interface (OFF).

## User stories
- As a freelancer, I want an email and a push notification when a buyer pays, so that I can start work at once.
- As a buyer, I want to see every past notification in one list, not only the unread ones, so that I can find an old delivery link.
- As a Georgian user, I want emails in Georgian even if someone else triggered them in English.
- As a user, I want to stop emails about new projects in my category without losing order and payment emails.
- As the Owner, I want admin emails to reach several addresses, so that nothing waits for one inbox (Q-026).
- As the Owner, I want to be sure no legacy notification was lost in the rebuild (vision "Must NOT break").

## Acceptance criteria

### Catalogue and delivery (ADR-007 §8)
- AC-1 Given any event in the catalogue matrix below, When it occurs, Then exactly the listed recipients get exactly the listed channels with the listed template and text keys; no other notification is sent. A catalogue test fails the build if a legacy row marked "kept" or "merged" has no catalogue entry, or if an entry has no template in both `ka` and `en`. (NEW, ADR-007 §8)
- AC-2 Given the business action that triggers a notification is rolled back (validation error, failed payment, lost race), When the request ends, Then no email, push or in-app row is produced; notifications are dispatched only from committed outbox events. (CHANGE, fixes D-15-5; data-model §1)
- AC-3 Given the same event is processed twice (retry, callback replay, double click), When it is dispatched, Then each recipient gets at most one in-app row, one email and one push for it. (CHANGE, fixes D-15-6: legacy sent `SubscriptionConfirmation` twice for points, `SubscriptionController.php:60,106`)
- AC-4 Given an email or push send fails at the provider, When the worker retries, Then it retries up to 5 times with growing delays (about 1 minute to 1 hour); each attempt and the final status (`sent`, `failed`, `suppressed`) is recorded in the delivery log (kept 90 days). A failure on one channel never stops the other channels or the business action. (NEW ADR-007 §9, ACCEPTED P-109)
- AC-5 Given a notification links to an item, When the in-app row is stored, Then it stores the locale-free target path (url-map §7.2); web adds the reader's `/en/` prefix when needed and mobile opens the matching screen. (NEW ADR-007, data-model §3.O)

### Email (SendGrid, Q-033; logo Q-076)
- AC-6 Given a user notification email, When it is rendered, Then subject and body use the **recipient's** saved language (`ka` or `en`); if none is saved, `ka`. The language of the person who triggered the event does not matter. (CHANGE, fixes D-15-2: legacy used the site language, and forced `ka` for renewals)
- AC-7 Given an admin notification, When it is sent, Then one separate email goes to each address in S-100 (recipients never see each other's addresses), rendered in the default language S-103 (`ka`). (CHANGE Q-026, X-18; language ACCEPTED P-109)
- AC-8 Given any email, When it is rendered, Then it uses the current MyTask logo (Q-076) and design tokens, has an HTML and a plain-text part, a footer with Terms, Privacy and Contact links (spec 17) and the reason line `t_email_footer_reason`; emails of switchable categories (AC-27) also carry `t_email_footer_optout` with a one-click link (AC-30) and a `List-Unsubscribe` header. (CHANGE Q-076; NEW footer P-106)
- AC-9 Given an email contains a link, When it is built, Then it is an https link to `mytask.ge` with the recipient's language prefix (url-map §7.2), which opens the app when installed and the website otherwise. (NEW url-map §7.2)
- AC-10 Given the environment, When emails are sent, Then staging/production use SendGrid through the API key in `.env` (`SENDGRID_API_KEY`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, names only in `.env.example`), and local development delivers every email to Mailpit; no email leaves a local machine. (Q-033, Q-042; ADR-007 §9, CLAUDE.md rule 7)
- AC-11 Given SendGrid reports a hard bounce or spam complaint for an address, When the event webhook arrives, Then the address is marked undeliverable on the user, later non-security emails to it are recorded as `suppressed`, and staff see a warning on the user page (spec 16). Security emails (verification, password reset, 2FA, email change, and the security notices EV-127…EV-129) are still attempted. The mark is cleared when the user changes or re-verifies the email. (NEW, ACCEPTED P-109)

### In-app notification centre (web and mobile)
- AC-12 Given a logged-in user, When any page (web header) or the app (bell icon on the main tab bar screens) is shown, Then the bell shows the number of unread notifications (99+ above 99) and updates in real time when a new one arrives. (LEGACY bell, realtime NEW ADR-007)
- AC-13 Given the user opens the bell (web: dropdown with the 10 newest and "See all"; `/account/notifications` full page; mobile: Notifications screen), When the list loads, Then it shows read and unread notifications, newest first, 20 per page (cursor): the text rendered from its key and parameters in the reader's **current** language, relative time (absolute on hover), and an unread dot. Empty: `t_no_notification_right_now`. (CHANGE: legacy showed unread only, D-15-4; ACCEPTED P-107)
- AC-14 Given a notification in the list, When the user taps it, Then it is marked read and the target opens (web page, or app screen). "Mark as read" on one item (`t_mark_as_read`, LEGACY) and "Mark all as read" (`t_mark_all_as_read`, NEW) are also available; the unread count updates on every open tab and device. (LEGACY + NEW P-107)
- AC-15 Given a notification parameter contains HTML or script (e.g. a gig title `<b>x</b>`), When it is shown, Then it is displayed as plain text; no notification text is ever rendered as HTML. (CHANGE, fixes D-15-3)
- AC-16 Given the target no longer exists or the user lost access (gig deleted, project hidden), When the user taps the notification, Then it is marked read and the destination shows its normal not-found or empty state; the app does not crash. (NEW)
- AC-17 Given an in-app notification older than 12 months, When the nightly clean-up runs, Then it is deleted. (NEW, ACCEPTED P-107, same window as Q-100)
- AC-18 Given the legacy migration, When it runs, Then only legacy in-app notifications of the last 12 months are imported (Q-100): text key → `text_key`, params → JSON, action URL rewritten to the new path (url-map §10), `is_seen` → `read_at`. Rows whose key belongs to a removed feature (`t_u_became_a_seller`, `t_reject_milestone`, `t_subject_employer_freelancer_requested_a_milestone`, `t_u_have_new_message_from_username`, `t_notification_username_has_accpted_ur_offer`, `t_notification_username_has_rejected_ur_offer`) are not imported; rows with a merged key are imported under the key they merge into. (Q-100; mapping ACCEPTED P-107)

### Push (NEW, P-11; ADR-007 §9)
- AC-19 Given S-101 is ON and a user is logged in to the mobile app, When the app first reaches the home screen after login, Then it shows a short explanation (`t_push_permission_title`, `t_push_permission_body`) with "Allow" and "Not now" before the system permission dialog; "Not now" asks again at most once every 30 days, and Account → Notifications has a "Turn on push notifications" link to the device settings. (NEW, ACCEPTED P-108)
- AC-20 Given the user allows push, When the app registers, Then the API stores one token per app installation (user, installation id, platform, token, language, app version, last seen); if another user logs in on the same installation, the token moves to that user. (NEW, data-model §3.O `push_tokens`)
- AC-21 Given the user logs out in the app, When logout completes, Then the token of that installation is removed. Given the account is banned, deleted or all sessions are ended by the user or staff, Then all its tokens are removed. (NEW P-108)
- AC-22 Given Expo reports a token as no longer registered, When the receipt is processed, Then the token is disabled; tokens not seen for 90 days are removed. (NEW ADR-007 §9, P-108)
- AC-23 Given an event whose trigger spec lists push, When it fires and S-101 is ON and the user has at least one token and has not switched push off for that category, Then a push is sent to each installation with: title `t_push_title_default` (MyTask), body = the in-app text of the event in the language stored on the token, and the target path; chat pushes use `t_push_new_message` without the message text (spec 08 AC-24); 2FA codes are never pushed. Pushes of the same target collapse into one (chat: per conversation). (NEW P-11, ACCEPTED P-108)
- AC-24 Given a push is tapped, When the app opens, Then it opens the target screen; if the user is logged out, the login screen opens first and then the target. (NEW url-map §7.2)
- AC-25 Given S-101 is OFF, When any event fires, Then no push is sent; tokens are kept, so pushes resume when S-101 is switched back ON. The app icon badge (iOS, supported Android launchers) shows unread notifications plus conversations with unseen messages. (NEW P-11, badge ACCEPTED P-108)

### SMS-ready (S-102, vision "SMS: none")
- AC-26 Given S-102 is OFF (default), When any event fires, Then nothing is sent by SMS; the SMS channel exists only as an interface with a no-op provider, and no catalogue event is mapped to SMS at launch (the matrix marks candidate events `o`). Given a staff member tries to switch S-102 ON while no SMS provider is configured, Then the save is refused with `t_sms_provider_not_configured`. 2FA codes are email only (spec 01) and are marked `×` (never SMS). (NEW, ADR-007 §9)

### Preferences (ACCEPTED P-106; ADR-007 §12)
- AC-27 Given Account settings → Notifications (web `/account/settings/notifications`; mobile Account → Notifications), When it opens, Then it lists the switchable categories with an Email and a Push switch each: **Messages** (offline chat email EV-48, chat push EV-49), **New projects in my categories** (EV-56; email only), **Reviews** (EV-47), **Referral points** (EV-55; push only). Below them, a locked "Always on" group explains that order, payment, account and security notifications cannot be turned off (`t_notification_category_locked_hint`). In-app notifications are always created. (NEW P-106)
- AC-28 Given a user switched a category's channel off, When an event of that category fires, Then that channel is not sent (delivery log `suppressed`, reason "preference"); the in-app row is still created. (NEW P-106)
- AC-29 Given a new or migrated user, When they have not changed anything, Then every switch is ON (legacy sends everything). (P-106)
- AC-30 Given an email of a switchable category, When the recipient clicks the footer link or uses the mail client's unsubscribe, Then, without logging in (signed link valid 30 days), that category's email switch is turned off and `t_unsubscribed_success` is shown with a link to the preferences page. (NEW P-106)

### Admin notifications (Q-026)
- AC-31 Given any admin notification in the matrix (category A), When it fires, Then it goes to every address in S-100 (AC-7); S-100 must keep at least one valid address (00 EC-9) and invalid addresses are refused at save; every change of S-100 is audited and triggers EV-124 to both the old and the new list. (CHANGE Q-026, X-18; alert ACCEPTED P-111)
- AC-32 Given a staff member with `settings.notifications.write` on the S-100 screen, When they press "Send test email" (EV-121) and enter an address, Then a test email is sent through the live transport and the result (sent / failed with the provider message) is shown. (LEGACY `SmtpComponent.php:296`; CHANGE: tests SendGrid from `.env`, not admin-entered SMTP credentials, P-113)

### Rate limits and throttles
- AC-33 Given the existing throttles, When events repeat, Then they apply unchanged: offline chat email once per 10 minutes per sender → recipient (BR-120, spec 08 AC-23); refund-thread emails per spec 13 P-101; 2FA resend wait (spec 01); verification and password-reset resend limits (spec 01); contact form and newsletter sign-up limits (spec 17). (LEGACY + earlier specs)
- AC-34 Given a user would receive more than 30 emails or more than 60 pushes within one hour (all categories except security), When the next one fires, Then it is not sent (delivery log `suppressed`, reason "rate cap"), its in-app row is still created, and staff can see the suppression in the delivery log. Security emails are never capped. (NEW safety cap, ACCEPTED P-110)

### Removed and merged items
- AC-35 Given any legacy item marked **removed** in the accounting tables, When the platform runs, Then that notification is never sent and its template does not exist in the catalogue. (00 AC-26)
- AC-36 Given any legacy item marked **merged**, When its event happens, Then only the target notification is sent (one notification per event, not two). (CHANGE, fixes D-15-7)

### Maintenance, staff and system notices (spec 16)
- AC-37 Given a staff member switches S-121 maintenance mode ON, When it is saved, Then `Admin/SiteIsDown` goes to every S-100 address with who switched it on and when; it contains no bypass secret (staff preview the public site from their admin session, spec 16). (LEGACY E-18; CHANGE P-112, fixes D-15-8)
- AC-38 Given a staff account is created, When it is saved, Then the invitation email (EV-123) with a single-use set-password link valid 48 hours goes to the staff member's address. (NEW, spec 16, ACCEPTED P-111)
- AC-39 Given a timer job (auto-release, award expiry, refund auto-reject, renewal, reminder, offer expiry) has not finished successfully for 15 minutes, or more than 20% of emails failed in the last hour, When the health check runs (every 5 minutes), Then EV-125 goes to S-100, at most once per problem per hour. (NEW, spec 16, ACCEPTED P-111)

---

## Catalogue matrix
One row per event. Legend — **E** email, **I** in-app, **P** push (NEW P-11; only when S-101 is ON), **SMS** column: `o` = SMS-ready, OFF (S-102), `×` = never by SMS, `–` = not applicable (admin email recipients). **Cat** (preference category): **S** security (always on), **T** transactional (always on), **O-msg / O-proj / O-rev / O-ref** switchable (AC-27), **A** admin (to all S-100 addresses). **Status**: kept / NEW (NEW = new event; channel or recipient changes on a kept event are noted in the row). "Covers" lists the legacy inventory IDs of the accounting tables (E = email class, I = in-app key, M = direct mailable). Template = email class (legacy name kept) with its subject key; in-app/push text = the `t_*` key.

### A. Accounts, security, profiles (specs 01, 02)
| # | Event (trigger) | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-01 | Registration or "resend verification" | user | ✓ | – | – | o | `VerifyEmail` `t_subject_everyone_verify_ur_email` | E-56 | kept | S | 01 AC-4, AC-9 |
| EV-02 | Registration with admin verification (S-053 = admin); switch S-131, at most S-132 per hour (Q-159) | S-100 | ✓ | – | – | – | `Admin/PendingUser` `t_subject_admin_pending_user` | E-13 | kept (CHANGE recipients) | A | 01 AC-5 |
| EV-03 | Staff activate a pending user | user | ✓ | – | – | o | `AccountActivated` `t_subject_everyone_ur_account_activated` | E-39 | kept | S | 01 AC-5 |
| EV-04 | Password reset requested | user | ✓ | – | – | o | `PasswordReset` `t_subject_everyone_reset_ur_password` | E-48 | kept | S | 01 AC-32 |
| EV-05 | Password changed or reset completed | user | ✓ | – | – | o | `PasswordChanged` `t_subject_everyone_password_changed` | E-47 | kept | S | 01 AC-33, AC-35 |
| EV-06 | Login or re-authentication needs a 2FA code; also the emailed confirmation code of an account without a password for an email change, payout details or "log out other sessions" (sent to the **current** address, Q-144 / SEC-05) | user or staff | ✓ | – | – | × | `TwoFactorCode` `t_2fa_email_subject`, `t_2fa_email_body` | – | **NEW** (Q-043) | S | 01 AC-21, AC-22, AC-27, AC-29, AC-30, AC-44; 02 AC-29; 14 AC-3 |
| EV-07 | Staff restrict a user | user | ✓ | – | – | o | `RestrictEmail` (direct mailable) `t_subject_admin_account_restricted` | M-5 | kept | S | 01 AC-46 |
| EV-08 | Restriction appeal submitted | S-100 | ✓ | – | – | – | `Admin/NewRestrictionAppeal` `t_hi_admin` | E-07 | kept (CHANGE recipients) | A | 01 AC-47 |
| EV-09 | Appeal accepted | user | ✓ | – | – | o | `AppealAccepted` `t_subject_user_appeal_accepted` | E-40 | kept | S | 01 AC-48 |
| EV-10 | Appeal rejected | user | ✓ | – | – | o | `AppealRejected` `t_subject_user_appeal_rejected` | E-41 | kept | S | 01 AC-49 |
| EV-11 | Email change requested: confirm the new address | user (new address) | ✓ | – | – | × | `EmailChangeConfirm` `t_email_change_confirm_subject` | – | **NEW** (P-18) | S | 02 AC-30 |
| EV-12 | Email changed: notice to the old address | user (old address) | ✓ | – | – | × | `EmailChangeNotice` `t_email_change_notice_subject`, `t_email_change_notice_body` | – | **NEW** (P-18) | S | 02 AC-30 |
| EV-13 | Profile reported | S-100 | ✓ | – | – | – | `Admin/ProfileReported` `t_subject_admin_profile_reported` | E-15 | kept (CHANGE recipients) | A | 02 AC-14 |
| EV-14 | Portfolio item enters pending review (S-071 OFF; not repeated for edits while pending, Q-166) | S-100 | ✓ | – | – | – | `Admin/PendingPortfolio` `t_subject_admin_pending_portfolio` | E-12 | kept | A | 02 AC-25 |
| EV-15 | Portfolio item published | owner | ✓ | ✓ | ✓ | o | `PortfolioPublished` `t_subject_seller_portfolio_published`; `t_ur_portfolio_title_has_been_published` | E-74, I-47 | kept (push NEW) | T | 02 AC-26 |
| EV-16 | KYC verification submitted | S-100 | ✓ | – | – | – | `Admin/NewIdVerificationPending` `t_verification_center` | E-04 | kept | A | 02 AC-36 |
| EV-17 | KYC approved | user | ✓ | ✓ | ✓ | o | `VerificationApproved` `t_subject_everyone_verification_approved`; `t_ur_account_has_verified` | E-54, I-48 | kept (push NEW) | T | 02 AC-37 |
| EV-18 | KYC declined | user | ✓ | ✓ | ✓ | o | `VerificationDeclined` `t_subject_everyone_verification_declined`; `t_verification_files_declined` | E-55, I-49 | kept (push NEW) | T | 02 AC-37 |
| EV-126 | Portfolio item rejected by staff, with the reason (added 2026-09-30) | owner | ✓ | ✓ | ✓ | o | `PortfolioRejected` `t_subject_seller_portfolio_rejected`, body `t_portfolio_rejected_email_body`; `t_ur_portfolio_title_has_been_rejected` | – | **NEW** (Owner 2026-09-30, Q-117) | T | 02 AC-42; 16 AC-21 |
| EV-127 | Staff switched off the user's 2FA (added 2026-09-30) | user | ✓ | ✓ | – | × | `TwoFactorDisabledByStaff` `t_subject_2fa_disabled_by_staff`, body `t_2fa_disabled_by_staff_email_body`; `t_2fa_disabled_by_staff` | – | **NEW** (Owner 2026-09-30, Q-145; SEC-06) | S | 16 AC-32; 01 EC-8 |
| EV-128 | Login slow mode starts: 20 failed logins for the account within one hour, from any IPs; at most once per hour (added 2026-09-30) | user | ✓ | – | – | × | `LoginSlowMode` `t_subject_security_many_failed_logins`, body `t_security_many_failed_logins_body` | – | **NEW** (SEC-02; ADR-002 §6; security condition before slice 01) | S | 01 AC-53 |
| EV-129 | Code entry locked: 10 wrong 2FA codes for the account within one hour across all challenges; once per lock (added 2026-09-30) | user or staff | ✓ | – | – | × | `TwoFactorLocked` `t_subject_security_2fa_locked`, body `t_security_2fa_locked_body` | – | **NEW** (SEC-03; ADR-002 §5; security condition before slice 01) | S | 01 AC-54 |

### B. Gigs (spec 04)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-19 | Gig created or edited while S-070 is OFF | S-100 | ✓ | – | – | – | `Admin/PendingGig` `t_subject_admin_pending_gig` | E-09 | kept (CHANGE recipients) | A | 04 AC-16, AC-22 |
| EV-20 | Staff publish a gig | owner | ✓ | ✓ | ✓ | o | `GigPublished` `t_subject_everyone_ur_gig_published`; `t_ur_gig_title_has_been_published` | E-44, I-45 | kept (push NEW) | T | 04 AC-17 |
| EV-21 | Staff reject a gig | owner | ✓ | ✓ | ✓ | o | `YourGigNeedsChanges` `t_subject_freelancer_ur_gig_needs_changes`; `t_ur_gig_needs_changes_rejected_admin` | E-67, I-46 | kept (push NEW) | T | 04 AC-18 |
| EV-22 | Gig reported | S-100 | ✓ | – | – | – | `Admin/GigReported` `t_subject_admin_gig_reported` | – | **NEW** (P-36) | A | 04 AC-38 |

### C. Payments and wallet (spec 05)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-23 | Top-up credited (card or confirmed bank transfer) | user | – | ✓ | ✓ | o | `t_wallet_topped_up` | – | **NEW** (P-43) | T | 05 AC-23, AC-26 |
| EV-24 | Bank-transfer gig order created (only while S-021 is ON) | S-100 | ✓ | – | – | – | `Admin/PendingOfflinePayment` `t_notification_admin_pending_offline_payment` | E-11 | kept | A | 05 AC-24 |
| EV-25 | Staff confirm a bank transfer for an order | buyer | – | ✓ | ✓ | o | `t_ur_payment_has_been_received_offline` | I-03 | kept (push NEW) | T | 05 AC-25 |
| EV-26 | Staff reject a bank transfer for an order | buyer | ✓ | ✓ | ✓ | o | `BankTransferRejected` `t_bank_transfer_rejected` | – | **NEW** (P-42) | T | 05 AC-25 |
| EV-27 | Staff reject a bank top-up | user | ✓ | ✓ | ✓ | o | `DepositRejected` `t_subject_everyone_recent_deposit_rejected`; in-app `t_deposit_rejected_inapp` | E-43 | kept (in-app NEW, spec 05) | T | 05 AC-26 |
| EV-28 | Billing information saved | user | ✓ | – | – | o | `BillingInfoUpdated` `t_subject_everyone_billing_info_updated` | E-42 | kept | T | 05 AC-36 |
| EV-29 | Unapplied payment credited to the wallet | buyer | ✓ | ✓ | ✓ | o | `PaymentCreditedToWallet` `t_payment_credited_to_wallet` | – | **NEW** (P-40) | T | 05 AC-15 |
| EV-30 | Staff balance adjustment | user | – | ✓ | ✓ | o | `t_balance_adjusted` | – | **NEW** (P-41) | T | 05 AC-41 |
| EV-31 | Staff points grant or deduction | user | – | ✓ | ✓ | o | `t_points_adjusted` | – | **NEW** (P-41) | T | 05 AC-43; 09 |
| EV-32 | Nightly ledger/BOG reconciliation run ends with 1 or more differences (once per run, `:count` = differences, `:date` = run day) | S-100 | ✓ | – | – | – | `Admin/ReconciliationDifference` `t_subject_admin_reconciliation_difference` | – | **NEW** (ADR-003 §10) | A | 05 AC-46 (run: AC-44, checks: AC-45, report: AC-47; ACCEPTED P-135, added 2026-09-29 for gap G-1, Owner 2026-09-30 Q-111) |

### D. Gig orders (spec 06)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-33 | Order item paid (wallet, card, confirmed bank transfer) | freelancer | ✓ | ✓ | ✓ | o | `Seller/PendingOrder` `t_subject_seller_pending_order`; `t_u_received_new_order_seller` | E-72, I-01, I-02 (merged) | kept | T | 06 AC-10 |
| EV-34 | Order paid (any method) | buyer | ✓ | – | – | o | `Buyer/OrderPlaced` `t_subject_buyer_order_has_placed` | E-24 | kept (CHANGE all methods, P-52) | T | 06 AC-10 |
| EV-35 | Card payment verified | S-100 | ✓ | – | – | – | `Admin/NewPayment` `t_new_online_payment` | E-05 | kept (CHANGE timing P-52, recipients) | A | 06 AC-10 |
| EV-36 | Buyer sends or edits order details | freelancer | – | ✓ | ✓ | o | `t_buyer_sent_order_details` | – | **NEW** (P-48) | T | 06 AC-15 |
| EV-37 | Freelancer starts the order | buyer | ✓ | ✓ | ✓ | o | `Buyer/OrderItemInProgress` `t_subject_buyer_order_item_in_progress`; `t_seller_has_started_ur_order` | E-23, I-04 | kept | T | 06 AC-17 |
| EV-38 | Freelancer cancels | buyer | ✓ | ✓ | ✓ | o | `Buyer/OrderItemCanceled` `t_subject_buyer_order_canceled`; `t_seller_has_canceled_ur_order` | E-21, I-06 | kept | T | 06 AC-19 |
| EV-39 | Buyer cancels | freelancer | ✓ | ✓ | ✓ | o | `Seller/OrderItemCanceled` `t_subject_seller_order_item_canceled`; `t_buyer_has_canceled_order` | E-70, I-07 | kept | T | 06 AC-18 |
| EV-40 | Delivery or re-delivery | buyer | ✓ | ✓ | ✓ | o | `Buyer/OrderDelivered` `t_subject_buyer_order_delivered`; `t_seller_has_delivered_ur_order` | E-20, I-05 | kept (text gains auto-complete date) | T | 06 AC-22 |
| EV-41 | Buyer requests a revision (gig order) | freelancer | ✓ | ✓ | ✓ | o | `RevisionRequested` `t_subject_seller_revision_requested`; `t_buyer_requested_revision` | – | **NEW** (Q-056) | T | 06 AC-26 |
| EV-42 | Buyer completes | freelancer | ✓ | ✓ | ✓ | o | `Seller/OrderItemCompleted` `t_subject_seller_order_item_completed`; `t_order_id_completed` | E-71, I-09 | kept | T | 06 AC-30 |
| EV-43 | Buyer completes | buyer | ✓ | – | – | o | `Buyer/OrderItemCompleted` `t_subject_buyer_order_item_completed_thanks` | E-22 | kept | T | 06 AC-30 |
| EV-44 | Automatic completion (auto-release) | freelancer and buyer | ✓ | ✓ | ✓ | o | `OrderAutoCompleted` `t_subject_order_auto_completed`; `t_order_auto_completed_seller` / `t_order_auto_completed_buyer` | – | **NEW** (Q-051, P-52) | T | 06 AC-33 |
| EV-45 | Buyer writes in the delivery thread | freelancer | ✓ | ✓ | ✓ | o | `Seller/DeliveredWorkNewMessage` `t_subject_seller_delivered_work_new_msg`; `t_buyer_sent_u_message_about_delivered_files` | E-68, I-08 | kept | T | 06 AC-40 |
| EV-46 | Freelancer writes in the delivery thread | buyer | – | ✓ | ✓ | o | `t_seller_sent_u_message_about_order` | – | **NEW** (P-52) | T | 06 AC-40 |

### E. Reviews (spec 07) and messaging (spec 08)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-47 | New review | reviewed user (freelancer or buyer/client) | ✓ | ✓ | ✓ | o | `Seller/ReviewReceived` `t_subject_seller_new_review`; `t_u_have_received_new_rating` | E-77, I-10 | kept (CHANGE Q-062 also to buyers) | O-rev | 07 AC-9 |
| EV-48 | Direct message to a recipient with no open connection (≤ 1 per 10 min per pair) | recipient | ✓ | – | – | o | `NewMessage` `t_subject_everyone_u_have_new_message` | E-46 | kept (CHANGE recipient language) | O-msg | 08 AC-23 |
| EV-49 | Direct message while the app is not in the foreground | recipient | – | – | ✓ | × | `t_push_new_message` (no message text) | – | **NEW** (P-68) | O-msg | 08 AC-24 |

### F. Subscriptions, points, referrals (spec 09)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-50 | Premium activated (card, points, 100% promo, gift, referral benefit) | user | ✓ | ✓ | ✓ | o | `SubscriptionConfirmation` `t_subject_subscription_confirmation`; `t_subscription_activated_message` | E-52, I-54 | kept (sent once, fixes D-15-6) | T | 09 AC-4, AC-8, AC-26, AC-30, AC-35 |
| EV-51 | Renewal charge verified | user | ✓ | ✓ | ✓ | o | `SubscriptionRenewed` `t_subject_subscription_renewed`; `t_subscription_updated_message` | E-53, I-55 | kept (CHANGE user language) | T | 09 AC-10 |
| EV-52 | S-043 days (3) before the renewal charge | user | ✓ | ✓ | (S-044) | o | `SubscriptionRenewalReminder` `t_subject_subscription_renewal_reminder`; `t_subscription_renewal_reminder` | – | **NEW** (Q-019, Q-066): channels = S-044, default email + in-app; push only if staff add it to S-044 | T | 09 AC-14 |
| EV-53 | Renewal charge failed | user | ✓ | ✓ | ✓ | o | `SubscriptionRenewalFailed` `t_subject_subscription_renewal_failed`; `t_subscription_renewal_failed` | – | **NEW** (P-57) | T | 09 AC-11 |
| EV-54 | Subscription cancelled (user or staff) | user | ✓ | – | – | o | `SubscriptionCancelled` `t_subject_subscription_cancelled` | E-51 | kept | T | 09 AC-16, AC-36 |
| EV-55 | Referral points credited | referrer | – | ✓ | ✓ | o | `t_referral_points_earned` | – | **NEW** (P-61) | O-ref | 09 AC-23, AC-24 |

### G. Projects (spec 10)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-56 | Project first becomes active | eligible freelancers of the linked category | ✓ | – | – | o | `NewProjectInCategory` `t_new_project_in_your_category` | E-62 | kept (CHANGE timing, recipients, language, P-76) | O-proj | 10 AC-19 |
| EV-57 | Project posted or edited while S-072 is OFF | S-100 | ✓ | – | – | – | `Admin/PendingProject` `t_subject_admin_pending_project` | – | **NEW** (P-77) | A | 10 AC-11 |
| EV-58 | Staff approve a project | owner | ✓ | ✓ | ✓ | o | `YourProjectApproved` `t_subject_employer_project_approved`; `t_ur_project_title_has_been_approved` | E-37 | kept (in-app + push NEW, P-77) | T | 10 AC-12 |
| EV-59 | Staff reject a project | owner | ✓ | ✓ | ✓ | o | `YourProjectRejected` `t_subject_employer_project_needs_changes`; `t_ur_project_needs_changes` | E-38 | kept (in-app + push NEW, P-77) | T | 10 AC-13 |
| EV-60 | Project reported | S-100 | ✓ | – | – | – | `Admin/ProjectReported` `t_subject_admin_project_reported` | E-16 | kept (CHANGE recipients) | A | 10 AC-22 |

### H. Proposals and hiring (spec 11)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-61 | Proposal becomes active | client | ✓ | ✓ | ✓ | o | `NewBidReceived` `t_subject_everyone_u_received_new_bid`; `t_u_received_new_bid_on_ur_project` | E-45, I-27 | kept (CHANGE not on edits, P-83) | T | 11 AC-6, AC-9 |
| EV-62 | Proposal pending approval (S-073 OFF) | S-100 | ✓ | – | – | – | `Admin/BidPendingApproval` `t_notification_admin_bid_pending_approval` | E-01 | kept (CHANGE recipients) | A | 11 AC-6, AC-12 |
| EV-63 | Staff approve a proposal | freelancer | ✓ | ✓ | ✓ | o | `YourBidApproved` `t_subject_everyone_ur_bid_approved`; `t_ur_bid_approved` | E-57 | kept (in-app + push NEW, P-83) | T | 11 AC-9 |
| EV-64 | Staff reject a proposal | freelancer | ✓ | ✓ | ✓ | o | `YourBidRejected` `t_subject_everyone_ur_bid_needs_changes`; `t_ur_bid_rejected` | E-58 | kept (in-app + push NEW, P-83) | T | 11 AC-9 |
| EV-65 | Proposal reported | S-100 | ✓ | – | – | – | `Admin/BidReported` `t_subject_admin_bid_reported` | E-02 | kept (CHANGE recipients) | A | 11 AC-15 |
| EV-66 | Client awards a proposal | freelancer | ✓ | ✓ | ✓ | o | `ProjectAwarded` `t_subject_freelancer_u_awarded_a_project`; `t_congratulations_employer_awarded_u_their_project_title` | E-65, I-28 | kept (text with `:hours`) | T | 11 AC-16 |
| EV-67 | Award moved or revoked | previous freelancer | – | ✓ | ✓ | o | `t_award_withdrawn` | – | **NEW** (P-84) | T | 11 AC-17, AC-18 |
| EV-68 | Award expired (S-027) | freelancer and client | – | ✓ | ✓ | o | `t_award_expired_freelancer` / `t_award_expired_client` | – | **NEW** (P-84) | T | 11 AC-22 |
| EV-69 | Freelancer accepts the award | client | ✓ | ✓ | ✓ | o | `FreelancerAcceptedYourProject` `t_subject_employer_freelancer_accepted_ur_project`; same key in-app | E-31, I-29 | kept | T | 11 AC-20 |
| EV-70 | Freelancer declines the award | client | ✓ | ✓ | ✓ | o | `FreelancerRejectedYourProject` `t_subject_employer_freelancer_rejected_ur_project`; same key in-app | E-32, I-30 | kept | T | 11 AC-21 |
| EV-71 | Hire canceled before payment | other side | ✓ | ✓ | ✓ | o | `HireCanceled` `t_subject_hire_canceled`; `t_hire_canceled` | – | **NEW** (P-86) | T | 11 AC-25 |
| EV-72 | Project payment confirmed | freelancer | ✓ | ✓ | ✓ | o | `EmployerFundedMilestone` `t_subject_freelancer_employer_deposited_funds`; `t_username_has_deposited_amount_in_project` | E-59, I-31 | kept (one payment per project, Q-050) | T | 11 AC-28, AC-29 |
| EV-73 | Project delivery or re-delivery | client | ✓ | ✓ | ✓ | o | `ProjectCompleted` subject `t_subject_employer_project_delivered`; `t_freelancer_has_delivered_project_work` | E-35, I-35 | kept (CHANGE subject, P-88) | T | 11 AC-32 |
| EV-74 | Client requests a revision (project) | freelancer | ✓ | ✓ | ✓ | o | `RevisionRequested`; `t_client_requested_revision_project` | – | **NEW** (Q-056) | T | 11 AC-33 |
| EV-75 | Client completes the project | freelancer | ✓ | ✓ | ✓ | o | `EmployerReleasedMilestone` `t_subject_freelancer_employer_released_funds`; `t_username_has_released_amount_in_project` | E-60, I-32 | kept | T | 11 AC-36 |
| EV-76 | Project auto-release | freelancer and client | ✓ | ✓ | ✓ | o | `ProjectAutoCompleted` `t_subject_project_auto_completed`; `t_project_auto_completed_freelancer` / `t_project_auto_completed_client` | – | **NEW** (Q-051) | T | 11 AC-39 |
| EV-77 | Message in the project thread | other side | – | ✓ | ✓ | o | `t_client_sent_message_about_project` / `t_freelancer_sent_message_about_project` | – | **NEW** (P-88) | T | 11 AC-40 |

### I. Custom offers (spec 12; only while S-034 is ON, except items already in progress)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-78 | Buyer requests an offer | freelancer | ✓ | ✓ | ✓ | o | `OfferRequested` `t_subject_offer_requested`; `t_buyer_requested_an_offer` | – | **NEW** (Q-060a) | T | 12 AC-3 |
| EV-79 | Freelancer declines an offer request | buyer | – | ✓ | ✓ | o | `t_offer_request_declined` | – | **NEW** (P-92) | T | 12 AC-5 |
| EV-80 | Offer sent (or approved when S-035 is ON) | **buyer** | ✓ | ✓ | ✓ | o | `NewOfferReceived` `t_subject_freelancer_new_offer_received`; `t_a_new_custom_offer_received` | E-61, I-37 | kept (CHANGE recipient, Q-060a) | T | 12 AC-9, AC-11 |
| EV-81 | Offer pending approval (S-035 ON) | S-100 | ✓ | – | – | – | `Admin/NewCustomOfferPending` `t_subject_admin_new_offer_pending_approval` | E-03 | kept (CHANGE recipients) | A | 12 AC-11 |
| EV-82 | Staff reject an offer (S-035 ON) | **freelancer** | ✓ | ✓ | ✓ | o | `YourOfferNeedsChanges` `t_subject_employer_ur_offer_needs_changes`; `t_an_offer_needs_changes_rejected_admin` | E-36, I-38 | kept (CHANGE recipient) | T | 12 AC-11 |
| EV-83 | Buyer declines an offer | freelancer | ✓ | ✓ | ✓ | o | `BuyerDeclinedYourOffer` `t_subject_buyer_declined_ur_offer`; `t_buyer_declined_ur_offer` | – | **NEW** (P-97) | T | 12 AC-16 |
| EV-84 | Freelancer withdraws an offer | buyer | – | ✓ | ✓ | o | `t_freelancer_withdrew_offer` | – | **NEW** (P-94) | T | 12 AC-17 |
| EV-85 | Offer expired (S-036) | freelancer and buyer | – | ✓ | ✓ | o | `t_offer_expired_freelancer` / `t_offer_expired_buyer` | – | **NEW** (P-95) | T | 12 AC-18 |
| EV-86 | Offer paid (= accepted) | freelancer | ✓ | ✓ | ✓ | o | `OfferFunded` `t_subject_freelancer_offer_funded`; `t_a_custom_order_has_been_funded` | E-63, I-43 | kept | T | 12 AC-14, AC-15 |
| EV-87 | Offer delivery | buyer | ✓ | ✓ | ✓ | o | `NewFinishedOfferFile` `t_subject_employer_offer_new_file_received`; `t_a_new_file_received_offer` | E-34, I-42 | kept (now per delivery) | T | 12 AC-21 |
| EV-88 | Buyer requests a revision (offer) | freelancer | ✓ | ✓ | ✓ | o | `RevisionRequested`; `t_buyer_requested_revision_offer` | – | **NEW** (Q-056) | T | 12 AC-22 |
| EV-89 | Message in the offer thread | other party | – | ✓ | ✓ | o | `t_new_message_about_offer` | – | **NEW** (P-93) | T | 12 AC-24 |
| EV-90 | Buyer completes the offer | freelancer | ✓ | ✓ | ✓ | o | `OfferPaymentReleased` `t_subject_freelancer_offer_payment_released`; `t_u_received_a_new_payment_offer` | E-64, I-44 | kept | T | 12 AC-25 |
| EV-91 | Offer auto-release | freelancer and buyer | ✓ | ✓ | ✓ | o | `OrderAutoCompleted` `t_subject_order_auto_completed`; `t_offer_auto_completed_freelancer` / `t_offer_auto_completed_buyer` | – | **NEW** (Q-051) | T | 12 AC-27 |
| EV-92 | Freelancer cancels a paid offer | buyer | ✓ | ✓ | ✓ | o | `FreelancerCanceledYourOffer` `t_subject_employer_freelancer_canceled_ur_offer`; `t_freelancer_has_canceled_ur_offer` | E-30, I-41 | kept | T | 12 AC-29 |

### J. Refunds, disputes, unblock requests (spec 13; gig orders, projects and offers alike)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-93 | Refund requested | freelancer | ✓ | ✓ | ✓ | o | `Seller/RefundRequest` `t_subject_seller_refund_request`; `t_buyer_opened_new_refund_request` | E-76, I-11, I-19 (merged) | kept (CHANGE: projects and offers too) | T | 13 AC-5 |
| EV-94 | Freelancer accepts the refund | buyer | ✓ | ✓ | ✓ | o | `Buyer/RefundAccepted` `t_subject_buyer_refund_accepted`; `t_seller_has_accepted_ur_refund` | E-25, I-15, I-17 (merged) | kept | T | 13 AC-6 |
| EV-95 | Freelancer declines the refund | buyer | ✓ | ✓ | ✓ | o | `Buyer/RefundDeclined` `t_subject_buyer_refund_declined`; `t_seller_has_declined_ur_refund` | E-26, I-16, I-18 (merged) | kept | T | 13 AC-7 |
| EV-96 | Refund auto-rejected after S-030 | buyer and freelancer | – | ✓ | ✓ | o | `t_refund_auto_rejected_buyer` / `t_refund_auto_rejected_seller` | – | **NEW** (P-100) | T | 13 AC-8 |
| EV-97 | Buyer closes the refund | freelancer | ✓ | ✓ | ✓ | o | `Seller/RefundClosed` `t_subject_seller_refund_closed`; `t_a_refund_has_closed` | E-75, I-13 | kept | T | 13 AC-10 |
| EV-98 | Dispute raised | S-100 | ✓ | – | – | – | `Admin/RefundDispute` `t_subject_admin_refund_dispute_raised` | E-17 | kept (CHANGE: all item types; recipients) | A | 13 AC-12 |
| EV-99 | Dispute raised | freelancer | – | ✓ | ✓ | o | `t_buyer_opened_new_refund_dispute` | I-14 | kept (push NEW) | T | 13 AC-12 |
| EV-100 | Message in the refund thread | other party | ✓ (throttled) | ✓ | ✓ | o | `Buyer/NewRefundMessage` `t_subject_buyer_new_refund_message` / `Seller/NewRefundMessage` `t_subject_seller_new_refund_msg`; `t_new_message_about_refund` | E-19, E-69, I-12 | kept (CHANGE throttle P-101) | T | 13 AC-22 |
| EV-101 | Message in the refund thread during a dispute | S-100 | ✓ (throttled) | – | – | – | `Admin/NewRefundMessage` `t_subject_admin_new_refund_message` | E-06 | kept (CHANGE recipients, throttle) | A | 13 AC-22 |
| EV-102 | Staff decide a dispute: refund the buyer | buyer and freelancer | ✓ | ✓ | ✓ | o | `RefundDecided` `t_subject_refund_decided`; `t_app_name_has_approved_ur_refund_request` (buyer) / `t_app_name_has_approved_refund_request_from_buyer` (freelancer) | I-20, I-21 | kept (email NEW, P-102) | T | 13 AC-16 |
| EV-103 | Staff decide a dispute: release to the freelancer | buyer and freelancer | ✓ | ✓ | ✓ | o | `RefundDecided`; `t_app_name_has_declined_ur_refund_request` (buyer) / `t_app_name_released_funds_after_dispute` (freelancer, NEW key) | I-22 | kept (email and freelancer notice NEW) | T | 13 AC-17 |
| EV-104 | Unblock request created (only while auto-release is OFF, P-5) | S-100 | ✓ | – | – | – | `Admin/UnblockRequestPending` `t_subject_admin_unblock_request_pending` | – | **NEW** (P-103) | A | 13 AC-24 |
| EV-105 | Staff approve an unblock request | freelancer | – | ✓ | ✓ | o | `t_app_name_has_approved_ur_unblock_request` | I-25, I-23 (merged) | kept (push NEW) | T | 13 AC-25 |
| EV-106 | Funds released by MyTask (unblock approval → buyer; "Release funds" tool → both) | buyer; both | ✓ | ✓ | ✓ | o | `FundsReleasedByMyTask` `t_subject_funds_released_by_mytask`; `t_funds_released_by_mytask` | I-36 (merged; legacy staff project completion, also the staff call site of E-35) | **NEW** (P-103) | T | 13 AC-25, AC-29 |
| EV-107 | Staff decline an unblock request | freelancer | – | ✓ | ✓ | o | `t_app_name_has_declined_ur_unblock_request` (with reason) | I-26, I-24 (merged) | kept (reason NEW) | T | 13 AC-26 |
| EV-108 | Unblock request closed automatically | freelancer | – | ✓ | – | o | `t_unblock_request_closed` | – | **NEW** (P-103) | T | 13 AC-27 |
| EV-109 | Staff "Refund buyer" tool | buyer and freelancer | ✓ | ✓ | ✓ | o | `RefundedByMyTask` `t_subject_refunded_by_mytask`; `t_refunded_by_mytask` | – | **NEW** | T | 13 AC-30 |

### K. Withdrawals (spec 14)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-110 | Withdrawal requested | S-100 | ✓ | – | – | – | `Admin/PendingWithdrawal` `t_subject_admin_pending_withdrawal` | E-14 | kept (CHANGE recipients) | A | 14 AC-7 |
| EV-111 | Withdrawal requested | user | ✓ | – | – | o | `Seller/PendingWithdrawal` `t_subject_seller_pending_withdrawal` | E-73 | kept | T | 14 AC-7 |
| EV-112 | Withdrawal paid (staff or payout provider) | user | ✓ | ✓ | ✓ | o | `PaymentApproved` `t_subject_everyone_payment_approved`; `t_withdrawal_amount_paid` | E-49, I-50 | kept (push NEW) | T | 14 AC-14, AC-17 |
| EV-113 | Withdrawal rejected or payout failed | user | ✓ | ✓ | ✓ | o | `PaymentRejected` `t_subject_everyone_payment_rejected`; `t_withdrawal_amount_rejected` | E-50, I-51 | kept (reason added, P-64) | T | 14 AC-15, AC-17 |
| EV-114 | Payout details saved or changed | user | ✓ | ✓ | – | o | `PayoutDetailsChanged` `t_subject_payout_details_changed`; `t_payout_details_changed` | – | **NEW** (P-63) | S | 14 AC-3 |

### L. Content (spec 17)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-115 | Blog comment pending (S-074 OFF) | S-100 | ✓ | – | – | – | `Admin/PendingArticleComment` `t_subject_admin_pending_article_comment` | E-08 | kept (CHANGE recipients) | A | 17 AC-19 |
| EV-116 | Contact form message received | S-100 | ✓ | – | – | – | `Admin/PendingMessage` `t_subject_admin_new_support_message` | E-10 | kept (CHANGE recipients) | A | 17 AC-24 |
| EV-117 | Staff reply to a contact message | sender's email | ✓ | – | – | – | `SupportReply` (direct mailable), subject `t_re_subject_short` + original subject | M-4 | kept | T | 17 AC-26 |
| EV-118 | Newsletter sign-up (new or still pending) | the email entered | ✓ | – | – | – | `NewsletterVerification` `t_verify_ur_email` | M-6 | kept | S | 17 AC-30 |
| EV-119 | Newsletter subscription confirmed | subscriber | ✓ | – | – | – | `NewsletterApproved` `t_welcome_to_newsletter_tnx` | M-7 | kept | T | 17 AC-31 |

### M. Staff and system (spec 16)
| # | Event | Recipient(s) | E | I | P | SMS | Template / keys | Covers | Status | Cat | Spec |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EV-120 | Staff send an email to a user or a newsletter subscriber | that person | ✓ | – | – | – | `StaffEmail` (staff-written subject and text inside the branded layout) | M-1, M-2 (merged) | kept | T | 16 AC-32; 17 AC-33 |
| EV-121 | Staff "Send test email" | address entered | ✓ | – | – | – | `TestEmail` `t_test_email_subject` | M-3 | kept (CHANGE: SendGrid test) | A | 15 AC-32; 16 |
| EV-122 | Maintenance mode switched ON (S-121) | S-100 | ✓ | – | – | – | `Admin/SiteIsDown` `t_hi_admin`, body `t_admin_maintenance_on_body` | E-18 | kept (CHANGE: no secret, P-112) | A | 15 AC-37; 16 AC-70 |
| EV-123 | Staff account created | staff member | ✓ | – | – | – | `StaffInvitation` `t_subject_staff_invitation` | – | **NEW** (ACCEPTED P-111) | S | 16 AC-3 |
| EV-124 | Critical setting changed (any fee rule, S-100, S-110, S-127, S-033, S-025, S-056/S-060, social-login keys) | S-100 (old and new list when S-100 changes) | ✓ | – | – | – | `Admin/CriticalSettingChanged` `t_subject_admin_critical_setting_changed` | – | **NEW** (ACCEPTED P-111) | A | 16 AC-55, AC-56 |
| EV-125 | Timer job stuck for 15 minutes, or email failure rate above 20% in an hour; also a failed nightly reconciliation run, at most once per run day (ACCEPTED P-135, added 2026-09-29, Owner 2026-09-30 Q-111) | S-100 | ✓ | – | – | – | `Admin/SystemAlert` `t_subject_admin_system_alert` | – | **NEW** (ACCEPTED P-111) | A | 15 AC-39; 16 AC-69; 05 AC-46 (P-135) |

Rule for push (P-11): push accompanies the in-app notification of the same event **only where the trigger spec lists push**; this matrix copies the trigger specs (EV-108 and EV-114 have no push because specs 13 and 14 list none).

---

## Accounting of the legacy inventory (`notifications.md`)
Every row of the inventory, one line per email class, in-app key and direct mailable. "→ EV" = catalogue row.

### Email classes (79 = 61 used classes counted per class, incl. the dead `Welcome`)
| ID | Legacy class | Status | → |
|---|---|---|---|
| E-01 | Admin/BidPendingApproval | kept | EV-62 |
| E-02 | Admin/BidReported | kept | EV-65 |
| E-03 | Admin/NewCustomOfferPending | kept | EV-81 |
| E-04 | Admin/NewIdVerificationPending | kept | EV-16 |
| E-05 | Admin/NewPayment | kept | EV-35 |
| E-06 | Admin/NewRefundMessage | kept | EV-101 |
| E-07 | Admin/NewRestrictionAppeal | kept | EV-08 |
| E-08 | Admin/PendingArticleComment | kept | EV-115 |
| E-09 | Admin/PendingGig | kept | EV-19 |
| E-10 | Admin/PendingMessage | kept | EV-116 |
| E-11 | Admin/PendingOfflinePayment | kept | EV-24 |
| E-12 | Admin/PendingPortfolio | kept | EV-14 |
| E-13 | Admin/PendingUser | kept | EV-02 |
| E-14 | Admin/PendingWithdrawal | kept | EV-110 |
| E-15 | Admin/ProfileReported | kept | EV-13 |
| E-16 | Admin/ProjectReported | kept | EV-60 |
| E-17 | Admin/RefundDispute | kept | EV-98 |
| E-18 | Admin/SiteIsDown | kept | EV-122 |
| E-19 | User/Buyer/NewRefundMessage | kept | EV-100 |
| E-20 | User/Buyer/OrderDelivered | kept | EV-40 |
| E-21 | User/Buyer/OrderItemCanceled | kept | EV-38 |
| E-22 | User/Buyer/OrderItemCompleted | kept | EV-43 |
| E-23 | User/Buyer/OrderItemInProgress | kept | EV-37 |
| E-24 | User/Buyer/OrderPlaced | kept | EV-34 |
| E-25 | User/Buyer/RefundAccepted | kept | EV-94 |
| E-26 | User/Buyer/RefundDeclined | kept | EV-95 |
| E-27 | User/Buyer/WebhookPaymentFailed | **removed** — sent only by the removed foreign-gateway callbacks (X-07, Q-016); a failed BOG payment shows on the result page (spec 05 AC-12) | – |
| E-28 | User/Employer/FreelancerAcceptedYourOffer | **removed** — no freelancer-accept step in the new offer flow; payment is the acceptance and sends `OfferFunded` (spec 12 P-97, Q-060a) | – |
| E-29 | User/Employer/FreelancerRejectedYourOffer | **removed** — direction reversed; replaced by NEW `BuyerDeclinedYourOffer` EV-83 (spec 12 P-97) | – |
| E-30 | User/Employer/FreelancerCanceledYourOffer | kept | EV-92 |
| E-31 | User/Employer/FreelancerAcceptedYourProject | kept | EV-69 |
| E-32 | User/Employer/FreelancerRejectedYourProject | kept | EV-70 |
| E-33 | User/Employer/FreelancerRequestedMilestone | **removed** — milestones removed (X-01, Q-036, Q-050) | – |
| E-34 | User/Employer/NewFinishedOfferFile | kept | EV-87 |
| E-35 | User/Employer/ProjectCompleted | kept (freelancer delivery); the staff-completion call site `Admin/Projects/Milestones/MilestonesComponent.php:482` is replaced by EV-106 | EV-73 |
| E-36 | User/Employer/YourOfferNeedsChanges | kept | EV-82 |
| E-37 | User/Employer/YourProjectApproved | kept | EV-58 |
| E-38 | User/Employer/YourProjectRejected | kept | EV-59 |
| E-39 | User/Everyone/AccountActivated | kept | EV-03 |
| E-40 | User/Everyone/AppealAccepted | kept | EV-09 |
| E-41 | User/Everyone/AppealRejected | kept | EV-10 |
| E-42 | User/Everyone/BillingInfoUpdated | kept | EV-28 |
| E-43 | User/Everyone/DepositRejected | kept | EV-27 |
| E-44 | User/Everyone/GigPublished | kept | EV-20 |
| E-45 | User/Everyone/NewBidReceived | kept | EV-61 |
| E-46 | User/Everyone/NewMessage | kept | EV-48 |
| E-47 | User/Everyone/PasswordChanged | kept | EV-05 |
| E-48 | User/Everyone/PasswordReset | kept | EV-04 |
| E-49 | User/Everyone/PaymentApproved | kept | EV-112 |
| E-50 | User/Everyone/PaymentRejected | kept | EV-113 |
| E-51 | User/Everyone/SubscriptionCancelled | kept | EV-54 |
| E-52 | User/Everyone/SubscriptionConfirmation | kept | EV-50 |
| E-53 | User/Everyone/SubscriptionRenewed | kept | EV-51 |
| E-54 | User/Everyone/VerificationApproved | kept | EV-17 |
| E-55 | User/Everyone/VerificationDeclined | kept | EV-18 |
| E-56 | User/Everyone/VerifyEmail | kept | EV-01 |
| E-57 | User/Everyone/YourBidApproved | kept | EV-63 |
| E-58 | User/Everyone/YourBidRejected | kept | EV-64 |
| E-59 | User/Freelancer/EmployerFundedMilestone | kept (name kept for the one project payment) | EV-72 |
| E-60 | User/Freelancer/EmployerReleasedMilestone | kept | EV-75 |
| E-61 | User/Freelancer/NewOfferReceived | kept | EV-80 |
| E-62 | User/Freelancer/NewProjectInCategory | kept | EV-56 |
| E-63 | User/Freelancer/OfferFunded | kept | EV-86 |
| E-64 | User/Freelancer/OfferPaymentReleased | kept | EV-90 |
| E-65 | User/Freelancer/ProjectAwarded | kept | EV-66 |
| E-66 | User/Freelancer/RejectMilestone | **removed** — milestones removed (X-01) | – |
| E-67 | User/Freelancer/YourGigNeedsChanges | kept | EV-21 |
| E-68 | User/Seller/DeliveredWorkNewMessage | kept | EV-45 |
| E-69 | User/Seller/NewRefundMessage | kept | EV-100 |
| E-70 | User/Seller/OrderItemCanceled | kept | EV-39 |
| E-71 | User/Seller/OrderItemCompleted | kept | EV-42 |
| E-72 | User/Seller/PendingOrder | kept | EV-33 |
| E-73 | User/Seller/PendingWithdrawal | kept | EV-111 |
| E-74 | User/Seller/PortfolioPublished | kept | EV-15 |
| E-75 | User/Seller/RefundClosed | kept | EV-97 |
| E-76 | User/Seller/RefundRequest | kept | EV-93 |
| E-77 | User/Seller/ReviewReceived | kept | EV-47 |
| E-78 | User/Seller/YouBecameSeller | **removed** — "Become a seller" removed (Q-013, X-06) | – |
| E-79 | User/Everyone/Welcome | **removed** — never sent in legacy (dead class); not built (ACCEPTED P-113) | – |

### Direct mailables (`app/Mail`, 7)
| ID | Legacy mailable (call sites) | Status | → |
|---|---|---|---|
| M-1 | Admin/Users/SendEmail (Filament `UserResource.php:118`; `Admin/Users/Options/MessageComponent.php:94`) | kept as `StaffEmail` | EV-120 |
| M-2 | Admin/Newsletter/SendEmail (`Admin/Newsletter/SendComponent.php:92`) | **merged** into `StaffEmail` (same subject + text email) (P-113) | EV-120 |
| M-3 | Admin/Settings/TrySmtp (`Admin/Settings/SmtpComponent.php:296`) | kept as `TestEmail` (CHANGE: SendGrid, P-113) | EV-121 |
| M-4 | Admin/Support/Reply (`Admin/Support/ReplyComponent.php:115`) | kept | EV-117 |
| M-5 | Admin/Users/RestrictEmail (`Admin/Users/Options/RestrictComponent.php:124`) | kept | EV-07 |
| M-6 | User/Everyone/NewsletterVerification (`Home/HomeComponent.php:233,263`; `Blog/BlogComponent.php:218,268`) | kept | EV-118 |
| M-7 | User/Everyone/NewsletterApproved (`Newsletter/VerifyComponent.php:58`) | kept | EV-119 |

### In-app text keys (55)
| ID | Legacy key | Status | → |
|---|---|---|---|
| I-01 | `t_u_received_new_order_seller` | kept | EV-33 |
| I-02 | `t_notification_buyer_order_placed` (BOG path, `PaymentBogController.php:73`) | **merged** into `t_u_received_new_order_seller` (spec 06) | EV-33 |
| I-03 | `t_ur_payment_has_been_received_offline` | kept | EV-25 |
| I-04 | `t_seller_has_started_ur_order` | kept | EV-37 |
| I-05 | `t_seller_has_delivered_ur_order` | kept | EV-40 |
| I-06 | `t_seller_has_canceled_ur_order` | kept | EV-38 |
| I-07 | `t_buyer_has_canceled_order` | kept | EV-39 |
| I-08 | `t_buyer_sent_u_message_about_delivered_files` | kept | EV-45 |
| I-09 | `t_order_id_completed` | kept | EV-42 |
| I-10 | `t_u_have_received_new_rating` | kept | EV-47 |
| I-11 | `t_buyer_opened_new_refund_request` | kept | EV-93 |
| I-12 | `t_new_message_about_refund` | kept | EV-100 |
| I-13 | `t_a_refund_has_closed` | kept | EV-97 |
| I-14 | `t_buyer_opened_new_refund_dispute` | kept | EV-99 |
| I-15 | `t_seller_has_accepted_ur_refund` | kept | EV-94 |
| I-16 | `t_seller_has_declined_ur_refund` | kept | EV-95 |
| I-17 | `t_freelancer_has_accepted_ur_refund` | **merged** into `t_seller_has_accepted_ur_refund` (one refund flow, spec 13) | EV-94 |
| I-18 | `t_freelancer_has_declined_ur_refund` | **merged** into `t_seller_has_declined_ur_refund` | EV-95 |
| I-19 | `t_subject_freelancer_client_requested_project_refund` | **merged** into `t_buyer_opened_new_refund_request` | EV-93 |
| I-20 | `t_app_name_has_approved_ur_refund_request` | kept | EV-102 |
| I-21 | `t_app_name_has_approved_refund_request_from_buyer` | kept | EV-102 |
| I-22 | `t_app_name_has_declined_ur_refund_request` | kept | EV-103 |
| I-23 | `t_admin_approved_unblock_request` (list page) | **merged** into `t_app_name_has_approved_ur_unblock_request` (one approval, Q-037) | EV-105 |
| I-24 | `t_admin_declined_unblock_request` (list page) | **merged** into `t_app_name_has_declined_ur_unblock_request` | EV-107 |
| I-25 | `t_app_name_has_approved_ur_unblock_request` | kept | EV-105 |
| I-26 | `t_app_name_has_declined_ur_unblock_request` | kept | EV-107 |
| I-27 | `t_u_received_new_bid_on_ur_project` | kept | EV-61 |
| I-28 | `t_congratulations_employer_awarded_u_their_project_title` | kept | EV-66 |
| I-29 | `t_subject_employer_freelancer_accepted_ur_project` | kept | EV-69 |
| I-30 | `t_subject_employer_freelancer_rejected_ur_project` | kept | EV-70 |
| I-31 | `t_username_has_deposited_amount_in_project` | kept | EV-72 |
| I-32 | `t_username_has_released_amount_in_project` | kept | EV-75 |
| I-33 | `t_reject_milestone` | **removed** (X-01) | – |
| I-34 | `t_subject_employer_freelancer_requested_a_milestone` | **removed** (X-01) | – |
| I-35 | `t_freelancer_has_delivered_project_work` | kept | EV-73 |
| I-36 | `t_congts_freelancer_ur_project_completed` (staff completes a project) | **merged** into `t_funds_released_by_mytask` (staff release, spec 13 AC-29) | EV-106 |
| I-37 | `t_a_new_custom_offer_received` | kept (recipient buyer) | EV-80 |
| I-38 | `t_an_offer_needs_changes_rejected_admin` | kept (recipient freelancer) | EV-82 |
| I-39 | `t_notification_username_has_accpted_ur_offer` | **removed** (spec 12 P-97) | – |
| I-40 | `t_notification_username_has_rejected_ur_offer` | **removed** (spec 12 P-97; replaced by `t_buyer_declined_ur_offer`) | – |
| I-41 | `t_freelancer_has_canceled_ur_offer` | kept | EV-92 |
| I-42 | `t_a_new_file_received_offer` | kept | EV-87 |
| I-43 | `t_a_custom_order_has_been_funded` | kept | EV-86 |
| I-44 | `t_u_received_a_new_payment_offer` | kept | EV-90 |
| I-45 | `t_ur_gig_title_has_been_published` | kept | EV-20 |
| I-46 | `t_ur_gig_needs_changes_rejected_admin` | kept | EV-21 |
| I-47 | `t_ur_portfolio_title_has_been_published` | kept | EV-15 |
| I-48 | `t_ur_account_has_verified` | kept | EV-17 |
| I-49 | `t_verification_files_declined` | kept | EV-18 |
| I-50 | `t_withdrawal_amount_paid` | kept | EV-112 |
| I-51 | `t_withdrawal_amount_rejected` | kept | EV-113 |
| I-52 | `t_u_became_a_seller` | **removed** (Q-013, X-06) | – |
| I-53 | `t_u_have_new_message_from_username` (legacy `conversations` chat) | **removed** (X-11, Q-065) | – |
| I-54 | `t_subscription_activated_message` | kept | EV-50 |
| I-55 | `t_subscription_updated_message` | kept | EV-51 |

### Counts
| Group | Legacy items | Kept | Merged | Removed |
|---|---|---|---|---|
| Email classes | 79 | 72 | 0 | 7 |
| Direct mailables | 7 | 6 | 1 | 0 |
| In-app text keys | 55 | 42 | 7 | 6 |
| **Total** | **141** | **120** | **8** | **13** |

**NEW events: 46** — 39 defined in specs 01–14 (EV-06, 11, 12, 22, 23, 26, 29, 30, 31, 32, 36, 41, 44, 46, 49, 52, 53, 55, 57, 67, 68, 71, 74, 76, 77, 78, 79, 83, 84, 85, 88, 89, 91, 96, 104, 106, 108, 109, 114), 3 ACCEPTED here for specs 15/16 (EV-123, EV-124, EV-125), and 4 added on 2026-09-30 (EV-126 portfolio rejected, Q-117; EV-127 2FA switched off by staff, Q-145; EV-128 many failed logins, SEC-02; EV-129 code entry locked, SEC-03). In addition, NEW channels on kept events: push on every kept event with in-app (P-11); in-app on EV-27, EV-58, EV-59, EV-63, EV-64; email on EV-102, EV-103 (P-102). Recipient changes: EV-47 (also buyers), EV-80 (buyer), EV-82 (freelancer). Catalogue total: 129 events (125 until 2026-09-29, + EV-126…EV-129).

---

## Business rules
- R-N1 **One catalogue** (ADR-007 §8): the matrix above is the single source; code has one entry per EV row; the build test of AC-1 enforces it. A new notification needs a spec row marked NEW (CLAUDE.md "Notifications").
- R-N2 **Outbox** (data-model §1): business code writes an outbox event in the same transaction; notifications are produced from committed events only (AC-2). Idempotency key = event id + recipient + channel (AC-3).
- R-N3 **Recipients**: user notifications go to the user's current email/app; admin notifications go to every S-100 address (Q-026); staff notifications go to the staff member.
- R-N4 **Language**: recipient's saved language (ADR-006 §2), fallback `ka`; push uses the language stored on the push token; in-app is rendered at read time in the reader's current language; admin emails use S-103 (P-109).
- R-N5 **Channels**: email (SendGrid, Q-033; Mailpit locally), in-app (always created for events that list it), push (Expo; S-101; P-11), SMS (interface, S-102 OFF, no event mapped). 2FA and email-change codes/links are email only.
- R-N6 **Content**: templates use the i18n keys listed; parameters are plain text; push bodies contain no chat text and no codes; email links follow url-map §7.2.
- R-N7 **Preferences** (P-106): switchable = Messages (email, push), New projects in my categories (email), Reviews (email, push), Referral points (push). Everything else, and all in-app rows, cannot be switched off.
- R-N8 **Throttles and caps**: legacy chat throttle (BR-120), spec 13 refund-thread throttle, spec 01 resend limits, and the NEW per-user cap of 30 emails / 60 pushes per hour (non-security, P-110).
- R-N9 **Retention**: in-app rows 12 months (P-107); delivery log 90 days (data-model §3.O); push tokens removed after 90 days unseen (P-108).
- R-N10 **Maintenance**: while S-121 is ON, notifications keep being produced and sent (timers and payments still run); only the public UI is closed (spec 16).

## Money movements
None. Notifications never move money.

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Bell + dropdown | header bell with count; dropdown: 10 newest, "Mark all as read", "See all" | bell icon on main screens with count | loading (3 skeleton rows); empty `t_no_notification_right_now`; error (retry); success |
| Notification centre | `/account/notifications`: list 20 per page, unread dot, "Mark all as read" | Notifications screen, pull to refresh, infinite scroll, swipe to mark read | same as above; offline banner on mobile |
| Notification settings | `/account/settings/notifications`: switchable categories × Email/Push switches; locked group | Account → Notifications: same; "Turn on push notifications" row when the OS permission is off | loading; saved toast `t_changes_saved`; error (switch returns to its previous state + `t_toast_something_went_wrong`) |
| Push permission pre-prompt | – | modal sheet with "Allow" / "Not now" | – |
| Unsubscribe landing | `/notifications/unsubscribe?token=` (no login) | – (opens web) | success `t_unsubscribed_success`; invalid/expired link `t_unsubscribe_link_invalid` with link to settings |
| Email layout | branded HTML + plain text, current logo, footer | – | – |
| Admin: S-100 editor, test email, delivery log | spec 16 | – | – |

Accessibility: the bell has an accessible name with the count ("Notifications, 3 unread"); the unread dot has text; switches have labels; touch targets ≥ 44 px (tokens).

## Notifications triggered
This spec is the catalogue. Its own NEW items: EV-123 staff invitation, EV-124 critical setting changed, EV-125 system alert (all ACCEPTED P-111), plus the changed EV-121 test email and EV-122 maintenance email. Added 2026-09-30: EV-126 (trigger in spec 02 AC-42), EV-127 (spec 16 AC-32), EV-128 and EV-129 (spec 01 AC-53, AC-54); their texts are below (EV-126 texts in spec 02).

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_notifications` | Notifications | სიახლეები (Owner may refine: "შეტყობინებები" is already used for chat `t_messages`) |
| `t_mark_as_read` | Mark as read | წაკითხულია |
| `t_no_notification_right_now` | No notification to show right now | სიახლეები არ არის |
| `t_hi_admin` | Hi admin! | გამარჯობა ადმინ! |
| `t_re_subject_short` | Re: | Re: |
| `t_if_u_have_trouble_click_link_notification` | If you are having trouble clicking the :actionText button, copy and paste the URL below into your web browser: | (legacy ka value kept) |
| Every email subject/body key listed in the matrix | legacy values kept | legacy values kept |

NEW keys (English first, Georgian alongside, Q-058). Keys of NEW notifications defined in specs 01–14 keep the values written in those specs and are not repeated here.
| Key | en | ka |
|---|---|---|
| `t_mark_all_as_read` | Mark all as read | ყველას წაკითხულად მონიშვნა |
| `t_see_all_notifications` | See all notifications | ყველა სიახლის ნახვა |
| `t_notification_settings` | Notification settings | შეტყობინებების პარამეტრები |
| `t_notification_channel_email` / `t_notification_channel_push` | Email / Push | ელ-ფოსტა / Push შეტყობინება |
| `t_notification_category_messages` | Messages from other users | სხვა მომხმარებლების შეტყობინებები |
| `t_notification_category_project_alerts` | New projects in my categories | ახალი პროექტები ჩემს კატეგორიებში |
| `t_notification_category_reviews` | Reviews I receive | ჩემს შესახებ დაწერილი შეფასებები |
| `t_notification_category_referrals` | Referral points | რეფერალური ქულები |
| `t_notification_category_locked` | Always on | ყოველთვის ჩართულია |
| `t_notification_category_locked_hint` | Notifications about your orders, payments, withdrawals, account and security are always sent, so you never miss something important. | შეტყობინებები თქვენი შეკვეთების, გადახდების, თანხის გატანის, ანგარიშისა და უსაფრთხოების შესახებ ყოველთვის იგზავნება, რომ მნიშვნელოვანი არაფერი გამოგრჩეთ. |
| `t_turn_on_push_notifications` | Turn on push notifications | Push შეტყობინებების ჩართვა |
| `t_push_permission_title` | Stay up to date | იყავით საქმის კურსში |
| `t_push_permission_body` | Get a notification when you receive a message, an order or a payment. | მიიღეთ შეტყობინება, როცა მოგწერენ, შეკვეთას ან გადახდას მიიღებთ. |
| `t_push_permission_allow` / `t_push_permission_later` | Allow / Not now | დაშვება / ახლა არა |
| `t_push_title_default` | MyTask | MyTask |
| `t_email_footer_reason` | You received this email because you have an account on MyTask. | ეს წერილი მიიღეთ, რადგან MyTask-ზე ანგარიში გაქვთ. |
| `t_email_footer_optout` | Don't want these emails? Turn them off in your notification settings. | არ გსურთ ასეთი წერილების მიღება? გამორთეთ ისინი შეტყობინებების პარამეტრებში. |
| `t_email_unsubscribe_link` | Unsubscribe from these emails | ამ წერილების გამოწერის გაუქმება |
| `t_unsubscribed_success` | Done. You will no longer receive these emails. You can change this any time in your notification settings. | მზადაა. ამ წერილებს აღარ მიიღებთ. ეს ნებისმიერ დროს შეგიძლიათ შეცვალოთ შეტყობინებების პარამეტრებში. |
| `t_unsubscribe_link_invalid` | This link is invalid or has expired. Please change your notification settings after logging in. | ბმული არასწორია ან ვადა გაუვიდა. გთხოვთ, ავტორიზაციის შემდეგ შეცვალოთ შეტყობინებების პარამეტრები. |
| `t_changes_saved` | Changes saved | ცვლილებები შენახულია |
| `t_deposit_rejected_inapp` | Your bank-transfer top-up of :amount was rejected. Reason: :reason | თქვენი :amount საბანკო გადარიცხვით შევსება უარყოფილია. მიზეზი: :reason |
| `t_subject_admin_account_restricted` (legacy key without a value) | Your MyTask account has been restricted | თქვენი MyTask-ის ანგარიში შეიზღუდა |
| `t_subject_admin_reconciliation_difference` | Payment reconciliation found a difference | გადახდების შეჯერებისას განსხვავება აღმოჩნდა |
| `t_admin_reconciliation_difference_body` | The nightly check found :count difference(s) between the ledger and BOG for :date. Open the reconciliation report in the admin panel. | ღამის შემოწმებამ :date-ისთვის ლეჯერსა და BOG-ს შორის :count განსხვავება აღმოაჩინა. გახსენით შეჯერების ანგარიში ადმინ პანელში. |
| `t_test_email_subject` | MyTask test email | MyTask-ის სატესტო წერილი |
| `t_test_email_body` | This is a test email. If you can read it, email sending works. | ეს სატესტო წერილია. თუ მას კითხულობთ, წერილების გაგზავნა მუშაობს. |
| `t_test_email_sent` / `t_test_email_failed` | Test email sent to :email. / The test email could not be sent: :error | სატესტო წერილი გაიგზავნა :email-ზე. / სატესტო წერილის გაგზავნა ვერ მოხერხდა: :error |
| `t_admin_maintenance_on_body` | :staff switched maintenance mode ON at :time. The public website and app are closed to users until it is switched off. | :staff-მა :time-ზე ჩართო განახლების რეჟიმი. საიტი და აპლიკაცია მომხმარებლებისთვის დახურულია მის გამორთვამდე. |
| `t_subject_staff_invitation` | You have been invited to the MyTask admin panel | თქვენ მოგიწვიეს MyTask-ის ადმინ პანელში |
| `t_staff_invitation_body` | :inviter created a staff account for you. Set your password within 48 hours using the button below. | :inviter-მა თქვენთვის თანამშრომლის ანგარიში შექმნა. ქვემოთ მოცემული ღილაკით 48 საათში დააყენეთ პაროლი. |
| `t_set_password` | Set password | პაროლის დაყენება |
| `t_subject_admin_critical_setting_changed` | A critical MyTask setting was changed | MyTask-ის მნიშვნელოვანი პარამეტრი შეიცვალა |
| `t_admin_critical_setting_changed_body` | :staff changed :setting at :time. Old value: :old. New value: :new. | :staff-მა :time-ზე შეცვალა :setting. ძველი მნიშვნელობა: :old. ახალი მნიშვნელობა: :new. |
| `t_subject_admin_system_alert` | MyTask system alert | MyTask-ის სისტემური გაფრთხილება |
| `t_admin_system_alert_body` | :problem since :time. Open System health in the admin panel. | :problem :time-დან. გახსენით სისტემის მდგომარეობა ადმინ პანელში. |
| `t_sms_provider_not_configured` (staff) | SMS cannot be switched on because no SMS provider is configured. | SMS-ის ჩართვა შეუძლებელია, რადგან SMS პროვაიდერი არ არის დაკავშირებული. |
| `t_email_undeliverable_staff_note` (staff) | Emails to this address bounce or were reported as spam since :date. | ამ მისამართზე წერილები :date-დან ბრუნდება ან სპამად მოინიშნა. |
| `t_subject_2fa_disabled_by_staff` (EV-127, added 2026-09-30) | Two-factor authentication was turned off on your MyTask account | თქვენს MyTask-ის ანგარიშზე ორსაფეხურიანი ავტორიზაცია გამოირთო |
| `t_2fa_disabled_by_staff_email_body` (EV-127) | MyTask support turned off two-factor authentication for your account on :date. If you did not ask for this, contact support immediately and change your password. You can turn it on again in Account settings → Security. | MyTask-ის მხარდაჭერის სამსახურმა :date-ს თქვენს ანგარიშზე ორსაფეხურიანი ავტორიზაცია გამორთო. თუ ეს თქვენ არ მოგითხოვიათ, დაუყოვნებლივ დაუკავშირდით მხარდაჭერას და შეცვალეთ პაროლი. მისი ხელახლა ჩართვა შეგიძლიათ ანგარიშის პარამეტრებში → უსაფრთხოება. |
| `t_2fa_disabled_by_staff` (EV-127, in-app) | MyTask support turned off two-factor authentication for your account. If you did not ask for this, contact support. | MyTask-ის მხარდაჭერამ თქვენს ანგარიშზე ორსაფეხურიანი ავტორიზაცია გამორთო. თუ ეს თქვენ არ მოგითხოვიათ, დაუკავშირდით მხარდაჭერას. |
| `t_subject_security_many_failed_logins` (EV-128, added 2026-09-30) | Many failed login attempts on your MyTask account | თქვენს MyTask-ის ანგარიშზე შესვლის ბევრი წარუმატებელი მცდელობაა |
| `t_security_many_failed_logins_body` (EV-128) | Someone tried to log in to your account with a wrong password many times in the last hour. For your safety, login attempts on your account are slowed down for a while. If this was not you, change your password and turn on two-factor authentication. | ბოლო ერთი საათის განმავლობაში ვიღაცამ თქვენს ანგარიშზე შესვლა არასწორი პაროლით ბევრჯერ სცადა. უსაფრთხოების მიზნით, თქვენს ანგარიშზე შესვლის მცდელობები დროებით შენელებულია. თუ ეს თქვენ არ ყოფილხართ, შეცვალეთ პაროლი და ჩართეთ ორსაფეხურიანი ავტორიზაცია. |
| `t_subject_security_2fa_locked` (EV-129, added 2026-09-30) | Code entry on your MyTask account is blocked for a while | თქვენს MyTask-ის ანგარიშზე კოდის შეყვანა დროებით დაბლოკილია |
| `t_security_2fa_locked_body` (EV-129) | Someone entered too many wrong verification codes for your account. Code entry is blocked for :minutes minutes. If this was not you, your password may be known to someone else: change it now. | თქვენს ანგარიშზე ვიღაცამ ძალიან ბევრი არასწორი დადასტურების კოდი შეიყვანა. კოდის შეყვანა დაბლოკილია :minutes წუთით. თუ ეს თქვენ არ ყოფილხართ, თქვენი პაროლი შესაძლოა სხვამ იცოდეს: დაუყოვნებლივ შეცვალეთ იგი. |

## Edge cases
- EC-1 The user changes language after a notification was created: the in-app list shows it in the new language (rendered at read time); emails already sent stay in the old language.
- EC-2 A notification parameter refers to a renamed item (gig title changed): in-app text shows the title stored at the time; the link opens the current page.
- EC-3 A user has 3 devices: each gets the push; reading on one device updates the unread count on all (realtime).
- EC-4 S-100 contains an address that bounces: the delivery log shows `failed` for that address; other addresses still receive the email.
- EC-5 An event fires for a banned or deleted user: in-app rows are still stored (for history), but no email or push is sent to banned/deleted accounts, except the restriction email (EV-07) and account-related security emails requested before the ban.
- EC-6 A renewal reminder is due, but the user cancels auto-renew before it is sent: no reminder (spec 09).
- EC-7 Many offline chat messages from 5 senders: at most one email per sender per 10 minutes (EV-48); the per-user cap (AC-34) applies on top.
- EC-8 A migrated in-app notification points to a legacy URL that has no new mapping: its target is set to the dashboard home; the text is kept.
- EC-9 S-044 is set to "push only" while S-101 is OFF or the user has no push token: the reminder falls back to in-app, so the user is always told before a card charge (part of P-108).
- EC-10 A user switches off "Messages" email: the unread chat badge and in-app Inbox still work; push is controlled separately.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-15-1 | Every admin email goes to the first admin only | `Admin::first()` at 24 call sites, e.g. `ContactComponent.php:133` | AC-7, AC-31 (S-100) |
| D-15-2 | Emails in the site language, not the recipient's; renewal forced to Georgian | `->locale(config('app.locale'))`; `ProcessSubscriptionPayments.php:215` | AC-6 |
| D-15-3 | In-app texts rendered as raw HTML with user-supplied params (stored XSS) | `header.blade.php:1` `{!! __('messages.' . $n->text, $n->params) !!}` | AC-15 |
| D-15-4 | Only unread notifications are listed; after "mark as read" they are gone forever | `Includes/Header.php:59, 231-240` | AC-13 |
| D-15-5 | Notifications sent before the business result is final (admin payment email before payment) | spec 06 D-06-13 | AC-2 |
| D-15-6 | Subscription confirmation sent twice for points | `SubscriptionController.php:60,106` | AC-3 |
| D-15-7 | Several keys for one event (BOG vs wallet order; gig vs project refund; unblock list vs detail page) | `PaymentBogController.php:73`; `Seller/Refunds/Options/DetailsComponent.php:300/383`; `UnblockRequestsComponent.php:112/159` | AC-36, merged rows |
| D-15-8 | Maintenance email contains the bypass secret in clear text | `MaintenanceComponent.php:104-124` | AC-37 |
| D-15-9 | No way to stop any email (no unsubscribe, no preferences) | no code | AC-27…AC-30 |
| D-15-10 | Dead `Welcome` notification class | `notifications.md` | not built (P-113) |
| D-15-11 | SMTP credentials typed into the admin and stored in the database, "test" sends with them | `Settings/SmtpComponent.php:296` | AC-10, AC-32 (keys in `.env`, Q-042) |

## Out of scope
- Bulk marketing email campaigns (none in legacy; spec 17 P-131).
- SMS provider integration (interface only, S-102 OFF).
- Web push in browsers (not in legacy; mobile push only, P-11).
- Per-type routing of admin notifications to different addresses (all go to all S-100 addresses at launch, Q-026).
- Email digests (daily summaries).
- The screens that trigger each event (specs 01–14, 16, 17).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-106 Preferences.** Users can switch off only: chat messages (email and push), "new projects in my categories" (email), "reviews I receive" (email and push), "referral points" (push). All order, payment, withdrawal, subscription, account and security notifications stay always on, and in-app notifications are always created. Everything is ON by default. Switchable emails have a one-click unsubscribe link (no login).
- **P-107 Notification centre.** The bell lists read and unread notifications (legacy showed unread only and lost them after reading), with "Mark all as read". Tapping marks read. In-app notifications older than 12 months are deleted (same window as the migration, Q-100). Migrated rows of removed features are not imported; merged keys are imported under their new key.
- **P-108 Push.** A short explanation appears before the phone's permission dialog ("Not now" asks again after 30 days). One token per app installation; removed at logout, ban or deletion; removed after 90 days unused. The push text is the same as the in-app text (chat pushes never show the message; codes are never pushed). The app icon badge = unread notifications + conversations with unseen messages. If the renewal reminder is configured for push only (S-044) and push is unavailable, it falls back to in-app (EC-9).
- **P-109 Email rules.** Recipient's language (fallback Georgian); admin emails in Georgian (the site default, as legacy); one separate email per admin address; 5 retries over about an hour; SendGrid bounces and spam reports mark the address as undeliverable (security emails are still attempted) and staff see a warning.
- **P-110 Safety cap.** Per user and hour, at most 30 emails and 60 pushes (security emails excluded); anything above is skipped (the in-app row stays) and logged. Existing throttles (chat 10 minutes, refund threads, resend limits) stay.
- **P-111 NEW staff/system emails.** (a) Invitation email for new staff accounts with a 48-hour set-password link. (b) "Critical setting changed" email to all admin addresses when a fee rule, the admin recipient list (sent to the old and the new list), custom code, allowed script hosts, payout provider, auto-release or 2FA switches, or social-login keys change. (c) System alert when a timer job (auto-release, award expiry, refund auto-reject, renewal, reminders, offer expiry) has not succeeded for 15 minutes, or when more than 20% of emails fail within an hour; at most once per problem per hour.
- **P-112 Maintenance email.** Keep `SiteIsDown`, but say who switched maintenance on and when, without the secret bypass link (staff can preview the public site from their admin session).
- **P-113 Legacy items without an earlier decision.** The dead `Welcome` email is not built (it was never sent). The two "send an email" mailables (to a user, to a newsletter subscriber) become one `StaffEmail` template. The SMTP test becomes "Send test email", which tests the SendGrid configuration from `.env`.

Added after approval (2026-09-29, parity gap G-1) — **ACCEPTED by the Owner on 2026-09-30 (Q-111):** **P-135** (defined in spec 05) gives EV-32 its owning AC (05 AC-46: one email per run with 1 or more differences, with the count and the day) and adds one trigger to EV-125 (a failed reconciliation run, at most once per run day). No new templates or keys in this spec.
