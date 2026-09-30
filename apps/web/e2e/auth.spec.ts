// Slice 01 main flow in a real browser (CLAUDE.md: every screen has an E2E test). Needs the whole stack:
// run `pnpm preview` (or docker + pnpm dev with MAIL_TRANSPORT=log) and set AUTH_E2E_MAIL_LOG to the file
// that receives its output, so the test can read the emailed 6-digit code.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const mailLog = process.env.AUTH_E2E_MAIL_LOG;
test.skip(!mailLog, 'needs the full stack (AUTH_E2E_MAIL_LOG)');

function latestCode(email: string): string {
  const log = readFileSync(mailLog!, 'utf8');
  const blocks = log.split('[email EV-06]').filter((b) => b.includes(`to=${email}`));
  const code = /(\d{6})/.exec(blocks.at(-1) ?? '')?.[1];
  if (!code) throw new Error('no code in the mail log yet');
  return code;
}

test('register, 2FA on, logout, login with the emailed code (ka)', async ({ page }) => {
  const n = Date.now().toString(36);
  const email = `e2e_${n}@example.com`;
  const password = 'Secret123';

  await page.goto('/auth/register');
  await page.getByLabel('სახელი და გვარი').fill('E2E Tester');
  await page.getByLabel('მომხმარებელი').fill(`e2e_${n}`);
  await page.getByLabel('ელ-ფოსტა').fill(email);
  await page.getByLabel('პაროლი', { exact: true }).fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'რეგისტრაცია' }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(`e2e_${n}`, { exact: true })).toBeVisible();

  // The global switch S-056 is OFF locally until the Owner turns it on in the admin panel (2026-09-30).
  test.skip(
    !(await page.getByTestId('twofa-state').isVisible()),
    'S-056 (email 2FA) is switched off in this environment',
  );
  // Turn on 2FA (AC-21: re-authentication with the password).
  await page.getByLabel('გასაგრძელებლად შეიყვანეთ ამჟამინდელი პაროლი.').fill(password);
  await page.getByRole('button', { name: 'გაგზავნა' }).click();
  await expect(page.getByTestId('twofa-state')).toHaveText('ორსაფეხურიანი ავტორიზაცია ჩართულია.');

  // Logout, then clear the device cookie so this browser is a NEW device (AC-22).
  await page.getByRole('button', { name: 'გასვლა' }).click();
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.context().clearCookies();

  await page.goto('/auth/login');
  await page.getByLabel('ელ-ფოსტა').fill(email);
  await page.getByLabel('პაროლი', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page.getByRole('heading', { name: 'შეიყვანეთ დადასტურების კოდი' })).toBeVisible();

  await expect
    .poll(
      () => {
        try {
          return latestCode(email);
        } catch {
          return '';
        }
      },
      { timeout: 15_000 },
    )
    .toMatch(/^\d{6}$/);
  const code = latestCode(email);
  await page.locator('.auth-code input').first().click();
  await page.keyboard.type(code);
  await page.getByRole('button', { name: 'გაგრძელება' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
});

test('wrong password shows the legacy message; English works under /en', async ({ page }) => {
  await page.goto('/en/auth/login');
  await page.getByLabel('E-mail address').fill('nobody@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Wrong1234');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.locator('.auth-alert')).toContainText('Invalid login credentials');
});

test('login ignores an off-site ?next= (SEC-33)', async ({ page }) => {
  const n = Date.now().toString(36);
  await page.goto('/en/auth/register');
  await page.getByLabel('Fullname').fill('Next Test');
  await page.getByLabel('Username').fill(`nx_${n}`);
  await page.getByLabel('E-mail address').fill(`nx_${n}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('Secret123');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  await page.getByRole('button', { name: 'Logout' }).click();
  await page.goto('/en/auth/login?next=//evil.example/steal');
  await page.getByLabel('E-mail address').fill(`nx_${n}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('Secret123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/localhost:3100\/en\/account$/);
});
