# Phase 2 — Blueprint plan
Written by: orchestrator | Date: 2026-09-28 | Status: proposed, waiting for the Owner to start it

Phase 1 Discovery gate: approved by the Owner on 2026-09-28.
Inputs: `docs/00-vision.md`, `docs/01-discovery/*`, and `docs/01-discovery/open-questions.md`. In that file, the "Answers" and "Follow-up answers" sections are authoritative. They override legacy behaviour.
Legacy rule: `/legacy/APP` = legacy `main` = live production logic. `staging` is test-only.

## 0. Where we start from
| Area | State today |
|---|---|
| docs/02-specs | Only README.md, which lists 01-auth as "not started" |
| docs/03-architecture | Only the ADR template |
| docs/04-api | Only README.md, with no openapi.yaml yet |
| docs/05-design | Screenshot README only. The Owner has added no screenshots. |
| docs/06-qa | Empty folders (plans, reports, security) |
| packages/, apps/, docker-compose.yml | Do not exist. The kit puts the monorepo scaffold in Phase 3 (START-HERE.md), so this is expected and **not** a Phase 0 gap. |

Budget note (Pro plan): the tasks are grouped into a small number of large agent runs. Run at most 2 agents in parallel. Start a fresh session (`/clear`) for each task. The files are the memory.

## 1. Spec list (product-analyst output, one file per domain)
Every spec follows the product-analyst template. NEW = new requirement. CHANGE = differs from legacy, with the Owner decision cited.

| # | File | Covers (with Owner decisions to include) |
|---|---|---|
| 00 | `00-platform-rules.md` | Cross-cutting rules: dual role for every user (Q-013), Standard/Premium plans and the **admin-editable plan limits** (Q-021 NEW), and the **Admin-configurable settings register**. The register lists every timer, fee, limit and toggle with its default and source Q-ID: withdrawal fee 10%/0% (Q-004), BOG surcharge 2.5% (Q-007), award acceptance 48h (Q-005), auto-release 72h ON (Q-051), refund auto-reject 2 days (Q-012), gig limit 1 (Q-021), 100 points = 1 month (Q-052), referral 10 points, custom offers toggle (Q-027), bank transfer OFF (Q-016), 2FA toggle (Q-043). Also: money glossary (HOLD/Pending, available, withdrawn), content i18n rules (Latin allowed Q-022, Georgian fallback Q-023), and the list of removed features (milestones, hourly, promotions, bid upgrades, levels/badges, Become-a-seller, 28 gateways, Binance, findip/ip-api) |
| 01 | `01-auth.md` | Register, login, legacy bcrypt passwords, email verification, reset, reCAPTCHA, social-login architecture with keys set in admin (Q-032), **email 2FA with admin toggle (NEW, Q-043)**, user login throttling (R-043), banned/pending checks incl. social (R-020), restrictions + appeals + IP banning (Q-057) |
| 02 | `02-profiles-and-dashboards.md` | Public profile, **dual-role dashboard switcher** (vision priority 4), account settings, availability, online status, portfolio, username masking (BR-015), KYC selfie+ID kept "integration-ready" (Q-048). Levels/badges removed (Q-014) |
| 03 | `03-categories-and-search.md` | 3-level gig categories, project categories + skills, `/search`, `/hire/{keyword}`, `/sellers`, filters/sorting (discovery says this area was only surveyed, so the analyst must trace it) |
| 04 | `04-gigs.md` | Create/edit wizard, upgrades, **mandatory "number of revisions" (NEW, Q-056)**, moderation, free-plan limit, gig page, Premium highlight, slug rule |
| 05 | `05-payments-wallet.md` | BOG card, Wallet, card top-up (Q-030), 2.5% surcharge (Q-007), bank transfer coded but OFF, **buyer charged immediately and freelancer sees HOLD** (Q-008, Q-038), refunds go to the wallet at item price only (Q-010, Q-011), invoices/receipts, **promo-code application on platform fees (NEW, Q-053)**, **Commission & Fee module rules (NEW, Q-006)** |
| 06 | `06-gig-orders.md` | Cart → checkout → requirements → start → deliver → revisions → complete, **auto-release after 72h (Q-051)**, cancel rules (fixes R-005, R-014) |
| 07 | `07-reviews.md` | Gig reviews + **project reviews (NEW, Q-046)**, rating averages |
| 08 | `08-messaging.md` | Chat (/inbox) with attachments, offline email throttle, order/project/refund threads, **admin chat visibility (NEW, Q-015)** |
| 09 | `09-subscriptions-points-referrals.md` | Monthly/yearly Premium, saved-card auto-renew, **renewal reminder email (NEW, Q-019)**, points ledger (points buy Premium only, Q-052), **admin points add/deduct (NEW, Q-016)**, extensible earning events (Q-017), referral codes, **admin promo codes (NEW, Q-018/Q-053)** |
| 10 | `10-projects.md` | Post project (fixed budget only, Q-035), moderation, browse/explore, project page, notify category sellers (BR-053), English fallback |
| 11 | `11-proposals-and-hiring.md` | Proposals **require Premium server-side** (Q-020) and include the revisions field (Q-056). Award, freelancer acceptance within 48h (configurable), **one escrow payment per project** via the `/payments` flow (Q-034, Q-050), delivery, completion, auto-release |
| 12 | `12-custom-offers.md` | **Full custom-offer flow, toggleable (NEW, Q-027)** |
| 13 | `13-refunds-disputes-unblock.md` | Gig/project/offer refunds, 2-day auto-reject (Q-012), disputes, one admin resolution implementation (Q-037), unblock requests |
| 14 | `14-withdrawals.md` | Manual bank-transfer withdrawals, fee by plan (Q-004), thresholds/period configurable, **BOG-Payout-ready design (Q-029)** |
| 15 | `15-notifications.md` | Maps every email and in-app notification in `notifications.md` to a trigger. Covers channels (email via SendGrid, Q-033; in-app; mobile push marked NEW; SMS-ready interface), **multiple admin recipients, default ir.gvazava@gmail.com (NEW, Q-026)**, and email locale |
| 16 | `16-admin-panel.md` | **Staff RBAC (NEW, vision)** with a proposed default permission matrix for Customer Support, Financial Manager and Content Moderator, for Owner approval. Also: moderation queues, users (restrict/ban/trash/balances through ledger adjustments only), Commission & Fee module UI, settings register UI, translation editor, analytics (registrations, country/city, device, browser, **without findip/ip-api**, Q-055), system logs viewable only inside admin (Q-054) |
| 17 | `17-content-and-seo.md` | CMS pages, **blog kept** (Q-025), working sitemap, SEO meta/JSON-LD, `/en/` prefix behaviour (Q-024), `/ka/gita` pages, contact/support, newsletter |

## 2. Tasks

### Track A: Product (product-analyst, then qa-engineer)
| ID | Agent | Inputs | Output | Depends on | Done when |
|---|---|---|---|---|---|
| P2-A1 | product-analyst | vision, all discovery docs, open-questions (Answers + Follow-ups) | `docs/02-specs/README.md` (the 00–17 list above in build order, with status) + `docs/02-specs/00-platform-rules.md` | none | Settings register lists every configurable value with default + Q-ID. Removed-features list is complete. Status "ready for Owner" |
| P2-A2 | product-analyst | same + 00 | Specs 01, 02, 03, 04 | A1 | Template complete. Every AC is testable. Every Owner decision is cited by Q-ID. NEW/CHANGE are marked. The ka texts have i18n keys. Open items go to open-questions.md, and the spec is marked BLOCKED |
| P2-A3 | product-analyst | same + 00 | Specs 05, 06, 07, 09, 14 (money wave) | A1 (can run after A2 or in parallel with it) | Same as A2. In addition, every money movement is written as "from → to, amount, trigger" so the architect can map it to ledger entries |
| P2-A4 | product-analyst | same + 00, 05, 06 | Specs 08, 10, 11, 12, 13 | A3 | Same as A2 |
| P2-A5 | product-analyst | same + all above | Specs 15, 16, 17 | A4 | Same as A2. Spec 15 accounts for every row in `notifications.md` (kept, merged, or NEW) |
| P2-A6 | qa-engineer | all specs, features.md (BR-xxx), notifications.md, risks-and-debt.md | `docs/06-qa/plans/00-parity-master.md` | A5 | Every BR-001…BR-122 and every notification maps to a spec + AC, or to an Owner removal decision (Q-ID). Every AC is judged testable. Gaps are listed and handed back to the product-analyst |

### Track B: Architecture (solution-architect, then security-reviewer)
| ID | Agent | Inputs | Output | Depends on | Done when |
|---|---|---|---|---|---|
| P2-B1 | solution-architect | vision, discovery, open-questions, 00-platform-rules | `docs/03-architecture/architecture.md` + ADRs in `docs/03-architecture/adr/` (list below) | A1 | Mermaid diagram. Web and mobile use only the API (no business logic in clients). Each ADR has Context/Decision/Alternatives/Consequences and status "proposed" |
| P2-B2 | solution-architect | B1, specs 00 + money wave (A3, draft is enough), discovery data-model.md | `docs/03-architecture/data-model.md` | B1, A3 | Mermaid ER diagram. **Double-entry ledger** with integer tetri: buyer debited immediately; freelancer HOLD/Pending account; available; withdrawn; platform fee/surcharge accounts; BOG clearing. Separate **points ledger** with extensible event types. **Settings/config tables** for fees, limits, timers and toggles, versioned so historic transactions keep the fee that applied then. Commission & Fee rules model. Extensibility for milestones/hourly (payment schedule on a contract, not on the project). Money invariants written down (sum of entries = 0, no silent negative balances). **Legacy→new mapping outline** (old table.column → new) including: balances migrated as-is incl. negatives (Q-039); `project_milestones` → project payments (Q-050); dropped tables (Q-040); legacy password hashes; chat scope (after Q-065) |
| P2-B3 | solution-architect | B1, routes-and-pages.md, live site | `docs/03-architecture/url-map.md` | B1 (parallel with B2) | Georgian default unprefixed, English under `/en/`. Every legacy public URL pattern (`/service/{slug}`, `/project/{pid}/{slug}`, `/profile/{username}`, `/categories/...`, `/page/{slug}`, `/hire/{kw}`, `/sellers`, `/ka/gita`, `/en/gita`, `?locale=`) maps to a new URL or a 301. Covers hreflang/canonical and sitemap structure |
| P2-B4 | solution-architect | B1–B3, all specs (status at least "ready for Owner") | `docs/04-api/openapi.yaml` + coverage table in `docs/04-api/README.md` (spec AC → endpoint) | B2, A5 | OpenAPI 3.1 lints with 0 errors. It meets the CLAUDE.md/architect conventions: errors `{code,message,details}`, cursor pagination, UTC ISO dates, money as integer tetri + `GEL`, `Accept-Language: ka|en`, JWT security scheme, per-endpoint permission note (role + ownership). Idempotency keys on money endpoints. BOG webhook endpoint with signature/status verification. Admin endpoints carry RBAC permission names. Every approved AC is covered |
| P2-B5 | security-reviewer | architecture.md, ADRs, data-model.md, url-map.md, openapi.yaml, risks-and-debt.md R-001…R-044 | `docs/06-qa/security/00-blueprint-YYYY-MM-DD.md` | B4 | Every checklist area (AuthN, AuthZ/IDOR, Money, Input, Data protection, Infra) is reviewed at design level. Each legacy risk R-xxx is marked "prevented by design" (with the section/ADR that prevents it) or listed as a finding. Verdict PASS, with no open critical/high findings |

Minimum ADR set for P2-B1 (the architect may add more):
001 stack and monorepo (confirm or change the default NestJS/Next.js/Expo/Postgres/Prisma/pnpm+Turborepo) ·
002 auth: JWT access+refresh for web and mobile, legacy bcrypt `$2y$` verify-and-rehash, email 2FA ·
003 ledger and money: double-entry, integer tetri, idempotency, HOLD model ·
004 BOG integration: server-side status verification, webhook, saved-card recurring, Payout-ready interface ·
005 configuration: settings register, Commission & Fee module, versioning ·
006 i18n: `/en/` URL prefix, content translation storage ready for AI translation later, Georgian fallback ·
007 realtime chat + notifications: replace Chatify/Pusher or keep Pusher; email via SendGrid; Expo push; SMS provider interface ·
008 background jobs/timers: auto-release, award expiry, refund auto-reject, renewal + reminder, sitemap ·
009 file storage: S3/MinIO, private buckets for KYC/deliveries, signed URLs (fixes R-039) ·
010 admin app placement + staff RBAC ·
011 search (e.g. Postgres full-text first) ·
012 analytics without third-party IP geolocation (local GeoIP or edge headers) ·
013 web-root isolation and secrets (only the public folder is served; logs/config never reachable; Q-054).

### Track C: Design (ui-ux-designer)
| ID | Agent | Inputs | Output | Depends on | Done when |
|---|---|---|---|---|---|
| P2-C1 | ui-ux-designer | live site https://mytask.ge, legacy CSS/Blade/Tailwind config, `docs/05-design/screenshots/` (if the Owner adds any), routes-and-pages.md | `docs/05-design/audit.md` + logos/icons in `packages/assets/` with `packages/assets/SOURCES.md` | none (can start now) | Every main screen is audited (keep / inconsistent / a11y / mobile problems). Real colours, fonts (FiraGO/BPG) and spacing are extracted. Asset sources are recorded |
| P2-C2 | ui-ux-designer | C1 | `packages/tokens/tokens.json` + `docs/05-design/tokens.md` + `docs/05-design/components.md` | C1 (and Q-059 for dark mode) | Tokens are usable as CSS variables and as an RN object. Fonts support Mkhedruli. WCAG AA contrast. 44×44 touch targets. Every component has variants/states and web-vs-mobile notes |
| P2-C3 | ui-ux-designer | C2 | `docs/05-design/preview/index.html` | C2 | One static page shows all tokens and components, with old vs new side by side for home, gig page, project page and a dashboard. The Owner can open it in a browser |
| P2-C4 | ui-ux-designer | C2, specs 02, 04, 06, 10, 11, 08 | `docs/05-design/screens/NN-*.md` for **key screens only**: home, gig page, gig create wizard, project page + proposal form, checkout, order detail, dual-dashboard switcher, chat | C2, A2–A4 (drafts) | Layout keeps the live structure. Wireframe, component list, all states, mobile adaptation. Other screens are designed per feature in Phase 4 |

### Owner actions (in parallel, no agent)
| ID | Action | When |
|---|---|---|
| O-1 | Answer Q-058…Q-067 in `open-questions.md` | Now. Q-058 affects every spec's text table |
| O-2 | Review each spec wave as it lands and mark each spec `approved` or comment | After A2, A3, A4, A5 |
| O-3 | Optional: drop desktop + mobile screenshots of the live site into `docs/05-design/screenshots/` | Before C1 if possible |
| O-4 | Review ADRs, data-model, url-map, then openapi | After B1–B4 |
| O-5 | Open `docs/05-design/preview/index.html` and approve or comment | After C3 |
| O-6 | Merge `feat/discovery` into `main`, then create `feat/blueprint` for Phase 2 work (CLAUDE.md: never commit to main directly) | Before starting |

## 3. Order and parallelism
```
Step 1 (parallel):  P2-A1 product-analyst  ||  P2-C1 ui-ux-designer        || O-1 Owner answers
Step 2 (parallel):  P2-A2 specs 01–04      ||  P2-B1 architecture + ADRs
Step 3 (parallel):  P2-A3 money specs      ||  P2-C2 tokens + components
Step 4 (parallel):  P2-A4 specs 08,10–13   ||  P2-B2 data model  (+ P2-B3 url-map in the same or the next run)
Step 5 (parallel):  P2-A5 specs 15–17      ||  P2-C3 preview page
Step 6 (parallel):  P2-A6 QA parity master ||  P2-C4 key screen layouts
Step 7:             P2-B4 openapi.yaml (needs specs "ready for Owner" and data model)
Step 8:             P2-B5 security blueprint review → fixes by architect if needed
Step 9:             Owner gate review
```
Critical path: A1 → A3 → A4 → A5 → B4 → B5 → gate. Design (Track C) is off the critical path.
If the Owner changes a spec after B2/B4, the architect updates data-model/openapi in the same step, while the contract is not yet approved.

## 4. Phase 2 gate: what the Owner approves
The gate is "ready for Owner review" only when all items below are true.
1. **Specs:** `docs/02-specs/00…17` all have `Status: approved`. None are BLOCKED. `README.md` has the build order.
2. **Open questions:** Q-058…Q-067 (and any new ones) are answered, and their answers are reflected in the specs.
3. **Parity:** `docs/06-qa/plans/00-parity-master.md` shows every legacy BR and notification kept, changed (approved CHANGE) or removed (Owner Q-ID), with no unmapped item.
4. **Architecture:** `architecture.md` approved. ADR-001…013 at status `accepted`.
5. **Data model:** `data-model.md` approved, including ledger design, money invariants, settings/fee model, extensibility for milestones/hourly, and the legacy→new mapping outline.
6. **URLs/SEO:** `url-map.md` approved (every live URL pattern has a target or 301).
7. **API contract:** `docs/04-api/openapi.yaml` lints clean, and the coverage table shows every approved AC covered. The Owner approves it as the contract.
8. **Design:** `audit.md`, `tokens.json`/`tokens.md`, `components.md` and `preview/index.html` approved visually. Key screen layouts exist. `packages/assets/SOURCES.md` is filled.
9. **Security:** blueprint review verdict PASS, with no open critical/high findings.
10. **Paper trail:** one handoff per task in `docs/handoffs/`. `docs/STATUS.md` is current.

## 5. After the gate: Phase 3 Foundation (preview)
1. devops-engineer: monorepo + `docker compose up` (Postgres, Redis, MinIO, Mailpit) + CI + `.env.example` + `docs/SETUP-LOCAL.md`, per ADR-001. It builds around the existing `packages/tokens`.
2. Platform core: settings register + Commission & Fee config + staff RBAC skeleton + notification infrastructure (email/in-app/push interfaces) + ledger core. Every later slice depends on these.
3. `/feature 01-auth.md` (API → web → mobile → QA → security). Gate: the Owner logs in on web and mobile with a migrated-format legacy password.

## 6. Phase 4 slice order (high level; the product-analyst finalizes it in 02-specs/README.md)
Based on vision priorities (1 gigs, 2 projects/proposals, 3 escrow, 4 dual dashboard, 5 chat/notifications), adjusted for dependencies:
1. 02 Profiles + dual-dashboard switcher (+ KYC stub)
2. 03 Categories + search
3. 04 Gigs: post, browse, gig page (priority 1)
4. 05 Payments/wallet: BOG + wallet + top-up on the ledger (prerequisite for all escrow)
5. 06 Gig orders: escrow → delivery → revisions → completion → auto-release (priority 3)
6. 07 Reviews (gigs; projects added in slice 10)
7. 08 Messaging + admin chat visibility (priority 5)
8. 09 Subscriptions, points, referrals, promo codes (needed before proposals because of the Premium gate)
9. 10 Projects: post + browse (priority 2)
10. 11 Proposals, award, project escrow, delivery, completion, project reviews (priority 2/3)
11. 12 Custom offers (toggle)
12. 13 Refunds, disputes, unblock requests (all order types)
13. 14 Withdrawals
14. 15 Notifications completion (inventory audit, admin recipients, push)
15. 16 Admin panel remaining modules (moderation, users, analytics, translations, Commission & Fee UI)
16. 17 Content, blog, SEO, sitemap, 301 redirects

Each slice's own notifications, admin screens and security review are built inside that slice. Slices 15 and 16 only complete what is left.

## 7. Known risks for Phase 2
- No production schema dump (accepted by the Owner, Q-049), so the mapping is based on migrations and models and may miss drift (discovery data-model.md §0). Phase 5 needs a local copy of the production DB. The Owner should plan for that well before Phase 5.
- Discovery only surveyed some areas (gig wizard details, admin component rules, blog/newsletter, search ranking, profile editing, portfolio, earnings reports). The product-analyst must trace these in legacy code while writing specs 02, 03, 04, 16, 17, and raise questions rather than guess.
- Contradiction flagged: new-string i18n convention (vision vs CLAUDE.md), see Q-058. Until the Owner answers, the product-analyst follows CLAUDE.md (project rules), and the text tables must be easy to update afterwards.
