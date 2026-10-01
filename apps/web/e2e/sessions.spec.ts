// Account → Browser sessions on the web (spec 01 AC-43, AC-44, AC-55; task 3.9). The API side (listing, ending
// the other sessions, deny-list, throttle, emailed code) is covered by the API tests; here the real page runs
// against a routed API, so the flow needs no stack.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  fullName: 'Sessions Tester',
  username: 'sessions_tester',
  email: 'sessions@example.com',
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
};

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

const CURRENT = {
  id: '01900000-0000-7000-8000-000000000001',
  client: 'web',
  deviceLabel: null,
  browser: 'Chrome',
  os: 'Windows',
  ip: '203.0.113.10',
  countryCode: 'GE',
  createdAt: minutesAgo(60),
  lastActiveAt: minutesAgo(0),
  isCurrent: true,
};
const OTHER_WEB = {
  ...CURRENT,
  id: '01900000-0000-7000-8000-000000000002',
  browser: 'Firefox',
  os: 'Linux',
  ip: '198.51.100.7',
  lastActiveAt: minutesAgo(5),
  isCurrent: false,
};
const PHONE = {
  ...CURRENT,
  id: '01900000-0000-7000-8000-000000000003',
  client: 'ios',
  deviceLabel: 'iPhone 15',
  browser: null,
  os: 'iOS',
  ip: '198.51.100.8',
  lastActiveAt: minutesAgo(180),
  isCurrent: false,
};

const CHALLENGE = {
  challengeId: '01900000-0000-7000-8000-0000000000aa',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
  notice: {
    messageKey: 't_2fa_code_sent',
    message: 'We sent a 6-digit code to your email.',
    params: {},
  },
};

/** Routes getMe, listMySessions, createMyTwoFactorChallenge and revokeMyOtherSessions. */
async function fakeApi(
  page: Page,
  opts: {
    me?: Partial<typeof ME> | null;
    lists?: unknown[][];
    listFails?: number;
    revoke?: (route: Route) => Promise<void>;
  } = {},
) {
  const calls = { lists: 0, revoke: [] as unknown[], challenges: [] as unknown[] };
  const lists = opts.lists ?? [[CURRENT, OTHER_WEB, PHONE], [CURRENT]];
  await page.route('**/api/v1/me', (route) =>
    opts.me === null
      ? json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' })
      : json(route, 200, { ...ME, ...opts.me }),
  );
  await page.route('**/api/v1/me/sessions', (route) => {
    calls.lists += 1;
    if (calls.lists <= (opts.listFails ?? 0))
      return json(route, 500, { code: 'INTERNAL', message: 'Server error' });
    const data = lists[Math.min(calls.lists - (opts.listFails ?? 0), lists.length) - 1];
    return json(route, 200, { data, nextCursor: null });
  });
  await page.route('**/api/v1/me/two-factor/challenges', (route) => {
    calls.challenges.push(route.request().postDataJSON());
    return json(route, 202, CHALLENGE);
  });
  await page.route('**/api/v1/me/sessions/revoke-others', async (route) => {
    calls.revoke.push(route.request().postDataJSON());
    await (opts.revoke ? opts.revoke(route) : json(route, 200, { revokedCount: 2 }));
  });
  return calls;
}

test('list (en): every session with device, IP, "This device" and last activity', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/account');
  await page.getByRole('link', { name: 'Browser sessions' }).click();
  await expect(page).toHaveURL(/\/en\/account\/sessions$/);
  await expect(page.getByRole('heading', { name: 'Browser sessions' })).toBeVisible();

  const rows = page.getByTestId('session');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Windows - Chrome');
  await expect(rows.nth(0)).toContainText('203.0.113.10');
  await expect(rows.nth(0)).toContainText('This device');
  await expect(rows.nth(1)).toContainText('Linux - Firefox');
  await expect(rows.nth(1)).toContainText('Last activity 5 minutes ago');
  await expect(rows.nth(1)).not.toContainText('This device');
  await expect(rows.nth(2)).toContainText('iOS - iPhone 15');
  await expect(rows.nth(2)).toContainText('Last activity 3 hours ago');
});

test('log out other sessions with the password (en): sends it once, shows success, reloads the list', async ({
  page,
}) => {
  const calls = await fakeApi(page);
  await page.goto('/en/account/sessions');
  await expect(page.getByTestId('session')).toHaveCount(3);
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();
  await expect(page.getByText(/make sure it's really you/)).toBeVisible();
  await page.getByLabel('Current password').fill('OldPass123');
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();

  await expect(page.locator('.auth-alert-success')).toHaveText('The operation was successful');
  expect(calls.revoke).toEqual([{ currentPassword: 'OldPass123' }]);
  await expect(page.getByTestId('session')).toHaveCount(1);
  await expect(page.getByLabel('Current password')).toHaveCount(0);
  expect(calls.challenges).toEqual([]);
});

test('wrong current password (ka): field error, nothing else changes', async ({ page }) => {
  await fakeApi(page, {
    revoke: (route) =>
      json(route, 400, {
        code: 'VALIDATION_FAILED',
        message: 'მონაცემები არასწორია',
        details: { fields: [{ field: 'currentPassword', message: 'პაროლი არასწორია' }] },
      }),
  });
  await page.goto('/account/sessions');
  await expect(page.getByRole('heading', { name: 'გამოყენებული მოწყობილობები' })).toBeVisible();
  await page.getByRole('button', { name: 'ბრაუზერის სხვა სესიებიდან გამოსვლა' }).click();
  await page.getByLabel('ამჟამინდელი პაროლი').fill('Wrong1234');
  await page.getByRole('button', { name: 'ბრაუზერის სხვა სესიებიდან გამოსვლა' }).click();

  await expect(page.getByLabel('ამჟამინდელი პაროლი')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.auth-error')).toHaveText('პაროლი არასწორია');
  await expect(page.getByTestId('session')).toHaveCount(3);
});

test('too many wrong passwords (AC-55): the lock message is shown as a general error', async ({
  page,
}) => {
  await fakeApi(page, {
    revoke: (route) =>
      json(route, 429, {
        code: 'RATE_LIMITED',
        message: 'Too many failed login attempts. Please try again in 15 minutes.',
        details: { retryAfterSeconds: 900 },
      }),
  });
  await page.goto('/en/account/sessions');
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();
  await page.getByLabel('Current password').fill('OldPass123');
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();
  await expect(page.locator('.auth-alert-error')).toHaveText(
    'Too many failed login attempts. Please try again in 15 minutes.',
  );
});

test('account without a password (AC-44, SEC-05): emailed revoke_sessions code instead', async ({
  page,
}) => {
  const calls = await fakeApi(page, { me: { hasPassword: false } });
  await page.goto('/en/account/sessions');
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();

  await expect(page.getByText('We sent a 6-digit code to your email.')).toBeVisible();
  expect(calls.challenges).toEqual([{ purpose: 'revoke_sessions' }]);
  await expect(page.getByLabel('Current password')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /request a new code in \d+ seconds/ }),
  ).toBeDisabled();

  await page.locator('.auth-code input').first().click();
  await page.keyboard.type('123456');
  await page.getByRole('button', { name: 'Logout other browser sessions' }).click();
  await expect(page.locator('.auth-alert-success')).toHaveText('The operation was successful');
  expect(calls.revoke).toEqual([{ challengeId: CHALLENGE.challengeId, code: '123456' }]);
});

test('list fails to load: error with retry', async ({ page }) => {
  await fakeApi(page, { listFails: 1, lists: [[CURRENT]] });
  await page.goto('/en/account/sessions');
  await expect(page.locator('.auth-alert-error')).toContainText('Something went wrong');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('session')).toHaveCount(1);
  await expect(page.getByTestId('session')).toContainText('This device');
});

test('signed out: sent to login with the page as next', async ({ page }) => {
  await fakeApi(page, { me: null });
  await page.goto('/en/account/sessions');
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=\/en\/account\/sessions$/);
});
