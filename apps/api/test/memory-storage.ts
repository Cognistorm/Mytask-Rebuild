// In-memory ObjectStorage for API tests (no S3 server). `upload` plays the client's direct POST; the real
// presigned POST/GET against SeaweedFS is proven by storage.integration.test.ts (ADR-017 §3).
import type { FileBucket } from '../src/generated/prisma/client';
import {
  ObjectStorage,
  type ObjectHead,
  type PresignedGetInput,
  type PresignedPost,
  type PresignedPostInput,
} from '../src/platform/storage/storage';

export class MemoryStorage extends ObjectStorage {
  readonly objects = new Map<string, ObjectHead>();
  readonly posts: PresignedPostInput[] = [];

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
    return Promise.resolve(this.objects.get(this.id(bucket, key)) ?? null);
  }

  delete(bucket: FileBucket, key: string): Promise<void> {
    this.objects.delete(this.id(bucket, key));
    return Promise.resolve();
  }

  /** What the client's direct upload would leave in storage. */
  upload(bucket: FileBucket, key: string, sizeBytes: number, contentType: string): void {
    this.objects.set(this.id(bucket, key), { sizeBytes, contentType });
  }

  has(bucket: FileBucket, key: string): boolean {
    return this.objects.has(this.id(bucket, key));
  }
}
