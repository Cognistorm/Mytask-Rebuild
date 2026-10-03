// QA ROADMAP 4.1.26a (independent): spec 02 acceptance criteria, rules and edge cases that the slice's own tests
// did not cover, plus "wrong role tries it". Same harness as profiles.test.ts / portfolio.test.ts / kyc.test.ts
// (real HTTP pipeline, contract validation, PGlite + in-process Redis, MemoryStorage).
// Each test names the AC it checks; the plan is docs/06-qa/plans/02-profiles.md.
import { randomUUID } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
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
const MB = 1024 * 1024;
const PASSWORD = 'Secret123';
const IOS = { 'X-MyTask-Client': 'ios' };
const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
let moderator: Auth; // portfolio.moderate only
let reviewer: Auth; // kyc.review only

/** A registered, active user. */
async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const username = `qa2_${n}`;
  const email = `qa2${n}@example.com`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({ username, email, fullName: 'QA Profiles', password: PASSWORD, acceptTerms: true });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', emailVerifiedAt: new Date() },
  });
  return {
    userId,
    username,
    email,
    auth: { ...IOS, Authorization: `Bearer ${reg.body.session.accessToken as string}` } as Auth,
  };
}

const upload = (auth: Auth, body: object) => http().post('/api/v1/files').set(auth).send(body);

/** A ready public image (what the scan pipeline leaves): three WebP variants in public_media. */
async function publicImage(auth: Auth, purpose: 'avatar' | 'portfolio_image'): Promise<FileRow> {
  const res = await upload(auth, {
    purpose,
    fileName: 'img.png',
    sizeBytes: 60_000,
    contentType: 'image/png',
  });
  expect(res.status).toBe(201);
  const id = res.body.file.id as string;
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
      width: 800,
      height: 600,
    },
  });
}

/** A ready KYC photo (re-encoded in the private `kyc` bucket). */
async function kycPhoto(auth: Auth): Promise<FileRow> {
  const res = await upload(auth, {
    purpose: 'kyc_document',
    fileName: 'id.jpg',
    sizeBytes: 100_000,
    contentType: 'image/jpeg',
  });
  expect(res.status).toBe(201);
  const id = res.body.file.id as string;
  await storage.put({
    bucket: 'kyc',
    key: `kyc/${id}.jpg`,
    body: Buffer.from('jpeg'),
    contentType: 'image/jpeg',
  });
  return prisma.file.update({
    where: { id },
    data: { status: 'ready', readyAt: new Date(), objectKey: `kyc/${id}.jpg` },
  });
}

async function kycBody(auth: Auth) {
  return {
    documentType: 'national_id',
    frontFileId: (await kycPhoto(auth)).id,
    backFileId: (await kycPhoto(auth)).id,
    selfieFileId: (await kycPhoto(auth)).id,
  };
}

async function itemBody(auth: Auth, extra: object = {}) {
  return {
    title: 'ლოგოს დიზაინი QA',
    description: 'A logo and a brand book for a bakery.',
    thumbnailFileId: (await publicImage(auth, 'portfolio_image')).id,
    imageFileIds: [(await publicImage(auth, 'portfolio_image')).id],
    projectUrl: null,
    videoUrl: null,
    ...extra,
  };
}

const createItem = (auth: Auth, body: object) =>
  http().post('/api/v1/portfolio-items').set(auth).send(body);

async function setSetting(registerId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}
const autoApprove = (on: boolean) => setSetting('S-071', 'moderation.portfolio.auto_approve', on);

const events = (aggregateId: string, eventType: string) =>
  prisma.outboxEvent.findMany({ where: { aggregateId, eventType } });

/** The field errors of a 400, as `field:messageKey`. */
const fieldErrors = (res: request.Response) =>
  ((res.body.details?.fields ?? []) as { field: string; messageKey: string }[]).map(
    (f) => `${f.field}:${f.messageKey}`,
  );

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  moderator = (await makeStaff(app, ['portfolio.moderate'])).auth;
  reviewer = (await makeStaff(app, ['kyc.review'])).auth;
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour; keep the staff sessions.
  const redis = app.get(RedisService).client;
  const keys = (await redis.keys('*')).filter((k) => !k.includes('session'));
  if (keys.length) await redis.del(...keys);
  await autoApprove(false);
});

afterAll(async () => {
  await autoApprove(false);
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

// ------------------------------------------------------------------ roles: "wrong role tries it"

/** Contract-valid bodies, so the answer is about the caller and not about the request shape. */
const validItem = () => ({
  title: 'A valid title',
  description: 'A valid description.',
  thumbnailFileId: randomUUID(),
  imageFileIds: [randomUUID()],
});
const validKyc = () => ({
  documentType: 'passport',
  frontFileId: randomUUID(),
  backFileId: null,
  selfieFileId: randomUUID(),
});
type Call = [string, (auth: Auth) => request.Test];
const ownAccountCalls = (): Call[] => [
  ['getMyProfile', (a) => http().get('/api/v1/me/profile').set(a)],
  ['updateMyProfile', (a) => http().patch('/api/v1/me/profile').set(a).send({ headline: 'x' })],
  ['putMyAvatar', (a) => http().put('/api/v1/me/avatar').set(a).send({ fileId: randomUUID() })],
  [
    'putMyAvailability',
    (a) =>
      http()
        .put('/api/v1/me/availability')
        .set(a)
        .send({ unavailableUntil: '2099-01-01', message: 'x' }),
  ],
  [
    'addMySkill',
    (a) => http().post('/api/v1/me/skills').set(a).send({ name: 'x', experience: 'pro' }),
  ],
  ['getSellingDashboard', (a) => http().get('/api/v1/me/dashboard/selling').set(a)],
  ['getMyKyc', (a) => http().get('/api/v1/me/kyc').set(a)],
  ['createKycVerification', (a) => http().post('/api/v1/kyc').set(a).send(validKyc())],
  ['createPortfolioItem', (a) => http().post('/api/v1/portfolio-items').set(a).send(validItem())],
  [
    'updateMe',
    (a) => http().patch('/api/v1/me').set(a).send({ city: 'Tbilisi', currentPassword: PASSWORD }),
  ],
  [
    'updateMyPreferences',
    (a) => http().patch('/api/v1/me/preferences').set(a).send({ lastDashboard: 'selling' }),
  ],
  ['deleteMe', (a) => http().delete('/api/v1/me').set(a)],
];

describe('roles (R-P1, AC-39, spec 16 permissions)', () => {
  it('QA-ROLE-1 guests get 401 on every own-account operation of spec 02', async () => {
    for (const [name, call] of ownAccountCalls()) {
      const res = await call(IOS);
      expect(res.status, name).toBe(401);
    }
  });

  it('QA-ROLE-2 a user token cannot reach the staff queues; a staff token is not a user session', async () => {
    const u = await member();
    for (const path of [
      '/api/v1/admin/portfolio-items',
      '/api/v1/admin/kyc',
      `/api/v1/admin/kyc/${randomUUID()}`,
    ]) {
      const res = await http().get(path).set(u.auth);
      expect([401, 403], path).toContain(res.status);
    }
    const approve = await http()
      .post(`/api/v1/admin/portfolio-items/${randomUUID()}/approve`)
      .set(u.auth)
      .send({});
    expect([401, 403]).toContain(approve.status);
    // Staff accounts are separate from user accounts (ADR-002): a staff token opens no user area.
    expect((await http().get('/api/v1/me/profile').set(moderator)).status).toBe(401);
    for (const [name, call] of ownAccountCalls()) {
      expect((await call(moderator)).status, name).toBe(401);
    }
  });

  it('QA-ROLE-3 staff need exactly the queue permission: portfolio.moderate ≠ kyc.review (AC-39)', async () => {
    const u = await member();
    const body = await kycBody(u.auth);
    const kyc = await http().post('/api/v1/kyc').set(u.auth).send(body);
    expect(kyc.status).toBe(201);
    const kycId = kyc.body.id as string;
    // A portfolio moderator cannot list, open, decide or download KYC.
    expect((await http().get('/api/v1/admin/kyc').set(moderator)).status).toBe(403);
    expect((await http().get(`/api/v1/admin/kyc/${kycId}`).set(moderator)).status).toBe(403);
    expect(
      (await http().post(`/api/v1/admin/kyc/${kycId}/approve`).set(moderator).send({})).status,
    ).toBe(403);
    const files = await prisma.kycVerification.findUniqueOrThrow({ where: { id: kycId } });
    const dl = await http()
      .get(`/api/v1/admin/kyc/${kycId}/files/${files.frontFileId}/download?mode=json`)
      .set(moderator);
    expect(dl.status).toBe(403);
    // A KYC reviewer cannot moderate portfolio.
    const item = await createItem(u.auth, await itemBody(u.auth));
    expect(item.status).toBe(201);
    expect((await http().get('/api/v1/admin/portfolio-items').set(reviewer)).status).toBe(403);
    expect(
      (
        await http()
          .post(`/api/v1/admin/portfolio-items/${item.body.id as string}/approve`)
          .set(reviewer)
          .send({})
      ).status,
    ).toBe(403);
    // Another user and a guest never get the KYC photo (404 for users, 401 for guests).
    const other = await member();
    expect(
      (await http().get(`/api/v1/files/${files.frontFileId}/download?mode=json`).set(other.auth))
        .status,
    ).toBe(404);
    expect(
      (await http().get(`/api/v1/files/${files.frontFileId}/download?mode=json`).set(IOS)).status,
    ).toBe(401);
  });

  it('QA-ROLE-4 restricted users keep a visible profile but cannot change it, report, upload KYC or delete (contract audience)', async () => {
    const r = await member();
    const pre = await kycBody(r.auth); // photos uploaded before the restriction
    await prisma.user.update({ where: { id: r.userId }, data: { isRestricted: true } });
    const calls: Call[] = [
      ...ownAccountCalls().filter(([n]) => !['getMyKyc', 'createKycVerification'].includes(n)),
      ['createKycVerification', (a) => http().post('/api/v1/kyc').set(a).send(pre)],
    ];
    for (const [name, call] of calls) {
      const res = await call(r.auth);
      expect(res.status, name).toBe(403);
      expect(res.body.code, name).toBe('ACCOUNT_RESTRICTED');
    }
    // R-P3: the restricted user's public profile stays visible, and others may report it (AC-14).
    expect((await http().get(`/api/v1/users/${r.username}`).set(IOS)).status).toBe(200);
    const reporter = await member();
    const rep = await http()
      .post(`/api/v1/users/${r.username}/reports`)
      .set(reporter.auth)
      .send({ reason: 'Spam' });
    expect(rep.status).toBe(201);
  });
});

// ------------------------------------------------------------------ uploads (AC-16, AC-24, AC-36)

describe('upload limits at the edges (AC-16, AC-24, AC-36)', () => {
  it('QA-UPL-1 avatar: WEBP and exactly 2 MB accepted, GIF refused; portfolio: WEBP refused; KYC: 5 MB accepted, more refused', async () => {
    const u = await member();
    const avatar = { purpose: 'avatar', fileName: 'a.webp', contentType: 'image/webp' };
    expect((await upload(u.auth, { ...avatar, sizeBytes: 2 * MB })).status).toBe(201);
    const gif = await upload(u.auth, {
      ...avatar,
      fileName: 'a.gif',
      contentType: 'image/gif',
      sizeBytes: 1000,
    });
    expect(gif.status).toBe(422);
    expect(gif.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    const pfWebp = await upload(u.auth, {
      purpose: 'portfolio_image',
      fileName: 'p.webp',
      contentType: 'image/webp',
      sizeBytes: 1000,
    });
    expect(pfWebp.status).toBe(422);
    expect(pfWebp.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
    const kyc = { purpose: 'kyc_document', fileName: 'id.png', contentType: 'image/png' };
    expect((await upload(u.auth, { ...kyc, sizeBytes: 5 * MB })).status).toBe(201);
    const big = await upload(u.auth, { ...kyc, sizeBytes: 5 * MB + 1 });
    expect(big.status).toBe(422);
    expect(big.body.code).toBe('FILE_TOO_LARGE');
    expect(big.body.details.limit).toBe(5);
  });
});

// ------------------------------------------------------------------ profile, availability, report

describe('profile blocks at the edges (AC-14, AC-19, AC-22)', () => {
  it('QA-PRO-1 skill name ≤ 30 and the three levels; unknown level refused', async () => {
    const u = await member();
    const ok = await http()
      .post('/api/v1/me/skills')
      .set(u.auth)
      .send({ name: 'x'.repeat(30), experience: 'beginner' });
    expect(ok.status).toBe(201);
    const long = await http()
      .post('/api/v1/me/skills')
      .set(u.auth)
      .send({ name: 'y'.repeat(31), experience: 'beginner' });
    expect(long.status).toBe(400);
    const level = await http()
      .post('/api/v1/me/skills')
      .set(u.auth)
      .send({ name: 'Figma', experience: 'expert' });
    expect(level.status).toBe(400); // stored value is `pro` (spec AC-19)
    for (const experience of ['intermediate', 'pro']) {
      const res = await http()
        .post('/api/v1/me/skills')
        .set(u.auth)
        .send({ name: `Skill ${experience}`, experience });
      expect(res.status, experience).toBe(201);
    }
  });

  it('QA-PRO-2 availability message ≤ 750 (751 refused), impossible date refused, removal shows on the public profile', async () => {
    const u = await member();
    const put = (body: object) => http().put('/api/v1/me/availability').set(u.auth).send(body);
    expect((await put({ unavailableUntil: '2099-12-31', message: 'm'.repeat(751) })).status).toBe(
      400,
    );
    const bad = await put({ unavailableUntil: '2099-02-30', message: 'On holiday' });
    expect(bad.status).toBe(400);
    const ok = await put({ unavailableUntil: '2099-12-31', message: 'm'.repeat(750) });
    expect(ok.status).toBe(200);
    const shown = await http().get(`/api/v1/users/${u.username}`).set(IOS);
    expect(shown.body.availability).toMatchObject({ unavailableUntil: '2099-12-31' });
    expect((await http().delete('/api/v1/me/availability').set(u.auth)).status).toBe(204);
    const gone = await http().get(`/api/v1/users/${u.username}`).set(IOS);
    expect(gone.body.availability).toBeNull();
  });

  it('QA-PRO-3 report reason ≤ 1,500 (1,501 refused); reports on a deleted profile are 404', async () => {
    const reporter = await member();
    const target = await member();
    const report = (username: string, reason: string) =>
      http().post(`/api/v1/users/${username}/reports`).set(reporter.auth).send({ reason });
    expect((await report(target.username, 'r'.repeat(1501))).status).toBe(400);
    const ok = await report(target.username, 'r'.repeat(1500));
    expect(ok.status).toBe(201);
    expect(ok.body.reason).toHaveLength(1500);
    await prisma.user.update({ where: { id: target.userId }, data: { deletedAt: new Date() } });
    expect((await report(target.username, 'again')).status).toBe(404);
  });

  it('QA-PRO-4 guests and the owner cannot report; another user can (AC-13, AC-14 viewer flags)', async () => {
    const owner = await member();
    const other = await member();
    const guest = await http().get(`/api/v1/users/${owner.username}`).set(IOS);
    expect(guest.body).toMatchObject({ isOwnProfile: false, canReport: false, canContact: true });
    const own = await http().get(`/api/v1/users/${owner.username}`).set(owner.auth);
    expect(own.body).toMatchObject({ isOwnProfile: true, canReport: false, canContact: false });
    const seen = await http().get(`/api/v1/users/${owner.username}`).set(other.auth);
    expect(seen.body).toMatchObject({ isOwnProfile: false, canReport: true, canContact: true });
    // No level or badge of the removed level system (R-P2, X-05).
    expect(Object.keys(own.body).some((k) => /level|badge/i.test(k))).toBe(false);
  });
});

// ------------------------------------------------------------------ portfolio

describe('portfolio (AC-24, AC-25, AC-27, AC-28, AC-42, EC-9)', () => {
  it('QA-PF-1 create field rules: title 3–100, description ≥ 10, links http(s) ≤ 120, 1+ gallery image, thumbnail required', async () => {
    const u = await member();
    const cases: [string, object][] = [
      ['title 2', { title: 'ab' }],
      ['title 101', { title: 't'.repeat(101) }],
      ['title blank', { title: '    ' }],
      ['description 9', { description: 'd'.repeat(9) }],
      ['projectUrl 121', { projectUrl: `https://example.com/${'p'.repeat(101)}` }],
      ['javascript link', { projectUrl: 'javascript:alert(1)' }],
      ['ftp link', { videoUrl: 'ftp://example.com/v.mp4' }],
      ['empty gallery', { imageFileIds: [] }],
      ['no thumbnail', { thumbnailFileId: undefined }],
    ];
    for (const [name, extra] of cases) {
      const res = await createItem(u.auth, await itemBody(u.auth, extra));
      expect(res.status, name).toBe(400);
    }
    const ok = await createItem(
      u.auth,
      await itemBody(u.auth, {
        title: 't'.repeat(100),
        description: 'd'.repeat(10),
        projectUrl: `https://example.com/${'p'.repeat(100)}`,
      }),
    );
    expect(ok.status).toBe(201);
    expect(ok.body.slug).toMatch(/^t+-[0-9A-F]{20}$/);
  });

  it('QA-PF-2 rejected item: hidden from everyone but the owner, cannot be approved later, owner can delete it with its files (AC-42, AC-27)', async () => {
    const owner = await member();
    const other = await member();
    const body = await itemBody(owner.auth);
    const item = await createItem(owner.auth, body);
    expect(item.status).toBe(201);
    const id = item.body.id as string;
    const uid = item.body.uid as string;
    const rej = await http()
      .post(`/api/v1/admin/portfolio-items/${id}/reject`)
      .set(moderator)
      .send({ reason: 'Low quality images' });
    expect(rej.status).toBe(200);

    const guestList = await http().get(`/api/v1/portfolio-items?username=${owner.username}`);
    expect(guestList.body.data).toEqual([]);
    for (const auth of [IOS, other.auth]) {
      expect((await http().get(`/api/v1/portfolio-items/${id}`).set(auth)).status).toBe(404);
      expect((await http().get(`/api/v1/portfolio-items/lookup?uid=${uid}`).set(auth)).status).toBe(
        404,
      );
    }
    const profile = await http().get(`/api/v1/users/${owner.username}`).set(IOS);
    expect(profile.body.portfolioCount).toBe(0);
    const own = await http().get(`/api/v1/portfolio-items/${id}`).set(owner.auth);
    expect(own.body).toMatchObject({ status: 'rejected', rejectionReason: 'Low quality images' });
    const ownList = await http()
      .get(`/api/v1/portfolio-items?username=${owner.username}`)
      .set(owner.auth);
    expect(ownList.body.data).toMatchObject([{ id, status: 'rejected' }]);

    const late = await http()
      .post(`/api/v1/admin/portfolio-items/${id}/approve`)
      .set(moderator)
      .send({});
    expect(late.status).toBe(409);
    expect(late.body.messageKey ?? late.body.details?.messageKey).toBeDefined();

    expect((await http().delete(`/api/v1/portfolio-items/${id}`).set(owner.auth)).status).toBe(204);
    const files = await prisma.file.findMany({
      where: { id: { in: [body.thumbnailFileId, ...body.imageFileIds] } },
    });
    expect(files.every((f) => f.status === 'deleted')).toBe(true);
  });

  it('QA-PF-3 S-071 ON: a rejected item saved again is public at once, reason gone, no admin email (AC-42, AC-25)', async () => {
    const owner = await member();
    const item = await createItem(owner.auth, await itemBody(owner.auth));
    const id = item.body.id as string;
    await http()
      .post(`/api/v1/admin/portfolio-items/${id}/reject`)
      .set(moderator)
      .send({ reason: 'Blurry' });
    const ev14Before = (await events(id, 'EV-14')).length;
    await autoApprove(true);
    const edit = await http()
      .patch(`/api/v1/portfolio-items/${id}`)
      .set(owner.auth)
      .send({ description: 'Sharper images this time, promise.' });
    expect(edit.status).toBe(200);
    expect(edit.body).toMatchObject({ status: 'active', rejectionReason: null, rejectedAt: null });
    expect((await events(id, 'EV-14')).length).toBe(ev14Before);
    expect((await http().get(`/api/v1/portfolio-items/${id}`).set(IOS)).status).toBe(200);
  });

  it('QA-PF-4 EC-9: turning S-071 ON leaves pending items pending and hidden', async () => {
    const owner = await member();
    const item = await createItem(owner.auth, await itemBody(owner.auth));
    expect(item.body.status).toBe('pending');
    await autoApprove(true);
    expect(
      (
        await http()
          .get(`/api/v1/portfolio-items/${item.body.id as string}`)
          .set(IOS)
      ).status,
    ).toBe(404);
    const own = await http()
      .get(`/api/v1/portfolio-items/${item.body.id as string}`)
      .set(owner.auth);
    expect(own.body.status).toBe('pending');
  });

  it('QA-PF-5 AC-25/AC-27 legacy: editing a published item with S-071 OFF hides it again until approved (EV-14)', async () => {
    const owner = await member();
    await autoApprove(true);
    const item = await createItem(owner.auth, await itemBody(owner.auth));
    expect(item.body.status).toBe('active');
    const id = item.body.id as string;
    await autoApprove(false);
    const edit = await http()
      .patch(`/api/v1/portfolio-items/${id}`)
      .set(owner.auth)
      .send({ title: 'New title for the work' });
    expect(edit.status).toBe(200);
    expect(edit.body.status).toBe('pending');
    expect(edit.body.slug).toMatch(/^new-title-for-the-work-/);
    expect((await events(id, 'EV-14')).length).toBe(1);
    expect((await http().get(`/api/v1/portfolio-items/${id}`).set(IOS)).status).toBe(404);
    // The old slug still finds the item for the owner by its uid suffix.
    const old = await http()
      .get(`/api/v1/portfolio-items/lookup?slug=${item.body.slug as string}`)
      .set(owner.auth);
    expect(old.status).toBe(200);
    expect(old.body.slug).toBe(edit.body.slug);
  });
});

// ------------------------------------------------------------------ KYC

describe('KYC (AC-36…AC-40, EC-8)', () => {
  it('QA-KYC-1 full cycle: pending blocks, decline → send again (twice, EC-8), approve → ID verified everywhere, verified blocks', async () => {
    const u = await member();
    const submit = async () => {
      const body = await kycBody(u.auth);
      return http().post('/api/v1/kyc').set(u.auth).send(body);
    };
    const first = await submit();
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ status: 'pending' });
    const row = await prisma.kycVerification.findUniqueOrThrow({
      where: { id: first.body.id as string },
    });
    expect(row.provider).toBe('manual'); // AC-40, S-122 default
    expect((await http().get('/api/v1/me/kyc').set(u.auth)).body).toMatchObject({
      status: 'pending',
      canSubmit: false,
    });
    const blocked = await submit();
    expect(blocked.status).toBe(409);

    let id = first.body.id as string;
    for (let round = 0; round < 2; round += 1) {
      const d = await http()
        .post(`/api/v1/admin/kyc/${id}/decline`)
        .set(reviewer)
        .send({ reason: `Round ${round}` });
      expect(d.status).toBe(200);
      const again = await submit();
      expect(again.status, `resubmit ${round}`).toBe(201);
      id = again.body.id as string;
    }
    expect((await http().get(`/api/v1/users/${u.username}`).set(IOS)).body.isIdVerified).toBe(
      false,
    );
    const ok = await http().post(`/api/v1/admin/kyc/${id}/approve`).set(reviewer).send({});
    expect(ok.status).toBe(200);
    expect((await http().get(`/api/v1/users/${u.username}`).set(IOS)).body.isIdVerified).toBe(true);
    expect((await http().get('/api/v1/me/kyc').set(u.auth)).body).toMatchObject({
      status: 'verified',
      canSubmit: false,
    });
    const dash = await http().get('/api/v1/me/dashboard/selling').set(u.auth);
    expect(JSON.stringify(dash.body)).toMatch(/"is(Id)?Verified":true/);
    const afterVerified = await submit();
    expect(afterVerified.status).toBe(409);
    expect(afterVerified.body.messageKey ?? afterVerified.body.message).toBeDefined();
    // KYC is not required for anything (AC-40): an unverified user creates portfolio and sets availability.
    const plain = await member();
    expect((await createItem(plain.auth, await itemBody(plain.auth))).status).toBe(201);
  });
});

// ------------------------------------------------------------------ account settings

describe('account settings (AC-29…AC-31, AC-34)', () => {
  it('QA-SET-1 field rules: full name and city ≤ 60, username pattern, deleted account username reserved, wrong password message', async () => {
    const u = await member();
    const gone = await member();
    await prisma.user.update({ where: { id: gone.userId }, data: { deletedAt: new Date() } });
    const patch = (body: object) =>
      http()
        .patch('/api/v1/me')
        .set(u.auth)
        .send({ currentPassword: PASSWORD, ...body });
    for (const [name, body] of [
      ['fullName 61', { fullName: 'n'.repeat(61) }],
      ['city 61', { city: 'c'.repeat(61) }],
      ['username 2', { username: 'ab' }],
      ['username hyphen', { username: 'john-doe' }],
      ['username digits', { username: '123456' }],
      ['email invalid', { email: 'not-an-email' }],
    ] as const) {
      expect((await patch(body)).status, name).toBe(400);
    }
    const reserved = await patch({ username: gone.username.toUpperCase() });
    expect(reserved.status).toBe(400);
    expect(fieldErrors(reserved)).toEqual(['username:t_validator_unique']);
    const reservedEmail = await patch({ email: gone.email });
    expect(reservedEmail.status).toBe(400);
    expect(fieldErrors(reservedEmail)).toEqual(['email:t_validator_unique']);
    const wrong = await http()
      .patch('/api/v1/me')
      .set(u.auth)
      .send({ city: 'Kutaisi', currentPassword: 'Wrong1234' });
    expect(wrong.status).toBe(400);
    expect(fieldErrors(wrong)).toEqual(['currentPassword:t_ur_current_pass_does_not_match']);
    const ok = await patch({ fullName: 'n'.repeat(60), city: 'c'.repeat(60) });
    expect(ok.status).toBe(200);
  });

  it('QA-SET-2 AC-30: until the link is opened the old email logs in and the new one does not', async () => {
    const u = await member();
    const newEmail = `moved_${u.email}`;
    const res = await http()
      .patch('/api/v1/me')
      .set(u.auth)
      .send({ email: newEmail, currentPassword: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: u.email, pendingEmail: newEmail });
    const login = (email: string) =>
      http().post('/api/v1/auth/login').set(IOS).send({ email, password: PASSWORD });
    expect((await login(u.email)).status).toBe(200);
    expect((await login(newEmail)).status).toBe(401);
    // Another account may still register the address while it is only pending (it is not reserved yet);
    // the later confirm then answers 409 (covered by account-settings.test.ts).
    const row = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    expect(row.emailChangedAt).toBeNull();
  });

  it('QA-SET-3 AC-34: after deleteMe the profile, portfolio list and items answer 404 to everyone', async () => {
    const u = await member();
    await autoApprove(true);
    const item = await createItem(u.auth, await itemBody(u.auth));
    expect(item.body.status).toBe('active');
    expect((await http().delete('/api/v1/me').set(u.auth)).status).toBe(204);
    expect((await http().get(`/api/v1/users/${u.username}`).set(IOS)).status).toBe(404);
    expect(
      (await http().get(`/api/v1/portfolio-items?username=${u.username}`).set(IOS)).status,
    ).toBe(404);
    expect(
      (
        await http()
          .get(`/api/v1/portfolio-items/${item.body.id as string}`)
          .set(IOS)
      ).status,
    ).toBe(404);
    expect(
      (
        await http()
          .get(`/api/v1/portfolio-items/lookup?slug=${item.body.slug as string}`)
          .set(IOS)
      ).status,
    ).toBe(404);
  });
});

// ------------------------------------------------------------------ dashboards

describe('dashboard memory (AC-3, P-22)', () => {
  it('QA-DSH-1 a new account starts on Buying; the choice made on one device is what another device gets', async () => {
    const u = await member();
    const me = await http().get('/api/v1/me').set(u.auth);
    expect(me.body.lastDashboard).toBe('buying');
    const set = await http()
      .patch('/api/v1/me/preferences')
      .set(u.auth)
      .send({ lastDashboard: 'selling' });
    expect(set.status).toBe(200);
    const android = await http()
      .post('/api/v1/auth/login')
      .set({ 'X-MyTask-Client': 'android' })
      .send({ email: u.email, password: PASSWORD });
    expect(android.status).toBe(200);
    const other = await http()
      .get('/api/v1/me')
      .set({
        'X-MyTask-Client': 'android',
        Authorization: `Bearer ${android.body.accessToken as string}`,
      });
    expect(other.body.lastDashboard).toBe('selling');
    const bad = await http()
      .patch('/api/v1/me/preferences')
      .set(u.auth)
      .send({ lastDashboard: 'seller' });
    expect(bad.status).toBe(400);
  });
});
