// Staff removal takes a gig's files offline (ROADMAP 4.3.24, Owner Q-185 (b), review 10 I-57; data-model §3.D,
// ADR-009 §2 note 2026-10-08). While a staff removal stands, the gig's thumbnail, gallery images (all three
// variants) and documents live in the `private` bucket under the same keys; every other gig keeps them in
// `public-media` (pending, rejected and owner-deleted gigs are not part of Q-185). Files keep their ids and rows;
// only `files.bucket` changes, so the public media URL stops answering and the admin queue signs a GET instead.
//
// Every step is safe to repeat: a key is copied only when the target does not have it yet, deletes are
// idempotent, and the row says the new bucket only once the old objects are gone. `sync` runs under the gig row
// lock, so a removal's move and a restore never interleave; the worker's gig-media sweeper calls it again for any
// gig whose files are still in the wrong bucket (a failed move after a removal, a restore that failed half-way).
import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type File as FileRow, type FileBucket } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ObjectStorage } from '../../platform/storage/storage';
import { variantKeys } from '../files/files.service';

type Tx = Prisma.TransactionClient;
export type GigMediaBucket = Extract<FileBucket, 'public_media' | 'private'>;

/** A move holds the gig row lock while storage copies a few dozen objects server-side. */
export const MOVE_TX_TIMEOUT_MS = 60_000;

/** Where a gig's files belong: `private` while a staff removal stands, `public_media` otherwise. */
export function bucketFor(gig: { status: string; deletedBy: string | null }): GigMediaBucket {
  return gig.status === 'deleted' && gig.deletedBy === 'staff' ? 'private' : 'public_media';
}

const otherBucket = (b: GigMediaBucket): GigMediaBucket =>
  b === 'private' ? 'public_media' : 'private';

/** Every stored object of a file: the main key and, for images, the other variants. */
const fileKeys = (file: FileRow) => [file.objectKey, ...variantKeys(file)];

@Injectable()
export class GigMedia {
  private readonly logger = new Logger('GigMedia');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
  ) {}

  /** The gig's ready files: thumbnail, gallery images and documents. */
  async files(gigId: string, db: Tx = this.prisma): Promise<FileRow[]> {
    const gig = await db.gig.findUnique({
      where: { id: gigId },
      select: {
        thumbnailFileId: true,
        images: { select: { fileId: true } },
        documents: { select: { fileId: true } },
      },
    });
    if (!gig) return [];
    const ids = [
      gig.thumbnailFileId,
      ...gig.images.map((i) => i.fileId),
      ...gig.documents.map((d) => d.fileId),
    ];
    return db.file.findMany({ where: { id: { in: ids }, status: 'ready' } });
  }

  /**
   * Copies each object of the file into `to`, keeping its stored headers (content type, `Cache-Control` of the
   * image variants, `Content-Disposition: attachment` of documents). An object already in `to` is left alone; one
   * missing in both buckets is logged and skipped (nothing left to hide or show).
   */
  async copyTo(file: FileRow, to: GigMediaBucket): Promise<void> {
    const from = otherBucket(to);
    for (const key of fileKeys(file)) {
      if (await this.storage.head(to, key)) continue;
      if (!(await this.storage.head(from, key))) {
        this.logger.warn({ fileId: file.id, key }, 'gig file object missing in both buckets');
        continue;
      }
      await this.storage.copy({ bucket: from, key }, { bucket: to, key });
    }
  }

  /** Deletes every object of the file from `bucket` (idempotent). */
  async deleteFrom(file: FileRow, bucket: GigMediaBucket): Promise<void> {
    for (const key of fileKeys(file)) await this.storage.delete(bucket, key);
  }

  /**
   * Puts the gig's files where its current state says (`bucketFor`), under the gig row lock: copy, delete the old
   * objects, then point the rows at the new bucket. A crash in between leaves the rows on the old bucket, so the
   * next call (or the sweeper) finds the gig again and finishes. With `skipLocked` a gig locked by another
   * transaction (a restore in progress) is left for the next pass. Returns the number of files moved.
   */
  async sync(gigId: string, { skipLocked = false } = {}): Promise<number> {
    return this.prisma.$transaction(
      async (tx) => {
        const [row] = await tx.$queryRaw<{ status: string; deleted_by: string | null }[]>`
          SELECT "status"::text AS "status", "deleted_by"::text AS "deleted_by"
          FROM "gigs" WHERE "id" = ${gigId}::uuid
          FOR UPDATE ${skipLocked ? Prisma.sql`SKIP LOCKED` : Prisma.empty}`;
        if (!row) return 0;
        const target = bucketFor({ status: row.status, deletedBy: row.deleted_by });
        const misplaced = (await this.files(gigId, tx)).filter((f) => f.bucket !== target);
        for (const file of misplaced) {
          await this.copyTo(file, target);
          await this.deleteFrom(file, otherBucket(target));
        }
        if (misplaced.length) {
          await tx.file.updateMany({
            where: { id: { in: misplaced.map((f) => f.id) } },
            data: { bucket: target },
          });
          this.logger.log({ gigId, bucket: target, files: misplaced.length }, 'gig files moved');
        }
        return misplaced.length;
      },
      { timeout: MOVE_TX_TIMEOUT_MS },
    );
  }

  /**
   * Gigs whose ready files sit in the wrong bucket (sweeper input): files of a staff-removed gig still in
   * `public-media`, or files of any other gig still in `private`.
   */
  async misplaced(limit: number): Promise<string[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT g."id"::text AS "id"
      FROM "gigs" g
      JOIN LATERAL (
        SELECT g."thumbnail_file_id" AS "file_id"
        UNION ALL SELECT i."file_id" FROM "gig_images" i WHERE i."gig_id" = g."id"
        UNION ALL SELECT d."file_id" FROM "gig_documents" d WHERE d."gig_id" = g."id"
      ) x ON true
      JOIN "files" f ON f."id" = x."file_id" AND f."status" = 'ready'
      WHERE f."bucket" <> (CASE WHEN g."status" = 'deleted' AND g."deleted_by" = 'staff'
                                THEN 'private' ELSE 'public_media' END)::"file_bucket"
      LIMIT ${limit}`;
    return rows.map((r) => r.id);
  }
}
