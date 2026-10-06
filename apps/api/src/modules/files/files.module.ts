import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminFilesController, FilesController } from './files.controller';
import { FileAttachments, FileDownloadAccess, FilesService } from './files.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController, AdminFilesController],
  providers: [FilesService, FileAttachments, FileDownloadAccess],
  // Slices that attach files register their checks with FileAttachments (delete) and FileDownloadAccess
  // (who besides the owner may download), and read files through FilesService.
  exports: [FilesService, FileAttachments, FileDownloadAccess],
})
export class FilesModule {}
