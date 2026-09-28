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
| Q-058 | Contradiction: for NEW UI strings, vision says "generate them in English" plus a Georgian translation for review; CLAUDE.md says fill Georgian and leave English `""`. Which rule applies to new keys? (Legacy English values are kept either way, Q-031.) | orchestrator (Phase 2 plan) | answered |
| Q-059 | Live site has a dark theme (`/?theme=dark`). Keep dark mode at launch on web and mobile? | orchestrator (Phase 2 plan) | answered |
| Q-060 | Custom offers (new full flow, Q-027): who sends offers, admin approval default, expiry, fees, and what the per-plan "custom-offer limit" counts? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-061 | Revisions (Q-056): allowed values, and how revision requests interact with the 72h auto-release timer? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-062 | Reviews (Q-046): only the client reviews the freelancer, or do both sides review each other (gigs and projects)? | orchestrator (Phase 2 plan) | answered |
| Q-063 | Email 2FA (Q-043): what exactly does the admin ON/OFF toggle do? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-064 | Admin promo codes (Q-053): which fees count as "platform service fees" today, and what usage limits are needed? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-065 | Contradiction: Q-015 (admin must see chat history) vs Q-040 (drop legacy conversations tables). Exactly which chat history is migrated? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-066 | Renewal reminder (Q-019): default days before the charge (2 or 3)? Email only, or also in-app/push? | orchestrator (Phase 2 plan) | answered |
| Q-067 | Auto-release (Q-051): does it apply to gig orders, project payments AND custom offers? Does the freelancer "unblock request" remain when auto-release is ON? (details below) | orchestrator (Phase 2 plan) | answered |
| Q-068 | Launch values of legacy settings whose production values are unknown (moderation auto-approve, email verification, reCAPTCHA, withdrawal minimum/period, top-up min/max, upload limits), and whether custom offers are ON at launch (details below) | product-analyst (P2-A1) | answered |
| Q-069 | Premium entitlements "Appearance in top offers" and "Ability to contact project authors": what exactly should they do, and should the server enforce them? (details below) | product-analyst (P2-A1) | answered |
| Q-070 | BOG card surcharge: legacy adds a hard-coded 2.5% on top of the configured BOG gateway fee. Is the total exactly 2.5%, and on which payments? (details below) | product-analyst (P2-A1) | answered |
| Q-071 | Auto-release timer after a pause (revision request, refund, dispute): does a fresh 72h start, or does the remaining time continue? (details below) | product-analyst (P2-A1) | answered |
| Q-072 | Global email-2FA toggle: launch value, and what happens to users who turned 2FA on if the admin switches it OFF? (details below) | product-analyst (P2-A1) | answered |
| Q-073 | Primary button colour: the live teal `#35A29F` fails contrast with white text (3.08:1). Use the darker logo teal (`#0D696C`, 6.45:1) for filled buttons and links, keeping `#35A29F` as an accent? | ui-ux-designer (P2-C1) | answered |
| Q-074 | Drop the admin-editable brand/hero colour setting in favour of fixed design tokens? The mobile app cannot pick up colours changed at runtime. | ui-ux-designer (P2-C1) | answered |
| Q-075 | Is there a vector (SVG/AI/PDF) master of the MYTASK logo, and a square icon mark? The favicon is currently the full wordmark (unreadable at 16 px), and the apps need a 1024×1024 icon. If none exists, may the designer derive a simple "M" mark for your approval? | ui-ux-designer (P2-C1) | answered |
| Q-076 | Transactional emails still use the older purple/teal "MY TASK" logo. Switch emails to the current logo? | ui-ux-designer (P2-C1) | answered |
| Q-077 | The 7 category images (3D renders) and icons (pink-purple gradient) were uploaded through the admin. Is their licence known? Keep them, or recolour/replace them to match the teal brand? (Not blocking.) | ui-ux-designer (P2-C1) | answered |
| Q-078 | The sky blue `#2EBFF6` (2.12:1 with white) is used on the Premium buy button and the "Invite and earn points" banner. Move both to the brand palette (teal, or orange with dark text)? | ui-ux-designer (P2-C1) | answered |
| Q-079 | The `lock.svg` illustration is Freepik artwork and requires attribution. Replace it with our own empty-state art? | ui-ux-designer (P2-C1) | answered |
| Q-080 | The dashboards, chat and checkout were audited from source code only (no login). Could you add a few screenshots of those logged-in screens to `docs/05-design/screenshots/`, or review those audit sections yourself? | ui-ux-designer (P2-C1) | answered |
| Q-081 | Premium in the mobile apps (ADR-016): Apple and Google require their own in-app billing for subscriptions sold inside apps. At launch, sell Premium for money on the web only, while the app allows buying Premium with points? Or add Apple/Google in-app purchase later? | solution-architect (P2-B1) | open |
| Q-082 | Email 2FA trigger (ADR-002; same as P-15 in spec 01): ask for a code on a NEW or expired device only, not on an IP change alone (phones change IP often)? Q-063 said "new devices/IPs". | solution-architect (P2-B1) | open |
| Q-083 | Staff reading chats (Q-015) must be disclosed to users in the terms/privacy text. Confirm, and approve the wording when it is drafted. | solution-architect (P2-B1) | open |
| Q-084 | When auto-release is switched back ON after being OFF: release items that are already past 72h at the next check, or start a fresh 72h for them from that moment? | solution-architect (P2-B1) | open |
| Q-085 | S-110 custom HTML/JS in head/footer (legacy parity) weakens the site's script protection (CSP). Keep it for the Super-admin only, on public pages only, with approved script hosts, or drop it? | solution-architect (P2-B1) | open |
| Q-086 | Leaked keys: who rotates the BOG secret, revokes the Binance, Pusher and findip keys, and changes the database password shown in `error_log`, and when? Doing it now also protects the live site. | solution-architect (P2-B1) | open |
| Q-087 | BOG merchant account: does it support signed callbacks, and is there a BOG test (sandbox) environment? Without one, staging needs real 0.01 GEL payments, each with your approval. | solution-architect (P2-B1) | open |
| Q-088 | Is the `admin.mytask.ge` subdomain OK for the separate admin panel? | solution-architect (P2-B1) | open |
| Q-089 | Hosting budget (needed only before Phase 6): about €15–35/month for one VPS plus about €5/month for S3-compatible storage, with the Cloudflare free plan. Acceptable for planning? | solution-architect (P2-B1) | open |

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
Keep all existing English translations. New UI strings can be translated manually until AI translation is connected. (New keys: see Q-058. English first, Georgian alongside.)

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
Drop all unused/orphan legacy tables (Owner's words: "sliders, companies, jazzcash_transactions, etc."). The Owner did not name the legacy `conversations` tables, although the question listed them; see Q-015 and Q-065.

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

## Phase 2 planning questions (orchestrator, 2026-09-28) — answered by Owner 2026-09-28
Each question says which spec/design item it blocks. Please answer directly under each one.

### Q-058 — i18n rule for NEW strings (blocks: text tables in every spec)
`docs/00-vision.md` ("Languages") says new strings should be generated in English, with a Georgian translation that you review. `CLAUDE.md` ("Languages (i18n)") says: fill the Georgian value and leave the English value `""` for you to translate. Which rule should agents follow for new keys?
(a) CLAUDE.md: Georgian filled, English `""`; (b) vision: both English and Georgian filled by agents, you review both; (c) other.
Until answered, agents follow CLAUDE.md (project rules). Only you can change CLAUDE.md.
**Answer (Owner, 2026-09-28):** Option (b), variant: write every NEW string in English first (matching the codebase format), with the Georgian translation filled alongside it. The Owner refines the language files by hand as needed. CLAUDE.md "Languages (i18n)" updated accordingly; legacy English values are kept (Q-031).

### Q-059 — Dark mode (blocks: design tokens P2-C2)
The live site supports `/?theme=dark`. Should the new web and mobile apps ship with dark mode at launch (parity), or light only for now?
**Answer (Owner, 2026-09-28):** Yes, keep dark mode on web and mobile. Light (white) theme is the DEFAULT.

### Q-060 — Custom offer flow (blocks: spec 12)
Legacy: the CLIENT sends an offer from a freelancer's profile; optional admin approval; offer expires after N days; separate buyer fee and freelancer fee settings. For the new flow:
(a) Who can send a custom offer: client → freelancer (legacy), freelancer → client (e.g. from chat), or both?
(b) Admin approval required by default: yes or no? (It stays configurable.)
(c) Default expiry in days?
(d) Buyer/freelancer fees: default 0 (consistent with "no commission" in Q-002) and configurable in the Commission & Fee module?
(e) Q-021 mentions per-plan "custom-offer limits". What is limited: offers sent per month, active offers at a time, or something else? And for whom (sender or receiver)?
**Answer (Owner, 2026-09-28):** (a) Freelancers create custom offers, e.g. from chat; buyers can request an offer. (b) Admin approval is NOT required. (c) Expiry: 3 days. (e) Offers count toward plan listing limits only if the admin specifies so (admin-configurable). (d) Not addressed. Working assumption per Q-002/Q-006 (no commission today): fees default to 0, configurable in the Commission & Fee module.

### Q-061 — Number of revisions (blocks: specs 04, 06, 11, 12)
(a) Allowed values for the freelancer's "number of revisions": is 0 allowed? A maximum? An "unlimited" option?
(b) When the buyer requests a revision, does the 72h auto-release timer stop, and does a new 72h start at the next delivery?
(c) When all revisions are used, the buyer can only accept or request a refund/dispute. Correct?
(d) Does the same field apply to custom offers?
**Answer (Owner, 2026-09-28):** (b) Yes. A revision request strictly PAUSES the 72h auto-release timer until the freelancer re-delivers. (a), (c), (d) not addressed. The product-analyst proposes them in the specs (per Q-056 the freelancer sets the number) for Owner approval.

### Q-062 — Who reviews whom (blocks: spec 07)
Legacy: only the buyer reviews a completed gig order (rating 1–5 + text). For the rebuild (gigs and now projects):
(a) client reviews freelancer only (legacy style), or (b) both sides review each other, with the freelancer's review of the client shown on the client profile?
**Answer (Owner, 2026-09-28):** (b) Both parties review each other: the buyer reviews the freelancer AND the freelancer reviews the buyer.

### Q-063 — Email 2FA toggle (blocks: spec 01)
(a) When the admin turns 2FA ON, is it mandatory for all users, or does it only let each user switch 2FA on for their own account?
(b) Is 2FA always required for admin/staff logins, whatever the toggle says?
(c) Is a code asked for on every login, or only from a new device/browser?
**Answer (Owner, 2026-09-28):** 2FA is OPTIONAL per user (switched on in account settings), with an admin global toggle. When enabled, a code is required on login from a new device/IP. (b) staff/admin 2FA not addressed; the spec proposes it for Owner approval.

### Q-064 — Promo code scope (blocks: specs 05, 09)
Promo codes may discount "platform service fees" and Premium (Q-053). Today the only fees are the withdrawal fee (Standard 10%) and the BOG card surcharge (2.5%).
(a) Which of these may a promo code discount: the withdrawal fee, the card surcharge, both, or only future fees (e.g. a project posting fee)?
(b) Usage limits needed: total uses, uses per user, start/end date, first purchase only? (We plan to make these admin-configurable, if you agree.)
**Answer (Owner, 2026-09-28):** (a) Promo codes apply ONLY to platform services: currently the Premium subscription, plus future platform services. NEVER to platform commissions/fees (withdrawal fee, card surcharge) or freelancer prices. (b) Admin-configurable usage limits: 1 use per user, and a maximum total redemption cap.

### Q-065 — Chat history migration (blocks: data-model mapping P2-B2, spec 08)
Q-015 says the admin must be able to see chat history between users. Q-040 drops unused legacy tables; the question listed the old `conversations` tables, but the Owner's answer did not name them explicitly (an earlier transcription wrongly added them). Please confirm:
(a) Migrate the live Chatify (`/inbox`) messages and attachments: yes?
(b) Drop the OLD `conversations` chat tables WITHOUT migrating their messages: yes, or migrate them too so the history is complete?
(c) Migrate order-delivery, project-delivery and refund conversation threads (useful as dispute evidence): yes?
**Answer (Owner, 2026-09-28):** Migrate only the active Inbox (Chatify) threads and the delivery/refund order message threads. Ignore (do not migrate) the orphan legacy `conversations` tables.

### Q-066 — Renewal reminder (blocks: spec 09)
Q-019 says "2–3 days before auto-renewal". (a) Default: 2 or 3 days (admin-configurable)? (b) Email only, or also in-app notification and mobile push?
**Answer (Owner, 2026-09-28):** 3 days before the charge, via BOTH email and in-app notification.

### Q-067 — Auto-release scope (blocks: specs 06, 11, 12, 13)
(a) Does the 72h auto-release (Q-051) apply to gig orders, project payments AND custom offers?
(b) With auto-release ON, does the freelancer's "unblock request" to the admin still exist (e.g. as a fallback), or is it only used when auto-release is switched OFF?
(c) We assume that an open refund request or dispute pauses auto-release until it is resolved. Correct?
**Answer (Owner, 2026-09-28):** (a) Yes. The 72h auto-release applies equally to gig orders, projects and custom offers. (c) Any active refund request or dispute immediately pauses the timer. (b) The unblock-request fallback was not addressed; the spec proposes it for Owner approval.

## Phase 2 spec questions (product-analyst, P2-A1, 2026-09-28) — answered by Owner 2026-09-28
Raised while writing `docs/02-specs/00-platform-rules.md`. Each question says which spec it blocks. The unaddressed sub-points of Q-060d, Q-061a/c/d, Q-063b and Q-067b are not repeated here; they are the PROPOSED items P-1…P-6 in `00-platform-rules.md` ("Open questions") and need your approval there.

### Q-068 — Launch values of settings with unknown production values (blocks: 00 approval; specs 01, 04, 05, 10, 11, 12, 14)
Q-002 gave the fee values only. For the settings below, the production values are unknown. The spec's rule is: **copy the production value during migration; if that is not possible, use the legacy seed value** shown here. Please (a) confirm this rule, and (b) correct any value you know is different in production:
- Auto-approve without admin review: gigs OFF, portfolio OFF, projects ON, proposals ON, blog comments ON.
- Email verification at registration: required OFF; method "admin" (manual approval) vs "email" (link); link valid 60 min; password-reset link 60 min.
- reCAPTCHA: OFF (we recommend ON, because user logins have no throttling today, R-043).
- Withdrawals: minimum 10 GEL; one withdrawal per day (daily / weekly / monthly).
- Wallet top-up: minimum 1 GEL, maximum 900,000 GEL.
- Upload limits: gig images 10 × 5 MB, 2 documents × 10 MB, 5 tags, video ON; requirements files 50 MB (jpg, jpeg, pdf, zip); delivered work 50 MB (allowed types unknown); portfolio 10 images × 5 MB; appeal files 2 × 5 MB (types unknown); chat attachments 20 MB; custom-offer attachments 10 × 50 MB.
- (c) Custom offers (Q-027): should the new flow be switched **ON at launch** (recommended, once spec 12 passes QA), or stay OFF until you switch it on?
Recommendation: (a) yes; (c) ON at launch.
**Answer (Owner, 2026-09-28):** Recommendation accepted. (a) Rule confirmed: copy the production value during migration, else use the legacy seed value listed. (b) No corrections given. (c) Custom offers ON at launch, once spec 12 passes QA.

### Q-069 — Premium entitlements "top offers" and "contact project authors" (blocks: specs 03, 08, 10)
The plan texts (`SubscriptionPlanSeeder.php`) promise Premium users "Appearance in top offers" and "Ability to contact project authors". In the code we found only (1) a yellow border on Premium users' gig cards (`cards/gig.blade.php:1`) and (2) a Premium check on the "contact author" button in the project page view only; chat itself is open to everyone (BR-120).
(a) "Top offers": keep it as the highlight border only (legacy), or also rank Premium gigs first in search/category lists or in a "top offers" block? If ranking, how?
(b) "Contact project authors": should the server refuse a Standard user starting a chat from a project page (strict), or keep legacy behaviour (button hidden for Standard users, chat open to all)?
Recommendation: (a) keep legacy (border only) at launch, and describe any ranking boost later as a NEW item; (b) enforce server-side for chats started from a project page, and leave normal chat open to all.
**Answer (Owner, 2026-09-28):** Differs from the recommendation. (a) "Top offers" means Premium users' gigs get a "Featured/Top" badge AND higher priority ranking in search and category lists (NEW; the ranking rule is specified in spec 03). (b) "Contact project authors" means Premium users have the exclusive ability to submit proposals/bids on buyer projects (same as Q-020). Implication: there is no separate Premium gate on starting a chat; normal chat stays open to all.

### Q-070 — BOG card surcharge total and scope (blocks: spec 05)
Legacy adds a hard-coded 2.5% for BOG payments **on top of** the BOG gateway fee configured in the admin (the seed configures another 2.5% for gig orders), so gig buyers may have paid 5% if production kept the seed value (`UnifiedCheckoutComponent.php:255-262`, `BogSeeder.php:27`). In the code, the 2.5% applies to gig orders, project payments, custom offers and wallet top-ups, and not to subscription payments.
(a) In the rebuild, is the total card surcharge exactly 2.5% (one setting)?
(b) Scope: gig orders, project payments, custom offers and wallet top-ups: yes; subscription payments: no surcharge (as legacy). Correct?
Recommendation: (a) yes, one surcharge of 2.5%; (b) yes, as legacy.
**Answer (Owner, 2026-09-28):** Recommendation accepted. (a) One total card surcharge of exactly 2.5% (one admin setting). (b) It applies to gig orders, project payments, custom offers and wallet top-ups; subscription payments have no surcharge.

### Q-071 — Auto-release timer after a pause (blocks: specs 06, 11, 12, 13)
Your answer to Q-061(b) was "Yes" (the timer stops, and a new 72h starts at the next delivery), with the words "PAUSES ... until the freelancer re-delivers". "Pause" can also mean the remaining time continues.
(a) After a revision request, when the freelancer re-delivers: a **fresh full 72h** (our reading of "Yes"), or only the time that was left?
(b) After a refund request ends without money moving (the buyer closes it, or it is rejected by the seller and the buyer does not dispute): a fresh 72h from that moment, or the remaining time?
(c) After a dispute, the admin decides where the money goes, so no timer restarts. Correct?
Recommendation: (a) fresh 72h from re-delivery; (b) fresh 72h from the moment the refund request ends; (c) yes.
**Answer (Owner, 2026-09-28):** (a) After a revision/pause is resolved and new work is delivered, the 72h timer RESTARTS from the beginning (a fresh 72 hours). (b), (c) Recommendation accepted: a fresh 72h from the moment a refund request ends without money moving; after a dispute the admin decides and no timer restarts.

### Q-072 — Global email-2FA toggle (blocks: spec 01)
Q-063: 2FA is optional per user, with an admin global toggle.
(a) At launch, is the global toggle ON (users can turn on 2FA in their settings) or OFF (the option is hidden)?
(b) If the admin switches the toggle OFF later, do users who turned 2FA on stop being asked for a code (2FA suspended for everyone), or do they keep it?
Recommendation: (a) ON; (b) the toggle OFF suspends 2FA for all users (their choice is remembered and applies again when the toggle is switched ON). Staff 2FA is not affected (see P-4 in `00-platform-rules.md`).
**Answer (Owner, 2026-09-28):** Recommendation accepted. (a) Global toggle ON at launch. (b) Switching it OFF suspends 2FA for all users; their choice is remembered and applies again when it is switched back ON. Staff 2FA is not affected.

## Design questions (ui-ux-designer, P2-C1, 2026-09-28) — answered by Owner 2026-09-28
Copied by the main session from docs/handoffs/2026-09-28-ui-ux-designer-to-orchestrator-p2-c1.md. Details and evidence are in docs/05-design/audit.md.

### Q-073
Primary button colour: the live teal `#35A29F` fails contrast with white text (3.08:1). Use the darker logo teal (`#0D696C`, 6.45:1) for filled buttons and links, keeping `#35A29F` as an accent?
Recommendation: Yes. The darker teal is already in the logo.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-074
Drop the admin-editable brand/hero colour setting in favour of fixed design tokens? The mobile app cannot pick up colours changed at runtime.
Recommendation: Drop it.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-075
Is there a vector (SVG/AI/PDF) master of the MYTASK logo, and a square icon mark? The favicon is currently the full wordmark (unreadable at 16 px), and the apps need a 1024×1024 icon. If none exists, may the designer derive a simple "M" mark for your approval?
Recommendation: If there is no vector, derive an "M" mark for your approval.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-076
Transactional emails still use the older purple/teal "MY TASK" logo. Switch emails to the current logo?
Recommendation: Yes.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-077
The 7 category images (3D renders) and icons (pink-purple gradient) were uploaded through the admin. Is their licence known? Keep them, or recolour/replace them to match the teal brand? (Not blocking.)
Recommendation: Keep for now; recolour later if the licence allows.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-078
The sky blue `#2EBFF6` (2.12:1 with white) is used on the Premium buy button and the "Invite and earn points" banner. Move both to the brand palette (teal, or orange with dark text)?
Recommendation: Yes.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-079
The `lock.svg` illustration is Freepik artwork and requires attribution. Replace it with our own empty-state art?
Recommendation: Yes.
**Answer (Owner, 2026-09-28):** Recommendation accepted.

### Q-080
The dashboards, chat and checkout were audited from source code only (no login). Could you add a few screenshots of those logged-in screens to `docs/05-design/screenshots/`, or review those audit sections yourself?
Recommendation: Screenshots before P2-C4 (key screen layouts).
**Answer (Owner, 2026-09-28):** Recommendation accepted.

## Architecture questions (solution-architect, P2-B1, 2026-09-28) — open
Copied by the main session from docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b1.md. Details are in the ADRs named.

### Q-081
Premium in the mobile apps (ADR-016): Apple and Google require their own in-app billing for subscriptions sold inside apps. At launch, sell Premium for money on the web only, while the app allows buying Premium with points? Or add Apple/Google in-app purchase later?
Recommendation: Web only at launch, points in the app; in-app purchase later if needed.
**Answer:**

### Q-082
Email 2FA trigger (ADR-002; same as P-15 in spec 01): ask for a code on a NEW or expired device only, not on an IP change alone (phones change IP often)? Q-063 said "new devices/IPs".
Recommendation: New or expired device only.
**Answer:**

### Q-083
Staff reading chats (Q-015) must be disclosed to users in the terms/privacy text. Confirm, and approve the wording when it is drafted.
Recommendation: Yes, disclose it in the terms and privacy text.
**Answer:**

### Q-084
When auto-release is switched back ON after being OFF: release items that are already past 72h at the next check, or start a fresh 72h for them from that moment?
Recommendation: No recommendation from the architect; the design supports either (release at the next check is the default design).
**Answer:**

### Q-085
S-110 custom HTML/JS in head/footer (legacy parity) weakens the site's script protection (CSP). Keep it for the Super-admin only, on public pages only, with approved script hosts, or drop it?
Recommendation: Keep, restricted as described.
**Answer:**

### Q-086
Leaked keys: who rotates the BOG secret, revokes the Binance, Pusher and findip keys, and changes the database password shown in `error_log`, and when? Doing it now also protects the live site.
Recommendation: Do it now, before go-live; this also protects the current live site. You name who does it.
**Answer:**

### Q-087
BOG merchant account: does it support signed callbacks, and is there a BOG test (sandbox) environment? Without one, staging needs real 0.01 GEL payments, each with your approval.
Recommendation: Please check with BOG.
**Answer:**

### Q-088
Is the `admin.mytask.ge` subdomain OK for the separate admin panel?
Recommendation: Yes.
**Answer:**

### Q-089
Hosting budget (needed only before Phase 6): about €15–35/month for one VPS plus about €5/month for S3-compatible storage, with the Cloudflare free plan. Acceptable for planning?
Recommendation: Yes, for planning.
**Answer:**
