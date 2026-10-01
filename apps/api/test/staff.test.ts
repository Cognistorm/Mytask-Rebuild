// Slice 01 part B-1: staff login, IP ban, staff 2FA, step-up, admin settings (S-056 switch), audit, EV-124.
import { hash, Algorithm } from '@node-rs/argon2';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ENV, type Env } from '../src/platform/config/env';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '../src/modules/staff/permissions';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
const ADMIN = { 'X-MyTask-Client': 'admin', Origin: 'http://localhost:3200' };
const PASSWORD = 'StaffSecret1';
let n = 0;

async function makeStaff(superAdmin = true) {
  n += 1;
  const role = await prisma.role.upsert({
    where: { code: SUPER_ADMIN_ROLE },
    create: { code: SUPER_ADMIN_ROLE, name: 'Super-admin', isSystem: true },
    update: {},
  });
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, area: code.split('.')[0]! },
      update: {},
    });
  }
  return prisma.staff.create({
    data: {
      username: `staff_${Date.now().toString(36)}${n}`,
      fullName: 'Staff Member',
      email: `staff${Date.now().toString(36)}${n}@example.com`,
      passwordHash: await hash(PASSWORD, { algorithm: Algorithm.Argon2id }),
      passwordAlgo: 'argon2id',
      ...(superAdmin ? { roles: { create: { roleId: role.id } } } : {}),
    },
  });
}

async function staffCode(email: string): Promise<string> {
  const rows = await prisma.outboxEvent.findMany({
    where: { eventType: 'EV-06' },
    orderBy: { id: 'desc' },
  });
  const row = rows.find((r) => (r.payload as { to?: string[] }).to?.includes(email));
  return String((row!.payload as { params: { code: string } }).params.code);
}

async function login(staff: { username: string; email: string }): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/admin/auth/login')
    .set(ADMIN)
    .send({ login: staff.username, password: PASSWORD });
  if (res.status === 200) return res.body.accessToken;
  expect(res.status).toBe(202);
  const verify = await request(app.getHttpServer())
    .post('/api/v1/admin/auth/2fa/verify')
    .set(ADMIN)
    .send({ challengeId: res.body.challengeId, code: await staffCode(staff.email) });
  expect(verify.status).toBe(200);
  return verify.body.accessToken;
}

beforeAll(async () => {
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
});
beforeEach(async () => {
  await prisma.bannedIp.deleteMany();
  await prisma.settingVersion.deleteMany();
  await prisma.setting.deleteMany();
  app.get(SettingsService).invalidate();
  await app.get(RedisService).client.flushall();
});

describe('staff login (spec 01 AC-29, AC-51; spec 16 AC-2)', () => {
  it('S-060 ON by default: code step, then a staff session; /admin/me lists every permission', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    const me = await request(app.getHttpServer())
      .get('/api/v1/admin/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      username: staff.username,
      isSuperAdmin: true,
      twoFactorRequired: true,
    });
    expect(me.body.permissions).toContain('settings.auth.write');
  });

  it('user tokens never open the admin, staff tokens never open user routes', async () => {
    const staff = await makeStaff();
    const staffToken = await login(staff);
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        fullName: 'U U U',
        username: `u_${Date.now()}`,
        email: `u${Date.now()}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    const userToken = user.body.session.accessToken;
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/me')
          .set('Authorization', `Bearer ${userToken}`)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/me')
          .set('Authorization', `Bearer ${staffToken}`)
      ).status,
    ).toBe(401);
  });

  it('S-064 failed logins from one IP ban it (even the right password is refused)', async () => {
    const staff = await makeStaff();
    for (let i = 0; i < 3; i++) {
      const r = await request(app.getHttpServer())
        .post('/api/v1/admin/auth/login')
        .set(ADMIN)
        .send({ login: staff.username, password: 'wrong' });
      expect(r.body.code).toBe('STAFF_LOGIN_FAILED');
    }
    const banned = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set(ADMIN)
      .send({ login: staff.username, password: PASSWORD });
    expect(banned.status).toBe(403);
    expect(banned.body.code).toBe('STAFF_IP_BANNED');
    expect(await prisma.auditLog.count({ where: { action: 'ip_ban.auto' } })).toBeGreaterThan(0);
  });
});

describe('staff login IP ban hardening (SEC-57)', () => {
  const attempt = (login: string, password: string, ip?: string) => {
    const req = request(app.getHttpServer()).post('/api/v1/admin/auth/login').set(ADMIN);
    if (ip)
      req.set({
        'x-mytask-visitor-ip': ip,
        'x-mytask-service-auth': app.get<Env>(ENV).INTERNAL_SERVICE_TOKEN,
      });
    return req.send({ login, password });
  };

  it('a parallel burst checks at most S-064 passwords, then the IP is banned (probe P1)', async () => {
    const staff = await makeStaff();
    const res = await Promise.all(
      Array.from({ length: 30 }, () => attempt(staff.username, 'wrong')),
    );
    const checked = res.filter((r) => r.body.code === 'STAFF_LOGIN_FAILED').length;
    expect(checked).toBeLessThanOrEqual(3);
    expect(res.filter((r) => r.status === 403).length).toBe(30 - checked);
    const row = await prisma.bannedIp.findUnique({ where: { ip: '127.0.0.1' } });
    expect(row?.bannedAt).not.toBeNull();
  });

  it('a correct password without completed 2FA does not clear earlier failures (probe P2)', async () => {
    const victim = await makeStaff();
    const other = await makeStaff();
    for (let i = 0; i < 2; i++)
      expect((await attempt(victim.username, 'wrong')).body.code).toBe('STAFF_LOGIN_FAILED');
    expect((await attempt(other.username, PASSWORD)).status).toBe(202); // S-060 ON: code step
    expect((await attempt(victim.username, 'wrong')).body.code).toBe('STAFF_LOGIN_FAILED');
    expect((await attempt(other.username, PASSWORD)).body.code).toBe('STAFF_IP_BANNED');
  });

  it('a completed login (after 2FA) clears the IP counter', async () => {
    const staff = await makeStaff();
    for (let i = 0; i < 2; i++) await attempt(staff.username, 'wrong');
    await login(staff);
    expect((await prisma.bannedIp.findUnique({ where: { ip: '127.0.0.1' } }))?.failedAttempts).toBe(
      0,
    );
    for (let i = 0; i < 2; i++)
      expect((await attempt(staff.username, 'wrong')).body.code).toBe('STAFF_LOGIN_FAILED');
  });

  it('IPv6 clients are counted and banned by /64; a manual single-address ban still applies', async () => {
    const staff = await makeStaff();
    for (const host of ['a', 'b', 'c'])
      await attempt(staff.username, 'wrong', `2001:db8:1:2::${host}`);
    expect((await attempt(staff.username, PASSWORD, '2001:db8:1:2::d')).body.code).toBe(
      'STAFF_IP_BANNED',
    );
    expect((await attempt(staff.username, PASSWORD, '2001:db8:1:3::1')).status).toBe(202);
    await prisma.bannedIp.create({
      data: { ip: '198.51.100.7', bannedAt: new Date(), source: 'manual' },
    });
    expect((await attempt(staff.username, PASSWORD, '198.51.100.7')).body.code).toBe(
      'STAFF_IP_BANNED',
    );
  });
});

describe('admin settings: the 2FA switch S-056 (spec 16 AC-51…AC-56, AC-7)', () => {
  it('needs a re-login, then saves a new version, audits it, emails S-100 and applies to users', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    const auth = { Authorization: `Bearer ${token}` };

    const list = await request(app.getHttpServer())
      .get('/api/v1/admin/settings?area=auth')
      .set(auth);
    expect(list.status).toBe(200);
    const s056 = list.body.settings.find((s: { registerId: string }) => s.registerId === 'S-056');
    expect(s056).toMatchObject({ value: true, version: 1, stepUpRequired: true, isCritical: true });

    const noStepUp = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/auth.two_factor.enabled')
      .set(auth)
      .send({ value: false, expectedVersion: 1 });
    expect(noStepUp.status).toBe(403);
    expect(noStepUp.body.code).toBe('REAUTH_REQUIRED');

    const wrong = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/reauth')
      .set(auth)
      .send({ method: 'password', password: 'nope' });
    expect(wrong.body.code).toBe('STAFF_CURRENT_PASSWORD_WRONG');
    const reauth = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/reauth')
      .set(auth)
      .send({ method: 'password', password: PASSWORD });
    expect(reauth.status).toBe(200);

    const off = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/auth.two_factor.enabled')
      .set(auth)
      .send({ value: false, expectedVersion: 1, reason: 'Owner: easy local log-in' });
    expect(off.status).toBe(200);
    expect(off.body).toMatchObject({
      value: false,
      version: 2,
      updatedBy: { username: staff.username },
    });

    const stale = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/auth.two_factor.enabled')
      .set(auth)
      .send({ value: true, expectedVersion: 1 });
    expect(stale.status).toBe(409);

    const bad = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/auth.login_throttle.max_attempts')
      .set(auth)
      .send({ value: 0, expectedVersion: 1 });
    expect(bad.status).toBe(400);
    expect(bad.body.details.fields[0].messageKey).toBe('t_setting_invalid_value');

    expect(
      await prisma.auditLog.count({ where: { action: 'setting.update', targetId: 'S-056' } }),
    ).toBe(1);
    expect(await prisma.settingVersion.count({ where: { key: 'auth.two_factor.enabled' } })).toBe(
      1,
    );
    const mail = await prisma.outboxEvent.findFirst({
      where: { eventType: 'EV-124' },
      orderBy: { id: 'desc' },
    });
    expect((mail!.payload as { to: string[] }).to).toContain('ir.gvazava@gmail.com');

    // Users see the switch hidden (AC-20, AC-28).
    const user = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        fullName: 'U U U',
        username: `v_${Date.now()}`,
        email: `v${Date.now()}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    expect(user.body.session.user.twoFactorAvailable).toBe(false);
  });

  it('public rows (task 3.4): listed as public; a limit accepts null = unlimited (R-2.2)', async () => {
    const staff = await makeStaff();
    const auth = { Authorization: `Bearer ${await login(staff)}` };

    const list = await request(app.getHttpServer()).get('/api/v1/admin/settings').set(auth);
    expect(list.status).toBe(200);
    const byId = (id: string) =>
      list.body.settings.find((s: { registerId: string }) => s.registerId === id);
    expect(byId('S-001')).toMatchObject({ value: 1, isPublic: true, area: 'plans' });
    expect(byId('S-008')).toMatchObject({ value: { amount: 999, currency: 'GEL' }, type: 'money' });
    expect(byId('S-065')).toMatchObject({ isPublic: false });
    expect(byId('S-100')).toMatchObject({ isPublic: false });

    const path = '/api/v1/admin/settings/plans.standard.gig_limit';
    const unlimited = await request(app.getHttpServer())
      .patch(path)
      .set(auth)
      .send({ value: null, expectedVersion: 1 });
    expect(unlimited.status).toBe(200);
    expect(unlimited.body).toMatchObject({ value: null, version: 2 });
    const back = await request(app.getHttpServer())
      .patch(path)
      .set(auth)
      .send({ value: 1, expectedVersion: 2 });
    expect(back.status).toBe(200);

    // Not nullable → null refused; structured rows other than S-130 wait for their slice 16 editors.
    const nullDays = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/escrow.auto_release.hours')
      .set(auth)
      .send({ value: null, expectedVersion: 1 });
    expect(nullDays.status).toBe(400);
    const branding = await request(app.getHttpServer())
      .patch('/api/v1/admin/settings/branding.site')
      .set(auth)
      .send({ value: { ios: '1.0.0', android: '1.0.0' }, expectedVersion: 1 });
    expect(branding.status).toBe(400);
  });

  it('a staff member without a role cannot read settings', async () => {
    const plain = await makeStaff(false);
    const token = await login(plain);
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/settings')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.details.permission).toBe('settings.read');
  });
});

describe('staff emailed re-authentication code (spec 16 AC-7, data-model §3.A staff_reauth)', () => {
  // Login codes and re-authentication codes share the send limits (60 s cooldown, 5 per 15 min).
  const clearSends = async (id: string) =>
    app
      .get(RedisService)
      .client.del(`auth:code:cooldown:staff:${id}`, `auth:code:sends:staff:${id}`);
  const reauthCode = (token: string) =>
    request(app.getHttpServer())
      .post('/api/v1/admin/auth/reauth/code')
      .set(ADMIN)
      .set('Authorization', `Bearer ${token}`);
  const reauth = (token: string, body: object) =>
    request(app.getHttpServer())
      .post('/api/v1/admin/auth/reauth')
      .set(ADMIN)
      .set('Authorization', `Bearer ${token}`)
      .send(body);

  it('S-060 ON: code by email, 60 s cooldown, the code opens the step-up window once', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    await clearSends(staff.id);
    const sent = await reauthCode(token);
    expect(sent.status).toBe(202);
    expect(sent.body).toMatchObject({ channel: 'email', challengeId: expect.any(String) });
    const wait = await reauthCode(token);
    expect(wait.status).toBe(429);
    expect(wait.body.code).toBe('STAFF_TWO_FACTOR_RESEND_WAIT');
    const body = {
      method: 'email_code',
      challengeId: sent.body.challengeId,
      code: await staffCode(staff.email),
    };
    const ok = await reauth(token, body);
    expect(ok.status).toBe(200);
    expect(ok.body.reauthenticatedUntil).toEqual(expect.any(String));
    const replay = await reauth(token, body); // single use
    expect(replay.status).toBe(422);
    expect(replay.body.code).toBe('STAFF_TWO_FACTOR_CODE_EXPIRED');
    for (const action of ['staff.reauth_code.request', 'staff.reauth'])
      expect(await prisma.auditLog.count({ where: { action, actorStaffId: staff.id } })).toBe(1);
  });

  it('only a staff_reauth code of the same staff member is accepted', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    // A login code (purpose login) is refused.
    await clearSends(staff.id);
    const loginStart = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set(ADMIN)
      .send({ login: staff.username, password: PASSWORD });
    expect(loginStart.status).toBe(202);
    const wrongPurpose = await reauth(token, {
      method: 'email_code',
      challengeId: loginStart.body.challengeId,
      code: await staffCode(staff.email),
    });
    expect(wrongPurpose.body.code).toBe('STAFF_TWO_FACTOR_CODE_EXPIRED');
    // Another staff member's re-authentication code is refused.
    const other = await makeStaff();
    const otherToken = await login(other);
    await clearSends(other.id);
    const otherCode = await reauthCode(otherToken);
    expect(
      (
        await reauth(token, {
          method: 'email_code',
          challengeId: otherCode.body.challengeId,
          code: await staffCode(other.email),
        })
      ).status,
    ).toBe(422);
  });

  it('wrong codes share the SEC-04 counter: after S-062 even the right password is refused', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    for (let i = 0; i < 5; i++) {
      await clearSends(staff.id);
      const sent = await reauthCode(token);
      const wrong = await reauth(token, {
        method: 'email_code',
        challengeId: sent.body.challengeId,
        code: '000000' === (await staffCode(staff.email)) ? '111111' : '000000',
      });
      expect(wrong.body.code).toBe('STAFF_TWO_FACTOR_CODE_INVALID');
    }
    const locked = await reauth(token, { method: 'password', password: PASSWORD });
    expect(locked.status).toBe(429);
    expect(locked.body.code).toBe('RATE_LIMITED');
  });

  it('S-060 OFF: no code is sent and email_code is refused (422)', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    await prisma.setting.create({
      data: {
        key: 'auth.two_factor.staff_required',
        registerId: 'S-060',
        value: false,
        currentVersion: 1,
      },
    });
    app.get(SettingsService).invalidate();
    const sent = await reauthCode(token);
    expect(sent.status).toBe(422);
    expect(sent.body.code).toBe('BUSINESS_RULE_VIOLATION');
    const code = await reauth(token, {
      method: 'email_code',
      challengeId: '00000000-0000-4000-8000-000000000000',
      code: '123456',
    });
    expect(code.status).toBe(422);
  });
});

describe('part B-2a: IP bans, own password, activate, ban', () => {
  const registerUser = (extra: object = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        fullName: 'U U U',
        username: `w_${Date.now()}${Math.floor(Math.random() * 1000)}`,
        email: `w${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
        ...extra,
      });

  it('banned IPs: add, list, duplicate, remove (spec 01 AC-52)', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const add = await request(app.getHttpServer())
      .post('/api/v1/admin/ip-bans')
      .set(auth)
      .send({ ip: '198.51.100.7', note: 'test' });
    expect(add.status).toBe(201);
    expect(add.body).toMatchObject({ ip: '198.51.100.7', source: 'manual' });
    const dup = await request(app.getHttpServer())
      .post('/api/v1/admin/ip-bans')
      .set(auth)
      .send({ ip: '198.51.100.7' });
    expect(dup.status).toBe(409);
    const list = await request(app.getHttpServer()).get('/api/v1/admin/ip-bans').set(auth);
    expect(list.body.data.map((b: { ip: string }) => b.ip)).toContain('198.51.100.7');
    expect(
      (await request(app.getHttpServer()).delete('/api/v1/admin/ip-bans/198.51.100.7').set(auth))
        .status,
    ).toBe(204);
    expect(
      (await request(app.getHttpServer()).delete('/api/v1/admin/ip-bans/198.51.100.7').set(auth))
        .status,
    ).toBe(404);
  });

  it('bans are stored in one canonical spelling and match any spelling (SEC-60)', async () => {
    const staff = await makeStaff();
    const auth = { Authorization: `Bearer ${await login(staff)}` };
    const ban = (ip: string) =>
      request(app.getHttpServer()).post('/api/v1/admin/ip-bans').set(auth).send({ ip });
    const v6 = await ban('2001:0DB8:0:0::1');
    expect(v6.body.ip).toBe('2001:db8::1');
    expect((await ban('2001:db8::1')).status).toBe(409);
    expect((await ban('::ffff:203.0.113.5')).body.ip).toBe('203.0.113.5');
    // The mapped spelling bans the plain IPv4 client.
    const viaSsr = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set(ADMIN)
      .set({
        'x-mytask-visitor-ip': '203.0.113.5',
        'x-mytask-service-auth': app.get<Env>(ENV).INTERNAL_SERVICE_TOKEN,
      })
      .send({ login: staff.username, password: PASSWORD });
    expect(viaSsr.body.code).toBe('STAFF_IP_BANNED');
    expect(
      (await request(app.getHttpServer()).delete('/api/v1/admin/ip-bans/2001:DB8:0::1').set(auth))
        .status,
    ).toBe(204);
    // An automatic /64 ban is removed by its prefix (URL-encoded slash) in any spelling.
    await prisma.bannedIp.create({
      data: { ip: '2001:db8:1:2::/64', bannedAt: new Date(), failedAttempts: 3 },
    });
    expect(
      (
        await request(app.getHttpServer())
          .delete(`/api/v1/admin/ip-bans/${encodeURIComponent('2001:DB8:1:2:0::/64')}`)
          .set(auth)
      ).status,
    ).toBe(204);
    expect(
      (await request(app.getHttpServer()).delete('/api/v1/admin/ip-bans/not-an-ip').set(auth))
        .status,
    ).toBe(404);
    expect(
      await prisma.auditLog.count({ where: { action: 'ip_ban.create', actorStaffId: staff.id } }),
    ).toBe(2);
    expect(
      await prisma.auditLog.count({ where: { action: 'ip_ban.delete', actorStaffId: staff.id } }),
    ).toBe(2);
  });

  it('logout writes staff.logout (SEC-59)', async () => {
    const staff = await makeStaff();
    const token = await login(staff);
    const out = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/logout')
      .set(ADMIN)
      .set('Authorization', `Bearer ${token}`);
    expect(out.status).toBe(204);
    expect(
      await prisma.auditLog.count({ where: { action: 'staff.logout', actorStaffId: staff.id } }),
    ).toBe(1);
  });

  it('own password change ends the other staff sessions (spec 16 AC-6)', async () => {
    const staff = await makeStaff();
    const first = await login(staff);
    await app.get(RedisService).client.flushall(); // new device -> new code, not throttled
    const second = await login(staff);
    const wrong = await request(app.getHttpServer())
      .post('/api/v1/admin/me/password')
      .set('Authorization', `Bearer ${second}`)
      .send({
        currentPassword: 'nope',
        newPassword: 'NewStaff99',
        newPasswordConfirmation: 'NewStaff99',
      });
    expect(wrong.body.code).toBe('STAFF_CURRENT_PASSWORD_WRONG');
    const ok = await request(app.getHttpServer())
      .post('/api/v1/admin/me/password')
      .set('Authorization', `Bearer ${second}`)
      .send({
        currentPassword: PASSWORD,
        newPassword: 'NewStaff99',
        newPasswordConfirmation: 'NewStaff99',
      });
    expect(ok.status).toBe(204);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/me')
          .set('Authorization', `Bearer ${first}`)
      ).status,
    ).toBe(401);
    expect(
      (
        await request(app.getHttpServer())
          .get('/api/v1/admin/me')
          .set('Authorization', `Bearer ${second}`)
      ).status,
    ).toBe(200);
  });

  it('activate a pending user: idempotent replay, EV-03, then 409 (spec 01 AC-5)', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    await prisma.setting.create({
      data: {
        key: 'auth.email_verification.required',
        registerId: 'S-052',
        value: true,
        currentVersion: 1,
      },
    });
    app.get(SettingsService).invalidate();
    const pending = await registerUser();
    expect(pending.body.outcome).toBe('pending_admin_review');
    const user = await prisma.user.findFirstOrThrow({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });
    const noKey = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${user.id}/activate`)
      .set(auth)
      .send({});
    expect(noKey.status).toBe(400);
    const first = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${user.id}/activate`)
      .set({ ...auth, 'Idempotency-Key': '0190f5c2-7d3a-7cc1-9b1e-000000000001' })
      .send({});
    expect(first.status).toBe(200);
    expect(first.body.user.status).toBe('active');
    const replay = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${user.id}/activate`)
      .set({ ...auth, 'Idempotency-Key': '0190f5c2-7d3a-7cc1-9b1e-000000000001' })
      .send({});
    expect(replay.status).toBe(200);
    expect(replay.headers['idempotent-replayed']).toBe('true');
    const again = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${user.id}/activate`)
      .set({ ...auth, 'Idempotency-Key': '0190f5c2-7d3a-7cc1-9b1e-000000000002' })
      .send({});
    expect(again.status).toBe(409);
    expect(
      await prisma.outboxEvent.count({ where: { eventType: 'EV-03', aggregateId: user.id } }),
    ).toBe(1);
  });

  it('ban ends every session at once (spec 01 AC-45)', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const reg = await registerUser();
    const userToken = reg.body.session.accessToken;
    const ban = await request(app.getHttpServer())
      .post(`/api/v1/admin/users/${reg.body.session.user.id}/ban`)
      .set(auth)
      .send({ reason: 'spam' });
    expect(ban.status).toBe(200);
    const me = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(me.status).toBe(403);
    expect(me.body.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('an account with a password gets 409 when asking for an emailed confirmation code', async () => {
    const reg = await registerUser();
    const res = await request(app.getHttpServer())
      .post('/api/v1/me/two-factor/challenges')
      .set('Authorization', `Bearer ${reg.body.session.accessToken}`)
      .send({ purpose: 'revoke_sessions' });
    expect(res.status).toBe(409);
  });
});

describe('part B-2b: restrictions and appeals (spec 01 AC-19, AC-46…AC-50; spec 16 AC-19, AC-29)', () => {
  const api = () => request(app.getHttpServer());
  async function restrictedUser(auth: Record<string, string>, filesRequired = false) {
    const reg = await api()
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        fullName: 'R R R',
        username: `r_${Date.now()}${Math.floor(Math.random() * 1000)}`,
        email: `r${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    const userId: string = reg.body.session.user.id;
    const created = await api()
      .post('/api/v1/admin/restrictions')
      .set(auth)
      .send({ userId, message: 'Please explain the reviews.', filesRequired });
    expect(created.status).toBe(201);
    return {
      userId,
      restrictionId: created.body.id as string,
      user: { Authorization: `Bearer ${reg.body.session.accessToken}` },
    };
  }

  it('restrict → only restriction operations are allowed; appeal → reject → no second appeal', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const r = await restrictedUser(auth);
    expect(
      await prisma.outboxEvent.count({
        where: { eventType: 'EV-07', aggregateId: r.restrictionId },
      }),
    ).toBe(1);
    expect(
      await prisma.auditLog.count({ where: { action: 'restriction.create', targetId: r.userId } }),
    ).toBe(1);

    const blocked = await api().get('/api/v1/me/sessions').set(r.user);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('ACCOUNT_RESTRICTED');
    const mine = await api().get('/api/v1/me/restrictions').set(r.user);
    expect(mine.status).toBe(200);
    expect(mine.body.data[0]).toMatchObject({
      id: r.restrictionId,
      status: 'pending',
      canAppeal: true,
      appeal: null,
    });

    const files = await api()
      .post('/api/v1/restriction-appeals')
      .set(r.user)
      .send({
        restrictionId: r.restrictionId,
        message: 'x',
        fileIds: ['0190f5c2-7d3a-7cc1-9b1e-000000000009'],
      });
    expect(files.status).toBe(422);
    const appeal = await api()
      .post('/api/v1/restriction-appeals')
      .set(r.user)
      .send({ restrictionId: r.restrictionId, message: 'It was a mistake.' });
    expect(appeal.status).toBe(201);
    expect(appeal.body).toMatchObject({
      status: 'submitted',
      canAppeal: false,
      appeal: { message: 'It was a mistake.' },
    });
    const ev08 = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'EV-08', aggregateId: r.restrictionId },
    });
    expect((ev08.payload as { to: string[] }).to.length).toBeGreaterThan(0);
    const twice = await api()
      .post('/api/v1/restriction-appeals')
      .set(r.user)
      .send({ restrictionId: r.restrictionId, message: 'Again.' });
    expect(twice.status).toBe(409);

    const queue = await api().get('/api/v1/admin/restriction-appeals').set(auth);
    const item = queue.body.data.find(
      (a: { restriction: { id: string } }) => a.restriction.id === r.restrictionId,
    );
    expect(item.owner.isRestricted).toBe(true);
    const noReason = await api()
      .post(`/api/v1/admin/restriction-appeals/${item.id}/reject`)
      .set(auth)
      .send({});
    expect(noReason.status).toBe(400);
    const rejected = await api()
      .post(`/api/v1/admin/restriction-appeals/${item.id}/reject`)
      .set(auth)
      .send({ reason: 'Not convincing.' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.restriction).toMatchObject({
      status: 'rejected',
      decisionReason: 'Not convincing.',
    });
    const late = await api()
      .post(`/api/v1/admin/restriction-appeals/${item.id}/approve`)
      .set(auth)
      .send({});
    expect(late.status).toBe(409);
    expect(late.body.details.messageKey).toBe('t_item_already_decided');
    expect(
      await prisma.outboxEvent.count({
        where: { eventType: 'EV-10', aggregateId: r.restrictionId },
      }),
    ).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: r.userId } })).isRestricted).toBe(
      true,
    );
    const after = await api().get('/api/v1/me/restrictions').set(r.user);
    expect(after.body.data[0]).toMatchObject({ status: 'rejected', canAppeal: false });
  });

  it('approve lifts the flag only when no other restriction is open; delete lifts it too', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const r = await restrictedUser(auth);
    const second = await api()
      .post('/api/v1/admin/restrictions')
      .set(auth)
      .send({ userId: r.userId, message: 'Second one.', filesRequired: false });
    await api()
      .post('/api/v1/restriction-appeals')
      .set(r.user)
      .send({ restrictionId: r.restrictionId, message: 'Sorry.' });
    const appeal = await prisma.restrictionAppeal.findUniqueOrThrow({
      where: { restrictionId: r.restrictionId },
    });
    const ok = await api()
      .post(`/api/v1/admin/restriction-appeals/${appeal.id}/approve`)
      .set(auth)
      .send({ note: 'fine' });
    expect(ok.status).toBe(200);
    expect(ok.body.restriction).toMatchObject({ status: 'approved', decisionReason: null });
    expect(
      await prisma.outboxEvent.count({
        where: { eventType: 'EV-09', aggregateId: r.restrictionId },
      }),
    ).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: r.userId } })).isRestricted).toBe(
      true,
    );

    const del = await api().delete(`/api/v1/admin/restrictions/${second.body.id}`).set(auth);
    expect(del.status).toBe(204);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: r.userId } })).isRestricted).toBe(
      false,
    );
    expect((await api().get('/api/v1/me/sessions').set(r.user)).status).toBe(200);
    const list = await api()
      .get('/api/v1/admin/restrictions')
      .query({ userId: r.userId })
      .set(auth);
    expect(list.body.data.map((x: { status: string }) => x.status)).toEqual(['approved']);
  });

  it('files required: an appeal without files is refused (spec 01 AC-47)', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const r = await restrictedUser(auth, true);
    const res = await api()
      .post('/api/v1/restriction-appeals')
      .set(r.user)
      .send({ restrictionId: r.restrictionId, message: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  it('staff without users.restrict cannot restrict; other users cannot appeal someone else’s restriction', async () => {
    const auth = { Authorization: `Bearer ${await login(await makeStaff())}` };
    const r = await restrictedUser(auth);
    const other = await restrictedUser(auth);
    const foreign = await api()
      .post('/api/v1/restriction-appeals')
      .set(other.user)
      .send({ restrictionId: r.restrictionId, message: 'x' });
    expect(foreign.status).toBe(404);
    const plain = { Authorization: `Bearer ${await login(await makeStaff(false))}` };
    const denied = await api()
      .post('/api/v1/admin/restrictions')
      .set(plain)
      .send({ userId: r.userId, message: 'x', filesRequired: false });
    expect(denied.status).toBe(403);
  });
});

describe('part B-2c: social-login provider rows S-065…S-069 (ADR-005 §8, Q-155; spec 16 AC-54, 00 EC-10)', () => {
  it('secret is write-only: never returned or audited; ON without keys refused; keys switch the login on', async () => {
    const staff = await makeStaff();
    const auth = { Authorization: `Bearer ${await login(staff)}` };
    const api = () => request(app.getHttpServer());
    await api()
      .post('/api/v1/admin/auth/reauth')
      .set(auth)
      .send({ method: 'password', password: PASSWORD });
    const path = '/api/v1/admin/settings/auth.social.google';

    const initial = await api().get(path).set(auth);
    expect(initial.body).toMatchObject({
      isSecret: true,
      isSet: false,
      value: { isEnabled: false, clientId: null, clientSecret: { isSet: false, updatedAt: null } },
    });

    const noKeys = await api()
      .patch(path)
      .set(auth)
      .send({ value: { isEnabled: true, clientId: 'cid' }, expectedVersion: 1 });
    expect(noKeys.status).toBe(422);
    expect(noKeys.body.code).toBe('BUSINESS_RULE_VIOLATION');

    const saved = await api()
      .patch(path)
      .set(auth)
      .send({
        value: { isEnabled: true, clientId: 'cid-1', clientSecret: 'top-secret-value' },
        expectedVersion: 1,
      });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({
      isSet: true,
      version: 2,
      value: { isEnabled: true, clientId: 'cid-1' },
    });
    expect(JSON.stringify(saved.body)).not.toContain('top-secret-value');

    const stored = await prisma.setting.findUniqueOrThrow({ where: { key: 'auth.social.google' } });
    expect(JSON.stringify(stored.value)).not.toContain('top-secret-value');
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'setting.update', targetId: 'S-065' },
      orderBy: { id: 'desc' },
    });
    expect(JSON.stringify([audit.before, audit.after, audit.reason])).not.toContain(
      'top-secret-value',
    );
    expect(audit.after).toMatchObject({
      value: { clientSecretSet: true, clientSecretReplaced: true },
    });
    const ev = await prisma.outboxEvent.findFirstOrThrow({
      where: { eventType: 'EV-124', aggregateId: 'S-065' },
    });
    expect(JSON.stringify(ev.payload)).not.toContain('top-secret-value');

    // The login now starts with the saved client ID; omitting the secret keeps it.
    app.get(SettingsService).invalidate();
    const start = await api()
      .post('/api/v1/auth/social/google/authorize')
      .set({ 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' })
      .send({ redirectUri: 'http://localhost:3100/auth/google/callback' });
    expect(start.status).toBe(200);
    expect(new URL(start.body.authorizationUrl).searchParams.get('client_id')).toBe('cid-1');
    const kept = await api()
      .patch(path)
      .set(auth)
      .send({ value: { isEnabled: true, clientId: 'cid-2' }, expectedVersion: 2 });
    expect(kept.status).toBe(200);
    expect(kept.body.isSet).toBe(true);

    // Clearing the secret while ON is refused; switching off and clearing works.
    const clearOn = await api()
      .patch(path)
      .set(auth)
      .send({
        value: { isEnabled: true, clientId: 'cid-2', clientSecret: null },
        expectedVersion: 3,
      });
    expect(clearOn.status).toBe(422);
    const off = await api()
      .patch(path)
      .set(auth)
      .send({
        value: { isEnabled: false, clientId: null, clientSecret: null },
        expectedVersion: 3,
      });
    expect(off.status).toBe(200);
    app.get(SettingsService).invalidate();
    const disabled = await api()
      .post('/api/v1/auth/social/google/authorize')
      .set({ 'X-MyTask-Client': 'web', Origin: 'http://localhost:3100' })
      .send({ redirectUri: 'http://localhost:3100/auth/google/callback' });
    expect(disabled.status).toBe(403);
  });
});
