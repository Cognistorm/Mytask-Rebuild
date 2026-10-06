// ID verification (ROADMAP 4.1.13; spec 02 AC-36…AC-40, EC-8; spec 16 AC-19, AC-27): submit with EV-16, the
// Verification centre state, one active verification per user, and the staff queue with approve (EV-17),
// decline with a reason (EV-18) and audited signed file links. Object storage is MemoryStorage.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { UserSummaries } from '../src/modules/profiles/user-summaries';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
import { RedisService } from '../src/platform/redis/redis.module';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';
import { makeStaff } from './test-staff';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
let reviewer: { id: string; auth: Auth };

/** A registered, active user. */
async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `kyc_${n}`,
      email: `kyc${n}@example.com`,
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

/** Upload slot; `ready` = what the scan pipeline (4.1.4) leaves for a KYC photo (re-encoded in `kyc`). */
async function photo(auth: Auth, ready = true): Promise<FileRow> {
  const res = await http().post('/api/v1/files').set(auth).send({
    purpose: 'kyc_document',
    fileName: 'id.jpg',
    sizeBytes: 120_000,
    contentType: 'image/jpeg',
  });
  expect(res.status).toBe(201);
  const id = res.body.file.id as string;
  if (!ready) return prisma.file.findUniqueOrThrow({ where: { id } });
  return prisma.file.update({
    where: { id },
    data: { status: 'ready', readyAt: new Date(), objectKey: `kyc/${id}.jpg` },
  });
}

/** A valid body: national ID (front + back) or passport (front only), and a selfie. */
async function kycBody(auth: Auth, documentType = 'national_id') {
  return {
    documentType,
    frontFileId: (await photo(auth)).id,
    backFileId: documentType === 'passport' ? null : (await photo(auth)).id,
    selfieFileId: (await photo(auth)).id,
  };
}

const submit = (auth: Auth, body: object) => http().post('/api/v1/kyc').set(auth).send(body);
const overview = (auth: Auth) => http().get('/api/v1/me/kyc').set(auth);
const admin = (path = '', auth: Auth = reviewer.auth) =>
  http().get(`/api/v1/admin/kyc${path}`).set(auth);
const decide = (id: string, action: 'approve' | 'decline', body: object = {}, auth?: Auth) =>
  http()
    .post(`/api/v1/admin/kyc/${id}/${action}`)
    .set(auth ?? reviewer.auth)
    .send(body);
const events = (aggregateId: string, eventType: string) =>
  prisma.outboxEvent.findMany({ where: { aggregateId, eventType } });

/** A user with a pending verification. */
async function submitted(documentType = 'national_id') {
  const m = await member();
  const body = await kycBody(m.auth, documentType);
  const res = await submit(m.auth, body);
  expect(res.status).toBe(201);
  return { ...m, body, kycId: res.body.id as string };
}

beforeAll(async () => {
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  reviewer = await makeStaff(app, ['kyc.review']);
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour; keep the staff session (it lives in the database).
  const redis = app.get(RedisService).client;
  const keys = (await redis.keys('*')).filter((k) => !k.includes('session'));
  if (keys.length) await redis.del(...keys);
});

afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
});

describe('createKycVerification (AC-36, AC-38, AC-40)', () => {
  it('creates a pending manual verification and emails every S-100 address (EV-16)', async () => {
    const { auth, body } = await submitted();
    const state = await overview(auth);
    expect(state.status).toBe(200);
    expect(state.body).toMatchObject({ status: 'pending', canSubmit: false });
    const v = state.body.verification;
    expect(v).toMatchObject({
      documentType: 'national_id',
      status: 'pending',
      provider: 'manual',
      declineReason: null,
      reviewedAt: null,
      frontFile: { fileId: body.frontFileId, fileName: 'id.jpg', contentType: 'image/jpeg' },
      backFile: { fileId: body.backFileId },
      selfieFile: { fileId: body.selfieFileId, sizeBytes: 120_000 },
    });
    const ev = await events(v.id as string, 'EV-16');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.payload).toMatchObject({ locale: 'ka', to: ['ir.gvazava@gmail.com'] });
  });

  it('takes a passport without a back side; the back side must match the document type', async () => {
    const { auth } = await member();
    const passport = await kycBody(auth, 'passport');
    const withBack = await submit(auth, { ...passport, backFileId: (await photo(auth)).id });
    expect(withBack.status).toBe(400);
    expect(withBack.body.details.fields[0]).toMatchObject({
      field: 'backFileId',
      messageKey: 't_please_select_a_valid_document_type',
    });
    const id = await kycBody(auth, 'driver_license');
    expect((await submit(auth, { ...id, backFileId: null })).status).toBe(400);
    const { backFileId: _omitted, ...noBack } = id;
    expect((await submit(auth, noBack)).status).toBe(400);
    const ok = await submit(auth, passport);
    expect(ok.status).toBe(201);
    expect(ok.body.backFile).toBeNull();
  });

  it('refuses a second verification while one is pending or verified (409)', async () => {
    const s = await submitted();
    const again = await submit(s.auth, await kycBody(s.auth));
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({
      code: 'STATE_CONFLICT',
      details: { currentState: 'pending' },
    });
    expect((await decide(s.kycId, 'approve')).status).toBe(200);
    const verified = await submit(s.auth, await kycBody(s.auth));
    expect(verified.status).toBe(409);
    expect(verified.body.details.currentState).toBe('verified');
  });

  it('two parallel submits create one verification', async () => {
    const { auth, userId } = await member();
    const bodies = [await kycBody(auth), await kycBody(auth)];
    const [a, b] = await Promise.all(bodies.map((body) => submit(auth, body)));
    expect([a!.status, b!.status].sort()).toEqual([201, 409]);
    expect(await prisma.kycVerification.count({ where: { userId } })).toBe(1);
  });

  it('accepts only own, ready kyc_document files used nowhere else', async () => {
    const { auth } = await member();
    const other = await member();
    const body = await kycBody(auth);
    const foreign = await submit(auth, { ...body, selfieFileId: (await photo(other.auth)).id });
    expect(foreign.status).toBe(422);
    expect(foreign.body.code).toBe('FILE_PURPOSE_MISMATCH');
    const twice = await submit(auth, { ...body, selfieFileId: body.frontFileId });
    expect(twice.status).toBe(422);
    const notReady = await submit(auth, { ...body, selfieFileId: (await photo(auth, false)).id });
    expect(notReady.status).toBe(422);
    expect(notReady.body.code).toBe('FILE_NOT_READY');
    const unknown = await submit(auth, {
      ...body,
      frontFileId: '0190a000-0000-7000-8000-000000000000',
    });
    expect(unknown.status).toBe(422);
    expect((await submit(auth, body)).status).toBe(201);
  });

  it('attached photos cannot be deleted with deleteFile (409)', async () => {
    const s = await submitted();
    const res = await http().delete(`/api/v1/files/${s.body.frontFileId}`).set(s.auth);
    expect(res.status).toBe(409);
  });

  it('the owner opens own photos with getFileDownload; anyone else gets 404 (AC-39)', async () => {
    const s = await submitted();
    const own = await http()
      .get(`/api/v1/files/${s.body.selfieFileId}/download`)
      .query({ mode: 'json' })
      .set(s.auth);
    expect(own.status).toBe(200);
    expect(own.body.url).toContain('/kyc/');
    const other = await member();
    const res = await http()
      .get(`/api/v1/files/${s.body.selfieFileId}/download`)
      .query({ mode: 'json' })
      .set(other.auth);
    expect(res.status).toBe(404);
  });

  it('needs a session', async () => {
    expect((await http().get('/api/v1/me/kyc').set({ 'X-MyTask-Client': 'ios' })).status).toBe(401);
  });
});

describe('getMyKyc (AC-37, AC-38)', () => {
  it('is "none" with canSubmit before the first verification', async () => {
    const { auth } = await member();
    const res = await overview(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'none', verification: null, canSubmit: true });
  });
});

describe('staff KYC queue (spec 16 AC-19, AC-27, AC-31)', () => {
  it('lists pending verifications oldest first with the total and the owner summary; filters', async () => {
    const a = await submitted();
    const b = await submitted('passport');
    const res = await admin('?limit=100');
    expect(res.status).toBe(200);
    const ids = (res.body.data as { verification: { id: string } }[]).map((d) => d.verification.id);
    expect(ids.indexOf(a.kycId)).toBeLessThan(ids.indexOf(b.kycId));
    expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
    const item = res.body.data.find(
      (d: { verification: { id: string } }) => d.verification.id === a.kycId,
    );
    expect(item.owner).toMatchObject({
      user: { id: a.userId, isIdVerified: false },
      kycStatus: 'pending',
      earlierRejectionCount: 0,
    });
    expect(item.reviewedBy).toBeNull();
    const byUser = await admin(`?userId=${b.userId}&documentType=passport`);
    expect(byUser.body.data).toHaveLength(1);
    expect(byUser.body.totalCount).toBe(1);
    expect((await admin(`?userId=${b.userId}&documentType=national_id`)).body.data).toHaveLength(0);
    const detail = await admin(`/${a.kycId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.verification.frontFile.fileId).toBe(a.body.frontFileId);
    expect((await admin('/0190a000-0000-7000-8000-000000000000')).status).toBe(404);
  });

  it('needs kyc.review', async () => {
    const other = await makeStaff(app, ['portfolio.moderate']);
    const res = await admin('', other.auth);
    expect(res.status).toBe(403);
    expect(res.body.details.permission).toBe('kyc.review');
    const user = await member();
    expect([401, 403]).toContain((await admin('', user.auth)).status);
  });

  it('approve: verified, ID-verified badge, EV-17, audit; the second decision gets 409', async () => {
    const s = await submitted();
    const res = await decide(s.kycId, 'approve', { note: ' looks fine ' });
    expect(res.status).toBe(200);
    expect(res.body.verification.status).toBe('verified');
    expect(res.body.verification.reviewedAt).not.toBeNull();
    expect(res.body.reviewedBy.id).toBe(reviewer.id);
    expect(res.body.owner.user.isIdVerified).toBe(true);
    expect((await app.get(UserSummaries).one(s.userId)).isIdVerified).toBe(true);
    const ev = await events(s.kycId, 'EV-17');
    expect(ev).toHaveLength(1);
    expect(ev[0]!.payload).toMatchObject({ userId: s.userId });
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'kyc.approve', targetId: s.kycId },
    });
    expect(audit).toMatchObject({
      actorStaffId: reviewer.id,
      permissionCode: 'kyc.review',
      targetType: 'kyc_verification',
      reason: 'looks fine',
      after: { userId: s.userId, status: 'verified' },
    });
    const again = await decide(s.kycId, 'decline', { reason: 'Blurry' });
    expect(again.status).toBe(409);
    expect(again.body).toMatchObject({
      code: 'STATE_CONFLICT',
      details: { currentState: 'verified' },
    });
    expect((await overview(s.auth)).body).toMatchObject({ status: 'verified', canSubmit: false });
  });

  it('decline: reason required, shown to the user, EV-18; the user sends again (EC-8)', async () => {
    const s = await submitted();
    expect((await decide(s.kycId, 'decline', { reason: '   ' })).status).toBe(400);
    const res = await decide(s.kycId, 'decline', { reason: ' Photo is blurry ' });
    expect(res.status).toBe(200);
    expect(res.body.verification).toMatchObject({
      status: 'declined',
      declineReason: 'Photo is blurry',
    });
    expect(res.body.owner.earlierRejectionCount).toBe(1);
    const ev = await events(s.kycId, 'EV-18');
    expect(ev[0]!.payload).toMatchObject({
      userId: s.userId,
      params: { reason: 'Photo is blurry' },
    });
    expect(
      await prisma.auditLog.count({ where: { action: 'kyc.decline', targetId: s.kycId } }),
    ).toBe(1);
    const state = await overview(s.auth);
    expect(state.body).toMatchObject({
      status: 'declined',
      canSubmit: true,
      verification: { declineReason: 'Photo is blurry' },
    });
    // The declined photos stay with the declined verification; a new submit needs new photos.
    const reused = await submit(s.auth, s.body);
    expect(reused.status).toBe(422);
    const again = await submit(s.auth, await kycBody(s.auth));
    expect(again.status).toBe(201);
    expect((await overview(s.auth)).body).toMatchObject({ status: 'pending', canSubmit: false });
  });

  it('file download: signed 2-minute link of a file of this verification, audited; others 404', async () => {
    const s = await submitted();
    const json = await admin(`/${s.kycId}/files/${s.body.backFileId}/download?mode=json`);
    expect(json.status).toBe(200);
    expect(json.headers['cache-control']).toBe('no-store');
    expect(json.body.url).toContain(`/kyc/kyc/${s.body.backFileId}.jpg`);
    const ttl = Date.parse(json.body.expiresAt as string) - Date.now();
    expect(ttl).toBeGreaterThan(60_000);
    expect(ttl).toBeLessThanOrEqual(120_000);
    const redirect = await admin(`/${s.kycId}/files/${s.body.backFileId}/download`);
    expect(redirect.status).toBe(302);
    expect(redirect.headers.location).toBe(json.body.url);
    const audits = await prisma.auditLog.findMany({
      where: { action: 'kyc.file_view', targetId: s.kycId },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]).toMatchObject({
      actorStaffId: reviewer.id,
      permissionCode: 'kyc.review',
      after: { userId: s.userId, fileId: s.body.backFileId },
    });

    const other = await submitted();
    const foreign = await admin(`/${s.kycId}/files/${other.body.frontFileId}/download?mode=json`);
    expect(foreign.status).toBe(404);
    const noPermission = await makeStaff(app, ['portfolio.moderate']);
    const denied = await admin(
      `/${s.kycId}/files/${s.body.frontFileId}/download?mode=json`,
      noPermission.auth,
    );
    expect(denied.status).toBe(403);
    expect(
      await prisma.auditLog.count({ where: { action: 'kyc.file_view', targetId: s.kycId } }),
    ).toBe(2);
  });
});

describe('KYC emails (EV-16, EV-17, EV-18)', () => {
  const base = {
    locale: 'en' as const,
    username: 'nino',
    email: 'nino@example.com',
    appUrl: 'https://mytask.ge',
    adminUrl: 'https://admin.mytask.ge',
    params: {},
  };

  it('renders the admin, approved and declined emails with the legacy texts', () => {
    const pending = renderEmail({ ...base, event: 'EV-16' });
    expect(pending.subject).toBe('You have a pending verification id');
    expect(pending.text).toContain('A user has submitted documents for id verification');
    expect(pending.text).toContain('https://admin.mytask.ge/kyc');
    const approved = renderEmail({ ...base, event: 'EV-17' });
    expect(approved.subject).toBe('Your verification has approved');
    expect(approved.text).toContain('https://mytask.ge/en/account/verification');
    const declined = renderEmail({ ...base, locale: 'ka', event: 'EV-18' });
    expect(declined.subject).toBe('თქვენი ვერიფიკაცია უარყოფილია');
    expect(declined.text).toContain('https://mytask.ge/account/verification');
  });
});
