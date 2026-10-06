// Unit tests for the shared category colour function (spec 3X AC-5, R-1.3/R-1.4, ADR-023) and the 3X token bounds.
// Run: node --test packages/tokens/test   (no dependencies)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as color from '../src/category-color.mjs';
import { categoryThemeChecks } from '../src/category-checks.mjs';
import * as prototype from '../../../docs/05-design/refresh/derive-category-color.mjs';

const {
  deriveCategoryColor, categoryStyle, categoryTheme, categoryStarter, categoryReserved, categoryBrand,
  categorySimilarDeltaE, categoryReservedDeltaE, deltaE, contrastRatio, findSimilar, findDuplicate, findReserved,
  nextStarterColor, isCategoryColor, normalizeCategoryColor,
} = color;
const tokens = JSON.parse(readFileSync(fileURLToPath(new URL('../tokens.json', import.meta.url)), 'utf8'));
const MODES = ['light', 'dark'];
const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const failuresOf = (h) => {
  const d = deriveCategoryColor(h);
  return MODES.flatMap((m) => categoryThemeChecks(d[m], m).filter((r) => !r.pass).map((r) => `${h} ${m} ${r.check} on ${r.bg} = ${r.ratio.toFixed(2)}`));
};

test('AC-5: every colour of a 16-step RGB grid (4,096 incl. white, black, greys) meets every contrast rule in both modes', () => {
  const steps = [...Array(16)].map((_, i) => i * 17);
  const fails = [];
  for (const r of steps) for (const g of steps) for (const b of steps) fails.push(...failuresOf(hex(r, g, b)));
  assert.deepEqual(fails.slice(0, 10), []);
});

test('AC-5: 1,500 seeded random colours meet every contrast rule in both modes', () => {
  let seed = 0x3a5;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const fails = [];
  for (let i = 0; i < 1500; i++) fails.push(...failuresOf(hex(...[0, 0, 0].map(() => Math.floor(rnd() * 256)))));
  assert.deepEqual(fails.slice(0, 10), []);
});

test('the brand fallback set meets the same rules', () => {
  for (const m of MODES) assert.deepEqual(categoryThemeChecks(categoryBrand[m], m).filter((r) => !r.pass), []);
});

test('every derived value is a colour; onSolid is white or neutral.950; glow is solid + alpha', () => {
  for (const { color: c } of categoryStarter) {
    for (const m of MODES) {
      const t = deriveCategoryColor(c)[m];
      for (const [k, v] of Object.entries(t)) assert.match(v, k === 'glow' ? /^#[0-9A-F]{8}$/ : /^#[0-9A-F]{6}$/, `${c} ${m} ${k}`);
      assert.ok(['#FFFFFF', '#161616'].includes(t.onSolid));
      assert.equal(t.glow, t.solid + (m === 'light' ? '59' : '73'));
    }
  }
});

test('the port matches the approved 3X.2 prototype for the filled colours and tints of every starter colour', () => {
  // ink/indicator may be a little stronger: the port also checks the gradient canvas and surface points.
  for (const { color: c } of categoryStarter) {
    const ours = deriveCategoryColor(c);
    const proto = prototype.deriveCategoryColor(c);
    for (const m of MODES) {
      for (const k of ['solid', 'onSolid', 'gradientStart', 'gradientEnd', 'tint', 'tintStrong']) assert.equal(ours[m][k], proto[m][k], `${c} ${m} ${k}`);
    }
  }
});

test('null / undefined give the brand fallback; invalid strings throw; case does not matter; results are frozen and cached', () => {
  assert.equal(deriveCategoryColor(null), categoryBrand);
  assert.equal(deriveCategoryColor(undefined), categoryBrand);
  for (const bad of ['', '7C3AED', '#7C3AE', '#7C3AEDFF', 'red', '#GGGGGG']) assert.throws(() => deriveCategoryColor(bad), TypeError);
  assert.equal(deriveCategoryColor('#7c3aed'), deriveCategoryColor('#7C3AED'));
  assert.ok(Object.isFrozen(deriveCategoryColor('#7C3AED').light));
  assert.equal(categoryBrand.light.solid, tokens.color.brand['600'].$value);
});

test('categoryStyle: both sets as --mt-cat-l-* / --mt-cat-d-* variables; null or invalid gives {}', () => {
  const s = categoryStyle('#2563eb');
  const d = deriveCategoryColor('#2563EB');
  assert.equal(Object.keys(s).length, 18);
  assert.equal(s['--mt-cat-l-solid'], d.light.solid);
  assert.equal(s['--mt-cat-d-on-solid'], d.dark.onSolid);
  assert.equal(s['--mt-cat-l-gradient-start'], d.light.gradientStart);
  assert.equal(s['--mt-cat-d-tint-strong'], d.dark.tintStrong);
  assert.deepEqual(categoryStyle(null), {});
  assert.deepEqual(categoryStyle('#12'), {});
  // tokens.css maps exactly these names.
  const css = readFileSync(fileURLToPath(new URL('../dist/tokens.css', import.meta.url)), 'utf8');
  for (const k of Object.keys(s)) assert.ok(css.includes(`var(${k},`), `tokens.css maps ${k}`);
});

test('categoryTheme (native): one mode; null or invalid -> brand', () => {
  assert.equal(categoryTheme('#DB2777', 'dark'), deriveCategoryColor('#DB2777').dark);
  assert.equal(categoryTheme('#DB2777'), deriveCategoryColor('#DB2777').light);
  assert.equal(categoryTheme(null, 'dark'), categoryBrand.dark);
  assert.equal(categoryTheme('nope', 'light'), categoryBrand.light);
});

// Security review 09 probe P2 (I-52): malformed and CSS-breaking colours never reach a style value.
const MALFORMED = [
  '#123456;}body{background:red', '#123456\n', ' #123456', '#123456 ', '#1234567', '#123', 'red',
  'url(https://evil.example/x)', '#12345\u0000', 'var(--x)', '#１２３４５６', '#١٢٣٤٥٦', 'expression(alert(1))',
  '#123456/*', '#12345"', "#12345'", '#12345<', '', null, 123456, ['#123456'], { hex: '#123456' }, true,
];

test('I-52: every malformed or CSS-breaking colour gives {} / brand, is refused by the validators, and throws in deriveCategoryColor', () => {
  assert.equal(MALFORMED.length, 23);
  for (const bad of MALFORMED) {
    const label = JSON.stringify(bad);
    assert.deepEqual(categoryStyle(bad), {}, label);
    assert.equal(categoryTheme(bad, 'light'), categoryBrand.light, label);
    assert.equal(categoryTheme(bad, 'dark'), categoryBrand.dark, label);
    assert.equal(isCategoryColor(bad), false, label);
    assert.equal(normalizeCategoryColor(bad), null, label);
    if (bad !== null) assert.throws(() => deriveCategoryColor(bad), TypeError, label);
  }
});

test('validators', () => {
  assert.equal(isCategoryColor('#a3a30d'), true);
  assert.equal(isCategoryColor('#A3A30'), false);
  assert.equal(isCategoryColor(null), false);
  assert.equal(normalizeCategoryColor('#a3a30d'), '#A3A30D');
  assert.equal(normalizeCategoryColor('x'), null);
});

test('starter palette: 12 colours in the visual-refresh 8.1 order, the same order as tokens.json, upper-case #RRGGBB', () => {
  assert.deepEqual(categoryStarter.map((s) => s.color), [
    '#7C3AED', '#DB2777', '#2563EB', '#D99A00', '#0EA5E9', '#1E3A8A', '#4D9A1E',
    '#C026D3', '#8B5E34', '#52606D', '#A3A30D', '#9F1239',
  ]);
  // What the API does (ADR-023 §4): Object.values of the JSON group, in key order.
  const fromJson = Object.entries(tokens.category.starter).filter(([k]) => !k.startsWith('$')).map(([, t]) => t.$value);
  assert.deepEqual(fromJson, categoryStarter.map((s) => s.color));
});

test('starter palette never triggers its own warnings (R-1.3, Q-178)', () => {
  for (let i = 0; i < categoryStarter.length; i++) {
    const others = categoryStarter.filter((_, j) => j !== i);
    assert.deepEqual(findSimilar(categoryStarter[i].color, others), [], categoryStarter[i].id);
    assert.deepEqual(findReserved(categoryStarter[i].color), [], categoryStarter[i].id);
  }
});

test('deltaE: zero for the same colour, symmetric, OKLab scale', () => {
  assert.equal(deltaE('#7C3AED', '#7C3AED'), 0);
  assert.equal(deltaE('#7C3AED', '#2563EB'), deltaE('#2563EB', '#7C3AED'));
  assert.ok(Math.abs(deltaE('#000000', '#FFFFFF') - 1) < 1e-3);
  assert.ok(Math.abs(contrastRatio('#000000', '#FFFFFF') - 21) < 1e-9);
});

test('findSimilar: below the threshold only, exact match excluded, closest first, invalid entries skipped', () => {
  const rows = [
    { id: 1, color: '#7C3AED' },
    { id: 2, color: '#7d3bee' },
    { id: 3, color: '#7F40F0' },
    { id: 4, color: '#2563EB' },
    { id: 5, color: null },
  ];
  const r = findSimilar('#7C3AEE', rows);
  assert.deepEqual(new Set(r.map((x) => x.id)), new Set([1, 2, 3]));
  assert.ok(r.every((x, i) => x.deltaE > 0 && x.deltaE < categorySimilarDeltaE && (i === 0 || r[i - 1].deltaE <= x.deltaE)));
  assert.equal(findSimilar('#7c3aed', rows).some((x) => x.id === 1), false, 'exact (any case) is a duplicate, not similar');
  assert.deepEqual(findSimilar('bad', rows), []);
  assert.equal(categorySimilarDeltaE, 0.08);
});

test('findDuplicate: case-insensitive exact match', () => {
  const rows = [{ name: 'Design', color: '#7C3AED' }, { name: 'x', color: null }];
  assert.equal(findDuplicate('#7c3aed', rows)?.name, 'Design');
  assert.equal(findDuplicate('#7C3AEE', rows), undefined);
});

test('findReserved: meaning ids for the reserved colours (brand, error, success, featured)', () => {
  assert.deepEqual(new Set(categoryReserved.map((r) => r.meaning)), new Set(['brand', 'error', 'success', 'featured']));
  assert.equal(categoryReservedDeltaE, 0.06);
  assert.equal(findReserved('#0D696C')[0].meaning, 'brand');
  assert.equal(findReserved('#B91C1D')[0].meaning, 'error');
  assert.equal(findReserved('#15803E')[0].meaning, 'success');
  assert.equal(findReserved('#F48439')[0].meaning, 'featured');
  assert.deepEqual(findReserved('#7C3AED'), []);
});

test('nextStarterColor: first unused starter in order, case-insensitive; null when all 12 are used (ADR-023 §4)', () => {
  assert.equal(nextStarterColor([]), '#7C3AED');
  assert.equal(nextStarterColor(['#7c3aed', null, '#2563EB']), '#DB2777');
  assert.equal(nextStarterColor(categoryStarter.map((s) => s.color)), null);
});

test('the .d.ts declares exactly the exported names', () => {
  const dts = readFileSync(fileURLToPath(new URL('../src/category-color.d.mts', import.meta.url)), 'utf8');
  const declared = [...dts.matchAll(/export declare (?:const|function) (\w+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(declared, Object.keys(color).sort());
});

test('motion tokens stay inside the spec 3X R-4.1 bounds', () => {
  const m = tokens.motion;
  for (const [k, t] of Object.entries(m.duration)) {
    if (k.startsWith('$') || t.$extensions?.['ge.mytask.loop']) continue;
    assert.ok(t.$value <= 400, `duration.${k}`);
  }
  for (const [k, t] of Object.entries(m.distance)) if (!k.startsWith('$') && k.startsWith('lift')) assert.ok(t.$value <= 4, k);
  assert.ok(m.scale.hover.$value <= 1.03 && m.scale.pressed.$value >= 0.98);
  assert.equal(m.stagger.step.$value, 40);
  assert.equal(m.stagger.max.$value, 8);
  assert.equal(m.spring.default.$value.overshootClamping, true);
});
