# 00 — QA parity master plan
Status: **ready for Owner** (Phase 2 gate item 3)
Author: qa-engineer (P2-A6) | Date: 2026-09-29
Inputs: `docs/01-discovery/features.md` (BR-001…BR-122 + unnumbered sections L, M, N), `notifications.md` (61 email classes, 7 direct mailables, 55 in-app keys), `risks-and-debt.md` (R-001…R-044), specs `docs/02-specs/00…17` (all **approved**, 703 ACs), spec 00 §6 (removed features X-01…X-20), spec 15 "Accounting of the legacy inventory", `open-questions.md` (Owner decisions), ADR-001 (test tooling), `data-model.md` §6 (money invariants), `url-map.md`.

## 1. What this plan is for
The Owner wants the new platform to behave like the old one, except where a change was decided. This plan is the single list QA uses to prove that, slice by slice:
- every legacy business rule (BR) and every legacy notification is **kept**, **changed** (by an Owner decision) or **removed** (by an Owner decision), and points to the spec ACs that test it;
- every AC in the specs is testable;
- legacy defects that are fixed on purpose are listed, so QA never reports "the old site did X" as a failure when X was a bug.

How it was checked: the BR→AC and notification→AC links were cross-checked by script against the spec files (every cited AC exists; every legacy inventory row is present in spec 15). Judgements (kept/changed/removed, testability) were made by hand from the spec text. Legacy code was not re-read; the specs' legacy citations are relied on.

## 2. Result (gate criterion 3)
| Check | Result |
|---|---|
| Legacy business rules BR-001…BR-122 (69 numbered rules) | 69 / 69 mapped: **22 kept, 42 changed, 5 removed**. 0 unmapped |
| Unnumbered legacy areas (features.md L, M, N) | 3 / 3 mapped (§5) |
| Removed features X-01…X-20 | 20 / 20 carry an Owner decision (Q-ID or accepted P-ID) and get an absence test (§6) |
| Legacy notifications (141 items) | 141 / 141 mapped: **120 kept, 8 merged, 13 removed**. Every kept/merged item points to an event (EV) whose owning AC exists; every removed item has an Owner decision (§7) |
| NEW notification events | 42, all with an owning AC except **EV-32** (gap G-1) |
| Spec ACs judged for testability | 703 / 703 judged: **699 testable as written**, 3 need a definition first (gaps G-2, G-3), 1 depends on an open Owner answer with a testable default (G-4) |
| Legacy defects not to reproduce | 34 risks R-001…R-044 each point to the spec/ADR that replaces the behaviour (§8); the security verdict is P2-B5's job |

**Verdict:** no legacy rule or notification is unmapped. Four small gaps (§10) go back to the product-analyst; none blocks the Phase 2 gate, but G-1…G-3 must be closed before their slice starts (Slice 4, Slice 3 and Slice 3/9).

Removals and changes decided through an Owner-accepted proposal (P-ID) count as Owner decisions: every P-ID cited here was accepted by the Owner (P-1…P-134, last batch 2026-09-29).

## 3. How parity is tested in every slice
### 3.1 What "the old behaviour" is
In this order of authority:
1. The spec AC and its legacy citation (`legacy/...:line`) — tagged **LEGACY** in the AC.
2. `docs/01-discovery/features.md` / `notifications.md` / `routes-and-pages.md`.
3. The live site https://mytask.ge — **read-only observation of public pages only** (layout, texts, URLs, redirects). QA never registers, pays, posts or messages on production. Flows behind login or money are verified from the legacy code citations, not from production.
4. The legacy `staging` branch/site (0.01 GEL payments) may be used to watch a flow only with the Owner's permission, and never as a source of rules (Owner branch note).

If 1 and 3 disagree, QA does not decide: the item goes into `open-questions.md` and the check stops (CLAUDE.md rule 6).

### 3.2 One test type per AC tag
| AC tag | Test type | What passes |
|---|---|---|
| **LEGACY** | Parity test | The new platform does what the cited legacy code / live page does (same fields, limits, texts, states, recipients) |
| **CHANGE** (Q-ID / P-ID) | Deviation test | The new behaviour as specified **and** the old behaviour is gone (e.g. Latin letters now accepted in Georgian titles; the old "Georgian only" error is never shown) |
| **NEW** | Spec test | The AC as written; no parity check |
| Removed (spec 00 X-xx) | Absence test | No UI entry point, no API endpoint, legacy URL answers as `url-map.md` says (301/404/410), no notification is sent (§6) |
| Untagged (spec 00 cross-cutting ACs and a few structural ACs) | Spec test | The AC as written |

AC tag counts (an AC can carry more than one tag; "untagged" = none of LEGACY/CHANGE/NEW):

| Spec | ACs | LEGACY | CHANGE | NEW | untagged |
|---|---|---|---|---|---|
| 00 Platform rules | 26 | 0 | 0 | 0 | 26 |
| 01 Auth | 52 | 31 | 4 | 3 | 17 |
| 02 Profiles and dashboards | 41 | 29 | 7 | 2 | 9 |
| 03 Categories and search | 37 | 25 | 6 | 5 | 6 |
| 04 Gigs | 39 | 29 | 6 | 5 | 5 |
| 05 Payments and wallet | 43 | 18 | 14 | 12 | 8 |
| 06 Gig orders | 45 | 24 | 14 | 7 | 10 |
| 07 Reviews | 21 | 12 | 6 | 8 | 4 |
| 08 Messaging | 34 | 23 | 9 | 6 | 2 |
| 09 Subscriptions, points, referrals | 37 | 19 | 7 | 14 | 5 |
| 10 Projects | 29 | 21 | 11 | 8 | 4 |
| 11 Proposals and hiring | 45 | 25 | 22 | 13 | 3 |
| 12 Custom offers | 36 | 12 | 10 | 15 | 6 |
| 13 Refunds, disputes, unblock | 34 | 23 | 12 | 11 | 7 |
| 14 Withdrawals | 20 | 8 | 4 | 6 | 7 |
| 15 Notifications | 39 | 5 | 11 | 24 | 4 |
| 16 Admin panel | 78 | 31 | 18 | 38 | 10 |
| 17 Content and SEO | 47 | 26 | 16 | 14 | 6 |
| **Total** | **703** | | | | |

### 3.3 Test levels (tools from ADR-001)
| Level | Tool | Used for |
|---|---|---|
| API integration | Supertest + real Postgres/Redis in Docker | Every AC that changes data, every permission/ownership rule (IDOR: the same call as another user must fail), every validation limit |
| Web end-to-end | Playwright | The main flow of every screen (CLAUDE.md), both languages (`/` and `/en/`), 360 px and desktop widths |
| Mobile end-to-end | Maestro or Detox (ADR-001) | The same main flows on iOS and Android, same i18n keys |
| Jobs and timers | API tests with a controlled clock | Auto-release (06 AC-33…39), award expiry (11 AC-22), refund auto-reject (13 AC-6…9), offer expiry (12 AC-18…20), renewal and reminder (09 AC-10…15), sitemap (17 AC-43) |
| Notifications | Mailpit (local email) + notification table + push mock | Catalogue test of ADR-007 §8: each EV row sends exactly its channels to exactly its recipients, in the recipient's language |
| Payments | `bog-mock` (architecture §local) | Success, failure, abandoned, duplicate callback, tampered return URL, amount mismatch |
| Migration | Dry run on a copy (Phase 5) | Spec migration ACs (07 AC-21, 08 AC-33…34, 10 AC-29, 11 AC-45, 12 AC-36, 13 AC-34, 16 AC-8) |

### 3.4 Checks run in every money test
After every test that moves money, QA asserts the 17 money invariants of `data-model.md` §6 (every journal sums to zero, no silent negative balance, one release or one refund per escrow, amounts in integer tetri). A money test that passes its AC but breaks an invariant fails.

### 3.5 Cross-cutting checks in every slice
- **Texts:** every user-facing string is a translation key; the English legacy value is kept where one exists (Q-058); both `ka` and `en` are filled for new keys.
- **Settings:** each setting S-xxx used by the slice is changed once in the test and the behaviour follows it (no hard-coded values, spec 00 §4).
- **URLs:** every legacy URL of the slice answers as `url-map.md` says (200 / 301 / 404 / 410).
- **Design:** screens use `packages/ui` and tokens only; the layout matches `docs/05-design/screens/` for the eight key screens.

### 3.6 Per-slice parity report
Each slice produces `docs/06-qa/reports/NN-<feature>-parity-YYYY-MM-DD.md`:
```
# NN — <feature> parity report
Verdict: PASS | FAIL
## Rows covered (from 00-parity-master.md): BR-…, E-…/I-…/M-…, X-…
## Results per AC: AC | test type | level | result | evidence (test file / screenshot)
## Deviations found (not approved) → bug or open question
## Approved deviations confirmed (CHANGE Q-/P-IDs)
## Legacy defects confirmed not reproduced (R-…)
```
A slice passes only when every row of this master that belongs to it is green.

### 3.7 Slice → rows of this plan
| Slice (specs/README order) | Spec | BR rows | Notification rows (spec 15 section) | Removed-feature checks |
|---|---|---|---|---|
| Phase 3 core | 00 | BR-010, BR-021, BR-110 (plan table) | admin recipients S-100 | X-17, X-18, X-19, X-20 |
| Phase 3 first slice | 01 | BR-001…BR-008 | A (EV-01…EV-12 part) | — |
| Slice 1 | 02 | BR-010…BR-015 | A (profiles, verification, portfolio) | X-05, X-06 |
| Slice 2 | 03 | BR-023, L (search, categories) | — | X-09 (no IP lookup on visits) |
| Slice 3 | 04 | BR-020…BR-024 | B | X-13 |
| Slice 4 | 05 | BR-031…BR-035, BR-100 | C | X-07, X-10 |
| Slice 5 | 06 | BR-030, BR-036…BR-041 | D | X-16 |
| Slice 6 | 07 | BR-042 | E (reviews) | X-05 |
| Slice 7 | 08 | BR-012, BR-120…BR-122 | E (messaging) | X-11 |
| Slice 8 | 09 | BR-110…BR-115 | F | — |
| Slice 9 | 10 | BR-015, BR-050…BR-054 | G | X-02, X-03, X-14 |
| Slice 10 | 11 | BR-055…BR-060, BR-070…BR-075 | H | X-01, X-04 |
| Slice 11 | 12 | BR-013, BR-090, BR-091 | I | — |
| Slice 12 | 13 | BR-080…BR-086 | J | — |
| Slice 13 | 14 | BR-101 | K | X-07 (PayPal payouts) |
| Slice 14 | 15 | all notification rows (catalogue test) | all | — |
| Slice 15 | 16 | M, N | M | X-17, X-19, X-20 |
| Slice 16 | 17 | L (CMS, blog, SEO) | L | X-15 |

## 4. Legacy business rules → specs
"Outcome": **KEPT** = same rule; **CHANGED** = the rule exists with an Owner-decided change (the decision column says what); **REMOVED** = not built, by Owner decision. "AC tags" = tags found on the cited ACs (L = LEGACY, C = CHANGE, N = NEW) — a sanity check that changed rules are tested as changes.

| BR | Legacy rule (short) | Outcome | Spec ACs (tests) | Decision / reason | AC tags |
|---|---|---|---|---|---|
| BR-001 | Register fields: fullname (3-60), username (3-60, ^[a-zA-Z0-9_]+$, not numeric, unique), email … | **KEPT** | 01 AC-1…6 | Q-013 (no account type) | CL |
| BR-002 | New user: status pending if settings_auth.verification_required else active; level_id = 1 hard-… | **CHANGED** | 01 AC-1, AC-3 | Q-013, Q-014 (no account type, no level) | L |
| BR-003 | Verification: type email ⇒ token (uid 64) valid verification_expiry_period minutes, email Verif… | **KEPT** | 01 AC-4, AC-5, AC-7…9 | S-053, S-054 | CL |
| BR-004 | Login by email+password (+reCAPTCHA, remember me); only status active\|verified may stay logged … | **CHANGED** | 01 AC-10…19, AC-51 | Q-057; login throttling added (R-043) | LN |
| BR-005 | Passwords bcrypt, 10 rounds | **KEPT** | 01 AC-12 | ADR-002 (verify and rehash) | – |
| BR-006 | Social login (Google/Facebook/GitHub/LinkedIn/Twitter): creates/links user by email+provider_id… | **CHANGED** | 01 AC-37…41 | Q-032; banned/pending check added (R-020) | CLN |
| BR-007 | Password reset by email token, expiry password_reset_expiry_period. | **KEPT** | 01 AC-32…36 | S-055 | L |
| BR-008 | Restricted users | **KEPT** | 01 AC-19, AC-46…52 | Q-057 | CL |
| BR-010 | Two dashboards: client /account/* (layout buyer-app) and freelancer /seller/* (layout seller-ap… | **CHANGED** | 00 AC-4; 02 AC-1…7 | Q-013 (explicit Buying/Selling switcher) | LN |
| BR-011 | start_selling switches buyer→seller, sets first seller level, sends YouBecameSeller | **REMOVED** | 02 AC-1…7 (replacement) | Q-013, X-06 | LN |
| BR-012 | Online = cache key for 10 min after any request | **KEPT** | 02 AC-8; 08 AC-14…18 | — | CL |
| BR-013 | Availability: seller can set "unavailable until"; cron removes it after the date | **KEPT** | 02 AC-22, AC-23; 12 AC-4 | — | CL |
| BR-014 | Levels: 3 conflicting implementations — correct in helper check_user_level | **REMOVED** | — | Q-014, X-05 | – |
| BR-015 | Client username on project pages is masked (first/last quarter visible) unless viewer has Premi… | **KEPT** | 02 AC-41; 10 AC-17 | — | LN |
| BR-020 | Gig create wizard (overview, pricing, requirements, gallery). Title/description: ka required (G… | **CHANGED** | 04 AC-4…15 | Q-022, X-13, P-37 | CLN |
| BR-021 | Free users may have at most 1 non-deleted gig; the 2nd requires an active subscription (redirec… | **CHANGED** | 00 AC-5; 04 AC-1…3 | Q-021 (limits admin-editable) | L |
| BR-022 | New gig status active if auto_approve_gigs else pending (admin approves → GigPublished; reject … | **KEPT** | 04 AC-16…19 | S-070 | CL |
| BR-023 | Premium users' gig cards get a yellow border | **CHANGED** | 03 AC-13…18 | Q-069 (Premium boost + badge) | LN |
| BR-024 | Gig slug = slug(title.ka) + '-' + uid (SEO URL). | **KEPT** | 04 AC-33; 17 AC-1…5 | P-33 | CLN |
| BR-030 | [M] Cart in session; own gigs removed from cart | **KEPT** | 06 AC-1…6 | — | CL |
| BR-031 | [M] Subtotal = Σ(gig price × qty + checked upgrades × qty). Tax: if enable_taxes, percentage of… | **CHANGED** | 05 AC-5…8; 06 AC-7 | Q-007, X-10 (no tax); P-46 (quantity 1) | CLN |
| BR-032 | [M] BOG adds a hard-coded 2.5% of subtotal on top of the configured gateway fee | **CHANGED** | 05 AC-5…8 | Q-070 (one configurable card fee S-012) | CLN |
| BR-033 | [M] Commission per item only when commission_from === 'orders': percentage of item_total or fix… | **CHANGED** | 05 AC-37…40 | Q-002, Q-006 (no commission; Commission & Fee module) | N |
| BR-034 | [M] Wallet payment: requires balance_available ≥ total; buyer available −= total, purchases += … | **CHANGED** | 05 AC-18…20; 06 AC-8 | Q-008 (HOLD model) | CL |
| BR-035 | [M] BOG payment: order_id b_+uid32; creates Order+Items+Invoice(pending) BEFORE payment; admin … | **CHANGED** | 05 AC-9…17; 06 AC-7…12 | Q-087, ADR-004 (server-verified; fixes R-004, R-016) | CLN |
| BR-036 | Buyer must send "order details" (requirements text) before the seller can start; only when item… | **KEPT** | 06 AC-13…15 | — | LN |
| BR-037 | Seller "start" → status proceeded, expected_delivery_date = now + gig.delivery_time + Σ upgrade… | **KEPT** | 06 AC-16, AC-17 | — | CL |
| BR-038 | [M] Cancel while pending: by seller (only if invoice paid) or buyer (no invoice check). Seller … | **CHANGED** | 06 AC-18…21 | fixes R-005, R-014 | CL |
| BR-039 | Delivery: seller uploads work (+message) when proceeded/delivered → status delivered, delivered… | **CHANGED** | 06 AC-22…29 | Q-045, Q-056, X-16 (number of revisions) | CLN |
| BR-040 | [M] Completion: buyer clicks complete on delivered item → is_finished; seller pending −= profit… | **CHANGED** | 00 AC-14; 06 AC-30…39 | Q-051, Q-067, Q-084 (72h auto-release) | CLN |
| BR-041 | Buyer can delete an unpaid (invoice pending) order; code also subtracts seller pending | **CHANGED** | 06 AC-11, AC-12 | fixes R-014 | CL |
| BR-042 | Reviews: only for finished delivered gig items, rating 1-5, message ≤800, one per item; recalcu… | **CHANGED** | 07 AC-1…14 | Q-046, Q-062 (mutual; gigs and projects) | CLN |
| BR-050 | Projects feature toggle projects_settings.is_enabled; who_can_post buyer\|seller\|both. | **CHANGED** | 10 AC-1 | Q-013 (who_can_post dropped; S-075 kept) | CL |
| BR-051 | Post: ka title (3-100, Georgian+digits+-_.,!?()), ka description (≥10) required; en optional (L… | **CHANGED** | 10 AC-2…10 | Q-022, Q-035, X-02, P-73 | CLN |
| BR-052 | Status on create: pending_payment if promotion plans selected, else active if auto_approve_proj… | **CHANGED** | 10 AC-8, AC-11…14 | Q-028, X-03 (no paid promotions); S-072 | CLN |
| BR-053 | On create, all active gig-owners in the gig category with the same slug as the project category… | **CHANGED** | 10 AC-19, AC-20 | P-76 | CL |
| BR-054 | English locale shows 404 for projects without en translation | **CHANGED** | 10 AC-15…18 | Q-023, X-14 | CL |
| BR-055 | Proposal: only account_type seller; project must be active, not yet awarded; not own project; o… | **CHANGED** | 11 AC-1…8 | Q-020 (Premium checked server-side), Q-056 | CLN |
| BR-056 | Proposal status: pending_payment if premium bidding upgrades chosen (sponsored/sealed/highlight… | **CHANGED** | 11 AC-9 | Q-028, X-04 (no bid upgrades); S-073 | LN |
| BR-057 | Viewing the bids list requires Premium (or owner/admin) | **CHANGED** | 11 AC-10, AC-11 | Q-020, Q-069, X-04 (no sealed bids) | LN |
| BR-058 | Award: owner accepts a bid (project active, bid active) → un-awards any other awarded bid, sets… | **KEPT** | 11 AC-16…19 | P-84 | CLN |
| BR-059 | Freelancer accept/reject award: accept → project under_development, bid accepted, creates miles… | **CHANGED** | 11 AC-20…24 | Q-034, Q-050 (contract, no milestone) | CLN |
| BR-060 | Award expiry: awarded-but-not-accepted bids are un-awarded after **24h** (daily cron; descripti… | **CHANGED** | 11 AC-20…23 | Q-005 (48h, S-027) | CLN |
| BR-070 | Client pays the awarded amount via /checkout/{projectUid}/project or /account/projects/payments… | **CHANGED** | 11 AC-26…31 | Q-006, Q-008, Q-034, Q-050 (one escrow payment) | CL |
| BR-071 | On funding: milestone funded; freelancer pending += (amount − freelancer_commission); project u… | **CHANGED** | 11 AC-26…31 | Q-008; fixes R-012 | CL |
| BR-072 | Delivery allowed only when project pending_final_review\|completed; stores project_work_deliveri… | **KEPT** | 11 AC-32…35 | — | CLN |
| BR-073 | Release: client releases funded milestone → paid; freelancer available += amount − freelancer_c… | **CHANGED** | 11 AC-36…39 | Q-051, P-87 | CL |
| BR-074 | Freelancer can "request" milestones; client can reject milestone requests (RejectMilestone). | **REMOVED** | — | Q-034, Q-036, Q-050, X-01 | – |
| BR-075 | Commission values stored on the milestone at freelancer-accept are swapped and not %-converted | **REMOVED** | 05 AC-37…40 (fee snapshot replaces it) | Q-006; defect R-013 | N |
| BR-080 | Gig refund request: buyer, item not finished, status pending\|proceeded\|delivered, and (delivere… | **KEPT** | 06 AC-20; 13 AC-1…5 | P-98, P-99 | CLN |
| BR-081 | Seller accepts → item refunded+finished, buyer available += item total_value, seller pending −=… | **KEPT** | 13 AC-6…9 | — | CLN |
| BR-082 | Pending refunds with no seller response for 2 days are auto-set rejected_by_seller (hourly) — g… | **KEPT** | 00 AC-21; 13 AC-6…9 | S-030 | CLN |
| BR-083 | Buyer can close a pending refund, or raise dispute after seller rejection (request_admin_interv… | **CHANGED** | 13 AC-10…14 | Q-071 | CL |
| BR-084 | Admin resolves dispute: accept → refunded to buyer wallet; decline → rejected_by_admin, seller … | **CHANGED** | 13 AC-15…20 | Q-037, P-102 | CLN |
| BR-085 | Project refund: client can request when a milestone is funded/paid and (work delivered & pendin… | **CHANGED** | 13 AC-1…4 | P-98, P-99; fixes R-012 | LN |
| BR-086 | Unblock money request (freelancer asks admin to release escrow): order item delivered & unfinis… | **CHANGED** | 06 AC-45; 13 AC-23…28 | P-5, P-103 (only while auto-release is OFF) | CLN |
| BR-090 | Client sends offer from a freelancer profile (freelancer must be seller and available): budget,… | **CHANGED** | 12 AC-1…11 | Q-060 (freelancer-initiated, 3-day expiry, approval OFF) | CLN |
| BR-091 | Freelancer accept/reject; client funds (wallet or BOG) budget+buyer_fee; freelancer uploads wor… | **CHANGED** | 12 AC-12…30 | Q-060, P-90…P-94 | CLN |
| BR-100 | Deposit (fill balance) via BOG within gateway min/max; on success balance_available += amount | **KEPT** | 05 AC-21…23 | Q-030 | CLN |
| BR-101 | Withdrawal: requires payout settings (offline bank text; PayPal disabled config/payouts.php); a… | **CHANGED** | 14 AC-1…16 | Q-004 (Premium 0%), Q-029 | CLN |
| BR-110 | Plans: Standard (free: 1 listing, chat) / Premium 9.99 GEL/month or 99.99/year (unlimited listi… | **KEPT** | 09 AC-1, AC-2 | Q-021 | CL |
| BR-111 | Subscribe: BOG payment + saveSubscription (card saved for recurring); on success subscription c… | **CHANGED** | 05 AC-3; 09 AC-3…7, AC-10…13 | Q-081 (mobile); fixes R-041 | CLN |
| BR-112 | Auto-renew every minute for ended, not-canceled subscriptions: charge saved card via BOG "subsc… | **CHANGED** | 09 AC-10…15 | Q-019, Q-066 (reminder 3 days before) | CLN |
| BR-113 | Premium check = subscription not canceled and ends_at > now, cached 60 s | **KEPT** | 03 AC-17; 09 AC-4 | — | CLN |
| BR-114 | Points: 100 points = 1 month Premium (UI, app/Livewire/Main/Subscription/SubscriptionComponent.… | **CHANGED** | 05 AC-3; 09 AC-8, AC-9 | Q-052; fixes R-006 | CL |
| BR-115 | Referral: signup with a user's referral code creates pending referral; on verification (or imme… | **CHANGED** | 01 AC-6; 09 AC-22…33 | Q-018, Q-053, Q-064 | CLN |
| BR-120 | Active chat = Chatify at /inbox (Pusher realtime, attachments per live_chat_settings). Offline/… | **CHANGED** | 08 AC-1…24; 15 AC-33 | Q-015, Q-069b, P-68; ADR-007 | CLN |
| BR-121 | Legacy conversations | **REMOVED** | 08 AC-33, AC-34 (redirect, not migrated) | Q-040, Q-065, X-11 | – |
| BR-122 | Order/project delivery threads have their own message tables (order_item_work_conversation, pro… | **KEPT** | 06 AC-40, AC-41; 08 AC-28; 11 AC-40; 13 AC-21, AC-22 | Q-065 | CLN |

## 5. Unnumbered legacy areas
| Area (features.md) | Outcome | Spec ACs | Decision |
|---|---|---|---|
| L. Search, categories, SEO, content — 3-level gig categories, project categories + skills, `/search`, `/hire/{keyword}`, `/sellers`, CMS pages, blog, sitemap, per-page SEO, newsletter double opt-in | **KEPT** (blog re-enabled, sitemap fixed, `/en/` URLs) | 03 AC-1…37; 17 AC-1…47 | Q-023, Q-024, Q-025 (blog kept), Q-103; fixes R-042 |
| M. Admin — `/dashboard` moderation, money, users, catalog, settings, languages, system, analytics; Filament `/console` | **CHANGED** — one admin app at admin.mytask.ge with staff RBAC; direct balance editing replaced by ledger adjustments; translation editor writes overrides, not files | 16 AC-1…78; 05 AC-41…43 | vision (RBAC), X-17, X-19, Q-054, P-114…P-126 |
| N. Analytics — tracker every 15 min per browser, IP geolocation via findip.net / ip-api.com | **CHANGED** — first-party analytics, no third-party IP lookup, daily aggregates migrated only | 16 AC-66, AC-67; 04 AC-39; 10 AC-21 | Q-055, Q-101, X-09, ADR-012; fixes R-040 |

## 6. Removed features — absence tests
Each removal has an Owner decision (spec 00 §6). The absence test is run in the slice listed in §3.7.

| # | Removed | Decision | Absence test |
|---|---|---|---|
| X-01 | Multi-milestone projects, milestone requests, "reject milestone", milestone screens and emails | Q-034, Q-036, Q-050 | No milestone UI or endpoint; `/account/projects/milestones/*`, `/seller/projects/milestones/*` answer per url-map; E-33, E-66, I-33, I-34 never sent |
| X-02 | Hourly projects | Q-035 | Post form has no budget type; API refuses a budget type field |
| X-03 | Paid project promotions | Q-028 | No promotion block; `/account/projects/checkout/{id}` per url-map; no `pending_payment` project status |
| X-04 | Paid bid upgrades; sealed bids | Q-028 | No upgrade choice on proposals; every proposal amount visible to those allowed by 11 AC-10 |
| X-05 | Levels and badges | Q-014 | No level on profile, cards or API; no level job |
| X-06 | "Become a seller", account type | Q-013 | `/start_selling` per url-map; every user can sell; E-78, I-52 never sent |
| X-07 | 28 foreign gateways, `/callback/*`, PayPal payouts | Q-016 | Only BOG, Wallet (and bank transfer when S-021 ON); `/callback/*` per url-map; E-27 never sent |
| X-08 | Binance trading bot | Q-041 | No code, no keys, no job |
| X-09 | findip.net / ip-api.com | Q-055 | No outbound call to either host (network assertion in analytics tests) |
| X-10 | 2% tax | Q-007 | No tax line in any quote or receipt |
| X-11 | Legacy `conversations` chat | Q-065, Q-040 | `/messages/*` per url-map; I-53 never sent; not migrated |
| X-12 | Orphan tables | Q-040 | Not in the new schema (checked at migration) |
| X-13 | Georgian-only validation | Q-022 | Latin + Georgian title accepted (04 AC-5, 10 AC-3) |
| X-14 | 404 for English pages without English text | Q-023 | `/en/...` shows Georgian text with the notice, HTTP 200 (04 AC-27, 10 AC-16) |
| X-15 | `?locale=` / session language | Q-024 | `?locale=` URLs 301 to the `/en/` or unprefixed URL (17 AC-2) |
| X-16 | Unlimited resubmits / revisions | Q-045, Q-056 | Revision request refused when the number of revisions is used up (06 AC-25…29) |
| X-17 | Two admin panels | vision, spec 16 | Only admin.mytask.ge; `/dashboard`, `/console` per url-map |
| X-18 | Single "first admin" inbox | Q-026 | Admin emails go to every S-100 address |
| X-19 | Direct balance editing | P-12 | No balance field in admin; only ledger adjustments with reason (05 AC-41…43) |
| X-20 | `/update`, `/tasks/*`, `/te`, installer, licensing, web log viewer | vision, Q-054 | Each path answers 404/410 per url-map; no file outside the public folder is reachable (ADR-013) |

## 7. Legacy notifications → events → specs
Source: spec 15 "Accounting of the legacy inventory" (IDs E-xx email classes, M-x direct mailables, I-xx in-app keys), re-checked here in both directions: every row of `notifications.md` appears in the accounting, every accounted event exists in the catalogue, and every owning AC cited by those events exists in its spec.

| Group | Legacy items | Kept | Merged | Removed |
|---|---|---|---|---|
| Email classes | 79 | 72 | 0 | 7 |
| Direct mailables | 7 | 6 | 1 | 0 |
| In-app text keys | 55 | 42 | 7 | 6 |
| **Total** | **141** | **120** | **8** | **13** |

"Merged" = two legacy texts for the same event (for example the BOG-path and wallet-path "new order" texts) become one event with one text; the recipient still gets the notification. Merges are part of approved spec 15 (Owner 2026-09-29).

**NEW events (42)** are not parity items; they are tested as NEW ACs. All have an owning AC except EV-32 (gap G-1). NEW channels on kept events (push on every in-app event, P-11; extra in-app/email channels listed in spec 15 "Counts") are tested in the catalogue test of Slice 14.

| Legacy item | Name | Status | New event | Owning spec AC(s) | Decision |
|---|---|---|---|---|---|
| E-01 | Admin/BidPendingApproval | kept | EV-62 | 11 AC-6, AC-12 | — |
| E-02 | Admin/BidReported | kept | EV-65 | 11 AC-15 | — |
| E-03 | Admin/NewCustomOfferPending | kept | EV-81 | 12 AC-11 | — |
| E-04 | Admin/NewIdVerificationPending | kept | EV-16 | 02 AC-36 | — |
| E-05 | Admin/NewPayment | kept | EV-35 | 06 AC-10 | — |
| E-06 | Admin/NewRefundMessage | kept | EV-101 | 13 AC-22 | — |
| E-07 | Admin/NewRestrictionAppeal | kept | EV-08 | 01 AC-47 | — |
| E-08 | Admin/PendingArticleComment | kept | EV-115 | 17 AC-19 | — |
| E-09 | Admin/PendingGig | kept | EV-19 | 04 AC-16, AC-22 | — |
| E-10 | Admin/PendingMessage | kept | EV-116 | 17 AC-24 | — |
| E-11 | Admin/PendingOfflinePayment | kept | EV-24 | 05 AC-24 | — |
| E-12 | Admin/PendingPortfolio | kept | EV-14 | 02 AC-25 | — |
| E-13 | Admin/PendingUser | kept | EV-02 | 01 AC-5 | — |
| E-14 | Admin/PendingWithdrawal | kept | EV-110 | 14 AC-7 | — |
| E-15 | Admin/ProfileReported | kept | EV-13 | 02 AC-14 | — |
| E-16 | Admin/ProjectReported | kept | EV-60 | 10 AC-22 | — |
| E-17 | Admin/RefundDispute | kept | EV-98 | 13 AC-12 | — |
| E-18 | Admin/SiteIsDown | kept | EV-122 | 15 AC-37; 16 AC-70 | — |
| E-19 | User/Buyer/NewRefundMessage | kept | EV-100 | 13 AC-22 | — |
| E-20 | User/Buyer/OrderDelivered | kept | EV-40 | 06 AC-22 | — |
| E-21 | User/Buyer/OrderItemCanceled | kept | EV-38 | 06 AC-19 | — |
| E-22 | User/Buyer/OrderItemCompleted | kept | EV-43 | 06 AC-30 | — |
| E-23 | User/Buyer/OrderItemInProgress | kept | EV-37 | 06 AC-17 | — |
| E-24 | User/Buyer/OrderPlaced | kept | EV-34 | 06 AC-10 | — |
| E-25 | User/Buyer/RefundAccepted | kept | EV-94 | 13 AC-6 | — |
| E-26 | User/Buyer/RefundDeclined | kept | EV-95 | 13 AC-7 | — |
| E-27 | User/Buyer/WebhookPaymentFailed | removed | — | — | X-07, Q-016 |
| E-28 | User/Employer/FreelancerAcceptedYourOffer | removed | — | — | P-97, Q-060 |
| E-29 | User/Employer/FreelancerRejectedYourOffer | removed | — | — | P-97 |
| E-30 | User/Employer/FreelancerCanceledYourOffer | kept | EV-92 | 12 AC-29 | — |
| E-31 | User/Employer/FreelancerAcceptedYourProject | kept | EV-69 | 11 AC-20 | — |
| E-32 | User/Employer/FreelancerRejectedYourProject | kept | EV-70 | 11 AC-21 | — |
| E-33 | User/Employer/FreelancerRequestedMilestone | removed | — | — | X-01, Q-036, Q-050 |
| E-34 | User/Employer/NewFinishedOfferFile | kept | EV-87 | 12 AC-21 | — |
| E-35 | User/Employer/ProjectCompleted | kept | EV-73 | 11 AC-32 | — |
| E-36 | User/Employer/YourOfferNeedsChanges | kept | EV-82 | 12 AC-11 | — |
| E-37 | User/Employer/YourProjectApproved | kept | EV-58 | 10 AC-12 | — |
| E-38 | User/Employer/YourProjectRejected | kept | EV-59 | 10 AC-13 | — |
| E-39 | User/Everyone/AccountActivated | kept | EV-03 | 01 AC-5 | — |
| E-40 | User/Everyone/AppealAccepted | kept | EV-09 | 01 AC-48 | — |
| E-41 | User/Everyone/AppealRejected | kept | EV-10 | 01 AC-49 | — |
| E-42 | User/Everyone/BillingInfoUpdated | kept | EV-28 | 05 AC-36 | — |
| E-43 | User/Everyone/DepositRejected | kept | EV-27 | 05 AC-26 | — |
| E-44 | User/Everyone/GigPublished | kept | EV-20 | 04 AC-17 | — |
| E-45 | User/Everyone/NewBidReceived | kept | EV-61 | 11 AC-6, AC-9 | — |
| E-46 | User/Everyone/NewMessage | kept | EV-48 | 08 AC-23 | — |
| E-47 | User/Everyone/PasswordChanged | kept | EV-05 | 01 AC-33, AC-35 | — |
| E-48 | User/Everyone/PasswordReset | kept | EV-04 | 01 AC-32 | — |
| E-49 | User/Everyone/PaymentApproved | kept | EV-112 | 14 AC-14, AC-17 | — |
| E-50 | User/Everyone/PaymentRejected | kept | EV-113 | 14 AC-15, AC-17 | — |
| E-51 | User/Everyone/SubscriptionCancelled | kept | EV-54 | 09 AC-16, AC-36 | — |
| E-52 | User/Everyone/SubscriptionConfirmation | kept | EV-50 | 09 AC-4, AC-8, AC-26, AC-30, AC-35 | — |
| E-53 | User/Everyone/SubscriptionRenewed | kept | EV-51 | 09 AC-10 | — |
| E-54 | User/Everyone/VerificationApproved | kept | EV-17 | 02 AC-37 | — |
| E-55 | User/Everyone/VerificationDeclined | kept | EV-18 | 02 AC-37 | — |
| E-56 | User/Everyone/VerifyEmail | kept | EV-01 | 01 AC-4, AC-9 | — |
| E-57 | User/Everyone/YourBidApproved | kept | EV-63 | 11 AC-9 | — |
| E-58 | User/Everyone/YourBidRejected | kept | EV-64 | 11 AC-9 | — |
| E-59 | User/Freelancer/EmployerFundedMilestone | kept | EV-72 | 11 AC-28, AC-29 | — |
| E-60 | User/Freelancer/EmployerReleasedMilestone | kept | EV-75 | 11 AC-36 | — |
| E-61 | User/Freelancer/NewOfferReceived | kept | EV-80 | 12 AC-9, AC-11 | — |
| E-62 | User/Freelancer/NewProjectInCategory | kept | EV-56 | 10 AC-19 | — |
| E-63 | User/Freelancer/OfferFunded | kept | EV-86 | 12 AC-14, AC-15 | — |
| E-64 | User/Freelancer/OfferPaymentReleased | kept | EV-90 | 12 AC-25 | — |
| E-65 | User/Freelancer/ProjectAwarded | kept | EV-66 | 11 AC-16 | — |
| E-66 | User/Freelancer/RejectMilestone | removed | — | — | X-01 |
| E-67 | User/Freelancer/YourGigNeedsChanges | kept | EV-21 | 04 AC-18 | — |
| E-68 | User/Seller/DeliveredWorkNewMessage | kept | EV-45 | 06 AC-40 | — |
| E-69 | User/Seller/NewRefundMessage | kept | EV-100 | 13 AC-22 | — |
| E-70 | User/Seller/OrderItemCanceled | kept | EV-39 | 06 AC-18 | — |
| E-71 | User/Seller/OrderItemCompleted | kept | EV-42 | 06 AC-30 | — |
| E-72 | User/Seller/PendingOrder | kept | EV-33 | 06 AC-10 | — |
| E-73 | User/Seller/PendingWithdrawal | kept | EV-111 | 14 AC-7 | — |
| E-74 | User/Seller/PortfolioPublished | kept | EV-15 | 02 AC-26 | — |
| E-75 | User/Seller/RefundClosed | kept | EV-97 | 13 AC-10 | — |
| E-76 | User/Seller/RefundRequest | kept | EV-93 | 13 AC-5 | — |
| E-77 | User/Seller/ReviewReceived | kept | EV-47 | 07 AC-9 | — |
| E-78 | User/Seller/YouBecameSeller | removed | — | — | Q-013, X-06 |
| E-79 | User/Everyone/Welcome | removed | — | — | P-113 |
| M-1 | Admin/Users/SendEmail | kept | EV-120 | 16 AC-32; 17 AC-33 | — |
| M-2 | Admin/Newsletter/SendEmail | merged | EV-120 | 16 AC-32; 17 AC-33 | merged: P-113 |
| M-3 | Admin/Settings/TrySmtp | kept | EV-121 | 15 AC-32; 16 | — |
| M-4 | Admin/Support/Reply | kept | EV-117 | 17 AC-26 | — |
| M-5 | Admin/Users/RestrictEmail | kept | EV-07 | 01 AC-46 | — |
| M-6 | User/Everyone/NewsletterVerification | kept | EV-118 | 17 AC-30 | — |
| M-7 | User/Everyone/NewsletterApproved | kept | EV-119 | 17 AC-31 | — |
| I-01 | `t_u_received_new_order_seller` | kept | EV-33 | 06 AC-10 | — |
| I-02 | `t_notification_buyer_order_placed` | merged | EV-33 | 06 AC-10 | duplicate text merged (spec 15) |
| I-03 | `t_ur_payment_has_been_received_offline` | kept | EV-25 | 05 AC-25 | — |
| I-04 | `t_seller_has_started_ur_order` | kept | EV-37 | 06 AC-17 | — |
| I-05 | `t_seller_has_delivered_ur_order` | kept | EV-40 | 06 AC-22 | — |
| I-06 | `t_seller_has_canceled_ur_order` | kept | EV-38 | 06 AC-19 | — |
| I-07 | `t_buyer_has_canceled_order` | kept | EV-39 | 06 AC-18 | — |
| I-08 | `t_buyer_sent_u_message_about_delivered_files` | kept | EV-45 | 06 AC-40 | — |
| I-09 | `t_order_id_completed` | kept | EV-42 | 06 AC-30 | — |
| I-10 | `t_u_have_received_new_rating` | kept | EV-47 | 07 AC-9 | — |
| I-11 | `t_buyer_opened_new_refund_request` | kept | EV-93 | 13 AC-5 | — |
| I-12 | `t_new_message_about_refund` | kept | EV-100 | 13 AC-22 | — |
| I-13 | `t_a_refund_has_closed` | kept | EV-97 | 13 AC-10 | — |
| I-14 | `t_buyer_opened_new_refund_dispute` | kept | EV-99 | 13 AC-12 | — |
| I-15 | `t_seller_has_accepted_ur_refund` | kept | EV-94 | 13 AC-6 | — |
| I-16 | `t_seller_has_declined_ur_refund` | kept | EV-95 | 13 AC-7 | — |
| I-17 | `t_freelancer_has_accepted_ur_refund` | merged | EV-94 | 13 AC-6 | duplicate text merged (spec 15) |
| I-18 | `t_freelancer_has_declined_ur_refund` | merged | EV-95 | 13 AC-7 | duplicate text merged (spec 15) |
| I-19 | `t_subject_freelancer_client_requested_project_refund` | merged | EV-93 | 13 AC-5 | duplicate text merged (spec 15) |
| I-20 | `t_app_name_has_approved_ur_refund_request` | kept | EV-102 | 13 AC-16 | — |
| I-21 | `t_app_name_has_approved_refund_request_from_buyer` | kept | EV-102 | 13 AC-16 | — |
| I-22 | `t_app_name_has_declined_ur_refund_request` | kept | EV-103 | 13 AC-17 | — |
| I-23 | `t_admin_approved_unblock_request` | merged | EV-105 | 13 AC-25 | merged: Q-037 |
| I-24 | `t_admin_declined_unblock_request` | merged | EV-107 | 13 AC-26 | duplicate text merged (spec 15) |
| I-25 | `t_app_name_has_approved_ur_unblock_request` | kept | EV-105 | 13 AC-25 | — |
| I-26 | `t_app_name_has_declined_ur_unblock_request` | kept | EV-107 | 13 AC-26 | — |
| I-27 | `t_u_received_new_bid_on_ur_project` | kept | EV-61 | 11 AC-6, AC-9 | — |
| I-28 | `t_congratulations_employer_awarded_u_their_project_title` | kept | EV-66 | 11 AC-16 | — |
| I-29 | `t_subject_employer_freelancer_accepted_ur_project` | kept | EV-69 | 11 AC-20 | — |
| I-30 | `t_subject_employer_freelancer_rejected_ur_project` | kept | EV-70 | 11 AC-21 | — |
| I-31 | `t_username_has_deposited_amount_in_project` | kept | EV-72 | 11 AC-28, AC-29 | — |
| I-32 | `t_username_has_released_amount_in_project` | kept | EV-75 | 11 AC-36 | — |
| I-33 | `t_reject_milestone` | removed | — | — | X-01 |
| I-34 | `t_subject_employer_freelancer_requested_a_milestone` | removed | — | — | X-01 |
| I-35 | `t_freelancer_has_delivered_project_work` | kept | EV-73 | 11 AC-32 | — |
| I-36 | `t_congts_freelancer_ur_project_completed` | merged | EV-106 | 13 AC-25, AC-29 | duplicate text merged (spec 15) |
| I-37 | `t_a_new_custom_offer_received` | kept | EV-80 | 12 AC-9, AC-11 | — |
| I-38 | `t_an_offer_needs_changes_rejected_admin` | kept | EV-82 | 12 AC-11 | — |
| I-39 | `t_notification_username_has_accpted_ur_offer` | removed | — | — | P-97 |
| I-40 | `t_notification_username_has_rejected_ur_offer` | removed | — | — | P-97 |
| I-41 | `t_freelancer_has_canceled_ur_offer` | kept | EV-92 | 12 AC-29 | — |
| I-42 | `t_a_new_file_received_offer` | kept | EV-87 | 12 AC-21 | — |
| I-43 | `t_a_custom_order_has_been_funded` | kept | EV-86 | 12 AC-14, AC-15 | — |
| I-44 | `t_u_received_a_new_payment_offer` | kept | EV-90 | 12 AC-25 | — |
| I-45 | `t_ur_gig_title_has_been_published` | kept | EV-20 | 04 AC-17 | — |
| I-46 | `t_ur_gig_needs_changes_rejected_admin` | kept | EV-21 | 04 AC-18 | — |
| I-47 | `t_ur_portfolio_title_has_been_published` | kept | EV-15 | 02 AC-26 | — |
| I-48 | `t_ur_account_has_verified` | kept | EV-17 | 02 AC-37 | — |
| I-49 | `t_verification_files_declined` | kept | EV-18 | 02 AC-37 | — |
| I-50 | `t_withdrawal_amount_paid` | kept | EV-112 | 14 AC-14, AC-17 | — |
| I-51 | `t_withdrawal_amount_rejected` | kept | EV-113 | 14 AC-15, AC-17 | — |
| I-52 | `t_u_became_a_seller` | removed | — | — | Q-013, X-06 |
| I-53 | `t_u_have_new_message_from_username` | removed | — | — | X-11, Q-065 |
| I-54 | `t_subscription_activated_message` | kept | EV-50 | 09 AC-4, AC-8, AC-26, AC-30, AC-35 | — |
| I-55 | `t_subscription_updated_message` | kept | EV-51 | 09 AC-10 | — |

## 8. Legacy defects that must not be reproduced
Parity never means copying these. When a test "differs from legacy" on one of these points, the difference is correct. P2-B5 (security review) gives the formal "prevented by design" verdict; this table only tells QA where the replacing behaviour is specified.

| Risk | Legacy defect (short) | Replaced by |
|---|---|---|
| R-001 | Hard-coded BOG credentials | ADR-013 §8 (secrets in `.env`), ADR-004 |
| R-002 | Binance keys + trading bot | X-08 |
| R-003 | Hard-coded Pusher / findip keys | ADR-007 (own realtime), X-09, ADR-013 |
| R-004 | Unauthenticated `/success` trusts query params | 05 AC-9…17 (server-verified BOG status), ADR-004 |
| R-005 | Cancel of unpaid order credits the wallet | 06 AC-11, AC-12, AC-18…21 |
| R-006 | Points purchase trusts client points | 09 AC-8, AC-9 |
| R-010 | Public `/update` | X-20, ADR-013 |
| R-011 | Public `/tasks/*`, `/te` | X-20, ADR-008 (internal scheduler) |
| R-012 | Escrow ledger inconsistencies | ADR-003, data-model §6 invariants; 11 AC-26…31, 13 AC-15…20 |
| R-013 | Milestone commissions swapped | X-01, 05 AC-37…40 (fee snapshot) |
| R-014 | Deleting unpaid order subtracts seller pending | 06 AC-11, AC-12 |
| R-015 | Admin order delete refunds 0 | 16 AC-38 (no staff delete; refund/release through spec 13 tools) |
| R-016 | BOG success eager-load bug | 05 AC-9…17, 06 AC-9, AC-10 |
| R-017 | Balances as varchar, float, non-atomic | ADR-003 (integer tetri, transactions, idempotency) |
| R-018 | Project checkout without ownership check | 11 AC-26…31 (only the project owner pays), API IDOR tests |
| R-019 | Premium bidding gate only in the view | 11 AC-1…8 (server-side, Q-020) |
| R-020 | Social login ignores banned/pending | 01 AC-37…41 |
| R-021 | `error_log` with DB user in web root | ADR-013 |
| R-022 | `Access-Control-Allow-Origin: *` | ADR-013 §6 (same-origin API, empty production CORS allow-list) |
| R-030 | Three level implementations | X-05 |
| R-031 | Unscheduled crons (`orders:complete`) | ADR-008; 06 AC-33…39 |
| R-032 | Award expiry 24 h vs 36 h vs 48 h | 11 AC-20…23 (S-027, 48 h, Q-005) |
| R-033 | Enum/schema drift | data-model.md (new schema) |
| R-034 | Duplicate Filament panels | X-17, spec 16 |
| R-035 | Admin `edit/bog` bound to Iyzico | spec 16 (settings UI), X-07 |
| R-036 | Upgrades persisted with stale variable | 06 AC-7 (snapshot of chosen upgrades) |
| R-037 | Refund redirect to missing page | 13 AC-3 |
| R-038 | Chat message id collisions | ADR-007, 08 AC-6…13 |
| R-039 | ID images web-accessible | ADR-009 (private bucket, signed URLs), 02 AC-36…40 |
| R-040 | Visitor IPs sent to third parties over HTTP | X-09, ADR-012 |
| R-041 | Subscription success depends on the browser session | 09 AC-3…7 (server-side confirmation) |
| R-042 | Sitemap every minute; live `/sitemap.xml` 404 | 17 AC-43…45, ADR-008 §6 |
| R-043 | No login throttling | 01 AC-10…19 |
| R-044 | CR-only line endings | Tooling (repo `.gitattributes`, Phase 3); no product test |

## 9. AC testability review
All 703 ACs were read against four questions: is there a trigger and an observable result; are limits and values concrete (or named settings with defaults); is the actor/permission stated; does it depend on something undecided.

| Result | Count | ACs |
|---|---|---|
| Testable as written | 699 | all others |
| Testable, wording note only (no Given/When/Then, but concrete actions, permissions and linked ACs) | (included above) | 03 AC-16 (a worked example — use it as test data), 16 AC-20…AC-29 (moderation queues described as lists of actions; test each action through the linked owning AC) |
| Needs a definition before a test can be written | 3 | 04 AC-5 and 10 AC-3 ("normal punctuation", G-2); 04 AC-32 ("similar title", G-3) |
| Not an AC: specified behaviour with no AC | – | EV-32 reconciliation job and alert (G-1) |
| Depends on an open Owner answer; the accepted default is testable | 1 | 16 AC-8 (Q-097; default P-115: legacy admins imported disabled, without roles) (G-4) |

Words such as "several" (12 AC-21, 17 AC-10) and "normal not-found state" (15 AC-16) were checked and are testable in context (they describe legacy behaviour or refer to a defined state).

## 10. Gaps handed back to the product-analyst
| Gap | Where | Problem | Needed before | Suggested fix (for the analyst; not a business rule) |
|---|---|---|---|---|
| G-1 | Spec 05 (or 16 §G), spec 15 EV-32 | The nightly ledger/BOG reconciliation job, its admin report and the EV-32 email are named (ADR-003 §10, spec 05 "Notifications", spec 16 permissions) but no AC says when it runs, what counts as a difference, or what staff see | Slice 4 (spec 05) | Add one or two ACs: trigger, what is compared, what the report shows, EV-32 sent once per run with the count |
| G-2 | Spec 00 R-5.3; 04 AC-5; 10 AC-3 | "Normal punctuation" in Georgian fields is not a list, so the validator and its tests cannot be written the same way on web, mobile and API | Slice 3 (spec 04) | Write the allowed character set explicitly (or state "any character except …"); legacy allowed `-_.,!?()` (BR-051) |
| G-3 | 04 AC-32 | "Similar title" for "You may also like" has no rule | Slice 3 (spec 04) | Take the rule from the cited legacy code (`:136-162`) or state it (e.g. shares a word of 4+ letters) |
| G-4 | 16 AC-8 | Q-097 (which legacy admins migrate, with which roles) is still open; the accepted default P-115 is testable | Phase 5 (migration) | No spec change; the Owner answers Q-097 before migration |
| G-5 (minor) | 16 AC-20…AC-29 | Written as lists, not Given/When/Then | Slice 15 | Optional rewording; tests use the linked owning ACs |

No new Owner questions: G-2 and G-3 are wording gaps that the analyst can close from the legacy citations; if the legacy code does not settle them, the analyst raises a Q-ID.
