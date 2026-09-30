# 16 — Admin panel (admin.mytask.ge): staff, RBAC, audit, moderation, users, money, fees, settings, content, analytics, logs
Status: **approved** (Owner 2026-09-29; P-114…P-126; S-127 added to spec 00 accepted). AC-8 uses the accepted P-115 safe default until **Q-097** is answered
Updated 2026-09-30 with Owner gate answers: AC-7 step-up list extended (Q-145, Q-119); AC-9 own-account exception (Q-112); AC-21 portfolio `rejected` state + EV-126 (Q-117); AC-24 (Q-115); AC-32 staff switch off a user's 2FA with re-login and EV-127 (Q-145); AC-40 (Q-114); AC-42 withdrawals list/detail need `withdrawals.approve` + "details changed recently" flag (Q-113, Q-144); AC-44 P-135 accepted, negative legacy-hold residuals write-off only (Q-111, Q-120); AC-74 and S-127 fixed-code vendors only (Q-146); settings areas S-128 → payments (Q-137), S-129 → withdrawals (Q-144); permission catalogue `payments.read` / `withdrawals.approve` rows (Q-113).
Author: product-analyst (P2-A5) | Date: 2026-09-29
Legacy reference: `docs/01-discovery/routes-and-pages.md` ("Admin /dashboard", "/console"), `features.md` M (Admin) and N (Analytics), `roles-and-permissions.md`, `risks-and-debt.md` R-034. Owner decisions: vision (staff RBAC: Customer Support, Financial Manager, Content Moderator), Q-006, Q-015, Q-016, Q-021, Q-026, Q-032, Q-043/Q-063 (S-060), Q-054, Q-055, Q-057, Q-074, Q-083, Q-085, Q-088, Q-096, Q-097 (**open**), Q-101, Q-102. Platform rules: `00-platform-rules.md` §4 (register S-001…S-126, rules for editing, AC-8…AC-12), R-3.7 (ledger adjustments only), X-17, X-19, X-20; ACCEPTED P-4, P-5, P-12, P-20. Specs 01–15 and 17 own the business rules of each screen; this spec defines the admin app, staff access, RBAC and the admin-only modules, and links to the owning spec ACs instead of repeating them. ADR-005 (settings, Commission & Fee), ADR-006 §4 (translation overrides), ADR-010 (admin app and RBAC), ADR-012 (analytics), ADR-013 (web-root isolation), url-map §6; data-model §3.K, §3.P, §3.R, §3.S.

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID or vision), **ACCEPTED** (P-114…P-126, see "Open questions"). New settings row: **S-127 ACCEPTED** (added to spec 00).

Legacy code traced for this spec (read-only):
- Routes `routes/admin.php:9-1088` (group `web, auth:admin`, no roles), login `:1094-1100` (`banned.ip`, `guest:admin`); `/console` Filament resources `app/Filament/Resources/{Plan, ProjectCategory, Project, ReferralCodeBenefit, Subscription, User}Resource.php`; guards `config/auth.php:38-50`, `Admin::canAccessPanel` returns true (`app/Models/Admin.php:38-41`).
- Home `Admin/Home/HomeComponent.php:75-211`: recent users/gigs, tracker map/referrers/browsers/platforms/devices (`tracker_*`, fed by findip.net), "net income" = sum of order totals of unfinished items `:141-145`, taxes `:149`, commission `:153`, withdrawn `:157`, sales `:161`, gigs, users, **messages of the removed `conversations` chat** `:173`.
- Users `Admin/Users/UsersComponent.php:1` (search = **exact email only**; ban; soft delete; activate pending + `AccountActivated`), `Options/EditComponent.php:157-232` (edits username, email, **password** `:212`, account type, level, country, profile, status, **`balance_available` typed directly** `:228`), `Options/MessageComponent.php:83-94` (send email), `Options/RestrictComponent.php:89-367` (restrictions and appeals), `Transactions/TransactionsComponent.php:68-141` (deposit approve/reject), `Trash/TrashComponent.php:130, 208` (restore, permanent delete); Filament `UserResource.php:85-129` (filters status / restricted / created date; send email action `:116-128`; bulk delete `:130-133`).
- Moderation: `Admin/Gigs/GigsComponent.php:158` (delete → trash), `:211` publish, `:286` reject; `Gigs/Trash/TrashComponent.php:113, 197`; full gig edit by staff `Gigs/Options/EditComponent.php:1` and `Steps/*` (sends `PendingGig` again, `EditComponent.php:1755` per notifications.md); `Portfolios/PortfoliosComponent.php:65, 120` (delete, activate); `Projects/ProjectsComponent.php` (approve/reject); `Projects/Bids/BidsComponent.php` (approve/reject); `Offers/OffersComponent.php:76-474` (approve, reject, release, delete); `Reviews/ReviewsComponent.php:65` (hard delete); `Verifications/VerificationsComponent.php:67, 130`; `Reports/{Users,Gigs,Projects,Bids}Component.php` (users: ban `:86` / delete `:123`; gigs: delete report `:85`; projects and bids: mark `:65`, details `:116`); `Blog/Comments/CommentsComponent.php:64, 93, 126` (delete, approve, hide).
- Money: `Invoices/InvoicesComponent.php:66` (mark offline invoice paid), `Orders/OrdersComponent.php:66` (delete order, R-015), `Refunds/*`, `ProjectRefunds/*`, `UnblockRequests/*` (two approval implementations, Q-037), `Withdrawals/WithdrawalsComponent.php:67, 118`, `Projects/Milestones/MilestonesComponent.php` (staff completes a project).
- Catalog: `Categories|Subcategories|Childcategories/Options/*` (validator `Http/Validators/Admin/Categories/CreateValidator.php:34-48`; **delete with no reference check** `Categories/Options/DeleteComponent.php:1`); project categories; **skills admin commented out** `routes/admin.php:200-211`; `Countries/*`; `Levels/*` (X-05); `Packages/*`, `Attributes/*` (unused defaults, dropped in data-model §12.2).
- Content: `Pages/*`, `Blog/*`, `Newsletter/*`, `Support/*`, `Languages/Options/TranslateComponent.php:117-226` (**writes `lang/{code}/messages.php` on the server**), `Advertisements/AdvertisementsComponent.php:1` (`header_code`, `ad_service_360`, `ad_service_720`; only `header_code` and `footer_code` are rendered, on **every** layout incl. dashboards and auth: `components/layouts/dashboard-app.blade.php:114, 902`, `main/auth/layout/auth.blade.php:154`).
- Chat: `Conversations/ConversationsComponent.php`, `ConversationViewer.php`, `Chat/ChatComponent.php:56-76` (spec 08).
- Settings: `Settings/{General, Currency, Auth, Commission, Footer, Media, Publish, Security, Seo, Smtp, Withdrawal, Appearance, Hero, Chat}Component.php`; `Services/Payment/*` (29 gateways; **`edit/bog` wired to `IyzicoComponent`** `routes/admin.php:632`), `Services/Cloud/*`, `Services/RecaptchaComponent.php`, `Services/FindipComponent.php`.
- System: `System/MaintenanceComponent.php:83-157` (headline, message, secret; emails the secret `:124`), `System/CacheComponent.php:68-84` (clear cache, views, sessions), `System/CrontabComponent.php`, `System/ResetComponent.php:41-52` (**"factory reset" does nothing**), `System/LicensingComponent.php`; log viewer package under `public/vendor/log-viewer` (Q-054).
- Staff profile `Admin/Profile/ProfileComponent.php:82`; staff login throttle `Admin/Auth/LoginComponent.php:91-230`.

---

## Goal
Give MyTask staff one separate, secure admin app at `admin.mytask.ge` (Q-088, ADR-010) that replaces both legacy panels (X-17): staff accounts with flexible roles and permissions (vision), a complete audit trail, every moderation queue, user management, all money screens (without ever typing a balance), the Commission & Fee module and the settings register, content and translations, analytics without third-party IP lookup, and logs that are visible only here.

## Roles involved
- **Super-admin** (at least one, always): every permission, including staff management and custom code.
- **Customer Support**, **Financial Manager**, **Content Moderator**: default roles proposed in P-114 (editable data, not hard-coded).
- **Custom roles**: created by staff with `staff.manage`.
- **Users**: affected by staff actions; notified per spec 15.
- **System**: audit log writer, health checks, alerts (spec 15 EV-125).

## User stories
- As the Owner, I want to give a support agent access to users and conversations but not to payouts or fees, so that each person can do only their job.
- As a Financial Manager, I want to see pending withdrawals, disputes and unblock requests in one place and settle them with a reason, so that money never waits.
- As a Content Moderator, I want queues of pending gigs, projects and reports, oldest first, so that nothing is forgotten.
- As the Owner, I want to change a fee or a timer in the admin, with history and without a developer (Q-006, 00 AC-8).
- As the Owner, I want to know who changed what and when, so that mistakes and abuse can be traced.
- As the Owner, I want admin analytics of registrations, countries, devices and browsers without sending visitor IPs to other companies (Q-055).

## Acceptance criteria

### A. Access and staff accounts (Q-088, ADR-010, S-060, S-064)
- AC-1 Given any request, When it targets the admin, Then it is served only at `https://admin.mytask.ge` with `X-Robots-Tag: noindex, nofollow` and a `robots.txt` with `Disallow: /`; the public site has no admin pages or links; legacy `/dashboard/*` and `/console/*` answer 301 to `https://admin.mytask.ge/` (url-map §6). (CHANGE Q-088, X-17)
- AC-2 Given a staff member, When they log in with username or email and password, Then legacy admin password hashes are accepted and rehashed (ADR-002); staff 2FA applies per S-060 and S-124 (spec 01 AC-29); failed logins count towards the staff IP ban S-064 (01 AC-51); a user-account login never opens the admin, and a staff login never opens the public site as a user (separate identities, spec 00 Roles). The staff session ends after 12 hours or at logout. (LEGACY login + ban; CHANGE ADR-010 §2)
- AC-3 Given a staff member with `staff.manage` creates a staff account (full name, username, email, language, at least one role), When it is saved, Then the account is created without a password and the invitation email (spec 15 EV-123) with a single-use set-password link valid 48 hours is sent; the new staff member sets a password with the user password rules (spec 01); an expired link can be re-sent. Shared accounts are not offered. (NEW, ACCEPTED P-115)
- AC-4 Given a staff account, When a staff member with `staff.manage` disables it, Then its sessions end at once and it cannot log in; it can be re-enabled; there is no delete (its audit history stays readable). (NEW P-115)
- AC-5 Given a staff member, When they try to change their own roles or disable their own account, Then it is refused with `t_cannot_edit_own_roles`. Given the last active Super-admin, When anyone tries to remove the Super-admin role from them or disable them, Then it is refused with `t_last_super_admin`. (NEW ADR-010 §3)
- AC-6 Given `staff.manage`, When a staff member resets another staff member's trusted devices or ends their sessions, Then the next login asks for 2FA again (S-060). Every staff member can edit their own name, language, password (with the current password) and email (confirmed by a link to the new address). (LEGACY `Admin/Profile/ProfileComponent.php:82`; NEW device reset)
- AC-7 Given a high-risk action — staff or role changes, any fee rule, S-100, S-110, S-127, social-login keys (S-065…S-069), balance or points adjustments, withdrawal "mark as paid" or "reject", dispute decisions, "Release funds", "Refund buyer", unblock approval, user deletion, any export with personal data; releasing or writing off a legacy held balance (AC-44, Q-119); changing a user's email (AC-32); switching off a user's 2FA (AC-32); changing any of the security settings S-052, S-053, S-056…S-064, S-124; changing the Premium plan prices S-008/S-009 (AC-57); creating a promo code with a 100% discount (S-047 percent = 100), or with a fixed discount equal to or above the current price of a service it applies to (AC-58) — When the staff member has not re-authenticated in the last 15 minutes in the same session, Then the admin asks for the password (or the 2FA code, when 2FA is ON) before the action runs, and the API refuses the action without a valid re-authentication (`t_reauth_required`). (NEW ADR-010 §2, ACCEPTED P-115; list extended by the Owner 2026-09-30: legacy held balances Q-119, the rest Q-145 / SEC-06, SEC-07)
- AC-8 Given the legacy `admins` table, When the migration runs, Then the accounts to migrate and their roles follow the Owner's list — **waiting on Q-097**. Until the Owner answers, the proposed rule is: every legacy admin is imported **disabled and without a role** (password hash kept), and the Owner's list enables them and assigns roles; the Owner's own account is created as Super-admin. (Q-097 open; accepted default P-115)

### B. RBAC (vision; ADR-010 §3–§4)
- AC-9 Given any admin API operation, When it is called, Then it requires exactly one permission from the catalogue (table below); without it the API answers 403 with `t_u_dont_have_permissions_to_do_action` and nothing changes. An admin operation without a declared permission fails the startup check (deny by default). The only exception are a staff member's actions on their own account (log out, own profile, own password and email, re-authentication, maintenance preview, AC-6, AC-70): they need no catalogue permission, touch only the staff member's own data and are audited (Owner 2026-09-30, Q-112). The admin UI hides menu items and buttons the staff member cannot use (cosmetic only). (NEW ADR-010 §4; legacy had no permissions, D-16-1)
- AC-10 Given `staff.manage`, When a staff member creates or edits a role (name ka/en, description, ticked permissions), Then it is saved and audited. The Super-admin role is a system role with every permission and cannot be edited or deleted. `settings.custom_code.write` cannot be granted to any role other than Super-admin (Q-085). A role still assigned to staff cannot be deleted. (NEW)
- AC-11 Given a new installation, When it starts, Then the four roles of the matrix below exist with exactly the listed permissions. (NEW, ACCEPTED P-114)
- AC-12 Given a staff member's roles or a role's permissions change, When their next request arrives (at most 1 minute later), Then the new permissions apply without logging out. (NEW)
- AC-13 Given `staff.manage`, When the Staff list opens, Then it shows name, username, email, roles, status, 2FA state, last login time and IP country, with filters by role and status. (NEW)

### C. Audit log (ADR-010 §5)
- AC-14 Given any staff mutation, or a sensitive read (opening a conversation or attachment — spec 08 AC-30; viewing a KYC file; any export; viewing a secret's status), When it happens, Then an audit entry records staff member, permission used, action, target, before/after values (secrets redacted), reason (when asked), IP, user agent, time, request id and the ledger journal id for money actions. System actions (auto-release, auto-reject, expiry) are recorded with actor "system". (NEW ADR-010 §5)
- AC-15 Given the audit log, When anyone (staff or API) tries to edit or delete an entry, Then no such operation exists. Entries about money, fees, settings, staff and roles are kept permanently; other entries at least 5 years. (NEW, ACCEPTED P-116)
- AC-16 Given `audit.read`, When the audit viewer opens, Then entries can be filtered by staff member, action, target type and id, and date range; users, orders, contracts, offers, withdrawals and settings have a "History" tab with their own entries; CSV export is available (and is itself audited). (NEW)

### D. Dashboard home
- AC-17 Given a staff member opens the admin home, When it loads, Then it shows a counter for every queue they may access, each linking to the queue: pending gigs, portfolio items, projects, proposals, custom offers (only while S-035 is ON), blog comments; KYC; open reports; restriction appeals; open disputes; pending unblock requests; pending withdrawals; pending bank transfers (S-021); new support messages; legacy-hold residuals to review (AC-44); failed notification deliveries (AC-69). Counters refresh every minute. (LEGACY menu badges; NEW counters)
- AC-18 Given `dashboard.read` (and `payments.read` for the money figures), When the home loads, Then it shows for a chosen period (default 30 days): new users and total users, active gigs, active projects, completed orders, paid volume (GMV), platform fee revenue, card-surcharge revenue, withdrawals paid, the current total on HOLD, direct messages sent, plus the 10 newest users and gigs. Money figures come from the ledger (spec 00 §3), not from order totals. (LEGACY widgets; CHANGE fixes D-16-15, D-16-16; ACCEPTED P-119)

### E. Moderation queues (ADR-010 §7)
- AC-19 Given any moderation queue, When it opens, Then it lists pending items oldest first, 50 per page, with filters (date, owner, category); the detail shows the content as the public would see it plus an owner summary (status, plan, KYC state, number of reports, earlier rejections). "Approve" and "Reject" (reason required, ≤ 1,000 characters, shown to the owner) apply the rules and notifications of the owning spec; every decision is audited; if two staff decide the same item, the first decision wins and the second sees `t_item_already_decided`. Empty queue: `t_admin_queue_empty`. (LEGACY queues; CHANGE: reasons, audit, race safety)
- AC-20 Gigs (`gigs.moderate`): publish and reject per spec 04 AC-16…AC-18. For an active gig, staff can "Remove" it with an internal reason (it becomes deleted exactly like an owner deletion, refused while orders are in progress, spec 04) and "Restore" it within 30 days. Staff do not edit the gig's text, images or prices. (LEGACY delete/trash `GigsComponent.php:158`, `Trash/TrashComponent.php:113`; CHANGE: no staff content editing, ACCEPTED P-117)
- AC-21 Portfolio (`portfolio.moderate`): approve per spec 02 AC-25/AC-26; reject with reason per spec 02 AC-42 — the item keeps the status `rejected` (it is not deleted), the owner sees the reason and gets spec 15 EV-126 (email + in-app + push); remove a published item with reason. (LEGACY `PortfoliosComponent.php:65, 120`; rejected state and notification NEW, Owner 2026-09-30 Q-117)
- AC-22 Projects (`projects.moderate`): approve, reject, hide/unhide per spec 10 AC-11…AC-14. (LEGACY)
- AC-23 Proposals (`proposals.moderate`): approve and reject per spec 11 AC-9, AC-12. (LEGACY)
- AC-24 Custom offers (`offers.moderate`): while S-035 is ON, the approval queue works per spec 12 AC-11; the offers list (all statuses, read-only with `orders.read`) works per spec 12 AC-34 whatever S-035 says. Offer attachments open only with `orders.read`; the default Content Moderator role (no `orders.read`) decides offers without opening their attachments (Owner 2026-09-30, Q-115: accepted as is). (LEGACY `Offers/OffersComponent.php:76, 152`)
- AC-25 Reviews (`reviews.moderate`): hide/unhide and the list filters per spec 07 AC-19, AC-20; there is no hard delete. (CHANGE: legacy hard delete `ReviewsComponent.php:65`)
- AC-26 Blog comments (`comments.moderate`): pending queue while S-074 is OFF, and all comments list; actions Publish, Hide, Delete (spam) per spec 17 AC-20. (LEGACY `CommentsComponent.php:64, 93, 126`)
- AC-27 KYC (`kyc.review`): approve or decline (reason required) per spec 02 AC-36/AC-37; the ID and selfie images open through short-lived signed links (ADR-009) and every view is audited. (LEGACY; CHANGE audit, signed files)
- AC-28 Reports (`reports.handle`): one queue for profile, gig, project and proposal reports, grouped by reported item with the number of reports; each report shows reporter, reason and date; actions: "Dismiss" or "Resolve" (note required), "Open item", and shortcuts, shown only with the matching permission, to remove a gig, hide a project, reject a proposal, restrict or ban the user. Reporters are not notified (legacy). (LEGACY `Reports/*Component.php`; one queue ACCEPTED P-118)
- AC-29 Restriction appeals (`users.restrict`): list of submitted appeals oldest first with the user's restriction message, answer and files; approve, reject, delete restriction per spec 01 AC-47…AC-50. (LEGACY `RestrictComponent.php:183-367`)

### F. Users (spec 01, 02, 05, 09)
- AC-30 Given `users.read`, When staff search users, Then partial matches on username, email and full name are found, plus exact matches on the legacy id and user id; filters: status (active, pending, verified, banned, deleted), restricted, Premium, KYC status, registration date range, country; 50 per page, newest first. (CHANGE: legacy searched the exact email only, `UsersComponent.php:1`; Filament filters kept)
- AC-31 Given a user's page, When it opens, Then it shows tabs: Overview (profile, status, language, registration, last activity, last login IP country, email-deliverability warning of spec 15 AC-11), Balances and transactions (Available, HOLD/Pending, Withdrawn, points, ledger lines; with `payments.read`), Orders (as buyer and as freelancer), Gigs, Projects and proposals, Custom offers, Reviews given and received, Subscriptions and referrals (legacy Filament referrals relation), KYC, Restrictions and appeals, Reports about and by the user, Devices and sessions, Conversations (link; `chat.read`), History (audit). (LEGACY details + Filament; NEW tabs)
- AC-32 Given the matching permission, When staff act on a user, Then these actions exist, each with a confirmation, a reason where noted, and an audit entry: activate a pending user (`users.activate`, spec 01 AC-5); ban/unban with reason (`users.ban`, 01 AC-45); restrict with message (`users.restrict`, 01 AC-46); send a password-reset link, end all sessions, reset trusted devices (`users.edit`); switch off the user's 2FA (`users.edit`, reason required, re-authentication AC-7; the user gets spec 15 EV-127 by email and in-app — NEW, Owner 2026-09-30 Q-145; permission = contract default until slice item Q-132); edit username, full name, headline, about, country, remove avatar (`users.edit`); change email through the confirmation flow of spec 02 AC-30 (`users.edit`, re-authentication AC-7, Q-145; when the new email becomes active, the withdrawal pause of spec 14 AC-21 starts, Q-144); send an email (`users.email`, spec 15 EV-120); delete/restore (`users.delete`, AC-34); balance adjustment (`ledger.adjust`, spec 05 AC-41/AC-42); points add/deduct (`points.adjust`, 05 AC-43, Q-016); gift or cancel Premium (`subscriptions.manage`, 09 AC-35/AC-36). (LEGACY actions; CHANGE per P-117)
- AC-33 Given any staff member, When they look for a way to type a user's password or balance, or to log in as a user, Then none exists: passwords change only through the reset link, balances only through ledger adjustments (P-12, X-19), and there is no impersonation. (CHANGE fixes D-16-2, D-16-3; ACCEPTED P-117)
- AC-34 Given `users.delete`, When staff delete a user, Then it is refused under the same conditions as self-deletion (spec 02 AC-32, AC-33; 14 AC-20) with the same messages; otherwise the account is soft-deleted (sessions and push tokens end, profile hidden), listed under "Deleted users" and can be restored within 30 days; there is no permanent delete in the admin (ledger and review history must stay). (LEGACY trash `Trash/TrashComponent.php:130`; CHANGE: no permanent delete `:208`, ACCEPTED P-117)
- AC-35 Given `security.ip_bans`, When staff open "Banned IPs", Then they can list, add and remove bans per spec 01 AC-52 (P-20, Q-057). (ACCEPTED P-20)

### G. Money screens (specs 05, 06, 09, 11–14)
- AC-36 Given `payments.read`, When staff open Payments, Then every card and wallet payment is listed (id, BOG order id, user, purpose: gig order, project payment, custom offer, top-up, subscription; amount, surcharge, status, created and verified time) with filters; the detail shows the payment's event log (callbacks, status checks) and its ledger journal. "Check status at BOG" runs the same verified path as spec 05 AC-13 (idempotent; never trusts the browser). (NEW view; check ACCEPTED P-119)
- AC-37 Given the Payments list, When the "Unapplied" filter is used, Then payments credited to a wallet under spec 05 AC-15 are listed with their journal; staff can mark them "reviewed" (no money moves). (NEW, spec 05 P-40)
- AC-38 Given `orders.read`, When staff open Orders, Project contracts or Custom offers, Then they get lists with status filters and a read-only detail (timeline, deliveries through signed links per spec 06 AC-24, revisions, refund state); the item's thread opens with `chat.read` (spec 08 AC-29, audited); the staff money tools "Release funds" and "Refund buyer" of spec 13 AC-29/AC-30 appear on the item for staff with `escrow.release` / `escrow.refund`. There is no "delete order". (LEGACY lists; CHANGE: legacy order delete removed, spec 06 D-06-17)
- AC-39 Given `payments.read`, When staff open Escrows, Then every open HOLD is listed (item, freelancer, buyer, amount, status, delivered at, auto-release deadline or the reason it is paused: revision, refund request, dispute, auto-release OFF), with an "overdue" filter; the total equals the platform HOLD balance. (NEW, ADR-003)
- AC-40 Given `refunds.resolve`, When staff open Disputes and Refunds, Then disputes and all refund requests work per spec 13 AC-15…AC-22; staff with only `refunds.thread.write` can read and write in refund threads but cannot decide. Refund threads open only with `refunds.thread.write`; all other conversation kinds need `chat.read` (Owner 2026-09-30, Q-114: kept). (spec 13; split ACCEPTED P-114)
- AC-41 Given `escrow.release`, When staff open Unblock requests, Then the queue works per spec 13 AC-23…AC-28, with a banner saying whether freelancers can currently create requests (S-025 OFF or S-029 ON). (spec 13; P-5)
- AC-42 Given `withdrawals.approve`, When staff open Withdrawals, Then the list, the detail, "Mark as paid" and "Reject" work per spec 14 AC-13…AC-17, and the list and detail show the "details changed recently" flag and the latest change dates per spec 14 AC-23. Given a staff member without `withdrawals.approve` (including Customer Support with `payments.read`), When they open the withdrawals list or a withdrawal detail, Then it is refused with 403 and no IBAN or account holder name is shown; the Withdrawals menu item and the home counter are hidden for them. (spec 14; permission Owner 2026-09-30 Q-113, closes SEC-08; flag Q-144)
- AC-43 Given `payments.offline.approve`, When S-021 is ON or pending bank transfers exist, Then the Bank transfers screen confirms or rejects order transfers and top-ups per spec 05 AC-25/AC-26; otherwise the menu item is hidden. (spec 05; LEGACY `InvoicesComponent.php:66`, `TransactionsComponent.php:68-141`)
- AC-44 Given `ledger.adjust`, When staff open "Legacy hold residuals", Then each migrated residual (user, amount, legacy source) can be "Released to Available" or "Written off", each with a required reason, re-authentication (AC-7, Q-119), one ledger journal and an audit entry (Q-096). Given a **negative** residual, When staff choose "Released to Available", Then it is refused with `t_admin_negative_residual_write_off_only` and nothing changes; only "Written off" is offered and accepted for it (the user's Available balance does not change). (Owner 2026-09-30, Q-120) Given `payments.read`, When staff open "Reconciliation", Then the nightly ledger/BOG results are listed by day with every difference and its details (ADR-003 §10, spec 15 EV-32). (Q-096; ADR-003) Run schedule, checks, alert and screen behaviour: spec 05 AC-44…AC-47 (ACCEPTED P-135, added 2026-09-29 for parity gap G-1, Owner 2026-09-30 Q-111; marking a difference "reviewed" uses `payments.read` like AC-37).
- AC-45 Given `payments.read`, When staff open the Ledger viewer, Then journals can be looked up by user, item or reference, read-only, with debit/credit lines and account balances; nothing can be edited. (NEW, ADR-003)

### H. Commission & Fee module UI (Q-006; spec 00 §4.2, spec 05 AC-37…AC-40)
- AC-46 Given `fees.write`, When staff open Commission & Fees, Then every fee rule is listed (S-010…S-018 and any rule added later): name, purpose (`applies_to`), payer, type, value, plan scope, enabled, effective from, version number, changed by. Staff with only `settings.read` see the list read-only. (NEW Q-006)
- AC-47 Given a staff member edits a rule, When they save, Then the values are validated (percent 0–100 with at most 2 decimals; fixed amount 0–100,000 GEL; payer allowed for the purpose: withdrawal → freelancer, card surcharge and top-up → buyer), a live example shows the effect on a 100.00 GEL item (buyer pays, freelancer HOLD or payout, platform revenue), a reason is required, re-authentication applies (AC-7), a new version effective immediately is stored, transactions created earlier keep their version (00 AC-9, 05 AC-39), and spec 15 EV-124 is sent. (NEW; immediate effect ACCEPTED P-123)
- AC-48 Given a rule, When staff open its history, Then all versions are listed (who, when, old → new, reason); "Restore this version" creates a new version with those values. (NEW ADR-005)
- AC-49 Given `fees.write`, When staff add a new rule for a supported purpose, Then it is created OFF (00 §4.2). The project posting fee (S-016) cannot be switched ON while no posting-payment flow exists: its switch is disabled with `t_fee_requires_payment_flow` (spec 10 Out of scope). (NEW)
- AC-50 Given the fee screens, When they are shown, Then they state that promo codes never reduce fees (R-3.9, Q-064a); there is no promo field on fee rules. (Q-064)

### I. Settings register UI (spec 00 §4; ADR-005)
- AC-51 Given `settings.read`, When staff open Settings, Then all register rows are grouped by the areas of the table below, searchable by ID, key or meaning; each row shows ID, key, meaning (ka/en), type, current value, default, source and tag, and the last change (who, when). (NEW 00 AC-8)
- AC-52 Given `settings.<area>.write`, When staff edit a row, Then the control matches the type (switch, number with unit, list, text per language, email list, enum), the register validation applies (00 AC-10, out-of-range refused with `t_setting_invalid_value` and the old value kept), a confirmation shows old → new value and, for switches, the consequences of 00 AC-11/EC-1; after saving, the value applies to web, mobile and API within 60 seconds without a deployment (00 AC-8); the change is audited and versioned rows (V) get a new version. (NEW 00 AC-8…AC-11; 60-second rule ACCEPTED P-123)
- AC-53 Given a setting, When staff open its History, Then every change (who, when, old → new) and, for V rows, the versions are listed; "Restore" creates a new change with the old value. (NEW)
- AC-54 Given a secret field (social-login client secrets S-065…S-069), When it is shown, Then only "set" or "not set" appears; staff can replace or clear it after re-authentication; the value is never returned by the API nor written to the audit log. Enabling a provider without keys is refused (00 EC-10). (NEW 00 §4 rules, Q-032, Q-102)
- AC-55 Given `settings.notifications.write`, When staff edit S-100, Then they add or remove addresses (at least one, valid emails), can send a test email (spec 15 AC-32), and the change triggers spec 15 EV-124 to the old and new lists. (NEW Q-026)
- AC-56 Given a change of any "critical" setting (fee rules, S-025, S-033, S-056, S-060, S-065…S-069, S-100, S-110, S-127), When it is saved, Then spec 15 EV-124 goes to every S-100 address. (NEW, ACCEPTED P-111)

### J. Plans, promo codes, referral benefits, subscriptions (spec 09; Q-021)
- AC-57 Given `settings.plans.write`, When staff edit plans, Then they change the Premium prices S-008/S-009 (versioned; spec 09 AC-37), the limits S-001…S-007 (00 AC-6), and the plan texts in ka/en (names, descriptions, included and excluded features; R-2.6), with a preview of the `/subscription` page. (LEGACY Filament `PlanResource.php`; NEW limits)
- AC-58 Given `promo_codes.write`, When staff manage promo codes and referral-code benefits, Then everything works per spec 09 AC-26…AC-33; points per event (S-046) are edited with `settings.subscriptions.write`. (NEW Q-018/Q-053; LEGACY `ReferralCodeBenefitResource.php`)
- AC-59 Given `payments.read`, When staff open Subscriptions, Then the list and filters work per spec 09 AC-34; gift and cancel need `subscriptions.manage` (09 AC-35, AC-36). (LEGACY Filament `SubscriptionResource.php`)

### K. Catalog (spec 03)
- AC-60 Given `catalog.write`, When staff create or edit a gig category at any of the 3 levels, Then name (ka/en, ≤ 60), slug (unique, lower-case Latin, ≤ 60), description (≤ 300), SEO text above/below the list (ka/en), icon, image, visibility on the home page (spec 03 AC-5) and position are saved; changing a slug makes the old category URL answer 301 to the new one (spec 17 AC-10); deleting a category, sub-category or child category that still has children, gigs or linked projects is refused with `t_category_in_use` (spec 03 EC-2). (LEGACY validator `CreateValidator.php:34-48`; CHANGE: legacy deleted without checks, D-16-5)
- AC-61 Given `catalog.write`, When staff manage project categories and skills, Then a project category has name (ka/en), slug, SEO description and one linked top-level gig category (spec 03 P-31); skills (name ka/en, slug) belong to one project category; items in use cannot be deleted (`t_category_in_use`). (LEGACY project categories; NEW skills screen, legacy screen disabled `routes/admin.php:200-211`)
- AC-62 Given `catalog.write`, When staff open Countries, Then they can edit names (ka/en) and switch a country active/inactive; a country used by any user cannot be deleted. (LEGACY `Countries/*`, ACCEPTED P-125)

### L. Content, translations, conversations
- AC-63 Given the matching permission, When staff open CMS pages, Blog, Blog comments, Newsletter, Support messages or Home content, Then these screens work per spec 17 (pages AC-6…AC-10, blog AC-15…AC-22, contact/support AC-23…AC-27, newsletter AC-28…AC-34, home AC-35…AC-37) with `content.write`, `comments.moderate`, `newsletter.manage` and `support.handle`. (LEGACY content screens)
- AC-64 Given `translations.write`, When staff open Translations, Then they can search keys by name or by ka/en text; each key shows the base value (from `packages/i18n`) and the override; saving an override is refused with `t_translation_placeholders_mismatch` when its placeholders differ from the base value, and HTML is not accepted; "Reset" removes the override; overrides appear on the web within 60 seconds and in the app at its next start or refresh (ADR-006 §4); every change is audited; "Export overrides" downloads a JSON file for committing to git. Staff cannot create or delete keys. (LEGACY editor `TranslateComponent.php:152-226`; CHANGE database overrides instead of server files, D-16-7; ACCEPTED P-124)
- AC-65 Given `chat.read` / `chat.moderate`, When staff open Conversations, Then search, read-only viewing, audit and hide/unhide work per spec 08 AC-29…AC-31. (spec 08)

### M. Analytics (vision; Q-055, Q-101; ADR-012)
- AC-66 Given `analytics.read`, When staff open Analytics, Then they choose a period (7, 30, 90, 365 days or custom; compared with the previous period) and see: registrations over time (by day/week/month), logins, web page views and unique visitors, app opens, users and visits by country and city (top 20 and a map), device type, operating system, browser, platform (web/iOS/Android), referrer domains, most viewed gigs and projects, paid orders (count and volume), new gigs and projects; each widget can be exported as CSV. (LEGACY home widgets `HomeComponent.php:96-137`; NEW widgets ACCEPTED P-120)
- AC-67 Given the analytics data, When it is collected and shown, Then it is first-party only: country and city come from the local GeoIP database or the edge header (ADR-012); no IP address is sent to any third party (Q-055, X-09); no raw IP is shown; raw events are kept 90 days and daily aggregates permanently; imported legacy aggregates (Q-101) are marked "legacy"; the page shows the GeoIP database attribution. (CHANGE Q-055, fixes D-16-11)

### N. Logs, system health, maintenance (Q-054; ADR-013)
- AC-68 Given `system.logs.read`, When staff open System logs, Then warnings, errors and fatal entries of the last 30 days are listed (level, source api/worker/websocket, message, request id, time, redacted context) with filters; raw log files cannot be downloaded, and no log is reachable through any public URL. (LEGACY log viewer; CHANGE Q-054, fixes D-16-12)
- AC-69 Given `system.health.read`, When staff open System health, Then they see each background job (auto-release, award expiry, refund auto-reject, offer expiry, renewal, reminders, sitemap, analytics roll-up, GeoIP update, reconciliation) with last success, last error and processed count (red after 15 minutes without success for minute jobs), queue sizes, the time of the last BOG callback, and the notification delivery log (failed and suppressed deliveries of the last 90 days, with "Retry" for failed emails). Problems trigger spec 15 EV-125. (NEW ADR-008 §8; replaces legacy crontab screen; ACCEPTED P-121)
- AC-70 Given `settings.system.write`, When staff switch maintenance mode S-121 ON with a headline and message (ka/en), Then the public website and the mobile app show the maintenance screen (web HTTP 503 with `Retry-After`; API answers `MAINTENANCE` to user requests), while the admin app, the BOG callback, health checks, background jobs and notifications keep working; staff logged in to the admin can open a "Preview public site" link that bypasses maintenance for their browser only; spec 15 EV-122 is sent. Switching OFF reopens everything. (LEGACY `MaintenanceComponent.php:83-157`; CHANGE: no secret link, P-112)
- AC-71 Given `settings.system.write`, When staff press "Refresh caches", Then public page caches, the settings cache and the translation cache are revalidated; the action is audited. (LEGACY `CacheComponent.php:68-84`; ACCEPTED P-121)

### O. Custom code for public pages (S-110; Q-085; S-127)
- AC-72 Given a staff member who is not Super-admin, When they open Settings, Then S-110 (custom HTML/JS for head and footer) and S-127 are not visible and their API refuses access. (Q-085)
- AC-73 Given custom code is saved, When pages render, Then it is output only on public pages (home, categories, search, `/hire`, `/sellers`, `/explore/projects`, gig, project, profile, portfolio, blog, CMS pages, `/gita`, `/subscription`, `/help/contact`) and never on auth, account, seller, cart, checkout, payment, inbox or restricted pages, in the admin app, in emails, or in the mobile app. (CHANGE Q-085; legacy injected it everywhere, D-16-10)
- AC-74 Given the Super-admin saves custom code, When it references an external host (script, iframe, image, connection), Then every such host must be listed in S-127 `appearance.custom_code.allowed_hosts`; otherwise the save is refused with `t_custom_code_host_not_allowed` naming the hosts. The public pages' script protection (CSP) allows exactly the S-127 hosts plus the inline blocks of the saved custom code. (NEW Q-085, S-127 ACCEPTED P-122)
- AC-74a Given the Super-admin adds a host to S-127, When they save, Then the save is accepted only if they tick `t_custom_code_fixed_vendor_confirm` (the host serves fixed vendor code such as an analytics or advertising pixel, pinned to a version where the vendor allows it — not a tag manager or any other service whose code can be changed outside MyTask); without the tick it is refused with `t_custom_code_fixed_vendor_required`. The screen shows `t_custom_code_fixed_vendor_hint`; the confirmation is stored with the host and audited. (NEW, Owner 2026-09-30 Q-146 option (c): fixed-code vendors only for now; isolating custom code is studied in Phase 3, see Out of scope)
- AC-75 Given custom code changes, When they are saved, Then the full before/after is audited and spec 15 EV-124 is sent; a "Disable custom code" switch removes it from all pages at once. Legacy custom code (settings_appearance custom codes and the legacy `advertisements.header_code`/`footer_code`) is imported **disabled** until the Super-admin reviews it and lists its hosts in S-127. (NEW P-122; legacy `AdvertisementsComponent.php:1`)

### P. Admin app basics
- AC-76 Given a staff member, When they use the admin, Then the interface is available in Georgian and English (their choice, stored on the staff account) through i18n keys; it works on desktop and down to tablet and phone widths; lists are sortable and paginated; every destructive action asks for confirmation; forms show field errors. There is no admin in the mobile app. (NEW ADR-010 §1)
- AC-77 Given any CSV export in the admin, When staff export, Then it needs the list's read permission, contains no secrets, is recorded in the audit log with the filter used, and exports with personal data (users, newsletter subscribers, support messages) require re-authentication (AC-7). (NEW, ACCEPTED P-126)
- AC-78 Given a legacy admin screen that is not carried over (table "Legacy admin screens" below), When staff look for it, Then it does not exist, and the matching values live in `.env`, the design tokens or another screen as listed. (00 AC-26, X-17, X-20)

---

## Permission catalogue and default roles (ACCEPTED P-114)
✓ = granted by default. SA = Super-admin, CS = Customer Support, FM = Financial Manager, CM = Content Moderator. Roles are editable data; only the Super-admin role and the non-grantable permission are fixed. Permission names follow ADR-010 and the names already used in approved specs (`refunds.resolve`, `escrow.release`, `escrow.refund`, `withdrawals.approve`, `chat.read`, `chat.moderate`).

| Area | Permission | Allows | SA | CS | FM | CM |
|---|---|---|---|---|---|---|
| Home | `dashboard.read` | admin home, queue counters, non-money KPIs | ✓ | ✓ | ✓ | ✓ |
| Home | `analytics.read` | analytics dashboards (AC-66) | ✓ | – | ✓ | – |
| Users | `users.read` | search and view users (AC-30, AC-31) | ✓ | ✓ | ✓ | ✓ |
| Users | `users.edit` | edit profile fields, send reset link, end sessions, reset devices | ✓ | ✓ | – | – |
| Users | `users.activate` | activate pending users | ✓ | ✓ | – | – |
| Users | `users.restrict` | restrict, decide appeals, delete restrictions | ✓ | ✓ | – | ✓ |
| Users | `users.ban` | ban and unban | ✓ | – | – | ✓ |
| Users | `users.delete` | delete and restore accounts | ✓ | – | – | – |
| Users | `users.email` | send an email to a user | ✓ | ✓ | – | – |
| Users | `security.ip_bans` | banned IPs (01 AC-52) | ✓ | – | – | – |
| Users | `kyc.review` | view KYC files, approve/decline | ✓ | ✓ | – | – |
| Moderation | `gigs.moderate` | publish, reject, remove, restore gigs | ✓ | – | – | ✓ |
| Moderation | `portfolio.moderate` | portfolio queue | ✓ | – | – | ✓ |
| Moderation | `projects.moderate` | approve, reject, hide projects | ✓ | – | – | ✓ |
| Moderation | `proposals.moderate` | approve, reject proposals | ✓ | – | – | ✓ |
| Moderation | `offers.moderate` | custom-offer approval (S-035 ON) | ✓ | – | – | ✓ |
| Moderation | `reviews.moderate` | hide/unhide reviews | ✓ | – | – | ✓ |
| Moderation | `comments.moderate` | blog comments | ✓ | – | – | ✓ |
| Moderation | `reports.handle` | reports queue | ✓ | ✓ | – | ✓ |
| Chat | `chat.read` | read conversations and threads, audited (Q-015) | ✓ | ✓ | ✓ | ✓ |
| Chat | `chat.moderate` | hide/unhide messages | ✓ | – | – | ✓ |
| Money | `orders.read` | orders, contracts, offers, deliveries | ✓ | ✓ | ✓ | – |
| Money | `payments.read` | payments, ledger, escrows, transactions, refunds lists, reconciliation, money KPIs (not the withdrawals list or detail, Q-113) | ✓ | ✓ | ✓ | – |
| Money | `payments.offline.approve` | confirm/reject bank transfers | ✓ | – | ✓ | – |
| Money | `refunds.thread.write` | read and write in refund threads (no decision) | ✓ | ✓ | ✓ | – |
| Money | `refunds.resolve` | decide disputes (spec 13) | ✓ | – | ✓ | – |
| Money | `escrow.release` | approve unblock requests, "Release funds" | ✓ | – | ✓ | – |
| Money | `escrow.refund` | "Refund buyer" | ✓ | – | ✓ | – |
| Money | `withdrawals.approve` | withdrawals list and detail (with IBANs and holder names), mark paid, reject withdrawals (Q-113) | ✓ | – | ✓ | – |
| Money | `ledger.adjust` | balance adjustments, legacy-hold residuals | ✓ | – | ✓ | – |
| Money | `points.adjust` | add/deduct points (Q-016) | ✓ | – | ✓ | – |
| Money | `subscriptions.manage` | gift/cancel Premium | ✓ | – | ✓ | – |
| Money | `promo_codes.write` | promo codes, referral-code benefits | ✓ | – | ✓ | – |
| Money | `fees.write` | Commission & Fee module | ✓ | – | – | – |
| Catalog and content | `catalog.write` | categories, project categories, skills, countries | ✓ | – | – | ✓ |
| Catalog and content | `content.write` | CMS pages, blog articles, home content | ✓ | – | – | ✓ |
| Catalog and content | `newsletter.manage` | subscribers, export, send email | ✓ | – | – | ✓ |
| Catalog and content | `support.handle` | contact messages, replies | ✓ | ✓ | – | – |
| Catalog and content | `translations.write` | translation overrides | ✓ | – | – | ✓ |
| Settings | `settings.read` | view the register and fee rules | ✓ | ✓ | ✓ | ✓ |
| Settings | `settings.<area>.write` | edit one settings area (table below) | ✓ all | – | – | `settings.content.write` |
| Settings | `settings.custom_code.write` | S-110 and S-127 — **Super-admin only, cannot be granted** | ✓ | – | – | – |
| System | `system.logs.read` | system logs | ✓ | – | – | – |
| System | `system.health.read` | job health, queues, delivery log | ✓ | – | – | – |
| System | `audit.read` | audit log viewer and History tabs | ✓ | – | – | – |
| System | `staff.manage` | staff accounts and roles | ✓ | – | – | – |

### Settings areas (write permission per area)
| Area | Register rows | Write permission |
|---|---|---|
| Plans and limits | S-001…S-009 | `settings.plans.write` |
| Commission & Fee | S-010…S-018 | `fees.write` (module screen, AC-46…AC-50) |
| Payment methods and wallet (payments) | S-019…S-024, S-125, S-128 (Q-137) | `settings.payments.write` |
| Escrow timers, refunds | S-025…S-030 | `settings.escrow.write` |
| Withdrawals | S-031…S-033, S-129 (Q-144) | `settings.withdrawals.write` |
| Marketplace rules (custom offers, revisions, projects) | S-034…S-041, S-075, S-076 | `settings.marketplace.write` |
| Subscriptions, points | S-042…S-046, S-126 (per-code fields S-047…S-051 on each code, `promo_codes.write`) | `settings.subscriptions.write` |
| Authentication and security | S-052…S-069, S-124 | `settings.auth.write` (re-authentication AC-7 for S-052, S-053, S-056…S-064, S-124 (Q-145) and for the keys, AC-54) |
| Moderation | S-070…S-074 | `settings.moderation.write` |
| Uploads and media | S-077…S-093 | `settings.media.write` |
| Chat | S-094…S-099 | `settings.chat.write` |
| Notifications | S-100…S-102 | `settings.notifications.write` |
| Content, appearance, SEO | S-104…S-109, S-111…S-120, S-123 | `settings.content.write` |
| Custom code | S-110, S-127 | `settings.custom_code.write` (Super-admin only) |
| System and integrations | S-103, S-121, S-122 | `settings.system.write` |

## Business rules
- R-A1 **Placement** (Q-088, ADR-010 §1): separate front-end app at `admin.mytask.ge`, same API (`/api/v1/admin/*`), staff-only tokens; no admin in the public web bundle or the mobile app.
- R-A2 **Staff identity**: staff accounts are separate from user accounts (spec 00 Roles); 2FA per S-060/S-124; IP ban per S-064; sessions 12 hours; step-up re-authentication within 15 minutes for the actions of AC-7.
- R-A3 **RBAC**: fixed permission catalogue in code; roles are data; deny by default; enforcement only in the API; at least one active Super-admin; nobody edits their own roles; `settings.custom_code.write` is Super-admin only (Q-085).
- R-A4 **Audit** (ADR-010 §5): append-only; every staff mutation and every sensitive read; money, fee, settings, staff and role entries kept permanently, others ≥ 5 years (P-116).
- R-A5 **Money actions are domain operations** (ADR-010 §6, R-3.7): approve/reject withdrawals, dispute decisions, unblock approvals, manual release/refund, ledger adjustments, points adjustments, legacy-hold settlements — each uses the same service as the user/system path and posts ledger journals; nobody edits balances, orders or ledger rows directly.
- R-A6 **Moderation**: queues are status lists of the owning entities; decisions follow the owning spec and send its notifications; staff do not rewrite users' content (P-117).
- R-A7 **Settings** (00 §4): every change validated, audited, versioned where marked V, effective within 60 seconds, never needs a deployment; secrets write-only; toggles OFF follow 00 AC-11/EC-1.
- R-A8 **Personal data**: staff see personal data only through permissions; KYC files and chats only through audited signed links; exports with personal data need re-authentication and are audited.
- R-A9 **Logs** (Q-054, ADR-013): logs are stored outside the web root and shown only inside the admin; no download of raw files.
- R-A10 **Custom code** (Q-085): Super-admin only, public pages only, hosts restricted by S-127, audited, alert on change. S-127 may list only fixed-code vendors (no tag managers or other remotely changeable code), confirmed per host (AC-74a; Owner 2026-09-30 Q-146).

## Money movements
The admin creates no new kind of money movement. Every staff money action is defined in its owning spec and mapped to ledger postings there: bank-transfer confirmations (spec 05 MM rows), balance adjustments (05 AC-41), points adjustments (05 AC-43, points ledger), dispute decisions, unblock approvals, "Release funds", "Refund buyer" (spec 13 MM-13-xx), withdrawals paid/rejected (spec 14), gifts/cancellations (spec 09). Legacy-hold residual settlement (AC-44): **from** the user's `legacy_hold` opening account **to** the user's Available balance (release) or to the platform adjustments account (write-off), amount = the residual, trigger = staff decision with reason, reference `legacy_hold:{userId}:settle` (one per user; data-model §12.3). A negative residual can only be written off (the journal runs the other way, between the platform adjustments account and `legacy_hold`, and never touches Available; Owner 2026-09-30, Q-120).

## Screens (web; the admin has no mobile app) and states
| Screen | Content | States |
|---|---|---|
| Login, 2FA, set password | username/email + password; code screen; invitation set-password | error messages; locked IP (`t_ip_banned`, spec 01); expired link |
| Home | queue counters, KPI cards with period picker, recent users/gigs | loading skeletons; empty counters show 0; error per card with retry |
| Staff, Roles | tables; role editor with permission checklist grouped by area | – |
| Audit log | filterable table; entry detail with before/after diff | empty `t_admin_no_results` |
| Moderation queues (gigs, portfolio, projects, proposals, offers, reviews, comments, KYC, reports, appeals) | list + detail side panel with Approve/Reject/other actions and reason field | empty `t_admin_queue_empty`; already decided `t_item_already_decided` |
| Users | search + filters; user page with tabs; action menu | not found; deleted user banner with Restore |
| Money (Payments, Orders, Contracts, Offers, Escrows, Disputes, Refunds, Unblock requests, Withdrawals, Bank transfers, Legacy hold residuals, Reconciliation, Ledger) | tables with filters; detail pages; decision forms with reason and confirmation | – |
| Commission & Fees | rules table, edit drawer with live example, history | read-only mode without `fees.write` |
| Settings | area navigation, rows table, edit dialog with confirmation, history | validation error inline; saved toast |
| Plans, Promo codes, Referral benefits, Subscriptions | forms and tables per spec 09 | – |
| Catalog | tree of gig categories; project categories with skills; countries | in-use delete refused |
| Content (spec 17), Translations, Conversations (spec 08) | editors and lists | – |
| Analytics | period picker, charts, map, tables, CSV export | no data for period |
| System logs, System health, Maintenance, Refresh caches, Custom code | tables, status tiles, forms | red tiles for failing jobs |

Accessibility: the admin uses the same design tokens and components (`packages/ui`), keyboard-usable tables and dialogs, labelled form fields, status shown with text and not colour only.

## Notifications triggered
- Staff invitation (spec 15 EV-123), critical setting changed (EV-124), system alert (EV-125) — NEW, ACCEPTED P-111.
- Maintenance ON (EV-122, legacy `SiteIsDown`, changed per P-112); test email (EV-121); staff email to a user (EV-120).
- Every moderation, user and money action sends the notifications of its owning spec (catalogue in spec 15).
- Added 2026-09-30: portfolio rejected (EV-126, AC-21, Q-117) and 2FA switched off by staff (EV-127, AC-32, Q-145) — both NEW, to the user.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_dashboard` | Dashboard | მართვის პანელი |
| `t_users` | Users | მომხმარებლები |
| `t_settings` | Settings | პარამეტრები |
| `t_analytics` | Analytics | ანალიტიკა |
| `t_reports` | Reports | რეპორტები |
| `t_pages` | Pages | გვერდები |
| `t_support` | Support | დახმარება |
| `t_maintenance_mode` | Maintenance mode | განახლების რეჟიმი |
| `t_logs` | Logs | ლოგები |
| `t_system_logs` | System logs | (legacy ka value is English; NEW ka) სისტემური ლოგები |
| `t_notifications` | Notifications | სიახლეები |
| `t_u_dont_have_permissions_to_access_page` | You do not have permission to access this page | თქვენ არ გაქვთ ამ გვერდზე წვდომის უფლება |
| `t_u_dont_have_permissions_to_do_action` | You don’t have permissions to do this action. | თქვენ არ გაქვთ ამ მოქმედების განხორციელების ნებართვა. |

NEW keys (English first, Georgian alongside, Q-058). Permission descriptions use one key per permission, `t_perm_<code>` (e.g. `t_perm_withdrawals_approve`), with the "Allows" text of the catalogue table as English value; the Georgian values are written in the same pass.
| Key | en | ka |
|---|---|---|
| `t_admin_staff` | Staff | თანამშრომლები |
| `t_admin_roles` | Roles | როლები |
| `t_admin_permissions` | Permissions | უფლებები |
| `t_admin_role_super_admin` | Super-admin | მთავარი ადმინისტრატორი |
| `t_admin_role_customer_support` | Customer Support | მომხმარებელთა მხარდაჭერა |
| `t_admin_role_financial_manager` | Financial Manager | ფინანსური მენეჯერი |
| `t_admin_role_content_moderator` | Content Moderator | კონტენტის მოდერატორი |
| `t_admin_invite_staff` | Invite staff member | თანამშრომლის მოწვევა |
| `t_admin_disable_account` / `t_admin_enable_account` | Disable account / Enable account | ანგარიშის გათიშვა / ანგარიშის ჩართვა |
| `t_cannot_edit_own_roles` | You cannot change your own roles or disable your own account. | საკუთარი როლების შეცვლა ან საკუთარი ანგარიშის გათიშვა შეუძლებელია. |
| `t_last_super_admin` | At least one active Super-admin must remain. | უნდა დარჩეს მინიმუმ ერთი აქტიური მთავარი ადმინისტრატორი. |
| `t_reauth_required` | Please confirm it's you to continue. | გასაგრძელებლად დაადასტურეთ, რომ ეს თქვენ ხართ. |
| `t_admin_audit_log` | Audit log | მოქმედებების ჟურნალი |
| `t_admin_history` | History | ისტორია |
| `t_admin_queue_empty` | Nothing to review. Well done! | განსახილველი არაფერია. კარგი მუშაობაა! |
| `t_item_already_decided` | Another staff member has already decided this item. | ეს საკითხი სხვა თანამშრომელმა უკვე გადაწყვიტა. |
| `t_admin_approve` / `t_admin_reject` | Approve / Reject | დადასტურება / უარყოფა |
| `t_admin_reject_reason` | Reason (shown to the user) | მიზეზი (მომხმარებელი დაინახავს) |
| `t_admin_internal_reason` | Internal reason (staff only) | შიდა მიზეზი (მხოლოდ თანამშრომლებისთვის) |
| `t_admin_remove_gig` / `t_admin_restore` | Remove gig / Restore | განცხადების წაშლა / აღდგენა |
| `t_admin_dismiss_report` / `t_admin_resolve_report` | Dismiss / Resolve | უარყოფა / გადაწყვეტა |
| `t_admin_no_results` | No results found | შედეგი ვერ მოიძებნა |
| `t_admin_deleted_users` | Deleted users | წაშლილი მომხმარებლები |
| `t_admin_send_reset_link` | Send password reset link | პაროლის აღდგენის ბმულის გაგზავნა |
| `t_admin_end_sessions` | Log out of all devices | ყველა მოწყობილობიდან გასვლა |
| `t_admin_check_bog_status` | Check status at BOG | სტატუსის შემოწმება BOG-ში |
| `t_admin_mark_reviewed` | Mark as reviewed | განხილულად მონიშვნა |
| `t_admin_legacy_hold_residuals` | Legacy hold residuals | ძველი დაბლოკილი ნაშთები |
| `t_admin_release_to_available` / `t_admin_write_off` | Release to Available / Write off | ხელმისაწვდომ ბალანსზე გადატანა / ჩამოწერა |
| `t_admin_reconciliation` | Reconciliation | შეჯერება |
| `t_admin_escrows` | Money on hold | დაბლოკილი თანხები |
| `t_admin_commission_fees` | Commission & Fees | საკომისიოები და მოსაკრებლები |
| `t_admin_fee_example` | Example for a 100.00 GEL item | მაგალითი 100.00 ლარიანი ნივთისთვის |
| `t_fee_requires_payment_flow` | This fee cannot be switched on yet: there is no payment step for it. | ამ მოსაკრებლის ჩართვა ჯერ შეუძლებელია: მისთვის გადახდის ეტაპი არ არსებობს. |
| `t_admin_promo_never_on_fees` | Promo codes never reduce fees or freelancer prices. | პრომო კოდები არასოდეს ამცირებს მოსაკრებლებს ან ფრილანსერის ფასებს. |
| `t_setting_invalid_value` | This value is not allowed: :rule | ეს მნიშვნელობა დაუშვებელია: :rule |
| `t_admin_confirm_change` | Change :setting from :old to :new? | შეიცვალოს :setting :old-დან :new-ზე? |
| `t_admin_secret_set` / `t_admin_secret_not_set` | Set / Not set | მითითებულია / არ არის მითითებული |
| `t_setting_saved` | Saved. The new value applies within a minute. | შენახულია. ახალი მნიშვნელობა ერთ წუთში ამოქმედდება. |
| `t_category_in_use` | This item is still in use and cannot be deleted. | ეს ელემენტი ჯერ კიდევ გამოიყენება და ვერ წაიშლება. |
| `t_translation_placeholders_mismatch` | The translation must contain the same placeholders as the original: :placeholders | თარგმანი უნდა შეიცავდეს იგივე ცვლადებს, რაც ორიგინალი: :placeholders |
| `t_admin_translation_base` / `t_admin_translation_override` | Original text / Your text | ორიგინალი ტექსტი / თქვენი ტექსტი |
| `t_admin_export_overrides` | Export overrides | ცვლილებების ექსპორტი |
| `t_admin_export_csv` | Export CSV | CSV ექსპორტი |
| `t_admin_system_health` | System health | სისტემის მდგომარეობა |
| `t_admin_job_failing` | Not run successfully for :minutes minutes | :minutes წუთია წარმატებით არ შესრულებულა |
| `t_admin_refresh_caches` | Refresh caches | ქეშის განახლება |
| `t_admin_preview_public_site` | Preview public site | საიტის გადახედვა |
| `t_admin_maintenance_headline` / `t_admin_maintenance_message` | Headline / Message | სათაური / შეტყობინება |
| `t_maintenance_default_headline` | We'll be back soon | მალე დავბრუნდებით |
| `t_maintenance_default_message` | MyTask is being updated. Please try again in a few minutes. | MyTask ახლდება. გთხოვთ, სცადოთ რამდენიმე წუთში. |
| `t_admin_custom_code` | Custom code (public pages) | დამატებითი კოდი (საჯარო გვერდები) |
| `t_admin_allowed_hosts` | Allowed script hosts | დაშვებული სკრიპტების ჰოსტები |
| `t_custom_code_host_not_allowed` | These hosts are not in the allowed list: :hosts | ეს ჰოსტები დაშვებულ სიაში არ არის: :hosts |
| `t_admin_disable_custom_code` | Disable custom code | დამატებითი კოდის გათიშვა |
| `t_admin_geoip_attribution` | Location data: :source | მდებარეობის მონაცემები: :source |
| `t_admin_legacy_data` | Legacy data | ძველი მონაცემები |

NEW keys added 2026-09-30 (Owner gate answers; English first, Georgian alongside, Q-058). The withdrawal-flag keys are in spec 14 Texts.
| Key | en | ka |
|---|---|---|
| `t_admin_turn_off_2fa` | Turn off two-factor authentication | ორსაფეხურიანი ავტორიზაციის გამორთვა |
| `t_admin_turn_off_2fa_confirm` | Turn off two-factor authentication for :username? The user will be notified by email. | გამოირთოს ორსაფეხურიანი ავტორიზაცია :username-სთვის? მომხმარებელი ელ-ფოსტით მიიღებს შეტყობინებას. |
| `t_admin_negative_residual_write_off_only` | A negative residual can only be written off. | უარყოფითი ნაშთის მხოლოდ ჩამოწერაა შესაძლებელი. |
| `t_custom_code_fixed_vendor_confirm` | I confirm this host serves fixed vendor code (for example an analytics pixel) and is not a tag manager or any service whose code can be changed outside MyTask. | ვადასტურებ, რომ ეს ჰოსტი აწვდის მომწოდებლის ფიქსირებულ კოდს (მაგალითად, ანალიტიკის პიქსელს) და არ არის ტეგ-მენეჯერი ან სერვისი, რომლის კოდის შეცვლაც MyTask-ის გარეთ შეიძლება. |
| `t_custom_code_fixed_vendor_required` | Confirm that each new host serves fixed vendor code. Tag managers are not allowed. | დაადასტურეთ, რომ ყოველი ახალი ჰოსტი აწვდის ფიქსირებულ კოდს. ტეგ-მენეჯერები დაუშვებელია. |
| `t_custom_code_fixed_vendor_hint` | Code from these hosts runs on pages where users are logged in and can act as them. Add only fixed-code vendors, with a pinned version where possible. | ამ ჰოსტების კოდი მუშაობს გვერდებზე, სადაც მომხმარებლები ავტორიზებულები არიან, და შეუძლია მათი სახელით მოქმედება. დაამატეთ მხოლოდ ფიქსირებული კოდის მომწოდებლები, შეძლებისდაგვარად ფიქსირებული ვერსიით. |

## Edge cases
- EC-1 A staff member loses a permission while a decision form is open: the save is refused with 403; nothing changes.
- EC-2 The only Super-admin forgets their password: they use the staff password reset (same rules as spec 01); if their email is lost, recovery needs server access by the developer (documented in the operations guide, not in the admin).
- EC-3 Two staff edit the same setting at the same moment: the second save is refused with "changed by someone else, reload" (version check); no silent overwrite.
- EC-4 A fee rule is changed while a buyer is in checkout: spec 05 AC-8 (quote changed).
- EC-5 A staff member tries to delete a user who has a pending withdrawal: refused (spec 14 AC-20).
- EC-6 S-100 is edited to a single address that bounces: saved (valid format), but the delivery log shows failures and EV-125 fires on a high failure rate.
- EC-7 A category slug is changed twice: both old URLs 301 to the current one in one hop (spec 17 AC-10).
- EC-8 Maintenance is ON when a BOG callback arrives: the callback is processed normally (AC-70).
- EC-9 A translation override is saved for a key that a later deployment removes: the override is kept but unused; the export flags it as "unused".
- EC-10 A custom-code host is removed from S-127 while custom code still uses it: the save of S-127 is refused until the code no longer uses the host, or the custom code is disabled.
- EC-11 Q-097 is still open at migration rehearsal: legacy admins are imported disabled without roles (AC-8), so nobody gets access by accident.
- EC-12 (Q-120) A user has a legacy held residual of −12.50 GEL: "Release to Available" is not offered, and a direct API call is refused; "Written off" posts one journal and leaves the user's Available balance unchanged.
- EC-13 (Q-145) A staff member re-authenticated 10 minutes ago and creates a 100% promo code, then 20 minutes later changes S-062: the promo code needs no new re-authentication; the S-062 change asks again (15-minute window per session).
- EC-14 (Q-113) A Customer Support agent opens a user's Balances tab (`payments.read`): withdrawal ledger lines and amounts are shown, but no IBAN or holder name and no link into the withdrawal detail.

## Legacy defects not carried over
| # | Legacy defect | Evidence | Prevented by |
|---|---|---|---|
| D-16-1 | Two admin panels, no roles, `canAccessPanel` always true (R-034) | `config/auth.php:38-50`, `Admin.php:38-41` | AC-1, AC-9…AC-12 |
| D-16-2 | Staff type a user's available balance directly | `Admin/Users/Options/EditComponent.php:228` | AC-33, spec 05 AC-41 (P-12) |
| D-16-3 | Staff set a user's password | `EditComponent.php:212` | AC-32, AC-33 (reset link) |
| D-16-4 | User search only by exact email | `Admin/Users/UsersComponent.php:1` | AC-30 |
| D-16-5 | Categories deleted with no check for gigs or children | `Categories/Options/DeleteComponent.php:1` | AC-60 |
| D-16-6 | BOG settings page wired to the Iyzico component | `routes/admin.php:632` | BOG keys in `.env` (Q-042); no gateway screens |
| D-16-7 | Translation editor writes PHP files on the server | `Languages/Options/TranslateComponent.php:152-163` | AC-64 (database overrides, ADR-006 §4) |
| D-16-8 | No record of staff actions | no audit code | AC-14…AC-16 |
| D-16-9 | Staff hard-delete chat messages and reviews | `ConversationsComponent.php:203-238`, `ReviewsComponent.php:65` | spec 08 AC-31, AC-25 |
| D-16-10 | Custom/ad code injected on every layout including dashboards and login | `dashboard-app.blade.php:114, 902`, `auth.blade.php:154` | AC-73 |
| D-16-11 | Analytics sends visitor IPs to findip.net and ip-api.com | `Tracker.php`, `TrackingService.php:101-108` | AC-67 (X-09) |
| D-16-12 | Log viewer assets under the public web root | `public/vendor/log-viewer` | AC-68 (Q-054) |
| D-16-13 | Maintenance bypass secret emailed in clear | `MaintenanceComponent.php:124` | AC-70 |
| D-16-14 | "Factory reset" button that does nothing | `System/ResetComponent.php:41-52` | not carried over |
| D-16-15 | "Net income" = sum of order totals of unfinished items; taxes and commission from unused columns | `Admin/Home/HomeComponent.php:141-153` | AC-18 (ledger figures) |
| D-16-16 | "Total messages" counts the removed `conversations` chat | `HomeComponent.php:173` | AC-18 (direct messages) |
| D-16-17 | Staff order delete "refunds" a non-existent column (R-015) | `Orders/OrdersComponent.php:66` | AC-38 (no delete; spec 13 tools) |

## Legacy admin screens: where they go
| Legacy (`/dashboard` or `/console`) | New |
|---|---|
| Home (analytics widgets) | Home (AC-17, AC-18) + Analytics (AC-66) |
| Profile, Logout, Login (`banned.ip`) | Own profile (AC-6), login (AC-2) |
| Invoices (offline payments) | Bank transfers (AC-43) |
| Users: list, create, edit, details, message, restrict, transactions, trash; Filament Users + referrals | Users (AC-30…AC-35); staff do not create users (users register themselves; ACCEPTED P-117) |
| Withdrawals | Withdrawals (AC-42) |
| Gigs: list, edit, analytics, trash | Gig queue and list (AC-20); gig analytics read-only via spec 04 AC-39 data; no staff edit (P-117) |
| Orders (+ delete) | Orders (AC-38), no delete |
| Portfolios | Portfolio queue (AC-21) |
| Refunds, project refunds, unblock requests | Disputes/Refunds (AC-40), Unblock requests (AC-41) |
| Projects list, settings, milestones, plans, bidding plans, subscriptions, bids; Filament Projects, Project categories | Project queue (AC-22), proposals (AC-23), settings (register), catalog (AC-61); milestones (X-01) → spec 13 staff tools; plans/bidding/subscriptions removed (X-03, X-04) |
| Offers | Custom offers (AC-24) |
| Categories, subcategories, childcategories | Catalog (AC-60) |
| Reviews | Reviews (AC-25) |
| Reports (users, gigs, projects, bids) | Reports queue (AC-28) |
| Conversations, chat download | Conversations (AC-65, spec 08) |
| Advertisements | merged into S-110 custom code (AC-75); ad slots `ad_service_360/720` dropped (never rendered) |
| Support, reply | Support messages (spec 17 AC-26) |
| Newsletter, settings, send | Newsletter (spec 17 AC-32…AC-34), S-120 |
| Languages (create, edit, translate) | Translations (AC-64); languages fixed ka/en (S-103) |
| Pages; Blog articles, settings, comments | Content (spec 17), S-117…S-119 |
| Countries | Countries (AC-62) |
| Levels | removed (X-05) |
| Packages, Attributes | removed (unused defaults; data-model §12.2) |
| Services: 29 payment gateways, offline gateway, cloud storage, reCAPTCHA keys, findip | removed (X-07, X-09); BOG, storage and reCAPTCHA keys in `.env` (Q-042); bank transfer = S-021/S-125; reCAPTCHA switch S-061 |
| Settings: general, auth, commission, footer, media, publish, security, SEO, withdrawal, appearance, hero, chat | Settings register (AC-51…AC-56) and Commission & Fees (AC-46…AC-50) |
| Settings: currency, SMTP | removed (GEL only, P-13; SMTP → SendGrid in `.env`, test email kept, spec 15 AC-32) |
| Verifications | KYC queue (AC-27) |
| System: crontab, cache, maintenance, reset, licensing; log viewer | System health (AC-69), Refresh caches (AC-71), Maintenance (AC-70), System logs (AC-68); reset and licensing removed (D-16-14, X-20) |
| Filament Plans, Subscriptions, Referral code benefits | Plans (AC-57), Subscriptions (AC-59), Promo codes / referral benefits (AC-58) |

## Proposed settings row
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-127 | `appearance.custom_code.allowed_hosts` | Hostnames that custom code (S-110) may load scripts, frames, images or connections from; the public-page CSP allows exactly these hosts. Super-admin only. **Only fixed-code vendors** (for example an analytics or advertising pixel, version pinned where possible); tag managers and other hosts whose code can be changed outside MyTask are not allowed; each host is confirmed as fixed-code when added (AC-74a) | list of hostnames (no wildcards except a leading `*.` for subdomains), each with its fixed-code confirmation | empty (custom code without external hosts only) | Q-085, ADR-013, architect request; Q-146 | **ACCEPTED** (P-122); added to spec 00 register, Owner 2026-09-29; fixed-code vendors only, Owner 2026-09-30 (Q-146) |

## Out of scope
- An admin mobile app.
- Four-eyes (two-person) approval for money actions (possible later on top of the audit log).
- Staff creating user accounts by hand (legacy `Users/Options/CreateComponent.php`; users register themselves; P-117).
- Admin IP allow-listing / VPN (ADR-010 mentions it as a later option).
- Running custom code (S-110) in an isolated frame or origin: studied in Phase 3 (Owner 2026-09-30, Q-146 (c)); until then AC-74a applies.
- Business rules of each screen (owned by specs 01–15, 17).

## Open questions
Waiting for the Owner: **Q-097** (legacy admin accounts and their roles) — only AC-8 depends on it; the proposed safe default is in P-115. No new questions.

Owner gate answers applied on 2026-09-30: Q-111 (P-135), Q-112 (AC-9), Q-113 (AC-42, catalogue), Q-114 (AC-40), Q-115 (AC-24), Q-117 (AC-21), Q-119 (AC-7, AC-44), Q-120 (AC-44, EC-12), Q-137 (S-128 settings area), Q-144 (AC-42, S-129 settings area), Q-145 (AC-7, AC-32), Q-146 (AC-74a, S-127). Slice items still open for this spec: Q-118, Q-122, Q-123, Q-132, Q-136, Q-138…Q-143, Q-150.

Proposed items (all accepted by the Owner on 2026-09-29):
- **P-114 Default roles.** Four roles as in the matrix: Super-admin (everything), Customer Support (users, KYC, reports, appeals, support inbox, read-only orders/payments, chats, refund threads without decisions), Financial Manager (payments, disputes, releases/refunds, withdrawals, bank transfers, balance and points adjustments, Premium gifts, promo codes, analytics, chats for evidence), Content Moderator (all moderation queues, reports, restrict/ban, chats and hiding messages, categories, CMS/blog/newsletter, translations, content settings). Fee rules, all other settings, staff management, audit log, logs and system health stay with Super-admin by default. Refund threads get their own permission (`refunds.thread.write`) so support can answer without deciding disputes.
- **P-115 Staff accounts.** Invitation email with a 48-hour set-password link; no shared accounts; disable instead of delete; staff reset of another's devices; re-enter the password (or 2FA code) at most every 15 minutes for high-risk actions (list in AC-7). Until Q-097 is answered, legacy admins are imported disabled and without roles.
- **P-116 Audit log.** Every staff change and every sensitive read is recorded and can never be edited; money, fee, settings, staff and role entries are kept forever, others at least 5 years.
- **P-117 User management changes.** Partial search (legacy: exact email only); staff cannot set passwords (they send a reset link) or balances (ledger only, P-12); no "log in as user"; staff do not edit users' gig, project or proposal texts (they reject, hide or remove with a reason; legacy allowed full gig editing); staff delete = soft delete with 30-day restore and no permanent delete; staff no longer create user accounts by hand.
- **P-118 Reports and gig removal.** One reports queue for profiles, gigs, projects and proposals, grouped by item, with Dismiss/Resolve and shortcuts to the moderation actions; reporters are not notified (as legacy). Staff "Remove gig" (soft delete, 30-day restore) replaces the legacy gig trash.
- **P-119 Dashboard and payment tools.** KPIs from the ledger (paid volume, fee and surcharge revenue, withdrawals paid, total on hold) instead of the legacy "net income" sum; "Check status at BOG" button on a payment (same safe path as the automatic check).
- **P-120 Analytics widgets.** The list in AC-66 with period comparison and CSV export; raw events 90 days, daily aggregates forever; legacy aggregates labelled.
- **P-121 System screens.** System logs (30 days, no file download), System health (job status, queues, last BOG callback, notification delivery log with "Retry"), "Refresh caches". The legacy crontab, factory-reset and licensing screens are not rebuilt.
- **P-122 Custom code and S-127.** Only the Super-admin sees and edits custom code; it runs on public pages only; every external host must be listed in the new setting S-127 `appearance.custom_code.allowed_hosts` (default empty); legacy custom code and the legacy advertisement header/footer code are imported switched off until reviewed; the two legacy ad slots, never shown anywhere, are dropped.
- **P-123 Settings behaviour.** Changes apply immediately (no future-dated versions) and reach web, app and API within 60 seconds; conflicting edits are refused; history with "Restore".
- **P-124 Translations editor.** Database overrides on top of the files in git (ADR-006), placeholder check, no HTML, reset, export to JSON; staff cannot add or remove keys (keys come with the code).
- **P-125 Reference data.** Countries keep names (ka/en) and an active switch; languages are fixed (ka/en); the legacy screens for levels, packages, attributes, gateways, cloud storage, findip, SMTP and currency are not rebuilt (values in `.env` or removed).
- **P-126 Exports and personal data.** Every CSV export in the admin needs the list's read permission and is recorded in the audit log with its filter; exports that contain personal data (users, newsletter subscribers, support messages) also ask for the password or 2FA code again. (Maintenance mode follows spec 15 P-112: payment callbacks, jobs and notifications keep running during maintenance, and logged-in staff preview the site instead of using a secret link.)
