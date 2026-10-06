// Visual check of the admin category form with the colour picker after the 3X refresh (ROADMAP 3X.18b, 3X.15):
// screenshots at desktop and phone width (360 px: no sideways scroll). Admin is light only; the form's own preview
// shows the category in light and dark. Pixel baselines are made and compared on the Owner's Windows PC only (fonts
// render differently on the Linux CI runner); CI runs the rest. New baselines after an approved look change:
// `pnpm --filter @mytask/admin exec playwright test visual-screens --update-snapshots`.
import { expect, test, type Route } from '@playwright/test';

const PIXELS = process.platform === 'win32';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const category = (n: number, name: string, color: string) => ({
  id: id(n),
  parentId: null,
  depth: 1,
  slug: `cat-${n}`,
  name: { ka: name, en: null },
  description: null,
  contentTop: null,
  contentBottom: null,
  icon: null,
  image: null,
  isVisibleOnHome: true,
  position: n,
  gigCount: 0,
  childCount: 0,
  projectCategoryCount: 0,
  previousSlugs: [],
  color,
  resolvedColor: color,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

for (const [device, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 360, height: 800 }],
] as const) {
  test(`category form with the colour picker, ${device}`, async ({ page }) => {
    await page.route('**/api/v1/**', (route) => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      if (path === '/admin/me')
        return json(route, 200, {
          id: id(900),
          username: 'catalog',
          fullName: 'Catalog Staff',
          email: 'catalog@example.com',
          pendingEmail: null,
          locale: 'ka',
          roles: [],
          permissions: ['catalog.write'],
          isSuperAdmin: false,
          twoFactorRequired: false,
          reauthenticatedUntil: null,
          lastLoginAt: null,
        });
      if (path === '/admin/categories')
        return json(route, 200, {
          categories: [category(1, 'დიზაინი', '#7C3AED'), category(2, 'პროგრამირება', '#2563EB')],
        });
      return json(route, 404, { code: 'NOT_FOUND', message: 'not found' });
    });
    await page.setViewportSize(viewport);
    await page.goto('/categories');
    await page.getByRole('button', { name: 'შექმენი კატეგორია' }).click();
    await page.getByLabel('სახელი · ka').fill('ვიდეო');
    await page.getByLabel('Slug').fill('video');
    await expect(page.getByTestId('color-preview').locator('[data-theme="dark"]')).toContainText(
      'ვიდეო',
    );
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
    if (PIXELS) {
      await expect(page).toHaveScreenshot(`category-form-${device}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.01,
      });
    }
  });
}
