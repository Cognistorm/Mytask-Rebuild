import { expect, test } from '@playwright/test';

test('Georgian is the unprefixed default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('მთავარი');
  await expect(page.getByTestId('api-status')).toBeVisible();
});

test('English lives under /en', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
});

test('/ka is not a public URL: 301 to the unprefixed page', async ({ request }) => {
  const res = await request.get('/ka', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe('/');
});

test('no horizontal scroll at 360 px (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
