// createGig (ROADMAP 4.3.3b; spec 04 AC-3…AC-16, AC-19, AC-33, EC-8, R-G3): the whole wizard in one request, all
// field errors at once, the caller's own ready files, the plan limit re-checked under a row lock (two parallel
// submits), S-070 → pending + EV-19 or active, the search document in the same transaction, files marked attached
// (deleteFile 409, the 24 h cleanup keeps them).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { renderEmail } from '../src/platform/mail/templates';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
import { FilesScanSweeper } from '../src/worker/files-scan.sweeper';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';

let app: NestExpressApplication;
let prisma: PrismaService;
const storage = new MemoryStorage();
let seq = 0;
const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const http = () => request(app.getHttpServer());
type Auth = Record<string, string>;
let chain: { categoryId: string; subcategoryId: string; childCategoryId: string };

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `gc_${n}`,
      email: `gc${n}@example.com`,
      fullName: 'Nino Beridze',
      password: 'Secret123',
      acceptTerms: true,
    });
  expect(reg.status).toBe(201);
  const userId = reg.body.session.user.id as string;
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'active', emailVerifiedAt: new Date() },
  });
  return {
    userId,
    auth: {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}

/** What the scan pipeline leaves: public variants for images, the PDF unchanged in `public_media`. */
async function file(
  ownerUserId: string,
  purpose: FilePurpose,
  status: 'ready' | 'scanning' = 'ready',
): Promise<FileRow> {
  seq += 1;
  const id = crypto.randomUUID();
  const pdf = purpose === 'gig_document';
  const variants = pdf
    ? null
    : {
        thumb: `images/${id}/thumb.webp`,
        medium: `images/${id}/medium.webp`,
        large: `images/${id}/large.webp`,
      };
  return prisma.file.create({
    data: {
      id,
      purpose,
      ownerUserId,
      status,
      bucket: 'public_media',
      objectKey: pdf ? `files/${id}` : variants!.large,
      variants: variants ?? undefined,
      originalName: pdf ? 'brief.pdf' : 'cover.jpg',
      declaredType: pdf ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 12_345n,
      width: pdf ? null : 1000,
      height: pdf ? null : 750,
      readyAt: status === 'ready' ? new Date() : null,
    },
  });
}

async function category(parentId: string | null, depth: number) {
  seq += 1;
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth,
      slug: `gc-${Date.now().toString(36)}-${seq}`,
      translations: { create: [{ locale: 'ka', name: 'დიზაინი' }] },
    },
  });
}

/** A valid wizard submit with fresh files of `userId`. */
async function wizard(userId: string, extra: Record<string, unknown> = {}) {
  const thumb = await file(userId, 'gig_thumbnail');
  const a = await file(userId, 'gig_image');
  const b = await file(userId, 'gig_image');
  return {
    title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
    description: { ka: '<p><strong>პროფესიონალური</strong> ლოგოს დიზაინი</p>', en: null },
    ...chain,
    price: { amount: 5000, currency: 'GEL' },
    deliveryDays: 3,
    revisionsAllowed: 2,
    thumbnailFileId: thumb.id,
    imageFileIds: [b.id, a.id],
    ...extra,
  };
}

const create = (auth: Auth, body: object) =>
  http()
    .post('/api/v1/gigs')
    .set({ 'Accept-Language': 'en', ...auth })
    .send(body);

const touched: string[] = [];
async function withSetting(registerId: SettingId, key: string, value: unknown) {
  touched.push(key);
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId, value: value as never, currentVersion: 1 },
    update: { value: value as never },
  });
  app.get(SettingsService).invalidate();
}

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  const top = await category(null, 1);
  const sub = await category(top.id, 2);
  const child = await category(sub.id, 3);
  chain = { categoryId: top.id, subcategoryId: sub.id, childCategoryId: child.id };
});

beforeEach(async () => {
  await app.get(RedisService).client.flushall();
});

afterEach(async () => {
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: touched.splice(0) } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app.close();
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('createGig: saved gig (AC-16, AC-33)', () => {
  it('saves a pending gig while S-070 is OFF, with EV-19 to S-100 and its search document', async () => {
    const { userId, auth } = await member();
    const body = await wizard(userId, {
      upgrades: [
        { title: 'სწრაფი მიწოდება', price: { amount: 2000, currency: 'GEL' }, extraDays: 0 },
      ],
      faqs: [{ question: 'რამდენი ვარიანტი?', answer: 'სამი ვარიანტი.' }],
      seo: { title: 'Logo design', description: 'Professional logo design' },
    });
    const res = await create(auth, body);
    expect(res.status).toBe(201);
    const uid = res.body.uid as string;
    expect(uid).toMatch(/^[0-9A-F]{20}$/);
    expect(res.body).toMatchObject({
      slug: `logo-dizaini-photoshop-shi-${uid}`,
      status: 'pending',
      rejectionReason: null,
      title: { ka: 'Logo დიზაინი Photoshop-ში', en: null },
      description: { ka: '<p><strong>პროფესიონალური</strong> ლოგოს დიზაინი</p>', en: null },
      ...chain,
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      upgrades: [
        { title: 'სწრაფი მიწოდება', price: { amount: 2000, currency: 'GEL' }, extraDays: 0 },
      ],
      faqs: [{ question: 'რამდენი ვარიანტი?', answer: 'სამი ვარიანტი.' }],
      thumbnail: {
        fileId: body.thumbnailFileId,
        large: `${MEDIA}/images/${body.thumbnailFileId}/large.webp`,
      },
      documents: [],
      seo: { title: 'Logo design', description: 'Professional logo design' },
      ordersInQueueCount: 0,
      publishedAt: null,
    });
    // Gallery order as sent (AC-23).
    expect(res.body.images.map((i: { fileId: string }) => i.fileId)).toEqual(body.imageFileIds);

    const gig = await prisma.gig.findUniqueOrThrow({
      where: { id: res.body.id },
      include: { translations: true },
    });
    expect(gig).toMatchObject({ ownerId: userId, status: 'pending', publishedAt: null });
    expect(gig.submittedAt).toBeInstanceOf(Date);
    expect(gig.translations.map((t) => t.locale)).toEqual(['ka']);

    const files = await prisma.file.findMany({
      where: { id: { in: [body.thumbnailFileId, ...body.imageFileIds] } },
    });
    expect(files.every((f) => f.attachedAt !== null)).toBe(true);

    const doc = await prisma.searchDocument.findUniqueOrThrow({
      where: { entityType_entityId: { entityType: 'gig', entityId: gig.id } },
    });
    expect(doc).toMatchObject({ status: 'pending', categoryId: chain.categoryId });

    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: gig.id, eventType: 'EV-19' },
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.payload).toMatchObject({
      to: await app.get(SettingsService).get('S-100'),
      params: { title: 'Logo დიზაინი Photoshop-ში' },
    });
  });

  it('publishes at once while S-070 is ON, with no EV-19', async () => {
    await withSetting('S-070', 'moderation.gigs.auto_approve', true);
    const { userId, auth } = await member();
    const res = await create(auth, await wizard(userId));
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('active');
    expect(Date.parse(res.body.publishedAt)).not.toBeNaN();
    const gig = await prisma.gig.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(gig.submittedAt).toBeNull();
    expect(
      await prisma.outboxEvent.count({ where: { aggregateId: gig.id, eventType: 'EV-19' } }),
    ).toBe(0);
  });

  it('sanitises the description and keeps the English fields one by one', async () => {
    const { userId, auth } = await member();
    const res = await create(
      auth,
      await wizard(userId, {
        description: {
          ka: '<p onclick="x()"><b>ლოგო</b> დიზაინი<script>alert(1)</script></p>',
          en: '<p><em>Professional</em> logo design</p>',
        },
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.description.ka).not.toMatch(/script|onclick/);
    expect(res.body.description.ka).toContain('ლოგო');
    // English description without an English title: the title stays empty (readers fall back to Georgian).
    expect(res.body.title).toEqual({ ka: 'Logo დიზაინი Photoshop-ში', en: null });
    expect(res.body.description.en).toBe('<p><em>Professional</em> logo design</p>');
    const en = await prisma.gigTranslation.findUniqueOrThrow({
      where: { gigId_locale: { gigId: res.body.id, locale: 'en' } },
    });
    expect(en.title).toBe('');
  });

  it('attaches documents while S-080 is ON, as public download links (R-G11)', async () => {
    const { userId, auth } = await member();
    const pdf = await file(userId, 'gig_document');
    const res = await create(auth, await wizard(userId, { documentFileIds: [pdf.id] }));
    expect(res.status).toBe(201);
    expect(res.body.documents).toEqual([
      { fileId: pdf.id, fileName: 'brief.pdf', sizeBytes: 12345, url: `${MEDIA}/files/${pdf.id}` },
    ]);
  });

  it('refuses documents while S-080 is OFF (403 FEATURE_DISABLED, EC-8)', async () => {
    await withSetting('S-080', 'media.gig.documents_enabled', false);
    const { userId, auth } = await member();
    const pdf = await file(userId, 'gig_document');
    const res = await create(auth, await wizard(userId, { documentFileIds: [pdf.id] }));
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ code: 'FEATURE_DISABLED', details: { settingId: 'S-080' } });
    expect(await prisma.gig.count({ where: { ownerId: userId } })).toBe(0);
  });
});

describe('createGig: validation (AC-4…AC-15, AC-19)', () => {
  it('returns every invalid field at once and saves nothing', async () => {
    await withSetting('S-077', 'media.gig.max_images', 1);
    const { userId, auth } = await member();
    const top = await category(null, 1);
    const res = await create(
      auth,
      await wizard(userId, {
        title: { ka: 'Logo design', en: 'ლოგოს დიზაინი' },
        description: { ka: '<p>ფასი&#58; 50₾ და მეტი</p>', en: '<p>short</p>' },
        subcategoryId: top.id,
        price: { amount: 99, currency: 'GEL' },
        revisionsAllowed: 11,
        upgrades: [
          { title: '   ', price: { amount: 1_000_000_000, currency: 'GEL' }, extraDays: 1 },
        ],
        faqs: [{ question: 'კითხვა?', answer: '  ' }],
        seo: { title: '  ', description: 'Only a description' },
      }),
    );
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
    expect(res.body.details.messageKey).toBe('t_toast_form_validation_error');
    const byField = Object.fromEntries(
      (res.body.details.fields as { field: string; message: string }[]).map((f) => [f.field, f]),
    );
    expect(byField).toMatchObject({
      'title.ka': {
        code: 'georgian_letter_required',
        messageKey: 't_validator_georgian_letter_required',
      },
      'title.en': { code: 'georgian_letters_not_allowed', messageKey: 't_validator_english_only' },
      'description.ka': {
        code: 'georgian_field_characters',
        refusedCharacters: [':', '₾'],
        params: { chars: ': ₾' },
      },
      'description.en': { code: 'too_short', params: { min: 10 } },
      subcategoryId: { code: 'not_allowed' },
      childCategoryId: { code: 'not_allowed' },
      price: { messageKey: 't_price_min', params: { min: 1 } },
      revisionsAllowed: { messageKey: 't_validator_revisions_range', params: { max: 10 } },
      'upgrades[0].title': { code: 'required' },
      'upgrades[0].price': { messageKey: 't_validator_max', params: { max: 10 } },
      'faqs[0].answer': { code: 'required' },
      seo: { messageKey: 't_seo_both_fields_required' },
      imageFileIds: { code: 'max_items', params: { max: 1 } },
    });
    expect(byField.categoryId).toBeUndefined();
    expect(byField['title.ka']?.message).toBe(
      'Must contain Georgian text. Latin words are allowed alongside it.',
    );
    expect(await prisma.gig.count({ where: { ownerId: userId } })).toBe(0);
  });

  it('counts lengths on the trimmed text without formatting', async () => {
    const { userId, auth } = await member();
    const res = await create(
      auth,
      await wizard(userId, {
        title: { ka: '  ლო  ', en: null },
        description: { ka: '<p><b>ლოგო</b></p>', en: null },
      }),
    );
    expect(res.status).toBe(400);
    expect(res.body.details.fields).toEqual([
      expect.objectContaining({ field: 'title.ka', code: 'too_short', params: { min: 3 } }),
      expect.objectContaining({ field: 'description.ka', code: 'too_short', params: { min: 10 } }),
    ]);
  });

  it('leaves blank optional fields out: SEO with both blank, an English title of spaces', async () => {
    const { userId, auth } = await member();
    const res = await create(
      auth,
      await wizard(userId, {
        title: { ka: 'ლოგოს დიზაინი', en: '     ' },
        seo: { title: ' ', description: ' ' },
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.title.en).toBeNull();
    expect(res.body.seo).toBeNull();
  });
});

describe('createGig: files (AC-14)', () => {
  it('takes only the caller’s own ready files of the right purpose, each on one gig', async () => {
    const { userId, auth } = await member();
    const other = await member();
    const cases: [Record<string, unknown>, number, string][] = [
      [
        { thumbnailFileId: (await file(other.userId, 'gig_thumbnail')).id },
        422,
        'FILE_PURPOSE_MISMATCH',
      ],
      [{ thumbnailFileId: (await file(userId, 'gig_image')).id }, 422, 'FILE_PURPOSE_MISMATCH'],
      [
        { imageFileIds: [(await file(userId, 'portfolio_image')).id] },
        422,
        'FILE_PURPOSE_MISMATCH',
      ],
      [{ imageFileIds: [(await file(userId, 'gig_image', 'scanning')).id] }, 422, 'FILE_NOT_READY'],
      [{ imageFileIds: [crypto.randomUUID()] }, 422, 'FILE_PURPOSE_MISMATCH'],
    ];
    for (const [extra, status, code] of cases) {
      const res = await create(auth, await wizard(userId, extra));
      expect(res.status, code).toBe(status);
      expect(res.body.code).toBe(code);
    }
    expect(await prisma.gig.count({ where: { ownerId: userId } })).toBe(0);

    await withSetting('S-001', 'plans.standard.gig_limit', 5);
    const first = await create(auth, await wizard(userId));
    expect(first.status).toBe(201);
    const reused = await create(
      auth,
      await wizard(userId, { imageFileIds: [first.body.images[0].fileId] }),
    );
    expect(reused.status).toBe(422);
    expect(reused.body.code).toBe('FILE_PURPOSE_MISMATCH');
  });

  it('keeps attached files: deleteFile answers 409 and the 24 h cleanup skips them', async () => {
    const { userId, auth } = await member();
    const body = await wizard(userId);
    expect((await create(auth, body)).status).toBe(201);
    const stray = await file(userId, 'gig_image');
    const old = new Date(Date.now() - 25 * 3600 * 1000);
    await prisma.file.updateMany({
      where: { id: { in: [stray.id, body.thumbnailFileId, ...body.imageFileIds] } },
      data: { readyAt: old },
    });
    const del = await http().delete(`/api/v1/files/${body.imageFileIds[0]}`).set(auth);
    expect(del.status).toBe(409);

    const sweeper = new FilesScanSweeper(prisma, app.get(RedisService), storage, {} as never);
    await sweeper.cleanupUnattachedPublic();
    const after = await prisma.file.findMany({
      where: { id: { in: [stray.id, body.thumbnailFileId, ...body.imageFileIds] } },
    });
    const status = Object.fromEntries(after.map((f) => [f.id, f.status]));
    expect(status[stray.id]).toBe('deleted');
    expect([body.thumbnailFileId, ...body.imageFileIds].map((id) => status[id])).toEqual([
      'ready',
      'ready',
      'ready',
    ]);
  });
});

describe('createGig: plan limit and access (AC-1, AC-3, R-G3)', () => {
  it('refuses a gig over S-001 with 422 PLAN_LIMIT_REACHED; a deleted gig frees the slot (EC-1)', async () => {
    const { userId, auth } = await member();
    const first = await create(auth, await wizard(userId));
    expect(first.status).toBe(201);
    const second = await create(auth, await wizard(userId));
    expect(second.status).toBe(422);
    expect(second.body).toMatchObject({
      code: 'PLAN_LIMIT_REACHED',
      details: { limit: 1, settingId: 'S-001', messageKey: 't_plan_gig_limit_reached' },
    });
    expect(second.body.message).toBe(
      'Your plan allows up to 1 gigs. Upgrade to Premium to create more.',
    );

    await prisma.gig.update({
      where: { id: first.body.id },
      data: { status: 'deleted', deletedAt: new Date(), deletedBy: 'owner' },
    });
    expect((await create(auth, await wizard(userId))).status).toBe(201);
  });

  it('lets only one of two simultaneous submits through (row lock)', async () => {
    const { userId, auth } = await member();
    const [a, b] = await Promise.all([wizard(userId), wizard(userId)]);
    const results = await Promise.all([create(auth, a), create(auth, b)]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 422]);
    expect(await prisma.gig.count({ where: { ownerId: userId } })).toBe(1);
    // The refused submit left its files unattached (rolled back with the transaction).
    const loser = results.find((r) => r.status === 422) === results[0] ? a : b;
    const files = await prisma.file.findMany({ where: { id: { in: loser.imageFileIds } } });
    expect(files.every((f) => f.attachedAt === null)).toBe(true);
  });

  it('sends guests to login and refuses restricted users', async () => {
    const { userId, auth } = await member();
    const body = await wizard(userId);
    // A mobile client (no cookie, so no CSRF check) with a valid body: only the missing token decides.
    const guest = await http().post('/api/v1/gigs').set({ 'X-MyTask-Client': 'ios' }).send(body);
    expect(guest.status).toBe(401);
    await prisma.user.update({ where: { id: userId }, data: { isRestricted: true } });
    const res = await create(auth, body);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_RESTRICTED');
  });
});

describe('EV-19 Admin/PendingGig email', () => {
  it('renders the legacy texts with a link to the admin gig queue', () => {
    const mail = renderEmail({
      event: 'EV-19',
      locale: 'en',
      username: 'admin',
      email: 'admin@example.com',
      appUrl: 'https://mytask.ge',
      adminUrl: 'https://admin.mytask.ge/',
      params: { title: 'Logo' },
    });
    expect(mail.subject).toBe('New gig pending approval');
    expect(mail.text).toContain('Hi admin!');
    expect(mail.text).toContain('https://admin.mytask.ge/gigs');
  });
});
