import { expect, test } from '@playwright/test';

test('admin shell renders and is never indexed', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('მართვის პანელი');
  await expect(page.getByTestId('api-status')).toBeVisible();
});
