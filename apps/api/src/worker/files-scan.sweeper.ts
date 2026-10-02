// Worker: the `files-scan` job (ADR-008 §4, ADR-009 §3.5) as a sweeper over `files.status = 'scanning'`,
// like the outbox dispatcher: nothing is lost when Redis loses a queue entry, and completeFileUpload needs
// no queue. A scan of a 100 MB video must not hold a database transaction open, so each file is claimed
// with a Redis lease instead of FOR UPDATE SKIP LOCKED; several workers never scan the same file at once,
// and the compare-and-set in FileScanService makes a double run harmless anyway.
// Also runs the cleanup of `pending` uploads never completed within 24 hours (contract createFileUpload).
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { FileScanService } from '../modules/files/scan/file-scan.service';
import { PrismaService } from '../platform/db/prisma.service';
import { RedisService } from '../platform/redis/redis.module';
import { ObjectStorage } from '../platform/storage/storage';

const POLL_MS = 2_000;
/** Files scanned per pass; more candidates are read so files waiting for a retry do not block newer ones. */
const BATCH = 10;
const CANDIDATES = 100;
/** Longer than any scan; a crashed worker's file is picked up again after this. */
export const LEASE_SECONDS = 10 * 60;
/** Retry after an infrastructure error: 30 s, 1 min, 2 min … at most 30 min. */
export const retryDelaySeconds = (attempt: number) => Math.min(30 * 2 ** (attempt - 1), 30 * 60);
export const PENDING_TTL_HOURS = 24;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;

const leaseKey = (id: string) => `files:scan:lease:${id}`;
const attemptsKey = (id: string) => `files:scan:attempts:${id}`;

@Injectable()
export class FilesScanSweeper implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('FilesScanSweeper');
  private timers: NodeJS.Timeout[] = [];
  private running = false;
  lastRunAt: Date | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly storage: ObjectStorage,
    private readonly scan: FileScanService,
  ) {}

  onApplicationBootstrap(): void {
    this.timers.push(setInterval(() => void this.tick(), POLL_MS));
    this.timers.push(setInterval(() => void this.cleanupPending(), CLEANUP_EVERY_MS));
  }

  onApplicationShutdown(): void {
    for (const t of this.timers) clearInterval(t);
  }

  /** One pass; public for tests. Returns the number of files that reached `ready` or `rejected`. */
  async tick(): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const rows = await this.prisma.file.findMany({
        where: { status: 'scanning' },
        orderBy: { createdAt: 'asc' },
        take: CANDIDATES,
        select: { id: true },
      });
      let finished = 0;
      let claimedCount = 0;
      for (const { id } of rows) {
        if (claimedCount === BATCH) break;
        const claimed = await this.redis.client.set(leaseKey(id), '1', 'EX', LEASE_SECONDS, 'NX');
        if (claimed !== 'OK') continue; // another worker has it, or it waits for its retry
        claimedCount++;
        try {
          const outcome = await this.scan.process(id);
          await this.redis.client.del(leaseKey(id), attemptsKey(id));
          if (outcome !== 'skipped') finished++;
        } catch (err) {
          // Storage or scanner unavailable: keep the file `scanning`, hold the lease as the back-off.
          const attempt = await this.redis.client.incr(attemptsKey(id));
          await this.redis.client.expire(attemptsKey(id), 7 * 24 * 3600);
          const delay = retryDelaySeconds(attempt);
          await this.redis.client.set(leaseKey(id), '1', 'EX', delay);
          this.logger.error(
            { err, fileId: id, attempt, retryInSeconds: delay },
            'file scan failed',
          );
        }
      }
      this.lastRunAt = new Date();
      return finished;
    } catch (err) {
      // Database or Redis hiccup: try again on the next tick; the worker must not crash.
      this.logger.error({ err }, 'files-scan pass failed');
      return 0;
    } finally {
      this.running = false;
    }
  }

  /** Deletes `pending` uploads older than 24 h (and their object, if the client uploaded one). */
  async cleanupPending(now = new Date()): Promise<number> {
    try {
      const cutoff = new Date(now.getTime() - PENDING_TTL_HOURS * 3600 * 1000);
      const rows = await this.prisma.file.findMany({
        where: { status: 'pending', createdAt: { lt: cutoff } },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });
      let removed = 0;
      for (const file of rows) {
        // Compare-and-set first: a completeFileUpload racing this cleanup wins and keeps its object.
        const done = await this.prisma.file.updateMany({
          where: { id: file.id, status: 'pending' },
          data: { status: 'deleted', deletedAt: now },
        });
        if (done.count === 0) continue;
        await this.storage.delete(file.bucket, file.objectKey);
        removed++;
      }
      if (removed) this.logger.log({ removed }, 'unused pending uploads deleted');
      return removed;
    } catch (err) {
      this.logger.error({ err }, 'pending-upload cleanup failed');
      return 0;
    }
  }
}
