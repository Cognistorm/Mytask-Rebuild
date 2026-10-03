# 4.2.2a Data model: category description per language + `slug_redirects`

From: solution-architect · To: backend-engineer (4.2.2b, 4.2.7; slice 16 for pages/blog) · Date: 2026-10-03

## What I did
Closed the two data-model gaps of the 4.2.1 spec check (§B) in `docs/03-architecture/data-model.md`.
**No contract change**: contract 1.3.2 already describes both (`CategoryDescriptionInput`, `AdminCategory.previousSlugs`,
`CategorySlug` "unique per level", `adminUpdateCategory` and `resolveRedirect` descriptions). No ADR needed (additive
storage for existing contract behaviour, as in 4.1.7 and 4.2.0a).

1. **`gig_category_translations.description varchar(300) null`** (§3.C) — SEO description per language, spec 16 AC-60.
   Legacy kept one untranslated `description` per `categories` / `subcategories` / `childcategories` row; the ETL puts
   it in the `ka` row, `en` null (§12.2). Legacy validators already cap it at 300
   (`legacy/APP/app/Http/Validators/Admin/Categories/CreateValidator.php:42`, `…/Subcategories/CreateValidator.php:44`);
   a longer value is listed by the dry run, never cut silently.
2. **New table `slug_redirects`** (§3.R): `entity_type` (`gig_category`, `page`, `blog_article`) · `scope` (category
   depth 1–3, else 0) · `old_slug` · `entity_id` (no FK, three parent tables) · `created_at`;
   PK `(entity_type, scope, old_slug)`, IX `(entity_type, entity_id)`. One design for categories now and CMS pages /
   blog articles in slice 16. Rules written in §3.R:
   - **Slug change** (one transaction): advisory lock on the new and the released slug; 409 `DUPLICATE` (field `slug`)
     when another item of the same type and scope holds the slug as current **or** as an old slug; the item's own row
     with the new slug is deleted (EC-3, changing back); the old slug is inserted.
   - **Resolution**: rows point to the item, so any number of changes is one hop to the current URL; `/en` kept;
     category paths are resolved segment by segment per depth, then the parent chain is checked, so a renamed parent
     redirects all URLs below it.
   - **Delete**: the item's rows go with it. **Migration**: legacy has no slug history; the table starts empty.
3. Entity count 122 → **123** (§13, "i18n and content" 9 → 10). Revision note at the top of the file.

## Files created/changed
- `docs/03-architecture/data-model.md` (revision note, §3.C, §3.R, §12.2, §13)
- `docs/ROADMAP.md` (4.2.2a ticked), `docs/STATUS.md` (log + next micro-task)
- this handoff

## What the next agent must do
**4.2.2b (backend):** in the slice 2 migration create, beside the catalog tables, the gigs core and `search_documents`
(4.2.1 handoff §C, §E, §F.7): `gig_category_translations.description varchar(300) null` and `slug_redirects` with the
enum `slug_entity_type` (all three values now, so slice 16 needs no enum migration), the CK on `scope` and the PK/IX
above. Prisma: `SlugRedirect` model, no relation (polymorphic).
**4.2.7 (backend):** `adminUpdateCategory` applies rule 1 (tests: rename, rename twice → both old slugs map to the
item, change back removes its row, another category at the same depth cannot take a redirecting slug → 409 `DUPLICATE`,
same slug at a different depth is allowed); `adminDeleteCategory` deletes the rows; `AdminCategory.previousSlugs` =
rows by `created_at`. The 301 itself waits for `resolveRedirect` (slice 16), which uses rule 2.

## Open questions / risks
- None for the Owner.
- Risk: no FK on `entity_id`; a delete path that forgets rule 3 leaves rows pointing nowhere (resolution then answers
  404, harmless, but the slug stays blocked). Each delete service must have a test for it.
