// Worker: the `analytics-partitions` job (ROADMAP 4.3.5c; data-model §3.S, ADR-012 §3: raw `analytics_events` are
// kept 90 days, the `analytics_daily` aggregates stay). `analytics_events` is partitioned by month (UTC) with a
// DEFAULT partition, so a write never fails for a missing month. Each pass:
//   1. makes sure this month and next month have their own partition `analytics_events_YYYY_MM`; rows of that
//      month already in the DEFAULT partition are moved into it in the same transaction (otherwise Postgres
//      refuses to attach the range);
//   2. drops month partitions that ended more than 90 days ago, and deletes DEFAULT rows older than 90 days.
// Runs at worker start and then every 6 hours; running twice is harmless.
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../platform/db/prisma.service';

const EVERY_MS = 6 * 60 * 60 * 1000;
export const RAW_EVENTS_KEEP_DAYS = 90;
const PARENT = 'analytics_events';
const DEFAULT_PARTITION = 'analytics_events_default';
const MONTH_PARTITION = /^analytics_events_(\d{4})_(\d{2})$/;

const monthStart = (year: number, month0: number) => new Date(Date.UTC(year, month0, 1));
const partitionName = (start: Date) =>
  `${PARENT}_${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(2, '0')}`;

export interface PartitionPass {
  created: string[];
  dropped: string[];
  deletedDefaultRows: number;
}

@Injectable()
export class AnalyticsPartitionsSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('AnalyticsPartitionsSweeper');
  private timer: NodeJS.Timeout | undefined;
  lastRunAt: Date | undefined;

  constructor(private readonly prisma: PrismaService) {}

  onApplicationBootstrap(): void {
    void this.tick();
    this.timer = setInterval(() => void this.tick(), EVERY_MS);
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  /** One pass; public for tests. */
  async tick(now = new Date()): Promise<PartitionPass> {
    const pass: PartitionPass = { created: [], dropped: [], deletedDefaultRows: 0 };
    try {
      for (const offset of [0, 1]) {
        const start = monthStart(now.getUTCFullYear(), now.getUTCMonth() + offset);
        if (await this.ensure(start)) pass.created.push(partitionName(start));
      }
      const cutoff = new Date(now.getTime() - RAW_EVENTS_KEEP_DAYS * 24 * 60 * 60 * 1000);
      for (const name of await this.monthPartitions()) {
        const m = MONTH_PARTITION.exec(name)!;
        const end = monthStart(Number(m[1]), Number(m[2])); // month index of the next month
        if (end <= cutoff) {
          await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${name}"`);
          pass.dropped.push(name);
        }
      }
      pass.deletedDefaultRows = await this.prisma.$executeRaw`
        DELETE FROM "analytics_events_default" WHERE "occurred_at" < ${cutoff}`;
      this.lastRunAt = new Date();
      if (pass.created.length || pass.dropped.length || pass.deletedDefaultRows) {
        this.logger.log(pass, 'analytics partitions maintained');
      }
    } catch (err) {
      // Database hiccup: the next pass retries; the DEFAULT partition keeps taking rows meanwhile.
      this.logger.error({ err }, 'analytics-partitions pass failed');
    }
    return pass;
  }

  /** Creates the month partition when missing; true when created. */
  private async ensure(start: Date): Promise<boolean> {
    const name = partitionName(start);
    const end = monthStart(start.getUTCFullYear(), start.getUTCMonth() + 1);
    if ((await this.monthPartitions()).includes(name)) return false;
    await this.prisma.$transaction(async (tx) => {
      // The names come from dates only (no user input), so building the DDL text is safe.
      await tx.$executeRawUnsafe(
        `CREATE TABLE "${name}" (LIKE "${PARENT}" INCLUDING DEFAULTS INCLUDING CONSTRAINTS)`,
      );
      await tx.$executeRaw`
        WITH moved AS (
          DELETE FROM "analytics_events_default"
          WHERE "occurred_at" >= ${start} AND "occurred_at" < ${end}
          RETURNING *)
        INSERT INTO ${Prisma.raw(`"${name}"`)} SELECT * FROM moved`;
      await tx.$executeRawUnsafe(
        `ALTER TABLE "${PARENT}" ATTACH PARTITION "${name}" FOR VALUES FROM ('${start.toISOString()}') TO ('${end.toISOString()}')`,
      );
    });
    return true;
  }

  /** The month partitions attached to `analytics_events` (the DEFAULT one excluded). */
  private async monthPartitions(): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ name: string }[]>`
      SELECT c."relname" AS "name"
      FROM "pg_inherits" i
      JOIN "pg_class" c ON c."oid" = i."inhrelid"
      JOIN "pg_class" p ON p."oid" = i."inhparent"
      WHERE p."relname" = ${PARENT} AND c."relname" <> ${DEFAULT_PARTITION}`;
    return rows.map((r) => r.name).filter((n) => MONTH_PARTITION.test(n));
  }
}
