# 3X — Visual refresh
Status: **approved** (Owner request 2026-10-06; Owner answers Q-169…Q-173 the same day)
Author: orchestrator + product-analyst (ROADMAP 3X.1) | Date: 2026-10-06
Sources: Owner request 2026-10-06 (ROADMAP Phase 3X, R-1…R-4); answers Q-169…Q-173 in `docs/01-discovery/open-questions.md`; design system `docs/05-design/tokens.md`, `components.md`, `audit.md`; CLAUDE.md "Mission" (modernise, do not reinvent).

Tags: **NEW** = not on the legacy platform (Owner 2026-10-06). Everything else in this spec is a visual change only.

Replaces Owner Q-165 (c) "design direction unchanged" (2026-10-03) for the look. The structure, flows and placement stay as before.

---

## Goal
Make the platform look vibrant, modern and alive without moving anything. Visitors should find every element where it was before. It should simply look and feel better: distinct category colours, defined buttons with gradients, a gradient background, and tasteful motion.

## Roles involved
- **Guest / User**: see the new look on web and app.
- **Staff** (permission for categories, spec 16 AC-60): choose each top-level category colour in the admin panel (NEW).

## User stories
- As a visitor, I want each category direction to have its own colour, so that I recognise it at once in the menu, on the home page and on its pages.
- As a visitor, I want buttons and cards that clearly look clickable and react when I point at or tap them, so that the site feels responsive.
- As the Owner, I want to pick or change any category's colour in the admin panel myself, so that I can adjust the look later without a developer.
- As a user who switches off animations on my device, I want the site to stay calm, so that motion never bothers me.

## Owner decisions (2026-10-06)
| Q | Decision |
|---|---|
| Q-169 | **Free colour picker** in the admin panel (any colour), not a fixed palette. Claude chooses the starting colours. |
| Q-170 | Every top-level category has its **own distinct colour**. |
| Q-171 | Sub-categories (levels 2–3) and project categories **inherit** the colour of their top-level gig category. |
| Q-172 | Motion is **elegant and moderate**: subtle, engaging micro-interactions and smooth transitions, never aggressive. |
| Q-173 | Dark mode gets its **own tailored gradients**, as polished as light mode. |

---

## Rules

### R-1 Category colours (NEW)
- **R-1.1** Only a **top-level** gig category stores a colour: one `#RRGGBB` value (6 hex digits, case-insensitive, stored upper-case). Any other value is refused.
- **R-1.2** Sub-categories and child categories show their top-level category's colour (Q-171). A project category shows the colour of its linked top-level gig category (spec 16 AC-61). With no link it uses the brand teal.
- **R-1.3** **Unique** (Q-170): two top-level categories cannot have the same colour. Saving a colour that another top-level category already has is refused with a message naming that category. If the colour is only *very similar* to another one, the admin form warns but allows saving. The threshold is OKLab ΔE < 0.08 (`docs/05-design/visual-refresh.md` §8.5). The designer also proposes a second warning, never a refusal: a colour with ΔE < 0.06 to brand teal, error red, success green or Featured orange may be confused with them. The Owner confirms or drops it in 3X.4.
- **R-1.4** **Readable with any colour** (Q-169): the staff choose only the base colour. Everything else is derived by one shared function in `packages/tokens`, used by web, admin and mobile:
  - the text colour on the base (white or dark, whichever reaches ≥ 4.5:1);
  - the soft tint background;
  - the gradient start and end;
  - the dark-mode variants (Q-173);
  - a border/indicator shade that reaches ≥ 3:1 against the page.

  Category text is never set directly in the raw base colour unless that reaches 4.5:1.
- **R-1.5** Starting colours: the migration gives every existing top-level category a distinct colour from the designer's starter palette (3X.2), in `position` order. A new top-level category gets the first starter colour not yet used (the admin can change it in the same form).
- **R-1.6** The colour is shown wherever a category is shown:
  - website: header category bar, mega-menu, phone drawer/accordion, home featured tiles and category rows, category page header and breadcrumb, explore-projects chips;
  - the matching mobile screens;
  - admin: tree, form, project categories.
- **R-1.7** Changing a colour is audited like any category edit (spec 16 AC-60) and is visible on the website within the category cache time (≤ 60 s).
- **R-1.8** Admin form: a colour picker with a hex field, the starter swatches as quick choices, and a live preview chip (category name on the derived colours, light and dark). It shows the duplicate/similar message before saving.

### R-2 Buttons and gradients
- **R-2.1** Every button variant (primary, secondary, accent, danger, ghost, icon) has a crisp, defined border and an inner gradient. A text link stays a link (no button look). This keeps the difference between "navigate" and "act" (components.md §4).
- **R-2.2** Each button has distinct default, hover, pressed, focus (visible glow ring, ≥ 3:1), disabled and loading states.
- **R-2.3** Cards, panels, tiles, chips, tabs, the role switcher, inputs and switches get subtle gradients and borders from tokens, and a clear hover and selected state.

### R-3 Background
- **R-3.1** The page canvas is a soft gradient (light), with its own gradient in dark mode (Q-173). Text on it keeps ≥ 4.5:1 at every point. Content surfaces (cards, forms) stay solid enough for reading.
- **R-3.2** The hero and other large brand areas may use richer gradients. An optional very slow gradient drift is allowed only in the hero, and stops with reduced motion.

### R-4 Motion (Q-172: elegant, moderate)
- **R-4.1** Bounds: durations 120–400 ms (tokens `motion.duration`); hover lift ≤ 4 px; scale ≤ 1.03; no bounce, shake, parallax or rotate; nothing loops forever except the skeleton shimmer and the optional hero drift (R-3.2).
- **R-4.2** Expected micro-interactions: button hover/press, card lift + shadow/glow on hover, image zoom inside its frame on gig/category cards, menu and mega-menu open/close, dialog and drawer enter/exit, tab and switcher indicator slide, list/card entrance with a short stagger on first view, toast enter/exit, success feedback on save, skeleton shimmer while loading.
- **R-4.3** Reduced motion (`prefers-reduced-motion`; iOS/Android Reduce Motion): no movement, scale, slide, drift or stagger. Only fades ≤ 120 ms remain.
- **R-4.4** Only `transform`, `opacity` and `filter` animate (no layout shift). Web uses CSS only; mobile uses Reanimated (already installed) + `expo-linear-gradient`.

### Must not change
- Page structure, element order and placement, flows, URLs, texts, i18n keys, API behaviour (apart from R-1), breakpoints and what shows at each size.
- Accessible names, `aria-*`, focus order, heading levels, E2E selectors and class names used by tests. The existing E2E suites must pass **unchanged** (3X.18).
- The transparent-over-hero header behaviour (4.2.20); dark/light/system theme rules (spec 02 AC-35).

---

## Acceptance criteria
- **AC-1** A staff user with the categories permission can set a top-level category's colour with a picker or hex field. Sub-category forms have no colour field (R-1.1, R-1.8).
- **AC-2** A value that is not `#RRGGBB`, or a colour on a non-top-level category, is refused with a validation error (R-1.1).
- **AC-3** Saving a colour already used by another top-level category is refused and names that category. A very similar colour shows a warning but saves (R-1.3).
- **AC-4** Sub-categories, child categories and linked project categories show their top-level colour on web, admin and app. An unlinked project category shows brand teal (R-1.2).
- **AC-5** For any base colour, text on the category colour reaches ≥ 4.5:1 and indicators ≥ 3:1 in light and dark mode. A unit test runs the shared function over a range of colours, including very light, very dark and pure hues (R-1.4).
- **AC-6** After migration every existing top-level category has a distinct colour. A new top-level category gets the first unused starter colour (R-1.5).
- **AC-7** A colour change appears on the website within 60 s and is in the audit log (R-1.7).
- **AC-8** The category colour appears in every place listed in R-1.6.
- **AC-9** Every button variant has a defined border and an inner gradient, plus the states of R-2.2, on web, admin and app.
- **AC-10** Cards, chips, tabs, inputs and surfaces follow R-2.3.
- **AC-11** The page background is a gradient in light and a different, tailored gradient in dark. Every text-on-gradient pair passes 4.5:1 at both ends (`contrast.mjs`) (R-3.1).
- **AC-12** The micro-interactions of R-4.2 exist within the bounds of R-4.1.
- **AC-13** With reduced motion on, nothing moves or scales. Only short fades remain, and the hero drift and auto-advancing carousels stop (R-4.3).
- **AC-14** No layout shift from the new styles or motion: Lighthouse CLS and INP are no worse than before 3X on home, category page and search (R-4.4).
- **AC-15** Nothing in "Must not change" changed: the web and admin E2E suites pass unchanged, and the QA structure check (3X.19) compares each screen with its state before 3X.
- **AC-16** New user-facing texts (admin colour field, messages) have en + ka values.

## Edge cases
- **EC-1** Staff pick white, black or a very pale or very dark colour: still readable via R-1.4. The preview shows the result before saving.
- **EC-2** Two staff save the same colour at the same time on different categories: one wins, and the other gets the duplicate message. Uniqueness is enforced in the database, not only in the form.
- **EC-3** A top-level category becomes a sub-category: categories cannot move between levels today (spec 16 AC-60). If that ever changes, its colour is dropped and it inherits.
- **EC-4** A category is deleted: its colour becomes free for re-use.
- **EC-5** The website is reached with an old cached category tree: colours are part of the 60 s cached tree, so they are never older than 60 s.

## Data and API (decided by the architect in 3X.5)
- One nullable column on top-level gig categories, a unique index for R-1.3, and a check constraint for the format/level.
- The colour is added to `CategoryNode`, `CategoryDetail` (incl. breadcrumb), `getHome` tiles and rows, project category reads, `AdminCategory` and the create/update requests. It is a **resolved** colour on child nodes (R-1.2), so clients never walk the tree. There are new error codes for the format, level and duplicate cases. The change is additive (contract 1.4.0), recorded in ADR-023, and specs 03 and 16 get NEW AC lines pointing here.
- Derived shades are **not** stored or sent. Every client computes them with the shared `packages/tokens` function (R-1.4).

## Screens (restyle inventory)
Each screen keeps its structure. The task restyles it.

| Area | Screens | Task |
|---|---|---|
| Web shell | Header, category bar, mega-menu, account menu, phone drawer, footer, 404 | 3X.10 |
| Web public | Home `/` | 3X.11 |
| Web public | `/categories/…`, `/search`, `/sellers`, `/hire/{keyword}`, `/explore/projects/…` | 3X.12 |
| Web public | `/profile/{username}`, `…/portfolio`, `…/portfolio/{slug}` (share/report dialogs) | 3X.13 |
| Web private | `/auth/*` (login, register, request, reset, update, verify, email-change, social callback), `/app-return/*`, `/restricted`, `/account` (+ settings, password, sessions, verification, profile, projects), `/seller/home`, `/seller/portfolio` (+ create, edit) | 3X.14 |
| Admin | login, account, security, settings, restrictions, portfolio, kyc, categories (**+ colour picker**), project-categories, skills | 3X.15 |
| Mobile | tabs home, explore, dashboard, account; categories (menu + screen), sellers, hire, explore-projects; profile + portfolio; account (profile, settings, security, password, verification); seller portfolio (list, create, edit); login, register, auth/*, restricted, update | 3X.16, 3X.17 |

Shared code touched: `packages/ui/src/web/*.css|tsx` (site, catalog, dashboard, profile, form, carousel), the app stylesheets under `apps/web/src/components/**` and `apps/admin/src/components/auth.css`, `apps/mobile/src/components/*`, and `packages/tokens`.

## Texts (i18n)
Expected new keys (final list in 3X.5, en first + ka, CLAUDE.md):
- the admin colour label and help;
- the "colour already used by {category}" error;
- the "very similar to {category}" warning;
- the invalid colour error;
- the "colour is inherited from {category}" note on sub-category and project category forms.

No visitor-facing text changes.

## Notifications
None.

## Out of scope
- New pages, features, layout changes, new icons or illustrations beyond what tokens and components need.
- Colours on gigs or projects themselves (they show their category's colour only where the screen already shows the category).
- Per-user theme customisation.
- Slices 3+ (they are built in the new style from the start).
