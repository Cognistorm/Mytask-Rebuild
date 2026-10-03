// Contract: listCategories, lookupCategory, getCategory (D2 `/categories`), listProjectCategories,
// lookupProjectCategory (D2 `/project-categories`), searchGigs (`/search/gigs`), listGigs (`GET /gigs`, the profile list;
// the gig writes of slice 3 join the `/gigs` path in their own module), searchProjects (`/search/projects`),
// listSellers (`/sellers`), listHireSellers (`/hire/{keyword}`). Public reads of spec 03; the staff CRUD comes in
// 4.2.7/4.2.8.
import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import type { Schema } from '@mytask/types';
import type { Request } from 'express';
import { resolveLocale } from '../../platform/errors/messages';
import { OptionalAuth, OptionalUser, Public, type AuthState } from '../auth/auth.guard';
import { CategoriesService } from './categories.service';
import { GigSearchService, type GigSearchQuery } from './gig-search.service';
import { ProjectCategoriesService } from './project-categories.service';
import { ProjectSearchService } from './project-search.service';
import { SellerListsService } from './seller-lists.service';

const localeOf = (req: Request) => resolveLocale(req.headers['accept-language']);
/** Query values arrive as text; the contract validator has already checked their type and range. */
const int = (v: string | undefined) => (v === undefined || v === '' ? undefined : Number(v));

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

type RawQuery = Record<string, string | undefined>;

@Controller()
export class GigListsController {
  constructor(private readonly search: GigSearchService) {}

  @OptionalUser()
  @Get('search/gigs')
  searchGigs(
    @Req() req: Request,
    @Query() q: RawQuery,
    @OptionalAuth() viewer: AuthState | null,
  ): Promise<Schema<'GigCardPage'>> {
    const query: GigSearchQuery = {
      q: q.q,
      categoryId: q.categoryId,
      minPrice: int(q.minPrice),
      maxPrice: int(q.maxPrice),
      deliveryTime: int(q.deliveryTime),
      rating: int(q.rating),
      sort: q.sort as GigSearchQuery['sort'],
      cursor: q.cursor,
      limit: int(q.limit),
      page: int(q.page),
    };
    return this.search.search(query, localeOf(req), viewer?.userId ?? null);
  }

  @OptionalUser()
  @Get('gigs')
  listGigs(
    @Req() req: Request,
    @Query() q: RawQuery,
    @OptionalAuth() viewer: AuthState | null,
  ): Promise<Schema<'GigCardPage'>> {
    return this.search.listBySeller(
      q.sellerUsername ?? '',
      { cursor: q.cursor, limit: int(q.limit) },
      localeOf(req),
      viewer?.userId ?? null,
    );
  }
}

const pageQuery = (q: RawQuery) => ({ cursor: q.cursor, limit: int(q.limit), page: int(q.page) });

@Controller()
export class ProjectAndSellerListsController {
  constructor(
    private readonly projects: ProjectSearchService,
    private readonly sellers: SellerListsService,
  ) {}

  /** The token will only decide the masking of the project owner (slice 9). */
  @OptionalUser()
  @Get('search/projects')
  searchProjects(
    @Req() req: Request,
    @Query() q: RawQuery,
  ): Promise<Schema<'SearchProjectCardPage'>> {
    return this.projects.search(
      { q: q.q, projectCategoryId: q.projectCategoryId, skillId: q.skillId, ...pageQuery(q) },
      localeOf(req),
    );
  }

  @Public()
  @Get('sellers')
  listSellers(@Req() req: Request, @Query() q: RawQuery): Promise<Schema<'SellerCardPage'>> {
    return this.sellers.sellers(pageQuery(q), localeOf(req));
  }

  @Public()
  @Get('hire/:keyword')
  listHireSellers(
    @Req() req: Request,
    @Param('keyword') keyword: string,
    @Query() q: RawQuery,
  ): Promise<Schema<'HireSellerPage'>> {
    return this.sellers.hire(keyword, pageQuery(q), localeOf(req));
  }
}
