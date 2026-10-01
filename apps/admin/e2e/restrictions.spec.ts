// Slice 01 part B-2b main flow across both apps (spec 01 AC-19, AC-46, AC-47, AC-49): staff restrict a user
// in the admin, the user is sent to the web restrictions removal center and appeals, staff reject the appeal.
// Needs the full stack (`pnpm preview`) and its console log, where the seed printed the first Super-admin.
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const WEB = 'http://localhost:3100';
const log = process.env.ADMIN_E2E_LOG;

test('restrict → web appeal → reject', async ({ page, browser, request }) => {
  test.skip(!log, 'needs the full stack (ADMIN_E2E_LOG)');
  const password = /password: (\S+)/.exec(readFileSync(log!, 'utf8'))?.[1];
  test.skip(!password, 'seed output not in this log');

  const n = Date.now().toString(36);
  const email = `rst_${n}@example.com`;
  const reg = await request.post(`${WEB}/api/v1/auth/register`, {
    headers: { 'X-MyTask-Client': 'ios' },
    data: {
      fullName: 'Restricted User',
      username: `rst_${n}`,
      email,
      password: 'Secret123',
      acceptTerms: true,
    },
  });
  expect(reg.status()).toBe(201);
  const userId: string = (await reg.json()).session.user.id;

  // Staff: add the restriction from the admin screen (the EV-08 link format ?userId=…).
  await page.goto('/login');
  await page.getByLabel('მომხმარებელი ან ელ-ფოსტის მისამართი').fill('owner');
  await page.getByLabel('პაროლი', { exact: true }).fill(password!);
  await page.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goto(`/restrictions?userId=${userId}`);
  await expect(page.getByLabel('მომხმარებლის ID')).toHaveValue(userId);
  await page.getByLabel('შეტყობინება').fill(`Explain the reviews ${n}`);
  await page.getByRole('button', { name: 'გაგზავნა' }).click();
  await expect(
    page.getByTestId('restriction').filter({ hasText: `Explain the reviews ${n}` }),
  ).toBeVisible();

  // User: signing in lands on the restrictions removal center; appeal there.
  const userCtx = await browser.newContext();
  const web = await userCtx.newPage();
  await web.goto(`${WEB}/auth/login`);
  await web.getByLabel('ელ-ფოსტა').fill(email);
  await web.getByLabel('პაროლი', { exact: true }).fill('Secret123');
  await web.getByRole('button', { name: 'ავტორიზაცია' }).click();
  await expect(web).toHaveURL(/\/restricted$/);
  await expect(web.getByRole('heading', { name: 'შეზღუდვების მოხსნის ცენტრი' })).toBeVisible();
  await expect(web.getByText(`Explain the reviews ${n}`)).toBeVisible();
  await web.getByLabel('დაწერეთ თქვენი პასუხი აქ').fill('It was a misunderstanding.');
  await web.getByRole('button', { name: 'შეზღუდვის გასაჩივრება' }).click();
  await expect(web.getByText('საჩივარი მიღებულია')).toBeVisible();
  await expect(web.getByRole('button', { name: 'შეზღუდვის გასაჩივრება' })).toHaveCount(0);

  // Staff: the appeal is in the queue; reject it with a reason.
  await page.reload();
  const card = page.getByTestId('appeal').filter({ hasText: 'It was a misunderstanding.' });
  await expect(card).toBeVisible();
  await card.getByLabel('მიზეზი').fill('Not convincing.');
  await card.getByRole('button', { name: 'უარყოფა' }).click();
  await expect(card).toHaveCount(0);
  await expect(
    page.getByTestId('restriction').filter({ hasText: 'Not convincing.' }),
  ).toBeVisible();

  // User: rejected, and no second appeal (AC-49).
  await web.reload();
  await expect(web.getByText('უარყოფილია')).toBeVisible();
  await expect(web.getByRole('button', { name: 'შეზღუდვის გასაჩივრება' })).toHaveCount(0);
  await userCtx.close();
});
