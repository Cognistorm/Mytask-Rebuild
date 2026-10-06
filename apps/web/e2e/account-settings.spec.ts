// Account settings on the web (spec 02 AC-29…AC-35, EC-12, task 4.1.20a) and the email-change link page
// (AC-30). The API rules (unique checks, password/code checks, link expiry, deletion guards) are covered by the
// API tests; here the real page runs against a routed API with state.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  fullName: 'Nino Beridze',
  username: 'nino_b',
  email: 'nino@example.com',
  pendingEmail: null as string | null,
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'buying',
  avatar: null,
  kycStatus: 'none',
  countryCode: null as string | null,
  city: null as string | null,
  createdAt: '2023-05-10T08:00:00Z',
};

const fieldError = (field: string, message: string) => ({
  code: 'VALIDATION_FAILED',
  message,
  details: { fields: [{ field, code: 'invalid', message }] },
});

/** Routes getMe, getPublicConfig, updateMe, the code challenge and deleteMe, keeping the state. */
async function fakeApi(page: Page, opts: { me?: Partial<typeof ME> } = {}) {
  const me = { ...ME, ...opts.me };
  const sent = { updates: [] as Record<string, unknown>[], challenges: 0, deletes: 0 };
  let deleteAnswer: 'refuse' | 'ok' = 'refuse';

  await page.route('**/api/v1/me', async (route) => {
    const method = route.request().method();
    if (method === 'GET') return json(route, 200, me);
    if (method === 'DELETE') {
      sent.deletes += 1;
      if (deleteAnswer === 'refuse') {
        return json(route, 422, {
          code: 'BUSINESS_RULE_VIOLATION',
          message: 'You cannot delete your account while you have active orders or projects.',
          details: { messageKey: 't_cannot_delete_account_active_orders_projects' },
        });
      }
      return route.fulfill({ status: 204 });
    }
    const body = route.request().postDataJSON() as Record<string, string | null | undefined>;
    sent.updates.push(body);
    if (me.hasPassword && body.currentPassword !== 'Secret123') {
      return json(
        route,
        400,
        fieldError('currentPassword', 'Your current password does not match our records'),
      );
    }
    if (body.username === 'taken_name') {
      return json(route, 400, fieldError('username', 'The username has already been taken.'));
    }
    if (!me.hasPassword && body.email && body.code !== '123456') {
      return json(route, 422, {
        code: 'TWO_FACTOR_CODE_INVALID',
        message: 'The code is incorrect.',
      });
    }
    const { email, currentPassword: _p, challengeId: _c, code: _code, ...rest } = body;
    Object.assign(me, rest);
    if (email) me.pendingEmail = email;
    return json(route, 200, me);
  });
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
    }),
  );
  await page.route('**/api/v1/me/two-factor/challenges', (route) => {
    sent.challenges += 1;
    return json(route, 202, {
      challengeId: '01900000-0000-7000-8000-0000000000c1',
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
      notice: {
        messageKey: 't_2fa_code_sent',
        message: 'We sent a 6-digit code to n***@example.com.',
        params: {},
      },
    });
  });
  return {
    me,
    sent,
    allowDelete: () => {
      deleteAnswer = 'ok';
    },
  };
}

async function fillCode(page: Page, code: string) {
  const boxes = page.getByRole('group', { name: 'Verification code' }).locator('input');
  for (let i = 0; i < code.length; i += 1) await boxes.nth(i).fill(code[i]!);
}

test('phones: the form comes before the account card, which stays below it with the theme switch (QA 4.1.26 BUG-03)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fakeApi(page);
  await page.goto('/en/account/settings');
  const form = page.getByTestId('settings-form');
  const nav = page.getByRole('navigation', { name: 'Account settings' });
  await expect(form).toBeVisible();
  await expect(nav).toBeAttached();
  const formBox = await form.boundingBox();
  const navBox = await nav.boundingBox();
  expect(formBox!.y).toBeLessThan(navBox!.y);
  expect(formBox!.y).toBeLessThan(844);

  // Desktop keeps the legacy side card on the left.
  await page.setViewportSize({ width: 1280, height: 900 });
  const wideForm = await form.boundingBox();
  const wideNav = await nav.boundingBox();
  expect(wideNav!.x).toBeLessThan(wideForm!.x);
});

test('opens from the account menu; fields prefilled; account links with the current page marked (AC-29, AC-35)', async ({
  page,
}) => {
  await fakeApi(page, { me: { countryCode: 'GE', city: 'Tbilisi' } });
  await page.goto('/en/account/projects');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByTestId('menu-settings').click();
  await expect(page).toHaveURL(/\/en\/account\/settings$/);
  await expect(page).toHaveTitle(/^Account settings \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Account settings' })).toBeVisible();

  const form = page.getByTestId('settings-form');
  await expect(form.getByLabel('Username')).toHaveValue('nino_b');
  await expect(form.getByLabel('E-mail address')).toHaveValue('nino@example.com');
  await expect(form.getByLabel('Fullname')).toHaveValue('Nino Beridze');
  // No country field (Georgia only, Owner 2026-10-02, ADR-021).
  await expect(form.getByLabel('Country')).toHaveCount(0);
  await expect(form.getByLabel('City')).toHaveValue('Tbilisi');
  await expect(form.getByLabel('Password', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Account settings' });
  await expect(nav.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  for (const [name, path] of [
    ['Edit profile', '/en/account/profile'],
    ['Update password', '/en/account/password'],
    ['Verification center', '/en/account/verification'],
    ['Browser sessions', '/en/account/sessions'],
  ]) {
    await expect(nav.getByRole('link', { name })).toHaveAttribute('href', path!);
  }
  await expect(nav.getByRole('button', { name: 'Logout' })).toBeVisible();
});

test('saves only the changed fields with the current password; wrong password and taken username show under their field (AC-29, AC-31)', async ({
  page,
}) => {
  const api = await fakeApi(page);
  await page.goto('/en/account/settings');
  const form = page.getByTestId('settings-form');

  await form.getByLabel('Username').fill('taken_name');
  await form.getByLabel('Password', { exact: true }).fill('wrong');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('Your current password does not match our records');

  await form.getByLabel('Password', { exact: true }).fill('Secret123');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('The username has already been taken.');

  await form.getByLabel('Username').fill('nino_new');
  await form.getByLabel('City').fill('  Batumi ');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('Your account settings has been successfully updated');
  expect(api.sent.updates.at(-1)).toEqual({
    username: 'nino_new',
    city: 'Batumi',
    currentPassword: 'Secret123',
  });
  await expect(form.getByLabel('Password', { exact: true })).toHaveValue('');
  // The account menu shows the new username at once.
  await expect(page.getByTestId('account-menu-name')).toHaveText('nino_new');
});

test('an email change waits for its link: pending message, banner after a reload (AC-30, P-18)', async ({
  page,
}) => {
  const api = await fakeApi(page);
  await page.goto('/en/account/settings');
  const form = page.getByTestId('settings-form');
  await form.getByLabel('E-mail address').fill('nino.new@example.com');
  await form.getByLabel('Password', { exact: true }).fill('Secret123');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText(
    'We sent a confirmation link to nino.new@example.com. Your email will change after you confirm it.',
  );
  expect(api.sent.updates.at(-1)).toEqual({
    email: 'nino.new@example.com',
    currentPassword: 'Secret123',
  });
  // The field shows the current address again; the new one is pending.
  await expect(form.getByLabel('E-mail address')).toHaveValue('nino@example.com');
  await expect(page.getByTestId('pending-email')).toHaveCount(0);

  await page.reload();
  await expect(page.getByTestId('pending-email')).toHaveText(
    'We sent a confirmation link to nino.new@example.com. Your email will change after you confirm it.',
  );
});

test('account without a password: no password field; other fields save without a code; an email change needs the emailed code (AC-29, EC-12, Q-144)', async ({
  page,
}) => {
  const api = await fakeApi(page, { me: { hasPassword: false } });
  await page.goto('/en/account/settings');
  const form = page.getByTestId('settings-form');
  await expect(form.getByLabel('Password', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('email-code')).toHaveCount(0);

  await form.getByLabel('City').fill('Kutaisi');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('Your account settings has been successfully updated');
  expect(api.sent.updates.at(-1)).toEqual({ city: 'Kutaisi' });

  await form.getByLabel('E-mail address').fill('nino.new@example.com');
  await expect(page.getByTestId('email-code')).toContainText(
    'Enter the code we sent to your email to continue.',
  );
  await expect(form.getByRole('button', { name: 'Update' })).toBeDisabled();
  await page.getByTestId('send-code').click();
  await expect(form).toContainText('We sent a 6-digit code to n***@example.com.');
  expect(api.sent.challenges).toBe(1);
  await expect(page.getByTestId('send-code')).toBeDisabled();

  await fillCode(page, '000000');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('The code is incorrect.');

  await fillCode(page, '123456');
  await form.getByRole('button', { name: 'Update' }).click();
  await expect(form).toContainText('We sent a confirmation link to nino.new@example.com.');
  expect(api.sent.updates.at(-1)).toEqual({
    email: 'nino.new@example.com',
    challengeId: '01900000-0000-7000-8000-0000000000c1',
    code: '123456',
  });
  await expect(page.getByTestId('email-code')).toHaveCount(0);
});

test('delete account: legacy warning dialog; a refusal shows its reason; success leaves for the home page (AC-32…AC-34)', async ({
  page,
}) => {
  const api = await fakeApi(page);
  await page.goto('/en/account/settings');
  await page.getByTestId('delete-account').click();
  const dialog = page.getByTestId('delete-account-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Before deleting your account, please make sure');

  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(api.sent.deletes).toBe(0);

  await page.getByTestId('delete-account').click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toContainText(
    'You cannot delete your account while you have active orders or projects.',
  );

  api.allowDelete();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await page.waitForURL(/\/en$/);
  expect(api.sent.deletes).toBe(2);
});

test('signed out: the settings page sends the visitor to login and back', async ({ page }) => {
  await page.route('**/api/v1/me', (route) =>
    json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' }),
  );
  await page.route('**/api/v1/auth/refresh', (route) =>
    json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' }),
  );
  await page.goto('/en/account/settings');
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Faccount%2Fsettings$/);
});

test('email-change link: success signed in links to settings; the token leaves the address bar (AC-30)', async ({
  page,
}) => {
  const tokens: string[] = [];
  await page.route('**/api/v1/auth/email-change/confirm', (route) => {
    tokens.push((route.request().postDataJSON() as { token: string }).token);
    return json(route, 200, {
      messageKey: 't_email_changed_success',
      message: 'Your email address has been changed.',
      params: {},
    });
  });
  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  await page.goto('/en/auth/email-change?token=tok_0123456789abcdef');
  await expect(page.getByRole('status')).toContainText('Your email address has been changed.');
  await expect(page.getByRole('link', { name: 'Account settings' })).toHaveAttribute(
    'href',
    '/en/account/settings',
  );
  expect(tokens).toEqual(['tok_0123456789abcdef']);
  expect(new URL(page.url()).search).toBe('');
  await expect(page).toHaveTitle(/^Confirm new email \| /);
});

test('email-change link: expired link shows its message; signed out success links to login', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/email-change/confirm', (route) =>
    json(route, 422, {
      code: 'AUTH_LINK_EXPIRED',
      message: 'This email change link has expired. Please change your email again in Settings.',
    }),
  );
  await page.goto('/en/auth/email-change?token=tok_expired_0123456789');
  await expect(page.locator('.auth-alert-error')).toContainText(
    'This email change link has expired.',
  );

  await page.unroute('**/api/v1/auth/email-change/confirm');
  await page.route('**/api/v1/auth/email-change/confirm', (route) =>
    json(route, 200, {
      messageKey: 't_email_changed_success',
      message: 'Your email address has been changed.',
      params: {},
    }),
  );
  await page.route('**/api/v1/me', (route) =>
    json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' }),
  );
  await page.route('**/api/v1/auth/refresh', (route) =>
    json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' }),
  );
  await page.goto('/en/auth/email-change?token=tok_valid_0123456789ab');
  await expect(page.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/en/auth/login');
});
