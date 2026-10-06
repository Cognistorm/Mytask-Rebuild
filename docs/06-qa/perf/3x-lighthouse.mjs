// Lighthouse before/after for the 3X visual refresh (ROADMAP 3X.18d; spec 3X AC-14: CLS and INP no worse than before
// 3X on home, category page and search). INP needs real interactions, so the lab stand-in is Total Blocking Time.
//
// Run both production builds against the same stand-in API first (see docs/06-qa/perf/3x-lighthouse-2026-10-06.md):
//   node apps/web/e2e/fake-api.mjs                                   (port 3199)
//   pre-3X build (worktree of main 61c4e777):  next start --port 3101
//   3X build:                                   next start --port 3100
// then: node docs/06-qa/perf/3x-lighthouse.mjs [runs=5]
// Needs Chrome (CHROME_PATH or the default install) and downloads Lighthouse 12 through npx.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const RUNS = Number(process.argv[2] ?? 5);
const BUILDS = { 'pre-3X': 'http://localhost:3101', '3X': 'http://localhost:3100' };
const PAGES = { home: '/', category: '/categories/design', search: '/search?q=logo' };
const PRESETS = ['mobile', 'desktop'];
const dir = mkdtempSync(join(tmpdir(), 'mt-lh-'));

function lighthouse(url, preset, out) {
  const args = ['-y', 'lighthouse@12.8.2', url, '--quiet', '--output=json', `--output-path=${out}`];
  args.push('--only-categories=performance', '--chrome-flags=--headless=new --no-first-run');
  if (preset === 'desktop') args.push('--preset=desktop');
  try {
    execFileSync('npx', args, { stdio: 'pipe', shell: true });
  } catch (e) {
    // On Windows Lighthouse can fail to delete its Chrome profile after writing the report (EPERM): keep the report.
    if (!String(e.stderr).includes('EPERM')) throw e;
  }
  const a = JSON.parse(readFileSync(out, 'utf8')).audits;
  return {
    cls: a['cumulative-layout-shift'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    lcp: a['largest-contentful-paint'].numericValue,
    fcp: a['first-contentful-paint'].numericValue,
  };
}

const median = (xs) => {
  const s = [...xs].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

const results = {};
let n = 0;
for (const preset of PRESETS)
  for (const [page, path] of Object.entries(PAGES))
    for (let run = 0; run < RUNS; run++)
      // Alternate the builds run by run, so load from other programs falls on both alike.
      for (const [build, base] of run % 2 ? Object.entries(BUILDS).reverse() : Object.entries(BUILDS)) {
        const key = `${preset}|${page}|${build}`;
        (results[key] ??= []).push(lighthouse(base + path, preset, join(dir, `${n++}.json`)));
        process.stderr.write('.');
      }
process.stderr.write('\n');

const rows = [
  '| Preset | Page | Build | CLS | TBT ms | LCP ms | FCP ms |',
  '|---|---|---|---|---|---|---|',
];
const verdict = [];
for (const preset of PRESETS)
  for (const page of Object.keys(PAGES)) {
    const m = {};
    for (const build of Object.keys(BUILDS)) {
      const rs = results[`${preset}|${page}|${build}`];
      m[build] = Object.fromEntries(['cls', 'tbt', 'lcp', 'fcp'].map((k) => [k, median(rs.map((r) => r[k]))]));
      const v = m[build];
      rows.push(
        `| ${preset} | ${page} | ${build} | ${v.cls.toFixed(3)} | ${Math.round(v.tbt)} | ${Math.round(v.lcp)} | ${Math.round(v.fcp)} |`,
      );
    }
    // "No worse": CLS within 0.01 (Lighthouse rounds to 0.001; 0.1 is the "good" limit) and TBT within 50 ms or 10 %.
    const [pre, now] = [m['pre-3X'], m['3X']];
    const clsOk = now.cls <= pre.cls + 0.01;
    const tbtOk = now.tbt <= Math.max(pre.tbt + 50, pre.tbt * 1.1);
    verdict.push(`${preset} ${page}: CLS ${clsOk ? 'OK' : 'WORSE'}, TBT ${tbtOk ? 'OK' : 'WORSE'}`);
  }
console.log(`Median of ${RUNS} runs each.\n\n${rows.join('\n')}\n\n${verdict.join('\n')}`);
console.log(`\nRaw: ${JSON.stringify(results)}`);
