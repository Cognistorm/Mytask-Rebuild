// Account → Password on the web (spec 01 AC-35, AC-55, EC-3; task 3.8). The API side (hashing, other
// sessions ended, trusted devices forgotten, EV-05, throttle) is covered by the API tests; here the real page
// runs against a routed API, so the flow needs no stack.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  fullName: 'Password Tester',
  username: 'pw_tester',
  email: 'pw@example.com',
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
};

/** Routes getMe and changeMyPassword; returns the bodies sent to changeMyPassword. */
async function fakeApi(
  page: Page,
  opts: { me?: Partial<typeof ME> | null; change?: (route: Route) => Promise<void> } = {},
) {
  const sent: Record<string, unknown>[] = [];
  await page.route('**/api/v1/me', (route) =>
    opts.me === null
      ? json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' })
      : json(route, 200, { ...ME, ...opts.me }),
  );
  await page.route('**/api/v1/me/password', async (route) => {
    sent.push(route.request().postDataJSON() as Record<string, unknown>);
    await (opts.change
      ? opts.change(route)
      : json(route, 200, {
          messageKey: 't_ur_account_password_updated',
          message: 'Your password has been successfully updated',
          params: {},
        }));
  });
  return sent;
}

async function fill(page: Page, current: string, next: string, confirm = next) {
  await page.getByLabel('Current password').fill(current);
  await page.getByLabel('New password').fill(next);
  await page.getByLabel('Password confirmation').fill(confirm);
  await page.getByRole('button', { name: 'Update', exact: true }).click();
}

test('success (en): sends the three fields once, shows the notice and clears the form', async ({
  page,
}) => {
  const sent = await fakeApi(page);
  await page.goto('/en/account');
  await page.getByRole('link', { name: 'Change password' }).click();
  await expect(page).toHaveURL(/\/en\/account\/password$/);
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible();

  await fill(page, 'OldPass123', 'NewPass456');
  await expect(page.locator('.auth-alert-success')).toHaveText(
    'Your password has been successfully updated',
  );
  expect(sent).toEqual([
    { currentPassword: 'OldPass123', password: 'NewPass456', passwordConfirmation: 'NewPass456' },
  ]);
  await expect(page.getByLabel('Current password')).toHaveValue('');
  await expect(page.getByLabel('New password')).toHaveValue('');
  await expect(page.getByLabel('Password confirmation')).toHaveValue('');
});

test('wrong current password (ka): the field error is shown next to the field', async ({
  page,
}) => {
  await fakeApi(page, {
    change: (route) =>
      json(route, 400, {
        code: 'VALIDATION_FAILED',
        message: 'მონაცემები არასწორია',
        details: { fields: [{ field: 'currentPassword', message: 'პაროლი არასწორია' }] },
      }),
  });
  await page.goto('/account/password');
  await expect(page.getByRole('heading', { name: 'პაროლის ცვლილება' })).toBeVisible();
  await page.getByLabel('ამჟამინდელი პაროლი').fill('Wrong1234');
  await page.getByLabel('ახალი პაროლი').fill('NewPass456');
  await page.getByLabel('დაადასტურეთ პაროლი').fill('NewPass456');
  await page.getByRole('button', { name: 'განახლება', exact: true }).click();

  const current = page.getByLabel('ამჟამინდელი პაროლი');
  await expect(current).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.auth-error')).toHaveText('პაროლი არასწორია');
  // The typed values stay so the user can correct them.
  await expect(page.getByLabel('ახალი პაროლი')).toHaveValue('NewPass456');
});

test('too many wrong passwords (AC-55): the lock message is shown as a general error', async ({
  page,
}) => {
  await fakeApi(page, {
    change: (route) =>
      json(route, 429, {
        code: 'RATE_LIMITED',
        message: 'Too many failed login attempts. Please try again in 15 minutes.',
        details: { retryAfterSeconds: 900 },
      }),
  });
  await page.goto('/en/account/password');
  await fill(page, 'OldPass123', 'NewPass456');
  await expect(page.locator('.auth-alert-error')).toHaveText(
    'Too many failed login attempts. Please try again in 15 minutes.',
  );
});

test('social-only account (EC-3): notice instead of the form', async ({ page }) => {
  const sent = await fakeApi(page, { me: { hasPassword: false } });
  await page.goto('/en/account/password');
  await expect(
    page.getByText('Your account signs in with a social network, so it has no password to change.'),
  ).toBeVisible();
  await expect(page.getByLabel('Current password')).toHaveCount(0);
  expect(sent).toEqual([]);
});

test('signed out: sent to login with the page as next', async ({ page }) => {
  await fakeApi(page, { me: null });
  await page.goto('/en/account/password');
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=\/en\/account\/password$/);
});
