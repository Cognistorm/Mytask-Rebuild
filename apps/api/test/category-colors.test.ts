// Category colours (ROADMAP 3X.7; ADR-023; spec 3X R-1, AC-6, AC-7, EC-2; spec 03 AC-38/39; spec 16 AC-60a/61a):
// the migration's starter assignment, the database rules, the resolved colour on every public and admin read, and
// the admin create/update rules (default, level, duplicate, audit, cache). Responses are validated against
// openapi.yaml by the test app. Other test files leave top-level categories behind, so tests that depend on which
// starter colours are free first clear every top-level colour (files run one after another).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import tokens from '@mytask/tokens/tokens.json';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CATEGORY_STARTER, firstUnusedStarter } from '../src/modules/catalog/category-colors';
import { CategoriesService } from '../src/modules/catalog/categories.service';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService, settingsRegistry } from '../src/platform/settings/settings.service';
import { createTestApp } from './app';
import { makeStaff } from './test-staff';

let app: NestExpressApplication;
let prisma: PrismaService;
let staff: { id: string; auth: { Authorization: string } };
let seq = 0;
const tag = Date.now().toString(36);
const slug = (name = 'c') => `cc-${tag}-${name}-${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const ADMIN = '/api/v1/admin/categories';
const en = { 'Accept-Language': 'en' };

/**
 * Security review 09 probe P1 (I-52): malformed and CSS-breaking colours. Each must answer 400 on create and update,
 * so a later change to the request schema cannot let one through unnoticed.
 */
const MALFORMED: unknown[] = [
  '#123456;}body{background:red',
  '#123456\n',
  ' #123456',
  '#123456 ',
  '#1234567',
  '#123',
  'red',
  'url(https://evil.example/x)',
  '#12345\u0000',
  'var(--x)',
  '#１２３４５６',
  '#١٢٣٤٥٦',
  'expression(alert(1))',
  '#123456/*',
  '#12345"',
  "#12345'",
  '#12345<',
  '',
  null,
  123456,
  ['#123456'],
  { hex: '#123456' },
  true,
];

type AdminCategory = {
  id: string;
  depth: number;
  color: string | null;
  resolvedColor: string | null;
};
type Ref = { id: string; color: string | null };
type Node = Ref & { children: Node[] };

const MIGRATION = readFileSync(
  join(__dirname, '../prisma/migrations/20261006120000_category_colors/migration.sql'),
  'utf8',
);

const create = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  http()
    .post(ADMIN)
    .set(staff.auth)
    .set(headers)
    .send({ name: { ka: 'ფერადი', en: `Colored ${tag}` }, slug: slug(), ...body });
async function created(body: Record<string, unknown> = {}): Promise<AdminCategory> {
  const res = await create(body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as AdminCategory;
}
const update = (id: string, body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  http().patch(`${ADMIN}/${id}`).set(staff.auth).set(headers).send(body);

/** Frees every starter colour (other files' categories included) so a test controls the default pick. */
const clearColors = () => prisma.gigCategory.updateMany({ data: { color: null } });

async function branch(color: string) {
  const top = await created({ color });
  const sub = await created({ parentId: top.id });
  const child = await created({ parentId: sub.id });
  return { top, sub, child };
}

const find = (nodes: Node[], id: string): Node | undefined => {
  for (const n of nodes) {
    if (n.id === id) return n;
    const hit = find(n.children, id);
    if (hit) return hit;
  }
  return undefined;
};
const treeNode = async (id: string) =>
  find((await http().get('/api/v1/categories')).body.categories as Node[], id);

async function setSetting(id: 'S-075' | 'S-107', value: boolean) {
  const key = settingsRegistry[id].key;
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId: id, value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}

beforeAll(async () => {
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp();
  prisma = app.get(PrismaService);
  staff = await makeStaff(app, ['catalog.write']);
  await clearColors();
});
// The general limiter allows 120 staff writes per IP and minute; this file alone sends more (the probe list is 46),
// and on a fast runner they land in one minute window. Each test starts with a fresh window.
beforeEach(async () => {
  const redis = app.get(RedisService).client;
  const keys = await redis.keys('rl:*');
  if (keys.length) await redis.del(...keys);
});
afterAll(async () => {
  await prisma?.setting.deleteMany({ where: { registerId: { in: ['S-075', 'S-107'] } } });
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
});

describe('starter palette (ADR-023 §4)', () => {
  it('is category.starter of packages/tokens in JSON order: 12 upper-case colours', () => {
    const fromJson = Object.entries(tokens.category.starter)
      .filter(([k]) => !k.startsWith('$'))
      .map(([, t]) => (t as { $value: string }).$value);
    expect(CATEGORY_STARTER).toEqual(fromJson);
    expect(CATEGORY_STARTER).toHaveLength(12);
    for (const c of CATEGORY_STARTER) expect(c).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('the migration assigns the same list, in the same order', () => {
    const listed = [...MIGRATION.matchAll(/\((\d+), '(#[0-9A-F]{6})'\)/g)].map((m) => [
      Number(m[1]),
      m[2],
    ]);
    expect(listed).toEqual(CATEGORY_STARTER.map((c, i) => [i + 1, c]));
  });

  it('firstUnusedStarter takes the first free one, null when all 12 are used', () => {
    expect(firstUnusedStarter([])).toBe(CATEGORY_STARTER[0]);
    expect(firstUnusedStarter([CATEGORY_STARTER[0]!, null, '#123456'])).toBe(CATEGORY_STARTER[1]);
    expect(firstUnusedStarter(CATEGORY_STARTER)).toBeNull();
  });
});

describe('migration and database rules (ADR-023 §1)', () => {
  it('backfills top-level categories in position, then id order; 13th and later stay null; children never', async () => {
    await clearColors();
    const top = await created();
    await prisma.gigCategory.update({ where: { id: top.id }, data: { position: -1000 } });
    const sub = await created({ parentId: top.id });
    // Re-run the migration's assignment on the current rows.
    const backfill = MIGRATION.slice(MIGRATION.indexOf('WITH "starter"'));
    await prisma.$executeRawUnsafe(backfill);
    const rows = await prisma.gigCategory.findMany({
      where: { depth: 1 },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    expect(rows[0]!.id).toBe(top.id);
    expect(rows.map((r) => r.color)).toEqual(rows.map((_, i) => CATEGORY_STARTER[i] ?? null));
    expect(
      (await prisma.gigCategory.findUniqueOrThrow({ where: { id: sub.id } })).color,
    ).toBeNull();
    await clearColors();
  });

  it('refuses a colour below the top level, lower case or a bad format, and a second top-level holder', async () => {
    await clearColors();
    const { top, sub } = await branch('#123456');
    const set = (id: string, color: string) =>
      prisma.gigCategory.update({ where: { id }, data: { color } });
    await expect(set(sub.id, '#654321')).rejects.toThrow();
    await expect(set(top.id, '#abcdef')).rejects.toThrow();
    await expect(set(top.id, '123456')).rejects.toThrow();
    const other = await created({ color: '#222222' });
    await expect(set(other.id, '#123456')).rejects.toThrow();
  });
});

describe('adminCreateCategory colour (spec 16 AC-60a, spec 3X AC-6)', () => {
  it('a top-level category without a colour gets the first unused starter colour; none left → null', async () => {
    await clearColors();
    const first = await created();
    expect(first).toMatchObject({ color: CATEGORY_STARTER[0], resolvedColor: CATEGORY_STARTER[0] });
    const chosen = await created({ color: CATEGORY_STARTER[1] });
    expect(chosen.color).toBe(CATEGORY_STARTER[1]);
    expect((await created()).color).toBe(CATEGORY_STARTER[2]);
    for (const c of CATEGORY_STARTER.slice(3)) await created({ color: c });
    const none = await created();
    expect(none).toMatchObject({ color: null, resolvedColor: null });
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'category.create', targetId: first.id },
    });
    expect(audit.after).toMatchObject({ color: CATEGORY_STARTER[0] });
    await clearColors();
  });

  it('concurrent creates without a colour get different starter colours (advisory lock)', async () => {
    await clearColors();
    const made = await Promise.all([created(), created(), created()]);
    expect(new Set(made.map((c) => c.color))).toEqual(new Set(CATEGORY_STARTER.slice(0, 3)));
  });

  it('stores any case upper case; sub-/child categories hold none and resolve the top-level colour', async () => {
    const { top, sub, child } = await branch('#a1b2c3');
    expect(top).toMatchObject({ color: '#A1B2C3', resolvedColor: '#A1B2C3' });
    expect(sub).toMatchObject({ color: null, resolvedColor: '#A1B2C3' });
    expect(child).toMatchObject({ color: null, resolvedColor: '#A1B2C3' });
    const list = (await http().get(ADMIN).set(staff.auth)).body.categories as AdminCategory[];
    expect(list.find((c) => c.id === child.id)).toMatchObject({ resolvedColor: '#A1B2C3' });
    const one = await http().get(`${ADMIN}/${sub.id}`).set(staff.auth);
    expect(one.body).toMatchObject({ color: null, resolvedColor: '#A1B2C3' });
  });

  it('400 pattern for a bad format, 400 top_level_only with a parent', async () => {
    const bad = await create({ color: '#12345G' }, en);
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({
      code: 'VALIDATION_FAILED',
      details: {
        fields: [{ field: 'color', code: 'pattern', messageKey: 't_category_color_invalid' }],
      },
    });
    expect(bad.body.details.fields[0].message).toContain('6 hex digits');
    const top = await created({ color: '#0A0B0C' });
    const res = await create({ parentId: top.id, color: '#0D0E0F' });
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toEqual([
      expect.objectContaining({
        field: 'color',
        code: 'top_level_only',
        messageKey: 't_category_color_top_level_only',
      }),
    ]);
  });

  it('400 for every malformed or CSS-breaking colour of the security probe (I-52), on create and update', async () => {
    expect(MALFORMED).toHaveLength(23);
    const top = await created({ color: '#0B0C0D' });
    for (const color of MALFORMED) {
      const made = await create({ color });
      expect(made.status, `create ${JSON.stringify(color)}`).toBe(400);
      expect(made.body.code).toBe('VALIDATION_FAILED');
      const changed = await update(top.id, { color });
      expect(changed.status, `update ${JSON.stringify(color)}`).toBe(400);
      expect(changed.body.code).toBe('VALIDATION_FAILED');
    }
    const kept = await http().get(`${ADMIN}/${top.id}`).set(staff.auth);
    expect(kept.body.color).toBe('#0B0C0D');
  });

  it('409 DUPLICATE names the category that has the colour (any case), in the request language', async () => {
    const holder = await created({ color: '#3B3B3B', name: { ka: 'მფლობელი', en: 'Holder' } });
    const res = await create({ color: '#3b3b3b' }, en);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 'DUPLICATE',
      details: {
        field: 'color',
        category: { id: holder.id, name: 'Holder' },
        messageKey: 't_category_color_taken',
      },
    });
    expect(res.body.message).toBe('This color is already used by Holder. Choose another color.');
    const ka = await create({ color: '#3B3B3B' });
    expect(ka.body.details.category.name).toBe('მფლობელი');
    expect(ka.body.message).toContain('„მფლობელი“');
  });

  it('two concurrent saves of one free colour: one wins, the other gets 409 DUPLICATE (EC-2)', async () => {
    const results = await Promise.all([create({ color: '#4C4C4C' }), create({ color: '#4C4C4C' })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(results.find((r) => r.status === 409)!.body.details.field).toBe('color');
  });

  it('a slug clash still answers 409 DUPLICATE with field slug', async () => {
    const c = await created({ color: '#5D5D5D' });
    const top = await http().get(`${ADMIN}/${c.id}`).set(staff.auth);
    const res = await create({ slug: top.body.slug, color: '#5E5E5E' });
    expect(res.status).toBe(409);
    expect(res.body.details).toMatchObject({ field: 'slug' });
  });
});

describe('adminUpdateCategory colour (spec 16 AC-60a, spec 3X AC-7)', () => {
  it('changes the colour, audited before/after, and the public tree shows it at once', async () => {
    const { top, child } = await branch('#6A6A6A');
    expect((await treeNode(child.id))?.color).toBe('#6A6A6A');
    const res = await update(top.id, { color: '#6b6b6b' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({ color: '#6B6B6B', resolvedColor: '#6B6B6B' });
    expect((await treeNode(top.id))?.color).toBe('#6B6B6B');
    expect((await treeNode(child.id))?.color).toBe('#6B6B6B');
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'category.update', targetId: top.id },
      orderBy: { id: 'desc' },
    });
    expect(audit.before).toMatchObject({ color: '#6A6A6A' });
    expect(audit.after).toMatchObject({ color: '#6B6B6B' });
  });

  it('saving its own colour again is fine; a field left out keeps the colour; it cannot be cleared', async () => {
    const top = await created({ color: '#7A7A7A' });
    expect((await update(top.id, { color: '#7a7a7a' })).status).toBe(200);
    const moved = await update(top.id, { position: 5 });
    expect(moved.body.color).toBe('#7A7A7A');
    expect((await update(top.id, { color: null })).status).toBe(400);
  });

  it('refuses a sub-category colour (400 top_level_only) and a taken colour (409)', async () => {
    const { sub } = await branch('#8A8A8A');
    const other = await created({ color: '#8B8B8B', name: { ka: 'სხვა', en: 'Other' } });
    const level = await update(sub.id, { color: '#8C8C8C' });
    expect(level.status).toBe(400);
    expect(level.body.details.fields[0]).toMatchObject({ field: 'color', code: 'top_level_only' });
    const top = await created({ color: '#8D8D8D' });
    const taken = await update(top.id, { color: '#8B8B8B' }, en);
    expect(taken.status).toBe(409);
    expect(taken.body.details).toMatchObject({
      field: 'color',
      category: { id: other.id, name: 'Other' },
    });
  });

  it('the public tree keeps its 60 s cache for writes that bypass the admin API', async () => {
    const top = await created({ color: '#9A9A9A' });
    expect((await treeNode(top.id))?.color).toBe('#9A9A9A');
    await prisma.gigCategory.update({ where: { id: top.id }, data: { color: '#9B9B9B' } });
    expect((await treeNode(top.id))?.color).toBe('#9A9A9A');
    app.get(CategoriesService).invalidate();
    expect((await treeNode(top.id))?.color).toBe('#9B9B9B');
  });
});

describe('public reads return the resolved colour (spec 03 AC-38, AC-39)', () => {
  it('lookupCategory / getCategory: the page, breadcrumb and children carry the top-level colour', async () => {
    const { top, sub, child } = await branch('#AA1111');
    const tops = await http().get(`/api/v1/categories/${top.id}`);
    const subRow = await prisma.gigCategory.findUniqueOrThrow({ where: { id: sub.id } });
    const childRow = await prisma.gigCategory.findUniqueOrThrow({ where: { id: child.id } });
    const topRow = await prisma.gigCategory.findUniqueOrThrow({ where: { id: top.id } });
    expect(tops.body.color).toBe('#AA1111');
    expect(tops.body.children).toEqual([expect.objectContaining({ id: sub.id, color: '#AA1111' })]);
    const page = await http()
      .get('/api/v1/categories/lookup')
      .query({ path: `${topRow.slug}/${subRow.slug}/${childRow.slug}` });
    expect(page.status).toBe(200);
    expect(page.body.color).toBe('#AA1111');
    expect(page.body.breadcrumb.map((b: Ref) => b.color)).toEqual([
      '#AA1111',
      '#AA1111',
      '#AA1111',
    ]);
  });

  it('a top-level category without a colour answers null everywhere (brand fallback)', async () => {
    const { top, child } = await branch('#AB1111');
    await prisma.gigCategory.update({ where: { id: top.id }, data: { color: null } });
    app.get(CategoriesService).invalidate();
    expect((await treeNode(child.id))?.color).toBeNull();
    expect((await http().get(`/api/v1/categories/${child.id}`)).body.color).toBeNull();
    expect(
      (await http().get(`${ADMIN}/${child.id}`).set(staff.auth)).body.resolvedColor,
    ).toBeNull();
  });

  it('getHome: category rows and featured tiles carry the top-level colour', async () => {
    await setSetting('S-107', true);
    const top = await created({ color: '#AC1111' });
    const home = await http().get('/api/v1/home');
    expect(home.status).toBe(200);
    const row = home.body.categoryRows.find((r: { category: Ref }) => r.category.id === top.id);
    expect(row.category.color).toBe('#AC1111');
    const tile = home.body.featuredCategories.find(
      (f: { category: Ref }) => f.category.id === top.id,
    );
    expect(tile.category.color).toBe('#AC1111');
  });

  it('project categories: the linked top-level colour, null without a link (public and admin)', async () => {
    await setSetting('S-075', true);
    const top = await created({ color: '#AD1111' });
    const name = { create: [{ locale: 'ka' as const, name: 'პროექტი' }] };
    const linked = await prisma.projectCategory.create({
      data: { slug: slug('p'), gigCategoryId: top.id, translations: name },
    });
    const loose = await prisma.projectCategory.create({
      data: { slug: slug('p'), translations: name },
    });
    const list = (await http().get('/api/v1/project-categories')).body.projectCategories as Ref[];
    expect(list.find((p) => p.id === linked.id)?.color).toBe('#AD1111');
    expect(list.find((p) => p.id === loose.id)?.color).toBeNull();
    const one = await http().get('/api/v1/project-categories/lookup').query({ slug: linked.slug });
    expect(one.body.projectCategory.color).toBe('#AD1111');
    const admin = await http().get(`/api/v1/admin/project-categories/${linked.id}`).set(staff.auth);
    expect(admin.status).toBe(200);
    expect(admin.body).toMatchObject({ color: '#AD1111', gigCategory: { id: top.id } });
    const adminLoose = await http()
      .get(`/api/v1/admin/project-categories/${loose.id}`)
      .set(staff.auth);
    expect(adminLoose.body.color).toBeNull();
  });
});
