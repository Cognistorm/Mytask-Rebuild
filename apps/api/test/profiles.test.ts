// Profiles (ROADMAP 4.1.8a/b; spec 02 AC-8…AC-10, AC-13…AC-18, R-P3, R-P4, EC-4): getMyProfile,
// updateMyProfile, putMyAvatar, deleteMyAvatar, the public getUserProfile with neutral values for the data of
// later slices, online status (presence) and createUserReport (EV-13). Object storage is MemoryStorage.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
import { RedisService } from '../src/platform/redis/redis.module';
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

/** A registered, active user. */
async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const username = `pr_${n}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username,
      email: `pr${n}@example.com`,
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
    username,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

const avatarBody = {
  purpose: 'avatar',
  fileName: 'me.png',
  sizeBytes: 50_000,
  contentType: 'image/png',
};

/** Upload slot; `ready` = what the scan pipeline (4.1.4) leaves for a public image. */
async function avatarFile(auth: Auth, ready = true, body: object = avatarBody): Promise<FileRow> {
  const res = await http().post('/api/v1/files').set(auth).send(body);
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
      width: 400,
      height: 400,
    },
  });
}

const S123_KEY = 'profile.linked_accounts.enabled';
async function setS123(value: boolean) {
  await prisma.setting.upsert({
    where: { key: S123_KEY },
    create: { key: S123_KEY, registerId: 'S-123', value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}

const profile = (username: string, auth: Auth = {}) =>
  http().get(`/api/v1/users/${username}`).set(auth);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour.
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await app?.close();
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('getMyProfile / updateMyProfile (AC-15, AC-17, AC-18, EC-7)', () => {
  it('returns the empty edit form of a new user', async () => {
    const { auth } = await member();
    const res = await http().get('/api/v1/me/profile').set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      headline: null,
      about: null,
      avatar: null,
      skills: [],
      languages: [],
      linkedAccounts: {
        facebook: null,
        twitter: null,
        dribbble: null,
        stackoverflow: null,
        github: null,
        youtube: null,
        vimeo: null,
      },
      linkedAccountsEnabled: expect.any(Boolean),
      availability: null,
    });
  });

  it('saves each block on its own and trims it', async () => {
    const { auth } = await member();
    const a = await http().patch('/api/v1/me/profile').set(auth).send({ headline: '  Designer ' });
    expect(a.status).toBe(200);
    expect(a.body.headline).toBe('Designer');
    expect(a.body.about).toBeNull();
    const b = await http().patch('/api/v1/me/profile').set(auth).send({ about: 'I draw logos.' });
    expect(b.body).toMatchObject({ headline: 'Designer', about: 'I draw logos.' });
  });

  it('refuses empty, blank and too long values', async () => {
    const { auth } = await member();
    for (const body of [
      { headline: '' },
      { headline: '   ' },
      { headline: 'x'.repeat(101) },
      { about: 'x'.repeat(1501) },
    ]) {
      const res = await http().patch('/api/v1/me/profile').set(auth).send(body);
      expect(res.status, JSON.stringify(body).slice(0, 30)).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
    const blank = await http().patch('/api/v1/me/profile').set(auth).send({ about: ' \n ' });
    expect(blank.body.details.fields[0]).toMatchObject({
      field: 'about',
      messageKey: 't_validator_required',
    });
    const ok = await http()
      .patch('/api/v1/me/profile')
      .set(auth)
      .send({ headline: 'x'.repeat(100), about: 'y'.repeat(1500) });
    expect(ok.status).toBe(200);
  });

  it('needs a session; restricted users are refused', async () => {
    expect((await http().get('/api/v1/me/profile')).status).toBe(401);
    const { userId, auth } = await member();
    await prisma.user.update({ where: { id: userId }, data: { isRestricted: true } });
    const res = await http().get('/api/v1/me/profile').set(auth);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
  });
});

describe('putMyAvatar / deleteMyAvatar (AC-16)', () => {
  it('sets the avatar, shows it in Me, the edit form and the profile', async () => {
    const { auth, username } = await member();
    const file = await avatarFile(auth);
    const res = await http().put('/api/v1/me/avatar').set(auth).send({ fileId: file.id });
    expect(res.status).toBe(200);
    const avatar = {
      fileId: file.id,
      thumb: `${MEDIA}/images/${file.id}/thumb.webp`,
      medium: `${MEDIA}/images/${file.id}/medium.webp`,
      large: `${MEDIA}/images/${file.id}/large.webp`,
      width: 400,
      height: 400,
    };
    expect(res.body.avatar).toEqual(avatar);
    expect((await http().get('/api/v1/me').set(auth)).body.avatar).toEqual(avatar);
    expect((await http().get('/api/v1/me/profile').set(auth)).body.avatar).toEqual(avatar);
    expect((await profile(username)).body.avatar).toEqual(avatar);
  });

  it('replaces the old avatar and deletes the old file with its variants', async () => {
    const { auth } = await member();
    const first = await avatarFile(auth);
    const second = await avatarFile(auth);
    await http().put('/api/v1/me/avatar').set(auth).send({ fileId: first.id });
    // The same file again changes nothing.
    expect(
      (await http().put('/api/v1/me/avatar').set(auth).send({ fileId: first.id })).status,
    ).toBe(200);
    const res = await http().put('/api/v1/me/avatar').set(auth).send({ fileId: second.id });
    expect(res.status).toBe(200);
    expect(res.body.avatar.fileId).toBe(second.id);
    const old = await prisma.file.findUniqueOrThrow({ where: { id: first.id } });
    expect(old.status).toBe('deleted');
    expect(await storage.head('public_media', `images/${first.id}/thumb.webp`)).toBeNull();
    expect(await storage.head('public_media', `images/${second.id}/thumb.webp`)).not.toBeNull();
  });

  it('keeps the current avatar file from deleteFile (409)', async () => {
    const { auth } = await member();
    const file = await avatarFile(auth);
    await http().put('/api/v1/me/avatar').set(auth).send({ fileId: file.id });
    const res = await http().delete(`/api/v1/files/${file.id}`).set(auth);
    expect(res.status).toBe(409);
  });

  it('removes the avatar (initials are shown) and deletes the file', async () => {
    const { auth } = await member();
    const file = await avatarFile(auth);
    await http().put('/api/v1/me/avatar').set(auth).send({ fileId: file.id });
    expect((await http().delete('/api/v1/me/avatar').set(auth)).status).toBe(204);
    expect((await http().get('/api/v1/me').set(auth)).body.avatar).toBeNull();
    expect((await prisma.file.findUniqueOrThrow({ where: { id: file.id } })).status).toBe(
      'deleted',
    );
    // Without an avatar it is a no-op.
    expect((await http().delete('/api/v1/me/avatar').set(auth)).status).toBe(204);
  });

  it('refuses files that are not ready, of another purpose or of another user', async () => {
    const { auth } = await member();
    const other = await member();
    const pending = await avatarFile(auth, false);
    const notReady = await http().put('/api/v1/me/avatar').set(auth).send({ fileId: pending.id });
    expect(notReady.status).toBe(422);
    expect(notReady.body.code).toBe('FILE_NOT_READY');

    const portfolio = await avatarFile(auth, true, {
      ...avatarBody,
      purpose: 'portfolio_image',
      fileName: 'work.png',
    });
    const othersFile = await avatarFile(other.auth);
    for (const fileId of [portfolio.id, othersFile.id, '01890000-0000-7000-8000-000000000000']) {
      const res = await http().put('/api/v1/me/avatar').set(auth).send({ fileId });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('FILE_PURPOSE_MISMATCH');
    }
  });

  it('refuses SVG avatars at upload (P-24)', async () => {
    const { auth } = await member();
    const res = await http()
      .post('/api/v1/files')
      .set(auth)
      .send({ ...avatarBody, fileName: 'x.svg', contentType: 'image/svg+xml' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
  });
});

describe('getUserProfile (AC-8…AC-10, AC-13, R-P3, EC-4)', () => {
  it('shows a profile to guests with the neutral values of later slices', async () => {
    const { userId, username } = await member();
    // Written directly: an authenticated request would make the user online.
    await prisma.userProfile.update({ where: { userId }, data: { headline: 'Translator' } });
    const res = await profile(username);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: userId,
      username,
      fullName: 'Nino Beridze',
      headline: 'Translator',
      about: null,
      avatar: null,
      countryCode: null,
      timezone: 'Asia/Tbilisi',
      isOnline: false,
      availability: null,
      lastDeliveryAt: null,
      isEmailVerified: true,
      isIdVerified: false,
      isPremium: false,
      languages: [],
      skills: [],
      ratings: {
        asFreelancer: {
          count: 0,
          averageTenths: null,
          starCounts: { five: 0, four: 0, three: 0, two: 0, one: 0 },
        },
        asClient: { count: 0, averageTenths: null },
      },
      portfolioCount: 0,
      isOwnProfile: false,
      canContact: true,
      canRequestOffer: false,
      canReport: false,
      isIndexable: false,
    });
  });

  it('sets the viewer flags for the owner and for another signed-in user (AC-13)', async () => {
    const owner = await member();
    const viewer = await member();
    const own = await profile(owner.username, owner.auth);
    expect(own.body).toMatchObject({ isOwnProfile: true, canContact: false, canReport: false });
    const other = await profile(owner.username, viewer.auth);
    expect(other.body).toMatchObject({ isOwnProfile: false, canContact: true, canReport: true });
    // A broken token is a guest, never 401 on a public page.
    const guest = await profile(owner.username, { Authorization: 'Bearer nonsense' });
    expect(guest.status).toBe(200);
    expect(guest.body.canReport).toBe(false);
  });

  it('answers 404 for pending, banned, deleted and unknown users; restricted stay visible (AC-9, R-P3)', async () => {
    for (const data of [
      { status: 'pending' as const },
      { status: 'banned' as const },
      { deletedAt: new Date() },
    ]) {
      const u = await member();
      await prisma.user.update({ where: { id: u.userId }, data });
      expect((await profile(u.username)).status, JSON.stringify(data)).toBe(404);
    }
    expect((await profile('nobody_here_xyz')).status).toBe(404);
    const r = await member();
    await prisma.user.update({ where: { id: r.userId }, data: { isRestricted: true } });
    expect((await profile(r.username)).status).toBe(200);
    // The restricted owner still sees their own profile as their own.
    expect((await profile(r.username, r.auth)).body.isOwnProfile).toBe(true);
  });

  it('answers 404 for an old username after a rename (EC-4)', async () => {
    const u = await member();
    await prisma.user.update({ where: { id: u.userId }, data: { username: `${u.username}_new` } });
    expect((await profile(u.username)).status).toBe(404);
    expect((await profile(`${u.username}_new`)).status).toBe(200);
  });

  it('shows skills, languages, country, timezone, availability, online, KYC and public portfolio', async () => {
    const u = await member();
    await prisma.userProfile.update({
      where: { userId: u.userId },
      data: {
        countryId: 81,
        timezone: 'Europe/Berlin',
        unavailableUntil: new Date('2099-05-01T12:00:00Z'),
        unavailableMessage: 'On holiday',
      },
    });
    await prisma.userSkill.createMany({
      data: [
        { userId: u.userId, name: 'Logo design', slug: 'logo-design', experience: 'pro' },
        { userId: u.userId, name: 'Figma', slug: 'figma', experience: 'beginner' },
      ],
    });
    await prisma.userLanguage.create({
      data: { userId: u.userId, name: 'Georgian', level: 'native' },
    });
    const doc = await avatarFile(u.auth, false, {
      purpose: 'kyc_document',
      fileName: 'id.png',
      sizeBytes: 50_000,
      contentType: 'image/png',
    });
    await prisma.kycVerification.create({
      data: {
        userId: u.userId,
        documentType: 'national_id',
        frontFileId: doc.id,
        selfieFileId: doc.id,
        status: 'verified',
      },
    });
    const thumb = await avatarFile(u.auth, true, {
      ...avatarBody,
      purpose: 'portfolio_image',
      fileName: 'work.png',
    });
    for (const status of ['active', 'pending', 'rejected'] as const) {
      await prisma.portfolioItem.create({
        data: {
          uid: `${status}${seq}${Date.now().toString(36)}`.slice(0, 20),
          userId: u.userId,
          slug: 'work',
          title: 'Work',
          description: 'A logo.',
          thumbnailFileId: thumb.id,
          status,
          ...(status === 'rejected' ? { rejectionReason: 'Blurry', rejectedAt: new Date() } : {}),
        },
      });
    }
    const res = await profile(u.username);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      countryCode: 'GE',
      timezone: 'Europe/Berlin',
      isOnline: true,
      availability: { unavailableUntil: '2099-05-01', message: 'On holiday' },
      isIdVerified: true,
      portfolioCount: 1,
      isIndexable: true,
      languages: [{ name: 'Georgian', level: 'native' }],
      skills: [
        { name: 'Logo design', slug: 'logo-design', experience: 'pro' },
        { name: 'Figma', slug: 'figma', experience: 'beginner' },
      ],
    });
    const mine = await http().get('/api/v1/me/profile').set(u.auth);
    expect(mine.body.availability).toEqual({
      unavailableUntil: '2099-05-01',
      message: 'On holiday',
    });
    expect(mine.body.skills).toHaveLength(2);
  });

  it('hides a passed availability (AC-23)', async () => {
    const u = await member();
    await prisma.userProfile.update({
      where: { userId: u.userId },
      data: { unavailableUntil: new Date(Date.now() - 1000), unavailableMessage: 'Away' },
    });
    expect((await profile(u.username)).body.availability).toBeNull();
  });

  it('shows linked accounts only while S-123 is ON', async () => {
    const u = await member();
    await prisma.userLinkedAccount.create({
      data: { userId: u.userId, provider: 'github', url: 'https://github.com/nino' },
    });
    try {
      await setS123(true);
      expect((await profile(u.username)).body.linkedAccounts).toMatchObject({
        github: 'https://github.com/nino',
        facebook: null,
      });
      await setS123(false);
      expect((await profile(u.username)).body.linkedAccounts).toBeNull();
      // The owner's edit form always carries the values, with the switch.
      const mine = await http().get('/api/v1/me/profile').set(u.auth);
      expect(mine.body.linkedAccountsEnabled).toBe(false);
      expect(mine.body.linkedAccounts.github).toBe('https://github.com/nino');
    } finally {
      await prisma.setting.deleteMany({ where: { key: S123_KEY } });
      app.get(SettingsService).invalidate();
    }
  });
});

describe('online status (R-P4)', () => {
  it('turns online with an authenticated request and offline when presence expires', async () => {
    const u = await member();
    // Registration is not an authenticated request.
    expect((await profile(u.username)).body.isOnline).toBe(false);
    expect((await http().get('/api/v1/me').set(u.auth)).status).toBe(200);
    expect((await profile(u.username)).body.isOnline).toBe(true);
    // The column is written in the background.
    await expect
      .poll(
        async () =>
          (await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).lastActivityAt,
      )
      .not.toBeNull();
    // Presence gone (10 minutes passed) → offline.
    await app.get(RedisService).client.del(`presence:user:${u.userId}`);
    expect((await profile(u.username)).body.isOnline).toBe(false);
  });

  it('writes last_activity_at at most once a minute', async () => {
    const u = await member();
    await http().get('/api/v1/me').set(u.auth);
    await expect
      .poll(
        async () =>
          (await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).lastActivityAt,
      )
      .not.toBeNull();
    await prisma.user.update({ where: { id: u.userId }, data: { lastActivityAt: new Date(0) } });
    await http().get('/api/v1/me/profile').set(u.auth);
    await http().get('/api/v1/me').set(u.auth);
    const after = (await prisma.user.findUniqueOrThrow({ where: { id: u.userId } })).lastActivityAt;
    // Same minute: no second write.
    expect(after!.getTime()).toBe(0);
  });

  it('counts a signed-in visitor of a public page and a restricted user', async () => {
    const viewer = await member();
    const target = await member();
    await profile(target.username, viewer.auth);
    expect((await profile(viewer.username)).body.isOnline).toBe(true);
    const r = await member();
    await prisma.user.update({ where: { id: r.userId }, data: { isRestricted: true } });
    await http().get('/api/v1/me/restrictions').set(r.auth);
    expect((await profile(r.username)).body.isOnline).toBe(true);
  });
});

describe('createUserReport (AC-14, EV-13, SEC-23)', () => {
  const report = (auth: Auth, username: string, reason: unknown = 'Fake reviews.') =>
    http().post(`/api/v1/users/${username}/reports`).set(auth).send({ reason });

  it('saves a report (201), replaces it on a second one (200) and emails S-100 each time', async () => {
    const reporter = await member();
    const target = await member();
    const first = await report(reporter.auth, target.username, '  Fake reviews.  ');
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ reason: 'Fake reviews.' });
    await prisma.report.update({
      where: { id: first.body.id },
      data: { status: 'dismissed', decisionNote: 'ok', handledAt: new Date() },
    });
    const second = await report(reporter.auth, target.username, 'Spam links.');
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ id: first.body.id, reason: 'Spam links.' });
    const row = await prisma.report.findUniqueOrThrow({ where: { id: first.body.id } });
    expect(row).toMatchObject({
      targetType: 'user',
      targetId: target.userId,
      reporterUserId: reporter.userId,
      status: 'pending',
      decisionNote: null,
      handledAt: null,
    });
    const events = await prisma.outboxEvent.findMany({
      where: { eventType: 'EV-13', aggregateId: first.body.id },
    });
    expect(events).toHaveLength(2);
    expect(events[0]!.payload).toMatchObject({
      to: expect.arrayContaining([expect.stringContaining('@')]),
      params: { username: target.username },
    });
  });

  it('refuses guests (401), yourself (403), hidden or unknown profiles (404) and bad reasons', async () => {
    const u = await member();
    const guest = await report({ 'X-MyTask-Client': 'ios' }, u.username);
    expect(guest.status).toBe(401);
    expect((await report(u.auth, u.username)).status).toBe(403);
    const banned = await member();
    await prisma.user.update({ where: { id: banned.userId }, data: { status: 'banned' } });
    expect((await report(u.auth, banned.username)).status).toBe(404);
    expect((await report(u.auth, 'nobody_here_xyz')).status).toBe(404);
    const other = await member();
    for (const reason of ['', '   ', 'x'.repeat(1501)]) {
      const res = await report(u.auth, other.username, reason);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
    }
  });

  it('allows 10 reports per user and hour (SEC-23)', async () => {
    const reporter = await member();
    const target = await member();
    for (let i = 0; i < 10; i += 1) {
      expect((await report(reporter.auth, target.username)).status).toBeLessThan(300);
    }
    const res = await report(reporter.auth, target.username);
    expect(res.status).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('renders the EV-13 email for the admins', () => {
    const mail = renderEmail({
      event: 'EV-13',
      locale: 'en',
      username: '',
      email: 'admin@example.com',
      appUrl: 'https://mytask.ge',
      adminUrl: 'https://admin.mytask.ge/',
      params: { username: 'nino' },
    });
    expect(mail.subject).toBe('Profile reported');
    expect(mail.html).toContain('https://admin.mytask.ge/reports');
    expect(mail.text).toContain('reported a profile');
  });
});
