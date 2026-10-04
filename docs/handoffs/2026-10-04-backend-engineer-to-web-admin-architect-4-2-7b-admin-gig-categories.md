# 4.2.7b: staff gig category CRUD (spec 16 AC-60)

## What I did
- The 5 operations of the contract (`/admin/categories`, `catalog.write`, contract 1.3.2 unchanged): `adminListCategories`, `adminCreateCategory`, `adminGetCategory`, `adminUpdateCategory`, `adminDeleteCategory`. New `catalog/admin-categories.service.ts` + `catalog/admin-catalog.controllers.ts`. `CatalogModule` now imports `FilesModule`.
- **Create**:
  - Levels: `parentId` null → level 1, a level-1 id → 2, a level-2 id → 3. A level-3 parent → `422 BUSINESS_RULE_VIOLATION` (`t_category_max_depth`, NEW); an unknown parent → 404.
  - Slug: `409 DUPLICATE` (`details.field = slug`) when another category at that level has it as its current slug **or** as an old slug (§3.R).
  - Position: when omitted, the category goes last among its siblings. `isVisibleOnHome` defaults to `true`.
- **Texts**:
  - Names are trimmed; a blank Georgian name → 400 `name.ka`.
  - The English row exists only with an English name. English description or SEO text without an English name → 400 `name.en`.
  - SEO texts (`contentTop`/`contentBottom`) go through `RichText.sanitize(…, 'staff_content')` (4.2.7a). A text that is empty after sanitising (e.g. `<p> </p>`) is stored as `null`.
  - Rows are written `source: human`, `updatedByStaffId`.
- **Icon and image**:
  - Top level only: on a lower level → 400 `top_level_only` (`t_category_images_top_level_only`, NEW).
  - A new file must be a `category_image` upload **of the same staff member** that no other category shows; else 400 `file_not_found`. Not scanned yet → 400 `file_not_ready`.
  - `attached_at` is set in the transaction (the SEC-74 compare-and-set).
  - A replaced or removed icon/image is deleted after the commit (best effort), and so are the files of a deleted category.
  - `FileAttachments` check: a shown icon/image is "attached".
- **Update**: partial; a field left out keeps its value. For a new slug (data-model §3.R rule 1):
  - advisory locks on the new and the released slug (sorted);
  - the new slug is refused when in use as above;
  - changing back deletes the item's own row (EC-3);
  - the released slug becomes a `slug_redirects` row (`scope` = depth).
  - `previousSlugs` lists the rows oldest first. The row is always written, so `updatedAt` moves with a text-only change.
- **Delete**: refused with `409 CATEGORY_IN_USE` (`t_category_in_use`, `details.gigCount/childCount/projectCount`) while it has children, gigs or linked project categories.
  - `gigCount` here counts **soft-deleted gigs too**: they keep their category (FK `ON DELETE RESTRICT`), so the database would refuse anyway.
  - A gig added meanwhile (FK error) gives the same 409.
  - The category's `slug_redirects` rows are deleted with it (§3.R rule 3).
- **List**: flat in tree order (each category, then its children, siblings by position), as the contract describes. Counts come from grouped queries; `gigCount` = live gigs at any level.
- Every write is audited in its transaction (`category.create` / `category.update` with before/after / `category.delete`, `permissionCode: catalog.write`, IP, user agent) and then calls `CategoriesService.invalidate()`, so the public tree changes at once.
- i18n NEW (en + ka): `t_category_max_depth` "Categories can have at most 3 levels." / "კატეგორიებს მაქსიმუმ 3 დონე შეიძლება ჰქონდეს."; `t_category_images_top_level_only` "Only top-level categories have an icon and an image." / "სიმბოლო და სურათი მხოლოდ მთავარ კატეგორიას შეიძლება ჰქონდეს." (the existing texts call the icon "სიმბოლო", `t_category_icon`).
- `test/admin-categories.test.ts` (14). API **578 passed / 6 skipped**; lint + typecheck green.
  - The first full run had all 18 tests of `account-settings.test.ts`, the first file, fail; that file passed alone and in a second full run. A one-off start-up flake; worth watching.

## Files created/changed
- `apps/api/src/modules/catalog/admin-categories.service.ts`, `admin-catalog.controllers.ts` (new); `catalog.module.ts`
- `apps/api/test/admin-categories.test.ts` (new)
- `packages/i18n/en.json`, `packages/i18n/ka.json` (2 NEW keys)
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.2.8 (backend)**: project categories + skills CRUD; add the controller next to `AdminCategoriesController`; reuse the same audit and invalidate pattern.
- **4.2.13 (admin web)**: icon/image uploads go through `adminCreateFileUpload` (purpose `category_image`) by the same staff member who saves the form. Show field errors from `details.fields[].field` (`slug`, `name.ka`, `name.en`, `iconFileId`, `imageFileId`). Hide the icon/image inputs below level 1.

## Open questions / risks
- **Contract gap (architect)**: `adminUpdateCategory` declares no `422`, so file problems and "icon below level 1" are field-level `400 VALIDATION_FAILED` on **both** create and update (consistent for the admin form). Other upload users answer `422 FILE_NOT_READY` / `FILE_PURPOSE_MISMATCH`. If the architect prefers that, add `422` to `adminUpdateCategory` (ADR) and switch both.
- **Old category URLs do not answer 301 yet**: the rows are recorded now, but `resolveRedirect` is planned for 4.16.6 (slice 16). Until then an old category URL answers 404 on the web (4.2.9b). The orchestrator may want to move the gig-category part of `resolveRedirect` into slice 2.
- `projectCount` in `CATEGORY_IN_USE` counts **linked project categories** for a gig category (the contract text says "projects"; projects themselves arrive in slice 9 and are linked to project categories, not to gig categories).
- A new image file must be uploaded by the saving staff member (like `adminGetFile` ownership). If staff should pick from a shared media library later, relax `checkImages`.
- Rule I chose (not in the spec): English description/SEO text needs an English name, because the English row cannot exist without one.
