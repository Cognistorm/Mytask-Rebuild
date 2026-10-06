// Online status (spec 02 R-P4, BR-012; data-model §3.A): "online" = an authenticated request (web or mobile)
// in the last 10 minutes. Presence lives in Redis; `users.last_activity_at` is written at most once a minute.
// Every authenticated request costs one Redis SET NX; the minute's first one also refreshes the presence key
// and the column. The realtime `presence.heartbeat` (slice 08) will call `touch` as well.
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../platform/db/prisma.service';
import { RedisService } from '../../platform/redis/redis.module';

/** R-P4: active in the last 10 minutes. */
export const ONLINE_WINDOW_SECONDS = 10 * 60;
/** At most one presence refresh and one `last_activity_at` write per user and minute. */
export const ACTIVITY_WRITE_SECONDS = 60;

const presenceKey = (userId: string) => `presence:user:${userId}`;
const gateKey = (userId: string) => `presence:gate:${userId}`;

@Injectable()
export class PresenceService {
  private readonly logger = new Logger('Presence');

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Marks the user active. Resolves once Redis knows (so the next request already sees the user online); the
   * column is written in the background. Never throws: presence must not fail a request.
   */
  async touch(userId: string): Promise<void> {
    try {
      const first = await this.redis.client.set(
        gateKey(userId),
        '1',
        'EX',
        ACTIVITY_WRITE_SECONDS,
        'NX',
      );
      if (first !== 'OK') return;
      const now = new Date();
      await this.redis.client.set(
        presenceKey(userId),
        String(now.getTime()),
        'EX',
        ONLINE_WINDOW_SECONDS,
      );
      void this.prisma.user
        .update({ where: { id: userId }, data: { lastActivityAt: now } })
        .catch((e: unknown) =>
          this.logger.warn({ userId, err: e }, 'last_activity_at not written'),
        );
    } catch (e) {
      this.logger.warn({ userId, err: e }, 'presence not recorded');
    }
  }

  /**
   * The online users among `users`. Redis first; if it cannot answer, `last_activity_at` decides (one minute
   * less precise), so public pages still render.
   */
  async online(users: { id: string; lastActivityAt: Date | null }[]): Promise<Set<string>> {
    if (users.length === 0) return new Set();
    try {
      const values = await this.redis.client.mget(...users.map((u) => presenceKey(u.id)));
      return new Set(users.filter((_, i) => values[i] !== null).map((u) => u.id));
    } catch {
      const since = Date.now() - ONLINE_WINDOW_SECONDS * 1000;
      return new Set(
        users
          .filter((u) => u.lastActivityAt && u.lastActivityAt.getTime() >= since)
          .map((u) => u.id),
      );
    }
  }

  async isOnline(user: { id: string; lastActivityAt: Date | null }): Promise<boolean> {
    return (await this.online([user])).has(user.id);
  }
}
