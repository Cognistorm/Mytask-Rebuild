// Setting rows (ROADMAP 4X.4, docs/05-design/admin-refresh.md §5): meaning + register ID tag + unit + re-login badge |
// control, the unit inside the field, Save Secondary → Primary once the value changed, and the social provider card.
// Runs against a routed API (no stack needed).
import { expect, test, type Route } from '@playwright/test';

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

const SETTINGS = [
  { ...entry('S-025', 'escrow', 'integer', 72, 'ავტომატური გათავისუფლება'), unit: 'hours' },
  { ...entry('S-056', 'auth', 'boolean', false, 'ელ-ფოსტით 2FA'), stepUpRequired: true },
  {
    ...entry(
      'S-065',
      'auth',
      'structured',
      { isEnabled: false, clientId: 'abc', clientSecret: { isSet: true } },
      'Google შესვლა',
    ),
    isSecret: true,
    stepUpRequired: true,
  },
];

test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, ME));
  await page.route('**/api/v1/admin/settings**', (route) =>
    json(route, 200, { settings: SETTINGS }),
  );
});

test('a number row: meaning, register ID tag and unit, the unit inside the field, Save turns Primary', async ({
  page,
}) => {
  await page.goto('/settings?area=escrow');
  const row = page.locator('.admin-setting').filter({ hasText: 'ავტომატური გათავისუფლება' });
  await expect(row.locator('.admin-setting-meaning')).toHaveText('ავტომატური გათავისუფლება');
  await expect(row.locator('code.admin-setting-id')).toHaveText('S-025');
  await expect(row.locator('.admin-input-unit span')).toHaveText('hours');
  const field = page.getByRole('spinbutton', { name: /^S-025 / });
  await expect(field).toHaveValue('72');
  const save = row.getByRole('button', { name: 'შენახვა' });
  await expect(save).toHaveClass(/mt-button/);
  await expect(save).not.toHaveClass(/mt-button-primary/);
  await field.fill('48');
  await expect(save).toHaveClass(/mt-button-primary/);
  await field.fill('72');
  await expect(save).not.toHaveClass(/mt-button-primary/);
  // Two columns on a desktop: the control sits at the end edge, right of the text.
  const text = await row.locator('.admin-setting-text').boundingBox();
  const control = await row.locator('.admin-setting-control').boundingBox();
  expect(control!.x).toBeGreaterThan(text!.x + text!.width - 1);
});

test('a switch row keeps its "S-056 …" name; the re-login badge; the social provider card', async ({
  page,
}) => {
  await page.goto('/settings?area=auth');
  await expect(page.getByRole('switch', { name: /^S-056 ელ-ფოსტით 2FA$/ })).toBeVisible();
  const row = page.locator('.admin-setting').filter({ hasText: 'S-056' });
  await expect(row.locator('.mt-pill')).toHaveText('პაროლის დადასტურება');

  const google = page.getByTestId('social-S-065');
  await expect(google.locator('.admin-provider-head')).toContainText('Google შესვლა');
  await expect(google.locator('.admin-provider-head').getByRole('switch')).not.toBeChecked();
  await expect(google.locator('.mt-pill-success')).toHaveText('Client secret: შენახულია');
  await expect(google.getByLabel('Client ID')).toHaveValue('abc');
  const save = google.getByRole('button', { name: 'შენახვა' });
  await expect(save).not.toHaveClass(/mt-button-primary/);
  await google.getByLabel(/ახალი client secret/).fill('x');
  await expect(save).toHaveClass(/mt-button-primary/);
  // Labels sit above their fields.
  const label = await google.getByText('Client ID', { exact: true }).boundingBox();
  const input = await google.getByLabel('Client ID').boundingBox();
  expect(input!.y).toBeGreaterThan(label!.y);
});

test('phone: rows stack, no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/settings?area=auth');
  await expect(page.getByTestId('social-S-065')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
