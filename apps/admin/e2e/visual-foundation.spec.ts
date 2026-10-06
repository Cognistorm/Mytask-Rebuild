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
