// QA ROADMAP 4.3.18a (independent): spec 04 acceptance criteria, rules and edge cases that the slice's own tests
// (gigs*.test.ts) do not cover, plus "wrong role tries it" on the spec 16 AC-20 staff gig operations. Same harness as
// gigs-admin.test.ts (real HTTP pipeline, contract validation, PGlite + in-process Redis, MemoryStorage). Each test
// names the AC it checks; the plan is docs/06-qa/plans/04-gigs.md.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';
import { makeStaff } from './test-staff';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
let chain: { categoryId: string; subcategoryId: string; childCategoryId: string };
let moderator: Auth;
const IOS: Auth = { 'X-MyTask-Client': 'ios', 'Accept-Language': 'en' };
const ADMIN: Auth = {
  'X-MyTask-Client': 'admin',
  Origin: 'http://localhost:3200',
  'Accept-Language': 'en',
};

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      username: `q4_${n}`,
      email: `q4${n}@example.com`,
      fullName: 'Nino Beridze',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status, JSON.stringify(reg.body)).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', emailVerifiedAt: new Date() },
  });
  return {
    userId,
    auth: { ...IOS, Authorization: `Bearer ${reg.body.session.accessToken as string}` } as Auth,
  };
}
type Member = Awaited<ReturnType<typeof member>>;

/** What the scan pipeline leaves: public image variants, or the PDF unchanged in `public_media`. */
async function file(
  ownerUserId: string,
  purpose: FilePurpose,
  status: 'ready' | 'scanning' = 'ready',
): Promise<FileRow> {
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
      status,
      bucket: 'public_media',
      objectKey: pdf ? `files/${id}` : variants!.large,
      variants,
      originalName: pdf ? 'brief.pdf' : 'cover.jpg',
      declaredType: pdf ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 12_345n,
      width: pdf ? null : 1000,
      height: pdf ? null : 750,
      readyAt: status === 'ready' ? new Date() : null,
    },
  });
}

async function category(parentId: string | null, depth: number) {
  seq += 1;
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth,
      slug: `q4-${Date.now().toString(36)}-${seq}`,
      translations: { create: [{ locale: 'ka', name: 'დიზაინი' }] },
    },
  });
}

async function wizard(userId: string, extra: Record<string, unknown> = {}) {
  const thumb = await file(userId, 'gig_thumbnail');
  const image = await file(userId, 'gig_image');
  return {
    title: { ka: 'ლოგოს დიზაინი', en: 'Logo design' },
    description: {
      ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>',
      en: '<p>Professional logo design</p>',
    },
    ...chain,
    price: { amount: 5000, currency: 'GEL' },
    deliveryDays: 3,
    revisionsAllowed: 2,
    thumbnailFileId: thumb.id,
    imageFileIds: [image.id],
    ...extra,
  };
}

const create = (auth: Auth, body: object) => http().post('/api/v1/gigs').set(auth).send(body);
const edit = (auth: Auth, id: string, body: object) =>
  http().patch(`/api/v1/gigs/${id}`).set(auth).send(body);

/** A gig saved through createGig (pending while S-070 is OFF, the default). */
async function saveGig(m?: Member, extra: Record<string, unknown> = {}) {
  const owner = m ?? (await member());
  const res = await create(owner.auth, await wizard(owner.userId, extra));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return {
    ...owner,
    gig: res.body as { id: string; uid: string; slug: string; images: { fileId: string }[] },
  };
}

const act = (gigId: string, action: string, body?: object, auth: Auth = moderator) =>
  http().post(`/api/v1/admin/gigs/${gigId}/${action}`).set(ADMIN).set(auth).send(body);

async function activeGig(m?: Member, extra: Record<string, unknown> = {}) {
  const saved = await saveGig(m, extra);
  expect((await act(saved.gig.id, 'publish')).status).toBe(200);
  return saved;
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

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  moderator = (await makeStaff(app, ['gigs.moderate'])).auth;
  const top = await category(null, 1);
  const sub = await category(top.id, 2);
  const child = await category(sub.id, 3);
  chain = { categoryId: top.id, subcategoryId: sub.id, childCategoryId: child.id };
});

beforeEach(async () => {
  // Registration (10 per IP and hour) and report (10 per user and hour) counters; sessions stay.
  const redis = app.get(RedisService).client;
  const keys = (await redis.keys('*')).filter((k) => !k.includes('session'));
  if (keys.length) await redis.del(...keys);
});

afterEach(async () => {
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: [...new Set(touched.splice(0))] } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('QA-ROLE staff gig operations (spec 16 AC-19, AC-20)', () => {
  const ops = (gigId: string): [string, string, object | undefined][] => [
    ['get', '/api/v1/admin/gigs', undefined],
    ['get', `/api/v1/admin/gigs/${gigId}`, undefined],
    ['post', `/api/v1/admin/gigs/${gigId}/publish`, {}],
    ['post', `/api/v1/admin/gigs/${gigId}/reject`, { reason: 'Not allowed' }],
    ['post', `/api/v1/admin/gigs/${gigId}/remove`, { reason: 'Not allowed' }],
    ['post', `/api/v1/admin/gigs/${gigId}/restore`, {}],
  ];
  const call = (method: string, path: string, body: object | undefined, headers: Auth) => {
    const r = method === 'get' ? http().get(path) : http().post(path);
    r.set(headers);
    return body === undefined ? r : r.send(body);
  };

  it('QA-ROLE-1: guests and signed-in users (Bearer) get 401 on all 6 operations; nothing changes', async () => {
    const { gig, auth } = await saveGig();
    for (const [method, path, body] of ops(gig.id)) {
      expect((await call(method, path, body, ADMIN)).status, `guest ${path}`).toBe(401);
      expect((await call(method, path, body, { ...ADMIN, ...auth })).status, `user ${path}`).toBe(
        401,
      );
    }
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row.status).toBe('pending');
    expect(await prisma.auditLog.count({ where: { targetType: 'gig', targetId: gig.id } })).toBe(0);
  });

  it('QA-ROLE-2: staff with another permission (kyc.review) get 403 on all 6 operations; nothing changes', async () => {
    const { gig } = await saveGig();
    const other = await makeStaff(app, ['kyc.review']);
    for (const [method, path, body] of ops(gig.id)) {
      const res = await call(method, path, body, { ...ADMIN, ...other.auth });
      expect(res.status, path).toBe(403);
      expect(res.body.details?.permission, path).toBe('gigs.moderate');
    }
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).status).toBe('pending');
    expect(await prisma.auditLog.count({ where: { targetType: 'gig', targetId: gig.id } })).toBe(0);
  });

  it('QA-ROLE-3: each decision only from its state (first decision wins); unknown gig → 404', async () => {
    const pending = await saveGig();
    expect((await act(pending.gig.id, 'restore')).status).toBe(409);
    const rejected = await saveGig();
    expect((await act(rejected.gig.id, 'reject', { reason: 'Fix photos' })).status).toBe(200);
    for (const [action, body] of [
      ['publish', undefined],
      ['reject', { reason: 'Again' }],
      ['remove', { reason: 'Spam' }],
      ['restore', undefined],
    ] as const) {
      const res = await act(rejected.gig.id, action, body);
      expect(res.status, action).toBe(409);
      expect(res.body.details.currentState).toBe('rejected');
    }
    const active = await activeGig();
    expect((await act(active.gig.id, 'reject', { reason: 'Late' })).status).toBe(409);
    expect((await act(active.gig.id, 'restore')).status).toBe(409);
    // An owner deletion is not a staff state: staff can neither remove nor restore it.
    expect((await http().delete(`/api/v1/gigs/${active.gig.id}`).set(active.auth)).status).toBe(
      204,
    );
    expect((await act(active.gig.id, 'remove', { reason: 'Spam' })).status).toBe(409);
    expect((await act(active.gig.id, 'publish')).status).toBe(409);
    expect((await act(crypto.randomUUID(), 'publish')).status).toBe(404);
  });
});

describe('QA-OWN other users and the owner (AC-28, AC-39, R-G10, contract x-permission)', () => {
  it('QA-OWN-1: a stranger gets 404 on every owner and page operation of a pending gig; nothing changes', async () => {
    const { gig } = await saveGig();
    const stranger = await member();
    const s = stranger.auth;
    const results = {
      page: (await http().get(`/api/v1/gigs/${gig.id}`).set(s)).status,
      lookup: (await http().get('/api/v1/gigs/lookup').query({ uid: gig.uid }).set(s)).status,
      related: (await http().get(`/api/v1/gigs/${gig.id}/related`).set(s)).status,
      ownerView: (await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(s)).status,
      analytics: (await http().get(`/api/v1/gigs/${gig.id}/analytics`).set(s)).status,
      edit: (await edit(s, gig.id, { deliveryDays: 1 })).status,
      delete: (await http().delete(`/api/v1/gigs/${gig.id}`).set(s)).status,
      view: (await http().post(`/api/v1/gigs/${gig.id}/views`).set(s).send({ referrer: null }))
        .status,
      favorite: (await http().put(`/api/v1/favorites/${gig.id}`).set(s)).status,
      report: (
        await http()
          .post(`/api/v1/gigs/${gig.id}/reports`)
          .set(s)
          .send({ reason: 'Copied from another seller' })
      ).status,
    };
    expect(results).toEqual({
      page: 404,
      lookup: 404,
      related: 404,
      ownerView: 404,
      analytics: 404,
      edit: 404,
      delete: 404,
      view: 404,
      favorite: 404,
      report: 404,
    });
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row).toMatchObject({ status: 'pending', deliveryDays: 3, visitsCount: 0n });
    expect(await prisma.favorite.count({ where: { gigId: gig.id } })).toBe(0);
    expect(await prisma.report.count({ where: { targetType: 'gig', targetId: gig.id } })).toBe(0);
  });

  it('QA-OWN-2: on an active gig a stranger may read, favourite and report, but not edit, delete or see analytics', async () => {
    const { gig } = await activeGig();
    const { auth } = await member();
    expect((await http().get(`/api/v1/gigs/${gig.id}`).set(auth)).status).toBe(200);
    expect((await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(auth)).status).toBe(404);
    expect((await http().get(`/api/v1/gigs/${gig.id}/analytics`).set(auth)).status).toBe(404);
    expect((await edit(auth, gig.id, { price: { amount: 100, currency: 'GEL' } })).status).toBe(
      404,
    );
    expect((await http().delete(`/api/v1/gigs/${gig.id}`).set(auth)).status).toBe(404);
    expect((await http().put(`/api/v1/favorites/${gig.id}`).set(auth)).status).toBe(200);
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row).toMatchObject({ status: 'active', priceTetri: 5000n });
  });

  it('QA-OWN-3: the owner reads analytics of their pending and rejected gigs (AC-39)', async () => {
    const { gig, auth } = await saveGig();
    expect((await http().get(`/api/v1/gigs/${gig.id}/analytics`).set(auth)).status).toBe(200);
    expect((await act(gig.id, 'reject', { reason: 'Better photos please' })).status).toBe(200);
    const res = await http().get(`/api/v1/gigs/${gig.id}/analytics`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ gigId: gig.id, clickCount: 0, recentOrders: [] });
  });
});

describe('QA-STAFF staff removal seen from the owner and buyers (spec 16 AC-20, AC-24, AC-36)', () => {
  it('QA-STAFF-1: a removed gig is gone for its owner too (no edit can revive it), and comes back on restore', async () => {
    const owner = await member();
    const { gig } = await activeGig(owner);
    const buyer = await member();
    expect((await http().put(`/api/v1/favorites/${gig.id}`).set(buyer.auth)).status).toBe(200);
    expect((await act(gig.id, 'remove', { reason: 'Copied content' })).status).toBe(200);

    const o = owner.auth;
    expect((await http().get(`/api/v1/gigs/${gig.id}`).set(o)).status).toBe(404);
    expect((await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(o)).status).toBe(404);
    expect((await http().get(`/api/v1/gigs/${gig.id}/analytics`).set(o)).status).toBe(404);
    expect((await edit(o, gig.id, { deliveryDays: 1 })).status).toBe(404);
    expect((await http().delete(`/api/v1/gigs/${gig.id}`).set(o)).status).toBe(404);
    expect((await http().get('/api/v1/gigs/mine').set(o)).body.data).toEqual([]);
    expect((await http().get('/api/v1/gigs/creation-eligibility').set(o)).body).toMatchObject({
      gigCount: 0,
      canCreate: true,
    });
    expect((await http().get('/api/v1/favorites').set(buyer.auth)).body.data).toEqual([]);
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).status).toBe('deleted');

    expect((await act(gig.id, 'restore')).status).toBe(200);
    const mine = await http().get('/api/v1/gigs/mine').set(o);
    expect(mine.body.data.map((g: { id: string; status: string }) => [g.id, g.status])).toEqual([
      [gig.id, 'active'],
    ]);
    expect((await http().get(`/api/v1/gigs/${gig.id}`).set(IOS)).status).toBe(200);
    const favs = await http().get('/api/v1/favorites').set(buyer.auth);
    expect(favs.body.data.map((c: { id: string }) => c.id)).toEqual([gig.id]);
  });

  it('QA-STAFF-2: restore counts pending and rejected gigs against the owner limit (R-G3)', async () => {
    const owner = await member();
    await withSetting('S-001', 'plans.standard.gig_limit', 3);
    const { gig } = await activeGig(owner);
    expect((await act(gig.id, 'remove', { reason: 'Check' })).status).toBe(200);
    const second = await saveGig(owner);
    expect((await act(second.gig.id, 'reject', { reason: 'Fix it' })).status).toBe(200);
    await saveGig(owner); // pending
    expect((await act(gig.id, 'restore')).status).toBe(200); // 2 + 1 = 3 fits
    expect((await act(gig.id, 'remove', { reason: 'Check again' })).status).toBe(200);
    await saveGig(owner); // now 3 non-deleted (pending, rejected, pending)
    const res = await act(gig.id, 'restore');
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({ code: 'PLAN_LIMIT_REACHED', details: { count: 3, limit: 3 } });
  });
});

describe('QA-LIMIT plan limit on create (AC-2, AC-3, R-G3, EC-1)', () => {
  it('QA-LIMIT-1: pending and rejected gigs count; deleting one frees the slot', async () => {
    const owner = await member();
    await withSetting('S-001', 'plans.standard.gig_limit', 2);
    const first = await saveGig(owner);
    expect((await act(first.gig.id, 'reject', { reason: 'Fix it' })).status).toBe(200);
    await saveGig(owner);
    const eligibility = await http().get('/api/v1/gigs/creation-eligibility').set(owner.auth);
    expect(eligibility.body).toMatchObject({ canCreate: false, gigCount: 2, gigLimit: 2 });
    const third = await create(owner.auth, await wizard(owner.userId));
    expect(third.status).toBe(422);
    expect(third.body.code).toBe('PLAN_LIMIT_REACHED');
    expect((await http().delete(`/api/v1/gigs/${first.gig.id}`).set(owner.auth)).status).toBe(204);
    expect((await create(owner.auth, await wizard(owner.userId))).status).toBe(201);
  });

  it('QA-LIMIT-2: S-001 left empty in the admin (null) means unlimited', async () => {
    const owner = await member();
    await withSetting('S-001', 'plans.standard.gig_limit', null);
    for (let i = 0; i < 3; i += 1) await saveGig(owner);
    const eligibility = await http().get('/api/v1/gigs/creation-eligibility').set(owner.auth);
    expect(eligibility.body).toMatchObject({ canCreate: true, gigCount: 3, gigLimit: null });
  });
});

describe('QA-MASS fields the client may not set (AC-16, AC-22, R-G4)', () => {
  it('QA-MASS-1: status, owner, counters, slug and uid in the body are never applied', async () => {
    const owner = await member();
    const other = await member();
    const body = await wizard(owner.userId, {
      status: 'active',
      ownerId: other.userId,
      ordersInQueue: 7,
      ordersInQueueCount: 7,
      slug: 'my-own-slug',
      uid: 'AAAAAAAAAAAAAAAAAAAA',
      publishedAt: new Date().toISOString(),
      isFeatured: true,
    });
    // The request validator keeps unknown properties (removeAdditional false) and the service picks its fields.
    const res = await create(owner.auth, body);
    expect(res.status).toBe(201);
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(row).toMatchObject({ ownerId: owner.userId, status: 'pending', ordersInQueue: 0 });
    expect(row.publishedAt).toBeNull();
    expect(row.slug).not.toBe('my-own-slug');
    expect(row.uid).not.toBe('AAAAAAAAAAAAAAAAAAAA');

    // A rejected gig cannot publish itself through an edit while S-070 is OFF.
    expect((await act(row.id, 'reject', { reason: 'Fix it' })).status).toBe(200);
    const patched = await edit(owner.auth, row.id, {
      deliveryDays: 5,
      status: 'active',
      rejectionReason: null,
      ownerId: other.userId,
      ordersInQueue: 0,
    });
    expect(patched.status).toBe(200);
    const after = await prisma.gig.findUniqueOrThrow({ where: { id: row.id } });
    expect(after).toMatchObject({ ownerId: owner.userId, status: 'pending', deliveryDays: 5 });
  });
});

describe('QA-FILE gig files on edit and delete (AC-14, AC-23, ADR-009)', () => {
  it('QA-FILE-1: an edit takes only the owner’s own ready files of the right purpose, unused by another gig', async () => {
    const owner = await member();
    await withSetting('S-001', 'plans.standard.gig_limit', 5);
    const { gig } = await saveGig(owner);
    const other = await saveGig(owner);
    const stranger = await member();
    const before = (await prisma.gigImage.findMany({ where: { gigId: gig.id } })).map(
      (i) => i.fileId,
    );
    const cases: [Record<string, unknown>, string][] = [
      [{ imageFileIds: [(await file(stranger.userId, 'gig_image')).id] }, 'FILE_PURPOSE_MISMATCH'],
      [{ imageFileIds: [other.gig.images[0]!.fileId] }, 'FILE_PURPOSE_MISMATCH'],
      [{ imageFileIds: [(await file(owner.userId, 'gig_thumbnail')).id] }, 'FILE_PURPOSE_MISMATCH'],
      [
        { thumbnailFileId: (await file(stranger.userId, 'gig_thumbnail')).id },
        'FILE_PURPOSE_MISMATCH',
      ],
      [{ imageFileIds: [(await file(owner.userId, 'avatar')).id] }, 'FILE_PURPOSE_MISMATCH'],
      [
        { imageFileIds: [(await file(owner.userId, 'gig_image', 'scanning')).id] },
        'FILE_NOT_READY',
      ],
      [
        { documentFileIds: [(await file(stranger.userId, 'gig_document')).id] },
        'FILE_PURPOSE_MISMATCH',
      ],
    ];
    for (const [body, code] of cases) {
      const res = await edit(owner.auth, gig.id, body);
      expect(res.status, JSON.stringify(body)).toBe(422);
      expect(res.body.code).toBe(code);
    }
    expect(
      (await prisma.gigImage.findMany({ where: { gigId: gig.id } })).map((i) => i.fileId),
    ).toEqual(before);
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).status).toBe('pending');
  });

  it('QA-FILE-2: the gallery stays within 1…S-077 on edit; a repeated id is kept once', async () => {
    const owner = await member();
    await withSetting('S-077', 'media.gig.max_images', 2);
    const { gig } = await saveGig(owner);
    expect((await edit(owner.auth, gig.id, { imageFileIds: [] })).status).toBe(400);
    const three = [
      (await file(owner.userId, 'gig_image')).id,
      (await file(owner.userId, 'gig_image')).id,
      (await file(owner.userId, 'gig_image')).id,
    ];
    const tooMany = await edit(owner.auth, gig.id, { imageFileIds: three });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.details.fields[0]).toMatchObject({
      field: 'imageFileIds',
      code: 'max_items',
    });
    const twice = await edit(owner.auth, gig.id, { imageFileIds: [three[0], three[0]] });
    expect(twice.status).toBe(200);
    expect(twice.body.images.map((i: { fileId: string }) => i.fileId)).toEqual([three[0]]);
  });

  it('QA-FILE-3: a stranger cannot delete a gig’s files (404); the owner gets 409 while attached', async () => {
    const owner = await member();
    const { gig } = await saveGig(owner);
    const stranger = await member();
    const fileId = gig.images[0]!.fileId;
    expect((await http().delete(`/api/v1/files/${fileId}`).set(stranger.auth)).status).toBe(404);
    expect((await http().delete(`/api/v1/files/${fileId}`).set(owner.auth)).status).toBe(409);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: fileId } })).status).toBe('ready');
  });
});

describe('QA-VAL field limits through HTTP (AC-4, AC-8, AC-9, AC-11, AC-12, AC-15, R-G1)', () => {
  it('QA-VAL-1: boundary values are accepted', async () => {
    const owner = await member();
    await withSetting('S-001', 'plans.standard.gig_limit', 10);
    const ok = await create(
      owner.auth,
      await wizard(owner.userId, {
        title: { ka: 'ლოგ', en: 'L'.repeat(100) },
        price: { amount: 100, currency: 'GEL' }, // 1.00 GEL (P-35)
        revisionsAllowed: 0,
        deliveryDays: 0,
        upgrades: Array.from({ length: 10 }, (_, i) => ({
          title: `განახლება ${i}`,
          price: { amount: 999_999_999, currency: 'GEL' }, // 9999999.99 = 10 characters
          extraDays: 30,
        })),
        faqs: Array.from({ length: 10 }, () => ({
          question: 'ა'.repeat(100),
          answer: 'ბ'.repeat(300),
        })),
        seo: { title: 's'.repeat(100), description: 'd'.repeat(150) },
      }),
    );
    expect(ok.status, JSON.stringify(ok.body)).toBe(201);
    expect(ok.body).toMatchObject({ revisionsAllowed: 0, deliveryDays: 0, price: { amount: 100 } });
    expect(ok.body.upgrades).toHaveLength(10);
    expect(ok.body.faqs).toHaveLength(10);
  });

  it('QA-VAL-2: one step past each boundary is refused with 400 and nothing is saved', async () => {
    const owner = await member();
    const up = (extra: object) => ({
      title: 'განახლება',
      price: { amount: 1000, currency: 'GEL' },
      extraDays: 1,
      ...extra,
    });
    const faq = (extra: object) => ({ question: 'კითხვა', answer: 'პასუხი', ...extra });
    const cases: [string, Record<string, unknown>][] = [
      ['title.ka 101', { title: { ka: 'ა'.repeat(101), en: null } }],
      ['title.en 2', { title: { ka: 'ლოგოს დიზაინი', en: 'Lo' } }],
      ['price 0.99', { price: { amount: 99, currency: 'GEL' } }],
      ['price 10 000 000.00', { price: { amount: 1_000_000_000, currency: 'GEL' } }],
      ['price in USD', { price: { amount: 5000, currency: 'USD' } }],
      ['revisions -1', { revisionsAllowed: -1 }],
      ['revisions 2.5', { revisionsAllowed: 2.5 }],
      ['revisions null', { revisionsAllowed: null }],
      ['revisions 11 (S-041 10)', { revisionsAllowed: 11 }],
      ['delivery 8', { deliveryDays: 8 }],
      ['upgrade extra days 8', { upgrades: [up({ extraDays: 8 })] }],
      ['upgrade title 101', { upgrades: [up({ title: 'ა'.repeat(101) })] }],
      ['11 upgrades', { upgrades: Array.from({ length: 11 }, () => up({})) }],
      ['FAQ question 101', { faqs: [faq({ question: 'ა'.repeat(101) })] }],
      ['FAQ answer 301', { faqs: [faq({ answer: 'ა'.repeat(301) })] }],
      ['11 FAQs', { faqs: Array.from({ length: 11 }, () => faq({})) }],
      ['SEO title 101', { seo: { title: 's'.repeat(101), description: 'desc' } }],
      ['SEO description 151', { seo: { title: 'title', description: 'd'.repeat(151) } }],
      ['no images', { imageFileIds: [] }],
    ];
    for (const [name, extra] of cases) {
      const res = await create(owner.auth, await wizard(owner.userId, extra));
      expect(res.status, name).toBe(400);
    }
    expect(await prisma.gig.count({ where: { ownerId: owner.userId } })).toBe(0);
  });
});

describe('QA-SAN description sanitising through the public page (AC-4, CONVENTIONS §19)', () => {
  it('QA-SAN-1: scripts, handlers, javascript: links, frames, styles and images never reach getGig', async () => {
    const owner = await member();
    const nasty = (text: string, link: string, bold: string) =>
      `<p>${text} <a href="javascript:alert(1)">${link}</a></p>` +
      '<img src="x" onerror="alert(1)"><iframe src="https://evil.example"></iframe>' +
      '<style>body{display:none}</style><svg onload="alert(1)"></svg>' +
      `<p style="position:fixed" class="x" id="y"><strong onmouseover="alert(1)">${bold}</strong></p>`;
    const { gig } = await activeGig(owner, {
      description: {
        ka: nasty('პროფესიონალური ლოგოს დიზაინი', 'ბმული', 'ძლიერი'),
        en: nasty('Professional logo design', 'link', 'strong'),
      },
    });
    for (const locale of ['ka', 'en']) {
      const page = await http()
        .get(`/api/v1/gigs/${gig.id}`)
        .set({ ...IOS, 'Accept-Language': locale });
      expect(page.status).toBe(200);
      const html = JSON.stringify(page.body.description);
      for (const bad of [
        '<script',
        'javascript:',
        'onerror',
        'onload',
        'onmouseover',
        '<iframe',
        '<style',
        '<svg',
        '<img',
        'style=',
        'class=',
        'id=',
      ]) {
        expect(html, `${locale} ${bad}`).not.toContain(bad);
      }
      expect(html).toContain('<strong>');
    }
  });
});

describe('QA-REP report rules (AC-37, EC-10)', () => {
  it('QA-REP-1: the reason counts 6…500 characters after trimming; rejected and pending gigs are 404', async () => {
    const { gig } = await activeGig();
    const report = async (reason: string) => {
      const m = await member();
      return http().post(`/api/v1/gigs/${gig.id}/reports`).set(m.auth).send({ reason });
    };
    expect((await report('   abcde   ')).status).toBe(400);
    expect((await report('  abcdef  ')).status).toBe(201);
    expect((await report('ა'.repeat(500))).status).toBe(201);
    expect((await report('ა'.repeat(501))).status).toBe(400);

    const hidden = await saveGig();
    const m = await member();
    const send = () =>
      http()
        .post(`/api/v1/gigs/${hidden.gig.id}/reports`)
        .set(m.auth)
        .send({ reason: 'Copied text' });
    expect((await send()).status).toBe(404); // pending
    expect((await act(hidden.gig.id, 'reject', { reason: 'Fix it' })).status).toBe(200);
    expect((await send()).status).toBe(404); // rejected
    expect(
      await prisma.report.count({ where: { targetType: 'gig', targetId: hidden.gig.id } }),
    ).toBe(0);
  });
});
