// Visual refresh foundation (ROADMAP 3X.8; visual-refresh.md §3.1): admin shares the gradient canvas layer.
import { expect, test } from '@playwright/test';

test('the admin canvas is a fixed gradient layer', async ({ page }) => {
  await page.goto('/login');
  const c = await page.evaluate(() => {
    const s = getComputedStyle(document.body, '::before');
    return { image: s.backgroundImage, position: s.position, zIndex: s.zIndex };
  });
  expect(c.image).toContain('linear-gradient');
  expect(c).toMatchObject({ position: 'fixed', zIndex: '-1' });
});

test('a switch that is on shows the Primary gradient, not the off track (3X.15b)', async ({
  page,
}) => {
  await page.goto('/login');
  const bg = await page.evaluate(() => {
    const make = (checked: boolean) => {
      const el = document.createElement('input');
      el.type = 'checkbox';
      el.setAttribute('role', 'switch');
      el.checked = checked;
      document.body.append(el);
      return getComputedStyle(el).backgroundImage;
    };
    return { off: make(false), on: make(true) };
  });
  expect(bg.on).toContain('linear-gradient');
  expect(bg.on).not.toBe(bg.off);
});
