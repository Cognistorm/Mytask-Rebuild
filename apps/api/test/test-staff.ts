// Shared by API tests that need a signed-in staff member (Bearer token, S-060 code step from the outbox).
// The app must be created with STAFF_BODY_TOKENS_ENABLED=true.
import { hash, Algorithm } from '@node-rs/argon2';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { expect } from 'vitest';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '../src/modules/staff/permissions';
import { PrismaService } from '../src/platform/db/prisma.service';

const ADMIN = { 'X-MyTask-Client': 'admin', Origin: 'http://localhost:3200' };
const PASSWORD = 'StaffSecret1';
let seq = 0;
const uniq = () => `${Date.now().toString(36)}${(seq += 1)}`;

/** A staff member with the system Super-admin role, with the given permissions, or with no role at all. */
export async function makeStaff(app: NestExpressApplication, grant: 'super' | 'none' | string[]) {
  const prisma = app.get(PrismaService);
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code },
      create: { code, area: code.split('.')[0]! },
      update: {},
    });
  }
  let roleId: string | null = null;
  if (grant === 'super') {
    roleId = (
      await prisma.role.upsert({
        where: { code: SUPER_ADMIN_ROLE },
        create: { code: SUPER_ADMIN_ROLE, name: 'Super-admin', isSystem: true },
        update: {},
      })
    ).id;
  } else if (grant !== 'none') {
    roleId = (
      await prisma.role.create({
        data: {
          code: `test_role_${uniq()}`,
          name: 'Test role',
          permissions: { create: grant.map((permissionCode) => ({ permissionCode })) },
        },
      })
    ).id;
  }
  const n = uniq();
  const staff = await prisma.staff.create({
    data: {
      username: `tstaff_${n}`,
      fullName: 'Test Staff',
      email: `tstaff${n}@example.com`,
      passwordHash: await hash(PASSWORD, { algorithm: Algorithm.Argon2id }),
      passwordAlgo: 'argon2id',
      ...(roleId ? { roles: { create: { roleId } } } : {}),
    },
  });
  return { id: staff.id, auth: { Authorization: `Bearer ${await staffLogin(app, staff)}` } };
}

async function staffLogin(
  app: NestExpressApplication,
  staff: { username: string; email: string },
): Promise<string> {
  const http = () => request(app.getHttpServer());
  const res = await http()
    .post('/api/v1/admin/auth/login')
    .set(ADMIN)
    .send({ login: staff.username, password: PASSWORD });
  if (res.status === 200) return res.body.accessToken;
  expect(res.status).toBe(202);
  const rows = await app.get(PrismaService).outboxEvent.findMany({
    where: { eventType: 'EV-06' },
    orderBy: { id: 'desc' },
  });
  const row = rows.find((r) => (r.payload as { to?: string[] }).to?.includes(staff.email));
  const code = String((row!.payload as { params: { code: string } }).params.code);
  const verify = await http()
    .post('/api/v1/admin/auth/2fa/verify')
    .set(ADMIN)
    .send({ challengeId: res.body.challengeId, code });
  expect(verify.status).toBe(200);
  return verify.body.accessToken;
}
