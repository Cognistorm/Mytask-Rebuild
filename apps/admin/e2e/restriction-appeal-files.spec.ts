// Appeal files in the admin appeals queue (spec 16 AC-29, R-A8; ROADMAP 4.1.6b): name, size and an audited
// download through adminGetRestrictionAppealFileDownload. The page runs against a routed API (no stack needed);
// the audit itself is covered by the API tests.
import { expect, test, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-0000000000s1',
  username: 'owner',
  fullName: 'Owner',
  email: 'owner@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: ['users.read', 'users.restrict'],
  isSuperAdmin: false,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};
const USER = {
  id: '01900000-0000-7000-8000-0000000000u1',
  username: 'appeal_user',
  avatar: null,
  isPremium: false,
  isIdVerified: false,
  isOnline: false,
  countryCode: null,
  isDeleted: false,
};
const FILE = {
  fileId: '01900000-0000-7000-8000-0000000000f1',
  fileName: 'პირადობა.pdf',
  contentType: 'application/pdf',
  sizeBytes: 2 * 1024 * 1024,
};
const APPEAL = {
  id: '01900000-0000-7000-8000-0000000000a1',
  restriction: {
    id: '01900000-0000-7000-8000-0000000000r1',
    user: USER,
    message: 'Please send proof.',
    filesRequired: true,
    status: 'submitted',
    createdBy: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    resolvedBy: null,
    resolvedAt: null,
    appeal: null,
    decisionReason: null,
  },
  owner: {
    user: USER,
    status: 'active',
    isRestricted: true,
    isDeleted: false,
    plan: 'standard',
    kycStatus: 'none',
    reportCount: 0,
    earlierRejectionCount: 0,
  },
  message: 'Here is my ID.',
  files: [FILE],
  createdAt: '2026-10-02T10:00:00.000Z',
};

test('appeal files are listed and open through the audited staff download', async ({ page }) => {
  const downloads: string[] = [];
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, ME));
  await page.route('**/api/v1/admin/restriction-appeals?**', (route) =>
    json(route, 200, { data: [APPEAL], nextCursor: null, totalCount: 1 }),
  );
  await page.route('**/api/v1/admin/restriction-appeals', (route) =>
    json(route, 200, { data: [APPEAL], nextCursor: null, totalCount: 1 }),
  );
  await page.route('**/api/v1/admin/restrictions**', (route) =>
    json(route, 200, { data: [], nextCursor: null }),
  );
  await page.route('**/api/v1/admin/restriction-appeals/*/files/*/download**', (route) => {
    downloads.push(route.request().url());
    return json(route, 200, {
      url: 'http://localhost:3200/signed-download.pdf',
      expiresAt: '2026-10-02T10:05:00.000Z',
    });
  });
  // The signed URL answers as an attachment: the browser downloads, the page stays.
  await page.route('**/signed-download.pdf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/pdf',
      headers: { 'Content-Disposition': 'attachment; filename="id.pdf"' },
      body: '%PDF-1.4',
    }),
  );

  await page.goto('/restrictions');
  const card = page.getByTestId('appeal').filter({ hasText: 'Here is my ID.' });
  const file = card.getByTestId('appeal-file');
  await expect(file).toContainText('პირადობა.pdf');
  await expect(file).toContainText('2.0 მბ');

  const download = page.waitForEvent('download');
  await file.getByRole('button', { name: 'გადმოწერა' }).click();
  expect((await download).suggestedFilename()).toBe('id.pdf');
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toContain(
    `/admin/restriction-appeals/${APPEAL.id}/files/${FILE.fileId}/download?mode=json`,
  );
  await expect(card).toBeVisible();
});
