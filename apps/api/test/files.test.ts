// Files F0 part 1 (ROADMAP 4.1.3, ADR-009 §3): createFileUpload, getFile, completeFileUpload, deleteFile.
// Real HTTP pipeline with contract validation; object storage is the in-memory stand-in (MemoryStorage).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FileAttachments, UPLOAD_WINDOW_SECONDS } from '../src/modules/files/files.service';
import { ENV, loadEnv } from '../src/platform/config/env';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;

const IOS = { 'X-MyTask-Client': 'ios' };
const http = () => request(app.getHttpServer());
const MB = 1024 * 1024;

async function register() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const res = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      username: `files_${n}`,
      email: `files${n}@example.com`,
      fullName: 'Files User',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(res.status).toBe(201);
  const at = res.body.session.accessToken as string;
  return {
    id: res.body.session.user.id as string,
    auth: { ...IOS, Authorization: `Bearer ${at}` },
  };
}

type Auth = Awaited<ReturnType<typeof register>>['auth'];

const avatar = {
  purpose: 'avatar',
  fileName: 'me.jpg',
  sizeBytes: 150_000,
  contentType: 'image/jpeg',
};
const createUpload = (auth: Auth, body: object = avatar) =>
  http().post('/api/v1/files').set(auth).send(body);

async function uploaded(auth: Auth, body: object = avatar) {
  const res = await createUpload(auth, body);
  expect(res.status).toBe(201);
  const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
  storage.upload(row.bucket, row.objectKey, Number(row.sizeBytes), row.declaredType);
  return row;
}

beforeAll(async () => {
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
});

// Registration allows 3 per IP and hour (spec 01); every test starts with fresh counters.
beforeEach(async () => {
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await app.close();
});

describe('createFileUpload', () => {
  it('creates a pending file and a presigned POST to one quarantine key (ADR-009 §3.1–§3.2)', async () => {
    const { id, auth } = await register();
    const before = storage.posts.length;
    const res = await createUpload(auth);
    expect(res.status).toBe(201);
    expect(res.body.file).toMatchObject({
      purpose: 'avatar',
      status: 'pending',
      fileName: 'me.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 150_000,
      rejectReason: null,
      image: null,
      readyAt: null,
    });
    expect(res.body.upload.method).toBe('POST');
    expect(Date.parse(res.body.upload.expiresAt)).toBeGreaterThan(Date.now());

    const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
    expect(row).toMatchObject({ ownerUserId: id, bucket: 'private', status: 'pending' });
    expect(row.objectKey).toMatch(/^quarantine\/[0-9a-f-]{36}$/);
    expect(storage.posts.length).toBe(before + 1);
    // The signed policy allows exactly the declared type and at most the declared size.
    expect(storage.posts.at(-1)).toMatchObject({
      bucket: 'private',
      key: row.objectKey,
      contentType: 'image/jpeg',
      maxBytes: 150_000,
    });
  });

  it('keeps KYC uploads in the kyc bucket, even in quarantine', async () => {
    const { auth } = await register();
    const row = await uploaded(auth, {
      purpose: 'kyc_document',
      fileName: 'front.png',
      sizeBytes: 4 * MB,
      contentType: 'image/png',
    });
    expect(row.bucket).toBe('kyc');
  });

  it('strips paths and control characters from the file name', async () => {
    const { auth } = await register();
    const res = await createUpload(auth, {
      ...avatar,
      fileName: '..\\..\\etc/ავატარი\u0007.png',
      contentType: 'image/png',
    });
    expect(res.status).toBe(201);
    expect(res.body.file.fileName).toBe('ავატარი.png');
  });

  it('refuses types outside the purpose list and a content type that does not match the extension', async () => {
    const { auth } = await register();
    for (const body of [
      { ...avatar, fileName: 'me.svg', contentType: 'image/svg+xml' }, // P-24: SVG refused
      { ...avatar, fileName: 'me.jpg', contentType: 'text/html' },
      { ...avatar, fileName: 'me', contentType: 'image/jpeg' },
      { ...avatar, purpose: 'kyc_document', fileName: 'id.webp', contentType: 'image/webp' },
    ]) {
      const res = await createUpload(auth, body);
      expect(res.status, body.fileName).toBe(422);
      expect(res.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    }
  });

  it('refuses files above the purpose limit, reading register rows live (S-090)', async () => {
    const { auth } = await register();
    const tooBigAvatar = await createUpload(auth, { ...avatar, sizeBytes: 2 * MB + 1 });
    expect(tooBigAvatar.status).toBe(422);
    expect(tooBigAvatar.body.code).toBe('FILE_TOO_LARGE');
    expect(tooBigAvatar.body.details.limit).toBe(2);

    const portfolio = { purpose: 'portfolio_image', fileName: 'p.png', contentType: 'image/png' };
    expect((await createUpload(auth, { ...portfolio, sizeBytes: 5 * MB })).status).toBe(201);
    await prisma.setting.upsert({
      where: { key: 'media.portfolio.max_size_mb' },
      create: {
        key: 'media.portfolio.max_size_mb',
        registerId: 'S-090',
        value: 1,
        currentVersion: 1,
      },
      update: { value: 1 },
    });
    app.get(SettingsService).invalidate();
    try {
      const res = await createUpload(auth, { ...portfolio, sizeBytes: 2 * MB });
      expect(res.status).toBe(422);
      expect(res.body.details).toMatchObject({ settingId: 'S-090', limit: 1 });
    } finally {
      await prisma.setting.delete({ where: { key: 'media.portfolio.max_size_mb' } });
      app.get(SettingsService).invalidate();
    }
  });

  it('refuses purposes without a policy yet and staff purposes, before any storage URL exists', async () => {
    const { id, auth } = await register();
    const before = storage.posts.length;
    for (const purpose of ['delivery', 'chat_attachment', 'home_logo', 'category_image']) {
      const res = await createUpload(auth, { ...avatar, purpose });
      expect(res.status, purpose).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    }
    expect(storage.posts.length).toBe(before);
    expect(await prisma.file.count({ where: { ownerUserId: id } })).toBe(0);
  });

  it('refuses a restricted user every purpose but appeal_file with 403 ACCOUNT_RESTRICTED (spec 01 AC-47)', async () => {
    const { id, auth } = await register();
    await prisma.user.update({ where: { id }, data: { isRestricted: true } });
    const before = storage.posts.length;
    const res = await createUpload(auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
    expect(storage.posts.length).toBe(before);
    // appeal_file passes the restriction rule; its policy arrives with task 4.1.6.
    const appeal = await createUpload(auth, { ...avatar, purpose: 'appeal_file' });
    expect(appeal.body.code).not.toBe('ACCOUNT_RESTRICTED');
  });

  it('validates the request against the contract and needs a session', async () => {
    const { auth } = await register();
    expect((await createUpload(auth, { ...avatar, purpose: 'nope' })).status).toBe(400);
    expect((await createUpload(auth, { ...avatar, sizeBytes: 0 })).status).toBe(400);
    expect((await http().post('/api/v1/files').set(IOS).send(avatar)).status).toBe(401);
  });

  it('limits uploads to 60 per 10 minutes per user (contract x-rate-limit)', async () => {
    const { id, auth } = await register();
    const window = Math.floor(Date.now() / 1000 / UPLOAD_WINDOW_SECONDS);
    await app.get(RedisService).client.set(`files:upload:${id}:${window}`, '60');
    const res = await createUpload(auth);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(res.body.details.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe('getFile', () => {
  it('returns own files only; others and unknown ids get 404', async () => {
    const owner = await register();
    const other = await register();
    const row = await uploaded(owner.auth);
    const own = await http().get(`/api/v1/files/${row.id}`).set(owner.auth);
    expect(own.status).toBe(200);
    expect(own.body.id).toBe(row.id);
    expect((await http().get(`/api/v1/files/${row.id}`).set(other.auth)).status).toBe(404);
    expect(
      (await http().get('/api/v1/files/0192f0c4-7b1a-7000-8000-000000000000').set(owner.auth))
        .status,
    ).toBe(404);
    expect((await http().get('/api/v1/files/not-a-uuid').set(owner.auth)).status).toBe(400);
  });
});

describe('completeFileUpload', () => {
  it('needs the object in storage, then moves to scanning; calling again returns the same state', async () => {
    const { auth } = await register();
    const res = await createUpload(auth);
    const id = res.body.file.id as string;
    const early = await http().post(`/api/v1/files/${id}/complete`).set(auth);
    expect(early.status).toBe(422);
    expect(early.body.code).toBe('FILE_NOT_READY');

    const row = await prisma.file.findUniqueOrThrow({ where: { id } });
    storage.upload(row.bucket, row.objectKey, 150_000, 'image/jpeg');
    const done = await http().post(`/api/v1/files/${id}/complete`).set(auth);
    expect(done.status).toBe(202);
    expect(done.body.status).toBe('scanning');
    const again = await http().post(`/api/v1/files/${id}/complete`).set(auth);
    expect(again.status).toBe(202);
    expect(again.body.status).toBe('scanning');
  });

  it('re-checks the stored purpose against the caller now: restricted after the upload → 403 (P2-B5 item 12)', async () => {
    const { id: userId, auth } = await register();
    const row = await uploaded(auth);
    await prisma.user.update({ where: { id: userId }, data: { isRestricted: true } });
    const res = await http().post(`/api/v1/files/${row.id}/complete`).set(auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
    expect((await prisma.file.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('pending');
    expect((await http().get(`/api/v1/files/${row.id}`).set(auth)).status).toBe(403);
  });

  it('answers 404 for another user’s file', async () => {
    const owner = await register();
    const other = await register();
    const row = await uploaded(owner.auth);
    expect((await http().post(`/api/v1/files/${row.id}/complete`).set(other.auth)).status).toBe(
      404,
    );
  });
});

describe('deleteFile', () => {
  it('removes the object and marks the file deleted; it is gone afterwards', async () => {
    const { auth } = await register();
    const row = await uploaded(auth);
    expect(storage.has(row.bucket, row.objectKey)).toBe(true);
    expect((await http().delete(`/api/v1/files/${row.id}`).set(auth)).status).toBe(204);
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);
    const after = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(after.status).toBe('deleted');
    expect(after.deletedAt).not.toBeNull();
    expect((await http().get(`/api/v1/files/${row.id}`).set(auth)).status).toBe(404);
    expect((await http().delete(`/api/v1/files/${row.id}`).set(auth)).status).toBe(404);
  });

  it('answers 404 for another user’s file and leaves it alone', async () => {
    const owner = await register();
    const other = await register();
    const row = await uploaded(owner.auth);
    expect((await http().delete(`/api/v1/files/${row.id}`).set(other.auth)).status).toBe(404);
    expect(storage.has(row.bucket, row.objectKey)).toBe(true);
  });

  it('refuses an attached file with 409 STATE_CONFLICT', async () => {
    const { auth } = await register();
    const row = await uploaded(auth);
    app.get(FileAttachments).register((f) => Promise.resolve(f.id === row.id));
    const res = await http().delete(`/api/v1/files/${row.id}`).set(auth);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
    expect(storage.has(row.bucket, row.objectKey)).toBe(true);
  });
});

describe('without object storage configured', () => {
  it('answers 503 and creates nothing', async () => {
    // Same environment minus S3 (the shell might export S3_* for the storage integration test).
    const bare = await createTestApp((b) =>
      b.overrideProvider(ENV).useValue({ ...loadEnv(), S3_ENDPOINT: undefined }),
    );
    try {
      const reg = await request(bare.getHttpServer())
        .post('/api/v1/auth/register')
        .set(IOS)
        .send({
          username: `files_nos3_${Date.now().toString(36)}`,
          email: `nos3${Date.now().toString(36)}@example.com`,
          fullName: 'No S3',
          password: 'Secret123',
          acceptTerms: true,
        });
      const res = await request(bare.getHttpServer())
        .post('/api/v1/files')
        .set({ ...IOS, Authorization: `Bearer ${reg.body.session.accessToken}` })
        .send(avatar);
      expect(res.status).toBe(503);
      expect(await prisma.file.count({ where: { ownerUserId: reg.body.session.user.id } })).toBe(0);
    } finally {
      await bare.close();
    }
  });
});
