// Home page and the profile gigs block (ROADMAP 4.2.12; design 01-home.md; spec 03 AC-24…AC-26, spec 02 AC-8,
// EC-10). getHome and listGigs answer from the stand-in API (e2e/fake-catalog.mjs).
import { expect, test } from '@playwright/test';

test('home: hero with search and shortcuts, featured categories, Top gigs, category rows, best sellers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Find the best Freelancer');
  const shortcuts = page.getByRole('navigation', { name: 'Explore' }).last();
  await expect(shortcuts.getByRole('link', { name: 'Gigs' })).toHaveAttribute('href', '/en/search');
  // QA 4.2.17 BUG-02: round tiles with an icon; every label fits inside its tile (also the long Georgian ones).
  for (const path of ['/en', '/']) {
    await page.goto(path);
    for (const tile of await page.locator('.mt-home-shortcuts a').all()) {
      await expect(tile.locator('svg')).toBeVisible();
      const [box, label] = await Promise.all([
        tile.boundingBox(),
        tile.locator('span').boundingBox(),
      ]);
      expect(label!.x).toBeGreaterThanOrEqual(box!.x);
      expect(label!.x + label!.width).toBeLessThanOrEqual(box!.x + box!.width);
    }
  }
  await page.goto('/en');

  // Owner 2026-10-06: the header sits over the hero in the hero colour, and turns white once the page scrolls.
  // 3X.11 (visual-refresh.md §3.3): the header is transparent there and the hero gradient runs on behind it; on
  // scroll its translucent surface layer fades in.
  const header = page.getByTestId('site-header');
  const surface = () => header.evaluate((el) => getComputedStyle(el, '::before').opacity);
  await expect(header).toHaveAttribute('data-over-hero', '');
  await expect(header).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect.poll(surface).toBe('0');
  const [bar, hero] = await Promise.all([
    header.boundingBox(),
    page.locator('.mt-home-hero').boundingBox(),
  ]);
  expect(hero!.y).toBeLessThanOrEqual(bar!.y);
  expect(hero!.y + hero!.height).toBeGreaterThan(bar!.y + bar!.height);
  await page.mouse.wheel(0, 600);
  await expect(header).not.toHaveAttribute('data-over-hero');
  await expect.poll(surface).toBe('1');
  await page.mouse.wheel(0, -2000);
  await expect(header).toHaveAttribute('data-over-hero', '');

  const featured = page.getByTestId('featured-categories');
  await expect(featured.getByRole('link', { name: 'Design' })).toHaveAttribute(
    'href',
    '/en/categories/design',
  );
  await expect(featured.getByRole('button', { name: 'Next' })).toBeVisible();

  const top = page.getByTestId('top-gigs');
  await expect(top.getByRole('heading', { name: 'Top gigs' })).toBeVisible();
  await expect(top.getByTestId('gig-card')).toHaveCount(4);
  await expect(top.getByTestId('gig-card').first().getByText('Featured')).toBeVisible();

  // One row per category with gigs; the empty row is hidden (spec 03 screens).
  const rows = page.getByTestId('category-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.getByRole('heading', { name: 'Design', exact: true })).toBeVisible();
  await expect(rows.getByRole('link', { name: 'See more →' })).toHaveAttribute(
    'href',
    '/en/categories/design',
  );

  const sellers = page.getByTestId('best-sellers');
  await expect(sellers.getByTestId('freelancer-card')).toHaveCount(2);
  await expect(sellers.getByRole('link', { name: 'See more →' })).toHaveAttribute(
    'href',
    '/en/sellers',
  );

  // The hero search goes to /search?q=.
  await page.getByRole('main').getByRole('searchbox').fill('logo');
  await page.getByRole('main').getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/en\/search\?q=logo$/);
});

test('home on a phone: "See more" stays visible, rows scroll sideways, no page overflow (AC-25)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(
    page.getByTestId('category-row').getByRole('link', { name: /მეტის ნახვა/ }),
  ).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'განცხადებები' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('profile gigs: 6 newest with the card, "Load more" brings the rest (spec 02 AC-8)', async ({
  page,
}) => {
  await page.route('**/api/v1/gigs?*', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('sellerUsername')).toBe('gig_seller');
    expect(url.searchParams.get('cursor')).toBe('6');
    const res = await fetch(`http://localhost:3199/api/v1/gigs${url.search}`);
    await route.fulfill({ status: 200, contentType: 'application/json', body: await res.text() });
  });
  await page.goto('/en/profile/gig_seller');
  const block = page.getByTestId('profile-gigs');
  await expect(block.getByRole('heading', { name: 'Gigs' })).toBeVisible();
  await expect(block.getByTestId('gig-card')).toHaveCount(6);
  await block.getByRole('button', { name: 'Load more' }).click();
  await expect(block.getByTestId('gig-card')).toHaveCount(8);
  await expect(block.getByRole('button', { name: 'Load more' })).toHaveCount(0);
});
