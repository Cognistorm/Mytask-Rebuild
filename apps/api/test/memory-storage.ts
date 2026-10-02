// In-memory ObjectStorage for API tests (no S3 server). `upload` plays the client's direct POST; the real
// presigned POST/GET against SeaweedFS is proven by storage.integration.test.ts (ADR-017 §3).
import type { FileBucket } from '../src/generated/prisma/client';
import {
  ObjectStorage,
  type ObjectHead,
  type PresignedGetInput,
  type PresignedPost,
  type PresignedPostInput,
  type PutObjectInput,
} from '../src/platform/storage/storage';

interface StoredObject extends ObjectHead {
  body: Buffer;
  cacheControl?: string;
}

export class MemoryStorage extends ObjectStorage {
  readonly objects = new Map<string, StoredObject>();
  readonly posts: PresignedPostInput[] = [];
  /** Makes the next `read` throw, as an unreachable storage would. */
  failNextRead = false;

  private id(bucket: FileBucket, key: string) {
    return `${bucket}/${key}`;
  }

  presignedPost(input: PresignedPostInput): Promise<PresignedPost> {
    this.posts.push(input);
    return Promise.resolve({
      url: `http://storage.test/${input.bucket}`,
      fields: { key: input.key, 'Content-Type': input.contentType, Policy: 'test' },
      expiresAt: new Date(Date.now() + input.expiresSeconds * 1000),
    });
  }

  presignedGet(input: PresignedGetInput): Promise<string> {
    return Promise.resolve(`http://storage.test/${input.bucket}/${input.key}?signed=1`);
  }

  head(bucket: FileBucket, key: string): Promise<ObjectHead | null> {
    const o = this.objects.get(this.id(bucket, key));
    return Promise.resolve(o ? { sizeBytes: o.sizeBytes, contentType: o.contentType } : null);
  }

  read(bucket: FileBucket, key: string): Promise<AsyncIterable<Uint8Array> | null> {
    if (this.failNextRead) {
      this.failNextRead = false;
      return Promise.reject(new Error('storage unavailable'));
    }
    const o = this.objects.get(this.id(bucket, key));
    if (!o) return Promise.resolve(null);
    // Small chunks, like a network stream.
    async function* chunks() {
      for (let i = 0; i < o!.body.length; i += 16 * 1024) yield o!.body.subarray(i, i + 16 * 1024);
    }
    return Promise.resolve(chunks());
  }

  put(input: PutObjectInput): Promise<void> {
    this.objects.set(this.id(input.bucket, input.key), {
      body: input.body,
      sizeBytes: input.body.length,
      contentType: input.contentType,
      cacheControl: input.cacheControl,
    });
    return Promise.resolve();
  }

  copy(
    from: { bucket: FileBucket; key: string },
    to: { bucket: FileBucket; key: string; contentType: string },
  ): Promise<void> {
    const o = this.objects.get(this.id(from.bucket, from.key));
    if (!o) return Promise.reject(new Error('NoSuchKey'));
    this.objects.set(this.id(to.bucket, to.key), { ...o, contentType: to.contentType });
    return Promise.resolve();
  }

  delete(bucket: FileBucket, key: string): Promise<void> {
    this.objects.delete(this.id(bucket, key));
    return Promise.resolve();
  }

  /**
   * What the client's direct upload would leave in storage. Without `body`, the object holds `sizeBytes`
   * zero bytes (enough for tests that never scan it).
   */
  upload(
    bucket: FileBucket,
    key: string,
    sizeBytes: number,
    contentType: string,
    body: Buffer = Buffer.alloc(sizeBytes),
  ): void {
    this.objects.set(this.id(bucket, key), { body, sizeBytes: body.length, contentType });
  }

  has(bucket: FileBucket, key: string): boolean {
    return this.objects.has(this.id(bucket, key));
  }

  get(bucket: FileBucket, key: string): StoredObject | undefined {
    return this.objects.get(this.id(bucket, key));
  }
}
