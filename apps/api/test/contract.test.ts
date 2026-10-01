// ADR-014 §3: a response that does not match openapi.yaml must fail in tests.
import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { HealthController } from '../src/platform/health/health.controller';
import { createTestApp } from './app';

describe('response validation against the contract', () => {
  const spy = vi
    .spyOn(HealthController.prototype, 'getHealth')
    .mockReturnValue({ status: 'degraded' } as never);
  afterAll(() => spy.mockRestore());

  it('turns a contract-breaking response into 500 INTERNAL_ERROR', async () => {
    const app = await createTestApp();
    try {
      const res = await request(app.getHttpServer()).get('/api/v1/health');
      expect(res.status).toBe(500);
      expect(res.body.code).toBe('INTERNAL_ERROR');
      expect(res.body.details.messageKey).toBe('t_toast_something_went_wrong');
      // no internal detail leaks to the client
      expect(JSON.stringify(res.body)).not.toContain('degraded');
    } finally {
      await app.close();
    }
  });
});
