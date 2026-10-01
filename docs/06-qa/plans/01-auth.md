# QA test plan: slice 01 — Auth and accounts (spec 01)
Date: 2026-10-01 | QA: ROADMAP 3.15 (independent session; did not write slice 01 code) | Branch: `feat/auth`
Spec: `docs/02-specs/01-auth.md` (55 ACs, R-A1…R-A10, EC-1…EC-11). Report: `docs/06-qa/reports/01-auth-2026-10-01.md`.

## Method
- **Layer A — automated (3.15a).** Existing suites + new QA probes `apps/api/test/qa-slice01.test.ts` (real HTTP pipeline, contract validation, PGlite + in-process Redis). Full-stack browser flows run on `pnpm preview` with a fresh QA database (scratchpad copy of `scripts/preview.mjs`), so the seed prints a new Super-admin and the Owner's local data is not touched.
- **Layer B — parity and screens (3.15b).** Same scenario on the live site (no real accounts touched; public pages and form validation only) and in `/legacy/` code vs the new web and mobile screens; i18n of every new key; cross-client (account made on web used on the app and back).

Test-ID prefixes: `auth.test` = `apps/api/test/auth.test.ts`; `staff` / `social` / `public-config` = the matching API test files; `QA-*` = new QA probes; `web:<file>` / `admin:<file>` = Playwright specs; `B-*` = layer-B manual checks.

## AC → test cases
| AC | What | Test cases |
|---|---|---|
| AC-1 | Register fields, both roles, referral code | auth.test "S-052 OFF…", QA-REG-1 (min/max/charset/unique/deleted email/terms), web:auth main flow; B-REG (legacy form, live form) |
| AC-2 | Field errors and keys | auth.test "rejects bad usernames…", QA-REG-1; B-REG (inline errors on web + app) |
| AC-3 | S-052 OFF → logged in, home | auth.test, web:auth; B-REG (redirect target web / app home tab) |
| AC-4 | Email method → pending + VerifyEmail | auth.test "S-052 ON + email" |
| AC-5 | Admin method → PendingUser to S-100; activation | QA-REG-2, staff "activate a pending user" |
| AC-6 | Referral code / `?ref=` | auth.test (pending row, unknown code), web:social (referral carried); B-REG (`?ref=` prefill web) — crediting deferred to slice 09 (D-1) |
| AC-7 | Verify link activates pending only | auth.test (single use), QA-VER-1 (banned unchanged); mobile 3.11 screen → B-VER |
| AC-8 | Expired / unknown link | QA-VER-2; B-VER (messages + resend form web/app) |
| AC-9 | Resend, older links dead, already verified, R-A9 | QA-VER-3 |
| AC-10 | Login, remember me, return to page | web:auth (incl. off-site `?next=` ignored), web:social (`?next=`); B-LOG (remember me default ticked) |
| AC-11 | Same answer wrong password / unknown email | auth.test, web:auth (legacy message) |
| AC-12 | Legacy bcrypt `$2y$` login + upgrade | auth.test (Georgian-letter password) |
| AC-13 | Pending messages per method | auth.test (email), QA-REG-2 (admin); B-LOG (resend action on web/app) |
| AC-14 | Banned message | auth.test |
| AC-15 | Deleted = wrong credentials | QA-LOG-1 |
| AC-16 | Lock per account + IP; reset on success | auth.test, QA-LOG-2, auth.test SEC-34 burst |
| AC-17 | S-062/S-063 live changes | QA-LOG-2 |
| AC-18 | reCAPTCHA S-061 | QA-REC-1, public-config (site key only while ON) |
| AC-19 | Restricted: only allowed calls; web `/restricted` | staff B-2b tests, admin:restrictions (cross-app) |
| AC-20 | Switch hidden/refused while S-056 OFF | QA-2FA-1, admin:shell (S-056 switch) |
| AC-21 | Re-auth for the switch (password / emailed code) | auth.test, QA-2FA-2; B-2FA (web switch for no-password accounts — known gap, ROADMAP 3.17) |
| AC-22 | Code on untrusted device | auth.test, web:auth full stack |
| AC-23 | Correct code → trusted S-059 days, IP in session list | auth.test, QA-SES-1 (IP) |
| AC-24 | Trusted device, other IP → no code | auth.test (trusted device) — IP change not reproducible in-process (single test IP); covered by `deviceTrusted` code review |
| AC-25 | S-058 wrong codes kill the code | QA-2FA-3, auth.test SEC-34 burst |
| AC-26 | Expired code | QA-2FA-3 |
| AC-27 | Resend replaces code; 60 s; 5 per 15 min | auth.test (60 s), QA-2FA-4 |
| AC-28 | S-056 OFF keeps the user's choice | QA-2FA-5 |
| AC-29 | Staff 2FA S-060 | staff "S-060 ON by default"; OFF path used by preview (admin E2E logs in without a code) |
| AC-30 | 2FA on social login | web:social "2FA on" (routed) — API path shared with password login (`issueSession`) |
| AC-31 | Trusted devices forgotten | QA-2FA-6 (password change); code review: 2FA off and reset delete `trusted_devices` |
| AC-32 | Reset always same text; who gets mail; older links die | auth.test, QA-PWD-1 |
| AC-33 | Reset completes: rule, sessions end, EV-05, pause timestamp | auth.test, QA-PWD-2 |
| AC-34 | Expired reset link | QA-PWD-2; mobile 3.10 → B-PWD |
| AC-35 | Change password | auth.test (wrong current), QA-PWD-3, web:password |
| AC-36 | Max 3 resets per hour | QA-PWD-1 |
| AC-37…AC-41 | Social login | social (9 tests), web:social (9), admin:social-settings; real providers untested (no keys, B-2c handoff) |
| AC-42 | Logout ends the session | auth.test, web:auth |
| AC-43 | Sessions list | QA-SES-1, web:sessions; mobile 3.12 → B-SES |
| AC-44 | Revoke others (password / code) | QA-SES-1, QA-SES-2 (wrong purpose refused), web:sessions |
| AC-45 | Ban ends sessions | staff "ban ends every session" |
| AC-46…AC-50 | Restrictions and appeals | staff B-2b (4 tests), admin:restrictions |
| AC-51 | Staff IP ban | staff "S-064 failed logins…" |
| AC-52 | Banned IPs screen | staff, admin:shell |
| AC-53 | Slow mode + EV-128 | QA-LOG-3 |
| AC-54 | Code lock + EV-129 | QA-2FA-7 |
| AC-55 | In-session lock; reset link not blocked | QA-PWD-4, web:password, web:sessions |

## Rules, edge cases, notifications
| Item | Test cases |
|---|---|
| R-A2 password rule on register/reset/change | auth.test, QA-PWD-2, QA-PWD-3 |
| R-A9 link-email limits | QA-VER-3, QA-PWD-1 |
| EC-1 referral with S-052 OFF | auth.test (pending row) — crediting D-1 |
| EC-2 pending user reset | code review (`requestPasswordReset` includes pending) |
| EC-3 social-only reset / change page | QA-PWD-1, web:password |
| EC-5, EC-6, EC-8, EC-10, EC-11 | 3.15b (B-*) or later slices (EC-5 spec 02, EC-8 spec 16) |
| Notifications EV-01, EV-02, EV-04, EV-05, EV-06, EV-128, EV-129 queued | auth.test, QA-REG-2, QA-PWD-2/3, QA-LOG-3, QA-2FA-7; rendered text → B-MAIL (3.15b, mail log of the preview) |

## Layer B checklist (3.15b)
- B-REG, B-LOG, B-VER, B-PWD, B-2FA, B-SES, B-RES: each screen on web (ka + en) and mobile vs live site and legacy Blade/Livewire: fields, order, labels, links, messages, states of spec 01 "Screens".
- B-I18N: every NEW key of spec 01 Texts present in en + ka with the spec values; no hard-coded strings in the slice's screens.
- B-X: account registered on web logs in on the app (and the reverse); session made on the app is listed and revocable on web.
- B-MAIL: email subjects/bodies in the mail log vs legacy templates.
