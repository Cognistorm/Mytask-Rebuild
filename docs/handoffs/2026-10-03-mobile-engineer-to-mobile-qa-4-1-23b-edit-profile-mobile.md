# 4.1.23b Mobile: edit profile + availability

From: mobile-engineer · To: mobile-engineer (4.1.24), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

## What I did
Built spec 02 AC-15…AC-23 in the app. I followed the screens table ("Edit profile: per-block saving, inline errors, success"; "Availability: bottom sheet with date picker"), design §5.8 Radio and §5.11 DatePicker, and the web 4.1.18. The blocks, their order, texts, API calls and rules are the same as on the web.

- **Screen** `src/app/account/profile.tsx`. Open it from the Account tab ("Edit profile") or with the "Edit profile" button on your own public profile (AC-13).
  - It has its own session gate: signed out → login, restricted → `/restricted`.
  - It reads `getMe` + `getMyProfile` once. A failed read shows a notice and "Try again".
  - Every block saves on its own and shows its own success message or error. Field errors show under their field.
- **Card** (`components/profile-edit/card.tsx`):
  - **Avatar** (AC-16): "Take a photo" (camera) or "Choose from gallery" (the system photo picker, which needs no photo-library permission). Both crop to a square.
    - Before any upload the app checks the type (jpg/jpeg/png/webp) and the size (≤ 2 MB), using the legacy texts.
    - The file name comes from the written file's type: an edited gallery photo is re-encoded, while its original name may still say `.heic`.
    - Then the shared upload protocol runs (purpose `avatar`), showing "Uploading" and then "Processing", and `putMyAvatar` sets the new photo.
    - A rejected or unusable upload is deleted again.
    - "Remove" calls `deleteMyAvatar`, and the first letter shows instead.
  - Username with the verified mark (KYC verified), and the full name.
  - **Headline** edited in place (AC-17, trimmed, ≤ 100).
  - "Unavailable" pill while availability is set; member since.
- **Availability** (`availability.tsx`, AC-22/AC-23):
  - "Set availability" opens a bottom sheet (the 4.1.23a `BottomSheet`) with a native date picker and the message (≤ 750, trimmed).
    - The earliest date is tomorrow in Asia/Tbilisi. iOS shows the calendar inside the sheet; Android opens its date dialog from a date field.
    - The date starts on the current value, or on tomorrow. The picker always shows a chosen day, so the form must hold one too.
    - The API's `t_pls_select_availability_date_in_future` shows under the date.
  - While availability is set, the block shows the pill, `t_u_wont_be_able_to_receive_orders_until_date` and the message, plus "Change" (prefilled) and "Remove".
- **About me** (AC-18), **Linked accounts** (AC-21: only when `linkedAccountsEnabled`, S-123; all seven fields saved together, an empty field is sent as `null`, URL keyboard).
- **Skills and languages** (`entries.tsx`, AC-19/AC-20):
  - one form adds a new entry, or updates the one being edited;
  - the level is chosen with a new mobile `RadioGroup`;
  - the list shows newest first, with Edit / Delete per row;
  - duplicates and other errors show the API's 409 texts.
- **"Update profile" block** with links to Change password and View profile.
- **Own public profile** now re-reads quietly when it comes back into view, so your edits show at once.
- **Shared pieces** (`block.tsx`): `Block`, `useBlockState`, `BlockMessage`, `EditLink`, `RadioGroup`, `ButtonRow`/`ButtonCell`. 4.1.24 reuses them.

## Files created/changed
- New:
  - `apps/mobile/src/app/account/profile.tsx`
  - `apps/mobile/src/components/profile-edit/block.tsx`, `card.tsx`, `availability.tsx`, `entries.tsx`
- Changed:
  - `apps/mobile/src/app/profile/[username].tsx`: "Edit profile" for the owner; reload on focus
  - `src/app/(tabs)/account.tsx`: "Edit profile" link
  - `src/components/form.tsx`: `Input` takes a `url` keyboard and the `URL` content type
  - `src/lib/format.ts`: `platformToday`, `addDays` (as the web), `dateOnlyToLocal` / `localToDateOnly` for the picker
- **New dependency** `@react-native-community/datetimepicker` 9.1.0, the version bundled with Expo 57 (installed with `expo install`; Expo Go includes it).
  - Its config plugin is added in `app.config.ts`.
  - The camera prompt text now also names the profile photo. The store-language texts are still Phase 6.
- `packages/i18n/en.json`, `ka.json`: **1 NEW key** `t_ui_choose_photo` ("Choose from gallery" / "გალერეიდან არჩევა"), next to the existing `t_ui_take_photo`.
- `docs/SETUP-LOCAL.md` §4: new step 12.

## Checks
- Mobile typecheck + lint: OK. Repo typecheck 10/10, lint 10/10.
- Prettier: clean. i18n check: OK; all 107 keys used exist in en + ka.
- `expo export` iOS + Android: OK.
- The date helpers were checked in Node: 21:30 UTC → tomorrow in Tbilisi is the next day, the year rollover is right, and the local ↔ date round trip is right.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 12.

## What the next agent must do
- **4.1.24:**
  - add Account settings and the Verification centre to the "Update profile" block (`account/profile.tsx`) and to the Account tab;
  - reuse `Block` / `RadioGroup` / `BottomSheet` / the avatar upload pattern for the portfolio images and the KYC photos.
- **QA:** on a phone, run SETUP-LOCAL step 12 and compare with the web `/account/profile`:
  - avatar from the camera and from the gallery;
  - a HEIC gallery photo (it should upload as JPEG after the crop);
  - a > 2 MB photo (refused before the upload);
  - availability with an Android and an iOS picker;
  - duplicate skill / language;
  - linked accounts with S-123 ON / OFF.
- **Security 4.1.27:**
  - the avatar uses the shared upload protocol (owner-only file, purpose `avatar`); the API re-checks type, size and the scan;
  - linked-account URLs are user input; the API accepts only http/https.

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Deviation:** the web language field suggests the 137 legacy language names (`<datalist>`). The app has free text only (the contract allows any name ≤ 100). A suggestion list would need the list moved to a shared package; it can come with the Owner's word.
- **Deviation:** the availability date starts on tomorrow instead of empty (the native picker cannot show "no date"). The user still confirms with "Set availability".
- Avatar crop: `allowsEditing` crops on both platforms. On Android the system cropper's look depends on the device.
- An avatar photo with an unknown size (rare; the picker usually reports it) is refused with `t_toast_something_went_wrong`, the same as the appeal picker. The size is part of the upload policy.
- The date picker, the radio group and the avatar crop have not been seen on a device yet. Check them in Expo Go (step 12).
