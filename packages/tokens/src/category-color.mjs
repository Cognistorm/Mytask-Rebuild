// @mytask/tokens/color: the ONE category colour function for web, admin, mobile and API (spec 3X R-1.4, ADR-023,
// docs/05-design/visual-refresh.md §8). Ported from the 3X.2 prototype docs/05-design/refresh/derive-category-color.mjs.
// Plain ES module, no Node APIs: runs in Node, browsers and React Native. Data comes from dist/category.mjs,
// which build.mjs generates from tokens.json (starter palette, thresholds, reserved colours, reference surfaces).
import { brand, reference, starter, reserved, similarDeltaE, reservedDeltaE } from '../dist/category.mjs';

export { similarDeltaE as categorySimilarDeltaE, reservedDeltaE as categoryReservedDeltaE };
/** The 12 starter colours in assignment order (ADR-023 §4): `[{ id, color }]`. */
export const categoryStarter = starter;
/** Colours with a meaning (Q-178): `[{ id, color, meaning }]`; `meaning` selects `t_category_color_meaning_<meaning>`. */
export const categoryReserved = reserved;
/** The brand fallback set (theme.<mode>.cat), used whenever there is no category colour (R-1.2). */
export const categoryBrand = brand;

const HEX = /^#[0-9A-Fa-f]{6}$/;
/** True for a `#RRGGBB` string (any case), the only format the API stores (ADR-023 §2). */
export const isCategoryColor = (v) => typeof v === 'string' && HEX.test(v);
/** Upper-case `#RRGGBB`, or null when `v` is not a valid colour. */
export const normalizeCategoryColor = (v) => (isCategoryColor(v) ? v.toUpperCase() : null);

// ---------- colour maths (sRGB, WCAG 2.1, OKLab/OKLCH) ----------
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (c) => '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const delin = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map(lin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG 2.1 contrast ratio of two opaque `#RRGGBB` colours. */
export function contrastRatio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
function toOklab(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
const toOklch = (h) => {
  const [L, a, b] = toOklab(h);
  return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360];
};
/** OKLCH -> `#RRGGBB`, lowering chroma until the colour is inside sRGB (hue and lightness kept). */
function oklch(L, C, H) {
  L = Math.min(1, Math.max(0, L));
  const rad = (H * Math.PI) / 180;
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = fromOklab([L, c * Math.cos(rad), c * Math.sin(rad)]);
    if (inGamut(rgb)) return rgb2hex(rgb.map(delin));
  }
  return rgb2hex(fromOklab([L, 0, 0]).map(delin));
}
/** OKLab distance (ΔE) of two `#RRGGBB` colours: 0 = identical; the thresholds are 0.08 (similar) and 0.06 (reserved). */
export function deltaE(a, b) {
  const p = toOklab(a);
  const q = toOklab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// ---------- derivation (visual-refresh.md §8.2) ----------
const STEP = 0.005;
// Move lightness in `dir` (+1 lighter, -1 darker) until ok(hex); white/black always pass as the last resort.
function walkL(L, C, H, dir, ok) {
  for (let l = L; l >= 0 && l <= 1; l += dir * STEP) {
    const h = oklch(l, C, H);
    if (ok(h)) return h;
  }
  return dir > 0 ? '#FFFFFF' : '#000000';
}
const ends = (l, C, H) => [oklch(l + 0.05, C, H - 10), oklch(l - 0.05, C, H + 10)];
// Filled colour + its text colour; text >= 4.5 on the solid AND on both gradient ends (step 2-3).
function solidFor(L, C, H, ref) {
  const base = oklch(L, C, H);
  const text = contrastRatio(base, ref.textLight) >= contrastRatio(base, ref.textDark) ? ref.textLight : ref.textDark;
  const dir = text === ref.textLight ? -1 : 1;
  const ok = (l) => [oklch(l, C, H), ...ends(l, C, H)].every((x) => contrastRatio(x, text) >= 4.5);
  let l = L;
  while (l > 0 && l < 1 && !ok(l)) l += dir * STEP;
  const [gradientStart, gradientEnd] = ends(l, C, H);
  return { solid: oklch(l, C, H), onSolid: text, gradientStart, gradientEnd };
}
function deriveMode(L, C, H, mode) {
  const ref = reference[mode];
  const dark = mode === 'dark';
  // Dark: calmer chroma, lightness in a comfortable band (Q-173 "designed, not inverted").
  const s = solidFor(dark ? Math.min(Math.max(L, 0.5), 0.78) : L, dark ? C * 0.9 : C, H, ref);
  const tint = dark ? oklch(0.3, Math.min(C, 0.06), H) : oklch(0.965, Math.min(C, 0.035), H);
  const tintStrong = dark ? oklch(0.36, Math.min(C, 0.08), H) : oklch(0.92, Math.min(C, 0.07), H);
  const dir = dark ? 1 : -1;
  // Ink: text on every surface/canvas point (incl. the gradient canvas) and on both tints.
  const inkBgs = [...ref.surfaces, ...ref.canvases, tint, tintStrong];
  const ink = walkL(dark ? Math.max(L, 0.7) : Math.min(L, 0.6), C, H, dir, (h) => inkBgs.every((bg) => contrastRatio(h, bg) >= 4.5));
  const uiBgs = [...ref.surfaces, ...ref.canvases];
  const indicator = walkL(L, C, H, dir, (h) => uiBgs.every((bg) => contrastRatio(h, bg) >= 3));
  return Object.freeze({ ...s, tint, tintStrong, ink, indicator, glow: s.solid + ref.glowAlpha });
}

const cache = new Map();
/**
 * Every derived shade of one category colour, for light and dark (spec 3X R-1.4).
 * `null`/`undefined` returns the brand fallback set (ADR-023 §2: null = no colour = brand).
 * Throws a TypeError for any other non-`#RRGGBB` input (validate typed input with isCategoryColor first).
 * Results are cached and frozen.
 */
export function deriveCategoryColor(hex) {
  if (hex == null) return brand;
  const key = normalizeCategoryColor(hex);
  if (!key) throw new TypeError(`deriveCategoryColor: expected #RRGGBB, got ${JSON.stringify(hex)}`);
  let hit = cache.get(key);
  if (!hit) {
    const [L, C, H] = toOklch(key);
    hit = Object.freeze({ light: deriveMode(L, C, H, 'light'), dark: deriveMode(L, C, H, 'dark') });
    cache.set(key, hit);
  }
  return hit;
}

/** Native: the one set for the current scheme. Null or invalid -> brand fallback (never throws in render). */
export function categoryTheme(hex, mode = 'light') {
  const set = isCategoryColor(hex) ? deriveCategoryColor(hex) : brand;
  return set[mode === 'dark' ? 'dark' : 'light'];
}

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
/**
 * Web: inline style with BOTH sets as CSS variables (`--mt-cat-l-*`, `--mt-cat-d-*`) for an element with class
 * `mt-cat` (or a `data-category-theme` attribute); tokens.css maps them to `--mt-cat-*` for the active theme.
 * Null or invalid -> `{}`, so the element falls back to the brand values. Never throws.
 */
export function categoryStyle(hex) {
  if (!isCategoryColor(hex)) return {};
  const d = deriveCategoryColor(hex);
  const style = {};
  for (const [mode, p] of [['light', 'l'], ['dark', 'd']]) {
    for (const [k, v] of Object.entries(d[mode])) style[`--mt-cat-${p}-${kebab(k)}`] = v;
  }
  return style;
}

// ---------- admin helpers (R-1.3, R-1.8, ADR-023 §4/§6) ----------
/**
 * Other top-level categories whose colour is very similar (0 < ΔE < threshold), closest first.
 * An exact match is not "similar": it is the duplicate the API refuses (409), see findDuplicate.
 * `others` = `[{ color, ...anything }]` (e.g. AdminCategory rows); entries without a valid colour are skipped.
 */
export function findSimilar(hex, others, threshold = similarDeltaE) {
  const me = normalizeCategoryColor(hex);
  if (!me) return [];
  return others
    .filter((o) => isCategoryColor(o?.color) && o.color.toUpperCase() !== me)
    .map((o) => ({ ...o, deltaE: deltaE(me, o.color.toUpperCase()) }))
    .filter((o) => o.deltaE < threshold)
    .sort((a, b) => a.deltaE - b.deltaE);
}
/** The first entry of `others` with exactly the same colour (case-insensitive), or undefined. */
export function findDuplicate(hex, others) {
  const me = normalizeCategoryColor(hex);
  return me ? others.find((o) => isCategoryColor(o?.color) && o.color.toUpperCase() === me) : undefined;
}
/** Reserved colours closer than the threshold (ΔE < 0.06), closest first: `[{ id, color, meaning, deltaE }]`. */
export function findReserved(hex, threshold = reservedDeltaE) {
  const me = normalizeCategoryColor(hex);
  if (!me) return [];
  return reserved
    .map((r) => ({ ...r, deltaE: deltaE(me, r.color) }))
    .filter((r) => r.deltaE < threshold)
    .sort((a, b) => a.deltaE - b.deltaE);
}
/** The first starter colour not in `used` (case-insensitive), or null when all 12 are taken (ADR-023 §4). */
export function nextStarterColor(used) {
  const taken = new Set(used.filter(isCategoryColor).map((c) => c.toUpperCase()));
  return starter.find((s) => !taken.has(s.color))?.color ?? null;
}
