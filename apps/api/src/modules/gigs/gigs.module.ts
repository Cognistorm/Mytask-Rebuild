import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FilesModule } from '../files/files.module';
import { GigLimits } from './gig-limits';
import { GigsController } from './gigs.controllers';
import { GigsService } from './gigs.service';

// Spec 04 gigs (slice 3): the owner's create/edit/delete and their plan limit (4.3.3); reads, analytics,
// favourites, reports and staff moderation join in 4.3.4–4.3.7.
@Module({
  imports: [AuthModule, FilesModule, CatalogModule],
  controllers: [GigsController],
  providers: [GigLimits, GigsService],
  exports: [GigLimits],
})
export class GigsModule {}
