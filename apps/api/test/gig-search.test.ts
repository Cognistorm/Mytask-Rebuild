// Gig lists (ROADMAP 4.2.4; spec 03 AC-3, AC-6…AC-21, R-S1…R-S6; spec 02 AC-8): searchGigs with the keyword rule,
// filters, sorts and the Premium-first rule (AC-16 worked example with a PremiumStatus test double), listGigs,
// SearchIndex, and the PremiumStatus seam in Me / profiles. Responses are validated against openapi.yaml by the test
// app. Other test files leave gigs behind, so every query is narrowed to this file's own categories or keywords.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { ratingSummary } from '../src/modules/catalog/gig-cards';
import { GigSearchService } from '../src/modules/catalog/gig-search.service';
import { tbilisiDay } from '../src/modules/catalog/list-rules';
import { SearchIndex } from '../src/modules/catalog/search-index';
import { keywordWords, normalizeSearchText } from '../src/modules/catalog/search-text';
import { PremiumStatus } from '../src/modules/subscriptions/premium-status';
import { PrismaService } from '../src/platform/db/prisma.service';
import { createTestApp } from './app';

/** Premium for the ids in `users` (slice 8 replaces the real seam; the ranking and the badge both ask here). */
class PremiumDouble extends PremiumStatus {
  users = new Set<string>();
  override async activeAmong(ids: readonly string[]) {
    return new Set(ids.filter((id) => this.users.has(id)));
  }
  override async state(userId: string) {
    return this.users.has(userId)
      ? { isActive: true, endsAt: new Date('2027-01-01T00:00:00Z') }
      : { isActive: false, endsAt: null };
  }
  override activeUsersSql() {
    return this.users.size === 0
      ? Prisma.sql`SELECT NULL::uuid WHERE false`
      : Prisma.sql`SELECT unnest(${[...this.users]}::uuid[])`;
  }
}

const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const premium = new PremiumDouble();
let app: NestExpressApplication;
let prisma: PrismaService;
let index: SearchIndex;
let seq = 0;
const tag = Date.now().toString(36);
const next = () => `${tag}${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const search = (query: Record<string, string | number>) =>
  http().get('/api/v1/search/gigs').query(query);
const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((c) => c.id);

async function owner(data: Prisma.UserUpdateInput = {}) {
  const n = next();
  const u = await prisma.user.create({
    data: {
      username: `gs_${n}`,
      email: `gs${n}@example.com`,
      referralCode: `G${n.slice(-7).toUpperCase().padStart(7, '0')}`,
      status: 'active',
      profile: { create: { fullname: 'Gig Search' } },
    },
  });
  return Object.keys(data).length
    ? prisma.user.update({ where: { id: u.id }, data })
    : Promise.resolve(u);
}

async function category(parentId: string | null) {
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth: 1,
      slug: `gs-${next()}`,
      translations: { create: [{ locale: 'ka', name: 'ძებნა' }] },
    },
  });
}

async function branch() {
  const top = await category(null);
  const sub = await category(top.id);
  const child = await category(sub.id);
  return { top, sub, child };
}
type Branch = Awaited<ReturnType<typeof branch>>;

async function thumbnail(ownerId: string) {
  const id = crypto.randomUUID();
  return prisma.file.create({
    data: {
      id,
      purpose: 'gig_thumbnail',
      ownerUserId: ownerId,
      bucket: 'public_media',
      objectKey: `images/${id}/large.webp`,
      originalName: 'a.png',
      declaredType: 'image/png',
      sizeBytes: 1000n,
      status: 'ready',
      readyAt: new Date(),
      width: 800,
      height: 600,
      variants: {
        thumb: `images/${id}/thumb.webp`,
        medium: `images/${id}/medium.webp`,
        large: `images/${id}/large.webp`,
      },
    },
  });
}

let minute = 0;
interface GigInput {
  ownerId: string;
  at: Branch;
  ka?: { title: string; description?: string };
  en?: { title: string; description?: string };
  price?: number;
  delivery?: number;
  rating?: [count: number, sum: number];
  sales?: number;
  visits?: number;
  status?: 'active' | 'pending';
  /** Child category of the branch unless set to the sub-category's other child. */
  child?: string;
}

/** An indexed gig; each one is published one minute after the previous (so "newest" is known). */
async function gig(input: GigInput) {
  const n = next();
  const thumb = await thumbnail(input.ownerId);
  minute += 1;
  const g = await prisma.gig.create({
    data: {
      uid: `S${n}`.toUpperCase().slice(0, 20),
      slug: `gig-${n}`,
      ownerId: input.ownerId,
      categoryId: input.at.top.id,
      subcategoryId: input.at.sub.id,
      childcategoryId: input.child ?? input.at.child.id,
      priceTetri: BigInt(input.price ?? 5000),
      deliveryDays: input.delivery ?? 3,
      revisionsAllowed: 1,
      status: input.status ?? 'active',
      thumbnailFileId: thumb.id,
      ratingCount: input.rating?.[0] ?? 0,
      ratingSum: input.rating?.[1] ?? 0,
      salesCount: input.sales ?? 0,
      visitsCount: BigInt(input.visits ?? 0),
      publishedAt: new Date(Date.UTC(2026, 0, 1, 0, minute)),
      translations: {
        create: [
          {
            locale: 'ka',
            title: input.ka?.title ?? `განცხადება ${n}`,
            description: input.ka?.description ?? '<p>აღწერა</p>',
          },
          ...(input.en
            ? [
                {
                  locale: 'en' as const,
                  title: input.en.title,
                  description: input.en.description ?? '<p>Description</p>',
                },
              ]
            : []),
        ],
      },
    },
  });
  await index.indexGig(g.id);
  return g;
}

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(PremiumStatus).useValue(premium));
  prisma = app.get(PrismaService);
  index = app.get(SearchIndex);
});
afterAll(async () => {
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
  await app?.close();
});
beforeEach(() => {
  premium.users.clear();
});

describe('keyword rule (AC-19, AC-20, EC-5, EC-6)', () => {
  it('normalises separators and case, cuts the keyword to 100 characters, drops repeated words', () => {
    expect(normalizeSearchText(`Logo-Design_for "my" /brand\\ \`x\`+y`)).toBe(
      'logo design for my brand x y',
    );
    expect(keywordWords('---  //')).toEqual([]);
    expect(keywordWords('Logo logo LOGO design')).toEqual(['logo', 'design']);
    expect(keywordWords(`${'a'.repeat(98)} bcdef`)).toEqual(['a'.repeat(98), 'b']);
  });

  it('lists gigs where every word appears, in any order, in title or description, Georgian or English', async () => {
    const u = await owner();
    const at = await branch();
    const w1 = `ab${next()}`;
    const w2 = `ცდ${next()}`;
    const both = await gig({
      ownerId: u.id,
      at,
      ka: { title: `ლოგო ${w2}`, description: `<p>კარგი</p>` },
      en: { title: 'Logo', description: `<p>Design of a <b>${w1.toUpperCase()}</b></p>` },
    });
    const one = await gig({ ownerId: u.id, at, ka: { title: `მხოლოდ ${w1}` } });
    expect(ids(await search({ q: `${w2} ${w1}` }))).toEqual([both.id]);
    expect(ids(await search({ q: w1, sort: 'newest' }))).toEqual([one.id, both.id]);
    // English UI finds the Georgian word too (AC-19 "whatever the UI language").
    expect(ids(await search({ q: w2 }).set('Accept-Language', 'en'))).toEqual([both.id]);
    // A word that appears nowhere → no result (no fuzzy-only matches).
    expect(ids(await search({ q: `${w1} zzzq${next()}` }))).toEqual([]);
  });

  it('finds every legacy phrase match, treats separators as spaces and LIKE wildcards as text', async () => {
    const u = await owner();
    const at = await branch();
    const w = `ph${next()}`;
    const g = await gig({ ownerId: u.id, at, en: { title: `Logo-design ${w} 100% fast` } });
    expect(ids(await search({ q: `logo design ${w}` }))).toEqual([g.id]);
    expect(ids(await search({ q: `"${w}"+LOGO_design` }))).toEqual([g.id]);
    expect(ids(await search({ q: `${w} 100%` }))).toEqual([g.id]);
    expect(ids(await search({ q: `${w} 1%0` }))).toEqual([]);
  });

  it('treats a separators-only keyword as empty and lists everything (EC-5, AC-20)', async () => {
    const u = await owner();
    const at = await branch();
    const g = await gig({ ownerId: u.id, at });
    const res = await search({ q: '--- //', categoryId: at.top.id });
    expect(res.status).toBe(200);
    expect(ids(res)).toEqual([g.id]);
    expect(res.body.totalCount).toBe(1);
  });
});

describe('what is listed (AC-6, AC-7, R-S1, P-29)', () => {
  it('lists only active gigs of active/verified owners that are not banned, restricted or deleted', async () => {
    const at = await branch();
    const active = await gig({ ownerId: (await owner()).id, at });
    const verified = await gig({ ownerId: (await owner({ status: 'verified' })).id, at });
    await gig({ ownerId: (await owner()).id, at, status: 'pending' });
    await gig({ ownerId: (await owner({ status: 'pending' })).id, at });
    await gig({ ownerId: (await owner({ status: 'banned', bannedAt: new Date() })).id, at });
    await gig({ ownerId: (await owner({ deletedAt: new Date() })).id, at });
    const restrictedOwner = await owner();
    const restricted = await gig({ ownerId: restrictedOwner.id, at });
    const list = async () => ids(await search({ categoryId: at.top.id, sort: 'newest' }));
    expect(await list()).toEqual([restricted.id, verified.id, active.id]);

    // A restriction, its lifting and a ban show on the next request (the owner is read live).
    await prisma.user.update({ where: { id: restrictedOwner.id }, data: { isRestricted: true } });
    expect(await list()).toEqual([verified.id, active.id]);
    await prisma.user.update({ where: { id: restrictedOwner.id }, data: { isRestricted: false } });
    expect(await list()).toEqual([restricted.id, verified.id, active.id]);
    await prisma.user.update({ where: { id: active.ownerId }, data: { status: 'banned' } });
    expect(await list()).toEqual([restricted.id, verified.id]);
  });

  it('includes Georgian-only gigs on English requests with the Georgian title (AC-7)', async () => {
    const u = await owner();
    const at = await branch();
    const kaOnly = await gig({ ownerId: u.id, at, ka: { title: 'მხოლოდ ქართული' } });
    const both = await gig({ ownerId: u.id, at, ka: { title: 'ორივე' }, en: { title: 'Both' } });
    const res = await search({ categoryId: at.top.id, sort: 'newest' }).set(
      'Accept-Language',
      'en',
    );
    expect(res.body.data).toMatchObject([
      { id: both.id, title: 'Both', contentLocale: 'en' },
      { id: kaOnly.id, title: 'მხოლოდ ქართული', contentLocale: 'ka' },
    ]);
  });

  it('returns the gig card: thumbnail variants, price, delivery, rating in tenths, seller, no badge (guest)', async () => {
    const u = await owner();
    const at = await branch();
    const g = await gig({ ownerId: u.id, at, price: 12_550, delivery: 7, rating: [3, 13] });
    const res = await search({ categoryId: at.top.id });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nextCursor: null, totalCount: 1 });
    expect(res.body.data[0]).toEqual({
      id: g.id,
      uid: g.uid,
      slug: g.slug,
      title: expect.any(String),
      contentLocale: 'ka',
      thumbnail: {
        fileId: g.thumbnailFileId,
        thumb: `${MEDIA}/images/${g.thumbnailFileId}/thumb.webp`,
        medium: `${MEDIA}/images/${g.thumbnailFileId}/medium.webp`,
        large: `${MEDIA}/images/${g.thumbnailFileId}/large.webp`,
        width: 800,
        height: 600,
      },
      price: { amount: 12_550, currency: 'GEL' },
      deliveryDays: 7,
      rating: { count: 3, averageTenths: 43 },
      seller: expect.objectContaining({ id: u.id, username: u.username, isPremium: false }),
      isFeatured: false,
      isFavorite: null,
    });
  });

  it('rounds the average half up in tenths and has no average without reviews', () => {
    expect(ratingSummary(0, 0)).toEqual({ count: 0, averageTenths: null });
    expect(ratingSummary(3, 13)).toEqual({ count: 3, averageTenths: 43 }); // 4.333
    expect(ratingSummary(2, 9)).toEqual({ count: 2, averageTenths: 45 });
    expect(ratingSummary(20, 89)).toEqual({ count: 20, averageTenths: 45 }); // 4.45 → 4.5
    expect(ratingSummary(1, 5)).toEqual({ count: 1, averageTenths: 50 });
  });
});

describe('category filter (AC-3)', () => {
  it('lists the gigs of a node at every level; an unknown category → 404', async () => {
    const u = await owner();
    const at = await branch();
    const otherChild = await category(at.sub.id);
    const a = await gig({ ownerId: u.id, at });
    const b = await gig({ ownerId: u.id, at, child: otherChild.id });
    const list = async (categoryId: string) => ids(await search({ categoryId, sort: 'newest' }));
    expect(await list(at.top.id)).toEqual([b.id, a.id]);
    expect(await list(at.sub.id)).toEqual([b.id, a.id]);
    expect(await list(at.child.id)).toEqual([a.id]);
    expect(await list(otherChild.id)).toEqual([b.id]);
    const res = await search({ categoryId: crypto.randomUUID() });
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});

describe('filters (AC-9…AC-11, R-S2, P-27)', () => {
  it('price: limits included; min above max → 400 t_min_price_greater_than_max', async () => {
    const u = await owner();
    const at = await branch();
    const g10 = await gig({ ownerId: u.id, at, price: 1000 });
    const g20 = await gig({ ownerId: u.id, at, price: 2000 });
    const g30 = await gig({ ownerId: u.id, at, price: 3000 });
    const q = { categoryId: at.top.id, sort: 'price_asc' };
    expect(ids(await search({ ...q, minPrice: 2000 }))).toEqual([g20.id, g30.id]);
    expect(ids(await search({ ...q, maxPrice: 2000 }))).toEqual([g10.id, g20.id]);
    expect(ids(await search({ ...q, minPrice: 1000, maxPrice: 1000 }))).toEqual([g10.id]);
    const bad = await search({ ...q, minPrice: 3001, maxPrice: 3000 }).set('Accept-Language', 'en');
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields).toEqual([
      {
        field: 'minPrice',
        code: 'range',
        messageKey: 't_min_price_greater_than_max',
        message: 'The minimum price cannot be higher than the maximum price.',
      },
    ]);
  });

  it('price above the safe integer range → 400, never 500 (security review 08 SEC-76)', async () => {
    for (const [field, value] of [
      ['minPrice', '99999999999999999999'],
      ['maxPrice', '1e30'],
    ] as const) {
      const res = await http()
        .get('/api/v1/search/gigs')
        .query({ [field]: value });
      expect(res.status, `${field}=${value}`).toBe(400);
      expect(res.body.details.fields[0]).toMatchObject({ field, code: 'range' });
    }
  });

  it('delivery time: at most N days, "None" (0 days) included', async () => {
    const u = await owner();
    const at = await branch();
    const none = await gig({ ownerId: u.id, at, delivery: 0 });
    const three = await gig({ ownerId: u.id, at, delivery: 3 });
    await gig({ ownerId: u.id, at, delivery: 14 });
    const q = { categoryId: at.top.id, sort: 'newest' };
    expect(ids(await search({ ...q, deliveryTime: 7 }))).toEqual([three.id, none.id]);
    expect(ids(await search({ ...q, deliveryTime: 1 }))).toEqual([none.id]);
    expect((await search({ ...q, deliveryTime: 8 })).status).toBe(400);
  });

  it('rating: average ≥ N, "5" = exactly 5.0, never a gig without reviews', async () => {
    const u = await owner();
    const at = await branch();
    const five = await gig({ ownerId: u.id, at, rating: [2, 10] });
    const almost = await gig({ ownerId: u.id, at, rating: [3, 14] }); // 4.67
    const four = await gig({ ownerId: u.id, at, rating: [1, 4] });
    await gig({ ownerId: u.id, at });
    const q = { categoryId: at.top.id, sort: 'newest' };
    expect(ids(await search({ ...q, rating: 5 }))).toEqual([five.id]);
    expect(ids(await search({ ...q, rating: 4 }))).toEqual([four.id, almost.id, five.id]);
    expect(ids(await search({ ...q, rating: 1 }))).toHaveLength(3);
  });
});

describe('sorting and the Premium boost (AC-13…AC-17, R-S3)', () => {
  async function example() {
    const p = await owner();
    const s = await owner();
    premium.users.add(p.id);
    const at = await branch();
    const P1 = await gig({ ownerId: p.id, at, rating: [1, 4], price: 5000 });
    const P2 = await gig({ ownerId: p.id, at, rating: [1, 3], price: 2000 });
    const S1 = await gig({ ownerId: s.id, at, rating: [1, 5], price: 1000 });
    const S2 = await gig({ ownerId: s.id, at, rating: [2, 9], price: 3000 });
    return { at, P1, P2, S1, S2 };
  }

  it('AC-16 worked example: Best rating P1, P2, S1, S2; price low→high S1, P2, S2, P1; "4+" P1, S1, S2', async () => {
    const { at, P1, P2, S1, S2 } = await example();
    const q = { categoryId: at.top.id };
    expect(ids(await search({ ...q, sort: 'best_rating' }))).toEqual([P1.id, P2.id, S1.id, S2.id]);
    expect(ids(await search({ ...q, sort: 'price_asc' }))).toEqual([S1.id, P2.id, S2.id, P1.id]);
    expect(ids(await search({ ...q, sort: 'price_desc' }))).toEqual([P1.id, S2.id, P2.id, S1.id]);
    expect(ids(await search({ ...q, sort: 'best_rating', rating: 4 }))).toEqual([
      P1.id,
      S1.id,
      S2.id,
    ]);
  });

  it('shows the Featured flag on Premium owners’ cards, also on the price sorts (AC-15, AC-18)', async () => {
    const { at, P1, S1 } = await example();
    const res = await search({ categoryId: at.top.id, sort: 'price_asc' });
    const card = (id: string) => res.body.data.find((c: { id: string }) => c.id === id);
    expect(card(P1.id)).toMatchObject({ isFeatured: true, seller: { isPremium: true } });
    expect(card(S1.id)).toMatchObject({ isFeatured: false, seller: { isPremium: false } });
  });

  it('gains and loses the boost with the Premium status, nothing else changes (AC-17)', async () => {
    const { at, P1, P2, S1, S2 } = await example();
    premium.users.clear();
    const res = await search({ categoryId: at.top.id, sort: 'best_rating' });
    expect(ids(res)).toEqual([S1.id, S2.id, P1.id, P2.id]);
    expect(res.body.data.every((c: { isFeatured: boolean }) => !c.isFeatured)).toBe(true);
  });

  it('most popular, most selling and newest: group A first, each group in its order, ties newest first', async () => {
    const p = await owner();
    const s = await owner();
    premium.users.add(p.id);
    const at = await branch();
    const a1 = await gig({ ownerId: p.id, at, visits: 1, sales: 9 });
    const b1 = await gig({ ownerId: s.id, at, visits: 50, sales: 1 });
    const b2 = await gig({ ownerId: s.id, at, visits: 50, sales: 5 });
    const a2 = await gig({ ownerId: p.id, at, visits: 7, sales: 0 });
    const q = { categoryId: at.top.id };
    expect(ids(await search({ ...q, sort: 'most_popular' }))).toEqual([a2.id, a1.id, b2.id, b1.id]);
    expect(ids(await search({ ...q, sort: 'most_selling' }))).toEqual([a1.id, a2.id, b2.id, b1.id]);
    expect(ids(await search({ ...q, sort: 'newest' }))).toEqual([a2.id, a1.id, b2.id, b1.id]);
  });

  it('Recommended (default): group A first, a mix that is the same on every request and every page of the day', async () => {
    const p = await owner();
    const s = await owner();
    premium.users.add(p.id);
    const at = await branch();
    const a = await gig({ ownerId: p.id, at });
    for (let i = 0; i < 6; i += 1) await gig({ ownerId: s.id, at });
    const all = ids(await search({ categoryId: at.top.id, limit: 42 }));
    expect(all).toHaveLength(7);
    expect(all[0]).toBe(a.id);
    expect(ids(await search({ categoryId: at.top.id, sort: 'recommended', limit: 42 }))).toEqual(
      all,
    );

    // Numbered pages (web) and cursors (app) walk the same order without repeats or gaps (EC-8).
    const pages: string[] = [];
    for (const page of [1, 2, 3]) {
      const res = await search({ categoryId: at.top.id, limit: 3, page });
      expect(res.body.totalCount).toBe(7);
      pages.push(...ids(res));
    }
    expect(pages).toEqual(all);
    const viaCursor: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await search({ categoryId: at.top.id, limit: 3, ...(cursor ? { cursor } : {}) });
      viaCursor.push(...ids(res));
      cursor = res.body.nextCursor;
    } while (cursor);
    expect(viaCursor).toEqual(all);
    const beyond = await search({ categoryId: at.top.id, limit: 3, page: 4 });
    expect(beyond.body).toMatchObject({ data: [], nextCursor: null, totalCount: 7 });
  });

  it('the daily mix key is the Tbilisi date (UTC+4) and the order follows it', async () => {
    expect(tbilisiDay(new Date('2026-10-03T19:59:59Z'))).toBe('2026-10-03');
    expect(tbilisiDay(new Date('2026-10-03T20:00:00Z'))).toBe('2026-10-04');
    const u = await owner();
    const at = await branch();
    for (let i = 0; i < 4; i += 1) await gig({ ownerId: u.id, at });
    const svc = app.get(GigSearchService);
    const on = async (iso: string) =>
      (await svc.search({ categoryId: at.top.id }, 'ka', null, new Date(iso))).data.map(
        (c) => (c as { id: string }).id,
      );
    expect(await on('2026-10-03T05:00:00Z')).toEqual(await on('2026-10-03T19:59:00Z'));
    const expected = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM gigs WHERE category_id = ${at.top.id}::uuid
      ORDER BY md5(id::text || '2026-10-04')`;
    expect(await on('2026-10-03T20:00:00Z')).toEqual(expected.map((r) => r.id));
  });

  it('refuses page together with cursor, and a cursor it did not make', async () => {
    const page = await search({ page: 2, cursor: Buffer.from('o:3').toString('base64url') });
    expect(page.status).toBe(400);
    expect(page.body.details.fields[0].field).toBe('page');
    const bad = await search({ cursor: 'not-ours' });
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields[0].field).toBe('cursor');
  });
});

describe('listGigs (profile list, spec 02 AC-8)', () => {
  it('lists the active gigs of a listable seller newest first, without the boost, paged by cursor', async () => {
    const u = await owner();
    premium.users.add(u.id);
    const at = await branch();
    const made = [];
    for (let i = 0; i < 7; i += 1) made.push(await gig({ ownerId: u.id, at }));
    await gig({ ownerId: u.id, at, status: 'pending' });
    const first = await http().get('/api/v1/gigs').query({ sellerUsername: u.username, limit: 6 });
    expect(first.status).toBe(200);
    expect(ids(first)).toEqual(
      made
        .slice(1)
        .reverse()
        .map((g) => g.id),
    );
    expect(first.body.data[0].isFeatured).toBe(true);
    const second = await http()
      .get('/api/v1/gigs')
      .query({ sellerUsername: u.username, limit: 6, cursor: first.body.nextCursor });
    expect(second.body).toMatchObject({ nextCursor: null });
    expect(ids(second)).toEqual([made[0]!.id]);
  });

  it('answers an empty page for an unknown or non-listable seller', async () => {
    const at = await branch();
    const banned = await owner();
    await gig({ ownerId: banned.id, at });
    await prisma.user.update({ where: { id: banned.id }, data: { status: 'banned' } });
    for (const sellerUsername of [banned.username, `nobody_${next()}`]) {
      const res = await http().get('/api/v1/gigs').query({ sellerUsername });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ data: [], nextCursor: null });
    }
  });
});

describe('SearchIndex (ADR-011 §3)', () => {
  it('re-indexes an edited gig and removes the document of a deleted one', async () => {
    const u = await owner();
    const at = await branch();
    const before = `old${next()}`;
    const after = `new${next()}`;
    const g = await gig({ ownerId: u.id, at, ka: { title: `სათაური ${before}` } });
    expect(ids(await search({ q: before }))).toEqual([g.id]);

    await prisma.gigTranslation.update({
      where: { gigId_locale: { gigId: g.id, locale: 'ka' } },
      data: { title: `სათაური ${after}` },
    });
    await index.indexGig(g.id);
    expect(ids(await search({ q: before }))).toEqual([]);
    expect(ids(await search({ q: after }))).toEqual([g.id]);
    const doc = await prisma.searchDocument.findUniqueOrThrow({
      where: { entityType_entityId: { entityType: 'gig', entityId: g.id } },
    });
    expect(doc).toMatchObject({ status: 'active', categoryId: at.top.id, ownerListable: true });

    await prisma.gig.update({
      where: { id: g.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
    await index.indexGig(g.id);
    expect(
      await prisma.searchDocument.count({ where: { entityType: 'gig', entityId: g.id } }),
    ).toBe(0);
  });

  it('runs inside the caller’s transaction', async () => {
    const u = await owner();
    const at = await branch();
    const g = await gig({ ownerId: u.id, at });
    await index.removeGig(g.id);
    await prisma.$transaction(async (tx) => {
      await index.indexGig(g.id, tx);
    });
    expect(
      await prisma.searchDocument.count({ where: { entityType: 'gig', entityId: g.id } }),
    ).toBe(1);
  });
});

describe('PremiumStatus seam (R-2.1)', () => {
  it('is what Me, the public profile and signed-in gig cards report', async () => {
    const n = next();
    const reg = await http()
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        username: `gp_${n}`,
        email: `gp${n}@example.com`,
        fullName: 'Premium Seam',
        password: 'Secret123',
        acceptTerms: true,
      });
    expect(reg.status).toBe(201);
    const userId = reg.body.session.user.id as string;
    await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
    const auth = {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    };
    expect((await http().get('/api/v1/me').set(auth)).body).toMatchObject({
      plan: 'standard',
      premiumEndsAt: null,
    });
    premium.users.add(userId);
    expect((await http().get('/api/v1/me').set(auth)).body).toMatchObject({
      plan: 'premium',
      premiumEndsAt: '2027-01-01T00:00:00.000Z',
    });
    expect((await http().get(`/api/v1/users/gp_${n}`)).body.isPremium).toBe(true);

    // A signed-in caller gets `isFavorite: false` until favourites exist (slice 3).
    const at = await branch();
    await gig({ ownerId: userId, at });
    const res = await search({ categoryId: at.top.id }).set(auth);
    expect(res.body.data[0]).toMatchObject({ isFeatured: true, isFavorite: false });
  });
});
