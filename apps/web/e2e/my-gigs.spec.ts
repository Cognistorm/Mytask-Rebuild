// Selling → Gigs `/seller/gigs` (ROADMAP 4.3.12a; spec 04 AC-20, AC-24; url-map §5). The page runs against a routed
// API with state (getMe, listMyGigs pages, deleteGig); the API rules (owner only, 409 with orders in queue) are tested
// in apps/api.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const MEDIA = 'http://media.test/public-media';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

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

type Status = 'active' | 'pending' | 'rejected';

function row(n: number, status: Status, extra: Record<string, unknown> = {}) {
  const uid = `GIGU${String(n).padStart(16, '0')}`;
  return {
    id: `01900000-0000-7000-8000-0000000006${String(n).padStart(2, '0')}`,
    uid,
    slug: `gig-${n}-${uid.toLowerCase()}`,
    title: `Gig number ${n}`,
    contentLocale: 'en',
    thumbnail: {
      fileId: `01900000-0000-7000-8000-0000000007${String(n).padStart(2, '0')}`,
      thumb: `${MEDIA}/gig-${n}-thumb.webp`,
      medium: `${MEDIA}/gig-${n}-medium.webp`,
      large: `${MEDIA}/gig-${n}-large.webp`,
      width: 1200,
      height: 800,
    },
    price: { amount: 2500 * n, currency: 'GEL' },
    status,
    rejectionReason: status === 'rejected' ? 'Images are blurry.' : null,
    ordersInQueueCount: 0,
    createdAt: '2026-10-01T10:00:00Z',
    updatedAt: '2026-10-01T10:00:00Z',
    ...extra,
  };
}

/** Routes getMe and the gig list (two pages when `pageSize` is smaller than the list) and deleteGig. */
async function fakeApi(
  page: Page,
  rows: ReturnType<typeof row>[],
  opts: { deleteStatus?: number } = {},
) {
  const list = structuredClone(rows);
  const deleted: string[] = [];
  const cursors: (string | null)[] = [];
  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  await page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  await page.route(/\/api\/v1\/gigs\/mine(\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get('cursor');
    cursors.push(cursor);
    const start = Number(cursor ?? 0);
    const size = 3;
    const data = list.slice(start, start + size);
    return json(route, 200, {
      data,
      nextCursor: start + size < list.length ? String(start + size) : null,
    });
  });
  await page.route(/\/api\/v1\/gigs\/[0-9a-f-]{36}$/, (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const id = route.request().url().split('/').pop()!;
    deleted.push(id);
    const status = opts.deleteStatus ?? 204;
    if (status === 204) {
      list.splice(
        list.findIndex((r) => r.id === id),
        1,
      );
      return route.fulfill({ status: 204 });
    }
    return json(route, status, { code: 'GIG_HAS_ORDERS_IN_QUEUE', message: 'x' });
  });
  return { deleted, cursors };
}

test('list: gig, price, orders in queue, status with the reason, options; Load more (AC-20)', async ({
  page,
}) => {
  const api = await fakeApi(page, [
    row(1, 'active', { ordersInQueueCount: 2 }),
    row(2, 'pending'),
    row(3, 'rejected'),
    row(4, 'active', { title: 'Gig number 4', contentLocale: 'ka' }),
  ]);
  await page.goto('/en/seller/gigs');
  await expect(page).toHaveTitle(/^My gigs \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'My gigs' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Selling navigation' })
      .getByRole('link', { name: 'Gigs' }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Create a new gig' })).toHaveAttribute(
    'href',
    '/en/create',
  );

  const table = page.getByRole('table', { name: 'My gigs' });
  await expect(table.getByRole('columnheader')).toHaveText([
    'Gig',
    'Price',
    'Orders in queue',
    'Status',
    'Options',
  ]);
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Gig number 1');
  await expect(rows.nth(0)).toContainText('₾25.00');
  await expect(rows.nth(0).locator('td').nth(2)).toHaveText('2');
  await expect(rows.nth(0).getByTestId('status')).toHaveText('Active');
  await expect(rows.nth(1).getByTestId('status')).toHaveText('Pending');
  await expect(rows.nth(2).getByTestId('status')).toHaveText('Needs changes');
  await expect(rows.nth(2).getByTestId('rejection-reason')).toHaveText(
    'Rejection reason: Images are blurry.',
  );
  await expect(rows.nth(0).getByTestId('rejection-reason')).toHaveCount(0);

  const uid = row(1, 'active').uid;
  await expect(rows.nth(0).getByRole('link', { name: 'View: Gig number 1' })).toHaveAttribute(
    'href',
    `/en/service/gig-1-${uid.toLowerCase()}`,
  );
  await expect(rows.nth(0).getByRole('link', { name: 'Edit: Gig number 1' })).toHaveAttribute(
    'href',
    `/en/seller/gigs/${uid}/edit`,
  );
  await expect(rows.nth(0).getByRole('link', { name: 'Analytics: Gig number 1' })).toHaveAttribute(
    'href',
    `/en/seller/gigs/${uid}/analytics`,
  );

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(rows).toHaveCount(4);
  await expect(rows.nth(3).getByText('Gig number 4')).toHaveAttribute('lang', 'ka');
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(api.cursors).toEqual([null, '3']);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('delete: confirm, Cancel keeps the gig, Delete removes it with the message (AC-24)', async ({
  page,
}) => {
  const api = await fakeApi(page, [row(1, 'active'), row(2, 'pending')]);
  await page.goto('/en/seller/gigs');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);

  await page.getByRole('button', { name: 'Delete: Gig number 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete gig' });
  await expect(dialog).toContainText('Are you sure you want to delete this gig?');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(api.deleted).toEqual([]);

  await page.getByRole('button', { name: 'Delete: Gig number 1' }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Gig has been successfully deleted')).toBeVisible();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Gig number 2');
  expect(api.deleted).toEqual([row(1, 'active').id]);
});

test('delete refused while orders are in the queue: the gig stays (AC-24)', async ({ page }) => {
  await fakeApi(page, [row(1, 'active', { ordersInQueueCount: 1 })], { deleteStatus: 409 });
  await page.goto('/en/seller/gigs');
  await page.getByRole('button', { name: 'Delete: Gig number 1' }).click();
  await page
    .getByRole('dialog', { name: 'Delete gig' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'This gig has orders in queue' }),
  ).toHaveText('This gig has orders in queue, please finish them before you can delete it');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('no gigs: the empty state with "Create a new gig"; phone width without sideways scroll', async ({
  page,
}) => {
  await fakeApi(page, []);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/seller/gigs');
  await expect(page.getByText('განცხადებები ჯერ არ გაქვთ.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'განცხადების დამატება' })).toHaveCount(2);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('legacy /seller/gigs/edit/{uid} and /seller/gigs/analytics/{uid} answer 301 (url-map §5)', async ({
  page,
}) => {
  for (const [from, to] of [
    ['/seller/gigs/edit/ABC123', '/seller/gigs/ABC123/edit'],
    ['/en/seller/gigs/analytics/ABC123', '/en/seller/gigs/ABC123/analytics'],
  ] as const) {
    const res = await page.request.get(from, { maxRedirects: 0 });
    expect(res.status()).toBe(301);
    expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe(to);
  }
});
