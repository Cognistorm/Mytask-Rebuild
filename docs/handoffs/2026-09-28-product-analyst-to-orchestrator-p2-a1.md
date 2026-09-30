## What I did
Task P2-A1 from `docs/03-architecture/phase-2-plan.md`.
- Replaced the kit placeholder `docs/02-specs/README.md` with the spec list 00–17 in build order (Phase 3 core, then Phase 4 slices 1–16), the writing wave for each spec, the status of each (00 = ready for Owner, 01–17 = not started), and the naming, tagging and approval rules.
- Wrote `docs/02-specs/00-platform-rules.md` (status: ready for Owner):
  - Dual role for every user; "Become a seller", `account_type` and single-role settings removed (Q-013).
  - Standard/Premium entitlements table with admin-editable limits for gigs, projects and custom offers (Q-021, Q-060e); Premium-only proposals enforced server-side (Q-020).
  - Settings register: 122 rows (117 global settings + 5 per-code promo/referral fields), each with key, meaning, type/unit, default, source and tag. Includes the Commission & Fee module (withdrawal fee 10%/0%, BOG surcharge 2.5%, future fees OFF at 0), 72h auto-release ON (gigs, projects, custom offers; paused by revisions, refunds and disputes), 48h award acceptance, 2-day refund auto-reject, custom offers (toggle, no approval, 3-day expiry), revisions, renewal reminder (3 days, email + in-app), points (100 = 1 month, 10 per referral), promo-code limits, auth/2FA/social login, moderation toggles, uploads, chat, admin notification recipients (default ir.gvazava@gmail.com), bank transfer OFF, dark mode (light default), content/SEO toggles, KYC provider. Also lists fixed (non-configurable) rules and the legacy settings that are not carried over.
  - Money glossary (available, HOLD/Pending freelancer-only, withdrawn, purchases, points; buyer charged immediately; refunds to wallet at item price).
  - Content i18n rules (ka default, en optional, Latin allowed in Georgian fields, Georgian fallback with HTTP 200, `/en/` prefix, new strings English first with Georgian alongside).
  - Removed features list X-01…X-20, each with its Q-ID (or risk ID for technical removals).
  - 26 testable acceptance criteria, edge cases, and a text table (legacy keys reused, 9 NEW keys with en + ka).
- Unaddressed Owner sub-points are written as PROPOSED P-1…P-6 (Q-061a/c/d, Q-063b, Q-067b, Q-060d), plus P-7…P-13 for parameters that also need approval.
- Added new questions Q-068…Q-072 to `docs/01-discovery/open-questions.md` (table rows + a detailed section).
- Updated the P2-A1 lines in `docs/STATUS.md`.
- Evidence traced in legacy for the register: settings migrations and seeders (`settings_publish`, `settings_media`, `settings_auth`, `settings_withdrawal`, `projects_settings`, `live_chat_settings`, `settings_appearance`, `blog_settings`, `newsletter_settings`, `BogSeeder`, `SubscriptionPlanSeeder`), the surcharge code (`UnifiedCheckoutComponent.php:257-262`, `DepositComponent.php:50-52,189`) and existing i18n keys.

## Files created/changed
- `docs/02-specs/README.md` (replaced)
- `docs/02-specs/00-platform-rules.md` (new)
- `docs/01-discovery/open-questions.md` (added Q-068…Q-072)
- `docs/STATUS.md` (P2-A1 lines only)
- `docs/handoffs/2026-09-28-product-analyst-to-orchestrator-p2-a1.md` (this file)
Nothing committed to git (as instructed).

## What the next agent must do
- **Owner:** review `00-platform-rules.md`; accept or correct P-1…P-13; answer Q-068…Q-072; then mark the spec `approved`.
- **Orchestrator:** start Step 2: P2-A2 (specs 01–04) and P2-B1 (architecture + ADRs). Both can use 00 as it is now. The PROPOSED items affect details, not structure.
- **product-analyst (P2-A2 onwards):** reference settings by register ID + key (e.g. `S-026 escrow.auto_release.hours`); do not create new configurable values outside the register. Add rows to 00 instead. Spec 01 depends on P-4, P-7, P-8 and Q-072; spec 04 on P-1 and Q-068; spec 05 on Q-070; specs 06/11/12/13 on P-2, P-3, P-5 and Q-071; spec 03/08/10 on Q-069.
- **solution-architect (P2-B1/B2):** ADR-005 (configuration) should implement the register: typed values, validation ranges, audit log, versioning for rows marked **V** (fees, prices), per-plan limits with null = unlimited, write-only encrypted storage for the social login keys (Q-032). The ledger (ADR-003) must support the money glossary: HOLD for the freelancer only, no buyer pending, negative migrated balances allowed but no new negatives (R-3.6).

## Open questions / risks
- Q-068…Q-072 are open (see open-questions.md). 55 register defaults are "prod → fallback" because production settings values are unknown. The Phase 5 production DB copy will confirm them.
- Q-032 vs Q-042 tension: the Owner wants social-login keys editable in the Admin Panel (Q-032) but all other API keys only in `.env` (Q-042). The spec follows both literally (social keys in Admin, write-only and encrypted; everything else in `.env`). The security reviewer should confirm this in P2-B5.
- S-110 `appearance.custom_code` (custom HTML/JS in head/footer) is a legacy feature, kept for parity but a script-injection risk. Proposed: Super-admin only; needs security review.
- Q-071 reading risk: if the Owner meant "remaining time" instead of a fresh 72h, the timer design in ADR-008 changes (store remaining seconds rather than a restart timestamp).
- The legacy `t_warning_gigs_limit` / `t_warning_bids_limit` English texts mention "1 gig" and "Premium Plus", which will be wrong once limits are editable. New parameterised keys are proposed in 00.
