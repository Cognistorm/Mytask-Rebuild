// `/sellers`, `/hire/{keyword}` and explore projects (ROADMAP 4.2.11; spec 03 AC-27…AC-34; url-map §3). Lists
// answer from the stand-in API (e2e/fake-catalog.mjs); `q=feature-off` makes searchProjects answer 403 (S-075 OFF).
import { expect, test } from '@playwright/test';

test('/sellers: title, 40 freelancer cards with skills, contact and profile links, page 2', async ({
  page,
}) => {
  await page.goto('/en/sellers');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Top sellers');
  await expect(page.getByText('Hire our best experts sellers')).toBeVisible();
  const cards = page.getByTestId('freelancer-card');
  await expect(cards).toHaveCount(40);
  const first = cards.first();
  await expect(first.getByText('Account verified')).toBeVisible();
  await expect(first.getByRole('link', { name: 'Logo design' })).toHaveAttribute(
    'href',
    '/en/hire/logo-design',
  );
  // A guest's "Contact me" goes through login to the chat (as on the profile).
  await expect(first.getByRole('link', { name: 'Contact me' })).toHaveAttribute(
    'href',
    '/en/auth/login?next=%2Fen%2Finbox%2Fu%2Fseller_1',
  );
  await expect(first.getByRole('link', { name: 'View profile' })).toHaveAttribute(
    'href',
    '/en/profile/seller_1',
  );
  await expect(cards.nth(2).getByRole('listitem')).toHaveCount(3);
  await page.getByTestId('pagination').getByRole('link', { name: 'Next' }).click();
  await expect(page).toHaveURL(/\/en\/sellers\?page=2$/);
  await expect(cards).toHaveCount(5);
  expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(
    /\/en\/sellers\?page=2$/,
  );
});

test('/hire/{slug}: title and subtitle with the skill; unknown slug → /search?q= (AC-28, AC-29)', async ({
  page,
  request,
}) => {
  await page.goto('/hire/logo-design');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'დაიქირავე საუკეთესო Logo design',
  );
  await expect(page.getByTestId('freelancer-card')).toHaveCount(3);

  const res = await request.get('/en/hire/web%20design%20pro', { maxRedirects: 0 });
  expect([302, 307]).toContain(res.status());
  const location = new URL(res.headers()['location']!, 'http://x');
  expect(location.pathname + location.search).toBe('/en/search?q=web+design+pro');
});

test('explore projects: search bar, "Popular:" chips, empty "Latest projects" (AC-32, AC-33)', async ({
  page,
}) => {
  await page.goto('/en/explore/projects');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Explore projects');
  await expect(page.getByTestId('explore-projects').getByRole('searchbox')).toHaveAttribute(
    'placeholder',
    'Type something to search in projects',
  );
  const chips = page.getByRole('list', { name: 'Popular:' });
  await chips.getByRole('link', { name: 'Web development' }).click();
  await expect(page).toHaveURL(/\/en\/explore\/projects\/web-development$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Web development');
  await page.getByRole('list', { name: 'Popular:' }).getByRole('link', { name: 'React' }).click();
  await expect(page).toHaveURL(/\/en\/explore\/projects\/web-development\/react$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('React');
  await expect(page.getByRole('heading', { name: 'Latest projects' })).toBeVisible();
  await expect(page.getByText('No projects yet')).toBeVisible();
});

test('explore projects: unknown category or a skill outside it → 404; S-075 OFF → feature disabled', async ({
  page,
}) => {
  for (const path of ['/explore/projects/nope', '/explore/projects/design/react']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(404);
  }
  const off = await page.goto('/en/explore/projects?q=feature-off');
  expect(off?.status()).toBe(200);
  await expect(page.getByTestId('explore-projects-disabled')).toBeVisible();
  await expect(page.getByText('This feature is currently turned off.')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
