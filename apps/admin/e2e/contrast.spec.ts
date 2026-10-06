// Colour-contrast check of the admin category form with the colour picker and its light + dark preview (ROADMAP
// 3X.18c; spec 3X R-4): axe `color-contrast` 0 violations, and the text axe leaves as "needs review" (gradients: the
// preview's pill, band and breadcrumb chip) measured against every colour stop, 0 failures. Desktop and phone; the
// colours are the first starter (#DB2777, picked for a new category) and the two taken ones.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Route } from '@playwright/test';
import { measure } from '../../web/e2e/contrast-measure';

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
  test(`contrast: category form with the colour picker, ${device}`, async ({ page }) => {
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

    const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const violations = result.violations.flatMap((v) =>
      v.nodes.map((n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? n.failureSummary}`),
    );
    expect(violations, violations.join('\n')).toEqual([]);
    const review = result.incomplete.flatMap((v) =>
      v.nodes.map((n) => n.target.join(' ')).filter((t) => !t.includes('>>')),
    );
    const measured = await measure(page, review);
    const low = measured.filter((m) => 'worst' in m && m.worst! < m.need!);
    expect(low, low.map((m) => `${m.sel} ${m.worst} < ${m.need}`).join('\n')).toEqual([]);
  });
}
