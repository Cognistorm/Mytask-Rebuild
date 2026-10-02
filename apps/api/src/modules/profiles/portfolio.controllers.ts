// Contract: listPortfolioItems, createPortfolioItem, lookupPortfolioItem, getPortfolioItem, updatePortfolioItem,
// deletePortfolioItem and adminListPortfolioItems, adminGetPortfolioItem, adminApprovePortfolioItem,
// adminRejectPortfolioItem, adminRemovePortfolioItem (ROADMAP 4.1.12).
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
import type { components } from '@mytask/types';
import type { Request } from 'express';
import type { PortfolioStatus } from '../../generated/prisma/client';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import {
  CurrentAuth,
  CurrentStaff,
  OptionalAuth,
  OptionalUser,
  StaffRoute,
  type AuthState,
  type StaffAuthState,
} from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { PortfolioService } from './portfolio.service';

type S = components['schemas'];

/** The contract has already checked the range; query values may still arrive as strings. */
const int = (v: unknown): number | undefined => (v === undefined ? undefined : Number(v));

abstract class WithContext {
  constructor(protected readonly ipResolver: ClientIpResolver) {}
  protected ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }
}

@Controller('portfolio-items')
export class PortfolioController extends WithContext {
  constructor(
    private readonly portfolio: PortfolioService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @OptionalUser()
  @Get()
  list(
    @Query('username') username: string,
    @OptionalAuth() viewer: AuthState | null,
    @Req() req: Request,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: unknown,
  ): Promise<S['PortfolioItemPage']> {
    return this.portfolio.list(
      username,
      viewer?.userId ?? null,
      { cursor, limit: int(limit) },
      this.ctx(req).t,
    );
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['PortfolioItemCreateRequest'],
    @Req() req: Request,
  ): Promise<S['PortfolioItem']> {
    return this.portfolio.create(auth.userId, body, this.ctx(req));
  }

  @OptionalUser()
  @Get('lookup')
  lookup(
    @OptionalAuth() viewer: AuthState | null,
    @Req() req: Request,
    @Query('uid') uid?: string,
    @Query('slug') slug?: string,
  ): Promise<S['PortfolioItem']> {
    return this.portfolio.lookup({ uid, slug }, viewer?.userId ?? null, this.ctx(req).t);
  }

  @OptionalUser()
  @Get(':portfolioItemId')
  get(
    @Param('portfolioItemId') id: string,
    @OptionalAuth() viewer: AuthState | null,
  ): Promise<S['PortfolioItem']> {
    return this.portfolio.get(id, viewer?.userId ?? null);
  }

  @Patch(':portfolioItemId')
  update(
    @CurrentAuth() auth: AuthState,
    @Param('portfolioItemId') id: string,
    @Body() body: S['PortfolioItemUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['PortfolioItem']> {
    return this.portfolio.update(auth.userId, id, body, this.ctx(req));
  }

  @Delete(':portfolioItemId')
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthState, @Param('portfolioItemId') id: string): Promise<void> {
    return this.portfolio.remove(auth.userId, id);
  }
}

@Controller('admin/portfolio-items')
export class AdminPortfolioController extends WithContext {
  constructor(
    private readonly portfolio: PortfolioService,
    ipResolver: ClientIpResolver,
  ) {
    super(ipResolver);
  }

  @StaffRoute('portfolio.moderate')
  @Get()
  list(
    @Req() req: Request,
    @Query('status') status?: PortfolioStatus,
    @Query('userId') userId?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: unknown,
  ): Promise<S['AdminPortfolioItemPage']> {
    return this.portfolio.adminList(
      { status, userId, createdFrom, createdTo, cursor, limit: int(limit) },
      this.ctx(req).t,
    );
  }

  @StaffRoute('portfolio.moderate')
  @Get(':portfolioItemId')
  get(@Param('portfolioItemId') id: string): Promise<S['AdminPortfolioItem']> {
    return this.portfolio.adminGet(id);
  }

  @StaffRoute('portfolio.moderate')
  @Post(':portfolioItemId/approve')
  @HttpCode(200)
  approve(
    @Param('portfolioItemId') id: string,
    @Body() body: S['StaffOptionalNoteRequest'] | undefined,
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminPortfolioItem']> {
    return this.portfolio.approve(id, body?.note ?? null, staff.staffId, this.ctx(req));
  }

  @StaffRoute('portfolio.moderate')
  @Post(':portfolioItemId/reject')
  @HttpCode(200)
  reject(
    @Param('portfolioItemId') id: string,
    @Body() body: S['StaffReasonRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<S['AdminPortfolioItem']> {
    return this.portfolio.reject(id, body.reason, staff.staffId, this.ctx(req));
  }

  @StaffRoute('portfolio.moderate')
  @Post(':portfolioItemId/remove')
  @HttpCode(204)
  remove(
    @Param('portfolioItemId') id: string,
    @Body() body: S['StaffReasonRequest'],
    @CurrentStaff() staff: StaffAuthState,
    @Req() req: Request,
  ): Promise<void> {
    return this.portfolio.adminRemove(id, body.reason, staff.staffId, this.ctx(req));
  }
}
