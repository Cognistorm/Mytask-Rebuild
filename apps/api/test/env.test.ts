import { describe, expect, it } from 'vitest';
import { InvalidEnvironmentError, loadEnv } from '../src/platform/config/env';

const base = {
  DATABASE_URL: 'postgresql://u:secret-password@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  APP_URL: 'http://localhost:3100',
  ADMIN_URL: 'http://localhost:3200',
};

describe('loadEnv (ADR-013 §8 boot validation)', () => {
  it('accepts a complete environment and applies defaults', () => {
    const env = loadEnv({ ...base });
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.TRUSTED_PROXY_IPS).toEqual([]);
  });

  it('refuses to start when a required variable is missing', () => {
    expect(() => loadEnv({ ...base, DATABASE_URL: undefined })).toThrow(InvalidEnvironmentError);
  });

  it('never echoes values in the error (secrets stay out of logs)', () => {
    try {
      loadEnv({ ...base, REDIS_URL: 'not a url with hunter2' });
      expect.unreachable();
    } catch (e) {
      expect(String(e)).toContain('REDIS_URL');
      expect(String(e)).not.toContain('hunter2');
    }
  });

  it('refuses STAFF_BODY_TOKENS_ENABLED in production (ADR-002 §2)', () => {
    expect(() =>
      loadEnv({ ...base, NODE_ENV: 'production', STAFF_BODY_TOKENS_ENABLED: 'true' }),
    ).toThrow(/STAFF_BODY_TOKENS_ENABLED/);
  });

  it('treats empty values (copied from .env.example) as not set', () => {
    const env = loadEnv({ ...base, LOG_LEVEL: '', OPENAPI_VALIDATE_RESPONSES: '', PORT: '' });
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.PORT).toBe(3000);
    expect(() => loadEnv({ ...base, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('parses TRUSTED_PROXY_IPS as a list', () => {
    expect(
      loadEnv({ ...base, TRUSTED_PROXY_IPS: '172.30.0.10, 172.30.0.11' }).TRUSTED_PROXY_IPS,
    ).toEqual(['172.30.0.10', '172.30.0.11']);
  });
});
