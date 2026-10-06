# 4.1.24d Mobile: Verification centre

From: mobile-engineer · To: qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

This finishes 4.1.24: a = portfolio viewer, b = owner portfolio, c = account settings, d = verification centre.

## What I did
I built spec 02 AC-36…AC-39 and EC-8 in the app. I followed the screens table ("same 3 steps, camera first; pending / verified / declined (with "send again")"). The steps, texts, rules and ops match the web 4.1.20b (legacy `VerificationComponent.php:129-393`).

- **`/account/verification`** (`src/app/account/verification.tsx`): signed out → login, restricted (from `getMe`) → `/restricted`. Title `t_verification_center` with the legacy subtitle. `getMyKyc` decides the view.
  - **No verification, or "Send files again" after a decline (EC-8):** the legacy 3 steps.
    1. Document type (radio group, the legacy labels).
    2. Front + back photos (passport: front only).
    3. Selfie with the document (`t_upload_selfie_with_id_msg`); "Take a photo" opens the **front camera**.
    - "Next" / "Finish" check their step (`t_validator_required`). "Back" keeps the uploads, because all steps stay mounted and hidden.
    - Each photo: camera or gallery, `kyc_document`, JPG/JPEG/PNG ≤ 5 MB checked before upload (fixed rule, AC-36), "Uploading / Processing" or the reason, Remove. The info line is the legacy `t_verification_allowed_mimes_size`.
    - "Finish" → `createKycVerification`. A 409 (one already pending or verified, e.g. sent from the website, AC-38) reloads and shows it. Other errors show under their field or above the steps.
  - **A verification:** status card with these parts.
    - Status: pending `t_verification_pending` + `t_kyc_status_pending`, verified `t_account_verified`, or declined `t_verification_declined` with the reason.
    - The date (sent, verified at or declined at).
    - The documents with their size and "Download". Download asks for the owner-only signed link (`getFileDownload?mode=json`, 2 min, AC-39) and opens it in the browser.
    - "Send files again" appears when `canSubmit`.
- **Image picker** (from 4.1.24b) now takes `purpose`, `info` and `camera: 'front'`.
- **`formatBytes`** in `lib/format.ts` (as the web).
- **Links:** "Verification centre" on the Account tab (after View profile, before Password and security, as the web card) and in the edit-profile "Update profile" links.

## Files created/changed
- New: `apps/mobile/src/app/account/verification.tsx`
- Changed:
  - `components/portfolio-edit/image-picker.tsx` (`purpose`, `info`, `camera`)
  - `lib/format.ts` (`formatBytes`)
  - `app/(tabs)/account.tsx`, `app/account/profile.tsx` (links)
  - `docs/SETUP-LOCAL.md` §4: new step 16
- No new i18n key. All keys used exist in en and ka.

## Checks
- Mobile typecheck + lint: OK.
- Prettier: clean. i18n check: OK.
- `expo export` iOS + Android: OK.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 16.

## What the next agent must do
- **4.1.25:** E2E main flows. The app still has no E2E harness, so decide whether 4.1.25 adds one (Maestro or Detox) or keeps the manual steps 10–16.
- **QA:** compare with the web `/account/verification` on a phone:
  - each document type (passport without back);
  - missing photo per step;
  - too big / wrong type;
  - Back keeps the photos;
  - selfie front camera;
  - 409 when one was sent on the website;
  - approve / decline in admin `/kyc`, then "Send files again";
  - Download.
- **Security 4.1.27** (KYC, personal data):
  - photos go straight to private storage (`kyc` bucket) through the upload protocol, and the API re-checks type, size and ownership;
  - the downloaded photo opens in the system browser from a 2-minute signed link, so the URL may stay in the browser history until it expires;
  - removed uploads are deleted best effort, and unused ones are cleaned after 24 h;
  - camera photos are not saved to the phone's gallery by the app (expo-image-picker writes to the app cache).

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Deviation:** Download opens the photo in the browser instead of saving a file (the web downloads an attachment). Keeping KYC photos out of the phone's gallery seemed the safer default. Security may prefer an in-app viewer instead.
- Not seen on a device yet. Check the front camera and the hidden steps in Expo Go (step 16).
