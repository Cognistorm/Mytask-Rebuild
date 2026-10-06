# 4.1.20b Web: verification centre

From: web-engineer · To: mobile-engineer (4.1.24), qa-engineer (4.1.25+), security-reviewer (4.1.27),
web-engineer (4.1.20c) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Built spec 02 AC-36…AC-39 and EC-8 on the web, after the legacy `Account/Verification/VerificationComponent.php` and
`account/verification/verification.blade.php`. The texts are the legacy ones; no new i18n key.

- **`/account/verification`** sits in the dashboard shell (Buying side) with the account side card ("Verification
  center" marked current). The title is `t_verification_center` and the subtitle is
  `t_verification_center_subtitle`. `getMyKyc` decides what the page shows. A failed load offers Retry.
- **No verification yet:** the legacy 3 steps.
  1. `t_choose_document_type`: Government-issued ID, Driver license or Passport (wire values `national_id`,
     `driver_license`, `passport`).
  2. `t_upload_doc_front_side` and, except for a passport, `t_upload_doc_back_side`.
  3. `t_upload_selfie_with_id_msg` + `t_upload_selfie_with_id`.

  Navigation and checks:
  - The buttons are `t_back` / `t_next_step` / `t_finish`. Next and Finish check the step first: a missing choice
    or photo → `t_validator_required`, and no request is sent.
  - All steps stay mounted, so Back keeps the uploads. Next and Finish wait while a photo is still uploading or
    being scanned.
  - Finish calls `createKycVerification`. The back side is sent only for an ID card or a driver's licence. API
    field errors show under their photo.
  - A 409 (already pending or verified, e.g. from another tab) reloads the page, which then shows that
    verification.
- **Photos:** each photo uses the shared `ImageUploader` from 4.1.19, which has two new optional props:
  - `purpose` (default `portfolio_image`; here `kyc_document`);
  - `info` (here the legacy `t_verification_allowed_mimes_size`).

  The type and size rule is the fixed one: JPG/JPEG/PNG ≤ 5 MB, checked before upload. The preview is a local
  `blob:` URL, because KYC files have no public image.
- **A verification exists (status card):**
  - **Status:** `t_verification_pending` with the note `t_kyc_status_pending`, `t_account_verified`, or
    `t_verification_declined`.
  - **Date:** `t_verification_date` (submitted), `t_verified_at` or `t_declined_at` (reviewed).
  - **Decline reason:** shown under `t_reason`.
  - **Documents** (`t_verification_documents`): selfie, front and back, each with its legacy label, size and
    Download. Download calls `getFileDownload?mode=json` and goes to the 2-minute signed link. The link answers
    as an attachment, so the page stays.
  - **Declined** (`canSubmit`): `t_send_files_again` opens the 3 steps with new uploads. The declined row stays, as
    built by the API (EC-8).
- `formatBytes` in `apps/web/src/lib/format.ts` (legacy `format_bytes`).

## Files created/changed
- `apps/web/src/app/[locale]/(private)/account/verification/layout.tsx`, `page.tsx` (new)
- `apps/web/src/components/verification/verification-centre.tsx`, `verification.css` (new)
- `apps/web/src/components/portfolio-edit/image-uploader.tsx` (`purpose`, `info` props)
- `apps/web/src/lib/format.ts` (`formatBytes`)
- `apps/web/e2e/verification.spec.ts` (new, 7 tests)

Checks: web E2E 96 passed / 3 skipped; repo typecheck + lint 10/10; Prettier; i18n check; `next build` OK.

Also in this session, on the Owner's instruction (Q-162): there is no country in account settings. The decision is
in ADR-021 and contract 1.3.1; see `2026-10-02-solution-architect-to-backend-web-mobile-adr-021-no-country.md`.

## What the next agent must do
- **Web 4.1.20c:** report user on the public profile (AC-14).
- **Mobile 4.1.24:** use the same flow and keys. Offer the camera first for each photo (screens table), use
  purpose `kyc_document`, and send the back side only for `national_id` / `driver_license`. On a 409, reload
  `getMyKyc`. Download goes through `getFileDownload`.
- **QA:** `e2e/verification.spec.ts` covers the steps and their checks, Back keeping the uploads, the passport
  case, a wrong type, declined → send again, verified + Download, a 409, Georgian and 360 px. Full stack with
  `pnpm local`:
  - submit with real JPGs, then check EV-16 in Mailpit;
  - approve and decline in the admin (4.1.21), then check the badge, the reason and the EV-17/18 emails.
- **Security 4.1.27:**
  - KYC photos are fetched only through the owner's own 2-minute links, and nothing is cached.
  - Previews are local `blob:` URLs (CSP `img-src` already allows `blob:`).
  - Uploaded but unsubmitted photos stay as the user's unattached `ready` files, as noted in 4.1.19. For KYC
    (personal data) a cleanup of unattached `ready` files is more important; see also the retention point in the
    4.1.13 handoff.

## Open questions / risks
- No Owner question. No contract change from this task.
- **Deviation:** legacy showed the selfie first in the document list; kept. Legacy "Download" opened a public file
  URL (R-039); here it is a short-lived private link (CHANGE, AC-39).
- I used the legacy key `t_send_files_again` ("Send files again") for the button. The contract description
  mentions `t_kyc_send_again` ("Send documents again"); both keys exist, and the Owner can choose.
- The shell's `Me.kycStatus` is not refreshed after a submit. Nothing in the shell shows a pending state, and a
  later approval needs a new page load anyway.
