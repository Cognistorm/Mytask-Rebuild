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

/** The upload part of the public config (S-077/S-078, S-080…S-082); small limits so they can be reached. */
const UPLOADS = {
  gigImage: { enabled: true, maxSizeMb: 1, maxFiles: 3, allowedExtensions: [] },
  gigDocument: { enabled: true, maxSizeMb: 2, maxFiles: 1, allowedExtensions: [] },
};

async function fakeApi(
  page: Page,
  opts: { eligibility?: [number, unknown]; maxRevisions?: number; uploads?: unknown } = {},
) {
  const [status, body] = opts.eligibility ?? [200, ELIGIBLE];
  await page.route('**/api/v1/gigs/creation-eligibility', (route) => json(route, status, body));
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      revisions: { maxAllowed: opts.maxRevisions ?? 10 },
      uploads: opts.uploads ?? UPLOADS,
    }),
  );
}

// The upload protocol (ADR-009 §3): playwright.config.ts gives the web server S3_PUBLIC_ENDPOINT=http://storage.test
// (CSP connect-src). Storage refuses a file named `flaky…` once, so Retry can be checked.
const STORAGE = 'http://storage.test';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

async function fakeFiles(page: Page) {
  const sent = { slots: [] as { purpose: string; fileName: string }[], deleted: [] as string[] };
  const names = new Map<string, string>();
  let seq = 0;
  let flakyFailed = false;
  await page.route('**/api/v1/files', async (route) => {
    const body = route.request().postDataJSON();
    const fileId = `01900000-0000-7000-8000-0000000003${String((seq += 1)).padStart(2, '0')}`;
    names.set(fileId, body.fileName);
    sent.slots.push({ purpose: body.purpose, fileName: body.fileName });
    await json(route, 201, {
      file: { id: fileId, purpose: body.purpose, status: 'pending', fileName: body.fileName },
      upload: { url: `${STORAGE}/q`, method: 'POST', fields: { key: fileId }, expiresAt: '' },
    });
  });
  await page.route(`${STORAGE}/**`, async (route) => {
    const form = route.request().postData() ?? '';
    const fileId = /name="key"\r\n\r\n([^\r]+)/.exec(form)?.[1] ?? '';
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (names.get(fileId)?.startsWith('flaky') && !flakyFailed) {
      flakyFailed = true;
      return route.fulfill({ status: 500, headers: cors });
    }
    return route.fulfill({ status: 204, headers: cors });
  });
  await page.route(/\/api\/v1\/files\/[^/]+(\/complete)?$/, async (route) => {
    const fileId = new URL(route.request().url()).pathname.split('/')[4]!;
    if (route.request().method() === 'DELETE') {
      sent.deleted.push(fileId);
      return route.fulfill({ status: 204 });
    }
    await json(route, 200, {
      id: fileId,
      purpose: 'gig_image',
      status: 'ready',
      fileName: names.get(fileId),
      rejectReason: null,
    });
  });
  return sent;
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
  expect(new URL(res.headers().location!, 'http://x').pathname).toBe('/en/create');
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
  await expect(summary.getByText('2 of 3 required blocks complete')).toBeVisible();
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
  await expect(summary.getByText('0 of 3 required blocks complete')).toBeVisible();
});

test('Gallery: thumbnail, images with order and retry, documents (AC-14, AC-23)', async ({
  page,
}) => {
  await fakeApi(page);
  const sent = await fakeFiles(page);
  await page.goto('/en/create');
  await hydrated(page);
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(summary.getByRole('link', { name: 'Gallery, not started' })).toBeVisible();
  await expect(summary.getByText('0 of 3 required blocks complete')).toBeVisible();
  // F-02: whole sentences, and the limit is a hint (not the validator message).
  await expect(
    page.getByTestId('gig-images').locator('input[type=file]'),
  ).toHaveAccessibleDescription(/allowed types are [a-z, ]+\. Maximum number of files: \d+$/);
  await expect(
    page.getByTestId('gig-documents').locator('input[type=file]'),
  ).toHaveAccessibleDescription(
    /\(PDFs only\)\. File must be less than \d+ MB and allowed types are pdf\. Maximum number of files: \d+ /,
  );

  // A thumbnail and at least one image are required.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(summary.getByRole('link', { name: 'Gallery, has errors' })).toBeVisible();
  const thumb = page.getByTestId('gig-thumbnail');
  const images = page.getByTestId('gig-images');
  await expect(thumb.getByText('Field required')).toBeVisible();
  await expect(images.getByText('Field required')).toBeVisible();

  await thumb.locator('input[type=file]').setInputFiles(png('cover.png'));
  await expect(thumb.getByRole('img', { name: 'cover.png' })).toBeVisible();
  await expect(thumb.getByTestId('gig-file')).toHaveAttribute('data-state', 'ready');
  await expect(thumb.getByText('Field required')).toHaveCount(0);

  // Wrong type or size: refused per file with its own message, no request.
  const imagesInput = images.locator('input[type=file]');
  await imagesInput.setInputFiles([
    { name: 'logo.gif', mimeType: 'image/gif', buffer: PNG },
    { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1, 1) },
  ]);
  await expect(images.getByText('Selected file extension is not allowed')).toBeVisible();
  await expect(images.getByText('The selected file size is too large')).toBeVisible();
  await expect(images.getByRole('button', { name: 'Try again: logo.gif' })).toHaveCount(0);
  await images.getByRole('button', { name: 'Remove: logo.gif' }).click();
  await images.getByRole('button', { name: 'Remove: big.png' }).click();
  expect(sent.slots.map((s) => s.fileName)).toEqual(['cover.png']);

  // A storage failure can be retried.
  await imagesInput.setInputFiles([png('a.png'), png('flaky.png')]);
  await expect(images.getByText('Error while uploading your file')).toBeVisible();
  await images.getByRole('button', { name: 'Try again: flaky.png' }).click();
  await expect(images.getByTestId('gig-file')).toHaveCount(2);
  await expect(images.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(2);
  await expect(images.getByRole('status')).toHaveText('2 of 2 uploaded');

  // Keyboard reorder: the moved file keeps the focus.
  const alts = () =>
    images.locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
  await images.getByRole('button', { name: 'Move right: a.png' }).click();
  expect(await alts()).toEqual(['flaky.png', 'a.png']);
  await expect(images.getByRole('button', { name: 'Move left: a.png' })).toBeFocused();

  // At S-077 (3 here) the picker is disabled.
  await imagesInput.setInputFiles(png('c.png'));
  await expect(images.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(3);
  await expect(imagesInput).toBeDisabled();

  // Documents (S-080 ON): PDF only, listed by name.
  const docs = page.getByTestId('gig-documents');
  // Q-186: the file name is public, so the field warns against personal details in it.
  await expect(docs.locator('input[type=file]')).toHaveAccessibleDescription(
    /Everyone can see the file name\. Do not put personal details in it\./,
  );
  await docs.locator('input[type=file]').setInputFiles({
    name: 'portfolio.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4'),
  });
  await expect(docs.getByText('portfolio.pdf')).toBeVisible();
  await expect(docs.getByTestId('gig-file')).toHaveAttribute('data-state', 'ready');
  expect(sent.slots.map((s) => s.purpose)).toEqual([
    'gig_thumbnail',
    'gig_image',
    'gig_image',
    'gig_image',
    'gig_image',
    'gig_document',
  ]);

  // The failed attempt of flaky.png was deleted on Retry; removing a stored file deletes it too.
  expect(sent.deleted).toHaveLength(1);
  await images.getByRole('button', { name: 'Remove: c.png' }).click();
  await expect.poll(() => sent.deleted.length).toBe(2);
  await expect(summary.getByRole('link', { name: 'Gallery, completed' })).toBeVisible();
});

test('documents are not offered while S-080 is OFF (EC-8)', async ({ page }) => {
  await fakeApi(page, {
    uploads: { ...UPLOADS, gigDocument: { ...UPLOADS.gigDocument, enabled: false } },
  });
  await page.goto('/en/create');
  await hydrated(page);
  await expect(page.getByTestId('gig-images')).toBeVisible();
  await expect(page.getByTestId('gig-documents')).toHaveCount(0);
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

/** A complete valid gig: the required fields, one upgrade, one FAQ, a thumbnail, two images and a document. */
async function fillValidGig(page: Page) {
  await page.getByLabel('Service title in Georgian').fill('ლოგოს დიზაინი');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Design' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Logo design' });
  await page.getByLabel('Childcategory').selectOption({ label: 'Minimalist logo' });
  await page
    .getByRole('textbox', { name: 'Description in Georgian' })
    .fill('ლოგოს დიზაინი ორ დღეში');
  await page.getByLabel('Price', { exact: true }).fill('250,5');
  await page.getByLabel('Delivery time', { exact: true }).selectOption({ label: '3 days' });
  await page.getByRole('spinbutton', { name: 'Number of revisions' }).fill('2');
  await page.getByRole('button', { name: 'Add service upgrade' }).click();
  const upgrade = page.getByRole('group', { name: 'Upgrade #1' });
  await upgrade.getByLabel('Upgrade title').fill('Source file');
  await upgrade.getByLabel('Price').fill('20');
  await upgrade.getByLabel('Delivery time').selectOption({ label: '1 day' });
  await page.getByRole('button', { name: 'Add FAQ' }).click();
  const faq = page.getByRole('group', { name: 'Question #1' });
  await faq.getByLabel('Question').fill('Do you send the source file?');
  await faq.getByLabel('Answer').fill('Yes, as an upgrade.');
  await page.getByTestId('gig-thumbnail').locator('input[type=file]').setInputFiles(png('t.png'));
  await page
    .getByTestId('gig-images')
    .locator('input[type=file]')
    .setInputFiles([png('a.png'), png('b.png')]);
  await page
    .getByTestId('gig-documents')
    .locator('input[type=file]')
    .setInputFiles({
      name: 'work.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    });
  await expect(page.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(4);
}

/** `createGig`: answers with `reply` and records the bodies sent. */
async function fakeCreate(page: Page, reply: (n: number) => [number, unknown]) {
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/api/v1/gigs', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    bodies.push(route.request().postDataJSON());
    const [status, body] = reply(bodies.length);
    await json(route, status, body);
  });
  return bodies;
}

const createdGig = (status: 'active' | 'pending') => ({
  id: '01900000-0000-7000-8000-000000000501',
  uid: 'a1b2c3d4e5',
  slug: 'logos-dizaini-a1b2c3d4e5',
  status,
});

test('Create sends the whole gig; S-070 ON shows "View gig" (AC-16)', async ({ page }) => {
  await fakeApi(page);
  const files = await fakeFiles(page);
  const bodies = await fakeCreate(page, () => [201, createdGig('active')]);
  await page.goto('/en/create');
  await hydrated(page);
  await fillValidGig(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const done = page.getByTestId('gig-created');
  await expect(done.getByRole('heading', { level: 1, name: 'Gig created' })).toBeFocused();
  await expect(done).toContainText('You gig has been successfully posted');
  await expect(done.getByRole('link', { name: 'View gig' })).toHaveAttribute(
    'href',
    '/en/service/logos-dizaini-a1b2c3d4e5',
  );

  expect(bodies).toHaveLength(1);
  const ids = files.slots.map(
    (_, i) => `01900000-0000-7000-8000-0000000003${String(i + 1).padStart(2, '0')}`,
  );
  expect(bodies[0]).toMatchObject({
    title: { ka: 'ლოგოს დიზაინი', en: null },
    description: { en: null },
    price: { amount: 25050, currency: 'GEL' },
    deliveryDays: 3,
    revisionsAllowed: 2,
    upgrades: [{ title: 'Source file', price: { amount: 2000, currency: 'GEL' }, extraDays: 1 }],
    faqs: [{ question: 'Do you send the source file?', answer: 'Yes, as an upgrade.' }],
    thumbnailFileId: ids[0],
    imageFileIds: [ids[1], ids[2]],
    documentFileIds: [ids[3]],
    seo: null,
  });
  expect((bodies[0]!.description as { ka: string }).ka).toContain('ლოგოს დიზაინი ორ დღეში');
});

test('S-070 OFF: the review text and "My gigs" (AC-16)', async ({ page }) => {
  await fakeApi(page);
  await fakeFiles(page);
  await fakeCreate(page, () => [201, createdGig('pending')]);
  await page.goto('/en/create');
  await hydrated(page);
  await fillValidGig(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const done = page.getByTestId('gig-created');
  await expect(done).toContainText('our team is reviewing it right now');
  await expect(done.getByRole('link', { name: 'My gigs' })).toHaveAttribute(
    'href',
    '/en/seller/gigs',
  );
  await expectNoAxeViolations(page, 'success', 'main');
});

test('server errors land on their fields and go once the field changes (AC-19, AC-14)', async ({
  page,
}) => {
  await fakeApi(page);
  await fakeFiles(page);
  const bodies = await fakeCreate(page, (n) =>
    n === 1
      ? [
          400,
          {
            code: 'VALIDATION_FAILED',
            message: 'Validation failed',
            details: {
              fields: [
                { field: 'title.ka', code: 'x', message: 'Server says no title.' },
                { field: 'upgrades[0].price.amount', code: 'x', message: 'Server says no price.' },
              ],
            },
          },
        ]
      : [422, { code: 'FILE_NOT_READY', message: 'The file is not ready yet.' }],
  );
  await page.goto('/en/create');
  await hydrated(page);
  await fillValidGig(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();

  const titleKa = page.getByLabel('Service title in Georgian');
  await expect(page.getByText('Server says no title.')).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Upgrade #1' }).getByText('Server says no price.'),
  ).toBeVisible();
  await expect(titleKa).toBeFocused();
  await expect(page.getByTestId('gig-form-errors')).toBeVisible();
  await titleKa.fill('ლოგოს დიზაინი და ბრენდინგი');
  await expect(page.getByText('Server says no title.')).toHaveCount(0);
  await expect(page.getByText('Server says no price.')).toBeVisible();
  await page.getByRole('group', { name: 'Upgrade #1' }).getByLabel('Price').fill('25');

  // A file error names no list: it shows on the Gallery block, which gets the focus.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const fileError = page.locator('#gig-gallery').getByText('The file is not ready yet.');
  await expect(fileError).toBeFocused();
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(summary.getByRole('link', { name: 'Gallery, has errors' })).toBeVisible();
  expect(bodies).toHaveLength(2);
});

test('the plan limit reached meanwhile shows a danger Banner, nothing saved (AC-3)', async ({
  page,
}) => {
  await fakeApi(page);
  await fakeFiles(page);
  await fakeCreate(page, () => [
    422,
    {
      code: 'PLAN_LIMIT_REACHED',
      message: 'x',
      details: { limit: 1, settingId: 'S-001' },
    },
  ]);
  await page.goto('/en/create');
  await hydrated(page);
  await fillValidGig(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const banner = page.getByTestId('gig-submit-failed');
  await expect(banner).toBeFocused();
  await expect(banner).toContainText('Your plan allows up to 1 gigs');
  await expect(banner.getByRole('link', { name: 'Upgrade to Premium' })).toHaveAttribute(
    'href',
    '/en/subscription?gigs=true',
  );
  await expect(page.getByTestId('gig-created')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeEnabled();
});

test('"Discard changes?" before a link leaves a changed form', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/en/create');
  await hydrated(page);
  const homeLink = page.locator('header a[href="/en"]').first();

  await page.getByLabel('Service title in Georgian').fill('ლოგო');
  await homeLink.click();
  const dialog = page.getByRole('dialog', { name: 'Discard changes?' });
  await expect(dialog).toContainText('will be lost');
  await expectNoAxeViolations(page, 'discard dialog', '[data-testid="gig-discard-dialog"]');
  await dialog.getByRole('button', { name: 'Keep editing' }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/en\/create$/);
  await expect(page.getByLabel('Service title in Georgian')).toHaveValue('ლოგო');

  // The summary's in-page links never ask.
  await page.getByRole('navigation', { name: 'Form progress' }).getByRole('link').first().click();
  await expect(dialog).toBeHidden();

  await homeLink.click();
  await dialog.getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveURL(/\/en$/);
});

// ---- Edit mode `/seller/gigs/{uid}/edit` (ROADMAP 4.3.10d; spec 04 AC-10, AC-18, AC-21…AC-25) ----

const CAT = (n: number) => `01900000-0000-7000-8000-0000000c${String(n).padStart(4, '0')}`;
const GIG_ID = '01900000-0000-7000-8000-000000000601';
const FILE = (n: number) => `01900000-0000-7000-8000-0000000007${String(n).padStart(2, '0')}`;
const MEDIA = 'http://media.test/public-media';
const variants = (fileId: string) => ({
  fileId,
  thumb: `${MEDIA}/${fileId}-thumb.png`,
  medium: `${MEDIA}/${fileId}-medium.png`,
  large: `${MEDIA}/${fileId}-large.png`,
  width: 1,
  height: 1,
});

const ownerView = (over: Record<string, unknown> = {}) => ({
  id: GIG_ID,
  uid: 'k7m2p9q4r1',
  slug: 'logos-dizaini-k7m2p9q4r1',
  status: 'active',
  rejectionReason: null,
  title: { ka: 'ლოგოს დიზაინი', en: 'Logo design' },
  description: { ka: '<p><strong>ლოგოს</strong> დიზაინი ორ დღეში</p>', en: null },
  categoryId: CAT(1),
  subcategoryId: CAT(101),
  childCategoryId: CAT(1001),
  price: { amount: 25000, currency: 'GEL' },
  deliveryDays: 3,
  revisionsAllowed: 2,
  upgrades: [
    {
      id: '01900000-0000-7000-8000-000000000611',
      title: 'Source file',
      price: { amount: 2000, currency: 'GEL' },
      extraDays: 1,
    },
  ],
  faqs: [{ id: '01900000-0000-7000-8000-000000000621', question: 'Fast?', answer: 'Yes.' }],
  thumbnail: variants(FILE(1)),
  images: [variants(FILE(2)), variants(FILE(3))],
  documents: [{ fileId: FILE(4), fileName: 'work.pdf', sizeBytes: 8, url: `${MEDIA}/work.pdf` }],
  seo: { title: 'Logo design', description: 'Clean logos.' },
  ordersInQueueCount: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
  publishedAt: '2026-10-01T10:00:00.000Z',
  ...over,
});

/** lookupGig + getGigOwnerView + updateGig; records the PATCH bodies. */
async function fakeEdit(
  page: Page,
  opts: {
    view?: Record<string, unknown>;
    isOwner?: boolean;
    lookup404?: boolean;
    status?: string;
  } = {},
) {
  const view = ownerView(opts.view);
  const patches: Record<string, unknown>[] = [];
  await page.route('**/api/v1/gigs/lookup?*', (route) =>
    opts.lookup404
      ? json(route, 404, { code: 'NOT_FOUND', message: 'x' })
      : json(route, 200, {
          id: GIG_ID,
          uid: view.uid,
          slug: view.slug,
          status: view.status,
          viewer: { isOwner: opts.isOwner ?? true },
        }),
  );
  await page.route(`**/api/v1/gigs/${GIG_ID}/owner-view`, (route) => json(route, 200, view));
  await page.route(`**/api/v1/gigs/${GIG_ID}`, async (route) => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    patches.push(route.request().postDataJSON());
    await json(route, 200, { ...view, status: opts.status ?? 'pending' });
  });
  await page.route(`${MEDIA}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  return patches;
}

test('edit: the stored gig fills the form; gallery changes only; S-070 OFF → pending (AC-21…AC-23)', async ({
  page,
}) => {
  await fakeApi(page);
  const files = await fakeFiles(page);
  const patches = await fakeEdit(page);
  await page.goto('/en/seller/gigs/k7m2p9q4r1/edit');
  await hydrated(page);

  await expect(page.getByRole('heading', { level: 1, name: 'Edit gig' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.getByLabel('Service title in Georgian')).toHaveValue('ლოგოს დიზაინი');
  await expect(page.getByLabel('Service title in English')).toHaveValue('Logo design');
  await expect(page.getByLabel('Childcategory')).toHaveValue(CAT(1001));
  await expect(
    page.getByRole('textbox', { name: 'Description in Georgian' }).locator('strong'),
  ).toHaveText('ლოგოს');
  await expect(page.locator('#gig-pricing').getByLabel('Price')).toHaveValue('250.00');
  await expect(page.getByRole('spinbutton', { name: 'Number of revisions' })).toHaveValue('2');
  await expect(
    page.getByRole('group', { name: 'Upgrade #1' }).getByLabel('Upgrade title'),
  ).toHaveValue('Source file');
  await expect(page.getByRole('group', { name: 'Question #1' }).getByLabel('Answer')).toHaveValue(
    'Yes.',
  );
  await expect(page.getByTestId('gig-documents').getByText('work.pdf')).toBeVisible();
  const summary = page.getByRole('navigation', { name: 'Form progress' });
  await expect(summary.getByText('3 of 3 required blocks complete')).toBeVisible();
  await expect(page.getByTestId('gig-rejected')).toHaveCount(0);

  // AC-23: reorder, remove one stored image (not deleted: the gig keeps it until saved), add one new.
  const images = page.getByTestId('gig-images');
  await images.getByRole('button', { name: 'Move left: Images 2' }).click();
  await images.getByRole('button', { name: 'Remove: Images 1' }).click();
  await images.locator('input[type=file]').setInputFiles(png('new.png'));
  await expect(images.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(2);
  await page.getByLabel('Service title in Georgian').fill('ლოგოს დიზაინი და ბრენდინგი');

  await page.getByRole('button', { name: 'Save changes' }).click();
  const done = page.getByTestId('gig-created');
  await expect(done.getByRole('heading', { name: 'Service updated' })).toBeFocused();
  await expect(done).toContainText('our team are reviewing it right now');
  await expect(done.getByRole('link', { name: 'My gigs' })).toBeVisible();

  expect(patches).toHaveLength(1);
  expect(patches[0]).toMatchObject({
    title: { ka: 'ლოგოს დიზაინი და ბრენდინგი', en: 'Logo design' },
    childCategoryId: CAT(1001),
    price: { amount: 25000, currency: 'GEL' },
    revisionsAllowed: 2,
    upgrades: [{ id: '01900000-0000-7000-8000-000000000611', title: 'Source file' }],
    thumbnailFileId: FILE(1),
    imageFileIds: [FILE(3), '01900000-0000-7000-8000-000000000301'],
    documentFileIds: [FILE(4)],
    seo: { title: 'Logo design', description: 'Clean logos.' },
  });
  expect(files.deleted).toEqual([]);
});

test('edit: a rejected gig shows the reason; revisions above S-041 are refused on save (AC-18, AC-10)', async ({
  page,
}) => {
  await fakeApi(page, { maxRevisions: 5 });
  const patches = await fakeEdit(page, {
    view: { status: 'rejected', rejectionReason: 'The images are blurry.', revisionsAllowed: 8 },
    status: 'active',
  });
  await page.goto('/en/seller/gigs/k7m2p9q4r1/edit');
  await hydrated(page);
  await expect(page.getByTestId('gig-rejected')).toContainText('The images are blurry.');
  await expect(page.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(4);
  await expectNoAxeViolations(page, 'edit', 'main');
  const revisions = page.getByRole('spinbutton', { name: 'Number of revisions' });
  await expect(revisions).toHaveValue('8');
  await expect(page.getByText('Enter a whole number from 0 to 5.')).toHaveCount(0);

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Enter a whole number from 0 to 5.')).toBeVisible();
  await expect(revisions).toBeFocused();
  expect(patches).toHaveLength(0);

  await revisions.fill('5');
  await page.getByRole('button', { name: 'Save changes' }).click();
  const done = page.getByTestId('gig-created');
  await expect(done).toContainText('successfully updated');
  await expect(done.getByRole('link', { name: 'View gig' })).toHaveAttribute(
    'href',
    '/en/service/logos-dizaini-k7m2p9q4r1',
  );
  expect(patches[0]).toMatchObject({ revisionsAllowed: 5 });
});

test('edit: a migrated gig without revisions may stay so; an unchanged form leaves freely', async ({
  page,
}) => {
  await fakeApi(page);
  const patches = await fakeEdit(page, { view: { revisionsAllowed: null } });
  await page.goto('/en/seller/gigs/k7m2p9q4r1/edit');
  await hydrated(page);
  await expect(page.getByRole('spinbutton', { name: 'Number of revisions' })).toHaveValue('');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByTestId('gig-created')).toBeVisible();
  expect(patches[0]).not.toHaveProperty('revisionsAllowed');

  // Nothing changed after opening: a link leaves without asking.
  await page.goto('/en/seller/gigs/k7m2p9q4r1/edit');
  await hydrated(page);
  await expect(page.getByLabel('Service title in Georgian')).toHaveValue('ლოგოს დიზაინი');
  await page.locator('header a[href="/en"]').first().click();
  await expect(page).toHaveURL(/\/en$/);
});

test("edit: someone else's or an unknown gig is not found", async ({ page }) => {
  await fakeApi(page);
  await fakeEdit(page, { isOwner: false });
  await page.goto('/en/seller/gigs/k7m2p9q4r1/edit');
  await expect(page.getByTestId('gig-not-found')).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);

  await page.unrouteAll();
  await fakeApi(page);
  await fakeEdit(page, { lookup404: true });
  await page.goto('/en/seller/gigs/zzz/edit');
  await expect(page.getByTestId('gig-not-found')).toBeVisible();
});

// ---- Phone step mode (ROADMAP 4.3.10e; screen 03 "Mobile web (360)") ----

test('phone: one step per screen, Next checks the step, Review & publish creates', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await fakeApi(page);
  await fakeFiles(page);
  const bodies = await fakeCreate(page, (n) =>
    n === 1
      ? [
          400,
          {
            code: 'VALIDATION_FAILED',
            message: 'x',
            details: { fields: [{ field: 'title.ka', code: 'x', message: 'Server says no.' }] },
          },
        ]
      : [201, createdGig('active')],
  );
  await page.goto('/en/create');
  await hydrated(page);

  const position = page.getByRole('progressbar', { name: 'Step 1 of 5' });
  await expect(position).toHaveAttribute('aria-valuenow', '1');
  await expect(page.locator('#gig-overview')).toBeVisible();
  await expect(page.locator('#gig-pricing')).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Form progress' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Back' })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(0);

  // Next checks only this step: the first invalid field gets the focus, nothing else shows errors.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByLabel('Service title in Georgian')).toBeFocused();
  await expect(page.getByRole('progressbar', { name: 'Step 1 of 5' })).toBeVisible();
  await page.getByLabel('Service title in Georgian').fill('ლოგოს დიზაინი');
  await page.getByLabel('Category', { exact: true }).selectOption({ label: 'Design' });
  await page.getByLabel('Subcategory').selectOption({ label: 'Logo design' });
  await page.getByLabel('Childcategory').selectOption({ label: 'Minimalist logo' });
  await page
    .getByRole('textbox', { name: 'Description in Georgian' })
    .fill('ლოგოს დიზაინი ორ დღეში');
  await page.getByRole('button', { name: 'Next' }).click();

  await expect(page.getByRole('progressbar', { name: 'Step 2 of 5' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2. Pricing' })).toBeFocused();
  await expect(page.locator('#gig-overview')).toBeHidden();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByLabel('Service title in Georgian')).toHaveValue('ლოგოს დიზაინი');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel('Price', { exact: true }).fill('250');
  await page.getByLabel('Delivery time', { exact: true }).selectOption({ label: '3 days' });
  // Enter in a field means Next.
  await page.getByRole('spinbutton', { name: 'Number of revisions' }).fill('1');
  await page.getByRole('spinbutton', { name: 'Number of revisions' }).press('Enter');

  // Step 3: Upgrades and FAQ together, both optional.
  await expect(page.getByRole('progressbar', { name: 'Step 3 of 5' })).toBeVisible();
  await expect(page.locator('#gig-upgrades')).toBeVisible();
  await expect(page.locator('#gig-faq')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 4: the gallery is required; uploads keep running when the step changes.
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByTestId('gig-thumbnail').getByText('Field required')).toBeVisible();
  await page.getByTestId('gig-thumbnail').locator('input[type=file]').setInputFiles(png('t.png'));
  await page.getByTestId('gig-images').locator('input[type=file]').setInputFiles(png('a.png'));
  await expect(page.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 5: review with "Edit" links, the SEO fields inline, Create.
  await expect(page.getByRole('heading', { name: 'Review & publish' })).toBeFocused();
  const review = page.getByTestId('gig-review');
  await expect(review.getByRole('listitem')).toHaveCount(5);
  await expect(review.getByRole('listitem').first()).toContainText('completed');
  await expect(page.locator('#gig-seo').getByLabel('Seo title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'SEO meta tags' })).toHaveCount(0);
  await expectNoAxeViolations(page, 'phone review', 'main');
  await review.getByRole('button', { name: 'Edit: Pricing' }).click();
  await expect(page.getByRole('progressbar', { name: 'Step 2 of 5' })).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Next' }).click();

  // A server error on an earlier step: Create jumps there and focuses the field.
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: 'Step 1 of 5' })).toBeVisible();
  await expect(page.getByLabel('Service title in Georgian')).toBeFocused();
  await expect(page.getByText('Server says no.')).toBeVisible();
  await page.getByLabel('Service title in Georgian').fill('ლოგოს დიზაინი სწრაფად');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByTestId('gig-created')).toBeVisible();
  expect(bodies).toHaveLength(2);
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
  await fakeFiles(page);
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/en/create');
    await hydrated(page);
    await page.getByRole('button', { name: 'Add service upgrade' }).click();
    await page.getByRole('button', { name: 'Add FAQ' }).click();
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByTestId('gig-form-errors')).toBeVisible();
    // Gallery items: a ready image and a refused one with its message.
    const images = page.getByTestId('gig-images').locator('input[type=file]');
    await images.setInputFiles([
      png('a.png'),
      { name: 'x.gif', mimeType: 'image/gif', buffer: PNG },
    ]);
    await expect(page.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(1);
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
