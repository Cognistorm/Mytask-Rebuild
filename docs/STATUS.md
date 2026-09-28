# Status — updated 2026-09-28
Phase: 2 — Blueprint (planned, not started) | Gate: not ready | Phase 1 gate: APPROVED by Owner 2026-09-28

## Done
- Kit copied; legacy code in /legacy/APP (confirmed = legacy `main`, production logic); vision filled
- Discovery docs in docs/01-discovery (inventory, routes-and-pages, data-model, features, roles-and-permissions, notifications, integrations, i18n, risks-and-debt)
- Owner answered Q-002…Q-057 (2026-09-28): docs/01-discovery/open-questions.md → "Answers" + "Follow-up answers"
- **Phase 1 Discovery gate approved by the Owner on 2026-09-28**
- Branch rule: legacy `main` = live production; `staging` = dev/test (0.01 GEL payments). Never base rules on staging
- Phase 2 plan written: docs/03-architecture/phase-2-plan.md (tasks P2-A1…A6, B1…B5, C1…C4, gate criteria, Phase 4 slice order)

## Key Owner decisions (details in open-questions.md)
- Fees: no gig/project commission, no tax; withdrawal fee Standard 10% / Premium 0%; BOG card surcharge 2.5%; all admin-configurable (new Commission & Fee module)
- Escrow: buyer charged immediately; freelancer sees HOLD/Pending; one escrow payment per project (legacy milestone rows → project payments); auto-release 72h after delivery if buyer silent (configurable, on by default)
- Removed: milestones, hourly projects, paid promotions/bid upgrades, levels/badges, "Become a seller", 28 foreign gateways, Binance bot, findip/ip-api
- Every user is buyer + freelancer; ratings/reviews for gigs AND projects; freelancer sets mandatory "number of revisions" per gig/proposal
- Payments: BOG + Wallet; bank transfer coded but off; Points buy Premium only (100 = 1 month); manual withdrawals now, BOG Payout-ready design
- Promo codes: referral codes + admin codes (% or fixed GEL) on platform fees / Premium only
- Proposals require Premium (server-side); plan limits admin-editable; award acceptance 48h (configurable)
- i18n: /en/ URL prefixes, Latin allowed with Georgian, fall back to Georgian when English missing, keep legacy English values
- NEW: email 2FA toggle, renewal reminder 2–3 days before charge, multiple admin notification recipients (default ir.gvazava@gmail.com), full custom-offer flow (toggle), admin chat visibility, admin points add/deduct, blog kept + working sitemap
- Phase 2 answers (Q-058…Q-067): new strings English first + Georgian alongside (CLAUDE.md updated); dark mode kept, light default; freelancer-initiated custom offers, no admin approval, 3-day expiry; revision request and open refund/dispute pause the 72h auto-release, which covers gigs, projects and custom offers; mutual reviews; optional per-user email 2FA on new device/IP + admin global toggle; promo codes only on platform services (Premium now), limits 1/user + total cap; migrate Inbox + delivery/refund threads only; renewal reminder 3 days before, email + in-app
- Security: all keys in .env; strict web-root isolation (logs/config never web-reachable); keep restrictions, appeals, IP banning, KYC

## In progress (agent → task)
- Step 4 (started 2026-09-28): P2-A4 product-analyst specs 08, 10, 11, 12, 13 || P2-B2 solution-architect data model + P2-B3 url-map + ADR revisions (002, 004, 008, 013, 016)

## Blocked (reason, who must act)
- none
- Known, accepted: no production schema dump (mapping built from migrations/models)

## Done in Phase 2
- P2-A1: 00-platform-rules.md **approved** (Owner 2026-09-28). Register now 124 rows (S-123 linked accounts, P-25; S-124 2FA trigger, Q-082)
- P2-C1: docs/05-design/audit.md + packages/assets/ (Q-073…Q-080 answered; audit itself awaits Owner review at the gate)
- P2-C2: packages/tokens (tokens.json + build/contrast scripts + dist, 162 contrast checks 0 failures) + docs/05-design/tokens.md + components.md (58 components, Phosphor icons) + M-mark proposal in packages/assets/brand/ = proposal, awaiting Owner (with P2-C3 preview). Handoff: docs/handoffs/2026-09-28-ui-ux-designer-to-orchestrator-p2-c2.md (5 questions)
- P2-A2: specs 01-auth, 02-profiles-and-dashboards, 03-categories-and-search, 04-gigs **approved** (Owner 2026-09-28; P-14…P-37 accepted, P-15 adjusted by Q-082)
- P2-A3: specs 05-payments-and-wallet (43 ACs), 06-gig-orders (45), 07-reviews (21), 09-subscriptions-points-referrals (37), 14-withdrawals (20) = **ready for Owner**. Every money movement mapped as ledger rows (MM-/PM-xx) for P2-B2. No new Q-IDs; PROPOSED P-38…P-65; proposed register rows S-125 (bank-transfer instructions), S-126 (mobile Premium card purchase switch). Handoff: docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a3.md
- P2-B1: docs/03-architecture/architecture.md + ADR-001…016 = proposed. Q-081, Q-082, Q-086…Q-089 answered. **ADR-016 must be revised by the architect**: Premium is sold by BOG in the mobile app too (Q-081; store-billing risk to document). ADR-002 to reflect S-124; ADR-004 to follow Q-087 (standard BOG structure with clean interfaces, lead developer finalizes); ADR-008 to reflect Q-084 (fresh 72h on re-enable); ADR-013 to reflect Q-085

## Next up
- Step 5: P2-A5 specs 15, 16, 17 || P2-C3 design preview page
- Step 6: P2-A6 QA parity master || P2-C4 key screen layouts; then B4 openapi.yaml, B5 security review, Owner gate

## Decisions waiting for Owner
- Approve ADR-001…016 (as revised in Step 4), the design audit, tokens and components (with the P2-C3 preview) at the Phase 2 gate
- Done 2026-09-28: Q-083…Q-085 and Q-090…Q-094 answered; money specs 05, 06, 07, 09, 14 **approved** (P-38…P-65 accepted; P-46 set spec 04 to quantity always 1; S-125, S-126 added to spec 00, register now 126 rows); "M" mark approved
