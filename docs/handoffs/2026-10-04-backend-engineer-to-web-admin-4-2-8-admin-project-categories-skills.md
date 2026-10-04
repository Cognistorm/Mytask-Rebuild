# 4.2.8: staff project categories and skills (spec 16 AC-61)

## What I did
- The 10 operations of the contract (`catalog.write`, contract 1.3.2 unchanged): `adminListProjectCategories`, `adminCreateProjectCategory`, `adminGetProjectCategory`, `adminUpdateProjectCategory`, `adminDeleteProjectCategory`, `adminListSkills`, `adminCreateSkill`, `adminGetSkill`, `adminUpdateSkill`, `adminDeleteSkill`. One service `catalog/admin-project-catalog.service.ts`, two controllers next to `AdminCategoriesController`.
- **Project categories**:
  - Name ka/en (trimmed, Georgian required, ≤ 100 = the column), SEO description ka/en (plain text, trimmed, empty → null), slug (unique over all project categories → 409 `DUPLICATE` `slug`), position (default last), `isActive` (default true), image.
  - Linked gig category: unknown → 400 field `gigCategoryId` (`t_validator_exists`; the create operation has no 404); not top-level → **422** `BUSINESS_RULE_VIOLATION` `t_project_category_top_level_only` (NEW). The database trigger of 4.2.2b checks the same.
  - English row only with an English name; English SEO text without one → 400 `name.en` (same rule as 4.2.7b).
  - `gigCategory` in the response is a `CategoryRef` in the `Accept-Language` language with the Georgian fallback.
  - Image: same rule as gig categories (own `ready` `category_image`, `attached_at` compare-and-set, replaced/removed/deleted files purged after the commit).
  - Delete refused with 409 `CATEGORY_IN_USE` (`t_category_in_use`, `details.skillCount`, `details.projectCount`) while it has skills (inactive ones too: FK). A skill added meanwhile (FK error) → the same 409.
  - The list is ordered by position, then id.
- **Skills**: project category must exist (404); slug unique inside its project category (409 `DUPLICATE` `slug`, also when moving a skill to a category that has the slug); name as above; `isActive`. List oldest first with keyset cursor, filters `projectCategoryId` and `q` (slug or a name in either language, case-insensitive).
- **Projects arrive in slice 9**: `projectCount` is always 0, a skill can always be deleted, and only skills keep a project category in use. Slice 9 must add projects to both delete checks and the counts.
- **One image check for both tables** (`catalog/category-images.ts`): a `category_image` file shown by a gig category cannot be taken by a project category and the other way round; the file-delete guard and the purge of 4.2.7b now look at both tables.
- Audit actions `project_category.create/update/delete`, `skill.create/update/delete` (contract `x-audit` names), with before/after.
- Public `listProjectCategories` has no cache, so writes show at once.
- `test/admin-project-catalog.test.ts` (14). API **598 passed / 6 skipped**; lint + typecheck green.

## Files created/changed
- `apps/api/src/modules/catalog/admin-project-catalog.service.ts`, `category-images.ts` (new); `admin-catalog.controllers.ts`, `admin-categories.service.ts` (`isUsed` → shared check), `catalog.module.ts`
- `apps/api/test/admin-project-catalog.test.ts` (new)
- `packages/i18n/en.json`, `ka.json`: NEW `t_project_category_top_level_only` "The linked gig category must be a top-level category." / "დაკავშირებული კატეგორია მთავარი კატეგორია უნდა იყოს."
- `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
- **4.2.13 (admin web)**: project category form (gig category picker = top-level only, image upload `adminCreateFileUpload` purpose `category_image`), skills screen with category filter + search; show field errors from `details.fields[].field` and the 422 / 409 messages.

## Open questions / risks
- SEO description is treated as plain text (legacy meta description). If staff need HTML there, switch to `staff_content` like the gig category SEO texts.
- Skill `q` uses Prisma `contains`; `%`/`_` in the search are matched literally only as far as Prisma escapes them (staff-only filter, no risk).
