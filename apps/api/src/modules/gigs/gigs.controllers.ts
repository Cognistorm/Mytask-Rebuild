// Contract: getGigCreationEligibility (ROADMAP 4.3.3a), createGig (4.3.3b), updateGig and deleteGig (4.3.3c), getGig,
// lookupGig, getGigOwnerView and listMyGigs (4.3.4), listRelatedGigs (4.3.5a), recordGigView (4.3.5b), getGigAnalytics
// (4.3.5c). Fixed paths (`mine`, `lookup`) come before `:gigId`.
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
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import type { GigStatus } from '../../generated/prisma/client';
import { CurrentAuth, OptionalAuth, OptionalUser, type AuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { GigAnalytics } from './gig-analytics.service';
import { GigLimits } from './gig-limits';
import { GigPages } from './gig-pages.service';
import { GigViews } from './gig-views.service';
import { GigsService } from './gigs.service';

type S = components['schemas'];

/** A repeated query value arrives as an array, a single one as text; the contract validator checked the values. */
const list = <T>(v: T | T[] | undefined): T[] | undefined =>
  v === undefined ? undefined : Array.isArray(v) ? v : [v];

@Controller('gigs')
export class GigsController {
  constructor(
    private readonly limits: GigLimits,
    private readonly gigs: GigsService,
    private readonly pages: GigPages,
    private readonly views: GigViews,
    private readonly analytics: GigAnalytics,
    private readonly ipResolver: ClientIpResolver,
  ) {}

  private ctx(req: Request) {
    const { ip, userAgent } = this.ipResolver.resolve(req);
    return buildContext(req, ip, userAgent);
  }

  @Get('creation-eligibility')
  creationEligibility(@CurrentAuth() auth: AuthState): Promise<S['GigCreationEligibility']> {
    return this.limits.eligibility(auth.userId);
  }

  @Get('mine')
  listMine(
    @CurrentAuth() auth: AuthState,
    @Req() req: Request,
    @Query('status') status?: GigStatus | GigStatus[],
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<S['GigOwnerListItemPage']> {
    const { locale, t } = this.ctx(req);
    return this.pages.listMine(
      auth.userId,
      { status: list(status), cursor, limit: limit === undefined ? undefined : Number(limit) },
      locale,
      t,
    );
  }

  @OptionalUser()
  @Get('lookup')
  lookup(
    @Query('uid') uid: string,
    @OptionalAuth() viewer: AuthState | null,
    @Req() req: Request,
  ): Promise<S['Gig']> {
    return this.pages.lookup(uid, this.ctx(req).locale, viewer?.userId ?? null);
  }

  @OptionalUser()
  @Get(':gigId')
  get(
    @Param('gigId') gigId: string,
    @OptionalAuth() viewer: AuthState | null,
    @Req() req: Request,
  ): Promise<S['Gig']> {
    return this.pages.get(gigId, this.ctx(req).locale, viewer?.userId ?? null);
  }

  @OptionalUser()
  @Get(':gigId/related')
  related(
    @Param('gigId') gigId: string,
    @OptionalAuth() viewer: AuthState | null,
    @Req() req: Request,
  ): Promise<S['GigRelatedList']> {
    return this.pages.related(gigId, this.ctx(req).locale, viewer?.userId ?? null);
  }

  /** 202 at once; the visit is recorded after the answer (GigViews). The global write limit gives the 429. */
  @OptionalUser()
  @Post(':gigId/views')
  @HttpCode(202)
  async recordView(
    @Param('gigId') gigId: string,
    @OptionalAuth() viewer: AuthState | null,
    @Body() body: S['GigViewCreateRequest'] | undefined,
    @Req() req: Request,
  ): Promise<void> {
    const ctx = this.ctx(req);
    await this.views.accept({
      gigId,
      viewerId: viewer?.userId ?? null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      client: ctx.client,
      locale: ctx.locale,
      referrer: body?.referrer ?? null,
    });
  }

  @Get(':gigId/analytics')
  analyticsOf(
    @CurrentAuth() auth: AuthState,
    @Param('gigId') gigId: string,
  ): Promise<S['GigAnalytics']> {
    return this.analytics.get(auth.userId, gigId);
  }

  @Get(':gigId/owner-view')
  ownerView(
    @CurrentAuth() auth: AuthState,
    @Param('gigId') gigId: string,
  ): Promise<S['GigOwnerView']> {
    return this.gigs.getOwnerView(auth.userId, gigId);
  }

  @Post()
  @HttpCode(201)
  create(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['GigCreateRequest'],
    @Req() req: Request,
  ): Promise<S['GigOwnerView']> {
    return this.gigs.create(auth.userId, body, this.ctx(req));
  }

  @Patch(':gigId')
  update(
    @CurrentAuth() auth: AuthState,
    @Param('gigId') gigId: string,
    @Body() body: S['GigUpdateRequest'],
    @Req() req: Request,
  ): Promise<S['GigOwnerView']> {
    return this.gigs.update(auth.userId, gigId, body, this.ctx(req));
  }

  @Delete(':gigId')
  @HttpCode(204)
  remove(@CurrentAuth() auth: AuthState, @Param('gigId') gigId: string): Promise<void> {
    return this.gigs.remove(auth.userId, gigId);
  }
}
