// Contract: adminListCategories, adminCreateCategory, adminGetCategory, adminUpdateCategory, adminDeleteCategory
// (D2 "Admin Catalog", `/admin/categories`, permission `catalog.write`). Project categories and skills: 4.2.8.
import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req } from '@nestjs/common';
import type { Schema } from '@mytask/types';
import type { Request } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { CurrentStaff, StaffRoute, type StaffAuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { AdminCategoriesService } from './admin-categories.service';

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
