# 3X.6 Visual refresh tokens and the shared category colour function

From: ui-ux-designer · To: backend-engineer (3X.7); also web-engineer (3X.8–3X.15), mobile-engineer (3X.16–3X.17) · Date: 2026-10-06

## What I did
- **`packages/tokens/tokens.json`** (482 → 607 tokens), all from the approved `visual-refresh.md` and preview:
  - `theme.<name>.gradient`: canvas, hero, surface, input, track, skeleton, indicator, brandStrip, brandBanner and `action.*` (9 button fills). The gradient format is a project extension, documented in tokens.md §2.1.
  - `theme.<name>.glow`: brand, brandSoft, accent, danger, success. Native shadow props are in `$extensions`.
  - `theme.<name>.highlight`: filled, secondary, surface, pressed. These are inset shadows, web only.
  - `theme.<name>.cat`: the **brand fallback** category set.
  - New `bg` roles: `translucent`, `overHero`. New `border` roles: `translucent`, `overHero`, `cardHover`, `action.*`.
  - `shadow.control`.
  - `radius.card` 12 → 16.
  - Motion: `duration.press` 80, `duration.drift` 18000, `distance.*`, `stagger.*`, `spring.default`, `scale.hover` 1.03.
  - **`category`**:
    - `starter`, the 12 colours in §8.1 order;
    - `similarDeltaE` 0.08 and `reservedDeltaE` 0.06;
    - `reserved`, five colours, each with a meaning id.
- **`@mytask/tokens/color`** (`src/category-color.mjs` + `.d.mts`) is a plain ES module that runs in Node, browsers and RN. It contains:
  - `deriveCategoryColor` (`null` → brand set, invalid input → `TypeError`);
  - `categoryStyle` for the web, which also comes from `@mytask/tokens/web`;
  - `categoryTheme` for native, which also comes from `@mytask/tokens/native`;
  - `isCategoryColor` and `normalizeCategoryColor`;
  - `deltaE` and `contrastRatio`;
  - `findSimilar`, `findDuplicate`, `findReserved` and `nextStarterColor`;
  - the data exports (`categoryStarter`, `categoryReserved`, `categoryBrand` and both thresholds).
- **Build** (`build.mjs`, `lib.mjs`, `contrast.mjs`):
  - gradient CSS and inset shadows;
  - the `.mt-cat` / `[data-category-theme]` → `--mt-cat-*` mapping, plus `--mt-glow-category` and `--mt-gradient-category`;
  - the new reduced-motion block: durations capped at 120 ms, loops off, distances 0, scales 1, stagger 0;
  - native gradients as expo-linear-gradient props, plus native glows;
  - `dist/category.mjs`;
  - the gate: gradients are checked at every stop and glow point, and every category theme is checked (brand + 12 starters × 2 modes).
- **Tests**: `test/category-color.test.mjs` runs through `pnpm --filter @mytask/tokens test`, which is part of `pnpm test`.
- **Docs**:
  - `tokens.md`: header, §1, §2, §6.2, §6.4, §6.8, new §6.10 and §6.11, regenerated §8 tables, §9 rules 10, 13 and 14;
  - `components.md`: new §0.5, a token map per component;
  - `visual-refresh.md`: §3.1, §6.3 and §11 (marked done, with the deviations);
  - `packages/tokens/README.md`.

### Verification
- `pnpm --filter @mytask/tokens build`: **212 pair checks (106 × 2), 0 failures; 728 category checks, 0 failures**. The tightest pair is light `text.muted` on `gradient.canvas` at 4.53.
- `pnpm --filter @mytask/tokens test`: **18/18 pass** in about 1.4 s. The tests cover:
  - AC-5: 4,096 grid colours plus 1,500 seeded random colours, both modes, all rules;
  - the port is identical to the 3X.2 prototype for solid, onSolid, gradient ends and tints;
  - the starter order is the same in the JSON and in JS;
  - no starter colour triggers its own similar or reserved warning;
  - the helpers, the `.d.mts` export list and the motion bounds (R-4.1).
- `tsc --noEmit`: `apps/web`, `apps/admin`, `apps/mobile` and `packages/ui` are clean. A temporary probe importing `@mytask/tokens/color`, `/web` and `/native` type-checked, and a deliberate type error in it was caught, so the types resolve. The probe was deleted.
- `dist/` was rebuilt and is committed in sync (CI runs `build` + `git diff --exit-code`).

## Files created/changed
- created: `packages/tokens/src/category-color.mjs`, `src/category-color.d.mts`, `src/category-checks.mjs`, `test/category-color.test.mjs`, `dist/category.mjs`, this handoff
- changed: `packages/tokens/tokens.json`, `build.mjs`, `lib.mjs`, `contrast.mjs`, `contrast-pairs.json`, `package.json` (`./color` export, `test` script, `files`, engines ≥ 22), `README.md`, `dist/*`
- `docs/05-design/tokens.md`, `components.md`, `visual-refresh.md`; `docs/ROADMAP.md`, `docs/STATUS.md`

## What the next agent must do
**3X.7 (backend):**
- **Starter palette.** Read it from `@mytask/tokens/tokens.json` as `Object.values(json.category.starter).map(t => t.$value)`. The keys are names, so JSON order = assignment order; a unit test asserts this. Add the workspace dependency.
  - The API may also import `nextStarterColor` / `categoryStarter` from `@mytask/tokens/color`. That module is **ESM** (`.mjs`), so it needs a dynamic `import()` if the API build is CommonJS. Reading the JSON avoids that.
- **Migration.** Assign the starters in `position`, then `id` order (ADR-023).
- **Normalisation.** Upper-case the colour, the same as `normalizeCategoryColor`.

**3X.8 (web foundation):**
- `tokens.css` already contains the category mapping (`.mt-cat` / `[data-category-theme]`) and the reduced-motion variables. Apply them; do not redefine them.
- Paint the canvas with `background: var(--mt-gradient-canvas)` on a fixed `body::before`.
- Move through the motion variables, for example `translateY(calc(-1 * var(--mt-motion-distance-lift-card)))`. Reduced motion then works without extra CSS.
- **Visible now, before 3X.8:** cards using `--mt-radius-card` are 16 px (was 12), and reduced-motion transitions last 120 ms instead of 0. Both are approved changes, and no test depends on them.

**3X.9:**
- Form controls keep **`border.strong`** at rest. The preview's `neutral.300` input border is 1.5:1 and fails WCAG 1.4.11.
- `border.action.*` are for buttons only.

**3X.15 (admin):**
- Warnings: `findSimilar(hex, adminCategories)`, `findReserved(hex)`. The meaning id → `t_category_color_meaning_<meaning>`.
- Pre-select a swatch with `nextStarterColor(usedColors)`.
- Live preview with `deriveCategoryColor(hex)`. Guard partial typing with `isCategoryColor`: `deriveCategoryColor` throws on invalid input; `categoryStyle` / `categoryTheme` never throw.

**3X.16 (mobile):**
- `lightTheme.gradient.*` holds ready `expo-linear-gradient` props (`colors`, `locations`, `start`, `end`). Canvas and hero are arrays of layers; radial layers are web-only data.
- `theme.glow.*` = iOS shadow props.
- `theme.category` = brand set. Use `categoryTheme(color, scheme)` for category colours.
- `motion.spring.default` is for Reanimated.

## Open questions / risks
- **Look change for the Owner to note:** the light-mode canvas glows are **7 % / 4 %** instead of the approved preview's 10 % / 5 %. The 3X.2 contrast figure (4.79) measured points where the glow had already faded. At full glow strength, `text.muted` was 4.41, which fails AA. The difference is barely visible. If the Owner prefers the stronger glow, the alternative is a darker `text.muted`, which would change every page.
- `ink` and `indicator` can be one step darker (light) or lighter (dark) than in the 3X.3 preview. The port also checks the gradient canvas points. Solids, gradients and tints are unchanged.
- The preview files (`docs/05-design/preview/refresh.*`) and the 3X.2 evidence scripts are left as they were approved. `packages/tokens` is now the reference.
- No new i18n keys in this task. No Owner questions.
- `apps/api/src/app.module.ts` showed as modified before this task started. It is not part of this change and was left uncommitted.
