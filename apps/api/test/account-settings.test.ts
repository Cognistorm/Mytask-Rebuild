// Account settings (ROADMAP 4.1.11; spec 02 AC-3, AC-29…AC-34, EC-12; Q-144): updateMe, confirmEmailChange,
// updateMyPreferences, deleteMe and the `email_change` re-authentication code.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AccountDeletionGuards } from '../src/modules/auth/account-deletion.guards';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const IOS = { 'X-MyTask-Client': 'ios' };
const PASSWORD = 'Secret123';
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const email = `as${n}@example.com`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      username: `as_${n}`,
      email,
      fullName: 'Settings User',
      password: PASSWORD,
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
  return {
    userId,
    email,
    username: reg.body.session.user.username as string,
    auth: {
      ...IOS,
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

/** An account without a password (social login only). */
async function socialMember() {
  const m = await member();
  await prisma.user.update({
    where: { id: m.userId },
    data: { passwordHash: null, passwordAlgo: null },
  });
  return m;
}

const patchMe = (auth: Auth, body: object) => http().patch('/api/v1/me').set(auth).send(body);
const getMe = (auth: Auth) => http().get('/api/v1/me').set(auth);
const confirm = (token: string) =>
  http().post('/api/v1/auth/email-change/confirm').set(IOS).send({ token });

async function lastEvent(eventType: string, aggregateId: string) {
  const ev = await prisma.outboxEvent.findFirstOrThrow({
    where: { eventType, aggregateId },
    orderBy: { id: 'desc' },
  });
  return ev.payload as {
    to?: string[];
    userId?: string;
    params: Record<string, string | number>;
  };
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  await prisma.setting.deleteMany();
  app.get(SettingsService).invalidate();
  // Registration allows 10 per IP and hour; link emails 3 per hour.
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await app?.close();
});

describe('updateMe (AC-29, AC-31)', () => {
  it('saves name, city and country with the current password', async () => {
    const m = await member();
    const res = await patchMe(m.auth, {
      fullName: '  Nino Beridze ',
      city: ' Tbilisi ',
      countryCode: 'GE',
      currentPassword: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      fullName: 'Nino Beridze',
      city: 'Tbilisi',
      countryCode: 'GE',
      pendingEmail: null,
    });
    const cleared = await patchMe(m.auth, { countryCode: null, currentPassword: PASSWORD });
    expect(cleared.body).toMatchObject({ countryCode: null, city: 'Tbilisi' });
  });

  it('needs the right current password; nothing is saved without it', async () => {
    const m = await member();
    const missing = await patchMe(m.auth, { city: 'Batumi' });
    expect(missing.status).toBe(400);
    expect(missing.body.details.fields[0]).toMatchObject({
      field: 'currentPassword',
      messageKey: 't_validator_required',
    });
    const wrong = await patchMe(m.auth, { city: 'Batumi', currentPassword: 'Wrong999' });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details.fields[0]).toMatchObject({
      field: 'currentPassword',
      messageKey: 't_ur_current_pass_does_not_match',
    });
    expect((await getMe(m.auth)).body.city).toBeNull();
  });

  it('refuses blanks, an unknown country and a taken username or email', async () => {
    const m = await member();
    const other = await member();
    const cases: [object, string, string][] = [
      [{ city: '   ' }, 'city', 't_validator_required'],
      [{ fullName: ' ' }, 'fullName', 't_validator_required'],
      [{ countryCode: 'US' }, 'countryCode', 't_validator_exists'],
      [{ username: other.username.toUpperCase() }, 'username', 't_validator_unique'],
      [{ email: other.email }, 'email', 't_validator_unique'],
    ];
    for (const [body, field, messageKey] of cases) {
      const res = await patchMe(m.auth, { ...body, currentPassword: PASSWORD });
      expect(res.status, field).toBe(400);
      expect(res.body.details.fields[0]).toMatchObject({ field, messageKey });
    }
  });

  it('a new username moves the profile; the old URL answers 404 (AC-31, EC-4)', async () => {
    const m = await member();
    const renamed = `${m.username}_x`;
    const res = await patchMe(m.auth, { username: renamed, currentPassword: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.username).toBe(renamed);
    expect((await http().get(`/api/v1/users/${renamed}`).set(IOS)).status).toBe(200);
    expect((await http().get(`/api/v1/users/${m.username}`).set(IOS)).status).toBe(404);
  });
});

describe('email change (AC-30, P-18)', () => {
  it('sends a link to the new address and a notice to the old one; the email changes on confirm', async () => {
    const m = await member();
    const newEmail = `new_${m.email}`;
    const res = await patchMe(m.auth, { email: newEmail, currentPassword: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: m.email, pendingEmail: newEmail });

    const link = await lastEvent('EV-11', m.userId);
    expect(link.to).toEqual([newEmail]);
    expect(link.params).toMatchObject({ email: newEmail, minutes: 60 });
    const notice = await lastEvent('EV-12', m.userId);
    // Pinned to the old address at request time (4.1.15), not read again when the worker sends it.
    expect(notice).toMatchObject({ to: [m.email], params: { email: newEmail } });
    expect(notice.userId).toBeUndefined();

    const done = await confirm(String(link.params.token));
    expect(done.status).toBe(200);
    expect(done.body.messageKey).toBe('t_email_changed_success');
    const me = await getMe(m.auth);
    expect(me.body).toMatchObject({ email: newEmail, pendingEmail: null });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: m.userId } });
    expect(row.emailChangedAt).not.toBeNull(); // starts the withdrawal pause (spec 14 AC-21)
    expect(row.emailVerifiedAt).not.toBeNull();

    const again = await confirm(String(link.params.token));
    expect(again.status).toBe(422);
    expect(again.body.code).toBe('AUTH_LINK_INVALID');
    // The new address logs in.
    const login = await http()
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: newEmail, password: PASSWORD });
    expect(login.status).toBe(200);
  });

  it('old password-reset links stop working once the new email is active', async () => {
    const m = await member();
    await http().post('/api/v1/auth/password-reset').set(IOS).send({ email: m.email });
    const reset = await lastEvent('EV-04', m.userId);
    await patchMe(m.auth, { email: `x${m.email}`, currentPassword: PASSWORD });
    await confirm(String((await lastEvent('EV-11', m.userId)).params.token));
    const check = await http()
      .post('/api/v1/auth/password-reset/validate')
      .set(IOS)
      .send({ email: m.email, token: reset.params.token });
    expect(check.status).toBe(422);
  });

  it('a newer change replaces the older link; expired links answer AUTH_LINK_EXPIRED', async () => {
    const m = await member();
    await patchMe(m.auth, { email: `a${m.email}`, currentPassword: PASSWORD });
    const first = String((await lastEvent('EV-11', m.userId)).params.token);
    await patchMe(m.auth, { email: `b${m.email}`, currentPassword: PASSWORD });
    const second = String((await lastEvent('EV-11', m.userId)).params.token);
    expect((await confirm(first)).body.code).toBe('AUTH_LINK_INVALID');
    await prisma.authToken.updateMany({
      where: { userId: m.userId, purpose: 'email_change', consumedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await confirm(second);
    expect(expired.status).toBe(422);
    expect(expired.body.code).toBe('AUTH_LINK_EXPIRED');
    expect((await getMe(m.auth)).body.pendingEmail).toBeNull();
  });

  it('an address taken meanwhile answers 409 DUPLICATE', async () => {
    const m = await member();
    const target = `t${m.email}`;
    await patchMe(m.auth, { email: target, currentPassword: PASSWORD });
    const token = String((await lastEvent('EV-11', m.userId)).params.token);
    const other = await member();
    await prisma.user.update({ where: { id: other.userId }, data: { email: target } });
    const res = await confirm(token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE');
    expect((await getMe(m.auth)).body.email).toBe(m.email);
  });

  it('unknown tokens are invalid', async () => {
    const res = await confirm('x'.repeat(43));
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('AUTH_LINK_INVALID');
  });

  it('caps email-change links at 3 per hour per account', async () => {
    const m = await member();
    for (let i = 0; i < 3; i++) {
      const ok = await patchMe(m.auth, { email: `${i}${m.email}`, currentPassword: PASSWORD });
      expect(ok.status).toBe(200);
    }
    const capped = await patchMe(m.auth, { email: `9${m.email}`, currentPassword: PASSWORD });
    expect(capped.status).toBe(429);
    expect(capped.body.code).toBe('RATE_LIMITED');
  });
});

describe('accounts without a password (Q-144, EC-12)', () => {
  const challenge = (auth: Auth, purpose: string) =>
    http().post('/api/v1/me/two-factor/challenges').set(auth).send({ purpose });
  const lastCode = async (userId: string) => String((await lastEvent('EV-06', userId)).params.code);

  it('saves other fields without a password or code', async () => {
    const m = await socialMember();
    const res = await patchMe(m.auth, { city: 'Kutaisi' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ city: 'Kutaisi', hasPassword: false });
  });

  it('an email change needs an email_change code sent to the current address', async () => {
    const m = await socialMember();
    const newEmail = `s${m.email}`;
    const missing = await patchMe(m.auth, { email: newEmail });
    expect(missing.status).toBe(400);
    expect(missing.body.details.fields[0].field).toBe('code');

    const c = await challenge(m.auth, 'email_change');
    expect(c.status).toBe(202);
    expect(c.body.purpose).toBe('email_change');
    const code = await lastCode(m.userId);
    const wrongCode = code === '000000' ? '111111' : '000000';
    const wrong = await patchMe(m.auth, {
      email: newEmail,
      city: 'Gori',
      challengeId: c.body.challengeId,
      code: wrongCode,
    });
    expect(wrong.status).toBe(422);
    expect(wrong.body.code).toBe('TWO_FACTOR_CODE_INVALID');
    expect((await getMe(m.auth)).body).toMatchObject({ city: null, pendingEmail: null });

    const ok = await patchMe(m.auth, { email: newEmail, challengeId: c.body.challengeId, code });
    expect(ok.status).toBe(200);
    expect(ok.body.pendingEmail).toBe(newEmail);
    // A code is accepted once.
    const reused = await patchMe(m.auth, {
      email: `r${m.email}`,
      challengeId: c.body.challengeId,
      code,
    });
    expect(reused.status).toBe(422);
  });

  it('a code of another purpose is not accepted', async () => {
    const m = await socialMember();
    const c = await challenge(m.auth, 'revoke_sessions');
    expect(c.status).toBe(202);
    const res = await patchMe(m.auth, {
      email: `p${m.email}`,
      challengeId: c.body.challengeId,
      code: await lastCode(m.userId),
    });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('TWO_FACTOR_CODE_EXPIRED');
  });

  it('accounts with a password get 409 for an email_change code', async () => {
    const m = await member();
    const res = await challenge(m.auth, 'email_change');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});

describe('updateMyPreferences (AC-3)', () => {
  it('stores dashboard, theme and language; omitted fields stay', async () => {
    const m = await member();
    expect((await getMe(m.auth)).body).toMatchObject({ lastDashboard: 'buying', theme: null });
    const res = await http()
      .patch('/api/v1/me/preferences')
      .set(m.auth)
      .send({ lastDashboard: 'selling', theme: 'dark', locale: 'en' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lastDashboard: 'selling', theme: 'dark', locale: 'en' });
    const partial = await http().patch('/api/v1/me/preferences').set(m.auth).send({ theme: null });
    expect(partial.body).toMatchObject({ lastDashboard: 'selling', theme: null, locale: 'en' });
  });
});

describe('deleteMe (AC-32…AC-34)', () => {
  it('soft-deletes: sessions end, login and the profile are gone, email and username stay reserved', async () => {
    const m = await member();
    const res = await http().delete('/api/v1/me').set(m.auth);
    expect(res.status).toBe(204);
    expect((await getMe(m.auth)).status).toBe(401);
    const sessions = await prisma.session.count({ where: { userId: m.userId, revokedAt: null } });
    expect(sessions).toBe(0);
    const login = await http()
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: m.email, password: PASSWORD });
    expect(login.status).toBe(401);
    expect((await http().get(`/api/v1/users/${m.username}`).set(IOS)).status).toBe(404);
    const again = await http().post('/api/v1/auth/register').set(IOS).send({
      username: m.username,
      email: m.email,
      fullName: 'Again',
      password: PASSWORD,
      acceptTerms: true,
    });
    expect(again.status).toBe(400);
    expect(again.body.details.fields[0].messageKey).toBe('t_validator_unique');
  });

  it('a registered guard refuses with its message (later slices plug in here)', async () => {
    const m = await member();
    app.get(AccountDeletionGuards).register({
      name: `test-${m.userId}`,
      refusal: async (userId) =>
        userId === m.userId ? 't_cannot_delete_account_active_orders_projects' : null,
    });
    const res = await http().delete('/api/v1/me').set(m.auth);
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      details: { messageKey: 't_cannot_delete_account_active_orders_projects' },
    });
    expect((await getMe(m.auth)).status).toBe(200);
  });
});

describe('listCountries (country select, AC-29)', () => {
  it('lists only active countries, public, with names in the request language', async () => {
    await prisma.country.upsert({
      where: { iso2: 'ZZ' },
      create: { id: 999, iso2: 'ZZ', nameKa: 'ზზ', nameEn: 'Zed', isActive: false },
      update: { isActive: false },
    });
    try {
      const en = await http().get('/api/v1/countries').set('Accept-Language', 'en');
      expect(en.status).toBe(200);
      expect(en.body.countries).toContainEqual({ code: 'GE', name: 'Georgia' });
      expect(en.body.countries.map((c: { code: string }) => c.code)).not.toContain('ZZ');
      const ka = await http().get('/api/v1/countries').set('Accept-Language', 'ka');
      expect(ka.body.countries).toContainEqual({ code: 'GE', name: 'საქართველო' });
    } finally {
      await prisma.country.delete({ where: { iso2: 'ZZ' } });
    }
  });
});
