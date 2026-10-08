// Staff gig moderation (ROADMAP 4.3.7; spec 16 AC-19, AC-20, AC-31; spec 04 AC-17, AC-18, AC-28): the pending queue
// (oldest submission first, filters, totalCount), the detail of any status with the owner summary, publish / reject
// with the first decision winning, remove (active only, internal reason, orders in progress refused) and restore
// (staff removals only, 30 days, the owner's plan limit, Q-123 (b)); search documents and audit rows follow; the
// owner's emails EV-20 / EV-21 / EV-130 are queued with the decision (4.3.8), a removal queues none.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { GigMedia } from '../src/modules/gigs/gig-media';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { GigMediaSweeper } from '../src/worker/gig-media.sweeper';
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
type Chain = { categoryId: string; subcategoryId: string; childCategoryId: string };
let chain: Chain;
let moderator: Auth;
let moderatorId: string;
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
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `ag_${n}`,
      email: `ag${n}@example.com`,
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

/** A ready gig file with its objects in `public-media`, as the scan leaves them (images: three WebP variants). */
async function file(ownerUserId: string, purpose: FilePurpose): Promise<FileRow> {
  const id = crypto.randomUUID();
  const pdf = purpose === 'gig_document';
  const variants = pdf
    ? null
    : {
        thumb: `images/${id}/thumb.webp`,
        medium: `images/${id}/medium.webp`,
        large: `images/${id}/large.webp`,
      };
  const objectKey = variants?.large ?? `files/${id}`;
  for (const key of variants ? Object.values(variants) : [objectKey]) {
    await storage.put({
      bucket: 'public_media',
      key,
      body: Buffer.from(key),
      contentType: pdf ? 'application/pdf' : 'image/webp',
      cacheControl: pdf ? undefined : 'public, max-age=31536000, immutable',
    });
  }
  if (pdf)
    storage.get('public_media', objectKey)!.contentDisposition = 'attachment; filename="brief.pdf"';
  return prisma.file.create({
    data: {
      id,
      purpose,
      ownerUserId,
      status: 'ready',
      bucket: 'public_media',
      objectKey,
      variants: variants ?? undefined,
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
      slug: `ag-${Date.now().toString(36)}-${seq}`,
      translations: {
        create: [
          { locale: 'ka', name: 'დიზაინი' },
          { locale: 'en', name: 'Design' },
        ],
      },
    },
  });
}

/** A gig saved through createGig by `m` (a new member when not given); pending while S-070 is OFF. */
async function saveGig(m?: Member, title = 'ლოგოს დიზაინი', withDocument = false) {
  const owner = m ?? (await member());
  const thumb = await file(owner.userId, 'gig_thumbnail');
  const image = await file(owner.userId, 'gig_image');
  const document = withDocument ? await file(owner.userId, 'gig_document') : null;
  const res = await http()
    .post('/api/v1/gigs')
    .set(owner.auth)
    .send({
      title: { ka: title, en: 'Logo design' },
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
      ...(document ? { documentFileIds: [document.id] } : {}),
    });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return {
    ...owner,
    gig: res.body as { id: string; uid: string },
    files: [thumb, image, ...(document ? [document] : [])],
  };
}

/** Owner emails queued for this gig, oldest first. */
const ownerEmails = (gigId: string) =>
  prisma.outboxEvent.findMany({
    where: {
      aggregateType: 'gig',
      aggregateId: gigId,
      eventType: { in: ['EV-20', 'EV-21', 'EV-130'] },
    },
    orderBy: { createdAt: 'asc' },
  });

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

const adminList = (query: Record<string, string | number | string[]> = {}, auth = moderator) =>
  http().get('/api/v1/admin/gigs').set(ADMIN).set(auth).query(query);
const adminGet = (gigId: string) =>
  http().get(`/api/v1/admin/gigs/${gigId}`).set(ADMIN).set(moderator);
const act = (gigId: string, action: string, body?: object) =>
  http().post(`/api/v1/admin/gigs/${gigId}/${action}`).set(ADMIN).set(moderator).send(body);
const publicPage = (gigId: string) =>
  http().get(`/api/v1/gigs/${gigId}`).set({ 'X-MyTask-Client': 'ios' });
const searchDocs = (gigId: string) =>
  prisma.searchDocument.count({ where: { entityType: 'gig', entityId: gigId } });
const audits = (gigId: string, action: string) =>
  prisma.auditLog.findMany({ where: { targetType: 'gig', targetId: gigId, action } });
const ids = (res: request.Response) => (res.body.data as { id: string }[]).map((g) => g.id);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  const staff = await makeStaff(app, ['gigs.moderate']);
  moderator = staff.auth;
  moderatorId = staff.id;
  const top = await category(null, 1);
  const sub = await category(top.id, 2);
  const child = await category(sub.id, 3);
  chain = { categoryId: top.id, subcategoryId: sub.id, childCategoryId: child.id };
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour; keep the staff session (it lives in the database).
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

describe('adminListGigs (spec 16 AC-19, AC-31)', () => {
  it('is the queue with status=pending: oldest submission first, filters, totalCount, cursor', async () => {
    const a = await saveGig(undefined, 'პირველი რიგში');
    const b = await saveGig();
    const c = await saveGig();
    // An older submission moves to the front; an edit would move it back (submittedAt).
    await prisma.gig.update({
      where: { id: c.gig.id },
      data: { submittedAt: new Date('2020-01-01T00:00:00Z') },
    });
    const mine = [a.gig.id, b.gig.id, c.gig.id];

    const queue = await adminList({ status: 'pending', limit: 200 });
    expect(queue.status, JSON.stringify(queue.body)).toBe(200);
    expect(queue.body.totalCount).toBeGreaterThanOrEqual(3);
    expect(ids(queue).filter((id) => mine.includes(id))).toEqual([c.gig.id, a.gig.id, b.gig.id]);
    const item = (queue.body.data as { id: string }[]).find((g) => g.id === a.gig.id);
    expect(item).toMatchObject({
      uid: a.gig.uid,
      title: 'Logo design',
      contentLocale: 'en',
      thumbnail: { thumb: expect.stringContaining(MEDIA) },
      category: { id: chain.categoryId, name: 'Design' },
      owner: { id: a.userId },
      status: 'pending',
      deletedBy: null,
      price: { amount: 5000, currency: 'GEL' },
      submittedAt: expect.any(String),
    });

    // Filters: owner (the user page tab), category of any level, title (either language) or uid.
    const byOwner = await adminList({ userId: b.userId });
    expect(ids(byOwner)).toEqual([b.gig.id]);
    expect(byOwner.body.totalCount).toBe(1);
    expect(ids(await adminList({ categoryId: chain.childCategoryId, userId: a.userId }))).toEqual([
      a.gig.id,
    ]);
    expect(ids(await adminList({ q: 'პირველი' }))).toEqual([a.gig.id]);
    expect(ids(await adminList({ q: a.gig.uid.toLowerCase() }))).toEqual([a.gig.id]);

    // Keyset cursor through the queue, one per page.
    const seen: string[] = [];
    let cursor: string | undefined;
    do {
      const pageRes = await adminList({
        status: 'pending',
        limit: 1,
        ...(cursor ? { cursor } : {}),
      });
      expect(pageRes.status).toBe(200);
      seen.push(...ids(pageRes));
      cursor = pageRes.body.nextCursor ?? undefined;
    } while (cursor);
    expect(seen.filter((id) => mine.includes(id))).toEqual([c.gig.id, a.gig.id, b.gig.id]);
    expect(new Set(seen).size).toBe(seen.length);

    // Other statuses: newest first.
    const all = await adminList({ status: ['pending', 'active'], limit: 200 });
    expect(ids(all).filter((id) => mine.includes(id))).toEqual([c.gig.id, b.gig.id, a.gig.id]);
  });

  it('needs gigs.moderate', async () => {
    const none = await makeStaff(app, 'none');
    const res = await adminList({}, none.auth);
    expect(res.status).toBe(403);
    expect(res.body.details.permission).toBe('gigs.moderate');
    const user = await member();
    expect((await http().get('/api/v1/admin/gigs').set(user.auth)).status).toBe(401);
  });
});

describe('adminGetGig (spec 16 AC-19, AC-20; spec 04 AC-28)', () => {
  it('shows any status in both languages with the owner summary; 404 for an unknown gig', async () => {
    const { gig, userId } = await saveGig();
    const reporter = await member();
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'active', publishedAt: new Date() },
    });
    expect(
      (
        await http()
          .post(`/api/v1/gigs/${gig.id}/reports`)
          .set(reporter.auth)
          .send({ reason: 'Spam gig text' })
      ).status,
    ).toBe(201);

    const res = await adminGet(gig.id);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({
      id: gig.id,
      status: 'active',
      title: { ka: 'ლოგოს დიზაინი', en: 'Logo design' },
      description: {
        ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>',
        en: '<p>Professional logo design</p>',
      },
      category: { name: 'Design' },
      childCategory: { id: chain.childCategoryId },
      price: { amount: 5000, currency: 'GEL' },
      images: [expect.objectContaining({ large: expect.any(String) })],
      isFeatured: false,
      rating: { count: 0, averageTenths: null },
      rejectionReason: null,
      deletedBy: null,
      removalReason: null,
      removedAt: null,
      restoreDeadlineAt: null,
      ownerSummary: {
        user: { id: userId },
        status: 'active',
        plan: 'standard',
        kycStatus: 'none',
        // The open report about the owner's gig counts (adminListReports, 4.15.9).
        reportCount: 1,
        earlierRejectionCount: 0,
      },
    });

    // A deleted gig too (staff may see it, AC-28).
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'deleted', deletedAt: new Date(), deletedBy: 'owner' },
    });
    const deleted = await adminGet(gig.id);
    expect(deleted.status).toBe(200);
    expect(deleted.body).toMatchObject({
      status: 'deleted',
      deletedBy: 'owner',
      restoreDeadlineAt: null,
    });

    expect((await adminGet(crypto.randomUUID())).status).toBe(404);
  });
});

describe('adminPublishGig / adminRejectGig (spec 04 AC-17, AC-18; spec 16 AC-19)', () => {
  it('publishes a pending gig once: active, public, searchable, audited; a second decision is 409', async () => {
    const { gig } = await saveGig();
    expect((await publicPage(gig.id)).status).toBe(404);

    const res = await act(gig.id, 'publish', { note: '  looks good ' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({ status: 'active', publishedAt: expect.any(String) });
    expect((await publicPage(gig.id)).status).toBe(200);
    const doc = await prisma.searchDocument.findUniqueOrThrow({
      where: { entityType_entityId: { entityType: 'gig', entityId: gig.id } },
    });
    expect(doc.status).toBe('active');
    const [audit] = await audits(gig.id, 'gig.publish');
    expect(audit).toMatchObject({
      actorStaffId: moderatorId,
      permissionCode: 'gigs.moderate',
      reason: 'looks good',
      before: { status: 'pending' },
    });

    const again = await act(gig.id, 'reject', { reason: 'Too late' });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({
      code: 'STATE_CONFLICT',
      details: { messageKey: 't_item_already_decided', currentState: 'active' },
    });
    // A second publish keeps the first publication date.
    expect((await act(gig.id, 'publish')).status).toBe(409);
    // EV-20 to the owner, once (the refused decisions queue nothing).
    const emails = await ownerEmails(gig.id);
    expect(emails.map((e) => e.eventType)).toEqual(['EV-20']);
    const gigRow = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(emails[0]!.payload).toEqual({
      userId: gigRow.ownerId,
      params: { title: 'ლოგოს დიზაინი', titleEn: 'Logo design', slug: gigRow.slug },
    });
  });

  it('rejects with the reason shown to the owner; empty reasons are refused', async () => {
    const { gig, userId, auth } = await saveGig();
    const blank = await act(gig.id, 'reject', { reason: '   ' });
    expect(blank.status).toBe(400);
    expect(blank.body.details.fields[0]).toMatchObject({ field: 'reason', code: 'required' });
    expect((await act(gig.id, 'reject', {})).status).toBe(400);

    const res = await act(gig.id, 'reject', { reason: ' Please add real photos. ' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'rejected',
      rejectionReason: 'Please add real photos.',
    });
    const mine = await http().get('/api/v1/gigs/mine').set(auth);
    expect(mine.body.data[0]).toMatchObject({
      id: gig.id,
      status: 'rejected',
      rejectionReason: 'Please add real photos.',
    });
    expect((await audits(gig.id, 'gig.reject'))[0]?.reason).toBe('Please add real photos.');
    const emails = await ownerEmails(gig.id);
    expect(emails.map((e) => e.eventType)).toEqual(['EV-21']);
    expect(emails[0]!.payload).toMatchObject({
      userId,
      params: { title: 'ლოგოს დიზაინი', reason: 'Please add real photos.' },
    });

    // The next gig of the same owner shows the earlier rejection.
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'deleted', deletedAt: new Date(), deletedBy: 'owner' },
    });
    const next = await saveGig({ userId, auth });
    expect((await adminGet(next.gig.id)).body.ownerSummary.earlierRejectionCount).toBe(1);
  });

  it('lets exactly one of two simultaneous decisions win', async () => {
    const { gig } = await saveGig();
    const results = await Promise.all([
      act(gig.id, 'publish'),
      act(gig.id, 'reject', { reason: 'No' }),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const audited =
      (await audits(gig.id, 'gig.publish')).length + (await audits(gig.id, 'gig.reject')).length;
    expect(audited).toBe(1);
    expect(await ownerEmails(gig.id)).toHaveLength(1);
  });
});

describe('adminRemoveGig / adminRestoreGig (spec 16 AC-20, Q-123 (b))', () => {
  async function activeGig(m?: Member) {
    const saved = await saveGig(m);
    expect((await act(saved.gig.id, 'publish')).status).toBe(200);
    return saved;
  }

  it('removes only an active gig without orders in progress, with an internal reason', async () => {
    const pending = await saveGig();
    const notActive = await act(pending.gig.id, 'remove', { reason: 'Spam' });
    expect(notActive.status).toBe(409);
    expect(notActive.body).toMatchObject({
      code: 'STATE_CONFLICT',
      details: { currentState: 'pending' },
    });

    const { gig } = await activeGig();
    await prisma.gig.update({ where: { id: gig.id }, data: { ordersInQueue: 1 } });
    const busy = await act(gig.id, 'remove', { reason: 'Spam' });
    expect(busy.status).toBe(409);
    expect(busy.body.code).toBe('GIG_HAS_ORDERS_IN_QUEUE');
    await prisma.gig.update({ where: { id: gig.id }, data: { ordersInQueue: 0 } });
    expect((await act(gig.id, 'remove', { reason: ' ' })).status).toBe(400);

    const res = await act(gig.id, 'remove', { reason: 'Copied content' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const removedAt = new Date(res.body.removedAt as string).getTime();
    expect(res.body).toMatchObject({
      status: 'deleted',
      deletedBy: 'staff',
      removalReason: 'Copied content',
    });
    expect(new Date(res.body.restoreDeadlineAt as string).getTime() - removedAt).toBe(
      30 * 86_400_000,
    );
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).deletedByStaffId).toBe(
      moderatorId,
    );
    expect((await publicPage(gig.id)).status).toBe(404);
    expect(await searchDocs(gig.id)).toBe(0);
    expect((await audits(gig.id, 'gig.remove'))[0]?.reason).toBe('Copied content');
    // A removal does not notify the owner (only the EV-20 of the publish is there).
    expect((await ownerEmails(gig.id)).map((e) => e.eventType)).toEqual(['EV-20']);
    const deleted = await adminList({ status: 'deleted', limit: 200 });
    expect(
      (deleted.body.data as { id: string; deletedBy: string }[]).find((g) => g.id === gig.id),
    ).toMatchObject({ deletedBy: 'staff' });
  });

  it('restores a staff removal within 30 days back to active; not owner deletions, not later', async () => {
    const owned = await activeGig();
    expect((await http().delete(`/api/v1/gigs/${owned.gig.id}`).set(owned.auth)).status).toBe(204);
    const ownerDeleted = await act(owned.gig.id, 'restore');
    expect(ownerDeleted.status).toBe(409);
    expect(ownerDeleted.body.details.currentState).toBe('deleted');

    const { gig } = await activeGig();
    expect((await act(gig.id, 'remove', { reason: 'Check' })).status).toBe(200);
    await prisma.gig.update({
      where: { id: gig.id },
      data: { deletedAt: new Date(Date.now() - 31 * 86_400_000) },
    });
    const late = await act(gig.id, 'restore');
    expect(late.status).toBe(422);
    expect(late.body).toMatchObject({
      code: 'GIG_RESTORE_WINDOW_EXPIRED',
      message: 'A removed gig can be restored only within 30 days.',
    });

    await prisma.gig.update({
      where: { id: gig.id },
      data: { deletedAt: new Date(Date.now() - 29 * 86_400_000) },
    });
    const res = await act(gig.id, 'restore', { note: 'Removed by mistake' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({
      status: 'active',
      deletedBy: null,
      removalReason: null,
      removedAt: null,
      restoreDeadlineAt: null,
    });
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row).toMatchObject({ deletedAt: null, deletedBy: null, deletedByStaffId: null });
    expect((await publicPage(gig.id)).status).toBe(200);
    expect(await searchDocs(gig.id)).toBe(1);
    expect((await audits(gig.id, 'gig.restore'))[0]?.reason).toBe('Removed by mistake');
    expect((await act(gig.id, 'restore')).status).toBe(409);
    expect((await ownerEmails(gig.id)).map((e) => e.eventType)).toEqual(['EV-20', 'EV-130']);
  });

  it("refuses a restore when the owner's gigs already reach the plan limit (S-001)", async () => {
    await withSetting('S-001', 'plans.standard.gig_limit', 1);
    const first = await activeGig();
    expect((await act(first.gig.id, 'remove', { reason: 'Check' })).status).toBe(200);
    // The slot was free again, so the owner made another gig.
    await saveGig({ userId: first.userId, auth: first.auth });

    const res = await act(first.gig.id, 'restore');
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'PLAN_LIMIT_REACHED',
      details: { limit: 1, settingId: 'S-001', messageKey: 't_admin_gig_restore_plan_limit' },
    });
    expect(res.body.message).toBe(
      'The owner already has 1 gigs, the limit of their plan (1). The gig can be restored when the owner has fewer gigs.',
    );
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: first.gig.id } })).status).toBe(
      'deleted',
    );
    // A refused restore queues no EV-130.
    expect((await ownerEmails(first.gig.id)).map((e) => e.eventType)).toEqual(['EV-20']);

    await withSetting('S-001', 'plans.standard.gig_limit', 2);
    expect((await act(first.gig.id, 'restore')).status).toBe(200);
  });
});

describe('a staff removal takes the files offline (ROADMAP 4.3.24, Owner Q-185 (b), review 10 I-57)', () => {
  /** Every stored key of the files: three variants per image, one object per document. */
  const keysOf = (files: FileRow[]) =>
    files.flatMap((f) =>
      f.variants ? Object.values(f.variants as Record<string, string>) : [f.objectKey],
    );
  const buckets = async (files: FileRow[]) =>
    (
      await prisma.file.findMany({
        where: { id: { in: files.map((f) => f.id) } },
        orderBy: { id: 'asc' },
      })
    ).map((f) => f.bucket);
  const served = (files: FileRow[]) => keysOf(files).map((k) => storage.has('public_media', k));
  const kept = (files: FileRow[]) => keysOf(files).map((k) => storage.has('private', k));
  const allTrue = (files: FileRow[]) => keysOf(files).map(() => true);
  const allFalse = (files: FileRow[]) => keysOf(files).map(() => false);

  async function removedGig() {
    const saved = await saveGig(undefined, 'ლოგოს დიზაინი', true);
    expect((await act(saved.gig.id, 'publish')).status).toBe(200);
    expect(served(saved.files)).toEqual(allTrue(saved.files));
    expect((await act(saved.gig.id, 'remove', { reason: 'Copied content' })).status).toBe(200);
    return saved;
  }

  it('moves thumbnail, gallery variants and documents to private on removal and back on restore', async () => {
    const { gig, files } = await removedGig();
    const [thumb, image, document] = files as [FileRow, FileRow, FileRow];

    // Media URL no longer served: nothing of the gig is left in public-media; same keys, same ids, private.
    expect(served(files)).toEqual(allFalse(files));
    expect(kept(files)).toEqual(allTrue(files));
    expect(await buckets(files)).toEqual(['private', 'private', 'private']);
    // The stored headers travel with the objects.
    expect(storage.get('private', `images/${image.id}/thumb.webp`)).toMatchObject({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    expect(storage.get('private', document.objectKey)).toMatchObject({
      contentType: 'application/pdf',
      contentDisposition: 'attachment; filename="brief.pdf"',
    });
    expect((await publicPage(gig.id)).status).toBe(404);

    // Staff still see them, through presigned GETs of the private copies.
    const view = await adminGet(gig.id);
    expect(view.status, JSON.stringify(view.body)).toBe(200);
    const signed = (key: string) => `http://storage.test/private/${key}?signed=1`;
    expect(view.body.thumbnail).toEqual({
      fileId: thumb.id,
      thumb: signed(`images/${thumb.id}/thumb.webp`),
      medium: signed(`images/${thumb.id}/medium.webp`),
      large: signed(`images/${thumb.id}/large.webp`),
      width: 1000,
      height: 750,
    });
    expect(view.body.images).toEqual([
      expect.objectContaining({ fileId: image.id, large: signed(`images/${image.id}/large.webp`) }),
    ]);
    expect(view.body.documents).toEqual([
      {
        fileId: document.id,
        fileName: 'brief.pdf',
        sizeBytes: 12_345,
        url: signed(document.objectKey),
      },
    ]);
    expect(storage.gets.at(-1)).toMatchObject({
      bucket: 'private',
      key: document.objectKey,
      expiresSeconds: 300,
      downloadName: 'brief.pdf',
    });
    const list = await adminList({ status: 'deleted', limit: 200 });
    const item = (list.body.data as { id: string; thumbnail: { thumb: string } }[]).find(
      (g) => g.id === gig.id,
    );
    expect(item?.thumbnail.thumb).toBe(signed(`images/${thumb.id}/thumb.webp`));

    // Restore: served again, from the same keys and ids, before the gig is public again.
    const res = await act(gig.id, 'restore');
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(served(files)).toEqual(allTrue(files));
    expect(kept(files)).toEqual(allFalse(files));
    expect(await buckets(files)).toEqual(['public_media', 'public_media', 'public_media']);
    expect(storage.get('public_media', `images/${thumb.id}/large.webp`)?.cacheControl).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(storage.get('public_media', document.objectKey)?.contentDisposition).toBe(
      'attachment; filename="brief.pdf"',
    );
    expect(res.body.thumbnail.large).toBe(`${MEDIA}/images/${thumb.id}/large.webp`);
    const page = await publicPage(gig.id);
    expect(page.status).toBe(200);
    expect(page.body.documents[0].url).toBe(`${MEDIA}/${document.objectKey}`);
  });

  it('leaves owner deletions alone (Q-185 is staff removals only)', async () => {
    const saved = await saveGig(undefined, 'ლოგოს დიზაინი', true);
    expect((await act(saved.gig.id, 'publish')).status).toBe(200);
    expect((await http().delete(`/api/v1/gigs/${saved.gig.id}`).set(saved.auth)).status).toBe(204);
    expect(served(saved.files)).toEqual(allTrue(saved.files));
    expect(await buckets(saved.files)).toEqual(['public_media', 'public_media', 'public_media']);
  });

  it('a move that fails after the removal is finished by the gig-media sweeper', async () => {
    const saved = await saveGig(undefined, 'ლოგოს დიზაინი', true);
    expect((await act(saved.gig.id, 'publish')).status).toBe(200);
    // The second copy fails: the removal stands (200), the move is rolled back to "all public" for now.
    storage.failCopyAt = 2;
    expect((await act(saved.gig.id, 'remove', { reason: 'Spam' })).status).toBe(200);
    expect(await buckets(saved.files)).toEqual(['public_media', 'public_media', 'public_media']);
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: saved.gig.id } })).status).toBe(
      'deleted',
    );

    const sweeper = new GigMediaSweeper(app.get(GigMedia));
    for (let i = 0; i < 100 && (await sweeper.tick()) > 0; i++);
    expect(served(saved.files)).toEqual(allFalse(saved.files));
    expect(kept(saved.files)).toEqual(allTrue(saved.files));
    expect(await buckets(saved.files)).toEqual(['private', 'private', 'private']);
  });

  it('a move interrupted after the public copies were deleted is finished on the next run', async () => {
    const saved = await saveGig();
    expect((await act(saved.gig.id, 'publish')).status).toBe(200);
    expect((await act(saved.gig.id, 'remove', { reason: 'Spam' })).status).toBe(200);
    // As if the process stopped after the copy and delete, before the rows were switched.
    await prisma.file.updateMany({
      where: { id: { in: saved.files.map((f) => f.id) } },
      data: { bucket: 'public_media' },
    });
    expect(await app.get(GigMedia).sync(saved.gig.id)).toBe(2);
    expect(await buckets(saved.files)).toEqual(['private', 'private']);
    expect(kept(saved.files)).toEqual(allTrue(saved.files));
    expect(served(saved.files)).toEqual(allFalse(saved.files));
  });

  it('a restore that fails half-way keeps the gig removed and its files offline', async () => {
    const { gig, files } = await removedGig();
    // The 4th copy fails inside the transaction, after at least one file was copied back in full.
    storage.failCopyAt = 4;
    expect((await act(gig.id, 'restore')).status).toBe(500);
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).status).toBe('deleted');
    expect(await buckets(files)).toEqual(['private', 'private', 'private']);
    expect(served(files)).toEqual(allFalse(files));
    expect(kept(files)).toEqual(allTrue(files));
    // A later restore works.
    expect((await act(gig.id, 'restore')).status).toBe(200);
    expect(served(files)).toEqual(allTrue(files));
  });
});

describe('owner emails EV-20, EV-21, EV-130 (spec 15; 4.3.8)', () => {
  const base = {
    username: 'nino',
    email: 'nino@example.com',
    appUrl: 'https://mytask.ge',
    adminUrl: 'https://admin.mytask.ge',
  };
  const params = { title: 'ლოგოს დიზაინი', titleEn: 'Logo design', slug: 'logo-ABC' };
  const cases = [
    { event: 'EV-20', params, link: '/service/logo-ABC' },
    { event: 'EV-21', params: { ...params, reason: 'Add real photos' }, link: '/seller/gigs' },
    { event: 'EV-130', params, link: '/service/logo-ABC' },
  ];

  for (const locale of ['ka', 'en'] as const) {
    for (const c of cases) {
      it(`${c.event} renders in ${locale} with the gig link`, () => {
        const mail = renderEmail({ ...base, locale, event: c.event, params: c.params });
        expect(mail.subject.trim()).not.toBe('');
        expect(mail.text).not.toMatch(/\bt_[a-z0-9_]+\b/);
        expect(mail.text).not.toMatch(/\{\{?[a-z_]+\}?\}/i);
        const prefix = locale === 'en' ? 'https://mytask.ge/en' : 'https://mytask.ge';
        expect(mail.text).toContain(`${prefix}${c.link}`);
      });
    }
  }

  it('EV-21 carries the title and the staff reason (legacy YourGigNeedsChanges)', () => {
    const mail = renderEmail({ ...base, locale: 'en', event: 'EV-21', params: cases[1]!.params });
    expect(mail.subject).toBe('Your gig needs changes');
    expect(mail.text).toContain('The following gig has been rejected');
    expect(mail.text).toContain('Logo design');
    expect(mail.text).toContain('Here is why');
    expect(mail.text).toContain('Add real photos');
  });

  it('EV-21 greets by the full name, by the username when none is set (legacy fullname ?: username, F-01)', () => {
    const p = cases[1]!.params;
    const named = renderEmail({
      ...base,
      fullName: 'ნინო ბერიძე',
      locale: 'en',
      event: 'EV-21',
      params: p,
    });
    expect(named.text.split('\n')[0]).toBe('Hello ნინო ბერიძე');
    const blank = renderEmail({ ...base, fullName: '  ', locale: 'en', event: 'EV-21', params: p });
    expect(blank.text.split('\n')[0]).toBe('Hello nino');
    // Other events keep the username greeting of their legacy classes.
    const published = renderEmail({
      ...base,
      fullName: 'ნინო ბერიძე',
      locale: 'en',
      event: 'EV-20',
      params,
    });
    expect(published.text).not.toContain('ნინო ბერიძე');
  });

  it('EV-130 names the gig in the reader language, Georgian when there is no English title', () => {
    const ka = renderEmail({ ...base, locale: 'ka', event: 'EV-130', params });
    expect(ka.text).toContain('„ლოგოს დიზაინი“');
    const en = renderEmail({ ...base, locale: 'en', event: 'EV-130', params });
    expect(en.text).toContain('Our team has restored your gig "Logo design"');
    const noEn = renderEmail({
      ...base,
      locale: 'en',
      event: 'EV-130',
      params: { ...params, titleEn: '' },
    });
    expect(noEn.text).toContain('"ლოგოს დიზაინი"');
  });

  it('escapes the title and reason in the HTML part', () => {
    const mail = renderEmail({
      ...base,
      locale: 'en',
      event: 'EV-21',
      params: { ...params, titleEn: '<b>x</b>', reason: 'a & b' },
    });
    expect(mail.html).not.toContain('<b>x</b>');
    expect(mail.html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(mail.html).toContain('a &amp; b');
  });
});
