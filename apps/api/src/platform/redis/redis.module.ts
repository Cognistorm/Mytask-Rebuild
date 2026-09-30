// Redis: queues, cache, rate limits, session deny-list (architecture §3). Security-critical (ADR-015 §6):
// authenticated requests fail closed when it is down (ADR-002 §1).
// REDIS_URL=memory:// uses an in-process stand-in for Docker-free local previews and tests only; env.ts refuses
// it in production. It is not shared between processes (API and worker each get their own).
import { Global, Inject, Injectable, Logger, Module, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV, type Env } from '../config/env';

export const REDIS = Symbol('REDIS');

function createClient(env: Env): Redis {
  if (env.REDIS_URL.startsWith('memory:')) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- dev-only dependency, loaded lazily
    const RedisMock = require('ioredis-mock') as typeof Redis;
    new Logger('Redis').warn(
      'REDIS_URL=memory:// — in-process Redis stand-in (local preview only)',
    );
    return new RedisMock();
  }
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 2,
    enableOfflineQueue: true,
  });
  // Errors surface through readiness and failed calls; avoid unhandled 'error' events crashing the process.
  client.on('error', () => undefined);
  return client;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(@Inject(ENV) env: Env) {
    this.client = createClient(env);
  }

  async ping(): Promise<'PONG'> {
    return (await this.client.ping()) as 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'ready' || this.client.status === 'connecting') {
      await this.client.quit().catch(() => undefined);
    }
  }
}

@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
