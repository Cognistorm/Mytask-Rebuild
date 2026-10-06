# 4.1.19 Web: portfolio create/edit

From: web-engineer · To: mobile-engineer (4.1.24), qa-engineer (4.1.25/4.1.26), security-reviewer (4.1.27),
web-engineer (4.1.20+) · Date: 2026-10-02 · Branch `feat/profiles`

## What I did
Spec 02 AC-24, AC-25, AC-27, AC-28 (owner view), AC-42 on the web, after the legacy
`Seller/Portfolio/PortfolioComponent.php` + `portfolio.blade.php` (list) and `Options/CreateComponent.php`,
`EditComponent.php` + `options/create.blade.php`, `edit.blade.php` (form). Texts and messages are the legacy ones.

- **`/seller/portfolio`** (Selling → Portfolio, nav item active): heading "My portfolio", "Add a new work" button,
  grid of the owner's works newest first (`listPortfolioItems` with the own username, 24 per page + "Load more"):
  thumbnail and title (opens the public item page in a new tab, as legacy), status pill Pending / Active /
  Rejected, **Edit** and **Delete** (confirm dialog with `t_are_u_sure_u_want_to_delete_project` →
  `deletePortfolioItem` → `t_project_deleted_success`), then the dashed "Add a new work" tile. A rejected work shows
  `t_portfolio_rejected_reason` under its card (AC-42); the reason comes from `getPortfolioItem` because
  `PortfolioItemCard` has none (one extra request per rejected card). Empty: `t_no_portfolio_yet` + the tile.
- **`/seller/portfolio/create`** and **`/seller/portfolio/{uid}/edit`** (url-map §5): fields on the left
  (title ≤ 100, description, project link and video link ≤ 120 with the legacy placeholders), thumbnail + gallery
  on the right, one submit (`t_create_project` / `t_update_project`), "Back to my works". Edit loads the item by uid
  (`lookupPortfolioItem`); not own / not found → "Page not found".
  - **Uploads:** new `ImageUploader` (components.md §5.13): purpose `portfolio_image`, limits from the public
    config `uploads.portfolioImage` (S-090 MB, S-089 images, extensions; legacy jpg/jpeg/png when the list is
    empty); type/size checked before any upload; per image preview, "Uploading / Processing", or the reason
    (type, size, scan verdict); Remove deletes the unattached file; the thumbnail picker keeps one image (a new
    pick replaces it). Help line `t_restrictions_files_allowed_info_explain` + `t_validator_max_array`.
  - **Create** with no thumbnail or no gallery image shows `t_validator_required` under that picker (no request).
    API field errors show under their field (`title`, `description`, `projectUrl`, `videoUrl`,
    `thumbnailFileId`, `imageFileIds`); others above the submit.
  - **Edit** shows the current thumbnail and gallery; a new thumbnail / new gallery images replace them (AC-27, NEW
    hint `t_portfolio_new_images_replace_gallery`). Only changed images are sent (`thumbnailFileId`,
    `imageFileIds` omitted otherwise); text fields always sent trimmed, empty links as `null`.
  - **Status above the form:** rejected → "Rejected" pill + reason (AC-42); pending → "Pending" pill +
    `t_portfolio_pending_review`.
  - **After save:** back to `/seller/portfolio` with `t_ur_project_created_successfully` /
    `t_ur_project_updated_successfully` (legacy redirect + flash), plus `t_portfolio_pending_review` when the API
    answered `pending` (S-071 OFF, AC-25). The query flag is removed from the address after it is shown.
- **Legacy URL** `/seller/portfolio/edit/{uid}` → **301** to `/seller/portfolio/{uid}/edit` (route handler, both
  locales).
- **Shared:** `.mt-button-danger` in `@mytask/ui/web` (`dashboard.css`, tokens `action.danger*`).

## Files created/changed
- `apps/web/src/app/[locale]/(private)/seller/portfolio/layout.tsx`, `page.tsx`, `create/layout.tsx`,
  `create/page.tsx`, `[uid]/edit/layout.tsx`, `[uid]/edit/page.tsx`, `edit/[uid]/route.ts` (new)
- `apps/web/src/components/portfolio-edit/my-portfolio.tsx`, `portfolio-form.tsx`, `edit-portfolio.tsx`,
  `image-uploader.tsx`, `portfolio.css` (new)
- `packages/ui/src/web/dashboard.css` (`.mt-button-danger`)
- `packages/i18n/en.json`, `ka.json`: **1 NEW key** `t_portfolio_new_images_replace_gallery`
  ("New images replace the current gallery." / "ახალი სურათები ჩაანაცვლებს მიმდინარე გალერეას.")
- `apps/web/e2e/portfolio-edit.spec.ts` (new, 8 tests)

Checks: web E2E 81 passed / 3 skipped (full-stack ones), repo typecheck + lint clean, Prettier clean, i18n check,
`next build` OK.

## What the next agent must do
- **Mobile 4.1.24:** same ops and keys: list via `listPortfolioItems?username=<me>`, rejected reason via
  `getPortfolioItem`; create needs thumbnail + 1…S-089 images (camera or library, jpg/jpeg/png ≤ S-090 MB); edit
  sends only changed images; delete with a confirm; success texts as above + pending note.
- **QA:** `e2e/portfolio-edit.spec.ts` covers the list, create (S-071 ON/OFF), edit of a rejected work, delete,
  not found and the 301. Full stack with `pnpm local`: create a work with real JPGs with S-071 OFF, approve and
  reject it in the admin (4.1.21), check the owner list, the public pages and the emails.
- **Security 4.1.27:** uploads reuse the shared protocol (owner-only files, purpose `portfolio_image`, API
  re-checks type/size/scan and "own ready file not used by another item"); project/video links are user input
  shown on the public item page (rendered there with `nofollow ugc noopener noreferrer`, 4.1.17).

## Open questions / risks
- No Owner question, no contract or data-model change.
- **Deviation (for QA/Owner):** the legacy list card showed the creation date; `PortfolioItemCard` has no date, so
  the card shows status and actions only. A contract change would be needed to bring it back.
- **Deviation:** legacy deleted with a browser `confirm()`; here a dialog (design §8.1). Legacy cards linked to
  the item page in a new tab; kept.
- Reordering the gallery (components.md §5.13 "order handles") is not built: the order is the pick order, and
  legacy had no reordering either.
- Uploaded but never saved images (user leaves the form) stay as the user's unattached `ready` files: the
  worker's 24 h cleanup (4.1.4) removes only `pending` uploads. Remove deletes them at once. Same for avatar and
  appeal uploads; for the backend/security to decide whether unattached `ready` files need a cleanup too.
