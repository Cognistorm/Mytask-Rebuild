// Files F0 part 3 (ROADMAP 4.1.5, ADR-009 §4): getFileDownload, adminCreateFileUpload, adminGetFile,
// adminCompleteFileUpload. Real HTTP pipeline with contract validation; object storage is MemoryStorage.
import { hash, Algorithm } from '@node-rs/argon2';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { FileDownloadAccess } from '../src/modules/files/files.service';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '../src/modules/staff/permissions';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;

const IOS = { 'X-MyTask-Client': 'ios' };
const ADMIN = { 'X-MyTask-Client': 'admin', Origin: 'http://localhost:3200' };
const PASSWORD = 'StaffSecret1';
const MB = 1024 * 1024;
const http = () => request(app.getHttpServer());
const uniq = () => `${Date.now().toString(36)}${(seq += 1)}`;

async function register() {
  const n = uniq();
  const res = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      username: `dl_${n}`,
      email: `dl${n}@example.com`,
      fullName: 'Download User',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(res.status).toBe(201);
  return {
    id: res.body.session.user.id as string,
    auth: { ...IOS, Authorization: `Bearer ${res.body.session.accessToken as string}` },
  };
}

type Auth = Awaited<ReturnType<typeof register>>['auth'];

/** A staff member with the system Super-admin role, with the given permissions, or with no role at all. */
async function makeStaff(grant: 'super' | 'none' | string[]) {
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, area: code.split('.')[0]! },
      update: {},
    });
  }
  let roleId: string | null = null;
  if (grant === 'super') {
    roleId = (
      await prisma.role.upsert({
        where: { code: SUPER_ADMIN_ROLE },
        create: { code: SUPER_ADMIN_ROLE, name: 'Super-admin', isSystem: true },
        update: {},
      })
    ).id;
  } else if (grant !== 'none') {
    roleId = (
      await prisma.role.create({
        data: {
          code: `files_role_${uniq()}`,
          name: 'Files test role',
          permissions: { create: grant.map((permissionCode) => ({ permissionCode })) },
        },
      })
    ).id;
  }
  const n = uniq();
  const staff = await prisma.staff.create({
    data: {
      username: `fstaff_${n}`,
      fullName: 'Files Staff',
      email: `fstaff${n}@example.com`,
      passwordHash: await hash(PASSWORD, { algorithm: Algorithm.Argon2id }),
      passwordAlgo: 'argon2id',
      ...(roleId ? { roles: { create: { roleId } } } : {}),
    },
  });
  return { id: staff.id, auth: { Authorization: `Bearer ${await staffLogin(staff)}` } };
}

async function staffLogin(staff: { username: string; email: string }): Promise<string> {
  const res = await http()
    .post('/api/v1/admin/auth/login')
    .set(ADMIN)
    .send({ login: staff.username, password: PASSWORD });
  if (res.status === 200) return res.body.accessToken;
  expect(res.status).toBe(202);
  const rows = await prisma.outboxEvent.findMany({
    where: { eventType: 'EV-06' },
    orderBy: { id: 'desc' },
  });
  const row = rows.find((r) => (r.payload as { to?: string[] }).to?.includes(staff.email));
  const code = String((row!.payload as { params: { code: string } }).params.code);
  const verify = await http()
    .post('/api/v1/admin/auth/2fa/verify')
    .set(ADMIN)
    .send({ challengeId: res.body.challengeId, code });
  expect(verify.status).toBe(200);
  return verify.body.accessToken;
}

const kycPhoto = {
  purpose: 'kyc_document',
  fileName: 'პირადობა.png',
  sizeBytes: 2 * MB,
  contentType: 'image/png',
};
const categoryImage = {
  purpose: 'category_image',
  fileName: 'design.png',
  sizeBytes: 300_000,
  contentType: 'image/png',
};

/** Upload slot + the worker's result, as the scan pipeline (4.1.4) would leave the row. */
async function readyFile(auth: Auth, body: object = kycPhoto): Promise<FileRow> {
  const res = await http().post('/api/v1/files').set(auth).send(body);
  expect(res.status).toBe(201);
  const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
  const publicImage = row.purpose === 'avatar' || row.purpose === 'portfolio_image';
  return prisma.file.update({
    where: { id: row.id },
    data: publicImage
      ? {
          status: 'ready',
          readyAt: new Date(),
          bucket: 'public_media',
          objectKey: `images/${row.id}/large.webp`,
          variants: {
            thumb: `images/${row.id}/thumb.webp`,
            medium: `images/${row.id}/medium.webp`,
            large: `images/${row.id}/large.webp`,
          },
        }
      : { status: 'ready', readyAt: new Date(), objectKey: `documents/${row.id}.png` },
  });
}

const download = (auth: Auth, id: string, mode?: string) =>
  http()
    .get(`/api/v1/files/${id}/download`)
    .query(mode ? { mode } : {})
    .set(auth)
    .redirects(0);

beforeAll(async () => {
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  await prisma.bannedIp.deleteMany();
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
});

describe('getFileDownload (ADR-009 §4)', () => {
  it('mode=json: a short-lived signed URL for the owner, as an attachment with the original name', async () => {
    const { auth } = await register();
    const file = await readyFile(auth);
    const res = await download(auth, file.id, 'json');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body.url).toBe(`http://storage.test/kyc/${file.objectKey}?signed=1`);
    // KYC: 2 minutes (ADR-009 §2).
    const ttl = Date.parse(res.body.expiresAt) - Date.now();
    expect(ttl).toBeGreaterThan(100_000);
    expect(ttl).toBeLessThanOrEqual(120_000);
    expect(storage.gets.at(-1)).toEqual({
      bucket: 'kyc',
      key: file.objectKey,
      expiresSeconds: 120,
      downloadName: 'პირადობა.png',
    });
  });

  it('mode=redirect (default): 302 to the signed URL, never cached', async () => {
    const { auth } = await register();
    const file = await readyFile(auth);
    for (const mode of [undefined, 'redirect']) {
      const res = await download(auth, file.id, mode);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`http://storage.test/kyc/${file.objectKey}?signed=1`);
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });

  it('public images: the large WebP variant for 5 minutes, named .webp', async () => {
    const { auth } = await register();
    const file = await readyFile(auth, {
      purpose: 'avatar',
      fileName: 'me.jpg',
      sizeBytes: 150_000,
      contentType: 'image/jpeg',
    });
    const res = await download(auth, file.id, 'json');
    expect(res.status).toBe(200);
    expect(storage.gets.at(-1)).toEqual({
      bucket: 'public_media',
      key: `images/${file.id}/large.webp`,
      expiresSeconds: 300,
      downloadName: 'me.webp',
    });
  });

  it('answers 404 (never 403) to other users, unknown and deleted files', async () => {
    const owner = await register();
    const other = await register();
    const file = await readyFile(owner.auth);
    const before = storage.gets.length;
    expect((await download(other.auth, file.id, 'json')).status).toBe(404);
    expect((await download(other.auth, file.id)).status).toBe(404);
    expect((await download(owner.auth, '0192a000-0000-7000-8000-000000000000')).status).toBe(404);
    await prisma.file.update({ where: { id: file.id }, data: { status: 'deleted' } });
    const gone = await download(owner.auth, file.id, 'json');
    expect(gone.status).toBe(404);
    expect(gone.body.code).toBe('NOT_FOUND');
    expect(storage.gets.length).toBe(before); // nothing was signed
  });

  it('refuses files that are not ready with 422 FILE_NOT_READY (translated)', async () => {
    const { auth } = await register();
    const file = await readyFile(auth);
    for (const status of ['pending', 'scanning', 'rejected'] as const) {
      await prisma.file.update({ where: { id: file.id }, data: { status } });
      const res = await download({ ...auth, 'Accept-Language': 'en' }, file.id, 'json');
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_NOT_READY');
      expect(res.body.message).toBe(
        'The file is still being checked. Please try again in a moment',
      );
    }
  });

  it('lets a slice rule (FileDownloadAccess) open a file for a non-owner', async () => {
    const owner = await register();
    const party = await register();
    const file = await readyFile(owner.auth);
    expect((await download(party.auth, file.id, 'json')).status).toBe(404);
    app
      .get(FileDownloadAccess)
      .register((f, userId) => Promise.resolve(f.id === file.id && userId === party.id));
    expect((await download(party.auth, file.id, 'json')).status).toBe(200);
  });

  it('needs a user session and a known mode', async () => {
    const { auth } = await register();
    const file = await readyFile(auth);
    expect((await http().get(`/api/v1/files/${file.id}/download`)).status).toBe(401);
    expect((await download(auth, file.id, 'inline')).status).toBe(400);
  });
});

describe('adminCreateFileUpload (spec 16 AC-9, AC-60, AC-63)', () => {
  it('creates a staff-owned pending upload and audits file.upload with the purpose permission', async () => {
    const staff = await makeStaff('super');
    const res = await http().post('/api/v1/admin/files').set(staff.auth).send(categoryImage);
    expect(res.status).toBe(201);
    expect(res.body.file).toMatchObject({ purpose: 'category_image', status: 'pending' });
    const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
    expect(row).toMatchObject({ ownerStaffId: staff.id, ownerUserId: null, bucket: 'private' });
    expect(row.objectKey).toMatch(/^quarantine\//);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'file.upload', targetId: row.id },
    });
    expect(audit).toMatchObject({
      actorType: 'staff',
      actorStaffId: staff.id,
      permissionCode: 'catalog.write',
      targetType: 'file',
    });
  });

  it('checks exactly the permission of the purpose (x-permission.permissionBy)', async () => {
    const writer = await makeStaff(['content.write']);
    const denied = await http().post('/api/v1/admin/files').set(writer.auth).send(categoryImage);
    expect(denied.status).toBe(403);
    expect(denied.body.details.permission).toBe('catalog.write');
    for (const body of [
      { ...categoryImage, purpose: 'blog_image', fileName: 'post.gif', contentType: 'image/gif' },
      { ...categoryImage, purpose: 'home_logo', fileName: 'logo.webp', contentType: 'image/webp' },
    ]) {
      expect((await http().post('/api/v1/admin/files').set(writer.auth).send(body)).status).toBe(
        201,
      );
    }
    const none = await makeStaff('none');
    const res = await http()
      .post('/api/v1/admin/files')
      .set(none.auth)
      .send({ ...categoryImage, purpose: 'blog_image' });
    expect(res.status).toBe(403);
    expect(res.body.details.permission).toBe('content.write');
  });

  it('refuses user purposes with 422 FILE_PURPOSE_MISMATCH', async () => {
    const staff = await makeStaff('super');
    for (const purpose of ['avatar', 'kyc_document', 'appeal_file', 'delivery']) {
      const res = await http()
        .post('/api/v1/admin/files')
        .set(staff.auth)
        .send({ ...categoryImage, purpose });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_PURPOSE_MISMATCH');
    }
  });

  it('applies the staff image rules: legacy types without SVG, at most 5 MB (Q-161)', async () => {
    const staff = await makeStaff('super');
    const post = (body: object) => http().post('/api/v1/admin/files').set(staff.auth).send(body);
    for (const body of [
      { ...categoryImage, purpose: 'blog_image', fileName: 'x.svg', contentType: 'image/svg+xml' },
      { ...categoryImage, fileName: 'x.gif', contentType: 'image/gif' }, // category: JPG/PNG only
      { ...categoryImage, fileName: 'x.webp', contentType: 'image/webp' },
    ]) {
      const res = await post(body);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    }
    const big = await post({ ...categoryImage, sizeBytes: 5 * MB + 1 });
    expect(big.status).toBe(422);
    expect(big.body.code).toBe('FILE_TOO_LARGE');
    expect(big.body.details.limit).toBe(5);
    expect((await post({ ...categoryImage, sizeBytes: 5 * MB })).status).toBe(201);
  });

  it('is staff-only, and users cannot upload staff purposes', async () => {
    const user = await register();
    expect(
      (await http().post('/api/v1/admin/files').set(user.auth).send(categoryImage)).status,
    ).toBe(401);
    const res = await http().post('/api/v1/files').set(user.auth).send(categoryImage);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });
});

describe('adminGetFile / adminCompleteFileUpload', () => {
  async function staffUpload() {
    const staff = await makeStaff('super');
    const res = await http().post('/api/v1/admin/files').set(staff.auth).send(categoryImage);
    expect(res.status).toBe(201);
    return { staff, id: res.body.file.id as string };
  }

  it('returns the file to its uploader only; other staff and users get 404', async () => {
    const { staff, id } = await staffUpload();
    const own = await http().get(`/api/v1/admin/files/${id}`).set(staff.auth);
    expect(own.status).toBe(200);
    expect(own.body).toMatchObject({ id, purpose: 'category_image', status: 'pending' });
    const other = await makeStaff('super');
    expect((await http().get(`/api/v1/admin/files/${id}`).set(other.auth)).status).toBe(404);
    expect((await http().post(`/api/v1/admin/files/${id}/complete`).set(other.auth)).status).toBe(
      404,
    );
    const user = await register();
    expect((await http().get(`/api/v1/files/${id}`).set(user.auth)).status).toBe(404);
    expect((await download(user.auth, id, 'json')).status).toBe(404);
  });

  it('queues the scan once the object exists, audits it once, and is idempotent', async () => {
    const { staff, id } = await staffUpload();
    const complete = () => http().post(`/api/v1/admin/files/${id}/complete`).set(staff.auth);
    const early = await complete();
    expect(early.status).toBe(422);
    expect(early.body.code).toBe('FILE_NOT_READY');

    const row = await prisma.file.findUniqueOrThrow({ where: { id } });
    storage.upload(row.bucket, row.objectKey, Number(row.sizeBytes), row.declaredType);
    for (let i = 0; i < 2; i += 1) {
      const res = await complete();
      expect(res.status).toBe(202);
      expect(res.body.status).toBe('scanning');
    }
    const audits = await prisma.auditLog.findMany({
      where: { action: 'file.upload.complete', targetId: id },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ actorStaffId: staff.id, targetType: 'file' });
  });
});
