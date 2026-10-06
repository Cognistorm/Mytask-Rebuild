// Catalogue screens (spec 16 AC-60, AC-61; ROADMAP 4.2.13): gig category tree, project categories, skills.
// Routed API (no stack needed); the rules themselves (levels, slugs, in-use, images) are covered by the API tests.
import { expect, test, type Page, type Route } from '@playwright/test';

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

const ME = {
  id: '01900000-0000-7000-8000-0000000000c1',
  username: 'catalog',
  fullName: 'Catalog Staff',
  email: 'catalog@example.com',
  pendingEmail: null,
  locale: 'ka',
  roles: [],
  permissions: ['catalog.write'],
  isSuperAdmin: false,
  twoFactorRequired: false,
  reauthenticatedUntil: null,
  lastLoginAt: null,
};

const id = (n: number) => `01900000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const category = (n: number, depth: number, parentId: string | null, name: string) => ({
  id: id(n),
  parentId,
  depth,
  slug: `cat-${n}`,
  name: { ka: name, en: depth === 1 ? 'Design' : null },
  description: null,
  contentTop: null,
  contentBottom: null,
  icon: null,
  image: null,
  isVisibleOnHome: true,
  position: 0,
  gigCount: n === 1 ? 3 : 0,
  childCount: depth < 3 ? 1 : 0,
  projectCategoryCount: n === 1 ? 1 : 0,
  previousSlugs: n === 2 ? ['old-sub'] : [],
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});
const CATEGORIES = [
  category(1, 1, null, 'დიზაინი'),
  category(2, 2, id(1), 'ლოგო'),
  category(3, 3, id(2), 'მინიმალისტური'),
];
const PROJECT_CATEGORY = {
  id: id(50),
  slug: 'web',
  name: { ka: 'ვებ', en: 'Web' },
  seoDescription: null,
  gigCategory: { id: id(1), slug: 'cat-1', name: 'დიზაინი', contentLocale: 'ka' },
  image: null,
  position: 0,
  isActive: true,
  skillCount: 2,
  projectCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};
const skill = (n: number) => ({
  id: id(100 + n),
  projectCategoryId: id(50),
  slug: `skill-${n}`,
  name: { ka: `უნარი ${n}`, en: null },
  isActive: true,
  projectCount: 0,
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

async function fake(page: Page) {
  const sent: { method: string; path: string; body: unknown }[] = [];
  await page.route('**/api/v1/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1', '');
    const body = req.postData() ? JSON.parse(req.postData()!) : undefined;
    if (req.method() !== 'GET') sent.push({ method: req.method(), path, body });
    if (path === '/admin/me') return json(route, 200, ME);
    if (path === '/admin/categories' && req.method() === 'GET') {
      return json(route, 200, { categories: CATEGORIES });
    }
    if (path === '/admin/categories' && req.method() === 'POST') {
      if (body.slug === 'taken') {
        return json(route, 409, {
          code: 'DUPLICATE',
          message: 'უკვე დაკავებულია',
          details: { fields: [{ field: 'slug', message: 'უკვე დაკავებულია' }] },
        });
      }
      return json(route, 201, { ...category(9, 1, null, body.name.ka), slug: body.slug });
    }
    if (path === `/admin/categories/${id(1)}` && req.method() === 'DELETE') {
      return json(route, 409, {
        code: 'CATEGORY_IN_USE',
        message: 'ეს ელემენტი ჯერ კიდევ გამოიყენება და ვერ წაიშლება.',
        details: { gigCount: 3, childCount: 1, projectCount: 1 },
      });
    }
    if (path === '/admin/project-categories' && req.method() === 'GET') {
      return json(route, 200, { projectCategories: [PROJECT_CATEGORY] });
    }
    if (path === '/admin/project-categories' && req.method() === 'POST') {
      return json(route, 201, { ...PROJECT_CATEGORY, id: id(51), slug: body.slug });
    }
    if (path === '/admin/skills' && req.method() === 'GET') {
      const cursor = url.searchParams.get('cursor');
      return json(route, 200, {
        data: cursor ? [skill(3)] : [skill(1), skill(2)],
        nextCursor: cursor ? null : 'next-page',
      });
    }
    if (path === '/admin/skills' && req.method() === 'POST') {
      return json(route, 201, { ...skill(9), slug: body.slug });
    }
    return json(route, 404, { code: 'NOT_FOUND', message: 'not found' });
  });
  return sent;
}

test('gig categories: tree with counts and old slugs; create a top-level category with all fields', async ({
  page,
}) => {
  const sent = await fake(page);
  await page.goto('/categories');
  await expect(page.getByRole('link', { name: 'სარჩევი' })).toHaveAttribute('aria-current', 'page');
  const rows = page.getByTestId('category-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('განცხადებები: 3');
  await expect(rows.nth(1)).toContainText('old-sub');
  // A level-3 category cannot have children.
  await expect(rows.nth(2).getByRole('button', { name: 'ქვეკატეგორიის დამატება' })).toHaveCount(0);

  await page.getByRole('button', { name: 'შექმენი კატეგორია' }).click();
  await page.getByLabel('სახელი · ka').fill('ვიდეო');
  await page.getByLabel('სახელი · en').fill('Video');
  await page.getByLabel('Slug').fill('video');
  await page.getByLabel('SEO ტექსტი სიის ზემოთ · ka').fill('<p>ზედა</p>');
  await page.getByLabel('მთავარ გვერდზე ჩვენება').uncheck();
  await expect(page.getByTestId('icon-picker')).toBeVisible();
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await expect(page.getByText('ოპერაცია წარმატებით შესრულდა')).toBeVisible();
  const post = sent.find((s) => s.method === 'POST' && s.path === '/admin/categories')!;
  expect(post.body).toMatchObject({
    parentId: null,
    slug: 'video',
    name: { ka: 'ვიდეო', en: 'Video' },
    contentTop: { ka: '<p>ზედა</p>', en: null },
    contentBottom: null,
    description: null,
    isVisibleOnHome: false,
  });
});

test('gig categories: a sub-category has no images; slug errors and in-use refusals are shown', async ({
  page,
}) => {
  const sent = await fake(page);
  await page.goto('/categories');
  await page
    .getByTestId('category-row')
    .nth(0)
    .getByRole('button', { name: 'ქვეკატეგორიის დამატება' })
    .click();
  await expect(page.getByTestId('icon-picker')).toHaveCount(0);
  await page.getByLabel('სახელი · ka').fill('ბანერი');
  await page.getByLabel('Slug').fill('taken');
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await expect(page.getByText('უკვე დაკავებულია')).toBeVisible();
  expect(sent.at(-1)!.body).toMatchObject({ parentId: id(1) });
  await page.getByRole('button', { name: 'გაუქმება' }).click();

  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('category-row').nth(0).getByRole('button', { name: 'წაშლა' }).click();
  await expect(page.getByText('ეს ელემენტი ჯერ კიდევ გამოიყენება და ვერ წაიშლება.')).toBeVisible();
});

test('project categories: linked top-level gig category only; create sends the link', async ({
  page,
}) => {
  const sent = await fake(page);
  await page.goto('/project-categories');
  const row = page.getByTestId('project-category-row');
  await expect(row).toContainText('დაკავშირებული მიმართულება: დიზაინი');
  await expect(row).toContainText('უნარები: 2');
  await page.getByRole('button', { name: 'შექმენი კატეგორია' }).click();
  const select = page.getByLabel('დაკავშირებული მიმართულება');
  // Only the top-level gig category is offered (plus the placeholder).
  await expect(select.locator('option')).toHaveCount(2);
  await select.selectOption(id(1));
  await page.getByLabel('სახელი · ka').fill('მობაილი');
  await page.getByLabel('Slug').fill('mobile');
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await expect(page.getByText('ოპერაცია წარმატებით შესრულდა')).toBeVisible();
  expect(sent.find((s) => s.path === '/admin/project-categories')!.body).toMatchObject({
    slug: 'mobile',
    gigCategoryId: id(1),
    name: { ka: 'მობაილი', en: null },
    seoDescription: null,
    isActive: true,
  });
});

test('skills: list with "Load more", create a skill in a project category', async ({ page }) => {
  const sent = await fake(page);
  await page.goto('/skills');
  await expect(page.getByTestId('skill-row')).toHaveCount(2);
  await page.getByRole('button', { name: 'მეტის ჩვენება' }).click();
  await expect(page.getByTestId('skill-row')).toHaveCount(3);
  await page.getByRole('button', { name: 'დამატება' }).click();
  await page.getByLabel('პროექტის კატეგორია').first().selectOption(id(50));
  await page.getByLabel('სახელი · ka').fill('React');
  await page.getByLabel('Slug').fill('react');
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await expect(page.getByText('ოპერაცია წარმატებით შესრულდა')).toBeVisible();
  expect(sent.find((s) => s.path === '/admin/skills')!.body).toMatchObject({
    projectCategoryId: id(50),
    slug: 'react',
    name: { ka: 'React', en: null },
    isActive: true,
  });
});
