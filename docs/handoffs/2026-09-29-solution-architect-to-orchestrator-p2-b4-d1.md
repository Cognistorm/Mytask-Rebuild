# Handoff: solution-architect → orchestrator — P2-B4 group run D1 (specs 00, 01, 02 + spec 16 delegations)
Date: 2026-09-29 | Task: P2-B4 part 2, group D1 | Result: `npm run verify:group -- D1` → **PASSED** (lint sources 0/0, lint bundle 0/0, check-contract 0 errors / 0 warnings, check-coverage 0 errors; 14 warnings = reserved operations of D2/D3/D4/D6 not in the D1 sandbox)

## What I did
- Wrote the D1 part of the contract following CONVENTIONS §18: **88 operations on 81 paths**, 86 D1 schemas (incl. `D1ErrorCode` with 14 codes, stub removed), 3 realtime events.
- All 10 D1 reserved operations are written exactly as reserved: `getHealth`, `getPublicConfig` (`GET /config/public`), `getI18nBundle` (`GET /i18n/{locale}`), `login`, `refreshSession`, `logout`, `getMe`, `getUserProfile` (`GET /users/{username}`), `adminListUsers`, `adminGetUser`.
- Areas: public config / i18n / health; auth (register, login, 2FA verify/resend, refresh, logout, email verification, password reset validate/complete, email-change confirm, social login start/callback with PKCE); own account `/me` (settings, preferences, password, 2FA switch + re-auth challenge, sessions, selling dashboard, KYC state, restrictions); profile editing (headline/about, avatar, skills, languages, linked accounts, availability); public profiles and profile reports; portfolio (CRUD, lookup by uid/slug); KYC submission; restriction appeals; staff: users (search, overview, sessions tab, edit, delete/restore with step-up, activate, ban/unban, reset link, end sessions, reset devices, 2FA off, avatar removal, email change, send email), restrictions and appeals (with audited file download), IP bans, portfolio queue, KYC queue (audited signed file links).
- `PublicConfig` shape decided by D1 (CONVENTIONS §5.7): grouped sections (i18n, appearance, branding, auth, plans, payments, escrow, projects, customOffers, revisions, withdrawals, uploads per purpose, chat, profile, content, notifications, system) covering the non-secret register rows listed in its `x-settings`; social providers listed only when enabled with keys; ETag + 304.
- P-136 (spec 00 R-5.3a): defined the reusable validation shape as the stand-in schema `I18nGeorgianFieldError` (FieldError + `code` `georgian_field_characters` | `georgian_letter_required`, `messageKey` `t_validator_georgian_field_characters` | `t_validator_georgian_letter_required`, `refusedCharacters[]` ≤ 10 in first-appearance order, `params.chars`). See request 1.

Coverage totals (checker output):
| Spec | ACs | API | NOT-API | DELEGATED | missing |
|---|---|---|---|---|---|
| 00 | 26 | 10 | 12 | 4 (D2 AC-5, D5 AC-7, D4 AC-15, D3 AC-16) | 0 |
| 01 | 52 | 50 | 0 | 2 (D6 AC-29, AC-51 → `adminLogin`) | 0 |
| 02 | 41 | 34 | 7 | 0 | 0 |
| 16 (D1 delegations 19, 21, 27, 29–35) | 10 | 10 | 0 | 0 | 0 |

## Files created/changed
- `docs/04-api/src/paths/d1-platform-auth-profiles.yaml`
- `docs/04-api/src/schemas/d1.yaml`
- `docs/04-api/src/events/d1.yaml` (`session.revoked`, `session.expired`, `account.updated`)
- `docs/04-api/coverage/00.md`, `01.md`, `02.md`, `16-d1.md`
- this handoff. Nothing else touched; nothing committed.

## What the next agent must do
### Requests to the integration run
1. **Shared FieldError for P-136** (only if P-136 is accepted): add optional `params` (object, placeholder values) and optional `refusedCharacters` (array ≤ 10) to shared `FieldError`, and list `georgian_field_characters` / `georgian_letter_required` in its `code` description; then replace the D1 stand-in `I18nGeorgianFieldError` (or keep it as the documented variant). D2 (gig titles/descriptions, spec 04 AC-5) and D5 (projects, spec 10 AC-3/AC-4) must use this shape.
2. **Restricted users and appeal uploads**: `createFileUpload`, `completeFileUpload`, `getFile` (F0) have `audience: user`, which refuses restricted users; spec 01 AC-47 needs restricted users to upload `appeal_file`s. Change F0's policy to "restricted users allowed for purpose `appeal_file` only" (x-permission notes) — or audience `restricted-user` with that purpose check.
3. **Global `ACCOUNT_SUSPENDED`**: a call made with a session ended by a ban answers `403 ACCOUNT_SUSPENDED` (spec 01 AC-45). Mention it in the base description's global rules next to `ACCOUNT_RESTRICTED` (it can come from any authenticated operation).
4. **New shared schema proposal `OwnerSummary`**: D1 defined `AdminUserOwnerSummary` (status, restricted, plan, KYC state, report count, earlier rejections) for spec 16 AC-19 queue details. D2/D4/D5 queues need the same; promote it to `components/schemas.yaml` (D1 keeps filling it) or let each group reference an equivalent.
5. **Rating summary alignment**: `ProfileRatingSummary` uses `averageRatingHundredths` (integer, 475 = 4.75) because floats are banned. D2 review/gig ratings should use the same representation; consider a shared `RatingSummary`.
6. **Cross-group `x-covers` to add** (D1 coverage names these reserved ops in API rows): D6 `adminUpdateSetting` → `00 AC-6`, `00 AC-8`, `00 AC-10`; D3 `createPayment`, `handleBogWebhook` → `00 AC-13`; D4 `completeEscrow` → `00 AC-14`, `getEscrow` → `00 AC-18`, `createEscrowRevisionRequest`, `createRefundRequest` → `00 AC-19`; D6 `adminLogin` → `01 AC-29`, `01 AC-51` (then turn those DELEGATED rows into API rows); D2 `listReviews` is named (not as coverage) in 02 AC-10.
7. **DELEGATED rows to resolve** with the real ids: 00 AC-5 (D2 gig create, `PLAN_LIMIT_REACHED` S-001), 00 AC-7 (D5 proposal create, `plan: premium`), 00 AC-15 (D4 refund accept), 00 AC-16 (D3 withdrawal create).
8. **realtime.md §6**: add the three D1 events. `session.expired` is emitted by the gateway (declared as `job:realtime-gateway-token-expiry` because `emittedBy` must be an operation or a job).
9. **New contract-level names** for Owner / P2-B5 visibility: web device cookie `mt_did` (2FA device identifier, ADR-002 §5) and mobile `deviceToken` body field; social flow `POST /auth/social/{provider}/authorize|callback`; 2FA paths `/auth/2fa/verify|resend` (ADR-002 naming); tokens never in the body for web (`AuthSession` token fields null when `X-MyTask-Client: web`).
10. **x-money deviation to confirm**: referral points are posted when an account becomes active (spec 09 AC-23). `adminActivateUser` is `x-money` (Idempotency-Key). `register`, `verifyEmail` and `completeSocialLogin` also trigger that credit but are **not** marked `x-money`: an idempotency store would have to keep replayed session tokens, and the credit is already exactly-once through the unique journal ref `referral:{referredUserId}:signup` (spec 09 PM-09-01). Integration/P2-B5 should confirm or overrule.

### Other groups (information)
- D2/D4: availability (`UserProfile.availability`, spec 02 AC-22) blocks add-to-cart and offer requests; D2 lists profile gigs with `GET /gigs?sellerUsername=` (6 per page).
- D5: username masking (02 AC-41) is enforced in D5 project reads via `UserSummary.usernameMasked`.
- D6: `adminLogin` writes `banned_ips` (D1 lists/edits them at `/admin/ip-bans`); new public settings go into `PublicConfig` via a request to D1.

## Open questions / risks (for `docs/01-discovery/open-questions.md`)
- **Q-D1-1 Portfolio "reject" state.** Spec 16 AC-21 adds "reject with reason (shown to the owner)" for portfolio items, but data-model §3.B has only `pending`/`active`, legacy had no rejection, and spec 15 has no "portfolio rejected" notification. Contract uses a `rejected` status with `rejectionReason` visible to the owner and no notification. Owner: keep the status (and add a notification?) or make "reject" = delete with reason?
- **Q-D1-2 Verification link of a non-pending account** (spec 01 AC-7 "changes nothing"): which message? Contract answers `AUTH_LINK_INVALID` (`t_verification_email_not_exists`).
- **Q-D1-3 Resend verification for an unknown email** (spec 01 AC-9 only covers pending / not pending): contract answers the same success text (no enumeration, consistent with R-A9). Confirm.
- **Q-D1-4 Account deletion confirmation**: spec 02 AC-34 asks only for a dialog; no password re-entry. Contract follows that; confirm no password is wanted.
- **Q-D1-5 Staff restriction message / staff email length**: specs give no limits; contract leaves the restriction message unbounded and uses technical bounds 200/10,000 for staff email subject/body.
- **Q-D1-6 Staff "switch 2FA off"** (spec 01 EC-8) is not listed in spec 16 AC-32; contract adds `adminDisableUserTwoFactor` under `users.edit` with a required reason, audited.
- Risk: `PublicConfig` is large and every new public row needs a D1 change; groups must route requests through handoffs.
