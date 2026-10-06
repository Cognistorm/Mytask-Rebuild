// Category pages at 3 levels (ROADMAP 4.2.9b; spec 03 AC-3, AC-4, AC-8…AC-18, AC-21, AC-37). Category lookups and
// the gig search answer from the stand-in API (e2e/fake-catalog.mjs); `/__last-search` returns the last
// searchGigs query the web server sent.
import { expect, test } from '@playwright/test';
import { hydrated } from './base';

const DESIGN = '01900000-0000-7000-8000-0000000c0001';
const lastSearch = async () => {
  const res = await fetch(`http://localhost:3199/__last-search?categoryId=${DESIGN}`);
  return new URLSearchParams(((await res.json()) as { search: string }).search);
};

test('level 1: title, breadcrumb, SEO texts, 42 cards with the Featured badge, numbered pages', async ({
  page,
}) => {
  await page.goto('/categories/design');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('დიზაინი');
  // Only the home page has the header over the hero.
  await expect(page.getByTestId('site-header')).not.toHaveAttribute('data-over-hero');
  const crumbs = page.getByRole('navigation', { name: 'ნავიგაციის ზოლი' });
  await expect(crumbs.getByRole('link', { name: 'მთავარი' })).toHaveAttribute('href', '/');
  await expect(crumbs.getByText('დიზაინი')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('content-top')).toContainText('დიზაინის შესახებ');
  await expect(page.getByTestId('content-bottom')).toContainText('bottom text');

  const cards = page.getByTestId('gig-card');
  await expect(cards).toHaveCount(42);
  await expect(page.getByTestId('result-count')).toHaveText('50 შედეგი');
  const premium = cards.first();
  await expect(premium).toHaveClass(/mt-gig-card-featured/);
  await expect(premium.getByText('გამორჩეული')).toBeVisible();
  await expect(premium.getByRole('link', { name: 'Premium logo design' })).toHaveAttribute(
    'href',
    '/service/logo-design-1',
  );
  // No reviews: the quiet text instead of stars (audit §3.2).
  await expect(cards.nth(1).getByText('შეფასებები ჯერ არ არის')).toBeVisible();
  await expect(cards.nth(2).getByRole('img', { name: /შეფასება 4\.8 5-დან/ })).toBeVisible();

  const query = await lastSearch();
  expect(query.get('categoryId')).toBe(DESIGN);
  expect(query.get('limit')).toBe('42');
  expect(query.get('sort')).toBe('recommended');

  const pager = page.getByTestId('pagination');
  await pager.getByRole('link', { name: '2' }).click();
  await expect(page).toHaveURL(/\/categories\/design\?page=2$/);
  await expect(cards).toHaveCount(8);
  await expect(pager.getByText('2')).toHaveAttribute('aria-current', 'page');
});

test('canonical and hreflang: clean path, page kept, filters dropped (AC-37)', async ({ page }) => {
  await page.goto('/en/categories/design?sort_by=newest&rating=4&page=2');
  const href = (sel: string) => page.locator(sel).getAttribute('href');
  expect(await href('link[rel="canonical"]')).toMatch(/\/en\/categories\/design\?page=2$/);
  expect(await href('link[rel="alternate"][hreflang="ka"]')).toMatch(
    /[^n]\/categories\/design\?page=2$/,
  );
  expect(await href('link[rel="alternate"][hreflang="x-default"]')).toMatch(
    /[^n]\/categories\/design\?page=2$/,
  );
});

test('levels 2 and 3 resolve; wrong parent, unknown slug and a 4th level are 404 (AC-3)', async ({
  page,
}) => {
  await page.goto('/categories/design/logo-design/minimal');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('მინიმალისტური ლოგო');
  const crumbs = page.getByRole('navigation', { name: 'ნავიგაციის ზოლი' });
  await expect(crumbs.getByRole('link', { name: 'ლოგოს დიზაინი' })).toHaveAttribute(
    'href',
    '/categories/design/logo-design',
  );
  for (const path of [
    '/categories/programming/logo-design',
    '/categories/nope',
    '/categories/design/logo-design/minimal/extra',
  ]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
});

test('English page of a Georgian-only category: Georgian text with the fallback note (AC-4)', async ({
  page,
}) => {
  await page.goto('/en/categories/design/web-design');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ვებ დიზაინი');
  await expect(page.getByRole('heading', { level: 1 })).toHaveAttribute('lang', 'ka');
  await expect(
    page.getByText('This content is not available in English yet, so it is shown in Georgian.'),
  ).toBeVisible();
});

test('filters and sort live in the URL with the legacy names; GEL → tetri for the API (AC-9…AC-13)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en/categories/design?page=2');
  const filters = page.getByTestId('filters');
  await filters.getByLabel('4+ stars').check();
  await filters.getByLabel('Min price').fill('10.5');
  await filters.getByLabel('Up to 1 week').check();
  await filters.getByRole('button', { name: 'Filter' }).click();
  // Back to page 1, empty fields left out.
  await expect(page).toHaveURL(
    /\/en\/categories\/design\?rating=4&min_price=10\.5&delivery_time=7$/,
  );
  let query = await lastSearch();
  expect(query.get('rating')).toBe('4');
  expect(query.get('minPrice')).toBe('1050');
  expect(query.get('deliveryTime')).toBe('7');
  expect(query.get('page')).toBe('1');

  // The Filter form loaded a new document (plain submit): the sort menu needs it hydrated. Its link is a client
  // navigation that waits for the server, which on a full parallel run is busy with the 42 cards' prefetches.
  await hydrated(page);
  await page.getByTestId('sort-menu').click();
  await page.getByRole('link', { name: 'Price: Low to High' }).click();
  await expect(page).toHaveURL(/sort_by=price_low_high/, { timeout: 20_000 });
  query = await lastSearch();
  expect(query.get('sort')).toBe('price_asc');
  await expect(page.getByTestId('filters').getByLabel('4+ stars')).toBeChecked();

  await page.getByRole('link', { name: 'Reset filter' }).first().click();
  await expect(page).toHaveURL(/\/en\/categories\/design$/);
});

test('min price above max is refused and the results stay (AC-10)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en/categories/design');
  const filters = page.getByTestId('filters');
  await filters.getByLabel('Min price').fill('50');
  await filters.getByLabel('Max price').fill('10');
  await filters.getByRole('button', { name: 'Filter' }).click();
  await expect(
    filters.getByText('The minimum price cannot be higher than the maximum price.'),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/en\/categories\/design$/);
  await expect(page.getByTestId('gig-card')).toHaveCount(42);

  // The same through a shared URL: message shown, price filter left out of the API call.
  await page.goto('/en/categories/design?min_price=50&max_price=10');
  await expect(
    page.getByText('The minimum price cannot be higher than the maximum price.').first(),
  ).toBeVisible();
  const query = await lastSearch();
  expect(query.has('minPrice')).toBe(false);
  expect(query.has('maxPrice')).toBe(false);
});

test('empty category: the empty state; phone: filters open as a sheet with "Show results"', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/en/categories/music?rating=5');
  await expect(
    page.getByText("We couldn't find anything with that term. Please try again"),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Reset filter' }).last()).toHaveAttribute(
    'href',
    '/en/categories/music',
  );
  await page.getByTestId('open-filters').click();
  await expect(page.getByRole('button', { name: 'Show results' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('?page=1 is the clean list: one 301 (url-map §2)', async ({ request }) => {
  const res = await request.get('/categories/design?page=1&sort_by=newest', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  const location = new URL(res.headers()['location']!, 'http://x');
  expect(location.pathname + location.search).toBe('/categories/design?sort_by=newest');
});
