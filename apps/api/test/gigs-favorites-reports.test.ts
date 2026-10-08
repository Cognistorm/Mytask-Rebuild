// Favourites and gig reports (ROADMAP 4.3.6; spec 04 AC-35…AC-38, EC-10, EC-11, R-G10, SEC-23): putFavorite and
// deleteFavorite idempotent, listFavorites only listable gigs (newest saved first, keyset cursor), `isFavorite` real on
// cards and the page; createGigReport once per user and gig, reason 6–500, EV-22 to S-100, the shared report limit.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
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
const GUEST: Auth = { 'X-MyTask-Client': 'ios' };

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `fv_${n}`,
      email: `fv${n}@example.com`,
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
    username: `fv_${n}`,
    auth: {
      'X-MyTask-Client': 'ios',
      'Accept-Language': 'en',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}
type Member = Awaited<ReturnType<typeof member>>;

async function file(ownerUserId: string, purpose: FilePurpose): Promise<FileRow> {
  const id = crypto.randomUUID();
  const variants = {
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
      objectKey: variants.large,
      variants,
      originalName: 'cover.jpg',
      declaredType: 'image/jpeg',
      sizeBytes: 12_345n,
      width: 1000,
      height: 750,
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
      slug: `fv-${Date.now().toString(36)}-${seq}`,
      translations: {
        create: [
          { locale: 'ka', name: 'დიზაინი' },
          { locale: 'en', name: 'Design' },
        ],
      },
    },
  });
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

type Card = { id: string; isFavorite: boolean | null };
const put = (auth: Auth, gigId: string) => http().put(`/api/v1/favorites/${gigId}`).set(auth);
const unsave = (auth: Auth, gigId: string) => http().delete(`/api/v1/favorites/${gigId}`).set(auth);
const favorites = (auth: Auth, query: Record<string, string | number> = {}) =>
  http().get('/api/v1/favorites').set(auth).query(query);
const ids = (res: request.Response) => (res.body.data as Card[]).map((c) => c.id);
const report = (auth: Auth, gigId: string, reason: unknown) =>
  http().post(`/api/v1/gigs/${gigId}/reports`).set(auth).send({ reason });
const deleteGig = (auth: Auth, gigId: string) => http().delete(`/api/v1/gigs/${gigId}`).set(auth);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  const top = await category(null, 1);
  const sub = await category(top.id, 2);
  const child = await category(sub.id, 3);
  chain = { categoryId: top.id, subcategoryId: sub.id, childCategoryId: child.id };
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

describe('putFavorite / deleteFavorite (AC-35, R-G10)', () => {
  it('saves idempotently, shows it on the page and the cards, and removes idempotently', async () => {
    // Free plan: one gig per seller (S-001).
    const seller = await member();
    const { gig } = await saveGig(seller);
    const { gig: other } = await saveGig();
    const buyer = await member();

    const first = await put(buyer.auth, gig.id);
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ gigId: gig.id, createdAt: expect.any(String) });
    const again = await put(buyer.auth, gig.id);
    expect(again.status).toBe(200);
    expect(again.body).toEqual(first.body);
    expect(await prisma.favorite.count({ where: { userId: buyer.userId } })).toBe(1);

    const page = await http().get(`/api/v1/gigs/${gig.id}`).set(buyer.auth);
    expect(page.body.viewer).toEqual({ isOwner: false, isFavorite: true, hasReported: false });
    // Cards: the related list of the other gig (same sub-category) carries the real flag; guests get null.
    const card = async (auth: Auth) => {
      const res = await http().get(`/api/v1/gigs/${other.id}/related`).set(auth);
      return (res.body.gigs as Card[]).find((c) => c.id === gig.id);
    };
    expect((await card(buyer.auth))?.isFavorite).toBe(true);
    expect((await card(seller.auth))?.isFavorite).toBe(false);
    expect((await card(GUEST))?.isFavorite).toBeNull();

    expect((await unsave(buyer.auth, gig.id)).status).toBe(204);
    expect((await unsave(buyer.auth, gig.id)).status).toBe(204);
    expect(await prisma.favorite.count({ where: { userId: buyer.userId } })).toBe(0);
    const after = await http().get(`/api/v1/gigs/${gig.id}`).set(buyer.auth);
    expect(after.body.viewer.isFavorite).toBe(false);
  });

  it('refuses guests (401), the owner (403) and gigs that are not public or unknown (404)', async () => {
    const owner = await member();
    const { gig } = await saveGig(owner);
    const buyer = await member();

    expect((await put(GUEST, gig.id)).status).toBe(401);
    expect((await unsave(GUEST, gig.id)).status).toBe(401);
    const own = await put(owner.auth, gig.id);
    expect(own.status).toBe(403);
    expect(own.body.code).toBe('FORBIDDEN');

    await prisma.gig.update({ where: { id: gig.id }, data: { status: 'pending' } });
    expect((await put(buyer.auth, gig.id)).status).toBe(404);
    // The owner of a pending gig still gets 403, not 404.
    expect((await put(owner.auth, gig.id)).status).toBe(403);

    const unknown = crypto.randomUUID();
    expect((await put(buyer.auth, unknown)).status).toBe(404);
    expect((await unsave(buyer.auth, unknown)).status).toBe(404);
  });
});

describe('listFavorites (AC-36, EC-11)', () => {
  it('lists saved gigs newest saved first, with a keyset cursor', async () => {
    const buyer = await member();
    const a = (await saveGig()).gig;
    const b = (await saveGig()).gig;
    const c = (await saveGig()).gig;
    for (const g of [a, b, c]) expect((await put(buyer.auth, g.id)).status).toBe(200);

    const one = await favorites(buyer.auth, { limit: 2 });
    expect(one.status).toBe(200);
    expect(ids(one)).toEqual([c.id, b.id]);
    expect((one.body.data as Card[]).every((x) => x.isFavorite === true)).toBe(true);
    expect(one.body.nextCursor).toEqual(expect.any(String));
    const two = await favorites(buyer.auth, { limit: 2, cursor: one.body.nextCursor });
    expect(ids(two)).toEqual([a.id]);
    expect(two.body.nextCursor).toBeNull();

    expect((await favorites(buyer.auth, { cursor: 'nonsense' })).status).toBe(400);
    expect((await favorites(GUEST)).status).toBe(401);
  });

  it('hides pending, deleted and restricted-owner gigs, and shows them again when listable', async () => {
    const buyer = await member();
    const pending = await saveGig();
    const deleted = await saveGig();
    const restricted = await saveGig();
    for (const g of [pending, deleted, restricted]) {
      expect((await put(buyer.auth, g.gig.id)).status).toBe(200);
    }

    await prisma.gig.update({ where: { id: pending.gig.id }, data: { status: 'pending' } });
    expect((await deleteGig(deleted.auth, deleted.gig.id)).status).toBe(204);
    await prisma.user.update({ where: { id: restricted.userId }, data: { isRestricted: true } });
    expect((await favorites(buyer.auth)).body).toEqual({ data: [], nextCursor: null });

    await prisma.gig.update({ where: { id: pending.gig.id }, data: { status: 'active' } });
    await prisma.user.update({ where: { id: restricted.userId }, data: { isRestricted: false } });
    expect(ids(await favorites(buyer.auth))).toEqual([restricted.gig.id, pending.gig.id]);
    // The saved row of the deleted gig is kept; it can still be removed.
    expect((await unsave(buyer.auth, deleted.gig.id)).status).toBe(204);
  });
});

describe('createGigReport (AC-37, AC-38, EC-10, SEC-23)', () => {
  it('saves one report per user and gig, emails EV-22 to S-100 and refuses a second one', async () => {
    const admins = ['a@mytask.test', 'b@mytask.test'];
    await withSetting('S-100', 'notifications.admin_recipients', admins);
    const { gig } = await saveGig();
    const buyer = await member();

    const res = await report(buyer.auth, gig.id, '  Copied from another seller  ');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      gigId: gig.id,
      createdAt: expect.any(String),
    });
    const row = await prisma.report.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row).toMatchObject({
      reporterUserId: buyer.userId,
      targetType: 'gig',
      targetId: gig.id,
      reason: 'Copied from another seller',
      status: 'pending',
    });
    const events = await prisma.outboxEvent.findMany({
      where: { eventType: 'EV-22', aggregateId: res.body.id },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.payload).toMatchObject({ to: admins, locale: 'ka' });

    const page = await http().get(`/api/v1/gigs/${gig.id}`).set(buyer.auth);
    expect(page.body.viewer.hasReported).toBe(true);

    const twice = await report(buyer.auth, gig.id, 'Another reason here');
    expect(twice.status).toBe(409);
    expect(twice.body).toMatchObject({
      code: 'DUPLICATE',
      details: { messageKey: 't_looks_like_alrdy_reported_this_gig' },
    });
    expect(await prisma.report.count({ where: { targetType: 'gig', targetId: gig.id } })).toBe(1);
  });

  it('refuses guests, the owner, a short or long reason and a gig that is gone', async () => {
    const owner = await member();
    const { gig } = await saveGig(owner);
    const buyer = await member();

    expect((await report(GUEST, gig.id, 'Spam spam spam')).status).toBe(401);
    const own = await report(owner.auth, gig.id, 'Spam spam spam');
    expect(own.status).toBe(403);
    expect(own.body.details.messageKey).toBe('t_gig_owner_cant_report_his_gig');

    // Long enough for the contract, four characters after trimming.
    const short = await report(buyer.auth, gig.id, '  spam      ');
    expect(short.status).toBe(400);
    expect(short.body.details.fields[0]).toMatchObject({
      field: 'reason',
      messageKey: 't_validator_min',
      params: { min: 6 },
    });
    expect((await report(buyer.auth, gig.id, 'x'.repeat(501))).status).toBe(400);
    expect((await report(buyer.auth, gig.id, 'ფ'.repeat(500))).status).toBe(201);

    // EC-10: deleted after the page opened.
    const gone = await saveGig();
    expect((await deleteGig(gone.auth, gone.gig.id)).status).toBe(204);
    expect((await report(buyer.auth, gone.gig.id, 'Spam spam spam')).status).toBe(404);
    expect(await prisma.report.count({ where: { reporterUserId: buyer.userId } })).toBe(1);
  });

  it('counts every attempt in the hourly limit shared with profile reports (SEC-23)', async () => {
    const { gig, username } = await saveGig();
    const buyer = await member();
    // One profile report and nine refused gig reports (404) use up the ten.
    const profile = await http()
      .post(`/api/v1/users/${username}/reports`)
      .set(buyer.auth)
      .send({ reason: 'Fake profile' });
    expect(profile.status).toBe(201);
    for (let i = 0; i < 9; i += 1) {
      expect((await report(buyer.auth, crypto.randomUUID(), 'Spam spam spam')).status).toBe(404);
    }
    const limited = await report(buyer.auth, gig.id, 'Spam spam spam');
    expect(limited.status).toBe(429);
    expect(limited.body.code).toBe('RATE_LIMITED');
    expect(await prisma.report.count({ where: { targetType: 'gig', targetId: gig.id } })).toBe(0);
  });
});

describe('EV-22 Admin/GigReported email', () => {
  it('renders the subject, body and a link to the admin reports queue in both languages', () => {
    const render = (locale: 'en' | 'ka') =>
      renderEmail({
        event: 'EV-22',
        locale,
        username: 'admin',
        email: 'admin@example.com',
        appUrl: 'https://mytask.ge',
        adminUrl: 'https://admin.mytask.ge/',
        params: {},
      });
    const en = render('en');
    expect(en.subject).toBe('Gig reported');
    expect(en.text).toContain('Hi admin!');
    expect(en.text).toContain('A user has reported a gig');
    expect(en.text).toContain('https://admin.mytask.ge/reports');
    expect(render('ka').subject).toBe('განცხადება გასაჩივრებულია');
  });
});
