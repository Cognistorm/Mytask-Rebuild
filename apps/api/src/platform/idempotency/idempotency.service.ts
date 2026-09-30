// Idempotency-Key handling for money operations (CONVENTIONS §9, ADR-003 §6).
// Keeps (caller, operation, key) -> body hash + response for 24 h:
//   same key + same body  -> the stored response again, header `Idempotent-Replayed: true`
//   same key + other body -> 422 IDEMPOTENCY_KEY_REUSED
//   first call still running -> 409 IDEMPOTENCY_IN_PROGRESS (Retry-After)
// Money safety does not depend on this store alone: ledger postings carry their own unique refs (ADR-003).
import { createHash } from 'node:crypto';
import { Global, Injectable, Module } from '@nestjs/common';
import type { Response } from 'express';
import { ApiException } from '../errors/api-exception';
import { RedisService } from '../redis/redis.module';

const TTL_SECONDS = 24 * 3600;
const RUNNING_SECONDS = 60;

interface Stored {
  bodyHash: string;
  status: number;
  response: unknown;
}

@Injectable()
export class IdempotencyService {
  constructor(private readonly redis: RedisService) {}

  async run<T>(
    input: {
      caller: string;
      operation: string;
      key: string | undefined;
      body: unknown;
      res: Response;
    },
    status: number,
    work: () => Promise<T>,
  ): Promise<T> {
    if (!input.key)
      throw new ApiException(400, 'IDEMPOTENCY_KEY_REQUIRED', 't_toast_something_went_wrong');
    const redisKey = `idem:${input.caller}:${input.operation}:${input.key}`;
    const bodyHash = createHash('sha256')
      .update(JSON.stringify(input.body ?? {}))
      .digest('hex');
    const r = this.redis.client;

    const claimed = await r.set(
      redisKey,
      JSON.stringify({ running: true, bodyHash }),
      'EX',
      RUNNING_SECONDS,
      'NX',
    );
    if (claimed !== 'OK') {
      const existing = JSON.parse((await r.get(redisKey)) ?? '{}') as Partial<Stored> & {
        running?: boolean;
      };
      if (existing.bodyHash && existing.bodyHash !== bodyHash) {
        throw new ApiException(422, 'IDEMPOTENCY_KEY_REUSED', 't_toast_something_went_wrong');
      }
      if (existing.running || existing.status === undefined) {
        throw new ApiException(409, 'IDEMPOTENCY_IN_PROGRESS', 't_toast_something_went_wrong', {
          retryAfterSeconds: 1,
        });
      }
      input.res.status(existing.status);
      input.res.setHeader('Idempotent-Replayed', 'true');
      return existing.response as T;
    }
    try {
      const response = await work();
      const stored: Stored = { bodyHash, status, response };
      await r.set(redisKey, JSON.stringify(stored), 'EX', TTL_SECONDS);
      return response;
    } catch (e) {
      // A failed first attempt may be retried with the same key.
      await r.del(redisKey);
      throw e;
    }
  }
}

@Global()
@Module({ providers: [IdempotencyService], exports: [IdempotencyService] })
export class IdempotencyModule {}
