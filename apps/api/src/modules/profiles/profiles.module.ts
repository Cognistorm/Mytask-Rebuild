import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { ProfilesController } from './profiles.controllers';
import { ProfilesService } from './profiles.service';
import { ReportLimiter } from './report-limiter';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, ReportLimiter],
  exports: [ReportLimiter],
})
export class ProfilesModule {}
