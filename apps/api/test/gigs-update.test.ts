// updateGig + deleteGig (ROADMAP 4.3.3c; spec 04 AC-10, AC-21…AC-25, AC-33, EC-1, EC-7, EC-8, R-G4, R-G8, R-G9):
// partial edits, lists replaced in order (gallery reorder without re-upload, upgrades keep their identity),
// slug only on a Georgian title change, S-070 on every save (EV-19 each time), never plan-limited, files the gig
// no longer uses deleted; the owner's delete (409 while orders are in the queue, frees the plan slot).
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

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
let chain: { categoryId: string; subcategoryId: string; childCategoryId: string };

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `gu_${n}`,
      email: `gu${n}@example.com`,
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
      slug: `gu-${Date.now().toString(36)}-${seq}`,
      translations: { create: [{ locale: 'ka', name: 'დიზაინი' }] },
    },
  });
}

/** A member with one saved gig (via createGig) and its request body. */
async function ownGig(extra: Record<string, unknown> = {}) {
  const m = await member();
  const thumb = await file(m.userId, 'gig_thumbnail');
  const a = await file(m.userId, 'gig_image');
  const b = await file(m.userId, 'gig_image');
  const body = {
    title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
    description: { ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>', en: null },
    ...chain,
    price: { amount: 5000, currency: 'GEL' },
    deliveryDays: 3,
    revisionsAllowed: 2,
    thumbnailFileId: thumb.id,
    imageFileIds: [a.id, b.id],
    ...extra,
  };
  const res = await http().post('/api/v1/gigs').set(m.auth).send(body);
  expect(res.status).toBe(201);
  return { ...m, gig: res.body as GigView, body, files: { thumb, a, b } };
}

interface GigView {
  id: string;
  uid: string;
  slug: string;
  status: string;
  upgrades: { id: string; title: string }[];
  images: { fileId: string }[];
  documents: { fileId: string }[];
}

const edit = (auth: Auth, id: string, body: object) =>
  http().patch(`/api/v1/gigs/${id}`).set(auth).send(body);
const remove = (auth: Auth, id: string) => http().delete(`/api/v1/gigs/${id}`).set(auth);
const ev19 = (gigId: string) =>
  prisma.outboxEvent.count({ where: { aggregateId: gigId, eventType: 'EV-19' } });

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
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  const top = await category(null, 1);
  const sub = await category(top.id, 2);
  const child = await category(sub.id, 3);
  chain = { categoryId: top.id, subcategoryId: sub.id, childCategoryId: child.id };
});

beforeEach(async () => {
  await app.get(RedisService).client.flushall();
});

afterEach(async () => {
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: touched.splice(0) } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app.close();
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('updateGig: fields, slug and moderation (AC-21, AC-22, AC-33, R-G4)', () => {
  it('changes only the sent fields; the slug stays until the Georgian title changes (EC-7)', async () => {
    const { auth, gig } = await ownGig();
    const priceOnly = await edit(auth, gig.id, { price: { amount: 7000, currency: 'GEL' } });
    expect(priceOnly.status).toBe(200);
    expect(priceOnly.body).toMatchObject({
      slug: gig.slug,
      price: { amount: 7000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
    });

    const english = await edit(auth, gig.id, {
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: 'Logo design in Photoshop' },
    });
    expect(english.body.slug).toBe(gig.slug);
    expect(english.body.title.en).toBe('Logo design in Photoshop');

    const renamed = await edit(auth, gig.id, { title: { ka: 'ბრენდის ლოგო', en: null } });
    expect(renamed.status).toBe(200);
    expect(renamed.body.slug).toBe(`brendis-logo-${gig.uid}`);
    expect(renamed.body.title).toEqual({ ka: 'ბრენდის ლოგო', en: null });
    // English title and description both gone: no English row left.
    expect(await prisma.gigTranslation.count({ where: { gigId: gig.id, locale: 'en' } })).toBe(0);
  });

  it('every save goes back to review while S-070 is OFF, with EV-19 each time (AC-22)', async () => {
    const { auth, gig } = await ownGig();
    expect(await ev19(gig.id)).toBe(1);
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'rejected', rejectionReason: 'Add more images' },
    });
    const first = await edit(auth, gig.id, { deliveryDays: 5 });
    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ status: 'pending', rejectionReason: null, deliveryDays: 5 });
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row.rejectionReason).toBeNull();
    // Already pending: still a new EV-19, and the queue time moves to this save.
    const second = await edit(auth, gig.id, { deliveryDays: 7 });
    expect(second.body.status).toBe('pending');
    const after = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(after.submittedAt!.getTime()).toBeGreaterThanOrEqual(row.submittedAt!.getTime());
    expect(await ev19(gig.id)).toBe(3);
  });

  it('goes live at once while S-070 is ON, and an active gig edited with S-070 OFF leaves search (EC-5)', async () => {
    const { auth, gig } = await ownGig();
    await withSetting('S-070', 'moderation.gigs.auto_approve', true);
    const live = await edit(auth, gig.id, { deliveryDays: 1 });
    expect(live.body.status).toBe('active');
    expect(Date.parse(live.body.publishedAt)).not.toBeNaN();
    const doc = () =>
      prisma.searchDocument.findUniqueOrThrow({
        where: { entityType_entityId: { entityType: 'gig', entityId: gig.id } },
      });
    expect(await doc()).toMatchObject({ status: 'active', deliveryDays: 1 });
    expect(await ev19(gig.id)).toBe(1);

    await withSetting('S-070', 'moderation.gigs.auto_approve', false);
    const back = await edit(auth, gig.id, { deliveryDays: 2 });
    expect(back.body).toMatchObject({ status: 'pending', publishedAt: live.body.publishedAt });
    expect(await doc()).toMatchObject({ status: 'pending', deliveryDays: 2 });
  });

  it('checks the category chain with the stored levels and saves the child category (AC-21)', async () => {
    const { auth, gig } = await ownGig();
    const otherChild = await category(chain.subcategoryId, 3);
    const ok = await edit(auth, gig.id, { childCategoryId: otherChild.id });
    expect(ok.status).toBe(200);
    expect(ok.body.childCategoryId).toBe(otherChild.id);

    const otherTop = await category(null, 1);
    const bad = await edit(auth, gig.id, { categoryId: otherTop.id });
    expect(bad.status).toBe(400);
    // The stored sub-category is not under the new top level; the stored child still fits its sub-category.
    expect(bad.body.details.fields.map((f: { field: string }) => f.field)).toEqual([
      'subcategoryId',
    ]);
  });

  it('applies today’s S-041 only when revisions are sent (AC-10) and never the plan limit (AC-25)', async () => {
    const { auth, gig } = await ownGig({ revisionsAllowed: 8 });
    await withSetting('S-041', 'revisions.max_allowed', 5);
    await withSetting('S-001', 'plans.standard.gig_limit', 0);
    const keep = await edit(auth, gig.id, { deliveryDays: 4 });
    expect(keep.status).toBe(200);
    expect(keep.body.revisionsAllowed).toBe(8);
    const refused = await edit(auth, gig.id, { revisionsAllowed: 8 });
    expect(refused.status).toBe(400);
    expect(refused.body.details.fields[0]).toMatchObject({
      field: 'revisionsAllowed',
      messageKey: 't_validator_revisions_range',
      params: { max: 5 },
    });
    expect((await edit(auth, gig.id, { revisionsAllowed: 5 })).body.revisionsAllowed).toBe(5);
  });

  it('runs the same field rules as createGig, all at once (AC-19)', async () => {
    const { auth, gig } = await ownGig();
    const res = await edit(auth, gig.id, {
      title: { ka: 'Logo design', en: null },
      price: { amount: 50, currency: 'GEL' },
      seo: { title: 'SEO', description: ' ' },
    });
    expect(res.status).toBe(400);
    expect(res.body.details.fields.map((f: { field: string }) => f.field)).toEqual([
      'title.ka',
      'price',
      'seo',
    ]);
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).priceTetri).toBe(5000n);
  });

  it('answers 404 for another user’s gig and for a deleted one', async () => {
    const { gig } = await ownGig();
    const stranger = await member();
    expect((await edit(stranger.auth, gig.id, { deliveryDays: 1 })).status).toBe(404);
    expect((await remove(stranger.auth, gig.id)).status).toBe(404);
    expect((await edit(stranger.auth, crypto.randomUUID(), { deliveryDays: 1 })).status).toBe(404);
  });
});

describe('updateGig: lists (AC-11, AC-12, AC-23, R-G9)', () => {
  it('reorders, removes and adds gallery images without re-upload; replaced files are deleted', async () => {
    const { userId, auth, gig, files } = await ownGig();
    const c = await file(userId, 'gig_image');
    const newThumb = await file(userId, 'gig_thumbnail');
    const res = await edit(auth, gig.id, {
      imageFileIds: [c.id, files.a.id],
      thumbnailFileId: newThumb.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.images.map((i: { fileId: string }) => i.fileId)).toEqual([c.id, files.a.id]);
    expect(res.body.thumbnail.fileId).toBe(newThumb.id);
    const status = async (id: string) =>
      (await prisma.file.findUniqueOrThrow({ where: { id } })).status;
    expect(await status(files.b.id)).toBe('deleted');
    expect(await status(files.thumb.id)).toBe('deleted');
    expect(await status(files.a.id)).toBe('ready');
    expect(
      (await prisma.file.findUniqueOrThrow({ where: { id: c.id } })).attachedAt,
    ).not.toBeNull();

    // A plain reorder swaps positions in one transaction (deferred key).
    const swap = await edit(auth, gig.id, { imageFileIds: [files.a.id, c.id] });
    expect(swap.body.images.map((i: { fileId: string }) => i.fileId)).toEqual([files.a.id, c.id]);
  });

  it('keeps an upgrade’s identity by id, marks removed ones deleted, refuses foreign ids', async () => {
    const price = { amount: 1000, currency: 'GEL' };
    const { auth, gig } = await ownGig({
      upgrades: [
        { title: 'სწრაფი', price, extraDays: 0 },
        { title: 'წყარო ფაილები', price, extraDays: 1 },
      ],
      faqs: [{ question: 'კითხვა?', answer: 'პასუხი.' }],
    });
    const [fast, sources] = gig.upgrades;
    const res = await edit(auth, gig.id, {
      upgrades: [
        { title: 'ახალი', price, extraDays: 2 },
        {
          id: fast!.id,
          title: 'ძალიან სწრაფი',
          price: { amount: 1500, currency: 'GEL' },
          extraDays: 0,
        },
      ],
      faqs: [],
    });
    expect(res.status).toBe(200);
    expect(res.body.upgrades.map((u: { title: string }) => u.title)).toEqual([
      'ახალი',
      'ძალიან სწრაფი',
    ]);
    expect(res.body.upgrades[1].id).toBe(fast!.id);
    expect(res.body.faqs).toEqual([]);
    const removed = await prisma.gigUpgrade.findUniqueOrThrow({ where: { id: sources!.id } });
    expect(removed.deletedAt).not.toBeNull();

    const other = await ownGig({ upgrades: [{ title: 'სხვა', price, extraDays: 0 }] });
    const foreign = await edit(auth, gig.id, {
      upgrades: [{ id: other.gig.upgrades[0]!.id, title: 'x', price, extraDays: 0 }],
    });
    expect(foreign.status).toBe(400);
    expect(foreign.body.details.fields[0]).toMatchObject({
      field: 'upgrades[0].id',
      code: 'not_allowed',
    });
    // A removed upgrade cannot come back by id either.
    const revived = await edit(auth, gig.id, {
      upgrades: [{ id: sources!.id, title: 'x', price, extraDays: 0 }],
    });
    expect(revived.status).toBe(400);
  });

  it('keeps existing documents while S-080 is OFF but refuses new ones (EC-8)', async () => {
    const m = await member();
    const pdf = await file(m.userId, 'gig_document');
    const { auth, gig, userId } = await ownGigFor(m, { documentFileIds: [pdf.id] });
    await withSetting('S-080', 'media.gig.documents_enabled', false);
    expect((await edit(auth, gig.id, { documentFileIds: [pdf.id] })).status).toBe(200);
    const extra = await file(userId, 'gig_document');
    const refused = await edit(auth, gig.id, { documentFileIds: [pdf.id, extra.id] });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('FEATURE_DISABLED');
    const cleared = await edit(auth, gig.id, { documentFileIds: [] });
    expect(cleared.body.documents).toEqual([]);
  });
});

/** Like ownGig, for an existing member (so a file can be prepared first). */
async function ownGigFor(m: { userId: string; auth: Auth }, extra: Record<string, unknown>) {
  const thumb = await file(m.userId, 'gig_thumbnail');
  const a = await file(m.userId, 'gig_image');
  const res = await http()
    .post('/api/v1/gigs')
    .set(m.auth)
    .send({
      title: { ka: 'ლოგოს დიზაინი', en: null },
      description: { ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>', en: null },
      ...chain,
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      thumbnailFileId: thumb.id,
      imageFileIds: [a.id],
      ...extra,
    });
  expect(res.status).toBe(201);
  return { ...m, gig: res.body as GigView };
}

describe('deleteGig (AC-24, R-G8, EC-1)', () => {
  it('marks the gig deleted by its owner, removes it from search, keeps its files, frees the slot', async () => {
    const { auth, gig, files } = await ownGig();
    expect((await http().get('/api/v1/gigs/creation-eligibility').set(auth)).body.canCreate).toBe(
      false,
    );
    const res = await remove(auth, gig.id);
    expect(res.status).toBe(204);
    const row = await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } });
    expect(row).toMatchObject({ status: 'deleted', deletedBy: 'owner', deletedByStaffId: null });
    expect(row.deletedAt).toBeInstanceOf(Date);
    expect(
      await prisma.searchDocument.count({ where: { entityType: 'gig', entityId: gig.id } }),
    ).toBe(0);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: files.a.id } })).status).toBe(
      'ready',
    );
    expect((await http().get('/api/v1/gigs/creation-eligibility').set(auth)).body).toMatchObject({
      canCreate: true,
      gigCount: 0,
    });
    expect((await remove(auth, gig.id)).status).toBe(404);
    expect((await edit(auth, gig.id, { deliveryDays: 1 })).status).toBe(404);
  });

  it('refuses while orders are in the queue (409 GIG_HAS_ORDERS_IN_QUEUE)', async () => {
    const { auth, gig } = await ownGig();
    await prisma.gig.update({ where: { id: gig.id }, data: { ordersInQueue: 2 } });
    const res = await remove(auth, gig.id);
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      code: 'GIG_HAS_ORDERS_IN_QUEUE',
      message: 'This gig has orders in queue, please finish them before you can delete it',
    });
    expect((await prisma.gig.findUniqueOrThrow({ where: { id: gig.id } })).status).toBe('pending');
  });
});
