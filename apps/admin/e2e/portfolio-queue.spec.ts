// Portfolio queue (spec 16 AC-19, AC-21; spec 02 AC-26, AC-42; ROADMAP 4.1.21): pending items with the owner
// summary, approve, reject with a required reason, remove with a reason, first decision wins (409), status
// tabs and filters. The page runs against a routed API (no stack needed); the rules themselves are covered
// by the API tests.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-0000000000s1',
  username: 'moderator',
  fullName: 'Moderator',
  email: 'moderator@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: ['portfolio.moderate'],
  isSuperAdmin: false,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};
const USER = {
  id: '01900000-0000-7000-8000-0000000000b1',
  username: 'designer_ge',
  avatar: null,
  isPremium: true,
  isIdVerified: false,
  isOnline: false,
  countryCode: 'GE',
  isDeleted: false,
};
const IMG = (n: number) => ({
  fileId: `01900000-0000-7000-8000-00000000000${n}`,
  thumb: `http://localhost:3200/img-${n}-thumb.webp`,
  medium: `http://localhost:3200/img-${n}-medium.webp`,
  large: `http://localhost:3200/img-${n}-large.webp`,
  width: 800,
  height: 600,
});
const ENTRY = {
  item: {
    id: '01900000-0000-7000-8000-0000000000p1',
    uid: 'abc123',
    slug: 'logo-design-abc123',
    title: 'ლოგოს დიზაინი',
    description: 'A logo for a Tbilisi bakery.',
    projectUrl: 'https://example.com/bakery',
    videoUrl: null,
    thumbnail: IMG(1),
    images: [IMG(2)],
    status: 'pending',
    rejectionReason: null,
    rejectedAt: null,
    owner: USER,
    isOwn: false,
    publishedAt: null,
    createdAt: '2026-10-01T08:00:00.000Z',
    updatedAt: '2026-10-01T08:00:00.000Z',
  },
  owner: {
    user: USER,
    status: 'active',
    isRestricted: true,
    isDeleted: false,
    plan: 'premium',
    kycStatus: 'pending',
    reportCount: 2,
    earlierRejectionCount: 1,
  },
  decidedBy: null,
  decidedAt: null,
};

/** Routes the API; `queue` answers each list call in turn (the last answer repeats). */
async function setup(page: Page, queue: unknown[][], me = ME) {
  const lists: URL[] = [];
  const posts: { url: string; body: unknown }[] = [];
  await page.route('**/api/v1/admin/me', (route) => json(route, 200, me));
  await page.route('**/api/v1/admin/portfolio-items?**', (route) => {
    lists.push(new URL(route.request().url()));
    const data = queue[Math.min(lists.length - 1, queue.length - 1)] ?? [];
    return json(route, 200, { data, nextCursor: null, totalCount: data.length });
  });
  await page.route('**/img-*.webp', (route) => route.fulfill({ status: 404 }));
  return { lists, posts };
}

test('pending item shows the owner summary and approves', async ({ page }) => {
  const { lists, posts } = await setup(page, [[ENTRY], []]);
  await page.route('**/api/v1/admin/portfolio-items/*/approve', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return json(route, 200, { ...ENTRY, item: { ...ENTRY.item, status: 'active' } });
  });

  await page.goto('/portfolio');
  await expect(page.getByRole('link', { name: 'პორტფოლიო' })).toBeVisible();
  const card = page.getByTestId('portfolio-item');
  await expect(card).toContainText('ლოგოს დიზაინი');
  await expect(card).toContainText('A logo for a Tbilisi bakery.');
  await expect(card.getByRole('link', { name: 'გადახედვა' })).toHaveAttribute(
    'href',
    'https://example.com/bakery',
  );
  const owner = card.getByTestId('owner-summary');
  await expect(owner).toContainText('designer_ge');
  await expect(owner).toContainText('შეზღუდულია');
  await expect(owner).toContainText('პრემიუმი');
  await expect(owner).toContainText('რეპორტები: 2');
  await expect(owner).toContainText('წინა უარყოფები: 1');
  expect(lists[0]?.searchParams.get('status')).toBe('pending');

  await card.getByRole('button', { name: 'დადასტურება', exact: true }).click();
  await expect(page.getByText('განსახილველი არაფერია. კარგი მუშაობაა!')).toBeVisible();
  expect(posts).toHaveLength(1);
  expect(posts[0]?.url).toContain(`/admin/portfolio-items/${ENTRY.item.id}/approve`);
});

test('reject needs a reason, then sends it', async ({ page }) => {
  const { posts } = await setup(page, [[ENTRY], []]);
  await page.route('**/api/v1/admin/portfolio-items/*/reject', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return json(route, 200, { ...ENTRY, item: { ...ENTRY.item, status: 'rejected' } });
  });

  await page.goto('/portfolio');
  const card = page.getByTestId('portfolio-item');
  await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
  await expect(card.getByText('აუცილებელია')).toBeVisible();
  expect(posts).toHaveLength(0);

  await card.getByLabel('მიზეზი (მომხმარებელი დაინახავს)').fill('  Low-quality images.  ');
  await card.getByRole('button', { name: 'უარყოფა', exact: true }).click();
  await expect(page.getByText('განსახილველი არაფერია. კარგი მუშაობაა!')).toBeVisible();
  expect(posts[0]?.body).toEqual({ reason: 'Low-quality images.' });
});

test('remove asks for confirmation and sends the reason', async ({ page }) => {
  const { posts } = await setup(page, [[ENTRY], []]);
  await page.route('**/api/v1/admin/portfolio-items/*/remove', (route) => {
    posts.push({ url: route.request().url(), body: route.request().postDataJSON() });
    return route.fulfill({ status: 204 });
  });
  const dialogs: string[] = [];
  page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.accept();
  });

  await page.goto('/portfolio');
  const card = page.getByTestId('portfolio-item');
  await card.getByLabel('მიზეზი (მომხმარებელი დაინახავს)').fill('Copied work.');
  await card.getByRole('button', { name: 'პორტფოლიოს წაშლა' }).click();
  await expect(page.getByText('განსახილველი არაფერია. კარგი მუშაობაა!')).toBeVisible();
  expect(dialogs).toEqual(['ნამდვილად გსურთ წაშლა?']);
  expect(posts[0]?.url).toContain(`/admin/portfolio-items/${ENTRY.item.id}/remove`);
  expect(posts[0]?.body).toEqual({ reason: 'Copied work.' });
});

test('a decision another staff member made first shows t_item_already_decided', async ({
  page,
}) => {
  await setup(page, [[ENTRY]]);
  await page.route('**/api/v1/admin/portfolio-items/*/approve', (route) =>
    json(route, 409, { code: 'STATE_CONFLICT', message: 'Conflict' }),
  );

  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'დადასტურება', exact: true }).click();
  await expect(page.getByText('ეს საკითხი სხვა თანამშრომელმა უკვე გადაწყვიტა.')).toBeVisible();
});

test('status tabs and filters reach the API; rejected items show the reason', async ({ page }) => {
  const rejected = {
    ...ENTRY,
    item: { ...ENTRY.item, status: 'rejected', rejectionReason: 'Blurry.' },
    decidedBy: { id: ME.id, username: ME.username, fullName: 'Nino Staff' },
    decidedAt: '2026-10-02T09:00:00.000Z',
  };
  const { lists } = await setup(page, [[ENTRY], [rejected]]);

  await page.goto('/portfolio');
  await expect(page.getByTestId('portfolio-item')).toBeVisible();
  await page.getByRole('button', { name: 'უარყოფილია' }).click();
  const card = page.getByTestId('portfolio-item');
  await expect(card).toContainText('მიზეზი: Blurry.');
  await expect(card).toContainText('Nino Staff');
  await expect(card.getByRole('button', { name: 'დადასტურება', exact: true })).toHaveCount(0);

  await page.getByLabel('მომხმარებლის ID').fill(USER.id);
  await page.getByLabel('თარიღიდან').fill('2026-10-01');
  await page.getByLabel('თარიღამდე').fill('2026-10-02');
  await page.getByRole('button', { name: 'გაფილტვრა' }).click();
  await expect.poll(() => lists.length).toBe(3);
  const q = lists[2]?.searchParams;
  expect(q?.get('status')).toBe('rejected');
  expect(q?.get('userId')).toBe(USER.id);
  // Tbilisi days (UTC+4); the "to" day is included (createdTo is exclusive).
  expect(q?.get('createdFrom')).toBe('2026-09-30T20:00:00.000Z');
  expect(q?.get('createdTo')).toBe('2026-10-02T20:00:00.000Z');
});

test('without portfolio.moderate the link is hidden and the page says so', async ({ page }) => {
  const { lists } = await setup(page, [[ENTRY]], { ...ME, permissions: ['users.read'] });
  await page.goto('/portfolio');
  await expect(page.getByText('თქვენ არ გაქვთ ამ გვერდზე წვდომის უფლება')).toBeVisible();
  await expect(page.getByRole('link', { name: 'პორტფოლიო' })).toHaveCount(0);
  expect(lists).toHaveLength(0);
});

// 4X.5 (admin-refresh.md §5): segmented status tabs with a sliding thumb, the item card with header / body /
// decision area, Approve = Primary, Reject = Danger, other actions Secondary, the shared EmptyState.
test('queue look: segmented tabs, item card sections, action variants, empty state', async ({
  page,
}) => {
  await setup(page, [[ENTRY], []]);
  await page.goto('/portfolio');
  const tabs = page.getByRole('group', { name: 'სტატუსი' });
  await expect(tabs).toHaveClass(/admin-segmented/);
  const card = page.getByTestId('portfolio-item');
  await expect(card.locator('.admin-item-head').getByTestId('owner-summary')).toBeVisible();
  await expect(card.locator('.admin-item-body')).toContainText('A logo for a Tbilisi bakery.');
  const foot = card.locator('.admin-item-foot');
  await expect(foot.getByLabel(/მიზეზი/)).toBeVisible();
  await expect(foot.getByRole('button', { name: 'დადასტურება', exact: true })).toHaveClass(
    /mt-button-primary/,
  );
  await expect(foot.getByRole('button', { name: 'უარყოფა', exact: true })).toHaveClass(
    /mt-button-danger/,
  );
  await expect(foot.getByRole('button', { name: 'პორტფოლიოს წაშლა' })).toHaveClass(/^mt-button$/);
  // The reason field sits above the action bar.
  const reason = await foot.getByLabel(/მიზეზი/).boundingBox();
  const bar = await foot.locator('.admin-item-actions').boundingBox();
  expect(bar!.y).toBeGreaterThan(reason!.y + reason!.height - 1);

  // The thumb slides under the chosen status; the empty list is the shared EmptyState.
  const thumbX = () =>
    tabs.evaluate((el) => new DOMMatrix(getComputedStyle(el, '::before').transform).m41);
  const before = await thumbX();
  await tabs.getByRole('button').nth(1).click();
  await expect(tabs.getByRole('button').nth(1)).toHaveAttribute('aria-pressed', 'true');
  const second = await tabs
    .getByRole('button')
    .nth(1)
    .evaluate((el) => (el as HTMLElement).offsetLeft);
  await expect.poll(thumbX).toBe(second);
  expect(second).toBeGreaterThan(before);
  await expect(page.locator('.mt-empty')).toBeVisible();
});
