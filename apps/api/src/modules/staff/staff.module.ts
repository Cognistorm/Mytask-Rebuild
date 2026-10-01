import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSettingsService } from './admin-settings.service';
import {
  AdminIpBansController,
  AdminMyPasswordController,
  AdminUsersController,
} from './admin-security.controllers';
import { AdminSecurityService } from './admin-security.service';
import { AdminUsersService } from './admin-users.service';
import {
  AdminMeController,
  AdminSettingsController,
  StaffAuthController,
} from './staff.controllers';
import { StaffAuthService } from './staff-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [
    StaffAuthController,
    AdminMeController,
    AdminSettingsController,
    AdminIpBansController,
    AdminMyPasswordController,
    AdminUsersController,
  ],
  providers: [StaffAuthService, AdminSettingsService, AdminSecurityService, AdminUsersService],
})
export class StaffModule {}
