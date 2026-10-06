// Colour-contrast check of the key screens after the 3X refresh (ROADMAP 3X.18c; spec 3X R-4, WCAG 2.2 AA 1.4.3):
// light and dark, desktop and phone, after every entrance item has risen in. Two passes, 0 failures each:
// 1. axe `color-contrast` (solid backgrounds): 0 violations.
// 2. Text axe cannot decide ("needs review": a gradient or a pseudo-element behind it, which is most of the 3X
//    surfaces) is measured here against EVERY colour stop of the gradient behind it, worst case (as the 3X.3 preview
//    check, docs/05-design/refresh/verify-preview.mjs): ≥ 4.5, or ≥ 3 for large text (24 px, or 18.66 px bold).
//    Text on a photo has no colour to measure and is left out.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { measure } from './contrast-measure';
import { open, revealAll, SCREENS } from './screens';

for (const screen of SCREENS) {
  for (const theme of ['light', 'dark'] as const) {
    for (const [device, viewport] of [
      ['desktop', { width: 1280, height: 900 }],
      ['phone', { width: 360, height: 800 }],
    ] as const) {
      test(`contrast: ${screen.name}, ${theme}, ${device}`, async ({ page }, info) => {
        await page.setViewportSize(viewport);
        await open(page, screen, theme);
        await revealAll(page);
        const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
        const violations = result.violations.flatMap((v) =>
          v.nodes.map((n) => `${n.target.join(' ')} — ${n.any[0]?.message ?? n.failureSummary}`),
        );
        expect(violations, violations.join('\n')).toEqual([]);

        const review = result.incomplete.flatMap((v) =>
          v.nodes.map((n) => n.target.join(' ')).filter((t) => !t.includes('>>')),
        );
        const measured = await measure(page, review);
        const low = measured.filter((m) => 'worst' in m && m.worst! < m.need!);
        info.annotations.push({
          type: 'contrast',
          description: `axe ok; ${review.length} on gradients: ${measured.filter((m) => 'worst' in m).length} measured, ${measured.filter((m) => m.skip === 'photo').length} on photos`,
        });
        expect(low, low.map((m) => `${m.sel} ${m.worst} < ${m.need}`).join('\n')).toEqual([]);
      });
    }
  }
}

test('the checks are real: low contrast on a solid colour (axe) and on a card gradient (measured) is caught', async ({
  page,
}) => {
  await open(page, SCREENS[5]!, 'light');
  await page.evaluate(() => {
    const solid = document.createElement('p');
    solid.id = 'low-solid';
    solid.textContent = 'low contrast';
    solid.style.cssText = 'color:#bbbbbb;background:#ffffff';
    const card = document.querySelector('.auth-card')!;
    const onGradient = document.createElement('p');
    onGradient.id = 'low-gradient';
    onGradient.textContent = 'low contrast';
    onGradient.style.color = '#d4d4d8';
    card.append(solid, onGradient);
  });
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  expect(result.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toContain(
    '#low-solid',
  );
  const [m] = await measure(page, ['#low-gradient']);
  expect(m!.worst).toBeLessThan(m!.need!);
});
