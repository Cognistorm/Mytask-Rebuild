// Slice 01 part A — public auth operations (spec 01, ADR-002, contract tag Auth).
// Every successful login path ends in issueSession(), which checks status, restriction and 2FA (ADR-002 §4).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { Prisma, type User, type UserProfile } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { randomReferralCode, randomToken, sha256 } from '../../platform/crypto';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { toMe } from './me.mapper';
import { PasswordService } from './password.service';
import { RecaptchaService } from './recaptcha.service';
import { ReferralService } from './referral.service';
import { isCookieClient, type RequestContext } from './request-context';
import { SessionsService, type IssuedTokens } from './sessions.service';
import { ThrottleService } from './throttle.service';
import { TwoFactorService, userOwner, type ChallengeView } from './two-factor.service';

type S = components['schemas'];
type UserWithProfile = User & { profile: UserProfile | null };

export interface SessionResult {
  kind: 'session';
  body: S['AuthSession'];
  tokens: IssuedTokens;
  /** New raw device id to set as cookie (web) — also in body.deviceToken for mobile. */
  deviceId: string;
  rememberMe: boolean;
}
export interface ChallengeResult {
  kind: 'challenge';
  body: ChallengeView;
  deviceId: string;
}

const notice = (
  ctx: RequestContext,
  messageKey: string,
  params: Record<string, string | number> = {},
) => ({
  messageKey,
  message: ctx.t(messageKey, params),
  params,
});

const fieldError = (ctx: RequestContext, field: string, code: string, messageKey: string) =>
  new ApiException(400, 'VALIDATION_FAILED', 't_toast_something_went_wrong', {
    fields: [{ field, code, message: ctx.t(messageKey), messageKey }],
  });

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly throttle: ThrottleService,
    private readonly twoFactor: TwoFactorService,
    private readonly recaptcha: RecaptchaService,
    private readonly referrals: ReferralService,
    private readonly outbox: OutboxService,
  ) {}

  // ------------------------------------------------------------------ register (AC-1…AC-6, EC-1)

  async register(
    input: S['RegisterRequest'],
    ctx: RequestContext,
  ): Promise<{ result: S['RegisterResult']; session?: SessionResult }> {
    const wait = await this.throttle.registerWait(ctx.ip);
    if (wait > 0) {
      throw new ApiException(429, 'RATE_LIMITED', 't_too_many_requests', {
        retryAfterSeconds: wait,
      });
    }
    await this.requireRecaptcha(input.recaptchaToken, ctx);
    const [verificationRequired, method, linkMinutes] = await Promise.all([
      this.settings.get('S-052'),
      this.settings.get('S-053'),
      this.settings.get('S-054'),
    ]);
    const email = input.email.trim();
    const passwordHash = await this.passwords.hash(input.password);
    // Read settings before the transaction (never a second connection inside it).
    const adminRecipients = [...(await this.settings.get('S-100'))];

    let user: UserWithProfile;
    let verificationToken: string | undefined;
    try {
      ({ user, verificationToken } = await this.prisma.$transaction(async (tx) => {
        // Unique checks include deleted accounts (AC-2): citext columns make them case-insensitive.
        const clash = await tx.user.findFirst({
          where: { OR: [{ username: input.username }, { email }] },
          select: { username: true, email: true },
        });
        if (clash) {
          const field = clash.email.toLowerCase() === email.toLowerCase() ? 'email' : 'username';
          throw fieldError(ctx, field, 'unique', 't_validator_unique');
        }
        let referrerId: string | null = null;
        if (input.referralCode) {
          referrerId = await this.referrals.findReferrer(tx, input.referralCode);
          if (!referrerId)
            throw fieldError(ctx, 'referralCode', 'invalid', 't_referral_code_invalid');
        }
        const status = verificationRequired ? 'pending' : 'active';
        const created = await tx.user.create({
          data: {
            username: input.username,
            email,
            passwordHash,
            passwordAlgo: 'argon2id',
            status,
            emailVerifiedAt: null,
            locale: ctx.locale,
            referralCode: await this.uniqueReferralCode(tx),
            profile: { create: { fullname: input.fullName.trim() } },
          },
          include: { profile: true },
        });
        if (referrerId)
          await this.referrals.storePending(tx, referrerId, created.id, input.referralCode!);
        let token: string | undefined;
        if (status === 'active') {
          await this.referrals.creditSignup(tx, created.id); // EC-1
        } else if (method === 'email') {
          token = await this.issueLinkToken(
            tx,
            created.id,
            'email_verification',
            linkMinutes,
            ctx.ip,
          );
          await this.outbox.add(
            'EV-01',
            { type: 'user', id: created.id },
            { userId: created.id, params: { token, email: created.email } },
            tx,
          );
        } else {
          await this.outbox.add(
            'EV-02',
            { type: 'user', id: created.id },
            {
              to: adminRecipients,
              locale: 'ka',
              params: { username: created.username },
            },
            tx,
          );
        }
        return { user: created, verificationToken: token };
      }));
    } catch (e) {
      // Two registrations racing for the same username/email: the unique index decides.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = String((e.meta as { target?: unknown })?.target ?? '');
        throw fieldError(
          ctx,
          target.includes('email') ? 'email' : 'username',
          'unique',
          't_validator_unique',
        );
      }
      throw e;
    }
    void verificationToken;

    if (!verificationRequired) {
      const session = await this.issueSession(user, ctx, true, {
        skipTwoFactor: true,
        isNewAccount: true,
      });
      if (session.kind !== 'session') throw new Error('unreachable: 2FA skipped for a new account');
      return {
        result: { outcome: 'logged_in', session: session.body, notice: null },
        session,
      };
    }
    if (method === 'email') {
      return {
        result: {
          outcome: 'pending_email_verification',
          session: null,
          notice: notice(ctx, 't_register_verification_email_sent', {
            email: user.email,
            minutes: linkMinutes,
          }),
        },
      };
    }
    return {
      result: {
        outcome: 'pending_admin_review',
        session: null,
        notice: notice(ctx, 't_register_verification_admin_pending'),
      },
    };
  }

  // ------------------------------------------------------------------ login (AC-10…AC-19, AC-53)

  async login(
    input: S['LoginRequest'],
    ctx: RequestContext,
  ): Promise<SessionResult | ChallengeResult> {
    const email = input.email.trim();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { profile: true },
    });
    const deviceHash = ctx.deviceId ? sha256(ctx.deviceId) : null;

    // SEC-30: a trusted device, or a passed reCAPTCHA on web, is evaluated without taking the slot.
    const trusted = !!(
      user &&
      deviceHash &&
      (await this.twoFactor.isTrustedDevice(user.id, deviceHash))
    );
    const recaptchaOn = ctx.client === 'web' && (await this.recaptcha.enabled());
    const recaptchaPassed =
      recaptchaOn && (await this.recaptcha.verify(input.recaptchaToken, ctx.ip));
    if (recaptchaOn && !recaptchaPassed) {
      throw fieldError(ctx, 'recaptchaToken', 'recaptcha', 't_validator_recaptcha');
    }

    const gate = await this.throttle.loginGate(email, ctx.ip, trusted || recaptchaPassed);
    if (gate.kind === 'locked') {
      throw new ApiException(429, 'AUTH_LOGIN_LOCKED', 't_too_many_login_attempts', {
        retryAfterSeconds: gate.retryAfterSeconds,
        params: { minutes: Math.ceil(gate.retryAfterSeconds / 60) },
      });
    }
    if (gate.kind === 'throttled') {
      throw new ApiException(429, 'AUTH_LOGIN_THROTTLED', 't_login_slow_mode', {
        retryAfterSeconds: gate.retryAfterSeconds,
        params: { seconds: gate.retryAfterSeconds },
      });
    }

    const check = await this.passwords.verify(
      input.password,
      user?.passwordHash ?? null,
      user?.passwordAlgo ?? null,
    );
    if (!user || !check.ok) {
      const { slowModeStarted } = await this.throttle.loginFailed(email, ctx.ip);
      if (slowModeStarted && user && (await this.throttle.claimOncePerHour('slow', user.id))) {
        await this.outbox.add(
          'EV-128',
          { type: 'user', id: user.id },
          { userId: user.id, params: {} },
        );
      }
      throw new ApiException(
        401,
        'AUTH_INVALID_CREDENTIALS',
        't_invalid_login_credentials_pls_try_again',
      );
    }
    await this.throttle.loginSucceeded(email, ctx.ip);
    if (check.upgradedHash) {
      // AC-12: legacy bcrypt -> Argon2id in the same request.
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: check.upgradedHash, passwordAlgo: 'argon2id' },
      });
    }
    return this.issueSession(user, ctx, input.rememberMe ?? true);
  }

  async verifyTwoFactorLogin(
    input: S['TwoFactorVerifyRequest'],
    ctx: RequestContext,
  ): Promise<SessionResult> {
    const { owner } = await this.twoFactor.verify(input.challengeId, input.code, 'login');
    const user = await this.prisma.user.findUnique({
      where: { id: owner.id },
      include: { profile: true },
    });
    if (!user || user.deletedAt) throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    // The device that passed the code is the device that asked for it (web cookie / mobile token).
    const deviceId = ctx.deviceId ?? randomToken();
    await this.twoFactor.trust(
      { kind: 'user', id: user.id },
      sha256(deviceId),
      ctx.ip,
      ctx.userAgent,
    );
    const result = await this.issueSession(user, { ...ctx, deviceId }, true, {
      skipTwoFactor: true,
    });
    if (result.kind !== 'session') throw new Error('unreachable');
    return result;
  }

  resendTwoFactorCode(input: S['TwoFactorResendRequest'], ctx: RequestContext) {
    return this.twoFactor.resend(input.challengeId, ctx.t);
  }

  /**
   * ADR-002 §4: the one place a session is created. Checks status (pending/banned refused with their
   * messages), then 2FA; restricted users get a normal session (their calls are limited by the guard).
   */
  async issueSession(
    user: UserWithProfile,
    ctx: RequestContext,
    rememberMe: boolean,
    opts: { skipTwoFactor?: boolean; isNewAccount?: boolean } = {},
  ): Promise<SessionResult | ChallengeResult> {
    if (user.status === 'pending') {
      const method = await this.settings.get('S-053');
      throw new ApiException(
        403,
        'ACCOUNT_PENDING',
        method === 'email' ? 't_account_pending_verification' : 't_account_pending_admin_review',
        { verificationMethod: method },
      );
    }
    if (user.status === 'banned') {
      throw new ApiException(403, 'ACCOUNT_SUSPENDED', 't_account_suspended');
    }
    const deviceId = ctx.deviceId ?? randomToken();
    const deviceIdHash = sha256(deviceId);
    if (!opts.skipTwoFactor && (await this.twoFactor.isRequired(user, deviceIdHash, ctx.ip))) {
      const body = await this.twoFactor.createChallenge(
        userOwner(user),
        'login',
        deviceIdHash,
        ctx.ip,
        ctx.t,
      );
      return { kind: 'challenge', body, deviceId };
    }
    const tokens = await this.sessions.create({
      userId: user.id,
      client: ctx.client === 'admin' ? 'web' : ctx.client,
      deviceIdHash,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    const cookies = isCookieClient(ctx.client);
    const twoFactorAvailable = await this.settings.get('S-056');
    const socialAccounts = await this.prisma.socialAccount.findMany({
      where: { userId: user.id },
      select: { provider: true },
    });
    return {
      kind: 'session',
      tokens,
      deviceId,
      rememberMe,
      body: {
        user: toMe({ ...user, socialAccounts }, twoFactorAvailable),
        // Browsers get HttpOnly cookies instead of body tokens (ADR-002 §2).
        accessToken: cookies ? null : tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt.toISOString(),
        refreshToken: cookies ? null : tokens.refreshToken,
        refreshTokenExpiresAt: tokens.refreshTokenExpiresAt.toISOString(),
        deviceToken: cookies ? null : deviceId,
        isNewAccount: opts.isNewAccount ?? false,
      },
    };
  }

  // ------------------------------------------------------------------ refresh / logout (AC-42, AC-45)

  async refresh(rawToken: string | undefined, ctx: RequestContext): Promise<SessionResult> {
    if (!rawToken) throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    const outcome = await this.sessions.refresh(rawToken, ctx.ip);
    if (outcome.kind === 'banned')
      throw new ApiException(403, 'ACCOUNT_SUSPENDED', 't_account_suspended');
    if (outcome.kind === 'invalid')
      throw new ApiException(401, 'UNAUTHENTICATED', 't_unauthorized');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: outcome.userId },
      include: { profile: true, socialAccounts: { select: { provider: true } } },
    });
    const cookies = isCookieClient(ctx.client);
    return {
      kind: 'session',
      tokens: outcome.tokens,
      deviceId: ctx.deviceId ?? '',
      rememberMe: true,
      body: {
        user: toMe(user, await this.settings.get('S-056')),
        accessToken: cookies ? null : outcome.tokens.accessToken,
        accessTokenExpiresAt: outcome.tokens.accessTokenExpiresAt.toISOString(),
        refreshToken: cookies ? null : outcome.tokens.refreshToken,
        refreshTokenExpiresAt: outcome.tokens.refreshTokenExpiresAt.toISOString(),
        deviceToken: null,
        isNewAccount: false,
      },
    };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.revokeWhere({ id: sessionId }, 'logout');
  }

  // ------------------------------------------------------------------ email verification (AC-7…AC-9)

  async verifyEmail(input: S['EmailVerificationConfirmRequest'], ctx: RequestContext) {
    const token = await this.findLinkToken(input.token, input.email, 'email_verification');
    if (!token) throw new ApiException(422, 'AUTH_LINK_INVALID', 't_verification_email_not_exists');
    if (token.expiresAt <= new Date()) {
      throw new ApiException(422, 'AUTH_LINK_EXPIRED', 't_verification_email_link_expired');
    }
    await this.prisma.$transaction(async (tx) => {
      // Only a pending account is activated (AC-7 CHANGE: legacy activated any status).
      const activated = await tx.user.updateMany({
        where: { id: token.userId, status: 'pending', deletedAt: null },
        data: { status: 'active', emailVerifiedAt: new Date() },
      });
      if (activated.count !== 1) {
        throw new ApiException(422, 'AUTH_LINK_INVALID', 't_verification_email_not_exists');
      }
      await tx.authToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });
      await this.referrals.creditSignup(tx, token.userId);
    });
    return notice(ctx, 't_ur_account_has_been_successfully_verified_email');
  }

  async resendVerificationEmail(input: S['EmailVerificationResendRequest'], ctx: RequestContext) {
    const email = input.email.trim();
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    if (user && user.status !== 'pending') {
      throw new ApiException(409, 'AUTH_ALREADY_VERIFIED', 't_already_verified_user');
    }
    const allowed = await this.throttle.allowLinkEmail('verify', email, ctx.ip);
    if (user && allowed && (await this.settings.get('S-053')) === 'email') {
      const minutes = await this.settings.get('S-054');
      await this.prisma.$transaction(async (tx) => {
        const token = await this.issueLinkToken(tx, user.id, 'email_verification', minutes, ctx.ip);
        await this.outbox.add(
          'EV-01',
          { type: 'user', id: user.id },
          { userId: user.id, params: { token, email: user.email } },
          tx,
        );
      });
    }
    // Same answer for unknown emails and above the limit (R-A9, Q-130 default).
    return notice(ctx, 't_a_new_verification_link_has_been_sent_to_ur_email');
  }

  // ------------------------------------------------------------------ password reset (AC-32…AC-34, AC-36)

  async requestPasswordReset(input: S['PasswordResetRequest'], ctx: RequestContext) {
    const email = input.email.trim();
    const allowed = await this.throttle.allowLinkEmail('reset', email, ctx.ip);
    const user = await this.prisma.user.findFirst({ where: { email, deletedAt: null } });
    const eligible =
      user && user.passwordHash && ['active', 'verified', 'pending'].includes(user.status);
    if (allowed && eligible) {
      const minutes = await this.settings.get('S-055');
      await this.prisma.$transaction(async (tx) => {
        const token = await this.issueLinkToken(tx, user.id, 'password_reset', minutes, ctx.ip);
        await this.outbox.add(
          'EV-04',
          { type: 'user', id: user.id },
          { userId: user.id, params: { token, email: user.email } },
          tx,
        );
      });
    }
    return notice(ctx, 't_password_reset_link_sent_success');
  }

  async validatePasswordResetToken(input: S['PasswordResetTokenCheckRequest']): Promise<void> {
    await this.usableResetToken(input.token, input.email);
  }

  async completePasswordReset(input: S['PasswordResetCompleteRequest'], ctx: RequestContext) {
    if (input.password !== input.passwordConfirmation) {
      throw fieldError(ctx, 'passwordConfirmation', 'same', 't_validator_same');
    }
    const token = await this.usableResetToken(input.token, input.email);
    const passwordHash = await this.passwords.hash(input.password);
    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authToken.updateMany({
        where: { id: token.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count !== 1)
        throw new ApiException(422, 'AUTH_LINK_INVALID', 't_password_reset_link_expired');
      await tx.user.update({
        where: { id: token.userId },
        data: { passwordHash, passwordAlgo: 'argon2id', passwordChangedAt: new Date() },
      });
      // AC-31: forget trusted devices; AC-33: end every session.
      await tx.trustedDevice.deleteMany({ where: { userId: token.userId } });
      await this.sessions.revokeWhere({ userId: token.userId }, 'password_change', tx);
      await this.outbox.add(
        'EV-05',
        { type: 'user', id: token.userId },
        { userId: token.userId, params: {} },
        tx,
      );
    });
    return notice(ctx, 't_password_has_been_updated');
  }

  // ------------------------------------------------------------------ helpers

  private async requireRecaptcha(token: string | null | undefined, ctx: RequestContext) {
    if (ctx.client !== 'web' || !(await this.recaptcha.enabled())) return;
    if (!(await this.recaptcha.verify(token, ctx.ip))) {
      throw fieldError(ctx, 'recaptchaToken', 'recaptcha', 't_validator_recaptcha');
    }
  }

  async uniqueReferralCode(tx: Prisma.TransactionClient): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const code = randomReferralCode();
      if (!(await tx.user.findUnique({ where: { referralCode: code }, select: { id: true } })))
        return code;
    }
    throw new Error('could not allocate a referral code');
  }

  /** New one-time link; older links of the same purpose stop working (AC-9, AC-32). */
  private async issueLinkToken(
    tx: Prisma.TransactionClient,
    userId: string,
    purpose: 'email_verification' | 'password_reset',
    minutes: number,
    ip: string,
  ): Promise<string> {
    await tx.authToken.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    const token = randomToken();
    await tx.authToken.create({
      data: {
        userId,
        purpose,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + minutes * 60_000),
        createdIp: ip,
      },
    });
    return token;
  }

  private async findLinkToken(
    raw: string,
    email: string,
    purpose: 'email_verification' | 'password_reset',
  ) {
    const token = await this.prisma.authToken.findUnique({
      where: { tokenHash: sha256(raw) },
      include: { user: { select: { email: true, deletedAt: true } } },
    });
    if (
      !token ||
      token.purpose !== purpose ||
      token.consumedAt ||
      token.user.deletedAt ||
      token.user.email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      return null;
    }
    return token;
  }

  private async usableResetToken(raw: string, email: string) {
    const token = await this.findLinkToken(raw, email, 'password_reset');
    if (!token) throw new ApiException(422, 'AUTH_LINK_INVALID', 't_password_reset_link_expired');
    if (token.expiresAt <= new Date()) {
      throw new ApiException(422, 'AUTH_LINK_EXPIRED', 't_password_reset_link_expired');
    }
    return token;
  }
}
