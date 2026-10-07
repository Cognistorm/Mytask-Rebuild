// Contract: getGigCreationEligibility (ROADMAP 4.3.3a). createGig, updateGig and deleteGig follow in 4.3.3b/c.
import { Controller, Get } from '@nestjs/common';
import type { components } from '@mytask/types';
import { CurrentAuth, type AuthState } from '../auth/auth.guard';
import { GigLimits } from './gig-limits';

type S = components['schemas'];

@Controller('gigs')
export class GigsController {
  constructor(private readonly limits: GigLimits) {}

  @Get('creation-eligibility')
  creationEligibility(@CurrentAuth() auth: AuthState): Promise<S['GigCreationEligibility']> {
    return this.limits.eligibility(auth.userId);
  }
}
