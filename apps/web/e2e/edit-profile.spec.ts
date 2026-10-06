// Edit profile + availability modal on the web (spec 02 AC-15…AC-23, task 4.1.18). The API side (validation,
// duplicates, date in the future, avatar purpose) is covered by the API tests; here the real page runs against
// a routed API with state, so each block's own save, message and error can be checked.
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
  avatar: null as unknown,
  kycStatus: 'verified',
  countryCode: 'GE',
  createdAt: '2023-05-10T08:00:00Z',
};

const LINKED_EMPTY = {
  facebook: null,
  twitter: null,
  dribbble: null,
  stackoverflow: null,
  github: null,
  youtube: null,
  vimeo: null,
};

const PROFILE = {
  headline: null as string | null,
  about: null as string | null,
  avatar: null as unknown,
  skills: [] as { id: string; name: string; slug: string; experience: string }[],
  languages: [] as { id: string; name: string; level: string }[],
  linkedAccounts: LINKED_EMPTY as Record<string, string | null>,
  linkedAccountsEnabled: false,
  availability: null as { unavailableUntil: string; message: string } | null,
};

const image = (fileId: string) => ({
  fileId,
  thumb: `${MEDIA}/avatars/${fileId}/thumb.webp`,
  medium: `${MEDIA}/avatars/${fileId}/medium.webp`,
  large: `${MEDIA}/avatars/${fileId}/large.webp`,
  width: 100,
  height: 100,
});

const invalid = (field: string, message: string) => ({
  code: 'VALIDATION_FAILED',
  message,
  details: { fields: [{ field, code: 'invalid', message }] },
});

/** Routes getMe, getPublicConfig, getMyProfile and every edit-profile write, keeping the state. */
async function fakeApi(page: Page, opts: { me?: null; profile?: Partial<typeof PROFILE> } = {}) {
  const profile = structuredClone({ ...PROFILE, ...opts.profile });
  const sent = {
    profile: [] as unknown[],
    availability: [] as unknown[],
    linked: [] as unknown[],
    uploads: 0,
    deletedFiles: [] as string[],
  };
  let seq = 0;
  const id = () => `01900000-0000-7000-8000-0000000000${String((seq += 1)).padStart(2, '0')}`;

  await page.route('**/api/v1/me', (route) =>
    opts.me === null
      ? json(route, 401, { code: 'UNAUTHENTICATED', message: 'Unauthenticated' })
      : json(route, 200, { ...ME, avatar: profile.avatar }),
  );
  await page.route('**/api/v1/config/public', (route) =>
    json(route, 200, {
      projects: { enabled: true },
      customOffers: { enabled: false },
      escrow: { unblockRequestAvailable: true },
    }),
  );
  await page.route('**/api/v1/me/profile', async (route) => {
    if (route.request().method() === 'GET') return json(route, 200, profile);
    const body = route.request().postDataJSON() as { headline?: string; about?: string };
    sent.profile.push(body);
    if (body.headline === '' || body.about === '') {
      return json(
        route,
        400,
        invalid(body.headline === '' ? 'headline' : 'about', 'Field required'),
      );
    }
    Object.assign(profile, body);
    return json(route, 200, profile);
  });
  await page.route('**/api/v1/me/availability', async (route) => {
    if (route.request().method() === 'DELETE') {
      profile.availability = null;
      return route.fulfill({ status: 204 });
    }
    const body = route.request().postDataJSON() as { unavailableUntil: string; message: string };
    sent.availability.push(body);
    if (!body.unavailableUntil || body.unavailableUntil <= '2026-01-01') {
      return json(route, 400, invalid('unavailableUntil', 'Please select a date in future'));
    }
    profile.availability = body;
    return json(route, 200, body);
  });
  await page.route('**/api/v1/me/linked-accounts', async (route) => {
    const body = route.request().postDataJSON() as Record<string, string | null>;
    sent.linked.push(body);
    if (body.github && !body.github.startsWith('https://')) {
      return json(route, 400, invalid('github', 'The URL format is invalid'));
    }
    profile.linkedAccounts = body;
    return json(route, 200, body);
  });

  // Skills and languages: create, update, delete; duplicate names (case-insensitive) → 409.
  for (const [path, list, levelField, duplicate] of [
    ['skills', profile.skills, 'experience', 'This skill already exists in your profile'],
    ['languages', profile.languages, 'level', 'Language already exists in your profile'],
  ] as const) {
    const rows = list as { id: string; name: string; [k: string]: string }[];
    await page.route(new RegExp(`/api/v1/me/${path}(/[^/]+)?$`), async (route) => {
      const method = route.request().method();
      const rowId = new URL(route.request().url()).pathname.split('/')[5];
      if (method === 'DELETE') {
        rows.splice(
          rows.findIndex((r) => r.id === rowId),
          1,
        );
        return route.fulfill({ status: 204 });
      }
      const body = route.request().postDataJSON() as Record<string, string | undefined>;
      if (!body[levelField]) return json(route, 400, invalid(levelField, 'Field required'));
      if (rows.some((r) => r.id !== rowId && r.name.toLowerCase() === body.name?.toLowerCase())) {
        return json(route, 409, { code: 'DUPLICATE', message: duplicate });
      }
      if (method === 'PATCH') {
        const row = rows.find((r) => r.id === rowId)!;
        Object.assign(row, body);
        return json(route, 200, row);
      }
      const row = {
        ...body,
        id: id(),
        name: body.name!,
        slug: body.name!.toLowerCase(),
      } as (typeof rows)[number];
      rows.unshift(row);
      return json(route, 201, row);
    });
  }

  // Avatar: upload protocol → putMyAvatar / deleteMyAvatar; images from the media CDN.
  await page.route('**/api/v1/files', async (route) => {
    sent.uploads += 1;
    const body = route.request().postDataJSON();
    const fileId = id();
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
      purpose: 'avatar',
      status: 'ready',
      fileName: 'me.png',
      contentType: 'image/png',
      sizeBytes: PNG.length,
      rejectReason: null,
      image: image(fileId),
      createdAt: '2026-10-02T10:00:00.000Z',
      readyAt: '2026-10-02T10:00:01.000Z',
    });
  });
  await page.route('**/api/v1/me/avatar', async (route) => {
    if (route.request().method() === 'DELETE') {
      profile.avatar = null;
      return route.fulfill({ status: 204 });
    }
    const { fileId } = route.request().postDataJSON() as { fileId: string };
    profile.avatar = image(fileId);
    return json(route, 200, { ...ME, avatar: profile.avatar });
  });
  await page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );
  return { sent, profile };
}

test('opens from the account menu; card, links and every block; linked accounts hidden while S-123 is OFF (AC-15)', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/seller/home');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByTestId('menu-edit-profile').click();
  await expect(page).toHaveURL(/\/en\/account\/profile$/);
  await expect(page).toHaveTitle(/^Edit profile \| /);
  await expect(page.getByRole('heading', { level: 1, name: 'Edit profile' })).toBeVisible();

  const card = page.getByTestId('profile-card');
  await expect(card).toContainText('nino_b');
  await expect(card).toContainText('Nino Beridze');
  await expect(card.getByTestId('id-verified-mark')).toBeVisible();
  await expect(card).toContainText('10.05.2023');
  // No country (Georgia only, Owner 2026-10-02, ADR-021).
  await expect(card).not.toContainText('Georgia');
  await expect(page.getByRole('link', { name: 'View profile' })).toHaveAttribute(
    'href',
    '/en/profile/nino_b',
  );

  for (const name of ['Availability', 'About me', 'Skills', 'Languages']) {
    await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
  }
  await expect(page.getByTestId('linked-accounts-block')).toHaveCount(0);
  await expect(page.getByTestId('skills')).toContainText("You don't have any skills yet");
  await expect(page.getByTestId('languages')).toContainText("You don't have any languages yet");
});

test('headline and About me save on their own with their own message; empty is refused (AC-15, AC-17, AC-18)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page);
  await page.goto('/en/account/profile');

  const headline = page.getByTestId('headline');
  await headline.getByRole('button', { name: 'Edit: Headline' }).click();
  await headline.getByRole('button', { name: 'Update' }).click();
  await expect(headline.getByText('Field required')).toBeVisible();
  await headline.getByLabel('Headline').fill('  Logo designer  ');
  await headline.getByRole('button', { name: 'Update' }).click();
  await expect(headline).toContainText('Logo designer');
  await expect(headline).toContainText('Your profile headline has been successfully updated');
  expect(sent.profile.at(-1)).toEqual({ headline: 'Logo designer' });

  const about = page.getByTestId('about-block');
  await about.getByRole('button', { name: 'Edit: About me' }).click();
  await about.getByLabel('About me').fill('I draw logos.\nAnd icons.');
  await about.getByRole('button', { name: 'Update' }).click();
  await expect(about).toContainText('Your profile description has been successfully updated');
  await expect(about.getByText('I draw logos.')).toBeVisible();
  // M-14 (3X.14c): the block that saved glows once.
  expect(await about.evaluate((el) => getComputedStyle(el).animationName)).toBe('mt-saved-glow');
  // One block's message does not show in another.
  await expect(headline).not.toContainText('description');
  expect(sent.profile.at(-1)).toEqual({ about: 'I draw logos.\nAnd icons.' });
});

test('availability: modal from tomorrow, error in the modal, set, change, remove (AC-22, AC-23)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page);
  await page.goto('/en/account/profile');
  const block = page.getByTestId('availability-block');
  await expect(block).toContainText("When unvailable, you won't be able to receive new orders");

  await block.getByTestId('availability-set').click();
  const dialog = page.getByRole('dialog', { name: 'Change availability' });
  await expect(dialog).toBeVisible();
  const date = dialog.getByLabel('When do you expect to be ready for new work?');
  const min = await date.getAttribute('min');
  // Tomorrow in Asia/Tbilisi (UTC+4, no DST): after 20:00 UTC that is two UTC days ahead.
  const tomorrow = new Date(Date.now() + (4 + 24) * 3600 * 1000).toISOString().slice(0, 10);
  expect(min).toBe(tomorrow);

  // The API refuses a date not in the future; the message stays in the modal under the field.
  await date.fill('2025-12-31');
  await dialog.getByLabel('Add a message').fill('On holiday');
  await dialog.getByRole('button', { name: 'Set availability' }).click();
  await expect(dialog.getByText('Please select a date in future')).toBeVisible();

  await date.fill('2030-05-15');
  await dialog.getByLabel('Add a message').fill('  On holiday, back in May.  ');
  await dialog.getByRole('button', { name: 'Set availability' }).click();
  await expect(dialog).toBeHidden();
  expect(sent.availability.at(-1)).toEqual({
    unavailableUntil: '2030-05-15',
    message: 'On holiday, back in May.',
  });
  const current = block.getByTestId('availability-current');
  await expect(current).toContainText('Unavailable');
  await expect(current).toContainText(
    "You won't be able to receive new orders or messages until 15.05.2030",
  );
  await expect(current).toContainText('On holiday, back in May.');
  await expect(block).toContainText('Your availability settings has been successfully updated');
  await expect(page.getByTestId('profile-card')).toContainText('Unavailable');
  await expect(block.getByTestId('availability-set')).toHaveCount(0);

  // Change opens the modal with the current values.
  await block.getByTestId('availability-change').click();
  await expect(date).toHaveValue('2030-05-15');
  await expect(dialog.getByLabel('Add a message')).toHaveValue('On holiday, back in May.');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await block.getByTestId('availability-remove').click();
  await expect(block.getByTestId('availability-current')).toHaveCount(0);
  await expect(block.getByTestId('availability-set')).toBeVisible();
  await expect(page.getByTestId('profile-card')).not.toContainText('Unavailable');
});

test('skills: add, duplicate refused, edit, delete; languages with suggestions (AC-19, AC-20)', async ({
  page,
}) => {
  await fakeApi(page);
  await page.goto('/en/account/profile');

  const skills = page.getByTestId('skills');
  await skills.getByLabel('Add skill').fill('Logo design');
  await skills.getByRole('button', { name: 'Add skill' }).click();
  await expect(skills.getByText('Field required')).toBeVisible();
  await skills.getByLabel('Expert').check();
  await skills.getByRole('button', { name: 'Add skill' }).click();
  await expect(skills).toContainText('Skill has been successfully added to your profile');
  await expect(skills.getByTestId('skills-entry')).toHaveCount(1);
  await expect(skills.getByTestId('skills-entry')).toContainText('Logo designExpert');
  await expect(skills.getByLabel('Add skill')).toHaveValue('');

  await skills.getByLabel('Add skill').fill('logo DESIGN');
  await skills.getByLabel('Beginner').check();
  await skills.getByRole('button', { name: 'Add skill' }).click();
  await expect(skills).toContainText('This skill already exists in your profile');
  await expect(skills.getByTestId('skills-entry')).toHaveCount(1);

  await skills.getByRole('button', { name: 'Edit skill: Logo design' }).click();
  await expect(skills.getByLabel('Add skill')).toHaveValue('Logo design');
  await expect(skills.getByLabel('Expert')).toBeChecked();
  await skills.getByLabel('Intermediate').check();
  await skills.getByRole('button', { name: 'Update skill' }).click();
  await expect(skills).toContainText('Your skill has been successfully updated');
  await expect(skills.getByTestId('skills-entry')).toContainText('Intermediate');

  await skills.getByRole('button', { name: 'Delete skill: Logo design' }).click();
  await expect(skills).toContainText('Skill has been successfully deleted from your profile');
  await expect(skills.getByTestId('skills-entry')).toHaveCount(0);

  const languages = page.getByTestId('languages');
  const name = languages.getByLabel('Language', { exact: true });
  await expect(name).toHaveAttribute('list', 'language-suggestions');
  await expect(page.locator('#language-suggestions option[value="ქართული"]')).toBeAttached();
  await name.fill('ქართული');
  await languages.getByLabel('Native').check();
  await languages.getByRole('button', { name: 'Add language' }).click();
  await expect(languages).toContainText('Language has been successfully added to your profile');
  await expect(languages.getByTestId('languages-entry')).toContainText('ქართულიNative');
  await languages.getByRole('button', { name: 'Delete language: ქართული' }).click();
  await expect(languages.getByTestId('languages-entry')).toHaveCount(0);
});

test('linked accounts (S-123 ON): saved together, empty fields sent as null, field error (AC-21)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page, {
    profile: {
      linkedAccountsEnabled: true,
      linkedAccounts: { ...LINKED_EMPTY, facebook: 'https://facebook.com/nino' },
    },
  });
  await page.goto('/en/account/profile');
  const block = page.getByTestId('linked-accounts-block');
  await expect(block.getByLabel('Facebook')).toHaveValue('https://facebook.com/nino');

  await block.getByLabel('Github').fill('github.com/nino');
  await block.getByRole('button', { name: 'Update' }).click();
  await expect(block.getByText('The URL format is invalid')).toBeVisible();

  await block.getByLabel('Facebook').fill('');
  await block.getByLabel('Github').fill('https://github.com/nino');
  await block.getByRole('button', { name: 'Update' }).click();
  await expect(block).toContainText('Linked accounts has been successfully updated');
  expect(sent.linked.at(-1)).toEqual({ ...LINKED_EMPTY, github: 'https://github.com/nino' });
});

test('avatar: other types refused before upload, upload → set, remove (AC-16)', async ({
  page,
}) => {
  const { sent } = await fakeApi(page);
  await page.goto('/en/account/profile');
  const editor = page.getByTestId('avatar-editor');
  await expect(editor.locator('img')).toHaveCount(0);
  await expect(editor.getByTestId('avatar-remove')).toHaveCount(0);

  await editor.getByTestId('avatar-input').setInputFiles({
    name: 'logo.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(editor).toContainText('Selected file extension is not allowed');
  await editor.getByTestId('avatar-input').setInputFiles({
    name: 'big.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1, 1),
  });
  await expect(editor).toContainText('File size cannot exceed 2MB');
  expect(sent.uploads).toBe(0);

  await editor
    .getByTestId('avatar-input')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(editor).toContainText('Your profile avatar has been successfully updated');
  await expect(editor.locator('img')).toHaveAttribute('src', /\/medium\.webp$/);
  expect(sent.uploads).toBe(1);

  await editor.getByTestId('avatar-remove').click();
  await expect(editor.locator('img')).toHaveCount(0);
  await expect(editor.getByTestId('avatar-remove')).toHaveCount(0);
});

test('guests are sent to login and come back afterwards', async ({ page }) => {
  await fakeApi(page, { me: null });
  await page.goto('/en/account/profile');
  await expect(page).toHaveURL(/\/en\/auth\/login\?next=%2Fen%2Faccount%2Fprofile$/);
});

test('Georgian is the default; phone (360 px) has no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await fakeApi(page, { profile: { linkedAccountsEnabled: true } });
  await page.goto('/account/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'პროფილის განახლება' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'ხელმისაწვდომობა' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
