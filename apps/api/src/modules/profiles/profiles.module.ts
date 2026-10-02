import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { ProfilesController } from './profiles.controllers';
import { ProfilesService } from './profiles.service';

@Module({
  imports: [AuthModule, FilesModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
})
export class ProfilesModule {}
