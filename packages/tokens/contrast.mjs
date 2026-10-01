#!/usr/bin/env node
// Checks every pair in contrast-pairs.json in both themes against WCAG 2.1 AA.
// Usage: node packages/tokens/contrast.mjs          -> summary, exit 1 on any failure
//        node packages/tokens/contrast.mjs --md     -> markdown table (for docs/05-design/tokens.md)
import { pathToFileURL } from 'node:url';
import { resolve as resolvePath } from 'node:path';
import { loadJson, getPath, isToken, resolve, contrast, over } from './lib.mjs';

export function checkContrast(tokens = loadJson('tokens.json'), pairsFile = loadJson('contrast-pairs.json')) {
  const themes = Object.keys(tokens.theme);
  const rows = [];
  const colourAt = (theme, path) => {
    const abs = path.startsWith('color.') ? path : `theme.${theme}.${path}`;
    const node = getPath(tokens, abs);
    if (!isToken(node)) throw new Error(`contrast-pairs: unknown token ${abs}`);
    return resolve(tokens, node.$value);
  };
  for (const p of pairsFile.pairs) {
    for (const theme of themes) {
      const fg = colourAt(theme, p.fg);
      let bg = colourAt(theme, p.bg);
      if (p.over) bg = over(bg, p.over);
      const ratio = contrast(fg, bg);
      const min = p.kind === 'text' ? 4.5 : 3;
      rows.push({ theme, ...p, fgHex: fg, bgHex: bg, ratio, min, pass: ratio >= min });
    }
  }
  return rows;
}

const isMain = Boolean(process.argv[1]) && pathToFileURL(resolvePath(process.argv[1])).href === import.meta.url;
if (isMain) {
  const rows = checkContrast();
  const failures = rows.filter((r) => !r.pass);
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
      console.log(`| \`${r.fg}\` | \`${r.bg}\` | ${r.use} | ${r.min} | ${l.fgHex} / ${l.bgHex} | ${cell(l)} | ${d.fgHex} / ${d.bgHex} | ${cell(d)} |`);
    }
  } else {
    const min = rows.reduce((m, r) => (r.ratio / r.min < m.ratio / m.min ? r : m));
    console.log(`Checked ${rows.length} pairs (${rows.length / 2} pairs x 2 themes). Failures: ${failures.length}.`);
    console.log(`Tightest: ${min.theme} ${min.fg} on ${min.bg} = ${min.ratio.toFixed(2)} (min ${min.min}).`);
    for (const f of failures) console.log(`FAIL ${f.theme}: ${f.fg} ${f.fgHex} on ${f.bg} ${f.bgHex} = ${f.ratio.toFixed(2)} < ${f.min}`);
  }
  process.exit(failures.length ? 1 : 0);
}
