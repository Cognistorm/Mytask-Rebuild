import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { AppVersionMiddleware } from './platform/app-version/app-version.middleware';
import { ClientIpModule } from './platform/client-ip/client-ip.module';
import { ConfigModule } from './platform/config/config.module';
import { DbModule } from './platform/db/db.module';
import { HealthController } from './platform/health/health.controller';
import { LoggingModule } from './platform/logging/logging.module';
import { OutboxModule } from './platform/outbox/outbox.module';
import { RedisModule } from './platform/redis/redis.module';
import { SettingsModule } from './platform/settings/settings.module';

// Domain modules (src/modules/*) are added one per slice (architecture §4).
@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DbModule,
    RedisModule,
    SettingsModule,
    ClientIpModule,
    OutboxModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppVersionMiddleware).forRoutes('*path');
  }
}
