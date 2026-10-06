// Visual checks of the key screens after the 3X refresh (ROADMAP 3X.18b; spec 3X R-1…R-4, visual-refresh.md §7):
// full-page screenshots in light and dark, at desktop and phone width (360 px: no sideways scroll), and a
// reduced-motion pass (nothing moves, zooms, drifts or shimmers; no content waits for an entrance).
// Pixel baselines are made on the Owner's Windows PC (local first, ADR-020) and compared there only: fonts render
// differently on the Linux CI runner, so CI runs every other check of this file. New baselines after an approved
// look change: `pnpm --filter @mytask/web exec playwright test visual-screens --update-snapshots`.
import { expect, test, type Page, type Route } from '@playwright/test';
import { BASE } from './base';

const PIXELS = process.platform === 'win32';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// 1×1 PNG for every media CDN image (stable pixels).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/** The signed-in user and an empty Selling dashboard (routed as in e2e/dashboard.spec.ts). */
async function signedIn(page: Page) {
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

/** Georgian (the default language) pages; `ready` is visible once the screen has its content. */
const SCREENS: {
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
];

async function open(page: Page, screen: (typeof SCREENS)[number], theme: 'light' | 'dark') {
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
async function revealAll(page: Page) {
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

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const screen of SCREENS) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [device, viewport] of [
      ['desktop', { width: 1280, height: 900 }],
      ['phone', { width: 360, height: 800 }],
    ] as const) {
      test(`${screen.name}, ${theme}, ${device}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await open(page, screen, theme);
        if (device === 'phone') expect(await sidewaysScroll(page)).toBe(0);
        await revealAll(page);
        if (PIXELS) {
          await expect(page).toHaveScreenshot(`${screen.name}-${theme}-${device}.png`, {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
          });
        }
      });
    }
  }
}

/** Running animations that loop forever or move/scale something (only fades may remain under reduced motion). */
const movingAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => {
        const effect = a.effect as KeyframeEffect | null;
        if (!effect) return false;
        if (effect.getTiming().iterations === Infinity) return true;
        return effect
          .getKeyframes()
          .some((k) => ['transform', 'translate', 'scale', 'rotate'].some((p) => p in k));
      })
      .map((a) => (a as CSSAnimation).animationName ?? String(a.id)),
  );

const identity = (t: string) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';

test('the checks below are real: without reduced motion the hero drifts and cards rise in', async ({
  page,
}) => {
  await open(page, SCREENS[0]!, 'light');
  expect(await movingAnimations(page)).toContain('mt-home-drift');
  await expect(page.locator('[data-motion="ready"]').first()).toBeAttached();
});

for (const screen of SCREENS) {
  test(`reduced motion: ${screen.name} — nothing moves, zooms, drifts or shimmers; no hidden content`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', baseURL: BASE });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, screen, 'light');
    expect(await movingAnimations(page)).toEqual([]);
    // Every entrance item is visible without scrolling to it.
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('.mt-motion-entrance')].filter(
          (el) => getComputedStyle(el).opacity !== '1',
        ).length,
    );
    expect(hidden).toBe(0);
    // A hovered card neither lifts nor zooms its image.
    const card = page.getByTestId('gig-card').first();
    if (await card.count()) {
      await card.hover();
      await page.waitForTimeout(250);
      const t = await card.evaluate((el) => ({
        card: getComputedStyle(el).transform,
        img: el.querySelector('img')
          ? getComputedStyle(el.querySelector('img')!).transform
          : 'none',
      }));
      expect(identity(t.card), t.card).toBe(true);
      expect(identity(t.img), t.img).toBe(true);
      expect(await movingAnimations(page)).toEqual([]);
    }
    await context.close();
  });
}

test('reduced motion: the dashboard skeleton does not shimmer', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', baseURL: BASE });
  const page = await context.newPage();
  await signedIn(page);
  // Hold the dashboard answer so the skeleton stays on screen.
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/api/v1/me/dashboard/selling', async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto('/seller/home');
  const box = page.locator('.mt-skeleton-box').first();
  await expect(box).toBeVisible();
  expect(await box.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await movingAnimations(page)).toEqual([]);
  release();
  await expect(page.getByTestId('kpi-earnings')).toBeVisible();
  await context.close();
});
