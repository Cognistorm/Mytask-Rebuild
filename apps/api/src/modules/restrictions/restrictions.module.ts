import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminRestrictionsController, RestrictionsController } from './restrictions.controllers';
import { RestrictionsService } from './restrictions.service';

@Module({
  imports: [AuthModule],
  controllers: [RestrictionsController, AdminRestrictionsController],
  providers: [RestrictionsService],
})
export class RestrictionsModule {}
