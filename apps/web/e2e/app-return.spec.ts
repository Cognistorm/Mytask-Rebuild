// `/app-return/auth/{provider}` (task 3.7b, url-map §7, ADR-002 §7): the app's social-login return opened in a
// browser without the app. The page only tells the visitor to finish in the app: it never calls the API with
// the one-time code (only the app holds the PKCE verifier, SEC-09), is not indexed, and sends no Referer.
import { expect, test, type Page } from '@playwright/test';

/** Records every API call the page makes. */
function watchApi(page: Page): string[] {
  const calls: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname.startsWith('/api/')) calls.push(req.url());
  });
  return calls;
}

test('ka: notice to open the app, the code is never sent anywhere', async ({ page }) => {
  const calls = watchApi(page);
  const res = await page.goto('/app-return/auth/google?code=code-1&state=state-1');
  expect(res?.status()).toBe(200);

  await expect(
    page.getByRole('heading', { name: 'გააგრძელეთ MyTask-ის აპლიკაციაში' }),
  ).toBeVisible();
  await expect(page.getByText('ეს შესვლა MyTask-ის აპლიკაციაში დაიწყო.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ავტორიზაცია' })).toHaveAttribute(
    'href',
    '/auth/login',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');

  await page.waitForLoadState('networkidle');
  expect(calls).toEqual([]);
});

test('en: English notice; no request (assets, prefetch, Login) carries the code in a Referer', async ({
  page,
}) => {
  const referers: string[] = [];
  page.on('request', (req) => {
    const referer = req.headers()['referer'];
    if (referer) referers.push(referer);
  });
  const res = await page.goto('/en/app-return/auth/twitter?code=code-2&state=state-2');
  expect(res?.headers()['referrer-policy']).toBe('no-referrer');
  expect(res?.headers()['x-robots-tag']).toContain('noindex');
  await expect(page.getByRole('heading', { name: 'Continue in the MyTask app' })).toBeVisible();
  await expect(page.getByText(/Open the app to finish it/)).toBeVisible();

  await page.getByRole('link', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/en\/auth\/login$/);
  expect(referers.filter((r) => r.includes('code-2'))).toEqual([]);
});

test('unknown provider: 404', async ({ page }) => {
  const res = await page.goto('/app-return/auth/myspace?code=x&state=y');
  expect(res?.status()).toBe(404);
});
