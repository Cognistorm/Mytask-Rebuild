# Feature specs — build order
Maintained by: product-analyst | Last update: 2026-09-28 (P2-A1)
Source of the list: `docs/03-architecture/phase-2-plan.md` §1 (spec list) and §6 (Phase 4 slice order).

## Specs in build order
"Build step" = when the feature is built (Phase 3 = foundation, Phase 4 slices 1–16). "Wave" = the Phase 2 task that writes the spec.

| Build step | # | Feature | File | Wave | Status |
|---|---|---|---|---|---|
| Phase 3 (platform core) | 00 | Platform rules: dual role, plans and limits, settings register, money glossary, content i18n, removed features | [00-platform-rules.md](00-platform-rules.md) | P2-A1 | approved (Owner 2026-09-28) |
| Phase 3 (first slice) | 01 | Auth and accounts: register, login, legacy passwords, verification, reset, reCAPTCHA, social login, email 2FA, throttling, restrictions/appeals/IP bans | 01-auth.md | P2-A2 | not started |
| Slice 1 | 02 | Profiles and dashboards: public profile, dual-dashboard switcher, settings, availability, online status, portfolio, KYC stub | 02-profiles-and-dashboards.md | P2-A2 | not started |
| Slice 2 | 03 | Categories and search: 3-level gig categories, project categories + skills, `/search`, `/hire/{keyword}`, `/sellers` | 03-categories-and-search.md | P2-A2 | not started |
| Slice 3 | 04 | Gigs: create/edit wizard, upgrades, number of revisions, moderation, plan limit, gig page, Premium highlight | 04-gigs.md | P2-A2 | not started |
| Slice 4 | 05 | Payments and wallet: BOG card, wallet, top-up, surcharge, bank transfer (OFF), HOLD model, refunds to wallet, invoices, promo codes, Commission & Fee rules | 05-payments-wallet.md | P2-A3 | not started |
| Slice 5 | 06 | Gig orders: cart, checkout, requirements, start, deliver, revisions, complete, auto-release, cancel | 06-gig-orders.md | P2-A3 | not started |
| Slice 6 | 07 | Reviews: mutual reviews for gigs and projects, rating averages | 07-reviews.md | P2-A3 | not started |
| Slice 7 | 08 | Messaging: `/inbox` chat, attachments, offline email, order/project/refund threads, admin chat visibility | 08-messaging.md | P2-A4 | not started |
| Slice 8 | 09 | Subscriptions, points, referrals, promo codes: Premium monthly/yearly, auto-renew, renewal reminder, points ledger, admin points, referral codes | 09-subscriptions-points-referrals.md | P2-A3 | not started |
| Slice 9 | 10 | Projects: post (fixed budget), moderation, browse, project page, notify category sellers | 10-projects.md | P2-A4 | not started |
| Slice 10 | 11 | Proposals and hiring: Premium-only proposals, award, 48h acceptance, one escrow payment, delivery, completion, auto-release | 11-proposals-and-hiring.md | P2-A4 | not started |
| Slice 11 | 12 | Custom offers: full flow, admin toggle | 12-custom-offers.md | P2-A4 | not started |
| Slice 12 | 13 | Refunds, disputes, unblock requests (all order types) | 13-refunds-disputes-unblock.md | P2-A4 | not started |
| Slice 13 | 14 | Withdrawals: manual bank transfer, fee by plan, thresholds, BOG-Payout-ready | 14-withdrawals.md | P2-A3 | not started |
| Slice 14 | 15 | Notifications: every email/in-app notification mapped, push (NEW), SMS-ready, admin recipients | 15-notifications.md | P2-A5 | not started |
| Slice 15 | 16 | Admin panel: staff RBAC, moderation queues, users, Commission & Fee UI, settings register UI, translations, analytics, logs | 16-admin-panel.md | P2-A5 | not started |
| Slice 16 | 17 | Content and SEO: CMS pages, blog, sitemap, SEO meta, `/en/` prefix, `/ka/gita`, contact, newsletter | 17-content-and-seo.md | P2-A5 | not started |

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
