import { Module } from '@nestjs/common';
import { ConfigModule } from './platform/config/config.module';
import { DbModule } from './platform/db/db.module';
import { LoggingModule } from './platform/logging/logging.module';
import { RedisModule } from './platform/redis/redis.module';
import { OutboxDispatcher } from './worker/outbox.dispatcher';

// Sweepers (ADR-008) and BullMQ consumers are added by the slices that own them. The worker serves no
// HTTP except its internal readiness port.
@Module({
  imports: [ConfigModule, LoggingModule, DbModule, RedisModule],
  providers: [OutboxDispatcher],
})
export class WorkerModule {}
