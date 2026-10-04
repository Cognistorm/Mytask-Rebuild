// Public site header + footer (ROADMAP 4.2.9a; design 01-home.md; spec 03 AC-2, AC-22, AC-36). The category tree
// and the signed-in visitor come from the stand-in API (e2e/fake-catalog.mjs); getPublicConfig is absent there,
// so the shell uses its defaults (theme and language switches on, projects off).
import { expect, test } from '@playwright/test';
import { BASE, COOKIE_URL, PORT } from './base';

test('desktop: logo, search, category bar with a keyboard mega-menu, Login + Join', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const header = page.getByTestId('site-header');
  await expect(header.getByRole('img', { name: 'MyTask.ge' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'ავტორიზაცია' })).toHaveAttribute(
    'href',
    '/auth/login',
  );
  await expect(header.getByRole('link', { name: 'შეუერთდი' })).toHaveAttribute(
    'href',
    '/auth/register',
  );

  // AC-2: the second row lists the top-level categories; Enter opens the panel with sub and child categories.
  const bar = page.getByRole('navigation', { name: 'სარჩევი' });
  const design = bar.getByRole('button', { name: 'დიზაინი' });
  await design.focus();
  await page.keyboard.press('Enter');
  const mega = page.getByTestId('mega-menu');
  await expect(mega.getByRole('link', { name: 'ლოგოს დიზაინი' })).toHaveAttribute(
    'href',
    '/categories/design/logo-design',
  );
  await expect(mega.getByRole('link', { name: 'მინიმალისტური ლოგო' })).toHaveAttribute(
    'href',
    '/categories/design/logo-design/minimal',
  );
  await expect(mega.getByRole('link', { name: 'დაათვალიერე დიზაინი' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(mega).toBeHidden();
  await expect(design).toBeFocused();

  // A category without sub-categories is a plain link.
  await expect(bar.getByRole('link', { name: 'პროგრამირება' })).toHaveAttribute(
    'href',
    '/categories/programming',
  );

  // The search goes to /search?q=… (spec 03 AC-19).
  await header.getByRole('searchbox').first().fill('ლოგო');
  await header.getByRole('searchbox').first().press('Enter');
  await expect(page).toHaveURL(/\/search\?q=%E1%83%9A/);
});

test('narrow desktop: categories that do not fit go into "More ▾"', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto('/en');
  const more = page.getByTestId('category-more');
  await expect(more).toBeVisible();
  await more.click();
  await expect(page.getByRole('link', { name: 'Lifestyle' })).toHaveAttribute(
    'href',
    '/en/categories/lifestyle',
  );
});

test('phone: search icon opens a full-width search (AC-22); the drawer has the category accordion', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'სარჩევი' })).toBeHidden();
  await page.getByTestId('open-phone-search').click();
  const search = page.getByTestId('phone-search').getByRole('searchbox');
  await expect(search).toBeFocused();

  await page.getByTestId('open-drawer').click();
  const drawer = page.getByTestId('nav-drawer');
  await expect(drawer.getByRole('link', { name: 'შეუერთდი' })).toBeVisible();
  const accordion = drawer.getByTestId('category-accordion');
  await accordion.getByRole('searchbox').fill('მინიმალ');
  await expect(accordion.getByRole('link', { name: 'მინიმალისტური ლოგო' })).toBeVisible();
  await expect(accordion.getByText('პროგრამირება')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('signed in: the account menu replaces Login/Join and links to the dashboard', async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: '__Host-mt_at', value: 'e2e-header', url: COOKIE_URL, secure: true, sameSite: 'Lax' },
  ]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/en');
  const header = page.getByTestId('site-header');
  await expect(header.getByRole('link', { name: 'Login' })).toHaveCount(0);
  await header.getByRole('button', { name: 'Account menu' }).click();
  await expect(header.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
    'href',
    '/en/seller/home',
  );
  await expect(header.getByRole('link', { name: 'View profile' })).toHaveAttribute(
    'href',
    '/en/profile/header_tester',
  );
});

test('theme toggle switches at once and keeps the choice in the cookie', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByTestId('theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const cookie = (await context.cookies()).find((c) => c.name === 'mt_theme');
  expect(cookie?.value).toBe('dark');
});

test('language switch keeps the page and the query; footer shows the logo and ©', async ({
  page,
}) => {
  await page.goto('/?x=1');
  const footer = page.getByTestId('site-footer');
  await expect(footer.getByText(/© \d{4} MyTask\.ge/)).toBeVisible();
  await footer.getByRole('link', { name: 'ინგლისურად' }).click();
  await expect(page).toHaveURL(`${BASE}/en?x=1`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('skip link jumps over the header', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'მთავარ შინაარსზე გადასვლა' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#mt-content')).toBeFocused();
});

test('legacy ?locale= and ?theme= answer one 301 (url-map §2, spec 03 AC-36)', async ({
  request,
}) => {
  for (const [from, to] of [
    ['/categories/design?locale=en', '/en/categories/design'],
    ['/en/search?q=logo&locale=ka', '/search?q=logo'],
    ['/sellers?locale=fr', '/sellers'],
    ['/?theme=dark&page=2', '/?page=2'],
    ['/en/hire/logo?locale=en&theme=light', '/en/hire/logo'],
  ] as const) {
    const res = await request.get(from, { maxRedirects: 0 });
    expect(res.status(), from).toBe(301);
    const location = new URL(res.headers()['location']!, 'http://x');
    expect(location.pathname + location.search, from).toBe(to);
  }
  const themed = await request.get('/?theme=dark', { maxRedirects: 0 });
  expect(themed.headers()['set-cookie']).toContain('mt_theme=dark');
});

test('a path starting with // never redirects to another host', async () => {
  // A raw request: an HTTP client would read `//evil.example` as another host before sending it.
  const { request: raw } = await import('node:http');
  for (const path of [
    '//evil.example/?locale=ka',
    '//evil.example/',
    '//evil.example?theme=dark',
  ]) {
    const location = await new Promise<string | undefined>((resolve, reject) => {
      raw({ host: '127.0.0.1', port: PORT, path, method: 'GET' }, (res) => {
        res.resume();
        resolve(res.headers.location);
      })
        .on('error', reject)
        .end();
    });
    if (location) expect(new URL(location, 'http://localhost').host, path).toBe('localhost');
  }
});
