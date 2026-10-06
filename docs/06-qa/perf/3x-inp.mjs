// Interaction latency before/after 3X (ROADMAP 3X.18d; spec 3X AC-14 INP). Lighthouse navigation runs have no
// interactions (TBT is their stand-in); this measures the real thing in the lab: the same clicks on both builds, with
// the CPU slowed 4× (Lighthouse's mobile factor), read from Event Timing entries as the browser computes INP
// (longest interaction per page load). Same servers as 3x-lighthouse.mjs.
//   node docs/06-qa/perf/3x-inp.mjs [runs=5]
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../../apps/web/package.json', import.meta.url));
const { chromium } = require('@playwright/test');

const RUNS = Number(process.argv[2] ?? 5);
const BUILDS = { 'pre-3X': 'http://localhost:3101', '3X': 'http://localhost:3100' };

/** English pages (stable names in both builds); each step is one interaction. */
const PAGES = {
  home: {
    path: '/en',
    steps: [
      (p) => p.getByRole('button', { name: 'Explore' }).click(),
      (p) => p.getByRole('button', { name: 'Explore' }).click(),
      (p) => p.getByRole('button', { name: 'Dark mode' }).click(),
    ],
  },
  category: {
    path: '/en/categories/design',
    steps: [
      (p) => p.getByTestId('sort-menu').click(),
      (p) => p.getByTestId('sort-menu').click(),
      (p) => p.getByTestId('filters').getByLabel('4+ stars').check(),
    ],
  },
  search: {
    path: '/en/search?q=logo',
    steps: [
      (p) => p.getByTestId('sort-menu').click(),
      (p) => p.getByTestId('sort-menu').click(),
      (p) => p.getByTestId('filters').getByLabel('4+ stars').check(),
    ],
  },
};

async function measure(browser, url, steps) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await page.goto(url, { waitUntil: 'networkidle' });
  // Hydrated (the app router has marked its history entry), then slow the CPU for the interactions only.
  await page.waitForFunction(() => history.state?.__NA === true);
  await page.evaluate(() => {
    window.__inp = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (e.interactionId) window.__inp.push(e.duration);
    }).observe({ type: 'event', durationThreshold: 16, buffered: false });
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const step of steps) {
    await step(page);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(500);
  const durations = await page.evaluate(() => window.__inp);
  await context.close();
  // Entries below the 16 ms threshold are not reported: count them as 16.
  return Math.max(16, ...durations);
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const browser = await chromium.launch();
const out = {};
for (const [name, { path, steps }] of Object.entries(PAGES))
  for (let run = 0; run < RUNS; run++)
    for (const [build, base] of run % 2 ? Object.entries(BUILDS).reverse() : Object.entries(BUILDS))
      (out[`${name}|${build}`] ??= []).push(await measure(browser, base + path, steps));
await browser.close();

console.log(`Median of ${RUNS} runs, worst interaction per load (ms, CPU 4× slower):\n`);
console.log('| Page | pre-3X | 3X | Verdict |\n|---|---|---|---|');
for (const name of Object.keys(PAGES)) {
  const [pre, now] = [median(out[`${name}|pre-3X`]), median(out[`${name}|3X`])];
  // "No worse": within 16 ms (one frame) or 10 %; 200 ms is the "good" INP limit.
  const ok = now <= Math.max(pre + 16, pre * 1.1);
  console.log(`| ${name} | ${pre} | ${now} | ${ok ? 'OK' : 'WORSE'}${now > 200 ? ' (over 200)' : ''} |`);
}
console.log(`\nRaw: ${JSON.stringify(out)}`);
