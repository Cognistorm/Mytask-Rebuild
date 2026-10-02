import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { KycProviders, ManualKycProvider } from './kyc-provider';
import { AdminKycController, KycController } from './kyc.controllers';
import { KycService } from './kyc.service';
import { AdminPortfolioController, PortfolioController } from './portfolio.controllers';
import { PortfolioService } from './portfolio.service';
import { ProfileListsService } from './profile-lists.service';
import { ProfileListsController, ProfilesController } from './profiles.controllers';
import { ProfilesService } from './profiles.service';
import { ReportLimiter } from './report-limiter';
import { UserSummaries } from './user-summaries';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [
    ProfilesController,
    ProfileListsController,
    PortfolioController,
    AdminPortfolioController,
    KycController,
    AdminKycController,
  ],
  providers: [
    ProfilesService,
    ProfileListsService,
    PortfolioService,
    KycService,
    KycProviders,
    ManualKycProvider,
    ReportLimiter,
    UserSummaries,
  ],
  exports: [ReportLimiter, UserSummaries],
})
export class ProfilesModule {}
