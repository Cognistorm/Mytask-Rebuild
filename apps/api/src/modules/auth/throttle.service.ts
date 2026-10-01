// Brute-force protection counters (ADR-002 §5–§6, spec 01 AC-16, AC-25, AC-27, AC-36, AC-53…AC-55, R-A9).
// All state is in Redis; every IP comes from ClientIpResolver and is keyed by `ipBucket` (IPv6 /64, SEC-42). Keys of login counters use a hash of the
// normalised email, so unknown and known emails behave identically (no account enumeration).
import { Injectable } from '@nestjs/common';
import { ipBucket } from '../../platform/client-ip/client-ip.resolver';
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
  REGISTERS_PER_IP_PER_HOUR,
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
   * Decide whether a password may be checked now (SEC-34: the per account + IP attempt is RESERVED here,
   * atomically, before the password check, so a burst of parallel requests cannot pass the S-062 lock).
   * Refused attempts never take the slow-mode slot; a trusted device or a passed reCAPTCHA is evaluated
   * without taking it (SEC-30).
   */
  async loginGate(email: string, ip: string, bypassSlot: boolean): Promise<LoginGate> {
    const acct = emailKey(email);
    const lockKey = `auth:login:lock:${acct}:${ipBucket(ip)}`;
    const lock = await this.ttl(lockKey);
    if (lock > 0) return { kind: 'locked', retryAfterSeconds: lock };

    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    const attempt = await this.hit(`auth:login:ip:${acct}:${ipBucket(ip)}`, LOGIN_WINDOW_SECONDS);
    if (attempt > maxAttempts) {
      await this.r.set(lockKey, '1', 'EX', lockMinutes * 60, 'NX');
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:login:ip:${acct}:${ipBucket(ip)}`, lockMinutes * 60);
      return { kind: 'locked', retryAfterSeconds: Math.max(1, await this.ttl(lockKey)) };
    }

    const failures = Number((await this.r.get(`auth:login:acct:${acct}`)) ?? 0);
    if (failures < SLOW_MODE_FAILURES || bypassSlot) return { kind: 'ok', tookSlot: false };

    const slotKey = `auth:login:slot:${acct}`;
    const took = await this.r.set(slotKey, '1', 'EX', SLOW_MODE_SLOT_SECONDS, 'NX');
    if (took === 'OK') return { kind: 'ok', tookSlot: true };
    return { kind: 'throttled', retryAfterSeconds: Math.max(1, await this.ttl(slotKey)) };
  }

  /** A wrong password (its attempt was reserved by loginGate). Returns whether slow mode just started. */
  async loginFailed(email: string, ip: string): Promise<{ slowModeStarted: boolean }> {
    const acct = emailKey(email);
    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    const perIp = Number((await this.r.get(`auth:login:ip:${acct}:${ipBucket(ip)}`)) ?? 0);
    if (perIp >= maxAttempts) {
      await this.r.set(`auth:login:lock:${acct}:${ipBucket(ip)}`, '1', 'EX', lockMinutes * 60);
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:login:ip:${acct}:${ipBucket(ip)}`, lockMinutes * 60);
    }
    const perAccount = await this.hit(`auth:login:acct:${acct}`, SLOW_MODE_WINDOW_SECONDS);
    return { slowModeStarted: perAccount === SLOW_MODE_FAILURES };
  }

  /** "Successful login resets both counters" (AC-16, AC-53). */
  async loginSucceeded(email: string, ip: string): Promise<void> {
    const acct = emailKey(email);
    await this.r.del(
      `auth:login:ip:${acct}:${ipBucket(ip)}`,
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

  /**
   * SEC-03 + SEC-34: reserve one code check for this account BEFORE comparing the code. Returns the
   * attempt number, or null when the account-wide cap is reached (the lock is then set).
   */
  async reserveCodeCheck(principal: string): Promise<number | null> {
    const n = await this.hit(`auth:code:fail:${principal}`, CODE_CAP_WINDOW_SECONDS);
    if (n > CODE_CAP_FAILURES) {
      const lockMinutes = await this.settings.get('S-063');
      await this.r.set(`auth:code:lock:${principal}`, '1', 'EX', lockMinutes * 60, 'NX');
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:code:fail:${principal}`, lockMinutes * 60);
      return null;
    }
    return n;
  }

  /** A correct code gives its reservation back. */
  async releaseCodeCheck(principal: string): Promise<void> {
    await this.r.decr(`auth:code:fail:${principal}`);
  }

  /** After a wrong code: when this was the 10th, lock now (-> EV-129 once per lock). */
  async codeFailed(
    principal: string,
    attempt: number,
  ): Promise<{ lockStarted: boolean; lockMinutes: number }> {
    const lockMinutes = await this.settings.get('S-063');
    if (attempt >= CODE_CAP_FAILURES) {
      await this.r.set(`auth:code:lock:${principal}`, '1', 'EX', lockMinutes * 60);
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:code:fail:${principal}`, lockMinutes * 60);
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

  /** SEC-04 + SEC-34: reserve one in-session password/code check; null = the account is locked now. */
  async reserveInSession(principal: string): Promise<number | null> {
    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    const n = await this.hit(`auth:insession:fail:${principal}`, LOGIN_WINDOW_SECONDS);
    if (n > maxAttempts) {
      await this.r.set(`auth:insession:lock:${principal}`, '1', 'EX', lockMinutes * 60, 'NX');
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:insession:fail:${principal}`, lockMinutes * 60);
      return null;
    }
    return n;
  }

  async releaseInSession(principal: string): Promise<void> {
    await this.r.decr(`auth:insession:fail:${principal}`);
  }

  /** After a wrong password/code in session: lock when S-062 is reached. */
  async inSessionFailed(principal: string, attempt: number): Promise<void> {
    const [maxAttempts, lockMinutes] = await Promise.all([
      this.settings.get('S-062'),
      this.settings.get('S-063'),
    ]);
    if (attempt >= maxAttempts) {
      await this.r.set(`auth:insession:lock:${principal}`, '1', 'EX', lockMinutes * 60);
      // Keep the counter (parallel requests keep hitting it) and let it end together with the lock.
      await this.r.expire(`auth:insession:fail:${principal}`, lockMinutes * 60);
    }
  }

  // ------------------------------------------------------------------ registration (Q-157, SEC-35)

  /** Counts a registration attempt; 0 = allowed, else seconds until the hourly window of the IP ends. */
  async registerWait(ip: string): Promise<number> {
    const key = `auth:register:ip:${ipBucket(ip)}`;
    const n = await this.hit(key, 3600);
    return n <= REGISTERS_PER_IP_PER_HOUR ? 0 : Math.max(1, await this.ttl(key));
  }

  // ------------------------------------------------------------------ admin emails (Q-159, SEC-35)

  /** True while fewer than `cap` EV-02 emails went out in this clock hour (all IPs together). */
  async allowAdminRegistrationEmail(cap: number): Promise<boolean> {
    const hour = Math.floor(Date.now() / 3_600_000);
    return (await this.hit(`notify:ev02:${hour}`, 3700)) <= cap;
  }

  // ------------------------------------------------------------------ link emails (AC-36, R-A9)

  /** True when another email may be sent (≤ 3 per address and per IP per hour, silent above). */
  async allowLinkEmail(purpose: string, email: string, ip: string): Promise<boolean> {
    const byEmail = await this.hit(`auth:mail:${purpose}:e:${emailKey(email)}`, 3600);
    const byIp = await this.hit(`auth:mail:${purpose}:ip:${ipBucket(ip)}`, 3600);
    return byEmail <= LINK_EMAILS_PER_HOUR && byIp <= LINK_EMAILS_PER_HOUR;
  }
}
