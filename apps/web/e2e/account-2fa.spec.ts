// Task 3.17g: the web 2FA switch for an account without a password (emailed `toggle_two_factor` code, as the
// app, task 3.12), and SEC-48: link tokens leave the address bar on the reset and verify pages.
import { expect, test, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  fullName: 'Social Only',
  username: 'social_only',
  email: 'social@example.com',
  referralCode: 'ABCD1234',
  hasPassword: false,
  twoFactorAvailable: true,
  twoFactorEnabled: false,
  isRestricted: false,
};

test('account without a password switches 2FA on with an emailed code (en)', async ({ page }) => {
  let enabled = false;
  const sent: unknown[] = [];
  const puts: unknown[] = [];
  await page.route('**/api/v1/me', (route) =>
    json(route, 200, { ...ME, twoFactorEnabled: enabled }),
  );
  await page.route('**/api/v1/me/two-factor/challenges', (route) => {
    sent.push(route.request().postDataJSON());
    return json(route, 202, {
      challengeId: '01900000-0000-7000-8000-0000000000bb',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
      notice: {
        messageKey: 't_2fa_code_sent',
        message: 'We sent a 6-digit code to s***@example.com.',
        params: {},
      },
    });
  });
  await page.route('**/api/v1/me/two-factor', (route) => {
    puts.push(route.request().postDataJSON());
    enabled = true;
    return json(route, 200, {
      enabled: true,
      available: true,
      notice: {
        messageKey: 't_2fa_enabled',
        message: 'Two-factor authentication is on.',
        params: {},
      },
    });
  });

  await page.goto('/en/account');
  await expect(page.getByLabel('Enter your current password to continue.')).toHaveCount(0);
  await page.getByTestId('twofa-send-code').click();
  expect(sent).toEqual([{ purpose: 'toggle_two_factor' }]);
  await expect(page.getByText('We sent a 6-digit code to s***@example.com.')).toBeVisible();
  await expect(page.getByRole('button', { name: /You can request a new code in/ })).toBeDisabled();
  await page.locator('.auth-code input').first().click();
  await page.keyboard.type('123456');
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await expect(page.getByTestId('twofa-state')).toHaveText('Two-factor authentication is on.');
  expect(puts).toEqual([
    { enabled: true, challengeId: '01900000-0000-7000-8000-0000000000bb', code: '123456' },
  ]);
});

test('reset link: the token is sent once and removed from the address bar (SEC-48)', async ({
  page,
}) => {
  const bodies: unknown[] = [];
  await page.route('**/api/v1/auth/password-reset/validate', (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ status: 204 });
  });
  await page.goto('/en/auth/password/update?token=secret-token-1&email=a%40example.com');
  await expect(page).toHaveURL(/\/en\/auth\/password\/update$/);
  expect(bodies[0]).toEqual({ token: 'secret-token-1', email: 'a@example.com' });
});

test('verify link: the token is removed from the address bar (SEC-48)', async ({ page }) => {
  const bodies: unknown[] = [];
  await page.route('**/api/v1/auth/email-verification/confirm', (route) => {
    bodies.push(route.request().postDataJSON());
    return json(route, 422, { code: 'AUTH_LINK_INVALID', message: 'This link is not valid.' });
  });
  await page.goto('/en/auth/verify?token=secret-token-2&email=a%40example.com');
  await expect(page.getByText('This link is not valid.')).toBeVisible();
  await expect(page).toHaveURL(/\/en\/auth\/verify$/);
  expect(bodies[0]).toEqual({ token: 'secret-token-2', email: 'a@example.com' });
});
