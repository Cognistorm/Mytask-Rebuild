# 4.1.6b Appeal file picker: web, mobile, admin

From: web-engineer + mobile-engineer · To: QA and security (4.1.26, 4.1.27), DevOps (Phase 6), later slices with uploads · Date: 2026-10-02 · Branch `feat/profiles` (local only, Owner rule 2026-10-02)

## What I did
- **Shared upload protocol** (`packages/api-client/src/upload.ts`, exported from `@mytask/api-client`):
  - `uploadFile(api, {purpose, fileName, sizeBytes, contentType, body}, {onScanning, pollMs, timeoutMs, signal})` runs ADR-009 §3 in four steps:
    1. `createFileUpload`;
    2. multipart POST to the presigned URL (the fields first, the file last);
    3. `completeFileUpload`;
    4. poll `getFile` until `ready` or `rejected`.
  - Results: API refusals come back unchanged. A failed storage POST returns `UPLOAD_FAILED`, a scan that takes too long `UPLOAD_TIMEOUT` (default 5 min). Both carry the `fileId`, so the screen can delete the row.
  - `body` is a `Blob` on the web and `{uri, name, type}` in React Native.
  - Helpers: `fileExtension` (same rule as the API) and `declaredType`, which falls back to `application/octet-stream` when the system reports no type.
  - Transport only; the limits and messages stay in the screens.
- **Web** `/restricted` (`apps/web/src/components/appeal-files.tsx`):
  - The limits come from `getPublicConfig.uploads.appealFile` (S-091…S-093). The legacy notice "File must be less than {size} MB and allowed types are …" is shown under the picker.
  - The label is "Attach a file", with a `*` when the restriction has `filesRequired`. The `<input type="file">` uses `accept` with the allowed extensions.
  - Client pre-checks: a wrong type or a file that is too large never leaves the browser. When S-091 is reached, the picker is disabled and a `t_validator_max_array` notice is shown.
  - Each file shows its name, size, and a state: uploading → processing → ✓, or the reason (pre-check, scan verdict, API error). Remove deletes the unattached upload (`deleteFile`).
  - The submit button waits while an upload runs. The API's `fileIds` error is shown under the picker.
  - **No download for the user** (Owner 2026-10-02).
- **Web CSP fix (needed for any upload):** the private and public pages had `connect-src 'self'`, so browsers could not POST to storage at all.
  - `lib/csp.ts` `storageOrigin()` adds the storage origin. It comes from `S3_PUBLIC_ENDPOINT`, else `S3_ENDPOINT`, else `http://localhost:8333` under `next dev`. Only an http(s) origin is used.
  - Compose passes `S3_PUBLIC_ENDPOINT` to the web container; `.env.example` notes it.
- **Mobile** `restricted.tsx` (`apps/mobile/src/components/appeal-files.tsx`):
  - Same rules and states as the web.
  - "Take a photo" uses `expo-image-picker` 57.0.20, camera only; the button is shown only when jpg/jpeg is allowed.
  - "Browse files" uses `expo-document-picker` 57.0.3 (multiple, copied to the cache).
  - `app.config.ts` registers the image-picker plugin with a camera prompt, and requests no photo-library or microphone access.
  - When the size of a picked file is unknown, the file is refused with "something went wrong": the size is part of the upload policy.
- **Admin** appeals queue (`apps/admin/src/app/restrictions/page.tsx`):
  - "Attachments" lists each file with name, size and a Download button.
  - Download calls `adminGetRestrictionAppealFileDownload?mode=json` (audited by the API), then `location.assign` of the signed URL. It is an attachment, so the page stays.
- **i18n:**
  - Reused: `t_attach_a_file`, `t_restrictions_files_allowed_info_explain`, `t_browse_files`, `t_remove`, `t_uploading`, `t_processing`, `t_download`, `t_attachments`, `t_selected_file_*`, `t_validator_max_array`.
  - NEW (en + ka): `t_ui_file_size_mb` ("{{size}} MB" / "{{size}} მბ") and `t_ui_take_photo` ("Take a photo" / "ფოტოს გადაღება").

## Files created/changed
- New:
  - `packages/api-client/src/upload.ts`, `packages/api-client/test/upload.test.ts` (5 tests)
  - `apps/web/src/components/appeal-files.tsx`, `apps/web/e2e/restricted-appeal.spec.ts` (3 tests)
  - `apps/mobile/src/components/appeal-files.tsx`
  - `apps/admin/e2e/restriction-appeal-files.spec.ts` (1 test)
- Changed:
  - `packages/api-client/src/index.ts`
  - web: `apps/web/src/app/[locale]/(private)/restricted/page.tsx`, `apps/web/src/lib/csp.ts`, `apps/web/src/proxy.ts`, `apps/web/src/components/auth/auth.css`, `apps/web/playwright.config.ts`
  - mobile: `apps/mobile/src/app/restricted.tsx`, `apps/mobile/app.config.ts`, `apps/mobile/package.json` + `pnpm-lock.yaml`
  - admin: `apps/admin/src/app/restrictions/page.tsx`, `apps/admin/src/components/auth.css`
  - `packages/i18n/{en,ka}.json`, `docker-compose.yml`, `.env.example`
- Results:
  - Web E2E: 42 passed / 3 skipped (stack-only). Admin E2E: 2 passed / 4 skipped (stack-only).
  - api-client: 9/9.
  - Repo-wide: typecheck and lint 10/10, prettier clean, i18n check OK.

## What the next agent must do
- **QA (4.1.26):**
  - Web: the appeal with 1–2 files, a rejected file (EICAR with `--profile scan`), the `.exe` pre-check, Remove, and the required mark on `filesRequired`.
  - Mobile on a real device: camera and files; Android gives `content://` URIs, which the document picker copies to the cache.
  - Admin: the download opens and writes an audit row.
- **Security (4.1.27):** the CSP change. `connect-src` now has the storage origin on all pages (public pages too, which is where later slices upload); the custom-code hosts are still only on public pages.
- **DevOps (Phase 6):**
  - Set `S3_PUBLIC_ENDPOINT` for the web app in staging/production.
  - Configure bucket **CORS** on the provider: POST from the web origin for the `private` and `kyc` buckets. Local SeaweedFS allows any origin by default.
- **Later upload slices** (avatar, portfolio, KYC, gigs, chat, deliveries…): reuse `uploadFile`. The two pickers are appeal-specific; extract a generic picker when the second one is built.

## Open questions / risks
- The mobile app was not run on a device or emulator here (none on this machine): it is checked by typecheck, lint and `expo config` only. `expo-doctor` reports only the existing TypeScript version pin (5.9.3 vs the expected ~6.0.3), which was there before.
- The camera prompt text in `app.config.ts` is English only: native permission prompts need store-language files (iOS `locales`), a Phase 6 store-preparation item.
- Files on restrictions that do not require them stay accepted (Owner 2026-10-02, "all good"): the picker is shown on every appeal, and marked required only with `filesRequired`.
