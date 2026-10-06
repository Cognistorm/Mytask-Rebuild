// Theme switch (spec 02 AC-35, S-105/S-106, Q-059; design tokens.md §2.4; task 4.1.20d). The server renders
// `<html data-theme>` from the `mt_theme` cookie; the stand-in API (e2e/fake-api.mjs) has no getPublicConfig, so
// server pages use the fallback (switch on, light default). The account pages' browser calls are routed here.
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { BASE } from './base';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  fullName: 'Nino Beridze',
  username: 'nino_b',
  email: 'nino@example.com',
  pendingEmail: null,
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'buying',
  avatar: null,
  kycStatus: 'none',
  countryCode: null,
  city: null,
  theme: null as string | null,
  createdAt: '2023-05-10T08:00:00Z',
};

async function themeCookie(context: BrowserContext, value: string) {
  await context.addCookies([{ name: 'mt_theme', value, url: BASE, sameSite: 'Lax' }]);
}

const html = (page: Page) => page.locator('html');

/** Routes getMe, getPublicConfig (appearance) and updateMyPreferences, keeping the theme. */
async function fakeApi(page: Page, opts: { theme?: string | null; switcher?: boolean } = {}) {
  const me = { ...ME, theme: opts.theme ?? null };
  const sent: unknown[] = [];
  await page.route('**/api/v1/me', (route) => json(route, 200, me));
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
      appearance: { themeSwitcherEnabled: opts.switcher ?? true, defaultTheme: 'light' },
    }),
  );
  await page.route('**/api/v1/me/preferences', (route) => {
    const body = route.request().postDataJSON() as { theme: string };
    sent.push(body);
    me.theme = body.theme;
    return json(route, 200, me);
  });
  return sent;
}

test('no choice: light from the server (S-106 default)', async ({ page }) => {
  await page.goto('/en/auth/login');
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect(html(page)).toHaveAttribute('data-theme-choice', 'light');
});

test('the cookie choice is rendered by the server, on private and public pages (no flash)', async ({
  page,
  context,
}) => {
  await themeCookie(context, 'dark');
  for (const path of ['/en/auth/login', '/en/profile/nino_b']) {
    const res = await page.request.get(path);
    expect(await res.text()).toMatch(/<html[^>]*data-theme="dark"/);
    await page.goto(path);
    await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  }
  // The page background follows the dark tokens.
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).not.toBe('rgb(255, 255, 255)');
});

test('"system" follows the device setting', async ({ page, context }) => {
  await themeCookie(context, 'system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/en/auth/login');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
});

test('switch in the account side card: applies at once, saves cookie and account; the next page renders it (AC-35)', async ({
  page,
  context,
}) => {
  const sent = await fakeApi(page);
  await page.goto('/en/account/settings');
  const group = page.getByTestId('theme-switch');
  await expect(group.getByRole('group', { name: 'Theme' })).toBeVisible();
  await expect(group.getByLabel('Light mode')).toBeChecked();

  // F-3X18-1: transitions are off for the frame of the switch only (set with the theme, removed after it).
  await page.evaluate(() => {
    const w = window as unknown as { switching: (string | null)[] };
    w.switching = [];
    new MutationObserver(() =>
      w.switching.push(document.documentElement.getAttribute('data-theme-switching')),
    ).observe(document.documentElement, { attributeFilter: ['data-theme-switching'] });
  });
  await group.getByLabel('Dark mode').check();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(html(page)).not.toHaveAttribute('data-theme-switching');
  expect(
    await page.evaluate(() => (window as unknown as { switching: unknown[] }).switching),
  ).toEqual(['', null]);
  await expect.poll(() => sent).toEqual([{ theme: 'dark' }]);
  const cookie = (await context.cookies(BASE)).find((c) => c.name === 'mt_theme');
  expect(cookie?.value).toBe('dark');

  // The next page comes from the server already dark (the request carries the browser's cookies).
  const next = await page.request.get('/en/auth/login');
  expect(await next.text()).toMatch(/<html[^>]*data-theme="dark"/);

  await page.reload();
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await page.getByTestId('theme-switch').getByLabel('Light mode').check();
  await expect(html(page)).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => sent.length).toBe(2);
});

test("the account's choice wins over this browser's cookie", async ({ page, context }) => {
  await themeCookie(context, 'light');
  await fakeApi(page, { theme: 'dark' });
  await page.goto('/en/account/settings');
  await expect(html(page)).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByTestId('theme-switch').getByLabel('Dark mode')).toBeChecked();
  const cookie = (await context.cookies(BASE)).find((c) => c.name === 'mt_theme');
  expect(cookie?.value).toBe('dark');
});

test('S-105 OFF: no switch', async ({ page }) => {
  await fakeApi(page, { switcher: false });
  await page.goto('/en/account/settings');
  await expect(page.getByTestId('account-settings')).toBeVisible();
  await expect(page.getByTestId('theme-switch')).toHaveCount(0);
});

test('Georgian labels', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/account/settings');
  const group = page.getByTestId('theme-switch');
  await expect(group.getByRole('group', { name: 'თემა' })).toBeVisible();
  await expect(group.getByLabel('მუქი რეჟიმი')).toBeVisible();
});
