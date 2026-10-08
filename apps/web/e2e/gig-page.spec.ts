// Gig page (ROADMAP 4.3.11a…d: frame, gallery, tabs + related, Actions; spec 04 AC-26…AC-38; spec 17 AC-3, AC-4;
// screen 02). The page loads on the server against e2e/fake-gigs.mjs (via e2e/fake-api.mjs); the visitor is chosen by
// the access cookie the test sets (`owner-token` = nino_b, the owner of every fake gig; `viewer-token` = another
// user). The media CDN and the browser calls (report, favourites) are routed here. The API rules are tested in
// apps/api.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type BrowserContext, type Page, type Route } from '@playwright/test';
import { COOKIE_URL, hydrated } from './base';
import { GIG_SLUG, GIG_UID } from './fake-gigs.mjs';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HgAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

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

const media = (page: Page) =>
  page.route('http://media.test/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG }),
  );

const attr = (page: Page, selector: string, name: string) =>
  page.locator(selector).first().getAttribute(name);

test('guest sees the gig page (en): breadcrumb, title, seller, stats, purchase box, description (AC-26)', async ({
  page,
}) => {
  await media(page);
  const res = await page.goto(`/en/service/${GIG_SLUG[1]}`);
  expect(res?.status()).toBe(200);
  // Public zone (ADR-019 §2): the media CDN is allowed (img-src).
  expect(res?.headers()['content-security-policy']).toMatch(/img-src [^;]*http:\/\/media\.test/);

  // SEO title and description (spec 04 AC-15); canonical + both languages (url-map §8).
  await expect(page).toHaveTitle('Logo design | SEO | MyTask');
  expect(await attr(page, 'meta[name="description"]', 'content')).toBe(
    'Clean logos for small businesses.',
  );
  expect(await attr(page, 'link[rel="canonical"]', 'href')).toMatch(`/en/service/${GIG_SLUG[1]}`);
  expect(await attr(page, 'link[rel="alternate"][hreflang="ka"]', 'href')).toMatch(
    new RegExp(`[^n]/service/${GIG_SLUG[1]}$`),
  );
  expect(await attr(page, 'link[rel="alternate"][hreflang="en"]', 'href')).toMatch(
    `/en/service/${GIG_SLUG[1]}`,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/en');
  await expect(crumbs.getByRole('link', { name: 'Logo design' })).toHaveAttribute(
    'href',
    '/en/categories/design/logo-design',
  );
  await expect(crumbs.getByText('Minimalist logo')).toHaveAttribute('aria-current', 'page');

  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveCount(1);
  await expect(h1).toContainText('Logo design for your business');
  await expect(h1.getByTestId('featured')).toContainText('Featured');

  const seller = page.getByTestId('gig-seller');
  await expect(seller.getByRole('link', { name: /nino_b/ })).toHaveAttribute(
    'href',
    '/en/profile/nino_b',
  );
  await expect(seller.getByTestId('id-verified-mark')).toBeVisible();
  await expect(seller).toContainText('Online');
  await expect(seller.getByRole('img', { name: 'Rating 4.7 out of 5, 4 reviews' })).toBeVisible();

  const stats = page.getByTestId('gig-stats');
  await expect(stats).toContainText('1 order in queue');
  await expect(stats).toContainText('3 days for delivery');
  await expect(stats).toContainText('4.5');
  await expect(stats).toContainText('(2 reviews)');

  const box = page.getByTestId('purchase-box');
  await expect(box).toContainText('Starting at');
  await expect(box).toContainText('₾250.00');
  await expect(page.getByTestId('gig-revisions')).toHaveText('3 revisions included');
  // Upgrades: checkbox named by title, price and delivery effect (screen 02 accessibility).
  const source = box.getByRole('checkbox', { name: /Source file/ });
  await expect(source).toHaveAccessibleName(
    'Source file +₾20.00 Delivery time will be increased by an extra 1 day',
  );
  await expect(box.getByRole('checkbox', { name: /4K resolution/ })).toHaveAccessibleName(
    "4K resolution +₾35.00 Delivery time won't change",
  );
  await source.check();
  await expect(source).toBeChecked();
  // Not yet built (slices 5 / 7) and not for guests: no cart, no contact, no edit.
  await expect(box.getByRole('button', { name: 'Add to cart' })).toHaveCount(0);
  await expect(box.getByText('Contact seller')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Edit gig' })).toHaveCount(0);

  await expect(page.getByTestId('gig-description').locator('strong')).toHaveText('clean');
  await expect(page.getByTestId('gig-description').locator('li')).toHaveCount(2);
  await expect(page.locator('[role="note"]')).toHaveCount(0);

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('an old title slug or another case redirects permanently to the current slug (AC-33, spec 17 AC-3)', async ({
  page,
}) => {
  // The redirect answer itself (no navigation to wait for).
  for (const [old, current] of [
    [`/service/old-title-${GIG_UID(1)}`, `/service/${GIG_SLUG[1]}`],
    [`/en/service/${GIG_SLUG[1].toUpperCase()}`, `/en/service/${GIG_SLUG[1]}`],
  ] as const) {
    const res = await page.request.get(old, { maxRedirects: 0 });
    expect([301, 308]).toContain(res.status());
    expect(new URL(res.headers()['location']!, 'http://x').pathname).toBe(current);
  }
});

test('unknown uid and others’ pending gigs answer 404 (AC-28)', async ({ page }) => {
  for (const path of [
    `/en/service/no-such-gig-${GIG_UID(99)}`,
    `/en/service/${GIG_SLUG[3]}`,
    `/en/service/${GIG_SLUG[4]}`,
  ]) {
    const res = await page.goto(path);
    expect(res?.status()).toBe(404);
  }
});

test('no English text: Georgian content with the note, Georgian canonical, noindex (AC-27, spec 17 AC-4); seller away; no revisions value', async ({
  page,
}) => {
  await media(page);
  const res = await page.goto(`/en/service/${GIG_SLUG[2]}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByTestId('georgian-note')).toHaveText(
    'This content is not available in English yet, so it is shown in Georgian.',
  );
  await expect(page.getByRole('heading', { level: 1 }).locator('[lang="ka"]')).toHaveText(
    'მხოლოდ ქართული განცხადება',
  );
  await expect(page.getByTestId('gig-description')).toHaveAttribute('lang', 'ka');
  expect(await attr(page, 'link[rel="canonical"]', 'href')).toMatch(
    new RegExp(`[^n]/service/${GIG_SLUG[2]}$`),
  );
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
  expect(await attr(page, 'meta[name="robots"]', 'content')).toBe('noindex, follow');

  // AC-29: the date without the legacy markup.
  await expect(page.getByTestId('away-note')).toContainText(
    "Seller is away right now, and he won't be able to receive new orders until 24.12.2026",
  );
  await expect(page.getByTestId('gig-stats')).toContainText('3 orders in queue');
  await expect(page.getByTestId('gig-stats')).toContainText('N/A');
  await expect(page.getByTestId('gig-stats')).not.toContainText('for delivery');
  await expect(page.getByTestId('gig-revisions')).toHaveText('Number of revisions not specified');
  await expect(page.getByTestId('gig-upgrades')).toHaveCount(0);
  await expect(page.getByTestId('featured')).toHaveCount(0);

  // The Georgian page itself is indexable.
  await page.goto(`/service/${GIG_SLUG[2]}`);
  await expect(page.getByTestId('georgian-note')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('owner: pending and rejected gigs with their notice, noindex and "Edit gig" (AC-28, AC-30)', async ({
  page,
  context,
}) => {
  await as(context, 'owner-token');
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[3]}`);
  await expect(page.getByTestId('pending-note')).toHaveText(
    'This gig is under review now, and it will be publicly visible soon',
  );
  expect(await attr(page, 'meta[name="robots"]', 'content')).toBe('noindex, nofollow');
  await expect(page.getByTestId('gig-revisions')).toHaveText('No revisions');
  await expect(page.getByTestId('gig-stats')).toContainText('1 month for delivery');
  await expect(
    page.getByTestId('purchase-box').getByRole('link', { name: 'Edit gig' }),
  ).toHaveAttribute('href', `/en/seller/gigs/${GIG_UID(3)}/edit`);

  await page.goto(`/service/${GIG_SLUG[4]}`);
  await expect(page.getByTestId('rejected-note')).toContainText('უარყოფილია');
  // Restricted seller without a date (AC-29).
  await expect(page.getByTestId('away-note')).toContainText(
    'ეს ფრილანსერი ამჟამად ვერ იღებს ახალ შეკვეთებს.',
  );
  await expect(page.getByTestId('purchase-box')).toContainText('მოქმედებები');
});

test('phone width: one column, no horizontal scroll', async ({ page }) => {
  await media(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/service/${GIG_SLUG[1]}`);
  await expect(page.getByTestId('purchase-box')).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
  const gallery = await page.getByTestId('gig-gallery').boundingBox();
  const box = await page.getByTestId('purchase-box').boundingBox();
  expect(box!.y).toBeGreaterThan(gallery!.y + gallery!.height - 1);
});

const large = (name: string) => `http://media.test/public-media/${name}-large.webp`;

test('gallery: previous/next with "n / m", thumbnails, Arrow keys, swipe (screen 02, components.md §7.12)', async ({
  page,
}) => {
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const gallery = page.getByRole('region', { name: 'Gallery' });
  // The page's stage (the lightbox has its own inside the closed dialog).
  const stage = gallery.locator('.mt-gallery-stage').first();
  const image = gallery.getByTestId('gallery-image');
  const counter = stage.getByTestId('gallery-counter');
  const thumbs = gallery.getByRole('list', { name: 'Choose an image' }).getByRole('button');

  await expect(image).toHaveAttribute('src', large('gig-1-a'));
  await expect(image).toHaveAttribute('alt', 'Logo design for your business, Image 1 of 3');
  await expect(counter).toContainText('1 / 3');
  await expect(thumbs).toHaveCount(3);
  await expect(thumbs.nth(0)).toHaveAttribute('aria-current', 'true');

  await gallery.getByRole('button', { name: 'Next image' }).click();
  await expect(image).toHaveAttribute('src', large('gig-1-b'));
  await expect(counter).toContainText('2 / 3');
  await expect(thumbs.nth(1)).toHaveAttribute('aria-current', 'true');
  await expect(thumbs.nth(0)).not.toHaveAttribute('aria-current', 'true');

  // Previous from the first wraps to the last; a thumbnail picks its image.
  await thumbs.nth(0).click();
  await gallery.getByRole('button', { name: 'Previous image' }).click();
  await expect(counter).toContainText('3 / 3');

  // Arrow keys on a thumbnail move the selection and the focus with it.
  await thumbs.nth(2).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(counter).toContainText('2 / 3');
  await expect(thumbs.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(counter).toContainText('1 / 3');
  await expect(thumbs.nth(0)).toBeFocused();

  // A horizontal swipe changes the image and does not open the lightbox.
  const b = (await stage.boundingBox())!;
  const y = b.y + b.height / 2;
  await page.mouse.move(b.x + b.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width * 0.3, y, { steps: 4 });
  await page.mouse.up();
  await expect(counter).toContainText('2 / 3');
  await expect(page.getByTestId('gallery-lightbox')).not.toBeVisible();
});

test('lightbox: opens on the image, same controls, Esc closes and the focus comes back', async ({
  page,
}) => {
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const open = page.getByRole('button', {
    name: 'View larger: Logo design for your business, Image 1 of 3',
  });
  await open.click();
  const box = page.getByRole('dialog', { name: 'Logo design for your business' });
  await expect(box).toBeVisible();
  await expect(box.getByTestId('lightbox-image')).toHaveAttribute('src', large('gig-1-a'));
  // Full viewport (once the opening animation has ended).
  await expect
    .poll(async () => Math.round((await box.boundingBox())!.width))
    .toBe(page.viewportSize()!.width);

  await page.keyboard.press('ArrowRight');
  await expect(box.getByTestId('lightbox-image')).toHaveAttribute('src', large('gig-1-b'));
  await box.getByRole('button', { name: 'Next image' }).click();
  await expect(box.getByTestId('gallery-counter')).toContainText('3 / 3');

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(box).not.toBeVisible();
  // The page gallery followed the lightbox.
  await expect(page.getByTestId('gallery-image')).toHaveAttribute('src', large('gig-1-c'));
  await expect(page.getByRole('button', { name: /^View larger:/ })).toBeFocused();
});

test('gallery without images: the cover alone, no arrows, strip or counter', async ({ page }) => {
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[2]}`);
  const gallery = page.getByTestId('gig-gallery');
  await expect(gallery.getByTestId('gallery-image')).toHaveAttribute('src', large('gig-2'));
  await expect(gallery.getByTestId('gallery-image')).toHaveAttribute('lang', 'ka');
  await expect(gallery.getByRole('button', { name: 'Next image' })).toHaveCount(0);
  await expect(gallery.getByRole('list')).toHaveCount(0);
  await expect(gallery.getByTestId('gallery-counter')).toHaveCount(0);
});

test('tabs (lg): Description / FAQ / Reviews n / Documents with the WAI-ARIA keys; FAQ accordion; documents (AC-26)', async ({
  page,
}) => {
  await media(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const list = page.getByRole('tablist', { name: 'Gig details' });
  const tabs = list.getByRole('tab');
  await expect(tabs).toHaveText(['Description', 'FAQ', 'Reviews2', 'Documents']);
  const description = page.getByRole('tabpanel', { name: 'Description' });
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.nth(0)).toHaveAttribute('aria-controls', 'gig-description-panel');
  await expect(description).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: 'FAQ' })).toBeHidden();

  await tabs.nth(1).click();
  const faq = page.getByRole('tabpanel', { name: 'FAQ' });
  await expect(faq).toBeVisible();
  await expect(description).toBeHidden();
  const question = faq.getByRole('button', { name: 'Do you make revisions?' });
  await expect(question).toHaveAttribute('aria-expanded', 'false');
  await expect(faq.getByText('Yes, three.')).toBeHidden();
  await question.click();
  await expect(question).toHaveAttribute('aria-expanded', 'true');
  await expect(faq.getByText(/Yes, three\.\s+More on request\./)).toBeVisible();

  // Arrow keys move and select (automatic activation); Home / End jump.
  await tabs.nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  const reviews = page.getByRole('tabpanel', { name: 'Reviews' });
  await expect(reviews).toContainText('4.5');
  await expect(reviews).toContainText('Based on 2 reviews');
  await page.keyboard.press('End');
  await expect(tabs.nth(3)).toBeFocused();
  const documents = page.getByRole('tabpanel', { name: 'Documents' });
  await expect(documents).toContainText('brief-template.pdf');
  await expect(documents).toContainText('1.4 MB');
  await expect(
    documents.getByRole('link', { name: 'Download: brief-template.pdf' }),
  ).toHaveAttribute('href', 'http://media.test/public-media/docs/brief-template.pdf');
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');

  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('phones: the tabs become stacked sections with headings (screen 02)', async ({ page }) => {
  await media(page);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await expect(page.getByRole('tablist')).toBeHidden();
  const tabs = page.getByTestId('gig-tabs');
  await expect(tabs.getByRole('heading', { level: 2 })).toHaveText([
    'Description',
    'FAQ',
    'Reviews',
    'Documents',
  ]);
  for (const name of ['Description', 'FAQ', 'Reviews', 'Documents'])
    await expect(page.getByRole('tabpanel', { name })).toBeVisible();
});

test('"You may also like": gig cards in a carousel; hidden without related gigs (AC-32, EC-13)', async ({
  page,
}) => {
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  const related = page.getByRole('region', { name: 'You may also like' });
  const cards = related.getByTestId('gig-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.first().getByRole('link', { name: 'Related gig 5' })).toHaveAttribute(
    'href',
    `/en/service/related-5-${GIG_UID(5).toLowerCase()}`,
  );
  await expect(related.getByRole('button', { name: 'Next' })).toBeVisible();

  // Gig 2: no FAQ, no documents, no reviews, nothing related.
  await page.goto(`/en/service/${GIG_SLUG[2]}`);
  await expect(page.getByRole('tab')).toHaveText(['Description', 'Reviews0']);
  await expect(page.getByTestId('gig-reviews')).toHaveText('No reviews yet');
  await expect(page.getByTestId('gig-related')).toHaveCount(0);
});

test('"You may also like" at 390 px: the heading keeps clear of the carousel buttons (BUG-04)', async ({
  page,
}) => {
  await media(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/service/${GIG_SLUG[1]}`);
  const related = page.getByTestId('gig-related');
  const heading = related.getByRole('heading', { level: 2 });
  await expect(heading).toHaveText('რეკომენდირებული განცხადებები');
  // The text itself (not the heading box, which runs to the edge) ends before the first button starts.
  const textEnd = await heading.evaluate((h) => {
    const range = document.createRange();
    range.selectNodeContents(h);
    return Math.max(...[...range.getClientRects()].map((r) => r.right));
  });
  const buttons = related.locator('.mt-carousel-buttons');
  const box = (await buttons.boundingBox())!;
  expect(textEnd).toBeLessThanOrEqual(box.x);
  const head = (await heading.boundingBox())!;
  // The buttons sit on the heading's band, not over the cards.
  expect(box.y).toBeGreaterThanOrEqual(head.y - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(head.y + head.height + 1);
});

const GIG = (n: number) => `01900000-0000-7000-8000-0000000d000${n}`;

test('card heart, guest: on every related card; asks to log in and come back, no API call (AC-35, BUG-03)', async ({
  page,
}) => {
  await media(page);
  let calls = 0;
  await page.route('**/api/v1/favorites/**', (route) => {
    calls += 1;
    return route.fulfill({ status: 401 });
  });
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const cards = page.getByTestId('gig-related').getByTestId('gig-card');
  await expect(cards.getByRole('button', { name: 'Add to favorite' })).toHaveCount(3);

  await cards.first().getByRole('button', { name: 'Add to favorite' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add to favorite' });
  await expect(dialog).toContainText(
    'Please sign in or create an account to add this Gig to your favorite list',
  );
  await expect(dialog.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    `/en/auth/login?next=${encodeURIComponent(`/en/service/${GIG_SLUG[1]}`)}`,
  );
  expect(calls).toBe(0);
});

test('card heart, signed in: saved state from the API, add and remove with the legacy messages, API errors shown (AC-35)', async ({
  page,
  context,
}) => {
  await as(context, 'viewer-token');
  await media(page);
  const sent: string[] = [];
  await page.route('**/api/v1/favorites/*', (route) => {
    const gigId = route.request().url().split('/').pop()!;
    sent.push(`${route.request().method()} ${gigId}`);
    if (gigId === GIG(7)) return json(route, 404, { code: 'NOT_FOUND', message: 'Gig not found' });
    return route.request().method() === 'PUT'
      ? json(route, 200, { gigId, createdAt: '2026-10-08T10:00:00Z' })
      : route.fulfill({ status: 204 });
  });
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const cards = page.getByTestId('gig-related').getByTestId('gig-card');
  const heart = (n: number) => cards.nth(n - 5).getByTestId('card-favorite');
  const note = (n: number) => cards.nth(n - 5).getByTestId('card-favorite-note');
  await expect(heart(5)).toHaveAttribute('aria-pressed', 'false');
  await expect(heart(6)).toHaveAttribute('aria-pressed', 'true');
  await expect(heart(6)).toHaveAccessibleName('Remove from favorite');

  await heart(5).click();
  await expect(heart(5)).toHaveAttribute('aria-pressed', 'true');
  await expect(heart(5)).toHaveAccessibleName('Remove from favorite');
  await expect(note(5)).toHaveText('Gig has been successfully added to your favorite list');

  await heart(6).click();
  await expect(heart(6)).toHaveAttribute('aria-pressed', 'false');
  await expect(note(6)).toHaveText('Gig has been removed from your favorite list');

  await heart(7).click();
  await expect(note(7)).toHaveText('Gig not found');
  await expect(heart(7)).toHaveAttribute('aria-pressed', 'false');
  expect(sent).toEqual([`PUT ${GIG(5)}`, `DELETE ${GIG(6)}`, `PUT ${GIG(7)}`]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test("card heart: none on the visitor's own gigs (R-G10)", async ({ page, context }) => {
  await as(context, 'owner-token');
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  await expect(page.getByTestId('gig-related').getByTestId('gig-card')).toHaveCount(3);
  await expect(page.getByTestId('card-favorite')).toHaveCount(0);
});

const json = (route: Route, status: number, body?: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: body === undefined ? '' : JSON.stringify(body),
  });
const GIG_1 = '01900000-0000-7000-8000-0000000d0001';

test('Actions, guest: Share dialog; Report and favourite ask to log in and come back (AC-35, AC-37)', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const actions = page.getByTestId('gig-actions');
  await expect(actions).toContainText('Actions');
  const next = encodeURIComponent(`/en/service/${GIG_SLUG[1]}`);

  await actions.getByRole('button', { name: 'Share' }).click();
  const share = page.getByRole('dialog', { name: 'Share this gig' });
  await expect(share.getByRole('link', { name: 'Share on Facebook' })).toHaveAttribute(
    'href',
    new RegExp(`facebook\\.com/sharer/sharer\\.php\\?u=.*${GIG_SLUG[1]}`),
  );
  await share.getByRole('button', { name: 'Copy link' }).click();
  await expect(share.getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    `/en/service/${GIG_SLUG[1]}`,
  );
  await page.keyboard.press('Escape');

  await actions.getByRole('button', { name: 'Report' }).click();
  const report = page.getByRole('dialog', { name: 'Report this gig' });
  await expect(report).toContainText('Please login or sign up to report this gig');
  await expect(report.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    `/en/auth/login?next=${next}`,
  );
  await expect(report.getByRole('textbox')).toHaveCount(0);
  await page.keyboard.press('Escape');

  let calls = 0;
  await page.route('**/api/v1/favorites/**', (route) => {
    calls += 1;
    return json(route, 401, { code: 'UNAUTHORIZED', message: 'x' });
  });
  await actions.getByRole('button', { name: 'Add to favorite' }).click();
  const note = page.getByTestId('favorite-note');
  await expect(note).toContainText(
    'Please sign in or create an account to add this Gig to your favorite list',
  );
  await expect(note.getByRole('link', { name: 'Login' })).toHaveAttribute(
    'href',
    `/en/auth/login?next=${next}`,
  );
  expect(calls).toBe(0);
});

test('Actions, signed in: report with the pre-check, then "already reported"; favourite on and off (AC-35, AC-37)', async ({
  page,
  context,
}) => {
  await as(context, 'viewer-token');
  await media(page);
  const sent: unknown[] = [];
  await page.route(`**/api/v1/gigs/${GIG_1}/reports`, (route) => {
    sent.push(route.request().postDataJSON());
    return json(route, 201, { id: '01900000-0000-7000-8000-000000000e01' });
  });
  const favorites: string[] = [];
  await page.route(`**/api/v1/favorites/${GIG_1}`, (route) => {
    favorites.push(route.request().method());
    return route.request().method() === 'PUT'
      ? json(route, 200, { gigId: GIG_1 })
      : route.fulfill({ status: 204 });
  });
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const actions = page.getByTestId('gig-actions');

  await actions.getByRole('button', { name: 'Report' }).click();
  const report = page.getByRole('dialog', { name: 'Report this gig' });
  const reason = report.getByRole('textbox', { name: 'Reason' });
  await expect(reason).toHaveAttribute(
    'placeholder',
    'Let us know why you would like to report this Gig',
  );
  await expect(reason).toHaveAttribute('maxlength', '500');
  await report.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('Field required');
  await reason.fill(' short ');
  await report.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('Must be at least 6 characters');
  expect(sent).toHaveLength(0);
  await reason.fill('  Copied from another seller.  ');
  await report.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('Thank you! your request has been successfully sent');
  expect(sent).toEqual([{ reason: 'Copied from another seller.' }]);
  await page.keyboard.press('Escape');
  // Opened again: no second form.
  await actions.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('It looks like you already reported this gig');
  await page.keyboard.press('Escape');

  const note = page.getByTestId('favorite-note');
  await actions.getByRole('button', { name: 'Add to favorite' }).click();
  await expect(note).toHaveText('Gig has been successfully added to your favorite list');
  await actions.getByRole('button', { name: 'Remove from favorite' }).click();
  await expect(note).toHaveText('Gig has been removed from your favorite list');
  await expect(actions.getByRole('button', { name: 'Add to favorite' })).toBeVisible();
  expect(favorites).toEqual(['PUT', 'DELETE']);
});

test('Actions: a 409 shows "already reported"; a gig reported and saved before opens that way', async ({
  page,
  context,
}) => {
  await as(context, 'viewer-token');
  await media(page);
  await page.route(`**/api/v1/gigs/${GIG_1}/reports`, (route) =>
    json(route, 409, { code: 'DUPLICATE', message: 'dup' }),
  );
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  await page.getByTestId('report-gig').click();
  const report = page.getByRole('dialog', { name: 'Report this gig' });
  await report.getByRole('textbox', { name: 'Reason' }).fill('Spam gig text');
  // The open report form has no WCAG 2 A/AA issue.
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
  await report.getByRole('button', { name: 'Report' }).click();
  await expect(report).toContainText('It looks like you already reported this gig');

  await page.goto(`/en/service/${GIG_SLUG[2]}`);
  await hydrated(page);
  await page.getByTestId('report-gig').click();
  await expect(page.getByRole('dialog', { name: 'Report this gig' })).toContainText(
    'It looks like you already reported this gig',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('favorite-gig')).toHaveText('Remove from favorite');
});

test('Actions, owner: "Edit gig" instead of the favourite; Report refused (AC-30, AC-37)', async ({
  page,
  context,
}) => {
  await as(context, 'owner-token');
  await media(page);
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  const actions = page.getByTestId('gig-actions');
  await expect(actions.getByRole('link', { name: 'Edit gig' })).toBeVisible();
  await expect(actions.getByTestId('favorite-gig')).toHaveCount(0);
  await actions.getByRole('button', { name: 'Report' }).click();
  const report = page.getByRole('dialog', { name: 'Report this gig' });
  await expect(report).toContainText('You cannot report your own gigs');
  await expect(report.getByRole('textbox')).toHaveCount(0);

  // The open dialog has no WCAG 2 A/AA issue.
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(axe.violations).toEqual([]);
});

test('the visit is recorded once from the browser with the referrer; never for the owner (AC-34)', async ({
  page,
  context,
}) => {
  await media(page);
  const views: unknown[] = [];
  await page.route(`**/api/v1/gigs/${GIG_1}/views`, (route) => {
    views.push(route.request().postDataJSON());
    return route.fulfill({ status: 202 });
  });
  await page.goto(`/en/service/${GIG_SLUG[1]}`, { referer: 'https://www.facebook.com/some/post' });
  await hydrated(page);
  await expect.poll(() => views.length).toBe(1);
  // The browser may cut a cross-site referrer down to its origin; the API keeps only the domain anyway.
  expect((views[0] as { referrer: string }).referrer).toMatch(/^https:\/\/www\.facebook\.com\//);
  // Moving around the page (tabs, gallery) does not count again.
  await page.getByRole('button', { name: 'Next image' }).first().click();
  await page.waitForTimeout(300);
  expect(views).toHaveLength(1);

  views.length = 0;
  await as(context, 'owner-token');
  await page.goto(`/en/service/${GIG_SLUG[1]}`);
  await hydrated(page);
  await page.waitForTimeout(300);
  expect(views).toEqual([]);
});

test('a direct visit sends a null referrer (AC-34)', async ({ page }) => {
  await media(page);
  const views: unknown[] = [];
  await page.route('**/api/v1/gigs/*/views', (route) => {
    views.push(route.request().postDataJSON());
    return route.fulfill({ status: 202 });
  });
  await page.goto(`/en/service/${GIG_SLUG[2]}`);
  await expect.poll(() => views).toEqual([{ referrer: null }]);
});
