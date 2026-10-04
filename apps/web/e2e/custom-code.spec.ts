// Public/private boundary for S-110 custom code (task 4.0.2; ADR-019 §2, spec 16 AC-73/AC-74).
// e2e/fake-api.mjs serves custom code that leaves markers on `window` and lists one S-127 host. A script
// started on a public page must not survive into a private page (crossing root layouts = full page load),
// and private pages always get the strict CSP without the S-127 host.
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { expect, test, type Page, type Response } from '@playwright/test';
import { isPublicPath } from '../src/lib/zones';

const HOST = 'https://cdn.custom-code-vendor.test';

test.skip(
  process.env.PW_REUSE === '1',
  'custom code comes from e2e/fake-api.mjs (the API serves it from slice 17)',
);

function headMarker(page: Page) {
  return page.evaluate(() => (window as { __mtCustomCodeHead?: number }).__mtCustomCodeHead);
}

function csp(res: Response | null): string {
  return res?.headers()['content-security-policy'] ?? '';
}

/** Clicks a link and returns the document response of the page it leads to (none = client-side navigation). */
async function clickThrough(page: Page, name: string): Promise<Response> {
  const doc = page.waitForResponse((r) => r.request().resourceType() === 'document', {
    timeout: 10_000,
  });
  await page.getByRole('link', { name, exact: true }).click();
  const res = await doc;
  await page.waitForLoadState('load');
  return res;
}

test('ka public page: custom code runs with the nonce, CSP lists the S-127 host', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  const res = await page.goto('/');
  expect(csp(res)).toMatch(
    /script-src 'self' 'nonce-[^']+' https:\/\/cdn\.custom-code-vendor\.test/,
  );
  expect(csp(res)).toContain("frame-ancestors 'none'");
  expect(await headMarker(page)).toBe(1);
  expect(
    await page.evaluate(() => (window as { __mtCustomCodeFooter?: boolean }).__mtCustomCodeFooter),
  ).toBe(true);
  // Next.js' own scripts carry the nonce too: the page hydrates (client navigation within it works).
  await page.waitForLoadState('networkidle');
  expect(violations).toEqual([]);
});

test('ka: public → /auth/login and public → /auth/register are full page loads; marker and S-127 host gone', async ({
  page,
}) => {
  await page.goto('/');
  expect(await headMarker(page)).toBe(1);

  const login = await clickThrough(page, 'ავტორიზაცია');
  expect(new URL(login.url()).pathname).toBe('/auth/login');
  expect(csp(login)).toContain("'nonce-");
  expect(csp(login)).not.toContain(HOST);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await headMarker(page)).toBeUndefined();
  expect(await page.locator('[data-custom-code]').count()).toBe(0);

  // The header's "Join" (public → /auth/register) is a full page load too.
  await page.goto('/');
  expect(await headMarker(page)).toBe(1);
  const register = await clickThrough(page, 'შეუერთდი');
  expect(new URL(register.url()).pathname).toBe('/auth/register');
  expect(csp(register)).not.toContain(HOST);
  expect(await headMarker(page)).toBeUndefined();
});

test('en: private → public is a full page load too (custom code starts fresh)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const login = await page.goto('/en/auth/login');
  expect(csp(login)).not.toContain(HOST);
  expect(await headMarker(page)).toBeUndefined();

  const home = await clickThrough(page, 'Back to homepage');
  expect(new URL(home.url()).pathname).toBe('/en');
  expect(csp(home)).toContain(HOST);
  await expect(page).toHaveURL(/\/en$/);
  expect(await headMarker(page)).toBe(1);
});

test('every page under (public) is public in src/lib/zones.ts and every other page is private', () => {
  const root = join(import.meta.dirname, '../src/app/[locale]');
  const pages: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name === 'page.tsx') pages.push(relative(root, dir).split(sep).join('/'));
    }
  };
  walk(root);
  expect(pages.length).toBeGreaterThan(1);
  for (const dir of pages) {
    const [group, ...rest] = dir.split('/');
    // A sample URL for the folder: dynamic segments get a placeholder value.
    const url = '/' + rest.map((s) => (s.startsWith('[') ? 'sample' : s)).join('/');
    expect(isPublicPath(url), `${dir} → ${url}`).toBe(group === '(public)');
    expect(isPublicPath(`/en${url === '/' ? '' : url}`), `en ${url}`).toBe(group === '(public)');
  }
});
