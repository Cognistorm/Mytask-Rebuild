// Portfolio (ROADMAP 4.1.12; spec 02 AC-24…AC-28, AC-42, R-P6; spec 16 AC-19, AC-21): the owner's create, edit
// and delete with S-071 / S-089 and EV-14, the public list, item and lookup, and the staff queue with approve
// (EV-15), reject with a reason (EV-126) and remove. Object storage is MemoryStorage.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
import { RedisService } from '../src/platform/redis/redis.module';
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
let moderator: Auth;

/** A registered, active user. */
async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const username = `pf_${n}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username,
      email: `pf${n}@example.com`,
      fullName: 'Giorgi Kapanadze',
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
    username,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

const imageBody = {
  purpose: 'portfolio_image',
  fileName: 'work.png',
  sizeBytes: 80_000,
  contentType: 'image/png',
};

/** Upload slot; `ready` = what the scan pipeline (4.1.4) leaves for a public image. */
async function image(auth: Auth, ready = true): Promise<FileRow> {
  const res = await http().post('/api/v1/files').set(auth).send(imageBody);
  expect(res.status).toBe(201);
  const id = res.body.file.id as string;
  if (!ready) return prisma.file.findUniqueOrThrow({ where: { id } });
  const variants = {
    thumb: `images/${id}/thumb.webp`,
    medium: `images/${id}/medium.webp`,
    large: `images/${id}/large.webp`,
  };
  for (const key of Object.values(variants)) {
    await storage.put({
      bucket: 'public_media',
      key,
      body: Buffer.from('webp'),
      contentType: 'image/webp',
    });
  }
  return prisma.file.update({
    where: { id },
    data: {
      status: 'ready',
      readyAt: new Date(),
      bucket: 'public_media',
      objectKey: variants.large,
      variants,
      width: 1000,
      height: 750,
    },
  });
}

async function setSetting(registerId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}
const autoApprove = (on: boolean) => setSetting('S-071', 'moderation.portfolio.auto_approve', on);
const maxImages = (n: number) => setSetting('S-089', 'media.portfolio.max_images', n);

/** A valid create body with a fresh thumbnail and `images` gallery files. */
async function itemBody(auth: Auth, images = 2) {
  const thumb = await image(auth);
  const gallery = [];
  for (let i = 0; i < images; i += 1) gallery.push((await image(auth)).id);
  return {
    title: 'ლოგოს დიზაინი Brand',
    description: 'A logo and brand book for a coffee shop.',
    thumbnailFileId: thumb.id,
    imageFileIds: gallery,
    projectUrl: 'https://example.com/work',
    videoUrl: null,
  };
}

const create = (auth: Auth, body: object) =>
  http().post('/api/v1/portfolio-items').set(auth).send(body);
const list = (username: string, auth: Auth = {}, query = '') =>
  http().get(`/api/v1/portfolio-items?username=${username}${query}`).set(auth);
const get = (id: string, auth: Auth = {}) => http().get(`/api/v1/portfolio-items/${id}`).set(auth);
const events = (aggregateId: string, eventType: string) =>
  prisma.outboxEvent.findMany({ where: { aggregateId, eventType } });

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  moderator = (await makeStaff(app, ['portfolio.moderate'])).auth;
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour; keep the staff session (it lives in the database).
  const redis = app.get(RedisService).client;
  const keys = (await redis.keys('*')).filter((k) => !k.includes('session'));
  if (keys.length) await redis.del(...keys);
  await autoApprove(false);
  await maxImages(10);
});

afterAll(async () => {
  await autoApprove(false);
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('createPortfolioItem (AC-24, AC-25)', () => {
  it('saves a pending item with slug = title slug + uid and emails S-100 (EV-14) when S-071 is OFF', async () => {
    const { auth, userId } = await member();
    const body = await itemBody(auth);
    const res = await create(auth, body);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.uid).toMatch(/^[0-9A-F]{20}$/);
    expect(res.body.slug).toBe(`logos-dizaini-brand-${res.body.uid as string}`);
    expect(res.body.isOwn).toBe(true);
    expect(res.body.publishedAt).toBeNull();
    expect(res.body.owner.id).toBe(userId);
    expect(res.body.thumbnail.fileId).toBe(body.thumbnailFileId);
    expect(res.body.thumbnail.medium).toBe(`${MEDIA}/images/${body.thumbnailFileId}/medium.webp`);
    expect(res.body.images.map((i: { fileId: string }) => i.fileId)).toEqual(body.imageFileIds);
    expect(res.body.projectUrl).toBe('https://example.com/work');
    const ev = await events(res.body.id, 'EV-14');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.payload).toMatchObject({ locale: 'ka', params: { title: body.title } });
  });

  it('publishes at once without an admin email when S-071 is ON', async () => {
    await autoApprove(true);
    const { auth } = await member();
    const res = await create(auth, await itemBody(auth));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    expect(res.body.publishedAt).not.toBeNull();
    expect(await events(res.body.id, 'EV-14')).toHaveLength(0);
  });

  it('checks trimmed texts, http(s) links and the S-089 gallery limit', async () => {
    const { auth } = await member();
    const body = await itemBody(auth, 3);
    const short = await create(auth, { ...body, title: '  ab   ' });
    expect(short.status).toBe(400);
    expect(short.body.details.fields[0]).toMatchObject({ field: 'title', code: 'too_short' });
    const desc = await create(auth, { ...body, description: '   short      ' });
    expect(desc.status).toBe(400);
    expect(desc.body.details.fields[0].field).toBe('description');
    const link = await create(auth, { ...body, videoUrl: 'javascript:alert(1)' });
    expect(link.status).toBe(400);
    expect(link.body.details.fields[0]).toMatchObject({ field: 'videoUrl', code: 'format' });
    await maxImages(2);
    const many = await create(auth, body);
    expect(many.status).toBe(400);
    expect(many.body.details.fields[0]).toMatchObject({
      field: 'imageFileIds',
      code: 'max_items',
      params: { max: 2 },
    });
    const none = await create(auth, { ...body, imageFileIds: [] });
    expect(none.status).toBe(400);
  });

  it('accepts only ready own portfolio_image files not used by another item', async () => {
    const { auth } = await member();
    const other = await member();
    const body = await itemBody(auth, 1);
    const foreign = await image(other.auth);
    const res1 = await create(auth, { ...body, thumbnailFileId: foreign.id });
    expect(res1.status).toBe(422);
    expect(res1.body.code).toBe('FILE_PURPOSE_MISMATCH');
    const pending = await image(auth, false);
    const res2 = await create(auth, { ...body, imageFileIds: [pending.id] });
    expect(res2.status).toBe(422);
    expect(res2.body.code).toBe('FILE_NOT_READY');
    const ok = await create(auth, body);
    expect(ok.status).toBe(201);
    const reused = await create(auth, {
      ...(await itemBody(auth, 1)),
      imageFileIds: body.imageFileIds,
    });
    expect(reused.status).toBe(422);
    expect(reused.body.code).toBe('FILE_PURPOSE_MISMATCH');
  });

  it('keeps attached files from deleteFile (409)', async () => {
    const { auth } = await member();
    const body = await itemBody(auth, 1);
    expect((await create(auth, body)).status).toBe(201);
    const res = await http().delete(`/api/v1/files/${body.imageFileIds[0]!}`).set(auth);
    expect(res.status).toBe(409);
  });

  it('needs a session', async () => {
    const res = await http()
      .post('/api/v1/portfolio-items')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        title: 'Logo design',
        description: 'A logo for a coffee shop.',
        thumbnailFileId: '0190a6e0-0000-7000-8000-000000000001',
        imageFileIds: ['0190a6e0-0000-7000-8000-000000000002'],
      });
    expect(res.status).toBe(401);
  });
});

describe('listPortfolioItems / getPortfolioItem / lookupPortfolioItem (AC-28, AC-42)', () => {
  it('shows others only active items, newest first, and the owner every own item', async () => {
    const { auth, username } = await member();
    const pending = await create(auth, await itemBody(auth, 1));
    await autoApprove(true);
    const a = await create(auth, await itemBody(auth, 1));
    const b = await create(auth, await itemBody(auth, 1));
    const guest = await list(username);
    expect(guest.status).toBe(200);
    expect(guest.body.data.map((i: { id: string }) => i.id)).toEqual([b.body.id, a.body.id]);
    expect(guest.body.nextCursor).toBeNull();
    const own = await list(username, auth);
    expect(own.body.data.map((i: { id: string }) => i.id)).toEqual([
      b.body.id,
      a.body.id,
      pending.body.id,
    ]);
    expect(own.body.data[2]).toMatchObject({ status: 'pending', uid: pending.body.uid });
  });

  it('pages with an opaque cursor and refuses a forged one', async () => {
    await autoApprove(true);
    const { auth, username } = await member();
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push((await create(auth, await itemBody(auth, 1))).body.id);
    const first = await list(username, {}, '&limit=2');
    expect(first.body.data.map((i: { id: string }) => i.id)).toEqual([ids[2], ids[1]]);
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await list(username, {}, `&limit=2&cursor=${first.body.nextCursor as string}`);
    expect(second.body.data.map((i: { id: string }) => i.id)).toEqual([ids[0]]);
    expect(second.body.nextCursor).toBeNull();
    const bad = await list(username, {}, '&cursor=bm9wZQ');
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields[0].field).toBe('cursor');
  });

  it('answers 404 for unknown or hidden profiles', async () => {
    expect((await list('nobody_here_xyz')).status).toBe(404);
    await autoApprove(true);
    const { auth, username, userId } = await member();
    const item = await create(auth, await itemBody(auth, 1));
    await prisma.user.update({ where: { id: userId }, data: { status: 'banned' } });
    expect((await list(username)).status).toBe(404);
    expect((await get(item.body.id)).status).toBe(404);
  });

  it('hides pending items from everyone but the owner, by id, uid and slug', async () => {
    const { auth } = await member();
    const other = await member();
    const item = (await create(auth, await itemBody(auth, 1))).body;
    expect((await get(item.id)).status).toBe(404);
    expect((await get(item.id, other.auth)).status).toBe(404);
    expect((await get(item.id, auth)).status).toBe(200);
    const bySlug = await http()
      .get(`/api/v1/portfolio-items/lookup?slug=${item.slug as string}`)
      .set(auth);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.id).toBe(item.id);
    const guest = await http().get(`/api/v1/portfolio-items/lookup?uid=${item.uid as string}`);
    expect(guest.status).toBe(404);
  });

  it('finds an active item by uid or by an old slug, and needs exactly one of them', async () => {
    await autoApprove(true);
    const { auth } = await member();
    const item = (await create(auth, await itemBody(auth, 1))).body;
    const byUid = await http().get(`/api/v1/portfolio-items/lookup?uid=${item.uid as string}`);
    expect(byUid.status).toBe(200);
    expect(byUid.body.isOwn).toBe(false);
    const oldSlug = await http().get(
      `/api/v1/portfolio-items/lookup?slug=old-title-${item.uid as string}`,
    );
    expect(oldSlug.body.id).toBe(item.id);
    expect(oldSlug.body.slug).toBe(item.slug);
    const both = await http().get(
      `/api/v1/portfolio-items/lookup?uid=${item.uid as string}&slug=${item.slug as string}`,
    );
    expect(both.status).toBe(400);
    expect((await http().get('/api/v1/portfolio-items/lookup')).status).toBe(400);
    expect((await http().get('/api/v1/portfolio-items/lookup?slug=no-uid')).status).toBe(404);
  });
});

describe('updatePortfolioItem / deletePortfolioItem (AC-25, AC-27, AC-42)', () => {
  it('replaces the gallery, deletes the files no longer used and goes back to pending (EV-14)', async () => {
    await autoApprove(true);
    const { auth } = await member();
    const body = await itemBody(auth, 2);
    const item = (await create(auth, body)).body;
    await autoApprove(false);
    const newThumb = await image(auth);
    const newImage = await image(auth);
    const res = await http()
      .patch(`/api/v1/portfolio-items/${item.id as string}`)
      .set(auth)
      .send({
        title: 'New title',
        thumbnailFileId: newThumb.id,
        imageFileIds: [body.imageFileIds[1], newImage.id],
        projectUrl: null,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.slug).toBe(`new-title-${item.uid as string}`);
    expect(res.body.description).toBe(body.description);
    expect(res.body.projectUrl).toBeNull();
    expect(res.body.publishedAt).toBe(item.publishedAt);
    expect(res.body.images.map((i: { fileId: string }) => i.fileId)).toEqual([
      body.imageFileIds[1],
      newImage.id,
    ]);
    const files = await prisma.file.findMany({
      where: { id: { in: [body.thumbnailFileId, ...body.imageFileIds] } },
    });
    const status = Object.fromEntries(files.map((f) => [f.id, f.status]));
    expect(status[body.thumbnailFileId]).toBe('deleted');
    expect(status[body.imageFileIds[0]!]).toBe('deleted');
    expect(status[body.imageFileIds[1]!]).toBe('ready');
    expect(await events(item.id, 'EV-14')).toHaveLength(1);
  });

  it("lets only the owner edit or delete (others 404) and deletes the item's files", async () => {
    const { auth } = await member();
    const other = await member();
    const body = await itemBody(auth, 1);
    const item = (await create(auth, body)).body;
    const path = `/api/v1/portfolio-items/${item.id as string}`;
    expect((await http().patch(path).set(other.auth).send({ title: 'Mine now' })).status).toBe(404);
    expect((await http().delete(path).set(other.auth)).status).toBe(404);
    expect((await http().delete(path).set(auth)).status).toBe(204);
    expect(await prisma.portfolioItem.count({ where: { id: item.id } })).toBe(0);
    const files = await prisma.file.findMany({
      where: { id: { in: [body.thumbnailFileId, ...body.imageFileIds] } },
    });
    expect(files.every((f) => f.status === 'deleted')).toBe(true);
    expect(storage.has('public_media', `images/${body.thumbnailFileId}/large.webp`)).toBe(false);
  });
});

describe('staff portfolio queue (spec 16 AC-19, AC-21; AC-26, AC-42)', () => {
  it('lists the pending queue oldest first with the owner summary and totalCount', async () => {
    const { auth, userId } = await member();
    const first = (await create(auth, await itemBody(auth, 1))).body;
    const second = (await create(auth, await itemBody(auth, 1))).body;
    const res = await http().get(`/api/v1/admin/portfolio-items?userId=${userId}`).set(moderator);
    expect(res.status).toBe(200);
    expect(res.body.totalCount).toBe(2);
    expect(res.body.data.map((d: { item: { id: string } }) => d.item.id)).toEqual([
      first.id,
      second.id,
    ]);
    expect(res.body.data[0].owner).toMatchObject({
      user: { id: userId },
      status: 'active',
      plan: 'standard',
      kycStatus: 'none',
      earlierRejectionCount: 0,
    });
    expect(res.body.data[0].decidedBy).toBeNull();
  });

  it('refuses staff without portfolio.moderate', async () => {
    const none = await makeStaff(app, 'none');
    const res = await http().get('/api/v1/admin/portfolio-items').set(none.auth);
    expect(res.status).toBe(403);
  });

  it('approves once (EV-15, audit) and the item becomes public', async () => {
    const { auth, userId } = await member();
    const item = (await create(auth, await itemBody(auth, 1))).body;
    const path = `/api/v1/admin/portfolio-items/${item.id as string}`;
    const res = await http().post(`${path}/approve`).set(moderator).send({ note: 'Looks good' });
    expect(res.status).toBe(200);
    expect(res.body.item.status).toBe('active');
    expect(res.body.item.publishedAt).not.toBeNull();
    expect(res.body.decidedBy).not.toBeNull();
    expect((await get(item.id)).status).toBe(200);
    const ev = await events(item.id, 'EV-15');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.payload).toMatchObject({ userId, params: { title: item.title } });
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'portfolio.approve', targetId: item.id },
    });
    expect(audit).toMatchObject({ reason: 'Looks good', permissionCode: 'portfolio.moderate' });
    const again = await http().post(`${path}/approve`).set(moderator);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('STATE_CONFLICT');
    expect((await http().post(`${path}/reject`).set(moderator).send({ reason: 'x' })).status).toBe(
      409,
    );
  });

  it('rejects with a reason shown only to the owner (EV-126); the next edit clears it', async () => {
    const { auth, userId, username } = await member();
    const item = (await create(auth, await itemBody(auth, 1))).body;
    const path = `/api/v1/admin/portfolio-items/${item.id as string}`;
    expect(
      (await http().post(`${path}/reject`).set(moderator).send({ reason: '   ' })).status,
    ).toBe(400);
    const res = await http()
      .post(`${path}/reject`)
      .set(moderator)
      .send({ reason: ' Images are not your own work. ' });
    expect(res.status).toBe(200);
    expect(res.body.item).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Images are not your own work.',
    });
    const ev = await events(item.id, 'EV-126');
    expect(ev[0]!.payload).toMatchObject({
      userId,
      params: { title: item.title, reason: 'Images are not your own work.' },
    });
    const own = await get(item.id, auth);
    expect(own.body).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Images are not your own work.',
    });
    expect(own.body.rejectedAt).not.toBeNull();
    expect((await get(item.id)).status).toBe(404);
    expect((await list(username)).body.data).toHaveLength(0);
    const edited = await http()
      .patch(`/api/v1/portfolio-items/${item.id as string}`)
      .set(auth)
      .send({ description: 'Now with my own pictures only.' });
    expect(edited.body).toMatchObject({
      status: 'pending',
      rejectionReason: null,
      rejectedAt: null,
    });
    const queue = await http().get(`/api/v1/admin/portfolio-items?userId=${userId}`).set(moderator);
    expect(queue.body.data[0].owner.earlierRejectionCount).toBe(1);
    expect(queue.body.data[0].decidedBy).toBeNull();
  });

  it('removes any item with a reason, with its files, audited', async () => {
    await autoApprove(true);
    const { auth } = await member();
    const body = await itemBody(auth, 1);
    const item = (await create(auth, body)).body;
    const path = `/api/v1/admin/portfolio-items/${item.id as string}`;
    expect((await http().post(`${path}/remove`).set(moderator).send({})).status).toBe(400);
    const res = await http().post(`${path}/remove`).set(moderator).send({ reason: 'Copyright' });
    expect(res.status).toBe(204);
    expect(await prisma.portfolioItem.count({ where: { id: item.id } })).toBe(0);
    const thumb = await prisma.file.findUniqueOrThrow({ where: { id: body.thumbnailFileId } });
    expect(thumb.status).toBe('deleted');
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'portfolio.remove', targetId: item.id },
    });
    expect(audit?.reason).toBe('Copyright');
    expect((await http().get(path).set(moderator)).status).toBe(404);
  });

  it('lists published items newest first on request', async () => {
    await autoApprove(true);
    const { auth, userId } = await member();
    const a = (await create(auth, await itemBody(auth, 1))).body;
    const b = (await create(auth, await itemBody(auth, 1))).body;
    const res = await http()
      .get(`/api/v1/admin/portfolio-items?status=active&userId=${userId}`)
      .set(moderator);
    expect(res.body.data.map((d: { item: { id: string } }) => d.item.id)).toEqual([b.id, a.id]);
  });
});

describe('portfolio emails (EV-14, EV-15, EV-126)', () => {
  const base = {
    locale: 'en' as const,
    username: 'nino',
    email: 'nino@example.com',
    appUrl: 'https://mytask.ge',
    adminUrl: 'https://admin.mytask.ge',
  };

  it('renders the admin, published and rejected emails', () => {
    const pending = renderEmail({ ...base, event: 'EV-14', params: { title: 'Logo' } });
    expect(pending.subject).toBe('New portfolio pending approval');
    expect(pending.text).toContain('https://admin.mytask.ge/portfolio');
    const published = renderEmail({ ...base, event: 'EV-15', params: { title: 'Logo' } });
    expect(published.subject).toBe('Your portfolio has been published');
    expect(published.text).toContain('https://mytask.ge/en/seller/portfolio');
    const rejected = renderEmail({
      ...base,
      event: 'EV-126',
      params: { title: 'Logo <b>', reason: 'Not your work' },
    });
    expect(rejected.subject).toBe('Your portfolio work was not approved');
    expect(rejected.text).toContain('Your work Logo <b> was not approved. Reason: Not your work.');
    expect(rejected.html).toContain('Logo &lt;b&gt;');
  });
});

describe('attach vs unattached cleanup (security review 07 SEC-74)', () => {
  it('a save marks its thumbnail and gallery files attached, also new files on an update', async () => {
    const { auth } = await member();
    const body = await itemBody(auth, 1);
    const item = (await create(auth, body)).body;
    const ids = [body.thumbnailFileId, ...body.imageFileIds];
    const marked = await prisma.file.findMany({ where: { id: { in: ids } } });
    expect(marked.every((f) => f.attachedAt !== null)).toBe(true);

    const added = await image(auth);
    const res = await http()
      .patch(`/api/v1/portfolio-items/${item.id as string}`)
      .set(auth)
      .send({ imageFileIds: [added.id] });
    expect(res.status).toBe(200);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: added.id } })).attachedAt).not.toBe(
      null,
    );
  });

  it('a save whose file was deleted after the input check fails and creates nothing', async () => {
    const { auth, userId } = await member();
    const body = await itemBody(auth, 1);
    const ready = await prisma.file.findMany({
      where: { id: { in: [body.thumbnailFileId, ...body.imageFileIds] } },
    });
    // The cleanup wins between the input check and the save transaction.
    await prisma.file.update({
      where: { id: body.thumbnailFileId },
      data: { status: 'deleted', deletedAt: new Date() },
    });
    const spy = vi.spyOn(prisma.file, 'findMany').mockResolvedValueOnce(ready as never);
    try {
      const res = await create(auth, body);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_NOT_READY');
    } finally {
      spy.mockRestore();
    }
    expect(await prisma.portfolioItem.count({ where: { userId } })).toBe(0);
    expect(
      (await prisma.file.findUniqueOrThrow({ where: { id: body.imageFileIds[0]! } })).attachedAt,
    ).toBeNull();
  });

  it('an item whose thumbnail is gone is left out of the staff queue; its page is 404, not 500', async () => {
    const { auth, userId } = await member();
    const good = (await create(auth, await itemBody(auth, 1))).body;
    const bodyBad = await itemBody(auth, 1);
    const bad = (await create(auth, bodyBad)).body;
    await prisma.file.update({
      where: { id: bodyBad.thumbnailFileId },
      data: { status: 'deleted', deletedAt: new Date() },
    });

    const queue = await http().get(`/api/v1/admin/portfolio-items?userId=${userId}`).set(moderator);
    expect(queue.status).toBe(200);
    expect(queue.body.data.map((d: { item: { id: string } }) => d.item.id)).toEqual([good.id]);
    const one = await http()
      .get(`/api/v1/admin/portfolio-items/${bad.id as string}`)
      .set(moderator);
    expect(one.status).toBe(404);
    expect((await get(bad.id as string, auth)).status).toBe(404);
    expect((await get(good.id as string, auth)).status).toBe(200);
  });
});
