// getHome (ROADMAP 4.2.6; spec 03 AC-5, AC-24…AC-26; spec 17 AC-21, AC-35): top gigs, category rows, featured
// categories (S-107), best sellers (S-108, `[]` until slice 5), logos (S-109) and recent articles (S-117 + S-119),
// `[]` until slice 16. Premium-first with a PremiumStatus test double. Responses are validated against openapi.yaml by
// the test app. Other test files leave categories and gigs behind, so the tests look at this file's own rows.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../src/generated/prisma/client';
import { CategoriesService } from '../src/modules/catalog/categories.service';
import { PremiumStatus } from '../src/modules/subscriptions/premium-status';
import { PrismaService } from '../src/platform/db/prisma.service';
import {
  settingsRegistry,
  SettingsService,
  type SettingId,
} from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

class PremiumDouble extends PremiumStatus {
  users = new Set<string>();
  override async activeAmong(ids: readonly string[]) {
    return new Set(ids.filter((id) => this.users.has(id)));
  }
  override activeUsersSql() {
    return this.users.size === 0
      ? Prisma.sql`SELECT NULL::uuid WHERE false`
      : Prisma.sql`SELECT unnest(${[...this.users]}::uuid[])`;
  }
}

let app: NestExpressApplication;
let prisma: PrismaService;
const premium = new PremiumDouble();
let seq = 0;
const tag = Date.now().toString(36);
const next = () => `${tag}${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const HOME_SETTINGS: SettingId[] = ['S-107', 'S-108', 'S-109', 'S-117', 'S-119'];

interface Card {
  id: string;
  isFeatured: boolean;
  isFavorite: boolean | null;
  seller: { id: string };
}
interface HomeBody {
  topGigs: Card[];
  categoryRows: { category: { id: string }; gigs: Card[] }[];
  featuredCategories: { category: { id: string }; image: unknown }[] | null;
  bestSellers: unknown[] | null;
  logos: unknown[] | null;
  recentArticles: unknown[] | null;
}

async function home(headers: Record<string, string> = {}): Promise<HomeBody> {
  const res = await http().get('/api/v1/home').set(headers);
  expect(res.status).toBe(200);
  return res.body as HomeBody;
}

async function user(data: Prisma.UserUpdateInput = {}) {
  const n = next();
  const u = await prisma.user.create({
    data: {
      username: `hm_${n}`,
      email: `hm${n}@example.com`,
      referralCode: `H${n.slice(-7).toUpperCase().padStart(7, '0')}`,
      status: 'active',
      profile: { create: { fullname: 'Home Seller' } },
    },
  });
  return Object.keys(data).length ? prisma.user.update({ where: { id: u.id }, data }) : u;
}

async function topCategory(isVisible = true) {
  const make = (parentId: string | null, depth: number) =>
    prisma.gigCategory.create({
      data: {
        parentId,
        depth,
        slug: `hm-${next()}`,
        isVisible: depth === 1 ? isVisible : true,
        translations: { create: [{ locale: 'ka', name: 'მთავარი' }] },
      },
    });
  const top = await make(null, 1);
  const sub = await make(top.id, 2);
  const child = await make(sub.id, 3);
  app.get(CategoriesService).invalidate();
  return { top: top.id, sub: sub.id, child: child.id };
}

async function gig(
  ownerId: string,
  at: { top: string; sub: string; child: string },
  status: 'active' | 'pending' = 'active',
) {
  const n = next();
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
      uid: `H${n}`.toUpperCase().slice(0, 20),
      slug: `gig-${n}`,
      ownerId,
      categoryId: at.top,
      subcategoryId: at.sub,
      childcategoryId: at.child,
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

async function setSettings(values: Partial<Record<SettingId, boolean>>) {
  for (const [id, value] of Object.entries(values) as [SettingId, boolean][]) {
    const key = settingsRegistry[id].key;
    await prisma.setting.upsert({
      where: { key },
      create: { key, registerId: id, value, currentVersion: 1 },
      update: { value },
    });
  }
  app.get(SettingsService).invalidate();
}

const rowOf = (body: HomeBody, categoryId: string) =>
  body.categoryRows.find((r) => r.category.id === categoryId);

beforeAll(async () => {
  app = await createTestApp((b) => b.overrideProvider(PremiumStatus).useValue(premium));
  prisma = app.get(PrismaService);
});
beforeEach(() => premium.users.clear());
afterAll(async () => {
  await prisma?.setting.deleteMany({ where: { registerId: { in: HOME_SETTINGS } } });
  await app?.close();
});

describe('getHome category rows (AC-5, AC-25)', () => {
  it('one row per visible top-level category with up to 4 listed gigs; hidden categories get no row', async () => {
    const at = await topCategory();
    const hidden = await topCategory(false);
    const listed: string[] = [];
    for (let i = 0; i < 6; i += 1) listed.push((await gig((await user()).id, at)).id);
    const owner = await user();
    const pending = await gig(owner.id, at, 'pending');
    const banned = await gig((await user({ status: 'banned' })).id, at);
    const restricted = await gig((await user({ isRestricted: true })).id, at);
    await gig(owner.id, hidden);

    const body = await home();
    const ids = body.categoryRows.map((r) => r.category.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(at.top);
    expect(ids).not.toContain(hidden.top);
    // Sub- and child categories never get a row.
    expect(ids).not.toContain(at.sub);

    const row = rowOf(body, at.top)!;
    expect(row.gigs).toHaveLength(4);
    for (const card of row.gigs) expect(listed).toContain(card.id);
    for (const left of [pending.id, banned.id, restricted.id]) {
      expect(row.gigs.map((g) => g.id)).not.toContain(left);
    }
    // A guest gets `isFavorite: null`.
    expect(row.gigs[0]).toMatchObject({ isFeatured: false, isFavorite: null });

    // The 4 gigs are picked at random on every request.
    const seen = new Set<string>();
    for (let i = 0; i < 15; i += 1) {
      seen.add(
        rowOf(await home(), at.top)!
          .gigs.map((g) => g.id)
          .sort()
          .join(),
      );
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('a visible category without listed gigs gets an empty row', async () => {
    const at = await topCategory();
    await gig((await user()).id, at, 'pending');
    expect(rowOf(await home(), at.top)?.gigs).toEqual([]);
  });

  it("puts active-Premium owners' gigs first", async () => {
    const at = await topCategory();
    const premiumOwner = await user();
    const first = [(await gig(premiumOwner.id, at)).id, (await gig(premiumOwner.id, at)).id];
    for (let i = 0; i < 5; i += 1) await gig((await user()).id, at);
    premium.users.add(premiumOwner.id);

    for (let i = 0; i < 5; i += 1) {
      const row = rowOf(await home(), at.top)!;
      expect(row.gigs).toHaveLength(4);
      expect(
        row.gigs
          .slice(0, 2)
          .map((g) => g.id)
          .sort(),
      ).toEqual([...first].sort());
      expect(row.gigs.map((g) => g.isFeatured)).toEqual([true, true, false, false]);
    }
  });
});

describe('getHome top gigs (AC-24)', () => {
  it("shows 4 gigs: active-Premium owners' first, topped up with others", async () => {
    const at = await topCategory();
    for (let i = 0; i < 4; i += 1) await gig((await user()).id, at);
    const premiumOwner = await user();
    const premiumGig = await gig(premiumOwner.id, at);
    premium.users.add(premiumOwner.id);

    const body = await home();
    expect(body.topGigs).toHaveLength(4);
    expect(body.topGigs[0]).toMatchObject({ id: premiumGig.id, isFeatured: true });
    expect(body.topGigs.slice(1).every((g) => !g.isFeatured)).toBe(true);

    // Enough Premium gigs → the row is all Premium.
    for (let i = 0; i < 4; i += 1) await gig(premiumOwner.id, at);
    const full = await home();
    expect(full.topGigs.every((g) => g.isFeatured && g.seller.id === premiumOwner.id)).toBe(true);
  });

  it('leaves out gigs that are not listed', async () => {
    const at = await topCategory();
    const banned = await user({ status: 'banned' });
    const left = await gig(banned.id, at);
    premium.users.add(banned.id);
    for (let i = 0; i < 4; i += 1) await gig((await user()).id, at);
    expect((await home()).topGigs.map((g) => g.id)).not.toContain(left.id);
  });

  it('a signed-in caller gets isFavorite false', async () => {
    const n = next();
    const reg = await http()
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        username: `hm_${n}`,
        email: `hmr${n}@example.com`,
        fullName: 'Home Viewer',
        password: 'Secret123',
        acceptTerms: true,
      });
    expect(reg.status).toBe(201);
    const body = await home({
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    });
    expect(body.topGigs.length).toBeGreaterThan(0);
    expect(body.topGigs.every((g) => g.isFavorite === false)).toBe(true);
  });
});

describe('getHome setting blocks (AC-26, 17 AC-21, AC-35)', () => {
  it('blocks of switched-off settings are null', async () => {
    await setSettings({
      'S-107': false,
      'S-108': false,
      'S-109': false,
      'S-117': true,
      'S-119': false,
    });
    expect(await home()).toMatchObject({
      featuredCategories: null,
      bestSellers: null,
      logos: null,
      recentArticles: null,
    });
    await setSettings({ 'S-117': false, 'S-119': true });
    expect((await home()).recentArticles).toBeNull();
  });

  it('switched-on blocks: featured categories real, the rest empty until their slices', async () => {
    await setSettings({
      'S-107': true,
      'S-108': true,
      'S-109': true,
      'S-117': true,
      'S-119': true,
    });
    const hidden = await topCategory(false);
    const body = await home();
    expect(body).toMatchObject({ bestSellers: [], logos: [], recentArticles: [] });
    // The featured tiles are the visible top-level categories, in the rows' order.
    expect(body.featuredCategories!.map((f) => f.category.id)).toEqual(
      body.categoryRows.map((r) => r.category.id),
    );
    expect(body.featuredCategories!.map((f) => f.category.id)).not.toContain(hidden.top);
  });
});
