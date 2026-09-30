// Staff authentication (spec 01 AC-29, AC-51; spec 16 AC-2, AC-7; ADR-002; ADR-010).
// Staff identities are separate from users: user credentials never open the admin.
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { randomToken, sha256 } from '../../platform/crypto';
import { RedisService } from '../../platform/redis/redis.module';
import { SettingsService } from '../../platform/settings/settings.service';
import { AuditService } from '../../platform/audit/audit.service';
import { STEP_UP_SECONDS } from '../auth/auth.constants';
import { PasswordService } from '../auth/password.service';
import { RecaptchaService } from '../auth/recaptcha.service';
import { SessionsService, type IssuedTokens } from '../auth/sessions.service';
import { ThrottleService } from '../auth/throttle.service';
import { TwoFactorService, type CodeOwner } from '../auth/two-factor.service';
import type { RequestContext } from '../auth/request-context';
import { PERMISSIONS } from './permissions';

type S = components['schemas'];

export interface StaffSessionResult {
  kind: 'session';
  body: S['AdminAuthSession'];
  tokens: IssuedTokens;
  deviceId: string;
}
export interface StaffChallengeResult {
  kind: 'challenge';
  body: S['AdminAuthTwoFactorChallenge'];
  deviceId: string;
}

const LOGIN_FAILED = () =>
  new ApiException(401, 'STAFF_LOGIN_FAILED', 't_invalid_login_credentials_pls_try_again');

@Injectable()
export class StaffAuthService {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
    private readonly passwords: PasswordService,
    private readonly recaptcha: RecaptchaService,
    private readonly sessions: SessionsService,
    private readonly throttle: ThrottleService,
    private readonly twoFactor: TwoFactorService,
    private readonly audit: AuditService,
  ) {}

  async login(
    input: S['AdminAuthLoginRequest'],
    ctx: RequestContext,
  ): Promise<StaffSessionResult | StaffChallengeResult> {
    await this.assertNotBanned(ctx.ip);
    // Staff login is always subject to S-061 (spec 01 R-A10).
    if (
      (await this.recaptcha.enabled()) &&
      !(await this.recaptcha.verify(input.recaptchaToken, ctx.ip))
    ) {
      throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_recaptcha', {
        fields: [
          {
            field: 'recaptchaToken',
            code: 'recaptcha',
            message: ctx.t('t_validator_recaptcha'),
            messageKey: 't_validator_recaptcha',
          },
        ],
      });
    }
    const login = input.login.trim();
    const staff = await this.prisma.staff.findFirst({
      where: { OR: [{ email: login }, { username: login }] },
    });
    const check = await this.passwords.verify(
      input.password,
      staff?.passwordHash ?? null,
      staff?.passwordAlgo ?? null,
    );
    if (!staff || !check.ok || staff.status !== 'active') {
      await this.failedLogin(ctx.ip);
      throw LOGIN_FAILED();
    }
    await this.prisma.bannedIp.updateMany({
      where: { ip: ctx.ip, bannedAt: null },
      data: { failedAttempts: 0 },
    });
    if (check.upgradedHash) {
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { passwordHash: check.upgradedHash, passwordAlgo: 'argon2id' },
      });
    }
    const deviceId = ctx.deviceId ?? randomToken();
    if (await this.twoFactor.isStaffRequired(staff.id, sha256(deviceId), ctx.ip)) {
      const owner: CodeOwner = {
        kind: 'staff',
        id: staff.id,
        email: staff.email,
        username: staff.username,
        locale: staff.locale,
      };
      const c = await this.twoFactor.createChallenge(
        owner,
        'login',
        sha256(deviceId),
        ctx.ip,
        ctx.t,
      );
      return {
        kind: 'challenge',
        deviceId,
        body: {
          challengeId: c.challengeId,
          channel: 'email',
          maskedEmail: c.emailMasked,
          expiresAt: c.expiresAt,
          resendAvailableAt: c.resendAvailableAt,
        },
      };
    }
    return this.issue(staff.id, deviceId, ctx);
  }

  async verifyTwoFactor(input: S['AdminAuthTwoFactorVerifyRequest'], ctx: RequestContext) {
    await this.assertNotBanned(ctx.ip);
    let staffId: string;
    try {
      ({
        owner: { id: staffId },
      } = await this.twoFactor.verify(input.challengeId, input.code, 'login', { kind: 'staff' }));
    } catch (e) {
      // Every wrong staff login code also counts as a failed staff login (SEC-03, spec 01 AC-54).
      if (e instanceof ApiException && e.code.startsWith('STAFF_TWO_FACTOR_CODE')) {
        await this.failedLogin(ctx.ip);
      }
      throw e;
    }
    const deviceId = ctx.deviceId ?? randomToken();
    await this.twoFactor.trust(
      { kind: 'staff', id: staffId },
      sha256(deviceId),
      ctx.ip,
      ctx.userAgent,
    );
    return this.issue(staffId, deviceId, ctx);
  }

  async resend(input: S['AdminAuthTwoFactorResendRequest'], ctx: RequestContext) {
    const c = await this.twoFactor.resend(input.challengeId, ctx.t, 'staff');
    return {
      challengeId: c.challengeId,
      channel: 'email' as const,
      maskedEmail: c.emailMasked,
      expiresAt: c.expiresAt,
      resendAvailableAt: c.resendAvailableAt,
    };
  }

  async refresh(raw: string | undefined, ctx: RequestContext): Promise<StaffSessionResult> {
    if (!raw) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    const out = await this.sessions.refresh(raw, ctx.ip, 'staff');
    if (out.kind !== 'ok') throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    return {
      kind: 'session',
      tokens: out.tokens,
      deviceId: '',
      body: await this.sessionBody(out.userId, out.tokens),
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.revokeWhere({ id: sessionId }, 'logout');
    await this.redis.client.del(`auth:stepup:${sessionId}`);
  }

  /** AC-7: re-authentication opens a 15-minute step-up window for THIS session only (ADR-002 §6). */
  async reauthenticate(
    staffId: string,
    sessionId: string,
    input: S['AdminAuthReauthRequest'],
    ctx: RequestContext,
  ): Promise<S['AdminAuthReauthResult']> {
    if (input.method !== 'password') {
      // Emailed re-authentication codes (adminRequestReauthCode) arrive with a data-model purpose for them.
      throw new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
        fields: [
          {
            field: 'method',
            code: 'unsupported',
            message: 'password',
            messageKey: 't_validator_required',
          },
        ],
      });
    }
    const principal = `staff:${staffId}`;
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
    const staff = await this.prisma.staff.findUniqueOrThrow({ where: { id: staffId } });
    const check = await this.passwords.verify(
      input.password,
      staff.passwordHash,
      staff.passwordAlgo,
    );
    if (!check.ok) {
      await this.throttle.inSessionFailed(principal, attempt);
      throw new ApiException(
        422,
        'STAFF_CURRENT_PASSWORD_WRONG',
        't_ur_current_pass_does_not_match',
      );
    }
    await this.throttle.releaseInSession(principal);
    await this.redis.client.set(`auth:stepup:${sessionId}`, '1', 'EX', STEP_UP_SECONDS);
    await this.audit.write({
      actorStaffId: staffId,
      action: 'staff.reauthenticate',
      targetType: 'session',
      targetId: sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { reauthenticatedUntil: new Date(Date.now() + STEP_UP_SECONDS * 1000).toISOString() };
  }

  async me(staffId: string, sessionId?: string): Promise<S['AdminMe']> {
    const staff = await this.prisma.staff.findUniqueOrThrow({
      where: { id: staffId },
      include: { roles: { include: { role: { include: { permissions: true } } } } },
    });
    const isSuperAdmin = staff.roles.some((r) => r.role.isSystem);
    const permissions = isSuperAdmin
      ? [...PERMISSIONS]
      : [...new Set(staff.roles.flatMap((r) => r.role.permissions.map((p) => p.permissionCode)))];
    const stepUpTtl = sessionId ? await this.redis.client.ttl(`auth:stepup:${sessionId}`) : -1;
    return {
      id: staff.id,
      username: staff.username,
      fullName: staff.fullName,
      email: staff.email,
      pendingEmail: null,
      locale: staff.locale,
      roles: staff.roles.map((r) => ({
        id: r.role.id,
        code: r.role.code,
        name: r.role.name,
        isSystem: r.role.isSystem,
      })),
      permissions: permissions as S['PermissionCode'][],
      isSuperAdmin,
      twoFactorRequired: await this.settings.get('S-060'),
      reauthenticatedUntil:
        stepUpTtl > 0 ? new Date(Date.now() + stepUpTtl * 1000).toISOString() : null,
      lastLoginAt: staff.lastLoginAt?.toISOString() ?? null,
    };
  }

  // ------------------------------------------------------------------ helpers

  private async issue(
    staffId: string,
    deviceId: string,
    ctx: RequestContext,
  ): Promise<StaffSessionResult> {
    const tokens = await this.sessions.create({
      staffId,
      client: 'admin',
      deviceIdHash: sha256(deviceId),
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    await this.prisma.staff.update({ where: { id: staffId }, data: { lastLoginAt: new Date() } });
    await this.audit.write({
      actorStaffId: staffId,
      action: 'staff.login',
      targetType: 'staff',
      targetId: staffId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { kind: 'session', tokens, deviceId, body: await this.sessionBody(staffId, tokens) };
  }

  private async sessionBody(staffId: string, tokens: IssuedTokens): Promise<S['AdminAuthSession']> {
    // SEC-17: the admin host is cookie-only; body tokens exist only for API tests.
    const body = this.env.STAFF_BODY_TOKENS_ENABLED;
    return {
      staff: await this.me(staffId),
      accessToken: body ? tokens.accessToken : null,
      accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
      refreshToken: body ? tokens.refreshToken : null,
      sessionExpiresAt: tokens.refreshTokenExpiresAt.toISOString(),
    };
  }

  private async assertNotBanned(ip: string): Promise<void> {
    const ban = await this.prisma.bannedIp.findUnique({ where: { ip } });
    if (ban?.bannedAt) throw new ApiException(403, 'STAFF_IP_BANNED', 't_ip_banned');
  }

  /** Spec 01 AC-51 (legacy BannedIp): S-064 failed staff logins from one IP ban it from the staff login. */
  private async failedLogin(ip: string): Promise<void> {
    const threshold = await this.settings.get('S-064');
    const row = await this.prisma.bannedIp.upsert({
      where: { ip },
      create: { ip, failedAttempts: 1 },
      update: { failedAttempts: { increment: 1 } },
    });
    if (!row.bannedAt && row.failedAttempts >= threshold) {
      await this.prisma.bannedIp.update({
        where: { ip },
        data: { bannedAt: new Date(), source: 'auto_threshold' },
      });
      await this.audit.write({
        action: 'security.ip_ban.auto',
        targetType: 'ip',
        targetId: ip,
        ip,
      });
    }
  }
}
