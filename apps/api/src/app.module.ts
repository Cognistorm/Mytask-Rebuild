import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { FilesModule } from './modules/files/files.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { RestrictionsModule } from './modules/restrictions/restrictions.module';
import { StaffModule } from './modules/staff/staff.module';
import { AuditModule } from './platform/audit/audit.service';
import { IdempotencyModule } from './platform/idempotency/idempotency.service';
import { AppVersionMiddleware } from './platform/app-version/app-version.middleware';
import { ClientIpModule } from './platform/client-ip/client-ip.module';
import { ConfigModule } from './platform/config/config.module';
import { DbModule } from './platform/db/db.module';
import { HealthController } from './platform/health/health.controller';
import { LoggingModule } from './platform/logging/logging.module';
import { PublicConfigModule } from './platform/public-config/public-config.module';
import { OutboxModule } from './platform/outbox/outbox.module';
import { RedisModule } from './platform/redis/redis.module';
import { SettingsModule } from './platform/settings/settings.module';
import { StorageModule } from './platform/storage/storage';

// Domain modules (src/modules/*) are added one per slice (architecture §4).
@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DbModule,
    RedisModule,
    StorageModule,
    SettingsModule,
    ClientIpModule,
    OutboxModule,
    AuditModule,
    IdempotencyModule,
    AuthModule,
    StaffModule,
    RestrictionsModule,
    FilesModule,
    ProfilesModule,
    CatalogModule,
    PublicConfigModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AppVersionMiddleware).forRoutes('*path');
  }
}
