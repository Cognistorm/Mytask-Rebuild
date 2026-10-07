import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FilesModule } from '../files/files.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { GigLimits } from './gig-limits';
import { GigPages } from './gig-pages.service';
import { GigsController } from './gigs.controllers';
import { GigsService } from './gigs.service';

// Spec 04 gigs (slice 3): the owner's create/edit/delete and their plan limit (4.3.3), the page and My gigs (4.3.4);
// analytics, favourites, reports and staff moderation join in 4.3.5–4.3.7.
@Module({
  imports: [AuthModule, FilesModule, CatalogModule, ProfilesModule],
  controllers: [GigsController],
  providers: [GigLimits, GigsService, GigPages],
  exports: [GigLimits],
})
export class GigsModule {}
