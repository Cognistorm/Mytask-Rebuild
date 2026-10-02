import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { AdminRestrictionsController, RestrictionsController } from './restrictions.controllers';
import { RestrictionsService } from './restrictions.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [RestrictionsController, AdminRestrictionsController],
  providers: [RestrictionsService],
})
export class RestrictionsModule {}
