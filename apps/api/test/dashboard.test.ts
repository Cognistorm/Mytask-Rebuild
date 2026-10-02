// Selling Home (ROADMAP 4.1.14; spec 02 AC-6, AC-7): getSellingDashboard. Ledger, gigs, orders, awards and
// conversations come with later slices, so a user gets the neutral values for now.
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
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `db_${n}`,
      email: `db${n}@example.com`,
      fullName: 'Nino Beridze',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({ where: { id: userId }, data: { status: 'active' } });
  return {
    userId,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

async function projectsEnabled(on: boolean) {
  await prisma.setting.upsert({
    where: { key: 'projects.enabled' },
    create: { key: 'projects.enabled', registerId: 'S-075', value: on, currentVersion: 1 },
    update: { value: on },
  });
  app.get(SettingsService).invalidate();
}

const selling = (auth: Auth) => http().get('/api/v1/me/dashboard/selling').set(auth);
const ZERO = { amount: 0, currency: 'GEL' };

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  // Registration allows 10 per IP and hour.
  await app.get(RedisService).client.flushall();
});

afterAll(async () => {
  await prisma?.setting.deleteMany({ where: { key: 'projects.enabled' } });
  app.get(SettingsService).invalidate();
  await app?.close();
});

describe('getSellingDashboard (AC-6, AC-7)', () => {
  it('needs a session', async () => {
    const res = await http().get('/api/v1/me/dashboard/selling').set({ 'X-MyTask-Client': 'ios' });
    expect(res.status).toBe(401);
  });

  it('gives a new user the welcome data, zero KPIs and empty lists', async () => {
    await projectsEnabled(true);
    const u = await member();
    const user = await prisma.user.findUniqueOrThrow({ where: { id: u.userId } });
    const res = await selling(u.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        fullName: 'Nino Beridze',
        isIdVerified: false,
        createdAt: user.createdAt.toISOString(),
      },
      kpis: {
        earnings: ZERO,
        availableBalance: ZERO,
        pendingBalance: ZERO,
        totalReach: 0,
        totalGigs: 0,
        awardedProjects: 0,
        completedOrders: 0,
        pendingOrders: 0,
        ordersInProgress: 0,
        canceledOrders: 0,
      },
      unreadContacts: [],
      latestOrders: [],
      latestAwardedProjects: [],
    });
  });

  it('shows the verified badge once a KYC verification is verified', async () => {
    const u = await member();
    const photo = await prisma.file.create({
      data: {
        purpose: 'kyc_document',
        ownerUserId: u.userId,
        bucket: 'kyc',
        objectKey: `test/${u.userId}/front`,
        originalName: 'a.jpg',
        declaredType: 'image/jpeg',
        sizeBytes: 1000n,
        status: 'ready',
      },
    });
    await prisma.kycVerification.create({
      data: {
        userId: u.userId,
        documentType: 'passport',
        frontFileId: photo.id,
        selfieFileId: photo.id,
        status: 'verified',
        reviewedAt: new Date(),
      },
    });
    const res = await selling(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.user.isIdVerified).toBe(true);
  });

  it('has no awarded-projects list while S-075 is OFF', async () => {
    await projectsEnabled(false);
    const u = await member();
    const res = await selling(u.auth);
    expect(res.status).toBe(200);
    expect(res.body.latestAwardedProjects).toBeNull();
    expect(res.body.kpis.awardedProjects).toBe(0);
    await projectsEnabled(true);
  });
});
