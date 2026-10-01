// Password hashing (ADR-002 §3, spec 01 R-A3, AC-12).
// - New and upgraded hashes: Argon2id.
// - Migrated legacy hashes: bcrypt `$2y$`/`$2a$`/`$2b$` (PHP cost 10). `$2y$`/`$2a$` are normalised to `$2b$`
//   (same algorithm). The password is passed unchanged: bcrypt uses the first 72 BYTES exactly like PHP did
//   (Georgian letters are 3 bytes each), so we never pre-hash or reject long inputs (SEC-29).
// - Unknown email: a dummy Argon2id verify keeps response times equal (SEC-25).
import { hash as argonHash, verify as argonVerify, Algorithm } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { PasswordAlgo } from '../../generated/prisma/client';

const ARGON_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456, // 19 MiB (OWASP minimum; ADR-002 §3 range 19–64 MiB)
  timeCost: 2,
  parallelism: 1,
} as const;

export interface VerifyResult {
  ok: boolean;
  /** Set when the stored hash must be replaced (legacy bcrypt after a successful login). */
  upgradedHash?: string;
}

@Injectable()
export class PasswordService {
  private dummyHash: Promise<string> | undefined;

  hash(password: string): Promise<string> {
    return argonHash(password, ARGON_OPTIONS);
  }

  async verify(
    password: string,
    stored: string | null,
    algo: PasswordAlgo | null,
  ): Promise<VerifyResult> {
    if (!stored || !algo) {
      await this.dummyVerify(password);
      return { ok: false };
    }
    if (algo === 'bcrypt_legacy') {
      const normalised = stored.replace(/^\$2[ay]\$/, '$2b$');
      if (!/^\$2b\$\d\d\$/.test(normalised)) return { ok: false };
      const ok = await bcrypt.compare(password, normalised);
      return ok ? { ok, upgradedHash: await this.hash(password) } : { ok };
    }
    try {
      return { ok: await argonVerify(stored, password) };
    } catch {
      return { ok: false };
    }
  }

  /** Same cost as a real verify, for unknown accounts (no timing oracle). */
  async dummyVerify(password: string): Promise<void> {
    this.dummyHash ??= this.hash('dummy-password-for-timing-A1');
    await argonVerify(await this.dummyHash, password).catch(() => false);
  }
}
