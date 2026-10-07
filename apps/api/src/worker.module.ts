import { Module } from '@nestjs/common';
import { ConfigModule } from './platform/config/config.module';
import { DbModule } from './platform/db/db.module';
import { LoggingModule } from './platform/logging/logging.module';
import { FileScanService } from './modules/files/scan/file-scan.service';
import { RedisModule } from './platform/redis/redis.module';
import { ScannerModule } from './platform/scanner/scanner';
import { SettingsModule } from './platform/settings/settings.module';
import { StorageModule } from './platform/storage/storage';
import { AnalyticsPartitionsSweeper } from './worker/analytics-partitions.sweeper';
import { AvailabilityResetSweeper } from './worker/availability-reset.sweeper';
import { FilesScanSweeper } from './worker/files-scan.sweeper';
import { OutboxDispatcher } from './worker/outbox.dispatcher';

// Sweepers (ADR-008) and BullMQ consumers are added by the slices that own them. The worker serves no
// HTTP except its internal readiness port.
@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    DbModule,
    RedisModule,
    StorageModule,
    ScannerModule,
    SettingsModule,
  ],
  providers: [
    OutboxDispatcher,
    FileScanService,
    FilesScanSweeper,
    AvailabilityResetSweeper,
    AnalyticsPartitionsSweeper,
  ],
})
export class WorkerModule {}
