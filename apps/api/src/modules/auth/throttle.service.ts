// Brute-force protection counters (ADR-002 §5–§6, spec 01 AC-16, AC-25, AC-27, AC-36, AC-53…AC-55, R-A9).
// All state is in Redis; every IP comes from ClientIpResolver. Keys of login counters use a hash of the
// normalised email, so unknown and known emails behave identically (no account enumeration).
import { Injectable } from '@nestjs/common';
import { sha256Hex } from '../../platform/crypto';
import { RedisService } from '../../platform/redis/redis.module';
import { SettingsService } from '../../platform/settings/settings.service';
import {
  CODE_CAP_FAILURES,
  CODE_CAP_WINDOW_SECONDS,
  CODE_RESEND_COOLDOWN_SECONDS,
  CODE_SENDS_PER_WINDOW,
  CODE_SENDS_WINDOW_SECONDS,
  LINK_EMAILS_PER_HOUR,
  LOGIN_WINDOW_SECONDS,
  SLOW_MODE_FAILURES,
  SLOW_MODE_SLOT_SECONDS,
  SLOW_MODE_WINDOW_SECONDS,
} from './auth.constants';

export const emailKey = (email: string) => sha256Hex(email.trim().toLowerCase()).slice(0, 32);

export type LoginGate =
  | { kind: 'ok'; tookSlot: boolean }
  | { kind: 'locked'; retryAfterSeconds: number }
  | { kind: 'throttled'; retryAfterSeconds: number };

@Injectable()
export class ThrottleService {
  constructor(
    private readonly redis: RedisService,
    private readonly settings: SettingsService,
  ) {}

  private get r() {
    return this.redis.client;
  }

  /** INCR with a TTL set on the first hit (fixed window). */
  private async hit(key: string, ttlSeconds: number): Promise<number> {
    const n = await this.r.incr(key);
    if (n === 1) await this.r.expire(key, ttlSeconds);
    return n;
  }

  private async ttl(key: string): Promise<number> {
    const t = await this.r.ttl(key);
    return t > 0 ? t : 0;
  }

  // ------------------------------------------------------------------ login (AC-16, AC-53, SEC-30)

  /**
   * Decide whether a password may be checked now. Refused attempts never take the slow-mode slot; a
   * trusted device or a passed reCAPTCHA is evaluated without taking it (SEC-30).
   */
  async loginGate(email: string, ip: string, bypassSlot: boolean): Promise<LoginGate> {
    const acct = emailKey(email);
    const lock = await this.ttl(`auth:login:lock:${acct}:${ip}`);
    if (lock > 0) return { kind: 'locked', retryAfterSeconds: lock };

    const failures = Number((await this.r.get(`auth:login:acct:${acct}`)) ?? 0);
    if (failures < SLOW_MODE_FAILURES || bypassSlot) return { kind: 'ok', tookSlot: false };

    const slotKey = `auth:login:slot:${acct}`;
    const took = await this.r.set(slotKey, '1', 'EX', SLOW_MODE_SLOT_SECONDS, 'NX');
    if (took === 'OK') return { kind: 'ok', tookSlot: true };
    return { kind: 'throttled', retryAfterSeconds: Math.max(1, await this.ttl(slotKey)) };
  }

  /** A wrong password. Returns whether slow mode has just started (-> EV-128 at most once per hour). */
  async loginFailed(email: string, ip: string): Promise<{ slowModeStarted: boolean }> {
    const acct = emailKey(email);
    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    const perIp = await this.hit(`auth:login:ip:${acct}:${ip}`, LOGIN_WINDOW_SECONDS);
    if (perIp >= maxAttempts) {
      await this.r.set(`auth:login:lock:${acct}:${ip}`, '1', 'EX', lockMinutes * 60);
      await this.r.del(`auth:login:ip:${acct}:${ip}`);
    }
    const perAccount = await this.hit(`auth:login:acct:${acct}`, SLOW_MODE_WINDOW_SECONDS);
    return { slowModeStarted: perAccount === SLOW_MODE_FAILURES };
  }

  /** "Successful login resets both counters" (AC-16, AC-53). */
  async loginSucceeded(email: string, ip: string): Promise<void> {
    const acct = emailKey(email);
    await this.r.del(
      `auth:login:ip:${acct}:${ip}`,
      `auth:login:acct:${acct}`,
      `auth:login:slot:${acct}`,
    );
  }

  /** EV-128 at most once per hour per account. */
  async claimOncePerHour(kind: string, subject: string): Promise<boolean> {
    return (await this.r.set(`auth:notice:${kind}:${subject}`, '1', 'EX', 3600, 'NX')) === 'OK';
  }

  // ------------------------------------------------------------------ codes (AC-25, AC-27, AC-54)

  /** Seconds left of an account-wide code lock (0 = not locked). */
  codeLockSeconds(principal: string): Promise<number> {
    return this.ttl(`auth:code:lock:${principal}`);
  }

  /** A wrong code anywhere. Returns whether the account-wide lock has just started (-> EV-129 once). */
  async codeFailed(principal: string): Promise<{ lockStarted: boolean; lockMinutes: number }> {
    const lockMinutes = await this.settings.get('S-063');
    const n = await this.hit(`auth:code:fail:${principal}`, CODE_CAP_WINDOW_SECONDS);
    if (n >= CODE_CAP_FAILURES) {
      await this.r.set(`auth:code:lock:${principal}`, '1', 'EX', lockMinutes * 60);
      await this.r.del(`auth:code:fail:${principal}`);
      return { lockStarted: true, lockMinutes };
    }
    return { lockStarted: false, lockMinutes };
  }

  /** 60-second cooldown and 5 codes per 15 minutes per account (R-A6). Returns seconds to wait, or 0. */
  async codeSendWait(principal: string): Promise<number> {
    const cooldown = await this.ttl(`auth:code:cooldown:${principal}`);
    if (cooldown > 0) return cooldown;
    const sent = Number((await this.r.get(`auth:code:sends:${principal}`)) ?? 0);
    if (sent >= CODE_SENDS_PER_WINDOW)
      return Math.max(1, await this.ttl(`auth:code:sends:${principal}`));
    return 0;
  }

  async codeSent(principal: string): Promise<void> {
    await this.r.set(`auth:code:cooldown:${principal}`, '1', 'EX', CODE_RESEND_COOLDOWN_SECONDS);
    await this.hit(`auth:code:sends:${principal}`, CODE_SENDS_WINDOW_SECONDS);
  }

  // ------------------------------------------------------------------ in-session checks (AC-55, SEC-04)

  inSessionLockSeconds(userId: string): Promise<number> {
    return this.ttl(`auth:insession:lock:${userId}`);
  }

  async inSessionFailed(userId: string): Promise<void> {
    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    const n = await this.hit(`auth:insession:fail:${userId}`, LOGIN_WINDOW_SECONDS);
    if (n >= maxAttempts) {
      await this.r.set(`auth:insession:lock:${userId}`, '1', 'EX', lockMinutes * 60);
      await this.r.del(`auth:insession:fail:${userId}`);
    }
  }

  // ------------------------------------------------------------------ link emails (AC-36, R-A9)

  /** True when another email may be sent (≤ 3 per address and per IP per hour, silent above). */
  async allowLinkEmail(purpose: string, email: string, ip: string): Promise<boolean> {
    const byEmail = await this.hit(`auth:mail:${purpose}:e:${emailKey(email)}`, 3600);
    const byIp = await this.hit(`auth:mail:${purpose}:ip:${ip}`, 3600);
    return byEmail <= LINK_EMAILS_PER_HOUR && byIp <= LINK_EMAILS_PER_HOUR;
  }
}
