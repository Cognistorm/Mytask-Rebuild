// Gigs (ROADMAP 4.3.3a; spec 04 AC-1…AC-3, AC-13, AC-14, EC-8; spec 00 R-2.1): the plan-limit check when the
// wizard opens (S-001 / S-002 via PremiumStatus, non-deleted gigs only) and the gig upload purposes (images
// JPG/PNG ≤ S-078, documents PDF ≤ S-082 only while S-080 is ON). createGig/updateGig/deleteGig join in 4.3.3b/c.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PURPOSE_POLICIES } from '../src/modules/files/purposes';
import { PremiumStatus } from '../src/modules/subscriptions/premium-status';
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
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
const MB = 1024 * 1024;

/** A registered, active user. */
async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `gg_${n}`,
      email: `gg${n}@example.com`,
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
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

/** A gig row of `ownerId` under a fresh category chain (the create endpoint arrives in 4.3.3b). */
async function gigOf(ownerId: string, status: 'active' | 'pending' | 'rejected' | 'deleted') {
  seq += 1;
  const cat = (parentId: string | null, depth: number) =>
    prisma.gigCategory.create({
      data: {
        parentId,
        depth,
        slug: `gg-${Date.now().toString(36)}-${seq}-${depth}`,
        translations: { create: [{ locale: 'ka', name: 'კატეგორია' }] },
      },
    });
  const top = await cat(null, 1);
  const sub = await cat(top.id, 2);
  const child = await cat(sub.id, 3);
  const thumb = await prisma.file.create({
    data: {
      purpose: 'gig_thumbnail',
      ownerUserId: ownerId,
      bucket: 'public_media',
      objectKey: `test/${ownerId}/${seq}`,
      originalName: 'a.jpg',
      declaredType: 'image/jpeg',
      sizeBytes: 1000n,
      status: 'ready',
    },
  });
  const deleted = status === 'deleted';
  return prisma.gig.create({
    data: {
      uid: `${Date.now().toString(16)}${seq}`.toUpperCase().padEnd(20, '0').slice(0, 20),
      slug: `logo-${seq}`,
      ownerId,
      categoryId: top.id,
      subcategoryId: sub.id,
      childcategoryId: child.id,
      priceTetri: 5000n,
      deliveryDays: 3,
      revisionsAllowed: 1,
      thumbnailFileId: thumb.id,
      status,
      ...(deleted ? { deletedAt: new Date(), deletedBy: 'owner' as const } : {}),
    },
  });
}

/** Overrides one register row for the test (the rows read live, CONVENTIONS §16). */
async function setSetting(registerId: SettingId, key: string, value: number | boolean) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}
const touched: string[] = [];
async function withSetting(registerId: SettingId, key: string, value: number | boolean) {
  touched.push(key);
  await setSetting(registerId, key, value);
}

const eligibility = (auth: Auth) => http().get('/api/v1/gigs/creation-eligibility').set(auth);
const upload = (auth: Auth, body: Record<string, unknown>) =>
  http().post('/api/v1/files').set(auth).send(body);

beforeAll(async () => {
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
});

// Registration allows 3 per IP and hour (spec 01); every test starts with fresh counters.
beforeEach(async () => {
  await app.get(RedisService).client.flushall();
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: touched.splice(0) } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app.close();
});

describe('getGigCreationEligibility (AC-1, AC-2, R-G3)', () => {
  it('sends guests to login with 401 (AC-1)', async () => {
    const res = await http().get('/api/v1/gigs/creation-eligibility');
    expect(res.status).toBe(401);
  });

  it('lets a Standard user with no gigs open the wizard under S-001 (default 1)', async () => {
    const { auth } = await member();
    const res = await eligibility(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      canCreate: true,
      plan: 'standard',
      gigCount: 0,
      gigLimit: 1,
      settingId: 'S-001',
    });
  });

  it('counts active, pending and rejected gigs but not deleted ones (AC-2, AC-24)', async () => {
    const { userId, auth } = await member();
    await gigOf(userId, 'deleted');
    expect((await eligibility(auth)).body).toMatchObject({ canCreate: true, gigCount: 0 });

    await gigOf(userId, 'rejected');
    expect((await eligibility(auth)).body).toMatchObject({
      canCreate: false,
      gigCount: 1,
      gigLimit: 1,
      settingId: 'S-001',
    });

    await withSetting('S-001', 'plans.standard.gig_limit', 3);
    await gigOf(userId, 'pending');
    await gigOf(userId, 'active');
    expect((await eligibility(auth)).body).toMatchObject({
      canCreate: false,
      gigCount: 3,
      gigLimit: 3,
    });
  });

  it('applies S-002 to Premium users (default unlimited, AC-3)', async () => {
    const { userId, auth } = await member();
    await gigOf(userId, 'active');
    vi.spyOn(app.get(PremiumStatus), 'isActive').mockImplementation((id) =>
      Promise.resolve(id === userId),
    );
    expect((await eligibility(auth)).body).toEqual({
      canCreate: true,
      plan: 'premium',
      gigCount: 1,
      gigLimit: null,
      settingId: 'S-002',
    });

    await withSetting('S-002', 'plans.premium.gig_limit', 1);
    expect((await eligibility(auth)).body).toMatchObject({
      canCreate: false,
      gigLimit: 1,
      settingId: 'S-002',
    });
  });

  it('refuses restricted users (403 ACCOUNT_RESTRICTED, audience user)', async () => {
    const { userId, auth } = await member();
    await prisma.user.update({ where: { id: userId }, data: { isRestricted: true } });
    const res = await eligibility(auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
  });
});

describe('gig upload purposes (AC-13, AC-14, EC-8)', () => {
  const jpg = { fileName: 'cover.jpg', contentType: 'image/jpeg', sizeBytes: 200_000 };
  const pdf = {
    purpose: 'gig_document',
    fileName: 'brief.pdf',
    contentType: 'application/pdf',
    sizeBytes: 300_000,
  };

  it('takes JPG/PNG thumbnails and gallery images up to S-078 MB, nothing else', async () => {
    const { auth } = await member();
    for (const purpose of ['gig_thumbnail', 'gig_image']) {
      const ok = await upload(auth, { purpose, ...jpg });
      expect(ok.status).toBe(201);
      expect(ok.body.file).toMatchObject({ purpose, status: 'pending' });
      expect(
        (
          await upload(auth, {
            purpose,
            fileName: 'c.png',
            contentType: 'image/png',
            sizeBytes: 1000,
          })
        ).status,
      ).toBe(201);
      const webp = await upload(auth, {
        purpose,
        fileName: 'c.webp',
        contentType: 'image/webp',
        sizeBytes: 1000,
      });
      expect(webp.status).toBe(422);
      expect(webp.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
      const big = await upload(auth, { purpose, ...jpg, sizeBytes: 5 * MB + 1 });
      expect(big.status).toBe(422);
      expect(big.body.details).toMatchObject({ limit: 5, settingId: 'S-078' });
    }
    await withSetting('S-078', 'media.images.max_size_mb', 1);
    const res = await upload(auth, { purpose: 'gig_image', ...jpg, sizeBytes: 2 * MB });
    expect(res.status).toBe(422);
    expect(res.body.details).toMatchObject({ limit: 1, settingId: 'S-078' });
  });

  it('takes PDF documents up to S-082 MB while S-080 is ON', async () => {
    const { auth } = await member();
    expect((await upload(auth, pdf)).status).toBe(201);
    const doc = await upload(auth, {
      ...pdf,
      fileName: 'brief.docx',
      contentType: 'application/msword',
    });
    expect(doc.status).toBe(422);
    expect(doc.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    const big = await upload(auth, { ...pdf, sizeBytes: 10 * MB + 1 });
    expect(big.status).toBe(422);
    expect(big.body.details).toMatchObject({ limit: 10, settingId: 'S-082' });
  });

  it('refuses new documents while S-080 is OFF, before any storage URL exists (EC-8)', async () => {
    const { auth } = await member();
    await withSetting('S-080', 'media.gig.documents_enabled', false);
    const before = storage.posts.length;
    const res = await upload(auth, pdf);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FEATURE_DISABLED');
    expect(res.body.details).toMatchObject({
      settingId: 'S-080',
      messageKey: 't_feature_disabled',
    });
    expect(storage.posts.length).toBe(before);
    // Images are not affected by the document switch.
    expect((await upload(auth, { purpose: 'gig_image', ...jpg })).status).toBe(201);
  });

  it('keeps images as public variants and documents as public downloads (R-G11)', () => {
    expect(PURPOSE_POLICIES.gig_thumbnail).toMatchObject({
      finalBucket: 'public_media',
      processing: 'public_image',
    });
    expect(PURPOSE_POLICIES.gig_image).toMatchObject({
      finalBucket: 'public_media',
      processing: 'public_image',
    });
    expect(PURPOSE_POLICIES.gig_document).toMatchObject({
      finalBucket: 'public_media',
      processing: 'none',
      quarantineBucket: 'private',
      enabledBy: 'S-080',
    });
  });
});
