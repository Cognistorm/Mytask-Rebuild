# ROADMAP — micro-tasks

Owner rule (2026-09-30): work on **one micro-task at a time**. When it is done and its tests pass:
1. tick it `[x]` here;
2. add one line to `docs/STATUS.md` → "Micro-task log";
3. say which task was done and which single task is next.

A new session starts with: *"Proceed with task X.Y based on docs/ROADMAP.md"*.

**Sources** (a task never invents scope):
- phases: `START-HERE.md`, `docs/03-architecture/phase-3-plan.md`;
- slice order: `docs/02-specs/README.md`;
- API groups: `x-covers` in `docs/04-api/openapi.yaml`;
- screens: each spec's "Screens" table.

**Rules for every task:**
- Stay on the slice branch: `feat/auth` for Phase 3, `feat/<slice-name>` for each Phase 4 slice.
- Finish with tests green: `pnpm typecheck`, `lint`, `test`, and the E2E tests the task touches.
- Commit with `type(scope): summary`.
- A business rule that is unclear stops the task: write the question in `docs/01-discovery/open-questions.md`, tick nothing, report it (CLAUDE.md rule 6).
- A task needing a contract or data-model change goes to the solution-architect first (rule 2).
- QA and security tasks run as their own agents (rule 5: no agent approves its own work).
- A task too big for one step is split into `.a` / `.b` here *before* work starts.

Status keys: `[ ]` open · `[x]` done · `[!]` blocked (reason on the line).

---

## Phase 1 — Discovery ✅ closed
## Phase 2 — Blueprint ✅ closed 2026-09-30 (all specs, ADRs, data model, contract 1.0.0 approved at the gate; nothing remaining)

---

## Phase 3 — Foundation + slice 01 (branch `feat/auth`) ✅ closed 2026-10-02 (PR #1 merged into `main`, CI 10/10 green; gate approved by Owner)

Done so far:
- [x] 3.0.1 P3-1…P3-7 platform core: monorepo, generated types/client, i18n import, app skeletons, local stack, CI, SETUP-LOCAL.
- [x] 3.0.2 Slice 01 part A: register, login, verification, reset, 2FA, sessions (API + web + mobile login/register).
- [x] 3.0.3 Slice 01 part B-1: staff login, IP ban, staff 2FA, admin settings (2FA switches).
- [x] 3.0.4 Slice 01 part B-2a: banned-IP screen, staff own password, activate/ban users, default roles.
- [x] 3.0.5 Slice 01 part B-2b: restrictions + appeals (API, web `/restricted`, mobile, admin `/restrictions`).
- [x] 3.0.6 Slice 01 part B-2c: social login API with SEC-09 binding; provider keys S-065…S-069 in admin (contract 1.2.0).

Remaining:
- [x] 3.1 Security re-review of platform core P3-1…P3-7 (the earlier run hit a usage limit) → `docs/06-qa/security/`. Done: review 03 PASS with conditions (1 Medium SEC-49, 7 Low SEC-50…56).
- [x] 3.2 Fix P3 QA minor findings BUG-04…BUG-08: import-report text, raw sizes, admin title, Playwright server reuse, hand-typed enums.
- [x] 3.3 Fix P3 QA minor findings BUG-09…BUG-14: SETUP-LOCAL notes, `s3-init` check, `/ka/` double redirect, error nits, second agent-rules file, stale docs.
- [x] 3.4 `getPublicConfig` part 1: registry rows for every `PublicConfig` field, using spec 00 defaults (approved values only).
- [x] 3.5 `getPublicConfig` part 2: endpoint + contract/response tests.
- [x] 3.6 Web: social buttons on login/register (from `PublicConfig.socialProviders`) + callback page `/auth/{provider}/callback` + E2E with a fake provider.
- [x] 3.7a Mobile: social login with `expo-auth-session` (app-held PKCE, App Link redirect `{APP_URL}/app-return/auth/{provider}`, intent filter / associated domain, social buttons on login + register, 2FA step shared).
- [x] 3.7b Web: fallback page `/app-return/auth/{provider}` (url-map §7: "open the MyTask app" notice, never processes the code, `noindex`) + E2E. (The `.well-known` App Link files need the store identifiers → Phase 6.)
- [x] 3.8 Web: change password (Account → Password) + E2E.
- [x] 3.9 Web: sessions page `/account/sessions` (list, log out other sessions) + E2E.
- [x] 3.10 Mobile: forgot password + set new password (deep link).
- [x] 3.11 Mobile: resend verification + verify-email deep link.
- [x] 3.12 Mobile: Account → Security (change password, 2FA switch, sessions).
- [x] 3.13 Architect: record data-model gaps `staff.full_name` and the staff re-auth code purpose; add `/auth/password/update` and `/auth/verify` (with and without `/en`) to the App Link claims of url-map §7.2 (spec 01 screens table; app side done in 3.10/3.11).
- [x] 3.14 Architect: P3-9 study on isolating S-110 custom code (note or ADR).
- [x] 3.15 QA parity report for all of slice 01 → `docs/06-qa/reports/` (split, 2026-10-01):
  - [x] 3.15a Test plan `docs/06-qa/plans/01-auth.md` (AC → test case → evidence) + run every automated suite (lint, typecheck, API, web/admin E2E incl. full-stack via `pnpm preview`, mobile export) + API-level checks of the ACs on the running local stack; report part 1.
  - [x] 3.15b Screen parity vs live site and `/legacy/` (web + mobile), i18n check, cross-client check (web ↔ app), bugs + verdict; report complete.
- [x] 3.16 Security review of slice 01 B-1…B-2c, incl. SEC-09 → `docs/06-qa/security/`. Done: review 04 PASS with conditions (1 Medium SEC-57, 4 Low SEC-58…61, Info I-20…24); SEC-09 binding confirmed.
- [x] 3.17 Fix findings from 3.15/3.16 and the web 2FA switch for accounts without a password (emailed code, as mobile 3.12), the staff emailed re-auth code (`twofa_purpose` `staff_reauth`: Prisma enum + migration, `adminRequestReauthCode`, `adminReauthenticate` `method: email_code`; data-model §3.A, recorded in 3.13), plus the QA 3.15 findings (`docs/06-qa/reports/01-auth-2026-10-01.md` §9 + §3: BUG-01 major — login/register legacy link list, subtitle, back-to-home on web + app; BUG-02 register field order; BUG-03 subtitles, back-to-sign-in, page titles; BUG-04 terms text (analyst decides); F-01 mobile reCAPTCHA doc gap; F-02 routed sessions E2E by state; F-04 spec text; F-05 admin aria-label; then QA re-check §10), plus the before-slice-01-done items of review 03 (SEC-39, rest of SEC-35 incl. register limit 10/hour/IP per Q-157, SEC-50, SEC-51, SEC-45 tests), plus security review 04 (`docs/06-qa/security/04-slice-01b-2026-10-01.md` §6): **before merge** SEC-57 points 1–3 + 5 (staff login IP ban: atomic reservation, reset only after full login, IPv6 /64 key, staff write budget; burst + reset tests; point 4 per-account staff counter needs an architect ADR-002 §6 note first); **before slice 01 done** SEC-58 (social callback client kind from `state`), SEC-59 (audit names = contract `x-audit`, write `staff.logout`), SEC-60 (canonical IP bans), and the review 02 items still open: SEC-37 (incl. staff), SEC-41 (+ I-23), SEC-42 per-operation keys, SEC-44, SEC-47 (incl. staff login), SEC-48 replaceState on web reset/verify (split 2026-10-01):
  - [x] 3.17a Backend SEC-57 points 1–3 + 5 (**before merge**): staff login IP counter reserved atomically before the password check, reset only once a session is issued (after 2FA), ban keyed by `ipBucket` (/64) with the helper moved next to the client-IP resolver, staff writes limited to 120/IP-minute; burst + reset tests (probes P1, P2 as permanent tests).
  - [x] 3.17b Backend SEC-60 canonical IP bans + SEC-59 contract audit names (`setting.update`, `ip_ban.create/delete`, `staff.reauth`, write `staff.logout`) with a table test; architect note for SEC-57 point 4 in ADR-002 §6.
  - [x] 3.17c Backend staff emailed re-auth code: `twofa_purpose` `staff_reauth` (Prisma enum + migration), `adminRequestReauthCode`, `adminReauthenticate` `method: email_code`, tests.
  - [x] 3.17d Backend SEC-35 rest (register 10/hour/IP per Q-157; EV-02 cap moved to 3.17l), SEC-42 per-operation keys (S-062, R-A9 by `ipBucket`), SEC-50 limiter placement, SEC-51 path case, SEC-39 body-parser errors.
  - [x] 3.17e Backend SEC-37 (resend never revives a replaced, cancelled or old challenge; password change/reset and 2FA off cancel open challenges, users + staff) + user re-auth codes (`updateMyTwoFactor`, `revokeMyOtherSessions`): an unknown/used/other-purpose challenge answers 422 `TWO_FACTOR_CODE_EXPIRED` (today 404, not in the contract → 500), and the exhausting wrong code counts towards SEC-04 (found in 3.17c). (3.17e split 2026-10-01 into e, m, n.)
  - [x] 3.17m Architect + backend SEC-41 + I-23: `remember_me` on the session row (data-model + migration), carried through the 2FA challenge and used on every refresh; social login per I-23.
  - [x] 3.17n Backend SEC-47 (reCAPTCHA `action` + `hostname`, incl. staff login) + SEC-58 (social delivery and session client kind from the stored `state` client, P3 test).
  - [x] 3.17f SEC-45 tests (env tests SMTP_URL / SETTINGS_ENCRYPTION_KEY / memory:// / log; P4) + SEC-44 (server lost-race rule, client signs out only on 401).
  - [x] 3.17g Web: 2FA switch for accounts without a password (emailed code, as mobile 3.12) + SEC-48 replaceState on `auth/password/update` and `auth/verify` + F-05 admin aria-label.
  - [x] 3.17h Web + app: BUG-01 (legacy link list, subtitle, back-to-home on login/register), BUG-02 register field order, BUG-03 (subtitles, back-to-sign-in, page titles).
  - [x] 3.17i Analyst/docs: BUG-04 terms text decision, F-04 spec text, F-01 mobile reCAPTCHA doc gap; F-02 routed sessions E2E by state.
  - [x] 3.17j QA re-check report §10 → §11 of `docs/06-qa/reports/01-auth-2026-10-01.md`: **PASS with notes** (BUG-01…04, F-01, F-02, F-04, F-05 closed; new minor BUG-05, BUG-06 → 3.17o; DEV-M1 for the Owner).
  - [x] 3.17k Security re-check → review 05 `docs/06-qa/security/05-slice-01-recheck-2026-10-01.md`: **PASS** (merge allowed; slice 01 done from security; 5 Info I-25…I-29).
  - [x] 3.17l EV-02 admin email switch + hourly cap (SEC-35, Owner Q-159 (a)): register rows S-131 (switch, ON) and S-132 (cap, default 20), editable in Admin → Settings → Notifications (cap field disabled while the switch is OFF).
  - [x] 3.17o Web + app QA BUG-05 (privacy + terms in the register link list) and BUG-06 (web register checkbox layout); E2E assertions added.
- [x] 3.18 Open PR `feat/auth` → `main`, CI green (Owner merges). 2026-10-01: branch pushed (`15ea8eb9`, all 3.17 work); the GitHub CLI is not installed and the repo is private, so the Owner opens the PR at https://github.com/Cognistorm/Mytask-Rebuild/compare/main...feat/auth and checks CI (incl. the new SEC-45 Caddy probe in the `docker` job). 2026-10-02: PR #1 merged, CI 10/10 green (oasdiff step skips when `main` has no contract yet, `a137a4bb`).
- [x] 3.19 **Phase 3 gate (Owner):** register / log in / log out on web and app; approve. 2026-10-02: approved by Owner.

---

## Phase 4 — Features (one slice at a time; order from `docs/02-specs/README.md`)

**Standard tail of every slice** (numbered at the end of each slice below):
- E2E main flows;
- QA parity report;
- security review (when the slice touches auth, money, personal data, uploads or permissions);
- fixing findings;
- PR + CI + STATUS;
- Owner click-through.

### 4.0 Before slice 1 — ADR-019 follow-ups (Owner Q-158 (a), 2026-10-01)
- [x] 4.0.1 Architect + analyst: contract `422 CUSTOM_CODE_HOST_DENIED` on `adminUpdateSetting` / `adminRestoreSettingVersion` (additive) + i18n `t_custom_code_host_denied` (en + ka); spec 16 AC-73 (full page load at the public/private boundary) and AC-74 (built-in deny list). Done 2026-10-02: contract 1.3.0, branch `feat/adr-019-followups`.
- [x] 4.0.2 Web: split `apps/web/src/app/[locale]` into public and private root layouts (ADR-019 §2) + E2E (custom-code marker gone after navigating to `/auth/login` and `/account`; private CSP has no S-127 host). Done 2026-10-02: `(public)` / `(private)` root layouts, nonce CSP in the proxy (S-127 hosts on public paths only), `e2e/custom-code.spec.ts` with a stand-in API. **4.0 complete.**

### 4.1 Slice 1 — spec 02 Profiles and dashboards (branch `feat/profiles`)
- [x] 4.1.1 Spec check: spec 02 vs contract ops and screens; list gaps/questions (no code). Done 2026-10-02: contract complete (35 API ACs all covered), no contract/data-model change, no new Owner question; task gaps added to 4.1.7–4.1.15 below; neutral values for later-slice data; see `docs/handoffs/2026-10-02-orchestrator-to-backend-web-mobile-4-1-1-spec-02-check.md`.
- [x] 4.1.2 `packages/ui`: move shared form pieces (Field, TextArea, Submit, Alert, CodeInput) out of apps/web and apps/admin. Done 2026-10-02: new `@mytask/ui/web` (`packages/ui/src/web/form.tsx` + `form.css`); `AuthCard` stays per app; class names unchanged.
- [x] 4.1.3 Files F0 part 1 (ADR-009/017): `files` table, S3 client, `createFileUpload`, `completeFileUpload`, `getFile`, `deleteFile` + tests. Done 2026-10-02: purposes avatar / portfolio_image / kyc_document enabled (others 403 until their slice); presigned POST + GET proven on SeaweedFS 4.48 (ADR-017 §3, no fallback needed); see `docs/handoffs/2026-10-02-backend-engineer-to-backend-qa-security-4-1-3-files-f0-part-1.md`.
- [x] 4.1.4 Files F0 part 2: worker pipeline — magic bytes, ClamAV with limits ≥ 100 MB (Q-154), `sharp` variants, ready/rejected. Done 2026-10-02: files-scan sweeper in the worker (Redis lease per file, back-off retries) instead of a BullMQ queue; public images → WebP thumb/medium/large in `public_media`, KYC re-encoded in `kyc`; 24 h cleanup of unused `pending` uploads; `file.processed` waits for the realtime gateway (slice 08); see `docs/handoffs/2026-10-02-backend-engineer-to-backend-qa-security-4-1-4-files-f0-part-2.md`.
- [x] 4.1.5 Files F0 part 3: `getFileDownload` signed URLs + `adminCreateFileUpload`, `adminGetFile`, `adminCompleteFileUpload`. Done 2026-10-02: owner-only downloads plus a pluggable `FileDownloadAccess` for the later slices' party rules; 302 or JSON, `no-store`, 5 min (KYC 2 min); staff purposes category_image / blog_image / home_logo per Q-161 (legacy types, no SVG, ≤ 5 MB) with the purpose's permission; see `docs/handoffs/2026-10-02-backend-engineer-to-backend-qa-security-4-1-5-files-f0-part-3.md`.
- [x] 4.1.6 Appeal files (split 2026-10-02 into a/b):
  - [x] 4.1.6a API: registry S-091…S-093 (Q-154 values; rows already in the registry since 3.x); `appeal_file` purpose; appeal with `fileIds`; `adminGetRestrictionAppealFileDownload`. Done 2026-10-02: table `restriction_appeal_files`; S-092/S-093 checked at upload, 1…S-091 own ready files on the appeal; files shown in user and admin appeal views; attached files cannot be deleted; staff download audited (`restriction_appeal.file_view`); restricted users do not download their own appeal files (Owner 2026-10-02); see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-6a-appeal-files-api.md`.
  - [x] 4.1.6b Web + mobile file picker in the appeal form (web `/restricted`, mobile `restricted.tsx`: camera or files), upload → complete → poll `getFile` → send `fileIds`; admin appeal queue (`apps/admin/src/app/restrictions/page.tsx`) lists the files with a download link (`adminGetRestrictionAppealFileDownload`). No download for the user. Done 2026-10-02: shared `uploadFile` in `@mytask/api-client`; web CSP `connect-src` allows the storage origin (`S3_PUBLIC_ENDPOINT`); see `docs/handoffs/2026-10-02-web-mobile-engineer-to-qa-security-4-1-6b-appeal-file-picker.md`.
- [x] 4.1.7 Data model spec 02: profiles, languages, skills, availability, portfolio, KYC + migration; registry rows S-071, S-122; the 35 missing spec 02 i18n keys (en + ka). Done 2026-10-02: migration `20261002220000_profiles` (§3.B tables incl. `countries` — only Georgia for now, Owner 2026-10-02 — and `reports`); `kyc_verifications.decline_reason` added by the architect (contract `KycVerification.declineReason`); 31 keys were missing (the 4 Q-117 keys already existed); see `docs/handoffs/2026-10-02-backend-engineer-to-backend-qa-4-1-7-spec-02-data-model.md`.
- [x] 4.1.8a API: `getMyProfile`, `updateMyProfile`, `getUserProfile` (neutral values for later slices, timezone fallback `Asia/Tbilisi`), `putMyAvatar`, `deleteMyAvatar`. Done 2026-10-02: module `profiles`; new `@OptionalUser()` guard mode (bad or missing session = guest); `Me.avatar` filled everywhere (`AvatarReader`); old avatar file deleted with compare-and-set; current avatar answers 409 on `deleteFile`; `isOnline` reads `last_activity_at` (written in 4.1.8b); see `docs/handoffs/2026-10-02-backend-engineer-to-backend-web-qa-4-1-8a-profile-api.md`.
- [x] 4.1.8b API: online status (R-P4: `last_activity_at` ≤ 1/min + Redis presence on authenticated requests → `isOnline`) + `createUserReport` (EV-13). Done 2026-10-02: `PresenceService` in the auth guard (Redis gate per minute, presence key 10 min, column in the background, `online()` for lists with a DB fallback); report 201 first / 200 replace (back to `pending`), EV-13 email template + outbox on every report (legacy), shared SEC-23 `ReportLimiter` (10/h for all four report ops); see `docs/handoffs/2026-10-02-backend-engineer-to-backend-web-qa-4-1-8b-presence-and-user-report.md`.
- [x] 4.1.9 API: languages + skills CRUD (6 ops), `putMyLinkedAccounts`. Done 2026-10-02: trimmed names, case-insensitive duplicates → 409 DUPLICATE (also on rename), others' rows 404; linked accounts replace all seven, S-123 OFF → 403, only http/https URLs; new `platform/slug.ts` = legacy `Str::slug` with the Georgian table checked against live slugs (reusable for gigs, ADR-006 §8); see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-9-skills-languages-linked-accounts.md`.
- [x] 4.1.10 API: `putMyAvailability`, `deleteMyAvailability` + daily job `availability-reset` (AC-23). Done 2026-10-02: date = start of that day in Asia/Tbilisi (legacy midnight), earliest tomorrow; trimmed message; worker `AvailabilityResetSweeper` (start + hourly, idempotent; readers already hide a passed date); see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-10-availability.md`.
- [ ] 4.1.11 API: `updateMe`, `confirmEmailChange`, `updateMyPreferences`, `deleteMe` (pluggable guards: later money slices add theirs) + `createMyTwoFactorChallenge` purpose `email_change` (AC-29, Q-144).
- [ ] 4.1.12 API: portfolio `list/create/lookup/get/update/delete` + admin `adminListPortfolioItems`, `adminGetPortfolioItem`, `adminApprovePortfolioItem`, `adminRejectPortfolioItem`, `adminRemovePortfolioItem`.
- [ ] 4.1.13 API KYC:
  - user: `createKycVerification`, `getMyKyc`;
  - staff: `adminListKycVerifications`, `adminGetKycVerification`, `adminApproveKycVerification`, `adminDeclineKycVerification`, `adminGetKycFileDownload`.
- [ ] 4.1.14 API: `getSellingDashboard`.
- [ ] 4.1.15 Spec 02 notifications (email templates via outbox): EV-11…EV-18, EV-126 (EV-13 already done in 4.1.8b); in-app + push of EV-15/17/18/126 come in 4.14.
- [ ] 4.1.16 Web: dashboard shell + switcher, Selling Home, Buying dashboard.
- [ ] 4.1.17 Web: public profile + portfolio list/item.
- [ ] 4.1.18 Web: edit profile + availability modal.
- [ ] 4.1.19 Web: portfolio create/edit.
- [ ] 4.1.20 Web: account settings + verification centre + report user.
- [ ] 4.1.21 Admin: portfolio queue + KYC queue.
- [ ] 4.1.22 Mobile: dashboard shell/switcher + home screens.
- [ ] 4.1.23 Mobile: public profile, edit profile, availability.
- [ ] 4.1.24 Mobile: portfolio + account settings + verification centre.
- [ ] 4.1.25 E2E main flows.
- [ ] 4.1.26 QA parity report.
- [ ] 4.1.27 Security review (personal data, uploads, KYC).
- [ ] 4.1.28 Fix findings.
- [ ] 4.1.29 PR + CI + STATUS.
- [ ] 4.1.30 Owner click-through.

### 4.2 Slice 2 — spec 03 Categories and search (branch `feat/catalog-search`)
- [ ] 4.2.1 Spec check.
- [ ] 4.2.2 Data model: gig categories (3 levels), project categories, skills + seed.
- [ ] 4.2.3 API: `listCategories`, `lookupCategory`, `getCategory`, `listProjectCategories`, `lookupProjectCategory`.
- [ ] 4.2.4 API: `searchGigs`, `listGigs` (ranking, Premium "Featured").
- [ ] 4.2.5 API: `searchProjects`, `listSellers`, `listHireSellers`.
- [ ] 4.2.6 API: `getHome`.
- [ ] 4.2.7 API admin: gig category CRUD (`adminListCategories`… 5 ops).
- [ ] 4.2.8 API admin: project categories + skills CRUD.
- [ ] 4.2.9 Web: header category menu + category page.
- [ ] 4.2.10 Web: search results + gig card.
- [ ] 4.2.11 Web: `/sellers`, `/hire/{keyword}`, explore projects.
- [ ] 4.2.12 Web: home gig rows.
- [ ] 4.2.13 Admin: catalog screens.
- [ ] 4.2.14 Mobile: browse + search.
- [ ] 4.2.15 Mobile: category pages.
- [ ] 4.2.16 E2E.
- [ ] 4.2.17 QA.
- [ ] 4.2.18 Fix findings.
- [ ] 4.2.19 PR + STATUS.
- [ ] 4.2.20 Owner click-through.

### 4.3 Slice 3 — spec 04 Gigs (branch `feat/gigs`)
- [ ] 4.3.1 Spec check.
- [ ] 4.3.2 Data model: gigs, packages, upgrades, gallery, favourites, reports, views.
- [ ] 4.3.3 API: `createGig`, `getGigCreationEligibility`, `updateGig`, `deleteGig`.
- [ ] 4.3.4 API: `getGig`, `lookupGig`, `getGigOwnerView`, `listMyGigs`.
- [ ] 4.3.5 API: `listRelatedGigs` (P-137), `recordGigView`, `getGigAnalytics`.
- [ ] 4.3.6 API: `listFavorites`, `putFavorite`, `deleteFavorite`, `createGigReport`.
- [ ] 4.3.7 API admin: `adminPublishGig`, `adminRejectGig`, `adminListGigs`, `adminGetGig`, `adminRemoveGig`, `adminRestoreGig`.
- [ ] 4.3.8 Spec 04 notifications.
- [ ] 4.3.9 Web: create/edit wizard, first half.
- [ ] 4.3.10 Web: create/edit wizard, second half.
- [ ] 4.3.11 Web: gig page + share + report dialogs.
- [ ] 4.3.12 Web: my gigs + analytics + favourites.
- [ ] 4.3.13 Admin: gig moderation queue.
- [ ] 4.3.14 Mobile: gig page.
- [ ] 4.3.15 Mobile: create/edit wizard.
- [ ] 4.3.16 Mobile: my gigs + favourites.
- [ ] 4.3.17 E2E.
- [ ] 4.3.18 QA.
- [ ] 4.3.19 Security (uploads).
- [ ] 4.3.20 Fix findings.
- [ ] 4.3.21 PR + STATUS.
- [ ] 4.3.22 Owner click-through.

### 4.4 Slice 4 — spec 05 Payments and wallet (branch `feat/payments`) — money: security review mandatory
- [ ] 4.4.1 Spec check.
- [ ] 4.4.2 Data model: ledger core (accounts, journals, entries).
- [ ] 4.4.3 Data model: payments, saved cards, billing, fee rules.
- [ ] 4.4.4 Ledger service + double-entry invariant tests.
- [ ] 4.4.5 Fee-rules engine + admin fee-rule API (7 ops incl. preview, versions, restore).
- [ ] 4.4.6 BOG client + bog-mock behaviour.
- [ ] 4.4.7 API: `createCheckoutQuote`, `createPayment`, `getPayment`.
- [ ] 4.4.8 API: `handleBogWebhook` (signature, idempotency, SEC-31 caps).
- [ ] 4.4.9 API: `getWallet`, `listWalletHolds`, `listWalletTransactions`, top-up.
- [ ] 4.4.10 API: `getBillingProfile`, `putBillingProfile`, `listSavedCards`, `deleteSavedCard`.
- [ ] 4.4.11 API admin payments:
  - `adminListPayments`, `adminGetPayment`, `adminCheckPaymentStatus`, `adminMarkPaymentReviewed`;
  - bank transfers: list, confirm, reject.
- [ ] 4.4.12 API admin: `adminCreateLedgerAdjustment`, `adminCreatePointsAdjustment`.
- [ ] 4.4.13 Nightly reconciliation job + `adminListReconciliationRuns`, `adminGetReconciliationRun`, `adminListReconciliationDifferences`, `adminMarkReconciliationDifferenceReviewed` (P-135).
- [ ] 4.4.14 Spec 05 notifications.
- [ ] 4.4.15 Web: checkout payment block + payment result page.
- [ ] 4.4.16 Web: top up + earnings/balances + transactions.
- [ ] 4.4.17 Web: payment methods + billing.
- [ ] 4.4.18 Admin: payments + bank transfers.
- [ ] 4.4.19 Admin: balance/points adjustments + fee-rules editor.
- [ ] 4.4.20 Admin: reconciliation.
- [ ] 4.4.21 Mobile: payment flow (system browser) + result.
- [ ] 4.4.22 Mobile: wallet + transactions + cards.
- [ ] 4.4.23 E2E with bog-mock.
- [ ] 4.4.24 QA.
- [ ] 4.4.25 Security review.
- [ ] 4.4.26 Fix findings.
- [ ] 4.4.27 PR + STATUS.
- [ ] 4.4.28 Owner click-through.

### 4.5 Slice 5 — spec 06 Gig orders (branch `feat/gig-orders`) — money
- [ ] 4.5.1 Spec check.
- [ ] 4.5.2 Data model: cart, orders, order items, escrows, deliveries, revisions.
- [ ] 4.5.3 API: `getCart`, `putCartItem`, `deleteCartItem`, `mergeCart`, `previewCart`.
- [ ] 4.5.4 API: checkout → order + escrow hold (uses slice 4 payments).
- [ ] 4.5.5 API: `listOrderItems`, `lookupOrderItem`, `getOrder`, `getOrderItem`, `deleteOrder`.
- [ ] 4.5.6 API: `putOrderItemRequirements`, `startOrderItem`, `cancelOrderItem`.
- [ ] 4.5.7 API: `getEscrow`, `listEscrowDeliveries`, `createEscrowDelivery`, `listEscrowRevisionRequests`, `createEscrowRevisionRequest`, `completeEscrow`.
- [ ] 4.5.8 Auto-release job + delivery thread.
- [ ] 4.5.9 API admin:
  - `adminListOrderItems`, `adminGetOrder`, `adminGetOrderItem`;
  - `adminListEscrows`, `adminGetEscrow`, `adminListEscrowRevisionRequests`, `adminDownloadEscrowFile`.
- [ ] 4.5.10 Spec 06 notifications.
- [ ] 4.5.11 Web: cart + checkout.
- [ ] 4.5.12 Web: buyer order item.
- [ ] 4.5.13 Web: freelancer order item.
- [ ] 4.5.14 Web: order lists.
- [ ] 4.5.15 Admin: orders + escrows.
- [ ] 4.5.16 Mobile: cart + checkout.
- [ ] 4.5.17 Mobile: order item (both roles) + lists.
- [ ] 4.5.18 E2E.
- [ ] 4.5.19 QA.
- [ ] 4.5.20 Security review.
- [ ] 4.5.21 Fix findings.
- [ ] 4.5.22 PR + STATUS.
- [ ] 4.5.23 Owner click-through.

### 4.6 Slice 6 — spec 07 Reviews (branch `feat/reviews`)
- [ ] 4.6.1 Spec check.
- [ ] 4.6.2 Data model: reviews, rating aggregates.
- [ ] 4.6.3 API: `createReview`, `updateReview`, `getReviewEligibility`, `listReviewableItems`.
- [ ] 4.6.4 API: `listReviews`, `getReview`, `getUserReviewSummary`.
- [ ] 4.6.5 API admin: `adminListReviews`, `adminGetReview`, `adminHideReview`, `adminUnhideReview`.
- [ ] 4.6.6 Spec 07 notifications.
- [ ] 4.6.7 Web: review form + edit.
- [ ] 4.6.8 Web: gig Reviews tab + `/reviews/{gig}`.
- [ ] 4.6.9 Web: profile rating blocks + my reviews / reviews + review details.
- [ ] 4.6.10 Admin: reviews.
- [ ] 4.6.11 Mobile: review form + lists.
- [ ] 4.6.12 E2E.
- [ ] 4.6.13 QA.
- [ ] 4.6.14 Fix findings.
- [ ] 4.6.15 PR + STATUS.
- [ ] 4.6.16 Owner click-through.

### 4.7 Slice 7 — spec 08 Messaging (branch `feat/messaging`)
- [ ] 4.7.1 Spec check.
- [ ] 4.7.2 Realtime gateway (websocket, events map in `packages/types`).
- [ ] 4.7.3 Data model: conversations, messages, attachments, read state.
- [ ] 4.7.4 API: `listConversations`, `createConversation`, `getConversation`, `updateConversation`, `lookupConversation`, `getConversationUnreadSummary`.
- [ ] 4.7.5 API: `listConversationMessages`, `createConversationMessage`, `deleteConversationMessage`, `markConversationRead` + remaining message ops.
- [ ] 4.7.6 API: `listConversationAttachments` + chat file purpose.
- [ ] 4.7.7 Offline email + push hook (spec 08 notifications).
- [ ] 4.7.8 API admin: 7 conversation ops (read-only access, audited).
- [ ] 4.7.9 Web: inbox list.
- [ ] 4.7.10 Web: conversation + info panel.
- [ ] 4.7.11 Admin: conversations.
- [ ] 4.7.12 Mobile: inbox.
- [ ] 4.7.13 Mobile: conversation.
- [ ] 4.7.14 E2E.
- [ ] 4.7.15 QA.
- [ ] 4.7.16 Security (personal data, staff access).
- [ ] 4.7.17 Fix findings.
- [ ] 4.7.18 PR + STATUS.
- [ ] 4.7.19 Owner click-through.

### 4.8 Slice 8 — spec 09 Subscriptions, points, referrals, promo codes (branch `feat/subscriptions`) — money
- [ ] 4.8.1 Spec check.
- [ ] 4.8.2 Data model: plans, subscriptions, points ledger, referral benefits, promo codes.
- [ ] 4.8.3 API: `listPlans`, `getCurrentSubscription`, `cancelSubscription`, `resumeSubscription`.
- [ ] 4.8.4 Premium by card + auto-renew job + renewal reminder.
- [ ] 4.8.5 API: `purchaseSubscriptionWithPoints`, `getPointsSummary`, `listPointsHistory`.
- [ ] 4.8.6 API: `listReferrals`, `getReferralSummary`, `listPayments`; implement `ReferralService.creditSignup` (slice 01 hook, currently a no-op) and credit every referral still `pending` for an already active user exactly once (QA 3.15a D-1).
- [ ] 4.8.7 API admin: `adminListPlans`, `adminUpdatePlan`, `adminListSubscriptions`, `adminGiftSubscription` (+ cancel).
- [ ] 4.8.8 API admin: promo codes CRUD + redemptions.
- [ ] 4.8.9 API admin: referral benefits CRUD, `adminListReferrals`, `adminListPointsHistory`.
- [ ] 4.8.10 Spec 09 notifications.
- [ ] 4.8.11 Web: plans + Premium checkout.
- [ ] 4.8.12 Web: my subscription + points + referrals.
- [ ] 4.8.13 Admin: plans, promo codes, referral benefits, subscriptions.
- [ ] 4.8.14 Mobile: plans/subscription within store rules (ADR-016).
- [ ] 4.8.15 Mobile: points + referrals.
- [ ] 4.8.16 E2E.
- [ ] 4.8.17 QA.
- [ ] 4.8.18 Security review.
- [ ] 4.8.19 Fix findings.
- [ ] 4.8.20 PR + STATUS.
- [ ] 4.8.21 Owner click-through.

### 4.9 Slice 9 — spec 10 Projects (branch `feat/projects`)
- [ ] 4.9.1 Spec check.
- [ ] 4.9.2 Data model: projects, skills link, reports, views.
- [ ] 4.9.3 API: `createProject`, `updateProject`, `deleteProject`, `closeProject`.
- [ ] 4.9.4 API: `listProjects`, `lookupProject`, `getProject` (masking), `recordProjectView`, `createProjectReport`.
- [ ] 4.9.5 Moderation with auto-approve + admin: `adminApproveProject`, `adminRejectProject`, `adminHideProject`, `adminUnhideProject`, `adminListProjects`, `adminGetProject`.
- [ ] 4.9.6 Category emails job + spec 10 notifications.
- [ ] 4.9.7 Web: post/edit project.
- [ ] 4.9.8 Web: project page + report dialog.
- [ ] 4.9.9 Web: Buying → Projects.
- [ ] 4.9.10 Admin: project moderation.
- [ ] 4.9.11 Mobile: project page + post/edit.
- [ ] 4.9.12 E2E.
- [ ] 4.9.13 QA.
- [ ] 4.9.14 Security (masking, personal data).
- [ ] 4.9.15 Fix findings.
- [ ] 4.9.16 PR + STATUS.
- [ ] 4.9.17 Owner click-through.

### 4.10 Slice 10 — spec 11 Proposals and hiring (branch `feat/proposals`) — money
- [ ] 4.10.1 Spec check.
- [ ] 4.10.2 Data model: proposals, awards, contracts.
- [ ] 4.10.3 API: `createProposal`, `updateProposal`, `withdrawProposal`, `getProposalEarnings`, `createProposalReport` (Premium gate server-side).
- [ ] 4.10.4 API: `listProposals`, `getProposal`, `listProjectProposals`.
- [ ] 4.10.5 API: `createAward`, `acceptAward`, `declineAward`, `revokeAward`, `listAwards`, `getAward` + 48 h expiry job.
- [ ] 4.10.6 API: `listContracts`, `lookupContract`, `getContract`, `cancelContract` + escrow payment.
- [ ] 4.10.7 Contract delivery, revisions, completion, 72 h auto-release, project thread.
- [ ] 4.10.8 API admin: `adminApproveProposal`, `adminRejectProposal`, `adminListProposals`, `adminGetProposal`, `adminListContracts`, `adminGetContract`.
- [ ] 4.10.9 Project reviews hook (spec 07) + spec 11 notifications.
- [ ] 4.10.10 Web: proposal form + proposals section.
- [ ] 4.10.11 Web: Selling → Proposals / Projects + accept/decline award.
- [ ] 4.10.12 Web: payment page + client/freelancer work pages.
- [ ] 4.10.13 Admin: proposals + contracts.
- [ ] 4.10.14 Mobile: proposals + awards.
- [ ] 4.10.15 Mobile: work pages.
- [ ] 4.10.16 E2E.
- [ ] 4.10.17 QA.
- [ ] 4.10.18 Security review.
- [ ] 4.10.19 Fix findings.
- [ ] 4.10.20 PR + STATUS.
- [ ] 4.10.21 Owner click-through.

### 4.11 Slice 11 — spec 12 Custom offers (branch `feat/custom-offers`) — money
- [ ] 4.11.1 Spec check.
- [ ] 4.11.2 Data model: offer requests, offers.
- [ ] 4.11.3 API requests: `listCustomOfferRequests`, `createCustomOfferRequest`, `getCustomOfferRequest`, `cancelCustomOfferRequest`, `declineCustomOfferRequest`.
- [ ] 4.11.4 API offers: `createCustomOffer`, `previewCustomOffer`, `listCustomOffers`, `lookupCustomOffer`, `getCustomOffer`, `cancelCustomOffer` + remaining ops.
- [ ] 4.11.5 Pay = accept → escrow HOLD, 3-day expiry job, toggle S-034.
- [ ] 4.11.6 Offer delivery, revisions, auto-release, cancel.
- [ ] 4.11.7 API admin:
  - `adminListCustomOffers`, `adminListCustomOfferApprovalQueue`, `adminGetCustomOffer`;
  - approve / reject;
  - `adminDownloadCustomOfferFile`, `adminReleaseEscrow`, `adminRefundEscrow`.
- [ ] 4.11.8 Spec 12 notifications.
- [ ] 4.11.9 Web: offer form + request form + offer card in chat.
- [ ] 4.11.10 Web: offer checkout + offer page.
- [ ] 4.11.11 Web: Buying/Selling → Offers.
- [ ] 4.11.12 Admin: custom offers.
- [ ] 4.11.13 Mobile: offers.
- [ ] 4.11.14 E2E.
- [ ] 4.11.15 QA.
- [ ] 4.11.16 Security review.
- [ ] 4.11.17 Fix findings.
- [ ] 4.11.18 PR + STATUS.
- [ ] 4.11.19 Owner click-through.

### 4.12 Slice 12 — spec 13 Refunds, disputes, unblock requests (branch `feat/refunds`) — money
- [ ] 4.12.1 Spec check.
- [ ] 4.12.2 Data model: refund requests, disputes, unblock requests, refund threads.
- [ ] 4.12.3 API: `createRefundRequest`, `acceptRefundRequest`, `declineRefundRequest`, `closeRefundRequest`.
- [ ] 4.12.4 API: `listRefundRequests`, `lookupRefundRequest`, `getRefundRequest` + 2-day auto-reject job.
- [ ] 4.12.5 API: `createDispute` + admin `adminListDisputes`, `adminGetDispute`, `adminResolveDispute`, `adminGetRefundRequest`, `adminListRefundRequests`.
- [ ] 4.12.6 API unblock:
  - user: `createUnblockRequest`, `listUnblockRequests`, `getUnblockRequest`;
  - staff: approve, reject, list, get.
- [ ] 4.12.7 API: `adminListEscrowDeliveries` + staff release/refund tools on all order types.
- [ ] 4.12.8 Spec 13 notifications.
- [ ] 4.12.9 Web: request refund form + refund page.
- [ ] 4.12.10 Web: unblock request form + list + refund lists.
- [ ] 4.12.11 Admin: disputes, unblock requests, money actions.
- [ ] 4.12.12 Mobile: refunds + unblock.
- [ ] 4.12.13 E2E.
- [ ] 4.12.14 QA.
- [ ] 4.12.15 Security review.
- [ ] 4.12.16 Fix findings.
- [ ] 4.12.17 PR + STATUS.
- [ ] 4.12.18 Owner click-through.

### 4.13 Slice 13 — spec 14 Withdrawals (branch `feat/withdrawals`) — money
- [ ] 4.13.1 Spec check.
- [ ] 4.13.2 Data model: payout details, withdrawals.
- [ ] 4.13.3 API: `getPayoutDetails`, `putPayoutDetails` (password or emailed code; S-129 pause).
- [ ] 4.13.4 API: `createWithdrawalQuote`, `createWithdrawal`, `listWithdrawals`, `getWithdrawal`.
- [ ] 4.13.5 API admin: `adminListWithdrawals`, `adminGetWithdrawal`, `adminMarkWithdrawalPaid`, `adminRejectWithdrawal` (refund).
- [ ] 4.13.6 Spec 14 notifications.
- [ ] 4.13.7 Web: withdrawals history + withdraw form + payout settings.
- [ ] 4.13.8 Admin: withdrawals.
- [ ] 4.13.9 Mobile: withdrawals + payout settings.
- [ ] 4.13.10 E2E.
- [ ] 4.13.11 QA.
- [ ] 4.13.12 Security review.
- [ ] 4.13.13 Fix findings.
- [ ] 4.13.14 PR + STATUS.
- [ ] 4.13.15 Owner click-through.

### 4.14 Slice 14 — spec 15 Notifications completion (branch `feat/notifications`)
- [ ] 4.14.1 Spec check + audit: all 129 events vs what slices built.
- [ ] 4.14.2 Data model: in-app notifications, preferences, push tokens, deliveries.
- [ ] 4.14.3 API: `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `getNotificationUnreadCount`.
- [ ] 4.14.4 API: `getNotificationPreferences`, `updateNotificationPreferences`, `unsubscribeNotificationEmail`.
- [ ] 4.14.5 API: `putPushToken`, `deletePushToken` + push sender.
- [ ] 4.14.6 `handleSendGridWebhook` + rate caps.
- [ ] 4.14.7 API admin: `adminSendTestEmail`, `adminListNotificationDeliveries`, `adminRetryNotificationDelivery`.
- [ ] 4.14.8 Missing event templates (from 4.14.1).
- [ ] 4.14.9 Web: bell + dropdown + notification centre.
- [ ] 4.14.10 Web: notification settings + unsubscribe landing + final email layout.
- [ ] 4.14.11 Admin: S-100 editor, test email, delivery log.
- [ ] 4.14.12 Mobile: push pre-prompt + centre + settings.
- [ ] 4.14.13 E2E.
- [ ] 4.14.14 QA.
- [ ] 4.14.15 Fix findings.
- [ ] 4.14.16 PR + STATUS.
- [ ] 4.14.17 Owner click-through.

### 4.15 Slice 15 — spec 16 Admin panel, remaining modules (branch `feat/admin-panel`)
- [ ] 4.15.1 Spec check: list the admin ops not yet built by earlier slices.
- [ ] 4.15.2 API admin auth remaining: password reset/set, validate token, email change (re-auth code done in 3.17c); staff per-account slow mode (ADR-002 §6, SEC-57 point 4).
- [ ] 4.15.3 API staff: `adminListStaff`, `adminCreateStaff`, `adminGetStaff`, disable/enable, end sessions, resend invitation.
- [ ] 4.15.4 API roles: `adminListPermissions`, `adminListRoles`, `adminCreateRole`, `adminGetRole`, `adminUpdateRole`, `adminDeleteRole`.
- [ ] 4.15.5 API audit: `adminListAuditEntries`, `adminGetAuditEntry`, `adminExportAuditLog`.
- [ ] 4.15.6 API users part 1: `adminListUsers`, `adminGetUser`, `adminUpdateUser`, `adminDeleteUser`, `adminRestoreUser`.
- [ ] 4.15.7 API users part 2: avatar delete, disable 2FA, change email, send email, reset trusted devices, revoke sessions.
- [ ] 4.15.8 API: dashboard KPIs (3 ops) + analytics widget/export + `ingestAnalyticsEvents`.
- [ ] 4.15.9 API reports queue (5 ops).
- [ ] 4.15.10 API translations (4 ops).
- [ ] 4.15.11 API system: logs, health, refresh caches.
- [ ] 4.15.12 API: maintenance (3 ops) + settings history/restore.
- [ ] 4.15.13 API: countries (`listCountries` + 3 admin ops) + legacy holds release/write-off + ledger views.
- [ ] 4.15.14 API: `getWebCustomCode` + S-110/S-127 rules, incl. the ADR-019 tag-manager deny list (§3) and path-scoped CSP vendor table (§4).
- [ ] 4.15.15 Admin: login/2FA/set password + home; step-up dialog offers "email me a code" while S-060 is ON (`adminRequestReauthCode`, 3.17c).
- [ ] 4.15.16 Admin: staff + roles.
- [ ] 4.15.17 Admin: audit log.
- [ ] 4.15.18 Admin: users list.
- [ ] 4.15.19 Admin: user detail tabs.
- [ ] 4.15.20 Admin: moderation queues hub + reports.
- [ ] 4.15.21 Admin: money overview screens not built by slices 4–13.
- [ ] 4.15.22 Admin: settings, all areas + history.
- [ ] 4.15.23 Admin: analytics.
- [ ] 4.15.24 Admin: translations.
- [ ] 4.15.25 Admin: system logs/health/maintenance/caches/custom code.
- [ ] 4.15.26 E2E.
- [ ] 4.15.27 QA.
- [ ] 4.15.28 Security (RBAC, audit).
- [ ] 4.15.29 Fix findings.
- [ ] 4.15.30 PR + STATUS.
- [ ] 4.15.31 Owner click-through.

### 4.16 Slice 16 — spec 17 Content and SEO (branch `feat/content-seo`)
- [ ] 4.16.1 Spec check.
- [ ] 4.16.2 Data model: pages, blog, comments, newsletter, home content, redirects.
- [ ] 4.16.3 API: `listPages`, `lookupPage`, `getPage`, `createContactMessage`.
- [ ] 4.16.4 API: blog `listBlogArticles`, `lookupBlogArticle`, `getBlogArticle`, `listBlogComments`, `createBlogComment`.
- [ ] 4.16.5 API: newsletter subscribe/confirm/unsubscribe.
- [ ] 4.16.6 API SEO: `getSitemapIndex`, `getSitemapPart`, `resolveRedirect`, `createOutboundLinkSignatures`, `verifyOutboundLink`.
- [ ] 4.16.7 API admin content part 1: pages + home content/logos.
- [ ] 4.16.8 API admin content part 2: blog articles + comments.
- [ ] 4.16.9 API admin content part 3: support messages + newsletter.
- [ ] 4.16.10 Web: CMS page + contact + `/gita`.
- [ ] 4.16.11 Web: blog list + article + comments.
- [ ] 4.16.12 Web: newsletter box + verify/unsubscribe + redirect interstitial.
- [ ] 4.16.13 Web: home blocks, announcement, footer.
- [ ] 4.16.14 Web: meta/OG/JSON-LD, hreflang/canonical/noindex, robots, 301 map.
- [ ] 4.16.15 Admin: pages, blog, comments, support, newsletter, home content.
- [ ] 4.16.16 Mobile: content pages.
- [ ] 4.16.17 E2E.
- [ ] 4.16.18 QA.
- [ ] 4.16.19 Security (custom code, redirects).
- [ ] 4.16.20 Fix findings.
- [ ] 4.16.21 PR + STATUS.
- [ ] 4.16.22 Owner click-through.

- [ ] 4.17 **Phase 4 gate (Owner):** full parity click-through; every QA report PASS.

---

## Phase 5 — Data migration (data-migration-engineer; mapping in `data-model.md`; nothing touches production)
- [!] 5.1 Owner provides a local copy of the production database (Q-049 risk; needed before 5.3).
- [ ] 5.2 `tools/migrate-legacy` skeleton: MySQL reader, PostgreSQL writer, run report.
- [ ] 5.3 Users, profiles, social accounts (`provider_name`/`provider_id`), legacy password hashes.
- [ ] 5.4 Staff + roles (migrated staff stay disabled until Q-097).
- [ ] 5.5 Catalog: categories, skills, countries.
- [ ] 5.6 Gigs + media references.
- [ ] 5.7 Projects, proposals, contracts.
- [ ] 5.8 Orders, order items, escrows.
- [ ] 5.9 Ledger opening balances, wallets, legacy holds (money).
- [ ] 5.10 Reviews.
- [ ] 5.11 Conversations + messages.
- [ ] 5.12 Subscriptions, points, referrals, promo codes.
- [ ] 5.13 Restrictions + appeals, notification preferences.
- [ ] 5.14 Content: pages, blog, comments, newsletter.
- [ ] 5.15 File/media copy to object storage.
- [ ] 5.16 Full dry run on the copy + reconciliation report (counts and money totals).
- [ ] 5.17 Fix mismatches (split per finding).
- [ ] 5.18 QA migration report.
- [ ] 5.19 **Phase 5 gate (Owner):** numbers match.

---

## Phase 6 — Launch (devops-engineer; every step needs explicit Owner approval)
- [ ] 6.1 Staging VPS per ADR-015 (Owner approval).
- [ ] 6.2 Staging secrets + deploy pipeline.
- [ ] 6.3 Backups + restore test.
- [ ] 6.4 Monitoring + alerts.
- [ ] 6.5 Firewall/CDN (Cloudflare) + TLS.
- [ ] 6.6 BOG test environment on staging (Owner approval for any real-money test).
- [ ] 6.7 SendGrid on staging (sandbox / allow-list).
- [ ] 6.8 Social-login keys on staging (Owner enters them; SEC-09 review done).
- [ ] 6.9 Full migration rehearsal on staging.
- [ ] 6.10 301 redirects + SEO check on staging.
- [ ] 6.11 Load test.
- [ ] 6.12 Final security review + pre-launch checklist (incl. ADR-019 §5 Clarity "Strict" masking and §7 re-entering GA4/Clarity with their S-127 hosts).
- [ ] 6.13 Mobile: EAS production builds.
- [ ] 6.14 Mobile: store listings + submission for iOS and Android (ADR-016).
- [ ] 6.15 Cutover plan + rehearsal.
- [ ] 6.16 **Production deploy (Owner go).**
- [ ] 6.17 DNS switch + final migration.
- [ ] 6.18 Post-launch monitoring week + fixes.
