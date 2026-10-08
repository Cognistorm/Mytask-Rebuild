// The plan limit on gigs (spec 00 R-2.1, AC-5; spec 04 AC-1…AC-3, R-G3): non-deleted gigs (active, pending,
// rejected) against S-001 (Standard) or S-002 (Premium, from `PremiumStatus`); null = unlimited. Read when the
// wizard opens (`getGigCreationEligibility`) and again inside the `createGig` transaction, where `lockAndCount`
// locks the owner row first so two submits cannot both pass. A staff restore (`adminRestoreGig`) checks it the same way.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { PremiumStatus } from '../subscriptions/premium-status';

type Eligibility = components['schemas']['GigCreationEligibility'];
export type GigPlanLimit = Omit<Eligibility, 'canCreate' | 'gigCount'>;

const NOT_DELETED = { status: { not: 'deleted' } } as const;

@Injectable()
export class GigLimits {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly premium: PremiumStatus,
  ) {}

  /** The caller's plan and limit. Read before a transaction starts (a settings read inside it would wait). */
  async limitFor(userId: string): Promise<GigPlanLimit> {
    const premium = await this.premium.isActive(userId);
    const settingId = premium ? 'S-002' : 'S-001';
    return {
      plan: premium ? 'premium' : 'standard',
      gigLimit: await this.settings.get(settingId),
      settingId,
    };
  }

  async eligibility(userId: string): Promise<Eligibility> {
    const [limit, gigCount] = await Promise.all([
      this.limitFor(userId),
      this.prisma.gig.count({ where: { ownerId: userId, ...NOT_DELETED } }),
    ]);
    return { ...limit, canCreate: allows(limit, gigCount), gigCount };
  }

  /**
   * Inside the create transaction: locks the owner's user row (concurrent creates of the same owner queue here
   * until the first commits), then counts. True when one more gig fits the limit.
   */
  async lockAndCheck(tx: Prisma.TransactionClient, userId: string, limit: GigPlanLimit) {
    return allows(limit, await this.lockAndCount(tx, userId));
  }

  /** The owner's non-deleted gigs, counted under the owner row lock (createGig, adminRestoreGig). */
  async lockAndCount(tx: Prisma.TransactionClient, userId: string): Promise<number> {
    await tx.$executeRaw`SELECT 1 FROM "users" WHERE "id" = ${userId}::uuid FOR UPDATE`;
    return tx.gig.count({ where: { ownerId: userId, ...NOT_DELETED } });
  }
}

export function allows(limit: GigPlanLimit, gigCount: number): boolean {
  return limit.gigLimit === null || gigCount < limit.gigLimit;
}
