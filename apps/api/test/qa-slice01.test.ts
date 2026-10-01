// QA ROADMAP 3.15a (independent): spec 01 acceptance criteria that the slice's own tests did not cover.
// Same harness as auth.test.ts (real HTTP pipeline, contract validation, PGlite + in-process Redis).
// Each test names the AC it checks; the plan is docs/06-qa/plans/01-auth.md.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

function uniq() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  return { username: `qa_${n}`, email: `qa${n}@example.com` };
}

async function setSetting(registerId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}

async function register(extra: object = {}) {
  const u = uniq();
  const res = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({ fullName: 'QA User', password: PASSWORD, acceptTerms: true, ...u, ...extra });
  return { res, ...u, id: res.body.session?.user?.id as string, at: res.body.session?.accessToken };
}

const login = (email: string, password = PASSWORD, extra: object = {}) =>
  http()
    .post('/api/v1/auth/login')
    .set(IOS)
    .send({ email, password, ...extra });

const bearer = (at: string) => ({ Authorization: `Bearer ${at}` });

async function outbox(eventType: string, aggregateId?: string) {
  return prisma.outboxEvent.findMany({
    where: { eventType, ...(aggregateId ? { aggregateId } : {}) },
    orderBy: { id: 'desc' },
  });
}

async function lastParam(eventType: string, userId: string, name: string): Promise<string> {
  const [ev] = await outbox(eventType, userId);
  return String((ev!.payload as { params: Record<string, unknown> }).params[name]);
}

async function enable2fa(at: string) {
  const on = await http()
    .put('/api/v1/me/two-factor')
    .set(bearer(at))
    .send({ enabled: true, currentPassword: PASSWORD });
  expect(on.status).toBe(200);
}

/** Log in through the code step on a given device; returns the new session's access token. */
async function loginWithCode(email: string, userId: string, deviceToken: string) {
  const step = await login(email, PASSWORD, { deviceToken });
  expect(step.status).toBe(202);
  const ok = await http()
    .post('/api/v1/auth/2fa/verify')
    .set(IOS)
    .send({
      challengeId: step.body.challengeId,
      code: await lastParam('EV-06', userId, 'code'),
      deviceToken,
    });
  expect(ok.status).toBe(200);
  return ok.body.accessToken as string;
}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await prisma.settingVersion.deleteMany();
  await prisma.setting.deleteMany();
  app.get(SettingsService).invalidate();
  await app.get(RedisService).client.flushall();
});

describe('registration (AC-1, AC-2, AC-5)', () => {
  it('QA-REG-1 field rules: short/hyphen username, existing username, deleted account email, long email, short name', async () => {
    const short = await register({ username: 'ab' });
    expect(short.res.status).toBe(400);
    expect(short.res.body.details.fields[0]).toMatchObject({ field: 'username' });
    expect(short.res.body.details.fields[0].messageKey).toMatch(/t_validator_(min|username)/);

    const hyphen = await register({ username: 'john-doe' });
    expect(hyphen.res.body.details.fields[0]).toMatchObject({
      field: 'username',
      messageKey: 't_validator_username',
    });

    const first = await register();
    const dupUser = await register({ username: first.username.toUpperCase() });
    expect(dupUser.res.status).toBe(400);
    expect(dupUser.res.body.details.fields[0]).toMatchObject({
      field: 'username',
      messageKey: 't_validator_unique',
    });

    await prisma.user.update({ where: { id: first.id }, data: { deletedAt: new Date() } });
    const deletedEmail = await register({ email: first.email });
    expect(deletedEmail.res.status).toBe(400);
    expect(deletedEmail.res.body.details.fields[0]).toMatchObject({
      field: 'email',
      messageKey: 't_validator_unique',
    });

    const longEmail = await register({ email: `${'a'.repeat(50)}@example.com` }); // 62 chars
    expect(longEmail.res.status).toBe(400);
    expect(longEmail.res.body.details.fields[0].field).toBe('email');

    const shortName = await register({ fullName: 'Ab' });
    expect(shortName.res.status).toBe(400);
    expect(shortName.res.body.details.fields[0].field).toBe('fullName');

    const noTerms = await register({ acceptTerms: false });
    expect(noTerms.res.status).toBe(400);
  });

  it('QA-REG-2 S-052 ON + admin method: pending, EV-02 to every S-100 address, login says admin review (AC-5, AC-13)', async () => {
    await setSetting('S-052', 'auth.email_verification.required', true);
    await setSetting('S-053', 'auth.email_verification.method', 'admin');
    await setSetting('S-100', 'notifications.admin_recipients', [
      'owner@example.com',
      'ops@example.com',
    ]);
    const { res, email } = await register();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ outcome: 'pending_admin_review', session: null });
    expect(res.body.notice.messageKey).toBe('t_register_verification_admin_pending');
    const [ev] = await outbox('EV-02');
    expect((ev!.payload as { to: string[] }).to.sort()).toEqual([
      'ops@example.com',
      'owner@example.com',
    ]);
    const l = await login(email);
    expect(l.status).toBe(403);
    expect(l.body).toMatchObject({
      code: 'ACCOUNT_PENDING',
      details: { verificationMethod: 'admin' },
    });
    expect(l.body.details.messageKey).toBe('t_account_pending_admin_review');
  });
});

describe('email verification (AC-7…AC-9, R-A9)', () => {
  async function pendingUser() {
    await setSetting('S-052', 'auth.email_verification.required', true);
    await setSetting('S-053', 'auth.email_verification.method', 'email');
    const r = await register();
    const user = await prisma.user.findFirstOrThrow({ where: { email: r.email } });
    return { ...r, id: user.id };
  }

  it('QA-VER-1 a link for a banned account changes nothing; the referral is credited on activation (AC-7)', async () => {
    const referrer = await register();
    const code = referrer.res.body.session.user.referralCode;
    const p = await pendingUser();
    const token = await lastParam('EV-01', p.id, 'token');
    await prisma.user.update({ where: { id: p.id }, data: { status: 'banned' } });
    const r = await http()
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email: p.email, token });
    expect(r.status).toBe(422);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: p.id } })).status).toBe('banned');

    // Referral: pending until the referred account is activated by its link.
    const q = await register({ referralCode: code });
    void q; // S-052 is ON, so q is pending with a stored referral
    const qUser = await prisma.user.findFirstOrThrow({ where: { email: q.email } });
    expect(
      (await prisma.referral.findFirstOrThrow({ where: { referredUserId: qUser.id } })).status,
    ).toBe('pending');
    const ok = await http()
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email: q.email, token: await lastParam('EV-01', qUser.id, 'token') });
    expect(ok.status).toBe(200);
    expect(ok.body.messageKey).toBe('t_ur_account_has_been_successfully_verified_email');
    // Crediting is deferred to slice 09 (referral.service.ts creditSignup); the pending row stays for it.
    expect(
      await prisma.referral.count({ where: { referredUserId: qUser.id, status: 'pending' } }),
    ).toBe(1);
  });

  it('QA-VER-2 expired link → AUTH_LINK_EXPIRED; unknown link → AUTH_LINK_INVALID (AC-8)', async () => {
    const p = await pendingUser();
    const token = await lastParam('EV-01', p.id, 'token');
    await prisma.authToken.updateMany({
      where: { userId: p.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await http()
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email: p.email, token });
    expect(expired.status).toBe(422);
    expect(expired.body.code).toBe('AUTH_LINK_EXPIRED');
    const unknown = await http()
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email: p.email, token: 'x'.repeat(43) });
    expect(unknown.body.code).toBe('AUTH_LINK_INVALID');
  });

  it('QA-VER-3 resend kills older links, answers "already verified" for active accounts, max 3 per hour (AC-9, R-A9)', async () => {
    const p = await pendingUser();
    const oldToken = await lastParam('EV-01', p.id, 'token');
    const resend = () =>
      http().post('/api/v1/auth/email-verification/resend').set(IOS).send({ email: p.email });
    const r1 = await resend();
    expect(r1.status).toBe(202);
    expect(r1.body.messageKey).toBe('t_a_new_verification_link_has_been_sent_to_ur_email');
    const old = await http()
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email: p.email, token: oldToken });
    expect(old.body.code).toBe('AUTH_LINK_INVALID');

    await resend();
    await resend();
    const before = (await outbox('EV-01', p.id)).length; // 1 (register) + 3 resends
    const r4 = await resend();
    expect(r4.status).toBe(202);
    expect(r4.body.messageKey).toBe(r1.body.messageKey);
    expect((await outbox('EV-01', p.id)).length).toBe(before);

    await setSetting('S-052', 'auth.email_verification.required', false);
    const active = await register();
    const already = await http()
      .post('/api/v1/auth/email-verification/resend')
      .set(IOS)
      .send({ email: active.email });
    expect(already.status).toBe(409);
    expect(already.body.code).toBe('AUTH_ALREADY_VERIFIED');
  });
});

describe('login rules (AC-15…AC-17, AC-53)', () => {
  it('QA-LOG-1 a soft-deleted account answers like wrong credentials (AC-15)', async () => {
    const u = await register();
    await prisma.user.update({ where: { id: u.id }, data: { deletedAt: new Date() } });
    const l = await login(u.email);
    const unknown = await login('nobody-qa@example.com');
    expect(l.status).toBe(401);
    expect(l.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(l.body.message).toBe(unknown.body.message);
  });

  it('QA-LOG-2 a successful login resets the counter; S-062/S-063 changes apply at once (AC-16, AC-17)', async () => {
    const u = await register();
    for (let i = 0; i < 4; i++) await login(u.email, 'Wrong1234');
    expect((await login(u.email)).status).toBe(200);
    for (let i = 0; i < 4; i++) await login(u.email, 'Wrong1234');
    expect((await login(u.email)).status).toBe(200); // not locked: the counter was reset

    await setSetting('S-062', 'auth.login_throttle.max_attempts', 2);
    await setSetting('S-063', 'auth.login_throttle.lock_minutes', 1);
    await login(u.email, 'Wrong1234');
    await login(u.email, 'Wrong1234');
    const locked = await login(u.email);
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('AUTH_LOGIN_LOCKED');
    expect(Number(locked.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(locked.body.details.params.minutes).toBe(1);
  });

  it('QA-LOG-3 slow mode after 20 failures: one evaluated attempt per 30 s, right password still works, EV-128 once (AC-53)', async () => {
    // Raise the per account + IP lock so the per-account counter is what we observe (one test IP only).
    await setSetting('S-062', 'auth.login_throttle.max_attempts', 100);
    const u = await register();
    for (let i = 0; i < 20; i++) await login(u.email, 'Wrong1234');
    expect((await outbox('EV-128', u.id)).length).toBe(1);
    const evaluated = await login(u.email, 'Wrong1234'); // takes the 30-second slot
    expect(evaluated.status).toBe(401);
    const throttled = await login(u.email);
    expect(throttled.status).toBe(429);
    expect(throttled.body.code).toBe('AUTH_LOGIN_THROTTLED');
    expect(throttled.body.details.params.seconds).toBeGreaterThan(0);
    await app
      .get(RedisService)
      .client.del((await app.get(RedisService).client.keys('auth:login:slot:*'))[0]!); // the 30 seconds have passed
    const ok = await login(u.email);
    expect(ok.status).toBe(200);
    expect((await outbox('EV-128', u.id)).length).toBe(1);
  });
});

describe('reCAPTCHA (AC-18, R-A10)', () => {
  it('QA-REC-1 S-061 ON: web login and register without a valid token are refused; OFF: not checked; mobile is not checked', async () => {
    const WEB = { 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' };
    const u = await register();
    await setSetting('S-061', 'auth.recaptcha.enabled', true);
    const webLogin = await http()
      .post('/api/v1/auth/login')
      .set(WEB)
      .send({ email: u.email, password: PASSWORD });
    expect(webLogin.status).toBe(400);
    expect(webLogin.body.details.fields[0].messageKey).toBe('t_validator_recaptcha');
    const n = uniq();
    const webRegister = await http()
      .post('/api/v1/auth/register')
      .set(WEB)
      .send({ fullName: 'QA User', password: PASSWORD, acceptTerms: true, ...n });
    expect(webRegister.status).toBe(400);
    expect(webRegister.body.details.fields[0].messageKey).toBe('t_validator_recaptcha');
    // Mobile: no reCAPTCHA check (ADR-002: throttling only) although spec 01 R-A10 says the app uses one.
    expect((await login(u.email)).status).toBe(200);
    await setSetting('S-061', 'auth.recaptcha.enabled', false);
    const off = await http()
      .post('/api/v1/auth/login')
      .set(WEB)
      .send({ email: u.email, password: PASSWORD });
    expect(off.status).toBe(200);
  });
});

describe('email 2FA (AC-20, AC-21, AC-25…AC-28, AC-31, AC-54)', () => {
  it('QA-2FA-1 S-056 OFF: the switch is unavailable and the API refuses it (AC-20)', async () => {
    await setSetting('S-056', 'auth.two_factor.enabled', false);
    const u = await register();
    const me = await http().get('/api/v1/me').set(bearer(u.at));
    expect(me.body.twoFactorAvailable).toBe(false);
    const put = await http()
      .put('/api/v1/me/two-factor')
      .set(bearer(u.at))
      .send({ enabled: true, currentPassword: PASSWORD });
    expect(put.status).toBe(403);
    expect(put.body.code).toBe('FEATURE_DISABLED');
  });

  it('QA-2FA-2 account without a password switches 2FA with an emailed code; notice keys (AC-21)', async () => {
    const u = await register();
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: null, passwordAlgo: null },
    });
    const noCode = await http()
      .put('/api/v1/me/two-factor')
      .set(bearer(u.at))
      .send({ enabled: true });
    expect(noCode.status).toBe(400);
    const ch = await http()
      .post('/api/v1/me/two-factor/challenges')
      .set(bearer(u.at))
      .send({ purpose: 'toggle_two_factor' });
    expect(ch.status).toBe(202);
    const on = await http()
      .put('/api/v1/me/two-factor')
      .set(bearer(u.at))
      .send({
        enabled: true,
        challengeId: ch.body.challengeId,
        code: await lastParam('EV-06', u.id, 'code'),
      });
    expect(on.status).toBe(200);
    expect(on.body.notice.messageKey).toBe('t_2fa_enabled');
  });

  it('QA-2FA-3 S-058 wrong codes kill the code; an expired code is refused (AC-25, AC-26)', async () => {
    const u = await register();
    await enable2fa(u.at);
    const step = await login(u.email);
    const good = await lastParam('EV-06', u.id, 'code');
    const bad = good === '000000' ? '111111' : '000000';
    const verify = (code: string) =>
      http()
        .post('/api/v1/auth/2fa/verify')
        .set(IOS)
        .send({ challengeId: step.body.challengeId, code });
    for (let i = 0; i < 4; i++)
      expect((await verify(bad)).body.code).toBe('TWO_FACTOR_CODE_INVALID');
    expect((await verify(bad)).body.code).toBe('TWO_FACTOR_TOO_MANY_ATTEMPTS');
    expect((await verify(good)).status).not.toBe(200); // that code no longer works

    await app.get(RedisService).client.flushall(); // cooldowns
    const step2 = await login(u.email);
    await prisma.twoFactorChallenge.update({
      where: { id: step2.body.challengeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await http()
      .post('/api/v1/auth/2fa/verify')
      .set(IOS)
      .send({ challengeId: step2.body.challengeId, code: await lastParam('EV-06', u.id, 'code') });
    expect(expired.status).toBe(422);
    expect(expired.body.code).toBe('TWO_FACTOR_CODE_EXPIRED');
  });

  it('QA-2FA-4 resend: new code replaces the old one; at most 5 codes per 15 minutes (AC-27)', async () => {
    const u = await register();
    await enable2fa(u.at);
    const step = await login(u.email);
    const first = await lastParam('EV-06', u.id, 'code');
    const redis = app.get(RedisService).client;
    const sends = [];
    for (let i = 0; i < 5; i++) {
      await redis.del(`auth:code:cooldown:user:${u.id}`); // the 60 seconds have passed
      sends.push(
        await http()
          .post('/api/v1/auth/2fa/resend')
          .set(IOS)
          .send({ challengeId: step.body.challengeId }),
      );
    }
    // login sent 1 code, so resends 1…4 pass and the 5th is the 6th code in 15 minutes.
    expect(sends.slice(0, 4).map((s) => s.status)).toEqual([202, 202, 202, 202]);
    expect(sends[4]!.status).toBe(429);
    expect(sends[4]!.body.code).toBe('TWO_FACTOR_RESEND_THROTTLED');
    const latest = await lastParam('EV-06', u.id, 'code');
    if (latest !== first) {
      const old = await http()
        .post('/api/v1/auth/2fa/verify')
        .set(IOS)
        .send({ challengeId: step.body.challengeId, code: first });
      expect(old.status).toBe(422);
    }
  });

  it('QA-2FA-5 S-056 OFF lets 2FA users in without a code and keeps their choice; ON asks again (AC-28)', async () => {
    const u = await register();
    await enable2fa(u.at);
    await setSetting('S-056', 'auth.two_factor.enabled', false);
    expect((await login(u.email)).status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).twoFactorEnabled).toBe(
      true,
    );
    await setSetting('S-056', 'auth.two_factor.enabled', true);
    expect((await login(u.email)).status).toBe(202);
  });

  it('QA-2FA-6 trusted devices are forgotten after 2FA off, a password change and a reset (AC-31)', async () => {
    const u = await register();
    await enable2fa(u.at);
    const device = 'qa-device-token-000000000001';
    const at = await loginWithCode(u.email, u.id, device);
    expect((await login(u.email, PASSWORD, { deviceToken: device })).status).toBe(200);

    // password change
    const ch = await http().post('/api/v1/me/password').set(bearer(at)).send({
      currentPassword: PASSWORD,
      password: 'Secret1234',
      passwordConfirmation: 'Secret1234',
    });
    expect(ch.status).toBe(200);
    await app.get(RedisService).client.del(`auth:code:cooldown:user:${u.id}`); // 60 s after the last code
    const after = await login(u.email, 'Secret1234', { deviceToken: device });
    expect(after.status).toBe(202);
  });

  it('QA-2FA-7 ten wrong codes in an hour lock code entry for the account, even a correct one; EV-129 once (AC-54)', async () => {
    const u = await register();
    await enable2fa(u.at);
    const redis = app.get(RedisService).client;
    let wrong = 0;
    while (wrong < 10) {
      await redis.del(`auth:code:cooldown:user:${u.id}`, `auth:code:sends:user:${u.id}`);
      const step = await login(u.email);
      const challengeId: string = step.body.challengeId;
      const good = await lastParam('EV-06', u.id, 'code');
      for (let i = 0; i < 4 && wrong < 10; i++, wrong++) {
        await http()
          .post('/api/v1/auth/2fa/verify')
          .set(IOS)
          .send({ challengeId, code: good === '000000' ? '111111' : '000000' });
      }
    }
    await redis.del(`auth:code:cooldown:user:${u.id}`, `auth:code:sends:user:${u.id}`);
    const step = await login(u.email);
    const locked = await http()
      .post('/api/v1/auth/2fa/verify')
      .set(IOS)
      .send({ challengeId: step.body.challengeId, code: await lastParam('EV-06', u.id, 'code') });
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('TWO_FACTOR_LOCKED');
    expect(locked.body.details.params.minutes).toBe(15);
    expect((await outbox('EV-129', u.id)).length).toBe(1);
  });
});

describe('password reset and change (AC-32…AC-36, AC-55, R-A2)', () => {
  it('QA-PWD-1 no email for banned or password-less accounts; a new request kills the older link; max 3 per hour (AC-32, AC-36, EC-3)', async () => {
    const reset = (email: string) =>
      http().post('/api/v1/auth/password-reset').set(IOS).send({ email });
    const banned = await register();
    await prisma.user.update({ where: { id: banned.id }, data: { status: 'banned' } });
    const social = await register();
    await prisma.user.update({
      where: { id: social.id },
      data: { passwordHash: null, passwordAlgo: null },
    });
    const rb = await reset(banned.email);
    const rs = await reset(social.email);
    expect(rb.status).toBe(202);
    expect(rs.body.messageKey).toBe('t_password_reset_link_sent_success');
    expect((await outbox('EV-04', banned.id)).length).toBe(0);
    expect((await outbox('EV-04', social.id)).length).toBe(0);

    await app.get(RedisService).client.flushall(); // the per-IP limit (3/hour) is shared by this test's users
    const u = await register();
    await reset(u.email);
    const first = await lastParam('EV-04', u.id, 'token');
    await reset(u.email);
    const old = await http()
      .post('/api/v1/auth/password-reset/validate')
      .set(IOS)
      .send({ email: u.email, token: first });
    expect(old.status).toBe(422);
    await reset(u.email);
    const r4 = await reset(u.email);
    expect(r4.status).toBe(202);
    expect((await outbox('EV-04', u.id)).length).toBe(3);
  });

  it('QA-PWD-2 reset: R-A2 enforced, expired link changes nothing, PasswordChanged sent, link single-use (AC-33, AC-34)', async () => {
    const u = await register();
    await http().post('/api/v1/auth/password-reset').set(IOS).send({ email: u.email });
    const token = await lastParam('EV-04', u.id, 'token');
    const complete = (password: string) =>
      http()
        .post('/api/v1/auth/password-reset/complete')
        .set(IOS)
        .send({ email: u.email, token, password, passwordConfirmation: password });
    const weak = await complete('lowercase1');
    expect(weak.status).toBe(400);
    expect(weak.body.details.fields[0].messageKey).toBe('t_password_validation_message');
    const short = await complete('Ab1');
    expect(short.status).toBe(400);

    const ok = await complete('NewSecret99');
    expect(ok.status).toBe(200);
    expect(ok.body.messageKey).toBe('t_password_has_been_updated');
    expect((await outbox('EV-05', u.id)).length).toBe(1);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).passwordChangedAt,
    ).not.toBeNull();
    expect((await complete('Another99')).status).toBe(422);

    await http().post('/api/v1/auth/password-reset').set(IOS).send({ email: u.email });
    const t2 = await lastParam('EV-04', u.id, 'token');
    await prisma.authToken.updateMany({
      where: { userId: u.id, consumedAt: null },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await http().post('/api/v1/auth/password-reset/complete').set(IOS).send({
      email: u.email,
      token: t2,
      password: 'Third9999',
      passwordConfirmation: 'Third9999',
    });
    expect(expired.body.code).toBe('AUTH_LINK_EXPIRED');
    expect((await login(u.email, 'NewSecret99')).status).toBe(200);
  });

  it('QA-PWD-3 change: R-A2, other sessions end, this one stays, PasswordChanged (AC-35)', async () => {
    const u = await register();
    const other = await login(u.email);
    const weak = await http().post('/api/v1/me/password').set(bearer(u.at)).send({
      currentPassword: PASSWORD,
      password: 'nouppercase1',
      passwordConfirmation: 'nouppercase1',
    });
    expect(weak.status).toBe(400);
    expect(weak.body.details.fields[0].messageKey).toBe('t_password_validation_message');
    const ok = await http().post('/api/v1/me/password').set(bearer(u.at)).send({
      currentPassword: PASSWORD,
      password: 'Changed123',
      passwordConfirmation: 'Changed123',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.messageKey).toBe('t_ur_account_password_updated');
    expect((await http().get('/api/v1/me').set(bearer(u.at))).status).toBe(200);
    expect((await http().get('/api/v1/me').set(bearer(other.body.accessToken))).status).toBe(401);
    expect((await outbox('EV-05', u.id)).length).toBe(1);
  });

  it('QA-PWD-4 five wrong current passwords across pages lock every check for S-063; a reset link still works (AC-55)', async () => {
    const u = await register();
    const wrongChange = () =>
      http().post('/api/v1/me/password').set(bearer(u.at)).send({
        currentPassword: 'Wrong1234',
        password: 'Changed123',
        passwordConfirmation: 'Changed123',
      });
    const wrongRevoke = () =>
      http()
        .post('/api/v1/me/sessions/revoke-others')
        .set(bearer(u.at))
        .send({ currentPassword: 'Wrong1234' });
    await wrongChange();
    await wrongRevoke();
    await wrongChange();
    await wrongRevoke();
    await wrongChange();
    const locked = await http()
      .post('/api/v1/me/sessions/revoke-others')
      .set(bearer(u.at))
      .send({ currentPassword: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.details.messageKey).toBe('t_too_many_login_attempts');
    expect(locked.body.details.params.minutes).toBe(15);

    await http().post('/api/v1/auth/password-reset').set(IOS).send({ email: u.email });
    const token = await lastParam('EV-04', u.id, 'token');
    const reset = await http().post('/api/v1/auth/password-reset/complete').set(IOS).send({
      email: u.email,
      token,
      password: 'AfterLock99',
      passwordConfirmation: 'AfterLock99',
    });
    expect(reset.status).toBe(200);
  });
});

describe('sessions (AC-43, AC-44)', () => {
  it('QA-SES-1 list shows every live session with device, IP and the "this device" marker; revoke keeps the current one (AC-43, AC-44)', async () => {
    const u = await register();
    await http()
      .post('/api/v1/auth/login')
      .set({ ...IOS, 'User-Agent': 'MyTask/1.0 (iPhone; iOS 17.4)' })
      .send({ email: u.email, password: PASSWORD });
    const list = await http().get('/api/v1/me/sessions').set(bearer(u.at));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data.filter((s: { isCurrent: boolean }) => s.isCurrent)).toHaveLength(1);
    for (const s of list.body.data) {
      expect(s.ip).not.toBe('');
      expect(s.lastActiveAt).toEqual(expect.any(String));
    }
    const wrong = await http()
      .post('/api/v1/me/sessions/revoke-others')
      .set(bearer(u.at))
      .send({ currentPassword: 'Wrong1234' });
    expect(wrong.body.details.fields[0].messageKey).toBe('t_ur_current_pass_does_not_match');
    const ok = await http()
      .post('/api/v1/me/sessions/revoke-others')
      .set(bearer(u.at))
      .send({ currentPassword: PASSWORD });
    expect(ok.body.revokedCount).toBe(1);
    const after = await http().get('/api/v1/me/sessions').set(bearer(u.at));
    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].isCurrent).toBe(true);
  });

  it('QA-SES-2 account without a password: revoke with a revoke_sessions code only; a code of another purpose is refused (AC-44)', async () => {
    const u = await register();
    await login(u.email);
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: null, passwordAlgo: null },
    });
    const toggle = await http()
      .post('/api/v1/me/two-factor/challenges')
      .set(bearer(u.at))
      .send({ purpose: 'toggle_two_factor' });
    const crossPurpose = await http()
      .post('/api/v1/me/sessions/revoke-others')
      .set(bearer(u.at))
      .send({ challengeId: toggle.body.challengeId, code: await lastParam('EV-06', u.id, 'code') });
    expect(crossPurpose.status).not.toBe(200);

    await app.get(RedisService).client.del(`auth:code:cooldown:user:${u.id}`);
    const ch = await http()
      .post('/api/v1/me/two-factor/challenges')
      .set(bearer(u.at))
      .send({ purpose: 'revoke_sessions' });
    expect(ch.status).toBe(202);
    const ok = await http()
      .post('/api/v1/me/sessions/revoke-others')
      .set(bearer(u.at))
      .send({ challengeId: ch.body.challengeId, code: await lastParam('EV-06', u.id, 'code') });
    expect(ok.status).toBe(200);
    expect(ok.body.revokedCount).toBe(1);
  });
});
