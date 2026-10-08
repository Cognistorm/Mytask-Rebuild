// Buying → Favourites `/account/favorite` (ROADMAP 4.3.12c; spec 04 AC-35, AC-36). The page runs against a routed API
// with state (getMe, listFavorites pages of 42, deleteFavorite); which saved gigs are listable is the API's rule
// (tested in apps/api).
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
  lastDashboard: 'buying',
  avatar: null,
};

const card = (n: number) => {
  const uid = `FAVG${String(n).padStart(16, '0')}`;
  return {
    id: `01900000-0000-7000-8000-0000000f${String(n).padStart(4, '0')}`,
    uid,
    slug: `saved-gig-${n}-${uid.toLowerCase()}`,
    title: `Saved gig ${n}`,
    contentLocale: 'en',
    thumbnail: {
      fileId: `01900000-0000-7000-8000-0000000e${String(n).padStart(4, '0')}`,
      thumb: `${MEDIA}/fav-${n}-thumb.webp`,
      medium: `${MEDIA}/fav-${n}-medium.webp`,
      large: `${MEDIA}/fav-${n}-large.webp`,
      width: 1200,
      height: 800,
    },
    price: { amount: 1000 * n, currency: 'GEL' },
    deliveryDays: 3,
    rating: { count: 0, averageTenths: null },
    seller: {
      id: '01900000-0000-7000-8000-000000000003',
      username: 'gig_seller',
      avatar: null,
      isPremium: false,
      isIdVerified: false,
      isOnline: false,
      countryCode: 'GE',
      isDeleted: false,
    },
    isFeatured: false,
    isFavorite: true,
  };
};

async function fakeApi(page: Page, count: number, opts: { deleteStatus?: number } = {}) {
  const list = Array.from({ length: count }, (_, i) => card(i + 1));
  const queries: string[] = [];
  const deleted: string[] = [];
  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  await page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  await page.route(/\/api\/v1\/favorites(\?.*)?$/, (route) => {
    const url = new URL(route.request().url());
    queries.push(url.search);
    const start = Number(url.searchParams.get('cursor') ?? 0);
    const limit = Number(url.searchParams.get('limit'));
    return json(route, 200, {
      data: list.slice(start, start + limit),
      nextCursor: start + limit < list.length ? String(start + limit) : null,
    });
  });
  await page.route(/\/api\/v1\/favorites\/[0-9a-f-]{36}$/, (route) => {
    const id = route.request().url().split('/').pop()!;
    deleted.push(`${route.request().method()} ${id}`);
    const status = opts.deleteStatus ?? 204;
    if (status === 204 || status === 404) {
      list.splice(
        list.findIndex((c) => c.id === id),
        1,
      );
    }
    return status === 204
      ? route.fulfill({ status })
      : json(route, status, { code: 'NOT_FOUND', message: 'x' });
  });
  return { queries, deleted };
}

test('list: 42 per page with Load more; gig, seller, starting price, remove (AC-36)', async ({
  page,
}) => {
  const api = await fakeApi(page, 43);
  await page.goto('/en/account/favorite');
  await expect(page).toHaveTitle(/^Favorite list \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Favorite list' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Buying navigation' })
      .getByRole('link', { name: 'Favorite list' }),
  ).toHaveAttribute('aria-current', 'page');

  const table = page.getByRole('table', { name: 'Favorite list' });
  await expect(table.getByRole('columnheader')).toHaveText([
    'Gig',
    'Seller',
    'Starting at',
    'Options',
  ]);
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(42);
  const first = card(1);
  await expect(rows.nth(0).getByRole('link', { name: 'Saved gig 1' })).toHaveAttribute(
    'href',
    `/en/service/${first.slug}`,
  );
  await expect(rows.nth(0).getByRole('link', { name: 'gig_seller' })).toHaveAttribute(
    'href',
    '/en/profile/gig_seller',
  );
  await expect(rows.nth(0)).toContainText('₾10.00');
  await expect(
    rows.nth(0).getByRole('button', { name: 'Remove from favorite: Saved gig 1' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(rows).toHaveCount(43);
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(api.queries).toEqual(['?limit=42', '?limit=42&cursor=42']);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('remove: the legacy confirm; Cancel keeps it, Remove deletes it with the message (AC-35)', async ({
  page,
}) => {
  const api = await fakeApi(page, 2);
  await page.goto('/en/account/favorite');
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);

  await page.getByRole('button', { name: 'Remove from favorite: Saved gig 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Remove from favorite' });
  await expect(dialog).toContainText(
    'Are you sure you want to remove this gig from favorite list?',
  );
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(api.deleted).toEqual([]);

  await page.getByRole('button', { name: 'Remove from favorite: Saved gig 1' }).click();
  await dialog.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByText('Gig has been removed from your favorite list')).toBeVisible();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Saved gig 2');
  expect(api.deleted).toEqual([`DELETE ${card(1).id}`]);
});

test('a gig that is already gone (404) leaves the list too', async ({ page }) => {
  await fakeApi(page, 1, { deleteStatus: 404 });
  await page.goto('/en/account/favorite');
  await page.getByRole('button', { name: 'Remove from favorite: Saved gig 1' }).click();
  await page
    .getByRole('dialog', { name: 'Remove from favorite' })
    .getByRole('button', { name: 'Remove', exact: true })
    .click();
  // The last row is gone, so the list shows its empty state.
  await expect(page.getByText('You have no saved gigs yet.')).toBeVisible();
  await expect(page.getByText('Gig has been removed from your favorite list')).toBeVisible();
});

test('no saved gigs: the empty state; phone width without sideways scroll', async ({ page }) => {
  await fakeApi(page, 0);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/account/favorite');
  await expect(page.getByText('შენახული განცხადებები ჯერ არ გაქვთ.')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
