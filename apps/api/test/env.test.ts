import { describe, expect, it } from 'vitest';
import { InvalidEnvironmentError, loadEnv } from '../src/platform/config/env';

const base = {
  DATABASE_URL: 'postgresql://u:secret-password@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  APP_URL: 'http://localhost:3100',
  ADMIN_URL: 'http://localhost:3200',
  JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY,
  JWT_PUBLIC_KEY: process.env.JWT_PUBLIC_KEY,
  INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,
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

  describe('production refusals (SEC-36, SEC-45)', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      APP_URL: 'https://mytask.ge',
      ADMIN_URL: 'https://admin.mytask.ge',
      SMTP_URL: 'smtp://mail.example:587',
      SETTINGS_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
      S3_ENDPOINT: 'https://s3.example',
      S3_ACCESS_KEY_ID: 'key',
      S3_SECRET_ACCESS_KEY: 'secret',
      PUBLIC_MEDIA_BASE_URL: 'https://media.mytask.ge',
      CLAMAV_HOST: 'clamav',
    };

    it('accepts a complete production environment', () => {
      expect(loadEnv({ ...prod }).NODE_ENV).toBe('production');
    });

    it.each([
      ['SMTP_URL', { SMTP_URL: undefined }],
      ['SETTINGS_ENCRYPTION_KEY', { SETTINGS_ENCRYPTION_KEY: undefined }],
      ['MAIL_TRANSPORT', { MAIL_TRANSPORT: 'log' }],
      ['REDIS_URL', { REDIS_URL: 'memory://local' }],
      ['S3_ENDPOINT', { S3_ENDPOINT: undefined }],
      ['S3_SECRET_ACCESS_KEY', { S3_SECRET_ACCESS_KEY: undefined }],
      ['PUBLIC_MEDIA_BASE_URL', { PUBLIC_MEDIA_BASE_URL: undefined }],
      ['CLAMAV_HOST', { CLAMAV_HOST: undefined }],
    ])('refuses to start without a safe %s', (name, change) => {
      expect(() => loadEnv({ ...prod, ...change })).toThrow(new RegExp(name));
    });

    it('runs without a scanner only when SCAN_PROVIDER=none is set explicitly (ADR-009 §6)', () => {
      const env = loadEnv({ ...prod, CLAMAV_HOST: undefined, SCAN_PROVIDER: 'none' });
      expect(env.SCAN_PROVIDER).toBe('none');
    });

    it('refuses SCAN_PROVIDER=clamav without CLAMAV_HOST', () => {
      expect(() => loadEnv({ ...base, SCAN_PROVIDER: 'clamav' })).toThrow(/CLAMAV_HOST/);
    });
  });
});
