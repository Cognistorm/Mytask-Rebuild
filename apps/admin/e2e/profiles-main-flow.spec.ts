// Slice 1 (spec 02, ROADMAP 4.1.25) main flow across the website and the admin panel on the real stack:
// a new user fills the profile (headline, About me, skill, language, availability, avatar upload), adds a
// portfolio work and sends the verification documents; staff approve both; a guest then sees the public
// profile with the work and the ID mark. Uploads go through the real storage and worker (ADR-009).
// Needs the full stack (`pnpm local`) and its console log, where the seed printed the first Super-admin
// (a fresh database: `LOCAL_PGLITE_DIR=<empty folder> pnpm local`, SETUP-LOCAL §5).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const WEB = 'http://localhost:3100';
const log = process.env.ADMIN_E2E_LOG;

// 1×1 PNG: the worker checks the real type and makes the WebP variants.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

// Every upload waits for the worker (`ready`); the first dev-server compile is slow too.
test.setTimeout(240_000);

async function pickKycImage(web: Page, slot: string) {
  const box = web.getByTestId(slot);
  await box.locator('input[type=file]').setInputFiles(png(`${slot}.png`));
  await expect(box.getByTestId('upload-item')).toBeVisible();
  await expect(box.getByTestId('upload-item')).not.toContainText(/Uploading|Processing/, {
    timeout: 60_000,
  });
}

test('profile, portfolio and verification → staff approve → public profile', async ({
  page,
  browser,
  request,
}) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log');

  const n = Date.now().toString(36);
  const username = `prf_${n}`;
  const email = `${username}@example.com`;
  const reg = await request.post(`${WEB}/api/v1/auth/register`, {
    headers: { 'X-MyTask-Client': 'ios' },
    data: { fullName: 'Profile Tester', username, email, password: 'Secret123', acceptTerms: true },
  });
  expect(reg.status()).toBe(201);
  const userId: string = (await reg.json()).session.user.id;

  // User: sign in on the website, then work in English.
  const userCtx = await browser.newContext();
  const web = await userCtx.newPage();
  await web.goto(`${WEB}/auth/login`);
  await web.getByLabel('ელ-ფოსტა').fill(email);
  await web.getByLabel('პაროლი', { exact: true }).fill('Secret123');
  await web.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(web).not.toHaveURL(/\/auth\/login/);

  // Edit profile (AC-15…AC-23): each block saves on its own.
  await web.goto(`${WEB}/en/account/profile`);
  await expect(web.getByRole('heading', { level: 1, name: 'Edit profile' })).toBeVisible({
    timeout: 60_000,
  });
  const editor = web.getByTestId('avatar-editor');
  await editor.getByTestId('avatar-input').setInputFiles(png('me.png'));
  await expect(editor).toContainText('Your profile avatar has been successfully updated', {
    timeout: 60_000,
  });
  await expect(editor.locator('img')).toHaveAttribute('src', /\/medium\.webp$/);

  const headline = web.getByTestId('headline');
  await headline.getByRole('button', { name: 'Edit: Headline' }).click();
  await headline.getByLabel('Headline').fill('Logo designer');
  await headline.getByRole('button', { name: 'Update' }).click();
  await expect(web.getByTestId('profile-card')).toContainText('Logo designer');

  const about = web.getByTestId('about-block');
  await about.getByRole('button', { name: 'Edit: About me' }).click();
  await about.getByLabel('About me').fill(`I draw logos ${n}.`);
  await about.getByRole('button', { name: 'Update' }).click();
  await expect(about.getByText(`I draw logos ${n}.`)).toBeVisible();

  const skills = web.getByTestId('skills');
  await skills.getByLabel('Add skill').fill('Logo design');
  await skills.getByLabel('Expert').check();
  await skills.getByRole('button', { name: 'Add skill' }).click();
  await expect(skills.getByTestId('skills-entry')).toContainText('Logo designExpert');

  const languages = web.getByTestId('languages');
  await languages.getByLabel('Language', { exact: true }).fill('ქართული');
  await languages.getByLabel('Native').check();
  await languages.getByRole('button', { name: 'Add language' }).click();
  await expect(languages.getByTestId('languages-entry')).toContainText('ქართულიNative');

  const availability = web.getByTestId('availability-block');
  await availability.getByTestId('availability-set').click();
  const dialog = web.getByRole('dialog', { name: 'Change availability' });
  const date = dialog.getByLabel('When do you expect to be ready for new work?');
  await date.fill((await date.getAttribute('min'))!);
  await dialog.getByLabel('Add a message').fill('Back soon.');
  await dialog.getByRole('button', { name: 'Set availability' }).click();
  await expect(availability.getByTestId('availability-current')).toContainText('Back soon.');

  // Portfolio (AC-24, AC-25): pending unless S-071 auto-approve is ON.
  await web.goto(`${WEB}/en/seller/portfolio/create`);
  await web.getByLabel('Project title').fill(`Bakery logo ${n}`);
  await web.getByLabel('Project description').fill('A round logo with bread and wheat.');
  for (const [slot, name] of [
    ['thumbnail-uploader', 'cover.png'],
    ['gallery-uploader', 'g1.png'],
  ] as const) {
    await web.getByTestId(slot).locator('input[type=file]').setInputFiles(png(name));
    await expect(web.getByTestId(slot).getByTestId('upload-item')).toHaveAttribute(
      'data-state',
      'ready',
      { timeout: 60_000 },
    );
  }
  await web.getByRole('button', { name: 'Create project' }).click();
  await expect(web).toHaveURL(/\/en\/seller\/portfolio$/);
  await expect(web.getByText('Your project has been successfully added')).toBeVisible();
  const status = web.getByTestId('my-portfolio-item').getByTestId('status');
  const pending = (await status.textContent()) === 'Pending';

  // Verification centre (AC-36, AC-38): passport = front + selfie.
  await web.goto(`${WEB}/en/account/verification`);
  await web.getByLabel('Passport').check();
  await web.getByRole('button', { name: 'Next step' }).click();
  await pickKycImage(web, 'kyc-front');
  await web.getByRole('button', { name: 'Next step' }).click();
  await pickKycImage(web, 'kyc-selfie');
  await web.getByRole('button', { name: 'Finish' }).click();
  await expect(web.getByTestId('kyc-state')).toHaveText('Verification pending');

  // Staff: approve the work and the documents (spec 16 AC-19, AC-27).
  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  if (pending) {
    await page.goto('/portfolio');
    await page.getByLabel('მომხმარებლის ID').fill(userId);
    await page.getByRole('button', { name: 'გაფილტვრა' }).click();
    const work = page.getByTestId('portfolio-item').filter({ hasText: `Bakery logo ${n}` });
    await work.getByRole('button', { name: 'დადასტურება', exact: true }).click();
    await expect(work).toHaveCount(0);
  }
  page.on('dialog', (d) => d.accept());
  await page.goto('/kyc');
  const kyc = page.getByTestId('kyc-item').filter({ hasText: username });
  await kyc.getByRole('button', { name: 'ფაილების დადასტურება' }).click();
  await expect(kyc).toHaveCount(0);

  // User: work active, account verified (AC-38).
  await web.goto(`${WEB}/en/seller/portfolio`);
  await expect(status).toHaveText('Active');
  await web.goto(`${WEB}/en/account/verification`);
  await expect(web.getByTestId('kyc-state')).toHaveText('Account verified');
  await userCtx.close();

  // Guest: the public profile and the work (AC-8…AC-13, AC-28).
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await guest.goto(`${WEB}/en/profile/${username}`);
  await expect(guest.getByRole('heading', { level: 1 })).toContainText('Profile Tester');
  const card = guest.getByTestId('profile-card');
  await expect(card.getByText('Logo designer')).toBeVisible();
  await expect(card.locator('img').first()).toHaveAttribute('src', /\/medium\.webp$/);
  await expect(guest.getByTestId('verifications')).toContainText('ID');
  await expect(guest.getByTestId('languages')).toContainText('ქართულიNative');
  await expect(guest.getByTestId('availability')).toContainText('Back soon.');
  await expect(guest.getByText(`I draw logos ${n}.`)).toBeVisible();
  await expect(guest.getByRole('link', { name: /^Logo design\s*, Expert$/ })).toBeVisible();
  await expect(guest.getByRole('link', { name: 'Edit profile' })).toHaveCount(0);
  await guest
    .getByTestId('portfolio-preview')
    .getByRole('link', { name: `Bakery logo ${n}` })
    .click();
  await expect(guest).toHaveURL(new RegExp(`/en/profile/${username}/portfolio/`));
  await expect(guest.getByRole('heading', { level: 1 })).toHaveText(`Bakery logo ${n}`);
  await expect(guest.getByTestId('gallery').locator('img')).not.toHaveCount(0);
  await expect(guest.getByTestId('pending-note')).toHaveCount(0);
  await guestCtx.close();
});
