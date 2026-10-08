// Gig moderation queue (spec 16 AC-19, AC-20; spec 04 AC-17, AC-18; ROADMAP 4.3.13): pending gigs with filters,
// details with the owner summary and both languages, approve, reject with a required reason, remove with an
// internal reason, restore of a staff removal, first decision wins (409), status tabs, permission. The page runs
// against a routed API (no stack needed); the rules themselves are covered by the API tests (gigs-admin.test.ts).
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;

const ME = {
  id: id(900),
  username: 'moderator',
  fullName: 'Moderator',
  email: 'moderator@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: ['gigs.moderate'],
  isSuperAdmin: false,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};
const USER = {
  id: id(1),
  username: 'designer_ge',
  avatar: null,
  isPremium: true,
  isIdVerified: false,
  isOnline: false,
  countryCode: 'GE',
  isDeleted: false,
};
const IMG = (n: number) => ({
  fileId: id(100 + n),
  thumb: `http://localhost:3200/img-${n}-thumb.webp`,
  medium: `http://localhost:3200/img-${n}-medium.webp`,
  large: `http://localhost:3200/img-${n}-large.webp`,
  width: 800,
  height: 600,
});
const cat = (n: number, name: string) => ({
  id: id(200 + n),
  slug: `cat-${n}`,
  name,
  contentLocale: 'ka',
});
const ITEM = {
  id: id(10),
  uid: 'g7k2m9',
  slug: 'logo-design-g7k2m9',
  title: 'ლოგოს დიზაინი',
  contentLocale: 'ka',
  thumbnail: IMG(1),
  category: cat(1, 'გრაფიკა და დიზაინი'),
  owner: USER,
  status: 'pending',
  deletedBy: null,
  price: { amount: 5000, currency: 'GEL' },
  createdAt: '2026-10-01T08:00:00.000Z',
  submittedAt: '2026-10-02T08:00:00.000Z',
  updatedAt: '2026-10-02T08:00:00.000Z',
};
const GIG = {
  id: ITEM.id,
  uid: ITEM.uid,
  slug: ITEM.slug,
  status: 'pending',
  title: { ka: 'ლოგოს დიზაინი', en: 'Logo design' },
  description: { ka: '<p>ლოგო <strong>თბილისის</strong> საცხობისთვის.</p>', en: null },
  category: cat(1, 'გრაფიკა და დიზაინი'),
  subcategory: cat(2, 'ლოგო'),
  childCategory: cat(3, 'ლოგოს დიზაინი'),
  price: { amount: 5000, currency: 'GEL' },
  deliveryDays: 3,
  revisionsAllowed: 2,
  upgrades: [
    {
      id: id(30),
      title: 'სწრაფი მიწოდება',
      price: { amount: 2000, currency: 'GEL' },
      extraDays: 0,
    },
  ],
  faqs: [{ id: id(31), question: 'რა ფორმატით?', answer: 'SVG და PNG.' }],
  thumbnail: IMG(1),
  images: [IMG(1), IMG(2)],
  documents: [
    {
      fileId: id(32),
      fileName: 'brief.pdf',
      sizeBytes: 20480,
      url: 'http://localhost:3200/brief.pdf',
    },
  ],
  seo: null,
  isFeatured: true,
  rating: { count: 0, averageTenths: null },
  ordersInQueueCount: 0,
  rejectionReason: null,
  deletedBy: null,
  removalReason: null,
  removedAt: null,
  restoreDeadlineAt: null,
  ownerSummary: {
    user: USER,
    status: 'active',
    isRestricted: false,
    isDeleted: false,
    plan: 'premium',
    kycStatus: 'verified',
    reportCount: 3,
    earlierRejectionCount: 2,
  },
  createdAt: ITEM.createdAt,
  submittedAt: ITEM.submittedAt,
  publishedAt: null,
  updatedAt: ITEM.updatedAt,
};
const TREE = {
  categories: [
    {
      id: id(201),
      slug: 'cat-1',
      path: 'cat-1',
      depth: 1,
      name: 'გრაფიკა და დიზაინი',
      contentLocale: 'ka',
      icon: null,
      image: null,
      isVisibleOnHome: true,
      position: 1,
      color: null,
      children: [
        {
          id: id(202),
          slug: 'cat-2',
          path: 'cat-1/cat-2',
          depth: 2,
          name: 'ლოგო',
          contentLocale: 'ka',
          icon: null,
          image: null,
          isVisibleOnHome: true,
          position: 1,
          color: null,
          children: [],
        },
      ],
    },
  ],
};

const EMPTY_TEXT = 'განსახილველი არაფერია. კარგი მუშაობაა!';

/** Routes the API; `queue` answers each list call in turn (the last answer repeats). */
async function setup(page: Page, queue: unknown[][], me = ME, gig: object = GIG) {
  const lists: URL[] = [];
  const posts: { url: string; body: unknown }[] = [];
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, me));
  await page.route('**/api/v1/categories', (route) => json(route, 200, TREE));
  await page.route('**/api/v1/admin/gigs?**', (route) => {
    lists.push(new URL(route.request().url()));
    const data = queue[Math.min(lists.length - 1, queue.length - 1)] ?? [];
    return json(route, 200, { data, nextCursor: null, totalCount: data.length });
  });
  await page.route('**/api/v1/admin/gigs/*', (route) => json(route, 200, gig));
  await page.route('**/api/v1/admin/gigs/*/*', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return json(route, 200, gig);
  });
  await page.route('**/img-*.webp', (route) => route.fulfill({ status: 404 }));
  return { lists, posts };
}

test('pending queue: details show the gig and the owner summary; approve publishes', async ({
  page,
}) => {
  const { lists, posts } = await setup(page, [[ITEM], []]);
  await page.goto('/gigs');
  await expect(page.getByRole('link', { name: 'განცხადებები' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('განცხადებები (1)');
  const card = page.getByTestId('gig-item');
  await expect(card).toContainText('ლოგოს დიზაინი');
  await expect(card).toContainText('designer_ge');
  await expect(card).toContainText('₾50.00');
  await expect(card).toContainText('#g7k2m9');
  const q = lists[0]?.searchParams;
  expect(q?.getAll('status')).toEqual(['pending']);
  expect(q?.get('limit')).toBe('50');

  const details = card.getByRole('button', { name: 'დეტალები' });
  await expect(details).toHaveAttribute('aria-expanded', 'false');
  await details.click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  const detail = card.getByTestId('gig-detail');
  const owner = detail.getByTestId('owner-summary');
  await expect(owner).toContainText('პრემიუმი');
  await expect(owner).toContainText('რეპორტები: 3');
  await expect(owner).toContainText('წინა უარყოფები: 2');
  await expect(detail).toContainText('Logo design');
  await expect(detail).toContainText('გრაფიკა და დიზაინი › ლოგო › ლოგოს დიზაინი');
  await expect(detail.locator('strong', { hasText: 'თბილისის' })).toBeVisible();
  await expect(detail).toContainText('შედის 2 შესწორება');
  await expect(detail).toContainText('სწრაფი მიწოდება · +₾20.00');
  await expect(detail).toContainText('SVG და PNG.');
  await expect(detail.getByRole('link', { name: 'brief.pdf' })).toBeVisible();
  await expect(detail.getByRole('link', { name: 'ლოგოს დიზაინი · სურათი 2 / 2' })).toHaveAttribute(
    'href',
    IMG(2).large,
  );
  // English description missing: only the Georgian one is shown.
  await expect(detail.locator('.admin-gig-html')).toHaveCount(1);

  const axe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await card.getByRole('button', { name: 'დადასტურება', exact: true }).click();
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]?.url).toContain(`/admin/gigs/${ITEM.id}/publish`);
});

test('reject needs a reason, then sends it trimmed', async ({ page }) => {
  const { posts } = await setup(page, [[ITEM], []]);
  await page.goto('/gigs');
  const card = page.getByTestId('gig-item');
  await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
  await expect(card.getByText('აუცილებელია')).toBeVisible();
  expect(posts).toHaveLength(0);

  await card.getByLabel('მიზეზი (მომხმარებელი დაინახავს)').fill('  Blurry images.  ');
  await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
  await expect(page.getByText(EMPTY_TEXT)).toBeVisible();
  expect(posts[0]?.url).toContain(`/admin/gigs/${ITEM.id}/reject`);
  expect(posts[0]?.body).toEqual({ reason: 'Blurry images.' });
});

test('a decision another staff member made first shows t_item_already_decided', async ({
  page,
}) => {
  const { lists } = await setup(page, [[ITEM]]);
  await page.route('**/api/v1/admin/gigs/*/publish', (route) =>
    json(route, 409, { code: 'STATE_CONFLICT', message: 'Conflict' }),
  );
  await page.goto('/gigs');
  await page.getByRole('button', { name: 'დადასტურება', exact: true }).click();
  await expect(page.getByText('ეს საკითხი სხვა თანამშრომელმა უკვე გადაწყვიტა.')).toBeVisible();
  await expect.poll(() => lists.length).toBe(2);
});

test('active gig: remove asks for an internal reason and confirmation; orders in queue refuse it', async ({
  page,
}) => {
  const active = { ...ITEM, status: 'active' };
  const { lists, posts } = await setup(page, [[ITEM], [active]]);
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.accept();
  });

  await page.goto('/gigs');
  await expect(page.getByTestId('gig-item')).toBeVisible();
  await page.getByRole('button', { name: 'აქტიურია' }).click();
  await expect.poll(() => lists[1]?.searchParams.getAll('status')).toEqual(['active']);
  const card = page.getByTestId('gig-item');
  await expect(card.getByRole('button', { name: 'დადასტურება', exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: 'განცხადების წაშლა' }).click();
  await expect(card.getByText('აუცილებელია')).toBeVisible();
  expect(dialogs).toHaveLength(0);

  await page.route('**/api/v1/admin/gigs/*/remove', (route) =>
    json(route, 409, {
      code: 'GIG_HAS_ORDERS_IN_QUEUE',
      message: 'ამ განცხადებას აქვს მომლოდინე შეკვეთები',
    }),
  );
  await card.getByLabel('შიდა მიზეზი (მხოლოდ თანამშრომლებისთვის)').fill('Copied images.');
  await card.getByRole('button', { name: 'განცხადების წაშლა' }).click();
  expect(dialogs).toEqual(['დარწმუნებული ხართ რომ გსურთ ამ განცხადების წაშლა?']);
  await expect(card.getByText('ამ განცხადებას აქვს მომლოდინე შეკვეთები')).toBeVisible();
  await expect(card).toBeVisible();

  await page.unroute('**/api/v1/admin/gigs/*/remove');
  await card.getByRole('button', { name: 'განცხადების წაშლა' }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]?.url).toContain(`/admin/gigs/${ITEM.id}/remove`);
  expect(posts[0]?.body).toEqual({ reason: 'Copied images.' });
});

test('deleted tab: staff removals show the window and restore; owner deletions cannot be restored', async ({
  page,
}) => {
  const removed = { ...ITEM, status: 'deleted', deletedBy: 'staff' };
  const ownDeleted = { ...ITEM, id: id(11), uid: 'h8k3n0', status: 'deleted', deletedBy: 'owner' };
  const { posts } = await setup(page, [[ITEM], [removed, ownDeleted]], ME, {
    ...GIG,
    status: 'deleted',
    deletedBy: 'staff',
    removalReason: 'Copied images.',
    removedAt: '2026-10-03T08:00:00.000Z',
    restoreDeadlineAt: '2026-11-02T08:00:00.000Z',
  });
  await page.goto('/gigs');
  await expect(page.getByTestId('gig-item')).toBeVisible();
  await page.getByRole('button', { name: 'წაშლილი' }).click();
  const cards = page.getByTestId('gig-item');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0)).toContainText('წაშალა თანამშრომელმა');
  await expect(cards.nth(1)).toContainText('წაშალა მფლობელმა');
  await expect(cards.nth(1).getByRole('button', { name: 'აღდგენა' })).toHaveCount(0);

  await cards.nth(0).getByRole('button', { name: 'დეტალები' }).click();
  const detail = cards.nth(0).getByTestId('gig-detail');
  await expect(detail).toContainText('შიდა მიზეზი (მხოლოდ თანამშრომლებისთვის): Copied images.');
  await expect(detail).toContainText('აღდგენა შესაძლებელია');

  // Over the owner's plan limit: the API message is shown and the gig stays.
  await page.route('**/api/v1/admin/gigs/*/restore', (route) =>
    json(route, 422, { code: 'PLAN_LIMIT_REACHED', message: 'მფლობელს უკვე აქვს 10 განცხადება' }),
  );
  await cards.nth(0).getByRole('button', { name: 'აღდგენა' }).click();
  await expect(cards.nth(0).getByText('მფლობელს უკვე აქვს 10 განცხადება')).toBeVisible();
  await page.unroute('**/api/v1/admin/gigs/*/restore');
  await cards.nth(0).getByRole('button', { name: 'აღდგენა' }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]?.url).toContain(`/admin/gigs/${ITEM.id}/restore`);
});

test('filters reach the API: owner, dates, title or ID, category of any level', async ({
  page,
}) => {
  const { lists } = await setup(page, [[ITEM]]);
  await page.goto('/gigs');
  await expect(page.getByTestId('gig-item')).toBeVisible();
  await page.getByLabel('მომხმარებლის ID').fill(USER.id);
  await page.getByLabel('თარიღიდან').fill('2026-10-01');
  await page.getByLabel('თარიღამდე').fill('2026-10-02');
  await page.getByLabel('სათაური ან ID').fill('  ლოგო ');
  await page.getByLabel('მიმართულება').selectOption({ label: '— ლოგო' });
  await page.getByRole('button', { name: 'გაფილტვრა' }).click();
  await expect.poll(() => lists.length).toBe(2);
  const q = lists[1]?.searchParams;
  expect(q?.getAll('status')).toEqual(['pending']);
  expect(q?.get('userId')).toBe(USER.id);
  expect(q?.get('createdFrom')).toBe('2026-09-30T20:00:00.000Z');
  expect(q?.get('createdTo')).toBe('2026-10-02T20:00:00.000Z');
  expect(q?.get('q')).toBe('ლოგო');
  expect(q?.get('categoryId')).toBe(id(202));

  await page.getByRole('button', { name: 'ფილტრის გასუფთავება' }).click();
  await expect.poll(() => lists.length).toBe(3);
  const r = lists[2]?.searchParams;
  expect([r?.get('q'), r?.get('categoryId'), r?.get('userId')]).toEqual([null, null, null]);
  await expect(page.getByLabel('სათაური ან ID')).toHaveValue('');
});

test('without gigs.moderate the link is hidden and the page says so', async ({ page }) => {
  const { lists } = await setup(page, [[ITEM]], { ...ME, permissions: ['users.read'] });
  await page.goto('/gigs');
  await expect(page.getByText('თქვენ არ გაქვთ ამ გვერდზე წვდომის უფლება')).toBeVisible();
  await expect(page.getByRole('link', { name: 'განცხადებები' })).toHaveCount(0);
  expect(lists).toHaveLength(0);
});
