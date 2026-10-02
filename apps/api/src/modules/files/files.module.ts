import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesController } from './files.controller';
import { FileAttachments, FilesService } from './files.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService, FileAttachments],
  // Slices that attach files register their checks with FileAttachments and read files through FilesService.
  exports: [FilesService, FileAttachments],
})
export class FilesModule {}
