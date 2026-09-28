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
- none. Steps 1 and 2 of phase-2-plan.md are done; Step 3 (P2-A3 money specs || P2-C2 tokens + components) is ready to start

## Blocked (reason, who must act)
- none
- Known, accepted: no production schema dump (mapping built from migrations/models)

## Done in Phase 2
- P2-A1: 00-platform-rules.md **approved** (Owner 2026-09-28). Register now 124 rows (S-123 linked accounts, P-25; S-124 2FA trigger, Q-082)
- P2-C1: docs/05-design/audit.md + packages/assets/ (Q-073…Q-080 answered; audit itself awaits Owner review at the gate)
- P2-A2: specs 01-auth, 02-profiles-and-dashboards, 03-categories-and-search, 04-gigs **approved** (Owner 2026-09-28; P-14…P-37 accepted, P-15 adjusted by Q-082)
- P2-B1: docs/03-architecture/architecture.md + ADR-001…016 = proposed. Q-081, Q-082, Q-086…Q-089 answered. **ADR-016 must be revised by the architect**: Premium is sold by BOG in the mobile app too (Q-081; store-billing risk to document). ADR-002 to reflect S-124; ADR-004 to follow Q-087 (standard BOG structure with clean interfaces, lead developer finalizes)

## Next up
- Step 3: P2-A3 product-analyst specs 05 payments/wallet, 06 gig orders, 07 reviews, 09 subscriptions/points/promo, 14 withdrawals || P2-C2 ui-ux-designer tokens + components
- Step 4: P2-A4 specs 08, 10–13 || P2-B2 data model (+ P2-B3 url-map); the architect also revises ADR-016/002/004 then

## Decisions waiting for Owner
- Q-083 (disclose staff chat access in terms/privacy), Q-084 (auto-release switched back ON: release overdue items or fresh 72h), Q-085 (keep S-110 custom HTML/JS restricted, or drop): not yet answered
- Approve ADR-001…016 and the design audit at the Phase 2 gate
