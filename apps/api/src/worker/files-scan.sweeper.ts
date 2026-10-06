// Worker: the `files-scan` job (ADR-008 §4, ADR-009 §3.5) as a sweeper over `files.status = 'scanning'`,
// like the outbox dispatcher: nothing is lost when Redis loses a queue entry, and completeFileUpload needs
// no queue. A scan of a 100 MB video must not hold a database transaction open, so each file is claimed
// with a Redis lease instead of FOR UPDATE SKIP LOCKED; several workers never scan the same file at once,
// and the compare-and-set in FileScanService makes a double run harmless anyway.
// Also runs the cleanup of `pending` uploads never completed within 24 hours (contract createFileUpload), and
// deletes each scanned upload's quarantine key once more after its presigned POST has expired: the POST can be
// re-used until then, and a re-post after the scan would otherwise leave an object nobody owns (SEC-63).
import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { UPLOAD_EXPIRES_SECONDS, variantKeys } from '../modules/files/files.service';
import { FileScanService } from '../modules/files/scan/file-scan.service';
import type { File as FileRow, FileBucket } from '../generated/prisma/client';
import { PrismaService } from '../platform/db/prisma.service';
import { RedisService } from '../platform/redis/redis.module';
import { ObjectStorage } from '../platform/storage/storage';

const POLL_MS = 2_000;
/** Files scanned per pass; more candidates are read so files waiting for a retry do not block newer ones. */
const BATCH = 10;
const CANDIDATES = 100;
/** At most this many files of one owner per pass, so one user's queue cannot hold up everyone else's (I-33). */
export const PER_OWNER_PER_PASS = 2;
/** Longer than any scan; a crashed worker's file is picked up again after this. */
export const LEASE_SECONDS = 10 * 60;
/** Retry after an infrastructure error: 30 s, 1 min, 2 min … at most 30 min. */
export const retryDelaySeconds = (attempt: number) => Math.min(30 * 2 ** (attempt - 1), 30 * 60);
export const PENDING_TTL_HOURS = 24;
/** Ready public images (avatar, portfolio) never attached within this time are deleted (SEC-64 stop-gap). */
export const UNATTACHED_TTL_HOURS = 24;
const CLEANUP_EVERY_MS = 60 * 60 * 1000;

/** Sorted set of `bucket␟key` quarantine objects to delete again, scored by the time their POST expired. */
export const LATE_QUARANTINE_KEY = 'files:quarantine:late';
const SEP = '';
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
        select: { id: true, bucket: true, objectKey: true, createdAt: true, ownerUserId: true },
      });
      let finished = 0;
      let claimedCount = 0;
      const perOwner = new Map<string, number>();
      for (const { id, bucket, objectKey, createdAt, ownerUserId } of rows) {
        if (claimedCount === BATCH) break;
        const owned = ownerUserId ? (perOwner.get(ownerUserId) ?? 0) : 0;
        if (owned === PER_OWNER_PER_PASS) continue; // the rest waits for the next pass
        const claimed = await this.redis.client.set(leaseKey(id), '1', 'EX', LEASE_SECONDS, 'NX');
        if (claimed !== 'OK') continue; // another worker has it, or it waits for its retry
        claimedCount++;
        if (ownerUserId) perOwner.set(ownerUserId, owned + 1);
        // Remember the quarantine key before the scan moves the row to its final key.
        const expired = createdAt.getTime() + (UPLOAD_EXPIRES_SECONDS + 60) * 1000;
        await this.redis.client.zadd(LATE_QUARANTINE_KEY, expired, `${bucket}${SEP}${objectKey}`);
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

  /** Deletes quarantine objects whose presigned POST has expired (a re-post after the scan); public for tests. */
  async cleanupLateQuarantine(now = new Date()): Promise<number> {
    try {
      const due = await this.redis.client.zrangebyscore(
        LATE_QUARANTINE_KEY,
        '-inf',
        now.getTime(),
        'LIMIT',
        0,
        1000,
      );
      let removed = 0;
      for (const member of due) {
        const [bucket, key] = member.split(SEP) as [FileBucket, string];
        // Still waiting for its scan (a retry after a storage or clamd error): keep it for the next pass.
        const open = await this.prisma.file.count({
          where: { bucket, objectKey: key, status: { in: ['pending', 'scanning'] } },
        });
        if (open) continue;
        await this.storage.delete(bucket, key);
        await this.redis.client.zrem(LATE_QUARANTINE_KEY, member);
        removed++;
      }
      return removed;
    } catch (err) {
      this.logger.error({ err }, 'late quarantine cleanup failed');
      return 0;
    }
  }

  /**
   * Security review 06 SEC-64 (stop-gap until images are published only on attach/approval, ADR-009): avatar
   * and portfolio images are public as soon as they are `ready`, so one that is still not the avatar of anyone
   * and not on any portfolio item after 24 h is deleted with its public variants. The compare-and-set re-checks
   * "not attached" in the same statement, so an attach that commits first keeps its file. A portfolio save
   * also sets `attached_at` on the file row in its transaction (review 07 SEC-74): the outer UPDATE then waits
   * for that row and re-checks `attached_at` on the committed version, which the NOT EXISTS checks (read with
   * this statement's snapshot) cannot do. Staff `category_image` uploads (an abandoned admin form, review 08
   * I-44) follow the same rule; a category save also sets `attached_at`. Public for tests.
   */
  async cleanupUnattachedPublic(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - UNATTACHED_TTL_HOURS * 3600 * 1000);
    let total = 0;
    try {
      // Batches of 500 until fewer come back. "Not attached" is in the inner SELECT too, so attached images
      // (never deleted, hence always the oldest) cannot fill every batch (review 07 SEC-73).
      for (;;) {
        const rows = await this.prisma.$queryRaw<FileRow[]>`
          UPDATE files f SET status = 'deleted', deleted_at = ${now}
          WHERE f.id IN (
            SELECT c.id FROM files c
            WHERE c.status = 'ready' AND c.purpose IN ('avatar', 'portfolio_image', 'category_image') AND c.ready_at < ${cutoff}
              AND c.attached_at IS NULL
              AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.avatar_file_id = c.id)
              AND NOT EXISTS (SELECT 1 FROM portfolio_items i WHERE i.thumbnail_file_id = c.id)
              AND NOT EXISTS (SELECT 1 FROM portfolio_images g WHERE g.file_id = c.id)
              AND NOT EXISTS (SELECT 1 FROM gig_categories k WHERE k.icon_file_id = c.id OR k.image_file_id = c.id)
              AND NOT EXISTS (SELECT 1 FROM project_categories pc WHERE pc.image_file_id = c.id)
            ORDER BY c.ready_at LIMIT 500
          )
            AND f.status = 'ready'
            AND f.attached_at IS NULL
            AND NOT EXISTS (SELECT 1 FROM user_profiles p WHERE p.avatar_file_id = f.id)
            AND NOT EXISTS (SELECT 1 FROM portfolio_items i WHERE i.thumbnail_file_id = f.id)
            AND NOT EXISTS (SELECT 1 FROM portfolio_images g WHERE g.file_id = f.id)
            AND NOT EXISTS (SELECT 1 FROM gig_categories k WHERE k.icon_file_id = f.id OR k.image_file_id = f.id)
            AND NOT EXISTS (SELECT 1 FROM project_categories pc WHERE pc.image_file_id = f.id)
          RETURNING f.bucket, f.object_key AS "objectKey", f.variants`;
        for (const file of rows) {
          await this.storage.delete(file.bucket, file.objectKey);
          for (const key of variantKeys(file)) await this.storage.delete('public_media', key);
        }
        total += rows.length;
        if (rows.length < 500) break;
      }
      if (total) this.logger.log({ removed: total }, 'unattached public images deleted');
      return total;
    } catch (err) {
      this.logger.error({ err }, 'unattached public image cleanup failed');
      return total;
    }
  }

  /** Deletes `pending` uploads older than 24 h (and their object, if the client uploaded one). */
  async cleanupPending(now = new Date()): Promise<number> {
    await this.cleanupLateQuarantine(now);
    await this.cleanupUnattachedPublic(now);
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
