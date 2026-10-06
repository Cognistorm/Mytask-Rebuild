// Slice 01 part A — auth operations through the real HTTP pipeline (contract validation on requests AND
// responses), real PostgreSQL (PGlite locally, Postgres in CI) and Redis (in-process locally, real in CI).
import type { NestExpressApplication } from '@nestjs/platform-express';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ClientIpResolver } from '../src/platform/client-ip/client-ip.resolver';
import { ipSourceProps } from '../src/platform/logging/logging.module';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;

const WEB = { 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' };
const IOS = { 'X-MyTask-Client': 'ios' };
const PASSWORD = 'Secret123';

function uniq() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  return { username: `user_${n}`, email: `u${n}@example.com` };
}

async function setSetting(registerId: string, key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}

async function register(headers: Record<string, string> = IOS, extra: object = {}) {
  const u = uniq();
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .set(headers)
    .send({ fullName: 'Test User', password: PASSWORD, acceptTerms: true, ...u, ...extra });
  return { res, ...u };
}

async function lastCode(userId: string): Promise<string> {
  const ev = await prisma.outboxEvent.findFirst({
    where: { eventType: 'EV-06', aggregateId: userId },
    orderBy: { id: 'desc' },
  });
  return String((ev?.payload as { params: { code: string } }).params.code);
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

describe('register (AC-1…AC-5)', () => {
  it('S-052 OFF: creates an active account with a referral code and logs in (mobile gets tokens)', async () => {
    const { res } = await register();
    expect(res.status).toBe(201);
    expect(res.body.outcome).toBe('logged_in');
    expect(res.body.session.user.referralCode).toMatch(/^[A-Z0-9]{8}$/);
    expect(res.body.session.accessToken).toEqual(expect.any(String));
    expect(res.body.session.refreshToken).toEqual(expect.any(String));
    expect(res.body.session.deviceToken).toEqual(expect.any(String));
  });

  it('web gets HttpOnly host-only cookies and no body tokens', async () => {
    const { res } = await register(WEB);
    expect(res.status).toBe(201);
    expect(res.body.session.accessToken).toBeNull();
    const cookies = (res.headers['set-cookie'] as unknown as string[]).join('\n');
    expect(cookies).toMatch(/__Host-mt_at=.*HttpOnly.*Secure.*SameSite=Lax/i);
    expect(cookies).toMatch(/__Secure-mt_rt=.*Path=\/api\/v1\/auth/i);
    expect(cookies).not.toMatch(/Domain=/i);
  });

  it('rejects bad usernames and duplicates with the spec keys (AC-2)', async () => {
    const bad = await register(IOS, { username: '12345' });
    expect(bad.res.status).toBe(400);
    expect(bad.res.body.details.fields[0]).toMatchObject({
      field: 'username',
      messageKey: 't_validator_username',
    });

    const first = await register();
    const dup = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(IOS)
      .send({
        fullName: 'X Y Z',
        username: `other_${seq}`,
        email: first.email.toUpperCase(),
        password: PASSWORD,
        acceptTerms: true,
      });
    expect(dup.status).toBe(400);
    expect(dup.body.details.fields[0]).toMatchObject({
      field: 'email',
      messageKey: 't_validator_unique',
    });
  });

  it('password rule R-A2 and unknown referral code (AC-6)', async () => {
    const weak = await register(IOS, { password: 'lowercase1' });
    expect(weak.res.body.details.fields[0].messageKey).toBe('t_password_validation_message');
    const ref = await register(IOS, { referralCode: 'ZZZZZZZZ' });
    expect(ref.res.body.details.fields[0].messageKey).toBe('t_referral_code_invalid');
  });

  it('stores a pending referral for a valid code', async () => {
    const referrer = await register();
    const referred = await register(IOS, {
      referralCode: referrer.res.body.session.user.referralCode,
    });
    const row = await prisma.referral.findFirst({
      where: { referredUserId: referred.res.body.session.user.id },
    });
    expect(row?.status).toBe('pending');
  });

  it('S-052 ON + email method: pending, EV-01 queued, no session; login says pending (AC-4, AC-13)', async () => {
    await setSetting('S-052', 'auth.email_verification.required', true);
    await setSetting('S-053', 'auth.email_verification.method', 'email');
    const { res, email } = await register();
    expect(res.body).toMatchObject({ outcome: 'pending_email_verification', session: null });
    expect(res.body.notice.messageKey).toBe('t_register_verification_email_sent');
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body).toMatchObject({
      code: 'ACCOUNT_PENDING',
      details: { verificationMethod: 'email' },
    });

    // AC-7: the link activates the account once.
    const ev = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'EV-01' },
      orderBy: { id: 'desc' },
    });
    const token = (ev.payload as { params: { token: string } }).params.token;
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email, token });
    expect(ok.status).toBe(200);
    const again = await request(app.getHttpServer())
      .post('/api/v1/auth/email-verification/confirm')
      .set(IOS)
      .send({ email, token });
    expect(again.body.code).toBe('AUTH_LINK_INVALID');
    const after = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    expect(after.status).toBe(200);
  });
});

describe('login (AC-10…AC-16, AC-53)', () => {
  it('same answer for a wrong password and an unknown email (AC-11)', async () => {
    const { email } = await register();
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: 'Nope12345' });
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: 'nobody@example.com', password: 'Nope12345' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(unknown.body.message).toBe(wrong.body.message);
  });

  it('legacy $2y$ bcrypt password logs in and is upgraded to Argon2id (AC-12, SEC-29)', async () => {
    const u = uniq();
    const password = 'Legacyპაროლი1'; // Georgian letters are 3 bytes each in UTF-8
    const phpHash = (await bcrypt.hash(password, 10)).replace(/^\$2[ab]\$/, '$2y$');
    const user = await prisma.user.create({
      data: {
        ...u,
        status: 'active',
        passwordHash: phpHash,
        passwordAlgo: 'bcrypt_legacy',
        referralCode: `L${seq}`.padEnd(8, 'X').slice(0, 8).toUpperCase(),
        profile: { create: { fullname: 'Legacy User' } },
      },
    });
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: u.email, password });
    expect(first.status).toBe(200);
    const upgraded = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(upgraded.passwordAlgo).toBe('argon2id');
    expect(upgraded.passwordHash).toMatch(/^\$argon2id\$/);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: u.email, password });
    expect(second.status).toBe(200);
  });

  it('locks account + IP after S-062 failures, even with the right password (AC-16)', async () => {
    const { email } = await register();
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set(IOS)
        .send({ email, password: 'Wrong1234' });
    }
    const locked = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('AUTH_LOGIN_LOCKED');
    expect(locked.headers['retry-after']).toBeDefined();
  });

  it('banned account: clear message (AC-14)', async () => {
    const { res, email } = await register();
    await prisma.user.update({
      where: { id: res.body.session.user.id },
      data: { status: 'banned' },
    });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(403);
    expect(login.body.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('sessions (AC-42, AC-45, ADR-002 §1)', () => {
  it('getMe with Bearer; logout ends the session at once', async () => {
    const { res } = await register();
    const at = res.body.session.accessToken;
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${at}`);
    expect(me.status).toBe(200);
    expect(me.body.username).toBe(res.body.session.user.username);
    const out = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${at}`)
      .send({});
    expect(out.status).toBe(204);
    const after = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${at}`);
    expect(after.status).toBe(401);
  });

  it('refresh rotates; reusing an old refresh token revokes the family', async () => {
    const { res } = await register();
    const rt1 = res.body.session.refreshToken;
    const r1 = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(IOS)
      .send({ refreshToken: rt1 });
    expect(r1.status).toBe(200);
    const rt2 = r1.body.refreshToken;
    expect(rt2).not.toBe(rt1);
    // SEC-44: within 20 s the reuse is treated as a parallel-tab race (401, session kept).
    const race = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(IOS)
      .send({ refreshToken: rt1 });
    expect(race.status).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/me')
          .set('Authorization', `Bearer ${r1.body.accessToken}`)
      ).status,
    ).toBe(200);
    // Later reuse of the old token is theft: the family ends.
    await prisma.refreshToken.updateMany({
      where: { usedAt: { not: null } },
      data: { usedAt: new Date(Date.now() - 60_000) },
    });
    const reuse = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(IOS)
      .send({ refreshToken: rt1 });
    expect(reuse.status).toBe(401);
    const dead = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set(IOS)
      .send({ refreshToken: rt2 });
    expect(dead.status).toBe(401);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${r1.body.accessToken}`);
    expect(me.status).toBe(401);
  });

  it('unauthenticated call -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });
});

describe('email 2FA (AC-20…AC-27, AC-31)', () => {
  it('switch on with password; new device needs a code; correct code trusts the device', async () => {
    const { res, email } = await register();
    const at = res.body.session.accessToken;
    const on = await request(app.getHttpServer())
      .put('/api/v1/me/two-factor')
      .set('Authorization', `Bearer ${at}`)
      .send({ enabled: true, currentPassword: PASSWORD });
    expect(on.status).toBe(200);
    expect(on.body.enabled).toBe(true);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    expect(login.status).toBe(202);
    expect(login.body).toMatchObject({ channel: 'email', purpose: 'login', codeLength: 6 });

    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify')
      .set(IOS)
      .send({
        challengeId: login.body.challengeId,
        code: '000000' === (await lastCode(user.id)) ? '111111' : '000000',
      });
    expect(wrong.status).toBe(422);
    expect(wrong.body.code).toBe('TWO_FACTOR_CODE_INVALID');

    const deviceToken = 'device-token-for-tests-0001';
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/verify')
      .set(IOS)
      .send({ challengeId: login.body.challengeId, code: await lastCode(user.id), deviceToken });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));

    // AC-24: the trusted device logs in without a code.
    const trusted = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD, deviceToken });
    expect(trusted.status).toBe(200);
  });

  it('resend is throttled for 60 s (AC-27)', async () => {
    const { res, email } = await register();
    await request(app.getHttpServer())
      .put('/api/v1/me/two-factor')
      .set('Authorization', `Bearer ${res.body.session.accessToken}`)
      .send({ enabled: true, currentPassword: PASSWORD });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    const resend = await request(app.getHttpServer())
      .post('/api/v1/auth/2fa/resend')
      .set(IOS)
      .send({ challengeId: login.body.challengeId });
    expect(resend.status).toBe(429);
    expect(resend.body.code).toBe('TWO_FACTOR_RESEND_THROTTLED');
  });
});

describe('password reset and change (AC-32…AC-36)', () => {
  it('reset: same answer for unknown email; link changes the password and ends sessions', async () => {
    const { res, email } = await register();
    const unknown = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset')
      .set(IOS)
      .send({ email: 'none@example.com' });
    const known = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset')
      .set(IOS)
      .send({ email });
    expect(unknown.status).toBe(202);
    expect(known.body.message).toBe(unknown.body.message);

    const ev = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'EV-04' },
      orderBy: { id: 'desc' },
    });
    const token = (ev.payload as { params: { token: string } }).params.token;
    const valid = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/validate')
      .set(IOS)
      .send({ email, token });
    expect(valid.status).toBe(204);
    const done = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset/complete')
      .set(IOS)
      .send({ email, token, password: 'NewSecret99', passwordConfirmation: 'NewSecret99' });
    expect(done.status).toBe(200);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${res.body.session.accessToken}`);
    expect(me.status).toBe(401);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: 'NewSecret99' });
    expect(login.status).toBe(200);
  });

  it('change: wrong current password is refused with the spec key', async () => {
    const { res } = await register();
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/me/password')
      .set('Authorization', `Bearer ${res.body.session.accessToken}`)
      .send({
        currentPassword: 'Wrong1234',
        password: 'NewSecret99',
        passwordConfirmation: 'NewSecret99',
      });
    expect(wrong.status).toBe(400);
    expect(wrong.body.details.fields[0].messageKey).toBe('t_ur_current_pass_does_not_match');
  });
});

describe('CSRF (ADR-002 §2, SEC-14)', () => {
  it('web request with a foreign Origin is refused', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set({ 'X-MyTask-Client': 'web', Origin: 'https://evil.example' })
      .send({ email: 'a@example.com', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CSRF_CHECK_FAILED');
  });

  it('unsafe request without X-MyTask-Client is refused', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'a@example.com', password: 'x' });
    expect(res.body.code).toBe('CSRF_CHECK_FAILED');
  });
});

describe('client IP chain (ADR-013 §19 a–c)', () => {
  const resolver = () => app.get(ClientIpResolver);
  const fake = (peer: string, headers: Record<string, string>) =>
    ({ headers, socket: { remoteAddress: peer } }) as never;

  it('(a) spoofed forwarding headers never change the IP', () => {
    const r = resolver().resolve(
      fake('203.0.113.5', {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '1.1.1.1',
        'cf-connecting-ip': '1.1.1.1',
        'x-mytask-client-ip': '1.1.1.1',
      }),
    );
    expect(r.ip).toBe('203.0.113.5');
  });

  it('the request log names the IP source: ssr-visitor only with the credential (review 07 I-41)', () => {
    const tok = process.env.INTERNAL_SERVICE_TOKEN!;
    const props = ipSourceProps(
      new ClientIpResolver({ TRUSTED_PROXY_IPS: [], INTERNAL_SERVICE_TOKEN: tok } as never),
    );
    const ssr = { 'x-mytask-visitor-ip': '203.0.113.7', 'x-mytask-service-auth': tok };
    expect(props(fake('10.0.0.5', ssr) as never)).toEqual({ ipSource: 'ssr-visitor' });
    expect(props(fake('10.0.0.5', { 'x-mytask-visitor-ip': '203.0.113.7' }) as never)).toEqual({
      ipSource: 'peer',
    });
  });

  it('(b) through Caddy: canonical header trusted, visitor IP ignored even with the credential', () => {
    const tok = process.env.INTERNAL_SERVICE_TOKEN!;
    const viaEdge = new ClientIpResolver({
      TRUSTED_PROXY_IPS: ['172.30.0.10'],
      INTERNAL_SERVICE_TOKEN: tok,
    } as never);
    const r = viaEdge.resolve(
      fake('172.30.0.10', {
        'x-mytask-client-ip': '198.51.100.9',
        'x-mytask-visitor-ip': '1.1.1.1',
        'x-mytask-service-auth': tok,
      }),
    );
    expect(r).toMatchObject({ ip: '198.51.100.9', source: 'edge' });
  });

  it('(c) visitor IP without the service credential is ignored; with it, accepted', () => {
    expect(resolver().resolve(fake('10.0.0.7', { 'x-mytask-visitor-ip': '1.1.1.1' })).ip).toBe(
      '10.0.0.7',
    );
    const ok = resolver().resolve(
      fake('10.0.0.7', {
        'x-mytask-visitor-ip': '1.1.1.1',
        'x-mytask-service-auth': process.env.INTERNAL_SERVICE_TOKEN!,
      }),
    );
    expect(ok.ip).toBe('1.1.1.1');
  });
});

describe('mobile version gate (ADR-018, S-130)', () => {
  it('ios/android get X-Min-App-Version; an older app gets 426 on normal calls, health stays open', async () => {
    await setSetting('S-130', 'mobile.min_app_version', { ios: '2.0.0', android: '0.0.0' });
    const old = { 'X-MyTask-Client': 'ios', 'X-MyTask-App-Version': '1.9.9' };
    const refused = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(old)
      .send({ email: 'x@example.com', password: 'Secret123' });
    expect(refused.status).toBe(426);
    expect(refused.body).toMatchObject({
      code: 'APP_VERSION_UNSUPPORTED',
      details: { minVersion: '2.0.0', platform: 'ios' },
    });
    expect(refused.headers['x-min-app-version']).toBe('2.0.0');
    const health = await request(app.getHttpServer()).get('/api/v1/health').set(old);
    expect(health.status).toBe(200);
    const current = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set({ ...old, 'X-MyTask-App-Version': '2.0.0' })
      .send({ email: 'x@example.com', password: 'Secret123' });
    expect(current.status).toBe(401);
    const android = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set({ 'X-MyTask-Client': 'android' });
    expect(android.headers['x-min-app-version']).toBe('0.0.0');
  });
});

describe('parallel bursts cannot pass the limits (SEC-34)', () => {
  it('20 parallel wrong logins for one account + IP: at most S-062 passwords are checked', async () => {
    const { email } = await register();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .set(IOS)
          .send({ email, password: 'Wrong1234' }),
      ),
    );
    const checked = results.filter((r) => r.body.code === 'AUTH_INVALID_CREDENTIALS').length;
    expect(checked).toBeLessThanOrEqual(5);
    expect(
      results.filter((r) => r.body.code === 'AUTH_LOGIN_LOCKED').length,
    ).toBeGreaterThanOrEqual(15);
  });

  it('20 parallel wrong codes on one challenge: at most S-058 are compared', async () => {
    const { res, email } = await register();
    await request(app.getHttpServer())
      .put('/api/v1/me/two-factor')
      .set('Authorization', `Bearer ${res.body.session.accessToken}`)
      .send({ enabled: true, currentPassword: PASSWORD });
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email, password: PASSWORD });
    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    const right = await lastCode(user.id);
    const wrong = right === '000000' ? '111111' : '000000';
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/2fa/verify')
          .set(IOS)
          .send({ challengeId: login.body.challengeId, code: wrong }),
      ),
    );
    expect(
      results.filter((r) => r.body.code === 'TWO_FACTOR_CODE_INVALID').length,
    ).toBeLessThanOrEqual(4);
    const row = await prisma.twoFactorChallenge.findUniqueOrThrow({
      where: { id: login.body.challengeId },
    });
    expect(row.attempts).toBeLessThanOrEqual(5);
  });
});
