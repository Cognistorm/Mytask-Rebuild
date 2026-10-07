// The key screens of the 3X checks (ROADMAP 3X.18b screenshots, 3X.18c contrast) and how to open each one: the
// stand-in API (e2e/fake-api.mjs) answers the server, the dashboard's browser calls and the media CDN are routed.
import { expect, type Page, type Route } from '@playwright/test';
import { BASE } from './base';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// 1×1 PNG for every media CDN image (stable pixels).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** The signed-in user and an empty Selling dashboard (routed as in e2e/dashboard.spec.ts). */
export async function signedIn(page: Page) {
  await page.route('**/api/v1/me', (route) =>
    json(route, 200, {
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
    }),
  );
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
    }),
  );
  const gel = { amount: 0, currency: 'GEL' };
  await page.route('**/api/v1/me/dashboard/selling', (route) =>
    json(route, 200, {
      user: { fullName: 'Nino Beridze', isIdVerified: false, createdAt: '2023-05-10T08:00:00Z' },
      kpis: {
        earnings: gel,
        availableBalance: gel,
        pendingBalance: gel,
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
    }),
  );
}

/** The gig wizard's browser calls (as in e2e/gig-wizard.spec.ts): plan check, public config, the gig to edit. */
const GIG_ID = '01900000-0000-7000-8000-000000000601';
const CAT = (n: number) => `01900000-0000-7000-8000-0000000c${String(n).padStart(4, '0')}`;
const MEDIA = 'http://media.test/public-media';
const variants = (n: number) => {
  const fileId = `01900000-0000-7000-8000-0000000007${String(n).padStart(2, '0')}`;
  return { fileId, thumb: `${MEDIA}/${n}-thumb.png`, medium: '', large: '', width: 1, height: 1 };
};

async function gigWizard(page: Page) {
  await signedIn(page);
  const rule = (enabled: boolean, maxFiles: number, maxSizeMb: number) => ({
    enabled,
    maxFiles,
    maxSizeMb,
    allowedExtensions: [],
  });
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
      revisions: { maxAllowed: 10 },
      uploads: { gigImage: rule(true, 10, 5), gigDocument: rule(true, 2, 10) },
    }),
  );
  await page.route('**/api/v1/gigs/creation-eligibility', (route) =>
    json(route, 200, {
      canCreate: true,
      plan: 'standard',
      gigCount: 0,
      gigLimit: 1,
      settingId: 'S-001',
    }),
  );
}

/** A 1×1 PNG that decodes (the shared `PNG` above does not: browsers show it as a broken image). */
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

async function gigEdit(page: Page) {
  await gigWizard(page);
  // Registered after `open`'s media route, so it wins for the stored gallery previews.
  await page.route(`${MEDIA}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: VALID_PNG }),
  );
  await page.route('**/api/v1/gigs/lookup?*', (route) =>
    json(route, 200, { id: GIG_ID, status: 'rejected', viewer: { isOwner: true } }),
  );
  await page.route(`**/api/v1/gigs/${GIG_ID}/owner-view`, (route) =>
    json(route, 200, {
      id: GIG_ID,
      uid: 'k7m2p9q4r1',
      slug: 'logos-dizaini-k7m2p9q4r1',
      status: 'rejected',
      rejectionReason: 'სურათები ბუნდოვანია.',
      title: { ka: 'ლოგოს დიზაინი ორ დღეში', en: 'Logo design in two days' },
      description: {
        ka: '<p><strong>ლოგოს</strong> დიზაინი ორ დღეში, სამი ვარიანტით.</p>',
        en: null,
      },
      categoryId: CAT(1),
      subcategoryId: CAT(101),
      childCategoryId: CAT(1001),
      price: { amount: 25000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      upgrades: [
        {
          id: '01900000-0000-7000-8000-000000000611',
          title: 'წყარო ფაილი',
          price: { amount: 2000, currency: 'GEL' },
          extraDays: 1,
        },
      ],
      faqs: [{ id: '01900000-0000-7000-8000-000000000621', question: 'სწრაფად?', answer: 'დიახ.' }],
      thumbnail: variants(1),
      images: [variants(2), variants(3)],
      documents: [],
      seo: null,
      ordersInQueueCount: 0,
      createdAt: '2026-10-01T10:00:00.000Z',
      updatedAt: '2026-10-01T10:00:00.000Z',
      publishedAt: null,
    }),
  );
}

/** Georgian (the default language) pages; `ready` is visible once the screen has its content. */
export const SCREENS: {
  name: string;
  path: string;
  ready: (page: Page) => ReturnType<Page['locator']>;
  setup?: (page: Page) => Promise<void>;
}[] = [
  { name: 'home', path: '/', ready: (p) => p.locator('.mt-home-hero') },
  {
    name: 'category',
    path: '/categories/design',
    ready: (p) => p.getByTestId('gig-card').first(),
  },
  { name: 'search', path: '/search?q=logo', ready: (p) => p.getByTestId('gig-card').first() },
  {
    name: 'profile',
    path: '/profile/nino_b',
    ready: (p) => p.getByRole('heading', { level: 1 }),
  },
  {
    name: 'dashboard',
    path: '/seller/home',
    ready: (p) => p.getByTestId('kpi-earnings'),
    setup: signedIn,
  },
  { name: 'login', path: '/auth/login', ready: (p) => p.getByRole('heading', { level: 1 }) },
  // ROADMAP 4.3.10e: the gig wizard (screen 03), new and editing a rejected gig.
  {
    name: 'gig-create',
    path: '/create',
    ready: (p) => p.locator('#gig-overview'),
    setup: gigWizard,
  },
  {
    name: 'gig-edit',
    path: '/seller/gigs/k7m2p9q4r1/edit',
    // The rejected-reason Banner shows once the gig is loaded (on a phone the gallery is a later step).
    ready: (p) => p.getByTestId('gig-rejected'),
    setup: gigEdit,
  },
];

export async function open(page: Page, screen: (typeof SCREENS)[number], theme: 'light' | 'dark') {
  await page.context().addCookies([{ name: 'mt_theme', value: theme, url: BASE, sameSite: 'Lax' }]);
  await page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  await screen.setup?.(page);
  await page.goto(screen.path);
  await expect(screen.ready(page)).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await page.evaluate(() => document.fonts.ready);
}

/** Scrolls through the page so every M-10 entrance item has come into view, then back to the top. */
export async function revealAll(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(200, innerHeight / 2);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 30)));
    }
    scrollTo(0, 0);
  });
  // Cards further along a sideways row (home rows on a phone) rise in when the row is swiped: not on screen here.
  const unseen = () =>
    page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '[data-motion="ready"] .mt-motion-entrance:not([data-seen])',
          ),
        ].filter((el) => el.getBoundingClientRect().left < innerWidth).length,
    );
  await expect.poll(unseen).toBe(0);
  // Back at the top: the header over the hero drops its scrolled surface again.
  await page.waitForTimeout(350);
}
