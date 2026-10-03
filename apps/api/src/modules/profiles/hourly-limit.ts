// Fixed one-hour window per user in Redis, shared by the per-user limits of this module (reports SEC-23,
// portfolio saves ADR-022).
import { ApiException } from '../../platform/errors/api-exception';
import type { RedisService } from '../../platform/redis/redis.module';

const WINDOW_SECONDS = 60 * 60;

/** Counts one attempt under `prefix:userId`; over `max` in the hour → 429 RATE_LIMITED with Retry-After. */
export async function hitHourly(
  redis: RedisService,
  prefix: string,
  userId: string,
  max: number,
): Promise<void> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const key = `${prefix}:${userId}:${Math.floor(nowSeconds / WINDOW_SECONDS)}`;
  const n = await redis.client.incr(key);
  if (n === 1) await redis.client.expire(key, WINDOW_SECONDS + 10);
  if (n > max) {
    throw new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', {
      retryAfterSeconds: WINDOW_SECONDS - (nowSeconds % WINDOW_SECONDS),
    });
  }
}
