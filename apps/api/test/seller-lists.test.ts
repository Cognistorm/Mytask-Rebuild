// Project and freelancer lists (ROADMAP 4.2.5; spec 03 AC-27…AC-29, AC-32…AC-34, EC-7, EC-8, P-30): searchProjects
// (empty page until slice 9; S-075 and the category/skill 404 are real), listSellers (listable users with an active
// gig, daily mix) and listHireSellers (exact skill slug or 404; contains-match on slug or name; daily mix). Responses
// are validated against openapi.yaml by the test app. Other test files leave users and gigs behind, so `/sellers`
// tests walk the whole list and look at this file's own users; `/hire` keywords are unique to this file.
import { createHash } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Prisma } from '../src/generated/prisma/client';
import { tbilisiDay } from '../src/modules/catalog/list-rules';
import { SellerListsService } from '../src/modules/catalog/seller-lists.service';
import { PrismaService } from '../src/platform/db/prisma.service';
import { settingsRegistry, SettingsService } from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const tag = Date.now().toString(36);
const next = () => `${tag}${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const userIds = (res: { body: { data: { user: { id: string } }[] } }) =>
  res.body.data.map((c) => c.user.id);
const mixKey = (id: string, day: string) =>
  createHash('md5')
    .update(id + day)
    .digest('hex');

async function user(data: Prisma.UserUpdateInput = {}) {
  const n = next();
  const u = await prisma.user.create({
    data: {
      username: `sl_${n}`,
      email: `sl${n}@example.com`,
      referralCode: `L${n.slice(-7).toUpperCase().padStart(7, '0')}`,
      status: 'active',
      profile: { create: { fullname: 'Seller List' } },
    },
  });
  return Object.keys(data).length ? prisma.user.update({ where: { id: u.id }, data }) : u;
}

async function skills(userId: string, ...list: [name: string, slug: string][]) {
  for (const [name, slug] of list) {
    await prisma.userSkill.create({ data: { userId, name, slug, experience: 'pro' } });
  }
}

let at: { top: string; sub: string; child: string } | undefined;
async function categoryBranch() {
  if (at) return at;
  const make = (parentId: string | null) =>
    prisma.gigCategory.create({
      data: {
        parentId,
        depth: 1,
        slug: `sl-${next()}`,
        translations: { create: [{ locale: 'ka', name: 'გამყიდველები' }] },
      },
    });
  const top = await make(null);
  const sub = await make(top.id);
  const child = await make(sub.id);
  at = { top: top.id, sub: sub.id, child: child.id };
  return at;
}

async function gig(ownerId: string, status: 'active' | 'pending' = 'active') {
  const n = next();
  const branch = await categoryBranch();
  const fileId = crypto.randomUUID();
  await prisma.file.create({
    data: {
      id: fileId,
      purpose: 'gig_thumbnail',
      ownerUserId: ownerId,
      bucket: 'public_media',
      objectKey: `images/${fileId}/large.webp`,
      originalName: 'a.png',
      declaredType: 'image/png',
      sizeBytes: 1000n,
      status: 'ready',
      readyAt: new Date(),
      width: 800,
      height: 600,
      variants: {
        thumb: `images/${fileId}/thumb.webp`,
        medium: `images/${fileId}/medium.webp`,
        large: `images/${fileId}/large.webp`,
      },
    },
  });
  return prisma.gig.create({
    data: {
      uid: `L${n}`.toUpperCase().slice(0, 20),
      slug: `gig-${n}`,
      ownerId,
      categoryId: branch.top,
      subcategoryId: branch.sub,
      childcategoryId: branch.child,
      priceTetri: 5000n,
      deliveryDays: 3,
      revisionsAllowed: 1,
      status,
      thumbnailFileId: fileId,
      publishedAt: new Date(),
      translations: {
        create: [{ locale: 'ka', title: `განცხადება ${n}`, description: '<p>ა</p>' }],
      },
    },
  });
}

/** Every card of a list, page by page (100 per page). */
async function walk(path: string) {
  const all: { user: { id: string; username: string }; skills: unknown[] }[] = [];
  for (let page = 1; ; page += 1) {
    const res = await http().get(path).query({ limit: 100, page });
    expect(res.status).toBe(200);
    all.push(...res.body.data);
    if (res.body.nextCursor === null) {
      expect(all).toHaveLength(res.body.totalCount);
      return all;
    }
  }
}

async function setS075(value: boolean) {
  const key = settingsRegistry['S-075'].key;
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId: 'S-075', value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await prisma?.setting.deleteMany({ where: { registerId: 'S-075' } });
  await app?.close();
});

describe('listSellers (AC-27, P-30, R-S7)', () => {
  it('lists listable users with at least one active gig, in the daily mix order', async () => {
    const withGig = await user();
    await gig(withGig.id);
    const verified = await user({ status: 'verified' });
    await gig(verified.id);
    const pendingGigOnly = await user();
    await gig(pendingGigOnly.id, 'pending');
    const noGig = await user();
    const banned = await user({ status: 'banned' });
    await gig(banned.id);
    const restricted = await user({ isRestricted: true });
    await gig(restricted.id);
    const deleted = await user({ deletedAt: new Date() });
    await gig(deleted.id);
    const pending = await user({ status: 'pending' });
    await gig(pending.id);

    const listed = (await walk('/api/v1/sellers')).map((c) => c.user.id);
    expect(listed).toEqual(expect.arrayContaining([withGig.id, verified.id]));
    for (const u of [pendingGigOnly, noGig, banned, restricted, deleted, pending]) {
      expect(listed).not.toContain(u.id);
    }
    // One entry per user, however many gigs.
    await gig(withGig.id);
    const again = (await walk('/api/v1/sellers')).map((c) => c.user.id);
    expect(again.filter((id) => id === withGig.id)).toHaveLength(1);
    // Daily mix: md5(id ‖ Tbilisi date), the same for everyone on the day.
    const day = tbilisiDay(new Date());
    const expected = [...again].sort((a, b) => mixKey(a, day).localeCompare(mixKey(b, day)));
    expect(again).toEqual(expected);
  });

  it('shows the user summary and the first 3 skills, oldest first', async () => {
    const u = await user();
    await gig(u.id);
    await skills(u.id, ['Logo', 'logo'], ['Web', 'web'], ['SEO', 'seo'], ['Copy', 'copy']);
    const card = (await walk('/api/v1/sellers')).find((c) => c.user.id === u.id);
    expect(card).toEqual({
      user: expect.objectContaining({ id: u.id, username: u.username, isIdVerified: false }),
      skills: [
        { name: 'Logo', slug: 'logo' },
        { name: 'Web', slug: 'web' },
        { name: 'SEO', slug: 'seo' },
      ],
    });
  });

  it('pages: page and cursor walk the same order; a page after the last is empty; page + cursor → 400', async () => {
    const all = userIds({ body: { data: await walk('/api/v1/sellers') } });
    expect(all.length).toBeGreaterThanOrEqual(2);
    const byPage = [
      ...userIds(await http().get('/api/v1/sellers').query({ limit: 1, page: 1 })),
      ...userIds(await http().get('/api/v1/sellers').query({ limit: 1, page: 2 })),
    ];
    const first = await http().get('/api/v1/sellers').query({ limit: 1 });
    const second = await http()
      .get('/api/v1/sellers')
      .query({ limit: 1, cursor: first.body.nextCursor });
    expect([...userIds(first), ...userIds(second)]).toEqual(byPage);
    expect(byPage).toEqual(all.slice(0, 2));

    const after = await http()
      .get('/api/v1/sellers')
      .query({ page: all.length + 1, limit: 1 });
    expect(after.body).toEqual({ data: [], nextCursor: null, totalCount: all.length });
    const both = await http()
      .get('/api/v1/sellers')
      .query({ page: 1, cursor: first.body.nextCursor });
    expect(both.status).toBe(400);
    expect((await http().get('/api/v1/sellers').query({ cursor: 'bm9wZQ' })).status).toBe(400);
  });

  it('the mix changes with the Tbilisi date', async () => {
    const service = app.get(SellerListsService);
    const mine: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const u = await user();
      await gig(u.id);
      mine.push(u.id);
    }
    const order = async (now: Date) => {
      const page = await service.sellers({ limit: 100, page: 1 }, 'ka', now);
      const total = page.totalCount ?? 0;
      const ids: string[] = [];
      for (let p = 1; ids.length < total; p += 1) {
        const res = await service.sellers({ limit: 100, page: p }, 'ka', now);
        ids.push(...(res.data as { user: { id: string } }[]).map((c) => c.user.id));
      }
      return ids.filter((id) => mine.includes(id));
    };
    // 15:00 and 19:59 UTC on 2 Oct are the same Tbilisi day (UTC+4); 20:00 UTC is the next day.
    const a = await order(new Date('2026-10-02T15:00:00Z'));
    expect(await order(new Date('2026-10-02T19:59:00Z'))).toEqual(a);
    const sorted = (day: string) =>
      [...mine].sort((x, y) => mixKey(x, day).localeCompare(mixKey(y, day)));
    expect(a).toEqual(sorted('2026-10-02'));
    expect(await order(new Date('2026-10-02T20:00:00Z'))).toEqual(sorted('2026-10-03'));
  });
});

describe('listHireSellers (AC-28, AC-29, EC-7)', () => {
  it('404 when no user skill has exactly this slug, even if one contains it (AC-29)', async () => {
    const k = `hx${next()}`;
    const u = await user();
    await skills(u.id, ['Something', `${k}-pro`]);
    const res = await http().get(`/api/v1/hire/${k}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('returns the skill and users with a skill whose slug or name contains the keyword, no gig needed', async () => {
    const k = `hk${next()}`;
    const exact = await user();
    await skills(exact.id, ['Exact Name', k]);
    const bySlug = await user({ status: 'verified' });
    await skills(bySlug.id, ['Other', `pre-${k}-post`]);
    const byName = await user();
    await skills(byName.id, [`Big ${k.toUpperCase()} work`, 'unrelated-slug']);
    const other = await user();
    await skills(other.id, ['Nothing', 'nothing']);
    const banned = await user({ status: 'banned' });
    const restricted = await user({ isRestricted: true });
    const deleted = await user({ deletedAt: new Date() });
    for (const u of [banned, restricted, deleted]) await skills(u.id, ['X', k]);

    const res = await http().get(`/api/v1/hire/${k}`).query({ limit: 42 });
    expect(res.status).toBe(200);
    expect(res.body.skill).toEqual({ name: 'Exact Name', slug: k });
    expect(res.body.totalCount).toBe(3);
    expect(new Set(userIds(res))).toEqual(new Set([exact.id, bySlug.id, byName.id]));
    const day = tbilisiDay(new Date());
    expect(userIds(res)).toEqual(
      [exact.id, bySlug.id, byName.id].sort((a, b) => mixKey(a, day).localeCompare(mixKey(b, day))),
    );
    // Skill chips are the user's own skills, not only the matching one.
    const card = res.body.data.find((c: { user: { id: string } }) => c.user.id === byName.id);
    expect(card.skills).toEqual([{ name: `Big ${k.toUpperCase()} work`, slug: 'unrelated-slug' }]);
  });

  it('two users with the same slug: both listed, the title uses the oldest skill (EC-7)', async () => {
    const k = `he${next()}`;
    const first = await user();
    await skills(first.id, ['First Name', k]);
    const second = await user();
    await skills(second.id, ['Second Name', k]);
    const res = await http().get(`/api/v1/hire/${k}`);
    expect(res.body.skill.name).toBe('First Name');
    expect(new Set(userIds(res))).toEqual(new Set([first.id, second.id]));
  });

  it('treats LIKE wildcards in the keyword literally and pages with cursor and page', async () => {
    const k = `hw${next()}`;
    const u = await user();
    await skills(u.id, ['A', k]);
    const decoy = await user();
    await skills(decoy.id, ['B', `${k}x`]);
    // `_` would match any one character if it were not escaped.
    const wild = await user();
    await skills(wild.id, ['C', `${k}_`]);
    const res = await http().get(`/api/v1/hire/${encodeURIComponent(`${k}_`)}`);
    expect(res.status).toBe(200);
    expect(userIds(res)).toEqual([wild.id]);

    const p1 = await http().get(`/api/v1/hire/${k}`).query({ limit: 2, page: 1 });
    expect(p1.body.totalCount).toBe(3);
    const c2 = await http()
      .get(`/api/v1/hire/${k}`)
      .query({ limit: 2, cursor: p1.body.nextCursor });
    const p2 = await http().get(`/api/v1/hire/${k}`).query({ limit: 2, page: 2 });
    expect(userIds(c2)).toEqual(userIds(p2));
    expect(c2.body.nextCursor).toBeNull();
    expect(new Set([...userIds(p1), ...userIds(p2)])).toEqual(new Set([u.id, decoy.id, wild.id]));
  });
});

describe('searchProjects (AC-32…AC-34)', () => {
  async function projectCategory(isActive = true) {
    const n = next();
    return prisma.projectCategory.create({
      data: {
        slug: `pc-${n}`,
        isActive,
        translations: { create: [{ locale: 'ka', name: `პროექტი ${n}` }] },
      },
    });
  }
  async function skill(projectCategoryId: string, isActive = true) {
    const n = next();
    return prisma.skill.create({
      data: {
        projectCategoryId,
        slug: `sk-${n}`,
        isActive,
        translations: { create: [{ locale: 'ka', name: `უნარი ${n}` }] },
      },
    });
  }
  const search = (query: Record<string, string | number>) =>
    http().get('/api/v1/search/projects').query(query);

  it('S-075 OFF → 403 FEATURE_DISABLED; ON → an empty page until slice 9 (AC-34)', async () => {
    await setS075(false);
    const off = await search({ q: 'logo' });
    expect(off.status).toBe(403);
    expect(off.body.code).toBe('FEATURE_DISABLED');
    await setS075(true);
    const on = await search({ q: 'logo', limit: 40 });
    expect(on.status).toBe(200);
    expect(on.body).toEqual({ data: [], nextCursor: null, totalCount: 0 });
  });

  it('404 for an unknown or inactive category or skill, or a skill outside the category (AC-33)', async () => {
    await setS075(true);
    const cat = await projectCategory();
    const otherCat = await projectCategory();
    const inactiveCat = await projectCategory(false);
    const sk = await skill(cat.id);
    const otherSkill = await skill(otherCat.id);
    const inactiveSkill = await skill(cat.id, false);

    expect((await search({ projectCategoryId: cat.id })).status).toBe(200);
    expect((await search({ projectCategoryId: cat.id, skillId: sk.id })).status).toBe(200);
    expect((await search({ skillId: sk.id })).status).toBe(200);
    for (const query of <Record<string, string>[]>[
      { projectCategoryId: crypto.randomUUID() },
      { projectCategoryId: inactiveCat.id },
      { projectCategoryId: cat.id, skillId: otherSkill.id },
      { projectCategoryId: cat.id, skillId: inactiveSkill.id },
      { skillId: crypto.randomUUID() },
    ]) {
      const res = await search(query);
      expect(res.status, JSON.stringify(query)).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    }
  });

  it('checks the paging and the parameter formats (400)', async () => {
    await setS075(true);
    expect((await search({ page: 1, cursor: 'bzow' })).status).toBe(400);
    expect((await search({ cursor: 'bm9wZQ' })).status).toBe(400);
    expect((await search({ projectCategoryId: 'not-a-uuid' })).status).toBe(400);
  });
});
