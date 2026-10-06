# 4.1.24b Mobile: Selling → Portfolio (owner list + create/edit)

From: mobile-engineer · To: mobile-engineer (4.1.24c), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27) · Date: 2026-10-03 · Branch `feat/profiles`

## What I did
I built spec 02 AC-24, AC-25, AC-27, AC-28 (owner view) and AC-42 in the app. I followed the screens table ("Selling → Portfolio → +": upload progress per image; error per file; success with the pending-review note; rejected chip and reason above the form). The fields, texts, rules and ops match the web 4.1.19.

- **`/seller/portfolio`** (Selling nav item "Portfolio" now shows):
  - **List:** title "My portfolio", then "Add a new work". The owner's works come newest first from `listPortfolioItems` (own username, 24 per page + Load more). A rejected work's reason comes from one `getPortfolioItem` per rejected card, as on the web.
  - **Each card** has the thumbnail, the title, a status pill (Pending / Active / Rejected; new `success` tone on `Pill`), the rejection reason, and Edit / Delete. Tapping the card opens the in-app item viewer from 4.1.24a (the web opens a new tab).
  - **Delete:** a bottom-sheet confirm with `t_are_u_sure_u_want_to_delete_project` → `deletePortfolioItem` → `t_project_deleted_success`.
  - **Empty:** `t_no_portfolio_yet`.
  - Signed out → login; restricted → `/restricted`. The list re-reads on focus.
- **`/seller/portfolio/create`** and **`/seller/portfolio/[uid]/edit`** share `components/portfolio-edit/portfolio-form.tsx`:
  - title ≤ 100, description (multiline), project link and video link ≤ 120 with the legacy placeholders;
  - a thumbnail picker and a gallery picker;
  - submit `t_create_project` / `t_update_project`, plus "Back to my works".
  - **Edit** loads by uid (`lookupPortfolioItem`, after a `getMe` that refreshes the token). Not own or not found → `t_page_not_fount`. It shows the current thumbnail and gallery and the `StatusNote` (Pending / Rejected + reason) above the form.
  - **Create** with no thumbnail or no gallery image shows `t_validator_required` under that picker, and no request is sent. API field errors show under their field; others show above the submit.
  - **Edit sends only what changed:** text fields trimmed, empty links as `null`, image ids only when new images were picked (AC-27, with the hint `t_portfolio_new_images_replace_gallery`).
  - **After save:** `router.dismissTo('/seller/portfolio')` with `t_ur_project_created_successfully` / `t_ur_project_updated_successfully`, plus `t_portfolio_pending_review` when the API answered `pending` (S-071 OFF, AC-25). The new `lib/flash.ts` carries the message, shown once on focus.
- **Image picker** `components/portfolio-edit/image-picker.tsx` (the app's `ImageUploader`):
  - camera or photo library (several at once when more fit). iOS hands over JPEG instead of HEIC (`preferredAssetRepresentationMode: Compatible`).
  - Limits come from the public config `uploads.portfolioImage` (S-090 MB, S-089 count, extensions; legacy jpg/jpeg/png when the list is empty).
  - Type, size and count are checked before any upload. The file name follows the written file's type.
  - Each image shows a preview with "Uploading / Processing" or the reason (type, size, scan verdict), and Remove (which deletes the unattached file). The thumbnail picker keeps one image, and a new pick replaces it.
- **Entry points:**
  - Selling nav (`lib/dashboard.ts` `screen: '/seller/portfolio'`);
  - "Create" (`t_create_project`) in the owner's empty portfolio preview on their profile.
- **Shared:** `Button` takes `danger` (token `action.danger`); `Pill` has a `success` tone.

## Files created/changed
- New:
  - `apps/mobile/src/app/seller/portfolio/index.tsx`, `create.tsx`, `[uid]/edit.tsx`
  - `apps/mobile/src/components/portfolio-edit/portfolio-form.tsx`, `image-picker.tsx`
  - `apps/mobile/src/lib/flash.ts`
- Changed:
  - `lib/dashboard.ts` (Portfolio screen)
  - `components/form.tsx` (`Button` `danger`)
  - `components/profile.tsx` (`Pill` `success`)
  - `app/profile/[username]/index.tsx` (Create action)
  - `docs/SETUP-LOCAL.md` §4: new step 14
- No new i18n key. All keys used exist in en and ka.

## Checks
- Mobile typecheck + lint: OK.
- Prettier: clean. i18n check: OK.
- `expo export` iOS + Android: OK.
- There is still no mobile E2E harness. The manual steps are in SETUP-LOCAL §4 step 14.

## What the next agent must do
- **4.1.24c:** Account → Settings (AC-29…AC-34) and the Account tab links (AC-35). Settings and the verification centre also join the "Update profile" links on the edit-profile screen. `Button danger` and `BottomSheet` are ready for the delete-account dialog.
- **QA:** compare with the web `/seller/portfolio`, `/create` and `/{uid}/edit` on a phone:
  - create with and without images;
  - wrong type, too big, more than S-089;
  - S-071 ON / OFF;
  - edit a rejected work (the reason is gone after saving);
  - edit replacing the gallery;
  - delete;
  - another user's uid → Page not found.
- **Security 4.1.27:**
  - uploads go through the shared protocol; the API re-checks type, size and count and scans every file;
  - removed and replaced uploads are deleted best effort, and unused `pending` files are cleaned after 24 h (4.1.4).

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Deviations from the web:**
  - the card opens the in-app item viewer, not a new browser tab;
  - the "Add a new work" dashed tile at the end of the grid is replaced by the button at the top (one entry point on a phone list).
- Android pickers may return WEBP for some gallery photos. The API's list for portfolio images (jpg/jpeg/png) refuses them with the type message before upload. If QA finds this common, a re-encode to JPEG (e.g. `expo-image-manipulator`) is a small follow-up.
- Not seen on a device yet. Check the multi-select picker, the progress per image and the delete sheet in Expo Go (step 14).
