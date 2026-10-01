// Social login on the web (spec 01 AC-30, AC-37…AC-41; task 3.6). The API side (state, SEC-09 binding, code
// exchange, account rules) is covered by apps/api/test/social.test.ts with the provider faked over HTTP.
// Here the browser runs the real pages against a fake provider and a routed API, so the flow needs no stack:
// buttons from getPublicConfig → startSocialLogin → provider page → callback page → completeSocialLogin.
import { expect, test, type Page, type Route } from '@playwright/test';

const ORIGIN = 'http://localhost:3100';
const PROVIDER = 'https://fake-provider.test';

interface Api {
  authorize: { provider: string; body: Record<string, unknown> }[];
  callback: { provider: string; body: Record<string, unknown>; cookie: string }[];
}

const json = (route: Route, status: number, body: unknown, headers: Record<string, string> = {}) =>
  route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

/** Routes the API and the provider. `complete` answers completeSocialLogin. */
async function fakeStack(
  page: Page,
  opts: {
    providers?: string[];
    complete?: (route: Route) => Promise<void>;
  } = {},
): Promise<Api> {
  const api: Api = { authorize: [], callback: [] };
  const providers = opts.providers ?? ['google', 'github'];

  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, { auth: { socialProviders: providers } }),
  );
  await page.route('**/api/v1/auth/social/*/authorize', async (route) => {
    const provider = new URL(route.request().url()).pathname.split('/').at(-2)!;
    const body = route.request().postDataJSON() as Record<string, unknown>;
    api.authorize.push({ provider, body });
    const url = new URL(`${PROVIDER}/authorize`);
    url.searchParams.set('redirect_uri', String(body.redirectUri));
    url.searchParams.set('state', `state-${provider}`);
    await json(
      route,
      200,
      {
        authorizationUrl: url.toString(),
        state: `state-${provider}`,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
      },
      // The real API sets the SEC-09 binding cookie here (localhost counts as a secure origin).
      { 'set-cookie': '__Host-mt_oauth=nonce-1; Path=/; Secure; HttpOnly; SameSite=Lax' },
    );
  });
  // The fake provider: the visitor "consents" at once and is sent back with a code.
  await page.route(`${PROVIDER}/**`, (route) => {
    const req = new URL(route.request().url());
    const back = new URL(req.searchParams.get('redirect_uri')!);
    back.searchParams.set('code', 'code-1');
    back.searchParams.set('state', req.searchParams.get('state')!);
    return route.fulfill({ status: 302, headers: { location: back.toString() } });
  });
  await page.route('**/api/v1/auth/social/*/callback', async (route) => {
    const provider = new URL(route.request().url()).pathname.split('/').at(-2)!;
    api.callback.push({
      provider,
      body: route.request().postDataJSON() as Record<string, unknown>,
      cookie: (await route.request().allHeaders())['cookie'] ?? '',
    });
    await (opts.complete
      ? opts.complete(route)
      : json(route, 200, { user: { id: 'u1' }, accessToken: null, refreshToken: null }));
  });
  await page.route('**/api/v1/me', (route) =>
    json(route, 200, {
      fullName: 'Social Tester',
      username: 'social_tester',
      email: 'social@example.com',
      referralCode: 'ABCD1234',
      twoFactorAvailable: false,
      twoFactorEnabled: false,
      isRestricted: false,
    }),
  );
  return api;
}

test('only providers from getPublicConfig get a button, in the legacy order', async ({ page }) => {
  await fakeStack(page, { providers: ['linkedin', 'google', 'twitter'] });
  await page.goto('/en/auth/login');
  const buttons = page.locator('.auth-social-button');
  await expect(buttons).toHaveText([
    'Continue with Google',
    'Continue with Twitter',
    'Continue with Linkedin',
  ]);
  await expect(page.getByText('Or', { exact: true })).toBeVisible();
});

test('no provider switched on: no divider and no buttons (AC-37)', async ({ page }) => {
  await fakeStack(page, { providers: [] });
  await page.goto('/auth/register');
  await expect(page.getByRole('button', { name: 'რეგისტრაცია' })).toBeVisible();
  await expect(page.locator('.auth-social-button')).toHaveCount(0);
  await expect(page.locator('.auth-divider')).toHaveCount(0);
});

test('Google round trip (ka): callback sends code + state once with the binding cookie, then /account', async ({
  page,
}) => {
  const api = await fakeStack(page);
  await page.goto('/auth/login');
  await page.getByRole('button', { name: 'გაგრძელება Google-ით' }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText('social_tester', { exact: true })).toBeVisible();
  expect(api.authorize).toEqual([
    {
      provider: 'google',
      body: {
        redirectUri: `${ORIGIN}/auth/google/callback`,
        referralCode: null,
        codeChallenge: null,
        codeChallengeMethod: null,
      },
    },
  ]);
  expect(api.callback).toHaveLength(1);
  expect(api.callback[0]!.provider).toBe('google');
  expect(api.callback[0]!.body).toEqual({
    code: 'code-1',
    state: 'state-google',
    codeVerifier: null,
  });
  expect(api.callback[0]!.cookie).toContain('__Host-mt_oauth=nonce-1');
});

test('register carries the referral code and the English callback path (AC-38)', async ({
  page,
}) => {
  const api = await fakeStack(page);
  await page.goto('/en/auth/register?ref=abcd1234');
  await page.getByRole('button', { name: 'Continue with Github' }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  expect(api.authorize[0]!.body).toMatchObject({
    redirectUri: `${ORIGIN}/en/auth/github/callback`,
    referralCode: 'ABCD1234',
  });
});

test('login keeps a same-site ?next= through the provider round trip', async ({ page }) => {
  await fakeStack(page);
  await page.goto('/en/auth/login?next=/en/auth/request');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL(/\/en\/auth\/request$/);
});

test('2FA on: the callback shows the code step (AC-30)', async ({ page }) => {
  let verified = false;
  await fakeStack(page, {
    complete: (route) =>
      json(route, 202, {
        challengeId: '00000000-0000-4000-8000-000000000001',
        channel: 'email',
        purpose: 'login',
        emailMasked: 's***@example.com',
        codeLength: 6,
        expiresAt: new Date(Date.now() + 600_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
        notice: { message: 'We sent a code to s***@example.com' },
      }),
  });
  await page.route('**/api/v1/auth/2fa/verify', (route) => {
    verified = true;
    return json(route, 200, { user: { id: 'u1' } });
  });
  await page.goto('/en/auth/login');
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page.getByRole('heading', { name: 'Enter the verification code' })).toBeVisible();
  await expect(page.getByText('We sent a code to s***@example.com')).toBeVisible();
  await page.locator('.auth-code input').first().click();
  await page.keyboard.type('123456');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/account$/);
  expect(verified).toBe(true);
});

test('API refusal is shown with a way back to login (AC-41)', async ({ page }) => {
  const message =
    'We could not get an email address from Facebook. Please sign up with your email instead.';
  await fakeStack(page, {
    providers: ['facebook'],
    complete: (route) =>
      json(route, 422, {
        code: 'AUTH_SOCIAL_EMAIL_MISSING',
        message,
        details: { params: { provider: 'Facebook' } },
      }),
  });
  await page.goto('/en/auth/login');
  await page.getByRole('button', { name: 'Continue with Facebook' }).click();
  await expect(page.locator('.auth-alert-error')).toHaveText(message);
  // The one-time code does not stay in the address bar.
  await expect(page).toHaveURL(`${ORIGIN}/en/auth/facebook/callback`);
  await page.getByRole('link', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/en\/auth\/login$/);
});

test('cancelled at the provider (no code): no API call, generic error', async ({ page }) => {
  const api = await fakeStack(page);
  await page.goto('/en/auth/google/callback?error=access_denied&state=state-google');
  await expect(page.locator('.auth-alert-error')).toHaveText(
    'Oops! Something went wrong. Please try again',
  );
  expect(api.callback).toHaveLength(0);
});

test('unknown provider in the callback path is a 404', async ({ page }) => {
  const res = await page.goto('/en/auth/myspace/callback?code=x&state=y');
  expect(res?.status()).toBe(404);
});
