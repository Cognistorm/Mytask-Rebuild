// Gig page frame (ROADMAP 4.3.11a; spec 04 AC-26…AC-30, AC-33; spec 17 AC-3, AC-4; screen 02). The page loads on
// the server against e2e/fake-gigs.mjs (via e2e/fake-api.mjs); the visitor is chosen by the access cookie the test
// sets (`owner-token` = nino_b, the owner of every fake gig). The media CDN is routed here. The API's visibility
// rules are tested in apps/api.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { COOKIE_URL } from './base';
import { GIG_SLUG, GIG_UID } from './fake-gigs.mjs';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

async function asOwner(context: BrowserContext) {
  await context.addCookies([
    {
      name: '__Host-mt_at',
      value: 'owner-token',
      url: COOKIE_URL,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

const media = (page: Page) =>
  page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );

const attr = (page: Page, selector: string, name: string) =>
  page.locator(selector).first().getAttribute(name);

test('guest sees the gig page (en): breadcrumb, title, seller, stats, purchase box, description (AC-26)', async ({
  page,
}) => {
  await media(page);
  const res = await page.goto(`/en/service/${GIG_SLUG[1]}`);
  expect(res?.status()).toBe(200);
  // Public zone (ADR-019 §2): the media CDN is allowed (img-src).
  expect(res?.headers()['content-security-policy']).toMatch(/img-src [^;]*http:\/\/media\.test/);

  // SEO title and description (spec 04 AC-15); canonical + both languages (url-map §8).
  await expect(page).toHaveTitle('Logo design | SEO | MyTask');
  expect(await attr(page, 'meta[name="description"]', 'content')).toBe(
    'Clean logos for small businesses.',
  );
  expect(await attr(page, 'link[rel="canonical"]', 'href')).toMatch(`/en/service/${GIG_SLUG[1]}`);
  expect(await attr(page, 'link[rel="alternate"][hreflang="ka"]', 'href')).toMatch(
    new RegExp(`[^n]/service/${GIG_SLUG[1]}$`),
  );
  expect(await attr(page, 'link[rel="alternate"][hreflang="en"]', 'href')).toMatch(
    `/en/service/${GIG_SLUG[1]}`,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/en');
  await expect(crumbs.getByRole('link', { name: 'Logo design' })).toHaveAttribute(
    'href',
    '/en/categories/design/logo-design',
  );
  await expect(crumbs.getByText('Minimalist logo')).toHaveAttribute('aria-current', 'page');

  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toContainText('Logo design for your business');
  await expect(h1.getByTestId('featured')).toContainText('Featured');

  const seller = page.getByTestId('gig-seller');
  await expect(seller.getByRole('link', { name: /nino_b/ })).toHaveAttribute(
    'href',
    '/en/profile/nino_b',
  );
  await expect(seller.getByTestId('id-verified-mark')).toBeVisible();
  await expect(seller).toContainText('Online');
  await expect(seller.getByRole('img', { name: 'Rating 4.7 out of 5, 4 reviews' })).toBeVisible();

  const stats = page.getByTestId('gig-stats');
  await expect(stats).toContainText('1 order in queue');
  await expect(stats).toContainText('3 days for delivery');
  await expect(stats).toContainText('4.5');
  await expect(stats).toContainText('(2 reviews)');

  const box = page.getByTestId('purchase-box');
  await expect(box).toContainText('Starting at');
  await expect(box).toContainText('₾250.00');
  await expect(page.getByTestId('gig-revisions')).toHaveText('3 revisions included');
  // Upgrades: checkbox named by title, price and delivery effect (screen 02 accessibility).
  const source = box.getByRole('checkbox', { name: /Source file/ });
  await expect(source).toHaveAccessibleName(
    'Source file +₾20.00 Delivery time will be increased by an extra 1 day',
  );
  await expect(box.getByRole('checkbox', { name: /4K resolution/ })).toHaveAccessibleName(
    "4K resolution +₾35.00 Delivery time won't change",
  );
  await source.check();
  await expect(source).toBeChecked();
  // Not yet built (slices 5 / 7) and not for guests: no cart, no contact, no edit.
  await expect(box.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);
  await expect(box.getByText('Contact seller')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit gig' })).toHaveCount(0);

  await expect(page.getByTestId('gig-description').locator('strong')).toHaveText('clean');
  await expect(page.getByTestId('gig-description').locator('li')).toHaveCount(2);
  await expect(page.locator('[role="note"]')).toHaveCount(0);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('an old title slug or another case redirects permanently to the current slug (AC-33, spec 17 AC-3)', async ({
  page,
}) => {
  // The redirect answer itself (no navigation to wait for).
  for (const [old, current] of [
    [`/service/old-title-${GIG_UID(1)}`, `/service/${GIG_SLUG[1]}`],
    [`/en/service/${GIG_SLUG[1].toUpperCase()}`, `/en/service/${GIG_SLUG[1]}`],
  ] as const) {
    const res = await page.request.get(old, { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe(current);
  }
});

test('unknown uid and others’ pending gigs answer 404 (AC-28)', async ({ page }) => {
  for (const path of [
    `/en/service/no-such-gig-${GIG_UID(99)}`,
    `/en/service/${GIG_SLUG[3]}`,
    `/en/service/${GIG_SLUG[4]}`,
  ]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
  }
});

test('no English text: Georgian content with the note, Georgian canonical, noindex (AC-27, spec 17 AC-4); seller away; no revisions value', async ({
  page,
}) => {
  await media(page);
  const res = await page.goto(`/en/service/${GIG_SLUG[2]}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId('georgian-note')).toHaveText(
    'This content is not available in English yet, so it is shown in Georgian.',
  );
  await expect(page.getByRole('heading', { level: 1 }).locator('[lang="ka"]')).toHaveText(
    'მხოლოდ ქართული განცხადება',
  );
  await expect(page.getByTestId('gig-description')).toHaveAttribute('lang', 'ka');
  expect(await attr(page, 'link[rel="canonical"]', 'href')).toMatch(
    new RegExp(`[^n]/service/${GIG_SLUG[2]}$`),
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
  expect(await attr(page, 'meta[name="robots"]', 'content')).toBe('noindex, follow');

  // AC-29: the date without the legacy markup.
  await expect(page.getByTestId('away-note')).toContainText(
    "Seller is away right now, and he won't be able to receive new orders until 24.12.2026",
  );
  await expect(page.getByTestId('gig-stats')).toContainText('3 orders in queue');
  await expect(page.getByTestId('gig-stats')).toContainText('N/A');
  await expect(page.getByTestId('gig-stats')).not.toContainText('for delivery');
  await expect(page.getByTestId('gig-revisions')).toHaveText('Number of revisions not specified');
  await expect(page.getByTestId('gig-upgrades')).toHaveCount(0);
  await expect(page.getByTestId('featured')).toHaveCount(0);

  // The Georgian page itself is indexable.
  await page.goto(`/service/${GIG_SLUG[2]}`);
  await expect(page.getByTestId('georgian-note')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('owner: pending and rejected gigs with their notice, noindex and "Edit gig" (AC-28, AC-30)', async ({
  page,
  context,
}) => {
  await asOwner(context);
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[3]}`);
  await expect(page.getByTestId('pending-note')).toHaveText(
    'This gig is under review now, and it will be publicly visible soon',
  );
  expect(await attr(page, 'meta[name="robots"]', 'content')).toBe('noindex, nofollow');
  await expect(page.getByTestId('gig-revisions')).toHaveText('No revisions');
  await expect(page.getByTestId('gig-stats')).toContainText('1 month for delivery');
  await expect(
    page.getByTestId('purchase-box').getByRole('link', { name: 'Edit gig' }),
  ).toHaveAttribute('href', `/en/seller/gigs/${GIG_UID(3)}/edit`);

  await page.goto(`/service/${GIG_SLUG[4]}`);
  await expect(page.getByTestId('rejected-note')).toContainText('უარყოფილია');
  // Restricted seller without a date (AC-29).
  await expect(page.getByTestId('away-note')).toContainText(
    'ეს ფრილანსერი ამჟამად ვერ იღებს ახალ შეკვეთებს.',
  );
  await expect(page.getByTestId('purchase-box')).toContainText('მოქმედებები');
});

test('phone width: one column, no horizontal scroll', async ({ page }) => {
  await media(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/service/${GIG_SLUG[1]}`);
  await expect(page.getByTestId('purchase-box')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  const cover = await page.getByTestId('gig-cover').boundingBox();
  const box = await page.getByTestId('purchase-box').boundingBox();
  expect(box!.y).toBeGreaterThan(cover!.y + cover!.height - 1);
});
