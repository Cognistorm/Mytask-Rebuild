// "Report user" on the public profile (spec 02 AC-13, AC-14; task 4.1.20c). The page loads on the server against
// e2e/fake-profiles.mjs (via e2e/fake-api.mjs) as the visitor of the access cookie; the report itself is a
// browser call, routed here. Replace-on-second-report, EV-13 and the SEC-23 limit are covered by the API tests.
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { COOKIE_URL } from './base';

// CDP accepts a Secure (__Host-) cookie only for an https URL; Chromium sends it to http://localhost too.

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function as(context: BrowserContext, token: 'owner-token' | 'viewer-token') {
  await context.addCookies([
    {
      name: '__Host-mt_at',
      value: token,
      url: COOKIE_URL,
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

/** Routes createUserReport: 201 first, 200 after; "spam" → 429. */
async function reports(page: Page) {
  const sent: { username: string; body: unknown }[] = [];
  await page.route('**/api/v1/users/*/reports', (route) => {
    const username = new URL(route.request().url()).pathname.split('/')[4]!;
    const body = route.request().postDataJSON() as { reason: string };
    sent.push({ username, body });
    if (body.reason === 'spam') {
      return json(route, 429, {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        details: { retryAfterSeconds: 3600 },
      });
    }
    return json(route, sent.length === 1 ? 201 : 200, {
      id: '01900000-0000-7000-8000-0000000000r1',
      status: 'pending',
      createdAt: '2026-10-02T10:00:00Z',
    });
  });
  return sent;
}

test('signed-in visitor reports a profile with a reason; empty is refused; a second report also succeeds (AC-14)', async ({
  page,
  context,
}) => {
  await as(context, 'viewer-token');
  const sent = await reports(page);
  await page.goto('/en/profile/nino_b');
  await page.getByTestId('report-user').click();
  const dialog = page.getByTestId('report-dialog');
  await expect(dialog.getByRole('heading', { name: 'Report user' })).toBeVisible();
  await expect(dialog.getByLabel('Reason')).toHaveAttribute(
    'placeholder',
    'Why would like to report this user?',
  );
  await expect(dialog.getByLabel('Reason')).toHaveAttribute('maxlength', '1500');

  await dialog.getByLabel('Reason').fill('   ');
  await dialog.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(dialog).toContainText('Field required');
  expect(sent).toHaveLength(0);

  await dialog.getByLabel('Reason').fill('  Fake reviews and copied portfolio.  ');
  await dialog.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(dialog).toContainText('Profile has been successfully reported');
  expect(sent).toEqual([
    { username: 'nino_b', body: { reason: 'Fake reviews and copied portfolio.' } },
  ]);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(dialog).toBeHidden();

  // A second report replaces the first (200): same message.
  await page.getByTestId('report-user').click();
  await dialog.getByLabel('Reason').fill('Updated reason');
  await dialog.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(dialog).toContainText('Profile has been successfully reported');
  expect(sent).toHaveLength(2);
});

test('the report limit answer shows in the dialog (SEC-23)', async ({ page, context }) => {
  await as(context, 'viewer-token');
  await reports(page);
  await page.goto('/en/profile/nino_b');
  await page.getByTestId('report-user').click();
  const dialog = page.getByTestId('report-dialog');
  await dialog.getByLabel('Reason').fill('spam');
  await dialog.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(dialog).toContainText('Too many requests. Please try again later.');
  await expect(dialog.getByLabel('Reason')).toHaveValue('spam');
});

test('guest: the dialog asks to log in and links back to the profile (AC-14)', async ({ page }) => {
  const sent = await reports(page);
  await page.goto('/en/profile/nino_b');
  await page.getByTestId('report-user').click();
  const dialog = page.getByTestId('report-dialog');
  await expect(dialog).toContainText('You must be logged in to report this profile');
  await expect(dialog.getByLabel('Reason')).toHaveCount(0);
  await expect(dialog.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    '/en/auth/login?next=%2Fen%2Fprofile%2Fnino_b',
  );
  expect(sent).toHaveLength(0);
});

test('own profile has no "Report user" (AC-13)', async ({ page, context }) => {
  await as(context, 'owner-token');
  await page.goto('/en/profile/nino_b');
  await expect(page.getByRole('link', { name: 'Edit profile' })).toBeVisible();
  await expect(page.getByTestId('report-user')).toHaveCount(0);
});

test('Georgian texts', async ({ page, context }) => {
  await as(context, 'viewer-token');
  await reports(page);
  await page.goto('/profile/nino_b');
  await page.getByTestId('report-user').click();
  const dialog = page.getByTestId('report-dialog');
  await expect(dialog.getByRole('heading', { name: 'მომხმარებლის გასაჩივრება' })).toBeVisible();
  await expect(dialog.getByLabel('მიზეზი')).toBeVisible();
});
