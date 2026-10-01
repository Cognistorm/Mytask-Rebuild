// Small crypto helpers shared by auth: random tokens and one-way hashes (only hashes are stored).
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** URL-safe random token with `bytes` of entropy (256 bits by default). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Bytes as Prisma 7 stores them (`bytea` <-> Uint8Array<ArrayBuffer>). */
export type Bytes = Uint8Array<ArrayBuffer>;

export function sha256(value: string): Bytes {
  return new Uint8Array(createHash('sha256').update(value, 'utf8').digest());
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** 6-digit numeric code, uniformly random (spec 01 R-A6). */
export function randomCode(digits = 6): string {
  return randomInt(0, 10 ** digits)
    .toString()
    .padStart(digits, '0');
}

export function hashEquals(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Referral code: 8 characters A–Z 0–9 (spec 01 AC-1). */
export function randomReferralCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[randomInt(0, alphabet.length)];
  return out;
}

/** `john.doe@example.com` -> `jo***@example.com` (TwoFactorChallenge.emailMasked). */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const keep = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${keep}***@${domain}`;
}
