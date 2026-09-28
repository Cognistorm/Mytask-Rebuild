# Open questions for the Owner
Agents add questions here. The Owner answers directly under each one and changes the status.

| ID | Question | Asked by | Status |
|---|---|---|---|
| Q-001 | ⟨example⟩ | code-archaeologist | n/a (template) |
| Q-002 | What are the production values of settings_commission (commission %/type/from, tax enabled/%), projects_settings (commission_from_freelancer/publisher, type, auto-approve, premium posting/bidding), settings_publish (custom-offer fees, auto-approve gigs), settings_withdrawal (min, period), settings_auth, settings_currency? Please export these settings rows (no secrets). | code-archaeologist | answered |
| Q-003 | Please provide `mysqldump --no-data` of production. Migrations cannot explain live columns (sliders table, categories.name, nullable projects.title/description/duration, milestone status 'delivered', etc.). | code-archaeologist | answered (see Q-049) |
| Q-004 | Live /subscription says Standard pays 10% withdrawal commission and Premium 0%. Code applies one global withdrawal fee to everyone (no Premium exemption). Which is correct for the rebuild? | code-archaeologist | answered |
| Q-005 | Awarded freelancer must accept within: 48h (live "how it works"), 24h (code), or 36h (command description)? | code-archaeologist | answered |
| Q-006 | Project commission: who pays what? Code creates milestones with employer/freelancer commissions swapped and as raw numbers (e.g. 2.2 GEL instead of 2.2%). What should the rule be, and should historical milestones be corrected during migration? | code-archaeologist | answered |
| Q-007 | Keep the hard-coded 2.5% card surcharge added to the buyer's total for BOG payments? Is the "tax" (seed 2%) charged in production, and is it tax or a platform service fee? | code-archaeologist | answered |
| Q-008 | Escrow accounting: should the client's locked funds appear in the client's balance (pending), or only in the order/milestone? Legacy is inconsistent; migration must reproduce balances "exactly" — do we migrate balances as-is (including known errors) or recompute from transactions? | code-archaeologist | answered (see Q-050) |
| Q-009 | Should delivered gig orders auto-complete after N days if the buyer is silent? Code has an unscheduled command; live page says admin may auto-release; in practice freelancers file an "unblock request" after 72h. Desired rule and N? | code-archaeologist | answered (see Q-051) |
| Q-010 | Refunds always go to the buyer's wallet balance, never back to the card. Keep? | code-archaeologist | answered |
| Q-011 | Refund amount = item price only (tax and card surcharge not returned). Keep? | code-archaeologist | answered |
| Q-012 | Pending refunds are auto-marked "rejected by seller" after 2 days of seller silence (hourly job), forcing the buyer to dispute. Intended? | code-archaeologist | answered |
| Q-013 | Dual role: all new users are "seller" since June 2025, older users may be "buyer". Should every user be both (vision), and should the "Become seller" page disappear? | code-archaeologist | answered |
| Q-014 | Seller/buyer levels (badges) — keep? Legacy calculation is inconsistent (3 versions). What should the thresholds be? | code-archaeologist | answered |
| Q-015 | Chat: live uses Chatify (/inbox). Old "conversations" chat history exists in DB — migrate it into the new chat? | code-archaeologist | answered |
| Q-016 | Payment methods to support: BOG + wallet only? Is offline bank transfer used? Can the 28 other gateways be dropped? | code-archaeologist | answered (see Q-052) |
| Q-017 | Points: only earned by referral (10 per verified signup) and spent 100 = 1 month Premium? Any other earning/spending rules? | code-archaeologist | answered |
| Q-018 | Referral promo codes (referral_code_benefits) only work if the code equals a user's referral code (validator requires existing user code). Intended? How are promo codes used today? | code-archaeologist | answered (see Q-053) |
| Q-019 | Subscriptions: yearly plan (99.99 GEL) was added 2026-09-27 — is it live? Auto-renewal charges the saved card with no reminder email; keep? | code-archaeologist | answered |
| Q-020 | Must sending a project proposal require Premium (seed plan text + UI) — enforce server-side in the rebuild? | code-archaeologist | answered |
| Q-021 | Free plan limit "1 listing" is enforced for gigs only. Is there any limit for posting projects or custom offers? | code-archaeologist | answered |
| Q-022 | Georgian title/description mandatory and Georgian-only characters (no Latin letters, limited punctuation). Keep this validation when AI translation arrives? | code-archaeologist | answered |
| Q-023 | English locale returns 404 for projects without English text. Keep (SEO) or show Georgian/AI translation? | code-archaeologist | answered |
| Q-024 | URLs are not localized (language via ?locale= and session). Should the new site keep identical URLs (SEO) or add /en prefixes with redirects? | code-archaeologist | answered |
| Q-025 | Blog is disabled live and /sitemap.xml returns 404 though a cron regenerates it every minute. Keep blog? Should the new site publish a sitemap? | code-archaeologist | answered |
| Q-026 | Admin staff: who uses /dashboard and /console today? All admin emails go to the first admin account — which email? Which staff roles are needed first? | code-archaeologist | answered |
| Q-027 | Are custom offers (client→freelancer direct offers) enabled in production, and do they need admin approval? | code-archaeologist | answered |
| Q-028 | Are paid project promotions (featured/urgent/highlight/alert) and paid bid upgrades (sponsored/sealed/highlight) used? Their expiry job is not scheduled. | code-archaeologist | answered |
| Q-029 | Withdrawals are manual bank transfers (seller enters bank details as free text, admin marks paid). Keep manual, or integrate BOG payouts? | code-archaeologist | answered |
| Q-030 | Keep wallet top-up (deposit) by card? | code-archaeologist | answered |
| Q-031 | Admins can edit translation files on the server; please export production `lang/` folder. Also CLAUDE.md says English values should be "" "same as old code", but legacy English is fully filled — which convention applies? | code-archaeologist | answered |
| Q-032 | Which social logins are enabled in production (Google/Facebook/GitHub/LinkedIn/Twitter)? | code-archaeologist | answered |
| Q-033 | Which email provider is live (vision says Twilio; code supports SMTP/Mailgun/Postmark)? | code-archaeologist | answered |
| Q-034 | Two client payment screens exist for projects (/account/projects/milestones/{id} and /account/projects/payments/{id}). Which one do users use? | code-archaeologist | answered |
| Q-035 | "Hourly" project budget type exists but no hourly billing logic. Keep hourly as a label only? | code-archaeologist | answered |
| Q-036 | Projects are effectively paid in one milestone. Do you want real multi-milestone projects? | code-archaeologist | answered |
| Q-037 | Unblock request for a project releases the full bid amount (before commission); admin list vs detail approval behave differently. Which amount/behaviour is correct? | code-archaeologist | answered |
| Q-038 | BOG gig-order success code appears broken (selects a non-existent column). Have sellers been receiving pending balances for card-paid gig orders? A DB sample would confirm. | code-archaeologist | answered |
| Q-039 | Are there users with negative balance_pending in production (caused by deleting unpaid orders)? How to treat them in migration? | code-archaeologist | answered |
| Q-040 | Tables with no migration or no use (sliders, companies, jazzcash_transactions, legacy conversations): can they be dropped in the new model? | code-archaeologist | answered |
| Q-041 | Is the Binance trading bot run on the production server? Its keys and the BOG/Pusher/findip keys in code must be rotated — please confirm who will do it. | code-archaeologist | answered |
| Q-042 | Hosting: is the web root the project root (public_html)? If yes, `.env`/`error_log` may be downloadable — please have it checked urgently (agents did not test). | code-archaeologist | answered (see Q-054) |
| Q-043 | The payments page mentions one-time codes (SMS) — nothing in code. Any SMS/2FA in production? | code-archaeologist | answered |
| Q-044 | Analytics sends visitor IPs to findip.net and ip-api.com. Keep these providers for the new admin analytics? | code-archaeologist | answered (see Q-055) |
| Q-045 | Revisions: live page says revision limits depend on agreement; code allows unlimited resubmits. Any limit? | code-archaeologist | answered (see Q-056) |
| Q-046 | Reviews exist only for gig orders (not projects or custom offers). Intended? | code-archaeologist | answered |
| Q-047 | Keep user restrictions/appeals and admin IP banning? | code-archaeologist | answered (see Q-057) |
| Q-048 | ID verification center: is it used, and should verification be required for anything (e.g. withdrawals)? | code-archaeologist | answered |
| Q-049 | `/legacy/APP` is a plain copy with no git history, so it cannot be confirmed as the `main` branch, and `legacy/db` does not exist yet. Please (a) confirm the copy is from `main` or replace it with a fresh copy of `main`, and (b) add the `legacy/db` files you mentioned (`schema.sql`, structure only). | orchestrator (main session) | answered |
| Q-050 | In the analysed copy, milestone routes are active and every project payment is stored as ONE `project_milestones` row (funded → paid). We read "drop milestones" as: no milestone feature; one escrow payment per project; existing milestone rows are migrated as project payments. Correct? | orchestrator (main session) | answered |
| Q-051 | Delivery auto-release default: after 72h of buyer silence, should the system release funds automatically (auto-release ON), or should it only enable the freelancer's unblock request for admin review (current behaviour, auto-release OFF)? Both will be configurable; we need the launch default. | orchestrator (main session) | answered |
| Q-052 | Points as a payment method: today points only buy Premium (100 points = 1 month). Should points also pay for gigs/projects/offers? If yes, what is the conversion (e.g. 1 point = X GEL)? | orchestrator (main session) | answered |
| Q-053 | Admin promo codes for "marketing discounts": do they discount subscriptions only, or also gig/project payments? Percentage, fixed amount, or free Premium months (as today's referral_code_benefits)? | orchestrator (main session) | answered |
| Q-054 | Please have the current server checked: can `https://mytask.ge/.env` or `/error_log` be downloaded? This affects whether keys must be rotated urgently, not only moved to `.env`. | orchestrator (main session) | answered |
| Q-055 | Admin analytics currently sends every visitor IP to findip.net and ip-api.com for geolocation. Keep these providers, replace them with a local GeoIP database, or drop visitor geo analytics? | orchestrator (main session) | answered |
| Q-056 | "1 order = 1 delivery = 1 review": after delivery, can the buyer only accept or open a refund/dispute (no revision requests at all)? Or is exactly one revision allowed? | orchestrator (main session) | answered |
| Q-057 | (Q-047 repeated) Keep user restrictions + appeal flow and admin-login IP banning? | orchestrator (main session) | answered |

## Answers
Owner answers received 2026-09-28 (given in one batch in the chat, recorded here verbatim in substance). "Admin-configurable" means the value is editable in the new Admin Panel, never hard-coded. Items marked NEW are new requirements, not legacy behaviour.

**Branch note (Owner):** the legacy repo's `main` branch is the production logic. The `staging` branch is for testing only (e.g. 0.01 GEL payment tests). Base all analysis and rebuild logic on `main`. See Q-049: the copy in `/legacy/APP` has no git history, so its branch cannot be verified.

### Q-001
Template placeholder, not a real question.

### Q-002
Production has no gig/project commission and no tax. The only fee is the withdrawal fee: Standard 10%, Premium 0% (see Q-004, Q-006, Q-007). All fee percentages and withdrawal thresholds must be admin-configurable.

### Q-003
No production DB export is available now. Rely on `legacy/db` files from the `main` branch (not yet present, see Q-049). The Owner is open to a redesigned, clean, modern schema for the rebuild.

### Q-004
Withdrawal commission: Standard 10%, Premium 0%. Withdrawals stay manual for now: the admin transfers by bank and marks the request completed in the admin panel. Automation is highly welcome (see Q-029). Fee % and thresholds are admin-configurable.

### Q-005
The acceptance window is 48 hours and must be admin-configurable.

### Q-006
There is currently no project commission, only the withdrawal fee. NEW: build a flexible Commission & Fee Management module in the Admin Panel to enable, disable and set fees dynamically (e.g. project posting fee, commission %) in the future.

### Q-007
Keep the 2.5% card surcharge on BOG payments and make it admin-editable. The 2% tax is NOT used in production and is dropped.

### Q-008
Milestones are dropped. Escrow rule: when the buyer pays, funds leave the buyer's account immediately. They are not shown as pending in the buyer's wallet; the buyer sees the gig or project as paid. The held funds are shown as HOLD / Pending balance on the freelancer's side. (See Q-050: in the analysed copy, a project payment is itself stored as a milestone row.)

### Q-009
Delivery auto-completion: 72 hours, with 48h as an alternative under consideration. Current flow: the freelancer requests an unblock, the admin reviews, and the admin releases if the buyer is silent. The time period and the auto-release rule must be fully admin-configurable. (Default behaviour: Q-051.)

### Q-010
Yes. Refunds always go to the buyer's internal wallet balance.

### Q-011
Yes. Refund amount = item price only; the card surcharge and fees are not returned.

### Q-012
Keep the current behaviour (auto-reject after 2 days of seller silence → dispute) for now. It may be revised later.

### Q-013
Remove the "Become a seller" page. Every user automatically has both roles (buyer and freelancer/seller).

### Q-014
Remove seller/buyer levels and badges. The 5-star rating and review system is the primary reputation metric.

### Q-015
Chat must let users communicate seamlessly. The admin must be able to view the chat history between users to resolve disputes and verify agreements. (Implies legacy chat history is migrated; confirm scope during migration planning.)

### Q-016
Drop all 28 foreign gateways. Supported payment methods: BOG card, Wallet, and Points (earned via referrals). Bank transfer exists in code but is disabled by default. NEW: admin can add or deduct points. (What Points can pay for: Q-052.)

### Q-017
Points are earned via referral for now. The data model and logic must allow awarding points for other tasks/events later.

### Q-018
NEW: promo codes in two modes: (1) user referral codes, (2) admin-created promo codes for marketing discounts. (What the discounts apply to: Q-053.)

### Q-019
The yearly plan is live. NEW: send an automated email 2–3 days before auto-renewal charges the saved card.

### Q-020
Yes. Sending proposals/bids strictly requires an active Premium plan, enforced server-side.

### Q-021
The free "1 listing" limit applies to gigs only. NEW: plan limits (gig count, project limits, custom-offer limits) are fully admin-editable for both the Standard and Premium tiers.

### Q-022
Allow Latin characters alongside Georgian in titles and descriptions (drops the Georgian-only rule).

### Q-023
When English text is missing, show the Georgian text (AI auto-translation comes in a later step). Do not return 404.

### Q-024
NEW: add localized URL prefixes (e.g. `/en/`) for SEO. (Implies 301 redirects from the current unprefixed URLs; the architect designs the scheme.)

### Q-025
Keep the blog. Fix the `/sitemap.xml` 404 and make sure sitemap generation works.

### Q-026
Admin notification email: ir.gvazava@gmail.com. NEW: admin notification recipients are editable in the Admin Panel, with support for multiple recipient emails.

### Q-027
Custom offers are currently disabled because the flow is incomplete. NEW: build a complete, robust custom offer flow, toggleable in the Admin Panel.

### Q-028
Remove paid project promotions and paid bid upgrades for now.

### Q-029
Keep manual bank-transfer withdrawals for now (BOG-side limitations). Design the backend cleanly so the BOG Payout API can be plugged in later.

### Q-030
Yes. Keep card wallet top-up.

### Q-031
Keep all existing English translations. New UI strings can be translated manually until AI translation is connected. (Working rule: migrated legacy English values are kept; new keys follow CLAUDE.md, with Georgian filled and English "" for the Owner to translate.)

### Q-032
Keep the social login architecture (Google etc.) ready, with API keys configurable in the Admin Panel.

### Q-033
The live email provider is Twilio SendGrid.

### Q-034
Use the `/payments/...` flow, since milestones are removed.

### Q-035
Remove hourly projects from the active scope. The data model stays extensible so they can come back without breaking changes.

### Q-036
Remove multi-milestones from the active scope. The data model stays extensible so they can come back without breaking changes.

### Q-037
Owner answer (grouped with Q-039): negative balances are unexpected; migrate any that exist as-is. Implied for the unblock amount: with no project commission, the gross bid amount equals the freelancer's net, and the rebuild has one admin approval implementation.

### Q-038
Card-paid gig orders must deduct from the buyer and hold the funds in the freelancer's Pending/Hold balance, so the freelancer can start work safely. The legacy bug is not carried over.

### Q-039
If negative balances exist during migration, migrate them as-is.

### Q-040
Drop all unused/orphan legacy tables (sliders, companies, jazzcash_transactions, legacy conversations tables, etc.). The legacy chat history question is in Q-015.

### Q-041
Remove the Binance bot and its keys completely.

### Q-042
Move Pusher, BOG, SendGrid and all other API keys strictly into `.env`; the developer handles environment setup. Still open: whether `.env` / `error_log` are web-reachable on the current server (Q-054).

### Q-043
No SMS today. NEW: 2-factor authentication by email, with an Admin Panel ON/OFF toggle.

### Q-044
Owner's answer was grouped with Q-043 (email 2FA). The analytics IP-geolocation providers were not addressed (Q-055).

### Q-045
1 order = 1 delivery = 1 review; no unlimited revisions. **Refined by Q-056:** the number of revisions is set by the freelancer per gig or project offer.

### Q-046
Yes. NEW: enable reviews and ratings for completed projects too.

### Q-047
Not addressed in the Owner's answers (Q-057).

### Q-048
Keep KYC ID verification (selfie + ID front/back) in code, ready to integrate a live verification service later.

## Follow-up answers (Owner, 2026-09-28)
**Branch (Owner, confirmed):** `main` is the live production branch serving real users; `staging` is the development/testing branch. Analysis and rebuild logic follow `main` only.

### Q-049
Yes. `/legacy/APP` is the `main` branch logic. No schema dump will be provided for now; the data model comes from migrations and models (see Q-003: a redesigned, clean schema is welcome).

### Q-050
Confirmed. There is no milestones feature and one escrow payment per project. Legacy `project_milestones` records map directly to project payments during migration.

### Q-051
After 72h of buyer silence following delivery, funds are released automatically to the freelancer. The rule (on/off) and the period are admin-configurable.

### Q-052
Points can ONLY buy Premium subscriptions (100 points = 1 month Premium). They are not a payment method for gigs, projects or offers.

### Q-053
Admin promo codes apply ONLY to platform service fees and Premium subscriptions, as a percentage or a fixed GEL discount. They NEVER discount freelancers' gig or custom offer prices.

### Q-054
`.env` is not directly downloadable. System logs were viewable in the admin panel ("LOGS", the log-viewer package). The new architecture must enforce standard web-root isolation: only the public folder is web-served, and logs and config are never web-reachable.

### Q-055
Drop the findip.net and ip-api.com integrations completely. They are not needed for basic country/location analytics.

### Q-056
Revisions are agreed in advance. NEW: a mandatory "Number of revisions" field, set by the freelancer per gig and per project proposal/offer. This replaces unlimited or fixed revisions.

### Q-057
Yes. Keep user restrictions, the appeal flow, and IP banning.
