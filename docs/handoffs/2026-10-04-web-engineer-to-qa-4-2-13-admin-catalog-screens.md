# 4.2.13: admin catalog screens (admin web)

## What I did
- Three screens behind `catalog.write` (nav links hidden without it): **`/categories`**, **`/project-categories`**, **`/skills`** (spec 16 AC-60, AC-61).
- **Gig categories**: the 3-level tree in tree order (indented by level) with name ka/en, slug, level, "hidden on the home page", usage counts (gigs, sub-categories, project categories) and old slugs. "Create category" (top level), "Add sub-category" (levels 1–2 only), Edit, Delete (confirm; the API's 409 `t_category_in_use` message is shown).
  - Form: name, description, SEO text above and below the list (ka + en; HTML, sanitised by the API), slug, position; on the top level only: icon + image (upload) and "Show on the home page". Field errors from `details.fields` under each field (`name.ka`, `name.en`, `slug`, `iconFileId`, `imageFileId`).
- **Project categories**: list (position order) with the linked gig category and skill count; form: name ka/en, slug, linked gig category (select offers top-level gig categories only), SEO description ka/en, image, position, active; delete with the in-use message.
- **Skills**: filter by project category + search (slug or name), oldest first with "Load more" (cursor); form: project category, name ka/en, slug, active; edit can move a skill to another category; delete.
- **Uploads**: `uploadFile(api, …, { staff: true })` in `@mytask/api-client` now runs the same flow on `/admin/files` (adminCreateFileUpload → storage POST → adminCompleteFileUpload → adminGetFile polling); purpose `category_image`, JPG/PNG (API rule).
- `apps/admin/playwright.config.ts`: `E2E_ADMIN_PORT` (default 3200) like the web.
- i18n NEW (en + ka): `t_seo_text_top`, `t_seo_text_bottom`, `t_show_on_home`, `t_hidden_on_home`, `t_position`, `t_previous_slugs`, `t_linked_gig_category`, `t_project_categories`, `t_project_category`, `t_add_subcategory`, `t_category_usage`, `t_skill_count`, `t_all_categories`. Field labels show the language as "· ka" / "· en".
- `apps/admin/e2e/catalog.spec.ts` (4, routed API). Admin E2E 16 passed / 5 skipped (full-stack ones).

## Files created/changed
- `apps/admin/src/app/categories/page.tsx`, `project-categories/page.tsx`, `skills/page.tsx`, `src/components/catalog.tsx` (new); `components/nav.tsx`, `components/auth.css`; `playwright.config.ts`
- `packages/api-client/src/upload.ts`
- `apps/admin/e2e/catalog.spec.ts` (new)
- `packages/i18n/en.json`, `ka.json`

## What the next agent must do
- QA (4.2.17): try a real image upload with the full stack (`pnpm local`); the e2e routes the API.

## Open questions / risks
- The admin app has no CSP of its own (unchanged; uploads go straight to storage). Worth a look in the security review.
- Old category URLs still answer 404 on the website until `resolveRedirect` (4.16.6), although the old slugs are listed here.
