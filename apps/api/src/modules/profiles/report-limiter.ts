// SEC-23 (CONVENTIONS §14): 10 reports per user and hour, shared by createUserReport, createGigReport,
// createProjectReport and createProposalReport. The later report operations use this same limiter.
import { Injectable } from '@nestjs/common';
import { ApiException } from '../../platform/errors/api-exception';
import { RedisService } from '../../platform/redis/redis.module';

export const REPORTS_PER_HOUR = 10;
const WINDOW_SECONDS = 60 * 60;

@Injectable()
export class ReportLimiter {
  constructor(private readonly redis: RedisService) {}

  /** Counts one report attempt; over the limit → 429 RATE_LIMITED with Retry-After. */
  async hit(userId: string): Promise<void> {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const key = `reports:${userId}:${Math.floor(nowSeconds / WINDOW_SECONDS)}`;
    const n = await this.redis.client.incr(key);
    if (n === 1) await this.redis.client.expire(key, WINDOW_SECONDS + 10);
    if (n > REPORTS_PER_HOUR) {
      throw new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', {
        retryAfterSeconds: WINDOW_SECONDS - (nowSeconds % WINDOW_SECONDS),
      });
    }
  }
}
