#!/usr/bin/env node
// Checks every pair in contrast-pairs.json in both themes against WCAG 2.1 AA, then every category theme
// (brand fallback + the 12 starter colours, light + dark) against the rules of visual-refresh.md 8.2.
// A gradient background is checked at every stop and every composited overlay point (lib.mjs gradientPoints);
// the lowest ratio is reported.
// Usage: node packages/tokens/contrast.mjs          -> summary, exit 1 on any failure
//        node packages/tokens/contrast.mjs --md     -> markdown tables (for docs/05-design/tokens.md)
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { loadJson, getPath, isToken, resolve, contrast, over, isGradient, gradientPoints } from './lib.mjs';

export function checkContrast(tokens = loadJson('tokens.json'), pairsFile = loadJson('contrast-pairs.json')) {
  const themes = Object.keys(tokens.theme);
  const rows = [];
  const valueAt = (theme, path) => {
    const abs = path.startsWith('color.') ? path : `theme.${theme}.${path}`;
    const node = getPath(tokens, abs);
    if (!isToken(node)) throw new Error(`contrast-pairs: unknown token ${abs}`);
    return resolve(tokens, node.$value);
  };
  for (const p of pairsFile.pairs) {
    for (const theme of themes) {
      const fg = valueAt(theme, p.fg);
      const bgValue = valueAt(theme, p.bg);
      const bgs = isGradient(bgValue) ? gradientPoints(bgValue, p.over) : [p.over ? over(bgValue, p.over) : bgValue];
      const [ratio, bg] = bgs.map((b) => [contrast(fg, b), b]).reduce((m, x) => (x[0] < m[0] ? x : m));
      const min = p.kind === 'text' ? 4.5 : 3;
      rows.push({ theme, ...p, fgHex: fg, bgHex: bg, gradient: bgs.length > 1, ratio, min, pass: ratio >= min });
    }
  }
  return rows;
}

/** Rows `{ color, id, mode, check, ratio, min, pass }` for the brand fallback and every starter colour. */
export async function checkCategoryThemes() {
  const { categoryStarter, categoryBrand, deriveCategoryColor } = await import('./src/category-color.mjs');
  const { categoryThemeChecks } = await import('./src/category-checks.mjs');
  const sets = [{ id: 'brand', color: 'brand', set: categoryBrand }, ...categoryStarter.map((s) => ({ ...s, set: deriveCategoryColor(s.color) }))];
  return sets.flatMap(({ id, color, set }) => ['light', 'dark'].flatMap((mode) =>
    categoryThemeChecks(set[mode], mode).map((r) => ({ id, color, mode, ...r }))));
}

const isMain = Boolean(process.argv[1]) && pathToFileURL(resolvePath(process.argv[1])).href === import.meta.url;
if (isMain) {
  const rows = checkContrast();
  const catRows = await checkCategoryThemes();
  const failures = rows.filter((r) => !r.pass);
  const catFailures = catRows.filter((r) => !r.pass);
  if (process.argv.includes('--md')) {
    const byPair = new Map();
    for (const r of rows) {
      const key = `${r.fg}|${r.bg}`;
      if (!byPair.has(key)) byPair.set(key, { ...r, themes: {} });
      byPair.get(key).themes[r.theme] = r;
    }
    console.log('| Foreground | Background | Use | Min | Light (fg / bg) | Light ratio | Dark (fg / bg) | Dark ratio |');
    console.log('|---|---|---|---|---|---|---|---|');
    for (const r of byPair.values()) {
      const l = r.themes.light;
      const d = r.themes.dark;
      const cell = (x) => `${x.ratio.toFixed(2)} ${x.pass ? 'pass' : '**FAIL**'}`;
      const bg = (x) => (x.gradient ? `worst ${x.bgHex}` : x.bgHex);
      console.log(`| \`${r.fg}\` | \`${r.bg}\` | ${r.use} | ${r.min} | ${l.fgHex} / ${bg(l)} | ${cell(l)} | ${d.fgHex} / ${bg(d)} | ${cell(d)} |`);
    }
    console.log('\n| Category colour | Light: lowest text / lowest UI | Dark: lowest text / lowest UI |');
    console.log('|---|---|---|');
    const ids = [...new Set(catRows.map((r) => r.id))];
    for (const id of ids) {
      const low = (mode, min) => Math.min(...catRows.filter((r) => r.id === id && r.mode === mode && r.min === min).map((r) => r.ratio)).toFixed(2);
      const color = catRows.find((r) => r.id === id).color;
      console.log(`| ${id} \`${color}\` | ${low('light', 4.5)} / ${low('light', 3)} | ${low('dark', 4.5)} / ${low('dark', 3)} |`);
    }
  } else {
    const min = rows.reduce((m, r) => (r.ratio / r.min < m.ratio / m.min ? r : m));
    console.log(`Checked ${rows.length} pairs (${rows.length / 2} pairs x 2 themes). Failures: ${failures.length}.`);
    console.log(`Tightest: ${min.theme} ${min.fg} on ${min.bg} = ${min.ratio.toFixed(2)} (min ${min.min}).`);
    for (const f of failures) console.log(`FAIL ${f.theme}: ${f.fg} ${f.fgHex} on ${f.bg} ${f.bgHex} = ${f.ratio.toFixed(2)} < ${f.min}`);
    console.log(`Category themes: ${catRows.length} checks, failures: ${catFailures.length}.`);
    for (const f of catFailures) console.log(`FAIL ${f.id} ${f.color} ${f.mode} ${f.check} on ${f.bg} = ${f.ratio.toFixed(2)} < ${f.min}`);
  }
  process.exit(failures.length || catFailures.length ? 1 : 0);
}
