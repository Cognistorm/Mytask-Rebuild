// Files F0 part 2 (ADR-009 §3.5, ROADMAP 4.1.4): turns a `scanning` upload into `ready` or `rejected`.
// One pass over the object feeds the SHA-256, the size count, the magic-byte sniffer, the image buffer and
// ClamAV at the same time. Every state change is a compare-and-set on `status = 'scanning'`: the owner may
// delete the file while it is being scanned, and then whatever this pass wrote is removed again.
// The realtime event `file.processed` is emitted once the gateway exists (slice 08); until then clients
// poll getFile.
import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import type { File as FileRow, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../platform/db/prisma.service';
import { VirusScanner } from '../../../platform/scanner/scanner';
import { SettingsService } from '../../../platform/settings/settings.service';
import { ObjectStorage, type PutObjectInput } from '../../../platform/storage/storage';
import { MB, PURPOSE_POLICIES, type PurposePolicy } from '../purposes';
import { DETECTED_BY_EXTENSION, SNIFF_BYTES, sniff } from './magic';

/** Stored in `files.reject_reason` as an i18n key; getFile returns it translated. */
export const REJECT_REASONS = {
  virus: 't_file_rejected_virus',
  type: 't_file_rejected_type',
  tooLarge: 't_selected_file_size_big',
  unreadable: 't_file_rejected_unreadable',
  missing: 't_file_not_found',
} as const;

/** Longest side of each public variant, px (never enlarged). */
export const VARIANT_SIZES = { thumb: 320, medium: 800, large: 1600 } as const;
type VariantName = keyof typeof VARIANT_SIZES;

/** Decompression-bomb guard: a 100-megapixel photo is far beyond any phone camera's default. */
const SHARP_INPUT = { limitInputPixels: 100_000_000, failOn: 'error', autoOrient: true } as const;
const IMMUTABLE = 'public, max-age=31536000, immutable';

export type ScanOutcome = 'ready' | 'rejected' | 'skipped';

interface ReadResult {
  infected: string | null;
  sizeBytes: number;
  tooLarge: boolean;
  head: Buffer;
  checksum: Buffer;
  body: Buffer | null;
}

/** Final objects of a clean upload, written before the row turns `ready`. */
interface Placement {
  bucket: FileRow['bucket'];
  objectKey: string;
  variants: Record<VariantName, string> | null;
  width: number | null;
  height: number | null;
  puts: PutObjectInput[];
  copy: boolean;
}

class Unreadable extends Error {}

@Injectable()
export class FileScanService {
  private readonly logger = new Logger('FileScan');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly scanner: VirusScanner,
    private readonly settings: SettingsService,
  ) {}

  /** Scans one file. Throws on infrastructure errors (storage, clamd); the sweeper retries later. */
  async process(fileId: string): Promise<ScanOutcome> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'scanning') return 'skipped';
    const policy = PURPOSE_POLICIES[file.purpose];
    // The purpose was switched off after the upload: refuse, as createFileUpload would now.
    if (!policy) return this.reject(file, REJECT_REASONS.type, null);
    const source = await this.storage.read(file.bucket, file.objectKey);
    if (!source) return this.reject(file, REJECT_REASONS.missing, null);

    const read = await this.readAndScan(file, source, policy.processing !== 'none');
    const detected = sniff(read.head, read.sizeBytes <= SNIFF_BYTES);
    if (read.infected) {
      this.logger.warn({ fileId, signature: read.infected }, 'upload rejected: virus found');
      return this.reject(file, REJECT_REASONS.virus, detected);
    }
    const limits = await policy.limits(this.settings);
    if (read.tooLarge || read.sizeBytes > limits.maxMb * MB)
      return this.reject(file, REJECT_REASONS.tooLarge, detected);
    const allowed = limits.extensions.map((ext) => DETECTED_BY_EXTENSION[ext]);
    if (!detected || !allowed.includes(detected))
      return this.reject(file, REJECT_REASONS.type, detected);

    let placement: Placement;
    try {
      placement = await this.place(file, policy, detected, read.body);
    } catch (err) {
      if (!(err instanceof Unreadable)) throw err;
      return this.reject(file, REJECT_REASONS.unreadable, detected);
    }
    for (const put of placement.puts) await this.storage.put(put);
    if (placement.copy) {
      await this.storage.copy(
        { bucket: file.bucket, key: file.objectKey },
        { bucket: placement.bucket, key: placement.objectKey, contentType: detected },
      );
    }

    const done = await this.prisma.file.updateMany({
      where: { id: file.id, status: 'scanning' },
      data: {
        status: 'ready',
        bucket: placement.bucket,
        objectKey: placement.objectKey,
        detectedType: detected,
        variants: (placement.variants ?? undefined) as Prisma.InputJsonValue | undefined,
        width: placement.width,
        height: placement.height,
        sizeBytes: BigInt(read.sizeBytes),
        checksumSha256: new Uint8Array(read.checksum),
        scanSkipped: !this.scanner.enabled,
        readyAt: new Date(),
      },
    });
    if (done.count === 0) {
      // Deleted by its owner meanwhile: remove what this pass wrote.
      for (const put of placement.puts) await this.storage.delete(put.bucket, put.key);
      if (placement.copy) await this.storage.delete(placement.bucket, placement.objectKey);
      await this.storage.delete(file.bucket, file.objectKey);
      return 'skipped';
    }
    // The raw upload (with its EXIF/GPS data) is not kept once the processed copy exists.
    await this.storage.delete(file.bucket, file.objectKey);
    this.logger.log({ fileId, purpose: file.purpose, bucket: placement.bucket }, 'upload ready');
    return 'ready';
  }

  private async readAndScan(
    file: FileRow,
    source: AsyncIterable<Uint8Array>,
    keepBody: boolean,
  ): Promise<ReadResult> {
    const limit = Number(file.sizeBytes);
    const hash = createHash('sha256');
    const head: Buffer[] = [];
    const body: Buffer[] = [];
    let headBytes = 0;
    let sizeBytes = 0;
    let tooLarge = false;

    // Storage enforces the declared size (content-length-range); reading more than that is refused anyway.
    async function* measured(): AsyncGenerator<Buffer> {
      for await (const chunk of source) {
        const b = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        sizeBytes += b.length;
        if (sizeBytes > limit) {
          tooLarge = true;
          return;
        }
        hash.update(b);
        if (headBytes < SNIFF_BYTES) {
          const part = b.subarray(0, SNIFF_BYTES - headBytes);
          head.push(part);
          headBytes += part.length;
        }
        if (keepBody) body.push(b);
        yield b;
      }
    }

    try {
      const verdict = await this.scanner.scan(measured());
      return {
        infected: verdict.infected ? verdict.signature : null,
        sizeBytes,
        tooLarge,
        head: Buffer.concat(head),
        checksum: hash.digest(),
        body: keepBody ? Buffer.concat(body) : null,
      };
    } finally {
      // Stops the download when the scan ended early (too large, scanner error).
      (source as { destroy?: () => void }).destroy?.();
    }
  }

  private async place(
    file: FileRow,
    policy: PurposePolicy,
    detected: string,
    body: Buffer | null,
  ): Promise<Placement> {
    if (policy.processing === 'none') {
      return {
        bucket: policy.finalBucket,
        objectKey: `files/${file.id}`,
        variants: null,
        width: null,
        height: null,
        puts: [],
        copy: true,
      };
    }
    const input = body!;
    const meta = await image(input, (s) => s.metadata());
    const { width, height } = meta.autoOrient;

    if (policy.processing === 'private_image') {
      // Same format, metadata stripped (sharp drops EXIF/GPS unless asked to keep it).
      const png = detected === 'image/png';
      const out = await image(input, (s) =>
        (png ? s.png() : s.jpeg({ quality: 90, mozjpeg: true })).toBuffer(),
      );
      const objectKey = `documents/${file.id}.${png ? 'png' : 'jpg'}`;
      const type = png ? 'image/png' : 'image/jpeg';
      return {
        bucket: policy.finalBucket,
        objectKey,
        variants: null,
        width,
        height,
        puts: [{ bucket: policy.finalBucket, key: objectKey, body: out, contentType: type }],
        copy: false,
      };
    }

    const variants = {} as Record<VariantName, string>;
    const puts: PutObjectInput[] = [];
    for (const [name, size] of Object.entries(VARIANT_SIZES) as [VariantName, number][]) {
      const out = await image(input, (s) =>
        s
          .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toBuffer(),
      );
      variants[name] = `images/${file.id}/${name}.webp`;
      puts.push({
        bucket: policy.finalBucket,
        key: variants[name],
        body: out,
        contentType: 'image/webp',
        cacheControl: IMMUTABLE,
      });
    }
    return {
      bucket: policy.finalBucket,
      // The row points at the largest variant; `variants` lists all three (deleteFile removes them all).
      objectKey: variants.large,
      variants,
      width,
      height,
      puts,
      copy: false,
    };
  }

  private async reject(
    file: FileRow,
    reason: string,
    detected: string | null,
  ): Promise<ScanOutcome> {
    const done = await this.prisma.file.updateMany({
      where: { id: file.id, status: 'scanning' },
      data: { status: 'rejected', rejectReason: reason, detectedType: detected },
    });
    // A refused upload (possibly malware) is never kept.
    await this.storage.delete(file.bucket, file.objectKey);
    if (done.count === 0) return 'skipped';
    this.logger.log({ fileId: file.id, purpose: file.purpose, reason }, 'upload rejected');
    return 'rejected';
  }
}

/** Runs one sharp operation; a broken or hostile image becomes `Unreadable` (rejected, not retried). */
async function image<T>(input: Buffer, op: (s: sharp.Sharp) => Promise<T>): Promise<T> {
  try {
    return await op(sharp(input, SHARP_INPUT));
  } catch (err) {
    throw new Unreadable((err as Error).message);
  }
}
