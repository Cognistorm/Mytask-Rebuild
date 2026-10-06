## What I did
- Built the interactive preview of the visual refresh: `docs/05-design/preview/refresh.html` (+ `refresh.css`, `refresh.js`). It opens by double-click and works offline. It uses the real `packages/tokens/dist/tokens.css`, the FiraGO fonts, the real category images and logo from `packages/assets`, and real Georgian texts from `packages/i18n/ka.json` and the seeded categories.
- Both looks are rendered from the **same markup**: "Now" is condensed from today's `packages/ui` styles; "New" follows `docs/05-design/visual-refresh.md`. The proposed new tokens live as `--rf-*` variables in `refresh.css` (§2), ready for 3X.6.
- The 11 sections:
  1. header + category bar + mega-menu + phone drawer;
  2. home with the over-hero header and hero drift;
  3. category page (pick any category) / search;
  4. profile;
  5. dashboard;
  6. login;
  7. buttons (every variant × state);
  8. controls + feedback;
  9. palette with derived shades;
  10. a **working** admin colour picker (refuse / similar / reserved / ok; Save recolours the whole page);
  11. motion list.
- Switches: light/dark, reduced motion (follows the device on first open), phone width, new only.
- Verification `docs/05-design/refresh/verify-preview.mjs` (headless Chromium via the web E2E Playwright): **22/22**.
  - Page health: no console errors or failed requests (desktop and phone); no horizontal scroll at 360 px in either theme.
  - Contrast ≥ 4.5 measured from the rendered gradients for 71 elements per theme, plus the hovered category pill. The mega-menu opens.
  - The inline colour function equals the module on 304 colours.
  - The picker messages are correct.
  - Reduced motion: no card movement, image zoom, hero drift or shimmer, and no hidden content.
- **Fix found by the verification:** text on a resting category pill reached only 3.8–4.5:1 on the pill's darker gradient end (`tintStrong`). `deriveCategoryColor` now also guarantees `ink` ≥ 4.5 on `tintStrong`. Module, preview copy, stress test (4,096 colours × 2 modes: 0 failures) and `visual-refresh.md` §8.2 are updated.
- Recorded the Owner's look decisions Q-174…Q-178 (all yes) in `open-questions.md`; spec R-1.3 is confirmed (reserved-colour warning).

## Files created/changed
- New: `docs/05-design/preview/refresh.html`, `refresh.css`, `refresh.js`; `docs/05-design/refresh/verify-preview.mjs`
- Changed: `docs/05-design/refresh/derive-category-color.mjs`, `check-category-colors.mjs`; `docs/05-design/visual-refresh.md`; `docs/02-specs/3x-visual-refresh.md`; `docs/01-discovery/open-questions.md`; `docs/ROADMAP.md`; `docs/STATUS.md`

## What the next agent must do
- **3X.4 (Owner):** open `docs/05-design/preview/refresh.html` and click through it in light and dark, on desktop and phone width. Approve, or list changes; the designer adjusts and re-runs `node docs/05-design/refresh/verify-preview.mjs`.
- **After approval, 3X.5 (solution-architect):** ADR-023 + data model + contract 1.4.0 for the category colour (spec 3X "Data and API"; error cases for format, level and duplicate; i18n key list in visual-refresh.md §11, including the reserved-colour warning).

## Open questions / risks
- The preview's "Now" column is a condensed copy of today's styles, not the live apps. For an exact before/after of real pages, compare with staging https://mytask.1kk.ge.
- The `--rf-*` names in `refresh.css` are working names. 3X.6 gives them their final token names (§11).
- The hero violet glow is deliberately subtle. If the Owner wants it stronger, raise `--rf-hero-glow` (white text stays ≥ 4.5 up to the checked worst point `#3B3E8F`; re-run `check-ui-contrast.mjs`).
