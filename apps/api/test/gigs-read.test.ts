// getGig, lookupGig, getGigOwnerView, listMyGigs (ROADMAP 4.3.4; spec 04 AC-18, AC-20, AC-26…AC-30, AC-33, EC-8):
// who sees which gig (active + listable owner for everyone; pending/rejected for the owner only; deleted for no one),
// the Georgian fallback per field, the uid lookup, the viewer facts and the owner's list with its paging.
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
      username: `gr_${n}`,
      email: `gr${n}@example.com`,
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
      slug: `gr-${Date.now().toString(36)}-${seq}`,
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
async function saveGig(m?: Member, extra: Record<string, unknown> = {}) {
  const owner = m ?? (await member());
  const thumb = await file(owner.userId, 'gig_thumbnail');
  const image = await file(owner.userId, 'gig_image');
  const res = await http()
    .post('/api/v1/gigs')
    .set(owner.auth)
    .send({
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
      description: { ka: '<p>პროფესიონალური ლოგოს დიზაინი</p>', en: null },
      ...chain,
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      thumbnailFileId: thumb.id,
      imageFileIds: [image.id],
      ...extra,
    });
  expect(res.status).toBe(201);
  return { ...owner, gig: res.body as { id: string; uid: string; slug: string } };
}

const getGig = (id: string, auth: Auth = { 'Accept-Language': 'en' }) =>
  http().get(`/api/v1/gigs/${id}`).set(auth);

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
const autoApprove = (on: boolean) => withSetting('S-070', 'moderation.gigs.auto_approve', on);

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

describe('getGig: the page (AC-26, AC-27, AC-29, EC-8)', () => {
  it('shows an active gig to guests with the Georgian fallback, categories, files and the seller', async () => {
    await autoApprove(true);
    await withSetting('S-080', 'media.gig.documents_enabled', true);
    const owner = await member();
    const doc = await file(owner.userId, 'gig_document');
    const { gig, userId } = await saveGig(owner, {
      upgrades: [{ title: 'Source file', price: { amount: 1000, currency: 'GEL' }, extraDays: 1 }],
      faqs: [{ question: 'ფორმატი?', answer: 'PSD და PNG' }],
      documentFileIds: [doc.id],
    });
    // EC-8: switching documents off later keeps the existing ones visible.
    await withSetting('S-080', 'media.gig.documents_enabled', false);

    const res = await getGig(gig.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: gig.id,
      uid: gig.uid,
      slug: gig.slug,
      status: 'active',
      title: 'Logo დიზაინი Photoshop-ში',
      description: '<p>პროფესიონალური ლოგოს დიზაინი</p>',
      contentLocale: 'ka',
      hasEnglish: false,
      category: { id: chain.categoryId, name: 'Design', contentLocale: 'en' },
      subcategory: { id: chain.subcategoryId },
      childCategory: { id: chain.childCategoryId },
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      upgrades: [{ title: 'Source file', price: { amount: 1000 }, extraDays: 1 }],
      faqs: [{ question: 'ფორმატი?', answer: 'PSD და PNG' }],
      documents: [{ fileId: doc.id, fileName: 'brief.pdf', url: `${MEDIA}/files/${doc.id}` }],
      seller: {
        user: { id: userId },
        rating: { count: 0, averageTenths: null },
        unavailableUntil: null,
        isAcceptingOrders: true,
      },
      isFeatured: false,
      rating: { count: 0, averageTenths: null },
      ordersInQueueCount: 0,
      seoTitle: null,
      viewer: null,
    });
    expect(res.body.thumbnail.large).toContain(MEDIA);
    expect(res.body.images).toHaveLength(1);
    expect(res.body.publishedAt).not.toBeNull();
  });

  it('falls back per field: an English title with a Georgian description (AC-27)', async () => {
    await autoApprove(true);
    const { gig } = await saveGig(undefined, {
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: 'Logo design in Photoshop' },
    });
    const en = await getGig(gig.id);
    expect(en.body).toMatchObject({
      title: 'Logo design in Photoshop',
      description: '<p>პროფესიონალური ლოგოს დიზაინი</p>',
      contentLocale: 'ka',
      hasEnglish: false,
    });
    const ka = await getGig(gig.id, { 'Accept-Language': 'ka' });
    expect(ka.body).toMatchObject({ title: 'Logo დიზაინი Photoshop-ში', contentLocale: 'ka' });
    expect(ka.body.category.name).toBe('დიზაინი');
  });

  it('marks the seller unavailable while "unavailable until" is in the future (AC-29)', async () => {
    await autoApprove(true);
    const { gig, userId } = await saveGig();
    const until = new Date(Date.now() + 3 * 86_400_000);
    await prisma.userProfile.update({ where: { userId }, data: { unavailableUntil: until } });
    const res = await getGig(gig.id);
    expect(res.body.seller).toMatchObject({
      unavailableUntil: until.toISOString(),
      isAcceptingOrders: false,
    });
  });

  it('tells a signed-in viewer whether they own, saved or reported the gig (AC-30, AC-37)', async () => {
    await autoApprove(true);
    const { gig, auth: ownerAuth } = await saveGig();
    const viewer = await member();
    expect((await getGig(gig.id, viewer.auth)).body.viewer).toEqual({
      isOwner: false,
      isFavorite: false,
      hasReported: false,
    });
    await prisma.favorite.create({ data: { userId: viewer.userId, gigId: gig.id } });
    await prisma.report.create({
      data: { reporterUserId: viewer.userId, targetType: 'gig', targetId: gig.id, reason: 'Spam' },
    });
    expect((await getGig(gig.id, viewer.auth)).body.viewer).toEqual({
      isOwner: false,
      isFavorite: true,
      hasReported: true,
    });
    expect((await getGig(gig.id, ownerAuth)).body.viewer).toEqual({
      isOwner: true,
      isFavorite: false,
      hasReported: false,
    });
  });
});

describe('getGig: visibility (AC-28, P-29)', () => {
  it('shows pending and rejected gigs to the owner only', async () => {
    await autoApprove(false);
    const { gig, auth } = await saveGig();
    const other = await member();
    expect((await getGig(gig.id)).status).toBe(404);
    expect((await getGig(gig.id, other.auth)).status).toBe(404);
    const own = await getGig(gig.id, auth);
    expect(own.status).toBe(200);
    expect(own.body.status).toBe('pending');
    expect(own.body.publishedAt).toBeNull();

    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'rejected', rejectionReason: 'Blurry images' },
    });
    expect((await getGig(gig.id, other.auth)).status).toBe(404);
    const rejected = await getGig(gig.id, auth);
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe('rejected');
  });

  it('hides gigs of owners who may not be listed, except from the owner', async () => {
    await autoApprove(true);
    const { gig, auth, userId } = await saveGig();
    await prisma.user.update({ where: { id: userId }, data: { isRestricted: true } });
    expect((await getGig(gig.id)).status).toBe(404);
    const own = await getGig(gig.id, auth);
    expect(own.status).toBe(200);
    expect(own.body.seller.isAcceptingOrders).toBe(false);
    await prisma.user.update({
      where: { id: userId },
      data: { isRestricted: false, status: 'banned' },
    });
    expect((await getGig(gig.id)).status).toBe(404);
  });

  it('returns 404 for a deleted gig, also to its owner, and for an unknown id', async () => {
    await autoApprove(true);
    const { gig, auth } = await saveGig();
    expect((await http().delete(`/api/v1/gigs/${gig.id}`).set(auth)).status).toBe(204);
    expect((await getGig(gig.id, auth)).status).toBe(404);
    expect((await getGig(crypto.randomUUID())).status).toBe(404);
  });
});

describe('lookupGig (AC-33)', () => {
  it('finds the gig by uid in any case and returns the current slug', async () => {
    await autoApprove(true);
    const { gig } = await saveGig();
    const lower = await http()
      .get('/api/v1/gigs/lookup')
      .query({ uid: gig.uid.toLowerCase() })
      .set('Accept-Language', 'ka');
    expect(lower.status).toBe(200);
    expect(lower.body).toMatchObject({ id: gig.id, slug: gig.slug });
    const bad = await http().get('/api/v1/gigs/lookup').query({ uid: 'not-a-uid' });
    expect(bad.status).toBe(404);
  });

  it('applies the same visibility as getGig', async () => {
    await autoApprove(false);
    const { gig, auth } = await saveGig();
    const lookup = (a: Auth) => http().get('/api/v1/gigs/lookup').query({ uid: gig.uid }).set(a);
    expect((await lookup({})).status).toBe(404);
    expect((await lookup(auth)).status).toBe(200);
  });
});

describe('getGigOwnerView (AC-18, AC-21)', () => {
  it('returns the edit form to the owner with the rejection reason; others and deleted gigs get 404', async () => {
    await autoApprove(false);
    const { gig, auth } = await saveGig();
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'rejected', rejectionReason: 'Blurry images' },
    });
    const view = await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(auth);
    expect(view.status).toBe(200);
    expect(view.body).toMatchObject({
      id: gig.id,
      status: 'rejected',
      rejectionReason: 'Blurry images',
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
    });
    const other = await member();
    expect((await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(other.auth)).status).toBe(
      404,
    );
    expect((await http().get(`/api/v1/gigs/${gig.id}/owner-view`)).status).toBe(401);
    await http().delete(`/api/v1/gigs/${gig.id}`).set(auth);
    expect((await http().get(`/api/v1/gigs/${gig.id}/owner-view`).set(auth)).status).toBe(404);
  });
});

describe('listMyGigs (AC-20)', () => {
  it('lists own non-deleted gigs newest first, filters by status and pages with a cursor', async () => {
    await withSetting('S-001', 'plans.standard.gig_limit', 10);
    await autoApprove(true);
    const m = await member();
    const first = (await saveGig(m)).gig;
    await autoApprove(false);
    const second = (await saveGig(m)).gig;
    const third = (await saveGig(m)).gig;
    const gone = (await saveGig(m)).gig;
    await http().delete(`/api/v1/gigs/${gone.id}`).set(m.auth);
    await prisma.gig.update({
      where: { id: third.id },
      data: { status: 'rejected', rejectionReason: 'Blurry images' },
    });
    await saveGig(); // another member's gig never shows

    const all = await http().get('/api/v1/gigs/mine').set(m.auth);
    expect(all.status).toBe(200);
    expect(all.body.data.map((g: { id: string }) => g.id)).toEqual([third.id, second.id, first.id]);
    expect(all.body.nextCursor).toBeNull();
    expect(all.body.data[0]).toMatchObject({
      uid: third.uid,
      slug: third.slug,
      title: 'Logo დიზაინი Photoshop-ში',
      contentLocale: 'ka',
      price: { amount: 5000, currency: 'GEL' },
      status: 'rejected',
      rejectionReason: 'Blurry images',
      ordersInQueueCount: 0,
    });
    expect(all.body.data[0].thumbnail.thumb).toContain(MEDIA);
    expect(all.body.data[1]).toMatchObject({ status: 'pending', rejectionReason: null });

    const filtered = await http()
      .get('/api/v1/gigs/mine')
      .query('status=active&status=pending')
      .set(m.auth);
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.map((g: { id: string }) => g.id)).toEqual([second.id, first.id]);
    const single = await http().get('/api/v1/gigs/mine').query({ status: 'active' }).set(m.auth);
    expect(single.body.data.map((g: { id: string }) => g.id)).toEqual([first.id]);

    const page1 = await http().get('/api/v1/gigs/mine').query({ limit: 2 }).set(m.auth);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.nextCursor).toEqual(expect.any(String));
    const page2 = await http()
      .get('/api/v1/gigs/mine')
      .query({ limit: 2, cursor: page1.body.nextCursor })
      .set(m.auth);
    expect(page2.body.data.map((g: { id: string }) => g.id)).toEqual([first.id]);
    expect(page2.body.nextCursor).toBeNull();
  });

  it('is empty for a member without gigs and needs sign-in', async () => {
    const m = await member();
    const res = await http().get('/api/v1/gigs/mine').set(m.auth);
    expect(res.body).toEqual({ data: [], nextCursor: null });
    expect((await http().get('/api/v1/gigs/mine')).status).toBe(401);
  });
});
