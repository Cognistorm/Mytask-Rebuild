import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CatalogModule } from '../catalog/catalog.module';
import { FilesModule } from '../files/files.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { GigAnalytics } from './gig-analytics.service';
import { GigFavorites } from './gig-favorites.service';
import { GigLimits } from './gig-limits';
import { GigPages } from './gig-pages.service';
import { GigReports } from './gig-reports.service';
import { GigViews } from './gig-views.service';
import { FavoritesController, GigsController } from './gigs.controllers';
import { GigsService } from './gigs.service';

// Spec 04 gigs (slice 3): the owner's create/edit/delete and their plan limit (4.3.3), the page and My gigs (4.3.4),
// related gigs, visits and analytics (4.3.5), favourites and reports (4.3.6); staff moderation joins in 4.3.7.
@Module({
  imports: [AuthModule, FilesModule, CatalogModule, ProfilesModule],
  controllers: [GigsController, FavoritesController],
  providers: [GigLimits, GigsService, GigPages, GigViews, GigAnalytics, GigFavorites, GigReports],
  exports: [GigLimits],
})
export class GigsModule {}
