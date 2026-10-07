// Slice 3 (spec 04 + spec 16 AC-20, ROADMAP 4.3.17) main flow across the website and the admin panel on the real
// stack: a seller creates a gig in the wizard (both languages, seeded category branch, upgrade, FAQ, thumbnail and
// images through the real storage and worker) → it waits for review (S-070 OFF, the default) → staff reject it with
// a reason → the seller sees "Needs changes" with the reason, edits and resubmits → staff approve → a guest finds it
// on its category page and opens the gig page → a buyer saves it to favourites and reports it → staff remove it
// (gone for guests and from the favourites) and restore it (back) → the seller deletes it (gone again; the admin
// "Deleted" tab shows it without Restore). Needs the full stack (`pnpm local`) and its console log, where the seed
// printed the first Super-admin (a fresh database: `LOCAL_PGLITE_DIR=<empty folder> pnpm local`, SETUP-LOCAL §5).
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test';

const WEB = process.env.E2E_WEB_URL ?? 'http://localhost:3100';
const log = process.env.ADMIN_E2E_LOG;

// 1×1 PNG: the worker checks the real type and makes the WebP variants.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const png = (name: string) => ({ name, mimeType: 'image/png', buffer: PNG });

// Every upload waits for the worker; the first dev-server compile of each page is slow too.
test.setTimeout(360_000);

/** A new account through the API (as the app registers), signed in on the website in its own browser context. */
async function signedInUser(browser: Browser, request: APIRequestContext, prefix: string) {
  const username = `${prefix}_${Date.now().toString(36)}`;
  const email = `${username}@example.com`;
  const reg = await request.post(`${WEB}/api/v1/auth/register`, {
    headers: { 'X-MyTask-Client': 'ios' },
    data: { fullName: 'Gig Tester', username, email, password: 'Secret123', acceptTerms: true },
  });
  expect(reg.status()).toBe(201);
  const id: string = (await reg.json()).session.user.id;
  const ctx = await browser.newContext();
  const web = await ctx.newPage();
  await web.goto(`${WEB}/auth/login`);
  await web.getByLabel('ელ-ფოსტა').fill(email);
  await web.getByLabel('პაროლი', { exact: true }).fill('Secret123');
  await web.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(web).not.toHaveURL(/\/auth\/login/);
  return { id, username, ctx, web };
}

/** Staff: the gig's card on the queue tab, filtered by the owner. */
async function queueCard(page: Page, tab: string, ownerId: string, title: string) {
  await page.goto('/gigs');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  if (tab !== 'მომლოდინე') await page.getByRole('button', { name: tab }).click();
  await page.getByLabel('მომხმარებლის ID').fill(ownerId);
  await page.getByRole('button', { name: 'გაფილტვრა' }).click();
  const card = page.getByTestId('gig-item').filter({ hasText: title });
  await expect(card).toBeVisible();
  return card;
}

const myGigRow = (web: Page, title: string) =>
  web.getByTestId('my-gigs').getByRole('row').filter({ hasText: title });

test('create → reject → edit → approve → guest and buyer → staff remove and restore → owner delete', async ({
  page,
  browser,
  request,
}) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log');

  const n = Date.now().toString(36);
  const titleKa = `წიგნის გარეკანის დიზაინი ${n}`;
  const titleEn = `Book cover design ${n}`;
  const titleEn2 = `Book cover and spine design ${n}`;

  // Seller: the wizard (spec 04 AC-4…AC-16) on the seeded branch Graphics & Design → Packaging & Covers → Book Design.
  const seller = await signedInUser(browser, request, 'gig');
  const web = seller.web;
  await web.goto(`${WEB}/en/create`);
  await expect(web.getByRole('heading', { level: 1, name: 'Create a new gig' })).toBeVisible({
    timeout: 60_000,
  });
  await web.getByLabel('Service title in Georgian').fill(titleKa);
  await web.getByLabel('Service title in English').fill(titleEn);
  await web.getByLabel('Category', { exact: true }).selectOption({ label: 'Graphics & Design' });
  await web.getByLabel('Subcategory').selectOption({ label: 'Packaging & Covers' });
  await web.getByLabel('Childcategory').selectOption({ label: 'Book Design' });
  await web
    .getByRole('textbox', { name: 'Description in Georgian' })
    .fill('წიგნის გარეკანი სამ დღეში');
  await web.getByLabel('Price', { exact: true }).fill('250');
  await web.getByLabel('Delivery time', { exact: true }).selectOption({ label: '3 days' });
  await web.getByRole('spinbutton', { name: 'Number of revisions' }).fill('2');
  await web.getByRole('button', { name: 'Add service upgrade' }).click();
  const upgrade = web.getByRole('group', { name: 'Upgrade #1' });
  await upgrade.getByLabel('Upgrade title').fill('Source file');
  await upgrade.getByLabel('Price').fill('20');
  await upgrade.getByLabel('Delivery time').selectOption({ label: '1 day' });
  await web.getByRole('button', { name: 'Add FAQ' }).click();
  const faq = web.getByRole('group', { name: 'Question #1' });
  await faq.getByLabel('Question').fill('Do you send the source file?');
  await faq.getByLabel('Answer').fill('Yes, as an upgrade.');
  await web.getByTestId('gig-thumbnail').locator('input[type=file]').setInputFiles(png('t.png'));
  await web
    .getByTestId('gig-images')
    .locator('input[type=file]')
    .setInputFiles([png('a.png'), png('b.png')]);
  await expect(web.locator('[data-testid="gig-file"][data-state="ready"]')).toHaveCount(3, {
    timeout: 90_000,
  });
  await web.getByRole('button', { name: 'Create', exact: true }).click();
  const done = web.getByTestId('gig-created');
  await expect(done.getByRole('heading', { name: 'Gig created' })).toBeVisible({
    timeout: 60_000,
  });
  // S-070 ON (auto-approve) skips the review loop below.
  const pending = (await done.getByRole('link', { name: 'My gigs' }).count()) === 1;

  // My gigs (AC-20): the new gig with its status; its public address from "View".
  await web.goto(`${WEB}/en/seller/gigs`);
  const row = myGigRow(web, titleEn);
  await expect(row.getByTestId('status')).toHaveText(pending ? 'Pending' : 'Active', {
    timeout: 60_000,
  });
  const gigPath = new URL(
    (await row.getByRole('link', { name: `View: ${titleEn}` }).getAttribute('href'))!,
    WEB,
  ).pathname.replace(/^\/en/, '');
  const editPath = (await row
    .getByRole('link', { name: `Edit: ${titleEn}` })
    .getAttribute('href'))!;

  // Staff sign in (the seeded Super-admin).
  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  page.on('dialog', (d) => d.accept());

  if (pending) {
    // Staff reject with a reason (AC-18); a guest cannot see a pending gig.
    expect((await request.get(`${WEB}/en${gigPath}`)).status()).toBe(404);
    let card = await queueCard(page, 'მომლოდინე', seller.id, titleKa);
    await card.getByRole('button', { name: 'დეტალები' }).click();
    await expect(card.getByTestId('gig-detail')).toContainText('Source file');
    await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
    await card.getByLabel('მიზეზი (მომხმარებელი დაინახავს)').fill('Please add a spine example.');
    await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
    await expect(card).toHaveCount(0);

    // Seller: "Needs changes" with the reason, on the list and in the editor; edit and resubmit (AC-21, AC-22).
    await web.goto(`${WEB}/en/seller/gigs`);
    await expect(row.getByTestId('status')).toHaveText('Needs changes');
    await expect(row.getByTestId('rejection-reason')).toContainText('Please add a spine example.');
    await web.goto(`${WEB}${editPath}`);
    await expect(web.getByTestId('gig-rejected')).toContainText('Please add a spine example.', {
      timeout: 60_000,
    });
    await expect(web.getByLabel('Service title in English')).toHaveValue(titleEn);
    await web.getByLabel('Service title in English').fill(titleEn2);
    await web.getByRole('button', { name: 'Save changes' }).click();
    await expect(done.getByRole('heading', { name: 'Service updated' })).toBeVisible({
      timeout: 60_000,
    });
    await web.goto(`${WEB}/en/seller/gigs`);
    await expect(myGigRow(web, titleEn2).getByTestId('status')).toHaveText('Pending');

    // Staff approve (spec 16 AC-20).
    card = await queueCard(page, 'მომლოდინე', seller.id, titleKa);
    await card.getByRole('button', { name: 'დადასტურება', exact: true }).click();
    await expect(card).toHaveCount(0);
    await web.goto(`${WEB}/en/seller/gigs`);
    await expect(myGigRow(web, titleEn2).getByTestId('status')).toHaveText('Active');
  }
  const title = pending ? titleEn2 : titleEn;

  // Guest: the category page lists it (search index written with the same commit) and the gig page shows it.
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await guest.goto(`${WEB}/en/categories/graphics-design/packaging-covers/book-design`);
  await guest
    .getByTestId('gig-card')
    .filter({ hasText: title })
    .getByRole('link', { name: title })
    .click();
  await expect(guest).toHaveURL(new RegExp(`/en${gigPath}$`));
  await expect(guest.getByRole('heading', { level: 1 })).toContainText(title);
  const box = guest.getByTestId('purchase-box');
  await expect(box).toContainText('₾250.00');
  await expect(box.getByRole('checkbox', { name: /Source file/ })).toBeVisible();
  await expect(guest.getByTestId('gig-revisions')).toHaveText('2 revisions included');
  await guest.getByRole('tab', { name: 'FAQ' }).click();
  await expect(
    guest
      .getByRole('tabpanel', { name: 'FAQ' })
      .getByRole('button', { name: 'Do you send the source file?' }),
  ).toBeVisible();
  await expect(guest.getByRole('link', { name: 'Edit gig' })).toHaveCount(0);

  // Buyer: favourite (AC-35, AC-36) and report (AC-30) from the gig page.
  const buyer = await signedInUser(browser, request, 'buy');
  await buyer.web.goto(`${WEB}/en${gigPath}`);
  const actions = buyer.web.getByTestId('gig-actions');
  await actions.getByRole('button', { name: 'Add to favorite' }).click();
  await expect(buyer.web.getByTestId('favorite-note')).toHaveText(
    'Gig has been successfully added to your favorite list',
  );
  await actions.getByRole('button', { name: 'Report' }).click();
  const report = buyer.web.getByRole('dialog', { name: 'Report this gig' });
  await report.getByRole('textbox', { name: 'Reason' }).fill('Looks copied from another seller.');
  await report.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('Thank you! your request has been successfully sent');
  await buyer.web.keyboard.press('Escape');
  await buyer.web.goto(`${WEB}/en/account/favorite`);
  const favorites = buyer.web.getByTestId('favorites');
  await expect(favorites.getByRole('link', { name: title })).toBeVisible({ timeout: 60_000 });

  // Staff remove with an internal reason (AC-24): gone for guests and from the favourites (EC-11) …
  let card = await queueCard(page, 'აქტიურია', seller.id, titleKa);
  await card.getByLabel('შიდა მიზეზი (მხოლოდ თანამშრომლებისთვის)').fill('E2E removal.');
  await card.getByRole('button', { name: 'განცხადების წაშლა' }).click();
  await expect(card).toHaveCount(0);
  expect((await request.get(`${WEB}/en${gigPath}`)).status()).toBe(404);
  await buyer.web.reload();
  await expect(buyer.web.getByText('You have no saved gigs yet.')).toBeVisible();

  // … then restore it within the window (spec 16 AC-20, ADR-024): public again.
  card = await queueCard(page, 'წაშლილი', seller.id, titleKa);
  await card.getByRole('button', { name: 'აღდგენა' }).click();
  await expect(card).toHaveCount(0);
  expect((await request.get(`${WEB}/en${gigPath}`)).status()).toBe(200);
  await buyer.web.reload();
  await expect(favorites.getByRole('link', { name: title })).toBeVisible();

  // Seller deletes it (AC-24): gone from My gigs and for guests; staff cannot restore an owner deletion.
  await web.goto(`${WEB}/en/seller/gigs`);
  await web.getByRole('button', { name: `Delete: ${title}` }).click();
  await web
    .getByRole('dialog', { name: 'Delete gig' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await expect(web.getByText('Gig has been successfully deleted')).toBeVisible();
  await expect(myGigRow(web, title)).toHaveCount(0);
  expect((await request.get(`${WEB}/en${gigPath}`)).status()).toBe(404);
  card = await queueCard(page, 'წაშლილი', seller.id, titleKa);
  await expect(card.getByRole('button', { name: 'აღდგენა' })).toHaveCount(0);

  await guestCtx.close();
  await buyer.ctx.close();
  await seller.ctx.close();
});
