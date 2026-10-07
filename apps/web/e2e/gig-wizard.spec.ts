// Gig create wizard, first half (ROADMAP 4.3.9; spec 04 AC-1, AC-2, AC-4…AC-9, AC-19; screen 03): entry and plan
// limit, the Overview and Pricing blocks with their pre-check, the side summary. The server's own calls (header,
// category tree) go to e2e/fake-api.mjs (category tree of fake-catalog.mjs: Design → Logo design → Minimalist
// logo, Design → Web design); the browser's calls are routed here. The API checks are in apps/api tests.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';
import { hydrated } from './base';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ELIGIBLE = {
  canCreate: true,
  plan: 'standard',
  gigCount: 0,
  gigLimit: 1,
  settingId: 'S-001',
};

async function fakeApi(
  page: Page,
  opts: { eligibility?: [number, unknown]; maxRevisions?: number } = {},
) {
  const [status, body] = opts.eligibility ?? [200, ELIGIBLE];
  await page.route('**/api/v1/gigs/creation-eligibility', (route) => json(route, status, body));
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, { revisions: { maxAllowed: opts.maxRevisions ?? 10 } }),
  );
}

test('a guest is sent to login and back to /create (AC-1)', async ({ page }) => {
  await fakeApi(page, { eligibility: [401, { code: 'UNAUTHENTICATED', message: 'x' }] });
  await page.goto('/create');
  await expect(page).toHaveURL(/\/auth\/login\?next=%2Fcreate$/);
});

test('a restricted user goes to the restrictions page', async ({ page }) => {
  await fakeApi(page, { eligibility: [403, { code: 'ACCOUNT_RESTRICTED', message: 'x' }] });
  await page.goto('/create');
  await expect(page).toHaveURL(/\/restricted$/);
});

test('/post/service answers 301 to /create (AC-1)', async ({ request }) => {
  const res = await request.get('/en/post/service', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(new URL(res.headers().location!).pathname).toBe('/en/create');
});

test('at the plan limit the form is not shown, only the upgrade offer (AC-2)', async ({ page }) => {
  await fakeApi(page, {
    eligibility: [200, { ...ELIGIBLE, canCreate: false, gigCount: 1 }],
  });
  await page.goto('/en/create');
  const limit = page.getByTestId('gig-limit-reached');
  await expect(limit).toContainText('Your plan allows up to 1 gigs');
  await expect(limit.getByRole('link', { name: 'Upgrade to Premium' })).toHaveAttribute(
    'href',
    '/en/subscription?gigs=true',
  );
  await expect(page.locator('main form')).toHaveCount(0);
});

test('the page is not indexed and keeps the site header', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/en/create');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Create a new gig' })).toBeVisible();
  // AC-7 (Q-023): English is optional, the Georgian text is shown otherwise.
  await expect(
    page.getByText('visitors of the English site will see your Georgian text'),
  ).toBeVisible();
});

test('Overview and Pricing: pre-check, dependent categories and the summary (AC-4…AC-9, AC-19)', async ({
  page,
}) => {
  await fakeApi(page, { maxRevisions: 5 });
  await page.goto('/en/create');
  await hydrated(page);
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(summary.getByRole('link', { name: 'Overview, not started' })).toBeVisible();
  await expect(summary.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

  // AC-19: an empty submit shows every error and focuses the first invalid field.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByTestId('gig-form-errors')).toBeVisible();
  const titleKa = page.getByLabel('Service title in Georgian');
  await expect(titleKa).toBeFocused();
  await expect(summary.getByRole('link', { name: 'Overview, has errors' })).toBeVisible();
  await expect(summary.getByRole('link', { name: 'Pricing, has errors' })).toBeVisible();

  // AC-5: Latin words are fine next to Georgian; no Georgian letter at all is refused.
  await titleKa.fill('Logo design');
  await expect(page.getByText('Must contain Georgian text.')).toBeVisible();
  await titleKa.fill('Logo დიზაინი Photoshop-ში');
  await expect(page.getByText('Must contain Georgian text.')).toHaveCount(0);
  await expect(page.getByText('25/100')).toBeVisible();

  // AC-6: a Georgian letter in an English field.
  const titleEn = page.getByLabel('Service title in English');
  await titleEn.fill('Logo ლოგო');
  await titleEn.blur();
  await expect(page.getByText('Must contain only English characters')).toBeVisible();
  await titleEn.fill('Logo design in Photoshop');
  await expect(page.getByText('Must contain only English characters')).toHaveCount(0);

  // AC-4: each level lists the children of the level above; a higher change resets the lower ones.
  const sub = page.getByLabel('Subcategory');
  const child = page.getByLabel('Childcategory');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Design' });
  await expect(child).toBeDisabled();
  await sub.selectOption({ label: 'Logo design' });
  await child.selectOption({ label: 'Minimalist logo' });
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Programming' });
  await expect(sub).toHaveValue('');
  await expect(child).toHaveValue('');
  await expect(child).toBeDisabled();
  await expect(
    page.getByRole('status').filter({ hasText: 'lower category levels were cleared' }),
  ).toHaveCount(1);
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Design' });
  await sub.selectOption({ label: 'Logo design' });
  await child.selectOption({ label: 'Minimalist logo' });

  // AC-5 (P-136): the refused characters are named; formatting is allowed (bold).
  const descKa = page.getByRole('textbox', { name: 'Description in Georgian' });
  await descKa.fill('ფასი: 50₾ ლოგოს დიზაინი');
  await expect(page.getByText('These characters are not allowed: : ₾')).toBeVisible();
  await descKa.fill('');
  await page.getByRole('button', { name: 'Bold' }).first().click();
  await descKa.pressSequentially('ლოგოს დიზაინი ორ დღეში');
  await expect(descKa.locator('b, strong')).toHaveText('ლოგოს დიზაინი ორ დღეში');
  await expect(page.getByText('These characters are not allowed')).toHaveCount(0);
  await expect(summary.getByRole('link', { name: 'Overview, completed' })).toBeVisible();

  // AC-8: at least 1.00 GEL; `,` is a decimal mark and the amount gets 2 decimals.
  const price = page.getByLabel('Price');
  await price.fill('0.5');
  await price.blur();
  await expect(page.getByText('The price must be at least 1 GEL.')).toBeVisible();
  await price.fill('250,5');
  await price.blur();
  await expect(price).toHaveValue('250.50');
  await page.getByLabel('Delivery time').selectOption({ label: '3 days' });

  // AC-9: a whole number 0…S-041 (5 here); the buttons stay within it.
  const revisions = page.getByRole('spinbutton', { name: 'Number of revisions' });
  await revisions.fill('8');
  await revisions.blur();
  await expect(page.getByText('Enter a whole number from 0 to 5.')).toBeVisible();
  await page.getByRole('button', { name: 'Decrease' }).click();
  await expect(revisions).toHaveValue('5');
  await expect(page.getByRole('button', { name: 'Increase' })).toBeDisabled();
  await expect(page.getByText('Enter a whole number from 0 to 5.')).toHaveCount(0);

  await expect(summary.getByRole('link', { name: 'Pricing, completed' })).toBeVisible();
  await expect(summary.getByText('2 of 2 required blocks complete')).toBeVisible();
});

test('the Georgian page uses the Georgian texts', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/create');
  await expect(
    page.getByRole('heading', { level: 1, name: 'ახალი განცხადების შექმნა' }),
  ).toBeVisible();
  await expect(page.getByLabel('სერვისის დასახელება ქართულად')).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'შესწორებების რაოდენობა' })).toBeVisible();
});

test('the form passes axe (WCAG 2 A/AA) with errors shown, light and dark', async ({ page }) => {
  await fakeApi(page);
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/en/create');
    await hydrated(page);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByTestId('gig-form-errors')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .include('main')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const found = result.violations.flatMap((v) =>
      v.nodes.map((n) => `${scheme}: ${v.id} ${n.target.join(' ')}`),
    );
    expect(found, found.join('\n')).toEqual([]);
  }
});
