// SEC-35: global per-IP defaults (CONVENTIONS §14) and IPv6 /64 bucketing (SEC-42).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RedisService } from '../src/platform/redis/redis.module';
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
