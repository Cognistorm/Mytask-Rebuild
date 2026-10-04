import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FilesModule } from '../files/files.module';
import { ProfilesModule } from '../profiles/profiles.module';
import {
  AdminCategoriesController,
  AdminProjectCategoriesController,
  AdminSkillsController,
} from './admin-catalog.controllers';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminProjectCatalogService } from './admin-project-catalog.service';
import {
  CategoriesController,
  GigListsController,
  HomeController,
  ProjectAndSellerListsController,
  ProjectCategoriesController,
} from './catalog.controllers';
import { CategoriesService } from './categories.service';
import { GigCards } from './gig-cards';
import { GigSearchService } from './gig-search.service';
import { HomeService } from './home.service';
import { ProjectCategoriesService } from './project-categories.service';
import { ProjectSearchService } from './project-search.service';
import { SearchIndex } from './search-index';
import { SellerListsService } from './seller-lists.service';

// Spec 03 categories and search (slice 2) and the home blocks (4.2.6); staff gig category CRUD (4.2.7b), project categories and skills (4.2.8).
// `SearchIndex` is exported for the gig writes of slice 3 (ADR-011 §3), `GigCards` for every other gig list.
@Module({
  imports: [AuthModule, FilesModule, ProfilesModule],
  controllers: [
    CategoriesController,
    ProjectCategoriesController,
    GigListsController,
    ProjectAndSellerListsController,
    HomeController,
    AdminCategoriesController,
    AdminProjectCategoriesController,
    AdminSkillsController,
  ],
  providers: [
    AdminCategoriesService,
    AdminProjectCatalogService,
    CategoriesService,
    ProjectCategoriesService,
    GigCards,
    GigSearchService,
    HomeService,
    ProjectSearchService,
    SellerListsService,
    SearchIndex,
  ],
  exports: [CategoriesService, GigCards, SearchIndex],
})
export class CatalogModule {}
