// Search results (ROADMAP 4.2.10; spec 03 AC-12, AC-19…AC-23; url-map §8). The gig search answers from the stand-in
// API (e2e/fake-catalog.mjs); `/__last-search` (no category) returns the last query the web server sent.
import { expect, test } from '@playwright/test';

const lastSearch = async () => {
  const res = await fetch('http://localhost:3199/__last-search?categoryId=');
  return new URLSearchParams(((await res.json()) as { search: string }).search);
};

test('the header search opens /search?q= with the heading and the matching gigs (AC-19, AC-23)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en');
  const field = page.getByTestId('site-header').getByRole('searchbox').first();
  await field.fill('premium logo');
  await field.press('Enter');
  await expect(page).toHaveURL(/\/en\/search\?q=premium\+logo$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Search results for premium logo',
  );
  await expect(page.getByTestId('gig-card')).toHaveCount(1);
  await expect(field).toHaveValue('premium logo');
  expect((await lastSearch()).get('q')).toBe('premium logo');
});

test('an empty keyword lists every gig with filters and sort (AC-20)', async ({ page }) => {
  await page.goto('/search');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('ძებნა');
  await expect(page.getByTestId('gig-card')).toHaveCount(42);
  expect((await lastSearch()).has('q')).toBe(false);
});

test('the keyword stays through filters, sort and pages; Reset keeps it (AC-12)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/en/search?q=logo');
  await page.getByTestId('filters').getByLabel('5 stars').check();
  await page.getByTestId('filters').getByRole('button', { name: 'Filter' }).click();
  await expect(page).toHaveURL(/\/en\/search\?q=logo&rating=5$/);
  await page.getByTestId('sort-menu').click();
  await page.getByRole('link', { name: 'Newest first' }).click();
  await expect(page).toHaveURL(/q=logo/);
  await expect(page).toHaveURL(/sort_by=newest/);
  await page.getByTestId('pagination').getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/q=logo/);
  await page.getByRole('link', { name: 'Reset filter' }).first().click();
  await expect(page).toHaveURL(/\/en\/search\?q=logo$/);
});

test('no match: the empty state (AC-21); noindex, follow and /search as canonical (url-map §8)', async ({
  page,
}) => {
  await page.goto('/en/search?q=nothing-matches-this');
  await expect(
    page.getByText("We couldn't find anything with that term. Please try again"),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(/\/en\/search$/);
});
