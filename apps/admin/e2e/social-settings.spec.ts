// Social-login provider rows (S-065…S-069; ADR-005 §8, Q-155; spec 16 AC-54, 00 EC-10) on the settings screen.
// Needs the full stack (`pnpm preview`) and the log with the seeded owner password. Leaves Google OFF, no keys.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const log = process.env.ADMIN_E2E_LOG;

test('Google login keys: ON without keys refused, saved secret shown only as "set", then cleared', async ({
  page,
}) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log');

  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  const google = page.getByTestId('social-S-065');
  await expect(google.getByText('Client secret: არ არის შენახული')).toBeVisible();

  // EC-10: switching ON without keys is refused (after the re-login the security rows need).
  await google.getByRole('switch').check();
  await google.getByRole('button', { name: 'შენახვა' }).click();
  const reauth = page.getByRole('heading', {
    name: 'გასაგრძელებლად დაადასტურეთ, რომ ეს თქვენ ხართ.',
  });
  const refused = page.getByText('ამ შესვლის ჩართვამდე შეიყვანეთ client ID და client secret.');
  await expect(reauth.or(refused)).toBeVisible();
  if (await reauth.isVisible()) {
    await page.getByLabel('პაროლი', { exact: true }).fill(password!);
    await page.getByRole('button', { name: 'გაგრძელება' }).click();
  }
  await expect(refused).toBeVisible();

  // Keys saved: the secret is never shown back, only "set".
  await google.getByRole('switch').check();
  await google.getByLabel('Client ID').fill('e2e-client-id');
  await google.getByLabel(/ახალი client secret/).fill('e2e-secret-value');
  await google.getByRole('button', { name: 'შენახვა' }).click();
  await expect(google.getByText('Client secret: შენახულია')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('e2e-secret-value');

  // Restore: OFF, no client ID, secret cleared.
  await google.getByRole('switch').uncheck();
  await google.getByLabel('Client ID').fill('');
  await google.getByLabel('client secret-ის წაშლა').check();
  await google.getByRole('button', { name: 'შენახვა' }).click();
  await expect(google.getByText('Client secret: არ არის შენახული')).toBeVisible();
});
