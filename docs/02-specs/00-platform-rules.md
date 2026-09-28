# 00 — Platform rules (cross-cutting)
Status: **approved** (Owner 2026-09-28). P-1…P-13 accepted, with adjustments to P-4 and P-5; Q-068…Q-072 answered.
Author: product-analyst (P2-A1) | Date: 2026-09-28
Legacy reference: `docs/01-discovery/features.md` (BR-001…BR-122), `data-model.md` §1 "Settings singletons", `roles-and-permissions.md`, `integrations.md`, `i18n.md`, `risks-and-debt.md`; Owner decisions in `docs/01-discovery/open-questions.md` (Answers, Follow-up answers, Q-058…Q-067).

Tags used in this document:
- **LEGACY** = same as the old platform (`/legacy/APP` = legacy `main`).
- **CHANGE** = differs from legacy. The Owner decision (Q-ID) is cited.
- **NEW** = did not exist in legacy. The Owner decision (Q-ID) is cited.
- **PROPOSED** = the Owner has not decided. This is the analyst's recommendation and it **needs Owner approval** before the dependent spec can be `approved`.

Every other spec (01–17) inherits these rules. If a later spec contradicts this file, this file wins until the Owner approves a change here.

---

## Goal
Write down, in one place, the rules that every feature shares: who a user is (dual role), what the Standard and Premium plans allow, every value the admin can configure (with default and source), what the money words mean, how content languages work, and which legacy features are removed.

## Roles involved
- **Guest** (not logged in).
- **User**: every registered user is both **buyer (client)** and **freelancer (seller)** (Q-013).
- **Premium user**: a user with an active Premium subscription (BR-113).
- **Restricted / banned user**, **banned IP** (BR-008, BR-004, Q-057).
- **Staff**: Owner/Super-admin and staff roles (Customer Support, Financial Manager, Content Moderator) under the NEW RBAC (vision; defined in spec 16). Staff accounts are separate from user accounts (LEGACY: `admins` table).
- **System** (scheduled jobs: auto-release, award expiry, refund auto-reject, renewal, reminders).

## User stories
- As a user, I want one account that can both buy and sell, so that I never have to "become a seller" first.
- As a user, I want to switch between my client dashboard and my freelancer dashboard from one menu, so that I can find my purchases and my sales quickly.
- As the Owner, I want every fee, limit, timer and toggle to be editable in the Admin Panel, so that I can change business rules without a developer.
- As the Owner, I want fee changes to apply only to new transactions, so that old transactions keep the fee that applied when they happened.
- As a freelancer, I want to see clearly which money is on HOLD and which is available, so that I know what I can withdraw.
- As a buyer, I want to be charged once, immediately, and see the gig/project as paid, so that the payment is simple to understand.
- As a Georgian user, I want to write titles and descriptions in Georgian with Latin words mixed in, so that brand names and technical terms are allowed.
- As an English visitor, I want to see the Georgian text when no English text exists, instead of an error page.

## Acceptance criteria
Dual role and plans
- AC-1 Given a guest registers (email or social login), When registration succeeds, Then the account can immediately create a gig (within the plan limit), buy a gig, post a project, and (if Premium) send a proposal, with no "become a seller" step. (Q-013)
- AC-2 Given a migrated legacy user whose `account_type` was `buyer`, When they log in to the new platform, Then they have both roles and full freelancer access. (Q-013)
- AC-3 Given any request to `/start_selling`, When it is opened on the new site, Then it redirects (301) to the freelancer dashboard for logged-in users, or to registration for guests. The exact target is set in `url-map.md` (P2-B3). (Q-013)
- AC-4 Given a logged-in user on web or mobile, When they use the dashboard switcher, Then they move between the client dashboard and the freelancer dashboard without logging in again, and the choice is remembered for the next visit. (vision priority 4; BR-010)
- AC-5 Given a Standard user with non-deleted gigs equal to `plans.standard.gig_limit` (default 1), When they try to create another gig (web, mobile, or direct API call), Then the API refuses with a plan-limit error and the client shows the upgrade message. (BR-021, Q-021)
- AC-6 Given the admin changes `plans.standard.gig_limit` from 1 to 3, When a Standard user with 1 gig creates a gig, Then it is allowed, with no deployment. (Q-021)
- AC-7 Given a user without active Premium, When they submit a proposal through the API, Then the API refuses it (server-side), whatever the client shows. (Q-020, R-019)

Settings register
- AC-8 Given any value listed in the settings register below, When a staff member with the right permission changes it in the Admin Panel, Then the new value takes effect for new actions without a deployment, and the change is recorded in an audit log (who, when, old value, new value).
- AC-9 Given a fee or surcharge setting is changed at time T, When a transaction created before T is later completed, refunded or withdrawn, Then it uses the fee value that applied when it was created, and new transactions after T use the new value. (Plan P2-B2 "versioned settings")
- AC-10 Given a setting value is out of its allowed range (for example a negative percentage, or 0 hours for a timer that must be ≥ 1), When the admin saves it, Then the save is refused with a validation message and the old value stays.
- AC-11 Given a feature toggle is OFF (for example `custom_offers.enabled` or `payments.bank_transfer.enabled`), When a user opens the feature or calls its API, Then web and mobile hide the entry points and the API answers with a "feature disabled" error. Existing in-progress items of that feature can still be completed (see Edge cases).
- AC-12 Given a new platform installation, When it starts, Then every setting has the default listed in this document (or the migrated production value where the register says so).

Money
- AC-13 Given a buyer pays for a gig order, project payment or custom offer (by BOG card or wallet), When the payment succeeds, Then the buyer's wallet shows no pending amount for it, the item shows as "paid", and the freelancer's HOLD/Pending balance increases by the freelancer's amount. (Q-008, Q-038)
- AC-14 Given money on HOLD for an item, When the item is completed by the buyer or auto-released, Then the same amount moves from the freelancer's HOLD/Pending balance to their available balance. (BR-040, Q-051)
- AC-15 Given a refund is accepted, When the money moves, Then the buyer's wallet (available balance) gets the item price only; the card surcharge and any fees are not returned; nothing goes back to the card. (Q-010, Q-011)
- AC-16 Given a Standard user requests a withdrawal of 100 GEL with the default settings, When the request is created, Then the fee is 10 GEL and the payout amount is 90 GEL. Given a Premium user does the same, Then the fee is 0 and the payout is 100 GEL. (Q-004)
- AC-17 Given any money amount in the API, When it is returned, Then it is an integer in tetri with currency `GEL` (architecture convention, plan P2-B4). Display formatting is done by the client.

Timers
- AC-18 Given an item was delivered and the buyer does nothing, When `escrow.auto_release.hours` (default 72) pass with no revision request, refund request or dispute open, Then the funds are released to the freelancer automatically, for gig orders, project payments and custom offers alike. (Q-051, Q-067a)
- AC-19 Given the buyer requests a revision, or opens a refund request or dispute, When this happens, Then the auto-release timer stops immediately and does not release while it is stopped. (Q-061b, Q-067c) (Q-071: after re-delivery, and after a refund request ends without money moving, a fresh full 72h starts. After a dispute, the admin decides and no timer restarts.)
- AC-20 Given a project bid was awarded, When the freelancer has not accepted within `projects.award_acceptance_hours` (default 48), Then the award is removed automatically. (Q-005)
- AC-21 Given a refund request gets no seller answer, When `refunds.seller_response_days` (default 2) pass, Then it becomes "rejected by seller" and the buyer can raise a dispute. (Q-012, BR-082)

Languages
- AC-22 Given a gig or project has no English title/description, When it is opened under `/en/...`, Then the page shows the Georgian text (HTTP 200, not 404). (Q-023)
- AC-23 Given a Georgian title contains Latin letters (for example "Logo დიზაინი Photoshop-ში"), When it is saved, Then it is accepted. (Q-022)
- AC-24 Given a Georgian page URL without prefix (for example `/service/{slug}`), When the English version is requested, Then it lives under `/en/service/{slug}`; the Georgian version stays unprefixed. Legacy `?locale=en` URLs redirect (301) as defined in `url-map.md`. (Q-024)
- AC-25 Given the admin adds a new UI string, When it appears in `packages/i18n`, Then the English value is written first and the Georgian value is filled alongside. (Q-058)

Removed features
- AC-26 Given any feature in the "Removed features" list, When a user or staff member looks for it on web, mobile or API, Then it does not exist (no screen, no endpoint), and any legacy public URL for it redirects as defined in `url-map.md`.

---

## Business rules

### 1. Dual role (Q-013) — CHANGE
- R-1.1 Every user has both roles. There is no `account_type`, no "Become a seller" page, and no `start_selling` step. The legacy notification `YouBecameSeller` and in-app `t_u_became_a_seller` are dropped (see spec 15). (Q-013; legacy BR-011, BR-002)
- R-1.2 One account, two dashboards: client dashboard (legacy `/account/*`) and freelancer dashboard (legacy `/seller/*`), with one switcher in the account menu on web and mobile. (vision; BR-010) Freelancer routes no longer check `account_type`. (legacy `OnlySeller` middleware is not carried over)
- R-1.3 A user can never buy their own gig, bid on their own project, or send a custom offer to themselves. (LEGACY BR-030, BR-055)
- R-1.4 Restrictions, bans and IP bans apply to the whole account, both roles. (LEGACY BR-004, BR-008; Q-057). Social login must also check banned/pending status. (fixes R-020; detail in spec 01)
- R-1.5 Levels and badges do not exist. Reputation = 5-star rating + reviews. Reviews are mutual: the buyer reviews the freelancer and the freelancer reviews the buyer, for gigs and projects. (Q-014, Q-046, Q-062; detail in spec 07)
- R-1.6 Settings from legacy that only existed for single-role accounts are dropped: `settings_general.freelancer_requires_approval`, `settings_general.enable_multivendor`, `projects_settings.who_can_post`, `settings_auth.default_buyer_level_id/default_seller_level_id`. (Q-013, Q-014)

### 2. Plans: Standard and Premium (BR-110, Q-021) — LEGACY plans, NEW editable limits
| Entitlement | Standard (free) | Premium | Server-enforced | Source |
|---|---|---|---|---|
| Price | 0 GEL | 9.99 GEL / month, 99.99 GEL / year (editable, S-008, S-009) | – | BR-110, Q-019 |
| Gigs (non-deleted) | `plans.standard.gig_limit` = 1 | `plans.premium.gig_limit` = unlimited | yes | BR-021, Q-021 |
| Projects posted | `plans.standard.project_limit` = unlimited | unlimited | yes (when a limit is set) | Q-021 |
| Custom offers | `plans.standard.custom_offer_limit` = unlimited | unlimited | only if `custom_offers.count_toward_plan_limit` = ON | Q-021, Q-060e |
| Direct chat with users | yes | yes | – | BR-110, BR-120 |
| Gig card highlight (yellow border) | no | yes | – | BR-023 |
| "Appearance in top offers" | no | yes | NEW (Q-069): "Featured/Top" badge on Premium users' gigs AND higher ranking priority in search and category lists; ranking rule in spec 03 | BR-110 |
| Send proposals on projects | **no** | yes | **yes (CHANGE: legacy UI-only, R-019)** | Q-020 |
| View other proposals on a project | no (owner sees own project's proposals) | yes | yes | BR-057 |
| See unmasked client username on project | no (masked) | yes | yes | BR-015 |
| Contact project authors | no | yes | Q-069: means the exclusive ability to submit proposals/bids on projects (same as Q-020, enforced server-side). Starting a chat is NOT Premium-gated | BR-110, BR-120 |
| Buy Premium with points | – | 100 points = 1 month (monthly only) | yes | Q-052, BR-114 |

- R-2.1 "Premium" = subscription not canceled and `ends_at` in the future. (LEGACY BR-113)
- R-2.2 A limit value of "unlimited" is stored as empty (null). A limit of 0 means "not allowed". (NEW, Q-021)
- R-2.3 Lowering a limit never deletes or hides existing items. It only blocks creating new ones until the user is under the limit. (ACCEPTED P-9)
- R-2.4 What each limit counts: gigs = all non-deleted gigs, including pending and rejected ones (LEGACY BR-021). Projects and custom offers: ACCEPTED P-9.
- R-2.5 When Premium ends, existing gigs above the Standard limit stay published (LEGACY: the check runs only at creation, `CreateComponent.php:661-667`). New gigs are blocked until under the limit.
- R-2.6 Plan names, descriptions and feature lists are editable content in ka/en (LEGACY `plans` JSON, edited in `/console`).

### 3. Money glossary (Q-008, Q-038, Q-050) — CHANGE from legacy accounting
All amounts are stored as integer **tetri** (1 GEL = 100 tetri), currency **GEL** only. Every money movement is a ledger entry (double-entry, ADR-003 / data-model P2-B2). Balances are derived from the ledger, never typed in by hand.

| Term | i18n key | Meaning | Who sees it |
|---|---|---|---|
| **Available balance** | `t_available_balance` (LEGACY) | Money the user can spend (wallet payment) or withdraw. Increased by: releases, refunds, top-ups, rejected withdrawals, admin adjustments. | every user |
| **HOLD / Pending balance** | `t_pending_balance` (LEGACY) | **Freelancer side only.** Money the buyer has already paid for the freelancer's active gig orders, project payments and custom offers. It moves to Available on completion or auto-release, or back to the buyer's Available on an accepted refund. | freelancer |
| **Withdrawn** | `t_withdrawn` (LEGACY) | Total the user has asked to withdraw, including requests still waiting for admin payout (LEGACY meaning, BR-101). A rejected request is returned to Available. | freelancer |
| **Purchases** | – (LEGACY `balance_purchases`) | Total a buyer has spent on gigs. Informational only; kept for migration parity (vision "balances preserved exactly"). | buyer (reports) |
| **Points** | `t_points` (LEGACY) | Separate points ledger, not money. Earned by referral (10 per verified signup) and admin grants; spent only on Premium (100 = 1 month). Never a payment method for gigs, projects or offers. | every user |
| **Paid** (buyer) | – | The buyer is charged the full amount immediately at payment. The buyer's wallet never shows a pending/escrow amount; the buyer sees the order, project or offer as "paid". | buyer |
| **Card surcharge** | – | 2.5% (S-012) added on top of the price when paying by BOG card. Not refundable. Not a platform commission. | buyer |
| **Withdrawal fee** | – | % of the withdrawal amount by plan (Standard 10%, Premium 0%). | freelancer |

Money rules:
- R-3.1 Buyer charged immediately; funds are held on the freelancer's HOLD/Pending balance until completion, auto-release, refund or admin resolution. (Q-008, Q-038; vision "Money")
- R-3.2 One escrow payment per project (no milestones). Legacy `project_milestones` rows become project payments in migration. (Q-036, Q-050, Q-034)
- R-3.3 Refunds go to the buyer's Available balance only, and only the item price. (Q-010, Q-011)
- R-3.4 Today the platform takes no commission on gigs, projects or custom offers and charges no tax. The only platform fee is the withdrawal fee. The card surcharge covers card costs. (Q-002, Q-006, Q-007)
- R-3.5 With no commission, the freelancer's HOLD amount = the item price (gross = net). If a commission is later enabled in the Commission & Fee module, the freelancer's amount = price − freelancer commission, stored on the transaction when it is created. (Q-037, Q-006)
- R-3.6 Balances migrate as-is, including negative values. The new platform never creates a negative balance by itself: a movement that would make Available negative is refused. (Q-039; invariant for P2-B2)
- R-3.7 Staff never type a balance. Corrections are ledger adjustments with a reason, visible in the audit log. ACCEPTED P-12 (CHANGE from legacy direct edit, `Admin/Users/Options/EditComponent.php:228`).
- R-3.8 Percentage amounts are rounded to the nearest tetri, half up. (LEGACY `number_format(..., 2)` behaviour, e.g. `DepositComponent.php:189`)
- R-3.9 Promo codes discount only platform services (today: the Premium subscription; later: other platform services the admin marks as promo-eligible). They never discount commissions/fees (withdrawal fee, card surcharge) or freelancer prices (gigs, custom offers, project payments). (Q-053, Q-064a)

### 4. Admin-configurable settings register
Rules for the register:
- Every row is editable in the Admin Panel (spec 16) by staff with the listed permission area, validated (AC-10), audited (AC-8).
- **Versioned** rows (marked **V**) keep their history with an effective-from date; a transaction stores the value it used (AC-9).
- "Default" is the launch value. **"prod → x"** means: import the legacy production value during migration; if the production value is not available, use x (the legacy seed/migration default). These are listed in **Q-068** for Owner confirmation.
- Money defaults are written in GEL for reading; they are stored in tetri.
- Secrets (API keys) are not settings, except where the Owner decided otherwise (social login keys, Q-032). Secret values are write-only in the Admin Panel (never shown back) and stored encrypted. All other keys live in `.env` (Q-042).

#### 4.1 Plans and limits
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-001 | `plans.standard.gig_limit` | Max non-deleted gigs a Standard user may have | integer ≥ 0 or empty = unlimited | 1 | BR-021, Q-021 | LEGACY value, NEW editable |
| S-002 | `plans.premium.gig_limit` | Same, Premium | integer or empty | unlimited | BR-110, Q-021 | NEW editable |
| S-003 | `plans.standard.project_limit` | Max counted projects (P-9) for Standard | integer or empty | unlimited | Q-021 | NEW |
| S-004 | `plans.premium.project_limit` | Same, Premium | integer or empty | unlimited | Q-021 | NEW |
| S-005 | `plans.standard.custom_offer_limit` | Max counted custom offers (P-9) a Standard freelancer may have; used only if S-007 is ON | integer or empty | unlimited | Q-021, Q-060e | NEW |
| S-006 | `plans.premium.custom_offer_limit` | Same, Premium | integer or empty | unlimited | Q-021, Q-060e | NEW |
| S-007 | `custom_offers.count_toward_plan_limit` | Whether custom offers are counted against S-005/S-006 | boolean | OFF | Q-060e | NEW |
| S-008 | `plans.premium.monthly_price` **V** | Premium price per month | GEL | 9.99 | BR-110 | LEGACY (was editable in `/console`) |
| S-009 | `plans.premium.yearly_price` **V** | Premium price per year | GEL | 99.99 | BR-110, Q-019 | LEGACY |

#### 4.2 Commission & Fee module (Q-006 NEW)
Each fee rule has: `enabled` (bool), `type` (percent | fixed GEL), `value`, `payer` (buyer | freelancer), `applies_to` (gig order | project payment | custom offer | withdrawal | top-up | project posting), optional `plan` scope (Standard | Premium), and effective-from (all rows **V**). Future fees are created here, OFF by default, and switched on by the Owner. The module never touches freelancer prices.
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-010 | `fees.withdrawal.standard` | Withdrawal fee for Standard users | percent | ON, 10% | Q-004, Q-002 | CHANGE (legacy: one global fee, no plan difference, BR-101) |
| S-011 | `fees.withdrawal.premium` | Withdrawal fee for Premium users | percent | ON, 0% | Q-004 | CHANGE |
| S-012 | `fees.card_surcharge.bog` | Surcharge added to the buyer's total for BOG card payments of gig orders, project payments, custom offers and wallet top-ups. Not added to subscription payments (LEGACY: plan price only) | percent | ON, 2.5% | Q-007, BR-032; `UnifiedCheckoutComponent.php:257-262`, `DepositComponent.php:50-52`; total and scope confirmed: **Q-070** (one 2.5% surcharge; none on subscriptions) | CHANGE (legacy hard-coded) |
| S-013 | `fees.gig_order.commission` | Platform commission on gig orders | percent / fixed; payer freelancer | OFF, 0 | Q-002, Q-006 | NEW (legacy `settings_commission`, production has none) |
| S-014 | `fees.project.client_commission` | Commission paid by the client on a project payment | percent / fixed | OFF, 0 | Q-006 | NEW |
| S-015 | `fees.project.freelancer_commission` | Commission taken from the freelancer's project amount | percent / fixed | OFF, 0 | Q-006 | NEW |
| S-016 | `fees.project.posting_fee` | Fee to post a project (Owner's example of a future fee) | fixed GEL / percent | OFF, 0 | Q-006 | NEW |
| S-017 | `fees.custom_offer.buyer_fee` | Fee paid by the buyer on a custom offer | percent / fixed | OFF, 0 | Q-060d | ACCEPTED P-6 |
| S-018 | `fees.custom_offer.freelancer_fee` | Fee taken from the freelancer on a custom offer | percent / fixed | OFF, 0 | Q-060d | ACCEPTED P-6 |

Tax: removed (the 2% tax is not used in production). There is no tax setting. (Q-007)

#### 4.3 Payment methods and wallet
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-019 | `payments.bog_card.enabled` | Pay by BOG card (checkout, top-up, subscription) | boolean | ON | Q-016 | LEGACY |
| S-020 | `payments.wallet.enabled` | Pay from Available balance | boolean | ON | Q-016, BR-034 | LEGACY |
| S-021 | `payments.bank_transfer.enabled` | Offline bank transfer with manual admin approval (coded, hidden) | boolean | OFF | Q-016 | LEGACY code, OFF |
| S-022 | `wallet.topup.enabled` | Wallet top-up by card | boolean | ON | Q-030, BR-100 | LEGACY |
| S-023 | `wallet.topup.min_amount` | Minimum top-up | GEL | prod → 1 | `BogSeeder.php:28` | LEGACY |
| S-024 | `wallet.topup.max_amount` | Maximum top-up | GEL | prod → 900,000 | `BogSeeder.php:29` | LEGACY |

#### 4.4 Escrow timers (gig orders, project payments, custom offers)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-025 | `escrow.auto_release.enabled` | Release funds automatically after buyer silence following a delivery | boolean | **ON** | Q-051, Q-009 | CHANGE (legacy: no scheduled auto-complete, R-031) |
| S-026 | `escrow.auto_release.hours` | Hours of buyer silence after delivery before auto-release. Applies to gig orders, project payments and custom offers. Stopped by a revision request and by any open refund request or dispute; a fresh full period starts at re-delivery, or when a refund request ends without money moving (Q-071) | hours, ≥ 1 | 72 | Q-051, Q-067a, Q-061b, Q-067c | CHANGE |
| S-027 | `projects.award_acceptance_hours` | Time the awarded freelancer has to accept before the award is removed | hours, ≥ 1 | 48 | Q-005, BR-060 | CHANGE (legacy code 24h, R-032) |
| S-028 | `escrow.unblock_request.wait_hours` | Hours after the latest delivery before a freelancer may ask the admin to release funds | hours | 72 | BR-086 | LEGACY; availability depends on S-029 |
| S-029 | `escrow.unblock_request.available_when_auto_release_on` | Whether the freelancer "unblock request" exists while S-025 is ON | boolean | OFF (unblock request hidden while auto-release is ON) | Q-067b | ACCEPTED P-5 |

#### 4.5 Refunds and disputes
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-030 | `refunds.seller_response_days` | Days a seller/freelancer has to answer a refund request before it becomes "rejected by seller" (buyer can then dispute). Gig, project and custom-offer refunds | days, ≥ 1 | 2 | Q-012, BR-082 | LEGACY value, CHANGE (hard-coded → editable) |

#### 4.6 Withdrawals
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-031 | `withdrawals.min_amount` | Minimum withdrawal request | GEL | prod → 10 | BR-101, Q-004 | LEGACY |
| S-032 | `withdrawals.period` | Minimum time since the last PAID withdrawal: daily = 24h, weekly = 168h, monthly = 720h | enum daily / weekly / monthly | prod → daily | BR-101, Q-004 | LEGACY |
| S-033 | `withdrawals.payout_provider` | How payouts are made: manual bank transfer by admin, or BOG Payout API when integrated | enum manual / bog_payout | manual | Q-004, Q-029 | LEGACY (manual), NEW (Payout-ready) |
Fees: S-010, S-011. One pending request per user at a time (LEGACY BR-101, fixed rule).

#### 4.7 Custom offers (spec 12)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-034 | `custom_offers.enabled` | Custom-offer feature ON/OFF (freelancer creates offers, e.g. from chat; buyer can request an offer) | boolean | ON at launch once spec 12 passes QA (Q-068c) | Q-027, Q-060a | NEW flow, toggle |
| S-035 | `custom_offers.require_admin_approval` | Offers need admin approval before the buyer sees them | boolean | OFF | Q-060b | LEGACY option, default CHANGE |
| S-036 | `custom_offers.expiry_days` | Days before an unanswered offer expires | days, ≥ 1 | 3 | Q-060c | LEGACY option |
| S-037 | `custom_offers.attachments.enabled` | Attachments on offers | boolean | prod → ON | `SettingsPublishTableSeeder.php` | LEGACY |
| S-038 | `custom_offers.attachments.max_size_mb` | Max size per file | MB | prod → 50 | same | LEGACY |
| S-039 | `custom_offers.attachments.max_files` | Max files per offer | integer | prod → 10 | same | LEGACY |
| S-040 | `custom_offers.attachments.allowed_extensions` | Allowed file types | list | prod → png, jpg, zip, pdf, psd, mp4, mp3 | same | LEGACY |
Plan limit: S-005 to S-007. Fees: S-017, S-018.

#### 4.8 Revisions (Q-056 NEW)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-041 | `revisions.max_allowed` | Highest "number of revisions" a freelancer may choose on a gig, proposal or custom offer (the lowest is 0) | integer ≥ 0 | 10 | Q-056, Q-061a | ACCEPTED P-1 |

#### 4.9 Subscriptions, points, referrals, promo codes (spec 09)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-042 | `subscriptions.auto_renew.enabled` | Renew paid subscriptions by charging the saved BOG card at the end of the period (failure cancels, LEGACY BR-112) | boolean | ON | BR-111, BR-112, Q-019 | LEGACY |
| S-043 | `subscriptions.renewal_reminder.days_before` | Days before the auto-renew charge when the reminder is sent | days | 3 | Q-066, Q-019 | NEW |
| S-044 | `subscriptions.renewal_reminder.channels` | Channels for the reminder | set of email / in_app / push | email + in_app | Q-066 | NEW |
| S-045 | `points.per_premium_month` | Points needed for 1 month of Premium (monthly plan only) | points | 100 | Q-052, BR-114 | LEGACY value, editable |
| S-046 | `points.events.referral_signup` | Points the referrer earns when the referred user is verified (or registers, if verification is off). One row per earning event type; new event types can be added later | points | 10 | BR-115, Q-017 | LEGACY value, CHANGE (hard-coded → per-event setting) |

Per-code fields (set on each promo code when the admin creates it; not global settings):
| # | Field | Meaning | Type | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-047 | `promo_code.discount` | Discount type and value | percent or fixed GEL | – (required) | Q-053 | NEW |
| S-048 | `promo_code.applies_to` | Which platform services it discounts | set: Premium monthly, Premium yearly, (future services) | Premium monthly + yearly | Q-053, Q-064a | NEW |
| S-049 | `promo_code.max_uses_per_user` | Uses per user | integer | 1 | Q-064b | NEW |
| S-050 | `promo_code.max_total_redemptions` | Total redemption cap for the code | integer ≥ 1 | – (required, admin enters) | Q-064b | NEW; "required" is ACCEPTED P-10 |
| S-051 | `referral_code_benefit.premium_months` | Free Premium months granted by a referral-benefit code (legacy "referral_code_benefits") | integer | – (per code) | BR-115, Q-018 | LEGACY |

#### 4.10 Authentication and security (spec 01)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-052 | `auth.email_verification.required` | New accounts must be verified before becoming active | boolean | prod → OFF | BR-002, `SettingsAuthTableSeeder.php` | LEGACY |
| S-053 | `auth.email_verification.method` | Verification by email link, or manual admin approval | enum email / admin | prod → admin | BR-003 | LEGACY |
| S-054 | `auth.email_verification.link_expiry_minutes` | Validity of the verification link | minutes | prod → 60 | BR-003 | LEGACY |
| S-055 | `auth.password_reset.link_expiry_minutes` | Validity of the password-reset link | minutes | prod → 60 | BR-007 | LEGACY |
| S-056 | `auth.two_factor.enabled` | Global email-2FA switch. ON = users may turn 2FA on for their own account in settings (optional per user). OFF = 2FA option hidden | boolean | ON (Q-072). Switching it OFF suspends 2FA for all users; their choice is remembered and applies again when switched back ON | Q-043, Q-063 | NEW |
| S-057 | `auth.two_factor.code_ttl_minutes` | Validity of the emailed code | minutes | 10 | Q-063 | NEW, ACCEPTED P-7 |
| S-058 | `auth.two_factor.max_attempts` | Wrong codes allowed before the code is invalidated | integer | 5 | Q-063 | NEW, ACCEPTED P-7 |
| S-059 | `auth.two_factor.trusted_device_days` | How long a device/IP stays "known" after a successful 2FA login (code asked again after this, or from a new device/IP) | days | 30 | Q-063 | NEW, ACCEPTED P-7 |
| S-060 | `auth.two_factor.staff_required` | Email 2FA required for staff/admin logins, whatever S-056 says. Admin Panel toggle, never hard-coded (Owner adjustment to P-4) | boolean | ON | Q-063b, P-4 | NEW, ACCEPTED P-4 (adjusted) |
| S-061 | `auth.recaptcha.enabled` | reCAPTCHA on register, login, contact (keys in `.env`) | boolean | prod → OFF (recommend ON, R-043) | BR-001, `settings_security` | LEGACY |
| S-062 | `auth.login_throttle.max_attempts` | Failed user logins (per account + IP) within the window before a temporary lock | integer | 5 per 15 minutes | R-043 | NEW, ACCEPTED P-8 |
| S-063 | `auth.login_throttle.lock_minutes` | Lock duration after S-062 is reached | minutes | 15 | R-043 | NEW, ACCEPTED P-8 |
| S-064 | `security.staff_login.ip_ban_threshold` | Failed staff logins from one IP before the IP is banned from the staff login | integer | 3 | BR-004, `isIpBanned.php:26`, Q-057 | LEGACY |
| S-065 | `auth.social.google` | Google login: enabled + client ID + client secret (write-only) | boolean + keys | OFF until keys are entered | Q-032, BR-006 | LEGACY architecture, keys in Admin |
| S-066 | `auth.social.facebook` | Facebook login, same fields | boolean + keys | OFF until keys | Q-032 | LEGACY |
| S-067 | `auth.social.github` | GitHub login, same fields | boolean + keys | OFF until keys | Q-032 | LEGACY |
| S-068 | `auth.social.linkedin` | LinkedIn login, same fields | boolean + keys | OFF until keys | Q-032 | LEGACY |
| S-069 | `auth.social.twitter` | Twitter/X login, same fields | boolean + keys | OFF until keys | Q-032 | LEGACY |

#### 4.11 Moderation (auto-approve)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-070 | `moderation.gigs.auto_approve` | New/edited gigs go live without admin review | boolean | prod → OFF | BR-022 | LEGACY |
| S-071 | `moderation.portfolio.auto_approve` | Portfolio items go live without review | boolean | prod → OFF | `settings_publish` | LEGACY |
| S-072 | `moderation.projects.auto_approve` | Projects go live without review | boolean | prod → ON | BR-052 | LEGACY |
| S-073 | `moderation.proposals.auto_approve` | Proposals are active without review | boolean | prod → ON | BR-056 | LEGACY |
| S-074 | `moderation.blog_comments.auto_approve` | Blog comments published without review | boolean | prod → ON | `blog_settings` | LEGACY |

#### 4.12 Projects (spec 10, 11)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-075 | `projects.enabled` | Projects feature ON/OFF | boolean | ON (live site has projects) | BR-050, live `/explore/projects` | LEGACY |
| S-076 | `projects.max_skills` | Max skills on a project | integer | prod → 5 | `2023_06_10_192045_add_max_skills...` | LEGACY |
Award acceptance: S-027. Budget type: fixed only (Q-035), not a setting.

#### 4.13 Uploads and media
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-077 | `media.gig.max_images` | Images per gig | integer | prod → 10 | `SettingsPublishTableSeeder.php` | LEGACY |
| S-078 | `media.images.max_size_mb` | Max size of a gig image and project thumbnail | MB | prod → 5 | same; BR-051 | LEGACY |
| S-079 | `media.gig.video_enabled` | Video link on gigs | boolean | prod → ON | same | LEGACY |
| S-080 | `media.gig.documents_enabled` | Documents on gigs | boolean | prod → ON | same | LEGACY |
| S-081 | `media.gig.max_documents` | Documents per gig | integer | prod → 2 | same | LEGACY |
| S-082 | `media.gig.max_document_size_mb` | Max document size | MB | prod → 10 | same | LEGACY |
| S-083 | `media.gig.max_tags` | Tags per gig | integer | prod → 5 | same | LEGACY |
| S-084 | `media.requirements.max_file_size_mb` | Max file size in buyer order requirements | MB | prod → 50 | `SettingsMediaTableSeeder.php` | LEGACY |
| S-085 | `media.requirements.allowed_extensions` | Allowed requirement file types | list | prod → jpg, jpeg, pdf, zip | same | LEGACY |
| S-086 | `media.delivery.max_file_size_mb` | Max file size of delivered work (gigs, projects) | MB | prod → 50 | same | LEGACY |
| S-087 | `media.delivery.allowed_extensions` | Allowed delivered-work file types | list | prod (no seed value; **Q-068**) | `2023_09_17_141442_...` | LEGACY |
| S-088 | `media.audio_upload.enabled` | Audio uploads allowed | boolean | prod → OFF | `2023_09_17_141415_...` | LEGACY |
| S-089 | `media.portfolio.max_images` | Images per portfolio item | integer | prod → 10 | `SettingsMediaTableSeeder.php` | LEGACY |
| S-090 | `media.portfolio.max_size_mb` | Max portfolio image size | MB | prod → 5 | same | LEGACY |
| S-091 | `media.appeal.max_files` | Files per restriction appeal | integer | prod → 2 | `2023_10_29_211112_...` | LEGACY |
| S-092 | `media.appeal.max_size_mb` | Max appeal file size | MB | prod → 5 | same | LEGACY |
| S-093 | `media.appeal.allowed_extensions` | Allowed appeal file types | list | prod (no seed value; **Q-068**) | same | LEGACY |

#### 4.14 Chat (spec 08)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-094 | `chat.attachments.enabled` | Attachments in chat | boolean | prod → ON | `LiveChatSettingsTableSeeder.php` | LEGACY |
| S-095 | `chat.attachments.allowed_images` | Image types | list | prod → jpg, jpeg, png, gif | same | LEGACY |
| S-096 | `chat.attachments.allowed_files` | File types | list | prod → zip, pdf, txt, psd | same | LEGACY |
| S-097 | `chat.attachments.max_size_mb` | Max attachment size | MB | prod → 20 | same | LEGACY |
| S-098 | `chat.emojis.enabled` | Emoji picker | boolean | prod → ON | same | LEGACY |
| S-099 | `chat.sound.enabled` | Sound on new message (web) | boolean | prod → ON | same | LEGACY |
Admin chat visibility (Q-015) is a staff permission (spec 16), not a toggle.

#### 4.15 Notifications (spec 15)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-100 | `notifications.admin_recipients` | Email addresses that receive every admin notification (legacy sent all to the first admin) | list of emails, ≥ 1 | `ir.gvazava@gmail.com` | Q-026 | NEW (multiple recipients) |
| S-101 | `notifications.push.enabled` | Mobile push notifications | boolean | ON | vision (mobile app), plan spec 15 | NEW, ACCEPTED P-11 |
| S-102 | `notifications.sms.enabled` | SMS channel (interface ready, no provider today) | boolean | OFF | vision "SMS: none", Q-043 | NEW (ready, OFF) |

#### 4.16 Content, languages, appearance, SEO (spec 17 unless noted)
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-103 | `i18n.default_locale` | Default language (unprefixed URLs) | enum ka / en | ka | i18n.md, Q-024 | LEGACY |
| S-104 | `i18n.language_switcher.enabled` | Show language switcher | boolean | prod → ON | `settings_general.is_language_switcher` | LEGACY |
| S-105 | `appearance.theme_switcher.enabled` | Users can switch light/dark (web and mobile) | boolean | ON | Q-059, `settings_appearance.is_theme_switcher` | LEGACY, mobile NEW |
| S-106 | `appearance.default_theme` | Theme for users who have not chosen | enum light / dark | light | Q-059 | LEGACY |
| S-107 | `appearance.home.featured_categories` | Featured-categories block on home | boolean | prod → OFF | `settings_appearance` | LEGACY |
| S-108 | `appearance.home.best_sellers` | Best-sellers block on home | boolean | prod → OFF | same | LEGACY |
| S-109 | `appearance.home.logo_cloud` | Logo-cloud block on home | boolean | prod | `2023_09_14_115452_...` | LEGACY |
| S-110 | `appearance.custom_code` | Custom HTML/JS for head and footer per layout (e.g. tracking tags). Super-admin only; security review required | text per slot | prod | `settings_appearance` custom codes | LEGACY |
| S-111 | `branding.site` | Site title, subtitle, title separator, logo, dark logo, transparent logo, favicon | text + images | prod | `settings_general` | LEGACY |
| S-112 | `branding.header_announcement` | Header announcement text + link (ka/en) | text + URL | prod | `settings_general` | LEGACY |
| S-113 | `content.hero` | Home hero content | text + images | prod | `settings_hero` | LEGACY |
| S-114 | `content.footer` | Footer links, social links, footer logos | structured | prod | `settings_footer` | LEGACY |
| S-115 | `seo.defaults` | Default meta description, keywords, OG image, Facebook page/app ID, Twitter username | text + image | prod | `settings_seo` | LEGACY |
| S-116 | `seo.sitemap.enabled` | Publish `/sitemap.xml` (must work; live returns 404) | boolean | ON | Q-025, R-042 | LEGACY, fixed |
| S-117 | `content.blog.enabled` | Blog visible | boolean | ON | Q-025 | CHANGE (disabled live; Owner keeps the blog) |
| S-118 | `content.blog.comments_enabled` | Blog comments | boolean | prod → ON | `blog_settings` | LEGACY |
| S-119 | `content.blog.show_on_home` | Latest posts block on home | boolean | prod | `2023_10_21_200857_...` | LEGACY |
| S-120 | `content.newsletter.enabled` | Newsletter sign-up (double opt-in) | boolean | prod → ON | `newsletter_settings` | LEGACY |
| S-121 | `system.maintenance_mode` | Site in maintenance; admin notified (legacy `SiteIsDown`) | boolean | OFF | `Admin/System/MaintenanceComponent.php` | LEGACY |

#### 4.17 Integrations
| # | Key | Meaning | Type / unit | Default | Source | Tag |
|---|---|---|---|---|---|---|
| S-122 | `kyc.provider` | ID verification (selfie + ID front/back): manual admin review now, external service later | enum manual / (future provider) | manual | Q-048 | LEGACY, integration-ready |
| S-123 | `profile.linked_accounts.enabled` | Linked social profile URLs (Facebook, X, Dribbble, GitHub, …) editor and profile block | boolean | prod → OFF | P-25 (spec 02); legacy `settings_security.is_social_media_accounts` | LEGACY, added Owner 2026-09-28 |
| S-124 | `auth.two_factor.trigger` | When a 2FA code is asked for a user (or staff member) with 2FA ON: `new_device` = new or expired device only; `new_device_or_ip` = also on every new IP | enum | `new_device` | Q-082, P-15 | NEW, added Owner 2026-09-28 |

**Register count:** 124 rows = 119 global settings (S-001…S-046, S-052…S-124; S-123 and S-124 added Owner 2026-09-28) + 5 per-code promo/referral fields (S-047…S-051). 12 rows carry a default or definition accepted by the Owner through P-1…P-13 (S-017, S-018, S-029, S-041, S-050, S-057…S-060, S-062, S-063, S-101). Launch values of S-034 (Q-068) and S-056 (Q-072) are answered. 55 rows use "prod → fallback" (rule confirmed in Q-068).

#### 4.18 Fixed rules (not configurable; listed so nobody makes them settings by accident)
Legacy values kept as fixed rules unless a spec proposes otherwise:
- Online status = active in the last 10 minutes (BR-012).
- Offline chat email: at most one per 10 minutes per sender (BR-120).
- Gig delivery times: 0, 1, 2, 3, 4, 5, 6, 7, 14, 21, 30 days (BR-020). Gig price up to 2 decimals, max 10 characters (BR-020).
- Proposal message ≤ 3,500 characters; one proposal per freelancer per project; amount within the project budget (BR-055).
- Review: rating 1–5, message ≤ 800 characters, one per completed item per side (BR-042, Q-062).
- One pending withdrawal per user (BR-101). One pending refund per item (BR-080). One pending unblock request per item (BR-086).
- Points buy the monthly Premium plan only; the server computes the points needed (fixes R-006) (BR-114).
- Project budget type: fixed only (Q-035). Multi-milestones: none (Q-036).
- Currency: GEL only; no exchange rates (ACCEPTED P-13).
- Proposals require Premium (Q-020).

#### 4.19 Legacy settings not carried over (reason)
| Legacy setting | Reason | Source |
|---|---|---|
| `settings_commission` (tax, commission_from orders/withdrawals/both) | Replaced by the Commission & Fee module; tax dropped | Q-006, Q-007 |
| `projects_settings.commission_*` | Replaced by S-014, S-015 | Q-006 |
| `projects_settings.is_free_posting`, `is_premium_posting`, `projects_plans` | Paid project promotions removed | Q-028 |
| `projects_settings.is_premium_bidding`, `projects_bidding_plans` | Paid bid upgrades removed | Q-028 |
| `projects_settings.who_can_post`, `settings_general.enable_multivendor`, `freelancer_requires_approval` | Dual role | Q-013 |
| `settings_auth.default_buyer_level_id`, `default_seller_level_id`, `levels` | Levels removed | Q-014 |
| `automatic_payment_gateways` (except BOG), ~18 `<gateway>_settings` tables | Foreign gateways removed | Q-016 |
| BOG gateway `fixed_fee` / `percentage_fee` JSON | Replaced by S-012 (one surcharge) | Q-007, Q-070 |
| `settings_currency` (name, code, exchange rate) | GEL only | ACCEPTED P-13 |
| `settings_appearance.colors`, `sizes`, `font_link`, `font_family`, `is_dark_mode` | Visual values come from the design tokens (`packages/tokens`), changed only through the design system | ACCEPTED P-13 |
| `settings_media.default_storage_driver`, SMTP settings, `services/cloud`, `findip` key | Infrastructure and keys live in `.env` | Q-042, Q-055 |
| `live_chat_settings.default_provider` | Realtime provider chosen in ADR-007 | plan P2-B1 |

### 5. Content languages (i18n)
- R-5.1 Two languages: Georgian `ka` (default) and English `en`. (CLAUDE.md; i18n.md)
- R-5.2 Georgian title and description are required for gigs and projects; English is optional. (LEGACY BR-020, BR-051)
- R-5.3 Latin letters, digits and normal punctuation are allowed in the Georgian fields, alongside Georgian. The Georgian-only rule (`GeorgianTextOnly`) is dropped. (Q-022) CHANGE
- R-5.4 The English field keeps the legacy rule: no Georgian letters (`EnglishTextOnly`). (LEGACY BR-020; not changed by Q-022)
- R-5.5 When English text is missing, English pages show the Georgian text, with HTTP 200 (no 404). (Q-023) CHANGE. Content storage stays ready for AI auto-translation later (vision).
- R-5.6 URLs: Georgian unprefixed (`/service/{slug}`), English under `/en/` (`/en/service/{slug}`). Legacy `?locale=` and session language are replaced; old URLs 301 per `url-map.md`. hreflang/canonical for fallback pages: `url-map.md`. (Q-024) NEW
- R-5.7 UI strings go through i18n keys in `packages/i18n/{ka,en}.json`, shared by web and mobile. NEW keys: English written first, Georgian filled alongside; the Owner refines by hand. Legacy English values are kept. (Q-058, Q-031)
- R-5.8 Category, skill, page, blog and plan content has ka/en fields (LEGACY translatable tables), with the same Georgian fallback (R-5.5).
- R-5.9 Gig slug = slug of the Georgian title + "-" + uid (LEGACY BR-024); project URL `/project/{pid}/{slug}` (LEGACY). Kept for SEO.
- R-5.10 Fonts must support Mkhedruli (LEGACY FiraGO / BPG).

### 6. Removed features (complete list)
| # | Removed | Legacy evidence | Owner decision |
|---|---|---|---|
| X-01 | Multi-milestone projects, milestone requests by freelancer, client "reject milestone", milestone screens (`/account/projects/milestones/{id}`, `/seller/projects/milestones/{id}`); notifications `FreelancerRequestedMilestone`, `RejectMilestone` | BR-070…BR-075 | Q-036, Q-050, Q-034 |
| X-02 | Hourly projects (budget type "hourly") | BR-051 | Q-035 |
| X-03 | Paid project promotions: featured, urgent, highlight, alert (`project_subscriptions`, `projects_plans`, promotion checkout `/account/projects/checkout/{id}`, `expired:projects` job) | BR-052 | Q-028 |
| X-04 | Paid bid upgrades: sponsored, sealed, highlight (`project_bid_upgrades`, `/seller/projects/bids/checkout/{id}`); sealed-bid hiding goes with them | BR-056, BR-057 | Q-028 |
| X-05 | Seller/buyer levels and badges (levels admin, `app:upgrade-user-level` job, `UpgradeLevel` middleware) | BR-014, R-030 | Q-014 |
| X-06 | "Become a seller" page `/start_selling`, `account_type`, `YouBecameSeller` email + in-app | BR-011 | Q-013 |
| X-07 | 28 foreign payment gateways + `/callback/*` routes + settings tables; PayPal payouts | integrations.md | Q-016 |
| X-08 | Binance trading bot and its keys | R-002 | Q-041 |
| X-09 | findip.net and ip-api.com IP geolocation | integrations.md, R-040 | Q-055 (Q-044) |
| X-10 | 2% tax | BR-031 | Q-007 |
| X-11 | Legacy `conversations` chat (`/messages/*`, block/unblock) and its tables; not migrated | BR-121 | Q-065, Q-040 |
| X-12 | Orphan tables: `sliders`, `companies`, `jazzcash_transactions` (and other unused tables) | data-model.md §0 | Q-040 |
| X-13 | Georgian-only validation of Georgian fields | BR-020, BR-051 | Q-022 |
| X-14 | 404 for English pages without English text | BR-054 | Q-023 |
| X-15 | Language by `?locale=` / session with identical URLs (replaced by `/en/` prefix + 301) | i18n.md | Q-024 |
| X-16 | Unlimited delivery resubmits / unlimited revisions (replaced by the freelancer's "number of revisions") | BR-039 | Q-045, Q-056 |
| X-17 | Duplicate admin panels (`/dashboard` + Filament `/console`) merged into one Admin Panel with staff RBAC | R-034 | vision (RBAC), plan spec 16 |
| X-18 | Single "first admin" inbox for admin emails (replaced by S-100) | roles-and-permissions.md | Q-026 |
| X-19 | Direct balance editing by admin (replaced by ledger adjustments) | `Admin/Users/Options/EditComponent.php:228` | ACCEPTED P-12 |
| X-20 | Technical dead/unsafe code with no user feature: public `/update` self-updater, `/tasks/queue` and `/tasks/schedule` HTTP cron, `/te` debug route, installer, Envato licensing page, log viewer reachable from the web root (logs stay viewable inside the Admin Panel only) | R-010, R-011, inventory.md | Q-054 (web-root isolation); others: security fixes, listed for gate approval |

Not removed (kept, sometimes switched off): bank transfer (coded, OFF, Q-016); custom offers (rebuilt, toggle, Q-027); blog (kept, Q-025); KYC (kept, integration-ready, Q-048); restrictions/appeals/IP banning (Q-057); unblock requests (kept; availability P-5); wallet top-up (Q-030); dark mode (Q-059); the `Welcome` email stays unsent, as in legacy (notifications.md).

---

## Screens (web + mobile) and states
This spec defines rules, not screens. Screens that implement it:
- **Dashboard switcher** (account menu): web header dropdown; mobile account tab with a segmented "Buying / Selling" control. States: loading (skeleton of the dashboard), success. Detail in spec 02.
- **Plan-limit and Premium-required messages**: inline alert + "Upgrade" button to `/subscription` on web; bottom sheet with the same button on mobile. Detail in specs 04, 11, 12.
- **Balances block** (freelancer dashboard, earnings): Available, HOLD/Pending (with hint), Withdrawn; Points shown in the referrals/subscription area. States: loading, empty (all 0), error (retry), success. Detail in specs 05, 14.
- **Feature disabled**: if a user opens a deep link to a disabled feature, show an empty state with `t_feature_disabled` and a link home. Mobile: same text as a full-screen empty state.
- **Language fallback notice**: small note on English pages that show Georgian text (`t_content_shown_in_georgian`). Web and mobile.
- **Admin settings register UI**: spec 16.

## Notifications triggered
None directly. This spec fixes channel rules used by every other spec:
- Admin notifications go to all addresses in S-100 (NEW, Q-026).
- Renewal reminder: S-043/S-044 (NEW, Q-066; spec 09).
- Push (NEW, P-11) and SMS-ready (OFF) channels: spec 15.
- Dropped: `YouBecameSeller` / `t_u_became_a_seller` (Q-013); `FreelancerRequestedMilestone`, `RejectMilestone` and their in-app keys (Q-036). Spec 15 accounts for each.

## Texts (i18n key | en | ka)
Legacy keys reused (values unchanged):
| Key | en | ka |
|---|---|---|
| `t_switch_to_selling` | Switch to selling | ფრილანსერის პროფილი |
| `t_switch_to_buying` | Switch to buying | სერვისების შეძენა |
| `t_available_balance` | Available balance | ხელმისაწვდომი ბალანსი |
| `t_pending_balance` | Pending Balance | მოლოდინის ბალანსი |
| `t_withdrawn` | Withdrawn | თანხის გატანა |
| `t_points` | Points | ქულები |
| `t_dark_mode` | Dark mode | მუქი რეჟიმი |
| `t_light_mode` | Light mode | თეთრი ფონი |
| `t_warning_gigs_limit` | (legacy en mentions "1 gig" and "Premium Plus"; replaced for display by `t_plan_gig_limit_reached` below) | მეტი განცხადების შესაქმნელად, გთხოვთ გაააქტიუროთ პრემიუმ გამოწერა. |
| `t_warning_project_limit` | You need a subscription to bid on projects. Please select a subscription plan below. | ამ სერვისით სარგებლობისთვის საჭიროა პრემიუმ გამოწერა. |
| `t_warning_bids_limit` | To view the active bids submitted on the project, please activate a Premium or Premium Plus subscription. | პროექტზე გაგზავნილი აქტიური შეთავაზებების სანახავად, გთხოვთ გაააქტიუროთ პრემიუმ გამოწერა. |

NEW keys (English first, Georgian alongside, Q-058):
| Key | en | ka |
|---|---|---|
| `t_pending_balance_hint` | Money buyers have already paid for your active orders. It becomes available when the work is accepted or released automatically. | თანხა, რომელიც შემკვეთებმა უკვე გადაიხადეს თქვენს აქტიურ შეკვეთებზე. ის ხელმისაწვდომი გახდება, როცა სამუშაო დადასტურდება ან ავტომატურად გათავისუფლდება. |
| `t_plan_gig_limit_reached` | Your plan allows up to :limit gigs. Upgrade to Premium to create more. | თქვენი პაკეტით შესაძლებელია მაქსიმუმ :limit განცხადება. მეტის შესაქმნელად გადადით პრემიუმზე. |
| `t_plan_project_limit_reached` | Your plan allows up to :limit open projects. Upgrade to Premium to post more. | თქვენი პაკეტით შესაძლებელია მაქსიმუმ :limit ღია პროექტი. მეტის გამოსაქვეყნებლად გადადით პრემიუმზე. |
| `t_plan_offer_limit_reached` | Your plan allows up to :limit active custom offers. Upgrade to Premium to send more. | თქვენი პაკეტით შესაძლებელია მაქსიმუმ :limit აქტიური ინდივიდუალური შეთავაზება. მეტის გასაგზავნად გადადით პრემიუმზე. |
| `t_premium_required` | This action requires an active Premium plan. | ამ მოქმედებისთვის საჭიროა აქტიური პრემიუმ პაკეტი. |
| `t_upgrade_to_premium` | Upgrade to Premium | პრემიუმზე გადასვლა |
| `t_feature_disabled` | This feature is currently turned off. | ეს ფუნქცია ამჟამად გამორთულია. |
| `t_content_shown_in_georgian` | This content is not available in English yet, so it is shown in Georgian. | ეს კონტენტი ინგლისურად ჯერ არ არის ხელმისაწვდომი, ამიტომ ნაჩვენებია ქართულად. |
| `t_paid` (check legacy for an existing key before adding) | Paid | გადახდილია |

## Edge cases
- EC-1 A toggle is switched OFF while items are in progress (for example custom offers or bank transfer): new items are blocked; items already paid continue to completion, refund or dispute, and their money flows keep working. (ACCEPTED P-13 / AC-11)
- EC-2 A timer setting is changed while items are running (e.g. auto-release 72h → 48h): items already delivered keep the deadline computed at delivery; new deliveries use the new value. (ACCEPTED P-13, same pattern as AC-9)
- EC-3 Auto-release is switched OFF while timers are running: no automatic releases happen from that moment; buyers complete manually, and the unblock request becomes available (P-5). When auto-release is switched back ON, every delivery that is already past its deadline gets a fresh S-026 period (72h) from that moment; nothing is released at the next check (Q-084).
- EC-4 A Standard user above the gig limit (e.g. Premium expired, or limit lowered): existing gigs remain; new gig creation is blocked (R-2.3, R-2.5).
- EC-5 Premium expires between drafting and submitting a proposal: the server checks at submit and refuses (Q-020).
- EC-6 A user's plan changes between creating a withdrawal request and payout: the fee is fixed when the request is created (PROPOSED; confirmed in spec 14).
- EC-7 Migrated negative balance: shown as negative; the user cannot pay by wallet or withdraw until it is positive (Q-039, R-3.6).
- EC-8 English slug missing: English URL uses the same Georgian-derived slug under `/en/` (R-5.9, detail in url-map).
- EC-9 Admin removes the last admin notification recipient: refused (S-100 needs at least 1 address).
- EC-10 Social provider enabled without keys: refused at save (S-065…S-069).

## Out of scope
- Screen designs (docs/05-design), API shapes (openapi.yaml), ledger tables (data-model.md): only rules are fixed here.
- Per-feature flows: specs 01–17.
- AI auto-translation of listings and chat (vision, "later, after parity").
- BOG Payout integration itself (Q-029: design-ready only).
- Hourly and milestone payments (removed now; the data model stays extensible, Q-035, Q-036).

## Open questions
Owner decisions on the proposed items (Owner 2026-09-28): all of P-1…P-13 ACCEPTED, with adjustments to P-4 and P-5 as noted.
- **P-1 (Q-061a) Revision range.** Recommendation: whole number from 0 to `revisions.max_allowed` (default 10). 0 is allowed and means "no revisions". No "unlimited" option, because the Owner ruled out unlimited revisions (Q-045). Required field on gigs, proposals and custom offers (Q-056).
- **P-2 (Q-061c) When all revisions are used.** Recommendation: yes. The buyer can only accept the delivery or open a refund request / dispute (chat stays open). The "request revision" action is hidden and refused by the API. The auto-release timer keeps running from the last delivery.
- **P-3 (Q-061d) Custom offers.** Recommendation: yes. The same mandatory "number of revisions" field is set by the freelancer when creating a custom offer, with the same range and rules.
- **P-4 (Q-063b) Staff 2FA. ACCEPTED, ADJUSTED by the Owner:** staff/admin email 2FA is NOT hard-coded. It is an Admin Panel toggle (S-060, default ON). While it is ON, a code is required on every staff login from a new device/IP (same rule as users).
- **P-5 (Q-067b) Unblock request with auto-release ON. ACCEPTED (Owner confirmed):** while the 72h auto-release is ON (the default), the freelancer's "unblock request" button is hidden. It becomes available only if auto-release is switched OFF globally in the Admin Panel (S-025/S-029). Staff keep a manual "release funds" action for exceptional cases. The feature stays in code.
- **P-6 (Q-060d) Custom-offer fees.** Recommendation: buyer fee and freelancer fee exist in the Commission & Fee module, OFF with value 0 (consistent with "no commission", Q-002/Q-006). Legacy seed values (1.5% / 2.5%) are not used.
- **P-7 2FA parameters.** 6-digit code, valid 10 minutes, 5 wrong attempts invalidate it, a device/IP stays known for 30 days (S-057…S-059).
- **P-8 User login throttling (fixes R-043).** 5 failed logins per account + IP in 15 minutes, then a 15-minute lock (S-062, S-063). Staff IP ban stays as legacy (S-064).
- **P-9 What plan limits count.** Gigs: all non-deleted gigs (legacy). Projects: the user's open projects (pending approval or active and not yet awarded). Custom offers: offers created by the freelancer that are pending, accepted or in progress. Lowering a limit never removes existing items.
- **P-10 Promo-code total cap.** The admin must enter a total redemption cap on every promo code (no "unlimited" code by accident).
- **P-11 Mobile push.** NEW channel, ON by default, for the same events as in-app notifications (detail in spec 15).
- **P-12 Balance corrections.** Staff cannot type balances. They post a ledger adjustment with a reason, recorded in the audit log (replaces the legacy direct edit).
- **P-13 Settings not carried over / toggle behaviour.** GEL-only (no currency/exchange-rate settings); appearance colours/fonts come from design tokens, not admin settings; switching a feature OFF blocks new items but lets in-progress items finish (EC-1, EC-2).

New questions raised by this spec (in `docs/01-discovery/open-questions.md`): **Q-068** (launch values of legacy settings whose production values are unknown, incl. custom offers ON at launch), **Q-069** (Premium "top offers" and "contact project authors"), **Q-070** (BOG surcharge total and scope), **Q-071** (auto-release timer after a pause), **Q-072** (global 2FA toggle). All answered by the Owner on 2026-09-28.
