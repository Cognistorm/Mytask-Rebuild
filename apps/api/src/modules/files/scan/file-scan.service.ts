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
import {
  attachmentDisposition,
  ObjectChangedError,
  ObjectStorage,
  type PutObjectInput,
} from '../../../platform/storage/storage';
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

/**
 * Decompression-bomb guard: a 100-megapixel photo is far beyond any phone camera's default. Kept at 100 MP
 * (review 06 I-33 suggested 40 MP, which would refuse full-resolution 48–50 MP phone photos); the cost is
 * bounded instead by decoding each upload once (`publicVariants`) and reading it sequentially.
 */
const SHARP_INPUT = {
  limitInputPixels: 100_000_000,
  failOn: 'error',
  autoOrient: true,
  sequentialRead: true,
} as const;
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

  /** SHA-256 of a stored object, or null when it is gone. */
  private async sha256Of(bucket: FileRow['bucket'], key: string): Promise<Buffer | null> {
    const object = await this.storage.read(bucket, key);
    if (!object) return null;
    const hash = createHash('sha256');
    for await (const chunk of object.body) hash.update(chunk);
    return hash.digest();
  }

  /** Scans one file. Throws on infrastructure errors (storage, clamd); the sweeper retries later. */
  async process(fileId: string): Promise<ScanOutcome> {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.status !== 'scanning') return 'skipped';
    const policy = PURPOSE_POLICIES[file.purpose];
    // The purpose was switched off after the upload: refuse, as createFileUpload would now.
    if (!policy) return this.reject(file, REJECT_REASONS.type, null);
    const source = await this.storage.read(file.bucket, file.objectKey);
    if (!source) return this.reject(file, REJECT_REASONS.missing, null);

    const read = await this.readAndScan(file, source.body, policy.processing !== 'none');
    const detected = sniff(read.head, read.sizeBytes <= SNIFF_BYTES, {
      pdfAtStart: policy.finalBucket === 'public_media',
    });
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
    // Without an ETag the copy below could not insist on the scanned version (review 07 I-38): refuse, before
    // anything is written. A provider that drops the header does so every time, so a retry would not help.
    if (placement.copy && !source.etag) {
      this.logger.error(
        { fileId: file.id },
        'upload rejected: storage returned no ETag to pin the scan',
      );
      return this.reject(file, REJECT_REASONS.unreadable, detected);
    }
    for (const put of placement.puts) await this.storage.put(put);
    if (placement.copy) {
      // Only the version that was scanned: the presigned POST stays usable until it expires, and a re-upload
      // landing between the scan and this copy must not become `ready` unscanned (security review 06 SEC-63).
      try {
        await this.storage.copy(
          { bucket: file.bucket, key: file.objectKey, ifMatch: source.etag },
          {
            bucket: placement.bucket,
            key: placement.objectKey,
            contentType: detected,
            // Stored as a download, so no server or CDN in front of the bucket opens user bytes inline
            // (ADR-009 §4, review 10 SEC-80 (b)).
            contentDisposition: attachmentDisposition(file.originalName),
          },
        );
      } catch (err) {
        if (!(err instanceof ObjectChangedError)) throw err;
        this.logger.warn({ fileId: file.id }, 'upload rejected: replaced after the scan');
        return this.reject(file, REJECT_REASONS.unreadable, detected);
      }
      // The ETag is the MD5 of the body, so a colliding re-upload would still match (review 07 SEC-75): the
      // copy must hash to what was scanned, so the stored checksum belongs to the stored bytes.
      const copied = await this.sha256Of(placement.bucket, placement.objectKey);
      if (!copied?.equals(read.checksum)) {
        await this.storage.delete(placement.bucket, placement.objectKey);
        this.logger.error(
          { fileId: file.id },
          'upload rejected: the copy differs from the scanned bytes',
        );
        return this.reject(file, REJECT_REASONS.unreadable, detected);
      }
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
    for (const [name, out] of await publicVariants(input)) {
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

/**
 * The three WebP variants from one decode of the upload (review 06 I-33): the upload is decoded and shrunk
 * once to the largest variant size as raw pixels, and every variant is made from those pixels.
 */
async function publicVariants(input: Buffer): Promise<[VariantName, Buffer][]> {
  const largest = Math.max(...Object.values(VARIANT_SIZES));
  const fit = (size: number) =>
    ({ width: size, height: size, fit: 'inside', withoutEnlargement: true }) as const;
  const base = await image(input, (s) =>
    s.resize(fit(largest)).raw().toBuffer({ resolveWithObject: true }),
  );
  const { width, height, channels } = base.info;
  const out: [VariantName, Buffer][] = [];
  for (const [name, size] of Object.entries(VARIANT_SIZES) as [VariantName, number][]) {
    // Already-decoded pixels: an error here is not the upload's fault, so it is not `Unreadable`.
    const webp = await sharp(base.data, { raw: { width, height, channels } })
      .resize(fit(size))
      .webp({ quality: 82 })
      .toBuffer();
    out.push([name, webp]);
  }
  return out;
}
