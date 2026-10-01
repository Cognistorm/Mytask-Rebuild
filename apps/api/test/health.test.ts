// getHealth + the cross-cutting HTTP pipeline (error shape, request id, contract validation, i18n).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from './app';

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createTestApp();
});
afterAll(async () => {
  await app?.close();
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('GET /api/v1/health (getHealth)', () => {
  it('answers 200 {status: ok}, validated against the contract', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('returns a server-generated X-Request-Id, ignoring the caller value', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('X-Request-Id', 'attacker-chosen');
    expect(res.headers['x-request-id']).toMatch(UUID);
  });

  it('does not reveal the framework', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('error body { code, message, details } (CONVENTIONS §7)', () => {
  it('unknown path -> 404 NOT_FOUND, Georgian by default', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/does-not-exist').expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
    expect(res.body.details.messageKey).toBe('t_page_not_fount');
    expect(res.body.message).toMatch(/[ა-ჿ]/); // Mkhedruli
  });

  it('localizes the message with Accept-Language: en', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('Accept-Language', 'en')
      .expect(404);
    expect(res.body.message).toBe('Page not found');
  });

  it('unsupported Accept-Language falls back to ka', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('Accept-Language', 'fr');
    expect(res.body.message).toMatch(/[ა-ჿ]/);
  });

  it('wrong method on a contract path -> 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer())
      .delete('/api/v1/health')
      .set('X-MyTask-Client', 'ios');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('unknown query parameter -> 400 VALIDATION_FAILED with details.fields', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health?foo=1').expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(Array.isArray(res.body.details.fields)).toBe(true);
  });

  it('non-JSON body -> 400 with field `body`, code unsupported_content_type (QA P3 BUG-12a)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('X-MyTask-Client', 'ios')
      .set('Content-Type', 'text/plain')
      .send('email=a@b.ge');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.details.fields).toEqual([
      expect.objectContaining({ field: 'body', code: 'unsupported_content_type' }),
    ]);
  });
});

describe('client IP safety (ADR-013 §16)', () => {
  it('Express trust proxy is off', () => {
    expect(app.getHttpAdapter().getInstance().get('trust proxy')).toBe(false);
  });
});

describe('request id on early refusals (QA P3 bug 2)', () => {
  it('a request refused by the contract validator still carries X-Request-Id', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health?foo=1');
    expect(res.status).toBe(400);
    expect(res.headers['x-request-id']).toMatch(UUID);
  });
});

describe('Accept-Language normalisation (ADR-006 §2)', () => {
  it('browser-style and wildcard values are served (en-US -> en, * -> ka)', async () => {
    const en = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('Accept-Language', 'en-US,en;q=0.9');
    expect(en.body.message).toBe('Page not found');
    const any = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Accept-Language', '*');
    expect(any.status).toBe(200);
  });
});
