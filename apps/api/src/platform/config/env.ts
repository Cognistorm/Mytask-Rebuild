// Boot-time configuration validation (architecture §6, ADR-013 §8): the process refuses to start when a
// required variable is missing or weak. Names are documented in /.env.example (values never in git).
// Variables of later slices (JWT, BOG, SendGrid, S3, ...) are added here by the slice that uses them.
import { z } from 'zod';

const bool = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    /** HTTP port of the public API process. */
    PORT: z.coerce.number().int().positive().default(3000),
    /** Internal readiness port (DB, Redis) — never routed by Caddy (architecture §7.11). */
    READINESS_PORT: z.coerce.number().int().positive().default(3001),
    /** Internal readiness port of the worker process. */
    WORKER_READINESS_PORT: z.coerce.number().int().positive().default(3002),
    /** Interface the readiness servers bind to. Loopback by default, so `pnpm dev` never exposes them on the LAN. */
    READINESS_HOST: z.string().min(1).default('127.0.0.1'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    /** redis://… ; `memory://` = in-process Redis for Docker-free local previews only (refused in production). */
    REDIS_URL: z.url({ protocol: /^(rediss?|memory)$/ }),
    APP_URL: z.url(),
    ADMIN_URL: z.url(),
    /** Caddy's fixed address(es) on the edge network (ADR-013 §16). Empty when running without Caddy. */
    TRUSTED_PROXY_IPS: csv,
    /** Path to the bundled contract; defaults to the repository copy. */
    OPENAPI_SPEC_PATH: z.string().optional(),
    /** Response validation against the contract (ADR-014 §3): on in development and tests, off in production. */
    OPENAPI_VALIDATE_RESPONSES: z.enum(['true', 'false']).optional(),
    /** Ed25519 key pair for access tokens (ADR-002 §1), base64 of the PEM text (`pnpm setup:env` creates one). */
    JWT_PRIVATE_KEY: z.string().min(40),
    JWT_PUBLIC_KEY: z.string().min(40),
    /** SSR -> API visitor-IP credential (ADR-013 §17), at least 256 bits. */
    INTERNAL_SERVICE_TOKEN: z
      .string()
      .min(43, 'must be at least 256 bits (e.g. openssl rand -hex 32)'),
    /** Email: SMTP (Mailpit locally; SendGrid SMTP relay in production, spec 15). */
    SMTP_URL: z.string().optional(),
    /** `smtp` (default) or `log` = print emails in the worker console (Docker-free local preview; refused in production). */
    MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('smtp'),
    MAIL_FROM_ADDRESS: z.email().default('no-reply@mytask.ge'),
    MAIL_FROM_NAME: z.string().default('MyTask.ge'),
    /** AES-256-GCM key for secret settings (social-login client secrets, ADR-005 §8): base64 of 32 bytes. */
    SETTINGS_ENCRYPTION_KEY: z
      .string()
      .refine((v) => Buffer.from(v, 'base64').length === 32, 'must be base64 of 32 random bytes')
      .optional(),
    /** reCAPTCHA v3 site key (public, not a secret); sent to clients by getPublicConfig while S-061 is ON. */
    RECAPTCHA_SITE_KEY: z.string().optional(),
    /** reCAPTCHA v3 server secret; only read while S-061 is ON (spec 01 AC-18). */
    RECAPTCHA_SECRET_KEY: z.string().optional(),
    /** Object storage, S3 API (ADR-009 §1; SeaweedFS locally, ADR-017). Without it, file operations answer 503. */
    S3_ENDPOINT: z.url().optional(),
    /** Endpoint written into presigned URLs for browsers/apps when it differs from S3_ENDPOINT (compose: `s3` vs localhost). */
    S3_PUBLIC_ENDPOINT: z.url().optional(),
    S3_REGION: z.string().min(1).default('us-east-1'),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_BUCKET_PUBLIC: z.string().min(3).default('public-media'),
    S3_BUCKET_PRIVATE: z.string().min(3).default('private'),
    S3_BUCKET_KYC: z.string().min(3).default('kyc'),
    /** Base URL of processed public images (CDN, or the local S3 bucket path). */
    PUBLIC_MEDIA_BASE_URL: z.url().optional(),
    /**
     * Virus scanner of uploads (ADR-009 §6). `clamav` needs CLAMAV_HOST; `none` marks files `scan_skipped`.
     * Unset = `clamav` when CLAMAV_HOST is set, else `none`. Production needs a scanner unless `none` is
     * set explicitly (Owner approval).
     */
    SCAN_PROVIDER: z.enum(['clamav', 'none']).optional(),
    /** clamd TCP address (compose profile `scan`: `clamav:3310`). */
    CLAMAV_HOST: z.string().optional(),
    CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
    /** API tests only (ADR-002 §2); refused in production below. */
    STAFF_BODY_TOKENS_ENABLED: bool,
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.STAFF_BODY_TOKENS_ENABLED) {
      ctx.addIssue({
        code: 'custom',
        path: ['STAFF_BODY_TOKENS_ENABLED'],
        message: 'must be false in production (ADR-002 §2)',
      });
    }
    if (env.NODE_ENV === 'production' && !env.SMTP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_URL'],
        message: 'required in production (emails carry codes and links)',
      });
    }
    if (env.NODE_ENV === 'production' && !env.SETTINGS_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['SETTINGS_ENCRYPTION_KEY'],
        message: 'required in production (social-login secrets are stored encrypted, ADR-005 §8)',
      });
    }
    if (env.NODE_ENV === 'production') {
      for (const name of [
        'S3_ENDPOINT',
        'S3_ACCESS_KEY_ID',
        'S3_SECRET_ACCESS_KEY',
        'PUBLIC_MEDIA_BASE_URL',
      ] as const) {
        if (!env[name]) {
          ctx.addIssue({
            code: 'custom',
            path: [name],
            message: 'required in production (uploads, ADR-009)',
          });
        }
      }
    }
    if (env.SCAN_PROVIDER === 'clamav' && !env.CLAMAV_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLAMAV_HOST'],
        message: 'required when SCAN_PROVIDER=clamav',
      });
    }
    if (env.NODE_ENV === 'production' && !env.SCAN_PROVIDER && !env.CLAMAV_HOST) {
      ctx.addIssue({
        code: 'custom',
        path: ['CLAMAV_HOST'],
        message:
          'required in production (virus scan of uploads, ADR-009 §6); SCAN_PROVIDER=none only with Owner approval',
      });
    }
    if (env.NODE_ENV === 'production' && env.MAIL_TRANSPORT === 'log') {
      ctx.addIssue({
        code: 'custom',
        path: ['MAIL_TRANSPORT'],
        message: 'log transport is for local previews only',
      });
    }
    if (env.NODE_ENV === 'production' && env.REDIS_URL.startsWith('memory:')) {
      ctx.addIssue({
        code: 'custom',
        path: ['REDIS_URL'],
        message: 'memory:// is for local previews only; Redis is security-critical (ADR-015 §6)',
      });
    }
    if (env.NODE_ENV === 'production' && env.OPENAPI_VALIDATE_RESPONSES === 'true') {
      ctx.addIssue({
        code: 'custom',
        path: ['OPENAPI_VALIDATE_RESPONSES'],
        message: 'response validation is off in production (ADR-014 §3)',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export class InvalidEnvironmentError extends Error {
  constructor(issues: string[]) {
    // Only variable names and reasons, never values (secrets must not reach logs).
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'InvalidEnvironmentError';
  }
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // `NAME=` lines copied from .env.example count as "not set".
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const parsed = envSchema.safeParse(cleaned);
  if (!parsed.success) {
    throw new InvalidEnvironmentError(
      parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return parsed.data;
}

export const ENV = Symbol('ENV');
