// Slice 01 part A — signed-in account security operations (spec 01 AC-20, AC-21, AC-31, AC-35, AC-43,
// AC-44, AC-55). Accounts without a password (social, part B) use emailed codes; until social login exists
// every account has a password, so those branches answer with the contract's code flow errors.
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import type { User } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { AvatarReader } from './avatar.reader';
import { toMe } from './me.mapper';
import { PasswordService } from './password.service';
import type { RequestContext } from './request-context';
import { SessionsService } from './sessions.service';
import { ThrottleService } from './throttle.service';
import { TwoFactorService, userOwner } from './two-factor.service';
import { parseUserAgent } from './user-agent';

type S = components['schemas'];

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly throttle: ThrottleService,
    private readonly twoFactor: TwoFactorService,
    private readonly outbox: OutboxService,
    private readonly avatars: AvatarReader,
  ) {}

  async me(userId: string): Promise<S['Me']> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        profile: { include: { country: true } },
        socialAccounts: { select: { provider: true } },
      },
    });
    // The open email-change link, if any (spec 02 AC-30: `t_email_change_pending`).
    const pending = await this.prisma.authToken.findFirst({
      where: { userId, purpose: 'email_change', consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { newEmail: true },
    });
    return toMe(
      user,
      await this.settings.get('S-056'),
      await this.avatars.get(user.profile?.avatarFileId),
      pending?.newEmail ?? null,
    );
  }

  /** AC-35 + AC-55: change password with the current one; other sessions end, this one stays. */
  async changePassword(
    userId: string,
    sessionId: string,
    input: S['PasswordChangeRequest'],
    ctx: RequestContext,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash)
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
    await this.checkCurrentPassword(user, input.currentPassword, ctx);
    if (input.password !== input.passwordConfirmation) {
      throw this.fieldError(ctx, 'passwordConfirmation', 'same', 't_validator_same');
    }
    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash, passwordAlgo: 'argon2id', passwordChangedAt: new Date() },
      });
      await tx.trustedDevice.deleteMany({ where: { userId } }); // AC-31
      await this.twoFactor.cancelOpen({ kind: 'user', id: userId }, tx); // SEC-37
      await this.sessions.revokeWhere({ userId, id: { not: sessionId } }, 'password_change', tx);
      await this.outbox.add('EV-05', { type: 'user', id: userId }, { userId, params: {} }, tx);
    });
    return {
      messageKey: 't_ur_account_password_updated',
      message: ctx.t('t_ur_account_password_updated'),
      params: {},
    };
  }

  /** AC-43: every live session, most recently active first, with the "this device" marker. */
  async listSessions(userId: string, currentSessionId: string): Promise<S['SessionPage']> {
    const rows = await this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      take: 100,
    });
    return {
      data: rows.map((s) => {
        const { browser, os } = parseUserAgent(s.userAgent);
        return {
          id: s.id,
          client: s.client === 'admin' ? 'web' : s.client,
          deviceLabel: s.deviceLabel,
          browser,
          os,
          ip: s.ip ?? '',
          countryCode: null,
          createdAt: s.createdAt.toISOString(),
          lastActiveAt: s.lastUsedAt.toISOString(),
          isCurrent: s.id === currentSessionId,
        };
      }),
      nextCursor: null,
    };
  }

  /** AC-44: end every other session after the current password (or an emailed code, part B). */
  async revokeOthers(
    userId: string,
    sessionId: string,
    input: S['SessionRevokeOthersRequest'],
    ctx: RequestContext,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.reauthenticate(user, input, 'revoke_sessions', ctx);
    const revokedCount = await this.sessions.revokeWhere(
      { userId, id: { not: sessionId } },
      'user_revoked',
    );
    return { revokedCount };
  }

  /**
   * Accounts without a password confirm sensitive changes with an emailed code of one purpose (SEC-05,
   * Q-144; spec 01 AC-21, AC-44). Accounts with a password use the password (409).
   */
  async createChallenge(
    userId: string,
    input: S['TwoFactorChallengeCreateRequest'],
    ctx: RequestContext,
  ) {
    const purpose = input?.purpose ?? 'toggle_two_factor';
    if (purpose === 'toggle_two_factor' && !(await this.settings.get('S-056'))) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_toast_something_went_wrong', {
        settingId: 'S-056',
      });
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.passwordHash)
      throw new ApiException(409, 'STATE_CONFLICT', 't_toast_something_went_wrong');
    return this.twoFactor.createChallenge(userOwner(user), purpose, null, ctx.ip, ctx.t);
  }

  /** AC-20, AC-21, AC-31: switch email 2FA on or off after re-authentication. */
  async updateTwoFactor(
    userId: string,
    input: S['TwoFactorSettingUpdateRequest'],
    ctx: RequestContext,
  ) {
    if (!(await this.settings.get('S-056'))) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_toast_something_went_wrong', {
        settingId: 'S-056',
      });
    }
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await this.reauthenticate(user, input, 'toggle_two_factor', ctx);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { twoFactorEnabled: input.enabled } });
      if (!input.enabled) {
        await tx.trustedDevice.deleteMany({ where: { userId } });
        await this.twoFactor.cancelOpen({ kind: 'user', id: userId }, tx); // SEC-37
      }
    });
    const key = input.enabled ? 't_2fa_enabled' : 't_2fa_disabled';
    return {
      enabled: input.enabled,
      available: true,
      notice: { messageKey: key, message: ctx.t(key), params: {} },
    };
  }

  // ------------------------------------------------------------------ re-authentication (AC-55, SEC-04)

  /** Current password, or for accounts without one an emailed code of `purpose` (also used by updateMe). */
  async reauthenticate(
    user: User,
    input: { currentPassword?: string | null; challengeId?: string | null; code?: string | null },
    purpose: 'revoke_sessions' | 'toggle_two_factor' | 'email_change',
    ctx: RequestContext,
  ): Promise<void> {
    if (user.passwordHash) {
      if (!input.currentPassword)
        throw this.fieldError(ctx, 'currentPassword', 'required', 't_validator_required');
      await this.checkCurrentPassword(user, input.currentPassword, ctx);
      return;
    }
    // Account without a password: a code of this purpose sent to the current address (SEC-05).
    if (!input.challengeId || !input.code)
      throw this.fieldError(ctx, 'code', 'required', 't_validator_required');
    const attempt = await this.reserveInSession(user.id);
    try {
      await this.twoFactor.verify(input.challengeId, input.code, purpose, {
        kind: 'user',
        id: user.id,
      });
    } catch (err) {
      // Unknown, used, other-purpose or other-user challenge: these operations declare no 404 (3.17c).
      const e =
        err instanceof ApiException && err.code === 'NOT_FOUND'
          ? new ApiException(422, 'TWO_FACTOR_CODE_EXPIRED', 't_2fa_code_expired')
          : err;
      if (e instanceof ApiException && /^TWO_FACTOR_(CODE_|TOO_MANY)/.test(e.code)) {
        await this.throttle.inSessionFailed(user.id, attempt);
      } else {
        await this.throttle.releaseInSession(user.id);
      }
      throw e;
    }
    await this.throttle.releaseInSession(user.id);
  }

  private async checkCurrentPassword(
    user: User,
    password: string,
    ctx: RequestContext,
  ): Promise<void> {
    const attempt = await this.reserveInSession(user.id);
    const result = await this.passwords.verify(password, user.passwordHash, user.passwordAlgo);
    if (!result.ok) {
      await this.throttle.inSessionFailed(user.id, attempt);
      // Wrong current passwords also count towards the per-account login counter (AC-55 -> AC-53).
      await this.throttle.loginFailed(user.email, ctx.ip);
      throw this.fieldError(ctx, 'currentPassword', 'mismatch', 't_ur_current_pass_does_not_match');
    }
    await this.throttle.releaseInSession(user.id);
  }

  /** SEC-04 + SEC-34: refuse while locked, else reserve one check atomically (parallel-safe). */
  private async reserveInSession(principal: string): Promise<number> {
    const refuse = async () => {
      const lock = Math.max(1, await this.throttle.inSessionLockSeconds(principal));
      return new ApiException(429, 'RATE_LIMITED', 't_too_many_login_attempts', {
        retryAfterSeconds: lock,
        params: { minutes: Math.ceil(lock / 60) },
      });
    };
    if ((await this.throttle.inSessionLockSeconds(principal)) > 0) throw await refuse();
    const attempt = await this.throttle.reserveInSession(principal);
    if (attempt === null) throw await refuse();
    return attempt;
  }

  fieldError(ctx: RequestContext, field: string, code: string, messageKey: string) {
    return new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
      fields: [{ field, code, message: ctx.t(messageKey), messageKey }],
    });
  }
}
