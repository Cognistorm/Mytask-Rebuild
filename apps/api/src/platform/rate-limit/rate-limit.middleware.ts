// Global defaults (CONVENTIONS §14, SEC-35): per client IP and minute, 600 reads / 120 writes; staff routes
// 1,200 reads and 120 writes (SEC-50, SEC-57). Over the limit -> 429 RATE_LIMITED with Retry-After. Health and provider webhooks are exempt.
// Operation-specific limits (login, codes, emails, …) are separate and stricter.
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { ClientIpResolver, ipBucket } from '../client-ip/client-ip.resolver';
import { ApiException } from '../errors/api-exception';
import { RedisService } from '../redis/redis.module';

export const LIMITS = { read: 600, write: 120, staff: 1200, staff_write: 120 } as const;
const EXEMPT = [/^\/api\/v1\/health\b/, /^\/api\/v1\/webhooks\//];
const READ = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RateLimit');

  constructor(
    private readonly redis: RedisService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const url = req.originalUrl.toLowerCase(); // SEC-51
    if (EXEMPT.some((re) => re.test(url))) return next();
    const read = READ.has(req.method);
    const kind = url.startsWith('/api/v1/admin/')
      ? read
        ? 'staff'
        : 'staff_write'
      : read
        ? 'read'
        : 'write';
    const limit = LIMITS[kind];
    const minute = Math.floor(Date.now() / 60_000);
    const key = `rl:${kind}:${ipBucket(this.ipResolver.resolve(req).ip)}:${minute}`;
    try {
      const n = await this.redis.client.incr(key);
      if (n === 1) await this.redis.client.expire(key, 70);
      if (n > limit) {
        const retryAfterSeconds = 60 - Math.floor((Date.now() / 1000) % 60);
        return next(
          new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', { retryAfterSeconds }),
        );
      }
    } catch (err) {
      // A general limiter must not take the site down with Redis; security-critical checks fail closed
      // in the auth guard and the per-operation throttles (ADR-002 §1).
      this.logger.warn({ err }, 'rate limiter unavailable');
    }
    next();
  }
}
