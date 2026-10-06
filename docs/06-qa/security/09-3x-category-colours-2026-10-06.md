# Security review 09 (short): 3X category colours, CSP, audit — ROADMAP task 3X.20
Date: 2026-10-06 | Reviewer: security-reviewer role (fresh session; the 3X code was written in earlier sessions) | Branch reviewed: `feat/visual-refresh` @ `d257836d` | Scope: what 3X adds that crosses a trust boundary: the staff-entered category colour (API → database → website / admin / app styles), the website CSP and proxy changes, the audit entry, new dependencies. Pure CSS/visual changes were not reviewed. | Inputs: ADR-023, spec 3X R-1, ROADMAP 3X.1 "Colour safety", reviews 06–08.

## Verdict: **PASS**
- **New findings: 0 Critical, 0 High, 0 Medium, 0 Low, 5 Info (I-52 … I-56).** Nothing blocks 3X.21 or the 3X merge.
- No product code was changed by this review. The API probe ran as a temporary test file, which was removed afterwards (copy in the session scratchpad). The built website ran on port 3155 against the E2E stand-in API for the header check, and was stopped afterwards.

## 1. Method

| Command / probe | Result |
|---|---|
| `npx vitest run test/category-colors.test.ts` (apps/api) | **20/20 passed** |
| `pnpm test` (packages/tokens) | **18/18 passed** |
| P1: in-process API (test app, PGlite), 23 values sent as `color` to `POST /admin/categories` and `PATCH /admin/categories/{id}`: `#123456;}body{background:red`, `#123456\n`, leading/trailing space, `#1234567`, `#123`, `red`, `url(https://evil.example/x)`, `#12345\u0000`, `var(--x)`, full-width and Arabic-Indic digits, `expression(alert(1))`, `#123456/*`, `#12345"`, `#12345'`, `#12345<`, `""`, `null`, a number, an array, an object, `true` | **Every value: 400 `VALIDATION_FAILED` on create and on update.** `#abcdef` → 200, stored `#ABCDEF`. No token → 403; staff without `catalog.write` → 403 |
| P1 audit rows for the probe category | `category.create` (after `#0A0B0C`) and `category.update` (before `#0A0B0C`, after `#ABCDEF`), both `permissionCode = catalog.write`, actor = the staff member |
| P2: `packages/tokens/src/category-color.mjs` against the same malformed values; plus 4,096 valid colours through `categoryStyle` | `categoryStyle` → `{}` and `categoryTheme` → brand for every malformed value; `deriveCategoryColor` throws. Every derived value is `#RRGGBB` or `#RRGGBBAA` (computed from numbers, never the input string) |
| P3: built website (`next start`, stand-in API), `curl -D -` on `/`, `/account`, two 404 pages, and `/` with a guessed `x-mt-rewritten` header | Same CSP on every response as `apps/web/src/lib/csp.ts` builds it: nonce `script-src`, no `unsafe-inline`/`unsafe-eval` for scripts; `style-src 'self' 'unsafe-inline'` as before 3X. The guessed header changes nothing (still CSP + nonce). SSR HTML: `data-category-theme="#7C3AED" style="--mt-cat-l-solid:#7B38EB;…"` |
| `git diff 61c4e777 HEAD -- apps/web/src/lib/csp.ts infra/caddy` (pre-3X `main` vs now) | **No change** |
| `pnpm audit --prod` | 6 advisories (3 moderate, 3 high). The two sanitize-html ones of review 08 (SEC-77) are gone. New since review 08: `source-map-js` (I-55). The rest are the known mobile/dev tool chains |

## 2. What is correct (checked, no finding)
- **Three layers of input checks on the colour.**
  1. The contract: `CategoryColorInput` `^#[0-9A-Fa-f]{6}$` (`openapi.yaml:27410`). The request validator applies it before the service runs. JS `$` does not match before a trailing newline (probe P1).
  2. The service: `checkColor` (`admin-categories.service.ts:430-439`) refuses a colour below the top level and stores it upper case.
  3. The database: `CHECK (color IS NULL OR (depth = 1 AND color ~ '^#[0-9A-F]{6}$'))` plus a partial unique index (migration `20261006120000_category_colors`), so writes that bypass the API cannot store anything else either.
- **No CSS injection on the website.** The only path from colour to style is `categoryThemeProps` (`packages/ui/src/web/category.ts:16-22`). It re-validates with `normalizeCategoryColor` and gives `{}` + `brand` for anything else. The CSS variable values are rebuilt by `deriveCategoryColor` from OKLCH numbers, so the API string itself never reaches a `style` attribute. `data-category-theme` gets only the validated hex or `brand`. No colour reaches a `<style>` tag, a `dangerouslySetInnerHTML`, a URL or a `theme-color` meta.
- **Admin picker.**
  - The preview panels are painted only after `checkColor` has accepted the typed value (`check.hex &&`, `catalog.tsx:310-318`).
  - Swatch backgrounds are the constant starter colours from `packages/tokens` (`:291`).
  - Tree dots go through `categoryThemeProps` (`:166-168`).
  - Category names in the messages and the preview are React text.
  - The 409 body names another top-level category (`id`, `name`) only to staff with `catalog.write`.
- **App.** `categoryTheme` re-validates and falls back to brand. React Native style values are not parsed as CSS.
- **Permissions and audit.** Colour changes use the existing `@StaffRoute('catalog.write')` routes. The colour is part of the before/after snapshot in the same transaction as the write (P1). A change to the same colour writes nothing. A colour cannot be cleared.
- **CSP unchanged.** `csp.ts` and Caddy are byte-for-byte the pre-3X versions (P3). The new inline script (`MOTION_ENTRANCE_SCRIPT`, 3X.11) is a constant and carries the request nonce (`components/motion-entrance.tsx:9`). New CSS loads only the self-hosted FiraGO fonts (`font-src 'self'`).

## 3. Info

| ID | Title | Detail | Owner / when |
|---|---|---|---|
| I-52 | The regression tests cover only one malformed colour | `category-colors.test.ts:195` sends only `#12345G`. `packages/tokens/test/category-color.test.mjs:68, 83` has no CSS-breaking strings. Today the three layers hold (P1, P2), but a later change to the request schema or `normalizeCategoryColor` would go unnoticed | 3X.21: add the P1 list (at least `;}`, newline, space, `url(`, `var(`, non-string types) to the API 400 test, and assert `categoryStyle(...) = {}` for the same strings in the tokens test |
| I-53 | The 3X design now depends on `style-src 'unsafe-inline'` | ROADMAP 3X.20 says "no `unsafe-inline` styles", but the website CSP has allowed inline styles since before 3X (ROADMAP 3X.1 "Colour safety", corrected 2026-10-06). The category themes are server-rendered `style="--mt-cat-…"` attributes, and the CSP allows those only through `'unsafe-inline'` (a nonce does not cover `style` attributes). Removing it later (Phase 6 hardening) would drop every category colour on first paint. This is no weakness today: the values are validated hex (§2), and `'unsafe-inline'` stays scripts-free | Architect, Phase 6: keep it (recommended; record it in ADR-013), or move the themes to classes / nonce'd `<style>` blocks |
| I-54 | The admin CSP (I-48, Phase 6) must allow inline styles too | The admin colour preview, swatches and dots use inline `style` attributes. This affects the admin CSP to be written in Phase 6: it must have `style-src 'self' 'unsafe-inline'` like the website, or the picker loses its colours | web-engineer; with I-48 (Phase 6) |
| I-55 | New advisory: `source-map-js` < 1.2.2 (GHSA-68fv-2mgg-jv7q, event-loop DoS through crafted source maps) | Paths `next > postcss > source-map-js` (web, admin) and `sanitize-html > postcss` (api). The lockfile did not change in 3X. It cannot be reached at runtime: Next.js uses it only at build time, and sanitize-html runs postcss only on `style` attributes, which our allow-list drops | Next dependency pass (with I-36, Phase 6 at the latest) |
| I-56 | Proxy rewrite token (3X.15b) reviewed | `proxy.ts:17-24, 74`: a request carrying the per-process random token (128 bit, `createNonce`) skips the proxy. The token travels only on the internal `next dev` rewrite. It is never in a response, a cookie or the HTML, so a visitor cannot learn it. A guessed value is ignored (P3, `e2e/shell.spec.ts:22-29`). The outer pass still sets the CSP on the response. Keep it that way: never echo request headers into a page | — (note only) |

## 4. Not changed by 3X (still open; owners and timing as in reviews 06–08)
- Phase 6 checklist: I-48 admin CSP (now with I-54), I-35, I-36 (now with I-55), SEC-78, I-46.
- backend: SEC-76, SEC-79, SEC-73/SEC-74 per review 08.

## 5. Handoff
- **orchestrator:** the 3X.20 security check passes. 3X.21 takes I-52 (tests only) with F-3X19-1, F-3X19-2 and F-3X18-1.
- **solution-architect (Phase 6):** I-53 decision on `style-src 'unsafe-inline'`.
- **web-engineer (Phase 6):** I-54 with the admin CSP (I-48).
