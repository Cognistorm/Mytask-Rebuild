// Public profile, portfolio list and portfolio item on the web (spec 02 AC-8…AC-13, AC-28, AC-42, EC-4, EC-10;
// task 4.1.17). The pages load on the server against e2e/fake-profiles.mjs (via e2e/fake-api.mjs); the
// visitor is chosen by the access cookie the test sets. Browser calls ("Load more", session refresh) and the
// media CDN are routed here.
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { BASE, COOKIE_URL } from './base';
import { PORTFOLIO_PAGE_2, UID } from './fake-profiles.mjs';

// CDP accepts a Secure (__Host-) cookie only for an https URL; Chromium sends it to http://localhost too.
// 1×1 transparent PNG for every CDN image.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function as(context: BrowserContext, token: 'owner-token' | 'viewer-token') {
  await context.addCookies([
    {
      name: '__Host-mt_at',
      value: token,
      url: COOKIE_URL,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

async function media(page: Page) {
  const requested: string[] = [];
  await page.route('http://media.test/**', (route) => {
    requested.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
  });
  return requested;
}

test('guest sees the full profile (en): card, notice, ratings, about, portfolio preview, skills (AC-8, AC-10, AC-11)', async ({
  page,
}) => {
  const images = await media(page);
  const res = await page.goto('/en/profile/nino_b');
  expect(res?.status()).toBe(200);
  // The media CDN is allowed by the page CSP (img-src).
  expect(res?.headers()['content-security-policy']).toMatch(/img-src [^;]*http:\/\/media\.test/);

  await expect(page).toHaveTitle('nino_b | MyTask');
  // One h1 (audit §3.6): the name.
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Nino Beridze');
  const card = page.getByTestId('profile-card');
  await expect(card.getByText('@nino_b')).toBeVisible();
  await expect(card.getByText('Online', { exact: true })).toBeVisible();
  await expect(card.getByText('Logo and brand designer')).toBeVisible();
  await expect(page.getByTestId('member-since')).toHaveText('10.05.2023');
  await expect(page.getByTestId('local-time')).toHaveText(/^\d{2}:\d{2}$/);
  await expect(page.getByTestId('verifications')).toContainText('ID');
  await expect(page.getByTestId('verifications')).toContainText('E-mail address');
  await expect(page.getByTestId('languages')).toContainText('GeorgianNative');
  await expect(page.getByTestId('languages')).toContainText('EnglishFluent');
  const linked = page.getByTestId('linked-accounts');
  await expect(linked.getByRole('link')).toHaveCount(2);
  await expect(linked.getByRole('link').first()).toHaveAttribute(
    'href',
    'https://dribbble.com/nino',
  );
  await expect(linked.getByRole('link').first()).toHaveAttribute('rel', /nofollow/);

  // Guest: "Contact me" asks to log in first (AC-11); no "Edit profile", no report yet (4.1.20).
  await expect(page.getByRole('link', { name: 'Contact me' })).toHaveAttribute(
    'href',
    `/en/auth/login?next=${encodeURIComponent('/en/inbox/u/nino_b')}`,
  );
  await expect(page.getByRole('link', { name: 'Edit profile' })).toHaveCount(0);

  await expect(page.getByTestId('availability')).toContainText(
    'This user is not available right now, and he will be back on 24.12.2026',
  );
  await expect(page.getByTestId('availability')).toContainText('On holiday, back after Christmas.');

  // Two rating blocks (AC-10): freelancer 4.5 from 4 reviews, client empty.
  const freelancer = page.getByTestId('rating-freelancer');
  await expect(freelancer.getByRole('heading', { name: 'As a freelancer' })).toBeVisible();
  await expect(freelancer).toContainText('4.5');
  await expect(freelancer).toContainText('Based on 4 reviews');
  await expect(
    freelancer.getByRole('img', { name: 'Rating 4.5 out of 5, 4 reviews' }),
  ).toBeVisible();
  await expect(page.getByTestId('rating-client')).toContainText('No reviews yet');

  // About me folds with More / Less (AC-18).
  // (Scoped to the page content: the header's category bar may show its own "More ▾", 3X.10.)
  const more = page.locator('#mt-content').getByRole('button', { name: 'More' });
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(page.getByRole('button', { name: 'Less' })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('About line 12.', { exact: false })).toBeVisible();

  // No gigs block for visitors in slice 1 (EC-10).
  await expect(page.getByRole('heading', { name: 'Gigs' })).toHaveCount(0);

  // Portfolio preview: 6 works and the link to the full portfolio.
  const preview = page.getByTestId('portfolio-preview');
  await expect(preview.getByRole('listitem')).toHaveCount(6);
  await expect(preview.getByRole('link', { name: 'Work 30' })).toHaveAttribute(
    'href',
    `/en/profile/nino_b/portfolio/work-30-${UID(30)}`,
  );
  await expect(preview.getByRole('link', { name: 'View my portfolio' })).toHaveAttribute(
    'href',
    '/en/profile/nino_b/portfolio',
  );

  // Skills link to /hire/{slug}; the level is in the accessible name.
  await expect(page.getByRole('link', { name: /^Logo design\s*, Expert$/ })).toHaveAttribute(
    'href',
    '/en/hire/logo-design',
  );

  // Indexable: no robots meta. Images came from the CDN.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  expect(images.some((u) => u.endsWith('/avatar-medium.webp'))).toBe(true);
});

test('Georgian profile at the unprefixed URL uses ka texts', async ({ page }) => {
  await media(page);
  await page.goto('/profile/nino_b');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ka');
  await expect(page.getByRole('link', { name: 'შეტყობინების გაგზავნა' })).toHaveAttribute(
    'href',
    `/auth/login?next=${encodeURIComponent('/inbox/u/nino_b')}`,
  );
  await expect(page.getByTestId('rating-client')).toContainText('შეფასებები ჯერ არ არის');
});

test('an unknown, hidden or renamed user answers 404 (AC-9, EC-4)', async ({ page }) => {
  for (const path of [
    '/en/profile/ghost',
    '/en/profile/ghost/portfolio',
    `/en/profile/new_user/portfolio/work-30-${UID(30)}`,
    `/en/profile/nino_b/portfolio/work-99-${UID(99)}`,
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveText('Page not found');
  }
});

test('the 404 page is the localised legacy page with a link home, also for unknown URLs (QA 4.1.26 BUG-01)', async ({
  page,
}) => {
  for (const [path, locale] of [
    ['/profile/ghost', 'ka'],
    [`/profile/nino_b/portfolio/work-31-${UID(31)}`, 'ka'],
    ['/no/such/page', 'ka'],
    ['/en/no/such/page', 'en'],
    ['/en/account/no-such-page', 'en'],
  ] as const) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
    const ka = locale === 'ka';
    await expect(page.locator('html'), path).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveText(
      ka ? 'გვერდი ვერ მოიძებნა' : 'Page not found',
    );
    await expect(page.getByTestId('not-found'), path).toContainText(
      ka
        ? 'გთხოვთ შეამოწმოთ ბმული მისამართის ველში და სცადოთ ხელახლა'
        : 'Please check the URL in the address bar and try again',
    );
    await expect(page, path).toHaveTitle(
      ka ? 'გვერდი ვერ მოიძებნა | MyTask' : 'Page not found | MyTask',
    );
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute('content', /noindex/);
    if (path === '/no/such/page') {
      // Phones: "404" sits right above the text, not a screen apart (QA 4.1.28 BUG-08).
      await page.setViewportSize({ width: 390, height: 844 });
      const code = await page.getByText('404', { exact: true }).boundingBox();
      const title = await page.getByRole('heading', { level: 1 }).boundingBox();
      expect(title!.y - (code!.y + code!.height)).toBeLessThan(64);
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    await expect(
      page.getByRole('link', { name: ka ? 'მთავარ გვერდზე დაბრუნება' : 'Back to homepage' }),
      path,
    ).toHaveAttribute('href', ka ? '/' : '/en');
  }
});

test('empty profile: username as the heading, no empty blocks for visitors, noindex follow (spec 17 AC-41)', async ({
  page,
}) => {
  await page.goto('/en/profile/new_user');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('new_user');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  await expect(page.getByText('Offline', { exact: true })).toBeVisible();
  for (const id of [
    'verifications',
    'languages',
    'linked-accounts',
    'availability',
    'portfolio-preview',
  ])
    await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.getByTestId('local-time')).toHaveCount(0);
  await expect(page.getByTestId('rating-freelancer')).toContainText('No reviews yet');
});

test('the owner sees "Edit profile", the empty gigs block and their pending and rejected work (AC-13, EC-10, AC-28)', async ({
  page,
  context,
}) => {
  await media(page);
  await as(context, 'owner-token');
  await page.goto('/en/profile/nino_b');
  await expect(page.getByRole('link', { name: 'Edit profile' })).toHaveAttribute(
    'href',
    '/en/account/profile',
  );
  await expect(page.getByRole('link', { name: 'Contact me' })).toHaveCount(0);
  await expect(page.getByText('You have no gigs yet.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Create a new gig' })).toHaveAttribute(
    'href',
    '/en/create',
  );
  const preview = page.getByTestId('portfolio-preview');
  await expect(preview.getByTestId('status-rejected')).toHaveText('Rejected');
  await expect(preview.getByTestId('status-pending')).toHaveText('Pending');
});

test('a signed-in visitor goes straight to the chat from "Contact me" (AC-11)', async ({
  page,
  context,
}) => {
  await media(page);
  await as(context, 'viewer-token');
  await page.goto('/en/profile/nino_b');
  await expect(page.getByRole('link', { name: 'Contact me' })).toHaveAttribute(
    'href',
    '/en/inbox/u/nino_b',
  );
});

test('an expired access token is refreshed once and the page renders as the signed-in owner', async ({
  page,
  context,
}) => {
  await media(page);
  // Signed in before (device cookie), the access cookie has expired.
  await context.addCookies([
    {
      name: '__Host-mt_did',
      value: 'device-1',
      url: COOKIE_URL,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  let refreshed = 0;
  await page.route('**/api/v1/me', (route) => {
    if (refreshed === 0) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'UNAUTHENTICATED', message: 'Unauthenticated' }),
      });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/v1/auth/refresh', (route) => {
    refreshed += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'set-cookie': '__Host-mt_at=owner-token; Path=/; Secure; HttpOnly; SameSite=Lax' },
      body: JSON.stringify({ accessToken: null, refreshToken: null }),
    });
  });
  await page.goto('/en/profile/nino_b');
  await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible();
  expect(refreshed).toBe(1);
});

test('share dialog: social links, copy link, Esc closes and focus returns (design §7.4, §8.1)', async ({
  page,
  context,
}) => {
  await media(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/en/profile/nino_b');
  const trigger = page.getByRole('button', { name: 'Share profile' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Share profile' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Share on Facebook' })).toHaveAttribute(
    'href',
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${BASE}/en/profile/nino_b`)}`,
  );
  await expect(dialog.getByRole('link')).toHaveCount(4);
  await dialog.getByRole('button', { name: 'Copy link' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Profile link copied to your clipboard');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${BASE}/en/profile/nino_b`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('portfolio list: owner box, 24 works, "Load more" brings the rest (AC-28)', async ({
  page,
}) => {
  await media(page);
  const asked: string[] = [];
  await page.route('**/api/v1/portfolio-items?*', (route) => {
    asked.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PORTFOLIO_PAGE_2),
    });
  });
  await page.goto('/en/profile/nino_b/portfolio');
  await expect(page).toHaveTitle('nino_b portfolio | MyTask');
  await expect(page.getByRole('heading', { level: 1, name: 'nino_b portfolio' })).toBeVisible();
  const owner = page.getByTestId('owner-box');
  await expect(owner.getByRole('link', { name: 'View profile' })).toHaveAttribute(
    'href',
    '/en/profile/nino_b',
  );
  await expect(owner.getByRole('link', { name: 'Contact me' })).toBeVisible();

  const grid = page.getByTestId('portfolio-grid');
  await expect(grid.getByRole('listitem')).toHaveCount(24);
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(grid.getByRole('listitem')).toHaveCount(30);
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(new URL(asked[0]!).searchParams.get('cursor')).toBe('24');
  expect(new URL(asked[0]!).searchParams.get('username')).toBe('nino_b');
});

test('portfolio list of a user without work shows "No work added yet."', async ({ page }) => {
  await page.goto('/en/profile/new_user/portfolio');
  await expect(page.getByText('No work added yet.')).toBeVisible();
});

test('portfolio item: thumbnail, links, gallery, description, share and owner box (AC-28)', async ({
  page,
}) => {
  const images = await media(page);
  const slug = `work-30-${UID(30)}`;
  await page.goto(`/en/profile/nino_b/portfolio/${slug}`);
  await expect(page).toHaveTitle('Work 30 | MyTask');
  await expect(page.getByRole('heading', { level: 1, name: 'Work 30' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Watch video' })).toHaveAttribute(
    'href',
    'https://example.com/video',
  );
  await expect(page.getByRole('link', { name: 'Live preview' })).toHaveAttribute('rel', /nofollow/);
  await expect(page.getByTestId('gallery').getByRole('img')).toHaveCount(2);
  await expect(page.getByText('Second line.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share this project' })).toBeVisible();
  await expect(
    page.getByTestId('owner-box').getByRole('link', { name: 'Contact me' }),
  ).toHaveAttribute('href', `/en/auth/login?next=${encodeURIComponent('/en/inbox/u/nino_b')}`);
  await expect(page.getByTestId('pending-note')).toHaveCount(0);
  expect(images.some((u) => u.endsWith('/work-30-large.webp'))).toBe(true);
});

test('an old title slug redirects permanently to the current slug by uid (url-map §4.3)', async ({
  page,
}) => {
  await media(page);
  const res = await page.goto(`/en/profile/nino_b/portfolio/old-title-${UID(30)}`);
  expect(res?.request().redirectedFrom()?.url()).toContain(`/old-title-${UID(30)}`);
  expect([301, 308]).toContain((await res?.request().redirectedFrom()?.response())?.status());
  await expect(page).toHaveURL(`/en/profile/nino_b/portfolio/work-30-${UID(30)}`);
});

test('pending and rejected work: 404 to visitors; the owner sees the note and the reason (AC-28, AC-42)', async ({
  page,
  context,
}) => {
  await media(page);
  const pending = `/en/profile/nino_b/portfolio/work-31-${UID(31)}`;
  const rejected = `/en/profile/nino_b/portfolio/work-32-${UID(32)}`;
  expect((await page.goto(pending))?.status()).toBe(404);
  expect((await page.goto(rejected))?.status()).toBe(404);

  await as(context, 'owner-token');
  await page.goto(pending);
  await expect(page.getByTestId('pending-note')).toContainText(
    'This work is waiting for review and is not public yet.',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow');
  await expect(page.getByRole('button', { name: 'Share this project' })).toHaveCount(0);
  await expect(page.getByTestId('owner-box').getByRole('link', { name: 'Contact me' })).toHaveCount(
    0,
  );

  await page.goto(rejected);
  await expect(page.getByTestId('rejected-note')).toContainText('Rejected');
  await expect(page.getByTestId('rejected-note')).toContainText(
    'Not approved. Reason: Images are blurry.',
  );
});
