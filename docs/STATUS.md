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
- none (Phase 2 plan waiting for the Owner to start Step 1)

## Blocked (reason, who must act)
- none. Q-058…Q-067 answered 2026-09-28. Sub-points not addressed (specs propose, Owner approves at the gate): revision count range (Q-061a/c/d), staff 2FA (Q-063b), unblock-request fallback with auto-release ON (Q-067b), custom-offer fee defaults (Q-060d, assumed 0)
- Known, accepted: no production schema dump (mapping built from migrations/models)

## Next up (Step 1 of phase-2-plan.md; the two tasks can run in parallel)
- P2-A1 product-analyst: DONE 2026-09-28. Specs: docs/02-specs/README.md (00–17 in build order) + 00-platform-rules.md = **approved by Owner 2026-09-28** (settings register 122 rows; P-1…P-13 accepted, P-4 staff 2FA = admin toggle, P-5 unblock request hidden while auto-release ON). 01–17 not started. Handoff: docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a1.md
- P2-C1 ui-ux-designer: DONE 2026-09-28. docs/05-design/audit.md = **ready for Owner** (live public screens + Blade-only audit of dashboards/chat/checkout/proposal modal; real values with evidence; 13 modernisation principles). Assets in packages/assets/ with SOURCES.md. 8 design questions for the Owner are in the handoff (e.g. accessible dark-teal buttons, admin-editable brand colour, logo SVG/app icon): docs/handoffs/2026-09-28-ui-ux-designer-to-orchestrator-p2-c1.md. Next: P2-C2 tokens + components
- Then Step 2: P2-A2 specs 01–04 || P2-B1 architecture.md + ADR-001…013
- P2-B1 solution-architect: DONE 2026-09-28. docs/03-architecture/architecture.md + ADR-001…016 in docs/03-architecture/adr/ = **proposed, ready for Owner** (stack confirmed: NestJS + PostgreSQL 17/Prisma + Redis/BullMQ, Next.js web + separate admin app, Expo mobile, pnpm + Turborepo; extra ADRs 014 contract-first OpenAPI, 015 environments/hosting/observability, 016 mobile Premium vs store billing). 9 Owner questions are in the handoff: docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b1.md. Next: P2-B2 data-model + P2-B3 url-map (Step 4)
- P2-A2 product-analyst: DONE 2026-09-28. Specs 01-auth (52 ACs), 02-profiles-and-dashboards (41), 03-categories-and-search (37), 04-gigs (39) = **ready for Owner**. No new questions; 24 PROPOSED items P-14…P-37 for Owner decision (biggest: P-32 gig wizard blocks, P-26 Premium ranking rule, P-23 restore the unreachable edit-profile screen, P-15 2FA device-only = same as ADR-002 question 2). Handoff: docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a2.md. Next: P2-A3 money specs 05, 06, 07, 09, 14

## Decisions waiting for Owner
- P2-B1 (architect): review architecture.md + ADR-001…016 (O-4). Answer Q-081…Q-089 in open-questions.md (copied from the P2-B1 handoff). The key ones: Premium sold on web only at launch because of App Store / Google Play billing rules (ADR-016); the 2FA trigger is based on a new device, not a new IP; wording that tells users staff may read chats; rotation of the leaked legacy keys (R-001…R-003)
- P2-A2 (product-analyst): review specs 01–04 (O-2), decide PROPOSED P-14…P-37 (listed at the end of each spec), then mark each spec `approved`. P-25 would add settings row S-123 to the approved 00 spec
