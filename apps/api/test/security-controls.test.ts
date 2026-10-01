// SEC-45: security controls that had no test yet — Redis fail-closed on authenticated calls, SecretBox
// tamper / wrong key (ADR-005 §8).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SessionsService } from '../src/modules/auth/sessions.service';
import { SecretBox } from '../src/platform/settings/secret-box';
import { createTestApp } from './app';

let app: NestExpressApplication;
beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app?.close();
});

describe('Redis is security-critical (ADR-002 §1, ADR-015 §6)', () => {
  it('an authenticated call answers 503 when the deny-list cannot be read, never "let through"', async () => {
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('X-MyTask-Client', 'ios')
      .send({
        fullName: 'Fail Closed',
        username: `fc_${Date.now().toString(36)}`,
        email: `fc${Date.now().toString(36)}@example.com`,
        password: 'Secret123',
        acceptTerms: true,
      });
    const auth = { Authorization: `Bearer ${reg.body.session.accessToken}` };
    const spy = vi
      .spyOn(app.get(SessionsService), 'deniedReason')
      .mockRejectedValue(new Error('redis down'));
    const me = await request(app.getHttpServer()).get('/api/v1/me').set(auth);
    expect(me.status).toBe(503);
    expect(me.body.code).toBe('SERVICE_UNAVAILABLE');
    spy.mockRestore();
    expect((await request(app.getHttpServer()).get('/api/v1/me').set(auth)).status).toBe(200);
  });
});

describe('SecretBox (ADR-005 §8)', () => {
  const key = Buffer.alloc(32, 1).toString('base64');
  const box = new SecretBox(key);

  it('round-trips, and refuses a tampered ciphertext, a wrong key or a missing key', () => {
    const sealed = box.seal('client-secret');
    expect(box.open(sealed)).toBe('client-secret');
    const bytes = Buffer.from(sealed.ciphertext, 'base64');
    bytes[0] = bytes[0]! ^ 0xff;
    expect(box.open({ ...sealed, ciphertext: bytes.toString('base64') })).toBeNull();
    expect(new SecretBox(Buffer.alloc(32, 2).toString('base64')).open(sealed)).toBeNull();
    expect(new SecretBox(undefined).open(sealed)).toBeNull();
    expect(() => new SecretBox(undefined).seal('x')).toThrow();
  });
});
