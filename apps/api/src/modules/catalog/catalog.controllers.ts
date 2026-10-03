// Contract: listCategories, lookupCategory, getCategory (D2 `/categories`), listProjectCategories,
// lookupProjectCategory (D2 `/project-categories`). Public reads of spec 03; the staff CRUD comes in 4.2.7/4.2.8.
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Schema } from '@mytask/types';
import type { Request } from 'express';
import { resolveLocale } from '../../platform/errors/messages';
import { Public } from '../auth/auth.guard';
import { CategoriesService } from './categories.service';
import { ProjectCategoriesService } from './project-categories.service';

const localeOf = (req: Request) => resolveLocale(req.headers['accept-language']);

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Public()
  @Get()
  list(@Req() req: Request): Promise<Schema<'CategoryTree'>> {
    return this.categories.listTree(localeOf(req));
  }

  @Public()
  @Get('lookup')
  lookup(@Req() req: Request, @Query('path') path: string): Promise<Schema<'CategoryDetail'>> {
    return this.categories.lookup(path, localeOf(req));
  }

  @Public()
  @Get(':categoryId')
  get(
    @Req() req: Request,
    @Param('categoryId') categoryId: string,
  ): Promise<Schema<'CategoryDetail'>> {
    return this.categories.get(categoryId, localeOf(req));
  }
}

@Controller('project-categories')
export class ProjectCategoriesController {
  constructor(private readonly projectCategories: ProjectCategoriesService) {}

  @Public()
  @Get()
  list(@Req() req: Request): Promise<Schema<'ProjectCategoryList'>> {
    return this.projectCategories.list(localeOf(req));
  }

  @Public()
  @Get('lookup')
  lookup(
    @Req() req: Request,
    @Query('slug') slug: string,
    @Query('skillSlug') skillSlug: string | undefined,
  ): Promise<Schema<'ProjectCategoryLookupResult'>> {
    return this.projectCategories.lookup(slug, skillSlug, localeOf(req));
  }
}
