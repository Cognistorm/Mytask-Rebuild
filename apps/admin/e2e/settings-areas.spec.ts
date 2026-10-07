// Settings by area (ROADMAP 4X.3, docs/05-design/admin-refresh.md §4): each area the API returns is a sidebar item
// under Settings in the contract order, `/settings` opens the first one, the content shows that area only, and the
// list is loaded once per page load. Runs against a routed API (no stack needed).
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

const entry = (registerId: string, area: string, type: string, value: unknown, ka: string) => ({
  key: `e2e.${registerId}`,
  registerId,
  area,
  type,
  unit: type === 'integer' ? 'hours' : null,
  meaning: { en: ka, ka },
  value,
  isSet: true,
  defaultValue: value,
  allowedValues: null,
  minimum: null,
  maximum: null,
  source: 'e2e',
  tag: 'LEGACY',
  registerStatus: 'approved',
  isVersioned: true,
  isSecret: false,
  isPublic: false,
  isCritical: false,
  stepUpRequired: false,
  writePermission: `settings.${area}.write`,
  version: 1,
  updatedAt: null,
  updatedBy: null,
});

// API order is not the contract order: the sidebar sorts (system after auth, plans first).
const SETTINGS = [
  entry('S-103', 'system', 'string', 'ok', 'სისტემის რიგი'),
  entry('S-056', 'auth', 'boolean', false, 'ელ-ფოსტით 2FA'),
  entry('S-001', 'plans', 'integer', 5, 'პაკეტის ლიმიტი'),
];

async function setup(page: Page, me: Partial<typeof ME> = {}) {
  let settingsCalls = 0;
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, { ...ME, ...me }));
  await page.route('**/api/v1/admin/settings**', (route) => {
    settingsCalls++;
    return json(route, 200, { settings: SETTINGS });
  });
  await page.route('**/api/v1/admin/ip-bans**', (route) =>
    json(route, 200, { data: [], meta: { nextCursor: null } }),
  );
  return { settingsCalls: () => settingsCalls };
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'ადმინისტრაციის ნავიგაცია' });

test('/settings opens the first area; each area is a sidebar item; switching shows that area only', async ({
  page,
}) => {
  const api = await setup(page);
  await page.goto('/settings');
  const group = nav(page).getByRole('button', { name: 'პარამეტრები' });
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await expect(nav(page).locator('.admin-sidebar-sub').last().getByRole('link')).toHaveText([
    'პაკეტები და ლიმიტები',
    'ავტორიზაცია და უსაფრთხოება',
    'სისტემა',
    'დაბლოკილი IP მისამართები',
  ]);
  const plans = nav(page).getByRole('link', { name: 'პაკეტები და ლიმიტები' });
  await expect(plans).toHaveAttribute('href', '/settings?area=plans');
  await expect(plans).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main .admin-eyebrow')).toHaveText('პარამეტრები');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('პაკეტები და ლიმიტები');
  await expect(page.getByRole('spinbutton', { name: /^S-001 / })).toHaveValue('5');
  await expect(page.getByRole('switch', { name: /^S-056 / })).toHaveCount(0);
  // Loaded with the page (twice under the dev server's strict mode); switching must not load it again.
  const loads = api.settingsCalls();

  await nav(page).getByRole('link', { name: 'ავტორიზაცია და უსაფრთხოება' }).click();
  await expect(page).toHaveURL(/\/settings\?area=auth$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ავტორიზაცია და უსაფრთხოება');
  await expect(page.getByRole('switch', { name: /^S-056 / })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: /^S-001 / })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: 'ავტორიზაცია და უსაფრთხოება' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(plans).not.toHaveAttribute('aria-current', 'page');

  // Banned IPs keeps the areas without loading the list again.
  await nav(page).getByRole('link', { name: 'დაბლოკილი IP მისამართები' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('დაბლოკილი IP მისამართები');
  await expect(nav(page).getByRole('link', { name: 'სისტემა' })).toBeVisible();
  expect(api.settingsCalls()).toBe(loads);
});

test('an unknown area opens the first one; another screen loads the area list for the sidebar', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/settings?area=nope');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('პაკეტები და ლიმიტები');

  await page.goto('/security');
  await nav(page).getByRole('link', { name: 'სისტემა' }).click();
  await expect(page).toHaveURL(/\/settings\?area=system$/);
  await expect(page.getByRole('textbox', { name: /^S-103 / })).toHaveValue('ok');
});

test('without settings.read there are no area items and the list is not loaded', async ({
  page,
}) => {
  const api = await setup(page, { isSuperAdmin: false, permissions: ['security.ip_bans'] });
  await page.goto('/security');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('დაბლოკილი IP მისამართები');
  await expect(nav(page).getByRole('link')).toHaveText(['დაბლოკილი IP მისამართები']);
  expect(api.settingsCalls()).toBe(0);
});

// QA 4X.9 F-4X9-3: while the Settings screen loads its list, no area item is marked current.
test('no area item is current while the settings list is still loading', async ({ page }) => {
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, ME));
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  let calls = 0;
  await page.route('**/api/v1/admin/settings**', async (route) => {
    // The first load (the sidebar on /security) answers at once; the Settings screen's load waits.
    if (calls++ > 0) await gate;
    return json(route, 200, { settings: SETTINGS });
  });
  await page.route('**/api/v1/admin/ip-bans**', (route) =>
    json(route, 200, { data: [], meta: { nextCursor: null } }),
  );
  await page.goto('/security');
  await expect(nav(page).getByRole('link', { name: 'სისტემა' })).toBeVisible();
  await nav(page).getByRole('link', { name: 'სისტემა' }).click();
  await expect(page).toHaveURL(/area=system/);
  await expect(nav(page).locator('[aria-current="page"]')).toHaveCount(0);
  await expect(nav(page).getByRole('button', { name: 'პარამეტრები' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  release();
  await expect(nav(page).locator('[aria-current="page"]')).toHaveText(['სისტემა']);
});
