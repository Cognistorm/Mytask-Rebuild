# 4.2.9a: public site header + footer shell (web)

## What I did
- Every page of the `(public)` root layout now has: a skip link ("Skip to content" → `#mt-content`), the site header, the page, the site footer.
- **Header** (design `01-home.md`, spec 03 AC-2, AC-22):
  - Row 1: hamburger (below lg), logo, pill search (`GET /search?q=`, max 100) with a "Categories ▾" list of the top categories, theme toggle (light ↔ dark; also saves `updateMyPreferences` when signed in; hidden when S-105 OFF), Explore ▾ (Gigs → `/search`, Projects → `/explore/projects` only when S-075 ON), Login + Join, or the account menu (avatar + username → Dashboard (last side, `dashboardHome`), View profile, Account settings, Logout).
  - Row 2 (≥ lg): the top categories; those that do not fit go into "More ▾" (measured, never truncated). A category with sub-categories opens the mega-menu on click / Enter / Space and on pointer hover: "Browse {category}", sub-categories and child categories. Escape and outside click close it and return the focus. A category without children is a plain link.
  - Phones: search icon → full-width search field with focus (AC-22). Drawer (modal, focus trapped, Escape/scrim close): Join/Login or the account links, Gigs/Projects, the category accordion with its own search box (filters the tree, opens matching branches), language switch.
  - Hidden until their slices: cart (5), bell/messages (8, 14), Subscription (9), invite banner (9), Support centre link (17: `/help/contact` does not exist yet).
- **Session refresh moved into the header**: a page rendered without an access cookie but with the device cookie asks `getMe` once from the browser; on success `router.refresh()` renders the page again signed in. The three profile pages' own `SessionRefresh` was removed (two refreshes otherwise); `e2e/profile.spec.ts` "refreshed once" still passes.
- **Footer** (spec 17 AC-37): four columns `t_footer_column_1…4` filled from `listPages` (`footerColumn`, `position`); a column without pages is left out. `listPages` is slice 16, so today no column shows. Bottom row: logo, `© {year} MyTask.ge`, language switch (hidden when S-104 OFF). Phones: one accordion per column (first open).
- **Proxy** (spec 03 AC-36, url-map §2): `?locale=en|ka|other` and `?theme=dark|light` → one 301 to the same path (en → under `/en`, else unprefixed), other parameters kept; `theme` also sets the `mt_theme` cookie on the redirect. Combined with the `/ka` and trailing-slash fix in the same hop.
- Shared pieces in `@mytask/ui/web` (`site.tsx`, `site.css`): `SiteIcon`, `MenuButton`, `CategoryBar` (+ mega-menu), `CategoryAccordion`, `NavDrawer`. Tokens only.
- Server data: `lib/site-data.ts` (`getCategoryTree`, `getServerPublicConfig` cached 60 s, `getViewer`, `getFooterPages`; every failure degrades to "not shown").
- **E2E port**: `E2E_WEB_PORT` (default 3100) moves the whole Playwright run; specs use `e2e/base.ts` instead of a hard-coded `localhost:3100` (needed while `pnpm local` holds 3100).
- i18n NEW (en + ka): `t_skip_to_content` "Skip to content" / "მთავარ შინაარსზე გადასვლა"; `t_search_categories` "Search categories" / "კატეგორიების ძებნა".
- `e2e/site-header.spec.ts` (8) + `e2e/fake-catalog.mjs` (category tree, `getMe` for the test cookie). Web E2E **118 passed / 3 skipped**; web, admin and ui typecheck + lint green.

## Files created/changed
- `packages/ui/src/web/site.tsx`, `site.css` (new), `index.ts`
- `apps/web/src/components/site/site-header.tsx`, `header-client.tsx`, `site-footer.tsx`, `footer-language.tsx` (new)
- `apps/web/src/lib/site-data.ts`, `category-nav.ts` (new); `src/proxy.ts`; `src/app/[locale]/(public)/layout.tsx`, `page.tsx` (placeholder login link removed: the header has it)
- `apps/web/src/app/[locale]/(public)/profile/**` (SessionRefresh removed), `src/components/profile/client.tsx`
- `apps/web/playwright.config.ts`, `e2e/base.ts`, `e2e/fake-catalog.mjs`, `e2e/fake-api.mjs`, `e2e/site-header.spec.ts`; `e2e/{auth,profile,report-user,social,theme}.spec.ts` (base URL)
- `packages/i18n/en.json`, `ka.json`

## What the next agent must do
- 4.2.9b: category pages inside this layout; add their path patterns to `lib/zones.ts`.
- 4.2.12: transparent header over the teal hero (design "turns white on scroll") belongs with the hero.

## Open questions / risks
- `?theme=` for a signed-in user sets only the cookie; the dashboard shell then restores the account's saved theme (url-map §2 says the API also saves it). Harmless; noted for QA.
- The "More ▾" fit keeps 120 px for the button; very long translated "More" labels would need more.
