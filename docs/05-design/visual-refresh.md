# Visual refresh — visual language (Phase 3X)
Status: **approved** by the Owner 2026-10-06 (ROADMAP 3X.4, no changes; written by ui-ux-designer in 3X.2). The §13 look decisions were answered by the Owner on 2026-10-06 (Q-174…Q-178, all yes). The Owner approves the look as a whole in 3X.4 from the 3X.3 preview `docs/05-design/preview/refresh.html`.
Brief: `docs/02-specs/3x-visual-refresh.md` (R-1…R-4, AC-1…AC-16; Owner answers Q-169…Q-173).
Builds on: `tokens.md` (tokens stay the base; this document only **adds**), `components.md` (component behaviour unchanged), `audit.md`.
Evidence scripts (run with `node`, no dependencies):
- `docs/05-design/refresh/derive-category-color.mjs`: the prototype of the category colour function (spec R-1.4). 3X.6 ports it to `packages/tokens`.
- `docs/05-design/refresh/check-category-colors.mjs`: starter palette distances, plus a stress test over 4,096 colours × 2 modes. Result: **0 failures**.
- `docs/05-design/refresh/check-ui-contrast.mjs`: buttons, page canvas, hero and focus ring, light + dark. Result: **0 failures**.

---

## 0. What changes and what does not
**Changes:** colour, gradients, borders, shadows/glow, motion, corner radius (minor, see §3) and the spacing *inside* components.
**Does not change** (spec "Must not change"): what is on each page, its order and placement, texts, URLs, breakpoints, `aria-*`, focus order, and **class names**. E2E tests and the apps use the current classes, so new looks are layered onto those exact selectors. New helper classes and CSS variables may be **added**.

Design idea in one line: **"teal, lit from within."** The brand teal stays the anchor. Surfaces get soft gradients and a fine border so they read as objects. Interactive things (buttons, pills, cards) get a defined edge, an inner gradient and a gentle glow when they respond. Each category direction adds its own colour on top.

## 1. Principles
1. **Calm base, lively edges.** Large areas (canvas, cards) use very low-contrast gradients. Saturation and glow appear only on interactive elements and category accents. This keeps the page readable and lets the actions stand out.
2. **Every action looks pressable.** Buttons, pills and icon buttons always have a border, an inner gradient and a top highlight. Text links stay plain links (navigate ≠ act, components.md §4).
3. **Contrast is computed, never eyeballed.** Text meets ≥ 4.5:1 against **both ends** of every gradient it sits on; borders and indicators meet ≥ 3:1. The scripts above prove it.
4. **Motion explains, never decorates.** Every animation answers "what did I touch / what appeared / where did it go". The bounds are in §7.
5. **Dark mode is designed, not inverted** (Q-173). It has its own canvas glow, lower-chroma category colours and stronger glows (light on dark reads as glow, not shadow).

## 2. The current look (why it feels plain)
Read from `packages/ui/src/web/*.css` and the app stylesheets:
- **Canvas.** Flat `--mt-bg-canvas` (`neutral.50` / `neutral.950`) on `body` (`apps/web/src/styles/globals.css`).
- **Category bar.** `.mt-category-bar-item` (`site.css:278`) is grey text with a 2 px underline on hover. There is no box, no colour and no state beyond the underline. This is what the Owner flagged.
- **Buttons.** Flat fills: `.mt-button` / `-primary` / `-danger` (`dashboard.css:588-635`). Copies with their own rules: `.auth-button`, `.auth-social-button`, `.auth-link-button` (web `auth.css`, admin `auth.css`), `.mt-pf-submit`, `.mt-pf-link-button`, `.mt-link-button`, `.mt-icon-button`, `.mt-menu-button`, `.mt-info-button`. Hover only changes the fill colour. There is no pressed state and no motion.
- **Cards.** `.mt-gig-card`, `.mt-freelancer-card`, `.mt-portfolio-card`, `.mt-pf-card`, `.mt-profile-card`, `.mt-edit-card`, `.mt-stat-tile`, `.mt-panel`, `.auth-card`, `.admin-card`: flat white plus `elevation-sm`. The only hover effect is the shadow step on `.mt-gig-card`.
- **Chips/pills/tabs.** `.mt-chip`, `.mt-pill-*`, `.mt-role-switcher(-item)`, `.admin-tabs`, `.mt-explore-chips`: flat tints, with no transition.
- **Motion.** Almost none. The tokens exist (`motion.*`) but are barely used.

**One button look for every button class.** The new button styles are written once in `packages/ui/src/web/form.css`. Selector lists cover every existing button class (§4.4), so the apps stop carrying their own copies. Classes are not renamed.

## 3. Surfaces and background (R-3, Q-173)

### 3.1 Page canvas
The canvas is painted on a fixed layer behind the page (`body::before`, `position: fixed; inset: 0; z-index: -1; pointer-events: none`). It does not repaint on scroll; `background-attachment: fixed` is avoided because it is slow on phones. `body` keeps `--mt-bg-canvas` as the fallback colour.

| | Light | Dark |
|---|---|---|
| Base | `linear-gradient(180deg, #F3F8F8 0%, #FAFAFA 35%, #F4F5F7 100%)` | `linear-gradient(180deg, #111214 0%, #161616 40%, #131416 100%)` |
| Glow 1 (top-left, brand) | `radial-gradient(1100px 620px at 8% -8%, rgb(53 162 159 / 0.10), transparent 62%)` | `radial-gradient(1100px 620px at 8% -8%, rgb(53 162 159 / 0.12), transparent 62%)` |
| Glow 2 (top-right, violet) | `radial-gradient(900px 520px at 100% 0%, rgb(124 58 237 / 0.05), transparent 60%)` | `radial-gradient(900px 520px at 100% 0%, rgb(124 58 237 / 0.08), transparent 60%)` |
| Worst-case points checked | `#FAFAFA`, `#F3F8F8`, `#F5F3FA`, `#F4F5F7` | `#161616`, `#14201F`, `#1B1825`, `#111214` |
| Contrast (lowest) | text.primary 15.1 · secondary 7.0 · **muted 4.79** · link 5.86 | primary 15.2 · **muted 6.52** · link 8.90 |

Rule: nothing may be added to the canvas that makes a point darker (light) or lighter (dark) than the checked points. `text.muted` on light is the limiting pair.

### 3.2 Cards and panels
Content surfaces stay **near-solid** so long text reads well. All card classes (§2) get:
- **Light:** `background: linear-gradient(180deg, #FFFFFF 0%, #FCFCFD 100%)`; border `1px solid neutral.200`; `box-shadow: elevation.sm, inset 0 1px 0 rgb(255 255 255 / 0.9)`.
- **Dark:** `background: linear-gradient(180deg, #2A2A2E 0%, #27272A 100%)`; border `1px solid neutral.700`; `box-shadow: elevation.sm(dark), inset 0 1px 0 rgb(255 255 255 / 0.04)`.
- **Radius:** cards `radius.card` 12 → **`radius.xl` 16**. Controls stay 8. Pills stay full. This is softer and more current; positions and sizes do not change.
- **Interactive cards** (gig, freelancer, portfolio, category tile, stat tile when it is a link) also get the hover state of §6.

### 3.3 Header
- **Default:** a translucent surface, `rgb(255 255 255 / 0.82)` / dark `rgb(39 39 42 / 0.78)` with `backdrop-filter: saturate(1.4) blur(12px)`. Where `backdrop-filter` is unsupported, it falls back to the solid surface. A hairline bottom border uses `border.subtle`.
- **Over the home hero** (`data-over-hero`, 4.2.20): stays transparent as today. On scroll it fades (`motion.base`) to the translucent surface.

### 3.4 Hero and large brand areas
- **Light:** `linear-gradient(135deg, #29807E 0%, #0D696C 55%, #08565A 100%)` + `radial-gradient(circle at 85% 15%, rgb(124 58 237 / 0.28), transparent 55%)`.
- **Dark:** `linear-gradient(135deg, #08565A 0%, #024249 55%, #012C31 100%)` + the same violet radial at 0.22.
- **White text:** lowest 4.68 (light), 8.44 (dark). Checked including the violet-tinted worst point `#3B3E8F` / `#26285E`.
- **Drift** (R-3.2, optional, the only looping background): the radial layer moves between `85% 15%` and `70% 30%` over 18 s, `ease-in-out`, alternate. It is off under reduced motion.

## 4. Buttons (R-2)

### 4.1 Anatomy (every variant)
- **Border:** `1px solid` with the variant's border colour, always visible (crisp edge, R-2.1).
- **Fill:** `linear-gradient(180deg, <top> 0%, <bottom> 100%)`.
- **Highlight:** `inset 0 1px 0 rgb(255 255 255 / <a>)` (light a = 0.22 on filled, 0.9 on secondary; dark a = 0.12 / 0.06). This gives the "lit edge".
- **Shadow at rest:** `0 1px 2px rgb(22 22 22 / 0.08)` (light), `0 1px 2px rgb(0 0 0 / 0.4)` (dark).
- **Size, padding, font and radius:** unchanged (md 44 px, `radius.control`).
- **Hover technique:** the hover gradient is an `::before` layer whose `opacity` animates (gradients cannot transition). The label sits above it (`position: relative; z-index: 1`).

### 4.2 Variants (all contrast pairs checked, lowest value shown)
| Variant | Light: fill top → bottom / border / text | Dark: fill / border / text | Lowest text contrast L / D |
|---|---|---|---|
| **Primary** | brand.600 → brand.700 / brand.800 / white | brand.400 → brand.500 / brand.300 / neutral.950 | 4.68 / 5.88 |
| Primary hover | brand.700 → brand.800 + glow brand | brand.300 → brand.400 + glow brand | 6.45 / ≥ 5.88 |
| **Secondary** | white → neutral.100 / neutral.300 (hover brand.400) / neutral.900 | neutral.750 → neutral.800 / neutral.600 (hover brand.400) / neutral.100 | 15.1 / 10.9 |
| **Accent** (promo only, Q-078) | orange.300 → orange.400 / orange.600 / neutral.950 | same / orange.500 / neutral.950 | 7.07 / 7.07 |
| **Danger** | red.600 → red.700 / red.800 / white | red.400 → red.500 / red.300 / neutral.950 | 4.83 / 4.81 |
| **Ghost** (tertiary) | transparent / `border.subtle` / brand.700; hover fill brand.50 → brand.100 | transparent / neutral.750 / brand.300; hover brand.950 | as today |
| **Icon button** | as Secondary, round (`radius.full`) or square 8 | as Secondary | — |
| **Social** (`.auth-social-button`) | as Secondary; provider icon keeps its brand colour | as Secondary | — |

The Ghost border is subtle on purpose. It is the "quiet" button (Cancel, Load more, See more) and must still look like a button (R-2.1), but less prominent than Secondary.

### 4.3 States
| State | Visual | Motion |
|---|---|---|
| Hover | hover gradient (`::before` opacity 0 → 1), border one step stronger, glow (§5), `translateY(-1px)` | `motion.fast` 120 ms, `standard` |
| Pressed (`:active`) | bottom gradient only, `inset 0 2px 4px rgb(0 0 0 / 0.18)`, no glow, `translateY(0) scale(0.98)` | 80 ms in, 120 ms out |
| Focus-visible | **existing** 2 px focus ring (≥ 3:1, kept for WCAG) **plus** glow brand outside it | `motion.fast` |
| Disabled | flat `action.disabled` fill, `border.default`, `text.disabled`, no highlight/glow/motion, `cursor: not-allowed` | — |
| Loading | label kept (width stable), spinner left, fill slightly dimmed (`opacity` 0.85), not pressable | spinner rotate 800 ms linear (allowed: it is progress, not decoration; stops under reduced motion and becomes a static "…") |
| Success (after save) | one-time glow of `feedback.success` + check icon fade | 400 ms, once |

### 4.4 Class map (no renames)
| Look | Existing selectors that get it |
|---|---|
| Primary | `.mt-button-primary`, `.auth-button`, `.mt-pf-submit`, the `Submit` component from `@mytask/ui/web` (`form.tsx`) |
| Secondary | `.mt-button`, `.auth-social-button`, `.mt-menu-button` (when it is a button-look trigger), `.mt-carousel-buttons button` |
| Danger | `.mt-button-danger` |
| Ghost | `.mt-link-button`, `.mt-pf-link-button`, `.auth-link-button` **only where it is a button**; real text links stay links |
| Icon | `.mt-icon-button`, `.mt-info-button`, `.mt-dialog-close` |
| Accent | reserved for Premium/invite (later slices) |

3X.9 checks each use: a class that sometimes wraps a plain link keeps the link look there (e.g. `.auth-link-button` in the legacy link list under login/register).

## 5. Glow
A glow is a soft coloured light around an element that is responding (hover, focus, open, selected) or that is the current item. It never appears on static content.

| Token (CSS var) | Light | Dark |
|---|---|---|
| `glow.brand` | `0 0 0 4px rgb(53 162 159 / 0.18), 0 8px 24px -8px rgb(13 105 108 / 0.45)` | `0 0 0 4px rgb(82 179 176 / 0.22), 0 8px 26px -8px rgb(82 179 176 / 0.38)` |
| `glow.accent` | `0 0 0 4px rgb(244 132 56 / 0.20), 0 8px 24px -8px rgb(229 111 31 / 0.45)` | same, alpha +0.05 |
| `glow.danger` | `0 0 0 4px rgb(220 38 38 / 0.16), 0 8px 24px -8px rgb(185 28 28 / 0.40)` | `rgb(248 113 113 / 0.22)` / `0.35` |
| `glow.success` | `0 0 0 4px rgb(22 163 74 / 0.18)` | `rgb(74 222 128 / 0.22)` |
| `glow.category` | `0 0 0 3px <cat.glow>, 0 8px 22px -8px <cat.solid>` | same with the dark `cat.*` values |

## 6. Other components (R-2.3)

### 6.1 Cards: hover (pointer devices only, `@media (hover: hover)`)
- **Lift:** `translateY(-3px)`, `motion.base` 200 ms `standard`.
- **Shadow:** `elevation.sm` → `elevation.md`, plus `glow.brand` at half strength. Category-coloured cards use `glow.category`.
- **Border:** → `brand.200` (light) / `brand.800` (dark), or `cat.indicator` at 40 % on category cards.
- **Image** (gig, portfolio, category tile): `scale(1.03)` inside the frame (`overflow: hidden` exists), `motion.slow` 300 ms `enter`.
- **Featured gig** (`.mt-gig-card-featured`): keeps the orange 2 px frame (spec 03 AC-18). The "Featured" badge becomes an Accent pill (orange.300 → orange.400, dark text) and the card hover uses `glow.accent`.
- **Pressed** (touch and mouse): `scale(0.99)` for 80 ms.

### 6.2 Chips, pills, tabs
- **`.mt-chip` (skills, filters):**
  - default: border `neutral.200`, fill white → `neutral.50`;
  - hover: border `brand.400`, `glow.brand` at half strength, lift −1 px;
  - selected/active: brand tint `brand.50` → `brand.100`, border `brand.600`, text `brand.800`;
  - on a category page, the category tint/ink replaces brand (§8.5).
- **`.mt-pill-*` (status):** each status keeps its colour. A soft vertical gradient of its own tint and a 1 px border one step darker are added. There is no motion (status is not interactive).
- **`.mt-role-switcher` (Buying/Selling):**
  - track: `neutral.100` → `neutral.50`, inset shadow;
  - selected item: a **sliding thumb** with the Primary button gradient + highlight;
  - motion: the thumb moves with `transform` `motion.base` `emphasized`;
  - text colours swap with `motion.fast`.
- **`.admin-tabs` / other tabs:** the active tab gets a 3 px gradient indicator (brand.500 → brand.700) that slides between tabs (`transform`), and the tab text turns `text.brand`.

### 6.3 Form controls (`form.css`, shared by web + admin)
- **Input/select/textarea:** border `neutral.300`, background `#FFFFFF` → `#FCFCFD`, inner top shadow `inset 0 1px 2px rgb(22 22 22 / 0.04)`.
  - hover: border `neutral.450`;
  - focus: border `brand.600` + `glow.brand` + the existing focus ring;
  - invalid: border `red.700` + `glow.danger` at half strength.
- **Switch:**
  - track: off = `neutral.300` → `neutral.200`; on = the Primary gradient;
  - thumb: white with `elevation.sm`;
  - thumb slide: `motion.fast` `emphasized`.
- **Checkbox/radio:** when checked, filled with the Primary gradient. The check mark draws in (`stroke-dashoffset`, 200 ms) and is just shown under reduced motion.

### 6.4 Overlays and feedback
- **Menus / account menu / mega-menu panel / select popover:** translucent raised surface (as the header, §3.3) with `elevation.lg`.
  - open: `opacity 0 → 1` + `translateY(-6px) → 0` + `scale(0.98) → 1` (origin top), `motion.base` 200 ms `enter`;
  - close: `motion.fast` 120 ms `exit`.
- **Dialog (`.mt-dialog`):** scrim fades in (`motion.base`); the panel does `opacity` + `translateY(12px) → 0` + `scale(0.98) → 1`, `motion.slow` 300 ms `emphasized`. A 4 px brand gradient strip sits on top of the panel (`.mt-dialog-head::before`).
- **Drawer (phone menu):** slides with `translateX`, `motion.slow` `emphasized`; the scrim fades.
- **Alerts (`.auth-alert-*`):** a soft gradient of their feedback tint, a 4 px left bar in the feedback colour, and a fade + 4 px slide in when they appear.
- **Toasts:** enter `translateY(8px)` + fade (`motion.base`), exit fade (`motion.fast`).
- **Skeleton (`.mt-skeleton*`):** the shimmer becomes a moving highlight gradient (`skeleton` → `skeletonHighlight` → `skeleton`, 1200 ms linear infinite). Under reduced motion it is static.
- **Empty states (`.mt-empty`):** the icon sits in a 64 px circle with the brand tint gradient and a soft `glow.brand` ring (static).

## 7. Motion catalogue (R-4, Q-172 "elegant, moderate")

**Bounds** (spec R-4.1):
- duration 80–400 ms;
- lift ≤ 4 px (cards use 3, buttons 1);
- scale between 0.98 and 1.03 (image zoom 1.03 replaces the 1.02 cap in `tokens.md`);
- no bounce, overshoot, shake, rotate or parallax;
- only `transform`, `opacity`, `filter` and `box-shadow` animate (box-shadow only on hover/focus of small elements; cards animate a pre-rendered shadow layer's `opacity` instead).

| # | Interaction | Where | What moves | Duration / easing | Reduced motion |
|---|---|---|---|---|---|
| M-1 | Button hover | all buttons | gradient layer opacity, glow, −1 px | 120 `standard` | colour/glow fade only, no lift |
| M-2 | Button press | all buttons | scale 0.98, inset shadow | 80 in / 120 out | no scale |
| M-3 | Card hover | gig, freelancer, portfolio, category tile, link stat tile | −3 px, shadow layer, border | 200 `standard` | shadow/border fade only |
| M-4 | Image zoom | card media | scale 1.03 in frame | 300 `enter` | none |
| M-5 | Category pill hover/open | category bar | gradient layer opacity, glow, −1 px | 120 `standard` | fade only |
| M-6 | Menu / mega-menu open-close | header | opacity, −6 px, 0.98 → 1 | 200 `enter` / 120 `exit` | opacity 120 |
| M-7 | Dialog in/out | all dialogs | opacity, 12 px, 0.98 → 1 | 300 `emphasized` / 200 `exit` | opacity 120 |
| M-8 | Drawer / bottom sheet | phone menu, app sheets | translate | 300 `emphasized` | opacity 120 |
| M-9 | Switcher thumb / tab indicator | role switcher, tabs | translateX | 200 `emphasized` | jump |
| M-10 | First-view entrance | home rows, result grids, dashboard tiles | opacity, 8 px up, **stagger 40 ms, max 8 items** (later items have no delay) | 300 `enter` | none (content shown at once) |
| M-11 | Header over hero → on scroll | home | background/blur fade | 200 `standard` | opacity 120 |
| M-12 | Hero drift | home hero only | background-position | 18 s alternate | **off** |
| M-13 | Skeleton shimmer | loading states | gradient position | 1200 linear ∞ | **static** |
| M-14 | Save success | Submit buttons, edit blocks | glow success + check fade | 400 once | fade 120 |
| M-15 | Alert / toast in | forms, global | opacity, 4–8 px | 200 `enter` | opacity 120 |
| M-16 | Switch thumb / check mark | form controls | translate / stroke | 120–200 | jump |
| M-17 | Nav link underline | header links, footer links (not body text) | `scaleX` 0 → 1 from the start edge | 200 `standard` | colour only |
| M-18 | Carousel arrows | home rows | button M-1/M-2; scroll `smooth` | browser | `scroll-behavior: auto` |

**Entrance rule (M-10).**
- **Server-rendered content is never hidden by CSS alone.** A tiny script adds `data-motion="ready"` to `<html>`; only then are not-yet-seen items set to `opacity: 0`, and an `IntersectionObserver` reveals each once. Without JS, or with reduced motion, nothing is hidden.
- **Nonce.** The script carries the CSP nonce, as the theme script does (4.1.20d).
- **Layout.** Entrance never changes layout; the space is reserved.

**Reduced motion implementation (one place).**
- **Variables.** Motion values become CSS variables (`--mt-motion-lift-card: -3px`, `--mt-motion-lift-control: -1px`, `--mt-motion-scale-hover: 1.03`, `--mt-motion-scale-pressed: 0.98`, `--mt-motion-distance-enter: 8px`, `--mt-motion-stagger: 40ms`). `@media (prefers-reduced-motion: reduce)` sets the lifts and distances to `0`, the scales to `1`, the stagger to `0ms`, and caps every duration at `motion.fast`.
- **Loops.** Animations M-12 and M-13 are switched off there.
- **This changes the `tokens.md` rule** "durations → 0": colour and opacity fades of ≤ 120 ms stay, because they help orientation and do not trigger vestibular issues (WCAG 2.3.3 targets motion, not fades).

## 8. Category colours (R-1, Q-169…Q-171)

### 8.1 Starter palette (R-1.5)
Assigned by the migration in the current `position` order (seed order shown; the real order is whatever the database holds at migration time, see `apps/api/prisma/seed-catalog.json`). Spares are offered first to new top-level categories and are shown as swatches in the admin picker.

| # | Category (seed slug) | Colour | Idea | Text on solid (light) |
|---|---|---|---|---|
| 1 | Graphics & Design (`graphics-design`) | `#7C3AED` violet | creativity | white |
| 2 | Music & Audio (`music-audio`) | `#DB2777` rose | energy, sound | white |
| 3 | Programming & Tech (`programming-tech`) | `#2563EB` blue | tech, trust | white |
| 4 | Digital Marketing (`digital-marketing`) | `#D99A00` gold | attention, growth | dark |
| 5 | Video & Animation (`video-animation`) | `#0EA5E9` sky | screen light | dark |
| 6 | Business (`business`) | `#1E3A8A` navy | solidity | white |
| 7 | Photography (`photography`) | `#4D9A1E` leaf green | nature, light | dark |
| S1 | spare | `#C026D3` fuchsia | | white |
| S2 | spare | `#8B5E34` bronze | | white |
| S3 | spare | `#52606D` slate | | white |
| S4 | spare | `#A3A30D` olive | | dark |
| S5 | spare | `#9F1239` wine | | white |

Distances (OKLab ΔE, `check-category-colors.mjs`):
- the 7 starter colours are ≥ **0.124** apart; all 12 are ≥ 0.086 apart;
- each starter colour is ≥ 0.077 from the reserved colours (brand teal 600/700, Featured orange, error red, success green).

### 8.2 The derivation function (R-1.4): `deriveCategoryColor(hex)`
**Input:** the stored base `#RRGGBB`.
**Output:** two sets (`light`, `dark`), each with:

| Output | CSS var | Use | Guarantee |
|---|---|---|---|
| `solid` | `--mt-cat-solid` | filled pill, tile label band, active bar item | `onSolid` on it ≥ 4.5 |
| `onSolid` | `--mt-cat-on-solid` | text/icon on `solid` and on the gradient | white `#FFFFFF` or `neutral.950` `#161616`, whichever is higher |
| `gradientStart`, `gradientEnd` | `--mt-cat-gradient-start/-end` | category gradients (`135deg`) | `onSolid` ≥ 4.5 on **both** |
| `tint` | `--mt-cat-tint` | soft background (pill at rest, chips, page header band) | — |
| `tintStrong` | `--mt-cat-tint-strong` | tint hover, pill border at rest | — |
| `ink` | `--mt-cat-ink` | category-coloured text on surface, canvas, `tint` or `tintStrong` (the resting category pill is a tint → tintStrong gradient) | ≥ 4.5 on all four |
| `indicator` | `--mt-cat-indicator` | dot, accent bar, borders, underline | ≥ 3 on surface + canvas |
| `glow` | `--mt-cat-glow` | `glow.category` | — (alpha 0.35 light / 0.45 dark) |

**Method** (all in OKLCH, sRGB gamut-mapped by lowering chroma; the prototype is the reference):
1. **Base.** Convert the base to OKLCH (L, C, H). In **dark** mode, first clamp L into [0.50, 0.78] and use C × 0.9 (calmer on dark, Q-173).
2. **Text on solid.** `onSolid` = white or `#161616`, whichever has more contrast with the base. Then move L (darker for white text, lighter for dark text) in 0.005 steps until `onSolid` reaches ≥ 4.5 on the solid **and** on both gradient ends.
3. **Gradient ends.** `gradientStart` = (L + 0.05, C, H − 10°); `gradientEnd` = (L − 0.05, C, H + 10°). The small hue turn makes the gradient feel alive instead of flat.
4. **Tints.**
   - `tint`: light (0.965, min(C, 0.035), H); dark (0.30, min(C, 0.06), H).
   - `tintStrong`: light (0.92, min(C, 0.07), H); dark (0.36, min(C, 0.08), H).
5. **Ink.** Start at the base L (light: at most 0.60; dark: at least 0.70) and move darker (light) or lighter (dark) until ≥ 4.5 on surface, canvas, `tint` and `tintStrong`. (`tintStrong` added in 3X.3: the preview's rendered-contrast check found the resting pill text at 3.8–4.5 on the gradient's darker end.)
6. **Indicator.** Start at the base L and move until ≥ 3 on surface and canvas.

**Proof.** The stress test runs every colour of a 16-step RGB grid (4,096 colours, including white, black, greys and pure hues) in both modes: **0 failures**. This is spec AC-5. 3X.6 turns it into a unit test of the ported function.

**One function for every client.** `packages/tokens` exports it for web, admin and mobile. Nothing derived is stored or sent by the API (spec "Data and API").

### 8.3 Applying it on the web
- **No per-category CSS files.** Server components call `categoryStyle(hex)`, which returns an inline `style` with **both** sets: `--mt-cat-l-solid…` and `--mt-cat-d-solid…`.
- **One stylesheet rule** maps them by theme: `[data-theme='light'] .mt-cat, …` → `--mt-cat-solid: var(--mt-cat-l-solid)`, and the same for dark. This includes `system`, resolved by the existing theme script.
- **The site CSP already allows inline styles** (`apps/web/src/lib/csp.ts:62`). The value is only ever a validated `#RRGGBB` from the API.
- **Fallback.** An element without a category colour falls back to the brand values (`--mt-cat-*` defaults = brand teal), so R-1.2 "unlinked project category → brand teal" needs no special case.

### 8.4 Header category bar and mega-menu (the Owner's example)
`.mt-category-bar-item` (one per top-level category):
- **At rest:**
  - a pill (`radius.full`) with fill `tint` → `tintStrong` (`180deg`) and a 1 px `tintStrong` border;
  - text `ink`, at `font-weight` semibold;
  - an **8 px dot** in `indicator` before the name.
  - Height and touch target are unchanged (`min-height: touch-target-min`; the pill is drawn inside with `padding-block`). A `gap: space-2` is added between items.
- **Hover / `aria-expanded='true'`:** fill = `gradientStart` → `gradientEnd` (`::before` opacity), text and dot = `onSolid`, `glow.category`, −1 px (M-5). The old 2 px underline is removed.
- **Current category** (on its pages): the same filled look without the lift, plus `aria-current` where it already exists. It does not add new ARIA.
- **Over the home hero:** pills become `rgb(0 0 0 / 0.14)` fill + `rgb(255 255 255 / 0.30)` border + white text; the dot keeps `indicator`. The fill **darkens** the hero, so white stays ≥ 4.68; a white-alpha fill would drop below 4.5. Hover shows the full category gradient.
- **Mega-menu panel:**
  - a 3 px top strip in the category gradient;
  - the column headings in `ink`;
  - sub-category links get a `tint` background on hover/focus, with `ink` text and `motion.fast`;
  - open/close is M-6.
- **Fit check (3X.10):** the 7 seeded names with the added gap must still fit at 1024 px in Georgian, the longest language. If not, the gap drops to `space-1` before anything else changes.
- **Phone drawer / accordion:** each top-level row gets the dot and a 3 px `indicator` start-edge bar when expanded. Sub-rows hover with `tint`.

### 8.5 Everywhere else (R-1.6)
| Place | Treatment |
|---|---|
| Home featured category tile (`.mt-category-tile`) | Image as today. The label sits on a **solid band** (`gradientStart` → `gradientEnd`) with `onSolid` text, so contrast never depends on the photo. This replaces the black image gradient for the label. Hover M-3/M-4 with `glow.category`. |
| Home category rows | The row heading gets the dot + a 4 px `indicator` → `gradientEnd` accent bar on its start edge. The heading text stays `text.primary`. "See more" = Ghost button in `ink` with a `tintStrong` border. |
| Category page (levels 1–3) | A header band (full container width, `radius.xl`) in the category gradient with the title in `onSolid`. The description and SEO text stay on the normal surface below (long text never on a gradient). Breadcrumb items = small `tint` chips with `ink` text. Active filter chips use `tint`/`ink`. |
| Search, sellers, hire | No single category → brand values (`--mt-cat-*` defaults). |
| Explore projects chips | Each chip = its linked top-level category's `tint`/`ink`/dot (Q-171); selected = filled `solid`. |
| Gig card | Unchanged (spec "Out of scope": gigs get no colour). |
| Mobile | Same rules with the native theme (§10). |
| Admin | §9. |

**Similar-colour threshold (R-1.3):**
- **Exact duplicate:** refused.
- **Very similar:** a warning (save allowed) when OKLab **ΔE < 0.08** to another top-level category. The 0.08 is chosen so the starter palette never triggers it (lowest pair 0.086).
- **Close to a reserved colour:** an extra warning when **ΔE < 0.06** to brand teal 600/700, error red, success green or Featured orange ("may be confused with …"). Also a warning only, never a refusal; the Owner's free choice (Q-169) wins. It adds one i18n key (see §11).

## 9. Admin: category colour picker (R-1.8, 3X.15)
Shown only on the **top-level** category form, in the existing form order, after "Show on home" (no other field moves). It contains:
1. A native colour input (`<input type="color">`) and, beside it, a **hex field** (`#RRGGBB`, upper-cased on blur, pattern-checked before saving). The two stay in sync.
2. **Starter swatches** (§8.1, 12). A swatch already used by another top-level category is shown crossed through with "Used by {category}" as its accessible name and tooltip, and cannot be chosen.
3. A **live preview**, side by side in light and dark: the header pill at rest and on hover, a tile label band, and a breadcrumb chip with the real category name. The preview uses the same `deriveCategoryColor`.
4. **Messages** under the field (live, `aria-live="polite"`):
   - duplicate → error;
   - similar → warning;
   - reserved → warning.

   The server repeats the duplicate check (spec EC-2).

On sub-category and project category forms: a read-only line "Colour inherited from {top-level category}" with the dot (no picker). The category tree list shows each top-level row's dot. Project category rows show the inherited dot.

## 10. Mobile (3X.16, 3X.17)
- **Same tokens and the same function** from `packages/tokens` (the native build).
- **Gradients.** 3X.16 checks whether React Native's own `experimental_backgroundImage` (linear-gradient) and `boxShadow` are stable in the Expo SDK 57 new architecture. If they are, use them (no new dependency). If not, add `expo-linear-gradient` (pinned) for gradients and use coloured `shadowColor` for glow on iOS. On Android, glow becomes elevation + a 1 px coloured border.
- **Motion with Reanimated 4.5.1** (installed): press = `withTiming` scale 0.98 (80/120 ms); entering = `FadeInDown` 300 ms with a 40 ms stagger capped at 8; sheets = the current behaviour with `emphasized` easing. Every animation passes `reduceMotion: ReduceMotion.System`.
- **Native pieces.** Shared native `Button`, `Card`, `Chip` and `CategoryPill` with the §4–§8 looks. No haptics (not requested; can be proposed later).
- **App screens.** The Home tab's teal hero uses the §3.4 gradient. The categories menu rows use the dot + `indicator` bar, and the category screen header uses the category gradient band.

## 11. Tokens to add in 3X.6 (proposal)
- **`gradient`** (per theme, CSS `--mt-gradient-*`; native = stop arrays):
  - `canvas` (3 layers, §3.1), `hero` (§3.4), `surface` (§3.2);
  - `action.primary`, `.primaryHover`, `.secondary`, `.secondaryHover`, `.accent`, `.accentHover`, `.danger`, `.dangerHover`, `.ghostHover` (§4.2);
  - `skeleton` (§6.4).
- **`glow`** (per theme): `brand`, `accent`, `danger`, `success` (§5); `category` is built from `--mt-cat-glow`.
- **`highlight`** (per theme): `filled`, `secondary` inset highlights (§4.1).
- **`border.action`** roles: `primary`, `secondary`, `secondaryHover`, `accent`, `danger`, `ghost`.
- **`motion`:**
  - `distance.liftControl` 1, `distance.liftCard` 3, `distance.enter` 8;
  - `stagger` 40, `staggerMax` 8;
  - `duration.press` 80, `duration.drift` 18000;
  - `scale.hover` **1.02 → 1.03**;
  - `spring` for native (damping 18, stiffness 220, no overshoot: `overshootClamping: true`).
- **`radius.card`:** `{radius.lg}` → **`{radius.xl}`**.
- **`categoryStarter`:** the 12 colours of §8.1, plus `categorySimilarDeltaE` 0.08 and `categoryReservedDeltaE` 0.06.
- **Function `deriveCategoryColor`** + `categoryStyle` (web) + the native equivalent.
- **`contrast-pairs.json`:** add every pair in `check-ui-contrast.mjs`; the category stress test becomes a unit test.

**i18n keys** (final list in 3X.5, from spec 3X "Texts"):
- colour label;
- colour help;
- invalid colour;
- duplicate ("already used by {category}");
- similar ("very similar to {category}");
- **reserved** ("may be confused with the {meaning} colour");
- inherited ("inherited from {category}");
- swatch "Used by {category}".

## 12. Screen notes (what each restyle task does)
| Task | Highlights |
|---|---|
| 3X.10 | §3.3 header, §8.4 category bar + mega-menu + drawer, account menu (§6.4), M-6/M-11/M-17 |
| 3X.11 | Hero §3.4 (+ M-12), search field (Input focus glow), Gigs/Projects shortcut buttons (over-hero pill style §8.4), featured tiles §8.5, gig cards §6.1, rows §8.5, best sellers (freelancer card hover, avatar ring in the brand gradient), M-10 entrance |
| 3X.12 | Category header band, breadcrumb chips, filter bar (inputs §6.3, chips §6.2), pagination (current page = Primary small, others Ghost), freelancer cards, explore chips, empty/error states |
| 3X.13 | Profile card (§3.2 + brand strip), rating bars in the brand gradient, chips, portfolio gallery hover, share/report dialogs (§6.4) |
| 3X.14 | Auth card (§3.2 + 4 px brand strip on top), social buttons, dashboard sidebar active item (`tint` + 3 px brand bar), role switcher thumb, stat tiles (gradient surface + brand-tint icon badge; HOLD hint unchanged), forms, dialogs, verification steps (step dots in the brand gradient), dark-mode pass |
| 3X.15 | Admin uses the same `form.css`/buttons/cards/tabs; colour picker §9 |
| 3X.16–17 | §10 |

## 13. Open points
- **For the Owner — decided 2026-10-06, all accepted (Q-174…Q-178):**
  - the starter colour assignment (§8.1);
  - the card radius 12 → 16;
  - the translucent blurred header;
  - whether the hero drift (M-12) is wanted at all.
- **For 3X.3 (preview):** show every component of §4–§9 old vs new, light + dark, with a reduced-motion switch and phone width. Include the admin picker with all three messages.
- **Technical, for 3X.16:** RN built-in gradient vs `expo-linear-gradient` (§10).
- **Risk:** this document widens the button look to classes in the app stylesheets. 3X.9 must check each place visually, because one class can serve both a button and a link (§4.4).
