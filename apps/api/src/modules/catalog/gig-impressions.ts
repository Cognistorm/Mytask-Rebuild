// Gig impressions (ROADMAP 4.3.5c; contract searchGigs: "every listed card counts as an impression", spec 04 AC-39
// "Total impressions", spec 02 AC-6 "total reach"; ADR-012 server event). Counted in memory on the request path
// (no database write per card) and written in one batch every few seconds: `gigs.impressions_count` + n and the
// `analytics_daily` row of metric `gig_impression` per Tbilisi day. Bots (`isbot`, no user agent) are not counted,
// as for visits. A failed batch is merged back and retried with the next one; a clean shutdown writes what is
// left. Each API process keeps its own counts, so several processes simply add up.
//
// Legacy `counter_impressions` counted page re-visits (`Jobs/Main/Service/Track.php`); the approved contract
// redefines impressions as appearances in search lists (parity deviation listed for QA in the 4.3.5c handoff).
import {
  type BeforeApplicationShutdown,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { isbot } from 'isbot';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { tbilisiDay } from './list-rules';

const FLUSH_EVERY_MS = 10_000;
/** Write early when this many gig/day pairs are waiting, so memory stays small under heavy traffic. */
const FLUSH_AT_KEYS = 5_000;

@Injectable()
export class GigImpressions implements OnApplicationBootstrap, BeforeApplicationShutdown {
  private readonly logger = new Logger('GigImpressions');
  /** `${day}|${gigId}` → impressions not written yet. */
  private pending = new Map<string, number>();
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.flush(), FLUSH_EVERY_MS);
    this.timer.unref();
  }

  async beforeApplicationShutdown(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }

  /** One impression for each listed gig; nothing for bots. */
  count(gigIds: readonly string[], userAgent: string | undefined, now = new Date()): void {
    if (gigIds.length === 0 || !userAgent || isbot(userAgent)) return;
    const day = tbilisiDay(now);
    for (const id of gigIds) {
      const key = `${day}|${id}`;
      this.pending.set(key, (this.pending.get(key) ?? 0) + 1);
    }
    if (this.pending.size >= FLUSH_AT_KEYS) void this.flush();
  }

  /** Writes the waiting counts (one batch at a time); public for tests. */
  async flush(): Promise<void> {
    while (this.running) await this.running;
    if (this.pending.size === 0) return;
    const batch = this.pending;
    this.pending = new Map();
    this.running = this.write(batch)
      .catch((err: unknown) => {
        for (const [key, n] of batch) this.pending.set(key, (this.pending.get(key) ?? 0) + n);
        this.logger.error({ err, keys: batch.size }, 'gig impressions not written; retried later');
      })
      .finally(() => {
        this.running = undefined;
      });
    await this.running;
  }

  private async write(batch: Map<string, number>): Promise<void> {
    const rows = [...batch].map(([key, n]) => {
      const [day, gigId] = key.split('|') as [string, string];
      return { day, gigId, n };
    });
    const perGig = new Map<string, number>();
    for (const r of rows) perGig.set(r.gigId, (perGig.get(r.gigId) ?? 0) + r.n);
    await this.prisma.$transaction(async (tx) => {
      // Raw SQL: a Prisma update would also move the gigs' `updated_at`. Deleted gigs are left alone.
      await tx.$executeRaw`
        UPDATE "gigs" g SET "impressions_count" = g."impressions_count" + v."n"
        FROM (VALUES ${Prisma.join(
          [...perGig].map(([id, n]) => Prisma.sql`(${id}::uuid, ${n}::bigint)`),
        )}) AS v("id", "n")
        WHERE g."id" = v."id"`;
      await tx.$executeRaw`
        INSERT INTO "analytics_daily"
          ("day", "metric", "dimension", "dimension_value", "entity_type", "entity_id", "count", "uniques")
        SELECT v."day", 'gig_impression', 'total', '', 'gig', v."id", v."n", 0
        FROM (VALUES ${Prisma.join(
          rows.map((r) => Prisma.sql`(${r.day}::date, ${r.gigId}::uuid, ${r.n}::bigint)`),
        )}) AS v("day", "id", "n")
        JOIN "gigs" g ON g."id" = v."id"
        ON CONFLICT ("day", "metric", "dimension", "dimension_value", "entity_type",
          (COALESCE("entity_id", '00000000-0000-0000-0000-000000000000'::uuid)))
        DO UPDATE SET "count" = "analytics_daily"."count" + EXCLUDED."count"`;
    });
  }
}
