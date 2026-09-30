// Email 2FA (ADR-002 §5, spec 01 AC-20…AC-31, AC-54, R-A6) for users AND staff (S-060, spec 01 AC-29):
// challenges, codes, trusted devices. Staff use the same tables (data-model §3.P) and STAFF_* error codes.
import { Injectable } from '@nestjs/common';
import type { Locale } from '@mytask/types';
import type { TwofaPurpose, TwoFactorChallenge, User } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException, type ErrorCode } from '../../platform/errors/api-exception';
import { hashEquals, maskEmail, randomCode, sha256, type Bytes } from '../../platform/crypto';
import { OutboxService } from '../../platform/outbox/outbox.service';
import { SettingsService } from '../../platform/settings/settings.service';
import { CODE_RESEND_COOLDOWN_SECONDS } from './auth.constants';
import { ThrottleService } from './throttle.service';

const codeHash = (challengeId: string, code: string) => sha256(`${challengeId}:${code}`);
type Translate = (key: string, params?: Record<string, string | number>) => string;

/** Who a code belongs to. */
export interface CodeOwner {
  kind: 'user' | 'staff';
  id: string;
  email: string;
  username: string;
  locale: Locale;
}

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

const CODES = {
  user: {
    invalid: 'TWO_FACTOR_CODE_INVALID',
    expired: 'TWO_FACTOR_CODE_EXPIRED',
    tooMany: 'TWO_FACTOR_TOO_MANY_ATTEMPTS',
    locked: 'TWO_FACTOR_LOCKED',
    resend: 'TWO_FACTOR_RESEND_THROTTLED',
  },
  staff: {
    invalid: 'STAFF_TWO_FACTOR_CODE_INVALID',
    expired: 'STAFF_TWO_FACTOR_CODE_EXPIRED',
    tooMany: 'STAFF_TWO_FACTOR_TOO_MANY_ATTEMPTS',
    locked: 'STAFF_TWO_FACTOR_LOCKED',
    resend: 'STAFF_TWO_FACTOR_RESEND_WAIT',
  },
} as const satisfies Record<string, Record<string, ErrorCode>>;

const ownerWhere = (o: Pick<CodeOwner, 'kind' | 'id'>) =>
  o.kind === 'user'
    ? { principalType: 'user' as const, userId: o.id }
    : { principalType: 'staff' as const, staffId: o.id };

export function userOwner(u: User): CodeOwner {
  return { kind: 'user', id: u.id, email: u.email, username: u.username, locale: u.locale };
}

@Injectable()
export class TwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly throttle: ThrottleService,
    private readonly outbox: OutboxService,
  ) {}

  /** Users: AC-22, AC-24, AC-28, S-124 — is a code needed for this login? */
  async isRequired(user: User, deviceIdHash: Bytes, ip: string): Promise<boolean> {
    if (!user.twoFactorEnabled || !(await this.settings.get('S-056'))) return false;
    return !(await this.deviceTrusted({ kind: 'user', id: user.id }, deviceIdHash, ip));
  }

  /** Staff: S-060 ON and the device is not trusted (spec 01 AC-29), independent of S-056. */
  async isStaffRequired(staffId: string, deviceIdHash: Bytes, ip: string): Promise<boolean> {
    if (!(await this.settings.get('S-060'))) return false;
    return !(await this.deviceTrusted({ kind: 'staff', id: staffId }, deviceIdHash, ip));
  }

  private async deviceTrusted(o: Pick<CodeOwner, 'kind' | 'id'>, deviceIdHash: Bytes, ip: string) {
    const device = await this.prisma.trustedDevice.findFirst({
      where: { ...ownerWhere(o), deviceIdHash, trustedUntil: { gt: new Date() } },
      include: { ips: { where: { ip, trustedUntil: { gt: new Date() } } } },
    });
    if (!device) return false;
    if ((await this.settings.get('S-124')) === 'new_device_or_ip') return device.ips.length > 0;
    return true;
  }

  /** Whether the presented device is trusted for this account (slow-mode slot bypass, SEC-30). */
  async isTrustedDevice(userId: string, deviceIdHash: Bytes): Promise<boolean> {
    const n = await this.prisma.trustedDevice.count({
      where: { principalType: 'user', userId, deviceIdHash, trustedUntil: { gt: new Date() } },
    });
    return n > 0;
  }

  private emailPayload(o: CodeOwner, params: Record<string, string | number>) {
    return o.kind === 'user'
      ? { userId: o.id, params }
      : { to: [o.email], locale: o.locale, params: { ...params, username: o.username } };
  }

  async createChallenge(
    owner: CodeOwner,
    purpose: TwofaPurpose,
    deviceIdHash: Bytes | null,
    ip: string,
    translate: Translate,
  ): Promise<ChallengeView> {
    const principal = `${owner.kind}:${owner.id}`;
    const wait = await this.throttle.codeSendWait(principal);
    if (wait > 0) this.resendThrottled(owner.kind, wait);
    const [ttlMinutes, maxAttempts] = await Promise.all([
      this.settings.get('S-057'),
      this.settings.get('S-058'),
    ]);
    const code = randomCode();
    const challenge = await this.prisma.$transaction(async (tx) => {
      // A new code replaces any open one of the same purpose (only one live code per purpose).
      await tx.twoFactorChallenge.updateMany({
        where: { ...ownerWhere(owner), purpose, consumedAt: null, invalidatedAt: null },
        data: { invalidatedAt: new Date() },
      });
      const c = await tx.twoFactorChallenge.create({
        data: {
          ...ownerWhere(owner),
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
        { type: owner.kind, id: owner.id },
        this.emailPayload(owner, { code, minutes: ttlMinutes }),
        tx,
      );
      return c;
    });
    await this.throttle.codeSent(principal);
    return this.view(challenge, owner.email, translate);
  }

  /** Resend a login code: same challenge, new code, old code stops working (AC-27). */
  async resend(
    challengeId: string,
    translate: Translate,
    kind: 'user' | 'staff' = 'user',
  ): Promise<ChallengeView> {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
    });
    const owner = challenge && (await this.ownerOf(challenge));
    if (
      !challenge ||
      !owner ||
      owner.kind !== kind ||
      challenge.consumedAt ||
      challenge.purpose !== 'login'
    ) {
      throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    }
    const principal = `${owner.kind}:${owner.id}`;
    const wait = await this.throttle.codeSendWait(principal);
    if (wait > 0) this.resendThrottled(owner.kind, wait);
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
        { type: owner.kind, id: owner.id },
        this.emailPayload(owner, { code, minutes: ttlMinutes }),
        tx,
      );
      return u;
    });
    await this.throttle.codeSent(principal);
    return this.view(updated, owner.email, translate);
  }

  /**
   * Check a code for a purpose. Throws the contract errors (user or STAFF_* codes); returns the consumed
   * challenge and its owner on success.
   */
  async verify(
    challengeId: string,
    code: string,
    purpose: TwofaPurpose,
    expected?: { kind: 'user' | 'staff'; id?: string },
  ): Promise<{ challenge: TwoFactorChallenge; owner: CodeOwner }> {
    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { id: challengeId },
    });
    const owner = challenge && (await this.ownerOf(challenge));
    const kind = expected?.kind ?? 'user';
    if (
      !challenge ||
      !owner ||
      owner.kind !== kind ||
      challenge.purpose !== purpose ||
      challenge.consumedAt ||
      (expected?.id && owner.id !== expected.id)
    ) {
      throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    }
    const codes = CODES[owner.kind];
    const principal = `${owner.kind}:${owner.id}`;
    const lock = await this.throttle.codeLockSeconds(principal);
    if (lock > 0) {
      throw new ApiException(429, codes.locked, 't_2fa_locked', {
        retryAfterSeconds: lock,
        params: { minutes: Math.ceil(lock / 60) },
      });
    }
    if (challenge.expiresAt <= new Date()) {
      throw new ApiException(422, codes.expired, 't_2fa_code_expired');
    }
    // SEC-34: reserve the attempt atomically BEFORE comparing (parallel requests cannot exceed S-058 or
    // the account-wide cap of 10 per hour).
    const reserved = await this.prisma.$queryRaw<{ attempts: number; max_attempts: number }[]>`
      UPDATE two_factor_challenges SET attempts = attempts + 1
      WHERE id = ${challenge.id}::uuid AND consumed_at IS NULL AND invalidated_at IS NULL
        AND attempts < max_attempts
      RETURNING attempts, max_attempts`;
    if (reserved.length === 0)
      throw new ApiException(422, codes.tooMany, 't_2fa_too_many_attempts');
    const accountAttempt = await this.throttle.reserveCodeCheck(principal);
    if (accountAttempt === null) {
      const left = await this.throttle.codeLockSeconds(principal);
      throw new ApiException(429, codes.locked, 't_2fa_locked', {
        retryAfterSeconds: left,
        params: { minutes: Math.ceil(left / 60) },
      });
    }
    if (!hashEquals(codeHash(challenge.id, code), challenge.codeHash)) {
      const { attempts, max_attempts: maxAttempts } = reserved[0]!;
      const exhausted = attempts >= maxAttempts;
      if (exhausted) {
        await this.prisma.twoFactorChallenge.update({
          where: { id: challenge.id },
          data: { invalidatedAt: new Date() },
        });
      }
      const { lockStarted, lockMinutes } = await this.throttle.codeFailed(
        principal,
        accountAttempt,
      );
      if (lockStarted) {
        await this.outbox.add(
          'EV-129',
          { type: owner.kind, id: owner.id },
          this.emailPayload(owner, { minutes: lockMinutes }),
        );
      }
      if (exhausted) throw new ApiException(422, codes.tooMany, 't_2fa_too_many_attempts');
      throw new ApiException(422, codes.invalid, 't_2fa_code_invalid', {
        attemptsLeft: maxAttempts - attempts,
      });
    }
    await this.throttle.releaseCodeCheck(principal);
    // Compare-and-set so the same code cannot be used twice concurrently.
    const consumed = await this.prisma.twoFactorChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) throw new ApiException(404, 'NOT_FOUND', 't_2fa_code_expired');
    return { challenge, owner };
  }

  /** AC-23: a correct code trusts the device (and the IP) for S-059 days. */
  async trust(
    o: Pick<CodeOwner, 'kind' | 'id'>,
    deviceIdHash: Bytes,
    ip: string,
    userAgent?: string,
  ): Promise<void> {
    const days = await this.settings.get('S-059');
    const trustedUntil = new Date(Date.now() + days * 86_400_000);
    const existing = await this.prisma.trustedDevice.findFirst({
      where: { ...ownerWhere(o), deviceIdHash },
    });
    const device = existing
      ? await this.prisma.trustedDevice.update({
          where: { id: existing.id },
          data: { trustedUntil, lastSeenAt: new Date(), userAgent },
        })
      : await this.prisma.trustedDevice.create({
          data: { ...ownerWhere(o), deviceIdHash, trustedUntil, userAgent },
        });
    await this.prisma.trustedDeviceIp.upsert({
      where: { trustedDeviceId_ip: { trustedDeviceId: device.id, ip } },
      create: { trustedDeviceId: device.id, ip, trustedUntil },
      update: { trustedUntil },
    });
  }

  private async ownerOf(c: TwoFactorChallenge): Promise<CodeOwner | null> {
    if (c.userId) {
      const u = await this.prisma.user.findUnique({ where: { id: c.userId } });
      return u && !u.deletedAt ? userOwner(u) : null;
    }
    if (c.staffId) {
      const s = await this.prisma.staff.findUnique({ where: { id: c.staffId } });
      return s && s.status === 'active'
        ? { kind: 'staff', id: s.id, email: s.email, username: s.username, locale: s.locale }
        : null;
    }
    return null;
  }

  private resendThrottled(kind: 'user' | 'staff', seconds: number): never {
    throw new ApiException(429, CODES[kind].resend, 't_2fa_resend_wait', {
      retryAfterSeconds: seconds,
      params: { seconds },
    });
  }

  private view(c: TwoFactorChallenge, email: string, translate: Translate): ChallengeView {
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
