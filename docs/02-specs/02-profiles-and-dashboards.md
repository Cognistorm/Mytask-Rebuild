# 02 — Profiles and dashboards
Status: **ready for Owner**
Author: product-analyst (P2-A2) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` BR-010…BR-015, BR-042; `roles-and-permissions.md`; `routes-and-pages.md` (`/profile/*`, `/account/*`, `/seller/*`); `notifications.md` (portfolio, verification, profile report rows); `risks-and-debt.md` R-037, R-039; `docs/05-design/audit.md` §3.6, §3.9, §3.10. Owner decisions: Q-013, Q-014, Q-046, Q-048, Q-059, Q-060, Q-062. Platform rules: `00-platform-rules.md` (R-1.1…R-1.5, §4.18 fixed rules, settings S-071, S-089, S-090, S-100, S-122, balances glossary §3).

Tags: **LEGACY**, **CHANGE** (Q-ID), **NEW** (Q-ID), **PROPOSED** (P-18, P-21…P-25, see "Open questions").

Legacy code traced for this spec (read-only):
- Public profile: `legacy/APP/app/Livewire/Main/Profile/ProfileComponent.php:77-175` (only `active|verified` users; rating breakdown only for sellers `:94-157`; expired availability removed `:161-173`), gigs 6 per page + "load more" `:252-266, :423-428`, report `:275-386`; view keys `resources/views/livewire/main/profile/profile.blade.php`.
- Portfolio public: `Profile/PortfolioComponent.php:26-37`, item page `Profile/ProjectComponent.php`.
- **Profile editing:** `app/Livewire/Main/Account/Profile/ProfileComponent.php:199-1228` (avatar, headline, description, linked accounts, skills, languages, availability), view `resources/views/livewire/main/account/profile/profile.blade.php`. **There is no route for it:** the header links to `/account/profile` (`components/layouts/partials/header.blade.php:170`), but `routes/web.php:192-381` has no such route, so the live link returns 404 (R-037). Only the avatar can be changed today, from the account sidebar (`Account/SidebarComponent.php:34-138`).
- Validators: `app/Http/Validators/Main/Account/Profile/*` (headline ≤ 100, description ≤ 1,500, skill name ≤ 30 + experience, language name ≤ 100 + level, availability message ≤ 750 + date, avatar image ≤ 2 MB incl. svg, linked accounts URL ≤ 160).
- Account settings and deletion: `Account/Settings/SettingsComponent.php:156-354`; validator `Account/Settings/EditValidator.php:26-38`.
- Portfolio: `Seller/Portfolio/Options/CreateComponent.php:112-174`, `EditComponent.php:162-234` (edit → `pending` again if auto-approve is OFF), `PortfolioComponent.php:113-148` (delete); validator `Seller/Portfolio/CreateValidator.php:32-46`; admin `Admin/Portfolios/PortfoliosComponent.php:65-135` (approve or delete; no rejection message).
- KYC: `Account/Verification/VerificationComponent.php:129-393`; validators `Account/Verification/*` (jpg/jpeg/png, ≤ 5 MB for documents).
- Dashboards: freelancer home `Seller/Home/HomeComponent.php:51-256`; sidebars `components/layouts/seller-app.blade.php`, `buyer-app.blade.php`; switcher `components/layouts/dashboard-app.blade.php:273-463`.
- Username masking: `Project/ProjectComponent.php:362-387`.

---

## Goal
Give every user one account with two dashboards (Buying and Selling) and one switch between them. Give every user a public profile that builds trust (about, skills, languages, portfolio, verifications, mutual reviews) and the pages to edit it. Keep ID verification (KYC) working with manual review, ready for an external provider later.

## Roles involved
- **Guest**: views public profiles and portfolios.
- **User** (buyer + freelancer, Q-013): edits profile, portfolio, availability, settings; uses both dashboards; submits KYC; reports profiles.
- **Premium user**: sees unmasked client usernames on projects (BR-015).
- **Staff**: approve portfolios (when S-071 is OFF), decide KYC, handle profile reports, activate/ban users (spec 16).

## User stories
- As a user, I want to switch between my Buying and Selling dashboards from one control, so that I never log in twice or "become a seller".
- As a freelancer, I want to fill in my headline, about text, skills, languages and portfolio, so that clients trust me.
- As a freelancer going on holiday, I want to set "unavailable until", so that nobody orders from me while I am away.
- As a client, I want to see a freelancer's rating, reviews, verifications and work before I buy.
- As a freelancer, I want to see how clients were rated by other freelancers, so that I can judge a client (Q-062).
- As a user, I want to verify my ID, so that my profile shows a verified badge.
- As a user, I want to change my account details or delete my account.

## Acceptance criteria

### Dual role and dashboard switcher (Q-013; vision priority 4)
- AC-1 Given any logged-in user (new or migrated, whatever their legacy `account_type`), When they open the account menu on web or the Account tab on mobile, Then both "Buying" (client) and "Selling" (freelancer) dashboards are reachable. There is no "Become a seller" entry anywhere. (00 AC-1, AC-2, AC-3)
- AC-2 Given a user on one dashboard, When they use the switcher (web: segmented control in the dashboard top bar and a link in the account menu; mobile: segmented "Buying / Selling" control at the top of the Account tab), Then the other dashboard opens with no new login. (00 AC-4)
- AC-3 Given a user chose a dashboard, When they come back later on web or mobile, Then the last chosen dashboard opens. The choice is stored on the account, so web and mobile share it. A user who never chose gets the Buying dashboard. (00 AC-4; storage and default PROPOSED P-22)
- AC-4 Given the Selling dashboard, When it opens, Then its navigation is: Home, Orders, Gigs, Projects (awarded + my proposals), Offers (only if S-034 is ON), Reviews, Refunds, Unblock requests (only when available under S-025/S-029, P-5), Portfolio, Earnings, Withdrawals. (LEGACY `seller-app.blade.php`; X-05 levels removed)
- AC-5 Given the Buying dashboard, When it opens, Then its navigation is: Projects, Orders ("Buy services"), Offers (only if S-034 is ON), My reviews, Refunds, Favourites. (LEGACY `buyer-app.blade.php`)
- AC-6 Given the Selling Home, When it loads, Then it shows: a welcome line with verified badge and member-since date; buttons "Switch to buying" and "Create a new gig"; KPI tiles for earnings (all money released to the user from gig orders, project payments and custom offers, from the ledger), Available balance, HOLD/Pending balance (with the `t_pending_balance_hint`), total reach (gig impressions), total gigs, awarded projects (accepted awards), completed orders, pending orders (paid, not started), orders in progress (started or delivered, not finished) and canceled orders; up to 6 contacts with unread messages; the latest 7 paid orders; and, if S-075 is ON, the latest 7 awarded projects. (LEGACY `Seller/Home/HomeComponent.php:62-241`; balance tiles per 00 §3)
- AC-7 Given a new user with no activity, When Selling Home loads, Then every KPI shows 0 and the lists show empty states with a "Create a new gig" call to action. (NEW empty state)

### Public profile (`/profile/{username}`, `/en/profile/{username}`)
- AC-8 Given a user with status active or verified, When anyone opens their profile, Then it shows: avatar, full name, username, online/offline status (active in the last 10 minutes, 00 §4.18), availability notice when unavailable, share button, local time, last delivery date, member since, verifications (email verified; ID verified when KYC is approved), languages with level, linked accounts (if S-123 is ON, P-25), About me, active gigs (newest first, 6 at a time with "Load more"), portfolio preview with a link to the full portfolio, and skill chips linking to `/hire/{skill-slug}`. There is no level or badge from the removed level system. (LEGACY BR-012; X-05, Q-014)
- AC-9 Given the profile of a user who is pending, banned or deleted, When it is opened, Then the answer is 404. (LEGACY `ProfileComponent.php:82`)
- AC-10 Given reviews exist for the user, When the profile loads, Then it shows two rating blocks: "As a freelancer" (average of reviews buyers gave this user, count, and the number of 5-, 4-, 3-, 2- and 1-star reviews) and "As a client" (the same for reviews freelancers gave this user). A block with no reviews shows "No reviews yet". The review lists and rules are in spec 07. (LEGACY breakdown for sellers; CHANGE mutual reviews Q-062, Q-046)
- AC-11 Given a viewer on someone else's profile, When they tap "Contact me", Then the chat with that user opens (spec 08). Guests are asked to log in first. (LEGACY; chat is open to all, Q-069)
- AC-12 Given S-034 custom offers is ON, When a logged-in buyer views a freelancer's profile, Then a "Request an offer" button opens the request form of spec 12. It is hidden while the freelancer is unavailable (BR-013). (CHANGE: legacy "Send an offer" by the client; Q-060a: freelancers create offers, buyers request them)
- AC-13 Given the viewer owns the profile, When it loads, Then "Edit profile" is shown instead of "Contact me" and "Report user".
- AC-14 Given a logged-in user on another user's profile, When they report it with a reason (required, ≤ 1,500 chars), Then the report is saved (a second report by the same person replaces the first) and `Admin/ProfileReported` goes to every address in S-100. Guests see `t_u_must_login_to_report_this_profile`. Reporting yourself is not possible. (LEGACY `ProfileComponent.php:275-352`; CHANGE recipients Q-026)

### Profile editing (`/account/profile`) — PROPOSED P-23 (restores a legacy screen that is unreachable today)
- AC-15 Given a logged-in user, When they open "Edit profile" (web account menu; mobile Account → Profile), Then they can edit avatar, headline, About me, skills, languages, availability and (if S-123 is ON) linked accounts. Each part saves on its own and shows its own success message.
- AC-16 Given an avatar upload, When the file is JPG, JPEG, PNG or WEBP and ≤ 2 MB, Then it replaces the old avatar (resized to 100 px square for display, old file deleted). Other types (including SVG) are refused. The user can also remove the avatar, and then initials are shown. Mobile offers camera or photo library. (LEGACY `SidebarComponent.php:34-104`; file types PROPOSED P-24)
- AC-17 Given the headline field, When a value of 1–100 chars is saved, Then it shows under the name on the profile and cards. Empty is refused (`t_validator_required`). (LEGACY `HeadlineValidator.php:26`)
- AC-18 Given the About me field, When 1–1,500 chars are saved, Then it shows in the About me block with "More/Less" folding. (LEGACY `DescriptionValidator.php:26`)
- AC-19 Given the skills editor, When the user adds a skill with a name (≤ 30 chars) and an experience level (Beginner / Intermediate / Expert), Then it is added. The same name twice is refused with `t_add_skill_already_exists`. Skills can be edited and deleted. The skill slug (for `/hire/{slug}`) is made from the name. (LEGACY `ProfileComponent.php:439-715`; stored values `beginner|intermediate|pro`)
- AC-20 Given the languages editor, When the user adds a language name (≤ 100 chars) and a level (Basic / Conversational / Fluent / Native), Then it is added. Duplicates are refused with `t_add_language_already_exists`. Languages can be edited and deleted. (LEGACY `:724-996`)
- AC-21 Given linked accounts are enabled (S-123), When the user saves Facebook, Twitter/X, Dribbble, Stack Overflow, GitHub, YouTube or Vimeo profile URLs (each optional, valid URL, ≤ 160 chars), Then they show under "Linked accounts" on the profile. (LEGACY `:351-396`, `SocialValidator.php:26-38`)

### Availability (BR-013)
- AC-22 Given any user (not only legacy sellers), When they set "unavailable until" with a future date and a message (required, ≤ 750 chars), Then the profile and their gig pages show the notice with the date, "Add to cart" on their gigs is refused (spec 04), and buyers cannot request custom offers from them (spec 12). A date that is not in the future is refused with `t_pls_select_availability_date_in_future`. (LEGACY `ProfileComponent.php:1079-1204`; CHANGE: legacy only for `account_type = seller`, Q-013)
- AC-23 Given an availability date has passed, When the date is reached, Then the notice disappears automatically (scheduled job) and the user can receive orders again. The user can also remove it early. (LEGACY `UnavailableSellers.php`, `:1213-1228`)

### Portfolio
- AC-24 Given a user on Selling → Portfolio → Create, When they submit a title (3–100 chars), a description (≥ 10 chars), a thumbnail (JPG/PNG ≤ S-090 MB), 1 to S-089 gallery images (JPG/PNG, each ≤ S-090 MB), and optionally a project link and a video link (valid URLs, ≤ 120 chars), Then the item is saved with a URL slug made from the title plus a unique id. (LEGACY `CreateValidator.php:32-46`, `CreateComponent.php:116-146`)
- AC-25 Given S-071 `moderation.portfolio.auto_approve` is OFF, When an item is created or edited, Then its status is pending (not public) and `Admin/PendingPortfolio` goes to every address in S-100. Given S-071 is ON, Then it is public at once and no admin email is sent. (LEGACY; CHANGE recipients Q-026)
- AC-26 Given a pending item, When staff approve it, Then it becomes public, and the owner gets the `PortfolioPublished` email and the in-app notification `t_ur_portfolio_title_has_been_published` (plus push, P-11). When staff delete it instead, Then it is removed. (LEGACY `Admin/Portfolios/PortfoliosComponent.php:65-135`; no rejection message exists in legacy)
- AC-27 Given the owner edits an item, When they save, Then the new data replaces the old; uploading new gallery images replaces the old gallery; the status follows AC-25. The owner can delete an item at any time (files are deleted too). (LEGACY `EditComponent.php:162-234`, `PortfolioComponent.php:113-148`)
- AC-28 Given a public profile, When `/profile/{username}/portfolio` is opened, Then only public items of that user are listed. `/profile/{username}/portfolio/{slug}` shows the item's thumbnail, gallery, description and links. Pending items are visible only to their owner (marked "Pending"). (LEGACY)

### Account settings (`/account/settings`)
- AC-29 Given a logged-in user, When they save username (same rules as registration, spec 01 AC-1/AC-2), email (valid, unique), full name (required, ≤ 60), country (optional, from the active country list) and city (required, ≤ 60) and enter their current password (not asked for accounts without a password), Then the changes are saved with `t_ur_account_settings_updated`. A wrong password shows `t_ur_current_pass_does_not_match`. (LEGACY `SettingsComponent.php:156-223`, `EditValidator.php:26-38`)
- AC-30 Given a user changes their email in settings, When they save, Then the email does not change yet: a confirmation link valid for S-054 minutes is sent to the new address (`t_email_change_pending`) and a notice is sent to the old address. The new email becomes active only when the link is opened. (PROPOSED P-18; legacy changed the email at once with no check)
- AC-31 Given a user changes their username, When saved, Then their profile moves to `/profile/{new-username}`. (LEGACY; see EC-4)
- AC-32 Given a user with an active order or project (as buyer or freelancer: order items pending/started/delivered and not finished; projects active, awaiting payment, in development or awaiting final review), When they choose "Delete account", Then it is refused with `t_cannot_delete_account_active_orders_projects`. (LEGACY `SettingsComponent.php:253-305`)
- AC-33 Given a user whose Available or HOLD/Pending balance is not 0, When they choose "Delete account", Then it is refused with `t_cannot_delete_account_balance`. (PROPOSED P-21; legacy only warned in `t_delete_account_warning`)
- AC-34 Given a user with no active items and a zero balance, When they confirm deletion (dialog with `t_delete_account_warning`), Then the account is soft-deleted, all sessions end, their profile and gigs disappear from public pages, and their email and username stay reserved. (LEGACY `:324-353`)
- AC-35 Given the account area (web settings sidebar; mobile Account tab), When it opens, Then it links to: Settings, Edit profile, Password and security (spec 01), Billing and Payment methods (spec 05), My subscription and Referrals (spec 09), Verification centre, Sessions (spec 01), Logout; and on web a theme switch (light/dark, S-105, S-106 default light, Q-059). (LEGACY `components/main/account/sidebar.blade.php`)

### ID verification (KYC) — LEGACY, integration-ready (Q-048)
- AC-36 Given a user with no verification, When they open the Verification centre, choose a document type (national ID, driver's licence or passport), upload front and back (passport: front only; JPG/JPEG/PNG, ≤ 5 MB each) and a selfie (JPG/JPEG/PNG), Then a verification with status pending is created and `Admin/NewIdVerificationPending` goes to every address in S-100. Mobile offers the camera for each photo. (LEGACY `VerificationComponent.php:129-314`; CHANGE recipients)
- AC-37 Given a pending verification, When staff approve it, Then the status becomes verified, the "ID verified" badge shows on the profile, gig page seller box and freelancer cards, and the user gets `VerificationApproved` (email) and `t_ur_account_has_verified` (in-app + push). When staff decline it, Then the user gets `VerificationDeclined` and `t_verification_files_declined`, and can start again ("send files again"). (LEGACY `Admin/Verifications/VerificationsComponent.php:86-155`, `VerificationComponent.php:376-393`)
- AC-38 Given a user with a pending or verified verification, When they open the Verification centre, Then they see its status and cannot submit another one.
- AC-39 Given KYC files, When anyone other than the owner or staff with the KYC permission requests them (by URL or API), Then access is refused. Files are stored privately and served only through short-lived signed links. (CHANGE, fixes R-039; ADR-009)
- AC-40 Given S-122 `kyc.provider` = manual (default), When a verification is submitted, Then it waits for staff review. The provider is behind an interface so an external service can later make the decision; nothing else in this spec changes. KYC is not required for any action (buying, selling, withdrawing). (Q-048)

### Username masking on project pages (BR-015; used by spec 10)
- AC-41 Given a project page viewed by a guest or by a logged-in user who is neither Premium, nor the project owner, nor staff, When the client's username is shown, Then it is masked: visible = round(length ÷ 4) characters at the start and the same number at the end, with `*` in between (for example `mytask` → `my**sk`). The API returns only the masked form and no profile link to such viewers. (LEGACY `ProjectComponent.php:362-387`; API rule NEW, R-019 style server enforcement)

---

## Business rules
- R-P1 **Dual role** (Q-013, 00 R-1.1/R-1.2): every page and API endpoint of the Selling dashboard is open to every active user. No `OnlySeller` check. Availability, portfolio, and the rating blocks apply to all users.
- R-P2 **No levels or badges** (Q-014, X-05): the only reputation data are the two 5-star rating blocks and reviews (Q-062, 00 R-1.5). The "ID verified" and "email verified" marks are verifications, not levels.
- R-P3 **Profile visibility** (LEGACY): public only for status active/verified and not deleted. A restricted user's public profile stays visible (legacy middleware only blocks the user's own navigation). Banned → 404.
- R-P4 **Online status** (LEGACY BR-012): "online" = any authenticated request (web or mobile) in the last 10 minutes.
- R-P5 **Availability** (LEGACY BR-013, CHANGE all users): one availability record per user. While it is active: no add-to-cart on the user's gigs, no custom-offer requests to them. Existing orders continue.
- R-P6 **Portfolio moderation** (LEGACY): S-071; edit sends the item back to pending when S-071 is OFF. Titles and descriptions have one field (not ka/en). Latin and Georgian are both allowed (Q-022).
- R-P7 **Dashboard KPIs** come from the ledger and order data (00 §3). "Earnings" = total released to the user's Available balance from gig orders, project payments and custom offers (legacy formula `HomeComponent.php:62-93`, now from ledger entries).
- R-P8 **KYC** (Q-048): not required for anything. One active verification per user. Files private (R-039 fix).
- R-P9 **Account deletion** (LEGACY + PROPOSED P-21): soft delete; blocked by active items; blocked by a non-zero balance (P-21). Reviews the user wrote or received stay visible, with the name shown as "Deleted user" (PROPOSED P-21).
- R-P10 **Settings** used: S-034 (offers menu), S-025/S-029 (unblock menu, P-5), S-054 (email-change link validity, P-18), S-071, S-075, S-089, S-090, S-100, S-105, S-106, S-122; proposed new row **S-123** `profile.linked_accounts.enabled` (P-25).

---

## Screens (web + mobile) and states
| Screen | Web | Mobile | States |
|---|---|---|---|
| Dashboard shell + switcher | 240 px sidebar, top bar with the centred Buying/Selling segmented control (full width on phones, labels always visible, audit §3.9), account menu right | Account tab with a segmented "Buying / Selling" control; each dashboard is a list of sections | loading (skeleton), success |
| Selling Home | `/seller/home` | Selling → Home | loading skeleton for tiles and lists; empty (AC-7); error (retry per block); success. KPI tiles: 2 columns on phones with wrapping labels (audit §3.10) |
| Buying dashboard | lands on `/account/projects` (legacy) | Buying → Projects | per spec 06/10 |
| Public profile | `/profile/{username}` (+ `/en/`) | Profile screen (from any avatar/username tap) | loading; 404; success. Left card stacks on top on phones; share opens the native share sheet on mobile |
| Portfolio list / item | `/profile/{username}/portfolio`, `/…/portfolio/{slug}` | Portfolio grid → item viewer (swipe gallery) | empty ("No work yet"); success |
| Edit profile | `/account/profile` (P-23) | Account → Profile | per-block saving spinner; inline errors; success toast |
| Availability modal | modal on Edit profile | bottom sheet with date picker | error (date not future) |
| Portfolio create/edit | `/seller/portfolio/create`, `/edit/{id}` | Selling → Portfolio → + | upload progress per image; error per file (type/size); success with "pending review" note when S-071 is OFF |
| Account settings | `/account/settings` | Account → Settings | password confirm field; email-change pending banner (P-18); delete-account danger zone with the dialog |
| Verification centre | `/account/verification`: step 1 document type, step 2 document photos, step 3 selfie, then status | same 3 steps, camera first | pending / verified / declined (with "send again") |
| Report user | modal | bottom sheet | success toast |

Accessibility: switcher items have `aria-current` and text labels on all sizes (audit §3.9 fix). Two h1 on the profile are merged into one (audit §3.6).

## Notifications triggered
| Notification | Channel | Recipient | Trigger | Tag |
|---|---|---|---|---|
| `Admin/ProfileReported` (`t_subject_admin_profile_reported`) | email | all S-100 recipients | AC-14 | LEGACY, CHANGE recipients (Q-026) |
| `Admin/PendingPortfolio` (`t_subject_admin_pending_portfolio`) | email | all S-100 recipients | AC-25 (create or edit with S-071 OFF) | LEGACY, CHANGE recipients |
| `PortfolioPublished` (`t_subject_seller_portfolio_published`) + in-app `t_ur_portfolio_title_has_been_published` | email + in-app + push (P-11) | owner | AC-26 | LEGACY (push NEW) |
| `Admin/NewIdVerificationPending` (`t_verification_center`) | email | all S-100 recipients | AC-36 | LEGACY, CHANGE recipients |
| `VerificationApproved` / `VerificationDeclined` + in-app `t_ur_account_has_verified` / `t_verification_files_declined` | email + in-app + push | user | AC-37 | LEGACY (push NEW) |
| Email-change confirmation (to new address) + notice (to old address) | email | user | AC-30 | **NEW, PROPOSED P-18** |
| `YouBecameSeller` / `t_u_became_a_seller` | – | – | dropped (Q-013, X-06) | removed |

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged). The Owner may want to refine `t_basic` (ka value is a joke: "გაქცეულს მოვაბრუნებ") and `t_verifications` (ka value is English).
| Key | en | ka |
|---|---|---|
| `t_switch_to_selling` | Switch to selling | ფრილანსერის პროფილი |
| `t_switch_to_buying` | Switch to buying | სერვისების შეძენა |
| `t_freelancer` | Freelancer | ფრილანსერი |
| `t_buyer` | Buyer | დამკვეთი |
| `t_my_dashboard` | My dashboard | მართვის პანელი |
| `t_welcome_back` | Welcome back | მოგესალმებით |
| `t_earnings` | Earnings | გამომუშავება |
| `t_total_gigs` | Total gigs | ყველა განცხადება |
| `t_awarded_projects` | Awarded projects | დამტკიცებული პროექტები |
| `t_completed_orders` | Completed orders | შესრულებული შეკვეთები |
| `t_pending_orders` | Pending orders | მომლოდინე შეკვეთები |
| `t_canceled_orders` | Canceled orders | გაუქმებული შეკვეთები |
| `t_available_balance` / `t_pending_balance` / `t_pending_balance_hint` | see 00 | see 00 |
| `t_view_profile` | View profile | პროფილის ნახვა |
| `t_edit_profile` | Edit profile | პროფილის განახლება |
| `t_contact_me` | Contact me | შეტყობინების გაგზავნა |
| `t_share_profile` | Share profile | პროფილის გაზიარება |
| `t_report_user` | Report user | მომხმარებლის გასაჩივრება |
| `t_reason` | Reason | მიზეზი |
| `t_u_must_login_to_report_this_profile` | You must be logged in to report this profile | თქვენ უნდა გაიაროთ ავტორიზაცია რომ დაარეპორტოთ ეს მომხმარებელი |
| `t_profile_has_been_successfully_reported` | Profile has been successfully reported | მომხმარებლის პროფილი წარმატებით დარეპორტდა |
| `t_online` | Online | აქტიურია |
| `t_offline` | Offline | არ არის აქტიური |
| `t_local_time` | Local time | ლოკალური დრო |
| `t_last_delivery` | Last delivery | ბოლოს მიწოდებული ნამუშევარი |
| `t_member_since` | Member since | შემოუერთდა |
| `t_verifications` | Verifications | Verifications |
| `t_verified` | Verified | ვერიფიცირებული |
| `t_account_verified` | Account verified | პროფილი ვერიფიცირებულია |
| `t_email_address` | E-mail address | ელ-ფოსტა |
| `t_languages` | Languages | უცხო ენები |
| `t_basic` | Basic | გაქცეულს მოვაბრუნებ |
| `t_conversational` | Conversational | სასაუბრო |
| `t_fluent` | Fluent | თავისუფლად |
| `t_native` | Native | მშობლიური |
| `t_skills` | Skills | უნარები |
| `t_beginner` | Beginner | დამწყები |
| `t_intermediate` | Intermediate | საშუალო |
| `t_expert` | Expert | პროფესიონალი |
| `t_linked_accounts` | Linked accounts | მიმაგრებული ექაუნთები |
| `t_about_me` | About me | ჩემს შესახებ |
| `t_more` / `t_less` | More / Less | მეტი / ნაკლები |
| `t_headline` | Headline | სტატუსი |
| `t_portfolio` | Portfolio | ჩემი ნამუშევრები |
| `t_view_my_porfolio` | View my portfolio | ჩემი პორტფოლიოს ნახვა |
| `t_username_portfolio` | :username portfolio | :username პორტფოლიო |
| `t_load_more` | Load more | მეტის ჩვენება |
| `t_reviews` | Reviews | შეფასებები |
| `t_based_on_number_reviews` | Based on :number reviews | დაფუძნებულია :number შეფასებაზე |
| `t_out_of_5` | out of 5 | 5-დან |
| `t_5_stars` … `t_1_star` | 5 stars … 1 star | 5 ⭐️ … 1 ⭐️ |
| `t_avatar_updated_successfully` | Your profile avatar has been successfully updated | პროფილის სურათი წარმატებით განახლდა |
| `t_headline_updated_successfully` | Your profile headline has been successfully updated | მომხმარებლის პროფილი წარმატებით განახლდა |
| `t_profile_description_updated` | Your profile description has been successfully updated | პროფილის აღწერა წარმატებით განახლდა |
| `t_skill_added_to_ur_profile` | Skill has been successfully added to your profile | უნარები წარმატებით დაემატა თქვენს პროფილზე |
| `t_add_skill_already_exists` | This skill already exists in your profile | ეს უნარები უკვე არსებობს თქვენს პროფილზე |
| `t_language_added_to_ur_profile` | Language has been successfully added to your profile | უცხო ენა წარმატებით დაემათა თქვენს პროფილზე |
| `t_add_language_already_exists` | Language already exists in your profile | უცხო ენა უკვე არსებობს თქვენს პროფილზე |
| `t_linked_accounts_has_been_updated` | Linked accounts has been successfully updated | მიმაგრებული მომხმარებლის პროფილი წარმატებით განახლდა |
| `t_availability` | Availability | ხელმისაწვდომობა |
| `t_set_availability` | Set availability | შეიყვანეთ აქტივობა |
| `t_available` / `t_unavailable` | Available / Unavailable | ვარ ხელმისაწვდომი / მიუწვდომელი |
| `t_pls_select_availability_date_in_future` | Please select a date in future | გთხოვთ აირჩიოთ თარიღი მომავალიდან |
| `t_ur_availability_settings_updated` | Your availability settings has been successfully updated | ხელმისაწვდომობის პარამეტრები წარმატებით განახლდა |
| `t_this_user_is_not_available_right_now_msg` | This user is not available right now, and he will be back on :date | ეს მომხმარებელი არ არის ხელმისაწვდომი, ის დაბრუნდება :date |
| `t_create_project` (portfolio form title) | Create project | პროექტის დამატება |
| `t_project_deleted_success` | Project has been successfully deleted | პროექტი წარმატებით წაიშალა |
| `t_account_settings` | Account settings | პროფილის მონაცემები |
| `t_ur_account_settings_updated` | Your account settings has been successfully updated | მომხმარებლის პროფილი წარმატებით განახლდა |
| `t_country` / `t_city` | Country / City | ქვეყანა / ქალაქი |
| `t_confirm_delete_account` | Delete Account | ანგარიშის წაშლა |
| `t_delete_account_warning` | (legacy text) | (legacy text) |
| `t_cannot_delete_account_active_orders_projects` | You cannot delete your account while you have active orders or projects. Please complete or cancel all active orders and projects first. | თქვენ ვერ წაშლით ანგარიშს სანამ გაქვთ აქტიური შეკვეთები ან პროექტები. გთხოვთ, ჯერ დაასრულოთ ან გააუქმოთ ყველა აქტიური შეკვეთა და პროექტი. |
| `t_verification_center` | Verification center | ვერიფიკაცია |
| `t_please_select_a_valid_document_type` | Please select a valid document type | გთხოვთ აირჩიოთ მოქმედი დოკუმენტის ტიპი |
| `t_ur_account_has_verified` | Your account has been successfully verified | თქვენმა მომხმარებლის პროფილმა წარმატებით გაიარა ვერიფიკაცია |
| `t_verification_files_declined` | Verification files has been declined | მომხმარებლის პროფილის ვერიფიკაცია სამწუხაროდ უარყოფილია |
| `t_ur_portfolio_title_has_been_published` | Your project :title has been successfully published | პროექტი :title წარმატებით გამოქვეყნდა |
| `t_dark_mode` / `t_light_mode` | see 00 | see 00 |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_buying` | Buying | ყიდვა |
| `t_selling` | Selling | გაყიდვა |
| `t_as_freelancer` | As a freelancer | როგორც ფრილანსერი |
| `t_as_client` | As a client | როგორც დამკვეთი |
| `t_no_reviews_yet` | No reviews yet | შეფასებები ჯერ არ არის |
| `t_id_verified` | ID verified | პირადობა დადასტურებულია |
| `t_request_an_offer` | Request an offer | შეთავაზების მოთხოვნა |
| `t_total_reach` | Total reach | ჯამური ნახვები |
| `t_orders_in_progress` | Orders in progress | მიმდინარე შეკვეთები |
| `t_create_new_gig` | Create a new gig | ახალი განცხადების შექმნა |
| `t_dashboard_empty_selling` | You have no sales yet. Create your first gig to start selling. | გაყიდვები ჯერ არ გაქვთ. გაყიდვის დასაწყებად შექმენით პირველი განცხადება. |
| `t_remove_avatar` | Remove photo | ფოტოს წაშლა |
| `t_avatar_types_hint` | JPG, PNG or WEBP, up to 2 MB. | JPG, PNG ან WEBP, მაქსიმუმ 2 მბ. |
| `t_portfolio_pending_review` | This work is waiting for review and is not public yet. | ეს ნამუშევარი განხილვას ელოდება და ჯერ არ არის საჯარო. |
| `t_no_portfolio_yet` | No work added yet. | ნამუშევრები ჯერ არ არის დამატებული. |
| `t_email_change_pending` | We sent a confirmation link to :email. Your email will change after you confirm it. | დადასტურების ბმული გაიგზავნა :email-ზე. ელ-ფოსტა შეიცვლება დადასტურების შემდეგ. |
| `t_email_change_confirm_subject` | Confirm your new email address | დაადასტურეთ ახალი ელ-ფოსტის მისამართი |
| `t_email_change_notice_subject` | Your MyTask email address is being changed | თქვენი MyTask-ის ელ-ფოსტის მისამართი იცვლება |
| `t_email_change_notice_body` | A request was made to change your account email to :email. If this was not you, change your password and contact support. | მოთხოვნილია თქვენი ანგარიშის ელ-ფოსტის შეცვლა :email-ით. თუ ეს თქვენ არ ყოფილხართ, შეცვალეთ პაროლი და დაუკავშირდით მხარდაჭერის სამსახურს. |
| `t_email_changed_success` | Your email address has been changed. | თქვენი ელ-ფოსტის მისამართი შეიცვალა. |
| `t_cannot_delete_account_balance` | You cannot delete your account while your balance is not 0 GEL. Please withdraw or use your funds first. | ანგარიშის წაშლა შეუძლებელია, სანამ ბალანსი 0 ლარი არ არის. გთხოვთ, ჯერ გაიტანოთ ან გამოიყენოთ თანხა. |
| `t_deleted_user` | Deleted user | წაშლილი მომხმარებელი |
| `t_kyc_document_id` | National ID card | პირადობის მოწმობა |
| `t_kyc_document_driver_license` | Driver's licence | მართვის მოწმობა |
| `t_kyc_document_passport` | Passport | პასპორტი |
| `t_kyc_front_side` / `t_kyc_back_side` / `t_kyc_selfie` | Front side / Back side / Selfie with your document | წინა მხარე / უკანა მხარე / სელფი დოკუმენტთან ერთად |
| `t_kyc_status_pending` | Your documents are being reviewed. | თქვენი დოკუმენტები განხილვის პროცესშია. |
| `t_kyc_send_again` | Send documents again | დოკუმენტების ხელახლა გაგზავნა |

## Edge cases
- EC-1 A migrated legacy "buyer" opens `/seller/home`: allowed (R-P1). `/start_selling` redirects per 00 AC-3.
- EC-2 A user sets availability while they have orders in progress: those orders continue; only new orders and offer requests are blocked (R-P5).
- EC-3 The Premium state changes while a project page is open: the next API response applies the masking rule for the new state (AC-41).
- EC-4 Username changed: the old `/profile/{old}` URL returns 404 (LEGACY). Chats and orders keep working because they use the user id. (The url-map may add a redirect later; not a business rule.)
- EC-5 Email change confirmed while a password-reset link for the old email is open: the old link stops working (spec 01 EC-5).
- EC-6 A deleted user appears in old reviews, chats and orders: shown as "Deleted user" without a profile link (P-21).
- EC-7 Two browser tabs save different profile blocks at once: each block saves independently; the last save of the same block wins.
- EC-8 KYC declined twice: the user may keep resubmitting (LEGACY has no limit).
- EC-9 Staff switch S-071 ON while items are pending: pending items stay pending until approved or deleted (auto-approve applies to new saves).
- EC-10 A user with no gigs opens their own profile: the Gigs block shows an empty state with "Create a new gig" (owner only); visitors do not see the empty block.

## Out of scope
- Reviews creation and rules (spec 07), chat (spec 08), custom-offer request form (spec 12), orders/projects lists inside the dashboards (specs 06, 10, 11), balances pages and withdrawals (specs 05, 14), subscriptions and referrals (spec 09), admin moderation screens (spec 16).
- Favourites list page (spec 04), `/sellers` and `/hire/{keyword}` (spec 03).
- Gig analytics (spec 04).

## Open questions
No new questions for `open-questions.md`. Proposed items for Owner approval:
- **P-18 Email change needs confirmation.** A new email becomes active only after the user opens a link sent to it, and the old address gets a notice. Legacy changed the email at once with only the password.
- **P-21 Account deletion and balances.** Deletion is also refused while the Available or HOLD balance is not 0 (legacy only warned that the money would be lost). Reviews by or about a deleted user stay visible, shown as "Deleted user".
- **P-22 Dashboard memory.** The last chosen dashboard is stored on the account (shared by web and mobile). Users who never chose start on Buying.
- **P-23 Restore profile editing.** The legacy edit-profile screen (headline, about, skills, languages, availability, linked accounts) exists in code, but its route is missing, so the "Edit profile" link returns 404 on the live site. We rebuild and link it. Without it, freelancers cannot fill in skills (which feed `/hire/{keyword}`) or set availability.
- **P-24 Avatar file types.** JPG, PNG and WEBP up to 2 MB. Legacy also accepted SVG, GIF and BMP. SVG can carry scripts and is dropped for safety.
- **P-25 Linked-accounts toggle.** Legacy has a switch `settings_security.is_social_media_accounts` (seed OFF) that is not in the settings register. Proposal: add register row **S-123 `profile.linked_accounts.enabled`**, boolean, prod → OFF, LEGACY. When OFF, the linked-accounts editor and profile block are hidden.
