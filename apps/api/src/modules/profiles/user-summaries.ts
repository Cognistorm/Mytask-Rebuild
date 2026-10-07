// `UserSummary` (embedded wherever a user appears) and `ModerationOwnerSummary` (next to every staff queue item,
// spec 16 AC-19), filled from this slice's data: avatar, KYC approved, online (R-P4), country. Premium and the
// plan come from PremiumStatus (nobody until slice 8, spec 09). Reports count open reports about the user and the user's
// gigs (4.3.7) until projects and proposals exist.
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { PresenceService } from '../auth/presence.service';
import { imageVariants } from '../files/image-variants';
import { PremiumStatus } from '../subscriptions/premium-status';

type S = components['schemas'];

@Injectable()
export class UserSummaries {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
    private readonly premium: PremiumStatus,
  ) {}

  /** Summaries by user id; unknown ids are left out. */
  async many(ids: string[]): Promise<Map<string, S['UserSummary']>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      include: { profile: { include: { country: true } } },
    });
    const avatarIds = users.flatMap((u) => u.profile?.avatarFileId ?? []);
    const [avatars, verified, online, premium] = await Promise.all([
      avatarIds.length
        ? this.prisma.file.findMany({ where: { id: { in: avatarIds } } })
        : Promise.resolve([]),
      this.prisma.kycVerification.findMany({
        where: { userId: { in: unique }, status: 'verified' },
        select: { userId: true },
      }),
      this.presence.online(users),
      this.premium.activeAmong(unique),
    ]);
    const verifiedIds = new Set(verified.map((v) => v.userId));
    return new Map(
      users.map((u) => {
        const file = avatars.find((f) => f.id === u.profile?.avatarFileId);
        return [
          u.id,
          {
            id: u.id,
            username: u.username,
            avatar: file ? imageVariants(file, this.env.PUBLIC_MEDIA_BASE_URL) : null,
            isPremium: premium.has(u.id),
            isIdVerified: verifiedIds.has(u.id),
            isOnline: online.has(u.id),
            countryCode: u.profile?.country?.iso2 ?? null,
            isDeleted: u.deletedAt !== null,
          },
        ];
      }),
    );
  }

  async one(id: string): Promise<S['UserSummary']> {
    const summary = (await this.many([id])).get(id);
    if (!summary) throw new Error(`user ${id} not found`);
    return summary;
  }

  /** `earlierRejectionCount` is the queue's own count (items of the same kind). */
  async owner(userId: string, earlierRejectionCount: number): Promise<S['ModerationOwnerSummary']> {
    const [user, summary, kyc, [reports]] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.one(userId),
      this.prisma.kycVerification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      }),
      // Open reports about the user and about the user's gigs (projects and proposals join in their slices).
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS "n" FROM "reports" r
        WHERE r."status" = 'pending'
          AND ((r."target_type" = 'user' AND r."target_id" = ${userId}::uuid)
            OR (r."target_type" = 'gig'
              AND r."target_id" IN (SELECT g."id" FROM "gigs" g WHERE g."owner_id" = ${userId}::uuid)))`,
    ]);
    return {
      user: summary,
      status: user.status,
      isRestricted: user.isRestricted,
      isDeleted: user.deletedAt !== null,
      plan: summary.isPremium ? 'premium' : 'standard',
      kycStatus: kyc?.status ?? 'none',
      reportCount: reports?.n ?? 0,
      earlierRejectionCount,
    };
  }
}
