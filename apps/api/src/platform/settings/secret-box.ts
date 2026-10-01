// Encrypted setting secrets (ADR-005 §8): AES-256-GCM with SETTINGS_ENCRYPTION_KEY. The key id (first bytes of
// the key's SHA-256) is stored with the ciphertext so a rotated key can be recognised.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface StoredSecret {
  ciphertext: string;
  iv: string;
  keyId: string;
  updatedAt: string;
}

const keyId = (key: Buffer) => createHash('sha256').update(key).digest('hex').slice(0, 8);

export class SecretBox {
  private readonly key: Buffer | null;

  constructor(base64Key: string | undefined) {
    this.key = base64Key ? Buffer.from(base64Key, 'base64') : null;
  }

  get available(): boolean {
    return this.key !== null;
  }

  seal(plain: string): StoredSecret {
    if (!this.key) throw new Error('SETTINGS_ENCRYPTION_KEY is not set');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return {
      ciphertext: body.toString('base64'),
      iv: iv.toString('base64'),
      keyId: keyId(this.key),
      updatedAt: new Date().toISOString(),
    };
  }

  /** Null when the key is missing or was rotated away, or the ciphertext was tampered with. */
  open(secret: StoredSecret): string | null {
    if (!this.key || secret.keyId !== keyId(this.key)) return null;
    try {
      const body = Buffer.from(secret.ciphertext, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(secret.iv, 'base64'));
      decipher.setAuthTag(body.subarray(body.length - 16));
      return Buffer.concat([
        decipher.update(body.subarray(0, body.length - 16)),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }
}
