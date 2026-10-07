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

test('Upgrades and FAQ: rows, their pre-check, removal and the limit of 10 (AC-11, AC-12)', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/create');
  await hydrated(page);
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(
    summary.getByRole('link', { name: 'Upgrades (optional), not started' }),
  ).toBeVisible();

  // A new row gets the focus; its errors show on leaving the fields.
  const upgrades = page.locator('#gig-upgrades');
  await upgrades.getByRole('button', { name: 'Add service upgrade' }).click();
  const first = upgrades.getByRole('group', { name: 'Upgrade #1' });
  await expect(first.getByLabel('Upgrade title')).toBeFocused();
  await first.getByLabel('Price').fill('0.5');
  await first.getByLabel('Price').blur();
  await expect(first.getByText('The price must be at least 1 GEL.')).toBeVisible();
  await expect(
    summary.getByRole('link', { name: 'Upgrades (optional), has errors' }),
  ).toBeVisible();
  await first.getByLabel('Upgrade title').fill('Source file');
  await first.getByLabel('Price').fill('20');
  await first.getByLabel('Delivery time').selectOption({ label: '1 day' });
  await expect(summary.getByRole('link', { name: 'Upgrades (optional), completed' })).toBeVisible();

  // Removing row 1 moves row 2 (with its shown error) up; the focus goes to the Add button.
  await upgrades.getByRole('button', { name: 'Add service upgrade' }).click();
  const second = upgrades.getByRole('group', { name: 'Upgrade #2' });
  await second.getByLabel('Upgrade title').fill('Express');
  await second.getByLabel('Upgrade title').blur();
  await second.getByLabel('Price').focus();
  await second.getByLabel('Price').blur();
  await expect(second.getByText('Field required')).toBeVisible();
  await first.getByRole('button', { name: 'Remove upgrade' }).click();
  await expect(upgrades.getByTestId('gig-upgrade-row')).toHaveCount(1);
  await expect(first.getByLabel('Upgrade title')).toHaveValue('Express');
  await expect(first.getByText('Field required')).toBeVisible();
  await expect(upgrades.getByRole('button', { name: 'Add service upgrade' })).toBeFocused();

  // At 10 rows the Add button is disabled and says why.
  for (let i = 1; i < 10; i++) {
    await upgrades.getByRole('button', { name: 'Add service upgrade' }).click();
  }
  await expect(upgrades.getByTestId('gig-upgrade-row')).toHaveCount(10);
  await expect(upgrades.getByRole('button', { name: 'Add service upgrade' })).toBeDisabled();
  await expect(upgrades.getByText('You can add up to 10 upgrades.')).toBeVisible();

  // FAQ: question and answer are both required.
  const faq = page.locator('#gig-faq');
  await faq.getByRole('button', { name: 'Add FAQ' }).click();
  const q1 = faq.getByRole('group', { name: 'Question #1' });
  await expect(q1.getByLabel('Question')).toBeFocused();
  await q1.getByLabel('Question').fill('Do you translate to English as well?');
  await q1.getByLabel('Answer').focus();
  await q1.getByLabel('Answer').blur();
  await expect(q1.getByText('Field required')).toBeVisible();
  await q1.getByLabel('Answer').fill('Yes.');
  await expect(summary.getByRole('link', { name: 'FAQ (optional), completed' })).toBeVisible();
  await expect(q1.getByLabel('Answer')).toHaveAttribute('maxlength', '300');
  await faq.getByRole('button', { name: 'Remove' }).click();
  await expect(faq.getByTestId('gig-faq-row')).toHaveCount(0);
  await expect(summary.getByRole('link', { name: 'FAQ (optional), not started' })).toBeVisible();

  // The optional blocks never count in the required progress.
  await expect(summary.getByText('0 of 2 required blocks complete')).toBeVisible();
});

test('SEO dialog: both fields or none (AC-15)', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/en/create');
  await hydrated(page);
  const open = page.getByRole('button', { name: 'SEO meta tags' });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'SEO' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Seo title').fill('Minimalist logo design');
  // Enter in a dialog field does not submit the gig.
  await dialog.getByLabel('Seo title').press('Enter');
  await expect(page.getByTestId('gig-form-errors')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText('Fill in both the SEO title and the SEO description'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(open).toBeFocused();
  await expect(page.locator('#gig-seo').getByRole('alert')).toContainText('SEO title');

  // A refused submit marks the SEO block in the summary.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(summary.getByRole('link', { name: 'SEO (optional), has errors' })).toBeVisible();

  await open.click();
  await dialog.getByLabel('Seo description').fill('Clean logos in two days.');
  await expect(dialog.getByText('Search engine Gig preview')).toBeVisible();
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#gig-seo').getByText('Minimalist logo design')).toBeVisible();
  await expect(summary.getByRole('link', { name: 'SEO (optional), completed' })).toBeVisible();
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
    await page.getByRole('button', { name: 'Add service upgrade' }).click();
    await page.getByRole('button', { name: 'Add FAQ' }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByTestId('gig-form-errors')).toBeVisible();
    await expectNoAxeViolations(page, scheme, 'main');

    // The SEO dialog with its both-or-none error and the preview.
    await page.getByRole('button', { name: 'SEO meta tags' }).click();
    const dialog = page.getByRole('dialog', { name: 'SEO' });
    await dialog.getByLabel('Seo title').fill('Minimalist logo design');
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expectNoAxeViolations(page, `${scheme} dialog`, '[data-testid="gig-seo-dialog"]');
  }
});

async function expectNoAxeViolations(page: Page, label: string, scope: string) {
  const result = await new AxeBuilder({ page })
    .include(scope)
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  const found = result.violations.flatMap((v) =>
    v.nodes.map((n) => `${label}: ${v.id} ${n.target.join(' ')}`),
  );
  expect(found, found.join('\n')).toEqual([]);
}
