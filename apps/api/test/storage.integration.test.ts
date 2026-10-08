// ADR-017 §3: presigned POST (with its policy: size range, content type) and presigned GET must work against
// the local S3 server (SeaweedFS). Needs a running S3 endpoint: S3_INTEGRATION=1 plus the S3_* variables
// (`pnpm infra:up`, then S3_INTEGRATION=1 with the S3_* values of .env; ADR-020).
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadEnv, type Env } from '../src/platform/config/env';
import {
  attachmentDisposition,
  ObjectChangedError,
  S3ObjectStorage,
} from '../src/platform/storage/storage';

const enabled = process.env.S3_INTEGRATION === '1';

describe.skipIf(!enabled)('object storage (integration, ADR-017 §3)', () => {
  let env: Env;
  let storage: S3ObjectStorage;

  beforeAll(async () => {
    env = loadEnv();
    storage = new S3ObjectStorage(env);
    // s3-init creates the buckets in compose; create the private one here too for a bare server.
    const admin = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
      },
    });
    for (const bucket of [env.S3_BUCKET_PRIVATE, env.S3_BUCKET_PUBLIC])
      await admin.send(new CreateBucketCommand({ Bucket: bucket })).catch(() => undefined);
  });

  async function post(key: string, body: Buffer, contentType: string, maxBytes = 1000) {
    const ticket = await storage.presignedPost({
      bucket: 'private',
      key,
      contentType: 'image/png',
      maxBytes,
      expiresSeconds: 60,
    });
    const form = new FormData();
    for (const [k, v] of Object.entries(ticket.fields))
      form.append(k, k === 'Content-Type' ? contentType : v);
    form.append('file', new Blob([new Uint8Array(body)], { type: contentType }), 'upload.png');
    return fetch(ticket.url, { method: 'POST', body: form });
  }

  it('accepts an upload inside the policy, then serves it through a presigned GET as an attachment', async () => {
    const key = `quarantine/${randomUUID()}`;
    const bytes = Buffer.alloc(500, 7);
    const res = await post(key, bytes, 'image/png');
    expect(res.status, await res.text()).toBeLessThan(300);

    expect(await storage.head('private', key)).toMatchObject({ sizeBytes: 500 });

    const url = await storage.presignedGet({
      bucket: 'private',
      key,
      expiresSeconds: 60,
      downloadName: 'ფოტო.png',
    });
    const got = await fetch(url);
    expect(got.status).toBe(200);
    expect(Buffer.from(await got.arrayBuffer()).equals(bytes)).toBe(true);
    expect(got.headers.get('content-disposition')).toMatch(/^attachment;/);
    // SEC-70: signed links of private files are never cached.
    expect(got.headers.get('cache-control')).toBe('private, no-store');

    await storage.delete('private', key);
    expect(await storage.head('private', key)).toBeNull();
  });

  it('refuses an upload above the content-length-range', async () => {
    const key = `quarantine/${randomUUID()}`;
    const res = await post(key, Buffer.alloc(2000, 1), 'image/png');
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('EntityTooLarge');
    expect(await storage.head('private', key)).toBeNull();
  });

  it('refuses an upload whose Content-Type differs from the signed one', async () => {
    const key = `quarantine/${randomUUID()}`;
    const res = await post(key, Buffer.alloc(100, 1), 'text/html');
    expect(res.status).toBe(403);
    expect(await storage.head('private', key)).toBeNull();
  });

  it('worker calls (4.1.4): stream read, put with cache headers, server-side copy', async () => {
    const id = randomUUID();
    const bytes = Buffer.alloc(300 * 1024, 9);
    expect((await post(`quarantine/${id}`, bytes, 'image/png', bytes.length)).status).toBeLessThan(
      300,
    );

    const stream = await storage.read('private', `quarantine/${id}`);
    const parts: Buffer[] = [];
    for await (const chunk of stream!.body) parts.push(Buffer.from(chunk));
    expect(stream!.etag).toBeTruthy();
    expect(Buffer.concat(parts).equals(bytes)).toBe(true);
    expect(await storage.read('private', `quarantine/${randomUUID()}`)).toBeNull();

    await storage.copy(
      { bucket: 'private', key: `quarantine/${id}`, ifMatch: stream!.etag },
      {
        bucket: 'private',
        key: `files/${id}`,
        contentType: 'application/pdf',
        contentDisposition: attachmentDisposition('ფასები.pdf'),
      },
    );
    // Stored with the object, so a plain GET (public media, review 10 SEC-80 (b)) is a download.
    expect(await storage.head('private', `files/${id}`)).toEqual({
      sizeBytes: bytes.length,
      contentType: 'application/pdf',
      contentDisposition: attachmentDisposition('ფასები.pdf'),
    });

    const key = `images/${id}/thumb.webp`;
    await storage.put({
      bucket: 'public_media',
      key,
      body: Buffer.from('webp'),
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    expect(await storage.head('public_media', key)).toEqual({
      sizeBytes: 4,
      contentType: 'image/webp',
    });

    for (const [bucket, k] of [
      ['private', `quarantine/${id}`],
      ['private', `files/${id}`],
      ['public_media', key],
    ] as const)
      await storage.delete(bucket, k);
  });

  it('SEC-63: a copy that names the scanned ETag fails once the object was re-uploaded', async () => {
    const id = randomUUID();
    expect((await post(`quarantine/${id}`, Buffer.alloc(200, 1), 'image/png')).status).toBeLessThan(
      300,
    );
    const first = await storage.read('private', `quarantine/${id}`);
    for await (const _ of first!.body) void _;
    expect((await post(`quarantine/${id}`, Buffer.alloc(200, 2), 'image/png')).status).toBeLessThan(
      300,
    );
    await expect(
      storage.copy(
        { bucket: 'private', key: `quarantine/${id}`, ifMatch: first!.etag },
        { bucket: 'private', key: `files/${id}`, contentType: 'image/png' },
      ),
    ).rejects.toBeInstanceOf(ObjectChangedError);
    expect(await storage.head('private', `files/${id}`)).toBeNull();
    await storage.delete('private', `quarantine/${id}`);
  });

  it('refuses a presigned GET whose signature was tampered with', async () => {
    const url = await storage.presignedGet({
      bucket: 'private',
      key: 'quarantine/does-not-matter',
      expiresSeconds: 60,
      downloadName: 'x.png',
    });
    const res = await fetch(
      url.replace(/X-Amz-Signature=[0-9a-f]+/, `X-Amz-Signature=${'0'.repeat(64)}`),
    );
    expect(res.status).toBe(403);
  });
});
