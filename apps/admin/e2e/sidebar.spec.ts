// Admin shell (ROADMAP 4X.2, docs/05-design/admin-refresh.md §3): the left sidebar with the sections in the legacy
// order, links per permission (cosmetic, spec 16 AC-9), the current item, group expand/collapse, the account
// block, and the drawer below 1024 px. Runs against a routed API (no stack needed).
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-0000000000s1',
  username: 'owner',
  fullName: 'Owner Name',
  email: 'owner@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: [] as string[],
  isSuperAdmin: true,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};

async function setup(page: Page, me: Partial<typeof ME> = {}) {
  let loggedOut = false;
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, { ...ME, ...me }));
  // The Settings group lists the settings areas (4X.3); one area is enough here.
  await page.route('**/api/v1/admin/settings**', (route) =>
    json(route, 200, { settings: [{ key: 'e2e.auth', registerId: 'S-056', area: 'auth' }] }),
  );
  await page.route('**/api/v1/admin/ip-bans**', (route) =>
    json(route, 200, { data: [], meta: { nextCursor: null } }),
  );
  await page.route('**/api/v1/admin/auth/logout', (route) => {
    loggedOut = true;
    return route.fulfill({ status: 204 });
  });
  return { loggedOut: () => loggedOut };
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'ადმინისტრაციის ნავიგაცია' });

test('Super-admin sees every section in the legacy order; one-item groups are plain links', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/account');
  const sidebar = nav(page);
  // Top level: Users, Portfolios, Projects, Categories, Settings.
  await expect(sidebar.locator(':scope > ul > li > :is(a, button)')).toHaveText([
    'მომხმარებლები',
    'პორტფოლიო',
    'პროექტები',
    'სარჩევი',
    'პარამეტრები',
  ]);
  await expect(sidebar.getByRole('link', { name: 'პორტფოლიო' })).toHaveAttribute(
    'href',
    '/portfolio',
  );
  await expect(sidebar.getByRole('link', { name: 'სარჩევი' })).toHaveAttribute(
    'href',
    '/categories',
  );
  // Groups start closed away from their screens.
  const users = sidebar.getByRole('button', { name: 'მომხმარებლები' });
  await expect(users).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar.getByRole('link', { name: 'ვერიფიკაციები' })).toBeHidden();
  await users.click();
  await expect(users).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar.getByRole('link', { name: 'ვერიფიკაციები' })).toHaveAttribute(
    'href',
    '/kyc',
  );
  await expect(sidebar.getByRole('link', { name: 'მომხმარებლის შეზღუდვები' })).toHaveAttribute(
    'href',
    '/restrictions',
  );
  await users.click();
  await expect(sidebar.getByRole('link', { name: 'ვერიფიკაციები' })).toBeHidden();

  // Account block: name, Change password (current here), Logout.
  await expect(page.getByText('Owner Name')).toBeVisible();
  await expect(page.getByRole('link', { name: 'პაროლის ცვლილება' })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the current screen opens its group, marks its item and names the group above the title', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/security');
  const settings = nav(page).getByRole('button', { name: 'პარამეტრები' });
  await expect(settings).toHaveAttribute('aria-expanded', 'true');
  await expect(nav(page).getByRole('link', { name: 'დაბლოკილი IP მისამართები' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(
    nav(page).getByRole('link', { name: 'ავტორიზაცია და უსაფრთხოება' }),
  ).not.toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main .admin-eyebrow')).toHaveText('პარამეტრები');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('დაბლოკილი IP მისამართები');
  // The content sits right of the fixed sidebar.
  const side = await page.locator('.admin-sidebar').boundingBox();
  const main = await page.getByRole('main').boundingBox();
  expect(main!.x).toBeGreaterThanOrEqual(side!.x + side!.width);
});

test('links follow the permissions; a group left with one item is a plain link', async ({
  page,
}) => {
  await setup(page, { isSuperAdmin: false, permissions: ['kyc.review', 'security.ip_bans'] });
  await page.goto('/security');
  await expect(nav(page).locator(':scope > ul > li > :is(a, button)')).toHaveText([
    'ვერიფიკაციები',
    'დაბლოკილი IP მისამართები',
  ]);
  await expect(nav(page).getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'პორტფოლიო' })).toHaveCount(0);
  await expect(page.locator('main .admin-eyebrow')).toHaveCount(0);
});

test('Logout signs out and goes to the login page', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/account');
  await page.getByRole('button', { name: 'გასვლა' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.loggedOut()).toBe(true);
});

test('phone: the sidebar is a drawer from the menu button; no sideways scroll', async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/security');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(nav(page)).toBeHidden();
  const burger = page.getByRole('button', { name: 'მენიუს გახსნა' });
  await burger.click();
  await expect(burger).toHaveAttribute('aria-expanded', 'true');
  await expect(nav(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'დახურვა' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(nav(page)).toBeHidden();
  await expect(burger).toBeFocused();

  // Choosing an item closes the drawer.
  await burger.click();
  await page.locator('.admin-sidebar').getByRole('link', { name: 'პაროლის ცვლილება' }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(nav(page)).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});

test('desktop: no menu button, the sidebar is always there', async ({ page }) => {
  await setup(page);
  await page.goto('/account');
  await expect(nav(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'მენიუს გახსნა' })).toBeHidden();
});
