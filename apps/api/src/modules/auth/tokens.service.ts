// Access tokens: Ed25519-signed JWT, 15 minutes, claims sub / aud / sid (ADR-002 §1).
import { createPrivateKey, createPublicKey, type KeyObject } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
// jose is ESM-only; our API build is CommonJS, so it is loaded with a real dynamic import().
const jose = import('jose');
import { ENV, type Env } from '../../platform/config/env';
import { ACCESS_TOKEN_SECONDS } from './auth.constants';

export type Audience = 'user' | 'staff';
export interface AccessClaims {
  sub: string;
  aud: Audience;
  sid: string;
}

const ISSUER = 'mytask.ge';

function pem(value: string): string {
  // .env stores base64 of the PEM text; accept a raw PEM as well.
  return value.includes('-----BEGIN') ? value : Buffer.from(value, 'base64').toString('utf8');
}

@Injectable()
export class TokensService {
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;

  constructor(@Inject(ENV) env: Env) {
    this.privateKey = createPrivateKey(pem(env.JWT_PRIVATE_KEY));
    this.publicKey = createPublicKey(pem(env.JWT_PUBLIC_KEY));
    if (this.privateKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('JWT_PRIVATE_KEY must be an Ed25519 key (ADR-002 §1)');
    }
  }

  async signAccess(claims: AccessClaims): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_SECONDS * 1000);
    const { SignJWT } = await jose;
    const token = await new SignJWT({ sid: claims.sid })
      .setProtectedHeader({ alg: 'EdDSA', typ: 'JWT', kid: 'k1' })
      .setIssuer(ISSUER)
      .setSubject(claims.sub)
      .setAudience(claims.aud)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.privateKey);
    return { token, expiresAt };
  }

  /** Returns the claims, or null for any invalid, expired or wrong-audience token. */
  async verifyAccess(token: string, audience: Audience): Promise<AccessClaims | null> {
    try {
      const { jwtVerify } = await jose;
      const { payload } = await jwtVerify(token, this.publicKey, {
        issuer: ISSUER,
        audience,
        algorithms: ['EdDSA'],
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { sub: payload.sub, aud: audience, sid: payload.sid };
    } catch {
      return null;
    }
  }
}
