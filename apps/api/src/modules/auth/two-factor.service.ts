// Email 2FA (ADR-002 §5, spec 01 AC-20…AC-31, AC-54, R-A6): challenges, codes, trusted devices.
import { Injectable } from '@nestjs/common';
import type { TwofaPurpose, TwoFactorChallenge, User } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { hashEquals, maskEmail, randomCode, sha256, type Bytes } from '../../platform/crypto';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { CODE_RESEND_COOLDOWN_SECONDS } from './auth.constants';
import { ThrottleService } from './throttle.service';

const codeHash = (challengeId: string, code: string) => sha256(`${challengeId}:${code}`);

export interface ChallengeView {
  challengeId: string;
  channel: 'email';
  purpose: TwofaPurpose;
  emailMasked: string;
  codeLength: 6;
  expiresAt: string;
  resendAvailableAt: string;
  notice: { messageKey: string; message: string; params: Record<string, string | number> };
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly throttle: ThrottleService,
    private readonly outbox: OutboxService,
  ) {}

  /** AC-22, AC-24, AC-28, S-124: is a code needed for this login? */
  async isRequired(user: User, deviceIdHash: Bytes, ip: string): Promise<boolean> {
    if (!user.twoFactorEnabled || !(await this.settings.get('S-056'))) return false;
    const device = await this.prisma.trustedDevice.findFirst({
      where: {
        principalType: 'user',
        userId: user.id,
        deviceIdHash,
        trustedUntil: { gt: new Date() },
      },
      include: { ips: { where: { ip, trustedUntil: { gt: new Date() } } } },
    });
    if (!device) return true;
    if ((await this.settings.get('S-124')) === 'new_device_or_ip') return device.ips.length === 0;
    return false;
  }

  /** Whether the presented device is trusted for this account (slow-mode slot bypass, SEC-30). */
  async isTrustedDevice(userId: string, deviceIdHash: Bytes): Promise<boolean> {
    const n = await this.prisma.trustedDevice.count({
      where: { principalType: 'user', userId, deviceIdHash, trustedUntil: { gt: new Date() } },
    });
    return n > 0;
  }

  async createChallenge(
    user: User,
    purpose: TwofaPurpose,
    deviceIdHash: Bytes | null,
    ip: string,
    translate: (key: string, params?: Record<string, string | number>) => string,
  ): Promise<ChallengeView> {
    const wait = await this.throttle.codeSendWait(`user:${user.id}`);
    if (wait > 0) this.resendThrottled(wait);
    const [ttlMinutes, maxAttempts] = await Promise.all([
      this.settings.get('S-057'),
      this.settings.get('S-058'),
    ]);
    const code = randomCode();
    const challenge = await this.prisma.$transaction(async (tx) => {
      // A new login code replaces any open one of the same purpose (only one live code per purpose).
      await tx.twoFactorChallenge.updateMany({
        where: { userId: user.id, purpose, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: new Date() },
      });
      const c = await tx.twoFactorChallenge.create({
        data: {
          principalType: 'user',
          userId: user.id,
          purpose,
          codeHash: new Uint8Array(32),
          deviceIdHash,
          ip,
          maxAttempts,
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      });
      await tx.twoFactorChallenge.update({
        where: { id: c.id },
        data: { codeHash: codeHash(c.id, code) },
      });
      await this.outbox.add(
        'EV-06',
        { type: 'user', id: user.id },
        { userId: user.id, params: { code, minutes: ttlMinutes } },
        tx,
      );
      return c;
    });
    await this.throttle.codeSent(`user:${user.id}`);
    return this.view(challenge, user.email, translate);
  }

  /** Resend a login code: same challenge, new code, old code stops working (AC-27). */
  async resend(
    challengeId: string,
    translate: (key: string, params?: Record<string, string | number>) => string,
  ): Promise<ChallengeView> {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    if (!challenge?.user || challenge.consumedAt || challenge.purpose !== 'login') {
      throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    }
    const wait = await this.throttle.codeSendWait(`user:${challenge.user.id}`);
    if (wait > 0) this.resendThrottled(wait);
    const ttlMinutes = await this.settings.get('S-057');
    const code = randomCode();
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: {
          codeHash: codeHash(challenge.id, code),
          attempts: 0,
          invalidatedAt: null,
          expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        },
      });
      await this.outbox.add(
        'EV-06',
        { type: 'user', id: challenge.user!.id },
        { userId: challenge.user!.id, params: { code, minutes: ttlMinutes } },
        tx,
      );
      return u;
    });
    await this.throttle.codeSent(`user:${challenge.user.id}`);
    return this.view(updated, challenge.user.email, translate);
  }

  /**
   * Check a code for a purpose. Throws the contract errors; returns the consumed challenge on success.
   * `unknownStatus` = 404 for the login flow; in-session flows answer 422 for an unknown challenge.
   */
  async verify(
    challengeId: string,
    code: string,
    purpose: TwofaPurpose,
    expectedUserId?: string,
  ): Promise<TwoFactorChallenge & { user: User | null }> {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
      include: { user: true },
    });
    if (
      !challenge?.user ||
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      (expectedUserId && challenge.userId !== expectedUserId)
    ) {
      throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    }
    const principal = `user:${challenge.user.id}`;
    const lock = await this.throttle.codeLockSeconds(principal);
    if (lock > 0) {
      throw new ApiException(429, 'TWO_FACTOR_LOCKED', 't_2fa_locked', {
        retryAfterSeconds: lock,
        params: { minutes: Math.ceil(lock / 60) },
      });
    }
    if (challenge.invalidatedAt || challenge.attempts >= challenge.maxAttempts) {
      throw new ApiException(422, 'TWO_FACTOR_TOO_MANY_ATTEMPTS', 't_2fa_too_many_attempts');
    }
    if (challenge.expiresAt <= new Date()) {
      throw new ApiException(422, 'TWO_FACTOR_CODE_EXPIRED', 't_2fa_code_expired');
    }
    if (!hashEquals(codeHash(challenge.id, code), challenge.codeHash)) {
      const attempts = challenge.attempts + 1;
      const exhausted = attempts >= challenge.maxAttempts;
      await this.prisma.twoFactorChallenge.update({
        where: { id: challenge.id },
        data: { attempts, ...(exhausted ? { invalidatedAt: new Date() } : {}) },
      });
      const { lockStarted, lockMinutes } = await this.throttle.codeFailed(principal);
      if (lockStarted) {
        await this.outbox.add(
          'EV-129',
          { type: 'user', id: challenge.user.id },
          { userId: challenge.user.id, params: { minutes: lockMinutes } },
        );
      }
      if (exhausted) {
        throw new ApiException(422, 'TWO_FACTOR_TOO_MANY_ATTEMPTS', 't_2fa_too_many_attempts');
      }
      throw new ApiException(422, 'TWO_FACTOR_CODE_INVALID', 't_2fa_code_invalid', {
        attemptsLeft: challenge.maxAttempts - attempts,
      });
    }
    // Compare-and-set so the same code cannot be used twice concurrently.
    const consumed = await this.prisma.twoFactorChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    return challenge;
  }

  /** AC-23: a correct code trusts the device (and the IP) for S-059 days. */
  async trust(userId: string, deviceIdHash: Bytes, ip: string, userAgent?: string): Promise<void> {
    const days = await this.settings.get('S-059');
    const trustedUntil = new Date(Date.now() + days * 86_400_000);
    const existing = await this.prisma.trustedDevice.findFirst({
      where: { principalType: 'user', userId, deviceIdHash },
    });
    const device = existing
      ? await this.prisma.trustedDevice.update({
          where: { id: existing.id },
          data: { trustedUntil, lastSeenAt: new Date(), userAgent },
        })
      : await this.prisma.trustedDevice.create({
          data: { principalType: 'user', userId, deviceIdHash, trustedUntil, userAgent },
        });
    await this.prisma.trustedDeviceIp.upsert({
      where: { trustedDeviceId_ip: { trustedDeviceId: device.id, ip } },
      create: { trustedDeviceId: device.id, ip, trustedUntil },
      update: { trustedUntil },
    });
  }

  private resendThrottled(seconds: number): never {
    throw new ApiException(429, 'TWO_FACTOR_RESEND_THROTTLED', 't_2fa_resend_wait', {
      retryAfterSeconds: seconds,
      params: { seconds },
    });
  }

  private view(
    c: TwoFactorChallenge,
    email: string,
    translate: (key: string, params?: Record<string, string | number>) => string,
  ): ChallengeView {
    const masked = maskEmail(email);
    const minutes = Math.max(1, Math.round((c.expiresAt.getTime() - Date.now()) / 60_000));
    const params = { email: masked, minutes };
    return {
      challengeId: c.id,
      channel: 'email',
      purpose: c.purpose,
      emailMasked: masked,
      codeLength: 6,
      expiresAt: c.expiresAt.toISOString(),
      resendAvailableAt: new Date(Date.now() + CODE_RESEND_COOLDOWN_SECONDS * 1000).toISOString(),
      notice: {
        messageKey: 't_2fa_code_sent',
        message: translate('t_2fa_code_sent', params),
        params,
      },
    };
  }
}
