# 4.1.13 KYC API — user and staff operations

From: backend-engineer · To: web-engineer (4.1.20, 4.1.21), mobile-engineer (4.1.24), qa-engineer, security-reviewer · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Built the 7 KYC operations of contract 1.3.0 (spec 02 AC-36…AC-40, R-P8, EC-8; spec 16 AC-19, AC-27, AC-31). No contract or data-model change.

**User side**
- `createKycVerification` (`POST /kyc`): document type + front + back (ID card and driver's licence) or no back (passport) + selfie. A back side that does not match the type → 400 on `backFileId` with `t_please_select_a_valid_document_type`. Files must be the caller's own `ready` `kyc_document` uploads, three different ones, not used by any earlier verification (else 422 `FILE_PURPOSE_MISMATCH`; not scanned yet → 422 `FILE_NOT_READY`). Creates `pending` with provider = S-122 and sends EV-16 to every S-100 address in the same transaction.
- One pending or verified verification per user (AC-38): 409 `STATE_CONFLICT` with `details.currentState` `pending` (`t_kyc_status_pending`) or `verified` (`t_verified_account`). Two parallel submits: the partial unique index lets one through, the other gets the same 409.
- After a decline the user submits again without limit (EC-8) with **new** photos. Legacy deleted the declined row on "send files again" (`VerificationComponent.php:376-393`); here the declined row stays (staff history, `earlierRejectionCount`), and the new submit creates a new row.
- `getMyKyc` (`GET /me/kyc`): latest verification (with `declineReason` when declined), `status` (`none` before the first) and `canSubmit`.
- Attached KYC photos answer 409 on `deleteFile`. The owner still opens their own photos with `getFileDownload` (2-minute link); everyone else gets 404 (AC-39, unchanged F0 rule).

**Provider seam (AC-40)**: `kyc-provider.ts` — `KycProvider` interface (`submitted(row, tx)` in the submit transaction), `ManualKycProvider` (does nothing; staff decide), `KycProviders` picks by S-122. An external service later adds a provider there.

**Staff** (`/admin/kyc`, permission `kyc.review`)
- `adminListKycVerifications`: default `status=pending` oldest first, other statuses newest first, 50 per page, `totalCount`; filters `documentType`, `userId` (user page KYC tab), `createdFrom`/`createdTo`. No file URLs.
- `adminGetKycVerification`: verification + `ModerationOwnerSummary` (`earlierRejectionCount` = the user's declined verifications) + `reviewedBy`.
- `adminApproveKycVerification` (optional note → audit reason, `kyc.approve`, EV-17) and `adminDeclineKycVerification` (reason required after trimming, ≤ 1,000, stored as `declineReason`, audit `kyc.decline`, EV-18 with `reason` in the payload): compare-and-set on `pending`; the second decision → 409 `STATE_CONFLICT` `t_item_already_decided`. Approval makes `UserSummary.isIdVerified` true everywhere (already read by `UserSummaries`).
- `adminGetKycFileDownload`: only a front/back/selfie of this verification (else 404), file must be ready; 302 or `?mode=json`, `Cache-Control: no-store`, 2-minute link from the `kyc` bucket; every view audited (`kyc.file_view`, target `kyc_verification`, `after: { userId, fileId }`).

**Emails** (outbox → worker), legacy texts:
- EV-16 `Admin/NewIdVerificationPending` → link `<admin>/kyc`. Legacy texts were hard-coded English; **two new i18n keys** (en = legacy text, ka filled by me): `t_subject_admin_pending_kyc`, `t_notification_admin_pending_kyc`.
- EV-17 / EV-18 → link `/account/verification` (`t_subject_everyone_verification_approved/declined`, `t_notification_verification_approved/declined`). The decline email keeps the legacy body; the reason shows in the Verification centre. In-app + push of EV-17/18 stay for slice 14 (payload ready).
- `account.updated` (x-emits) waits for the realtime gateway (slice 08), like 4.1.11.

## Files created/changed
- `apps/api/src/modules/profiles/kyc.service.ts`, `kyc.controllers.ts`, `kyc-provider.ts` (new); `profiles.module.ts`
- `apps/api/src/platform/outbox/outbox.service.ts` (EV-16, EV-17, EV-18), `apps/api/src/platform/mail/templates.ts`
- `packages/i18n/en.json`, `ka.json` (2 new keys)
- `apps/api/test/kyc.test.ts` (15 tests)

Checks: API 369 passed / 5 skipped, typecheck, ESLint, Prettier, i18n check OK.

## What the next agent must do
- **4.1.15**: all spec 02 email templates are now built (EV-11…EV-18, EV-126). What remains is a check that every event is wired, or tick it as covered.
- **web (4.1.20) / mobile (4.1.24)**: Verification centre = `getMyKyc`. Form: choose type → upload each photo (`kyc_document`, JPG/JPEG/PNG ≤ 5 MB; mobile offers the camera) → complete → poll `getFile` until ready → `createKycVerification`. Pending: `t_kyc_status_pending`; declined: reason + "Send documents again" (`t_kyc_send_again`) restarts the form with new uploads; verified: badge.
- **admin (4.1.21)**: KYC queue at `/kyc` (the EV-16 email links there), detail with the three images via `adminGetKycFileDownload?mode=json`, approve (optional note) / decline (reason), reload after a 409.
- **QA**: parity with legacy submit/approve/decline; CHANGE items: S-100 recipients (legacy: first admin), decline reason, declined rows kept, private files.
- **Security (4.1.27)**: KYC file access (owner + `kyc.review` only, audited, 2-minute links).

## Open questions / risks
- Declined verifications keep their photos in the `kyc` bucket indefinitely (as legacy kept them on disk). A retention rule for KYC images is not in any spec; worth a decision before launch (personal data). Not blocking — noted for the security review.
- No new Owner question.
