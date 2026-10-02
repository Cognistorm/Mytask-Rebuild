// KYC queue (spec 16 AC-19, AC-27; spec 02 AC-37, AC-39; ROADMAP 4.1.21): pending verifications with the owner
// summary, images opened only on request through the audited adminGetKycFileDownload, approve and decline
// (reason required) with the legacy confirmations, document-type filter. Routed API (no stack needed); the
// audit and the signed-link rules are covered by the API tests.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// 1×1 transparent PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

const ME = {
  id: '01900000-0000-7000-8000-0000000000s1',
  username: 'support',
  fullName: 'Support',
  email: 'support@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: ['kyc.review'],
  isSuperAdmin: false,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};
const USER = {
  id: '01900000-0000-7000-8000-0000000000u1',
  username: 'giorgi_dev',
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: false,
  countryCode: 'GE',
  isDeleted: false,
};
const file = (n: number, name: string) => ({
  fileId: `01900000-0000-7000-8000-0000000000f${n}`,
  fileName: name,
  contentType: 'image/jpeg',
  sizeBytes: 300_000,
});
const ENTRY = {
  verification: {
    id: '01900000-0000-7000-8000-0000000000k1',
    documentType: 'national_id',
    status: 'pending',
    provider: 'manual',
    frontFile: file(1, 'front.jpg'),
    backFile: file(2, 'back.jpg'),
    selfieFile: file(3, 'selfie.jpg'),
    declineReason: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    reviewedAt: null,
  },
  owner: {
    user: USER,
    status: 'active',
    isRestricted: false,
    isDeleted: false,
    plan: 'standard',
    kycStatus: 'pending',
    reportCount: 0,
    earlierRejectionCount: 1,
  },
  reviewedBy: null,
};

async function setup(page: Page, queue: unknown[][]) {
  const lists: URL[] = [];
  const posts: { url: string; body: unknown }[] = [];
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.accept();
  });
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, ME));
  await page.route('**/api/v1/admin/kyc?**', (route) => {
    lists.push(new URL(route.request().url()));
    const data = queue[Math.min(lists.length - 1, queue.length - 1)] ?? [];
    return json(route, 200, { data, nextCursor: null, totalCount: data.length });
  });
  await page.route('**/api/v1/admin/kyc/*/approve', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return json(route, 200, ENTRY);
  });
  await page.route('**/api/v1/admin/kyc/*/decline', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return json(route, 200, ENTRY);
  });
  return { lists, posts, dialogs };
}

test('images open only on request through the audited staff link', async ({ page }) => {
  const downloads: string[] = [];
  const { lists } = await setup(page, [[ENTRY]]);
  await page.route('**/api/v1/admin/kyc/*/files/*/download**', (route) => {
    downloads.push(route.request().url());
    return json(route, 200, {
      url: 'http://localhost:3200/signed-kyc.png',
      expiresAt: '2026-10-02T10:02:00.000Z',
    });
  });
  await page.route('**/signed-kyc.png', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );

  await page.goto('/kyc');
  await expect(page.getByRole('link', { name: 'ვერიფიკაციები' })).toBeVisible();
  const card = page.getByTestId('kyc-item');
  await expect(card).toContainText('პირადობის მოწმობა');
  await expect(card.getByTestId('owner-summary')).toContainText('giorgi_dev');
  await expect(card.getByTestId('owner-summary')).toContainText('წინა უარყოფები: 1');
  expect(lists[0]?.searchParams.get('status')).toBe('pending');
  // Front, back and selfie; no image is fetched before staff ask for it.
  await expect(card.getByTestId('kyc-file')).toHaveCount(3);
  await expect(card.locator('img[src*="signed-kyc"]')).toHaveCount(0);
  expect(downloads).toHaveLength(0);

  await card
    .getByTestId('kyc-file')
    .filter({ hasText: 'სელფი (ფოტო)' })
    .getByRole('button', { name: 'ნახვა' })
    .click();
  await expect(card.getByRole('img', { name: 'სელფი (ფოტო)' })).toBeVisible();
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toContain(
    `/admin/kyc/${ENTRY.verification.id}/files/${ENTRY.verification.selfieFile.fileId}/download?mode=json`,
  );
});

test('approve asks the legacy confirmation and empties the queue', async ({ page }) => {
  const { posts, dialogs } = await setup(page, [[ENTRY], []]);
  await page.goto('/kyc');
  await page.getByRole('button', { name: 'ფაილების დადასტურება' }).click();
  await expect(page.getByText('განსახილველი არაფერია. კარგი მუშაობაა!')).toBeVisible();
  expect(dialogs).toEqual(['ნამდვილად გსურთ არჩეული ფაილების დადასტურება?']);
  expect(posts[0]?.url).toContain(`/admin/kyc/${ENTRY.verification.id}/approve`);
});

test('decline needs a reason, then sends it', async ({ page }) => {
  const { posts, dialogs } = await setup(page, [[ENTRY], []]);
  await page.goto('/kyc');
  const card = page.getByTestId('kyc-item');
  await card.getByRole('button', { name: 'ფაილების უარყოფა' }).click();
  await expect(card.getByText('აუცილებელია')).toBeVisible();
  expect(dialogs).toHaveLength(0);
  expect(posts).toHaveLength(0);

  await card.getByLabel('მიზეზი (მომხმარებელი დაინახავს)').fill('The photo is blurry.');
  await card.getByRole('button', { name: 'ფაილების უარყოფა' }).click();
  await expect(page.getByText('განსახილველი არაფერია. კარგი მუშაობაა!')).toBeVisible();
  expect(dialogs).toEqual(['ნამდვილად გსურთ არჩეული ფაილების უარყოფა?']);
  expect(posts[0]?.body).toEqual({ reason: 'The photo is blurry.' });
});

test('declined tab shows the reason; document type filter reaches the API', async ({ page }) => {
  const declined = {
    ...ENTRY,
    verification: {
      ...ENTRY.verification,
      documentType: 'passport',
      backFile: null,
      status: 'declined',
      declineReason: 'Expired passport.',
      reviewedAt: '2026-10-02T09:00:00.000Z',
    },
    reviewedBy: { id: ME.id, username: ME.username, fullName: 'Nino Staff' },
  };
  const { lists } = await setup(page, [[ENTRY], [declined]]);
  await page.goto('/kyc');
  await expect(page.getByTestId('kyc-item')).toBeVisible();
  await page.getByRole('button', { name: 'უარყოფილია' }).click();
  const card = page.getByTestId('kyc-item');
  await expect(card).toContainText('მიზეზი: Expired passport.');
  await expect(card).toContainText('Nino Staff');
  await expect(card.getByTestId('kyc-file')).toHaveCount(2);
  await expect(card.getByRole('button', { name: 'ფაილების დადასტურება' })).toHaveCount(0);

  // The document type applies at once (no Filter click needed).
  await page.getByLabel('დოკუმენტის ტიპი').selectOption('passport');
  await expect.poll(() => lists.length).toBe(3);
  expect(lists[2]?.searchParams.get('status')).toBe('declined');
  expect(lists[2]?.searchParams.get('documentType')).toBe('passport');
});
