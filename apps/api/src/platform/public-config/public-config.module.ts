import { Module } from '@nestjs/common';
import { AuthModule } from '../../modules/auth/auth.module';
import { PublicConfigController } from './public-config.controller';
import { PublicConfigService } from './public-config.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicConfigController],
  providers: [PublicConfigService],
})
export class PublicConfigModule {}
