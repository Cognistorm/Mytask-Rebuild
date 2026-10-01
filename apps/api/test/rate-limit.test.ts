// SEC-35: global per-IP defaults (CONVENTIONS §14) and IPv6 /64 bucketing (SEC-42).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ENV, type Env } from '../src/platform/config/env';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ipBucket } from '../src/platform/client-ip/client-ip.resolver';
import { LIMITS } from '../src/platform/rate-limit/rate-limit.middleware';
import { createTestApp } from './app';

let app: NestExpressApplication;
beforeAll(async () => {
  app = await createTestApp();
  await app.get(RedisService).client.flushall();
});
afterAll(async () => {
  await app.get(RedisService).client.flushall();
  await app?.close();
});

describe('global rate limit (SEC-35)', () => {
  it('refuses a write above 120 per minute with 429 + Retry-After; health stays open', async () => {
    const redis = app.get(RedisService).client;
    const minute = Math.floor(Date.now() / 60_000);
    // Pre-fill the counter (current and next minute, so the test cannot straddle a boundary).
    for (const m of [minute, minute + 1])
      await redis.set(`rl:write:127.0.0.1:${m}`, String(LIMITS.write));
    const over = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset')
      .set('X-MyTask-Client', 'ios')
      .send({ email: 'y@example.com' });
    expect(over.status).toBe(429);
    expect(over.body.code).toBe('RATE_LIMITED');
    expect(Number(over.headers['retry-after'])).toBeGreaterThan(0);
    expect((await request(app.getHttpServer()).get('/api/v1/health')).status).toBe(200);
    await redis.flushall();
    const ok = await request(app.getHttpServer())
      .post('/api/v1/auth/password-reset')
      .set('X-MyTask-Client', 'ios')
      .send({ email: 'y@example.com' });
    expect(ok.status).toBe(202);
  });

  it('staff writes get the 120/min write budget, staff reads keep 1,200 (SEC-50, SEC-57)', async () => {
    const redis = app.get(RedisService).client;
    const minute = Math.floor(Date.now() / 60_000);
    for (const m of [minute, minute + 1])
      await redis.set(`rl:staff_write:127.0.0.1:${m}`, String(LIMITS.staff_write));
    const over = await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .set({ 'X-MyTask-Client': 'admin', Origin: 'http://localhost:3200' })
      .send({ login: 'nobody', password: 'x' });
    expect(over.status).toBe(429);
    expect((await request(app.getHttpServer()).get('/api/v1/admin/me')).status).toBe(401);
    await redis.flushall();
  });

  it('keys IPv6 clients by /64', () => {
    expect(ipBucket('2001:db8:1:2:aaaa::1')).toBe('2001:db8:1:2::/64');
    expect(ipBucket('2001:db8:1:2:bbbb:cccc:dddd:eeee')).toBe('2001:db8:1:2::/64');
    expect(ipBucket('203.0.113.9')).toBe('203.0.113.9');
  });
});

describe('pipeline order, body-parser errors and path case (SEC-50, SEC-39, SEC-51)', () => {
  const IOS = { 'X-MyTask-Client': 'ios', 'Content-Type': 'application/json' };

  it('the limiter counts requests before the body parser: invalid JSON over the budget answers 429', async () => {
    const redis = app.get(RedisService).client;
    const minute = Math.floor(Date.now() / 60_000);
    for (const m of [minute, minute + 1])
      await redis.set(`rl:write:127.0.0.1:${m}`, String(LIMITS.write));
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send('{"email": "a@example.com", "password": "Secr');
    expect(res.status).toBe(429);
    await redis.flushall();
  });

  it('malformed or oversized JSON is 400 VALIDATION_FAILED with X-Request-Id, never 500', async () => {
    const truncated = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send('{"email": "a@example.com", "password": "Secr');
    expect(truncated.status).toBe(400);
    expect(truncated.body.code).toBe('VALIDATION_FAILED');
    expect(truncated.body.details.fields[0]).toMatchObject({ field: 'body', code: 'invalid_json' });
    expect(truncated.headers['x-request-id']).toEqual(expect.any(String));
    expect(JSON.stringify(truncated.body)).not.toContain('Secr');
    const big = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .send(JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(1_100_000) }));
    expect(big.status).toBe(400);
    expect(big.body.details.fields[0]).toMatchObject({ field: 'body', code: 'too_large' });
  });

  it('a mixed-case admin path never reaches the staff handler (probe P4)', async () => {
    const publicOrigin = await request(app.getHttpServer())
      .post('/api/v1/Admin/auth/login')
      .set({ 'X-MyTask-Client': 'admin', Origin: app.get<Env>(ENV).APP_URL })
      .send({ login: 'nobody', password: 'x' });
    expect(publicOrigin.status).toBe(403);
    expect(publicOrigin.body.code).toBe('CSRF_CHECK_FAILED');
    const adminOrigin = await request(app.getHttpServer())
      .post('/api/v1/Admin/auth/login')
      .set({ 'X-MyTask-Client': 'admin', Origin: new URL(app.get<Env>(ENV).ADMIN_URL).origin })
      .send({ login: 'nobody', password: 'x' });
    expect(adminOrigin.status).toBe(404);
  });
});

describe('per-operation limits by IP (SEC-35 register, SEC-42 /64)', () => {
  const IOS = { 'X-MyTask-Client': 'ios' };
  const visitor = (ip: string) => ({
    'x-mytask-visitor-ip': ip,
    'x-mytask-service-auth': app.get<Env>(ENV).INTERNAL_SERVICE_TOKEN,
  });
  const newUser = (ip: string) => {
    const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set(IOS)
      .set(visitor(ip))
      .send({
        fullName: 'Rate Limit',
        username: `rl_${id}`,
        email: `rl${id}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
  };

  it('10 registrations per hour per IP (IPv6 by /64); the 11th answers 429 (Q-157)', async () => {
    const redis = app.get(RedisService).client;
    await redis.flushall();
    await redis.set('auth:register:ip:2001:db8:9:9::/64', '9', 'EX', 3600);
    expect((await newUser('2001:db8:9:9::1')).status).toBe(201);
    const over = await newUser('2001:db8:9:9::2');
    expect(over.status).toBe(429);
    expect(over.body.code).toBe('RATE_LIMITED');
    expect(Number(over.headers['retry-after'])).toBeGreaterThan(0);
    expect((await newUser('2001:db8:9:a::1')).status).toBe(201);
    await redis.flushall();
  });

  it('the S-062 login lock covers the whole /64', async () => {
    const redis = app.get(RedisService).client;
    await redis.flushall();
    const reg = await newUser('203.0.113.50');
    const email = reg.body.user?.email ?? reg.body.session?.user?.email;
    expect(email).toEqual(expect.any(String));
    for (let i = 1; i <= 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .set(IOS)
        .set(visitor(`2001:db8:7:7::${i}`))
        .send({ email, password: 'Wrong1234' });
    }
    const locked = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set(IOS)
      .set(visitor('2001:db8:7:7::99'))
      .send({ email, password: 'Secret123' });
    expect(locked.body.code).toBe('AUTH_LOGIN_LOCKED');
    await redis.flushall();
  });
});

describe('EV-02 "new registration waiting for approval" email (Q-159: S-131 switch, S-132 hourly cap)', () => {
  const set = async (registerId: string, key: string, value: unknown) => {
    const prisma = app.get(PrismaService);
    await prisma.setting.upsert({
      where: { key },
      create: { key, registerId, value: value as never, currentVersion: 1 },
      update: { value: value as never },
    });
    app.get(SettingsService).invalidate();
  };
  const register = () => {
    const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6)}`;
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        fullName: 'Pending User',
        username: `pe_${id}`,
        email: `pe${id}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
  };
  const ev02 = () => app.get(PrismaService).outboxEvent.count({ where: { eventType: 'EV-02' } });

  it('caps the emails per clock hour at S-132; S-131 OFF sends none; the users stay pending', async () => {
    const redis = app.get(RedisService).client;
    await redis.flushall();
    await set('S-052', 'auth.email_verification.required', true);
    await set('S-053', 'auth.email_verification.method', 'admin');
    await set('S-132', 'notifications.admin_new_registration.hourly_cap', 2);
    const before = await ev02();
    for (let i = 0; i < 3; i++)
      expect((await register()).body.outcome).toBe('pending_admin_review');
    expect((await ev02()) - before).toBe(2);

    await redis.flushall();
    await set('S-131', 'notifications.admin_new_registration.enabled', false);
    const off = await ev02();
    expect((await register()).body.outcome).toBe('pending_admin_review');
    expect(await ev02()).toBe(off);
    const prisma = app.get(PrismaService);
    await prisma.setting.deleteMany();
    app.get(SettingsService).invalidate();
    await redis.flushall();
  });
});
