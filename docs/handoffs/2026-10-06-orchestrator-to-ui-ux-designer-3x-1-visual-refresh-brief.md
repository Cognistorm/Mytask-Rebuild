## What I did
- Turned the Owner's visual-refresh request (2026-10-06) into the approved brief `docs/02-specs/3x-visual-refresh.md`: R-1 category colours (NEW), R-2 buttons/gradients, R-3 background, R-4 motion; AC-1…AC-16; EC-1…EC-5; a "must not change" list; the screen inventory mapped to tasks 3X.10…3X.17.
- Recorded the Owner's answers Q-169…Q-173 in `docs/01-discovery/open-questions.md`: free colour picker, unique top-level colours, inheritance, moderate motion, own dark-mode gradients.
- Corrected the ROADMAP Phase 3X CSP note: the website already allows inline styles (`style-src 'self' 'unsafe-inline'`, `apps/web/src/lib/csp.ts:62`), so a free `#RRGGBB` value can be applied as CSS variables once the API validates it.

## Files created/changed
- `docs/02-specs/3x-visual-refresh.md` (new)
- `docs/01-discovery/open-questions.md` (Q-169…Q-173)
- `docs/ROADMAP.md` (3X.1 ticked; 3X.2, 3X.3, 3X.5, 3X.6, 3X.15 wording follows the answers)
- `docs/STATUS.md`

## What the next agent must do (3X.2, ui-ux-designer)
Write `docs/05-design/visual-refresh.md` (no product code). It must cover:
1. **Gradient system, light and dark (Q-173).** Canvas, surfaces, hero, cards, with the text-contrast plan for both gradient ends.
2. **Buttons.** Every variant gets a crisp border plus an inner gradient, with every state (spec R-2.2), plus chips, tabs, switcher, inputs and switches.
3. **Glow states.**
4. **Motion catalogue** within R-4.1 (≤ 400 ms, lift ≤ 4 px, scale ≤ 1.03, no bounce/parallax). Give each item a reduced-motion version (R-4.3). Note that `tokens.md` currently caps hover scale at 1.02; propose the new cap or keep it.
5. **Category colours.**
   - A starter palette of distinct colours, one per existing top-level category plus spares. The current categories are in the database / admin `/categories` and on the live site.
   - The **derivation function spec**: input = base `#RRGGBB`; outputs = text-on colour (≥ 4.5:1), soft tint, gradient start/end, dark-mode variants, indicator shade (≥ 3:1). Write it so that 3X.6 can implement it once in `packages/tokens` for web + native.
   - The "very similar" threshold (e.g. a ΔE value) for the admin warning.
6. **The current look**, described by reading `packages/ui/src/web/*.css` and the app stylesheets. Keep every existing class name, because E2E tests rely on them.

Then 3X.3 builds the interactive preview from this document.

## Open questions / risks
- Free colours can clash with brand teal or the feedback colours (red = error, green = success). The designer should say whether the admin warns about those too. If it should, add it to R-1.3 via the Owner.
- The hover-scale cap in `tokens.md` (1.02) differs from the brief's bound (1.03). The designer decides; it is not an Owner question.
- PR #2 (`feat/catalog-search`) is not merged yet. This branch is cut from it, so merge PR #2 first.
