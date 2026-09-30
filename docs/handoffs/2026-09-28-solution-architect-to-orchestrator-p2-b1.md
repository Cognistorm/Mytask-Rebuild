# Handoff: solution-architect → orchestrator — P2-B1 architecture + ADRs
Date: 2026-09-28

## What I did
- Wrote `docs/03-architecture/architecture.md` (status proposed): system context and container diagrams (Mermaid), monorepo layout, the "no business logic in clients" rule and how it is enforced, how web/admin/mobile talk to the API (same-origin `/api/v1`, cookies on web, Bearer on mobile), environments (local `docker compose up` first, then staging and production), cross-cutting concerns (auth/2FA/legacy passwords, staff RBAC, i18n with `/en/`, integer-tetri double-entry ledger, versioned settings and Commission & Fee module, DB-deadline timers incl. the fresh-72h restart from Q-071, notifications incl. S-100 admin recipients and Expo push, chat with audited admin visibility, uploads with type/virus checks, search with the Q-069 Premium boost, observability, web-root isolation, secrets), front-end implications from the design audit, and a table showing how R-001…R-006, all high risks and the medium risks are designed out.
- Wrote 16 ADRs, all status "proposed": the 13 from the plan plus ADR-014 (contract-first OpenAPI and generated clients), ADR-015 (environments, hosting proposal, backups, observability) and ADR-016 (mobile payments versus App Store / Google Play billing rules; needs an Owner decision).
- Confirmed the default stack (NestJS + PostgreSQL + Prisma, Next.js, Expo, pnpm + Turborepo). Additions: a separate `apps/admin`, a worker entry point in `apps/api`, `packages/api-client` and `packages/config`, `tools/bog-mock` and `tools/migrate-legacy`, and Caddy as the only public entry point.
- I did not change any business rule. I did not touch `docs/02-specs`, `packages/`, `open-questions.md`, `data-model.md`, `url-map.md` or `openapi.yaml`. I did not commit.

## Files created/changed
- `docs/03-architecture/architecture.md` (new)
- `docs/03-architecture/adr/001-stack-and-monorepo.md` (new)
- `docs/03-architecture/adr/002-auth-sessions-legacy-passwords-2fa.md` (new)
- `docs/03-architecture/adr/003-ledger-and-money.md` (new)
- `docs/03-architecture/adr/004-bog-payments.md` (new)
- `docs/03-architecture/adr/005-configuration-settings-and-fees.md` (new)
- `docs/03-architecture/adr/006-i18n-urls-and-content.md` (new)
- `docs/03-architecture/adr/007-realtime-chat-and-notifications.md` (new)
- `docs/03-architecture/adr/008-background-jobs-and-timers.md` (new)
- `docs/03-architecture/adr/009-file-storage-and-uploads.md` (new)
- `docs/03-architecture/adr/010-admin-app-and-staff-rbac.md` (new)
- `docs/03-architecture/adr/011-search-and-premium-ranking.md` (new)
- `docs/03-architecture/adr/012-analytics-without-third-party-ip-lookup.md` (new)
- `docs/03-architecture/adr/013-web-root-isolation-and-secrets.md` (new)
- `docs/03-architecture/adr/014-api-contract-first-and-generated-clients.md` (new)
- `docs/03-architecture/adr/015-environments-hosting-and-observability.md` (new)
- `docs/03-architecture/adr/016-mobile-payments-and-store-rules.md` (new)
- `docs/handoffs/2026-09-28-solution-architect-to-orchestrator-p2-b1.md` (this file)
- `docs/STATUS.md` (only the P2-B1 line and the Owner-decision line)

## What the next agent must do
- **Owner:** review architecture.md and the ADRs (O-4). Answer the questions below. Each ADR moves to "accepted" when you approve it (gate item 4).
- **Orchestrator:** after the Owner's review, schedule P2-B2 (data-model.md) and P2-B3 (url-map.md) as planned (Step 4). They depend on ADR-003, ADR-005, ADR-006 and ADR-008 being at least reviewed.
- **solution-architect (P2-B2):** implement ADR-003 (journals, entries, per-escrow hold accounts, balance constraints, posting templates per money flow), ADR-005 (`settings`, `setting_versions`, `fee_rules`, `audit_log`), ADR-008 deadline columns and indexes, ADR-002 auth tables (`sessions`, `trusted_devices`, `two_factor_challenges`, `password_algo`, `user.locale`), ADR-006 translation rows with `source`/`source_hash`, ADR-009 `files`, ADR-010 staff/RBAC tables, ADR-011 `search_documents`, ADR-012 analytics tables. `subscription.provider` must allow `bog | points | apple | google | admin_gift` (ADR-016).
- **solution-architect (P2-B4):** apply the ADR-014 conventions and lint rules (`x-permission`, `Money`, `Error`, `CursorPage`, `Idempotency-Key`, BOG webhook with its signature header, `contentLocale`, `isFeatured`, `GET /config/public`, `GET /i18n/{locale}`, `POST /checkout/quote`).
- **product-analyst (specs 01, 03, 05, 09, 15, 16):** spec 01 should use the ADR-002 error cases (pending, banned, restricted, 2FA challenge, throttled); spec 03 must define the Q-069 Premium ranking rule precisely (ADR-011 implements it and does not invent it); spec 05 needs the payment statuses pending/failed/expired (ADR-004); spec 09 should state the Premium purchase methods per platform after the Owner answers Q1 below, and confirm that the wallet cannot buy Premium; spec 15 should list push events (P-11) and whether users may mute non-essential categories; spec 16 approves the default role/permission matrix using the ADR-010 permission names and says whether high-risk staff actions need re-authentication.
- **ui-ux-designer (P2-C2):** export tokens as CSS variables **and** an RN theme object; `packages/ui` has `web` and `native` entry points with shared props and variants (ADR-001). Plan "processing" states for uploads (ADR-009) and "payment pending" states (ADR-004).
- **devops-engineer (Phase 3):** follow ADR-001/013/015: compose services (postgres 17 + pg_trgm + pgvector, redis, minio + init, mailpit, bog-mock, clamav profile), Caddyfile, multi-stage Dockerfiles, `.env.example` with the names from ADR-013 §8, gitleaks pre-commit and CI, `.gitattributes` with `eol=lf`.
- **security-reviewer (P2-B5):** please focus on ADR-002 (cookie + CSRF-header design, refresh rotation), ADR-004 (verification path), ADR-003 (balance trigger logic), ADR-013 §7 (S-110 custom code vs CSP) and ADR-007 (staff chat access).

## Open questions / risks
Questions for the Owner (I did not add them to `open-questions.md`, because the product-analyst owns that file in this step; the orchestrator may copy them there):
1. **Premium in the mobile apps (ADR-016).** Apple and Google require their own billing (15–30% fee) for digital subscriptions sold inside apps. Paying for gigs, projects and offers by BOG card in the app is fine, because these are human services delivered outside the app. Recommendation (option A): at launch, users buy Premium with money on the website only, and the app lets them buy Premium with points and shows their status. Option B: add Apple/Google in-app purchase for Premium later. Which one do you choose?
2. **2FA "new device/IP" (ADR-002).** Mobile phones change IP address often, so "new IP" alone would ask for a code very often. Recommendation: ask for a code when the **device** is new or its 30-day trust has expired. An IP change on a known device does not ask for a code. Do you agree?
3. **Staff reading chats (Q-015, ADR-007).** Staff with the `chat.read` permission can read conversations, and every access is logged. Users should be told this in the terms/privacy text. Please confirm, and provide or approve the wording (legal text is your decision).
4. **Auto-release switched back ON (EC-3, ADR-008).** If auto-release is OFF for a while and then switched back ON, deliveries whose 72h deadline already passed would be released at the next minute. Is that correct? The alternative is that a fresh 72h starts from the moment it is switched back ON.
5. **Custom code setting S-110 (ADR-013 §7).** Admin-entered HTML/JS in the page head/footer weakens the site's script protection (CSP). Proposal: keep it, but only for the Super-admin, only on public pages, and only with script hosts you approve. The other option is to drop it. Which one?
6. **Legacy key rotation (R-001, R-002, R-003).** Before the new system goes live, please rotate (or ask BOG to rotate) the BOG client secret, revoke the Binance key and remove the bot from the old server, revoke the Pusher secret and the findip key, and change the database password that appears in `error_log`. Who will do this, and when? Doing it now would also protect the current live site.
7. **BOG merchant details.** Please ask BOG (or check your merchant documentation) whether your account (a) receives signed callbacks (`Callback-Signature`), and (b) has a test/sandbox environment. Without a sandbox, staging needs real 0.01 GEL test payments, and those need your approval each time.
8. **Admin address.** The proposal is to serve the admin panel at `admin.mytask.ge`, which is a DNS change in Phase 6. Are you OK with a subdomain?
9. **Hosting (ADR-015), decided later in Phase 6.** The proposal is one VPS (about €15–35/month), S3-compatible storage (about €5) and the Cloudflare free plan. You only approve this before Phase 6; I am asking now so you can plan the budget.

Technical risks and notes on rules (no business rule was changed):
- The 72h timer design stores a restart timestamp, which matches Q-071 (a fresh full period). If "remaining time" is ever wanted instead, a column must be added (ADR-008 §1).
- S-087 (allowed types for delivered work) and S-093 (allowed types for appeal files) have no known values. They must be filled before slices 06 and 01/16 ship (Q-068 fallback rule). Proposal: the S-085 list plus common document and design formats. The Owner confirms.
- ClamAV needs about 1.5 GB RAM in production. This is included in the VPS size in ADR-015.
- The BOG API field names (signature presence, saved-card endpoints) are confirmed against the merchant's BOG documentation in slice 05. The design does not depend on them.
- Phase 5 needs a local copy of the production database (already noted in phase-2-plan §7). The ledger opening-balance migration (ADR-003 §11) depends on it.
- Legacy sessions and "remember me" tokens are not migrated, so every user logs in once after cutover. Their passwords keep working (ADR-002).
