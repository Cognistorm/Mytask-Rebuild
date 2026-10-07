// The plan limit on gigs (spec 00 R-2.1, AC-5; spec 04 AC-1…AC-3, R-G3): non-deleted gigs (active, pending,
// rejected) against S-001 (Standard) or S-002 (Premium, from `PremiumStatus`); null = unlimited. Read when the
// wizard opens (`getGigCreationEligibility`) and again inside the `createGig` transaction (4.3.3b), where the
// caller locks the owner row first so two submits cannot both pass.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { PremiumStatus } from '../subscriptions/premium-status';

type Eligibility = components['schemas']['GigCreationEligibility'];

@Injectable()
export class GigLimits {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly premium: PremiumStatus,
  ) {}

  async eligibility(
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ): Promise<Eligibility> {
    const premium = await this.premium.isActive(userId);
    const settingId = premium ? 'S-002' : 'S-001';
    const [gigLimit, gigCount] = await Promise.all([
      this.settings.get(settingId),
      db.gig.count({ where: { ownerId: userId, status: { not: 'deleted' } } }),
    ]);
    return {
      canCreate: gigLimit === null || gigCount < gigLimit,
      plan: premium ? 'premium' : 'standard',
      gigCount,
      gigLimit,
      settingId,
    };
  }
}
