// QA structure parity for the 3X visual refresh (ROADMAP 3X.19; spec 3X AC-15 "nothing moved").
// Opens each screen on the build before 3X and on the 3X build, against the same stand-in API, and compares:
//   1. the accessibility tree (roles, names, levels, order) — identical but for the Owner's 3X.10a change;
//   2. every visible element's box (tag + name, in document order) — position and size deltas;
//   3. reading order — pairs of elements whose vertical order flipped;
//   4. class names and test ids present before 3X and gone now.
// Not part of the normal E2E run (needs both builds). See docs/06-qa/reports/3x-visual-refresh-2026-10-06.md:
//   node e2e/fake-api.mjs                     (3199, from this checkout)
//   pre-3X build: next start --port 3101      (worktree of main 61c4e777)
//   3X build:     next start --port 3100
//   pnpm exec playwright test --config playwright.parity.config.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, expect, type Browser, type Page } from '@playwright/test';
import { signedIn } from '../screens';

const BUILDS = { pre: 'http://localhost:3101', now: 'http://localhost:3100' } as const;
const VIEWPORTS = {
  desktop: { width: 1280, height: 900 },
  phone: { width: 360, height: 740 },
} as const;
const OUT = process.env.PARITY_OUT ?? join(process.cwd(), 'test-results', 'parity');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

type Screen = { name: string; path: string; ready?: string; setup?: (page: Page) => Promise<void> };
const SCREENS: Screen[] = [
  { name: 'home', path: '/', ready: '.mt-home-hero' },
  { name: 'category-l1', path: '/categories/design', ready: '[data-testid="gig-card"]' },
  { name: 'category-l2', path: '/categories/design/logo-design' },
  { name: 'category-l3', path: '/categories/design/logo-design/minimal' },
  { name: 'search', path: '/search?q=logo', ready: '[data-testid="gig-card"]' },
  { name: 'search-empty', path: '/search?q=nothing-matches-this' },
  { name: 'sellers', path: '/sellers' },
  { name: 'hire', path: '/hire/logo-design' },
  { name: 'explore-projects', path: '/explore/projects' },
  { name: 'profile', path: '/profile/nino_b', ready: 'h1' },
  { name: 'portfolio', path: '/profile/nino_b/portfolio' },
  { name: 'login', path: '/auth/login', ready: 'h1' },
  { name: 'register', path: '/auth/register', ready: 'h1' },
  { name: 'password-reset', path: '/auth/password/reset', ready: 'h1' },
  { name: 'auth-request', path: '/auth/request', ready: 'h1' },
  { name: 'not-found', path: '/this-page-does-not-exist' },
  {
    name: 'selling-home',
    path: '/seller/home',
    ready: '[data-testid="kpi-earnings"]',
    setup: signedIn,
  },
  { name: 'buying-projects', path: '/account/projects', setup: signedIn },
];

type Item = { key: string; x: number; y: number; w: number; h: number };
type Snap = {
  aria: string;
  items: Item[];
  classes: string[];
  testIds: string[];
  scrollWidth: number;
};

async function snapshot(
  browser: Browser,
  base: string,
  screen: Screen,
  vp: keyof typeof VIEWPORTS,
  shot: string,
) {
  const context = await browser.newContext({
    baseURL: base,
    viewport: VIEWPORTS[vp],
    reducedMotion: 'reduce',
  });
  await context.addCookies([{ name: 'mt_theme', value: 'light', url: base, sameSite: 'Lax' }]);
  const page = await context.newPage();
  await page.route('http://media.test/**', (r) =>
    r.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  await screen.setup?.(page);
  await page.goto(screen.path);
  if (screen.ready) await expect(page.locator(screen.ready).first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  // Scroll through once (3X entrance items rise in when seen; under reduced motion they are shown at once anyway).
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 300) {
      scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 20)));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  const aria = await page.locator('body').ariaSnapshot();
  const data = await page.evaluate(() => {
    const SEL =
      'a,button,input,select,textarea,summary,label,img,h1,h2,h3,h4,h5,h6,p,li,header,nav,main,footer,aside,form,section,[role],[data-testid]';
    const seen = new Map<string, number>();
    const items = [];
    for (const el of document.querySelectorAll<HTMLElement>(SEL)) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none')
        continue;
      const name = (
        el.getAttribute('aria-label') ??
        el.getAttribute('alt') ??
        el.getAttribute('data-testid') ??
        el.getAttribute('name') ??
        el.textContent ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40);
      // A link and a button count as one "control", so the bar's button that became a link (3X.10a) still matches.
      const tag =
        el.tagName === 'A' || el.tagName === 'BUTTON' ? 'control' : el.tagName.toLowerCase();
      const base = `${tag}|${name}`;
      const n = (seen.get(base) ?? 0) + 1;
      seen.set(base, n);
      items.push({
        key: `${base}#${n}`,
        x: Math.round(r.left + scrollX),
        y: Math.round(r.top + scrollY),
        w: Math.round(r.width),
        h: Math.round(r.height),
      });
    }
    const classes = new Set<string>();
    const testIds = new Set<string>();
    for (const el of document.querySelectorAll('*')) {
      el.classList.forEach((c) => classes.add(c));
      const t = el.getAttribute('data-testid');
      if (t) testIds.add(t);
    }
    return {
      items,
      classes: [...classes].sort(),
      testIds: [...testIds].sort(),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  await page.screenshot({ path: shot, fullPage: true });
  await context.close();
  return { aria, ...data } as Snap;
}

function compare(pre: Snap, now: Snap) {
  const nowByKey = new Map(now.items.map((i) => [i.key, i]));
  const preKeys = new Set(pre.items.map((i) => i.key));
  const order = new Map(pre.items.map((i, n) => [i.key, n]));
  const pairs = pre.items
    .filter((i) => nowByKey.has(i.key))
    .map((p) => ({ p, n: nowByKey.get(p.key)! }));
  const moved = pairs
    .map(({ p, n }) => ({
      key: p.key,
      dx: n.x - p.x,
      dy: n.y - p.y,
      dw: n.w - p.w,
      dh: n.h - p.h,
      max: Math.max(
        Math.abs(n.x - p.x),
        Math.abs(n.y - p.y),
        Math.abs(n.w - p.w),
        Math.abs(n.h - p.h),
      ),
    }))
    .sort((a, b) => b.max - a.max);
  // Reading order: a pair that sat clearly above/below each other (≥ 8 px apart, no vertical overlap) and flipped.
  let flips = 0;
  const flipped: string[] = [];
  for (let i = 0; i < pairs.length; i++)
    for (let j = i + 1; j < pairs.length; j++) {
      const [a, b] = [pairs[i]!, pairs[j]!];
      const preOrder = a.p.y + a.p.h + 8 <= b.p.y ? 1 : b.p.y + b.p.h + 8 <= a.p.y ? -1 : 0;
      const nowOrder = a.n.y + a.n.h <= b.n.y ? 1 : b.n.y + b.n.h <= a.n.y ? -1 : 0;
      if (preOrder !== 0 && nowOrder === -preOrder) {
        flips++;
        if (flipped.length < 10) flipped.push(`${a.p.key} ↔ ${b.p.key}`);
      }
    }
  // Accessibility tree lines only in one build (as a multiset, so order changes show too via the item checks).
  const lines = (s: string) => s.split('\n');
  const minus = (a: string[], b: string[]) => {
    const rest = [...b];
    return a.filter((l) => {
      const k = rest.indexOf(l);
      if (k < 0) return true;
      rest.splice(k, 1);
      return false;
    });
  };
  const ariaOnlyPre = minus(lines(pre.aria), lines(now.aria));
  const ariaOnlyNow = minus(lines(now.aria), lines(pre.aria));
  // The one Owner-approved change (3X.10a): a top-level name in the category bar was a button and is now a link to
  // its category page (`- link "X":` + `- /url: /categories/…`).
  const unexpectedPre = ariaOnlyPre.filter(
    (l) =>
      !/^\s*- button "([^"]+)"( \[expanded\])?$/.test(l) ||
      !ariaOnlyNow.some((n) => n.includes(`link "${l.split('"')[1]}"`)),
  );
  const unexpectedNow = ariaOnlyNow.filter(
    (l) =>
      !/^\s*- link "[^"]+"( \[expanded\])?:$/.test(l) &&
      !/^\s*- \/url: \/categories\/[^/]+$/.test(l),
  );
  return {
    ariaEqual: pre.aria === now.aria,
    ariaOnlyPre,
    ariaOnlyNow,
    ariaUnexpected: [...unexpectedPre.map((l) => `- ${l}`), ...unexpectedNow.map((l) => `+ ${l}`)],
    items: { pre: pre.items.length, now: now.items.length, matched: pairs.length },
    onlyPre: pre.items.filter((i) => !nowByKey.has(i.key)).map((i) => i.key),
    onlyNow: now.items.filter((i) => !preKeys.has(i.key)).map((i) => i.key),
    within2: moved.filter((m) => m.max <= 2).length,
    within8: moved.filter((m) => m.max <= 8).length,
    top: moved.slice(0, 12),
    // In document order: where the shifts start (later ones mostly carry an earlier one along).
    firstShifts: moved
      .filter((m) => m.max > 8)
      .sort((a, b) => order.get(a.key)! - order.get(b.key)!)
      .slice(0, 12),
    flips,
    flipped,
    classesGone: pre.classes.filter((c) => !now.classes.includes(c)),
    testIdsGone: pre.testIds.filter((t) => !now.testIds.includes(t)),
    scrollWidth: { pre: pre.scrollWidth, now: now.scrollWidth },
  };
}

test.describe.configure({ mode: 'parallel' });

for (const screen of SCREENS)
  for (const vp of Object.keys(VIEWPORTS) as (keyof typeof VIEWPORTS)[])
    test(`${screen.name} ${vp}`, async ({ browser }) => {
      mkdirSync(OUT, { recursive: true });
      const id = `${screen.name}-${vp}`;
      const pre = await snapshot(browser, BUILDS.pre, screen, vp, join(OUT, `${id}-pre.png`));
      const now = await snapshot(browser, BUILDS.now, screen, vp, join(OUT, `${id}-now.png`));
      const result = compare(pre, now);
      writeFileSync(join(OUT, `${id}.json`), JSON.stringify(result, null, 2));
      if (!result.ariaEqual) {
        writeFileSync(join(OUT, `${id}-aria-pre.yml`), pre.aria);
        writeFileSync(join(OUT, `${id}-aria-now.yml`), now.aria);
      }
      expect
        .soft(result.ariaUnexpected, 'accessibility tree unchanged (but for 3X.10a)')
        .toEqual([]);
      expect.soft(result.testIdsGone, 'no test id removed').toEqual([]);
      expect.soft(result.flips, 'reading order unchanged').toBe(0);
    });
