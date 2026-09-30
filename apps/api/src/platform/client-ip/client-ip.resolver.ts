// The ONE place that decides a request's client IP (ADR-013 §16–§18, SEC-01). Used by throttles, sessions,
// trusted-device IPs, 2FA challenges, audit and analytics. Application code never reads X-Forwarded-For,
// CF-Connecting-IP or X-Real-IP, and Express `trust proxy` is off (app.setup.ts).
import { timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ENV, type Env } from '../config/env';

export const HEADER_CLIENT_IP = 'x-mytask-client-ip';
export const HEADER_VISITOR_IP = 'x-mytask-visitor-ip';
export const HEADER_VISITOR_UA = 'x-mytask-visitor-ua';
export const HEADER_SERVICE_AUTH = 'x-mytask-service-auth';

/** `::ffff:10.0.0.1` -> `10.0.0.1`; anything that is not an IP -> undefined. */
export function normalizeIp(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/^::ffff:/i, '');
  return isIP(v) ? v : undefined;
}

export interface ClientInfo {
  ip: string;
  userAgent: string | undefined;
  /** How the IP was obtained (for tests and logs). */
  source: 'peer' | 'edge' | 'ssr-visitor';
}

@Injectable()
export class ClientIpResolver {
  private readonly logger = new Logger('ClientIpResolver');
  private readonly trusted: Set<string>;
  private readonly serviceToken: Buffer;
  private lastWarnAt = 0;

  constructor(@Inject(ENV) env: Env) {
    this.trusted = new Set(env.TRUSTED_PROXY_IPS.map((ip) => normalizeIp(ip) ?? ip));
    this.serviceToken = Buffer.from(env.INTERNAL_SERVICE_TOKEN);
  }

  resolve(req: Pick<Request, 'headers' | 'socket'>): ClientInfo {
    const peer = normalizeIp(req.socket?.remoteAddress) ?? '0.0.0.0';
    const header = (name: string) => {
      const v = req.headers[name];
      return Array.isArray(v) ? v[0] : v;
    };
    const ua = header('user-agent');

    // §16: the canonical header counts only when the TCP peer is Caddy.
    if (this.trusted.has(peer)) {
      const edgeIp = normalizeIp(header(HEADER_CLIENT_IP));
      if (header(HEADER_VISITOR_IP) || header(HEADER_SERVICE_AUTH))
        this.warn('visitor headers via edge ignored');
      return edgeIp
        ? { ip: edgeIp, userAgent: ua, source: 'edge' }
        : { ip: peer, userAgent: ua, source: 'peer' };
    }

    // §17: an SSR call from a Next.js server may carry the visitor's IP, only with the service credential.
    const visitor = normalizeIp(header(HEADER_VISITOR_IP));
    if (visitor) {
      if (this.credentialOk(header(HEADER_SERVICE_AUTH))) {
        return { ip: visitor, userAgent: header(HEADER_VISITOR_UA) ?? ua, source: 'ssr-visitor' };
      }
      this.warn('visitor IP without a valid service credential ignored');
    }
    return { ip: peer, userAgent: ua, source: 'peer' };
  }

  private credentialOk(value: string | undefined): boolean {
    if (!value) return false;
    const given = Buffer.from(value);
    return given.length === this.serviceToken.length && timingSafeEqual(given, this.serviceToken);
  }

  private warn(message: string): void {
    const now = Date.now();
    if (now - this.lastWarnAt > 60_000) {
      this.lastWarnAt = now;
      this.logger.warn(message);
    }
  }
}
