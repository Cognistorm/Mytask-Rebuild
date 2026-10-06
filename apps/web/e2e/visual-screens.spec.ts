// Visual checks of the key screens after the 3X refresh (ROADMAP 3X.18b; spec 3X R-1…R-4, visual-refresh.md §7):
// full-page screenshots in light and dark, at desktop and phone width (360 px: no sideways scroll), and a
// reduced-motion pass (nothing moves, zooms, drifts or shimmers; no content waits for an entrance).
// Pixel baselines are made on the Owner's Windows PC (local first, ADR-020) and compared there only: fonts render
// differently on the Linux CI runner, so CI runs every other check of this file. New baselines after an approved
// look change: `pnpm --filter @mytask/web exec playwright test visual-screens --no-deps --update-snapshots`.
import { expect, test, type Page } from '@playwright/test';
import { BASE } from './base';
import { open, revealAll, SCREENS, signedIn } from './screens';

const PIXELS = process.platform === 'win32';

const sidewaysScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

for (const screen of SCREENS) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [device, viewport] of [
      ['desktop', { width: 1280, height: 900 }],
      ['phone', { width: 360, height: 800 }],
    ] as const) {
      test(`${screen.name}, ${theme}, ${device}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await open(page, screen, theme);
        if (device === 'phone') expect(await sidewaysScroll(page)).toBe(0);
        await revealAll(page);
        if (PIXELS) {
          await expect(page).toHaveScreenshot(`${screen.name}-${theme}-${device}.png`, {
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            maxDiffPixelRatio: 0.01,
          });
        }
      });
    }
  }
}

/** Running animations that loop forever or move/scale something (only fades may remain under reduced motion). */
const movingAnimations = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => {
        const effect = a.effect as KeyframeEffect | null;
        if (!effect) return false;
        if (effect.getTiming().iterations === Infinity) return true;
        return effect
          .getKeyframes()
          .some((k) => ['transform', 'translate', 'scale', 'rotate'].some((p) => p in k));
      })
      .map((a) => (a as CSSAnimation).animationName ?? String(a.id)),
  );

const identity = (t: string) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';

test('the checks below are real: without reduced motion the hero drifts and cards rise in', async ({
  page,
}) => {
  await open(page, SCREENS[0]!, 'light');
  expect(await movingAnimations(page)).toContain('mt-home-drift');
  await expect(page.locator('[data-motion="ready"]').first()).toBeAttached();
});

for (const screen of SCREENS) {
  test(`reduced motion: ${screen.name} — nothing moves, zooms, drifts or shimmers; no hidden content`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', baseURL: BASE });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, screen, 'light');
    expect(await movingAnimations(page)).toEqual([]);
    // Every entrance item is visible without scrolling to it.
    const hidden = await page.evaluate(
      () =>
        [...document.querySelectorAll('.mt-motion-entrance')].filter(
          (el) => getComputedStyle(el).opacity !== '1',
        ).length,
    );
    expect(hidden).toBe(0);
    // A hovered card neither lifts nor zooms its image.
    const card = page.getByTestId('gig-card').first();
    if (await card.count()) {
      await card.hover();
      await page.waitForTimeout(250);
      const t = await card.evaluate((el) => ({
        card: getComputedStyle(el).transform,
        img: el.querySelector('img')
          ? getComputedStyle(el.querySelector('img')!).transform
          : 'none',
      }));
      expect(identity(t.card), t.card).toBe(true);
      expect(identity(t.img), t.img).toBe(true);
      expect(await movingAnimations(page)).toEqual([]);
    }
    await context.close();
  });
}

test('reduced motion: the dashboard skeleton does not shimmer', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', baseURL: BASE });
  const page = await context.newPage();
  await signedIn(page);
  // Hold the dashboard answer so the skeleton stays on screen.
  let release = () => {};
  const held = new Promise<void>((r) => (release = r));
  await page.route('**/api/v1/me/dashboard/selling', async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto('/seller/home');
  const box = page.locator('.mt-skeleton-box').first();
  await expect(box).toBeVisible();
  expect(await box.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  expect(await movingAnimations(page)).toEqual([]);
  release();
  await expect(page.getByTestId('kpi-earnings')).toBeVisible();
  await context.close();
});
