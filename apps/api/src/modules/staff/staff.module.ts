import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSettingsService } from './admin-settings.service';
import {
  AdminMeController,
  AdminSettingsController,
  StaffAuthController,
} from './staff.controllers';
import { StaffAuthService } from './staff-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffAuthController, AdminMeController, AdminSettingsController],
  providers: [StaffAuthService, AdminSettingsService],
})
export class StaffModule {}
