// Run: node docs/05-design/refresh/check-category-colors.mjs (ROADMAP 3X.2). Starter palette distances + 4,096-colour stress test.
import { deriveCategoryColor, contrast, deltaE, toOklch } from './derive-category-color.mjs';

const palette = {
  'graphics-design': '#7C3AED',
  'music-audio': '#DB2777',
  'programming-tech': '#2563EB',
  'digital-marketing': '#D99A00',
  'video-animation': '#0EA5E9',
  business: '#1E3A8A',
  photography: '#4D9A1E',
  'spare-1': '#C026D3',
  'spare-2': '#8B5E34',
  'spare-3': '#52606D',
  'spare-4': '#A3A30D',
  'spare-5': '#9F1239',
};
const reserved = { 'brand teal 600': '#29807E', 'brand teal 700': '#0D696C', 'featured orange': '#F48438', 'error red': '#B91C1C', 'success green': '#15803D' };

const names = Object.keys(palette);
let minPair = [9];
for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
  const d = deltaE(palette[names[i]], palette[names[j]]);
  if (d < minPair[0]) minPair = [d, names[i], names[j]];
}
console.log('min ΔE between palette colours', minPair[0].toFixed(3), minPair[1], minPair[2]);
for (const n of names) {
  const near = Object.entries(reserved).map(([k, v]) => [deltaE(palette[n], v), k]).sort((a, b) => a[0] - b[0])[0];
  const [L, C, H] = toOklch(palette[n]);
  console.log(n.padEnd(18), palette[n], `L${L.toFixed(2)} C${C.toFixed(2)} H${H.toFixed(0)}`.padEnd(20), 'nearest reserved', near[1], near[0].toFixed(3));
}

// Stress test: every colour on a 16-step RGB grid (4096 colours) must satisfy the contrast rules in both modes.
const steps = [...Array(16)].map((_, i) => i * 17);
let n = 0, fails = [];
const S = { light: ['#FFFFFF', '#FAFAFA'], dark: ['#27272A', '#161616'] };
for (const r of steps) for (const g of steps) for (const b of steps) {
  const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  const d = deriveCategoryColor(hex); n++;
  for (const m of ['light', 'dark']) {
    const x = d[m];
    const checks = [
      ['solid/onSolid', contrast(x.solid, x.onSolid), 4.5],
      ['gradStart/onSolid', contrast(x.gradientStart, x.onSolid), 4.5],
      ['gradEnd/onSolid', contrast(x.gradientEnd, x.onSolid), 4.5],
      ['ink/surface', contrast(x.ink, S[m][0]), 4.5], ['ink/canvas', contrast(x.ink, S[m][1]), 4.5], ['ink/tint', contrast(x.ink, x.tint), 4.5], ['ink/tintStrong', contrast(x.ink, x.tintStrong), 4.5],
      ['indicator/surface', contrast(x.indicator, S[m][0]), 3], ['indicator/canvas', contrast(x.indicator, S[m][1]), 3],
    ];
    for (const [k, v, min] of checks) if (v < min - 1e-9) fails.push(`${hex} ${m} ${k} ${v.toFixed(2)}`);
  }
}
console.log(`stress test: ${n} colours × 2 modes, ${fails.length} failures`, fails.slice(0, 10));

console.log('\nDerived values for the starter palette:');
for (const k of names) {
  const d = deriveCategoryColor(palette[k]);
  console.log(k, JSON.stringify(d));
}
