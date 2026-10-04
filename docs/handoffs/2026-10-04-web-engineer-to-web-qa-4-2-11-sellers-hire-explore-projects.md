# 4.2.11: /sellers, /hire/{keyword}, explore projects (web)

## What I did
- **`/sellers`** (spec 03 AC-27; legacy `sellers.blade.php`): h1 `t_top_sellers`, subtitle `t_hire_our_best_sellers`, 40 freelancer cards per page (listSellers daily mix), numbered pages, canonical + hreflang with `?page=N`.
- **`/hire/{keyword}`** (AC-28, AC-29): h1 `t_hire_the_best_skill_name_experts` and the subtitle with the skill name, 42 cards per page. API 404 → temporary redirect to `/search?q={keyword, + for spaces}` (`/en/` kept). **Deviation:** Next.js answers **307** from a page (url-map says 302); both are temporary redirects for a GET.
- **FreelancerCard** in `@mytask/ui/web`: avatar with online dot, username → profile, "Account verified" (KYC approved), up to 3 skill chips → `/hire/{slug}` (AC-30), "Contact me" (chat; a guest goes through login with `next`, as on the profile), "View profile".
- **Explore projects** `/explore/projects[/{category}[/{skill}]]` (AC-32…AC-34): search bar (`t_type_something_to_search_in_projects`, GET `q`), "Popular:" chips (project categories at the root, the category's skills on a category page; the open skill marked), h2 "Latest projects" with the empty state `t_no_projects_yet` (projects arrive in slice 9; the row design comes with it), numbered pages; breadcrumb on category/skill pages; unknown category or a skill outside it → 404; **S-075 OFF** (API 403) → "feature disabled" state, 200, `noindex`.
- `lib/href.ts` `decodeSegment` (path segments decoded once, safely) also used by the category page.
- `lib/zones.ts`: `/sellers`, `/hire/{kw}`, `/explore/projects[/a[/b]]` are public.
- No new i18n keys (legacy keys reused).
- `e2e/seller-and-project-lists.spec.ts` (4) on new fake routes (sellers, hire, project categories + lookup, search projects; `q=feature-off` = S-075 OFF).

## Files created/changed
- `apps/web/src/app/[locale]/(public)/sellers/page.tsx`, `hire/[keyword]/page.tsx`, `explore/projects/[[...path]]/page.tsx` (new)
- `apps/web/src/components/catalog/seller-list.tsx` (new), `catalog.css`; `src/lib/href.ts`, `zones.ts`; categories page (decode)
- `packages/ui/src/web/catalog.tsx`, `catalog.css`, `index.ts`
- `apps/web/e2e/seller-and-project-lists.spec.ts` (new), `e2e/fake-catalog.mjs`

## What the next agent must do
- 4.2.12: real home page.
- Slice 9: the project rows (ProjectCard) in the "Latest projects" list.

## Open questions / risks
- 307 instead of 302 for the `/hire` fallback (above). If the Owner wants exactly 302, the proxy would need to ask the API first.
