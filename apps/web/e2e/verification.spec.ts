// Verification centre on the web (spec 02 AC-36…AC-39, EC-8, task 4.1.20b). The API rules (one pending or
// verified per user, own ready `kyc_document` files, back side by type, private downloads) are covered by the
// API tests; here the real page runs against a routed API with state.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// playwright.config.ts gives the web server S3_PUBLIC_ENDPOINT=http://storage.test (CSP connect-src).
const STORAGE = 'http://storage.test';
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const ME = {
  id: '01900000-0000-7000-8000-000000000001',
  fullName: 'Nino Beridze',
  username: 'nino_b',
  email: 'nino@example.com',
  pendingEmail: null,
  referralCode: 'ABCD1234',
  hasPassword: true,
  twoFactorAvailable: false,
  twoFactorEnabled: false,
  isRestricted: false,
  lastDashboard: 'buying',
  avatar: null,
  kycStatus: 'none',
  countryCode: null,
  city: null,
  createdAt: '2023-05-10T08:00:00Z',
};

const attachment = (fileId: string, fileName: string) => ({
  fileId,
  fileName,
  contentType: 'image/png',
  sizeBytes: 1536,
});

const verification = (status: string, extra: Record<string, unknown> = {}) => ({
  id: '01900000-0000-7000-8000-0000000000a1',
  documentType: 'national_id',
  status,
  provider: 'manual',
  frontFile: attachment('01900000-0000-7000-8000-0000000000f1', 'front.png'),
  backFile: attachment('01900000-0000-7000-8000-0000000000f2', 'back.png'),
  selfieFile: attachment('01900000-0000-7000-8000-0000000000f3', 'selfie.png'),
  declineReason: null,
  createdAt: '2026-09-20T10:00:00Z',
  reviewedAt: status === 'pending' ? null : '2026-09-21T10:00:00Z',
  ...extra,
});

type Overview = { status: string; verification: unknown; canSubmit: boolean };

/** Routes getMe, getPublicConfig, getMyKyc, createKycVerification, the upload protocol and the download link. */
async function fakeApi(page: Page, overview: Overview, opts: { conflict?: boolean } = {}) {
  const state = { overview };
  const sent = {
    submits: [] as Record<string, unknown>[],
    purposes: [] as string[],
    downloads: [] as string[],
  };
  let seq = 0;

  await page.route('**/api/v1/me', (route) => json(route, 200, ME));
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
    }),
  );
  await page.route('**/api/v1/me/kyc', (route) => json(route, 200, state.overview));
  await page.route('**/api/v1/kyc', (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    sent.submits.push(body);
    if (opts.conflict) {
      state.overview = {
        status: 'pending',
        verification: verification('pending'),
        canSubmit: false,
      };
      return json(route, 409, {
        code: 'STATE_CONFLICT',
        message: 'Your documents are being reviewed.',
        details: { currentState: 'pending' },
      });
    }
    const created = verification('pending', {
      documentType: body.documentType,
      backFile: body.backFileId ? attachment(body.backFileId as string, 'back.png') : null,
    });
    state.overview = { status: 'pending', verification: created, canSubmit: false };
    return json(route, 201, created);
  });

  await page.route('**/api/v1/files', async (route) => {
    const body = route.request().postDataJSON();
    sent.purposes.push(body.purpose);
    seq += 1;
    const fileId = `01900000-0000-7000-8000-0000000001${String(seq).padStart(2, '0')}`;
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
      upload: { url: `${STORAGE}/kyc`, method: 'POST', fields: { key: fileId }, expiresAt: '' },
    });
  });
  await page.route(`${STORAGE}/**`, (route) =>
    route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } }),
  );
  await page.route(/\/api\/v1\/files\/[^/]+\/download/, (route) => {
    sent.downloads.push(new URL(route.request().url()).pathname.split('/')[4]!);
    return json(route, 200, {
      url: 'http://storage.test/kyc/signed?x=1',
      expiresAt: '2026-10-02T10:02:00.000Z',
    });
  });
  await page.route(/\/api\/v1\/files\/[^/]+(\/complete)?$/, async (route) => {
    const fileId = new URL(route.request().url()).pathname.split('/')[4]!;
    if (route.request().method() === 'DELETE') return route.fulfill({ status: 204 });
    await json(route, 200, {
      id: fileId,
      purpose: 'kyc_document',
      status: 'ready',
      fileName: 'doc.png',
      contentType: 'image/png',
      sizeBytes: PNG.length,
      rejectReason: null,
      image: null,
      createdAt: '2026-10-02T10:00:00.000Z',
      readyAt: '2026-10-02T10:00:01.000Z',
    });
  });
  return sent;
}

const NONE: Overview = { status: 'none', verification: null, canSubmit: true };

async function pickImage(page: Page, slot: string, name = `${slot}.png`) {
  await page
    .getByTestId(slot)
    .locator('input[type=file]')
    .setInputFiles({ name, mimeType: 'image/png', buffer: PNG });
  await expect(page.getByTestId(slot).getByTestId('upload-item')).toBeVisible();
  await expect(page.getByTestId(slot).getByTestId('upload-item')).not.toContainText(
    /Uploading|Processing/,
  );
}

test('first verification: 3 legacy steps with checks, then pending (AC-36, AC-38)', async ({
  page,
}) => {
  const sent = await fakeApi(page, NONE);
  await page.goto('/en/account/verification');
  await expect(page).toHaveTitle(/^Verification center \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Verification center' })).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Account settings' }).getByRole('link', {
      name: 'Verification center',
    }),
  ).toHaveAttribute('aria-current', 'page');

  // Step 1: a type is required.
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('kyc-step-1')).toContainText('Field required');
  await page.getByLabel('Government-issued ID').check();
  await page.getByRole('button', { name: 'Next step' }).click();

  // Step 2: front and back are required for an ID card.
  await expect(page.getByTestId('kyc-step-2')).toBeVisible();
  await expect(page.getByTestId('kyc-front')).toContainText('JPG, JPEG and PNG (Max 5MB)');
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('kyc-front')).toContainText('Field required');
  await expect(page.getByTestId('kyc-back')).toContainText('Field required');
  await pickImage(page, 'kyc-front');
  await pickImage(page, 'kyc-back');

  // Back keeps the uploads.
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByTestId('kyc-step-1')).toBeVisible();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('kyc-front').getByTestId('upload-item')).toBeVisible();
  await page.getByRole('button', { name: 'Next step' }).click();

  // Step 3: selfie with the legacy hint; Finish needs it.
  await expect(page.getByTestId('kyc-step-3')).toContainText(
    'Please upload a selfie photo holding your ID document.',
  );
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('kyc-selfie')).toContainText('Field required');
  expect(sent.submits).toHaveLength(0);
  await pickImage(page, 'kyc-selfie');
  await page.getByRole('button', { name: 'Finish' }).click();

  await expect(page.getByTestId('kyc-state')).toHaveText('Verification pending');
  await expect(page.getByTestId('kyc-status')).toContainText('Your documents are being reviewed.');
  await expect(page.getByTestId('kyc-send-again')).toHaveCount(0);
  expect(sent.purposes).toEqual(['kyc_document', 'kyc_document', 'kyc_document']);
  expect(sent.submits).toEqual([
    {
      documentType: 'national_id',
      frontFileId: '01900000-0000-7000-8000-000000000101',
      backFileId: '01900000-0000-7000-8000-000000000102',
      selfieFileId: '01900000-0000-7000-8000-000000000103',
    },
  ]);
});

test('passport: front only, no back side sent (AC-36)', async ({ page }) => {
  const sent = await fakeApi(page, NONE);
  await page.goto('/en/account/verification');
  await page.getByLabel('Passport').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByTestId('kyc-back')).toHaveCount(0);
  await pickImage(page, 'kyc-front');
  await page.getByRole('button', { name: 'Next step' }).click();
  await pickImage(page, 'kyc-selfie');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('kyc-state')).toHaveText('Verification pending');
  expect(sent.submits[0]).toEqual({
    documentType: 'passport',
    frontFileId: '01900000-0000-7000-8000-000000000101',
    selfieFileId: '01900000-0000-7000-8000-000000000102',
  });
});

test('a wrong file type is refused before any upload (AC-36)', async ({ page }) => {
  const sent = await fakeApi(page, NONE);
  await page.goto('/en/account/verification');
  await page.getByLabel('Driver license').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await page
    .getByTestId('kyc-front')
    .locator('input[type=file]')
    .setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: PNG });
  await expect(page.getByTestId('kyc-front').getByRole('alert')).toBeVisible();
  expect(sent.purposes).toHaveLength(0);
});

test('declined: reason shown; "Send files again" opens the form and submits a new one (AC-37, EC-8)', async ({
  page,
}) => {
  const sent = await fakeApi(page, {
    status: 'declined',
    verification: verification('declined', { declineReason: 'The photo is blurred.' }),
    canSubmit: true,
  });
  await page.goto('/en/account/verification');
  await expect(page.getByTestId('kyc-state')).toHaveText('Verification declined');
  await expect(page.getByTestId('kyc-status')).toContainText('Declined at');
  await expect(page.getByTestId('kyc-reason')).toHaveText('The photo is blurred.');

  await page.getByTestId('kyc-send-again').click();
  await page.getByLabel('Passport').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await pickImage(page, 'kyc-front');
  await page.getByRole('button', { name: 'Next step' }).click();
  await pickImage(page, 'kyc-selfie');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('kyc-state')).toHaveText('Verification pending');
  expect(sent.submits).toHaveLength(1);
});

test('verified: status, date and documents; Download asks for the owner-only signed link (AC-38, AC-39)', async ({
  page,
}) => {
  const sent = await fakeApi(page, {
    status: 'verified',
    verification: verification('verified'),
    canSubmit: false,
  });
  await page.route('http://storage.test/kyc/signed**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Content-Disposition': 'attachment; filename="selfie.png"' },
      body: PNG,
    }),
  );
  await page.goto('/en/account/verification');
  const status = page.getByTestId('kyc-status');
  await expect(page.getByTestId('kyc-state')).toHaveText('Account verified');
  await expect(status).toContainText('Verified at');
  await expect(status).toContainText('21.09.2026');
  await expect(status).toContainText('Selfie photo – 1.5 KB');
  await expect(status).toContainText('Government-issued ID (front side)');
  await expect(status).toContainText('Government-issued ID (back side)');
  await expect(page.getByTestId('kyc-send-again')).toHaveCount(0);
  await expect(page.getByTestId('kyc-form')).toHaveCount(0);

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download: Selfie photo' }).click();
  await download;
  expect(sent.downloads).toEqual(['01900000-0000-7000-8000-0000000000f3']);
});

test('a submit refused because one is already pending shows that verification (AC-38)', async ({
  page,
}) => {
  await fakeApi(page, NONE, { conflict: true });
  await page.goto('/en/account/verification');
  await page.getByLabel('Passport').check();
  await page.getByRole('button', { name: 'Next step' }).click();
  await pickImage(page, 'kyc-front');
  await page.getByRole('button', { name: 'Next step' }).click();
  await pickImage(page, 'kyc-selfie');
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByTestId('kyc-state')).toHaveText('Verification pending');
});

test('Georgian is the default; phone (360 px) has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await fakeApi(page, NONE);
  await page.goto('/account/verification');
  await expect(page.getByRole('heading', { level: 1, name: 'ვერიფიკაცია' })).toBeVisible();
  await expect(page.getByLabel('პირადობის დამადასტურებელი მოწმობა')).toBeVisible();
  // The form is on the first screen; the account card follows it (QA 4.1.26 BUG-03).
  const formBox = await page.getByTestId('kyc-form').boundingBox();
  const navBox = await page.locator('.mt-account-nav').boundingBox();
  expect(formBox!.y).toBeLessThan(780);
  expect(formBox!.y).toBeLessThan(navBox!.y);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
