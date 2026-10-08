// Object storage over the S3 API (ADR-009 §1–§4; SeaweedFS locally, ADR-017; R2/Hetzner in production).
// Business code depends on `ObjectStorage` only; tests swap in an in-memory stand-in. Two clients: one for
// the API's own calls (S3_ENDPOINT, e.g. `http://s3:8333` inside compose) and one that signs URLs handed to
// browsers and apps (S3_PUBLIC_ENDPOINT, e.g. `http://localhost:8333`), because a presigned GET signs the host.
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Global, Inject, Injectable, Logger, Module } from '@nestjs/common';
import type { FileBucket } from '../../generated/prisma/client';
import { ENV, type Env } from '../config/env';
import { ApiException } from '../errors/api-exception';

export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
  expiresAt: Date;
}

export interface PresignedPostInput {
  bucket: FileBucket;
  key: string;
  contentType: string;
  /** Upper bound of the `content-length-range` condition. */
  maxBytes: number;
  expiresSeconds: number;
}

export interface PresignedGetInput {
  bucket: FileBucket;
  key: string;
  expiresSeconds: number;
  /** Sent back as `Content-Disposition: attachment` (ADR-009 §4: never inline). */
  downloadName: string;
}

export interface ObjectHead {
  sizeBytes: number;
  contentType: string | null;
  /** Only when the object has one (files stored as uploaded are downloads, review 10 SEC-80 (b)). */
  contentDisposition?: string;
}

/**
 * Where `copy` writes; `contentDisposition` is stored with the object and sent on every plain GET. Without
 * `contentType` the object keeps all its stored headers (a gig file moved between buckets, ROADMAP 4.3.24).
 */
export interface CopyTarget {
  bucket: FileBucket;
  key: string;
  contentType?: string;
  contentDisposition?: string;
}

/** An object's bytes and the version they belong to (`ETag`), so a later copy can insist on that version. */
export interface ObjectRead {
  body: AsyncIterable<Uint8Array>;
  etag: string | null;
}

/** `copy` with `ifMatch`: the source changed since it was read (security review 06 SEC-63). */
export class ObjectChangedError extends Error {}

export interface PutObjectInput {
  bucket: FileBucket;
  key: string;
  body: Buffer;
  contentType: string;
  /** Processed public images have unique keys per file, so they can be cached forever. */
  cacheControl?: string;
}

export abstract class ObjectStorage {
  abstract presignedPost(input: PresignedPostInput): Promise<PresignedPost>;
  abstract presignedGet(input: PresignedGetInput): Promise<string>;
  /** `null` when the object does not exist. */
  abstract head(bucket: FileBucket, key: string): Promise<ObjectHead | null>;
  /** The object's bytes as a stream (the worker reads uploads of up to 100 MB); `null` when missing. */
  abstract read(bucket: FileBucket, key: string): Promise<ObjectRead | null>;
  abstract put(input: PutObjectInput): Promise<void>;
  /**
   * Server-side copy (large files never pass through the worker's memory). With `ifMatch` the copy happens
   * only while the source still has that ETag, otherwise `ObjectChangedError` (a re-upload after the scan).
   */
  abstract copy(
    from: { bucket: FileBucket; key: string; ifMatch?: string | null },
    to: CopyTarget,
  ): Promise<void>;
  /** Idempotent: deleting a missing object is not an error. */
  abstract delete(bucket: FileBucket, key: string): Promise<void>;
}

/** RFC 6266 `attachment` with an ASCII fallback and the UTF-8 name (Georgian file names). */
export function attachmentDisposition(name: string): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export class S3ObjectStorage extends ObjectStorage {
  private readonly client: S3Client;
  private readonly signer: S3Client;
  private readonly buckets: Record<FileBucket, string>;

  constructor(env: Env) {
    super();
    const credentials = {
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    };
    // Path-style URLs work on SeaweedFS, R2 and Hetzner alike (no per-bucket DNS).
    const base = { region: env.S3_REGION, credentials, forcePathStyle: true };
    this.client = new S3Client({ ...base, endpoint: env.S3_ENDPOINT });
    this.signer = new S3Client({ ...base, endpoint: env.S3_PUBLIC_ENDPOINT ?? env.S3_ENDPOINT });
    this.buckets = {
      public_media: env.S3_BUCKET_PUBLIC,
      private: env.S3_BUCKET_PRIVATE,
      kyc: env.S3_BUCKET_KYC,
    };
  }

  async presignedPost(input: PresignedPostInput): Promise<PresignedPost> {
    const { url, fields } = await createPresignedPost(this.signer, {
      Bucket: this.buckets[input.bucket],
      Key: input.key,
      Conditions: [
        ['content-length-range', 1, input.maxBytes],
        ['eq', '$Content-Type', input.contentType],
      ],
      Fields: { 'Content-Type': input.contentType },
      Expires: input.expiresSeconds,
    });
    return { url, fields, expiresAt: new Date(Date.now() + input.expiresSeconds * 1000) };
  }

  presignedGet(input: PresignedGetInput): Promise<string> {
    return getSignedUrl(
      this.signer,
      new GetObjectCommand({
        Bucket: this.buckets[input.bucket],
        Key: input.key,
        ResponseContentDisposition: attachmentDisposition(input.downloadName),
        // Private and KYC files must not stay in a browser or proxy cache after the link expires (SEC-70).
        ResponseCacheControl: 'private, no-store',
      }),
      { expiresIn: input.expiresSeconds },
    );
  }

  async head(bucket: FileBucket, key: string): Promise<ObjectHead | null> {
    try {
      const out = await this.client.send(
        new HeadObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
      );
      return {
        sizeBytes: out.ContentLength ?? 0,
        contentType: out.ContentType ?? null,
        ...(out.ContentDisposition ? { contentDisposition: out.ContentDisposition } : {}),
      };
    } catch (err) {
      if (err instanceof NotFound || (err as { name?: string }).name === 'NotFound') return null;
      throw err;
    }
  }

  async read(bucket: FileBucket, key: string): Promise<ObjectRead | null> {
    try {
      const out = await this.client.send(
        new GetObjectCommand({ Bucket: this.buckets[bucket], Key: key }),
      );
      const body = out.Body as AsyncIterable<Uint8Array> | undefined;
      return body ? { body, etag: out.ETag ?? null } : null;
    } catch (err) {
      if (err instanceof NoSuchKey || (err as { name?: string }).name === 'NoSuchKey') return null;
      throw err;
    }
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.buckets[input.bucket],
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
        CacheControl: input.cacheControl,
      }),
    );
  }

  async copy(
    from: { bucket: FileBucket; key: string; ifMatch?: string | null },
    to: CopyTarget,
  ): Promise<void> {
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.buckets[to.bucket],
          Key: to.key,
          // Keys are opaque ASCII (`quarantine/<uuid>`), so no URL encoding is needed.
          CopySource: `${this.buckets[from.bucket]}/${from.key}`,
          CopySourceIfMatch: from.ifMatch ?? undefined,
          ContentType: to.contentType,
          ContentDisposition: to.contentType ? to.contentDisposition : undefined,
          MetadataDirective: to.contentType ? 'REPLACE' : 'COPY',
        }),
      );
    } catch (err) {
      const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (e.name === 'PreconditionFailed' || e.$metadata?.httpStatusCode === 412)
        throw new ObjectChangedError(`${from.bucket}/${from.key} changed since it was read`);
      throw err;
    }
  }

  async delete(bucket: FileBucket, key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.buckets[bucket], Key: key }));
  }
}

/** S3_* not set (Docker-free preview): file operations answer 503 instead of failing at boot. */
class UnconfiguredStorage extends ObjectStorage {
  private fail(): never {
    throw new ApiException(503, 'SERVICE_UNAVAILABLE', 't_toast_something_went_wrong');
  }
  presignedPost(): Promise<PresignedPost> {
    this.fail();
  }
  presignedGet(): Promise<string> {
    this.fail();
  }
  head(): Promise<ObjectHead | null> {
    this.fail();
  }
  read(): Promise<ObjectRead | null> {
    this.fail();
  }
  put(): Promise<void> {
    this.fail();
  }
  copy(): Promise<void> {
    this.fail();
  }
  delete(): Promise<void> {
    this.fail();
  }
}

@Injectable()
class StorageFactory {
  constructor(@Inject(ENV) private readonly env: Env) {}
  create(): ObjectStorage {
    const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = this.env;
    if (S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY)
      return new S3ObjectStorage(this.env);
    new Logger('Storage').warn('S3_* not set — file uploads are unavailable (local preview only)');
    return new UnconfiguredStorage();
  }
}

@Global()
@Module({
  providers: [
    StorageFactory,
    {
      provide: ObjectStorage,
      useFactory: (f: StorageFactory) => f.create(),
      inject: [StorageFactory],
    },
  ],
  exports: [ObjectStorage],
})
export class StorageModule {}
