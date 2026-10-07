// Every admin screen in the 4X shell (ROADMAP 4X.8, docs/05-design/admin-refresh.md §6): at 1280 and 360 px no
// sideways scroll, a pixel baseline (Windows only, as visual-screens.spec.ts), axe `color-contrast` 0 violations
// plus the measured pass for text axe cannot decide (3X.18c), and the reduced-motion check of the drawer, the group
// caret and the status-tab thumb. Runs against one routed API (no stack needed). New baselines after an approved
// look change, against a production build (the dev server adds its own badge):
// `pnpm --filter @mytask/admin exec playwright test admin-screens --update-snapshots=all`.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { measure } from '../../web/e2e/contrast-measure';

const PIXELS = process.platform === 'win32';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const AT = '2026-10-01T08:00:00.000Z';

const ME = {
  id: id(900),
  username: 'owner',
  fullName: 'Owner Name',
  email: 'owner@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: [],
  isSuperAdmin: true,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};
const USER = {
  id: id(1),
  username: 'designer_ge',
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: false,
  countryCode: 'GE',
  isDeleted: false,
};
const OWNER = {
  user: USER,
  status: 'active',
  isRestricted: false,
  isDeleted: false,
  plan: 'premium',
  kycStatus: 'pending',
  reportCount: 1,
  earlierRejectionCount: 0,
};

const setting = (
  registerId: string,
  area: string,
  type: string,
  value: unknown,
  ka: string,
  extra: object = {},
) => ({
  key: `e2e.${registerId}`,
  registerId,
  area,
  type,
  unit: null,
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
  ...extra,
});
const SETTINGS = [
  setting('S-052', 'auth', 'boolean', true, 'ახალი ანგარიშები აქტიურდება ვერიფიკაციის შემდეგ', {
    stepUpRequired: true,
  }),
  setting('S-054', 'auth', 'integer', 60, 'ვერიფიკაციის ბმულის მოქმედების ვადა', {
    unit: 'minutes',
  }),
  setting('S-124', 'auth', 'string', 'new_device', 'როდის მოითხოვება კოდი', {
    allowedValues: ['new_device', 'every_login'],
    stepUpRequired: true,
  }),
  setting(
    'S-065',
    'auth',
    'structured',
    { isEnabled: false, clientId: null, clientSecret: { isSet: false } },
    'Google-ით შესვლა',
    { isSecret: true, stepUpRequired: true },
  ),
  setting('S-103', 'system', 'string', 'Asia/Tbilisi', 'სისტემის დროის სარტყელი'),
];

const img = (n: number) => ({
  fileId: id(700 + n),
  thumb: `http://localhost/img-${n}.webp`,
  medium: `http://localhost/img-${n}.webp`,
  large: `http://localhost/img-${n}.webp`,
  width: 800,
  height: 600,
});
const PORTFOLIO = {
  item: {
    id: id(10),
    uid: 'abc123',
    slug: 'logo-abc123',
    title: 'ლოგოს დიზაინი',
    description: 'A logo for a Tbilisi bakery.',
    projectUrl: 'https://example.com/bakery',
    videoUrl: null,
    thumbnail: img(1),
    images: [img(2)],
    status: 'pending',
    rejectionReason: null,
    rejectedAt: null,
    owner: USER,
    isOwn: false,
    publishedAt: null,
    createdAt: AT,
    updatedAt: AT,
  },
  owner: OWNER,
  decidedBy: null,
  decidedAt: null,
};
const file = (n: number, name: string) => ({
  fileId: id(800 + n),
  fileName: name,
  contentType: 'image/jpeg',
  sizeBytes: 300_000,
});
const KYC = {
  verification: {
    id: id(20),
    documentType: 'national_id',
    status: 'pending',
    provider: 'manual',
    frontFile: file(1, 'front.jpg'),
    backFile: file(2, 'back.jpg'),
    selfieFile: file(3, 'selfie.jpg'),
    declineReason: null,
    createdAt: AT,
    reviewedAt: null,
  },
  owner: OWNER,
  reviewedBy: null,
};
const RESTRICTION = {
  id: id(30),
  user: USER,
  message: 'Please explain the reviews.',
  filesRequired: false,
  status: 'submitted',
  createdBy: null,
  createdAt: AT,
  resolvedBy: null,
  resolvedAt: null,
  appeal: null,
  decisionReason: null,
};
const APPEAL = {
  id: id(31),
  restriction: RESTRICTION,
  owner: { ...OWNER, isRestricted: true },
  message: 'It was a misunderstanding.',
  files: [{ ...file(4, 'პირადობა.pdf'), contentType: 'application/pdf' }],
  createdAt: AT,
};
const category = (n: number, depth: number, parentId: string | null, name: string) => ({
  id: id(40 + n),
  parentId,
  depth,
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
  childCount: depth < 3 ? 1 : 0,
  projectCategoryCount: 0,
  previousSlugs: [],
  color: depth === 1 ? '#7C3AED' : null,
  resolvedColor: '#7C3AED',
  createdAt: AT,
  updatedAt: AT,
});
const CATEGORIES = [
  category(1, 1, null, 'დიზაინი'),
  category(2, 2, id(41), 'ლოგოები'),
  category(3, 3, id(42), 'მინიმალისტური ლოგო'),
];
const PROJECT_CATEGORY = {
  id: id(50),
  slug: 'web',
  name: { ka: 'ვებ', en: 'Web' },
  seoDescription: null,
  gigCategory: { id: id(41), slug: 'cat-1', name: 'დიზაინი', contentLocale: 'ka' },
  color: '#7C3AED',
  image: null,
  position: 0,
  isActive: true,
  skillCount: 1,
  projectCount: 0,
  createdAt: AT,
  updatedAt: AT,
};
const SKILL = {
  id: id(60),
  projectCategoryId: id(50),
  slug: 'react',
  name: { ka: 'რეაქტი', en: 'React' },
  isActive: true,
  projectCount: 0,
  createdAt: AT,
  updatedAt: AT,
};
const BAN = {
  ip: '203.0.113.7',
  failedAttempts: 5,
  source: 'auto',
  note: null,
  bannedAt: AT,
};

async function routeApi(page: Page) {
  await page.route('**/img-*.webp', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/v1/**', (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname.replace('/api/v1', '');
    const list = (data: unknown[]) => json(route, 200, { data, nextCursor: null, totalCount: 1 });
    if (path === '/admin/me') return json(route, 200, ME);
    if (path === '/admin/settings') return json(route, 200, { settings: SETTINGS });
    if (path.startsWith('/admin/settings/'))
      return json(route, 403, { code: 'REAUTH_REQUIRED', message: 'reauth' });
    if (path === '/admin/ip-bans')
      return json(route, 200, { data: [BAN], meta: { nextCursor: null } });
    if (path === '/admin/portfolio-items') return list([PORTFOLIO]);
    if (path === '/admin/kyc') return list([KYC]);
    if (path === '/admin/restriction-appeals') return list([APPEAL]);
    if (path === '/admin/restrictions') return list([RESTRICTION]);
    if (path === '/admin/categories') return json(route, 200, { categories: CATEGORIES });
    if (path === '/admin/project-categories')
      return json(route, 200, { projectCategories: [PROJECT_CATEGORY] });
    if (path === '/admin/skills') return json(route, 200, { data: [SKILL], nextCursor: null });
    return json(route, 404, { code: 'NOT_FOUND', message: 'not found' });
  });
}

/** Screen name → path and what shows once it has loaded. */
const SCREENS: { name: string; path: string; ready: (p: Page) => Promise<void> }[] = [
  {
    name: 'login',
    path: '/login',
    ready: (p) => expect(p.getByRole('heading', { level: 1 })).toHaveText('ავტორიზაცია'),
  },
  {
    name: 'settings-auth',
    path: '/settings?area=auth',
    ready: (p) => expect(p.getByTestId('social-S-065')).toBeVisible(),
  },
  {
    name: 'settings-relogin',
    path: '/settings?area=auth',
    ready: async (p) => {
      await p.getByRole('switch', { name: /^S-052 / }).click();
      await expect(p.locator('.admin-reauth')).toBeVisible();
    },
  },
  {
    name: 'security',
    path: '/security',
    ready: (p) => expect(p.getByTestId('ip-ban')).toBeVisible(),
  },
  {
    name: 'restrictions',
    path: '/restrictions',
    ready: (p) => expect(p.getByTestId('appeal')).toBeVisible(),
  },
  {
    name: 'portfolio',
    path: '/portfolio',
    ready: (p) => expect(p.getByTestId('portfolio-item')).toBeVisible(),
  },
  {
    name: 'kyc',
    path: '/kyc',
    ready: (p) => expect(p.getByTestId('kyc-item')).toBeVisible(),
  },
  {
    name: 'categories',
    path: '/categories',
    ready: (p) => expect(p.getByTestId('category-row')).toHaveCount(3),
  },
  {
    name: 'project-categories',
    path: '/project-categories',
    ready: (p) => expect(p.getByTestId('project-category-row')).toBeVisible(),
  },
  {
    name: 'skills',
    path: '/skills',
    ready: (p) => expect(p.getByTestId('skill-row')).toBeVisible(),
  },
  {
    name: 'account',
    path: '/account',
    ready: (p) => expect(p.getByLabel('ამჟამინდელი პაროლი')).toBeVisible(),
  },
];

for (const [device, viewport] of [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 360, height: 800 }],
] as const) {
  for (const screen of SCREENS) {
    test(`${screen.name}, ${device}: no sideways scroll, baseline, contrast`, async ({ page }) => {
      await routeApi(page);
      await page.setViewportSize(viewport);
      await page.goto(screen.path);
      await screen.ready(page);
      await page.evaluate(() => document.fonts.ready);
      // Let the shell's entry fades finish before measuring and capturing.
      await page.waitForTimeout(400);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        ),
      ).toBe(0);

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

      if (PIXELS) {
        await expect(page).toHaveScreenshot(`admin-${screen.name}-${device}.png`, {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.01,
        });
      }
    });
  }
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the drawer, the group caret and the status-tab thumb jump instead of sliding', async ({
    page,
  }) => {
    await routeApi(page);
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/portfolio');
    await expect(page.getByTestId('portfolio-item')).toBeVisible();
    const duration = (sel: string, pseudo?: string) =>
      page.evaluate(
        ([s, ps]) => {
          const d = getComputedStyle(document.querySelector(s!)!, ps ?? null).transitionDuration;
          return Math.max(
            ...d.split(',').map((x) => parseFloat(x) * (x.includes('ms') ? 1 : 1000)),
          );
        },
        [sel, pseudo] as const,
      );
    expect(await duration('.admin-segmented', '::before')).toBeLessThanOrEqual(0.01);
    expect(await duration('.admin-segment')).toBeLessThanOrEqual(0.01);
    await page.getByRole('button', { name: 'მენიუს გახსნა' }).click();
    await expect(page.getByRole('navigation', { name: 'ადმინისტრაციის ნავიგაცია' })).toBeVisible();
    expect(await duration('.admin-sidebar')).toBeLessThanOrEqual(0.01);
    expect(await duration('.admin-caret')).toBeLessThanOrEqual(0.01);
  });
});
