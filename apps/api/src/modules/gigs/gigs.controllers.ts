// Contract: getGigCreationEligibility (ROADMAP 4.3.3a), createGig (4.3.3b). updateGig and deleteGig follow in 4.3.3c.
import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Request } from 'express';
import { ClientIpResolver } from '../../platform/client-ip/client-ip.resolver';
import { CurrentAuth, type AuthState } from '../auth/auth.guard';
import { buildContext } from '../auth/request-context';
import { GigLimits } from './gig-limits';
import { GigsService } from './gigs.service';

type S = components['schemas'];

@Controller('gigs')
export class GigsController {
  constructor(
    private readonly limits: GigLimits,
    private readonly gigs: GigsService,
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

  @Post()
  @HttpCode(201)
  create(
    @CurrentAuth() auth: AuthState,
    @Body() body: S['GigCreateRequest'],
    @Req() req: Request,
  ): Promise<S['GigOwnerView']> {
    return this.gigs.create(auth.userId, body, this.ctx(req));
  }
}
