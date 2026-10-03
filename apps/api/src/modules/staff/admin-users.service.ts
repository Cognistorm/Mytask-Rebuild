// Staff actions on users that belong to slice 01: activate a pending account (spec 01 AC-5, spec 16 AC-32)
// and ban (spec 01 AC-45, P-16). Unban, restrict and the user list/detail screens complete in slice 16.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { User, UserProfile } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { ReferralService } from '../auth/referral.service';
import type { RequestContext } from '../auth/request-context';
import { SessionsService } from '../auth/sessions.service';
import { PremiumStatus, type PremiumState } from '../subscriptions/premium-status';

type S = components['schemas'];

export function toAdminUser(
  u: User & { profile: UserProfile | null },
  activeRestrictions = 0,
  premium: PremiumState = { isActive: false, endsAt: null },
): S['AdminUser'] {
  return {
    id: u.id,
    legacyId: u.legacyId === null ? null : Number(u.legacyId),
    username: u.username,
    email: u.email,
    pendingEmail: null,
    emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
    emailUndeliverable: false,
    fullName: u.profile?.fullname ?? u.username,
    headline: null,
    about: null,
    avatar: null,
    status: u.status,
    isRestricted: u.isRestricted,
    activeRestrictionCount: activeRestrictions,
    isDeleted: u.deletedAt !== null,
    deletedAt: u.deletedAt?.toISOString() ?? null,
    restorableUntil: null,
    bannedAt: u.bannedAt?.toISOString() ?? null,
    plan: premium.isActive ? 'premium' : 'standard',
    premiumEndsAt: premium.endsAt?.toISOString() ?? null,
    kycStatus: 'none',
    locale: u.locale,
    countryCode: null,
    city: null,
    hasPassword: u.passwordHash !== null,
    twoFactorEnabled: u.twoFactorEnabled,
    socialProviders: [],
    referralCode: u.referralCode,
    createdAt: u.createdAt.toISOString(),
    lastActivityAt: u.lastActivityAt?.toISOString() ?? null,
    lastLoginAt: null,
    lastLoginCountryCode: null,
  };
}

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly referrals: ReferralService,
    private readonly outbox: OutboxService,
    private readonly audit: AuditService,
    private readonly premium: PremiumStatus,
  ) {}

  async activate(
    userId: string,
    staffId: string,
    note: string | null | undefined,
    ctx: RequestContext,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.user.updateMany({
        where: { id: userId, status: 'pending', deletedAt: null },
        data: { status: 'active' },
      });
      if (changed.count !== 1) {
        const exists = await tx.user.count({ where: { id: userId, deletedAt: null } });
        if (!exists) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
        throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
      }
      await this.referrals.creditSignup(tx, userId); // ADR-002 §4: the single activation hook
      await this.outbox.add('EV-03', { type: 'user', id: userId }, { userId, params: {} }, tx);
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'users.activate',
          action: 'user.activate',
          targetType: 'user',
          targetId: userId,
          before: { status: 'pending' },
          after: { status: 'active' },
          reason: note ?? null,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
    return this.result(userId);
  }

  async ban(userId: string, staffId: string, reason: string, ctx: RequestContext) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    if (user.status === 'banned')
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: 'banned', bannedAt: new Date() },
      });
      // AC-45: every session ends at once; their next call answers ACCOUNT_SUSPENDED (deny-list reason "ban").
      await this.sessions.revokeWhere({ userId }, 'ban', tx);
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: 'users.ban',
          action: 'user.ban',
          targetType: 'user',
          targetId: userId,
          before: { status: user.status },
          after: { status: 'banned' },
          reason,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
    return this.result(userId);
  }

  private async result(userId: string): Promise<S['AdminUserActionResult']> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true },
    });
    return { user: toAdminUser(user, 0, await this.premium.state(userId)) };
  }
}
