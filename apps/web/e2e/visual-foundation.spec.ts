// Visual refresh foundation (ROADMAP 3X.8; visual-refresh.md §3.1, §7, §8.3): the gradient canvas behind every page,
// the motion variables under reduced motion, and the category theme mapping by light/dark. No screen uses the
// category props yet (3X.10+), so the mapping is checked on an element added to the page. 3X.10: the header category
// bar and mega-menu use them (colours from the stand-in API, e2e/fake-catalog.mjs).
import { expect, test, type Page } from '@playwright/test';
import { BASE } from './base';

const canvas = (page: Page) =>
  page.evaluate(() => {
    const s = getComputedStyle(document.body, '::before');
    return {
      image: s.backgroundImage,
      position: s.position,
      zIndex: s.zIndex,
      events: s.pointerEvents,
    };
  });

const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

/** The production build minifies values (`300ms` → `.3s`, `#29807E` → `#29807e`): compare values, not spellings. */
const ms = (v: string) =>
  v.endsWith('ms') ? Number(v.slice(0, -2)) : Number(v.slice(0, -1)) * 1000;

for (const theme of ['light', 'dark'] as const) {
  test(`the page canvas is a fixed gradient layer (${theme})`, async ({ page, context }) => {
    await context.addCookies([{ name: 'mt_theme', value: theme, url: BASE, sameSite: 'Lax' }]);
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const c = await canvas(page);
    expect(c.image).toContain('radial-gradient');
    expect(c.image).toContain('linear-gradient');
    expect(c).toMatchObject({ position: 'fixed', zIndex: '-1', events: 'none' });
  });
}

test('reduced motion: lifts and slides are 0, scales 1, durations capped at fast', async ({
  browser,
}) => {
  for (const [reducedMotion, lift, scale, slow] of [
    ['no-preference', '3px', '1.03', 300],
    ['reduce', '0', '1', 120],
  ] as const) {
    const context = await browser.newContext({ reducedMotion });
    const page = await context.newPage();
    await page.goto('/login');
    expect(await cssVar(page, '--mt-motion-distance-lift-card')).toBe(lift);
    expect(await cssVar(page, '--mt-motion-scale-hover')).toBe(scale);
    expect(ms(await cssVar(page, '--mt-motion-duration-slow'))).toBe(slow);
    await context.close();
  }
});

test('category theme: the inline light/dark set is used by theme; no colour = brand teal', async ({
  page,
}) => {
  await page.goto('/login');
  const solid = () =>
    page.evaluate(() => {
      const read = (el: HTMLElement) =>
        getComputedStyle(el).getPropertyValue('--mt-cat-solid').trim().toUpperCase();
      const themed = document.createElement('div');
      themed.dataset.categoryTheme = '#7C3AED';
      themed.style.setProperty('--mt-cat-l-solid', '#7C3AED');
      themed.style.setProperty('--mt-cat-d-solid', '#A78BFA');
      const brand = document.createElement('div');
      brand.dataset.categoryTheme = 'brand';
      document.body.append(themed, brand);
      const out = { themed: read(themed), brand: read(brand) };
      themed.remove();
      brand.remove();
      return out;
    });
  expect(await solid()).toEqual({ themed: '#7C3AED', brand: '#29807E' });
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'));
  expect(await solid()).toEqual({ themed: '#A78BFA', brand: '#52B3B0' });
});

test('header category bar: each pill and the mega-menu take their category colour; the current one is filled', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en/categories/programming');
  const bar = page.getByRole('navigation', { name: 'Categories' });
  const design = bar.getByRole('button', { name: 'Design' });
  // The pill's <li> carries the theme; the derived solid is contrast-adjusted, so it is only compared with the brand.
  await expect(design.locator('xpath=..')).toHaveAttribute('data-category-theme', '#7C3AED');
  const solid = await design.evaluate((el) =>
    getComputedStyle(el).getPropertyValue('--mt-cat-solid').trim().toUpperCase(),
  );
  expect(solid).not.toBe('#29807E');

  // On a category's pages its pill is filled (the gradient layer shown), the others rest on their tint.
  const programming = bar.getByRole('link', { name: 'Programming' });
  await expect(programming).toHaveAttribute('data-current', '');
  const layer = (el: Element) => getComputedStyle(el, '::after').opacity;
  expect(await programming.evaluate(layer)).toBe('1');
  expect(await design.evaluate(layer)).toBe('0');

  // The mega-menu is themed by the open category.
  await design.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('mega-menu')).toHaveAttribute('data-category-theme', '#7C3AED');
});
