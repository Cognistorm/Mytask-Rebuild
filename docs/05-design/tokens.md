# Design tokens (P2-C2)
Status: **proposal, awaiting Owner approval** (together with the preview page, P2-C3) | Author: ui-ux-designer | Date: 2026-09-28
**Updated 2026-10-06 (ROADMAP 3X.6, visual refresh):** gradients, glows, inset highlights, button border roles, translucent/over-hero roles, the category colour system (starter palette, brand fallback set, `deriveCategoryColor`), motion additions, card radius 12 → 16. Source: the approved `visual-refresh.md` (3X.2/3X.4) and preview `preview/refresh.html`. New sections: §6.10, §6.11; §6.2, §6.4, §6.8, §8 and §9 revised.
Source of truth: [`packages/tokens/tokens.json`](../../packages/tokens/tokens.json). This document explains it; if the two ever disagree, the JSON wins and this document is wrong.
Rule applied: **modernise, don't reinvent.** Every token is derived from a value the live site or `/legacy` already uses (evidence in [audit.md](audit.md)), then corrected for contrast and consistency.

Owner decisions applied: Q-059 (dark mode kept, light default), Q-073 (logo teal `#0D696C` for filled buttons and links, `#35A29F` accent only), Q-074 (fixed tokens, no admin-editable colours), Q-078 (sky blue `#2EBFF6` replaced by the brand palette), Q-069 (Featured/Top badge on Premium gigs), Q-014 (no levels).

---

## 1. Key decisions (one screen)
| Area | Decision | Why |
|---|---|---|
| Primary action colour | `brand.700` **#0D696C** (logo "M"), hover `brand.800` #08565A, pressed `brand.900` #024249 (logo "S/K") | White on it = **6.45:1**. The live `#35A29F` gives 3.08:1 (fails AA). Q-073 |
| Accent | `brand.500` **#35A29F** (live primary) stays as the accent: illustrations, large icons, chips, decorative fills. Never text, never under white text | Brand continuity without the contrast failure |
| Hero | `brand.600` **#29807E** (live hero colour), white text 4.68:1 | Signature element kept as-is |
| Promotional accent | `orange.400` **#F48438** (logo "A") with **dark** text (7.07:1): Featured/Top badge, Premium frame, Premium Buy and Invite CTAs. Invite banner bg `orange.100` | Replaces sky blue #2EBFF6 (2.12:1), Q-078. Brings the logo's second colour into the UI |
| Neutrals | **One** 15-step ramp (zinc-based) replacing gray + zinc + slate + 77 hex greys | Audit 1.2 |
| Semantic | success = green (not teal), warning = amber, danger = red (`red.700` = legacy `--danger` #B91C1C), info = blue | Legacy success was teal-600 and looked like the brand (audit 1.3) |
| Themes | `theme.light` (default) and `theme.dark` (one palette from legacy palette A: #161616 page, #27272A cards). Components use only role tokens | Q-059; removes the 3 dark palettes |
| Font | **FiraGO** only, real weights 400/500/600/700 (woff2 web, ttf native), fallback Noto Sans Georgian | Already the rendered font. Mkhedruli 43/43, ₾ yes, Mtavruli 0/43 (checked with fontTools on all four weights) |
| Uppercase | **Never** on Georgian (`textTransform` has only `none`) | FiraGO has no Mtavruli glyphs; uppercase falls back to another font (audit 0.3) |
| Type scale | 9 sizes: 13 / 14 / **16 body** / 18 / 20 / 24 / 28 / 32 / 40. Minimum 13. Inputs ≥ 16 | Replaces 9/10/11/12/13/14/15 px mix; Georgian needs bigger text |
| Spacing | 4 px grid, Tailwind numbering (`space.4` = 16) | Legacy is already mostly on this grid |
| Radius | control 8, card **16** (12 until 3X, Owner Q-175), dialog/sheet 16, hero tiles/plan cards 24, pill full | One radius per role (4 button shapes today) |
| Visual refresh (3X) | Gradients, glows, inset highlights and bordered buttons as tokens (§6.10); one category colour per top-level category with every shade derived by **one shared function** (§6.11) | Owner 2026-10-06: the layout is right, the look was too plain |
| Elevation | 3 levels (sm/md/lg) + none, separate dark values | Legacy used 8 shadow utilities |
| Touch | **44×44 minimum** hit area everywhere; controls md = 44, lg = 52 | Legacy 32 px favourites, 16 px checkboxes |
| Focus | 2 px ring, 2 px offset, `brand.600` light / `brand.300` dark, ≥ 3:1 on every surface | Legacy removed focus 493×, and `#35A29F` is only 2.95:1 on #FAFAFA |
| Contrast | **106 pairs × 2 themes = 212 checks** (gradients at every stop and glow point) **+ 728 category-theme checks, 0 failures** (script-verified, tables in §8); unit test over 4,096 + 1,500 colours | WCAG 2.1 AA, spec 3X AC-5 |

---

## 2. Format and how the tokens are consumed

### 2.1 File format
`tokens.json` follows the **W3C Design Tokens Community Group (DTCG)** format, so Style Dictionary v4, Tokens Studio or any DTCG tool can read it later:
- A token is an object with `$value`; `$type` is set on the token or inherited from its group; `$description` is documentation.
- Aliases are strings `"{path.to.token}"` with an absolute path from the root (e.g. `"{color.brand.700}"`).
- Groups: `color` (primitive palette), `font`, `text` (composite typography), `space`, `radius`, `borderWidth`, `shadow`, `breakpoint`, `size`, `zIndex`, `motion`, `focus`, `opacity`, `category` (category colour data, §6.11), and `theme.light` / `theme.dark` (semantic roles).
- **Deliberate simplifications** (documented in `$metadata`):
  - Dimensions are plain numbers meaning px (React Native needs numbers). CSS output adds `px`.
  - Durations are numbers in ms.
  - Line heights are absolute px (React Native does not accept unitless multipliers).
  - Responsive text sizes: `text.<style>.$extensions["ge.mytask.lg"]` holds the size/line height used from `breakpoint.lg` (1024) up on the web. React Native uses the base `$value`.
  - Shadows: `$value` is the DTCG shadow list (for CSS); `$extensions["ge.mytask.native"]` holds the React Native iOS props + Android `elevation`.
  - Native font names per weight live in `font.native.family` (Android cannot synthesise weights for custom fonts).
  - **Gradients (3X)**: `$type: "gradient"` with a project format, because DTCG gradients have no angle or radial shape: one layer `{ "type": "linear", "angle": 180, "stops": [{ "color", "position" 0..1 }] }` or `{ "type": "radial", "shape": "1100px 620px", "at": "8% -8%", "stops": [...] }`, or an **array of layers, top layer first** (as in CSS). Stop colours may be aliases. CSS output is the `linear-gradient()` / `radial-gradient()` list; native output is §6.10.
  - **Inset shadows (3X)**: a shadow layer may carry `"inset": true` (the lit top edge of buttons and cards).
  - **Loops (3X)**: `motion.duration.*.$extensions["ge.mytask.loop"]` marks looping animations (shimmer, hero drift), which reduced motion switches off.
  - **Springs (3X)**: `$type: "spring"` (`motion.spring.default`) is native-only and not written to CSS.

### 2.2 Files in `packages/tokens`
| File | Purpose |
|---|---|
| `tokens.json` | Source of truth (607 tokens) |
| `contrast-pairs.json` | Every foreground/background pair the system defines (106), with the WCAG minimum. A background may be a gradient token: it is checked at every stop and every glow point |
| `lib.mjs` | Alias resolution, WCAG contrast maths, gradient CSS / native / worst-point helpers (no dependencies) |
| `build.mjs` | `node packages/tokens/build.mjs` → writes `dist/`, **fails** on a broken alias, a theme-key mismatch, any contrast failure or any category-theme failure |
| `contrast.mjs` | `node packages/tokens/contrast.mjs` (summary, exit 1 on failure) or `--md` (the tables in §8) |
| `src/category-color.mjs` + `.d.mts` | **`@mytask/tokens/color`**: the shared category colour function and admin helpers (§6.11). Plain ES module, no Node APIs: web, admin, mobile and API |
| `src/category-checks.mjs` | The contrast rules of one category theme; used by the build gate and the unit test |
| `test/category-color.test.mjs` | `pnpm --filter @mytask/tokens test` (`node --test`): spec 3X AC-5 stress test, palette rules, helpers, motion bounds |
| `dist/category.mjs` | Generated category data read by `src/category-color.mjs`: starter palette, thresholds, reserved colours, brand fallback set, reference surfaces/canvas points |
| `package.json`, `README.md` | Package entry points for the Phase 3 monorepo |
| `dist/tokens.css` | Primitives as `--mt-*` variables on `:root`; light roles on `:root, [data-theme="light"]`; dark roles on `[data-theme="dark"]`; reduced-motion overrides; `.mt-text-*` text-style classes |
| `dist/fonts.css` | `@font-face` for FiraGO 400/500/600/700 (the web app serves `packages/assets/fonts/woff2/` at `/fonts/`) |
| `dist/web.mjs` + `.d.ts` | `vars`: the same tree as CSS variable references (`vars.bg.canvas === "var(--mt-bg-canvas)"`), for CSS-in-JS or a Tailwind preset; also re-exports `categoryStyle`, `deriveCategoryColor`, `isCategoryColor` |
| `dist/native.mjs` + `.d.ts` | `lightTheme`, `darkTheme`: React Native theme objects (resolved hex colours, numeric sizes, text styles with per-weight `fontFamily`, RN shadow objects, `gradient` as expo-linear-gradient props, `glow`, `category` brand set, `motion.spring`); also re-exports `categoryTheme`, `deriveCategoryColor`, `isCategoryColor` |
| `dist/tokens.mjs` + `.d.ts` | All resolved values (`primitives`, `themes`) for scripts, tests, the preview page |

Reading the JSON needs no install. Running the scripts needs only Node ≥ 22 (the Owner has Node 24; `node --test` with a glob).

### 2.3 Naming
- CSS: `--mt-` + path in kebab-case. Primitives keep their group: `--mt-color-brand-700`, `--mt-space-4`, `--mt-radius-card`, `--mt-font-size-md`. Theme roles drop `theme.<name>`: `theme.light.bg.canvas` → `--mt-bg-canvas`; `theme.*.shadow.md` → `--mt-elevation-md`; 3X: `--mt-gradient-action-primary`, `--mt-glow-brand`, `--mt-highlight-filled`, `--mt-border-action-secondary`, `--mt-cat-ink`, `--mt-motion-distance-lift-card`.
- Role variables point to primitive variables (`--mt-bg-canvas: var(--mt-color-neutral-50)`), so the inspector shows where each colour comes from.
- React Native: `theme.colors.bg.canvas`, `theme.text.body`, `theme.space[4]`, `theme.radius.card`, `theme.shadow.md`.

### 2.4 Theme switching
- Web: `<html data-theme="light|dark">`, rendered by the server from the user's saved preference (cookie or account setting) so there is no flash. Default `light`. The theme toggle becomes a real button with `aria-pressed` (legacy was a link that reloaded the page, audit 3.1). An optional "system" choice may map to `prefers-color-scheme`, but the default stays light (Q-059).
- Mobile: a `ThemeProvider` in `@mytask/ui/native` picks `lightTheme` or `darkTheme` (default light; the user can choose light, dark or system in Account → Settings).
- Admin app: same CSS; light only is acceptable at launch.

### 2.5 Transform plan for Phase 3
1. The devops-engineer adds `packages/tokens` to the workspace as is; `pnpm --filter @mytask/tokens build` runs `node build.mjs`.
2. CI runs `node packages/tokens/build.mjs` and fails on a contrast failure or on a `git diff` in `dist/` (generated files must be committed in sync).
3. `apps/web` and `apps/admin` import `@mytask/tokens/fonts.css` and `@mytask/tokens/tokens.css` once in the root layout. If Tailwind is chosen, a preset maps its theme to `vars` from `@mytask/tokens/web` (colours, spacing, radius, font sizes), and the default Tailwind palette is **disabled** so nobody can use `gray-400` again.
4. `apps/mobile` loads the four ttf files with `expo-font` under the names in `font.native.family` and wraps the app in the `ThemeProvider` from `@mytask/ui/native`.
5. Switching to Style Dictionary later is optional: the JSON is DTCG, so only the custom transforms (px numbers, the two `$extensions`) need small formatters.

### 2.6 Who may change tokens
Only the ui-ux-designer (CLAUDE.md). Any change must keep `build.mjs` green (0 contrast failures). A new colour role must be added to **both** themes (the build checks this) and, if it is text or UI, to `contrast-pairs.json`.

---

## 3. Colour

### 3.1 Brand teal (`color.brand`)
All four teals already in the brand sit on one scale, so the palette is the brand, not an invention.

| Step | Hex | Legacy source (evidence) | Role |
|---|---|---|---|
| 50 | `#EFF8F8` | new tint | `bg.selected` (light) |
| 100 | `#D6EFEE` | new tint (replaces the generated `primary-100 #93DCDA`) | `bg.brandSoft`, brand badge |
| 200 | `#AEDFDD` | new | dark link hover, dark brand badge text |
| 300 | `#7FCAC7` | ≈ legacy `primary-300 #65CDCA` | dark link/brand text, dark focus ring |
| 400 | `#52B3B0` | ≈ legacy `primary-400 #4EC6C2` | dark primary action (dark text) |
| **500** | **`#35A29F`** | live `--color-primary` (`dashboard-app.blade.php:62-68`, inline style on every page) | accent only |
| **600** | **`#29807E`** | live hero `.home-hero-section{background-color:#29807e}` (`home.blade.php:919-925`) | `bg.hero`, light focus ring |
| **700** | **`#0D696C`** | logo letter "M" (sampled, audit 1.1) | **primary action, links (light)** |
| 800 | `#08565A` | ≈ legacy `primary-800 #257471` family | primary hover, dark hero, dark sent bubble |
| **900** | **`#024249`** | logo "S", "K" | primary pressed |
| 950 | `#012C31` | new | dark selected/brand-soft |

The legacy `tailwind.config.js:84-95` scale (lightness ±6 % steps from an admin-set base, no 50 step) is retired together with the admin colour setting (Q-074).

### 3.2 Neutral (`color.neutral`)
| Step | Hex | Replaces (legacy evidence, audit 1.2 / 1.4) | Typical role |
|---|---|---|---|
| 0 | `#FFFFFF` | `bg-white` | surface (light) |
| 50 | `#FAFAFA` | `bg-[#fafafa]` page (`main-app.blade.php:180`), `gray-50 #F9FAFB` (auth) | canvas (light) |
| 100 | `#F4F4F5` | `gray-100`, `zinc-100`, `#F0F0F0`, `#F1F1F1` (chat) | subtle, secondary button, received bubble |
| 200 | `#E4E4E7` | `gray-200`, `zinc-200`, `#E9EEF5` (dashboard borders), `#DEDEDE` (scrolled header) | default border, pressed |
| 300 | `#D4D4D8` | `zinc-300`, `gray-300` | secondary text (dark), empty star (light) |
| 400 | `#A1A1AA` | `zinc-400`, `gray-400` (**was used for footer links at 2.54:1**) | muted text (dark only); disabled text (light) |
| 450 | `#8A8A93` | `#8F9095` (gig price label), `#95979D` | **form-control borders** (3.42:1 on white) |
| 500 | `#6B6B74` | `gray-500`, `zinc-500 #71717A`, `#707070` (scrolled nav) | muted text (light), tuned so it passes on `neutral.100` too |
| 600 | `#52525B` | `text-gray-600` body `#4B5563` (`main-app:180`), `zinc-600`, `slate-600` | secondary text (light) |
| 700 | `#3F3F46` | `zinc-700`, `gray-700`, `text-zinc-700` headings | dark borders, dark pressed |
| 750 | `#36363B` | chat dark `#323232`/`#2F2F2F` | subtle/hover (dark), received bubble (dark) |
| 800 | `#2E2E33` | chat dark `#2C2C2C` | raised surface (dark: menus, dialogs) |
| 850 | `#27272A` | `zinc-800` dark cards, chat `#272727` | surface (dark) |
| 900 | `#1E1E21` | `gray-900`, `zinc-900`, `text-black`, `#1A1A1A` (price), `#231D4F` (pricing navy) | **primary text (light)**, chat pane (dark) |
| 950 | `#161616` | dark page `#161616`, scrolled dark header `#0F0F0F` | canvas (dark), text on accent |

Result: 1 ramp instead of 37 Tailwind neutral shades + 77 hex greys.

### 3.3 Accents from the logo
| Palette | Key step | Evidence | Rules |
|---|---|---|---|
| `orange` 50–950 | **400 `#F48438`** | logo "A" | Promotional only: `badge.featured*`, `border.featured` (Premium frame), `action.accent*` (Premium Buy, Invite CTA), `bg.promo` (`orange.100`). Always dark text (`neutral.950`, 7.07:1) or `orange.800/900` text on `orange.100` |
| `coral` 100–800 | **400 `#E16A54`** | logo "T" | Decorative only: filled favourite heart (`status.favourite`, 3.29:1 non-text), illustrations. Never text |

### 3.4 Semantic palettes
| Palette | Text step (light) | Evidence | Notes |
|---|---|---|---|
| `green` | 700 `#15803D` / 800 `#166534` | legacy freelancer role `green-50/700` (`seller-app.blade.php:5`) | success, Selling role. Replaces teal-600 success (`public/css/style.css` `--success 13 148 136`) |
| `amber` | 700 `#B45309` / 800 `#92400E` | `--warning #F59E0B`, rating `amber-500` | warning, rating stars (`amber.600` light: 3.19:1 vs legacy 2.15:1) |
| `red` | 700 `#B91C1C` / 800 `#991B1B` | `--danger #B91C1C` | danger, field errors |
| `blue` | 700 `#1D4ED8` / 800 `#1E40AF` | legacy buyer role `blue-50/700` (`buyer-app.blade.php:5`), `--info #06B6D4` (cyan, retired) | info, Buying role |

Status pills change from `bg-X-50 text-X-400` (1.61–2.53:1, all failing) to `bg X-100 / text X-800` (6.37–7.15:1) in light and `bg X-950 / text X-300` in dark.

### 3.5 Retired colours
`#2EBFF6` (sky, Premium button and invite banner, Q-078) → `action.accent` / `bg.promo`. `#231D4F` (pricing navy) → `text.primary`. `#4F46E5` (seed default, chat theme) → `action.primary`. `#1DBF73`, `#446EE7`, `#F74040`, `#FC832B` (template leftovers) → semantic roles. `#2299DD` (Livewire progress bar) → `action.primary`. Toastr's grey "success" `#4E4E4E` and pastel error/info → `feedback.*`. The Premium gradient `rgba(6,176,240,.79) → rgba(0,255,209,.79)` (`subscription.scss:206`) → `border.featured` + Premium badge. Random pastel avatar backgrounds (`rgba(144,89,209,.1)`) → `bg.brandSoft` + `text.brand` initials. Social brand colours are the only third-party colours kept (`color.social`).

---

## 4. Theme roles (light and dark)
Components use only these. Values are generated from `tokens.json` (alias → hex).
#### bg
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `bg.canvas` (`--mt-bg-canvas`) | neutral.50 `#FAFAFA` | neutral.950 `#161616` | Page background (legacy #FAFAFA). |
| `bg.surface` (`--mt-bg-surface`) | neutral.0 `#FFFFFF` | neutral.850 `#27272A` | Cards, panels, header when scrolled, inputs. |
| `bg.surfaceRaised` (`--mt-bg-surface-raised`) | neutral.0 `#FFFFFF` | neutral.800 `#2E2E33` | Menus, dialogs, sheets, toasts (separated by shadow). |
| `bg.subtle` (`--mt-bg-subtle`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` | Filter group headers, secondary button, table header, received chat bubble, code boxes. |
| `bg.hover` (`--mt-bg-hover`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` | Hover on list rows, menu items, ghost buttons. |
| `bg.pressed` (`--mt-bg-pressed`) | neutral.200 `#E4E4E7` | neutral.700 `#3F3F46` |  |
| `bg.selected` (`--mt-bg-selected`) | brand.50 `#EFF8F8` | brand.950 `#012C31` | Selected row, active nav item, selected radio card. |
| `bg.brandSoft` (`--mt-bg-brand-soft`) | brand.100 `#D6EFEE` | brand.950 `#012C31` | Brand tint surfaces (skill chips, info callouts in brand colour). |
| `bg.inverse` (`--mt-bg-inverse`) | neutral.900 `#1E1E21` | neutral.100 `#F4F4F5` | Tooltips, snackbar-style toasts. |
| `bg.hero` (`--mt-bg-hero`) | brand.600 `#29807E` | brand.800 `#08565A` | Home hero (legacy #29807E kept). |
| `bg.promo` (`--mt-bg-promo`) | orange.100 `#FFE6D3` | orange.950 `#3D1804` | Invite-and-earn banner (replaces sky blue #2EBFF6, Q-078). |
| `bg.scrim` (`--mt-bg-scrim`) | alpha.scrimLight `#16161680` | alpha.scrimDark `#000000B3` |  |
| `bg.skeleton` (`--mt-bg-skeleton`) | neutral.200 `#E4E4E7` | neutral.750 `#36363B` |  |
| `bg.skeletonHighlight` (`--mt-bg-skeleton-highlight`) | neutral.100 `#F4F4F5` | neutral.700 `#3F3F46` |  |

#### text
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `text.primary` (`--mt-text-primary`) | neutral.900 `#1E1E21` | neutral.100 `#F4F4F5` | Headings and body. |
| `text.secondary` (`--mt-text-secondary`) | neutral.600 `#52525B` | neutral.300 `#D4D4D8` | Meta text, descriptions, table cells. |
| `text.muted` (`--mt-text-muted`) | neutral.500 `#6B6B74` | neutral.400 `#A1A1AA` | Placeholders, timestamps, help text, footer links. Passes AA on canvas, surface and subtle. |
| `text.disabled` (`--mt-text-disabled`) | neutral.400 `#A1A1AA` | neutral.600 `#52525B` | Disabled controls only (WCAG exempts inactive components). |
| `text.inverse` (`--mt-text-inverse`) | neutral.0 `#FFFFFF` | neutral.900 `#1E1E21` | Text on bg.inverse. |
| `text.link` (`--mt-text-link`) | brand.700 `#0D696C` | brand.300 `#7FCAC7` |  |
| `text.linkHover` (`--mt-text-link-hover`) | brand.900 `#024249` | brand.200 `#AEDFDD` |  |
| `text.brand` (`--mt-text-brand`) | brand.700 `#0D696C` | brand.300 `#7FCAC7` | Eyebrows, active nav, active tab label. |
| `text.onHero` (`--mt-text-on-hero`) | neutral.0 `#FFFFFF` | neutral.0 `#FFFFFF` |  |
| `text.onPromo` (`--mt-text-on-promo`) | orange.900 `#6B2D0A` | orange.200 `#FDCBA6` |  |
| `text.onImage` (`--mt-text-on-image`) | neutral.0 `#FFFFFF` | neutral.0 `#FFFFFF` | Only over color.alpha.imageGradientEnd. |
| `text.danger` (`--mt-text-danger`) | red.700 `#B91C1C` | red.300 `#FCA5A5` | Field errors, destructive text links. |
| `text.success` (`--mt-text-success`) | green.700 `#15803D` | green.400 `#4ADE80` |  |
| `text.warning` (`--mt-text-warning`) | amber.700 `#B45309` | amber.300 `#FCD34D` |  |
| `text.info` (`--mt-text-info`) | blue.700 `#1D4ED8` | blue.300 `#93C5FD` |  |

#### border
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `border.subtle` (`--mt-border-subtle`) | neutral.100 `#F4F4F5` | neutral.800 `#2E2E33` | Dividers inside cards. |
| `border.default` (`--mt-border-default`) | neutral.200 `#E4E4E7` | neutral.700 `#3F3F46` | Card outlines, header bottom border, table rows (decorative, legacy ring-gray-200 / #E9EEF5). |
| `border.strong` (`--mt-border-strong`) | neutral.450 `#8A8A93` | neutral.450 `#8A8A93` | Form-control boundaries (input, select, checkbox, radio): >= 3:1 non-text contrast. |
| `border.brand` (`--mt-border-brand`) | brand.700 `#0D696C` | brand.400 `#52B3B0` | Selected control / selected card, active tab indicator, focused input border. |
| `border.danger` (`--mt-border-danger`) | red.700 `#B91C1C` | red.400 `#F87171` | Invalid input border. |
| `border.featured` (`--mt-border-featured`) | orange.400 `#F48438` | orange.400 `#F48438` | Premium gig card frame (Q-069). Decorative; the Featured badge carries the meaning in text. |

#### action
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `action.primary` (`--mt-action-primary`) | brand.700 `#0D696C` | brand.400 `#52B3B0` | Filled primary button, primary switch/checkbox fill, sent chat bubble (Q-073). |
| `action.primaryHover` (`--mt-action-primary-hover`) | brand.800 `#08565A` | brand.300 `#7FCAC7` |  |
| `action.primaryPressed` (`--mt-action-primary-pressed`) | brand.900 `#024249` | brand.500 `#35A29F` |  |
| `action.onPrimary` (`--mt-action-on-primary`) | neutral.0 `#FFFFFF` | neutral.950 `#161616` |  |
| `action.secondary` (`--mt-action-secondary`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` | Grey button (legacy 'Contact freelancer'). |
| `action.secondaryHover` (`--mt-action-secondary-hover`) | neutral.200 `#E4E4E7` | neutral.700 `#3F3F46` |  |
| `action.secondaryPressed` (`--mt-action-secondary-pressed`) | neutral.300 `#D4D4D8` | neutral.600 `#52525B` |  |
| `action.onSecondary` (`--mt-action-on-secondary`) | neutral.900 `#1E1E21` | neutral.100 `#F4F4F5` |  |
| `action.ghostHover` (`--mt-action-ghost-hover`) | brand.50 `#EFF8F8` | brand.950 `#012C31` | Tertiary/ghost and outline button hover. |
| `action.ghostPressed` (`--mt-action-ghost-pressed`) | brand.100 `#D6EFEE` | brand.900 `#024249` |  |
| `action.onGhost` (`--mt-action-on-ghost`) | brand.700 `#0D696C` | brand.300 `#7FCAC7` |  |
| `action.danger` (`--mt-action-danger`) | red.700 `#B91C1C` | red.400 `#F87171` |  |
| `action.dangerHover` (`--mt-action-danger-hover`) | red.800 `#991B1B` | red.300 `#FCA5A5` |  |
| `action.dangerPressed` (`--mt-action-danger-pressed`) | red.900 `#7F1D1D` | red.500 `#EF4444` |  |
| `action.onDanger` (`--mt-action-on-danger`) | neutral.0 `#FFFFFF` | neutral.950 `#161616` |  |
| `action.accent` (`--mt-action-accent`) | orange.400 `#F48438` | orange.400 `#F48438` | Promotional CTA only (Premium Buy, Invite) with dark text (Q-078). |
| `action.accentHover` (`--mt-action-accent-hover`) | orange.300 `#F9A76E` | orange.300 `#F9A76E` |  |
| `action.accentPressed` (`--mt-action-accent-pressed`) | orange.500 `#E56F1F` | orange.500 `#E56F1F` |  |
| `action.onAccent` (`--mt-action-on-accent`) | neutral.950 `#161616` | neutral.950 `#161616` |  |
| `action.disabled` (`--mt-action-disabled`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` | Disabled fill for every button variant; label uses onDisabled, so it differs from the secondary button by text colour and cursor. |
| `action.onDisabled` (`--mt-action-on-disabled`) | neutral.500 `#6B6B74` | neutral.400 `#A1A1AA` | Kept >= 4.5:1 although WCAG exempts disabled controls, so Georgian labels stay readable. |

#### feedback
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `feedback.successBg` (`--mt-feedback-success-bg`) | green.50 `#F0FDF4` | green.950 `#052E16` |  |
| `feedback.successBorder` (`--mt-feedback-success-border`) | green.200 `#BBF7D0` | green.800 `#166534` |  |
| `feedback.successText` (`--mt-feedback-success-text`) | green.800 `#166534` | green.300 `#86EFAC` |  |
| `feedback.successIcon` (`--mt-feedback-success-icon`) | green.700 `#15803D` | green.400 `#4ADE80` |  |
| `feedback.warningBg` (`--mt-feedback-warning-bg`) | amber.50 `#FFFBEB` | amber.950 `#451A03` |  |
| `feedback.warningBorder` (`--mt-feedback-warning-border`) | amber.200 `#FDE68A` | amber.800 `#92400E` |  |
| `feedback.warningText` (`--mt-feedback-warning-text`) | amber.800 `#92400E` | amber.300 `#FCD34D` |  |
| `feedback.warningIcon` (`--mt-feedback-warning-icon`) | amber.700 `#B45309` | amber.400 `#FBBF24` |  |
| `feedback.dangerBg` (`--mt-feedback-danger-bg`) | red.50 `#FEF2F2` | red.950 `#450A0A` |  |
| `feedback.dangerBorder` (`--mt-feedback-danger-border`) | red.200 `#FECACA` | red.800 `#991B1B` |  |
| `feedback.dangerText` (`--mt-feedback-danger-text`) | red.800 `#991B1B` | red.300 `#FCA5A5` |  |
| `feedback.dangerIcon` (`--mt-feedback-danger-icon`) | red.700 `#B91C1C` | red.400 `#F87171` |  |
| `feedback.infoBg` (`--mt-feedback-info-bg`) | blue.50 `#EFF6FF` | blue.950 `#172554` |  |
| `feedback.infoBorder` (`--mt-feedback-info-border`) | blue.200 `#BFDBFE` | blue.800 `#1E40AF` |  |
| `feedback.infoText` (`--mt-feedback-info-text`) | blue.800 `#1E40AF` | blue.300 `#93C5FD` |  |
| `feedback.infoIcon` (`--mt-feedback-info-icon`) | blue.700 `#1D4ED8` | blue.400 `#60A5FA` |  |

#### badge
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `badge.neutralBg` (`--mt-badge-neutral-bg`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` |  |
| `badge.neutralText` (`--mt-badge-neutral-text`) | neutral.700 `#3F3F46` | neutral.200 `#E4E4E7` |  |
| `badge.brandBg` (`--mt-badge-brand-bg`) | brand.100 `#D6EFEE` | brand.950 `#012C31` |  |
| `badge.brandText` (`--mt-badge-brand-text`) | brand.800 `#08565A` | brand.200 `#AEDFDD` |  |
| `badge.successBg` (`--mt-badge-success-bg`) | green.100 `#DCFCE7` | green.950 `#052E16` |  |
| `badge.successText` (`--mt-badge-success-text`) | green.800 `#166534` | green.300 `#86EFAC` |  |
| `badge.warningBg` (`--mt-badge-warning-bg`) | amber.100 `#FEF3C7` | amber.950 `#451A03` |  |
| `badge.warningText` (`--mt-badge-warning-text`) | amber.800 `#92400E` | amber.300 `#FCD34D` |  |
| `badge.dangerBg` (`--mt-badge-danger-bg`) | red.100 `#FEE2E2` | red.950 `#450A0A` |  |
| `badge.dangerText` (`--mt-badge-danger-text`) | red.800 `#991B1B` | red.300 `#FCA5A5` |  |
| `badge.infoBg` (`--mt-badge-info-bg`) | blue.100 `#DBEAFE` | blue.950 `#172554` |  |
| `badge.infoText` (`--mt-badge-info-text`) | blue.800 `#1E40AF` | blue.300 `#93C5FD` |  |
| `badge.featuredBg` (`--mt-badge-featured-bg`) | orange.400 `#F48438` | orange.400 `#F48438` | Featured/Top badge on Premium gigs (Q-069). |
| `badge.featuredText` (`--mt-badge-featured-text`) | neutral.950 `#161616` | neutral.950 `#161616` |  |
| `badge.premiumBg` (`--mt-badge-premium-bg`) | orange.100 `#FFE6D3` | orange.950 `#3D1804` | 'Premium' plan pill (profile, plans, proposals gate). |
| `badge.premiumText` (`--mt-badge-premium-text`) | orange.800 `#8A3A0B` | orange.200 `#FDCBA6` |  |

#### role
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `role.buyingBg` (`--mt-role-buying-bg`) | blue.50 `#EFF6FF` | blue.950 `#172554` |  |
| `role.buyingText` (`--mt-role-buying-text`) | blue.800 `#1E40AF` | blue.200 `#BFDBFE` |  |
| `role.buyingAccent` (`--mt-role-buying-accent`) | blue.700 `#1D4ED8` | blue.400 `#60A5FA` |  |
| `role.sellingBg` (`--mt-role-selling-bg`) | green.50 `#F0FDF4` | green.950 `#052E16` |  |
| `role.sellingText` (`--mt-role-selling-text`) | green.800 `#166534` | green.200 `#BBF7D0` |  |
| `role.sellingAccent` (`--mt-role-selling-accent`) | green.700 `#15803D` | green.400 `#4ADE80` |  |

#### rating
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `rating.star` (`--mt-rating-star`) | amber.600 `#D97706` | amber.400 `#FBBF24` | >= 3:1 on white (legacy amber-500 was 2.15:1). Stars are always paired with the numeric value. |
| `rating.starEmpty` (`--mt-rating-star-empty`) | neutral.300 `#D4D4D8` | neutral.600 `#52525B` |  |

#### status
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `status.online` (`--mt-status-online`) | green.600 `#16A34A` | green.500 `#22C55E` | Online dot, >= 3:1 on surface; always has a 2 px surface-coloured ring and a text alternative. |
| `status.offline` (`--mt-status-offline`) | neutral.450 `#8A8A93` | neutral.450 `#8A8A93` |  |
| `status.favourite` (`--mt-status-favourite`) | coral.400 `#E16A54` | coral.400 `#E16A54` | Filled heart (non-text, 3.29:1 on white). |

#### chat
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `chat.sentBg` (`--mt-chat-sent-bg`) | brand.700 `#0D696C` | brand.800 `#08565A` |  |
| `chat.sentText` (`--mt-chat-sent-text`) | neutral.0 `#FFFFFF` | neutral.0 `#FFFFFF` |  |
| `chat.receivedBg` (`--mt-chat-received-bg`) | neutral.100 `#F4F4F5` | neutral.750 `#36363B` |  |
| `chat.receivedText` (`--mt-chat-received-text`) | neutral.900 `#1E1E21` | neutral.100 `#F4F4F5` |  |
| `chat.systemBg` (`--mt-chat-system-bg`) | amber.50 `#FFFBEB` | amber.950 `#451A03` | Order/system events inside a thread. |
| `chat.systemText` (`--mt-chat-system-text`) | amber.800 `#92400E` | amber.300 `#FCD34D` |  |
| `chat.paneBg` (`--mt-chat-pane-bg`) | neutral.0 `#FFFFFF` | neutral.900 `#1E1E21` |  |

#### focus
| Token (`--mt-…`) | Light | Dark | Use |
|---|---|---|---|
| `focus.ring` (`--mt-focus-ring`) | brand.600 `#29807E` | brand.300 `#7FCAC7` | >= 3:1 against canvas, surface and subtle (legacy #35A29F was 2.95:1 on #FAFAFA). |

Shadows per theme: `--mt-elevation-sm|md|lg` → light `shadow.sm|md|lg`, dark `shadow.smDark|mdDark|lgDark` (stronger, because dark surfaces hide shadows; dark cards also keep `border.default`).

---

## 5. Typography

### 5.1 Font
| Item | Value |
|---|---|
| Family | **FiraGO** 1.001 (bBoxType, SIL OFL 1.1), one family name with real weights 400 Regular, 500 Medium, 600 SemiBold, 700 Bold |
| Files | web `packages/assets/fonts/woff2/FiraGO-{Regular,Medium,SemiBold,Bold}.woff2` (250–259 KB each); native `packages/assets/fonts/ttf/…ttf` (805–807 KB each). Downloaded from the official release; the Regular OTF is byte-identical (MD5) to the legacy file |
| Coverage (fontTools, all four weights) | Mkhedruli U+10D0–10FA **43/43**; Mtavruli U+1C90–1CBA **0/43**; Lari ₾ U+20BE **yes**; OpenType `tnum` (tabular figures) **yes** |
| Metrics | UPM 1000, ascender 935, descender −265 (content area 1.2 em), x-height 527 |
| Fallback | `"Noto Sans Georgian"` (installed on Android, Google Fonts), then the system UI font |
| Removed | `BPG Nino Mtavruli Bold` (404 live), `'FiraGo Bold'` separate family (caused faux bold), `Heebo`/`Noto Kufi Arabic` (chat, no Georgian), Noto Sans Display (seed) |
| Performance | Phase 3 may subset the woff2 to Georgian + Latin + Lari + punctuation (typically −60 %); preload Regular and SemiBold only |

### 5.2 Rules
- **No uppercase Georgian.** `text-transform` is always `none`; section labels use the `eyebrow` style (colour + weight). English text in the same components also stays sentence case, so one style fits both languages.
- **No letter-spacing** (`letterSpacing.normal = 0`); the legacy `tracking-wider/widest` go away.
- **No faux bold:** only weights 400/500/600/700; `extrabold`/`black` (83 legacy uses) map to 700.
- **Minimum size 13 px** (captions, badges only). Running text 16. Inputs 16 (avoids iOS zoom on focus).
- **Line height ≥ 1.5 × for body text** (Mkhedruli has tall ascenders and descenders).
- **Tabular numerals** for prices, balances, counters and table figures (`font.numeric.tabular`).
- **Design for Georgian length:** labels wrap, never `truncate` (legacy contact-form labels were cut off, audit 3.13). Titles clamp by line count.

### 5.3 Size scale and text styles
| Token | px / line height | Legacy sizes it replaces |
|---|---|---|
| `font.size.xs` | 13 / 20 | 9 px price label, 10 px, 11 px, 12 px (`text-xs` ×953), 13 px |
| `font.size.sm` | 14 / 22 | `text-sm` ×1208, `text-sm+` 15 px |
| `font.size.md` | 16 / 24 | `text-base`, body |
| `font.size.lg` | 18 / 28 | `text-lg`; gig card price 15 px/900 |
| `font.size.xl` | 20 / 28 | `text-xl` |
| `font.size.2xl` | 24 / 32 | `text-2xl` (gig h1 desktop) |
| `font.size.3xl` | 28 / 36 | pricing title 1.75rem, `text-3xl` hero |
| `font.size.4xl` | 32 / 40 | `text-4xl` |
| `font.size.5xl` | 40 / 48 | pricing price 2.75rem |

| Style (`text.*`, CSS class `.mt-text-*`) | Mobile / base | ≥ 1024 px | Weight | Use |
|---|---|---|---|---|
| `display` | 28/36 | 40/48 | 700 | Home hero h1 |
| `h1` | 24/32 | 32/40 | 700 | Page title (one per page) |
| `h2` | 20/28 | 24/32 | 700 | Section titles |
| `h3` | 18/28 | 20/28 | 600 | Panel, modal titles |
| `title` | 16/24 | – | 600 | Card and list titles (2-line clamp) |
| `bodyLg` | 18/28 | – | 400 | Long-form reading |
| `body` | 16/24 | – | 400 | Default |
| `bodySm` | 14/22 | – | 400 | Meta, help, table cells, nav links |
| `label` | 14/22 | – | 500 | Form labels, tabs, segmented control |
| `caption` | 13/20 | – | 400 | Timestamps, counters, fine print |
| `badge` | 13/20 | – | 600 | Badges, pills |
| `eyebrow` | 14/22 | – | 600 | Replaces uppercase section labels |
| `buttonSm` / `buttonMd` | 14/22, 16/24 | – | 600 | Buttons (lg buttons use `buttonMd` with more height) |
| `price` | 18/28 tabular | – | 700 | Card prices |
| `priceLg` | 24/32 tabular | 32/40 | 700 | Purchase box, balances, checkout total, plan price |

---

## 6. Space, shape, elevation, layout

### 6.1 Spacing (`space`)
`0, 0.5 (2), 1 (4), 2 (8), 3 (12), 4 (16), 5 (20), 6 (24), 8 (32), 10 (40), 12 (48), 16 (64), 20 (80), 24 (96)`. Keys match the Tailwind numbers already used in legacy (`p-4` = 16). Retired: `4.5` (18 px ×84), `2.5`, `1.5`, `3.5`, `mt-[3px]`, `py-[7px]`, `pb-[9px]`, the `mt-[7rem]` header offset (×45; replaced by `size.layout.headerHeight`).
Rhythm: 4 between icon and label, 8 inside compact groups, 12–16 inside cards, 24 between cards/blocks, 32–48 between page sections (mobile 24–32).

### 6.2 Radius (`radius`)
| Token | px | Role | Legacy mismatch fixed |
|---|---|---|---|
| `xs` | 4 | checkbox, table thumbnails | – |
| `sm` | 6 | tooltips, menu items | – |
| `md` = `control` | 8 | buttons, inputs, selects, tabs, segmented control | buttons were `rounded` 4 / `rounded-md` 6 / `rounded-full` / `rounded-3xl` |
| `lg` | 12 | menus, toasts, banners (cards until 3X) | cards were 8 / 12 / 6 / 24 |
| `xl` = `card` = `dialog` | 16 | **cards and panels** (since 3X.6, Owner Q-175), dialogs, bottom sheets, chat bubbles (tail corner 4), hero search | – |
| `2xl` | 24 | hero tiles, plan cards (legacy 1.5 rem kept) | – |
| `full` = `pill` | 9999 | avatars, badges, switch, online dot, favourite button | pills were `rounded-sm` / `rounded-3xl` |

### 6.3 Borders
`borderWidth.hairline` 1 (default), `borderWidth.strong` 2 (selected card, Premium frame, active tab indicator, focused input on mobile).

### 6.4 Elevation (`shadow`, themed as `--mt-elevation-*`)
| Level | Light CSS | Use | Legacy |
|---|---|---|---|
| none | – | flat lists, table rows | `shadow-none` |
| `sm` | `0 1px 2px #1616160F, 0 1px 3px #1616161A` | resting cards (+ `border.default`) | `shadow-sm ring-1 ring-gray-200` (×424) |
| `md` | `0 4px 12px -4px #16161614, 0 2px 4px #1616160F` | hovered cards, menus, sticky bars | plan card `0 4px 12px -4px rgba(0,0,0,.08)` |
| `lg` | `0 24px 48px -12px #16161633` | dialogs, sheets, toasts | `shadow-xl`/`2xl` |
| `control` (3X) | `0 1px 2px #16161614` (dark `#00000066`) | buttons, pills, icon buttons at rest | – |
Native: iOS `shadowColor/Offset/Opacity/Radius` + Android `elevation` 1 / 4 / 12 (control 1).

### 6.5 Breakpoints and layout
| Token | px | Meaning |
|---|---|---|
| `breakpoint.sm` | 640 | large phones landscape |
| `breakpoint.md` | 768 | dashboard sidebar visible; tables stop being card lists |
| `breakpoint.lg` | 1024 | desktop header (no hamburger), two-column gig/project pages, type steps up |
| `breakpoint.xl` | 1280 | 4-column gig grid |
| `breakpoint.2xl` | 1440 | wide home rows |
Retired: chat 576/680/700/980/1060, pricing 767, toastr 720, Tailwind 1536.
Layout sizes (`size.layout.*`): container 1280, wide 1400 (home rows), prose 720; gutters 16 / 24 / 32; header 72 desktop (legacy 80, logo now 32 px tall instead of a 120 px padded PNG) and 56 mobile; category bar 48; dashboard top bar 64; sidebar 240; filter column 280; chat list 320; tab bar 56 + safe area; sticky bar ≥ 72 + safe area; hero min-height 360 mobile / 520 desktop (legacy fixed 600 everywhere); dialogs 440 / 560 / 800.

### 6.6 Sizes and touch targets (`size`)
- `touchTarget.min` **44**, `touchTarget.comfortable` 48 (Android, primary mobile actions).
- Controls: `sm` 36 (desktop dense areas only; hit area extended to 44 on `pointer: coarse`), `md` **44** (default), `lg` 52 (primary CTAs, sticky bars, hero search, auth submit).
- Icons 16 / **20** (in controls) / **24** (standalone) / 32 / 48. Avatars 24 / 32 / 40 / 64 / 96. Checkbox 20 (inside a 44 hit area). Switch 44×24. Online dot 12.

### 6.7 Z-index (`zIndex`)
base 0 · raised 10 · sticky 100 · header 200 · dropdown 300 · overlay 400 · drawer 410 · dialog 500 · popover 600 · toast 700 · tooltip 800.

### 6.8 Motion (`motion`)
Durations: instant 0, **press 80** (3X), fast 120 (colour/hover/focus), base 200 (menus, tabs, toasts), slow 300 (dialogs, drawers, sheets), slower 400 (page transitions); loops: shimmer 1200, **drift 18000** (3X, hero, Q-177). Easings: standard `(0.2,0,0,1)`, enter `(0,0,0.2,1)`, exit `(0.4,0,1,1)`, emphasized `(0.3,0,0,1)`.
3X additions (visual-refresh.md §7, bounds of spec 3X R-4.1, enforced by the unit test):
| Token | Value | Use |
|---|---|---|
| `motion.scale.hover` | **1.03** (was 1.02) | card image zoom inside its frame (M-4) |
| `motion.scale.pressed` | 0.98 | button press (cards use 0.99) |
| `motion.distance.liftControl` / `liftCard` / `enter` | 1 / 3 / 8 px | `translateY(-n)` on hover (M-1, M-5 / M-3); first-view slide-up (M-10) |
| `motion.stagger.step` / `max` | 40 ms / 8 | entrance stagger; items after 8 have no delay |
| `motion.spring.default` | damping 18, stiffness 220, mass 1, `overshootClamping: true` | React Native only (Reanimated `withSpring`); no bounce |

**Reduced motion** (`prefers-reduced-motion`, iOS/Android Reduce Motion) — **changed in 3X**: durations are **capped at `fast` 120 ms** instead of 0 (colour and opacity fades stay; they help orientation and WCAG 2.3.3 targets motion, not fades); loops (shimmer, drift) become 0 = off; `distance.*` become 0, `scale.*` become 1, `stagger.step` becomes 0. `tokens.css` does this in one `@media` block, so components that move through the variables (`translateY(calc(-1 * var(--mt-motion-distance-lift-card)))`, `scale(var(--mt-motion-scale-hover))`) stop moving automatically. Native passes `reduceMotion: ReduceMotion.System` to every Reanimated animation. Carousels do not auto-advance.

### 6.9 Focus (`focus`)
Ring width 2, offset 2, colour `theme.*.focus.ring` (`brand.600` light: 4.68:1 on white, 4.49:1 on canvas; `brand.300` dark). Shown on `:focus-visible` for every interactive element; inputs also switch their border to `border.brand`. Never `outline: none` without a replacement.

### 6.10 Gradients, glows and highlights (3X, `theme.<name>.gradient|glow|highlight`)
All values are in `tokens.json`; this is the map. Light / dark differ for every token (dark mode is designed, not inverted, Q-173).
| Token (CSS) | What | Spec |
|---|---|---|
| `gradient.canvas` (`--mt-gradient-canvas`) | page canvas: brand glow top-left + violet glow top-right over a vertical base; painted on a fixed `body::before` layer, `body` keeps `--mt-bg-canvas` as fallback | visual-refresh §3.1 |
| `gradient.hero` | home hero: violet radial (drifts, M-12) over the teal diagonal | §3.4 |
| `gradient.surface`, `gradient.input` | near-solid cards/panels and inputs | §3.2, §6.3 |
| `gradient.track` | role switcher and switch track | §6.2 |
| `gradient.skeleton` | skeleton shimmer (animate `background-position`) | §6.4 |
| `gradient.indicator` | active tab indicator, rating bars, step dots (≥ 3:1 on surface at both ends) | §6.2 |
| `gradient.brandStrip`, `gradient.brandBanner` | 4 px strip on dialogs/auth card; profile card banner | §6.4, §12 |
| `gradient.action.{primary, primaryHover, secondary, secondaryHover, accent, accentHover, danger, dangerHover, ghostHover}` | button fills; the hover gradient is an `::before` layer whose opacity animates | §4.2 |
| `gradient.category` (CSS only) | `135deg` category gradient from `--mt-cat-gradient-start/-end` | §8 |
| `glow.{brand, brandSoft, accent, danger, success}` (`--mt-glow-*`) | coloured light on hover/focus/open/selected only; `brandSoft` = half strength (card hover, chip hover) | §5 |
| `glow.category` (CSS only) | `0 0 0 3px var(--mt-cat-glow), 0 8px 22px -8px var(--mt-cat-solid)` | §5 |
| `highlight.{filled, secondary, surface, pressed}` (`--mt-highlight-*`) | inset top edge of filled buttons / secondary buttons / cards; pressed inset. Web only | §4.1, §4.3 |
| `shadow.control` (`--mt-elevation-control`) | buttons at rest | §4.1 |
| `border.action.{primary, secondary, secondaryHover, accent, danger, ghost}` | button borders, always visible (R-2.1); decorative edge, the label and fill identify the button | §4.2 |
| `border.cardHover`, `border.translucent`, `border.overHero` | card hover border; hairline under the frosted header/menus; pill border over the hero | §6.1, §3.3, §8.4 |
| `bg.translucent`, `bg.overHero` | frosted header/menus/mega-menu (with `backdrop-filter`, solid `bg.surface` fallback); pills over the hero (darkens it so white text stays ≥ 4.5) | §3.3, §8.4 |

**Canvas glows were reduced in 3X.6** from 10 % / 5 % (3X.2) to **7 % / 4 %** in light mode. The 3X.2 check measured the canvas at points where the glow had already faded. The build now composites each glow at full strength over every base stop, and at 10 % `text.muted` dropped to 4.41. At 7 % / 4 % the lowest value is 4.53. Dark values are unchanged (`text.muted` lowest 6.01). Glows are not stacked in the check: they sit in opposite top corners and fade out (62 % / 60 %) before they meet. **Rule:** nothing may be added to the canvas that the check does not cover.

**Native.** `theme.gradient.*` gives linear layers as `expo-linear-gradient` props `{ type, colors, locations, start, end }` (the CSS angle converted to start/end points). The canvas and hero are arrays of layers; radial layers are kept as data `{ type: "radial", … }` and are web-only unless 3X.16 decides otherwise. `theme.glow.*` = iOS shadow props from `$extensions["ge.mytask.native"]` (the diffuse layer). On Android, use `elevation` + a 1 px border in the glow colour (visual-refresh §10). `highlight` is not in the native theme.

### 6.11 Category colours (3X, spec 3X R-1, ADR-023)
**Data** (`tokens.json` → `category`, not emitted to CSS):
- `category.starter`: the **12 starter colours in assignment order**. These are violet `#7C3AED`, rose `#DB2777`, blue `#2563EB`, gold `#D99A00`, sky `#0EA5E9`, navy `#1E3A8A` and leaf `#4D9A1E`, then the spares fuchsia `#C026D3`, bronze `#8B5E34`, slate `#52606D`, olive `#A3A30D` and wine `#9F1239`.
  - **The order is behaviour.** The 3X.7 migration and the API's default pick take the first unused colour (ADR-023 §4).
  - Keys are names, never numbers, so the JSON key order holds. The API reads `Object.values(tokens.category.starter)` from `@mytask/tokens/tokens.json`; JS code can use `categoryStarter` from `@mytask/tokens/color`.
- `category.similarDeltaE` **0.08**, `category.reservedDeltaE` **0.06**: OKLab distances for the admin warnings (R-1.3, Q-178).
- `category.reserved`: brand teal 600 and 700, error `red.700`, success `green.700` and Featured `orange.400`. Each carries `$extensions["ge.mytask.meaning"]` (`brand` / `error` / `success` / `featured`), which selects `t_category_color_meaning_<meaning>`.
- `theme.<name>.cat`: the **brand fallback set**, with the same keys as the function output. It is used wherever no category colour applies: search, sellers, an unlinked project category, or a `null` colour (R-1.2, ADR-023 §2). It is hand-picked from the brand ramp and passes the same checks.

**The function** — `@mytask/tokens/color` (`src/category-color.mjs`, ported from the 3X.2 prototype, method in visual-refresh §8.2):
| Export | Gives |
|---|---|
| `deriveCategoryColor(hex)` | `{ light, dark }`, each `{ solid, onSolid, gradientStart, gradientEnd, tint, tintStrong, ink, indicator, glow }`. `null`/`undefined` → the brand set; any other non-`#RRGGBB` input throws `TypeError`. Case-insensitive, cached, frozen |
| `categoryStyle(hex)` (web, also from `@mytask/tokens/web`) | inline style object with **both** sets: `--mt-cat-l-solid`, `--mt-cat-l-on-solid`, … `--mt-cat-d-glow` (18 variables). `null`/invalid → `{}`. Never throws |
| `categoryTheme(hex, mode)` (native, also from `@mytask/tokens/native`) | the set for one scheme; `null`/invalid → brand set |
| `isCategoryColor`, `normalizeCategoryColor` | `#RRGGBB` check / upper-case |
| `deltaE(a, b)`, `contrastRatio(a, b)` | OKLab distance, WCAG ratio (the same maths as the checks) |
| `findSimilar(hex, rows)`, `findDuplicate(hex, rows)`, `findReserved(hex)` | admin warnings (3X.15). Similar = 0 < ΔE < 0.08, closest first (an exact match is the duplicate, refused by the API with 409). Reserved returns `{ id, color, meaning, deltaE }` |
| `nextStarterColor(used)` | first unused starter colour, or `null` when all 12 are used (the admin pre-select and the API default) |
| `categoryStarter`, `categoryReserved`, `categoryBrand`, `categorySimilarDeltaE`, `categoryReservedDeltaE` | the data above |

**Guarantees** (checked by the build for the brand set and all 12 starters, and by the unit test for 4,096 grid colours + 1,500 random colours, both modes):
- `onSolid` ≥ 4.5 on `solid` and on both gradient ends.
- `ink` ≥ 4.5 on `surface`, `surfaceRaised`, every `gradient.surface` stop, `bg.canvas`, every `gradient.canvas` point, `tint` and `tintStrong`.
- `indicator` ≥ 3 on the same surfaces and canvas points.

The port checks the gradient canvas points too; the prototype checked `#FAFAFA` only. So `ink`/`indicator` can be a step stronger than in the 3X.3 preview. `solid`, `onSolid`, the gradient ends and the tints are identical (unit-tested).

**Web wiring** (in `dist/tokens.css`):
- An element with class **`mt-cat`** (or a `data-category-theme` attribute) and `style={categoryStyle(color)}` maps the active theme's inline set to `--mt-cat-solid`, `--mt-cat-on-solid`, `--mt-cat-gradient-start/-end`, `--mt-cat-tint`, `--mt-cat-tint-strong`, `--mt-cat-ink`, `--mt-cat-indicator` and `--mt-cat-glow`. It also re-declares `--mt-glow-category` and `--mt-gradient-category`.
- Without inline variables, the brand fallback applies.
- Descendants inherit the nearest category. Components only ever use `var(--mt-cat-*)`.
- The CSP already allows inline styles; the value is always an API-validated `#RRGGBB`.

**Native:** `const c = categoryTheme(category.color, scheme)`, then `c.solid`, `c.ink`, ….

---

## 7. Legacy → token mapping (quick reference for engineers)
| Legacy (evidence) | Token |
|---|---|
| `bg-primary-600` + `text-white` buttons (`components/forms/button.blade.php:1-22`) | `action.primary` + `action.onPrimary` |
| `text-primary-600` links, `hover:text-primary-700` | `text.link`, `text.linkHover` |
| `text-blue-600` "Back to home" (auth) | `text.link` |
| `.home-hero-section{background-color:#29807e}` | `bg.hero` |
| `bg-[#2ebff6]` invite banner (`home.blade.php:71`), `.plan-button` | `bg.promo` + `text.onPromo`; `action.accent` + `action.onAccent` |
| Premium gig card yellow border (`cards/gig.blade.php:1`) | `border.featured` + Featured badge (`badge.featured*`) |
| `bg-[#fafafa]`, `bg-gray-50` pages | `bg.canvas` |
| `bg-white`, `dark:bg-zinc-800` cards | `bg.surface` |
| `text-gray-900`, `text-zinc-900`, `text-black`, `#231D4F`, `#1A1A1A` | `text.primary` |
| `text-gray-600`, `text-zinc-600`, `text-slate-600` | `text.secondary` |
| `text-gray-400`, `text-gray-500`, `zinc-400`, `#8F9095`, `#707070`, `#95979D` | `text.muted` |
| `border-gray-200`, `ring-gray-200`, `#E9EEF5`, `#DEDEDE`, `#F0F0F0` | `border.default` |
| input borders `border-gray-300`/`zinc-300` | `border.strong` |
| status pills `bg-X-50 text-X-400` | `badge.<tone>Bg` + `badge.<tone>Text` |
| `bg-amber-100 text-amber-600` "needs subscription" | `badge.premiumBg` + `badge.premiumText` |
| toastr success `#4E4E4E`, error `rgb(255 162 162)`/`#862222`, etc. | `feedback.*` |
| yellow "Beware of scams" alert (project page) | `feedback.warning*` |
| `text-amber-500` stars | `rating.star` |
| buyer `blue-50/700`, freelancer `green-50/700` (switcher, sidebar badges) | `role.buying*`, `role.selling*` |
| chat sent bubble `settings('appearance')->colors['primary']` + white | `chat.sentBg` + `chat.sentText` |
| chat dark `#323232`, `#272727`, `#434343`/`#DADADA` | `chat.*` dark |
| `focus:outline-none`, `focus:ring-0`, `focus:shadow-outline` | `focus.ring*` on `:focus-visible` |
| `text-xs` (12), `text-[13px]`, `text-[11px]`, `text-[10px]`, 9 px | `text.caption` / `text.badge` (13) or `text.bodySm` (14) |
| `font-extrabold`, `font-black` | `font.weight.bold` |
| `uppercase tracking-wider` section titles | `text.eyebrow` or `text.h2` |
| `rounded`, `rounded-md`, `rounded-full`, `rounded-3xl` buttons | `radius.control` |
| `shadow-sm` / `shadow-lg` / `shadow-xl` | `--mt-elevation-sm/md/lg` |
| `h-20` header, `mt-[7rem]` | `size.layout.headerHeight` (+ category bar) |
| `max-w-7xl` / `max-w-[1400px]` / `max-w-container` / `max-w-10xl` | `size.layout.containerMax` / `containerWide` |
| `duration-200/300 ease-linear/ease-out` | `motion.duration.base/slow` + `motion.easing.standard` |

---

## 8. Contrast results (WCAG 2.1 AA)
Computed by `node packages/tokens/contrast.mjs --md` from the tokens (WCAG relative-luminance formula). `text` pairs need ≥ 4.5:1 (AA normal text; we do not rely on the large-text 3:1 exception anywhere). `ui` pairs (control borders, focus ring, icons, stars, dots) need ≥ 3:1 (WCAG 1.4.11). The category-tile gradient is composited over white (worst case).
**Result: 106 pairs × 2 themes = 212 checks, 0 failures; category themes (brand + 12 starters × 2 modes) 728 checks, 0 failures.** A gradient background is checked at every stop and at every glow composited at full strength over every base stop; the "worst" colour is shown. Tightest text pairs: light `text.muted` on `gradient.canvas` **4.53** (3X), light `text.onHero` on `bg.hero` / `gradient.hero` 4.68 (white on the legacy hero teal, unchanged) and dark `text.muted` on `bg.subtle` 4.69. Tightest UI pairs: `bg.surface` vs `gradient.indicator` 3.08 (brand.500 end, light) and light `rating.star` on `bg.canvas` 3.05. The second table gives the lowest ratio per category theme (rules in §6.11).
| Foreground | Background | Use | Min | Light (fg / bg) | Light ratio | Dark (fg / bg) | Dark ratio |
|---|---|---|---|---|---|---|---|
| `text.primary` | `bg.canvas` | Headings/body on page | 4.5 | #1E1E21 / #FAFAFA | 15.93 pass | #F4F4F5 / #161616 | 16.46 pass |
| `text.primary` | `bg.surface` | Body on cards | 4.5 | #1E1E21 / #FFFFFF | 16.63 pass | #F4F4F5 / #27272A | 13.55 pass |
| `text.primary` | `bg.surfaceRaised` | Body in dialogs/menus | 4.5 | #1E1E21 / #FFFFFF | 16.63 pass | #F4F4F5 / #2E2E33 | 12.29 pass |
| `text.primary` | `bg.subtle` | Body on subtle panels | 4.5 | #1E1E21 / #F4F4F5 | 15.13 pass | #F4F4F5 / #36363B | 10.93 pass |
| `text.primary` | `bg.selected` | Selected row / active nav | 4.5 | #1E1E21 / #EFF8F8 | 15.40 pass | #F4F4F5 / #012C31 | 13.59 pass |
| `text.primary` | `chat.paneBg` | Chat pane text | 4.5 | #1E1E21 / #FFFFFF | 16.63 pass | #F4F4F5 / #1E1E21 | 15.13 pass |
| `text.secondary` | `bg.canvas` | Meta on page | 4.5 | #52525B / #FAFAFA | 7.41 pass | #D4D4D8 / #161616 | 12.24 pass |
| `text.secondary` | `bg.surface` | Meta on cards | 4.5 | #52525B / #FFFFFF | 7.73 pass | #D4D4D8 / #27272A | 10.08 pass |
| `text.secondary` | `bg.subtle` | Meta on subtle | 4.5 | #52525B / #F4F4F5 | 7.03 pass | #D4D4D8 / #36363B | 8.13 pass |
| `text.secondary` | `bg.surfaceRaised` | Meta in dialogs | 4.5 | #52525B / #FFFFFF | 7.73 pass | #D4D4D8 / #2E2E33 | 9.14 pass |
| `text.muted` | `bg.canvas` | Placeholder/help/footer links on page | 4.5 | #6B6B74 / #FAFAFA | 5.05 pass | #A1A1AA / #161616 | 7.06 pass |
| `text.muted` | `bg.surface` | Placeholder/timestamps on cards and inputs | 4.5 | #6B6B74 / #FFFFFF | 5.28 pass | #A1A1AA / #27272A | 5.81 pass |
| `text.muted` | `bg.subtle` | Muted on subtle (filter headers, table head) | 4.5 | #6B6B74 / #F4F4F5 | 4.80 pass | #A1A1AA / #36363B | 4.69 pass |
| `text.muted` | `bg.surfaceRaised` | Muted in dialogs/menus | 4.5 | #6B6B74 / #FFFFFF | 5.28 pass | #A1A1AA / #2E2E33 | 5.27 pass |
| `text.link` | `bg.canvas` | Links on page | 4.5 | #0D696C / #FAFAFA | 6.18 pass | #7FCAC7 / #161616 | 9.63 pass |
| `text.link` | `bg.surface` | Links on cards | 4.5 | #0D696C / #FFFFFF | 6.45 pass | #7FCAC7 / #27272A | 7.93 pass |
| `text.link` | `bg.subtle` | Links on subtle | 4.5 | #0D696C / #F4F4F5 | 5.87 pass | #7FCAC7 / #36363B | 6.39 pass |
| `text.linkHover` | `bg.surface` | Link hover | 4.5 | #024249 / #FFFFFF | 11.18 pass | #AEDFDD / #27272A | 10.21 pass |
| `text.brand` | `bg.selected` | Active nav item label | 4.5 | #0D696C / #EFF8F8 | 5.98 pass | #7FCAC7 / #012C31 | 7.95 pass |
| `text.brand` | `bg.brandSoft` | Skill chip label | 4.5 | #0D696C / #D6EFEE | 5.36 pass | #7FCAC7 / #012C31 | 7.95 pass |
| `text.danger` | `bg.surface` | Field error text | 4.5 | #B91C1C / #FFFFFF | 6.47 pass | #FCA5A5 / #27272A | 7.85 pass |
| `text.danger` | `bg.canvas` | Field error text on page | 4.5 | #B91C1C / #FAFAFA | 6.20 pass | #FCA5A5 / #161616 | 9.53 pass |
| `text.success` | `bg.surface` | Success inline text | 4.5 | #15803D / #FFFFFF | 5.02 pass | #4ADE80 / #27272A | 8.55 pass |
| `text.warning` | `bg.surface` | Warning inline text | 4.5 | #B45309 / #FFFFFF | 5.02 pass | #FCD34D / #27272A | 10.33 pass |
| `text.info` | `bg.surface` | Info inline text | 4.5 | #1D4ED8 / #FFFFFF | 6.70 pass | #93C5FD / #27272A | 8.26 pass |
| `text.inverse` | `bg.inverse` | Tooltip | 4.5 | #FFFFFF / #1E1E21 | 16.63 pass | #1E1E21 / #F4F4F5 | 15.13 pass |
| `text.onHero` | `bg.hero` | Home hero h1 and text | 4.5 | #FFFFFF / #29807E | 4.68 pass | #FFFFFF / #08565A | 8.44 pass |
| `text.onPromo` | `bg.promo` | Invite-and-earn banner | 4.5 | #6B2D0A / #FFE6D3 | 8.73 pass | #FDCBA6 / #3D1804 | 10.72 pass |
| `text.onImage` | `color.alpha.imageGradientEnd` | Category tile title over gradient (worst case: white photo) | 4.5 | #FFFFFF / #454545 | 9.59 pass | #FFFFFF / #454545 | 9.59 pass |
| `action.onPrimary` | `action.primary` | Primary button | 4.5 | #FFFFFF / #0D696C | 6.45 pass | #161616 / #52B3B0 | 7.27 pass |
| `action.onPrimary` | `action.primaryHover` | Primary button hover | 4.5 | #FFFFFF / #08565A | 8.44 pass | #161616 / #7FCAC7 | 9.63 pass |
| `action.onPrimary` | `action.primaryPressed` | Primary button pressed | 4.5 | #FFFFFF / #024249 | 11.18 pass | #161616 / #35A29F | 5.88 pass |
| `action.onSecondary` | `action.secondary` | Secondary button | 4.5 | #1E1E21 / #F4F4F5 | 15.13 pass | #F4F4F5 / #36363B | 10.93 pass |
| `action.onSecondary` | `action.secondaryHover` | Secondary button hover | 4.5 | #1E1E21 / #E4E4E7 | 13.11 pass | #F4F4F5 / #3F3F46 | 9.50 pass |
| `action.onSecondary` | `action.secondaryPressed` | Secondary button pressed | 4.5 | #1E1E21 / #D4D4D8 | 11.25 pass | #F4F4F5 / #52525B | 7.03 pass |
| `action.onGhost` | `bg.surface` | Ghost/outline button | 4.5 | #0D696C / #FFFFFF | 6.45 pass | #7FCAC7 / #27272A | 7.93 pass |
| `action.onGhost` | `bg.canvas` | Ghost button on page | 4.5 | #0D696C / #FAFAFA | 6.18 pass | #7FCAC7 / #161616 | 9.63 pass |
| `action.onGhost` | `action.ghostHover` | Ghost button hover | 4.5 | #0D696C / #EFF8F8 | 5.98 pass | #7FCAC7 / #012C31 | 7.95 pass |
| `action.onGhost` | `action.ghostPressed` | Ghost button pressed | 4.5 | #0D696C / #D6EFEE | 5.36 pass | #7FCAC7 / #024249 | 5.95 pass |
| `action.onDanger` | `action.danger` | Danger button | 4.5 | #FFFFFF / #B91C1C | 6.47 pass | #161616 / #F87171 | 6.54 pass |
| `action.onDanger` | `action.dangerHover` | Danger button hover | 4.5 | #FFFFFF / #991B1B | 8.31 pass | #161616 / #FCA5A5 | 9.53 pass |
| `action.onDanger` | `action.dangerPressed` | Danger button pressed | 4.5 | #FFFFFF / #7F1D1D | 10.02 pass | #161616 / #EF4444 | 4.81 pass |
| `action.onAccent` | `action.accent` | Accent button (Premium Buy, Invite) | 4.5 | #161616 / #F48438 | 7.07 pass | #161616 / #F48438 | 7.07 pass |
| `action.onAccent` | `action.accentHover` | Accent button hover | 4.5 | #161616 / #F9A76E | 9.29 pass | #161616 / #F9A76E | 9.29 pass |
| `action.onAccent` | `action.accentPressed` | Accent button pressed | 4.5 | #161616 / #E56F1F | 5.71 pass | #161616 / #E56F1F | 5.71 pass |
| `action.onDisabled` | `action.disabled` | Disabled button (exempt, kept readable) | 4.5 | #6B6B74 / #F4F4F5 | 4.80 pass | #A1A1AA / #36363B | 4.69 pass |
| `feedback.successText` | `feedback.successBg` | Success banner/toast | 4.5 | #166534 / #F0FDF4 | 6.81 pass | #86EFAC / #052E16 | 10.62 pass |
| `feedback.warningText` | `feedback.warningBg` | Warning banner (e.g. 'Beware of scams') | 4.5 | #92400E / #FFFBEB | 6.84 pass | #FCD34D / #451A03 | 10.39 pass |
| `feedback.dangerText` | `feedback.dangerBg` | Error banner/toast | 4.5 | #991B1B / #FEF2F2 | 7.60 pass | #FCA5A5 / #450A0A | 8.51 pass |
| `feedback.infoText` | `feedback.infoBg` | Info banner/toast | 4.5 | #1E40AF / #EFF6FF | 8.01 pass | #93C5FD / #172554 | 8.15 pass |
| `feedback.successIcon` | `feedback.successBg` | Banner icon | 3 | #15803D / #F0FDF4 | 4.79 pass | #4ADE80 / #052E16 | 8.55 pass |
| `feedback.warningIcon` | `feedback.warningBg` | Banner icon | 3 | #B45309 / #FFFBEB | 4.84 pass | #FBBF24 / #451A03 | 8.97 pass |
| `feedback.dangerIcon` | `feedback.dangerBg` | Banner icon | 3 | #B91C1C / #FEF2F2 | 5.91 pass | #F87171 / #450A0A | 5.84 pass |
| `feedback.infoIcon` | `feedback.infoBg` | Banner icon | 3 | #1D4ED8 / #EFF6FF | 6.16 pass | #60A5FA / #172554 | 5.78 pass |
| `badge.neutralText` | `badge.neutralBg` | Badge neutral (draft, closed) | 4.5 | #3F3F46 / #F4F4F5 | 9.50 pass | #E4E4E7 / #36363B | 9.47 pass |
| `badge.brandText` | `badge.brandBg` | Badge brand (active, in progress) | 4.5 | #08565A / #D6EFEE | 7.01 pass | #AEDFDD / #012C31 | 10.24 pass |
| `badge.successText` | `badge.successBg` | Badge success (completed, published) | 4.5 | #166534 / #DCFCE7 | 6.49 pass | #86EFAC / #052E16 | 10.62 pass |
| `badge.warningText` | `badge.warningBg` | Badge warning (pending, HOLD) | 4.5 | #92400E / #FEF3C7 | 6.37 pass | #FCD34D / #451A03 | 10.39 pass |
| `badge.dangerText` | `badge.dangerBg` | Badge danger (cancelled, rejected) | 4.5 | #991B1B / #FEE2E2 | 6.80 pass | #FCA5A5 / #450A0A | 8.51 pass |
| `badge.infoText` | `badge.infoBg` | Badge info (delivered, new) | 4.5 | #1E40AF / #DBEAFE | 7.15 pass | #93C5FD / #172554 | 8.15 pass |
| `badge.featuredText` | `badge.featuredBg` | Featured/Top badge (Q-069) | 4.5 | #161616 / #F48438 | 7.07 pass | #161616 / #F48438 | 7.07 pass |
| `badge.premiumText` | `badge.premiumBg` | Premium pill | 4.5 | #8A3A0B / #FFE6D3 | 6.51 pass | #FDCBA6 / #3D1804 | 10.72 pass |
| `role.buyingText` | `role.buyingBg` | Buying dashboard badge/switcher | 4.5 | #1E40AF / #EFF6FF | 8.01 pass | #BFDBFE / #172554 | 10.34 pass |
| `role.sellingText` | `role.sellingBg` | Selling dashboard badge/switcher | 4.5 | #166534 / #F0FDF4 | 6.81 pass | #BBF7D0 / #052E16 | 12.30 pass |
| `chat.sentText` | `chat.sentBg` | Sent chat bubble | 4.5 | #FFFFFF / #0D696C | 6.45 pass | #FFFFFF / #08565A | 8.44 pass |
| `chat.receivedText` | `chat.receivedBg` | Received chat bubble | 4.5 | #1E1E21 / #F4F4F5 | 15.13 pass | #F4F4F5 / #36363B | 10.93 pass |
| `chat.systemText` | `chat.systemBg` | System event in thread | 4.5 | #92400E / #FFFBEB | 6.84 pass | #FCD34D / #451A03 | 10.39 pass |
| `border.strong` | `bg.surface` | Input/checkbox/radio boundary on card | 3 | #8A8A93 / #FFFFFF | 3.42 pass | #8A8A93 / #27272A | 4.35 pass |
| `border.strong` | `bg.canvas` | Input boundary on page | 3 | #8A8A93 / #FAFAFA | 3.28 pass | #8A8A93 / #161616 | 5.29 pass |
| `border.brand` | `bg.surface` | Focused/selected control border | 3 | #0D696C / #FFFFFF | 6.45 pass | #52B3B0 / #27272A | 5.98 pass |
| `border.danger` | `bg.surface` | Invalid input border | 3 | #B91C1C / #FFFFFF | 6.47 pass | #F87171 / #27272A | 5.38 pass |
| `action.primary` | `bg.surface` | Checked checkbox/radio/switch fill | 3 | #0D696C / #FFFFFF | 6.45 pass | #52B3B0 / #27272A | 5.98 pass |
| `focus.ring` | `bg.canvas` | Focus ring on page | 3 | #29807E / #FAFAFA | 4.49 pass | #7FCAC7 / #161616 | 9.63 pass |
| `focus.ring` | `bg.surface` | Focus ring on card | 3 | #29807E / #FFFFFF | 4.68 pass | #7FCAC7 / #27272A | 7.93 pass |
| `focus.ring` | `bg.subtle` | Focus ring on subtle | 3 | #29807E / #F4F4F5 | 4.26 pass | #7FCAC7 / #36363B | 6.39 pass |
| `rating.star` | `bg.surface` | Filled star on card | 3 | #D97706 / #FFFFFF | 3.19 pass | #FBBF24 / #27272A | 8.92 pass |
| `rating.star` | `bg.canvas` | Filled star on page | 3 | #D97706 / #FAFAFA | 3.05 pass | #FBBF24 / #161616 | 10.84 pass |
| `status.online` | `bg.surface` | Online dot | 3 | #16A34A / #FFFFFF | 3.30 pass | #22C55E / #27272A | 6.54 pass |
| `status.favourite` | `bg.surface` | Filled favourite heart | 3 | #E16A54 / #FFFFFF | 3.29 pass | #E16A54 / #27272A | 4.53 pass |
| `role.buyingAccent` | `bg.surface` | Buying active indicator | 3 | #1D4ED8 / #FFFFFF | 6.70 pass | #60A5FA / #27272A | 5.86 pass |
| `role.sellingAccent` | `bg.surface` | Selling active indicator | 3 | #15803D / #FFFFFF | 5.02 pass | #4ADE80 / #27272A | 8.55 pass |
| `action.onPrimary` | `gradient.action.primary` | Primary button gradient (3X) | 4.5 | #FFFFFF / worst #29807E | 4.68 pass | #161616 / worst #35A29F | 5.88 pass |
| `action.onPrimary` | `gradient.action.primaryHover` | Primary button hover gradient (3X) | 4.5 | #FFFFFF / worst #0D696C | 6.45 pass | #161616 / worst #52B3B0 | 7.27 pass |
| `action.onSecondary` | `gradient.action.secondary` | Secondary button gradient (3X) | 4.5 | #1E1E21 / worst #F4F4F5 | 15.13 pass | #F4F4F5 / worst #36363B | 10.93 pass |
| `action.onSecondary` | `gradient.action.secondaryHover` | Secondary button hover gradient (3X) | 4.5 | #1E1E21 / worst #EFF8F8 | 15.40 pass | #F4F4F5 / worst #3F3F46 | 9.50 pass |
| `action.onAccent` | `gradient.action.accent` | Accent button / Featured badge gradient (3X) | 4.5 | #161616 / worst #F48438 | 7.07 pass | #161616 / worst #F48438 | 7.07 pass |
| `action.onAccent` | `gradient.action.accentHover` | Accent button hover gradient (3X) | 4.5 | #161616 / worst #F9A76E | 9.29 pass | #161616 / worst #F9A76E | 9.29 pass |
| `action.onDanger` | `gradient.action.danger` | Danger button gradient (3X) | 4.5 | #FFFFFF / worst #DC2626 | 4.83 pass | #161616 / worst #EF4444 | 4.81 pass |
| `action.onDanger` | `gradient.action.dangerHover` | Danger button hover gradient (3X) | 4.5 | #FFFFFF / worst #B91C1C | 6.47 pass | #161616 / worst #F87171 | 6.54 pass |
| `action.onGhost` | `gradient.action.ghostHover` | Ghost button hover gradient (3X) | 4.5 | #0D696C / worst #D6EFEE | 5.36 pass | #7FCAC7 / worst #024249 | 5.95 pass |
| `text.primary` | `gradient.canvas` | Body on the gradient canvas (3X) | 4.5 | #1E1E21 / worst #E7EFF1 | 14.26 pass | #F4F4F5 / worst #1A2727 | 14.01 pass |
| `text.secondary` | `gradient.canvas` | Meta on the gradient canvas (3X) | 4.5 | #52525B / worst #E7EFF1 | 6.63 pass | #D4D4D8 / worst #1A2727 | 10.42 pass |
| `text.muted` | `gradient.canvas` | Muted on the gradient canvas (3X, the limiting pair) | 4.5 | #6B6B74 / worst #E7EFF1 | 4.53 pass | #A1A1AA / worst #1A2727 | 6.01 pass |
| `text.link` | `gradient.canvas` | Links on the gradient canvas (3X) | 4.5 | #0D696C / worst #E7EFF1 | 5.54 pass | #7FCAC7 / worst #1A2727 | 8.20 pass |
| `text.danger` | `gradient.canvas` | Field error on the gradient canvas (3X) | 4.5 | #B91C1C / worst #E7EFF1 | 5.55 pass | #FCA5A5 / worst #1A2727 | 8.12 pass |
| `text.primary` | `gradient.surface` | Body on gradient cards (3X) | 4.5 | #1E1E21 / worst #FCFCFD | 16.22 pass | #F4F4F5 / worst #2A2A2E | 13.00 pass |
| `text.secondary` | `gradient.surface` | Meta on gradient cards (3X) | 4.5 | #52525B / worst #FCFCFD | 7.54 pass | #D4D4D8 / worst #2A2A2E | 9.67 pass |
| `text.muted` | `gradient.surface` | Muted on gradient cards (3X) | 4.5 | #6B6B74 / worst #FCFCFD | 5.15 pass | #A1A1AA / worst #2A2A2E | 5.58 pass |
| `text.link` | `gradient.surface` | Links on gradient cards (3X) | 4.5 | #0D696C / worst #FCFCFD | 6.29 pass | #7FCAC7 / worst #2A2A2E | 7.61 pass |
| `text.muted` | `gradient.input` | Placeholder in gradient inputs (3X) | 4.5 | #6B6B74 / worst #FCFCFD | 5.15 pass | #A1A1AA / worst #2A2A2E | 5.58 pass |
| `text.secondary` | `gradient.track` | Role switcher label on its track (3X) | 4.5 | #52525B / worst #F4F4F5 | 7.03 pass | #D4D4D8 / worst #2E2E33 | 9.14 pass |
| `text.onHero` | `gradient.hero` | Hero text on the hero gradient incl. the violet glow (3X) | 4.5 | #FFFFFF / worst #29807E | 4.68 pass | #FFFFFF / worst #21507A | 8.42 pass |
| `focus.ring` | `gradient.canvas` | Focus ring on the gradient canvas (3X) | 3 | #29807E / worst #E7EFF1 | 4.02 pass | #7FCAC7 / worst #1A2727 | 8.20 pass |
| `focus.ring` | `gradient.surface` | Focus ring on gradient cards (3X) | 3 | #29807E / worst #FCFCFD | 4.57 pass | #7FCAC7 / worst #2A2A2E | 7.61 pass |
| `border.strong` | `gradient.input` | Input boundary on its own gradient (3X) | 3 | #8A8A93 / worst #FCFCFD | 3.34 pass | #8A8A93 / worst #2A2A2E | 4.18 pass |
| `bg.surface` | `gradient.indicator` | Tab indicator / rating bar on cards (3X; symmetric ratio) | 3 | #FFFFFF / worst #35A29F | 3.08 pass | #27272A / worst #35A29F | 4.84 pass |

| Category colour | Light: lowest text / lowest UI | Dark: lowest text / lowest UI |
|---|---|---|
| brand `brand` | 4.68 / 4.02 | 5.88 / 4.39 |
| violet `#7C3AED` | 4.56 / 4.89 | 4.54 / 3.02 |
| rose `#DB2777` | 4.51 / 3.94 | 4.52 / 3.07 |
| blue `#2563EB` | 4.54 / 4.43 | 4.52 / 3.02 |
| gold `#D99A00` | 4.56 / 3.01 | 4.56 / 5.51 |
| sky `#0EA5E9` | 4.62 / 3.07 | 4.51 / 4.87 |
| navy `#1E3A8A` | 8.17 / 8.89 | 4.50 / 3.02 |
| leaf `#4D9A1E` | 4.51 / 3.02 | 4.52 / 3.83 |
| fuchsia `#C026D3` | 4.60 / 4.04 | 4.53 / 3.05 |
| bronze `#8B5E34` | 4.55 / 4.81 | 4.54 / 3.04 |
| slate `#52606D` | 5.12 / 5.54 | 4.53 / 3.06 |
| olive `#A3A30D` | 4.61 / 3.03 | 4.59 / 5.02 |
| wine `#9F1239` | 6.22 / 6.88 | 4.57 / 3.07 |
Legacy vs new, key pairs:
| Pair | Legacy | New |
|---|---|---|
| White on primary button | 3.08 (`#35A29F`) | 6.45 (`#0D696C`) light; dark mode `#161616` on `#52B3B0` 7.27 |
| Links on page | 2.95 (`#35A29F` on `#FAFAFA`) | 6.18 |
| Premium / Invite CTA | 2.12 (white on `#2EBFF6`) | 7.07 (`#161616` on `#F48438`) |
| Footer links / muted | 2.54 (`gray-400`) | 5.28 on white, 5.05 on canvas, 4.80 on subtle (dark: 5.81 / 7.06 / 4.69) |
| Status pills | 1.61–2.53 | 6.37–7.15 (light), 8.15–10.62 (dark) |
| "Needs subscription" pill | 2.86 | 6.51 |
| Rating stars (non-text) | 2.15 | 3.19 on white |
| Focus ring on page | 2.95 (`#35A29F`) | 4.49 (`#29807E`) |

---

## 9. Usage rules (for web-engineer and mobile-engineer)
1. **Only role tokens in components.** `theme.*` roles (CSS `--mt-bg-*`, `--mt-text-*`, `--mt-action-*` …; RN `theme.colors.*`). Primitive colours (`--mt-color-*`) are for `packages/ui` internals only when no role fits, and that is a signal to ask the designer for a role.
2. **No hard-coded values** in apps: no hex, no px font sizes, no ad-hoc shadows or z-indexes. Lint rule in Phase 3: forbid hex literals and Tailwind default palette classes in `apps/*`.
3. **Text on colour:** use the paired `on*` token (`action.onPrimary`, `badge.successText`, …). Never put white text on `brand.500`, `orange.*`, `coral.*`, `amber.*`, `green.500/600`.
4. **`brand.500` #35A29F** is an accent: fills of illustrations, large icons (≥ 24 px), selected chip borders, decorative lines. Not links, not button fills with text.
5. **Orange = promotion**, never an error or warning. Warnings use `feedback.warning*` (amber).
6. **Dark mode** is automatic when components use role tokens. Images and category artwork are not inverted. Dark cards keep a `border.default` hairline because shadows are faint.
7. **Typography:** use `text.*` styles, not raw sizes. Never `text-transform: uppercase`, never `truncate` on labels, clamp titles by lines, prices with tabular numerals.
8. **Touch:** every interactive element has a ≥ 44×44 hit area. Small visuals (checkbox, heart, close ×) get padding or an invisible hit area; spacing between adjacent targets ≥ 8.
9. **Focus:** every interactive element shows the focus ring on `:focus-visible`. Custom components must not suppress it.
10. **Motion:** use the duration/easing/distance/scale tokens through their CSS variables (so reduced motion works without extra code); no bounce, shake, rotate or parallax; only `transform`, `opacity`, `filter` and `box-shadow` animate (§6.8).
11. **Icons** inherit `currentColor` from the text role; icon-only buttons need an accessible name (see components.md).
12. **Money** (`₾`) always through the `Price` component (components.md), tabular numerals, amounts from the API in tetri.
13. **Category colours:** only through `@mytask/tokens/color` (`categoryStyle` on a `.mt-cat` element on the web, `categoryTheme` on native), reading the colour exactly where ADR-023 §3 says it is sent. Never walk the category tree, never store or send derived shades, never hard-code a category hex. `null` = brand. Long text never sits on a category gradient (visual-refresh §8.5).
14. **Glow and gradients are for responding or current elements** (hover, focus, open, selected); static content gets none. Form controls keep `border.strong` (≥ 3:1) at rest: `border.action.*` are button edges only.
