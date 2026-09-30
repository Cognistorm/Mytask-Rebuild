import 'reflect-metadata';
import { generateKeyPairSync, randomBytes } from 'node:crypto';

// Test defaults. DATABASE_URL / REDIS_URL come from global-setup.ts (PGlite) or CI (real services).
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://mytask:mytask@localhost:5432/mytask_test';
process.env.REDIS_URL ??= 'memory://';
process.env.APP_URL ??= 'http://localhost:3100';
process.env.ADMIN_URL ??= 'http://localhost:3200';
process.env.INTERNAL_SERVICE_TOKEN ??= randomBytes(32).toString('hex');
process.env.MAIL_TRANSPORT = 'log';
if (!process.env.JWT_PRIVATE_KEY) {
  const k = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.JWT_PRIVATE_KEY = Buffer.from(k.privateKey).toString('base64');
  process.env.JWT_PUBLIC_KEY = Buffer.from(k.publicKey).toString('base64');
}
