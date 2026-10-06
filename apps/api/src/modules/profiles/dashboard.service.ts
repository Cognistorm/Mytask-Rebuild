// Selling Home read-model (ROADMAP 4.1.14; spec 02 AC-6, AC-7, R-P1). Every active user has it (no seller check).
// Ledger, gigs, orders, awards and conversations do not exist yet: their figures keep the contract's neutral
// values (0 / []) until each later slice fills its part (handoff 4.1.1 §C). Nothing is invented here.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { SettingsService } from '../../platform/settings/settings.service';

type S = components['schemas'];

const ZERO: S['Money'] = { amount: 0, currency: 'GEL' };

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async getSelling(userId: string): Promise<S['DashboardSelling']> {
    const [user, idVerified, projectsEnabled] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, createdAt: true, profile: { select: { fullname: true } } },
      }),
      this.prisma.kycVerification.count({ where: { userId, status: 'verified' } }),
      this.settings.get('S-075'),
    ]);
    // The auth guard already refused deleted accounts; a row removed mid-request is a 401 like a lost session.
    if (!user) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    return {
      user: {
        fullName: user.profile?.fullname ?? user.username,
        isIdVerified: idVerified > 0,
        createdAt: user.createdAt.toISOString(),
      },
      kpis: {
        // Ledger: slice 4 (spec 05).
        earnings: { ...ZERO },
        availableBalance: { ...ZERO },
        pendingBalance: { ...ZERO },
        // Gigs and impressions: slice 3 (spec 04).
        totalReach: 0,
        totalGigs: 0,
        // Accepted awards: slice 10 (spec 11).
        awardedProjects: 0,
        // Orders: slice 5 (spec 06).
        completedOrders: 0,
        pendingOrders: 0,
        ordersInProgress: 0,
        canceledOrders: 0,
      },
      // Conversations with unread messages (up to 6): slice 7 (spec 08).
      unreadContacts: [],
      // Latest 7 paid orders: slice 5 (spec 06).
      latestOrders: [],
      // Latest 7 awarded projects while S-075 is ON: slice 10 (spec 11).
      latestAwardedProjects: projectsEnabled ? [] : null,
    };
  }
}
