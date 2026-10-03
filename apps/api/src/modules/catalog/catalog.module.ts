import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import {
  CategoriesController,
  GigListsController,
  ProjectAndSellerListsController,
  ProjectCategoriesController,
} from './catalog.controllers';
import { CategoriesService } from './categories.service';
import { GigCards } from './gig-cards';
import { GigSearchService } from './gig-search.service';
import { ProjectCategoriesService } from './project-categories.service';
import { ProjectSearchService } from './project-search.service';
import { SearchIndex } from './search-index';
import { SellerListsService } from './seller-lists.service';

// Spec 03 categories and search (slice 2). Home joins in 4.2.6, staff CRUD in 4.2.7/4.2.8.
// `SearchIndex` is exported for the gig writes of slice 3 (ADR-011 §3), `GigCards` for every other gig list.
@Module({
  imports: [AuthModule, ProfilesModule],
  controllers: [
    CategoriesController,
    ProjectCategoriesController,
    GigListsController,
    ProjectAndSellerListsController,
  ],
  providers: [
    CategoriesService,
    ProjectCategoriesService,
    GigCards,
    GigSearchService,
    ProjectSearchService,
    SellerListsService,
    SearchIndex,
  ],
  exports: [CategoriesService, GigCards, SearchIndex],
})
export class CatalogModule {}
