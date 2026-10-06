import { expect, test } from '@playwright/test';

test('Georgian is the unprefixed default', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('იპოვე საუკეთესო ფრილანსერი');
});

test('English lives under /en', async ({ page }) => {
  await page.goto('/en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find the best Freelancer');
});

test('/ka is not a public URL: 301 to the unprefixed page', async ({ request }) => {
  const res = await request.get('/ka', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe('/');
});

test('a guessed internal rewrite marker does not skip the proxy (3X.15b)', async ({ request }) => {
  const res = await request.get('/ka/login', {
    maxRedirects: 0,
    headers: { 'x-mt-rewritten': 'guess' },
  });
  expect(res.status()).toBe(301);
  const page = await request.get('/', { headers: { 'x-mt-rewritten': 'guess' } });
  expect(page.headers()['content-security-policy']).toContain("'nonce-");
});

test('trailing slash and /ka prefix are fixed in one 301 hop (url-map §1, QA P3 BUG-11)', async ({
  request,
}) => {
  for (const [from, to] of [
    ['/ka/', '/'],
    ['/ka/login/', '/login'],
    ['/en/', '/en'],
    ['/login/?next=x', '/login?next=x'],
  ] as const) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    const location = new URL(res.headers()['location']!, 'http://x');
    expect(location.pathname + location.search, from).toBe(to);
  }
});

test('no horizontal scroll at 360 px (mobile)', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
