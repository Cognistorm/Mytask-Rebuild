import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('admin is never indexed; signed-out staff land on the login page', async ({ page }) => {
  const res = await page.goto('/login');
  expect(res?.headers()['x-robots-tag']).toBe('noindex, nofollow');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ავტორიზაცია');
});

// Needs the full stack (`pnpm preview`) and its console log, where the seed prints the first Super-admin.
const log = process.env.ADMIN_E2E_LOG;
test('Super-admin switches email 2FA (S-056) on and off from the settings screen', async ({
  page,
}) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log (staff already existed)');

  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const s056 = page.getByRole('switch', { name: /^S-056 / });
  const wasOn = await s056.isChecked();
  await s056.click();
  // AC-7: a re-login is asked before a security setting changes.
  await expect(
    page.getByRole('heading', { name: 'გასაგრძელებლად დაადასტურეთ, რომ ეს თქვენ ხართ.' }),
  ).toBeVisible();
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'გაგრძელება' }).click();
  await expect(page.getByText('შენახულია. ახალი მნიშვნელობა ერთ წუთში ამოქმედდება.')).toBeVisible();
  await expect(page.getByRole('switch', { name: /^S-056 / })).toBeChecked({ checked: !wasOn });

  // Restore the Owner's choice (the 15-minute step-up window is still open: no second prompt).
  await page.getByRole('switch', { name: /^S-056 / }).click();
  await expect(page.getByRole('switch', { name: /^S-056 / })).toBeChecked({ checked: wasOn });
});
