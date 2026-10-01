# 4.1.1 Spec check — spec 02 Profiles and dashboards vs contract 1.3.0, screens and the 4.1 task list

From: orchestrator · To: backend-engineer, web-engineer, mobile-engineer (slice 1, branch `feat/profiles`) · Date: 2026-10-02

## What I did
Checked spec 02 (approved, 42 ACs) against `docs/04-api/openapi.yaml` 1.3.0, `docs/04-api/coverage/02.md`,
`docs/03-architecture/data-model.md` §3.A/§3.B, the Phase 3 code in `apps/api`, `packages/i18n` and the 4.1 tasks in
`docs/ROADMAP.md`. No code was written.

**Result: the contract is complete for spec 02.** All 35 API ACs map to operations that exist, each listing
`02 AC-n` in `x-covers` (verified one by one). The 7 NOT-API ACs (AC-1, 2, 4, 5, 11, 35 UI; AC-41 policy in D5)
are correct. **No contract or data-model change is needed. No new Owner question.** The gaps are in the **task list**
(operations, jobs and settings that no 4.1 task names) and in **dependencies on later slices**. ROADMAP 4.1 has been
updated to cover them (see below).

## Gaps found and how ROADMAP now covers them

### A. Contract operations used by spec 02 that no task named
| Operation | AC | Now in task |
|---|---|---|
| `createUserReport` (+ EV-13 `Admin/ProfileReported` to S-100) | AC-14 | 4.1.8b |
| `adminRejectPortfolioItem` (+ EV-126) | AC-26, AC-42 | 4.1.12 |
| `adminListPortfolioItems`, `adminGetPortfolioItem` (`portfolio.moderate`) | admin queue for AC-25/26 | 4.1.12 |
| `adminListKycVerifications`, `adminGetKycVerification` (`kyc.review`) | admin queue for AC-36/37 | 4.1.13 |
| `createMyTwoFactorChallenge` purpose `email_change` (today only `toggle_two_factor`/`revoke_sessions`, `account.service.ts:125`) | AC-29 (Q-144) | 4.1.11 |

The staff permission codes `portfolio.moderate` and `kyc.review` already exist (`apps/api/src/modules/staff/permissions.ts`).

### B. Behaviour with no task
- **Online status (R-P4, AC-8 `UserProfile.isOnline`).** Nothing writes `users.last_activity_at` today (only read in
  `admin-users.service.ts:50`). Data-model §3.A: written at most once a minute, presence in Redis. Needs a guard or
  interceptor on authenticated requests (web + mobile). The realtime `presence.heartbeat` comes later with slice 7 (spec 08).
  → **4.1.8b**.
- **Job `availability-reset`** (AC-23, daily, ADR-008 §5; PIX on `user_profiles.unavailable_until`). → **4.1.10**.
- **Settings rows missing from `apps/api/src/platform/settings/registry.ts`:** S-071 `moderation.portfolio.auto_approve`
  and S-122 `kyc.provider`. (S-054, S-075, S-089, S-090, S-100, S-105, S-106, S-123, S-034, S-025, S-029 are present.
  S-129, the withdrawal pause, belongs to slice 13; AC-30 only has to set `users.email_changed_at`, which already exists.)
  → **4.1.7**.
- **i18n:** 35 keys of spec 02 are missing from both `packages/i18n/en.json` and `ka.json` (all NEW keys of the spec, plus
  `t_pending_balance_hint` from spec 00). Values are in the spec "Texts" tables. → **4.1.7** adds all of them at once
  (en first, ka alongside, Q-058), so the API and screen tasks can use them.

### C. Dependencies on slices not built yet. Rule for slice 1: return the contract's neutral value, never invent data
Same pattern as `apps/api/src/modules/auth/me.mapper.ts` (fields of later slices get their neutral values). Each later
slice fills its part. Its spec-check task must confirm that it does.
| Field / check | Neutral value now | Filled by |
|---|---|---|
| `getSellingDashboard` earnings, balances (ledger) | `0` | slice 4 (spec 05) |
| …reach, total gigs | `0` | slice 3 (spec 04) |
| …completed / pending / in-progress / canceled orders, latest 7 paid orders | `0`, `[]` | slice 5 (spec 06) |
| …awarded projects, latest 7 awarded projects (S-075) | `0`, `[]` | slice 10 (spec 11) |
| …6 contacts with unread messages | `[]` | slice 7 (spec 08) |
| `UserProfile.ratings` (two blocks) | empty blocks → "No reviews yet" | slice 6 (spec 07, `getUserReviewSummary`) |
| `UserProfile.lastDeliveryAt` | `null` | slice 5 |
| `UserProfile.canRequestOffer` | `false` | slice 11 (spec 12) |
| Profile gigs block (`listGigs?sellerUsername=`) | not called. Owner sees the EC-10 empty state, visitors see no block | slice 3 |
| `deleteMe` refusals AC-32 (active orders/projects), AC-33 (non-zero balance), pending withdrawal | build as a **pluggable list of guards**, empty-safe now | slices 4, 5, 10, 11, 13 add their guard |
| `UserSummary.isIdVerified` in other features' cards | from `kyc_verifications` (this slice) | — |
| Username masking AC-41 | not in this slice | slice 9 (spec 10, D5) |
| robots `noindex` for empty profiles (spec 17 AC-41 on `getUserProfile`) | web sets `noindex, follow` when the user has no active gig, no public portfolio item and no visible review | full SEO in slice 16 |

### D. Notifications (4.1.15)
Spec 02 events: EV-06 (email_change purpose, template exists), EV-11, EV-12 (email change), EV-13 (profile reported),
EV-14 (pending portfolio), EV-15 (portfolio published), EV-16 (KYC submitted), EV-17/EV-18 (KYC approved/declined),
EV-126 (portfolio rejected). Templates in `apps/api/src/platform/mail/templates.ts` exist today only for EV-01…EV-10,
EV-124, EV-128, EV-129. **4.1.15 builds the email side** of EV-11…EV-18 and EV-126 through the outbox. The in-app and push
channels of EV-15, 17, 18 and 126 come with slice 14 (4.14.1 audits every event). The outbox payload must already carry
`title`/`reason`, so 4.14 needs no change here.

### E. Small clarifications (from legacy, so no question needed)
- **Local time (AC-8, `UserProfile.timezone`).** No contract operation sets a timezone. Legacy has `users.timezone`,
  which no app code writes. The profile falls back to server time (`now()`, `Asia/Tbilisi`, `legacy/APP/config/app.php:73`).
  Slice 1: migrated value if present, else `Asia/Tbilisi`. No editor (keeps legacy behaviour).
- **Avatar variant 100 px square and gallery variants** come from the F0 worker (`sharp`, 4.1.4). 4.1.8a depends on 4.1.3–4.1.5.
- **Two `h1` on the profile → one** (audit §3.6), **switcher `aria-current` + text labels** (audit §3.9): web/mobile
  tasks 4.1.16, 4.1.17, 4.1.22, 4.1.23.

### F. Screens: all have a task
Dashboard shell + switcher, Selling Home, Buying dashboard (4.1.16, 4.1.22); public profile, portfolio list/item (4.1.17,
4.1.23/24); edit profile + availability (4.1.18, 4.1.23); portfolio create/edit (4.1.19, 4.1.24); account settings,
verification centre, report user (4.1.20, 4.1.24); admin queues (4.1.21). Note: the Buying dashboard lands on
`/account/projects`, a spec 10 list. In slice 1 it is the shell with the Buying navigation (AC-5) and the empty states;
the lists come with their slices.

## Files created/changed
- `docs/handoffs/2026-10-02-orchestrator-to-backend-web-mobile-4-1-1-spec-02-check.md` (this file)
- `docs/ROADMAP.md`: 4.1.1 ticked; 4.1.7, 4.1.10–4.1.13, 4.1.15 extended; 4.1.8 split into 4.1.8a / 4.1.8b
- `docs/STATUS.md`: micro-task log + next micro-task

## What the next agent must do
4.1.2 (`packages/ui` shared form pieces). Backend tasks 4.1.7 onward use sections A–D above as their checklist.

## Open questions / risks
- No new Owner question. Still open from before: DEV-M1, Q-160 (not blocking slice 1).
- Risk: the `deleteMe` guards (C) are easy to forget in later money slices. Each later slice's spec check must add its guard.
