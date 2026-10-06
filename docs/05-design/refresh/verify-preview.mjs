// Verifies docs/05-design/preview/refresh.html in headless Chromium (ROADMAP 3X.3).
// Run from the repo root: node docs/05-design/refresh/verify-preview.mjs [screenshot-dir]
// Uses the Playwright already installed for the web E2E tests (apps/web).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { deriveCategoryColor } from './derive-category-color.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const require = createRequire(path.join(root, 'apps/web/package.json'));
const { chromium } = require('@playwright/test');
const url = pathToFileURL(path.join(root, 'docs/05-design/preview/refresh.html')).href;
const shots = process.argv[2];
if (shots) fs.mkdirSync(shots, { recursive: true });

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); };

const browser = await chromium.launch();

async function open(viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  return { ctx, page, errors };
}

// Contrast of each rendered text against every colour stop of its own (or nearest) background.
const CONTRAST_JS = () => {
  const parse = (s) => (s.match(/rgba?\([^)]+\)|#[0-9a-fA-F]{6,8}/g) || []).map((c) => {
    if (c[0] === '#') return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), c.length > 7 ? parseInt(c.slice(7, 9), 16) / 255 : 1];
    const n = c.match(/[\d.]+/g).map(Number); return [n[0], n[1], n[2], n[3] ?? 1];
  });
  const L = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const bgStops = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const before = getComputedStyle(e, '::before');
      // A visible ::before gradient layer (hover fill) counts as background.
      const layers = [];
      // A visible ::before fill (hover layer) covers the element's own background: measure against it alone.
      if (before.content !== 'none' && parseFloat(before.opacity) > 0.5 && before.backgroundImage !== 'none' && e.matches('.btn, .catbar-item')) return parse(before.backgroundImage);
      if (cs.backgroundImage !== 'none') layers.push(...parse(cs.backgroundImage).filter((c) => c[3] > 0.6));
      const bc = parse(cs.backgroundColor)[0];
      if (bc && bc[3] > 0.6) layers.push(bc);
      if (layers.length) return layers;
    }
    return [[255, 255, 255, 1]];
  };
  return (selector) => [...document.querySelectorAll(selector)].filter((el) => el.offsetParent && el.textContent.trim()).map((el) => {
    const fg = parse(getComputedStyle(el).color)[0];
    const stops = bgStops(el);
    const min = Math.min(...stops.map((s) => cr(fg, s)));
    return { sel: selector, text: el.textContent.trim().slice(0, 30), min: +min.toFixed(2) };
  });
};

for (const theme of ['light', 'dark']) {
  const { ctx, page, errors } = await open({ width: 1280, height: 900 });
  await page.evaluate((t) => { document.querySelector(`.pv-seg[data-pref=theme] button[data-val=${t}]`).click(); }, theme);
  await page.waitForTimeout(200);
  if (theme === 'light') check('no console errors / failed requests (desktop)', errors.length === 0, errors.slice(0, 3).join(' | '));

  // Text on gradients, measured from computed styles (rest state).
  const sels = ['.new .btn-primary:not(:disabled)', '.new .btn-danger:not(:disabled)', '.new .btn-accent:not(:disabled)', '.new .btn:not(.btn-primary):not(.btn-danger):not(.btn-accent):not(.btn-glass):not(:disabled)', '.new .tile-band', '.new .cat-band h1', '.new .hdr:not(.over) .catbar-item', '.new .crumbs a', '.new .chip.cat-chip', '.new .badge-featured', '.new .hero h1'];
  const rows = await page.evaluate(({ fn, sels }) => { const f = eval('(' + fn + ')')(); return sels.flatMap((s) => f(s)); }, { fn: CONTRAST_JS.toString(), sels });
  const bad = rows.filter((r) => r.min < 4.5);
  check(`[${theme}] text contrast on button/category gradients ≥ 4.5 (${rows.length} elements)`, bad.length === 0, bad.slice(0, 4).map((b) => `${b.sel} “${b.text}” ${b.min}`).join(' | '));

  // Hover state of a category pill (filled gradient) + hovered primary button.
  await page.hover('.new .hdr:not(.over) .catbar-item[data-cat="3"]');
  await page.waitForTimeout(250);
  const hov = await page.evaluate(({ fn }) => { const f = eval('(' + fn + ')')(); return f('.new .hdr:not(.over) .catbar-item[aria-expanded=true]'); }, { fn: CONTRAST_JS.toString() });
  check(`[${theme}] hovered category pill text ≥ 4.5`, hov.length === 1 && hov[0].min >= 4.5, JSON.stringify(hov));
  const megaOpen = await page.evaluate(() => !!document.querySelector('.new .mega.open'));
  check(`[${theme}] mega-menu opens on hover`, megaOpen);

  if (shots) {
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    for (const id of ['s-header', 's-home', 's-cat', 's-dash', 's-buttons', 's-palette', 's-admin']) {
      const el = await page.$('#' + id);
      await el.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach((r) => r.classList.add('seen')));
      await page.waitForTimeout(350);
      await el.screenshot({ path: path.join(shots, `${theme}-${id}.png`) });
    }
    await page.hover('.new .hdr:not(.over) .catbar-item[data-cat="0"]');
    await page.waitForTimeout(300);
    await (await page.$('#s-header')).screenshot({ path: path.join(shots, `${theme}-s-header-open.png`) });
  }
  await ctx.close();
}

// Function parity: the inline copy in refresh.js gives the same results as the module.
{
  const { ctx, page } = await open({ width: 1280, height: 900 });
  const sample = Array.from({ length: 300 }, (_, i) => '#' + ((i * 2654435761) >>> 8 & 0xffffff).toString(16).padStart(6, '0').toUpperCase()).concat(['#FFFFFF', '#000000', '#7C3AED', '#D99A00']);
  const inPage = await page.evaluate((s) => s.map((h) => window.__rf.deriveCategoryColor(h)), sample);
  const diff = sample.filter((h, i) => JSON.stringify(inPage[i]) !== JSON.stringify(deriveCategoryColor(h)));
  check('refresh.js colour function = derive-category-color.mjs (304 colours)', diff.length === 0, diff.slice(0, 3).join(', '));

  // Admin picker: duplicate refused, similar warned, reserved warned.
  const msg = async (hex) => { await page.fill('[data-slot=hex]', hex); await page.waitForTimeout(50); return page.$$eval('[data-slot=msgs] .msg', (m) => m.map((x) => x.className.split(' ')[1])); };
  await page.selectOption('[data-slot=cat-select]', '2');
  check('picker: colour of another category → error', (await msg('#7C3AED')).includes('err'));
  check('picker: near another category → warning', (await msg('#7A3CEA')).includes('warn'));
  check('picker: near error red → warning', (await msg('#B91C1C')).includes('warn'));
  check('picker: bad format → error', (await msg('#12')).includes('err'));
  check('picker: free colour → ok', (await msg('#FFFFFF')).includes('ok'));
  await ctx.close();
}

// Phone width: no horizontal scroll at 360, in both themes, with the drawer open.
for (const theme of ['light', 'dark']) {
  const { ctx, page, errors } = await open({ width: 360, height: 780 });
  await page.evaluate((t) => document.querySelector(`.pv-seg[data-pref=theme] button[data-val=${t}]`).click(), theme);
  await page.click('.new .hdr:not(.over) .hdr-burger');
  await page.waitForTimeout(200);
  const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  check(`[${theme}] no horizontal scroll at 360 px`, sw.sw <= sw.cw, JSON.stringify(sw));
  if (theme === 'light') check('no console errors (phone)', errors.length === 0, errors.slice(0, 3).join(' | '));
  if (shots && theme === 'light') {
    for (const id of ['s-header', 's-home']) { await page.evaluate(() => document.querySelectorAll('.reveal').forEach((r) => r.classList.add('seen'))); await (await page.$('#' + id)).screenshot({ path: path.join(shots, `phone-${id}.png`) }); }
  }
  await ctx.close();
}

// Reduced motion: device setting is honoured, nothing moves.
{
  const { ctx, page } = await open({ width: 1280, height: 900 }, { reducedMotion: 'reduce' });
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
  await page.reload(); await page.waitForTimeout(300);
  check('device reduced-motion → preview starts in Reduced', (await page.getAttribute('html', 'data-motion')) === 'reduced');
  const card = await page.$('.new .gig');
  await card.scrollIntoViewIfNeeded(); await card.hover(); await page.waitForTimeout(250);
  const st = await page.evaluate(() => {
    const g = document.querySelector('.new .gig:hover') || document.querySelector('.new .gig');
    const img = g.querySelector('img');
    const hero = getComputedStyle(document.querySelector('.new .hero'), '::after');
    const skel = getComputedStyle(document.querySelector('.new .skel'));
    const hidden = [...document.querySelectorAll('.new .reveal')].filter((r) => getComputedStyle(r).opacity !== '1').length;
    return { card: getComputedStyle(g).transform, img: getComputedStyle(img).transform, hero: hero.animationName, skel: skel.animationName, hidden };
  });
  const noMove = (t) => t === 'none' || /^matrix\(1, 0, 0, 1, 0, 0\)$/.test(t);
  check('reduced: hovered card does not move', noMove(st.card), st.card);
  check('reduced: card image does not zoom', noMove(st.img), st.img);
  check('reduced: hero drift off', st.hero === 'none', st.hero);
  check('reduced: skeleton shimmer off', st.skel === 'none', st.skel);
  check('reduced: no content hidden for entrance', st.hidden === 0, String(st.hidden));
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
