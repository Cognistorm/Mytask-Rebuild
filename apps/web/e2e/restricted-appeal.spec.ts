// Restriction appeal with files on the web (spec 01 AC-47; ROADMAP 4.1.6b). The API side (purpose, limits,
// fileIds checks) is covered by the API tests; here the real page runs against a routed API and a routed
// storage host, so the main flow needs no stack: pick files → direct upload → scan → appeal with fileIds.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// playwright.config.ts gives the web server S3_PUBLIC_ENDPOINT=http://storage.test (CSP connect-src).
const STORAGE = 'http://storage.test';
const RESTRICTION = {
  id: '01900000-0000-7000-8000-0000000000r1',
  message: 'Please send proof of your identity.',
  filesRequired: true,
  status: 'pending',
  createdAt: '2026-10-01T10:00:00.000Z',
  resolvedAt: null,
  appeal: null,
  canAppeal: true,
};
const RULE = {
  enabled: true,
  maxSizeMb: 100,
  maxFiles: 2,
  allowedExtensions: ['jpg', 'png', 'pdf', 'mp4'],
};

/** Routes listMyRestrictions, getPublicConfig, the upload protocol, deleteFile and createRestrictionAppeal. */
async function fakeApi(page: Page, opts: { rejectNames?: string[] } = {}) {
  const files = new Map<string, { name: string; size: number; type: string; polls: number }>();
  const sent: {
    appeal?: { fileIds?: string[]; message: string };
    deleted: string[];
    stored: number;
  } = { deleted: [], stored: 0 };
  const fileView = (id: string) => {
    const f = files.get(id)!;
    const rejected = opts.rejectNames?.includes(f.name);
    const status = f.polls < 1 ? 'scanning' : rejected ? 'rejected' : 'ready';
    return {
      id,
      purpose: 'appeal_file',
      status,
      fileName: f.name,
      contentType: f.type,
      sizeBytes: f.size,
      rejectReason:
        status === 'rejected' ? 'The file was rejected because it may contain a virus' : null,
      image: null,
      createdAt: '2026-10-02T10:00:00.000Z',
      readyAt: null,
    };
  };

  await page.route('**/api/v1/me/restrictions', (route) =>
    json(route, 200, {
      data: [sent.appeal ? { ...RESTRICTION, status: 'submitted', canAppeal: false } : RESTRICTION],
      nextCursor: null,
    }),
  );
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, { uploads: { appealFile: RULE } }),
  );
  await page.route('**/api/v1/files', async (route) => {
    const body = route.request().postDataJSON();
    const id = `01900000-0000-7000-8000-00000000f00${files.size + 1}`;
    files.set(id, { name: body.fileName, size: body.sizeBytes, type: body.contentType, polls: -1 });
    await json(route, 201, {
      file: fileView(id),
      upload: {
        url: `${STORAGE}/private`,
        method: 'POST',
        fields: { key: `quarantine/${id}`, Policy: 'p' },
        expiresAt: '2026-10-02T10:15:00.000Z',
      },
    });
  });
  await page.route(`${STORAGE}/**`, async (route) => {
    // Browsers send the CORS preflight-free multipart POST; storage answers 204 like S3.
    sent.stored += 1;
    await route.fulfill({ status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route(/\/api\/v1\/files\/[^/]+(\/complete)?$/, async (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[4]!;
    if (route.request().method() === 'DELETE') {
      sent.deleted.push(id);
      files.delete(id);
      return route.fulfill({ status: 204 });
    }
    files.get(id)!.polls += 1;
    await json(route, route.request().url().endsWith('/complete') ? 202 : 200, fileView(id));
  });
  await page.route('**/api/v1/restriction-appeals', async (route) => {
    sent.appeal = route.request().postDataJSON();
    if (!sent.appeal?.fileIds?.length) {
      return json(route, 400, {
        code: 'VALIDATION_FAILED',
        message: 'Field required',
        details: { fields: [{ field: 'fileIds', code: 'required', message: 'Field required' }] },
      });
    }
    await json(route, 201, { ...RESTRICTION, status: 'submitted', canAppeal: false });
  });
  return sent;
}

const pdf = (name: string, size = 2048) => ({
  name,
  mimeType: 'application/pdf',
  buffer: Buffer.alloc(size, 1),
});

test('appeal with files: upload, scan, remove, send the ready file ids', async ({ page }) => {
  const sent = await fakeApi(page);
  await page.goto('/en/restricted');
  await expect(page.getByText('Please send proof of your identity.')).toBeVisible();
  await expect(
    page.getByText('File must be less than 100 MB and allowed types are jpg, png, pdf, mp4'),
  ).toBeVisible();

  const picker = page.getByLabel('Attach a file');
  await picker.setInputFiles([pdf('proof.pdf'), pdf('extra.pdf')]);
  const rows = page.getByTestId('appeal-file');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'proof.pdf' })).toHaveAttribute('data-state', 'ready');
  await expect(rows.filter({ hasText: 'extra.pdf' })).toHaveAttribute('data-state', 'ready');
  expect(sent.stored).toBe(2);
  // S-091 reached: the picker is disabled.
  await expect(picker).toBeDisabled();

  await rows.filter({ hasText: 'extra.pdf' }).getByRole('button', { name: 'Remove' }).click();
  await expect(rows).toHaveCount(1);
  await expect(picker).toBeEnabled();
  expect(sent.deleted).toEqual(['01900000-0000-7000-8000-00000000f002']);

  await page.getByLabel('Type your response here').fill('Here is my ID.');
  await page.getByRole('button', { name: 'Appeal the closure' }).click();
  await expect(page.getByText('Appeal the closure')).toHaveCount(0);
  expect(sent.appeal).toEqual({
    restrictionId: RESTRICTION.id,
    message: 'Here is my ID.',
    fileIds: ['01900000-0000-7000-8000-00000000f001'],
  });
});

test('pre-checks type and size, shows the scan verdict, and needs a file when required', async ({
  page,
}) => {
  const sent = await fakeApi(page, { rejectNames: ['virus.pdf'] });
  await page.goto('/en/restricted');
  await page
    .getByLabel('Attach a file')
    .setInputFiles([
      { name: 'tool.exe', mimeType: 'application/octet-stream', buffer: Buffer.alloc(10) },
      pdf('virus.pdf'),
    ]);
  const rows = page.getByTestId('appeal-file');
  await expect(rows.filter({ hasText: 'tool.exe' })).toContainText(
    'Selected file extension is not allowed',
  );
  await expect(rows.filter({ hasText: 'virus.pdf' })).toContainText('may contain a virus');
  expect(sent.stored).toBe(1); // the .exe never left the browser

  await page.getByLabel('Type your response here').fill('No files yet.');
  await page.getByRole('button', { name: 'Appeal the closure' }).click();
  await expect(page.getByText('Field required')).toBeVisible();
  expect(sent.appeal?.fileIds).toEqual([]);
});

test('the private CSP lets the browser upload to the storage origin', async ({ page }) => {
  await fakeApi(page);
  const res = await page.goto('/en/restricted');
  expect(res?.headers()['content-security-policy']).toMatch(
    /connect-src 'self' http:\/\/storage\.test/,
  );
});
