// Files F0 part 2 (ROADMAP 4.1.4, ADR-009 §3.5): the worker's files-scan sweeper turns `scanning` uploads
// into `ready` (processed, moved) or `rejected` (reason, object removed). Real HTTP for upload/complete/
// get/delete; the worker's services run in-process on the same database, storage stand-in and a fake
// virus scanner (the clamd wire format is covered by files-scan-units.test.ts).
import { createHash } from 'node:crypto';
import type { NestExpressApplication } from '@nestjs/platform-express';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { FileScanService, VARIANT_SIZES } from '../src/modules/files/scan/file-scan.service';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { type ScanVerdict, VirusScanner } from '../src/platform/scanner/scanner';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { FilesScanSweeper, LATE_QUARANTINE_KEY } from '../src/worker/files-scan.sweeper';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';

const MEDIA = 'https://media.test';

/** Stand-in for clamd: reads the whole stream like clamd does, then answers what the test asks. */
class FakeScanner extends VirusScanner {
  enabled = true;
  next: ScanVerdict | Error = { infected: false };
  /** Runs while the file is being scanned (e.g. the owner deletes it meanwhile). */
  during: (() => Promise<void>) | undefined;
  scanned: number[] = [];

  async scan(chunks: AsyncIterable<Uint8Array>): Promise<ScanVerdict> {
    let n = 0;
    for await (const c of chunks) n += c.length;
    this.scanned.push(n);
    if (this.during) await this.during();
    const verdict = this.next;
    this.next = { infected: false };
    if (verdict instanceof Error) throw verdict;
    return verdict;
  }
  ping(): Promise<void> {
    return Promise.resolve();
  }
}

let app: NestExpressApplication;
let prisma: PrismaService;
let redis: RedisService;
let sweeper: FilesScanSweeper;
const storage = new MemoryStorage();
const scanner = new FakeScanner();
let seq = 0;
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;

const IOS = { 'X-MyTask-Client': 'ios' };
const http = () => request(app.getHttpServer());

async function register() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const res = await http()
    .post('/api/v1/auth/register')
    .set(IOS)
    .send({
      username: `scan_${n}`,
      email: `scan${n}@example.com`,
      fullName: 'Scan User',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(res.status).toBe(201);
  return { ...IOS, Authorization: `Bearer ${res.body.session.accessToken as string}` };
}
type Auth = Awaited<ReturnType<typeof register>>;

/** createFileUpload + the client's direct upload of `body` + completeFileUpload. */
async function upload(
  auth: Auth,
  body: Buffer,
  meta: { purpose?: string; fileName?: string; contentType?: string; declaredSize?: number } = {},
) {
  const res = await http()
    .post('/api/v1/files')
    .set(auth)
    .send({
      purpose: meta.purpose ?? 'avatar',
      fileName: meta.fileName ?? 'me.jpg',
      sizeBytes: meta.declaredSize ?? body.length,
      contentType: meta.contentType ?? 'image/jpeg',
    });
  expect(res.status).toBe(201);
  const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
  storage.upload(row.bucket, row.objectKey, body.length, row.declaredType, body);
  const done = await http().post(`/api/v1/files/${row.id}/complete`).set(auth);
  expect(done.status).toBe(202);
  expect(done.body.status).toBe('scanning');
  return row;
}

/** A 1200×800 JPEG photo with EXIF orientation 6 (rotated 90°) and camera GPS data. */
function photo(format: 'jpeg' | 'png' = 'jpeg') {
  const img = sharp({ create: { width: 1200, height: 800, channels: 3, background: '#2a6' } });
  return format === 'png'
    ? img
        .png()
        .withExif({ IFD0: { Make: 'TestCam' } })
        .toBuffer()
    : img
        .jpeg()
        .withMetadata({ orientation: 6 })
        .withExif({ IFD0: { Make: 'TestCam' }, IFD3: { GPSLatitudeRef: 'N' } })
        .toBuffer();
}

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  redis = app.get(RedisService);
  const scan = new FileScanService(prisma, storage, scanner, app.get(SettingsService));
  sweeper = new FilesScanSweeper(prisma, redis, storage, scan);
});

beforeEach(async () => {
  await redis.client.flushall();
  // Files left `scanning` by an earlier test must not be picked up by this one's sweeper pass.
  await prisma.file.updateMany({
    where: { status: 'scanning' },
    data: { status: 'deleted', deletedAt: new Date() },
  });
  scanner.enabled = true;
  scanner.during = undefined;
  scanner.scanned = [];
});

afterAll(async () => {
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
  await app.close();
});

describe('files-scan: clean images', () => {
  it('avatar → three WebP variants in public_media, EXIF/GPS gone, original removed', async () => {
    const auth = await register();
    const body = await photo();
    expect((await sharp(body).metadata()).exif).toBeDefined(); // the upload carries EXIF + GPS
    const row = await upload(auth, body);

    expect(await sweeper.tick()).toBe(1);
    expect(scanner.scanned).toEqual([body.length]); // every byte went through the scanner

    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file.status).toBe('ready');
    expect(file.bucket).toBe('public_media');
    expect(file.detectedType).toBe('image/jpeg');
    expect(file.scanSkipped).toBe(false);
    expect(file.readyAt).toBeInstanceOf(Date);
    // EXIF orientation 6 = portrait: the stored size is the size as displayed.
    expect([file.width, file.height]).toEqual([800, 1200]);
    expect(Buffer.from(file.checksumSha256!).toString('hex')).toBe(
      createHash('sha256').update(body).digest('hex'),
    );
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);

    const variants = file.variants as Record<keyof typeof VARIANT_SIZES, string>;
    expect(file.objectKey).toBe(variants.large);
    for (const [name, size] of Object.entries(VARIANT_SIZES)) {
      const stored = storage.get('public_media', variants[name as keyof typeof VARIANT_SIZES])!;
      expect(stored.contentType).toBe('image/webp');
      expect(stored.cacheControl).toContain('immutable');
      const meta = await sharp(stored.body).metadata();
      expect(meta.format).toBe('webp');
      expect(Math.max(meta.width, meta.height)).toBe(Math.min(size, 1200));
      expect(meta.height).toBeGreaterThan(meta.width); // rotated upright
      expect(meta.exif).toBeUndefined();
    }

    const got = await http().get(`/api/v1/files/${row.id}`).set(auth);
    expect(got.status).toBe(200);
    expect(got.body).toMatchObject({ status: 'ready', rejectReason: null });
    expect(got.body.image).toEqual({
      fileId: row.id,
      thumb: `${MEDIA}/${variants.thumb}`,
      medium: `${MEDIA}/${variants.medium}`,
      large: `${MEDIA}/${variants.large}`,
      width: 800,
      height: 1200,
    });

    // deleteFile removes every variant.
    expect((await http().delete(`/api/v1/files/${row.id}`).set(auth)).status).toBe(204);
    for (const key of Object.values(variants)) expect(storage.has('public_media', key)).toBe(false);
  });

  it('a PNG named .jpg is accepted as PNG: its real type is on the purpose list', async () => {
    const auth = await register();
    const row = await upload(auth, await photo('png'));
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file.status).toBe('ready');
    expect(file.detectedType).toBe('image/png');
  });

  it('KYC photo → re-encoded without metadata, stays in the kyc bucket, no public variants', async () => {
    const auth = await register();
    const row = await upload(auth, await photo('png'), {
      purpose: 'kyc_document',
      fileName: 'id-front.png',
      contentType: 'image/png',
    });
    expect(row.bucket).toBe('kyc');
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'ready', bucket: 'kyc', variants: null });
    expect(file.objectKey).toBe(`documents/${row.id}.png`);
    const stored = storage.get('kyc', file.objectKey)!;
    expect((await sharp(stored.body).metadata()).exif).toBeUndefined();
    expect(storage.has('kyc', row.objectKey)).toBe(false);
    const got = await http().get(`/api/v1/files/${row.id}`).set(auth);
    expect(got.body.image).toBeNull();
  });

  it('without a scanner the file is ready and flagged scan_skipped (ADR-009 §6)', async () => {
    scanner.enabled = false;
    const auth = await register();
    const row = await upload(auth, await photo());
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'ready', scanSkipped: true });
  });
});

describe('files-scan: rejections', () => {
  it('HTML named .jpg is rejected with a translated reason and removed', async () => {
    const auth = await register();
    const row = await upload(auth, Buffer.from('<html><script>alert(1)</script></html>'));
    expect(await sweeper.tick()).toBe(1);
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'rejected', rejectReason: 't_file_rejected_type' });
    expect(file.detectedType).toBe('text/plain');
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);

    const en = await http().get(`/api/v1/files/${row.id}`).set(auth).set('Accept-Language', 'en');
    expect(en.body).toMatchObject({
      status: 'rejected',
      rejectReason: 'The file content does not match an allowed file type',
      image: null,
    });
    const ka = await http().get(`/api/v1/files/${row.id}`).set(auth);
    expect(ka.body.rejectReason).toBe('ფაილის შიგთავსი არ შეესაბამება დაშვებულ ფაილის ტიპს');
  });

  it('a virus is rejected and the object removed', async () => {
    const auth = await register();
    const row = await upload(auth, await photo());
    scanner.next = { infected: true, signature: 'Eicar-Test-Signature' };
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'rejected', rejectReason: 't_file_rejected_virus' });
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);
    expect([...storage.objects.keys()].some((k) => k.includes(row.id))).toBe(false);
  });

  it('a broken image is rejected as unreadable, not retried', async () => {
    const auth = await register();
    const broken = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(500, 1)]);
    const row = await upload(auth, broken);
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'rejected', rejectReason: 't_file_rejected_unreadable' });
  });

  it('an object larger than the declared size is rejected (size re-check)', async () => {
    const auth = await register();
    const body = await photo();
    const row = await upload(auth, body, { declaredSize: body.length - 10 });
    await sweeper.tick();
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file).toMatchObject({ status: 'rejected', rejectReason: 't_selected_file_size_big' });
  });
});

describe('files-scan: retries, races, cleanup', () => {
  it('storage or scanner errors keep the file scanning and retry after a back-off', async () => {
    const auth = await register();
    const row = await upload(auth, await photo());

    storage.failNextRead = true;
    expect(await sweeper.tick()).toBe(0);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: row.id } })).status).toBe(
      'scanning',
    );
    const ttl = await redis.client.ttl(`files:scan:lease:${row.id}`);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);

    // Still within the back-off: not picked up.
    expect(await sweeper.tick()).toBe(0);

    // Back-off over, clamd down this time.
    await redis.client.del(`files:scan:lease:${row.id}`);
    scanner.next = new Error('clamd: connection refused');
    expect(await sweeper.tick()).toBe(0);
    expect(await redis.client.get(`files:scan:attempts:${row.id}`)).toBe('2');

    await redis.client.del(`files:scan:lease:${row.id}`);
    expect(await sweeper.tick()).toBe(1);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('ready');
    expect(await redis.client.get(`files:scan:attempts:${row.id}`)).toBeNull();
  });

  it('a file being scanned by another worker is skipped', async () => {
    const auth = await register();
    const row = await upload(auth, await photo());
    await redis.client.set(`files:scan:lease:${row.id}`, '1', 'EX', 600);
    expect(await sweeper.tick()).toBe(0);
    expect(scanner.scanned).toEqual([]);
  });

  it('owner deletes the file during its scan: nothing processed is left behind', async () => {
    const auth = await register();
    const row = await upload(auth, await photo());
    scanner.during = async () => {
      expect((await http().delete(`/api/v1/files/${row.id}`).set(auth)).status).toBe(204);
    };
    expect(await sweeper.tick()).toBe(0);
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file.status).toBe('deleted');
    expect([...storage.objects.keys()].some((k) => k.includes(row.id))).toBe(false);
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);
  });

  it('unused pending uploads older than 24 h are deleted with their object', async () => {
    const auth = await register();
    const make = async () => {
      const res = await http()
        .post('/api/v1/files')
        .set(auth)
        .send({ purpose: 'avatar', fileName: 'a.jpg', sizeBytes: 100, contentType: 'image/jpeg' });
      const row = await prisma.file.findUniqueOrThrow({ where: { id: res.body.file.id } });
      storage.upload(row.bucket, row.objectKey, 100, 'image/jpeg');
      return row;
    };
    const old = await make();
    const fresh = await make();
    await prisma.file.update({
      where: { id: old.id },
      data: { createdAt: new Date(Date.now() - 25 * 3600 * 1000) },
    });

    expect(await sweeper.cleanupPending()).toBeGreaterThanOrEqual(1);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: old.id } })).status).toBe('deleted');
    expect(storage.has(old.bucket, old.objectKey)).toBe(false);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe(
      'pending',
    );
    expect(storage.has(fresh.bucket, fresh.objectKey)).toBe(true);
  });
});

describe('files-scan: stored-as-uploaded files (security review 06 SEC-63)', () => {
  /** An `appeal_file` (copied as uploaded, no processing) in `scanning`, as completeFileUpload leaves it. */
  async function appealFile(body: Buffer) {
    const auth = await register();
    const me = await http().get('/api/v1/me').set(auth);
    const row = await prisma.file.create({
      data: {
        purpose: 'appeal_file',
        ownerUserId: me.body.id as string,
        bucket: 'private',
        objectKey: `quarantine/${crypto.randomUUID()}`,
        originalName: 'proof.pdf',
        declaredType: 'application/pdf',
        sizeBytes: BigInt(body.length),
        status: 'scanning',
      },
    });
    storage.upload(row.bucket, row.objectKey, body.length, row.declaredType, body);
    return row;
  }
  const pdf = (text: string) => Buffer.from(`%PDF-1.4
% ${text}
%%EOF
`);

  it('a clean file is copied as scanned', async () => {
    const row = await appealFile(pdf('clean'));
    expect(await sweeper.tick()).toBe(1);
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file.status).toBe('ready');
    expect(storage.get(file.bucket, file.objectKey)?.body.toString()).toContain('clean');
  });

  it('a re-upload landing between the scan and the copy is rejected, never ready unscanned', async () => {
    const row = await appealFile(pdf('clean'));
    // The presigned POST is still valid: the uploader re-posts other bytes while the scan runs.
    storage.afterNextRead = () =>
      storage.upload(row.bucket, row.objectKey, 0, 'application/pdf', pdf('UNSCANNED payload'));
    expect(await sweeper.tick()).toBe(1);
    const file = await prisma.file.findUniqueOrThrow({ where: { id: row.id } });
    expect(file.status).toBe('rejected');
    expect(file.rejectReason).toBe('t_file_rejected_unreadable');
    expect(storage.has('private', `files/${row.id}`)).toBe(false);
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);
  });

  it('a re-post after the scan is deleted once the POST has expired; open scans keep theirs', async () => {
    const row = await appealFile(pdf('clean'));
    expect(await sweeper.tick()).toBe(1);
    // Re-posted after `ready` with the still-valid form: an object nobody owns.
    storage.upload(row.bucket, row.objectKey, 0, 'application/pdf', pdf('late'));
    const waiting = await appealFile(pdf('retry later'));
    await redis.client.zadd(LATE_QUARANTINE_KEY, 0, `${waiting.bucket}${waiting.objectKey}`);

    // Not before the POST expired.
    expect(await sweeper.cleanupLateQuarantine(new Date())).toBe(0);
    expect(storage.has(row.bucket, row.objectKey)).toBe(true);

    const later = new Date(Date.now() + 12 * 60 * 1000);
    expect(await sweeper.cleanupLateQuarantine(later)).toBe(1);
    expect(storage.has(row.bucket, row.objectKey)).toBe(false);
    // Still `scanning` (e.g. waiting for a retry): its object is kept and the entry stays queued.
    expect(storage.has(waiting.bucket, waiting.objectKey)).toBe(true);
    expect(await redis.client.zscore(LATE_QUARANTINE_KEY, `${waiting.bucket}${waiting.objectKey}`)).toBe('0');
  });
});

describe('files-scan: unattached public images (security review 06 SEC-64 stop-gap)', () => {
  it('a ready avatar or portfolio image never attached within 24 h is deleted with its variants', async () => {
    const auth = await register();
    const stray = await upload(auth, await photo());
    const avatar = await upload(auth, await photo());
    const fresh = await upload(auth, await photo(), { purpose: 'portfolio_image' });
    expect(await sweeper.tick()).toBe(3);
    expect((await http().put('/api/v1/me/avatar').set(auth).send({ fileId: avatar.id })).status).toBe(200);
    const old = new Date(Date.now() - 25 * 3600 * 1000);
    await prisma.file.updateMany({ where: { id: { in: [stray.id, avatar.id] } }, data: { readyAt: old } });
    const strayReady = await prisma.file.findUniqueOrThrow({ where: { id: stray.id } });
    const strayKeys = Object.values(strayReady.variants as Record<string, string>);
    expect(strayKeys.every((k) => storage.has('public_media', k))).toBe(true);

    expect(await sweeper.cleanupUnattachedPublic()).toBe(1);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: stray.id } })).status).toBe('deleted');
    expect(strayKeys.some((k) => storage.has('public_media', k))).toBe(false);
    // The current avatar and a fresh upload (its form may still be open) are kept.
    expect((await prisma.file.findUniqueOrThrow({ where: { id: avatar.id } })).status).toBe('ready');
    expect((await prisma.file.findUniqueOrThrow({ where: { id: fresh.id } })).status).toBe('ready');
  });
});
