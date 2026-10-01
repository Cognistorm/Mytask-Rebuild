// SEC-37 (security review 02/04): old, replaced or cancelled 2FA challenges never come back; and the user
// re-authentication code path answers the contract's 422 for a stale challenge (ROADMAP 3.17c/e).
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
const bearer = (at: string) => ({ Authorization: `Bearer ${at}` });

async function register() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const res = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      fullName: 'Two Factor',
      username: `tf_${n}`,
      email: `tf${n}@example.com`,
      password: PASSWORD,
      acceptTerms: true,
    });
  return {
    email: `tf${n}@example.com`,
    id: res.body.session.user.id as string,
    at: res.body.session.accessToken as string,
  };
}

async function lastCode(userId: string): Promise<string> {
  const ev = await prisma.outboxEvent.findFirstOrThrow({
    where: { eventType: 'EV-06', aggregateId: userId },
    orderBy: { id: 'desc' },
  });
  return String((ev.payload as { params: { code: string } }).params.code);
}

/** A user with 2FA on, stopped at the code step of a new login. */
async function codeStep() {
  const u = await register();
  const on = await http()
    .put('/api/v1/me/two-factor')
    .set(bearer(u.at))
    .send({ enabled: true, currentPassword: PASSWORD });
  expect(on.status).toBe(200);
  const step = await http()
    .post('/api/v1/auth/login')
    .set(IOS)
    .send({ email: u.email, password: PASSWORD });
  expect(step.status).toBe(202);
  return { ...u, challengeId: step.body.challengeId as string };
}

const resend = (challengeId: string) =>
  http().post('/api/v1/auth/2fa/resend').set(IOS).send({ challengeId });
const verify = (challengeId: string, code: string) =>
  http().post('/api/v1/auth/2fa/verify').set(IOS).send({ challengeId, code });

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await app?.close();
});
beforeEach(async () => {
  await prisma.setting.deleteMany();
  app.get(SettingsService).invalidate();
  await app.get(RedisService).client.flushall();
});

describe('SEC-37: challenges cannot be revived', () => {
  it('a password change cancels the open login code: verify and resend both refuse it', async () => {
    const u = await codeStep();
    const code = await lastCode(u.id);
    const change = await http().post('/api/v1/me/password').set(bearer(u.at)).send({
      currentPassword: PASSWORD,
      password: 'NewSecret99',
      passwordConfirmation: 'NewSecret99',
    });
    expect(change.status).toBe(200);
    expect((await verify(u.challengeId, code)).body.code).toBe('TWO_FACTOR_CODE_EXPIRED');
    expect((await resend(u.challengeId)).status).toBe(404);
  });

  it('a password reset cancels the open login code', async () => {
    const u = await codeStep();
    await http().post('/api/v1/auth/password-reset').set(IOS).send({ email: u.email });
    const ev = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'EV-04' },
      orderBy: { id: 'desc' },
    });
    const token = (ev.payload as { params: { token: string } }).params.token;
    const done = await http().post('/api/v1/auth/password-reset/complete').set(IOS).send({
      email: u.email,
      token,
      password: 'NewSecret99',
      passwordConfirmation: 'NewSecret99',
    });
    expect(done.status).toBe(200);
    await app.get(RedisService).client.flushall();
    expect((await resend(u.challengeId)).status).toBe(404);
  });

  it('switching 2FA off cancels open codes', async () => {
    const u = await codeStep();
    const off = await http()
      .put('/api/v1/me/two-factor')
      .set(bearer(u.at))
      .send({ enabled: false, currentPassword: PASSWORD });
    expect(off.status).toBe(200);
    await app.get(RedisService).client.flushall();
    expect((await resend(u.challengeId)).status).toBe(404);
  });

  it('a replaced or old challenge cannot be resent; an exhausted one can (t_2fa_too_many_attempts)', async () => {
    const u = await codeStep();
    await app.get(RedisService).client.flushall();
    const second = await http()
      .post('/api/v1/auth/login')
      .set(IOS)
      .send({ email: u.email, password: PASSWORD });
    expect(second.status).toBe(202);
    await app.get(RedisService).client.flushall();
    expect((await resend(u.challengeId)).status).toBe(404); // replaced by the second login

    const good = await lastCode(u.id);
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) await verify(second.body.challengeId, bad);
    expect((await verify(second.body.challengeId, good)).body.code).toBe(
      'TWO_FACTOR_TOO_MANY_ATTEMPTS',
    );
    await app.get(RedisService).client.flushall();
    expect((await resend(second.body.challengeId)).status).toBe(202);
    expect((await verify(second.body.challengeId, await lastCode(u.id))).status).toBe(200);

    const third = await codeStep();
    await prisma.twoFactorChallenge.update({
      where: { id: third.challengeId },
      data: { createdAt: new Date(Date.now() - 31 * 60_000) },
    });
    await app.get(RedisService).client.flushall();
    expect((await resend(third.challengeId)).status).toBe(404);
  });
});

describe('user re-authentication code (accounts without a password)', () => {
  it('a used or wrong-purpose challenge answers 422 TWO_FACTOR_CODE_EXPIRED, not 500', async () => {
    const u = await register();
    await prisma.user.update({
      where: { id: u.id },
      data: { passwordHash: null, passwordAlgo: null },
    });
    const ch = await http()
      .post('/api/v1/me/two-factor/challenges')
      .set(bearer(u.at))
      .send({ purpose: 'revoke_sessions' });
    expect(ch.status).toBe(202);
    const body = { enabled: true, challengeId: ch.body.challengeId, code: await lastCode(u.id) };
    const wrongPurpose = await http().put('/api/v1/me/two-factor').set(bearer(u.at)).send(body);
    expect(wrongPurpose.status).toBe(422);
    expect(wrongPurpose.body.code).toBe('TWO_FACTOR_CODE_EXPIRED');
  });
});

describe('SEC-41: "remember me" is kept by the session', () => {
  const WEB = { 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' };
  const cookiesOf = (res: request.Response) => [res.headers['set-cookie'] ?? []].flat() as string[];
  const refreshCookie = (res: request.Response) =>
    cookiesOf(res).find((c) => c.startsWith('__Secure-mt_rt='))!;
  const cookiePair = (c: string) => c.split(';')[0]!;

  it('OFF: the refresh cookie stays a browser-session cookie after a refresh', async () => {
    const u = await register();
    const login = await http()
      .post('/api/v1/auth/login')
      .set(WEB)
      .send({ email: u.email, password: PASSWORD, rememberMe: false });
    expect(login.status).toBe(200);
    expect(refreshCookie(login)).not.toMatch(/Expires=/i);
    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set(WEB)
      .set('Cookie', cookiePair(refreshCookie(login)));
    expect(refreshed.status).toBe(200);
    expect(refreshCookie(refreshed)).toBeDefined();
    expect(refreshCookie(refreshed)).not.toMatch(/Expires=/i);
  });

  it('ON (default): the refresh cookie has an expiry', async () => {
    const u = await register();
    const login = await http()
      .post('/api/v1/auth/login')
      .set(WEB)
      .send({ email: u.email, password: PASSWORD, rememberMe: true });
    expect(refreshCookie(login)).toMatch(/Expires=/i);
  });

  it('the 2FA step carries the choice to the session it creates', async () => {
    const u = await register();
    await http()
      .put('/api/v1/me/two-factor')
      .set(bearer(u.at))
      .send({ enabled: true, currentPassword: PASSWORD });
    const step = await http()
      .post('/api/v1/auth/login')
      .set(WEB)
      .send({ email: u.email, password: PASSWORD, rememberMe: false });
    expect(step.status).toBe(202);
    const device = cookiesOf(step).find((c) => c.startsWith('__Host-mt_did='));
    const ok = await http()
      .post('/api/v1/auth/2fa/verify')
      .set(WEB)
      .set('Cookie', device ? cookiePair(device) : '')
      .send({ challengeId: step.body.challengeId, code: await lastCode(u.id) });
    expect(ok.status).toBe(200);
    expect(refreshCookie(ok)).not.toMatch(/Expires=/i);
    const session = await prisma.session.findFirstOrThrow({
      where: { userId: u.id },
      orderBy: { createdAt: 'desc' },
    });
    expect(session.rememberMe).toBe(false);
  });
});
