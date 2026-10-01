// QA 3.15 BUG-01…BUG-04 (task 3.17h): the auth panels keep the live site's structure — subtitle, "back to
// homepage", the link list, register field order, the legacy terms sentence with links, per-page titles.
import { expect, test } from '@playwright/test';

test('login (en): subtitle, back to homepage, legacy link list, page title', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/en/auth/login');
  await expect(page).toHaveTitle('Login | MyTask');
  await expect(page.getByText('Please sign in to continue')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to homepage' })).toHaveAttribute('href', '/en');
  const list = page.locator('.auth-links');
  for (const [name, path] of [
    ['Create account', '/en/auth/register'],
    ['Forgot password?', '/en/auth/password/reset'],
    ['Resend verification email', '/en/auth/request'],
    ['Privacy policy', '/en/page/privacy-policy'],
    ['Terms of service', '/en/page/terms-of-service'],
  ] as const) {
    await expect(list.getByRole('link', { name })).toHaveAttribute('href', path);
  }
});

test('register (ka): email before username, legacy terms sentence with links, list', async ({
  page,
}) => {
  await page.goto('/auth/register');
  await expect(page).toHaveTitle('რეგისტრაცია | MyTask');
  const labels = await page.locator('form label').allTextContents();
  const email = labels.findIndex((l) => l.includes('ელ-ფოსტა'));
  const username = labels.findIndex((l) => l.includes('მომხმარებელი'));
  expect(email).toBeGreaterThanOrEqual(0);
  expect(email).toBeLessThan(username);
  await expect(page.getByRole('link', { name: 'კონფიდენციალურობის პოლიტიკას' })).toHaveAttribute(
    'href',
    '/page/privacy-policy',
  );
  await expect(page.getByRole('link', { name: 'მომსახურების პირობებს' })).toHaveAttribute(
    'href',
    '/page/terms-of-service',
  );
  await expect(page.locator('form')).not.toContainText('<a');
  await expect(
    page.locator('.auth-links').getByRole('link', { name: 'ავტორიზაცია' }),
  ).toBeVisible();
});

test('forgot password and resend verification: subtitles and "back to sign in"', async ({
  page,
}) => {
  await page.goto('/en/auth/password/reset');
  await expect(page).toHaveTitle('Reset password | MyTask');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await expect(page.getByText(/send you instructions on how to reset your password/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
  await page.goto('/en/auth/request');
  await expect(page.getByText(/To resend the verification email/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to sign in' })).toBeVisible();
});
