# Feature specs — build order
Maintained by: product-analyst | Last update: 2026-09-29 (P2-A5)
Source of the list: `docs/03-architecture/phase-2-plan.md` §1 (spec list) and §6 (Phase 4 slice order).

## Specs in build order
"Build step" = when the feature is built (Phase 3 = foundation, Phase 4 slices 1–16). "Wave" = the Phase 2 task that writes the spec.

| Build step | # | Feature | File | Wave | Status |
|---|---|---|---|---|---|
| Phase 3 (platform core) | 00 | Platform rules: dual role, plans and limits, settings register, money glossary, content i18n, removed features | [00-platform-rules.md](00-platform-rules.md) | P2-A1 | approved (Owner 2026-09-28) |
| Phase 3 (first slice) | 01 | Auth and accounts: register, login, legacy passwords, verification, reset, reCAPTCHA, social login, email 2FA, throttling, restrictions/appeals/IP bans | [01-auth.md](01-auth.md) | P2-A2 | approved (Owner 2026-09-28; accepted P-14…P-17, P-19, P-20) |
| Slice 1 | 02 | Profiles and dashboards: public profile, dual-dashboard switcher, settings, availability, online status, portfolio, KYC stub | [02-profiles-and-dashboards.md](02-profiles-and-dashboards.md) | P2-A2 | approved (Owner 2026-09-28; accepted P-18, P-21…P-25) |
| Slice 2 | 03 | Categories and search: 3-level gig categories, project categories + skills, `/search`, `/hire/{keyword}`, `/sellers`, Premium "Featured" badge and ranking | [03-categories-and-search.md](03-categories-and-search.md) | P2-A2 | approved (Owner 2026-09-28; accepted P-26…P-31) |
| Slice 3 | 04 | Gigs: create/edit wizard, upgrades, number of revisions, moderation, plan limit, gig page, favourites, reports | [04-gigs.md](04-gigs.md) | P2-A2 | approved (Owner 2026-09-28; accepted P-32…P-37) |
| Slice 4 | 05 | Payments and wallet: BOG card flow (server-confirmed), wallet, top-up, 2.5% surcharge, bank transfer (OFF), balances, transaction history, saved cards, billing, Commission & Fee rules, promo scope, staff balance/points adjustments | [05-payments-and-wallet.md](05-payments-and-wallet.md) | P2-A3 | approved (Owner 2026-09-28; accepted P-38…P-45; S-125 added to 00) |
| Slice 5 | 06 | Gig orders: cart, checkout, order details, start, deliver, revisions, complete, auto-release, cancel, delivery thread | [06-gig-orders.md](06-gig-orders.md) | P2-A3 | approved (Owner 2026-09-28; accepted P-46…P-53; P-46 corrects approved spec 04 AC-26) |
| Slice 6 | 07 | Reviews: mutual reviews for gig orders, projects (and custom offers, P-54), rating averages, moderation | [07-reviews.md](07-reviews.md) | P2-A3 | approved (Owner 2026-09-28; accepted P-54…P-56) |
| Slice 7 | 08 | Messaging: `/inbox` chat (realtime), attachments, read state, online status, favourites, search, delete/hide, offline email + push, offers in chat, staff read-only access with audit log, Terms & Privacy clause | [08-messaging.md](08-messaging.md) | P2-A4 | approved (Owner 2026-09-29; accepted P-66…P-72) |
| Slice 8 | 09 | Subscriptions, points, referrals, promo codes: Premium monthly/yearly by card (web + mobile) or points, auto-renew, renewal reminder, cancel/resume, points ledger, referral codes and benefits, admin promo codes, gift/cancel | [09-subscriptions-points-referrals.md](09-subscriptions-points-referrals.md) | P2-A3 | approved (Owner 2026-09-28; accepted P-57…P-61; S-126 added to 00) |
| Slice 9 | 10 | Projects: post (fixed budget, Latin allowed, skills), moderation with auto-approve, project page (masking, English fallback), edit, close/delete/hide, reporting, plan limit, category emails | [10-projects.md](10-projects.md) | P2-A4 | approved (Owner 2026-09-29; accepted P-73…P-79) |
| Slice 10 | 11 | Proposals and hiring: Premium-only proposals (server-side) with revisions, visibility, edit/withdraw, award/revoke, 48h acceptance, one escrow payment, delivery, revisions, completion, 72h auto-release, project thread | [11-proposals-and-hiring.md](11-proposals-and-hiring.md) | P2-A4 | approved (Owner 2026-09-29; accepted P-80…P-89) |
| Slice 11 | 12 | Custom offers: NEW flow — freelancer offers (from chat), buyer requests, 3-day expiry, pay = accept, HOLD, delivery, revisions, auto-release, cancel; toggle S-034 | [12-custom-offers.md](12-custom-offers.md) | P2-A4 | approved (Owner 2026-09-29; accepted P-90…P-97) |
| Slice 12 | 13 | Refunds, disputes, unblock requests (gig orders, projects, offers), 2-day auto-reject, staff decisions and release/refund tools, refund threads | [13-refunds-disputes-unblock.md](13-refunds-disputes-unblock.md) | P2-A4 | approved (Owner 2026-09-29; accepted P-98…P-105) |
| Slice 13 | 14 | Withdrawals: payout details, fee by plan fixed at request, minimum and period, manual payout, reject with refund, BOG-Payout-ready | [14-withdrawals.md](14-withdrawals.md) | P2-A3 | approved (Owner 2026-09-28; accepted P-62…P-65) |
| Slice 14 | 15 | Notifications: catalogue of 125 events accounting for all 141 legacy items (120 kept, 8 merged, 13 removed) + 42 NEW; email (SendGrid, recipient language, current logo), in-app centre, push (NEW), SMS-ready (OFF), admin recipients S-100, preferences, rate caps | [15-notifications.md](15-notifications.md) | P2-A5 | approved 2026-09-29 (P-106…P-113 accepted) |
| Slice 15 | 16 | Admin panel (admin.mytask.ge): staff accounts, RBAC with 4 default roles, audit log, moderation queues, users, money screens, Commission & Fee UI, settings register UI, plans/promo, catalog, translations, conversations, analytics, logs/health, maintenance, custom code (S-127) | [16-admin-panel.md](16-admin-panel.md) | P2-A5 | approved 2026-09-29 (P-114…P-126 accepted; AC-8 on P-115 default until Q-097) |
| Slice 16 | 17 | Content and SEO: CMS pages, Terms & Privacy clause, blog + comments, contact, newsletter, home content, `/gita`, meta/OG/JSON-LD, hreflang/canonical/noindex, sitemap index, robots, 301s | [17-content-and-seo.md](17-content-and-seo.md) | P2-A5 | approved 2026-09-29 (P-127…P-134 accepted) |

Pending after approval (2026-09-29, parity gaps G-1…G-3 from `docs/06-qa/plans/00-parity-master.md` §10): **P-135** (spec 05 AC-44…AC-47 nightly reconciliation; S-128 in 00; references in 15 EV-32/EV-125 and 16 AC-44), **P-136** (00 R-5.3a Georgian-field character set; 04 AC-5, 10 AC-3/AC-4), **P-137** (04 AC-32 "You may also like" rule) are PROPOSED for Owner sign-off at the Phase 2 gate, with open questions Q-109 and Q-110. The approved status of the specs is unchanged.

Notes on order:
- 00 is the base for every spec and for the platform core built in Phase 3 (settings register, Commission & Fee config, staff RBAC skeleton, notification infrastructure, ledger core).
- 05 comes before 06 because every escrow flow needs the ledger and BOG.
- 09 comes before 10/11 because proposals need the Premium gate (Q-020).
- Each slice builds its own notifications and admin screens. 15 and 16 only complete what is left.

## Naming
- One file per feature: `NN-feature-name.md`, where `NN` is the two-digit number above and `feature-name` is lower-case kebab-case in English.
- Numbers are fixed once assigned. A new feature gets the next free number (18, 19, …) and is inserted into the build-order table at the right step; existing numbers are never re-used or renumbered.
- Rule IDs inside specs: acceptance criteria `AC-n`, edge cases `EC-n`, and references to legacy rules `BR-xxx`, risks `R-xxx`, Owner questions `Q-xxx`. Settings are referenced by their register ID and key from 00 (e.g. `S-026 escrow.auto_release.hours`).

## Template and tags
Every spec follows the product-analyst template: Goal, Roles, User stories, Acceptance criteria (Given/When/Then, testable), Business rules, Screens (web + mobile, with loading/empty/error/success), Notifications, Texts, Edge cases, Out of scope, Open questions.
- Legacy behaviour is the default. **CHANGE** marks a difference from legacy and cites the Owner's Q-ID.
- **NEW** marks a new requirement and cites its Q-ID (or the vision).
- **PROPOSED** marks an analyst recommendation the Owner has not decided yet.
- Texts: every user-facing string has an i18n key; new strings have the English value first and the Georgian value filled alongside (Q-058). Legacy keys and their English values are reused where they exist (Q-031).

## Statuses and approval
| Status | Meaning | Who sets it |
|---|---|---|
| not started | No file yet | – |
| draft | Being written | product-analyst |
| blocked | Missing information; the question is in `docs/01-discovery/open-questions.md` and the spec says which items wait | product-analyst |
| ready for Owner | Complete, every AC testable, every Owner decision cited; any PROPOSED items listed for decision | product-analyst |
| approved | The Owner has accepted the spec (including decisions on its PROPOSED items) | **Owner only** |

Approval steps:
1. The product-analyst sets `ready for Owner` in the spec header and in this table.
2. The Owner reviews, answers the open questions / PROPOSED items in `open-questions.md` or as comments, and writes `Status: approved` (with the date) in the spec header.
3. The product-analyst updates this table and applies any Owner corrections.
4. After approval, changes to a spec need the Owner again. If the API contract or data model is already written, the architect updates them in the same step (plan §3).
No agent approves its own spec (CLAUDE.md golden rule 5). The QA parity master (P2-A6) checks that every legacy rule and notification maps to a spec AC or a removal decision.
