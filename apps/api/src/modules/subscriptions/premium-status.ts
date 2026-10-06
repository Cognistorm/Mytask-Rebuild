// The one place that answers "does this user have active Premium?" (spec 00 R-2.1, spec 03 AC-17, Q-069).
// Until slice 8 (spec 09 subscriptions) nobody has Premium: every answer is `false` / no end date, and the ranking
// fragment selects nobody. Slice 8 replaces the bodies (subscriptions table, cached at most 60 s, BR-113); every
// reader (Me, profiles, user summaries, gig cards, search ranking, staff views) already asks here.
import { Global, Injectable, Module } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';

export interface PremiumState {
  isActive: boolean;
  endsAt: Date | null;
}

@Injectable()
export class PremiumStatus {
  /** The users among `userIds` whose Premium plan is active now. */
  async activeAmong(userIds: readonly string[]): Promise<Set<string>> {
    void userIds;
    return new Set();
  }

  async isActive(userId: string): Promise<boolean> {
    return (await this.activeAmong([userId])).has(userId);
  }

  /** Plan state for `Me` and staff views (`plan`, `premiumEndsAt`). */
  async state(userId: string): Promise<PremiumState> {
    return { isActive: await this.isActive(userId), endsAt: null };
  }

  /**
   * SQL subquery returning the ids (uuid) of users with active Premium: search ranking puts their gigs first
   * (spec 03 R-S3) with `owner_id IN (…)`, so the boost is decided by the same source as the badge.
   */
  activeUsersSql(): Prisma.Sql {
    return Prisma.sql`SELECT NULL::uuid WHERE false`;
  }
}

@Global()
@Module({ providers: [PremiumStatus], exports: [PremiumStatus] })
export class PremiumModule {}
