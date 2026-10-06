// Prototype of the category colour derivation (spec 3X R-1.4). 3X.6 ports it to packages/tokens.
const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgb2hex = (c) => '#' + c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const delin = (v) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
const lum = (h) => { const [r, g, b] = hex2rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function toOklab(h) {
  const [r, g, b] = hex2rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
function fromOklab([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3, s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
export const toOklch = (h) => { const [L, a, b] = toOklab(h); return [L, Math.hypot(a, b), ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360]; };
// OKLCH → hex, reducing chroma until in sRGB gamut (keeps hue and lightness).
export function oklch(L, C, H) {
  L = Math.min(1, Math.max(0, L));
  for (let c = C; c >= 0; c -= 0.002) {
    const rgb = fromOklab([L, c * Math.cos((H * Math.PI) / 180), c * Math.sin((H * Math.PI) / 180)]);
    if (inGamut(rgb)) return rgb2hex(rgb.map(delin));
  }
  return rgb2hex(fromOklab([L, 0, 0]).map(delin));
}
export const deltaE = (a, b) => { const p = toOklab(a), q = toOklab(b); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };

// Fixed references from tokens.json (theme light / dark).
const T = {
  light: { surface: '#FFFFFF', canvas: '#FAFAFA', textDark: '#161616', textLight: '#FFFFFF' },
  dark: { surface: '#27272A', canvas: '#161616', textDark: '#161616', textLight: '#FFFFFF' },
};
// Move lightness in `dir` (+1 lighter, -1 darker) until `ok(hex)`; step 0.005.
function walk(L, C, H, dir, ok) {
  for (let l = L; l >= 0 && l <= 1; l += dir * 0.005) { const h = oklch(l, C, H); if (ok(h)) return h; }
  return dir > 0 ? '#FFFFFF' : '#000000';
}
function solidFor(L, C, H, mode) {
  // Filled colour (chip, pill, active bar item, tile band) with its text colour, both gradient ends ≥ 4.5:1.
  const t = T[mode];
  const ends = (l) => [oklch(l + 0.05, C, H - 10), oklch(l - 0.05, C, H + 10)];
  const okWith = (text) => (l) => [oklch(l, C, H), ...ends(l)].every((x) => contrast(x, text) >= 4.5);
  const base = oklch(L, C, H);
  const text = contrast(base, t.textLight) >= contrast(base, t.textDark) ? t.textLight : t.textDark;
  const dir = text === t.textLight ? -1 : 1;
  let l = L;
  while (l > 0 && l < 1 && !okWith(text)(l)) l += dir * 0.005;
  const [start, end] = ends(l);
  return { solid: oklch(l, C, H), onSolid: text, gradientStart: start, gradientEnd: end };
}
export function deriveCategoryColor(baseHex) {
  const [L, C, H] = toOklch(baseHex);
  const out = {};
  for (const mode of ['light', 'dark']) {
    const t = T[mode];
    // Dark mode: calmer chroma, lightness kept in a comfortable band (Q-173 own gradients).
    const sL = mode === 'dark' ? Math.min(Math.max(L, 0.5), 0.78) : L;
    const sC = mode === 'dark' ? C * 0.9 : C;
    const s = solidFor(sL, sC, H, mode);
    const tint = mode === 'light' ? oklch(0.965, Math.min(C, 0.035), H) : oklch(0.3, Math.min(C, 0.06), H);
    const tintStrong = mode === 'light' ? oklch(0.92, Math.min(C, 0.07), H) : oklch(0.36, Math.min(C, 0.08), H);
    const dir = mode === 'light' ? -1 : 1;
    const ink = walk(mode === 'light' ? Math.min(L, 0.6) : Math.max(L, 0.7), C, H, dir, (h) => [t.surface, t.canvas, tint, tintStrong].every((bg) => contrast(h, bg) >= 4.5));
    const indicator = walk(L, C, H, dir, (h) => [t.surface, t.canvas].every((bg) => contrast(h, bg) >= 3));
    out[mode] = { ...s, tint, tintStrong, ink, indicator, glow: s.solid + (mode === 'light' ? '59' : '73') };
  }
  return out;
}
