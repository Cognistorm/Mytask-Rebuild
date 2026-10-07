// recordGigView (ROADMAP 4.3.5b; spec 04 AC-34, Q-055, Q-182, ADR-012): 202 at once, the visit recorded after it;
// once per visitor (daily-salted IP + user agent) per Tbilisi day; owner and bot views ignored; device, browser, OS,
// referrer domain and the local GeoIP place in `analytics_events` + `analytics_daily`; the IP is never stored; the
// gig's visibility as getGig (404).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { GigViews, visitFacts } from '../src/modules/gigs/gig-views.service';
import { ENV, type Env } from '../src/platform/config/env';
import { PrismaService } from '../src/platform/db/prisma.service';
import { GeoIp, type GeoPlace } from '../src/platform/geoip/geoip';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
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
      username: `vw_${n}`,
      email: `vw${n}@example.com`,
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
      slug: `vw-${Date.now().toString(36)}-${seq}`,
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
async function saveGig(m?: Member) {
  const owner = m ?? (await member());
  const thumb = await file(owner.userId, 'gig_thumbnail');
  const image = await file(owner.userId, 'gig_image');
  const res = await http()
    .post('/api/v1/gigs')
    .set(owner.auth)
    .send({
      title: { ka: 'ლოგოს დიზაინი', en: null },
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

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

/** Stand-in for the local GeoIP file: `place` is what every lookup answers (null = no file). */
const geo = { place: null as GeoPlace | null };
const fakeGeoIp = { lookup: async () => geo.place };

/** A page view as the web sends it (CSRF: client header + the site's origin); `headers` may switch to the app. */
const view = (gigId: string, ua: string, headers: Auth = {}, body?: object) => {
  const web = { 'X-MyTask-Client': 'web', Origin: new URL(app.get<Env>(ENV).APP_URL).origin };
  const req = http()
    .post(`/api/v1/gigs/${gigId}/views`)
    .set({ ...web, 'User-Agent': ua, ...headers });
  return body === undefined ? req : req.send(body);
};
/** The visit is recorded after the 202; wait for it. */
const settled = () => app.get(GigViews).idle();
const visits = async (gigId: string) =>
  Number((await prisma.gig.findUniqueOrThrow({ where: { id: gigId } })).visitsCount);
async function daily(gigId: string) {
  const rows = await prisma.analyticsDaily.findMany({
    where: { metric: 'gig_view', entityType: 'gig', entityId: gigId },
  });
  return Object.fromEntries(
    rows.map((r) => [`${r.dimension}:${r.dimensionValue}`, Number(r.count)]),
  );
}

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) =>
    b.overrideProvider(ObjectStorage).useValue(storage).overrideProvider(GeoIp).useValue(fakeGeoIp),
  );
  prisma = app.get(PrismaService);
  chain = await newChain();
});

beforeEach(async () => {
  await app.get(RedisService).client.flushall();
  geo.place = null;
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

describe('recordGigView: what is counted (AC-34, Q-182)', () => {
  it('counts a visitor once per day and records device, browser, OS, referrer and place, never the IP', async () => {
    geo.place = { countryCode: 'GE', city: 'Tbilisi' };
    const { gig } = await saveGig();
    const before = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });

    const first = await view(
      gig.id,
      CHROME_WINDOWS,
      {},
      { referrer: 'https://www.google.com/search?q=logo' },
    );
    expect(first.status).toBe(202);
    expect(first.text).toBe('');
    // The same visitor again the same day: not counted again.
    expect((await view(gig.id, CHROME_WINDOWS)).status).toBe(202);
    // Another browser = another visitor; no body at all.
    expect((await view(gig.id, SAFARI_IPHONE)).status).toBe(202);
    await settled();

    expect(await visits(gig.id)).toBe(2);
    const after = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(after.updatedAt).toEqual(before.updatedAt);
    expect(await daily(gig.id)).toEqual({
      'total:': 2,
      'device:desktop': 1,
      'device:mobile': 1,
      'browser:Chrome': 1,
      'browser:Mobile Safari': 1,
      'os:Windows': 1,
      'os:iOS': 1,
      'referrer:www.google.com': 1,
      'country:GE': 2,
      'city:Tbilisi': 2,
    });

    const events = await prisma.analyticsEvent.findMany({
      where: { eventType: 'gig_view', entityId: gig.id },
      orderBy: { id: 'asc' },
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      platform: 'web',
      pathTemplate: '/service/{slug}',
      locale: 'ka',
      entityType: 'gig',
      userId: null,
      countryCode: 'GE',
      city: 'Tbilisi',
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrerDomain: 'www.google.com',
    });
    expect(events[0]!.visitorHash).toHaveLength(32);
    expect(Buffer.from(events[0]!.visitorHash!).equals(Buffer.from(events[1]!.visitorHash!))).toBe(
      false,
    );
    // Nothing that looks like the request's IP is kept.
    expect(
      JSON.stringify(events, (_k, v: unknown) => (typeof v === 'bigint' ? `${v}` : v)),
    ).not.toMatch(/127\.0\.0\.1|::1/);
  });

  it('counts the same visitor again on the next Tbilisi day (new salt)', async () => {
    const { gig } = await saveGig();
    const views = app.get(GigViews);
    const input = {
      gigId: gig.id,
      viewerId: null,
      ip: '203.0.113.9',
      userAgent: CHROME_WINDOWS,
      client: 'web' as const,
      locale: 'ka' as const,
      referrer: null,
    };
    const today = new Date('2026-10-07T10:00:00Z');
    const tomorrow = new Date('2026-10-08T10:00:00Z');
    expect(await views.record(input, today)).toBe(true);
    expect(await views.record(input, today)).toBe(false);
    expect(await views.record(input, tomorrow)).toBe(true);
    const hashes = await prisma.analyticsEvent.findMany({ where: { entityId: gig.id } });
    expect(Buffer.from(hashes[0]!.visitorHash!).equals(Buffer.from(hashes[1]!.visitorHash!))).toBe(
      false,
    );
    expect(await visits(gig.id)).toBe(2);
  });

  it('ignores the owner and bots; counts signed-in visitors with their user id', async () => {
    const { gig, auth } = await saveGig();
    const other = await member();
    expect((await view(gig.id, CHROME_WINDOWS, auth)).status).toBe(202);
    expect((await view(gig.id, GOOGLEBOT)).status).toBe(202);
    expect((await view(gig.id, '')).status).toBe(202);
    await settled();
    expect(await visits(gig.id)).toBe(0);

    expect((await view(gig.id, CHROME_WINDOWS, other.auth)).status).toBe(202);
    await settled();
    expect(await visits(gig.id)).toBe(1);
    const event = await prisma.analyticsEvent.findFirstOrThrow({ where: { entityId: gig.id } });
    // The member's headers say the iOS app and English.
    expect(event).toMatchObject({ userId: other.userId, platform: 'ios', locale: 'en' });
  });

  it('leaves place and referrer out when they are unknown', async () => {
    const { gig } = await saveGig();
    expect((await view(gig.id, CHROME_WINDOWS, {}, { referrer: null })).status).toBe(202);
    await settled();
    expect(await daily(gig.id)).toEqual({
      'total:': 1,
      'device:desktop': 1,
      'browser:Chrome': 1,
      'os:Windows': 1,
    });
  });
});

describe('recordGigView: which gigs (AC-28)', () => {
  it('answers 404 for gigs the caller may not see and 400 for a bad referrer', async () => {
    await withSetting('S-070', 'moderation.gigs.auto_approve', false);
    const { gig, auth } = await saveGig();
    expect((await view(gig.id, CHROME_WINDOWS)).status).toBe(404);
    // The owner may see their pending gig, but their view is not counted.
    expect((await view(gig.id, CHROME_WINDOWS, auth)).status).toBe(202);
    await settled();
    expect(await visits(gig.id)).toBe(0);

    expect((await http().delete(`/api/v1/gigs/${gig.id}`).set(auth)).status).toBe(204);
    expect((await view(gig.id, CHROME_WINDOWS, auth)).status).toBe(404);
    expect((await view(crypto.randomUUID(), CHROME_WINDOWS)).status).toBe(404);

    await withSetting('S-070', 'moderation.gigs.auto_approve', true);
    const active = await saveGig();
    const bad = await view(active.gig.id, CHROME_WINDOWS, {}, { referrer: 'not a url' });
    expect(bad.status).toBe(400);
  });
});

describe('visit facts and the GeoIP file', () => {
  it('names device, browser and OS without versions, and keeps only the referrer domain', () => {
    expect(visitFacts(SAFARI_IPHONE, 'web', 'https://Facebook.com/some/page')).toEqual({
      deviceType: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
      referrerDomain: 'facebook.com',
    });
    // The app's own user agent says little: the client kind fills in device and OS.
    expect(visitFacts('okhttp/4.12.0', 'android', null)).toEqual({
      deviceType: 'mobile',
      browser: 'unknown',
      os: 'Android',
      referrerDomain: null,
    });
    expect(visitFacts('curl-like/1.0', 'web', null)).toMatchObject({
      deviceType: 'desktop',
      os: 'unknown',
    });
  });

  it('answers null without a database file', async () => {
    const env = app.get<Env>(ENV);
    expect(await new GeoIp({ ...env, GEOIP_CITY_DB_PATH: undefined }).lookup('8.8.8.8')).toBeNull();
    const missing = new GeoIp({ ...env, GEOIP_CITY_DB_PATH: 'does-not-exist.mmdb' });
    expect(await missing.lookup('8.8.8.8')).toBeNull();
  });
});
