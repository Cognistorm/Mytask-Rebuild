# QA test plan: slice 02 — Profiles and dashboards (spec 02)
Date: 2026-10-03 | QA: ROADMAP 4.1.26 (independent session; did not write slice 1 code) | Branch: `feat/profiles`
Spec: `docs/02-specs/02-profiles-and-dashboards.md` (42 ACs, R-P1…R-P10, EC-1…EC-12). Contract 1.3.1. Report: `docs/06-qa/reports/02-profiles-2026-10-03.md`.
AC → operation map: `docs/handoffs/2026-10-02-orchestrator-to-backend-web-mobile-4-1-1-spec-02-check.md` (35 API ACs; AC-1, 2, 4, 5, 11, 35 UI only; AC-41 belongs to slice 9).

## Method
- **Layer A — automated (4.1.26a).** Every suite forced (no Turborepo cache), the existing API tests of the slice, new QA probes `apps/api/test/qa-slice02.test.ts` (real HTTP pipeline, contract validation, PGlite + in-process Redis, in-memory object storage), web E2E on the production build (routed API), admin E2E incl. the full-stack `profiles-main-flow` on `pnpm local` with a **throw-away database** (`LOCAL_PGLITE_DIR` in the session scratchpad; the Owner's `apps/api/.pglite` is never used), `expo export` of the app, and curl/fetch checks against the running stack (real SeaweedFS, worker, Mailpit).
- **Layer B — parity and screens (4.1.26b).** The same scenario on the live site (public pages only, no real account touched) and in `/legacy/` vs the new web, app and admin queues; every image screen now that local public images load (4.1.25); i18n of every new key (Q-058); cross-client web ↔ app; emails in Mailpit vs legacy templates.

Test-ID prefixes: `profiles` / `profile-lists` / `portfolio` / `kyc` / `account-settings` / `availability` / `dashboard` / `profiles-emails` / `profiles-schema` / `files*` / `two-factor-challenges` = the matching `apps/api/test/*.test.ts`; `QA-*` = new QA probes in `qa-slice02.test.ts`; `S-*` = stack checks (curl/fetch on `pnpm local`); `web:<file>` / `admin:<file>` = Playwright specs; `B-*` = layer-B manual checks.

## AC → test cases
| AC | What | Test cases (layer A) | Layer B |
|---|---|---|---|
| AC-1 | Both dashboards for every user, no "Become a seller" | dashboard "gives a new user…" (no seller check, R-P1); web:dashboard "Selling navigation…", "switching to Buying…" | B-DASH web + app (account menu / Account tab), no "Become a seller" anywhere |
| AC-2 | Switcher without a new login | web:dashboard "switching to Buying…" | B-DASH app segmented control |
| AC-3 | Last dashboard stored on the account; default Buying | account-settings "stores dashboard…", **QA-DSH-1** (new account = buying; choice on ios is what android gets; bad value 400); web:dashboard "My dashboard opens…" | B-X (choose on web, open app) |
| AC-4 | Selling nav (S-034, S-025/S-029 P-5) | web:dashboard "Selling navigation…", "settings: Offers ON…" | B-DASH app nav vs `seller-app.blade.php` |
| AC-5 | Buying nav | web:dashboard "switching to Buying…" | B-DASH vs `buyer-app.blade.php` |
| AC-6 | Selling Home content | dashboard (welcome, KPIs neutral 0, verified badge, S-075 OFF → no list), web:dashboard AC-6/AC-7, "verified badge, negative migrated balance…" | B-DASH vs `Seller/Home` view |
| AC-7 | Empty Selling Home | dashboard "new user…", web:dashboard | B-DASH app |
| AC-8 | Public profile content | profiles "shows a profile to guests…", "shows skills, languages…", **QA-PRO-4** (viewer flags, no level/badge field); web:profile "guest sees the full profile…"; admin:profiles-main-flow (guest view) | B-PROF web + app vs live `/profile/{username}` and `profile.blade.php` |
| AC-9 | 404 for pending/banned/deleted | profiles "answers 404 for pending, banned…", **QA-SET-3**; web:profile "unknown, hidden or renamed…" | B-PROF |
| AC-10 | Two rating blocks, "No reviews yet" | profiles (neutral empty blocks until slice 6); web:profile | B-PROF |
| AC-11 | Contact me (guest → login) | web:profile "signed-in visitor goes straight to the chat…"; **QA-PRO-4** `canContact` | B-PROF app (hidden until slice 7, 4.1.23a) |
| AC-12 | Request an offer (S-034) | profiles `canRequestOffer: false` (neutral until slice 11) | deferred to slice 11 |
| AC-13 | Owner sees Edit profile, not Contact/Report | profiles "sets the viewer flags…", **QA-PRO-4**; web:profile "the owner sees…", web:report-user "own profile has no Report user" | B-PROF app |
| AC-14 | Report user (reason ≤ 1,500, replace, EV-13, guests, not self) | profiles createUserReport (3 tests), **QA-PRO-3** (1,500 / 1,501, deleted profile 404), **QA-ROLE-4** (restricted profile reportable); web:report-user (5) | B-PROF app bottom sheet; B-MAIL EV-13 |
| AC-15 | Edit profile, each block saves on its own | profiles "saves each block on its own…"; web:edit-profile "opens from the account menu…", "headline and About me…" | B-EDIT web + app (no legacy screen: P-23; compare with `account/profile/profile.blade.php`) |
| AC-16 | Avatar JPG/PNG/WEBP ≤ 2 MB, SVG refused, remove → initials | profiles avatar (6 tests), files "refuses types…" / "above the purpose limit", files-scan avatar variants, **QA-UPL-1** (WEBP and exactly 2 MB accepted, GIF refused); web:edit-profile "avatar…"; admin:profiles-main-flow (real upload → WebP → image loads); **S-IMG** (image loads from SeaweedFS) | B-EDIT app camera/library |
| AC-17 | Headline 1–100 | profiles "refuses empty, blank and too long…" (100 ok, 101 refused) | B-EDIT |
| AC-18 | About me 1–1,500 + More/Less | profiles (1,500 ok, 1,501 refused); web:profile (folding) | B-PROF |
| AC-19 | Skills ≤ 30, 3 levels, duplicates, slug | profile-lists skills (4), **QA-PRO-1** (30 / 31, `expert` refused — stored `pro`, the 3 levels) | B-EDIT |
| AC-20 | Languages ≤ 100, 4 levels, duplicates | profile-lists languages (2) | B-EDIT |
| AC-21 | Linked accounts (S-123) | profile-lists linked accounts (3), profiles "shows linked accounts only while S-123 is ON"; web:edit-profile "linked accounts (S-123 ON)…" | B-EDIT |
| AC-22 | Availability: future date, message ≤ 750 | availability (6), **QA-PRO-2** (750 / 751, impossible date, shown and removed on the public profile); web:edit-profile "availability…" | B-EDIT app date picker; add-to-cart / offer refusal → slices 3 / 11 |
| AC-23 | Passed date disappears; remove early | availability "availability-reset job…", "removes the notice early…", profiles "hides a passed availability" | – |
| AC-24 | Portfolio create rules | portfolio "checks trimmed texts…", "accepts only ready own…", **QA-PF-1** (title 2 / 101 / blank, description 9, link 121 chars, `javascript:` and `ftp:` links, empty gallery, no thumbnail; 100 / 10 / 120 accepted), **QA-UPL-1** (WEBP refused); web:portfolio-edit "create…"; admin:profiles-main-flow | B-PF web + app vs `CreateComponent` view |
| AC-25 | S-071 OFF → pending + EV-14; ON → public, no email | portfolio "saves a pending item…", "publishes at once…", **QA-PF-3**, **QA-PF-5** (editing a published item with S-071 OFF hides it until approved, EV-14) | B-MAIL EV-14 |
| AC-26 | Approve → public + EV-15 | portfolio "approves once…"; admin:portfolio-queue; admin:profiles-main-flow | B-MAIL EV-15; in-app/push → slice 14 |
| AC-27 | Edit replaces data and gallery; delete with files | portfolio "replaces the gallery…", "lets only the owner edit or delete…", **QA-PF-2** (rejected item deleted, files `deleted`); web:portfolio-edit "edit a rejected work…", "delete asks first…" | B-PF |
| AC-28 | Public list only active; owner sees pending/rejected | portfolio list/get/lookup (5), **QA-PF-2**, **QA-PF-4**; web:profile "portfolio list…", "pending and rejected work…" | B-PF web + app grid/viewer |
| AC-29 | Account settings fields, password or emailed code | account-settings updateMe (4), accounts without a password (4), two-factor-challenges, **QA-SET-1** (61-char name/city, username pattern, deleted account's username and email stay reserved, wrong password field message, 60 chars accepted); web:account-settings | B-SET web + app vs `settings.blade.php` |
| AC-30 | Email change by link; old address notice; pause | account-settings email change (6), **QA-SET-2** (old address still logs in, new one not, `emailChangedAt` null until confirm); web:account-settings "email-change link…" | B-MAIL EV-11 / EV-12 links on the stack |
| AC-31 | Username change moves the profile | account-settings "a new username moves the profile…" | – |
| AC-32 | Delete refused with active items | account-settings "a registered guard refuses…" (pluggable, empty in slice 1) | later slices add their guard |
| AC-33 | Delete refused with a balance | same (guard registry; slice 4) | later slice |
| AC-34 | Soft delete; profile and work vanish; email/username reserved | account-settings "soft-deletes…", **QA-SET-3** (profile, portfolio list, item and slug lookup 404), **QA-SET-1** (reserved in settings too) | B-SET dialog text |
| AC-35 | Account area links + theme switch | web:account-settings "account links…", web:theme (7) | B-SET app Account tab |
| AC-36 | KYC submit (types, passport front only, ≤ 5 MB, EV-16) | kyc create (8), files "refuses types…", **QA-UPL-1** (5 MB accepted, 5 MB + 1 refused); web:verification (3 tests); admin:profiles-main-flow | B-KYC web + app vs `verification.blade.php`; B-MAIL EV-16 |
| AC-37 | Approve → verified badge + EV-17; decline → EV-18, send again | kyc approve / decline, **QA-KYC-1** (decline twice and resubmit, approve → `isIdVerified` on the public profile and dashboard); web:verification "declined…"; admin:kyc-queue; admin:profiles-main-flow | B-MAIL EV-17 / EV-18 |
| AC-38 | Pending/verified → no new submit | kyc "refuses a second…", "two parallel submits…", getMyKyc, **QA-KYC-1** (409 after verified); web:verification | – |
| AC-39 | KYC files only owner / staff with `kyc.review`, signed links | kyc "the owner opens own photos…", "file download…", files-download-admin, **QA-ROLE-3** (portfolio moderator 403 on every KYC staff op incl. the download; other user 404; guest 401); **S-S3** (no anonymous read of `kyc/`, `private/`, bucket root or `public-media` listing) | Security 4.1.27 |
| AC-40 | S-122 manual; KYC required for nothing | kyc create (provider), **QA-KYC-1** (`provider = manual`; unverified user creates portfolio) | – |
| AC-41 | Username masking | not in this slice (slice 9, spec 10) | – |
| AC-42 | Portfolio rejected with reason, owner-only, EV-126, edit → AC-25 | portfolio "rejects with a reason…", **QA-PF-2** (404 by id/uid to guest and another user, not in list or `portfolioCount`, approve after reject 409), **QA-PF-3** (S-071 ON edit → active, reason cleared, no EV-14); web:portfolio-edit, web:profile; admin:portfolio-queue | B-MAIL EV-126 |

## Rules, edge cases, roles, notifications
| Item | Test cases |
|---|---|
| R-P1 dual role, no seller check | dashboard, **QA-DSH-1**, web:dashboard |
| R-P2 no levels/badges | **QA-PRO-4** (no `level`/`badge` field in `UserProfile`) |
| R-P3 visibility; restricted stays visible | profiles "answers 404…restricted stay visible", **QA-ROLE-4** |
| R-P4 online status | profiles online status (3) |
| R-P5 availability effects | AC-22 tests; add-to-cart / offers → slices 3 / 11 |
| R-P6 portfolio moderation | AC-25, AC-42 tests |
| R-P8 KYC one active, private files | kyc, **QA-KYC-1**, **QA-ROLE-3**, **S-S3** |
| R-P9 soft delete | account-settings, **QA-SET-3** |
| EC-4 renamed user 404 | profiles, account-settings |
| EC-5 email confirmed kills old reset link | account-settings "old password-reset links stop working…" |
| EC-7 two tabs, different blocks | profiles "saves each block on its own…" |
| EC-8 KYC declined twice | kyc decline, **QA-KYC-1** (two rounds) |
| EC-9 S-071 ON keeps pending items pending | **QA-PF-4** |
| EC-10 owner without gigs | web:profile "the owner sees…" |
| EC-11 no migrated `rejected` items | data migration (Phase 5), not testable now |
| EC-12 code asked, then only city changed | account-settings "saves other fields without a password or code" |
| **Wrong role tries it** | **QA-ROLE-1** (guest 401 on 12 own-account ops), **QA-ROLE-2** (user token on staff queues 401/403; staff token on user ops 401), **QA-ROLE-3** (staff with the other queue permission 403), **QA-ROLE-4** (restricted user 403 `ACCOUNT_RESTRICTED` on profile, availability, skills, KYC, portfolio, dashboard, settings, delete) |
| Notifications EV-06 (email_change), EV-11…EV-18, EV-126 | queued: account-settings, profiles, portfolio, kyc; rendered ka + en: profiles-emails (9 events); delivered: **S-MAIL** (Mailpit on the stack after the main flow); text parity → B-MAIL |
| Local public images (4.1.25) | **S-IMG** (avatar and portfolio variants load anonymously), **S-S3** (no anonymous listing, root, `private/`, `kyc/`) |

## Layer B checklist (4.1.26b)
- B-DASH, B-PROF, B-EDIT, B-PF, B-SET, B-KYC: each screen on web (ka + en, 390 px and 1280 px) and in the app (source + `expo export`; device steps SETUP-LOCAL §4 10–16) vs the live site and legacy Blade/Livewire: fields, order, labels, links, messages, the states of spec 02 "Screens"; every image screen with real images (avatar, card, portfolio grid/item, admin portfolio and KYC queues).
- B-I18N: every NEW key of spec 02 Texts present in en + ka with the spec values; the NEW keys added during the slice (4.1.16, 4.1.17, 4.1.19, 4.1.20d, 4.1.21, 4.1.22, 4.1.23b) have en first and ka alongside; no hard-coded strings in the slice's screens.
- B-X: profile, portfolio and KYC created on web are seen on the app, and the reverse; the dashboard choice crosses clients (AC-3); report from the app reaches the admin email.
- B-MAIL: EV-11…EV-18, EV-126 subjects and bodies in Mailpit vs legacy templates.
- Re-check DEV-M1 (slice 01): is a public home reachable in the app while signed out?
