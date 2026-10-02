// Selling → Portfolio list, create and edit on the web (spec 02 AC-24, AC-25, AC-27, AC-28, AC-42; task 4.1.19).
// The API side (S-071, S-089/S-090, own ready files, slugs) is covered by the API tests; here the real pages run
// against a routed API with state, so the list, the uploads, the bodies sent and the messages can be checked.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// playwright.config.ts gives the web server S3_PUBLIC_ENDPOINT=http://storage.test (CSP connect-src) and
// PUBLIC_MEDIA_BASE_URL=http://media.test/public-media (CSP img-src).
const STORAGE = 'http://storage.test';
const MEDIA = 'http://media.test/public-media';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  fullName: 'Nino Beridze',
  username: 'nino_b',
  email: 'nino@example.com',
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'selling',
  avatar: null,
  kycStatus: 'none',
  countryCode: 'GE',
  createdAt: '2023-05-10T08:00:00Z',
};

const OWNER = {
  id: ME.id,
  username: ME.username,
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: true,
  countryCode: 'GE',
  isDeleted: false,
};

const image = (fileId: string) => ({
  fileId,
  thumb: `${MEDIA}/portfolio/${fileId}/thumb.webp`,
  medium: `${MEDIA}/portfolio/${fileId}/medium.webp`,
  large: `${MEDIA}/portfolio/${fileId}/large.webp`,
  width: 1200,
  height: 800,
});

type Status = 'pending' | 'active' | 'rejected';

function item(n: number, status: Status, extra: Record<string, unknown> = {}) {
  const uid = `UID${n}`;
  return {
    id: `01900000-0000-7000-8000-0000000001${String(n).padStart(2, '0')}`,
    uid,
    slug: `work-${n}-${uid}`,
    title: `Work ${n}`,
    description: `Description of work ${n}.`,
    projectUrl: null as string | null,
    videoUrl: null as string | null,
    thumbnail: image(`thumb-${n}`),
    images: [image(`img-${n}-a`), image(`img-${n}-b`)],
    status,
    rejectionReason: status === 'rejected' ? 'Images are blurry' : null,
    rejectedAt: status === 'rejected' ? '2026-10-01T10:00:00Z' : null,
    owner: OWNER,
    isOwn: true,
    publishedAt: status === 'active' ? '2026-09-01T10:00:00Z' : null,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-01T10:00:00Z',
    ...extra,
  };
}

const card = (i: ReturnType<typeof item>) => ({
  id: i.id,
  uid: i.uid,
  slug: i.slug,
  title: i.title,
  thumbnail: i.thumbnail,
  status: i.status,
});

const invalid = (field: string, message: string) => ({
  code: 'VALIDATION_FAILED',
  message,
  details: { fields: [{ field, code: 'invalid', message }] },
});

/** Routes getMe, getPublicConfig, the portfolio ops and the upload protocol, keeping the state. */
async function fakeApi(
  page: Page,
  opts: { items?: ReturnType<typeof item>[]; autoApprove?: boolean } = {},
) {
  const items = structuredClone(opts.items ?? []);
  const sent = {
    created: [] as Record<string, unknown>[],
    updated: [] as Record<string, unknown>[],
    deleted: [] as string[],
    deletedFiles: [] as string[],
    uploads: [] as string[],
  };
  let seq = 0;

  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
      uploads: {
        portfolioImage: {
          enabled: true,
          maxSizeMb: 2,
          maxFiles: 3,
          allowedExtensions: ['jpg', 'jpeg', 'png'],
        },
      },
    }),
  );

  await page.route(/\/api\/v1\/portfolio-items(\/[^?]*)?(\?.*)?$/, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const rest = url.pathname.replace(/^.*\/portfolio-items/, '');
    const method = req.method();
    if (rest === '' && method === 'GET') {
      expect(url.searchParams.get('username')).toBe(ME.username);
      return json(route, 200, { data: items.map(card), nextCursor: null });
    }
    if (rest === '' && method === 'POST') {
      const body = req.postDataJSON() as Record<string, unknown>;
      sent.created.push(body);
      if (String(body.title).length < 3) {
        return json(route, 400, invalid('title', 'The field must be at least 3 characters'));
      }
      const created = item(90, opts.autoApprove ? 'active' : 'pending', { title: body.title });
      items.unshift(created);
      return json(route, 201, created);
    }
    if (rest === '/lookup') {
      const found = items.find((i) => i.uid === url.searchParams.get('uid'));
      return found
        ? json(route, 200, found)
        : json(route, 404, { code: 'NOT_FOUND', message: 'Page not found' });
    }
    const found = items.find((i) => i.id === rest.slice(1));
    if (!found) return json(route, 404, { code: 'NOT_FOUND', message: 'Page not found' });
    if (method === 'GET') return json(route, 200, found);
    if (method === 'DELETE') {
      sent.deleted.push(found.id);
      items.splice(items.indexOf(found), 1);
      return route.fulfill({ status: 204 });
    }
    const body = req.postDataJSON() as Record<string, unknown>;
    sent.updated.push(body);
    Object.assign(found, body, {
      status: opts.autoApprove ? 'active' : 'pending',
      rejectionReason: null,
      rejectedAt: null,
    });
    return json(route, 200, found);
  });

  await page.route('**/api/v1/files', async (route) => {
    const body = route.request().postDataJSON();
    const fileId = `01900000-0000-7000-8000-0000000002${String((seq += 1)).padStart(2, '0')}`;
    sent.uploads.push(body.fileName);
    await json(route, 201, {
      file: {
        id: fileId,
        purpose: body.purpose,
        status: 'pending',
        fileName: body.fileName,
        contentType: body.contentType,
        sizeBytes: body.sizeBytes,
        rejectReason: null,
        image: null,
        createdAt: '2026-10-02T10:00:00.000Z',
        readyAt: null,
      },
      upload: { url: `${STORAGE}/public`, method: 'POST', fields: { key: fileId }, expiresAt: '' },
    });
  });
  await page.route(`${STORAGE}/**`, (route) =>
    route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }),
  );
  await page.route(/\/api\/v1\/files\/[^/]+(\/complete)?$/, async (route) => {
    const fileId = new URL(route.request().url()).pathname.split('/')[4]!;
    if (route.request().method() === 'DELETE') {
      sent.deletedFiles.push(fileId);
      return route.fulfill({ status: 204 });
    }
    await json(route, 200, {
      id: fileId,
      purpose: 'portfolio_image',
      status: 'ready',
      fileName: 'work.png',
      contentType: 'image/png',
      sizeBytes: PNG.length,
      rejectReason: null,
      image: image(fileId),
      createdAt: '2026-10-02T10:00:00.000Z',
      readyAt: '2026-10-02T10:00:01.000Z',
    });
  });
  await page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  return { sent, items };
}

test('list from the Selling nav: statuses, rejection reason, edit links, add tile (AC-28, AC-42)', async ({
  page,
}) => {
  await fakeApi(page, { items: [item(1, 'pending'), item(2, 'active'), item(3, 'rejected')] });
  await page.goto('/en/seller/home');
  await page
    .getByRole('navigation', { name: 'Selling navigation' })
    .getByRole('link', { name: 'Portfolio' })
    .click();
  await expect(page).toHaveURL(/\/en\/seller\/portfolio$/);
  await expect(page).toHaveTitle(/^Portfolio \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'My portfolio' })).toBeVisible();

  const cards = page.getByTestId('my-portfolio-item');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).getByTestId('status')).toHaveText('Pending');
  await expect(cards.nth(1).getByTestId('status')).toHaveText('Active');
  await expect(cards.nth(2).getByTestId('status')).toHaveText('Rejected');
  await expect(cards.nth(2).getByTestId('rejection-reason')).toHaveText(
    'Not approved. Reason: Images are blurry. Edit the work and save it to send it for review again.',
  );
  await expect(cards.nth(1).getByTestId('rejection-reason')).toHaveCount(0);
  await expect(cards.nth(1).getByRole('link', { name: 'Work 2', exact: true })).toHaveAttribute(
    'href',
    '/en/profile/nino_b/portfolio/work-2-UID2',
  );
  await expect(cards.nth(1).getByRole('link', { name: 'Edit: Work 2' })).toHaveAttribute(
    'href',
    '/en/seller/portfolio/UID2/edit',
  );
  await page.getByTestId('add-work-tile').click();
  await expect(page).toHaveURL(/\/en\/seller\/portfolio\/create$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Add a new work' })).toBeVisible();
});

test('empty list shows "No work added yet." and the add tile', async ({ page }) => {
  await fakeApi(page);
  await page.goto('/en/seller/portfolio');
  await expect(page.getByText('No work added yet.')).toBeVisible();
  await expect(page.getByTestId('add-work-tile')).toBeVisible();
});

test('create: images required, per-file checks, upload, body sent, pending note after save (AC-24, AC-25)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page);
  await page.goto('/en/seller/portfolio/create');
  await expect(page).toHaveTitle(/^Create project \| /);

  await page.getByLabel('Project title').fill('Logo for a bakery');
  await page.getByLabel('Project description').fill('A round logo with bread and wheat.');
  await page.getByRole('button', { name: 'Create project' }).click();
  const thumb = page.getByTestId('thumbnail-uploader');
  const gallery = page.getByTestId('gallery-uploader');
  await expect(thumb.getByText('Field required')).toBeVisible();
  await expect(gallery.getByText('Field required')).toBeVisible();
  expect(sent.created).toHaveLength(0);

  // Client pre-checks: wrong type and too big never start an upload.
  const galleryInput = gallery.locator('input[type=file]');
  await galleryInput.setInputFiles([
    { name: 'logo.gif', mimeType: 'image/gif', buffer: PNG },
    { name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 1) },
  ]);
  await expect(gallery).toContainText('Selected file extension is not allowed');
  await expect(gallery).toContainText('The selected file size is too large');
  expect(sent.uploads).toHaveLength(0);
  for (const name of ['logo.gif', 'big.png']) {
    await gallery.getByRole('button', { name: `Remove: ${name}` }).click();
  }

  // At most S-089 (3) gallery images.
  await galleryInput.setInputFiles([png('a.png'), png('b.png'), png('c.png'), png('d.png')]);
  await expect(gallery).toContainText('Field not have more than 3 items');
  await expect(gallery.getByTestId('upload-item')).toHaveCount(3);
  await gallery.getByRole('button', { name: 'Remove: c.png' }).click();
  await thumb.locator('input[type=file]').setInputFiles(png('cover.png'));
  await expect(thumb.getByTestId('upload-item')).toHaveCount(1);

  await page.getByLabel('Project link (optional)').fill(' https://bakery.example ');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page).toHaveURL(/\/en\/seller\/portfolio$/);
  await expect(page.getByText('Your project has been successfully added')).toBeVisible();
  await expect(
    page.getByText('This work is waiting for review and is not public yet.'),
  ).toBeVisible();
  await expect(page.getByTestId('my-portfolio-item')).toHaveCount(1);

  expect(sent.created).toHaveLength(1);
  const body = sent.created[0]!;
  expect(body).toMatchObject({
    title: 'Logo for a bakery',
    description: 'A round logo with bread and wheat.',
    projectUrl: 'https://bakery.example',
    videoUrl: null,
  });
  expect(typeof body.thumbnailFileId).toBe('string');
  expect(body.imageFileIds).toHaveLength(2);
  // The removed upload is deleted; the files used by the item are not.
  expect(sent.deletedFiles).toHaveLength(1);
  expect(body.imageFileIds).not.toContain(sent.deletedFiles[0]);
});

test('create with auto-approve (S-071 ON): no pending note; API field errors under the field', async ({
  page,
}) => {
  await fakeApi(page, { autoApprove: true });
  await page.goto('/en/seller/portfolio/create');
  await page.getByLabel('Project title').fill('Ab');
  await page.getByLabel('Project description').fill('A round logo with bread.');
  await page
    .getByTestId('thumbnail-uploader')
    .locator('input[type=file]')
    .setInputFiles(png('t.png'));
  await page
    .getByTestId('gallery-uploader')
    .locator('input[type=file]')
    .setInputFiles(png('g.png'));
  await expect(page.getByTestId('gallery-uploader').getByTestId('upload-item')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText('The field must be at least 3 characters')).toBeVisible();

  await page.getByLabel('Project title').fill('Abc');
  await page.getByRole('button', { name: 'Create project' }).click();
  await expect(page.getByText('Your project has been successfully added')).toBeVisible();
  await expect(page.getByText('This work is waiting for review')).toHaveCount(0);
  await expect(page.getByTestId('status')).toHaveText('Active');
});

test('edit a rejected work: chip + reason, current images, only changed images sent (AC-27, AC-42)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page, { items: [item(3, 'rejected')] });
  await page.goto('/en/seller/portfolio/UID3/edit');
  await expect(page).toHaveTitle(/^Edit project \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Edit my work' })).toBeVisible();
  const note = page.getByTestId('rejected-note');
  await expect(note).toContainText('Rejected');
  await expect(note).toContainText('Not approved. Reason: Images are blurry.');
  await expect(page.getByLabel('Project title')).toHaveValue('Work 3');
  await expect(page.getByTestId('current-thumbnail')).toHaveAttribute('src', /thumb-3\/medium/);
  await expect(page.getByTestId('current-gallery').locator('img')).toHaveCount(2);
  await expect(page.getByText('New images replace the current gallery.')).toBeVisible();

  // Text only: no file ids sent, the images stay.
  await page.getByLabel('Project title').fill('Work 3 v2');
  await page.getByRole('button', { name: 'Update project' }).click();
  await expect(page).toHaveURL(/\/en\/seller\/portfolio$/);
  await expect(page.getByText('Your project has been successfully updated')).toBeVisible();
  await expect(page.getByText('This work is waiting for review')).toBeVisible();
  await expect(page.getByTestId('status')).toHaveText('Pending');
  await expect(page.getByTestId('rejection-reason')).toHaveCount(0);
  expect(sent.updated[0]).toEqual({
    title: 'Work 3 v2',
    description: 'Description of work 3.',
    projectUrl: null,
    videoUrl: null,
  });

  // New gallery images replace the gallery.
  await page.goto('/en/seller/portfolio/UID3/edit');
  await expect(page.getByTestId('pending-note')).toContainText('Pending');
  await page
    .getByTestId('gallery-uploader')
    .locator('input[type=file]')
    .setInputFiles(png('new.png'));
  await expect(page.getByTestId('current-gallery')).toHaveCount(0);
  await expect(page.getByTestId('gallery-uploader').getByTestId('upload-item')).toHaveAttribute(
    'data-state',
    'ready',
  );
  await page.getByRole('button', { name: 'Update project' }).click();
  await expect(page.getByText('Your project has been successfully updated')).toBeVisible();
  expect(sent.updated[1]!.imageFileIds).toHaveLength(1);
  expect(sent.updated[1]).not.toHaveProperty('thumbnailFileId');
});

test('delete asks first; cancel keeps the work, confirm removes it (AC-27)', async ({ page }) => {
  const { sent } = await fakeApi(page, { items: [item(1, 'active'), item(2, 'active')] });
  await page.goto('/en/seller/portfolio');
  await page.getByRole('button', { name: 'Delete: Work 1' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete' });
  await expect(dialog).toContainText(
    'Are you sure you want to delete this project from portfolio?',
  );
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(sent.deleted).toHaveLength(0);

  await page.getByRole('button', { name: 'Delete: Work 1' }).click();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Project has been successfully deleted')).toBeVisible();
  await expect(page.getByTestId('my-portfolio-item')).toHaveCount(1);
  expect(sent.deleted).toHaveLength(1);
});

test("someone else's or a missing work is not found; the legacy edit URL redirects (url-map §5)", async ({
  page,
  request,
}) => {
  await fakeApi(page, { items: [item(4, 'active', { isOwn: false })] });
  await page.goto('/en/seller/portfolio/UID4/edit');
  await expect(page.getByText('Page not found')).toBeVisible();
  await expect(page.getByLabel('Project title')).toHaveCount(0);
  await page.goto('/en/seller/portfolio/NOPE/edit');
  await expect(page.getByText('Page not found')).toBeVisible();

  const res = await request.get('/en/seller/portfolio/edit/UID4', { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers().location).toMatch(/\/en\/seller\/portfolio\/UID4\/edit$/);
  const ka = await request.get('/seller/portfolio/edit/UID4', { maxRedirects: 0 });
  expect(ka.status()).toBe(301);
  expect(ka.headers().location).toMatch(/[^n]\/seller\/portfolio\/UID4\/edit$/);
});

test('Georgian is the default; phone (360 px) has no horizontal scroll on the list and the form', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeApi(page, { items: [item(1, 'rejected'), item(2, 'active')] });
  const noOverflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );

  await page.goto('/seller/portfolio');
  await expect(page.getByRole('heading', { level: 1, name: 'ჩემი პორტფოლიო' })).toBeVisible();
  await expect(page.getByTestId('rejection-reason')).toBeVisible();
  expect(await noOverflow()).toBe(true);

  await page.goto('/seller/portfolio/UID1/edit');
  await expect(page.getByTestId('current-gallery')).toBeVisible();
  expect(await noOverflow()).toBe(true);
});
