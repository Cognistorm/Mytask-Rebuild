// The contrast guarantees of one derived category theme (visual-refresh.md §8.2, spec 3X AC-5).
// Shared by the build gate (contrast.mjs) and the unit test, so both check exactly the same rules.
import { reference } from '../dist/category.mjs';
import { contrastRatio } from './category-color.mjs';

/** Rows `{ check, bg, ratio, min, pass }` for one mode's theme (output of deriveCategoryColor()[mode]). */
export function categoryThemeChecks(theme, mode) {
  const ref = reference[mode];
  const rows = [];
  const add = (check, fg, bg, min) => {
    const ratio = contrastRatio(fg, bg);
    rows.push({ check, bg, ratio, min, pass: ratio >= min - 1e-9 });
  };
  for (const k of ['solid', 'gradientStart', 'gradientEnd']) add(`onSolid/${k}`, theme.onSolid, theme[k], 4.5);
  for (const bg of ref.surfaces) add('ink/surface', theme.ink, bg, 4.5);
  for (const bg of ref.canvases) add('ink/canvas', theme.ink, bg, 4.5);
  add('ink/tint', theme.ink, theme.tint, 4.5);
  add('ink/tintStrong', theme.ink, theme.tintStrong, 4.5);
  for (const bg of ref.surfaces) add('indicator/surface', theme.indicator, bg, 3);
  for (const bg of ref.canvases) add('indicator/canvas', theme.indicator, bg, 3);
  return rows;
}
