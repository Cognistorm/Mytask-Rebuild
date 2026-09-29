# Status — updated 2026-09-29
Phase: 2 — Blueprint (in progress, Steps 1–6 done) | Gate: not ready | Phase 1 gate: APPROVED by Owner 2026-09-28

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
- none. Step 6 done 2026-09-29 (P2-A6 parity master + P2-C4 key screen layouts). Step 7 (P2-B4 openapi.yaml) is ready to start

## Blocked (reason, who must act)
- none
- Known, accepted: no production schema dump (mapping built from migrations/models)

## Done in Phase 2
- P2-A1: 00-platform-rules.md **approved** (Owner 2026-09-28). Register now 124 rows (S-123 linked accounts, P-25; S-124 2FA trigger, Q-082)
- P2-C1: docs/05-design/audit.md + packages/assets/ (Q-073…Q-080 answered; audit itself awaits Owner review at the gate)
- P2-C2: packages/tokens (tokens.json + build/contrast scripts + dist, 162 contrast checks 0 failures) + docs/05-design/tokens.md + components.md (58 components, Phosphor icons) + M-mark proposal in packages/assets/brand/ = proposal, awaiting Owner (with P2-C3 preview). Handoff: docs/handoffs/2026-09-28-ui-ux-designer-to-orchestrator-p2-c2.md (5 questions)
- P2-C3: docs/05-design/preview/index.html (+ preview.css, preview.js, fonts/) = done 2026-09-29, **awaiting Owner (O-5)**: open by double-click; tokens, all components (interactive), old vs new for home / gig / project / dashboard, brand. Verified in headless Chromium (0 errors, 162/162 contrast, 45/45 interaction checks, no horizontal scroll at 360). components.md: QuantityInput reserved (P-46), dashboard labels = legacy keys. Handoff: docs/handoffs/2026-09-29-ui-ux-designer-to-orchestrator-p2-c3.md (4 questions, copied as Q-105…Q-108)
- P2-A2: specs 01-auth, 02-profiles-and-dashboards, 03-categories-and-search, 04-gigs **approved** (Owner 2026-09-28; P-14…P-37 accepted, P-15 adjusted by Q-082)
- P2-A3: specs 05-payments-and-wallet (43 ACs), 06-gig-orders (45), 07-reviews (21), 09-subscriptions-points-referrals (37), 14-withdrawals (20) = **ready for Owner**. Every money movement mapped as ledger rows (MM-/PM-xx) for P2-B2. No new Q-IDs; PROPOSED P-38…P-65; proposed register rows S-125 (bank-transfer instructions), S-126 (mobile Premium card purchase switch). Handoff: docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a3.md
- P2-A4: specs 08-messaging (34 ACs), 10-projects (29), 11-proposals-and-hiring (45), 12-custom-offers (36), 13-refunds-disputes-unblock (34) = **ready for Owner**. Money rows MM-11-01…04, MM-12-01…05, MM-13-01…06 (one release ref + one refund ref per escrow, fixes R-012). No new Q-IDs, no new register rows; PROPOSED P-66…P-105 (incl. P-71 Terms & Privacy staff-review wording for Q-083). Handoff: docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a4.md
- P2-A5 (**approved** by Owner 2026-09-29: P-106…P-134 accepted, S-127 added to spec 00 → register 127 rows): specs 15-notifications (39 ACs; catalogue of 125 events; all 141 legacy notification items accounted: 120 kept, 8 merged, 13 removed; 42 NEW events), 16-admin-panel (78 ACs; RBAC with 4 default roles, audit log, all queues, money screens, Commission & Fee + settings UI, analytics, logs; AC-8 waits on Q-097), 17-content-and-seo (47 ACs; CMS + Terms/Privacy clause, blog, contact, newsletter, SEO meta/JSON-LD, sitemap index, robots, 301s) = **ready for Owner**. No new Q-IDs; PROPOSED P-106…P-134; proposed register row S-127 `appearance.custom_code.allowed_hosts` (in spec 16, spec 00 not edited). Handoff: docs/handoffs/2026-09-29-product-analyst-to-orchestrator-p2-a5.md
- P2-B1: docs/03-architecture/architecture.md + ADR-001…016 = proposed. Q-081, Q-082, Q-086…Q-089 answered. **ADR-016 must be revised by the architect**: Premium is sold by BOG in the mobile app too (Q-081; store-billing risk to document). ADR-002 to reflect S-124; ADR-004 to follow Q-087 (standard BOG structure with clean interfaces, lead developer finalizes); ADR-008 to reflect Q-084 (fresh 72h on re-enable); ADR-013 to reflect Q-085. **Done in Step 4** (see P2-B2/B3)
- P2-B2/B3: docs/03-architecture/data-model.md (120 entities; double-entry ledger in tetri with one HOLD account per escrow; 17 money invariants; every MM-/PM- row of specs 05, 06, 09, 11, 12, 13, 14 mapped to postings; points ledger; versioned settings/fee rules with snapshots; contract payment schedule for future milestones/hourly; timers as deadline columns incl. Q-084; legacy→new mapping with as-is opening balances) + docs/03-architecture/url-map.md (ka unprefixed, /en/; every legacy URL kept/301/302/404/410; hreflang/canonical; sitemap index; admin.mytask.ge; BOG return + mobile deep links) = proposed. ADR-002, 004, 008, 013, 016 revised (still proposed) + architecture.md updated. 10 Owner questions in docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b2-b3.md

- P2-A6: docs/06-qa/plans/00-parity-master.md = **ready for Owner** (gate item 3). 69/69 BRs mapped (22 kept, 42 changed, 5 removed) + areas L/M/N; 141/141 legacy notifications (120 kept, 8 merged, 13 removed), cross-checked by script; X-01…X-20 absence tests; R-xxx not-to-reproduce list; 703 ACs judged (699 testable, 3 need a definition, 1 on Q-097 default). Gaps G-1…G-5 to product-analyst (none blocks the gate). Handoff: docs/handoffs/2026-09-29-qa-engineer-to-orchestrator-p2-a6.md
- P2-C4: docs/05-design/screens/00…08 = **proposed** (gate item 8): home, gig page, gig wizard, project page + proposal form, checkout, order detail, dashboard switcher, chat. Existing components/tokens only; components.md corrected (§9.3 Enter = new line per spec 08 AC-11; §5.3 QuantityInput for revisions; §12 +7 `t_ui_*` strings). Q-105 label applied in the preview. Handoff: docs/handoffs/2026-09-29-ui-ux-designer-to-orchestrator-p2-c4.md

## Next up
- Step 7: P2-B4 openapi.yaml + coverage table (all specs approved; data model ready)
- product-analyst, small: parity gaps G-1 (reconciliation AC, before Slice 4), G-2 ("normal punctuation" set) and G-3 ("similar title" rule), both before Slice 3
- Then Step 8 B5 security review, Step 9 Owner gate

## Decisions waiting for Owner
- Approve ADR-001…016 (as revised in Step 4), the design audit, tokens and components (with the P2-C3 preview) at the Phase 2 gate
- At the gate: the parity master (docs/06-qa/plans/00-parity-master.md) and the key screen layouts (docs/05-design/screens/); one non-blocking design point: checkout column order (screens/00-README.md)
- Done 2026-09-29: specs 15, 16, 17 **approved** (P-106…P-134 accepted, S-127 added); Q-105…Q-108 answered as recommended (Q-105 "მოქმედებები"; Q-106 light plate kept; Q-107 size tokens in Phase 3; Q-108 screenshots optional)
- Q-097: list the legacy admin accounts to migrate and their roles (no recommendation possible; spec 16 AC-8 waits on it, safe default proposed in P-115). Done 2026-09-29: specs 08, 10–13 **approved** (P-66…P-105 accepted); Q-095, Q-096, Q-098…Q-103 accepted as recommended; Q-104 deferred (not a blocker)
- Done 2026-09-28: Q-083…Q-085 and Q-090…Q-094 answered; money specs 05, 06, 07, 09, 14 **approved** (P-38…P-65 accepted; P-46 set spec 04 to quantity always 1; S-125, S-126 added to spec 00, register now 126 rows); "M" mark approved
