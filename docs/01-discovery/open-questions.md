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
| Q-081 | Premium in the mobile apps (ADR-016): Apple and Google require their own in-app billing for subscriptions sold inside apps. At launch, sell Premium for money on the web only, while the app allows buying Premium with points? Or add Apple/Google in-app purchase later? | solution-architect (P2-B1) | answered |
| Q-082 | Email 2FA trigger (ADR-002; same as P-15 in spec 01): ask for a code on a NEW or expired device only, not on an IP change alone (phones change IP often)? Q-063 said "new devices/IPs". | solution-architect (P2-B1) | answered |
| Q-083 | Staff reading chats (Q-015) must be disclosed to users in the terms/privacy text. Confirm, and approve the wording when it is drafted. | solution-architect (P2-B1) | answered |
| Q-084 | When auto-release is switched back ON after being OFF: release items that are already past 72h at the next check, or start a fresh 72h for them from that moment? | solution-architect (P2-B1) | answered |
| Q-085 | S-110 custom HTML/JS in head/footer (legacy parity) weakens the site's script protection (CSP). Keep it for the Super-admin only, on public pages only, with approved script hosts, or drop it? | solution-architect (P2-B1) | answered |
| Q-086 | Leaked keys: who rotates the BOG secret, revokes the Binance, Pusher and findip keys, and changes the database password shown in `error_log`, and when? Doing it now also protects the live site. | solution-architect (P2-B1) | answered |
| Q-087 | BOG merchant account: does it support signed callbacks, and is there a BOG test (sandbox) environment? Without one, staging needs real 0.01 GEL payments, each with your approval. | solution-architect (P2-B1) | answered |
| Q-088 | Is the `admin.mytask.ge` subdomain OK for the separate admin panel? | solution-architect (P2-B1) | answered |
| Q-089 | Hosting budget (needed only before Phase 6): about €15–35/month for one VPS plus about €5/month for S3-compatible storage, with the Cloudflare free plan. Acceptable for planning? | solution-architect (P2-B1) | answered |
| Q-090 | Brand "M" mark (Q-075): approve the derived M-mark proposal in `packages/assets/brand/proposal-*.svg` (favicon, 1024 app icon, Android adaptive icon), ask for changes, or wait for a professional logo file? | ui-ux-designer (P2-C2) | answered |
| Q-091 | Premium "Featured/Top" frame and badge (Q-069): use the logo orange `#F48438` with dark text (7.07:1) instead of the legacy yellow border? | ui-ux-designer (P2-C2) | answered |
| Q-092 | Dashboard switcher colours: keep Buying = blue and Selling = green (now WCAG AA compliant, as the live site), or use teal for both? | ui-ux-designer (P2-C2) | answered |
| Q-093 | Offer a "System" theme option (follow the device setting) next to Light and Dark? Light stays the default (Q-059). | ui-ux-designer (P2-C2) | answered |
| Q-094 | Shrink the desktop header height from 80 px to 72 px? The logo is sized by its real height; placement is unchanged. | ui-ux-designer (P2-C2) | answered |
| Q-095 | Migrated gigs, proposals and in-flight orders have no "number of revisions". Default them to 0 and ask freelancers to set it on their next edit, or leave it empty? | solution-architect (P2-B2/B3) | answered |
| Q-096 | Non-zero "legacy hold" residuals (legacy pending balance that cannot be matched to an open item): should staff review each one and release it or write it off with an audited adjustment, or release all of them at go-live? | solution-architect (P2-B2/B3) | answered |
| Q-097 | Which legacy admin accounts are migrated to the new admin panel, and with which roles? | solution-architect (P2-B2/B3) | open |
| Q-098 | Legacy orders and top-ups whose payment is still pending at cutover: migrate them as "awaiting payment", or drop them? | solution-architect (P2-B2/B3) | answered |
| Q-099 | Can you provide a BOG transaction statement, so card payments that legacy may never have recorded (Q-038) can be matched during migration? | solution-architect (P2-B2/B3) | answered |
| Q-100 | In-app notifications: migrate all of them, or only the last 12 months? | solution-architect (P2-B2/B3) | answered |
| Q-101 | Analytics: import only the daily aggregates and drop raw visitor data, including IP addresses? | solution-architect (P2-B2/B3) | answered |
| Q-102 | Social login keys: re-enter them in the new admin panel instead of copying them from the legacy database? | solution-architect (P2-B2/B3) | answered |
| Q-103 | Confirm the SEO choices: `/search` pages are noindex; English pages that fall back to Georgian have the Georgian page as canonical (noindex until English text exists); `/ka/gita` redirects to `/gita` (important if `/ka/gita` is printed on marketing material or QR codes). | solution-architect (P2-B2/B3) | answered |
| Q-104 | Old usernames: add a 301 from an old username to the new profile URL when a user changes their username? (Not a blocker.) | solution-architect (P2-B2/B3) | deferred |
| Q-105 | The gig and project pages label their action menu "აქციები" (`t_actions`), which in Georgian reads like "promotions". Keep the legacy text, or change the Georgian value to "მოქმედებები"? | ui-ux-designer (P2-C3) | answered |
| Q-106 | On dark and teal backgrounds the wordmark's dark-teal letters disappear, so the preview puts it on a light plate. Is there a vector master (SVG/AI/PDF) of the logo, so a white/dark-mode wordmark can be made? | ui-ux-designer (P2-C3) | answered |
| Q-107 | Some component widths are fixed numbers in components.md but not tokens yet (tooltip 280, menu ~320, Buying/Selling switcher 400, empty state 480, drawer 320). Add them as size tokens at the start of Phase 3? | ui-ux-designer (P2-C3) | answered |
| Q-108 | The "old" side of the preview comparisons is an HTML reconstruction, not screenshots (to avoid real users' photos and names). Will you add live-site screenshots to `docs/05-design/screenshots/` so the designer can check it (also asked in Q-080)? | ui-ux-designer (P2-C3) | answered |
| Q-109 | Georgian title/description: which characters besides letters and digits? Legacy projects allowed only `- _ . , ! ? ( )`; legacy gigs allowed any character except Latin letters. One list for both (P-136), or keep "no list" for gigs? | product-analyst (G-2) | open |
| Q-110 | "You may also like": legacy compared against old database columns that newer gigs leave empty, so in practice mostly "same sub-category" was shown. Compare the real titles/descriptions (P-137), or use "same sub-category" only? | product-analyst (G-3) | open |

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

## Architecture questions (solution-architect, P2-B1, 2026-09-28) — answered by Owner 2026-09-28
Copied by the main session from docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b1.md. Details are in the ADRs named.

### Q-081
Premium in the mobile apps (ADR-016): Apple and Google require their own in-app billing for subscriptions sold inside apps. At launch, sell Premium for money on the web only, while the app allows buying Premium with points? Or add Apple/Google in-app purchase later?
Recommendation: Web only at launch, points in the app; in-app purchase later if needed.
**Answer (Owner, 2026-09-28):** Differs from the recommendation. Premium can also be bought directly with BOG in the mobile app, not only on the web or with points. ADR-016 must be revised. Risk noted by the main session: Apple/Google store rules may require in-app purchase for digital subscriptions sold in apps. The architect documents this risk and a fallback in ADR-016.

### Q-082
Email 2FA trigger (ADR-002; same as P-15 in spec 01): ask for a code on a NEW or expired device only, not on an IP change alone (phones change IP often)? Q-063 said "new devices/IPs".
Recommendation: New or expired device only.
**Answer (Owner, 2026-09-28):** 2FA is triggered by new, unrecognized devices by default. The behaviour is fully configurable in the Admin Panel (setting S-124 `auth.two_factor.trigger`: `new_device` default, or `new_device_or_ip`).

### Q-083
Staff reading chats (Q-015) must be disclosed to users in the terms/privacy text. Confirm, and approve the wording when it is drafted.
Recommendation: Yes, disclose it in the terms and privacy text.
**Answer (Owner, 2026-09-28):** Yes. The Terms & Privacy text must contain a clear clause stating that staff/admins may review chats for security and dispute resolution.

### Q-084
When auto-release is switched back ON after being OFF: release items that are already past 72h at the next check, or start a fresh 72h for them from that moment?
Recommendation: No recommendation from the architect; the design supports either (release at the next check is the default design).
**Answer (Owner, 2026-09-28):** When auto-release is switched back ON globally, overdue deliveries get a fresh 72 hours (the S-026 period) from that moment before automatic completion. They are NOT released at the next check.

### Q-085
S-110 custom HTML/JS in head/footer (legacy parity) weakens the site's script protection (CSP). Keep it for the Super-admin only, on public pages only, with approved script hosts, or drop it?
Recommendation: Keep, restricted as described.
**Answer (Owner, 2026-09-28):** Keep the custom HTML/JS setting (S-110) in the Admin Panel, restricted strictly to the Super-admin and to public pages (e.g. analytics tracking scripts).

### Q-086
Leaked keys: who rotates the BOG secret, revokes the Binance, Pusher and findip keys, and changes the database password shown in `error_log`, and when? Doing it now also protects the live site.
Recommendation: Do it now, before go-live; this also protects the current live site. You name who does it.
**Answer (Owner, 2026-09-28):** Confirmed. Rotate the BOG, Pusher and database keys during the final production deployment. (Binance was removed by Q-041 and findip dropped by Q-055; their keys are revoked with the removal.) Risk noted by the main session: the keys are already in every copy of the legacy code until then.

### Q-087
BOG merchant account: does it support signed callbacks, and is there a BOG test (sandbox) environment? Without one, staging needs real 0.01 GEL payments, each with your approval.
Recommendation: Please check with BOG.
**Answer (Owner, 2026-09-28):** Implement the standard BOG structure based on the available legacy code, without over-engineering payments. Provide clean interfaces and hooks so the lead developer can finalize the integration against the official BOG documentation. (The BOG signed-callback / sandbox check is left to the lead developer.)

### Q-088
Is the `admin.mytask.ge` subdomain OK for the separate admin panel?
Recommendation: Yes.
**Answer (Owner, 2026-09-28):** Accepted: `admin.mytask.ge`.

### Q-089
Hosting budget (needed only before Phase 6): about €15–35/month for one VPS plus about €5/month for S3-compatible storage, with the Cloudflare free plan. Acceptable for planning?
Recommendation: Yes, for planning.
**Answer (Owner, 2026-09-28):** Accepted for planning: one VPS (about €15–35/month), S3-compatible storage (about €5/month), Cloudflare free plan.

## Design system questions (ui-ux-designer, P2-C2, 2026-09-28) — answered by Owner 2026-09-28
Copied by the main session from docs/handoffs/2026-09-28-ui-ux-designer-to-orchestrator-p2-c2.md. Details in docs/05-design/tokens.md and components.md.

### Q-090
Brand "M" mark (Q-075): approve the derived M-mark proposal in `packages/assets/brand/proposal-*.svg` (favicon, 1024 app icon, Android adaptive icon), ask for changes, or wait for a professional logo file?
Recommendation: No recommendation from the designer. Until approved, the files keep the `proposal-` prefix and are not used in production.
**Answer (Owner, 2026-09-28):** Approved: use the proposed "M" mark (favicon, app icon, adaptive icon).

### Q-091
Premium "Featured/Top" frame and badge (Q-069): use the logo orange `#F48438` with dark text (7.07:1) instead of the legacy yellow border?
Recommendation: Yes, logo orange.
**Answer (Owner, 2026-09-28):** Yes: logo orange `#F48438` with dark text for the Premium "Featured/Top" frame and badge.

### Q-092
Dashboard switcher colours: keep Buying = blue and Selling = green (now WCAG AA compliant, as the live site), or use teal for both?
Recommendation: Keep blue/green (continuity with the live site).
**Answer (Owner, 2026-09-28):** Keep Buying = blue and Selling = green.

### Q-093
Offer a "System" theme option (follow the device setting) next to Light and Dark? Light stays the default (Q-059).
Recommendation: Yes, as an extra option; default stays Light.
**Answer (Owner, 2026-09-28):** Yes: add a "System" theme option next to Light and Dark; Light stays the default.

### Q-094
Shrink the desktop header height from 80 px to 72 px? The logo is sized by its real height; placement is unchanged.
Recommendation: Proposed by the designer; flagged only because it is a visible dimension change.
**Answer (Owner, 2026-09-28):** Yes: desktop header 72 px.

## Data model / URL map questions (solution-architect, P2-B2/B3, 2026-09-29) — open
Copied by the main session from docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b2-b3.md. Details in docs/03-architecture/data-model.md and url-map.md.

### Q-095
Migrated gigs, proposals and in-flight orders have no "number of revisions". Default them to 0 and ask freelancers to set it on their next edit, or leave it empty?
Recommendation: Default 0; ask freelancers to set it on the next edit.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Migrated gigs, proposals and in-flight orders default to 0 revisions; freelancers are asked to set the number on their next edit.

### Q-096
Non-zero "legacy hold" residuals (legacy pending balance that cannot be matched to an open item): should staff review each one and release it or write it off with an audited adjustment, or release all of them at go-live?
Recommendation: Staff review each one (release or write off with an adjustment).
**Answer (Owner, 2026-09-29):** Recommendation accepted. Staff review each legacy-hold residual and release it or write it off with an audited adjustment.

### Q-097
Which legacy admin accounts are migrated to the new admin panel, and with which roles?
Recommendation: Needs your list.
**Answer:**

### Q-098
Legacy orders and top-ups whose payment is still pending at cutover: migrate them as "awaiting payment", or drop them?
Recommendation: Migrate as awaiting payment.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Pending legacy orders/top-ups at cutover are migrated as "awaiting payment".

### Q-099
Can you provide a BOG transaction statement, so card payments that legacy may never have recorded (Q-038) can be matched during migration?
Recommendation: Please provide it before Phase 5.
**Answer (Owner, 2026-09-29):** Recommendation accepted. The Owner provides a BOG transaction statement before Phase 5.

### Q-100
In-app notifications: migrate all of them, or only the last 12 months?
Recommendation: Only the last 12 months.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Only the last 12 months of in-app notifications are migrated.

### Q-101
Analytics: import only the daily aggregates and drop raw visitor data, including IP addresses?
Recommendation: Yes, aggregates only.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Only daily analytics aggregates are imported; raw visitor data including IPs is dropped.

### Q-102
Social login keys: re-enter them in the new admin panel instead of copying them from the legacy database?
Recommendation: Re-enter them.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Social login keys are re-entered in the new admin panel, not copied.

### Q-103
Confirm the SEO choices: `/search` pages are noindex; English pages that fall back to Georgian have the Georgian page as canonical (noindex until English text exists); `/ka/gita` redirects to `/gita` (important if `/ka/gita` is printed on marketing material or QR codes).
Recommendation: No recommendation given; please confirm or change.
**Answer (Owner, 2026-09-29):** The architect's SEO choices are confirmed as proposed: `/search` noindex; English fallback pages use the Georgian canonical and are noindex until English text exists; `/ka/gita` → `/gita` (301).

### Q-104
Old usernames: add a 301 from an old username to the new profile URL when a user changes their username? (Not a blocker.)
Recommendation: No recommendation given; not a blocker.
**Status (2026-09-29):** deferred. No recommendation existed and it is not a blocker; revisit in spec 02 / slice 1.

## Design preview questions (ui-ux-designer, P2-C3, 2026-09-29) — answered
Copied by the main session from docs/handoffs/2026-09-29-ui-ux-designer-to-orchestrator-p2-c3.md. See docs/05-design/preview/index.html.

### Q-105
The gig and project pages label their action menu "აქციები" (`t_actions`), which in Georgian reads like "promotions". Keep the legacy text, or change the Georgian value to "მოქმედებები"?
Recommendation: Change to "მოქმედებები" (the preview keeps the legacy text until you decide).
**Answer (Owner, 2026-09-29):** Recommendation accepted. The Georgian value of `t_actions` changes to "მოქმედებები"; the English value is unchanged.

### Q-106
On dark and teal backgrounds the wordmark's dark-teal letters disappear, so the preview puts it on a light plate. Is there a vector master (SVG/AI/PDF) of the logo, so a white/dark-mode wordmark can be made?
Recommendation: Please provide one if it exists; otherwise keep the light plate.
**Answer (Owner, 2026-09-29):** Recommendation accepted. No vector master is supplied now; the wordmark keeps the light plate on dark and teal backgrounds. If a vector master is found later, a white/dark-mode wordmark is made from it.

### Q-107
Some component widths are fixed numbers in components.md but not tokens yet (tooltip 280, menu ~320, Buying/Selling switcher 400, empty state 480, drawer 320). Add them as size tokens at the start of Phase 3?
Recommendation: Yes, add them in Phase 3.
**Answer (Owner, 2026-09-29):** Recommendation accepted. The fixed widths (tooltip 280, menu 320, Buying/Selling switcher 400, empty state 480, drawer 320) become size tokens at the start of Phase 3.

### Q-108
The "old" side of the preview comparisons is an HTML reconstruction, not screenshots (to avoid real users' photos and names). Will you add live-site screenshots to `docs/05-design/screenshots/` so the designer can check it (also asked in Q-080)?
Recommendation: Optional; screenshots would let the designer verify the reconstruction.
**Answer (Owner, 2026-09-29):** Recommendation accepted. Screenshots are optional; if the Owner adds them to `docs/05-design/screenshots/`, the designer checks the reconstruction against them.

## Parity gap questions (product-analyst, G-1…G-3, 2026-09-29) — answered by Owner 2026-09-30
Raised while closing parity gaps G-2 and G-3 (`docs/06-qa/plans/00-parity-master.md` §10). Each has a testable default written into the specs as a PROPOSED item, so no slice is blocked; the Owner's answer confirms or replaces it.

### Q-109
Georgian title and description of gigs and projects: which characters are allowed besides Georgian letters, Latin letters and digits?
Evidence (legacy disagrees with itself):
- Projects: only Georgian letters, digits, whitespace and `- _ . , ! ? ( )` (`legacy/APP/app/Http/Validators/Main/Post/ProjectValidator.php:38, 42`; BR-051). The English project fields had the same list with Latin letters (`:36, 40`).
- Gigs: no character list. `legacy/APP/app/Rules/GeorgianTextOnly.php:9-25` (used by `Create/OverviewValidator.php:49, 61`) only required one Georgian letter and no Latin letter, so `: ; " ' / % + & ₾ №`, dashes, quotes and emoji were all accepted.
- Q-022 allowed Latin letters but did not decide punctuation.
Options:
(a) One list for gigs and projects: Georgian + Latin letters, digits, whitespace and `- _ . , ! ? ( )` (spec 00 R-5.3a as written, P-136). Simple and identical on web, mobile and API; gig owners lose characters they could use before (e.g. `ფასი: 50₾` is refused), and migrated gig descriptions containing them must be cleaned at the next edit.
(b) As (a) for titles; descriptions of gigs and projects accept any printable character (no list).
(c) Keep legacy per feature: projects use the list in (a); gigs have no list.
Sub-question: English project fields — keep the approved gig rule (no Georgian letters, no list; spec 10 AC-3/AC-4) or return to the legacy project list?
Recommendation: (a), with the English project fields as approved (no list). It is the only explicit list in legacy and matches how Q-022 was put to you ("limited punctuation").
**Answer (Owner, 2026-09-30):** Recommendation accepted: (a), one list for gigs and projects; English project fields as approved (no list). P-136 accepted.

### Q-110
"You may also like" on the gig page: how is "similar" decided?
Evidence: legacy (`legacy/APP/app/Livewire/Main/Service/ServiceComponent.php:136-162`) shows up to 40 random active gigs that are in the same sub-category **or** whose title contains this gig's title, or whose description contains this gig's title or whole description. But it compares against the old `gigs.title`/`gigs.description` columns. Since gig texts moved to `gig_translations` (migrations `2024_02_03_200258`, `2024_03_31_161355`), new gigs save their texts only there (`Create/CreateComponent.php:741-745`), so for them the old columns are empty and in practice only "same sub-category" matches. Without the production database (Q-003/Q-049) we cannot tell how many older gigs still have the old columns.
Options:
(a) Apply the legacy rule to the real texts in the page language, with the Georgian fallback (spec 04 AC-32 as written, P-137).
(b) "Same sub-category" only (what most newer gigs effectively got).
Recommendation: (a). It is what the legacy code was written to do, and it only adds matches on top of (b).
**Answer (Owner, 2026-09-30):** Recommendation accepted: (a). P-137 accepted.

## API contract questions (solution-architect, P2-B4, 2026-09-29) — Gate items answered by Owner 2026-09-30; slice items open
Raised by the six group runs and consolidated by the integration run (`docs/handoffs/2026-09-29-solution-architect-to-orchestrator-p2-b4-integration.md`, "Open questions / risks"). Every item already has a safe default in `docs/04-api/openapi.yaml`; the Owner answer confirms or replaces it. **When = Gate** means answer at the Phase 2 gate (contract shape, money, permissions or a PROPOSED item); **slice** means it can wait for that feature slice.

| # | Spec / AC | Question (plain language) | Safe default in the contract now | Recommendation | When |
|---|---|---|---|---|---|
| Q-111 | 05 AC-44…47, S-128, 00 R-5.3a (P-135, P-136) | Accept the proposed nightly money check (time setting S-128, default 03:00) and the Georgian-title character rule? | Operations exist, marked PROPOSED | Accept both | **Gate** |
| Q-112 | 16 AC-9 (D6-Q1) | Staff actions on their own account (log out, own profile, re-login, maintenance preview) need no permission from the list — OK? | `@self`, own data only, audited | Accept (no catalogue change) | **Gate** |
| Q-113 | 14 AC-13, 16 AC-42 (Q-D3-1) | Who may see the withdrawals list with IBANs: everyone with "payments read" (incl. Customer Support) or only "approve withdrawals"? | `payments.read` for list/detail | Use `withdrawals.approve` for list/detail too (less IBAN exposure) | **Gate** |
| Q-114 | 16 AC-40, 08 AC-29 (Q-D5-4) | Refund threads: readable only with "refund thread write", or also by anyone with "read chats"? | Refund threads need `refunds.thread.write`; other threads `chat.read` | Keep | **Gate** |
| Q-115 | 16 AC-24 (D4 risk) | Content moderators approve offers but cannot download offer attachments (needs "orders read"). Give them access? | No access | Accept as is, or grant `orders.read` to the moderator role | Gate |
| Q-116 | 12 R-C2, 13 AC-13 (Q-D4-4) | Texts for "offer only to people you talk to" and "no revision during a dispute" | Generic refusal / reused text | Add the two keys above | slice (12/13) |
| Q-117 | 16 AC-21 (Q-D1-1) | Portfolio "reject": keep a "rejected" state with a reason shown to the owner (and notify?) or reject = delete with reason? | `rejected` state + reason, no notification | Keep state; add a notification (new EV, marked NEW) | Gate (data model) |
| Q-118 | 16 AC-28 (D6-Q5) | Old reports marked "seen" — import as open? | Imported as `pending` | Accept | slice (16) |
| Q-119 | 16 AC-7 (Q-D3-2) | Re-login required before releasing/writing off old held balances? | Yes | Accept | Gate |
| Q-120 | 16 AC-44 (Q-D3-3) | A negative old held balance: may staff "release" it (lowers Available) or only write it off? | Release refused if Available would go below 0 | Write-off only for negatives | Gate (money) |
| Q-121 | 13 AC-30 (Q-D4-2) | "Refund buyer" while a dispute is open: allowed, or only via the dispute decision? | Refused (`DISPUTE_OPEN`) | Keep | Gate (money) |
| Q-122 | 16 AC-39 (Q-D4-1) | Escrow "overdue" filter means: auto-release deadline passed, or delivery date passed without delivery, or both? | Either | Both (two filter values) | slice (16) |
| Q-123 | 16 AC-20 (D2 Q1) | Restoring a removed gig: counts against the plan limit? back to "pending" when S-070 is OFF? notify the owner? | Restored to active, no notification, no limit check | Check the limit; notify (NEW event) | slice (04/16) |
| Q-124 | 10 AC-1 vs EC-5 (Q-D5-1) | With projects switched OFF, may a pending award still be accepted? | Award accept/decline/revoke and contracts keep working | Keep | slice (10/11) |
| Q-125 | 08 AC-19 (Q-D5-2) | "Chat now" from a masked project owner: may the chat show the real username? | Real username in chat | Keep (chat is a direct relationship) | slice (08) |
| Q-126 | 11 AC-21 (Q-D5-3) | Text for re-proposing after declining an award | `t_u_already_submitted_a_bid_to_this_project` | Product-analyst adds a precise key | slice (11) |
| Q-127 | 06/11/12 threads (Q-D5-5) | Attachments only in direct chats, not in item threads? | Text only in item threads | Keep | slice (08) |
| Q-128 | 10 AC-14 (Q-D5-6) | Hiding a project with a waiting award: revoke the award? | Award stays pending, no new awards | Keep | slice (10) |
| Q-129 | 08 AC-12 (Q-D5-7) | 30 messages/minute limit for all threads? | All kinds | Keep | slice (08) |
| Q-130 | 01 AC-7, AC-9 (Q-D1-2/3) | Message for an already-used verification link; answer for resend to an unknown email | `AUTH_LINK_INVALID`; same success text (no enumeration) | Keep | slice (01) |
| Q-131 | 02 AC-34 (Q-D1-4) | Account deletion: dialog only, no password? | No password | Keep (as spec) | slice (02) |
| Q-132 | 01 EC-8 (Q-D1-6) | Staff "switch 2FA off" for a user under `users.edit` with a reason? | Yes, audited | Accept | slice (16) |
| Q-133 | 09 (Q-D3-4) | Promo codes deletable only before first use (deactivate after)? | Yes | Accept | slice (09) |
| Q-134 | 05 AC-36 (Q-D3-5) | Billing profile: keep legacy city and zip fields? | Not included | Add them (parity) | slice (05) — QA parity |
| Q-135 | 17 AC-35 (D2 Q2, Q3) | Home: featured-category tiles vs category rows; keep the legacy "Latest projects" block? | Legacy behaviour; no "Latest projects" block | Keep the block via `searchProjects` | slice (17) |
| Q-136 | 16 AC-69 (D6-Q4) | "Retry" of a failed email with the read permission `system.health.read`? | Yes (approved spec) | Accept | slice (16) |
| Q-137 | 16 settings areas (D6-Q2) | Which settings area (permission) owns S-128? | `system` (Super-admin) | `payments` once P-135 is accepted | Gate (with Q-111) |
| Q-138 | 15 catalogue (D6-Q3) | Staff password-reset and staff email-change emails have no EV row | Reuse user templates | Product-analyst adds EV rows | slice (15/16) |
| Q-139 | 16 AC-7 (D6-Q6) | Staff re-login: password, or the emailed code only when 2FA is ON? | Password or code (S-060 ON) | Keep | slice (16) |
| Q-140 | 16 AC-3, AC-5 (D6-Q7/Q8) | Allow removing all roles from a staff member; forbid editing a role you hold yourself? | Both as stated | Accept | slice (16) |
| Q-141 | limits not in specs (Q-D1-5, D2 Q5, Q-D4-3, Q-D4-5, Q-D4-6, Q-D3-7) | Technical limits chosen: staff email subject 200 / body 10,000; support reply subject 200; offer-request days 1–365; offer price 1.00…9,999,999,999.00 GEL; order details 5,000 counted on submitted text; recon note 1–1,000; adjustment public note ≤ 500; points adjustment ≤ 1,000,000; referral benefit ≤ 120 months; plan features ≤ 30 lines; cart ≤ 100 lines / 50 upgrades | As listed | Accept; P2-B5 checks abuse limits | slice |
| Q-142 | 04 (D2 Q7) | Migrated gigs with unknown "revisions allowed": how to display? | `null` | Show "not specified" | slice (04) |
| Q-143 | 16 catalogue (D2 Q6) | Catalog/content screens are read with their write permission (no read permission exists) | write permission | Accept | slice (16) |

## Security questions (security-reviewer P2-B5 + solution-architect fixes, 2026-09-30) — Q-144…Q-146 answered by Owner 2026-09-30; others open
From `docs/06-qa/security/00-blueprint-2026-09-30.md` and `docs/handoffs/2026-09-30-solution-architect-to-orchestrator-p2-b5-fixes.md`. These are business decisions the security review cannot make. The contract has a hook for each one, so any answer can be added later without redesign. The IBAN question (SEC-08) is Q-113 above.

| # | Finding | Question (plain language) | Options | Recommendation | When |
|---|---|---|---|---|---|
| Q-144 | SEC-05, SEC-06 | After someone changes their email, password or bank account (IBAN), should withdrawals pause for a while, in case the account was taken over? Also confirm: users without a password (social login) confirm these changes with a code sent to their current email. | (a) no pause; (b) 24 h pause; (c) 72 h pause; (d) no pause, but the approving staff member sees a "details changed recently" flag | (b) 24 h + the flag; confirm the emailed code | Gate (money) |
| Q-145 | SEC-06, SEC-07 | Should staff have to re-enter their password (step-up) before these risky actions too: changing a user's email, turning off a user's 2FA, changing security settings (S-052/053/056…064/124), changing plan prices, creating 100% promo codes? And should the user get an email when staff turn off their 2FA? | add all / add some / keep the current spec 16 AC-7 list | Add all, and send the email | Gate |
| Q-146 | SEC-11 | Custom scripts (S-110) run on the same site as the logged-in user. May the admin add third-party script hosts (e.g. tag managers), which then have full page access? | (a) any host the admin lists; (b) only fixed-code vendors (e.g. analytics pixel); (c) (b) now, and study isolating custom code in Phase 3 | (c) | Gate |
| Q-147 | SEC-12 (legal) | How long do we keep personal data? KYC ID images, data of deleted accounts, and how do we answer a user's data request (Georgian personal data law)? | — | Delete KYC images 90 days after the decision; pseudonymise deleted accounts after the tax-retention period; a documented manual process for requests at launch | Before Phase 5 KYC import |
| Q-148 | SEC-13 | Money topped up by card can be withdrawn straight to a bank account (a way to cash out stolen cards). Add a rule? | (a) no rule; (b) topped-up money can only be spent on MyTask; (c) withdrawable only after N days and to an IBAN in the user's own name; (d) only show approvers where the balance came from | (d) at minimum; (c) with 14 days + name match if you agree | Slice 14 |
| Q-149 | SEC-18 | Referral farming: 10 referred accounts = 1 month of Premium. Add limits? | (a) none; (b) monthly cap per referrer; (c) (b) + flag referrals from the same device/IP | (c) | Slice 09 |
| Q-150 | SEC-21 | A few staff actions (mark payment reviewed, mark reconciliation difference reviewed, re-check payment status with BOG, retry an email) are allowed with a "read" permission. They move no money. Accept, or add a new `payments.review` permission? | accept / new permission | Accept and record (a new permission changes the approved catalogue) | Slice 16 |

Also for the gate (technical defaults chosen in the security fixes, not business rules): login slow mode after 20 failures per hour per account (1 try per 30 s); 2FA locked after 10 wrong codes per hour; per user 20 new conversations, 20 offer requests and 10 reports per hour; analytics 120 requests per minute per IP.

## Owner answers at the Phase 2 gate (2026-09-30)
The Owner approved the Phase 2 gate on 2026-09-30: architecture + ADR-001…016, data model, URL map, API contract (`docs/04-api/openapi.yaml`), design (audit, tokens, components, preview, key screens), parity master plan and the security verdict (PASS with conditions). All "Gate" questions were answered **as recommended**:

| # | Answer (Owner, 2026-09-30) |
|---|---|
| Q-109 | (a) one character list for gigs and projects; English project fields as approved (P-136 accepted) |
| Q-110 | (a) the legacy "similar" rule on the real texts (P-137 accepted) |
| Q-111 | Accept P-135 (nightly reconciliation, S-128 default 03:00) and P-136 |
| Q-112 | Accept the `@self` exception for staff actions on their own account (no catalogue change) |
| Q-113 | **The withdrawals list and detail (with IBANs) need `withdrawals.approve`**, not `payments.read` (closes SEC-08) |
| Q-114 | Keep: refund threads need `refunds.thread.write`; other threads `chat.read` |
| Q-115 | Accept as is: content moderators get no access to offer attachments |
| Q-117 | Keep the portfolio `rejected` state with a reason shown to the owner, and **add a notification** to the owner (NEW event) |
| Q-119 | Accept: re-login before releasing or writing off legacy held balances |
| Q-120 | A negative legacy held balance can **only be written off** (no release) |
| Q-121 | Keep: "Refund buyer" is refused while a dispute is open |
| Q-137 | S-128 belongs to the **payments** settings area |
| Q-144 | **24-hour withdrawal pause** after an email, password or payout-details (IBAN) change, **plus** a "details changed recently" flag for the approving staff member; confirmed: accounts without a password confirm those changes with a code emailed to the current address |
| Q-145 | **Add step-up (re-login)** for: changing a user's email, turning off a user's 2FA, changing security settings (S-052/S-053/S-056…S-064/S-124), changing plan prices, creating 100% promo codes; **and email the user** when staff turn off their 2FA (NEW event) |
| Q-146 | (c) only fixed-code vendors in custom code (S-110) now; study isolating custom code in Phase 3 (closes SEC-11 for now) |

Still open: Q-097 (by Phase 5), Q-147 (before the Phase 5 KYC import), the slice items Q-116, Q-118, Q-122…Q-136, Q-138…Q-143, Q-148…Q-150, and Q-104 (deferred).
Owner action taken on: SEC-28, the Owner revokes the Binance and findip keys and removes the Binance bot from the legacy server by hand.

## Follow-up question (product-analyst, applying the gate answers, 2026-09-30) — open, slice 14
Raised while writing Q-144 into spec 14 (AC-21…AC-23). A testable default is written into the spec, so slice 14 is not blocked; the Owner's answer confirms or replaces it.

### Q-151
Two details of the withdrawal pause and the "details changed recently" flag (Q-144):
(a) Because of the 24-hour pause, a request can never be created within 24 h after a change, so the approver's flag must look further back to be useful. How far back before the request should a change still raise the flag? Changes made while the request is waiting always raise it.
(b) Does the **first** save of payout details (a user who never had any) also start the 24-hour pause, or only a change of existing details?
Default in spec 14: (a) 7 days before the request was created; the detail also always shows the date of the latest email, password and payout-details change. (b) Yes, the first save also starts the pause (an attacker adding an IBAN to an account without one is the same risk; a new freelancer usually earns money for longer than 24 h before the first withdrawal).
Recommendation: accept both defaults. If you want the window editable in the admin, it becomes a new register row next to S-129.
When: slice 14.

## Phase 3 platform-core questions (orchestrator/devops, 2026-09-30) — Q-152 and Q-153 answered by Owner 2026-09-30

### Q-152
MinIO, the local file storage named in ADR-009/ADR-015, no longer publishes a ready-to-run image, so it cannot be started with `docker compose up`. This only affects your computer (production storage is unchanged). Proposed replacement: SeaweedFS (free, Apache-2.0), with RustFS as the fallback; details and alternatives in `docs/03-architecture/adr/017-local-object-storage-after-minio.md`.
Options: (a) accept ADR-017 (SeaweedFS locally); (b) RustFS locally; (c) something else.
Recommendation: (a). The compose file already uses SeaweedFS under the neutral name `s3`, so any answer is a one-line change.
When: before the files slice (first uploads: slice 02 avatars).
**Answer (Owner, 2026-09-30): (a) accept ADR-017 — SeaweedFS locally.**

### Q-153
The mobile app must tell the API its version so that very old app versions can be asked to update (the "update required" screen promised in ADR-014). The contract has no header for this, and no setting holds the minimum version. Proposal in `docs/03-architecture/adr/018-mobile-app-version-header.md`: the app sends `X-MyTask-App-Version`; a new admin setting **S-130 `mobile.min_app_version`** (per platform, default 0.0.0 = gate off) decides; older apps get "update required".
Options: (a) accept ADR-018 and S-130 as proposed; (b) accept without the admin setting (minimum version changed only by a code release); (c) no version gate.
Recommendation: (a).
When: before the mobile app is published (Phase 6); the contract edit can be done any time after approval.
**Answer (Owner, 2026-09-30): (a) accept ADR-018 and S-130.**

### Q-154
Which file types may a restricted user attach to an appeal (setting S-093 `media.appeal.allowed_extensions`)? The old code had no default (the setting is empty in the legacy database migration), and Q-068 recorded the types as unknown. Until this is answered, appeals for restrictions that require files cannot be submitted; appeals without files work.
Options: (a) images and PDF: jpg, jpeg, png, webp, pdf; (b) (a) plus doc, docx; (c) the value from the production database, if you can check it (legacy admin → Settings → Media → "Restrictions allowed extensions").
Recommendation: (c) if available, otherwise (a).
When: before file uploads ship (files foundation, slice 02).
**Answer (Owner, 2026-09-30): all common types, including video.** S-093 = jpg, jpeg, png, gif, webp, pdf, doc, docx, txt, mp4, mov, avi, mkv, webm. Size: the Owner asked for a reasonable limit of 50–100 MB so videos upload smoothly; set to **100 MB** per file (S-092, was 5), because phone videos often exceed 50 MB. S-091 (2 files per appeal) unchanged. Notes for the files foundation F0 (slice 02): uploads go straight to storage (ADR-009), so the API is not loaded; ClamAV's default limits (25 MB) must be raised to at least 100 MB (StreamMaxLength, MaxFileSize, MaxScanSize), or large videos would go unscanned; the magic-byte allow-list for `appeal_file` must include these types.

### Q-155
**Contract gap for the solution-architect (blocks slice 01 part B-2c, social login).** Spec 00 describes each of S-065…S-069 as "enabled + client ID + client secret (write-only)", and spec 00 EC-10 / spec 16 AC-54 refuse "enabling a provider without keys". The contract (`adminUpdateSetting`, `SettingValue`, `SettingEntry`) models these rows as one write-only secret string ("string replaces, `null` clears", `value` always null, `isSet` only). There is no place for the on/off switch or the client ID, so EC-10 cannot be enforced or shown.
Options: (a) one `structured` value per row, e.g. `{ enabled: boolean, clientId: string|null, clientSecret: write-only string|null }`, where reads return `clientSecret` as `{ isSet }` and a missing `clientSecret` in an update keeps the stored one; (b) split each provider into three register rows (switch, client ID, secret), adding 10 new S-ids; (c) other.
Recommendation: (a). One row per provider, as the register already has it, and one audit/EV-124 event per change. Needs an ADR update (ADR-005 §8) and a contract change.
When: before B-2c is built. Nothing else in slice 01 depends on it.
**Answer (Owner, 2026-09-30): approved, option (a).** Each provider row gets `isEnabled` and `clientId` next to the write-only client secret. The solution-architect updates ADR-005 §8 and the contract.

### Q-156
**Which social providers count as "verified email" (ADR-002 §7, SEC-09)?** Google and LinkedIn (OpenID Connect) return `email_verified`. GitHub returns a `verified` flag per address (`/user/emails`). Facebook and X (Twitter) do not return a documented "verified" flag for the email they share. Under ADR-002 §7 an unverified email is treated as missing (`AUTH_SOCIAL_EMAIL_MISSING`), so Facebook and X logins would always be refused for new accounts.
Options: (a) strict: accept only Google, LinkedIn and GitHub emails (Facebook/X can only log in to an already linked account); (b) trust Facebook's and X's shared email as verified (they require a confirmed address before sharing it, but this is not a contractual guarantee); (c) drop Facebook and/or X from the new platform.
Recommendation: (a), with the security-reviewer's sign-off. Legacy usage figures per provider would help decide (c).
When: before any of S-066 / S-069 is switched ON.
**Answer (Owner, 2026-09-30): option (a), strict.** Only Google, LinkedIn and GitHub emails marked verified may create or match an account. Facebook and X never auto-link or create an account by email; they log in only to an account that already has that provider linked. Note: the contract has no "link a login provider in account settings" operation (`putMyLinkedAccounts` is the S-123 profile-URL list), and legacy had none either. So today such a link exists only for accounts migrated from legacy `users.provider_name`/`provider_id`. A link-from-settings feature would be new (spec + contract), if the Owner wants it.

## Security review 03 questions (security-reviewer, ROADMAP 3.1, 2026-09-30) — answered by Owner 2026-10-01

### Q-157
**Rate limits for SEC-35 / SEC-49** (`docs/06-qa/security/03-platform-core-recheck-2026-09-30.md`). (1) Is the global limit of 120 writes per IP per minute acceptable for mobile users who share one carrier IP (NAT)? (2) What per-IP limit applies to registration (review 02 SEC-35; the register limit is still missing)?
**Answer (Owner, 2026-10-01):** (1) **yes**, 120 writes per IP per minute is kept (`rate-limit.middleware.ts` `LIMITS.write`); per-user keying for signed-in calls (SEC-49) is still to be built. (2) **10 registrations per hour per IP** (IPv6 keyed by /64, SEC-42). Built by the backend in ROADMAP 3.17 together with the EV-02 cap.

## Custom-code isolation study (solution-architect, ROADMAP 3.14, 2026-10-01) — answered by Owner 2026-10-01

### Q-158
**How far to isolate the custom scripts (S-110) on public pages?** Study: `docs/03-architecture/adr/019-isolating-s110-custom-code.md`. Today the live site uses the custom-code slot for **Google Analytics 4** and **Microsoft Clarity** (heatmaps and session recordings). Running them in a separate, isolated frame breaks both (Clarity records an empty frame; Google Analytics counts become unreliable), so the study keeps them on the page as decided in Q-146 (c), and adds three safeguards: a full page load whenever a visitor moves from a public page to login, account, checkout or the inbox, so a script can never follow them there; the system refuses tag-manager containers (e.g. Google Tag Manager `GTM-…`) by itself, while still allowing the Google Analytics tag; and the visitor's name in the page header is hidden from session recordings.
Options: (a) accept ADR-019 as proposed; (b) (a), and in addition show the custom scripts **only to visitors who are not logged in** — this removes the remaining risk (a script acting as a logged-in user) but Google Analytics and Clarity no longer see logged-in visitors; (c) build the isolated frame now (Clarity stops working, Analytics figures become unreliable); (d) no third-party scripts at all, only the platform's own analytics (ADR-012).
Recommendation: (a). Choose (b) if analytics of logged-in visitors is not important to you.
Note (no answer needed unless you disagree): the old main layout also hard-codes the Facebook SDK and the Messenger chat bubble (`main-app.blade.php:210-230`). Meta retired that chat plugin in 2024, so it is not carried over.
When: before slice 17 (content/SEO); the page-layout split (point 2 of ADR-019) is cheapest if done soon, but does not block slice 01.
**Answer (Owner, 2026-10-01): (a) accept ADR-019 as proposed.** Custom scripts stay on public pages for all visitors; full page load at the public/private boundary, built-in tag-manager deny list, path-scoped CSP for `googletagmanager.com`, Clarity masking of the header account area. Messenger chat bubble not carried over.

## Slice 01 close-out (backend, ROADMAP 3.17d, 2026-10-01) — answered by Owner 2026-10-01

### Q-159
**Cap on the "new registration waiting for approval" email to the admin (EV-02).** When registrations need admin approval (S-053 = `admin`), every new registration emails the admin address (S-100). Registration is now limited to 10 per hour **per IP** (your answer Q-157), but someone using many IPs could still send hundreds of these emails per hour to your inbox (security review 02, SEC-35). The waiting users are always visible in the admin Users list (filter "pending"), so a capped email loses no data.
Options: (a) at most **20 EV-02 emails per hour** in total; registrations above that are not emailed, they only appear in the admin Users list; (b) like (a) with another number you choose; (c) no cap (keep every email).
Recommendation: (a).
When: before slice 01 is marked done (security condition). Nothing else waits on it.
**Answer (Owner, 2026-10-01): option (a), at most 20 per hour for now — and make it a setting in the admin panel:** (1) a switch to turn the "new registration waiting for approval" admin email on or off; (2) a whole-number field (default 20) for the hourly cap, editable whenever the switch is on. Recorded as register rows **S-131** (switch, default ON) and **S-132** (hourly cap, default 20) in spec 00 §4.15; built in ROADMAP 3.17l.

## Slice 01 close-out (orchestrator, ROADMAP 3.17i, 2026-10-01) — open

### Q-160
**Bot check in the mobile app?** On the website, registration and login can require Google reCAPTCHA (switch S-061, OFF at launch as on the live site). The app has no such check today: it is protected only by the login lock, the slow mode, the limit of 10 registrations per IP per hour and the general limits (QA 3.15 F-01). Options: (a) keep it so (throttles only) and decide again if fake accounts from the app appear; (b) add Firebase App Check (Google's check that a request comes from the genuine app; free; needs a Firebase project and the App Store / Play Store app ids) before launch; (c) add reCAPTCHA Enterprise for mobile (paid above a free quota).
Recommendation: (a) for launch, with (b) on the Phase 6 checklist if the S-061 switch is ever turned ON.
When: before S-061 is turned ON in production. Nothing in Phase 3 waits on it.

## Files F0 part 3 (backend, ROADMAP 4.1.5, 2026-10-02) — answered by Owner 2026-10-02

### Q-161
**File types and size limit for staff image uploads** (`adminCreateFileUpload`: category image, blog image, home logo). Legacy: category/sub/child category icon and image JPG/JPEG/PNG (`Admin/Categories/CreateValidator.php:44-46`); blog image JPG/JPEG/PNG/SVG/GIF (`Admin/Blog/CreateValidator.php:42`); site logos also WEBP/SVG (`Admin/Settings/GeneralValidator.php:32`); no size limit anywhere; the home logo cloud (`LogoCloud` model) had no upload screen.
Options: (a) the legacy types without SVG (ADR-009 §5, script risk), at most 5 MB like the platform's other images (S-078), fixed rules; (b) like (a) but blog images and logos keep SVG (needs an SVG sanitiser); (c) like (a) with 10 MB.
**Answer (Owner, 2026-10-02): (a).** Category image JPG/JPEG/PNG; blog image JPG/JPEG/PNG/GIF; home logo JPG/JPEG/PNG/WEBP/GIF; SVG refused; ≤ 5 MB; no new setting. Built in `apps/api/src/modules/files/purposes.ts` (4.1.5).
