# Handoff: solution-architect → orchestrator — P2-B4 part 3 (integration run)
Date: 2026-09-29/30 | Task: P2-B4 (Step 7), part 3 of 3 | Result: `npm run verify:final` → **0 errors, 0 warnings** in every step; `npm run verify:group -- D1…D6` → all PASSED. Nothing committed.

## What I did
Integrated the six group runs into one contract, applied or rejected every "Request to the integration run", fixed cross-group inconsistencies, extended the checker, updated data-model.md and ADR-008, and produced the bundle and the coverage table.

### Results
| Item | Value |
|---|---|
| Operations / paths | **477 / 398** (F0 8, D1 89, D2 105, D3 70, D4 68, D5 58, D6 79) |
| Component schemas | **763** (+ 10 parameters, 10 responses, 6 headers) |
| Realtime events | 34 group events + foundation `file.processed` (realtime.md §6) |
| Redocly lint, sources | 0 errors, 0 warnings |
| Bundle | `docs/04-api/openapi.yaml` written (generated header) |
| Redocly lint, bundle | 0 errors, 0 warnings |
| `check-contract --final` | 0 errors, 0 warnings |
| `check-coverage --final` | 0 errors, 0 warnings; `coverage/SUMMARY.md` written |
| ACs covered | **707 / 707** (18 specs, incl. P-135 AC-44…47): API 586 · API+JOB 35 · NOT-API 86 (ui 24, policy 16, job 14, infra 12, migration 11, email 7, content 2) · DELEGATED open 0 · missing 0 |

Coverage per spec (API incl. API+JOB / NOT-API): 00 15/11 · 01 52/0 · 02 34/7 · 03 33/4 · 04 37/2 · 05 46/1 · 06 43/2 · 07 20/1 · 08 28/6 · 09 30/7 · 10 26/3 · 11 43/2 · 12 35/1 · 13 32/2 · 14 20/0 · 15 19/20 · 16 73/5 · 17 35/12. Full table: `docs/04-api/README.md` § Coverage (+ per-spec files `coverage/NN.md`).

### Requests from the group handoffs — decisions
**Accepted and applied**
| Request | What was done |
|---|---|
| D1 R1, D2 R-3 (P-136 FieldError) | Shared `FieldError` gained optional `params` (placeholder values) and `refusedCharacters` (≤ 10); codes `georgian_field_characters` / `georgian_letter_required` documented. D1 stand-in `I18nGeorgianFieldError` removed; D2/D5 texts point to the shared shape. |
| D1 R2 (appeal uploads) | F0 `createFileUpload`, `completeFileUpload`, `getFile`, `deleteFile` → audience `restricted-user`, only for purpose `appeal_file` (else 403 `ACCOUNT_RESTRICTED`); 403 added to their responses; CONVENTIONS §15. |
| D1 R3 | Global rule for `403 ACCOUNT_SUSPENDED` (and `ACCOUNT_RESTRICTED`) in the base description. |
| D1 R4, D5 R6 (owner / masked user) | New shared `ModerationOwnerSummary` replaces D1 `AdminUserOwnerSummary`, D2 `AdminGigOwnerSummary`, D5 `AdminProjectOwnerSummary`; also added to D4 `AdminCustomOffer` (the offer approval queue lacked the AC-19 owner summary). New shared `MaskedUserSummary` (promoted from D5 `ProjectClient`); `UserSummary.usernameMasked` removed — `UserSummary` is never masked. |
| D1 R5, D5 R5 (rating) | **One integer representation: tenths** (`RatingSummary.averageTenths`, 4.33 → 43). Reason: P-56 says averages are shown with one decimal, so tenths is exactly the display value; hundredths (D1) implied precision the UI never shows, and D2's string `"4.3"` was a string number. Shared `RatingSummary`, `RatingStarCounts`, `RatingBlock` replace D1 `ProfileRatingSummary`, D2 `ReviewRatingSummary`/`ReviewStarBreakdown`/`ReviewRatingBlock`, D5 `ProposalFreelancerRating`. |
| D1 R6/R7, D3 R3, D4 R1, D5 R1, D6 R3, D2 R6 (cross-group x-covers) | Added: D6 `adminUpdateSetting` 00 AC-6/8/10, 06 AC-37, 09 AC-37, 16 AC-57; D3 `createPayment` 00 AC-13, 06 AC-6, 12 AC-1; `handleBogWebhook` 00 AC-13, 06 AC-9, 11 AC-29/30, 12 AC-15/19; `getPayment` 06 AC-9, 11 AC-29, 12 AC-19; D4 `completeEscrow` 00 AC-14, `getEscrow` 00 AC-18, `createEscrowRevisionRequest`/`createRefundRequest` 00 AC-19, `adminReleaseEscrow` 11 AC-38, `putCartItem` 04 AC-29/30; D5 `createConversationMessage` 06 AC-40, 12 AC-24, 13 AC-21, `getConversation`/`adminGetConversation` 06 AC-41, `adminCreateConversationMessage` 13 AC-19/21; D2 `createReview` 11 AC-44, 12 AC-35, `listReviews`/`getUserReviewSummary` 02 AC-10; D1 `getPublicConfig` 12 AC-1, `getUserProfile` 17 AC-41, `deleteMe`/`adminDeleteUser` 14 AC-20, `register`/`verifyEmail`/`completeSocialLogin`/`adminActivateUser` 09 AC-23/25, `adminListIpBans`/`adminDeleteIpBan` 01 AC-51. |
| DELEGATED rows | 00 AC-5 → `createGig`; AC-7 → `createProposal`; AC-15 → `acceptRefundRequest`, `adminRefundEscrow`, `adminResolveDispute`; AC-16 → `createWithdrawalQuote`, `createWithdrawal`; 01 AC-29/51 → D6 staff auth; every `DELEGATED` row of `coverage/16.md` now names the real rows in `16-dN.md`. |
| D4 R4 | `EscrowActions` promoted to shared; D5 `ContractPaymentLine` gained `escrowActions`. `RefundRequestRef`/`UnblockRequestRef` stay in D4 (D5 does not need them). |
| D4 R2 + duplicates | D3's duplicate codes removed: `CHECKOUT_ITEMS_NO_LONGER_AVAILABLE` → D4 `ORDER_ITEMS_NO_LONGER_AVAILABLE`; unpayable offers → D4 `OFFER_NO_LONGER_AVAILABLE` (422); `CHECKOUT_TARGET_NOT_PAYABLE` (409) now only for orders not awaiting payment and paid/canceled contracts. |
| D3 R1 | `promoCode` removed from `SubscriptionCheckoutTarget` (top-level only). |
| D3 R2 | New admin prefix `/admin/referrals`; `adminListReferrals` moved there (id unchanged). |
| D3 R6 | `PAYOUT_PASSWORD_INCORRECT` removed: wrong current password = `400 VALIDATION_FAILED` field `currentPassword`, `t_ur_current_pass_does_not_match` (same as D1). |
| D2 R-1 | Ratified CONVENTIONS §8.1: shared `PageNumber` (`?page=N`, alternative to cursor, `totalCount`) on exactly six lists. |
| D2 R-2 | Checker detects lists by `allOf` shared `CursorPage`, not by the `…Page` suffix. |
| D2 R-4, D3 R4, D4 R5, D5 R9, D6 (public config) | `PublicConfig` now also has S-046, S-113 (hero), S-114 (footer), S-115/S-116 (`seo`). Already present: S-019…S-026, S-029, S-034, S-041, S-045, S-075…S-099, S-101, S-104, S-107…S-109, S-111, S-112, S-117…S-120, S-126. S-110/S-127 go to a **new public operation `getWebCustomCode` (`GET /config/web-custom-code`)** for the Next.js server only (spec 16 AC-73 now API). |
| D2 R-5 | `UserProfile.isIndexable` (P-133). |
| D2 R-7 | `listGigs`, `getUserReviewSummary` added to the reserved operations. |
| D4 R3 | `adminUpdateSetting` documents the S-025 OFF→ON bulk update; 06 AC-37 is API+JOB. |
| D5 R2, R3 + D4 events | `message.created` emitted by D4 `createEscrowRevisionRequest`, `createCustomOffer`, `createCustomOfferRequest`; `contract.status_changed` lists the real D3/D4 operations (placeholders `job:payment-apply`, `job:escrow-state-sync` removed); `wallet.balance_changed` lists the D4 money operations; `badge.updated` lists D5 message/read operations; all with matching `x-emits`. |
| D5 R4 | Confirmed: D4 wrote `adminDownloadEscrowFile` (cited in 11 AC-35). |
| D5 R7, D6 R1 (permission variants) | **Replaced by one rule**: `permissionBy: {attribute, map}` selects the one permission from one attribute (upload purpose, settings area, conversation kind); `permission` is the default. `stepUpFor` kept for row-conditional step-up. Both validated. CONVENTIONS §6.1, §6.3 (`@self` for the Owner). |
| D6 R3 (D1 parts) | Confirmed `AdminUser.emailUndeliverable`; D1 ban/delete/end-sessions remove push tokens; `logout` accepts optional `installationId` (`LogoutRequest`). |
| D1 R8, D2 R-10, D3, D4 R6, D5 R8, D6 R2 | realtime.md §6 filled (all events, emitter notes, cross-group emissions §6.1). |
| data-model / ADR requests (D3 R7, D6 R4, D1 Q-D1-1) | See "data-model / ADR changes" below. |

**Rejected / not changed (with reason)**
- D1 R10 (mark `register`/`verifyEmail`/`completeSocialLogin` as `x-money`): kept as D1 designed. The referral credit is exactly-once through the unique journal ref `referral:{referredUserId}:signup`; an idempotency store would have to keep session tokens. `adminActivateUser` stays `x-money`. For P2-B5 to confirm.
- D2 R-8 (explore duplication): no duplicate exists — D5 `listProjects` is the caller's own projects only. But `searchProjects` changed from `public` to `optional-user` and now returns `MaskedUserSummary` (the old `UserSummary` leaked the owner's id/username to masked viewers, and Premium viewers could not see real names).
- D2 R-9 `t_recaptcha_failed`: not created. Legacy `t_validator_recaptcha` exists; D2's `CONTACT_CAPTCHA_FAILED` removed so the contact form fails like D1 forms (`400 VALIDATION_FAILED`, field `captchaToken`).
- D4 R7 (HOLD list from escrows): information for D3, no contract change (`listWalletHolds` already reads escrows).
- D6 "optional `stepUpFor` in CONVENTIONS": accepted as is (not replaced by a new mechanism).

### Consistency checks done
- Duplicates/overlaps: only the error-code duplicates above and the captcha code; no duplicate operations. Naming: all admin ids start with `admin`, reserved ids at their exact paths (checked).
- Money: 21 `x-money` operations, all with `Idempotency-Key`, 409, 422 (checked). No money-moving operation without `x-money` found (reviewed every user/staff mutation in D3–D5). `handleBogWebhook` deliberately has no `Idempotency-Key` (provider callback; exactly-once via `bog:{orderId}:paid`).
- Audit: new check — every staff POST/PUT/PATCH/DELETE has `x-audit` (added to `adminRequestReauthCode`, `adminCompleteFileUpload`; `adminPreviewFeeRule` has `x-audit-exempt`).
- Step-up vs spec 16 AC-7: staff/role changes (7 ops + 3 role ops), fee rule create/update/restore, S-065…S-069/S-100/S-110/S-127 (`stepUpFor`), balance + points adjustments, withdrawal mark-paid/reject, dispute decision, release funds, refund buyer, unblock approval, user deletion, exports with personal data (audit log, newsletter subscribers) — all present. Analytics widget export is aggregated (no step-up). Legacy-hold release/write-off also has step-up (Q-D3-2).
- BOG webhook matches ADR-004 / CONVENTIONS §10 (raw body stored, 200 empty, async, optional `Callback-Signature`, verified status fetch, unknown ids 200, malformed 400, no rate limit, not blocked by maintenance).
- Admin lists: user-activity lists have `?userId=` or an equivalent owner filter.
- Checker negative-tested: unknown `x-permission` key, bad `permissionBy` value, bad `stepUpFor`, missing `x-audit`, `?page` on a non-list, `emittedBy`/`x-emits` mismatch — all reported.
- Two foundation examples used invented keys; fixed to `t_plan_gig_limit_reached` and `t_validator_min`.

### data-model / ADR changes
- `data-model.md` (revision note at the top): `reconciliation_runs` (unique `run_day`, retry re-uses the row, alert timestamps) and `reconciliation_differences` — **PROPOSED** with P-135; payment `reviewed_at/reviewed_by_staff_id/review_note`; `payment_events.event_kind` `staff_check`; journal types `legacy_hold_release`, `legacy_hold_write_off`; `reports.status` `pending|dismissed|resolved` + `decision_note` (legacy "seen" → `pending`, proposed); `portfolio_status` + `rejected`, `rejection_reason`, reviewer columns (pending Q-D1-1); `fee_rules.name_ka/name_en`, `register_id` nullable; settings count: 127 approved rows + S-128 PROPOSED; S-121 and S-110 value shapes; `notification_deliveries.suppression_reason`; §4.8 statuses; ER §2.6; entity count 120 → 122.
- `ADR-008` (revision note): §5 reconciliation daily at S-128 Georgian time for the previous Georgian day (PROPOSED); new §5a run-day uniqueness and catch-up oldest first (EC-11/12); §6 how the "sitemap" health tile works without a sitemap job; §4/§7 use `system.health.read` from the approved catalogue instead of draft `system.queues.*`.

## Files created/changed
- `docs/04-api/src/components/schemas.yaml` (FieldError; UserSummary; new MaskedUserSummary, ModerationOwnerSummary, RatingSummary, RatingStarCounts, RatingBlock, EscrowActions; SubscriptionCheckoutTarget; example key), `components/parameters.yaml` (PageNumber), `components/responses.yaml` (example key)
- `docs/04-api/src/openapi.base.yaml` (global account-state rule), `src/ownership.yaml` (`/admin/referrals`, reserved `listGigs`, `getUserReviewSummary`)
- `docs/04-api/src/paths/f0-files.yaml`, `d1…d6` path files; `src/schemas/d1…d5.yaml`; `src/events/d3.yaml`, `d5.yaml`, `d6.yaml`
- `docs/04-api/scripts/check-contract.mjs`, `check-coverage.mjs`, `group-verify.mjs`
- `docs/04-api/CONVENTIONS.md`, `README.md`, `realtime.md`, `coverage/*.md` (rows, totals, resolution notes), `coverage/SUMMARY.md` (new, generated), `openapi.yaml`, `src/openapi.root.yaml` (generated)
- `docs/03-architecture/data-model.md`, `docs/03-architecture/adr/008-background-jobs-and-timers.md`
- this handoff. Not changed: specs, legacy, STATUS.md, `packages/i18n` (does not exist yet).

## What the next agent must do
1. **Orchestrator**: add the questions below to `docs/01-discovery/open-questions.md` (placeholders Q-111…), update `docs/STATUS.md`, commit on `feat/blueprint`.
2. **Security reviewer (P2-B5)**: review the items in the security list below, then the Owner gate (architecture.md, data-model.md, openapi.yaml).
3. **Phase 3 i18n**: add the new keys below to `packages/i18n/en.json` / `ka.json` when the package is created (English first, Georgian alongside, Q-058; the Owner refines).
4. After Owner approval, any contract change needs an ADR + handoff to backend, web, mobile (CLAUDE.md).

### New i18n keys (for Phase 3)
| Key | English | Georgian | Used by |
|---|---|---|---|
| `t_payment_method_not_available` | This payment method is not available for this purchase. | ეს გადახდის მეთოდი ამ შენაძენისთვის ხელმისაწვდომი არ არის. | D3 `CHECKOUT_METHOD_NOT_AVAILABLE` |
| `t_country_in_use` | This country is used by at least one user and cannot be deleted. | ეს ქვეყანა მითითებულია სულ მცირე ერთ მომხმარებელთან, ამიტომ მისი წაშლა შეუძლებელია. | D2 `COUNTRY_IN_USE` |
| `t_gig_restore_window_expired` | A removed gig can be restored only within 30 days. | წაშლილი სერვისის აღდგენა შესაძლებელია მხოლოდ 30 დღის განმავლობაში. | D2 `GIG_RESTORE_WINDOW_EXPIRED` |
| `t_offer_requires_conversation` (proposed, Q-116) | You can send an offer only to someone you have a conversation with or who asked you for an offer. | შეთავაზების გაგზავნა შეგიძლიათ მხოლოდ იმ მომხმარებლისთვის, ვისთანაც მიმოწერა გაქვთ ან ვინც შეთავაზება მოგთხოვათ. | D4 `createCustomOffer` (R-C2) — not yet referenced; contract returns `BUSINESS_RULE_VIOLATION` |
| `t_cannot_request_revision_during_dispute` (optional, Q-116) | You cannot request a revision while a dispute is open. | დავის განხილვისას გადამუშავების მოთხოვნა შეუძლებელია. | D4 `createEscrowRevisionRequest`; today reuses `t_cannot_complete_during_dispute` |
Not needed: `t_recaptcha_failed` (legacy `t_validator_recaptcha` reused). Every other `t_*` key cited by the contract exists in the specs/discovery.

## Open questions / risks
### Consolidated Owner questions (deduplicated; placeholders Q-111…)
"Gate" = answer before the Phase 2 gate (affects the contract shape, money, permissions or a PROPOSED item); "slice" = can wait for that feature's vertical slice (the contract already uses the safe default).

| # | Spec / AC | Question (plain language) | Safe default in the contract now | Recommendation | When |
|---|---|---|---|---|---|
| Q-111 | 05 AC-44…47, S-128, 00 R-5.3a (P-135, P-136) | Accept the proposed nightly money check (time setting S-128, default 03:00) and the Georgian-title character rule? | Operations exist, marked PROPOSED | Accept both | **Gate** |
| Q-112 | 16 AC-9 (D6-Q1) | Staff actions on their own account (log out, own profile, re-login, maintenance preview) need no permission from the list — OK? | `@self`, own data only, audited | Accept (no catalogue change) | **Gate** |
| Q-113 | 14 AC-13, 16 AC-42 (Q-D3-1) | Who may see the withdrawals list with IBANs: everyone with "payments read" (incl. Customer Support) or only "approve withdrawals"? | `payments.read` for list/detail | Use `withdrawals.approve` for list/detail too (less IBAN exposure) | **Gate** |
| Q-114 | 16 AC-40, 08 AC-29 (Q-D5-4) | Refund threads: readable only with "refund thread write", or also by anyone with "read chats"? | Refund threads need `refunds.thread.write`; other threads `chat.read` | Keep | **Gate** |
| Q-115 | 16 AC-24 (D4 risk) | Content moderators approve offers but cannot download offer attachments (needs "orders read"). Give them access? | No access | Accept as is, or grant `orders.read` to the moderator role | Gate |
| Q-116 | 12 R-C2, 13 AC-13 (Q-D4-4) | Texts for "offer only to people you talk to" and "no revision during a dispute" | Generic refusal / reused text | Add the two keys above | slice (12/13) |
| Q-117 | 16 AC-21 (Q-D1-1) | Portfolio "reject": keep a "rejected" state with a reason shown to the owner (and notify?) or reject = delete with reason? | `rejected` state + reason, no notification | Keep state; add a notification (new EV, marked NEW) | Gate (data model) |
| Q-118 | 16 AC-28 (D6-Q5) | Old reports marked "seen" — import as open? | Imported as `pending` | Accept | slice (16) |
| Q-119 | 16 AC-7 (Q-D3-2) | Re-login required before releasing/writing off old held balances? | Yes | Accept | Gate |
| Q-120 | 16 AC-44 (Q-D3-3) | A negative old held balance: may staff "release" it (lowers Available) or only write it off? | Release refused if Available would go below 0 | Write-off only for negatives | Gate (money) |
| Q-121 | 13 AC-30 (Q-D4-2) | "Refund buyer" while a dispute is open: allowed, or only via the dispute decision? | Refused (`DISPUTE_OPEN`) | Keep | Gate (money) |
| Q-122 | 16 AC-39 (Q-D4-1) | Escrow "overdue" filter means: auto-release deadline passed, or delivery date passed without delivery, or both? | Either | Both (two filter values) | slice (16) |
| Q-123 | 16 AC-20 (D2 Q1) | Restoring a removed gig: counts against the plan limit? back to "pending" when S-070 is OFF? notify the owner? | Restored to active, no notification, no limit check | Check the limit; notify (NEW event) | slice (04/16) |
| Q-124 | 10 AC-1 vs EC-5 (Q-D5-1) | With projects switched OFF, may a pending award still be accepted? | Award accept/decline/revoke and contracts keep working | Keep | slice (10/11) |
| Q-125 | 08 AC-19 (Q-D5-2) | "Chat now" from a masked project owner: may the chat show the real username? | Real username in chat | Keep (chat is a direct relationship) | slice (08) |
| Q-126 | 11 AC-21 (Q-D5-3) | Text for re-proposing after declining an award | `t_u_already_submitted_a_bid_to_this_project` | Product-analyst adds a precise key | slice (11) |
| Q-127 | 06/11/12 threads (Q-D5-5) | Attachments only in direct chats, not in item threads? | Text only in item threads | Keep | slice (08) |
| Q-128 | 10 AC-14 (Q-D5-6) | Hiding a project with a waiting award: revoke the award? | Award stays pending, no new awards | Keep | slice (10) |
| Q-129 | 08 AC-12 (Q-D5-7) | 30 messages/minute limit for all threads? | All kinds | Keep | slice (08) |
| Q-130 | 01 AC-7, AC-9 (Q-D1-2/3) | Message for an already-used verification link; answer for resend to an unknown email | `AUTH_LINK_INVALID`; same success text (no enumeration) | Keep | slice (01) |
| Q-131 | 02 AC-34 (Q-D1-4) | Account deletion: dialog only, no password? | No password | Keep (as spec) | slice (02) |
| Q-132 | 01 EC-8 (Q-D1-6) | Staff "switch 2FA off" for a user under `users.edit` with a reason? | Yes, audited | Accept | slice (16) |
| Q-133 | 09 (Q-D3-4) | Promo codes deletable only before first use (deactivate after)? | Yes | Accept | slice (09) |
| Q-134 | 05 AC-36 (Q-D3-5) | Billing profile: keep legacy city and zip fields? | Not included | Add them (parity) | slice (05) — QA parity |
| Q-135 | 17 AC-35 (D2 Q2, Q3) | Home: featured-category tiles vs category rows; keep the legacy "Latest projects" block? | Legacy behaviour; no "Latest projects" block | Keep the block via `searchProjects` | slice (17) |
| Q-136 | 16 AC-69 (D6-Q4) | "Retry" of a failed email with the read permission `system.health.read`? | Yes (approved spec) | Accept | slice (16) |
| Q-137 | 16 settings areas (D6-Q2) | Which settings area (permission) owns S-128? | `system` (Super-admin) | `payments` once P-135 is accepted | Gate (with Q-111) |
| Q-138 | 15 catalogue (D6-Q3) | Staff password-reset and staff email-change emails have no EV row | Reuse user templates | Product-analyst adds EV rows | slice (15/16) |
| Q-139 | 16 AC-7 (D6-Q6) | Staff re-login: password, or the emailed code only when 2FA is ON? | Password or code (S-060 ON) | Keep | slice (16) |
| Q-140 | 16 AC-3, AC-5 (D6-Q7/Q8) | Allow removing all roles from a staff member; forbid editing a role you hold yourself? | Both as stated | Accept | slice (16) |
| Q-141 | limits not in specs (Q-D1-5, D2 Q5, Q-D4-3, Q-D4-5, Q-D4-6, Q-D3-7) | Technical limits chosen: staff email subject 200 / body 10,000; support reply subject 200; offer-request days 1–365; offer price 1.00…9,999,999,999.00 GEL; order details 5,000 counted on submitted text; recon note 1–1,000; adjustment public note ≤ 500; points adjustment ≤ 1,000,000; referral benefit ≤ 120 months; plan features ≤ 30 lines; cart ≤ 100 lines / 50 upgrades | As listed | Accept; P2-B5 checks abuse limits | slice |
| Q-142 | 04 (D2 Q7) | Migrated gigs with unknown "revisions allowed": how to display? | `null` | Show "not specified" | slice (04) |
| Q-143 | 16 catalogue (D2 Q6) | Catalog/content screens are read with their write permission (no read permission exists) | write permission | Accept | slice (16) |

### Items for the security review (P2-B5)
1. Token/cookie names: `mt_at`, `mt_rt` (path `/api/v1/auth`), `mt_staff_at`, `mt_staff_rt` (path `/api/v1/admin/auth`), device cookie `mt_did`, mobile `deviceToken`; web gets no tokens in bodies; staff login returns body tokens to non-admin Bearer clients (`AdminAuthSession`).
2. Maintenance preview link: one-time link that sets a short-lived host-only bypass cookie (`adminCreateMaintenancePreviewLink`, `@self`).
3. Unsubscribe token: `unsubscribeNotificationEmail` is public, token valid 30 days, also the RFC 8058 target.
4. Unauthenticated analytics ingestion `ingestAnalyticsEvents` (rate limit; forwarded IP headers trusted only from the web server).
5. Outbound-link signing `createOutboundLinkSignatures`: anyone may sign any http/https URL (rate-limited) — integrity only, not an allow-list; alternative is server-side linkified signed text.
6. Zero-total Premium (100% promo) through `createPayment` with `bog_card` but without calling BOG.
7. Rate limits: global defaults 600 reads / 120 writes per minute per user or IP, staff 1,200; `createPayment` 20 / 10 min; payout password confirmation has no dedicated limit; cart guards.
8. IBAN visibility: withdrawals list/detail with `payments.read` (Q-113).
9. Content Moderator and offer attachments (Q-115); refund-thread reading rule (Q-114).
10. `getWebCustomCode` is public (its content is what every public page shows anyway); only the web server should render it; CSP from S-127.
11. Referral credit on `register`/`verifyEmail`/`completeSocialLogin` without `x-money` (exactly-once via journal ref) — D1 R10.
12. F0: restricted users may upload `appeal_file` only; confirm the purpose check happens before the presigned URL is issued.
13. `@self` operations (§6.3) and `permissionBy` selection by conversation kind / setting area / upload purpose.

### Risks
- P-135/P-136 content becomes binding only after Owner acceptance (Q-111); if rejected, remove the four reconciliation operations and the FieldError Georgian codes (additive, no other impact).
- `openapi-typescript` generation from the bundle is still untried (Phase 3).
- `realtime.md` §6 is generated once from `src/events`; keep it in sync by hand when an event changes (the checker validates the event files, not the markdown).
