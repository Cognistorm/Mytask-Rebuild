// Appeal files (ROADMAP 4.1.6a; spec 01 AC-47, R-A8; spec 16 AC-29): `appeal_file` uploads (S-092, S-093),
// createRestrictionAppeal with `fileIds` (1 to S-091 when required), files in the appeal views, and the
// audited staff download adminGetRestrictionAppealFileDownload. Object storage is MemoryStorage.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';
import { makeStaff } from './test-staff';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const MB = 1024 * 1024;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;

/** A registered user with a fresh restriction from a Super-admin. */
async function restricted(staff: Auth, filesRequired = true) {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `ap_${n}`,
      email: `ap${n}@example.com`,
      fullName: 'Appeal User',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  const created = await http()
    .post('/api/v1/admin/restrictions')
    .set(staff)
    .send({ userId, message: 'Please send proof.', filesRequired });
  expect(created.status).toBe(201);
  return {
    userId,
    restrictionId: created.body.id as string,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    },
  };
}

const video = {
  purpose: 'appeal_file',
  fileName: 'proof.mp4',
  sizeBytes: 90 * MB,
  contentType: 'video/mp4',
};
const upload = (auth: Auth, body: object) => http().post('/api/v1/files').set(auth).send(body);

/** Upload slot + the worker's result for a `processing: 'none'` purpose (4.1.4). */
async function readyFile(auth: Auth, body: object = video): Promise<FileRow> {
  const res = await upload(auth, body);
  expect(res.status).toBe(201);
  return prisma.file.update({
    where: { id: res.body.file.id },
    data: {
      status: 'ready',
      readyAt: new Date(),
      objectKey: `files/${res.body.file.id}`,
      detectedType: (body as { contentType: string }).contentType,
    },
  });
}

const appeal = (auth: Auth, restrictionId: string, fileIds?: string[]) =>
  http()
    .post('/api/v1/restriction-appeals')
    .set(auth)
    .send({ restrictionId, message: 'Here is my proof.', ...(fileIds ? { fileIds } : {}) });

let superAdmin: Auth;

beforeAll(async () => {
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  superAdmin = (await makeStaff(app, 'super')).auth;
});

beforeEach(async () => {
  await prisma.bannedIp.deleteMany();
  // Registration allows 10 per IP and hour; keep the staff session (it lives in the database).
  const redis = app.get(RedisService).client;
  const keys = await redis.keys('*');
  const limits = keys.filter((k) => !k.includes('session'));
  if (limits.length) await redis.del(...limits);
});

afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
});

describe('appeal_file uploads (S-092, S-093; Q-154)', () => {
  it('lets a restricted user upload the S-093 types up to S-092 MB into the private bucket', async () => {
    const { auth } = await restricted(superAdmin);
    for (const body of [
      video,
      { ...video, fileName: 'clip.mkv', contentType: 'application/octet-stream' },
      { ...video, fileName: 'clip.avi', contentType: 'video/avi' },
      {
        ...video,
        fileName: 'letter.docx',
        sizeBytes: 40_000,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
      { ...video, fileName: 'note.txt', sizeBytes: 300, contentType: 'text/plain' },
      { ...video, fileName: 'scan.pdf', sizeBytes: 100 * MB, contentType: 'application/pdf' },
    ]) {
      const res = await upload(auth, body);
      expect(res.status, (body as { fileName: string }).fileName).toBe(201);
      const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
      expect(row.bucket).toBe('private');
    }
  });

  it('refuses other types and files above S-092', async () => {
    const { auth } = await restricted(superAdmin);
    for (const body of [
      { ...video, fileName: 'run.exe', contentType: 'application/octet-stream' },
      { ...video, fileName: 'x.svg', contentType: 'image/svg+xml' },
      { ...video, fileName: 'x.mp4', contentType: 'application/octet-stream' },
    ]) {
      const res = await upload(auth, body);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    }
    const big = await upload(auth, { ...video, sizeBytes: 100 * MB + 1 });
    expect(big.status).toBe(422);
    expect(big.body.code).toBe('FILE_TOO_LARGE');
    expect(big.body.details).toMatchObject({ limit: 100, settingId: 'S-092' });
  });
});

describe('createRestrictionAppeal with files (spec 01 AC-47)', () => {
  it('requires 1 to S-091 files when the restriction asks for files', async () => {
    const r = await restricted(superAdmin);
    const none = await appeal(r.auth, r.restrictionId);
    expect(none.status).toBe(400);
    expect(none.body.details.fields[0]).toMatchObject({ field: 'fileIds', code: 'required' });

    const three = await Promise.all([1, 2, 3].map(() => readyFile(r.auth)));
    const many = await appeal(
      r.auth,
      r.restrictionId,
      three.map((f) => f.id),
    );
    expect(many.status).toBe(400);
    expect(many.body.details.fields[0]).toMatchObject({ field: 'fileIds', code: 'max_items' });
    // Nothing was saved: the restriction can still be appealed.
    expect(
      (await prisma.userRestriction.findUniqueOrThrow({ where: { id: r.restrictionId } })).status,
    ).toBe('pending');
  });

  it('accepts only own, ready appeal files', async () => {
    const r = await restricted(superAdmin);
    const other = await restricted(superAdmin);
    const foreign = await readyFile(other.auth);
    const kyc = await prisma.file.create({
      data: {
        purpose: 'kyc_document',
        ownerUserId: r.userId,
        bucket: 'kyc',
        objectKey: `documents/${Date.now()}-${seq}.png`,
        originalName: 'id.png',
        declaredType: 'image/png',
        sizeBytes: 1000n,
        status: 'ready',
      },
    });
    for (const id of [foreign.id, kyc.id, '0190f5c2-7d3a-7cc1-9b1e-000000000009']) {
      const res = await appeal(r.auth, r.restrictionId, [id]);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_PURPOSE_MISMATCH');
    }
    const scanning = await readyFile(r.auth);
    await prisma.file.update({ where: { id: scanning.id }, data: { status: 'scanning' } });
    const early = await appeal(r.auth, r.restrictionId, [scanning.id]);
    expect(early.status).toBe(422);
    expect(early.body.code).toBe('FILE_NOT_READY');
  });

  it('saves the files in order, shows them to the user and staff, and keeps them from deletion', async () => {
    const r = await restricted(superAdmin);
    const pdf = await readyFile(r.auth, {
      ...video,
      fileName: 'განცხადება.pdf',
      sizeBytes: 2 * MB,
      contentType: 'application/pdf',
    });
    const mp4 = await readyFile(r.auth);
    const res = await appeal(r.auth, r.restrictionId, [pdf.id, mp4.id, pdf.id]);
    expect(res.status).toBe(201);
    const expected = [
      {
        fileId: pdf.id,
        fileName: 'განცხადება.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2 * MB,
      },
      { fileId: mp4.id, fileName: 'proof.mp4', contentType: 'video/mp4', sizeBytes: 90 * MB },
    ];
    expect(res.body).toMatchObject({ status: 'submitted', appeal: { files: expected } });

    const mine = await http().get('/api/v1/me/restrictions').set(r.auth);
    expect(mine.body.data[0].appeal.files).toEqual(expected);
    const queue = await http()
      .get('/api/v1/admin/restriction-appeals')
      .query({ userId: r.userId })
      .set(superAdmin);
    expect(queue.status).toBe(200);
    expect(queue.body.data[0].files).toEqual(expected);
    expect(queue.body.data[0].restriction.appeal.files).toEqual(expected);

    const del = await http().delete(`/api/v1/files/${pdf.id}`).set(r.auth);
    expect(del.status).toBe(409);
  });

  it('accepts files on a restriction that does not require them (legacy), within S-091', async () => {
    const r = await restricted(superAdmin, false);
    const f = await readyFile(r.auth);
    const res = await appeal(r.auth, r.restrictionId, [f.id]);
    expect(res.status).toBe(201);
    expect(res.body.appeal.files).toHaveLength(1);
  });
});

describe('adminGetRestrictionAppealFileDownload (spec 16 AC-29, R-A8)', () => {
  async function submitted() {
    const r = await restricted(superAdmin);
    const f = await readyFile(r.auth);
    expect((await appeal(r.auth, r.restrictionId, [f.id])).status).toBe(201);
    const a = await prisma.restrictionAppeal.findUniqueOrThrow({
      where: { restrictionId: r.restrictionId },
    });
    return { ...r, file: f, appealId: a.id };
  }
  const download = (auth: Auth, appealId: string, fileId: string, mode?: string) =>
    http()
      .get(`/api/v1/admin/restriction-appeals/${appealId}/files/${fileId}/download`)
      .query(mode ? { mode } : {})
      .set(auth)
      .redirects(0);

  it('signs the file for users.restrict staff and audits every access', async () => {
    const s = await submitted();
    const staff = await makeStaff(app, ['users.restrict']);
    const json = await download(staff.auth, s.appealId, s.file.id, 'json');
    expect(json.status).toBe(200);
    expect(json.headers['cache-control']).toBe('no-store');
    expect(json.body.url).toBe(`http://storage.test/private/files/${s.file.id}?signed=1`);
    expect(storage.gets.at(-1)).toMatchObject({ expiresSeconds: 300, downloadName: 'proof.mp4' });
    const redirect = await download(staff.auth, s.appealId, s.file.id);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe(json.body.url);

    const audits = await prisma.auditLog.findMany({
      where: { action: 'restriction_appeal.file_view', actorStaffId: staff.id },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      permissionCode: 'users.restrict',
      targetType: 'user',
      targetId: s.userId,
      after: { appealId: s.appealId, fileId: s.file.id },
    });
  });

  it('answers 404 for a file that is not in this appeal, and 403 without users.restrict', async () => {
    const a = await submitted();
    const b = await submitted();
    expect((await download(superAdmin, a.appealId, b.file.id, 'json')).status).toBe(404);
    expect(
      (await download(superAdmin, '0190f5c2-7d3a-7cc1-9b1e-000000000009', a.file.id)).status,
    ).toBe(404);
    const reader = await makeStaff(app, ['users.read']);
    const denied = await download(reader.auth, a.appealId, a.file.id, 'json');
    expect(denied.status).toBe(403);
    expect(denied.body.details.permission).toBe('users.restrict');
    expect(
      await prisma.auditLog.count({
        where: { action: 'restriction_appeal.file_view', targetId: { in: [a.userId, b.userId] } },
      }),
    ).toBe(0);
  });

  it('a restricted user cannot download their own appeal file (staff only, Owner 2026-10-02)', async () => {
    const s = await submitted();
    const res = await http()
      .get(`/api/v1/files/${s.file.id}/download`)
      .query({ mode: 'json' })
      .set(s.auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
  });
});
