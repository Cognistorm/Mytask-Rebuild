import { Module } from '@nestjs/common';
import { ConfigModule } from './platform/config/config.module';
import { DbModule } from './platform/db/db.module';
import { HealthController } from './platform/health/health.controller';
import { LoggingModule } from './platform/logging/logging.module';
import { RedisModule } from './platform/redis/redis.module';

// Domain modules (src/modules/*) are added one per slice (architecture §4).
@Module({
  imports: [ConfigModule, LoggingModule, DbModule, RedisModule],
  controllers: [HealthController],
})
export class AppModule {}
