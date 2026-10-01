// Staff authentication (spec 01 AC-29, AC-51; spec 16 AC-2, AC-7; ADR-002; ADR-010).
// Staff identities are separate from users: user credentials never open the admin.
import { Inject, Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { ipBucket } from '../../platform/client-ip/client-ip.resolver';
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
    // SEC-57: the attempt counts before the password is checked, so a parallel burst cannot outrun the ban.
    const ipKey = ipBucket(ctx.ip);
    const threshold = await this.settings.get('S-064');
    const attempt = await this.reserveAttempt(ipKey);
    if (attempt > threshold) {
      await this.ban(ipKey, ctx.ip);
      throw new ApiException(403, 'STAFF_IP_BANNED', 't_ip_banned');
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
      if (attempt >= threshold) await this.ban(ipKey, ctx.ip);
      throw LOGIN_FAILED();
    }
    // A correct password only gives its own attempt back; earlier failures are cleared once a session is issued.
    await this.prisma.$executeRaw`
      UPDATE banned_ips SET failed_attempts = GREATEST(failed_attempts - 1, 0), updated_at = now()
      WHERE ip = ${ipKey}::inet`;
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

  async logout(staffId: string, sessionId: string, ctx: RequestContext): Promise<void> {
    await this.sessions.revokeWhere({ id: sessionId }, 'logout');
    await this.redis.client.del(`auth:stepup:${sessionId}`);
    await this.audit.write({
      actorStaffId: staffId,
      action: 'staff.logout',
      targetType: 'session',
      targetId: sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  /** AC-7: re-authentication opens a 15-minute step-up window for THIS session only (ADR-002 §6). */
  async reauthenticate(
    staffId: string,
    sessionId: string,
    input: S['AdminAuthReauthRequest'],
    ctx: RequestContext,
  ): Promise<S['AdminAuthReauthResult']> {
    if (input.method === 'email_code') await this.assertStaffTwoFactorOn();
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
    if (input.method === 'email_code') {
      // A code of the staff_reauth purpose of THIS staff member only (data-model §3.A).
      try {
        await this.twoFactor.verify(input.challengeId, input.code, 'staff_reauth', {
          kind: 'staff',
          id: staffId,
        });
      } catch (err) {
        // Unknown, used, other-purpose or other-staff challenge: the contract has no 404 here.
        const e =
          err instanceof ApiException && err.code === 'NOT_FOUND'
            ? new ApiException(422, 'STAFF_TWO_FACTOR_CODE_EXPIRED', 't_2fa_code_expired')
            : err;
        if (e instanceof ApiException && /^STAFF_TWO_FACTOR_(CODE_|TOO_MANY)/.test(e.code)) {
          await this.throttle.inSessionFailed(principal, attempt);
        } else {
          await this.throttle.releaseInSession(principal);
        }
        throw e;
      }
    } else {
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
    }
    await this.throttle.releaseInSession(principal);
    await this.redis.client.set(`auth:stepup:${sessionId}`, '1', 'EX', STEP_UP_SECONDS);
    await this.audit.write({
      actorStaffId: staffId,
      action: 'staff.reauth',
      targetType: 'session',
      targetId: sessionId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return { reauthenticatedUntil: new Date(Date.now() + STEP_UP_SECONDS * 1000).toISOString() };
  }

  /** Emails a step-up code (EV-06) when staff 2FA (S-060) is ON; 60 s cooldown, 5 per 15 min (spec 01 R-A6). */
  async requestReauthCode(
    staffId: string,
    ctx: RequestContext,
  ): Promise<S['AdminAuthTwoFactorChallenge']> {
    await this.assertStaffTwoFactorOn();
    const staff = await this.prisma.staff.findUniqueOrThrow({ where: { id: staffId } });
    const c = await this.twoFactor.createChallenge(
      {
        kind: 'staff',
        id: staff.id,
        email: staff.email,
        username: staff.username,
        locale: staff.locale,
      },
      'staff_reauth',
      null,
      ctx.ip,
      ctx.t,
    );
    await this.audit.write({
      actorStaffId: staffId,
      action: 'staff.reauth_code.request',
      targetType: 'staff',
      targetId: staffId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return {
      challengeId: c.challengeId,
      channel: 'email',
      maskedEmail: c.emailMasked,
      expiresAt: c.expiresAt,
      resendAvailableAt: c.resendAvailableAt,
    };
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
    // Legacy cleared the IP counter on a successful login (no admin 2FA there): here only a completed login
    // (session issued, after 2FA when it applies) clears it (SEC-57).
    await this.prisma.$executeRaw`
      UPDATE banned_ips SET failed_attempts = 0, updated_at = now()
      WHERE ip = ${ipBucket(ctx.ip)}::inet AND banned_at IS NULL`;
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

  private async assertStaffTwoFactorOn(): Promise<void> {
    if (!(await this.settings.get('S-060')))
      throw new ApiException(422, 'BUSINESS_RULE_VIOLATION', 't_2fa_disabled');
  }

  /** A manual ban of an address and an automatic ban of its IPv6 /64 both apply (SEC-57). */
  private async assertNotBanned(ip: string): Promise<void> {
    const rows = await this.prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM banned_ips WHERE banned_at IS NOT NULL AND ${ip}::inet <<= ip LIMIT 1`;
    if (rows.length > 0) throw new ApiException(403, 'STAFF_IP_BANNED', 't_ip_banned');
  }

  /** Counts one staff login attempt for the IP (or IPv6 /64) atomically; returns the new count. */
  private async reserveAttempt(ipKey: string): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ failed_attempts: number }[]>`
      INSERT INTO banned_ips (ip, failed_attempts, updated_at) VALUES (${ipKey}::inet, 1, now())
      ON CONFLICT (ip) DO UPDATE
        SET failed_attempts = banned_ips.failed_attempts + 1, updated_at = now()
      RETURNING failed_attempts`;
    return row!.failed_attempts;
  }

  /** Spec 01 AC-51 (legacy BannedIp): S-064 failed staff logins from one IP ban it from the staff login. */
  private async failedLogin(ip: string): Promise<void> {
    const ipKey = ipBucket(ip);
    const attempt = await this.reserveAttempt(ipKey);
    if (attempt >= (await this.settings.get('S-064'))) await this.ban(ipKey, ip);
  }

  private async ban(ipKey: string, ip: string): Promise<void> {
    const banned = await this.prisma.bannedIp.updateMany({
      where: { ip: ipKey, bannedAt: null },
      data: { bannedAt: new Date(), source: 'auto_threshold' },
    });
    if (banned.count > 0) {
      await this.audit.write({
        action: 'ip_ban.auto',
        targetType: 'ip',
        targetId: ipKey,
        ip,
      });
    }
  }
}
