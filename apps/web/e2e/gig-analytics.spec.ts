// Selling → Gigs → Analytics `/seller/gigs/{uid}/analytics` (ROADMAP 4.3.12b; spec 04 AC-39; ADR-012). The page runs
// against a routed API (getMe, lookupGig, getGigAnalytics); the API side (owner only, breakdown sums, local GeoIP) is
// tested in apps/api.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  fullName: 'Nino Beridze',
  username: 'nino_b',
  email: 'nino@example.com',
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'selling',
  avatar: null,
};

const GIG_ID = '01900000-0000-7000-8000-000000000a01';
const UID = 'GIGANALYTICS00000001';

/** Only the `lookupGig` fields the page reads. */
const gig = (isOwner: boolean) => ({
  id: GIG_ID,
  uid: UID,
  slug: `logo-design-${UID.toLowerCase()}`,
  title: 'Logo design for your business',
  contentLocale: 'en',
  viewer: { isOwner, isFavorite: false, hasReported: false },
});

const ANALYTICS = {
  gigId: GIG_ID,
  salesCount: 12,
  clickCount: 1234,
  impressionCount: 56789,
  reviewCount: 3,
  devices: [
    { label: 'desktop', count: 800 },
    { label: 'mobile', count: 400 },
    { label: 'unknown', count: 34 },
  ],
  browsers: [{ label: 'Chrome', count: 1000 }],
  operatingSystems: [],
  referrers: [{ label: 'www.facebook.com', count: 20 }],
  countries: [
    { label: 'GE', count: 1200 },
    { label: 'DE', count: 30 },
    { label: 'unknown', count: 4 },
  ],
  cities: [{ label: 'Tbilisi', count: 1100 }],
  recentOrders: [] as unknown[],
};

async function fakeApi(
  page: Page,
  opts: { owner?: boolean; lookup?: number; analytics?: unknown } = {},
) {
  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  const lookups: string[] = [];
  await page.route(/\/api\/v1\/gigs\/lookup\?/, (route) => {
    lookups.push(new URL(route.request().url()).searchParams.get('uid') ?? '');
    return opts.lookup
      ? json(route, opts.lookup, { code: 'NOT_FOUND', message: 'x' })
      : json(route, 200, gig(opts.owner ?? true));
  });
  await page.route(`**/api/v1/gigs/${GIG_ID}/analytics`, (route) =>
    json(route, 200, opts.analytics ?? ANALYTICS),
  );
  return lookups;
}

test('totals, breakdown bars with readable labels, the DB-IP credit, no recent orders yet (AC-39)', async ({
  page,
}) => {
  const lookups = await fakeApi(page);
  await page.goto(`/en/seller/gigs/${UID}/analytics`);
  await expect(page).toHaveTitle(/^Gig analytics \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Gig analytics' })).toBeVisible();
  expect(lookups).toEqual([UID]);
  await expect(page.getByRole('link', { name: 'Logo design for your business' })).toHaveAttribute(
    'href',
    `/en/service/logo-design-${UID.toLowerCase()}`,
  );
  await expect(page.getByRole('link', { name: 'Back to gigs' })).toHaveAttribute(
    'href',
    '/en/seller/gigs',
  );
  await expect(
    page
      .getByRole('navigation', { name: 'Selling navigation' })
      .getByRole('link', { name: 'Gigs' }),
  ).toHaveAttribute('aria-current', 'page');

  await expect(page.getByTestId('kpi-sales')).toContainText('12');
  await expect(page.getByTestId('kpi-clicks')).toContainText('1,234');
  await expect(page.getByTestId('kpi-impressions')).toContainText('56,789');
  await expect(page.getByTestId('kpi-reviews')).toContainText('3');

  const devices = page.getByRole('list', { name: 'Devices' }).getByRole('listitem');
  await expect(devices).toHaveText(['Desktop800', 'Mobile400', 'Unknown34']);
  // Bars are scaled to the largest value of their list.
  const widths = await devices
    .locator('.mt-bars-track > span')
    .evaluateAll((spans) => spans.map((s) => (s as HTMLElement).style.inlineSize));
  expect(widths).toEqual(['100%', '50%', '4.25%']);

  await expect(page.getByRole('list', { name: 'Countries' }).getByRole('listitem')).toHaveText([
    'Georgia1,200',
    'Germany30',
    'Unknown4',
  ]);
  await expect(page.getByRole('list', { name: 'Cities' })).toContainText('Tbilisi1,100');
  await expect(page.getByRole('list', { name: 'Referrers' })).toContainText('www.facebook.com20');
  await expect(page.getByTestId('analytics-os')).toContainText(
    'There are no data to show right now',
  );
  await expect(page.getByRole('link', { name: 'IP Geolocation by DB-IP' })).toHaveAttribute(
    'href',
    'https://db-ip.com',
  );
  await expect(page.getByTestId('analytics-orders')).toContainText(
    'There are no data to show right now',
  );

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('recent orders: id, buyer, price, status (unknown values read "Other"), date', async ({
  page,
}) => {
  const buyer = {
    id: '01900000-0000-7000-8000-000000000b01',
    username: 'giorgi_k',
    avatar: null,
    isPremium: false,
    isIdVerified: false,
    isOnline: false,
    countryCode: 'GE',
    isDeleted: false,
  };
  const order = (n: number, status: string) => ({
    item: {
      type: 'order_item',
      id: `01900000-0000-7000-8000-000000000c0${n}`,
      displayId: `ORD${n}`,
      title: 'Logo design for your business',
      escrowId: null,
      orderId: null,
      contractId: null,
      project: null,
      gig: null,
    },
    buyer,
    price: { amount: 25000, currency: 'GEL' },
    status,
    createdAt: '2026-10-05T10:00:00Z',
  });
  await fakeApi(page, {
    analytics: { ...ANALYTICS, recentOrders: [order(1, 'in_progress'), order(2, 'something_new')] },
  });
  await page.goto(`/en/seller/gigs/${UID}/analytics`);
  const rows = page.getByRole('table', { name: 'Recent orders' }).locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('td')).toHaveText([
    'ORD1',
    'giorgi_k',
    '₾250.00',
    'In progress',
    '05.10.2026',
  ]);
  await expect(rows.nth(1).locator('td').nth(3)).toHaveText('Other');
});

test('Georgian page: device and country names in Georgian; phone width without sideways scroll', async ({
  page,
}) => {
  await fakeApi(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/seller/gigs/${UID}/analytics`);
  await expect(page.getByRole('list', { name: 'მოწყობილობები' })).toContainText('კომპიუტერი');
  // Country names come from the browser in the page language (`Intl.DisplayNames(['ka'])`: "საქართველო" in desktop
  // browsers; the test browser ships without Georgian region names and falls back to English).
  const georgia = await page.evaluate(() =>
    new Intl.DisplayNames(['ka'], { type: 'region' }).of('GE'),
  );
  await expect(page.getByRole('list', { name: 'ქვეყნები' })).toContainText(`${georgia}1,200`);
  await expect(page.getByRole('list', { name: 'ქვეყნები' })).toContainText('უცნობი4');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('another user\'s gig and an unknown uid show "Page not found" with a way back (AC-39)', async ({
  page,
}) => {
  await fakeApi(page, { owner: false });
  await page.goto(`/en/seller/gigs/${UID}/analytics`);
  await expect(page.getByTestId('gig-not-found')).toContainText('Page not found');
  await expect(page.getByTestId('kpi-clicks')).toHaveCount(0);

  await page.unrouteAll();
  await fakeApi(page, { lookup: 404 });
  await page.goto(`/en/seller/gigs/NOPE/analytics`);
  await expect(
    page.getByTestId('gig-not-found').getByRole('link', { name: 'Back to gigs' }),
  ).toBeVisible();
});
