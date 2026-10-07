// getGigAnalytics, impressions and the analytics partitions (ROADMAP 4.3.5c; spec 04 AC-39, ADR-012, data-model §3.S):
// every card of a searchGigs page counts as an impression, written in batches (bots not counted); the owner's
// analytics = the gig's counters + the `analytics_daily` breakdowns summed over all days (referrers and cities top
// 10); others get 404; the worker job keeps month partitions of `analytics_events` and drops raw rows after 90 days.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { GigImpressions } from '../src/modules/catalog/gig-impressions';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { AnalyticsPartitionsSweeper } from '../src/worker/analytics-partitions.sweeper';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
type Chain = { categoryId: string; subcategoryId: string; childCategoryId: string };
let chain: Chain;

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `an_${n}`,
      email: `an${n}@example.com`,
      fullName: 'Nino Beridze',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', emailVerifiedAt: new Date() },
  });
  return {
    userId,
    auth: {
      'X-MyTask-Client': 'ios',
      'Accept-Language': 'en',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}
type Member = Awaited<ReturnType<typeof member>>;

/** What the scan pipeline leaves: public variants for images, the PDF unchanged in `public_media`. */
async function file(ownerUserId: string, purpose: FilePurpose): Promise<FileRow> {
  const id = crypto.randomUUID();
  const pdf = purpose === 'gig_document';
  const variants = pdf
    ? undefined
    : {
        thumb: `images/${id}/thumb.webp`,
        medium: `images/${id}/medium.webp`,
        large: `images/${id}/large.webp`,
      };
  return prisma.file.create({
    data: {
      id,
      purpose,
      ownerUserId,
      status: 'ready',
      bucket: 'public_media',
      objectKey: pdf ? `files/${id}` : variants!.large,
      variants,
      originalName: pdf ? 'brief.pdf' : 'cover.jpg',
      declaredType: pdf ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 12_345n,
      width: pdf ? null : 1000,
      height: pdf ? null : 750,
      readyAt: new Date(),
    },
  });
}

async function category(parentId: string | null, depth: number) {
  seq += 1;
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth,
      slug: `an-${Date.now().toString(36)}-${seq}`,
      translations: {
        create: [
          { locale: 'ka', name: 'დიზაინი' },
          { locale: 'en', name: 'Design' },
        ],
      },
    },
  });
}

/** A fresh top → sub → child chain; `sub` given = a second child under that sub-category. */
async function newChain(sub?: Chain): Promise<Chain> {
  if (sub) {
    const child = await category(sub.subcategoryId, 3);
    return { ...sub, childCategoryId: child.id };
  }
  const top = await category(null, 1);
  const s = await category(top.id, 2);
  const child = await category(s.id, 3);
  return { categoryId: top.id, subcategoryId: s.id, childCategoryId: child.id };
}

/** A gig saved through createGig by `m` (a new member when not given). */
async function saveGig(m?: Member, title = 'ლოგოს დიზაინი') {
  const owner = m ?? (await member());
  const thumb = await file(owner.userId, 'gig_thumbnail');
  const image = await file(owner.userId, 'gig_image');
  const res = await http()
    .post('/api/v1/gigs')
    .set(owner.auth)
    .send({
      title: { ka: title, en: null },
      description: { ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>', en: null },
      ...chain,
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      thumbnailFileId: thumb.id,
      imageFileIds: [image.id],
    });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { ...owner, gig: res.body as { id: string } };
}

const touched: string[] = [];
async function withSetting(registerId: SettingId, key: string, value: unknown) {
  touched.push(key);
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const analytics = (gigId: string, auth: Auth) =>
  http().get(`/api/v1/gigs/${gigId}/analytics`).set(auth);
const gigRow = (id: string) => prisma.gig.findUniqueOrThrow({ where: { id } });

/** `analytics_daily` rows of a gig for one day. */
async function daily(gigId: string, day: string, rows: [string, string, number][]) {
  await prisma.analyticsDaily.createMany({
    data: rows.map(([dimension, dimensionValue, count]) => ({
      day: new Date(`${day}T00:00:00Z`),
      metric: 'gig_view',
      dimension,
      dimensionValue,
      entityType: 'gig',
      entityId: gigId,
      count: BigInt(count),
      uniques: BigInt(count),
    })),
  });
}

/** The partition that holds an event row. */
async function partitionOf(id: bigint): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ part: string }[]>`
    SELECT tableoid::regclass::text AS "part" FROM "analytics_events" WHERE "id" = ${id}`;
  return rows[0]?.part.replace(/"/g, '') ?? null;
}
const event = (occurredAt: Date) =>
  prisma.analyticsEvent.create({
    data: { occurredAt, eventType: 'gig_view', platform: 'web', entityType: 'gig' },
  });

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  chain = await newChain();
});

beforeEach(async () => {
  await app.get(RedisService).client.flushall();
  await withSetting('S-070', 'moderation.gigs.auto_approve', true);
});

afterEach(async () => {
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: [...new Set(touched.splice(0))] } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app.close();
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('impressions from searchGigs (contract searchGigs, AC-39)', () => {
  it('counts every listed card per search page, in batches; bots are not counted', async () => {
    const token = `Imp${crypto.randomUUID().slice(0, 8)}`;
    const { gig } = await saveGig(undefined, `${token} ლოგო`);
    const before = await gigRow(gig.id);
    const search = (ua: string) =>
      http()
        .get('/api/v1/search/gigs')
        .query({ q: token })
        .set({ 'Accept-Language': 'en', 'User-Agent': ua });

    for (const ua of [CHROME, CHROME, GOOGLEBOT, '']) {
      const res = await search(ua);
      expect(res.status).toBe(200);
      expect(res.body.data.map((c: { id: string }) => c.id)).toEqual([gig.id]);
    }
    // Nothing is written on the request path.
    expect(Number((await gigRow(gig.id)).impressionsCount)).toBe(0);

    await app.get(GigImpressions).flush();
    const after = await gigRow(gig.id);
    expect(Number(after.impressionsCount)).toBe(2);
    expect(after.updatedAt).toEqual(before.updatedAt);
    const rows = await prisma.analyticsDaily.findMany({
      where: { metric: 'gig_impression', entityId: gig.id },
    });
    expect(rows).toMatchObject([{ dimension: 'total', dimensionValue: '', count: 2n }]);

    // A second batch adds to the same day's row.
    app.get(GigImpressions).count([gig.id], CHROME);
    await app.get(GigImpressions).flush();
    expect(Number((await gigRow(gig.id)).impressionsCount)).toBe(3);
    const [row] = await prisma.analyticsDaily.findMany({
      where: { metric: 'gig_impression', entityId: gig.id },
    });
    expect(row!.count).toBe(3n);
  });
});

describe('getGigAnalytics (AC-39)', () => {
  it('gives the owner the totals and the breakdowns summed over all days', async () => {
    const { gig, auth } = await saveGig();
    await prisma.gig.update({
      where: { id: gig.id },
      data: { visitsCount: 7n, impressionsCount: 120n },
    });
    await daily(gig.id, '2026-10-06', [
      ['total', '', 3],
      ['device', 'desktop', 2],
      ['device', 'mobile', 1],
      ['browser', 'Chrome', 3],
      ['os', 'Windows', 3],
      ['country', 'GE', 3],
      ['city', 'Tbilisi', 3],
    ]);
    await daily(gig.id, '2026-10-07', [
      ['total', '', 4],
      ['device', 'mobile', 4],
      ['browser', 'Chrome', 1],
      ['browser', 'Mobile Safari', 3],
      ['os', 'iOS', 3],
      ['os', 'unknown', 1],
      ['country', 'GE', 2],
      ['country', 'DE', 2],
      ['city', 'Batumi', 2],
      // Twelve referrers and twelve more cities: only the top 10 of each are listed.
      ...Array.from({ length: 12 }, (_, i): [string, string, number] => [
        'referrer',
        `site${String(i).padStart(2, '0')}.ge`,
        12 - i,
      ]),
      ...Array.from({ length: 12 }, (_, i): [string, string, number] => ['city', `Town${i}`, 1]),
    ]);

    const res = await analytics(gig.id, auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      gigId: gig.id,
      salesCount: 0,
      clickCount: 7,
      impressionCount: 120,
      reviewCount: 0,
      devices: [
        { label: 'mobile', count: 5 },
        { label: 'desktop', count: 2 },
      ],
      browsers: [
        { label: 'Chrome', count: 4 },
        { label: 'Mobile Safari', count: 3 },
      ],
      operatingSystems: [
        { label: 'Windows', count: 3 },
        { label: 'iOS', count: 3 },
        { label: 'unknown', count: 1 },
      ],
      countries: [
        { label: 'GE', count: 5 },
        { label: 'DE', count: 2 },
      ],
      recentOrders: [],
    });
    expect(res.body.referrers).toHaveLength(10);
    expect(res.body.referrers[0]).toEqual({ label: 'site00.ge', count: 12 });
    expect(res.body.referrers[9]).toEqual({ label: 'site09.ge', count: 3 });
    expect(res.body.cities).toHaveLength(10);
    expect(res.body.cities.slice(0, 3)).toEqual([
      { label: 'Tbilisi', count: 3 },
      { label: 'Batumi', count: 2 },
      { label: 'Town0', count: 1 },
    ]);
  });

  it('is empty for a new gig and 404 for other users, deleted and unknown gigs', async () => {
    const { gig, auth } = await saveGig();
    const fresh = await analytics(gig.id, auth);
    expect(fresh.status).toBe(200);
    expect(fresh.body).toEqual({
      gigId: gig.id,
      salesCount: 0,
      clickCount: 0,
      impressionCount: 0,
      reviewCount: 0,
      devices: [],
      browsers: [],
      operatingSystems: [],
      referrers: [],
      countries: [],
      cities: [],
      recentOrders: [],
    });
    const other = await member();
    expect((await analytics(gig.id, other.auth)).status).toBe(404);
    expect((await http().get(`/api/v1/gigs/${gig.id}/analytics`)).status).toBe(401);
    expect((await analytics(crypto.randomUUID(), auth)).status).toBe(404);
    expect((await http().delete(`/api/v1/gigs/${gig.id}`).set(auth)).status).toBe(204);
    expect((await analytics(gig.id, auth)).status).toBe(404);
  });
});

describe('analytics-partitions job (data-model §3.S, ADR-012 §3)', () => {
  it('creates this and next month, moves their rows out of DEFAULT and drops months older than 90 days', async () => {
    const sweeper = new AnalyticsPartitionsSweeper(app.get(PrismaService));
    // An old month: created when "now" was then, and a row in it.
    const old = await sweeper.tick(new Date('2020-01-15T12:00:00Z'));
    expect(old.created).toEqual(['analytics_events_2020_01', 'analytics_events_2020_02']);
    const oldRow = await event(new Date('2020-01-20T10:00:00Z'));
    expect(await partitionOf(oldRow.id)).toBe('analytics_events_2020_01');
    // A row of a month without a partition lands in DEFAULT.
    const stray = await event(new Date('2019-06-01T10:00:00Z'));
    expect(await partitionOf(stray.id)).toBe('analytics_events_default');

    const now = new Date();
    const month = (offset: number) => {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      return `analytics_events_${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    };
    const current = await event(now);
    const pass = await sweeper.tick(now);
    expect(sweeper.lastRunAt).toBeInstanceOf(Date);
    expect(pass.dropped).toEqual(
      expect.arrayContaining(['analytics_events_2020_01', 'analytics_events_2020_02']),
    );
    expect(pass.deletedDefaultRows).toBeGreaterThanOrEqual(1);
    expect(await partitionOf(oldRow.id)).toBeNull();
    expect(await partitionOf(stray.id)).toBeNull();
    // This month's row now sits in its own partition (moved there if it was created now).
    expect(await partitionOf(current.id)).toBe(month(0));

    // New rows of this and next month go straight to their partitions; a second pass changes nothing.
    expect(await partitionOf((await event(new Date())).id)).toBe(month(0));
    const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2));
    expect(await partitionOf((await event(nextMonth)).id)).toBe(month(1));
    const again = await sweeper.tick(now);
    expect(again).toEqual({ created: [], dropped: [], deletedDefaultRows: 0 });
  });
});
