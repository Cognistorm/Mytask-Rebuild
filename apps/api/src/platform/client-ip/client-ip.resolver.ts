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

/**
 * The one canonical spelling of an IP (SEC-60): IPv4 as is; IPv6 lower case and compressed (RFC 5952,
 * `2001:0DB8:0:0::1` -> `2001:db8::1`); an IPv4-mapped IPv6 address -> IPv4 (`::ffff:10.0.0.1` -> `10.0.0.1`);
 * zone ids are dropped. Anything that is not an IP -> undefined. Used on every write, lookup and request IP.
 */
export function normalizeIp(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  const v = value.trim().replace(/%.*$/, '');
  const kind = isIP(v);
  if (kind === 4) return v;
  if (kind !== 6) return undefined;
  const host = new URL(`http://[${v}]/`).hostname.slice(1, -1);
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
  if (!mapped) return host;
  const [hi, lo] = [parseInt(mapped[1]!, 16), parseInt(mapped[2]!, 16)];
  return [hi >> 8, hi & 255, lo >> 8, lo & 255].join('.');
}

/** IPv6 clients are keyed by their /64 (one household or phone gets many addresses, SEC-42).
 * Used by the global limiter and the staff login IP ban (SEC-57). Canonical form, e.g. `2001:db8:1:2::/64`. */
export function ipBucket(ip: string): string {
  if (!ip.includes(':')) return ip;
  const parts = ip.split(':');
  const full: string[] = [];
  for (const p of parts) {
    if (p === '' && full.length < 8) {
      const missing = 8 - parts.filter((x) => x !== '').length;
      for (let i = 0; i < missing; i++) full.push('0');
    } else if (p !== '') full.push(p);
  }
  return `${normalizeIp(`${full.slice(0, 4).join(':')}::`)}/64`;
}

/** A ban key as given by a client: a canonical address, or an IPv6 /64 prefix as `ipBucket` writes it. */
export function normalizeBanKey(value: string | undefined | null): string | undefined {
  const m = /^(.+)\/64$/.exec(value?.trim() ?? '');
  if (!m) return normalizeIp(value);
  const ip = normalizeIp(m[1]);
  return ip?.includes(':') ? ipBucket(ip) : undefined;
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

  /** `quiet`: no warnings (the request log resolves every request a second time, review 07 I-41). */
  resolve(req: Pick<Request, 'headers' | 'socket'>, quiet = false): ClientInfo {
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
        if (!quiet) this.warn('visitor headers via edge ignored');
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
      if (!quiet) this.warn('visitor IP without a valid service credential ignored');
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
