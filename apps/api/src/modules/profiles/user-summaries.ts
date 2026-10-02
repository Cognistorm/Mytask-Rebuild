// `UserSummary` (embedded wherever a user appears) and `ModerationOwnerSummary` (next to every staff queue item,
// spec 16 AC-19), filled from this slice's data: avatar, KYC approved, online (R-P4), country. Premium and the
// plan wait for slice 9 (spec 10): `false` / `standard`. Reports count user reports only until gigs, projects
// and proposals exist.
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { PresenceService } from '../auth/presence.service';
import { imageVariants } from '../files/image-variants';

type S = components['schemas'];

@Injectable()
export class UserSummaries {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly presence: PresenceService,
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
    const [avatars, verified, online] = await Promise.all([
      avatarIds.length
        ? this.prisma.file.findMany({ where: { id: { in: avatarIds } } })
        : Promise.resolve([]),
      this.prisma.kycVerification.findMany({
        where: { userId: { in: unique }, status: 'verified' },
        select: { userId: true },
      }),
      this.presence.online(users),
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
            isPremium: false,
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
    const [user, summary, kyc, reportCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.one(userId),
      this.prisma.kycVerification.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true },
      }),
      this.prisma.report.count({
        where: { targetType: 'user', targetId: userId, status: 'pending' },
      }),
    ]);
    return {
      user: summary,
      status: user.status,
      isRestricted: user.isRestricted,
      isDeleted: user.deletedAt !== null,
      plan: 'standard',
      kycStatus: kyc?.status ?? 'none',
      reportCount,
      earlierRejectionCount,
    };
  }
}
