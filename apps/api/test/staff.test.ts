// Slice 01 part B-1: staff login, IP ban, staff 2FA, step-up, admin settings (S-056 switch), audit, EV-124.
import { hash, Algorithm } from '@node-rs/argon2';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
    expect(
      await prisma.auditLog.count({ where: { action: 'security.ip_ban.auto' } }),
    ).toBeGreaterThan(0);
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
      await prisma.auditLog.count({ where: { action: 'settings.update', targetId: 'S-056' } }),
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
