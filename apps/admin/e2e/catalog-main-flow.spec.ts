// Slice 2 (spec 03 + spec 16 AC-60/AC-61, ROADMAP 4.2.16) main flow across the admin panel and the website on the
// real stack: staff build a 3-level gig category branch, a linked project category and a skill; the website then
// shows the category in the header, its pages at every level (title, breadcrumb, empty list), the explore-projects
// chip and skill page, and the search page; deleting the top category is refused while it is in use, then the
// branch is removed bottom-up. Gigs arrive with slice 3, so the lists stay empty here (filled lists are covered by
// the API tests and the web E2E on the stand-in API).
// Needs the full stack (`pnpm local`) and its console log, where the seed printed the first Super-admin
// (a fresh database: `LOCAL_PGLITE_DIR=<empty folder> pnpm local`, SETUP-LOCAL §5).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const WEB = process.env.E2E_WEB_URL ?? 'http://localhost:3100';
const log = process.env.ADMIN_E2E_LOG;

test.setTimeout(180_000);

async function rowOf(page: Page, testId: string, text: string) {
  const row = page.getByTestId(testId).filter({ hasText: text });
  await expect(row).toBeVisible();
  return row;
}

test('staff build a category branch → the website shows it → in-use delete refused → cleanup', async ({
  page,
  browser,
}) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log');

  const n = Date.now().toString(36);
  const top = { slug: `e2e-${n}`, ka: `ტესტ კატეგორია ${n}`, en: `Test category ${n}` };
  const sub = { slug: `e2e-sub-${n}`, ka: `ქვეკატეგორია ${n}` };
  const child = { slug: `e2e-child-${n}`, ka: `შვილი ${n}` };

  // Staff sign in (the seeded Super-admin).
  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);

  // A top-level category with ka + en names and an SEO text, then a sub and a child category.
  await page.goto('/categories');
  await page.getByRole('button', { name: 'შექმენი კატეგორია' }).click();
  await page.getByLabel('სახელი · ka').fill(top.ka);
  await page.getByLabel('სახელი · en').fill(top.en);
  await page.getByLabel('Slug').fill(top.slug);
  await page
    .getByLabel('SEO ტექსტი სიის ზემოთ · ka')
    .fill('<p>ზედა ტექსტი</p><script>x()</script>');
  await page.getByRole('button', { name: 'შენახვა' }).click();
  const topRow = await rowOf(page, 'category-row', top.ka);
  await topRow.getByRole('button', { name: 'ქვეკატეგორიის დამატება' }).click();
  await page.getByLabel('სახელი · ka').fill(sub.ka);
  await page.getByLabel('Slug').fill(sub.slug);
  await page.getByRole('button', { name: 'შენახვა' }).click();
  const subRow = await rowOf(page, 'category-row', sub.ka);
  await subRow.getByRole('button', { name: 'ქვეკატეგორიის დამატება' }).click();
  await page.getByLabel('სახელი · ka').fill(child.ka);
  await page.getByLabel('Slug').fill(child.slug);
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await rowOf(page, 'category-row', child.ka);

  // A project category linked to the new top-level category, and a skill inside it.
  await page.goto('/project-categories');
  await page.getByRole('button', { name: 'შექმენი კატეგორია' }).click();
  await page.getByLabel('სახელი · ka').fill(`პროექტები ${n}`);
  await page.getByLabel('სახელი · en').fill(`Projects ${n}`);
  await page.getByLabel('Slug').fill(`e2e-pc-${n}`);
  await page.getByLabel('დაკავშირებული მიმართულება').selectOption({ label: top.ka });
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await rowOf(page, 'project-category-row', `პროექტები ${n}`);
  await page.goto('/skills');
  await page.getByRole('button', { name: 'დამატება' }).click();
  await page
    .getByLabel('პროექტის კატეგორია')
    .first()
    .selectOption({ label: `პროექტები ${n}` });
  await page.getByLabel('სახელი · ka').fill(`უნარი ${n}`);
  await page.getByLabel('Slug').fill(`e2e-skill-${n}`);
  await page.getByRole('button', { name: 'შენახვა' }).click();
  await rowOf(page, 'skill-row', `უნარი ${n}`);

  // The website: header, category pages at 3 levels (the API empties its tree cache on every write).
  const web = await (await browser.newContext()).newPage();
  await web.setViewportSize({ width: 1280, height: 900 });
  await web.goto(`${WEB}/categories/${top.slug}`);
  await expect(web.getByRole('heading', { level: 1 })).toHaveText(top.ka);
  await expect(web.getByTestId('content-top')).toHaveText('ზედა ტექსტი');
  await expect(web.getByTestId('site-header').getByText(top.ka).first()).toBeAttached();
  await expect(web.getByText('გთხოვთ სცადეთ ხელახლა')).toBeVisible();
  await web.goto(`${WEB}/en/categories/${top.slug}/${sub.slug}/${child.slug}`);
  await expect(web.getByRole('heading', { level: 1 })).toHaveText(child.ka);
  await expect(
    web.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: top.en }),
  ).toHaveAttribute('href', `/en/categories/${top.slug}`);
  expect((await web.goto(`${WEB}/categories/${sub.slug}`))?.status()).toBe(404);

  // Explore projects: the chip and the skill page (when S-075 is ON, the register default).
  await web.goto(`${WEB}/en/explore/projects`);
  if (await web.getByTestId('explore-projects').isVisible()) {
    await web.getByRole('link', { name: `Projects ${n}` }).click();
    await expect(web.getByRole('heading', { level: 1 })).toHaveText(`Projects ${n}`);
    await web.getByRole('link', { name: `უნარი ${n}` }).click();
    await expect(web).toHaveURL(new RegExp(`/en/explore/projects/e2e-pc-${n}/e2e-skill-${n}$`));
  }

  // Search answers (no gigs yet in this slice).
  await web.goto(`${WEB}/search?q=${encodeURIComponent(top.ka)}`);
  await expect(web.getByRole('heading', { level: 1 })).toContainText(top.ka);

  // Staff: the top category is in use (child + project category), so it cannot be deleted; then clean up.
  page.on('dialog', (d) => void d.accept());
  await page.goto('/categories');
  await (await rowOf(page, 'category-row', top.ka)).getByRole('button', { name: 'წაშლა' }).click();
  await expect(page.getByText('ეს ელემენტი ჯერ კიდევ გამოიყენება და ვერ წაიშლება.')).toBeVisible();

  await page.goto('/skills');
  await (
    await rowOf(page, 'skill-row', `უნარი ${n}`)
  )
    .getByRole('button', { name: 'წაშლა' })
    .click();
  await expect(page.getByTestId('skill-row').filter({ hasText: `უნარი ${n}` })).toHaveCount(0);
  await page.goto('/project-categories');
  await (
    await rowOf(page, 'project-category-row', `პროექტები ${n}`)
  )
    .getByRole('button', { name: 'წაშლა' })
    .click();
  await expect(
    page.getByTestId('project-category-row').filter({ hasText: `პროექტები ${n}` }),
  ).toHaveCount(0);
  await page.goto('/categories');
  for (const name of [child.ka, sub.ka, top.ka]) {
    await (await rowOf(page, 'category-row', name)).getByRole('button', { name: 'წაშლა' }).click();
    await expect(page.getByTestId('category-row').filter({ hasText: name })).toHaveCount(0);
  }
  expect((await web.goto(`${WEB}/categories/${top.slug}`))?.status()).toBe(404);
});
