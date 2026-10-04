# 4.2.16: slice 2 E2E

## What I did
- **Full-stack main flow** `apps/admin/e2e/catalog-main-flow.spec.ts` (like slice 1's `profiles-main-flow`): staff create a 3-level gig category branch (ka/en names, an SEO text with a `<script>` that must not survive), a linked project category and a skill → the website shows the category in the header data, its pages at levels 1 and 3 (title, sanitised SEO text, breadcrumb, empty list), a sub-category slug at the top level is 404, explore projects shows the chip and the skill page (when S-075 is ON), search answers → deleting the top category is refused (in use) → everything is removed bottom-up and the page is 404 again. Skipped without `ADMIN_E2E_LOG` (seed password), like slice 1.
- **Not run in this session**: it needs a stack with a known seed password. The Owner's `pnpm local` was running (ports 3000/3100/3200), and starting a second one stops the first (`scripts/local.mjs` ends leftover processes of this repository). QA runs it on a throw-away database (SETUP-LOCAL §5).
- **Per-screen E2E already in place** from 4.2.9a–4.2.13 (stand-in / routed API): web `site-header` (8), `category-pages` (8), `search-page` (4), `seller-and-project-lists` (4), `home` (3); admin `catalog` (4). Web E2E 137 passed / 3 skipped; admin 16 passed / 6 skipped (full-stack ones).
- **Mobile**: stays on the manual steps (harness = Owner decision since 4.1.25): SETUP-LOCAL §4 steps 17–18 added (Home, Explore, filters, sort, infinite scroll, categories, sellers, hire, explore projects).
- SETUP-LOCAL §5: `E2E_WEB_PORT` / `E2E_ADMIN_PORT` to run the browser tests next to a running `pnpm local`; the new full-stack spec listed.

## Files created/changed
- `apps/admin/e2e/catalog-main-flow.spec.ts` (new)
- `docs/SETUP-LOCAL.md`

## What the next agent must do
- QA 4.2.17: run every suite, including both full-stack flows on a throw-away DB; mobile on a phone with §4 steps 17–18.

## Open questions / risks
- Filled lists (Featured order, filters, pages) are proven on the stand-in API and in the API tests only, because gigs cannot be created before slice 3.
