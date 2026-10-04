// Contract: adminListCategories, adminCreateCategory, adminGetCategory, adminUpdateCategory, adminDeleteCategory
// (D2 "Admin Catalog", `/admin/categories`, permission `catalog.write`); project categories and skills (4.2.8):
// adminListProjectCategories … adminDeleteProjectCategory, adminListSkills … adminDeleteSkill.
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Schema } from '@mytask/types';
import type { Request } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { CurrentStaff, StaffRoute, type StaffAuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { AdminCategoriesService } from './admin-categories.service';
import { AdminProjectCatalogService } from './admin-project-catalog.service';

const int = (v: unknown): number | undefined => (v === undefined ? undefined : Number(v));

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(
    private readonly categories: AdminCategoriesService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @StaffRoute('catalog.write')
  @Get()
  list(): Promise<Schema<'AdminCategoryList'>> {
    return this.categories.list();
  }

  @StaffRoute('catalog.write')
  @Post()
  create(
    @Body() body: Schema<'CategoryCreateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminCategory'>> {
    return this.categories.create(body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Get(':categoryId')
  get(@Param('categoryId') categoryId: string): Promise<Schema<'AdminCategory'>> {
    return this.categories.get(categoryId);
  }

  @StaffRoute('catalog.write')
  @Patch(':categoryId')
  update(
    @Param('categoryId') categoryId: string,
    @Body() body: Schema<'CategoryUpdateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminCategory'>> {
    return this.categories.update(categoryId, body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Delete(':categoryId')
  @HttpCode(204)
  async remove(
    @Param('categoryId') categoryId: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    await this.categories.remove(categoryId, staff.staffId, this.ctx(req));
  }
}

@Controller('admin/project-categories')
export class AdminProjectCategoriesController {
  constructor(
    private readonly catalog: AdminProjectCatalogService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @StaffRoute('catalog.write')
  @Get()
  list(@Req() req: Request): Promise<Schema<'AdminProjectCategoryList'>> {
    return this.catalog.listCategories(this.ctx(req).locale);
  }

  @StaffRoute('catalog.write')
  @Post()
  create(
    @Body() body: Schema<'ProjectCategoryCreateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminProjectCategory'>> {
    return this.catalog.createCategory(body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Get(':projectCategoryId')
  get(
    @Param('projectCategoryId') id: string,
    @Req() req: Request,
  ): Promise<Schema<'AdminProjectCategory'>> {
    return this.catalog.getCategory(id, this.ctx(req).locale);
  }

  @StaffRoute('catalog.write')
  @Patch(':projectCategoryId')
  update(
    @Param('projectCategoryId') id: string,
    @Body() body: Schema<'ProjectCategoryUpdateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminProjectCategory'>> {
    return this.catalog.updateCategory(id, body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Delete(':projectCategoryId')
  @HttpCode(204)
  async remove(
    @Param('projectCategoryId') id: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    await this.catalog.removeCategory(id, staff.staffId, this.ctx(req));
  }
}

@Controller('admin/skills')
export class AdminSkillsController {
  constructor(
    private readonly catalog: AdminProjectCatalogService,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @StaffRoute('catalog.write')
  @Get()
  list(
    @Req() req: Request,
    @Query('projectCategoryId') projectCategoryId?: string,
    @Query('q') q?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: unknown,
  ): Promise<Schema<'AdminSkillPage'>> {
    return this.catalog.listSkills(
      { projectCategoryId, q, cursor, limit: int(limit) },
      this.ctx(req),
    );
  }

  @StaffRoute('catalog.write')
  @Post()
  create(
    @Body() body: Schema<'SkillCreateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminSkill'>> {
    return this.catalog.createSkill(body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Get(':skillId')
  get(@Param('skillId') id: string): Promise<Schema<'AdminSkill'>> {
    return this.catalog.getSkill(id);
  }

  @StaffRoute('catalog.write')
  @Patch(':skillId')
  update(
    @Param('skillId') id: string,
    @Body() body: Schema<'SkillUpdateRequest'>,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<Schema<'AdminSkill'>> {
    return this.catalog.updateSkill(id, body, staff.staffId, this.ctx(req));
  }

  @StaffRoute('catalog.write')
  @Delete(':skillId')
  @HttpCode(204)
  async remove(
    @Param('skillId') id: string,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    await this.catalog.removeSkill(id, staff.staffId, this.ctx(req));
  }
}
