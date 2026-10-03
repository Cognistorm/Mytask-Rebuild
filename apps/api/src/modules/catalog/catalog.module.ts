import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController, ProjectCategoriesController } from './catalog.controllers';
import { CategoriesService } from './categories.service';
import { ProjectCategoriesService } from './project-categories.service';

// Spec 03 categories and search (slice 2). Search, sellers and home join in 4.2.4–4.2.6, staff CRUD in 4.2.7/4.2.8.
@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, ProjectCategoriesController],
  providers: [CategoriesService, ProjectCategoriesService],
  exports: [CategoriesService],
})
export class CatalogModule {}
