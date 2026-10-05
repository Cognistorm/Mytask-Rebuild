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
- [x] 4.1.11 API: `updateMe`, `confirmEmailChange`, `updateMyPreferences`, `deleteMe` (pluggable guards: later money slices add theirs) + `createMyTwoFactorChallenge` purpose `email_change` (AC-29, Q-144). Done 2026-10-02: unique checks before the password/code (a correct code is not wasted); email change = link to the new address (EV-11, `/auth/email-change?token=`) + notice to the old (EV-12), templates built now; confirm sets `emailChangedAt` and ends old verify/reset links; link emails capped 3/h; `Me.pendingEmail`/`countryCode`/`city` real; `AccountDeletionGuards` registry (empty in slice 1); see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-11-account-settings.md`.
- [x] 4.1.12 API: portfolio `list/create/lookup/get/update/delete` + admin `adminListPortfolioItems`, `adminGetPortfolioItem`, `adminApprovePortfolioItem`, `adminRejectPortfolioItem`, `adminRemovePortfolioItem`. Done 2026-10-02: every save follows S-071 (pending + EV-14 to S-100, or active at once); files = own ready `portfolio_image` not used by another item, unused ones deleted after edit/delete; owner sees pending/rejected (reason), others 404; staff compare-and-set on `pending` (409 `t_item_already_decided`), reject/remove with reason audited; EV-14/15/126 email templates built; first keyset cursor (`platform/pagination.ts`) and shared `UserSummaries`; the 4 Q-117 i18n keys were missing and are added; see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-12-portfolio-api.md`.
- [x] 4.1.13 API KYC:
  - user: `createKycVerification`, `getMyKyc`;
  - staff: `adminListKycVerifications`, `adminGetKycVerification`, `adminApproveKycVerification`, `adminDeclineKycVerification`, `adminGetKycFileDownload`.
  Done 2026-10-02: one pending/verified per user (409 + partial unique index for races); back side must match the type; own ready unused `kyc_document` files; EV-16 to S-100; provider seam `KycProviders` (S-122 manual); declined rows kept and resubmit needs new photos (legacy deleted the row); staff compare-and-set (409 `t_item_already_decided`), decline reason shown to the user, audited 2-min file links; EV-16/17/18 email templates built (2 new i18n keys for the hard-coded legacy EV-16 text); see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-13-kyc-api.md`.
- [x] 4.1.14 API: `getSellingDashboard`. Done 2026-10-02: `DashboardService` in the profiles module; welcome data real (full name or username, KYC badge, member-since); KPIs and lists = contract neutral values (0 / []) with a comment naming the slice that fills each; `latestAwardedProjects` null while S-075 is OFF; see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-14-selling-dashboard-api.md`.
- [x] 4.1.15 Spec 02 notifications (email templates via outbox): EV-11…EV-18, EV-126 (EV-11/12 done in 4.1.11, EV-13 in 4.1.8b, EV-14/15/126 in 4.1.12, EV-16/17/18 in 4.1.13); in-app + push of EV-15/17/18/126 come in 4.14. Done 2026-10-02: all 9 templates, enqueue sites and en/ka keys checked; fixed EV-12 (old-address notice was resolved by `userId` at send time, so a delayed send after confirm went to the new address; now pinned at request); new `apps/api/test/profiles-emails.test.ts` renders every event in ka + en; see `docs/handoffs/2026-10-02-backend-engineer-to-web-mobile-qa-4-1-15-spec-02-notifications.md`.
- [x] 4.1.16 Web: dashboard shell + switcher, Selling Home, Buying dashboard. Done 2026-10-02: shared `DashboardLayout`, `RoleSwitcher`, `SidebarNav`, `StatTile`, `Price`, `EmptyState`, `Skeleton` etc. in `@mytask/ui/web`; `DashboardShell` + one nav list (settings S-034/S-075/P-5) in `apps/web/src/components/dashboard`; switch saves `lastDashboard` (AC-3) and keeps twin pages; `/seller/home` from `getSellingDashboard` (empty states AC-7, HOLD hint, negative balance); `/account/projects` = Buying shell + empty state; 8 NEW i18n keys; `e2e/dashboard.spec.ts` (10); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-16-dashboard-shell-web.md`.
- [x] 4.1.17 Web: public profile + portfolio list/item. Done 2026-10-02: server-rendered `(public)` pages `/profile/{username}`, `/portfolio`, `/portfolio/{slug}` (real 404, `noindex, follow` when not indexable, old slug → permanent redirect by uid, owner sees pending/rejected work with the reason); SSR as the visitor (`viewerApi`: Bearer from the cookie, one session refresh, visitor IP only via Caddy + service token); CSP `img-src` gets the media CDN origin; shared `Avatar`, `RatingSummary`, `ChipLink`, `Pill`, `ExpandableText`, `Dialog` in `@mytask/ui/web`; 1 NEW i18n key; `e2e/profile.spec.ts` (13); report user stays in 4.1.20; see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-17-public-profile-web.md`.
- [x] 4.1.18 Web: edit profile + availability modal. Done 2026-10-02: `/account/profile` in the dashboard shell (Selling side), `getMyProfile` once, each block saves on its own with its own message (AC-15): card with avatar Change/Remove (upload protocol, jpg/jpeg/png/webp ≤ 2 MB checked first), headline in place, then Availability (modal: date from tomorrow Asia/Tbilisi + message; Change prefills, Remove ends early), About me, Linked accounts (S-123), Skills and Languages (add/edit/delete, legacy language list as suggestions); "Edit profile" in the account menu; shared `RadioGroup` + `Field` options in `@mytask/ui/web`; no new i18n key (HTML removed from one legacy value); `e2e/edit-profile.spec.ts` (8); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-18-edit-profile-web.md`.
- [x] 4.1.19 Web: portfolio create/edit. Done 2026-10-02: `/seller/portfolio` owner list (status pill, rejection reason AC-42, Edit, Delete with confirm, add tile), `/seller/portfolio/create` and `/seller/portfolio/{uid}/edit` (legacy fields and texts; thumbnail + gallery via the upload protocol, S-089/S-090 from the public config; edit sends only changed images; rejected/pending note above the form; success + pending note on the list); legacy edit URL → 301; shared `.mt-button-danger`; 1 NEW i18n key; `e2e/portfolio-edit.spec.ts` (8); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-19-portfolio-create-edit-web.md`.
- [x] 4.1.20 Web: account settings + verification centre + report user (split 2026-10-02 into a–d):
  - [x] 4.1.20a Account settings `/account/settings` + email-change link page `/auth/email-change`. Done 2026-10-02: form after legacy `settings.blade.php` (username, email, full name, country, city; current password; only changed fields sent), accounts without a password confirm only an email change with an emailed `email_change` code (Q-144, EC-12), pending banner from `Me.pendingEmail` (AC-30), delete account with the legacy warning dialog (AC-32…AC-34, refusal reason shown); account side card (AC-35: Settings, Edit profile, Password, Verification centre, Sessions, Logout) in the dashboard shell; account menu / edit profile / password / sessions link to `/account/settings`; API `listCountries` (`GET /countries`, was not built) + test; shared `Select` in `@mytask/ui/web`; no new i18n key; `e2e/account-settings.spec.ts` (8); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-20a-account-settings-web.md`.
  - [x] 4.1.20b Verification centre `/account/verification` (AC-36…AC-39: document type, photos, selfie, status pending / verified / declined with "send again"). Done 2026-10-02: legacy 3 steps (type → front/back, passport front only → selfie with the legacy hint; Next/Finish check each step; Back keeps the uploads) with the shared `ImageUploader` (new `purpose` + `info` props; `kyc_document`, JPG/JPEG/PNG ≤ 5 MB) → `createKycVerification`; status card (pending + `t_kyc_status_pending`, verified, declined with date and reason, `t_send_files_again` → new form, EC-8); documents with size and Download (owner-only signed link, `getFileDownload?mode=json`); 409 → shows the current one; account side card; no new i18n key; `e2e/verification.spec.ts` (7). Also on the Owner's instruction: no country in account settings (Q-162, ADR-021, contract 1.3.1 deprecates `Me.countryCode` / `MeUpdateRequest.countryCode`); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-20b-verification-centre-web.md`.
  - [x] 4.1.20c Report user on the public profile (AC-14: modal, reason ≤ 1,500, guest message, not on own profile). Done 2026-10-02: "Report user" button beside Share (not on the own profile, AC-13) → dialog with the legacy title, `t_reason` + placeholder, ≤ 1,500, trimmed, empty refused before any request → `createUserReport` → `t_profile_has_been_successfully_reported` (201 and 200); guests (and a session that ended) get `t_u_must_login_to_report_this_profile` + Login back to the profile; 429 shown in the dialog; no new i18n key; `e2e/report-user.spec.ts` (5); fixed the time-of-day bug in the 4.1.18 availability E2E; see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-20c-report-user-web.md`.
  - [x] 4.1.20d Theme switch (AC-35, S-105/S-106, Q-059): `Me.theme` / S-106 applied to `<html data-theme>`, switch in the account side card; check the web pages in dark mode. Done 2026-10-02: server renders `<html data-theme>` from the `mt_theme` cookie (no flash; S-105 OFF or no cookie → S-106, appearance from getPublicConfig cached 60 s; `system` resolved by a nonce-carrying script first in `<body>`); Light / Dark / System radio group in the account side card (hidden when S-105 OFF) applies at once and saves cookie + `updateMyPreferences`; the dashboard shell syncs the account's `Me.theme` into the cookie; dark mode checked on login, settings, verification, edit profile, public profile, dialogs (tokens only; the live site uses the same logo in dark); 1 NEW i18n key `t_theme`; `e2e/theme.spec.ts` (7); see `docs/handoffs/2026-10-02-web-engineer-to-mobile-qa-4-1-20d-theme-switch-web.md`. **4.1.20 complete.**
- [x] 4.1.21 Admin: portfolio queue + KYC queue. Done 2026-10-02: `apps/admin` `/portfolio` (tabs pending/active/rejected, filters owner + Tbilisi date range, public view of the item, approve, reject with reason, "Delete portfolio" = remove with reason + legacy confirm) and `/kyc` (tabs pending/verified/declined, document-type filter, front/back/selfie opened only on click through the audited signed link and shown inline, legacy "Approve files" / "Decline files" confirmations, decline reason required); 409 → `t_item_already_decided`; shared `components/moderation.tsx` (owner summary, tabs, filter, cursor list) for later queues; nav links by permission; 5 NEW i18n keys + 9 legacy ka values translated; `e2e/portfolio-queue.spec.ts` (6), `e2e/kyc-queue.spec.ts` (4); see `docs/handoffs/2026-10-02-web-engineer-to-qa-security-4-1-21-admin-portfolio-kyc-queues.md`.
- [x] 4.1.22 Mobile: dashboard shell/switcher + home screens. Done 2026-10-03: tab bar `(tabs)` with Dashboard (პანელი) + Account (ანგარიში) tabs (Home/Explore/Messages join with their slices), the layout is the session gate; `/` → Dashboard tab on the side chosen last (`Me.lastDashboard`, AC-3); Buying / Selling switcher on the Dashboard and Account tabs saves `updateMyPreferences` (AC-2); Selling Home from `getSellingDashboard` (welcome, verified, member since, 10 KPI tiles in 2 columns with the HOLD hint, messages, latest orders, awarded projects when not null, empty states, skeleton, retry; reload on focus); Buying landing (Projects, or Orders while S-075 OFF) with its empty state; nav lists as web, an item shows once its app screen exists; "Create a new gig" waits for the app gig wizard (slice 3); 2 NEW i18n keys; SETUP-LOCAL §4 step 10; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-22-dashboard-shell-mobile.md`.
- [x] 4.1.23 Mobile: public profile, edit profile, availability (split 2026-10-03 into a/b):
  - [x] 4.1.23a Public profile screen `/profile/[username]` (AC-8…AC-14: card, ratings, About me folding, portfolio preview, skills, languages, linked accounts, availability notice, native share sheet, report user bottom sheet, 404) + "View profile" on the Account tab. Done 2026-10-03: screen outside the tab gate (guests too; expired session → one `getMe` refresh, then re-read); card with avatar/online dot, verified mark, share sheet (`{APP_URL}/profile/{username}`), local time, verifications, languages, linked accounts; availability notice, two rating blocks (partial stars, 5→1 bars), About me folded to 6 lines, owner gigs empty block, portfolio preview of 6 with Pending/Rejected pills, skill chips; 404 `t_user_not_found`; report user bottom sheet (trimmed, required, ≤ 1,500, guest/401 login message); shared `components/profile.tsx` (incl. `BottomSheet`); Contact me / Edit profile / item viewer / `/hire` hidden until their screens exist; no new i18n key; SETUP-LOCAL §4 step 11; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-23a-public-profile-mobile.md`.
  - [x] 4.1.23b Edit profile `/account/profile` (AC-15…AC-21: avatar camera/library, headline, About me, linked accounts, skills, languages) + availability bottom sheet (AC-22/AC-23); "Edit profile" on the own profile and the Account tab. Done 2026-10-03: screen reads `getMe` + `getMyProfile` once, each block saves on its own with its own message: card (avatar Take a photo / Choose from gallery with square crop, jpg/jpeg/png/webp ≤ 2 MB checked first, upload protocol → `putMyAvatar`, Remove; headline in place; Unavailable pill; member since), Availability (bottom sheet, native date picker from tomorrow Asia/Tbilisi — iOS inline calendar, Android dialog — + message ≤ 750; Change prefills, Remove), About me, Linked accounts (S-123), Skills, Languages (add/edit/delete, API 409 texts), "Update profile" links (password, view profile); own profile re-reads on focus; new dependency `@react-native-community/datetimepicker` 9.1.0 (Expo 57 bundled version) + config plugin; 1 NEW i18n key `t_ui_choose_photo`; SETUP-LOCAL §4 step 12; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-23b-edit-profile-mobile.md`. **4.1.23 complete.**
- [x] 4.1.24 Mobile: portfolio + account settings + verification centre (split 2026-10-03 into a–d):
  - [x] 4.1.24a Public portfolio grid `/profile/[username]/portfolio` (owner box, Load more, empty) + item viewer `/profile/[username]/portfolio/[slug]` (swipe gallery, video / live preview links, description, share sheet, owner box, pending/rejected notes for the owner, 404); profile preview cards open the item, "View my portfolio" when there are more (AC-28, AC-42). Done 2026-10-03: routes mirror the web (`profile/[username]/index.tsx` moved, `portfolio/index.tsx`, `portfolio/[slug].tsx`), outside the tab gate; grid with owner box, `t_username_portfolio`, Load more (24), empty, 404; item viewer with owner Pending/Rejected note, one swipe pager (thumbnail + gallery, "n / total"), Watch video / Live preview (browser), Share this project (public only, current slug), description, owner box; 404 / other user's path → `t_page_not_fount`; expired session → one `getMe` refresh; shared `components/portfolio.tsx`; no new i18n key; SETUP-LOCAL §4 step 13; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-24a-portfolio-viewer-mobile.md`.
  - [x] 4.1.24b Selling → Portfolio: owner list (status, rejection reason, Edit, Delete) + create/edit (thumbnail + gallery via camera/library, S-089/S-090, pending note) (AC-24, AC-25, AC-27, AC-42); Portfolio in the Selling nav; "Create" in the owner's empty preview. Done 2026-10-03: `seller/portfolio/index.tsx` (status pills incl. new `success` tone, rejection reason via `getPortfolioItem`, Edit, Delete bottom-sheet confirm, Load more 24, card opens the item viewer), `create.tsx`, `[uid]/edit.tsx` (shared `components/portfolio-edit/portfolio-form.tsx`: legacy fields and texts, required thumbnail/gallery before any request, edit sends only changed images, StatusNote above the form, success + pending note via `lib/flash.ts` after `dismissTo`); image picker camera/library (multi-select, iOS JPEG, S-089/S-090 pre-checks, per-image progress/reason, Remove deletes the file); `Button danger`; no new i18n key; SETUP-LOCAL §4 step 14; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-24b-portfolio-edit-mobile.md`.
  - [x] 4.1.24c Account → Settings (AC-29…AC-34: username, email, full name, city, current password or emailed code, pending-email banner, delete account dialog) + the Account tab links (AC-35). Done 2026-10-03: `src/app/account/settings.tsx` (legacy fields and texts, only changed fields sent, current password for accounts with one, `email_change` code + resend wait for accounts without one when the email changes, pending-email notice from `Me.pendingEmail`, link opens the website `/auth/email-change`; delete account bottom sheet with the legacy warning, refusal shown in the sheet, success clears the session → login); Account tab: Account settings link + `getMe` on focus; edit-profile links include Settings; no new i18n key; SETUP-LOCAL §4 step 15; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-24c-account-settings-mobile.md`.
  - [x] 4.1.24d Verification centre (AC-36…AC-39: 3 steps camera first, status pending / verified / declined with "send again", own documents). Done 2026-10-03: `src/app/account/verification.tsx` (legacy 3 steps, all mounted so Back keeps the uploads, camera or gallery per photo, selfie opens the front camera, `kyc_document` JPG/JPEG/PNG ≤ 5 MB pre-checks, 409 → shows the current one; status card pending / verified / declined with reason, documents with size and Download via the 2-min owner signed link opened in the browser, Send files again); image picker takes `purpose`/`info`/`camera`; links on the Account tab and edit profile; no new i18n key; SETUP-LOCAL §4 step 16; see `docs/handoffs/2026-10-03-mobile-engineer-to-mobile-qa-4-1-24d-verification-centre-mobile.md`. **4.1.24 complete.**
- [x] 4.1.25 E2E main flows. Done 2026-10-03: full-stack `apps/admin/e2e/profiles-main-flow.spec.ts` (web profile + avatar + portfolio + KYC → admin approve → guest public profile and work page; needs `ADMIN_E2E_LOG`); local public images fixed (SeaweedFS anonymous `Read:public-media` only, also in `docker-compose.yml`); `LOCAL_PGLITE_DIR` throw-away DB (SETUP-LOCAL §5); mobile stays on the manual SETUP-LOCAL §4 steps (harness = Owner decision); admin E2E 17/17; see `docs/handoffs/2026-10-03-web-engineer-to-qa-4-1-25-e2e-main-flows.md`.
- [x] 4.1.26 QA parity report for slice 1 → `docs/06-qa/reports/` (split 2026-10-03 into a/b, as 3.15):
  - [x] 4.1.26a Test plan `docs/06-qa/plans/02-profiles.md` (spec 02 AC → test case → evidence) + run every automated suite (lint, typecheck, API, web/admin E2E incl. the full-stack `profiles-main-flow` on a throw-away DB, mobile export) + API-level checks of the ACs on the running local stack; report part 1. Done 2026-10-03: interim result no blocker/major; all suites PASS (lint+typecheck 19/19, API 395 + 19 new QA probes `qa-slice02.test.ts`, web E2E 108/108 + 3 skipped, admin E2E 17/17 on the stack incl. `profiles-main-flow`, expo export, S3 integration 5/5), 33/33 stack checks (local images load; no anonymous listing, root, `private/`, `kyc/`); 3 minor findings F-01…F-03 (test/local env), 5 notes for 4.1.27/4.1.26b; see `docs/06-qa/reports/02-profiles-2026-10-03.md` (part 1 of 2).
  - [x] 4.1.26b Screen parity vs live site and `/legacy/` (web + app + admin queues; every image screen now that local public images load), i18n check, cross-client check (web ↔ app), bugs + verdict; report complete. Done 2026-10-03: verdict **FAIL** (1 major: BUG-01 default English Next.js 404 page on the web, incl. the AC-9 profile 404; 5 minor BUG-02…06, F-04 spec text; DEV-P1 for the Owner; DEV-M1 still recommend approve); screens, image audit (0 broken, non-square avatars cropped square), i18n 534 keys en+ka, cross-client 9/9 and emails PASS; see `docs/06-qa/reports/02-profiles-2026-10-03.md` §7–§15.
- [x] 4.1.27 Security review (personal data, uploads, KYC). Done 2026-10-03: review 06 `docs/06-qa/security/06-slice-02-profiles-2026-10-03.md` **PASS with conditions** (0 Critical/High; Medium SEC-62…66, Low SEC-67…71, Info I-30…37; 4 before-merge items); QA notes N-1, N-2 accepted (I-30, I-31), N-4 → SEC-66 (Owner Q-163).
- [x] 4.1.28 Fix findings (QA 4.1.26 §14: BUG-01 major, BUG-03, BUG-04, BUG-05, F-04; security 4.1.27), then QA re-check §15. BUG-02 and BUG-06 closed: Owner approved DEV-P1 on 2026-10-03 (4 share targets + Copy link, no QR; no breadcrumbs on dashboard pages). Done 2026-10-03: QA fixes BUG-01 (localised 404 for both root layouts + catch-all, `x-mt-locale` from the proxy), BUG-03 (account card below the content under lg), BUG-04 (`inSentence` in `@mytask/i18n`, EV-126 trims the final "."), BUG-05, F-04, then BUG-08 from the re-check; security before-merge SEC-62 (SeaweedFS `-filer.disableHttp` + start-up check), SEC-63 (copy only the scanned ETag, late quarantine cleanup, POST 10 min), SEC-64 stop-gap (unattached public images deleted after 24 h), SEC-65 (client IP on the web/admin upstreams + CI step), SEC-70a (`no-store` signed links), SEC-73 + I-38 from re-check 07; QA re-check §16 **PASS with notes** (BUG-08 fixed, F-05 → 4.2.0), security re-check 07 **PASS, merge allowed**; Owner questions Q-163/Q-164 (SEC-66/67); carry-over in 4.2.0, 5.0, 6.12; handoffs `docs/handoffs/2026-10-03-qa-engineer-to-orchestrator-4-1-28-recheck.md`, `…-security-reviewer-to-orchestrator-4-1-28-security-recheck.md`.
- [x] 4.1.29 PR + CI + STATUS. Done 2026-10-03 **locally** (Owner rule 2026-10-02: no push/PR until Phase 4 is complete): every CI step run on this computer and green (gen, tokens, i18n, format, lint+typecheck+test 22/22, build, web E2E 110 + admin E2E 12; Docker job waits for the push); PR text ready in `docs/handoffs/2026-10-03-orchestrator-to-owner-4-1-29-pr-feat-profiles.md`.
- [x] 4.1.30 Owner click-through: checklist `docs/06-qa/plans/02-profiles-owner-click-through.md` (web + admin + app, ~30–40 min); the Owner ticks it and approves slice 1. **Skipped by the Owner 2026-10-03** (slice 1 closed on the QA PASS-with-notes and security PASS results; the checklist stays available). Owner Q-165 (c) the same day: design direction unchanged.

### 4.2 Slice 2 — spec 03 Categories and search (branch `feat/catalog-search`)
- [x] 4.2.0 Slice 1 carry-over from security reviews 06 §6.2 and 07 §6, none blocking (added 2026-10-03; split 2026-10-03 into a–f, one role each; branch `feat/catalog-search`, cut from `feat/profiles`):
  - [x] 4.2.0a backend: SEC-74 (portfolio save marks its files inside the transaction so the unattached cleanup cannot delete them; `views()` degrades instead of throwing). SEC-73 was already fixed in 4.1.28. Done 2026-10-03: data-model §3.Q `files.attached_at` (internal, no contract change) + migration `20261003120000_files_attached_at`; `markAttached` in the create/update transaction (422 `FILE_NOT_READY` unless every file is still `ready`); cleanup requires `attached_at IS NULL` in both the batch and the outer UPDATE; `views()` leaves out an item without a showable thumbnail and logs an error (owner/public page and staff single item → 404, staff queue → item left out); 4 new tests (portfolio 3, files-scan 1); API 425 passed / 6 skipped, lint + typecheck green. Avatars unchanged (reader falls back to initials, as review 07 notes).
  - [x] 4.2.0b backend: SEC-75 (after the copy of an as-uploaded file, compare its SHA-256 with the scan's checksum; must be done before slice 05/07, when users first download each other's files) + I-38 (no ETag → refuse the copy, not copy unconditionally). Done 2026-10-03: `file-scan.service.ts` re-reads the copy and compares its SHA-256 with the scanned checksum; on a mismatch the copy is deleted and the file rejected `t_file_rejected_unreadable` (error logged); no ETag → rejected the same way before anything is written (was: retry forever); `MemoryStorage` hooks `afterNextCopy`, `dropEtag`; 3 new tests; API 428 passed / 6 skipped, lint + typecheck green. Cost: one extra read of each as-uploaded file (images are re-encoded, never copied).
  - [x] 4.2.0c architect: per-user portfolio-save `x-rate-limit` in the contract (for SEC-69); I-31 contract text ("every attempt counts" on `createUserReport`); I-30 ADR-002 §2 sentence. Done 2026-10-03: contract **1.3.2** (ADR-022): 30 saves per user per hour shared by `createPortfolioItem`/`updatePortfolioItem`, every attempt counts, `429`; "every attempt counts, before the target check" on all four report operations; ADR-002 §2 sentence + revision note; verify:final 0/0 (715/715), `pnpm gen`, typecheck green; Owner question **Q-166** (EV-14 only on entry into `pending`?); handoff `docs/handoffs/2026-10-03-solution-architect-to-backend-4-2-0c-portfolio-save-limit.md`.
  - [x] 4.2.0d backend: SEC-69 (the ADR-022 rate limit; EV-14 only when an item enters `pending` **only if the Owner answers Q-166 (a)**); I-33 (lower pixel limit for avatar/portfolio images, cap on files in `scanning` per user). Done 2026-10-03 (Owner Q-166 (a)): 30 portfolio saves per user per hour shared by create/update (`hitHourly`, also used by `ReportLimiter` now), 429 + Retry-After; EV-14 only when an item enters `pending`; spec 02 AC-25 + Texts row, spec 15 EV-14, ADR-022 §4 and the `updatePortfolioItem` description (contract 1.3.2) updated. I-33: public image variants from **one** decode (was three) + `sequentialRead`; at most 2 files of one owner per sweeper pass; pixel limit kept at 100 MP (40 MP would refuse 48–50 MP phone photos; reason in `file-scan.service.ts`). 4 new tests, 1 adjusted; API 432 passed / 6 skipped; repo lint + typecheck green; verify:final 0/0.
  - [x] 4.2.0e devops: QA N-13 (parallel `turbo` tasks race on `prisma generate`, `EEXIST … generated/prisma/models`: generate once before the parallel tasks); I-41 (prove in CI that SSR calls carry the visitor IP, not only the 404 page); SEC-71 (`pnpm local` servers on 127.0.0.1); SEC-54 (`.local/` and `apps/api/.pglite` in `.dockerignore`). Done 2026-10-03: N-13 turbo task `generate` (api `prisma generate`, cached on schema/config/package.json) that `lint`/`typecheck`/`test` depend on, removed from the api `typecheck`/`test` scripts (`build` keeps it for the Dockerfile); `turbo run lint typecheck test --force` 23/23 in parallel, generate once. I-41: `ipSource` (`peer`/`edge`/`ssr-visitor`) on every API request log line (`ipSourceProps`, unit test) + CI step: the `/profile/ci_nobody_here` SSR call is logged `ssr-visitor` (runs in the Docker CI job only, not locally). SEC-71: API `HOST` (default `127.0.0.1`; Dockerfile and compose `0.0.0.0`; phone testing sets `HOST=0.0.0.0`, SETUP-LOCAL §4 + `.env.example`), web/admin `next dev --hostname 127.0.0.1`. SEC-54: `.local` and `apps/api/.pglite` in `.dockerignore`. API 433 passed / 6 skipped.
  - [x] 4.2.0f mobile: SEC-70 (b) (KYC document shown inside the app, not saved to Downloads). Done 2026-10-03: the verification status card's "Download" is now "ნახვა" (View, existing key `t_view`) and opens the photo in a full-screen in-app viewer (React Native `Image` from the 2-minute signed link, loading spinner, error notice, Close `t_close`); no browser, nothing in Downloads (the Android image cache stays inside the app's private storage; iOS honours the `no-store` of SEC-70 (a)); the website keeps "Download"; SETUP-LOCAL §4 step 16 updated; mobile lint + typecheck green, `expo export` iOS 1315 / Android 1450 modules. No new i18n key. **4.2.0 complete.**
  - [x] 4.2.0g devops (added 2026-10-03 from 4.2.2b; **before 4.2.7**): local PGlite answers the next query wrongly after a database error inside a Prisma transaction (interactive `$transaction` or nested create): "record not found for a nested create", `count` → null. CI (real PostgreSQL) is not affected; local tests and `pnpm local` are. Fix or work around (`@electric-sql/pglite-socket` 0.2.11 / `pglite` 0.5.8) with a permanent regression test of both scenarios; 4.2.2b handoff. Done 2026-10-03: cause = PGlite answers an extended-protocol error with ErrorResponse **and** ReadyForQuery, then a second ReadyForQuery for Sync (the client takes the extra one as the end of the ROLLBACK, so every later answer is one query late); also pglite-socket interleaved two connections' Parse/Bind/Execute on the one session (`portal "" does not exist`). Both are the newest releases, so: own wire server `apps/api/scripts/pglite-wire-server.mjs` (batch up to Sync as one unit, session held through a transaction, skip till Sync after an error, early ReadyForQuery dropped, ROLLBACK on close) for tests and `pnpm local`; `@electric-sql/pglite-socket` devDependency removed; `test/db-transaction-errors.test.ts` (4; all fail on the old server); API 512 passed / 6 skipped, tsc + eslint green; see `docs/handoffs/2026-10-03-devops-engineer-to-backend-4-2-0g-pglite-wire-server.md`.
- [x] 4.2.1 Spec check. Done 2026-10-03: contract 1.3.2 complete (33 API ACs all covered, 4 NOT-API correct), no contract change, no new Owner question; 2 data-model gaps for the architect (category `description` per language; old-slug store for spec 16 AC-60 / spec 17 AC-10); the `gigs` core table moves from 4.3.2 to 4.2.2b (search cannot be built without it); no public header/footer/home exists yet (new 4.2.9a); 9 missing i18n keys; neutral values for later slices (Premium = slice 8, ratings 6, sales 5, visits/favourites/thumbnails 3, projects 9, logos/articles 16); task gaps added to 4.2.2–4.2.15 below; see `docs/handoffs/2026-10-03-orchestrator-to-architect-backend-web-mobile-4-2-1-spec-03-check.md`.
- [x] 4.2.2 Data model (split 2026-10-03 into a/b):
  - [x] 4.2.2a Architect: data-model §3.C `gig_category_translations.description` (≤ 300, per language; legacy single `description` → `ka` row in §12.2) and a store of old slugs for gig categories (`AdminCategory.previousSlugs`, spec 16 AC-60, spec 17 AC-10/EC-3), designed once so CMS pages and blog articles reuse it in slice 16. No contract change expected (if needed: ADR first). 4.2.1 handoff §B. Done 2026-10-03: `gig_category_translations.description varchar(300) null` (legacy single value → `ka`, §12.2); new table `slug_redirects` (§3.R: `entity_type` gig_category/page/blog_article, `scope` = category depth or 0, PK `(entity_type, scope, old_slug)`; slug-change rule with advisory lock and 409 `DUPLICATE`, change-back removes the row, one-hop resolution segment by segment, rows deleted with the item, starts empty); entity count 123; no contract change, no ADR; see `docs/handoffs/2026-10-03-solution-architect-to-backend-4-2-2a-category-description-and-slug-redirects.md`.
  - [x] 4.2.2b Backend: migration for `gig_categories` (+ translations, depth trigger), `project_categories` (+ translations, link to a top-level gig category), `skills` (+ translations), the old-slug store of 4.2.2a, the **gigs core** (`gigs` + `gig_translations` exactly as §3.D; the rest of §3.D stays in 4.3.2) and `search_documents` (§3.S, GIN `gin_trgm_ops`); local seed = the live site's public category tree, project categories and skills (ka + en names, slugs; source in the seed file; Phase 5 replaces it); the 9 missing i18n keys (7 NEW of spec 03 + `t_content_shown_in_georgian`, `t_feature_disabled` of spec 00; en + ka from the spec Texts tables). 4.2.1 handoff §C, §E, §F.7. Done 2026-10-03: migration `20261003180000_catalog_gigs_core_search` (10 tables: gig categories + translations with the depth/no-move trigger, project categories + translations with the top-level link trigger, skills + translations, `slug_redirects` with the scope check, `gigs` + `gig_translations` with the §3.D checks and the category-branch trigger, `search_documents` with GIN tsvector + trigram indexes; TM provenance on every translation table); local seed `prisma/seed-catalog.json` (live public tree 7/49/189 ka + en, 7 project categories linked by slug, no skills — none are public) loaded by `db:seed` only while empty; 9 i18n keys; `test/catalog-schema.test.ts` (19); API 452 passed / 6 skipped, lint + typecheck 20/20; found the local PGlite transaction-error problem → 4.2.0g; see `docs/handoffs/2026-10-03-backend-engineer-to-backend-devops-4-2-2b-catalog-data-model.md`.
- [x] 4.2.3 API: `listCategories` (cached ≤ 60 s), `lookupCategory`, `getCategory`, `listProjectCategories`, `lookupProjectCategory` (S-075 → 403); `contentLocale` Georgian fallback, `hasEnglish`, breadcrumb, 404 on a wrong parent. Done 2026-10-03: new module `apps/api/src/modules/catalog` (no contract change): tree by position with paths, icon/image on the top level only, `isVisibleOnHome`, in-process 60 s cache (`CategoriesService.invalidate()` for 4.2.7); lookup 1–3 slugs, wrong parent / unknown / empty segment / > 3 levels → 404; `CategoryDetail` breadcrumb, children, `updatedAt`; active project categories with active skills; S-075 OFF → 403 `FEATURE_DISABLED` (`t_feature_disabled`); per-field Georgian fallback with `contentLocale: ka` (`catalog/localized.ts`), `hasEnglish` = English name; `test/catalog.test.ts` (13); API 465 passed / 6 skipped, tsc + eslint + prettier green; see `docs/handoffs/2026-10-03-backend-engineer-to-backend-web-mobile-4-2-3-public-catalog-reads.md`.
- [x] 4.2.4 API: `searchGigs`, `listGigs` (ranking, Premium "Featured") + `SearchIndex` (`indexGig`/`removeGig`, ADR-011 §3, called by slice 3 gig writes) + one `PremiumStatus` seam (always false until slice 8; replaces the hard-coded `isPremium: false` / `premiumEndsAt: null`); keyword = every word as a substring (no fuzzy-only matches); listable owner exact on every request (join, or refresh from every path); AC-16 worked example as a test with a Premium test double; neutral values per 4.2.1 handoff §D (no impressions until slice 3). Done 2026-10-03: `searchGigs` (owner joined live: active/verified, not deleted/restricted; every keyword word a `LIKE` substring of `search_documents.search_text`; price/delivery/rating filters read from the live gig row, min > max → 400; group A = `PremiumStatus.activeUsersSql()` first except price sorts; Recommended = md5(id ‖ Tbilisi date); ties newest; `page` or opaque offset `cursor`, `totalCount`); `listGigs` newest first, no boost; `GigCards` (rating tenths half up, `isFavorite` null/false); `SearchIndex.indexGig`/`removeGig` inside the caller's transaction; global `PremiumModule` replaces every hard-coded Premium/plan value (Me, AdminUser, profile, UserSummaries, restrictions); 24 tests incl. AC-16 with a Premium double; fixed the order-dependent seed count in `catalog-schema.test.ts`; API 489 passed / 6 skipped, tsc + eslint green; no contract change; see `docs/handoffs/2026-10-03-backend-engineer-to-backend-web-mobile-4-2-4-gig-search.md`.
- [x] 4.2.5 API: `searchProjects` (empty page until slice 9; S-075, category/skill 404 real), `listSellers` (daily mix, 40), `listHireSellers` (exact `user_skills.slug` or 404; daily mix, 42). Done 2026-10-03: shared `catalog/list-rules.ts` (`LISTABLE_OWNER`, `tbilisiDay`, `dailyMix`, offset paging, moved out of gig search); `listSellers` (listable users with ≥ 1 active gig, one card each, daily mix, no boost, `UserSummary` + first 3 skills oldest first); `listHireSellers` (exact slug or 404, title from the oldest such skill (EC-7), listable users with a skill whose slug or name `ILIKE`s the keyword, wildcards escaped, no gig needed, daily mix); `searchProjects` (S-075 OFF → 403, paging 400, unknown/inactive category or skill or skill outside the category → 404, else an empty page until slice 9); `test/seller-lists.test.ts` (11); API 500 passed / 6 skipped, tsc + eslint + prettier green; no contract change; see `docs/handoffs/2026-10-03-backend-engineer-to-backend-web-mobile-4-2-5-project-and-seller-lists.md`.
- [x] 4.2.6 API: `getHome`: top gigs, category rows (visible top-level categories), featured categories (S-107) real; best sellers `[]` while S-108 is ON until slice 5; logos and recent articles `[]`/`null` until slice 16. Done 2026-10-03: `catalog/home.service.ts` + `HomeController` (optional user): top gigs = 4 listed gigs, active-Premium owners first, random in each group (topped up); one row per visible top-level category in random order, up to 4 listed gigs each, Premium first, empty rows returned empty (one window-function query); featured tiles = the same categories in the rows' order with the category image (S-107, else `null`); best sellers `[]`/`null` (S-108); logos `[]`/`null` (S-109); recent articles `[]` only while S-117 and S-119 are ON; nothing cached (random per request, tree from the 60 s category cache); `test/home.test.ts` (8, Premium double); API 508 passed / 6 skipped, tsc + eslint + prettier green; no contract change; see `docs/handoffs/2026-10-03-backend-engineer-to-backend-web-mobile-4-2-6-home.md`.
- [x] 4.2.7 API admin: gig category CRUD (split 2026-10-04 into a/b: the one HTML sanitiser of CONVENTIONS §19 was planned for Phase 3 but does not exist, and the SEO texts need it):
  - [x] 4.2.7a backend: the one allow-list sanitiser (CONVENTIONS §19, SEC-22): allow-list file in the new shared package `packages/rich-text` (profiles `user_text`, `user_text_links`, `staff_content`), one module in `apps/api`, `href` scheme rules after entity decoding, `img src` parsed against `PUBLIC_MEDIA_BASE_URL` (SEC-32(d)), `rel` per profile, text length helper; XSS corpus test (OWASP vectors, mutation XSS). Signing external links to `/redirect` (spec 17 AC-47) is done on read once the signer exists (slice 16/17). Done 2026-10-04: `packages/rich-text/allow-list.json` (+ typed export for web/mobile); global `RichText` (`apps/api/src/platform/rich-text/rich-text.ts`, `sanitize-html` 2.17.5): profile elements/attributes, drop-with-content list, href after entity decoding + control/space stripping (no `//`, no backslash, user-info URLs refused), server-written `rel`, parsed media-library `img src` (no base → no images), numeric size/span attributes, `plainText` for length rules; worked around a sanitize-html bug (renamed refused tags closed the next sibling); `test/rich-text.test.ts` (49, 72-vector OWASP/mXSS corpus × 3 profiles, second-pass stability); API 561 passed / 6 skipped, lint + typecheck green; AC-47 link signing on read stays open (handoff); see `docs/handoffs/2026-10-04-backend-engineer-to-backend-security-4-2-7a-rich-text-sanitiser.md`.
  - [x] 4.2.7b backend: `adminListCategories`… 5 ops: 3 levels, ka/en, description, SEO text (`staff_content`), icon + image (`category_image`, top level only), visibility, position; slug change records the old slug (4.2.2a `slug_redirects`); delete in use → `t_category_in_use`; audited; `CategoriesService.invalidate()` after each write. Done 2026-10-04: `catalog/admin-categories.service.ts` + `admin-catalog.controllers.ts`; depth from the parent (level-3 parent → 422 `t_category_max_depth`); slug unique per level incl. old slugs (409 DUPLICATE `slug`), §3.R advisory locks, change back removes the own row; position defaults to last; SEO texts `staff_content`, empty → null; English texts need the English name; icon/image top level only, own ready `category_image` not used elsewhere, `attached_at` set, replaced/deleted files purged; delete refused while children, gigs (soft-deleted too, FK) or linked project categories (409 CATEGORY_IN_USE with counts), old slugs deleted with it; audited in the transaction, cache invalidated; 2 NEW i18n keys; `test/admin-categories.test.ts` (14); API 578 passed / 6 skipped, lint + typecheck green; open: 422 missing on `adminUpdateCategory` (file errors are 400 field errors on both ops), old URLs 301 only with `resolveRedirect` (4.16.6); see `docs/handoffs/2026-10-04-backend-engineer-to-web-admin-architect-4-2-7b-admin-gig-categories.md`.
- [x] 4.2.8 API admin: project categories + skills CRUD (10 ops, spec 16 AC-61): linked top-level gig category, skills inside one project category, in use → `t_category_in_use`; audited. Done 2026-10-04: `catalog/admin-project-catalog.service.ts` + 2 controllers; project category: name ka/en (≤ 100), plain SEO description, slug unique (409), position default last, `isActive`, own ready `category_image`; linked gig category unknown → 400, not top level → 422 `t_project_category_top_level_only` (NEW); delete refused while skills (inactive too) → 409 CATEGORY_IN_USE; skills: category must exist (404), slug unique per category (also on a move), list oldest first with cursor + `projectCategoryId`/`q`; one image check for both category tables (`category-images.ts`); audited; `projectCount` 0 until slice 9; `test/admin-project-catalog.test.ts` (14); API 598 passed / 6 skipped, lint + typecheck green; see `docs/handoffs/2026-10-04-backend-engineer-to-web-admin-4-2-8-admin-project-categories-skills.md`.
- [x] 4.2.9 Web header + category pages (split 2026-10-03 into a/b):
  - [x] 4.2.9a Public site header + footer shell on the `(public)` layout (design `01-home.md`): logo, pill search with the category menu, category bar with "More ▾", mega-menu by click/Enter (AC-2), phone search icon → full-width search (AC-22), slide-over drawer with the category accordion and its search box, Explore menu, Login/Register or the account menu, language switch, theme toggle; cart, bell, Subscription and invite banner hidden until their slices; proxy 301 for `?locale=` / `?theme=` (AC-36, url-map §2). Done 2026-10-04: skip link + header + footer on every `(public)` page: logo, pill search with categories list, theme toggle, Explore (Projects only with S-075), Login/Join or account menu; category bar with measured "More ▾" and a click/Enter/hover mega-menu (Escape returns focus); phone search icon → full-width search (AC-22); drawer with the category accordion + filter box; footer columns from `listPages` (none until slice 16), logo, ©, language switch; header does the one-time session refresh for every public page (profile pages' own removed); proxy 301 for `?locale=`/`?theme=` (AC-36, url-map §2, cookie set); shared `@mytask/ui/web` `site.tsx`; `E2E_WEB_PORT` for the Playwright run; 2 NEW i18n keys; `e2e/site-header.spec.ts` (8); web E2E 118 passed / 3 skipped; see `docs/handoffs/2026-10-04-web-engineer-to-web-qa-4-2-9a-public-header-footer.md`.
  - [x] 4.2.9b Category pages at 3 levels (`lookupCategory` + `searchGigs?categoryId=`): title, breadcrumb, SEO text top/bottom with the Georgian fallback note (AC-4), filters + sort, 404; canonical + hreflang (AC-37). Done 2026-10-04: `categories/[...path]/page.tsx`: `lookupCategory` (404 for unknown / wrong parent / 4th level), breadcrumb, h1, SEO texts top/bottom with `lang` + `t_content_shown_in_georgian` on /en (AC-4), canonical (+ `?page=N`) and hreflang ka/en/x-default (AC-37); the shared gig list for search too (GET-form filters with legacy names, GEL → tetri, min > max refused, legacy `sort_by` ↔ `SearchGigSort`, count, 42 cards, numbered pages, empty + error states, phone filter sheet with "Show results"); `GigCard` (Featured frame + badge, quiet no-reviews), `Breadcrumb`, `Pagination` in `@mytask/ui/web`; `?page=1` → 301; zones; 5 NEW i18n keys; `e2e/category-pages.spec.ts` (8); see `docs/handoffs/2026-10-04-web-engineer-to-web-qa-4-2-9b-category-pages.md`. **4.2.9 complete.**
- [x] 4.2.10 Web: search results + gig card (Featured frame + badge with text, quiet `t_no_reviews_yet`); filters in the URL with the legacy names and `sort_by` values (GEL → tetri), min > max refused, page numbers + `totalCount`, empty state with Reset filter, canonical/hreflang. Done 2026-10-04: `search/page.tsx` on the shared gig list (4.2.9b): heading `t_search_results_for_q` (AC-23), empty keyword lists all (AC-20), keyword kept through filters, sort, pages and Reset (AC-12), `noindex, follow` + canonical `/search` + hreflang; header field shows the keyword; zones; `e2e/search-page.spec.ts` (4); see `docs/handoffs/2026-10-04-web-engineer-to-web-qa-4-2-10-search-results.md`.
- [x] 4.2.11 Web: `/sellers`, `/hire/{keyword}` (API 404 → 302 to `/search?q=`), explore projects (chips, empty "Latest projects" until slice 9, S-075 OFF → feature-disabled state). Done 2026-10-04: `/sellers` (40 per page, `t_top_sellers` + subtitle), `/hire/{keyword}` (42 per page, title/subtitle with the skill; API 404 → temporary redirect to `/search?q=` with + for spaces; **307** from a Next.js page instead of url-map's 302), `FreelancerCard` (verified, 3 skill chips → `/hire`, Contact me via login for guests, View profile); explore projects root/category/skill (search bar, "Popular:" chips, empty "Latest projects" until slice 9, 404 rules, S-075 OFF → feature-disabled 200 noindex); zones; no new keys; `e2e/seller-and-project-lists.spec.ts` (4); see `docs/handoffs/2026-10-04-web-engineer-to-web-qa-4-2-11-sellers-hire-explore-projects.md`.
- [x] 4.2.12 Web: real home page (hero, featured categories S-107, Top gigs, category rows with "See more" on every size, best sellers S-108; projects row hidden until slice 9) replacing the Phase 3 placeholder; profile gigs block via `listGigs` (spec 02 AC-8, EC-10). Done 2026-10-04: home replaces the placeholder: hero (S-113 title or `t_find_best`, search, Gigs/Projects shortcuts kept on phones), featured categories carousel (S-107), Top gigs, category rows with "See more" on every size (empty rows hidden), best sellers (S-108); phone rows scroll sideways; failed getHome → hero only; profile gigs block via `listGigs` (6 + Load more; owner empty state, visitors none); `Carousel` in `@mytask/ui/web`; header stays white over the hero (deviation for the Owner, handoff); `e2e/home.spec.ts` (3), shell + custom-code specs updated; see `docs/handoffs/2026-10-04-web-engineer-to-web-qa-4-2-12-home-and-profile-gigs.md`.
- [x] 4.2.13 Admin: catalog screens (spec 16 AC-60, AC-61): gig category tree, project categories, skills. Done 2026-10-04: admin `/categories` (tree with counts and old slugs, create top/sub, edit with ka/en name, description, SEO texts top/bottom, icon + image upload and "show on home" on the top level only, position, delete with the in-use message), `/project-categories` (top-level gig category link, SEO description, image, active), `/skills` (category filter + search, Load more, move between categories); staff uploads via `uploadFile(…, { staff: true })`; `E2E_ADMIN_PORT`; 13 NEW i18n keys; `apps/admin/e2e/catalog.spec.ts` (4); admin E2E 16 passed / 5 skipped; see `docs/handoffs/2026-10-04-web-engineer-to-qa-4-2-13-admin-catalog-screens.md`.
- [x] 4.2.14 Mobile: Home tab (getHome rows, pull to refresh) + Explore tab with search, full-screen filter sheet with sticky "Show results", sort bottom sheet, infinite scroll (42). Done 2026-10-04: Home and Explore tabs (app start opens Home); Home: logo bar, teal hero with search (opens Explore) + Gigs shortcut, featured categories, Top gigs, category rows with "See more", best sellers, horizontal rows (80 % cards), pull to refresh; Explore: search, count, full-screen filter sheet with sticky "Show results" (min > max refused), sort bottom sheet, 42 per load infinite scroll with cursor, empty/error states; `components/catalog.tsx`, `lib/catalog.ts`; gigs open the website until slice 3; typecheck + lint green, `expo export` iOS 1323 / Android 1454; open: guests still need to sign in (Owner question); see `docs/handoffs/2026-10-04-mobile-engineer-to-mobile-qa-4-2-14-home-explore-tabs.md`.
- [x] 4.2.15 Mobile: category pages (menu accordion with search), `/sellers`, `/hire/{keyword}`, explore projects; profile skill chips open `/hire`; profile gigs block via `listGigs`. Done 2026-10-04: categories menu (accordion + search) and category screen at 3 levels (breadcrumb, title, description, Georgian note, gig results with filters/sort), `/sellers` (40, infinite), `/hire/[keyword]` (42; API 404 → Explore search), explore projects (chips, empty latest list, S-075 OFF / 404 states); Home links to them (Projects shortcut with S-075); profile gigs block via `listGigs` (6 + Load more) and skill chips → `/hire`; typecheck + lint green, `expo export` iOS 1328 / Android 1460; see `docs/handoffs/2026-10-04-mobile-engineer-to-mobile-qa-4-2-15-catalog-screens.md`.
- [x] 4.2.16 E2E. Done 2026-10-04: full-stack `apps/admin/e2e/catalog-main-flow.spec.ts` (staff build a 3-level branch + project category + skill → website header data, category pages at levels 1/3 with the sanitised SEO text and breadcrumb, 404 for a misplaced slug, explore-projects chip and skill page, search → in-use delete refused → bottom-up cleanup; needs `ADMIN_E2E_LOG`, **not run here**: the Owner's `pnpm local` held the ports and a second one would stop it); per-screen E2E from 4.2.9a–4.2.13 (web 137 passed / 3 skipped, admin 16 / 6 skipped); mobile manual steps SETUP-LOCAL §4 17–18; `E2E_WEB_PORT`/`E2E_ADMIN_PORT` in §5; see `docs/handoffs/2026-10-04-web-engineer-to-qa-4-2-16-e2e.md`.
- [x] 4.2.17 QA + security review of slice 2 (split 2026-10-05 into a/b/c, as 4.1.26/4.1.27):
  - [x] 4.2.17a Security review (catalogue, staff uploads, sanitiser, public reads, proxy). Done 2026-10-04: review 08 `docs/06-qa/security/08-slice-03-catalog-search-2026-10-04.md` **PASS with conditions** (0 Critical/High/Medium; Low SEC-76…79, Info I-44…51; none blocks the merge); see `docs/handoffs/2026-10-04-security-reviewer-to-orchestrator-4-2-17-security-review-slice-03.md`.
  - [x] 4.2.17b QA part 1: test plan `docs/06-qa/plans/03-categories-and-search.md` (spec 03 AC → test case → evidence) + run every automated suite (lint, typecheck, API incl. the QA probes `qa-slice03.test.ts`, web/admin E2E incl. the full-stack `catalog-main-flow` on a throw-away DB, mobile export) + API checks on the running local stack; report part 1 `docs/06-qa/reports/03-categories-search-<date>.md`. Done 2026-10-05: interim **1 major bug** — BUG-01: under `pnpm local` every Georgian website page 301s to itself (`ERR_TOO_MANY_REDIRECTS`), caused by `next dev --hostname 127.0.0.1` (b1051723, SEC-71); production build not affected. 1 minor F-01: `/hire/{keyword}` exact-slug check is case-sensitive, legacy MySQL was not. Notes N-1…N-3. Suites: lint+typecheck+test 25/25 forced (API 608 + 6 skipped, QA probes 10/10), gen/i18n/format PASS, web E2E 138 + 3 skipped, expo export iOS 1307 / Android 1460. Full stack, throw-away DB: admin E2E 19/22 (the 3 that open the website fail on BUG-01) and stack checks 15/28; with the web dev server started without `--hostname`: **22/22 and 28/28**. See `docs/06-qa/reports/03-categories-search-2026-10-05.md` (part 1) and `docs/handoffs/2026-10-05-qa-engineer-to-devops-backend-qa-4-2-17b-qa-part-1.md`.
  - [x] 4.2.17c QA part 2: screen parity vs live site and `/legacy/` (web + app + admin catalogue), i18n check, cross-client check (web ↔ app), bugs + verdict; report complete. Done 2026-10-05: verdict **FAIL** only because BUG-01 (major, part 1) is open. Screens vs live: header, category pages, card, search, English pages, home, `/sellers`, `/hire`, explore projects, admin catalogue at 1280 + 390 px, all PASS on the real stack with 56 sample gigs (throw-away DB). Filters/sort give the same 17 results through the website URL and the API; API answers byte-identical for web/ios/android; i18n 99 new keys complete. New minor items: BUG-02 (home hero shortcut tiles at desktop), BUG-03 (`t_5_stars` "5 ⭐"), F-02 (`/sellers` title); F-01 confirmed on live; Owner question Q-168 (S-107). See report §7–§14 and `docs/handoffs/2026-10-05-qa-engineer-to-devops-web-backend-4-2-17c-qa-part-2-verdict.md`.
- [x] 4.2.18 Fix findings (QA report `docs/06-qa/reports/03-categories-search-2026-10-05.md` §14 + security review 08), then re-check (split 2026-10-06 into a–e, one role each). Owner 2026-10-06: Q-167 (a), Q-168 (a), BUG-03 keep the star emoji, **BUG-01 deferred** (local `pnpm local` loop ignored for now; testing moves to a staging subdomain).
  - [x] 4.2.18a docs: Owner answers Q-167, Q-168 in `open-questions.md`; spec 00 register S-107 "prod → ON"; BUG-03 closed (kept); BUG-01 recorded as Owner-deferred (DEV-S1, report §15.1).
  - [x] 4.2.18b backend: F-01 (`/hire` exact slug case-insensitive, like legacy MySQL `_ci`); SEC-76 (out-of-range `minPrice`/`maxPrice` → 400, not 500; contract `maximum` stays for the architect's next bump); SEC-77 (sanitize-html upgrade + the two advisory payloads as tests); I-44 (`category_image` in the 24 h unattached cleanup); S-107 default ON (Q-168). Done 2026-10-06: `mode: 'insensitive'` slug check; safe-integer price guard (400 `range`); sanitize-html 2.17.7 (`pnpm audit --prod` 7 → 5, none left in it; `<plaintext>` now drops the rest); sweeper covers `category_image` and checks gig/project category references; S-107 default `true`; 7 new tests.
  - [x] 4.2.18c web: BUG-02 (home hero shortcut tiles with icons, labels inside, design `01-home.md`); F-02 (`/sellers` title `t_sellers`); SEC-78 (`data-clarity-mask="true"` on the header account areas, ADR-019 §5). Done 2026-10-06: 128 px white round tiles with Phosphor icons (new `SiteIcon` `images`/`briefcase`) from lg; `/sellers` title `t_sellers`; `data-clarity-mask` on the header account trigger and drawer block; E2E assertions in `home.spec.ts` and `site-header.spec.ts`.
  - [x] 4.2.18d mobile: Q-167 (a): guests browse Home, Explore and the catalogue screens; Dashboard/Account and account actions ask for login. Done 2026-10-06: tab layout no longer redirects guests; Dashboard/Account tab press → login (Back returns), `RequireMe` guard on both screens; SETUP-LOCAL §4 step 17.
  - [x] 4.2.18e re-check of 4.2.18b–d (suites + screens); report §15. Done 2026-10-06 (same session as the fixes, see report §15 note): lint+typecheck+test 25/25 forced (API 615 + 6 skipped), gen/format/i18n PASS, web E2E 138 + 3 skipped, admin E2E 22/22 on the stack incl. both main flows, `expo export`; fixes confirmed on the stack and in screenshots; verdict **PASS with notes**.
- [x] 4.2.19 PR + STATUS. Done 2026-10-06 **locally** (Owner rule 2026-10-02: no push/PR until Phase 4 is complete): every CI step run on this computer and green at `0398f2ee` (contract verify:final 715/715, gen, tokens, i18n, format, lint+typecheck+test 25/25 with API 615, build 4/4, web E2E 138 + admin E2E 16 routed / 22 full stack, expo export; Docker job, gitleaks and oasdiff wait for the push); PR text ready in `docs/handoffs/2026-10-06-orchestrator-to-owner-4-2-19-pr-feat-catalog-search.md`.
- [ ] 4.2.20 Owner click-through **on staging https://mytask.1kk.ge** (Owner 2026-10-06; waits for the branch to be deployed there). Checklist `docs/06-qa/plans/03-categories-search-owner-click-through.md` (updated 2026-10-06). Owner decisions 2026-10-06: 307 for `/hire/<unknown>` accepted; header transparent over the home hero → built the same day (hero colour at the top of the home page, white on scroll; `data-over-hero`, E2E in `home.spec.ts`).

### 4.3 Slice 3 — spec 04 Gigs (branch `feat/gigs`)
- [ ] 4.3.1 Spec check.
- [ ] 4.3.2 Data model: the rest of §3.D (the `gigs` + `gig_translations` core and `search_documents` exist since 4.2.2b): packages, upgrades, FAQs, gallery, documents, favourites, reports, views; gig writes call `SearchIndex` (4.2.4).
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
- [ ] 4.16.10 Web: CMS page + contact + `/gita`; add the legacy "Contact us" button (`t_contact_us` → contact page) to the 404 page (QA 4.1.28 F-05, Owner 2026-10-03).
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
- [ ] 5.0 Before any real data (security reviews 06 §6.2 and 07 §6): SEC-72 (SeaweedFS master/volume ports of `pnpm local` reachable from any browser page: random ports or a credential, import on a stack nobody browses from, back up `.local/data/s3`); SEC-64 publish-on-approval for public images (architect ADR-009 amendment + backend); SEC-66 / SEC-67 as the Owner answered Q-163 (a) and Q-164 (a) on 2026-10-03 (analyst updates spec 02 AC-34 + spec 15 for the NEW "account deleted" email, architect the `deleteMe` contract + KYC retention, then backend/web/mobile); SEC-68 (`updateMe` email enumeration, with SEC-38); I-32 (the ETL drops non-`http(s)` legacy links); KYC retention (Q-147) before the KYC import.
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
- [ ] 6.12 Final security review + pre-launch checklist (incl. ADR-019 §5 Clarity "Strict" masking and §7 re-entering GA4/Clarity with their S-127 hosts; from review 06 §6.2: SEC-70 (c) encryption at rest for `kyc`, SEC-71 Next.js only behind Caddy, I-35 admin CSP with the storage origin in `img-src`, I-36 `pnpm audit --prod` re-run, SEC-49 per-user rate-limit keys; from review 07: I-39 storage lifecycle rule expiring `quarantine/` + Redis without eviction, I-42 CDN purge when public images are deleted).
- [ ] 6.12a Mobile E2E harness (Maestro on an emulator/simulator with a dev build, not Expo Go) + main-flow tests for every app screen built in Phase 3–4 (Owner decision 2026-10-03: automation waits for Phase 6; until then the manual SETUP-LOCAL §4 steps).
- [ ] 6.13 Mobile: EAS production builds.
- [ ] 6.14 Mobile: store listings + submission for iOS and Android (ADR-016).
- [ ] 6.15 Cutover plan + rehearsal.
- [ ] 6.16 **Production deploy (Owner go).**
- [ ] 6.17 DNS switch + final migration.
- [ ] 6.18 Post-launch monitoring week + fixes.
