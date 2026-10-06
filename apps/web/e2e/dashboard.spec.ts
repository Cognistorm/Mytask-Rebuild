// Dashboard shell + switcher, Selling Home and the Buying dashboard on the web (spec 02 AC-1…AC-7, task 4.1.16;
// design docs/05-design/screens/07-dashboard-switcher.md). The API side (getSellingDashboard, the saved
// `lastDashboard`) is covered by the API tests; here the real pages run against a routed API.
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
  lastDashboard: 'buying',
  avatar: null,
};

const CONFIG = {
  projects: { enabled: true },
  customOffers: { enabled: false },
  escrow: { unblockRequestAvailable: true },
};

const GEL = (amount: number) => ({ amount, currency: 'GEL' });

const EMPTY_DASHBOARD = {
  user: { fullName: 'Nino Beridze', isIdVerified: false, createdAt: '2023-05-10T08:00:00Z' },
  kpis: {
    earnings: GEL(0),
    availableBalance: GEL(0),
    pendingBalance: GEL(0),
    totalReach: 0,
    totalGigs: 0,
    awardedProjects: 0,
    completedOrders: 0,
    pendingOrders: 0,
    ordersInProgress: 0,
    canceledOrders: 0,
  },
  unreadContacts: [],
  latestOrders: [],
  latestAwardedProjects: [],
};

const BUYER = {
  id: '01900000-0000-7000-8000-000000000002',
  username: 'giorgi_k',
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: true,
  countryCode: 'GE',
  isDeleted: false,
};

/** Routes getMe, getPublicConfig, getSellingDashboard, updateMyPreferences and logout. */
async function fakeApi(
  page: Page,
  opts: {
    me?: Partial<typeof ME> | null;
    config?: Partial<typeof CONFIG>;
    dashboard?: unknown;
    dashboardFails?: number;
  } = {},
) {
  const calls = { preferences: [] as unknown[], dashboard: 0 };
  let me = { ...ME, ...opts.me };
  await page.route('**/api/v1/me', (route) =>
    opts.me === null
      ? json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' })
      : json(route, 200, me),
  );
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, { ...CONFIG, ...opts.config }),
  );
  await page.route('**/api/v1/me/dashboard/selling', (route) => {
    calls.dashboard += 1;
    if (calls.dashboard <= (opts.dashboardFails ?? 0))
      return json(route, 500, { code: 'INTERNAL', message: 'Server error' });
    return json(route, 200, opts.dashboard ?? EMPTY_DASHBOARD);
  });
  await page.route('**/api/v1/me/preferences', (route) => {
    const body = route.request().postDataJSON() as { lastDashboard: string };
    calls.preferences.push(body);
    me = { ...me, ...body };
    return json(route, 200, me);
  });
  return calls;
}

test('Selling Home (en), new user: welcome line, zero KPIs and empty states with "Create a new gig" (AC-6, AC-7)', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/seller/home');

  await expect(page).toHaveTitle(/^Seller dashboard \| /);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Welcome back, Nino Beridze!' }),
  ).toBeVisible();
  await expect(page.getByTestId('member-since')).toHaveText('Member since 10.05.2023');
  await expect(page.getByTestId('verified')).toHaveCount(0);

  for (const [id, value] of [
    ['kpi-available', '₾0.00'],
    ['kpi-pending', '₾0.00'],
    ['kpi-earnings', '₾0.00'],
    ['kpi-reach', '0'],
    ['kpi-gigs', '0'],
    ['kpi-awarded', '0'],
    ['kpi-completed', '0'],
    ['kpi-pending-orders', '0'],
    ['kpi-in-progress', '0'],
    ['kpi-canceled', '0'],
  ] as const) {
    await expect(page.getByTestId(id), id).toContainText(value);
  }
  // Tiles are groups named by their label (design 07 accessibility).
  await expect(page.getByRole('group', { name: 'Pending Balance' })).toBeVisible();

  // HOLD explanation by keyboard/touch (InfoButton, not a hover tooltip).
  const hint = page.getByText('Money buyers have already paid for your active orders', {
    exact: false,
  });
  await expect(hint).toBeHidden();
  await page.getByRole('button', { name: 'More information' }).click();
  await expect(hint).toBeVisible();

  await expect(page.getByTestId('unread-contacts')).toContainText('No messages yet');
  const orders = page.getByTestId('latest-orders');
  await expect(orders).toContainText('No orders yet');
  await expect(orders.getByRole('link', { name: 'Create a new gig' })).toHaveAttribute(
    'href',
    '/en/create',
  );
  await expect(page.getByTestId('latest-awarded')).toContainText('No projects yet');
  await expect(page.getByRole('link', { name: 'Switch to buying' })).toHaveAttribute(
    'href',
    '/en/account/projects',
  );
});

test('Selling navigation follows the settings; switcher and Home carry aria-current (AC-4, audit §3.9)', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/seller/home');
  const nav = page.getByRole('navigation', { name: 'Selling navigation' });
  await expect(nav).toContainText('Seller dashboard');
  await expect(nav.getByRole('link')).toHaveText([
    'Home',
    'Orders',
    'Gigs',
    'Awarded projects',
    'Reviews',
    'Refunds',
    'Unblock Money Requests',
    'Portfolio',
    'Earnings',
    'Withdrawals',
  ]);
  await expect(nav.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

  const switcher = page.getByRole('navigation', { name: 'Switch dashboard' });
  await expect(switcher.getByRole('link', { name: 'Selling' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(switcher.getByRole('link', { name: 'Buying' })).not.toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('settings: Offers ON (S-034), projects OFF (S-075), unblock unavailable (P-5)', async ({
  page,
}) => {
  await fakeApi(page, {
    config: {
      projects: { enabled: false },
      customOffers: { enabled: true },
      escrow: { unblockRequestAvailable: false },
    },
    dashboard: { ...EMPTY_DASHBOARD, latestAwardedProjects: null },
  });
  await page.goto('/en/seller/home');
  const nav = page.getByRole('navigation', { name: 'Selling navigation' });
  await expect(nav.getByRole('link', { name: 'Personal offers' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Awarded projects' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Unblock Money Requests' })).toHaveCount(0);
  await expect(page.getByTestId('latest-orders')).toBeVisible();
  await expect(page.getByTestId('latest-awarded')).toHaveCount(0);
  // Without projects the Buying side lands on its Orders page.
  await expect(
    page
      .getByRole('navigation', { name: 'Switch dashboard' })
      .getByRole('link', { name: 'Buying' }),
  ).toHaveAttribute('href', '/en/account/orders');
});

test('verified badge, negative migrated balance and filled lists', async ({ page }) => {
  await fakeApi(page, {
    dashboard: {
      ...EMPTY_DASHBOARD,
      user: { ...EMPTY_DASHBOARD.user, isIdVerified: true },
      kpis: { ...EMPTY_DASHBOARD.kpis, availableBalance: GEL(-1250), earnings: GEL(845000) },
      unreadContacts: [
        {
          user: BUYER,
          conversation: {
            id: '01900000-0000-7000-8000-0000000000c1',
            kind: 'direct',
            unreadCount: 2,
          },
          unreadCount: 2,
        },
      ],
      latestOrders: [
        {
          orderItemId: '01900000-0000-7000-8000-0000000000d1',
          displayId: 'A1B2C3',
          gig: {
            id: '01900000-0000-7000-8000-0000000000e1',
            uid: 'g1',
            slug: 'logo-design',
            title: 'Logo design',
            contentLocale: 'en',
            thumbnail: null,
          },
          buyer: BUYER,
          total: GEL(5000),
          status: 'in_progress',
          createdAt: '2026-09-30T10:00:00Z',
        },
      ],
    },
  });
  await page.goto('/en/seller/home');
  await expect(page.getByTestId('verified')).toHaveText('Verified account');
  await expect(page.getByTestId('kpi-available')).toContainText('−₾12.50');
  await expect(page.getByTestId('kpi-earnings')).toContainText('₾8,450.00');

  const contacts = page.getByTestId('unread-contacts');
  await expect(contacts.getByRole('link', { name: /giorgi_k/ })).toHaveAttribute(
    'href',
    '/en/inbox/01900000-0000-7000-8000-0000000000c1',
  );
  const orders = page.getByTestId('latest-orders');
  await expect(orders.getByRole('link', { name: 'Logo design' })).toHaveAttribute(
    'href',
    '/en/seller/orders/A1B2C3',
  );
  await expect(orders).toContainText('₾50.00');
  await expect(orders).toContainText('In progress');
  await expect(orders).toContainText('30.09.2026');
});

test('switching to Buying saves the choice and opens the Buying dashboard without a new login (AC-2, AC-3, AC-5)', async ({
  page,
}) => {
  const calls = await fakeApi(page, { me: { lastDashboard: 'selling' } });
  await page.goto('/en/seller/home');
  await expect(page.getByTestId('kpi-gigs')).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Switch dashboard' })
    .getByRole('link', { name: 'Buying' })
    .click();
  await expect(page).toHaveURL(/\/en\/account\/projects$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Ordered projects' })).toBeVisible();
  await expect.poll(() => calls.preferences).toEqual([{ lastDashboard: 'buying' }]);

  const nav = page.getByRole('navigation', { name: 'Buying navigation' });
  await expect(nav).toContainText('Buyer dashboard');
  await expect(nav.getByRole('link')).toHaveText([
    'Ordered projects',
    'Purchased Services',
    'My reviews',
    'Refunds',
    'Favorite list',
  ]);
  await expect(nav.getByRole('link', { name: 'Ordered projects' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByText('No projects yet')).toBeVisible();

  // Back to Selling through the account menu link (AC-2).
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByText('Logged in as nino_b!')).toBeVisible();
  await page.getByTestId('menu-switch').click();
  await expect(page).toHaveURL(/\/en\/seller\/home$/);
  await expect.poll(() => calls.preferences.length).toBe(2);
  expect(calls.preferences[1]).toEqual({ lastDashboard: 'selling' });
});

test('"My dashboard" opens the dashboard chosen last (AC-3)', async ({ page }) => {
  await fakeApi(page, { me: { lastDashboard: 'selling' } });
  await page.goto('/en/account');
  await expect(page.getByTestId('my-dashboard')).toHaveAttribute('href', '/en/seller/home');

  await page.unrouteAll();
  await fakeApi(page);
  await page.goto('/en/account');
  await expect(page.getByTestId('my-dashboard')).toHaveAttribute('href', '/en/account/projects');
});

test('guests are sent to login and come back afterwards', async ({ page }) => {
  await fakeApi(page, { me: null });
  await page.goto('/en/seller/home');
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Fseller%2Fhome$/);
});

test('a failed load offers "Try again" (screens table: error, retry)', async ({ page }) => {
  const calls = await fakeApi(page, { dashboardFails: 1 });
  await page.goto('/en/seller/home');
  await expect(page.getByText('Oops! Something went wrong. Please try again')).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByTestId('kpi-gigs')).toBeVisible();
  expect(calls.dashboard).toBeGreaterThanOrEqual(2);
});

test('Georgian is the default: switcher labels "ყიდვა" / "გაყიდვა"', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/seller/home');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  const switcher = page.getByRole('navigation', { name: 'პანელის გადართვა' });
  await expect(switcher.getByRole('link', { name: 'ყიდვა', exact: true })).toHaveAttribute(
    'href',
    '/account/projects',
  );
  await expect(switcher.getByRole('link', { name: 'გაყიდვა', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByText('ფრილანსერის პროფილი').first()).toBeAttached();
});

test('phone (360 px): full-width switcher with labels, drawer navigation, no horizontal scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeApi(page);
  await page.goto('/en/seller/home');
  await expect(page.getByTestId('kpi-gigs')).toBeVisible();

  const switcher = page.getByRole('navigation', { name: 'Switch dashboard' });
  await expect(switcher.getByRole('link', { name: 'Buying' })).toBeVisible();
  await expect(switcher.getByRole('link', { name: 'Selling' })).toBeVisible();
  const width = await switcher.evaluate((el) => el.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(300);

  const nav = page.getByRole('navigation', { name: 'Selling navigation' });
  await expect(nav).toBeHidden();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(nav.getByRole('link', { name: 'Portfolio' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
