// Redis: queues, cache, rate limits, session deny-list (architecture §3). Security-critical (ADR-015 §6).
import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ENV, type Env } from '../config/env';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(@Inject(ENV) env: Env) {
    super(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2, enableOfflineQueue: false });
    // Errors surface through readiness; avoid unhandled 'error' events crashing the process.
    this.on('error', () => undefined);
  }

  override async ping(): Promise<'PONG'> {
    if (this.status === 'wait' || this.status === 'end') await this.connect();
    return (await super.ping()) as 'PONG';
  }

  async onModuleDestroy(): Promise<void> {
    if (this.status !== 'end' && this.status !== 'wait') await this.quit();
  }
}

@Global()
@Module({ providers: [RedisService], exports: [RedisService] })
export class RedisModule {}
