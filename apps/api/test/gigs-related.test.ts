// listRelatedGigs (ROADMAP 4.3.5a; spec 04 AC-32, P-137, EC-13): "You may also like" = other active gigs of listable
// owners in the same sub-category (M1) or whose title/description contains the viewed title (M2, M3) or whose
// description contains the viewed description (M4); plain text, any letter case, `%` and `_` literal, the page
// language with the Georgian fallback on both sides; random order, at most 40; the viewed gig's visibility as getGig.
// Every case uses its own category chain and words of its own, so gigs of other test files never match.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { File as FileRow, FilePurpose } from '../src/generated/prisma/client';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import type { SettingId } from '../src/platform/settings/registry';
import { SettingsService } from '../src/platform/settings/settings.service';
import { ObjectStorage } from '../src/platform/storage/storage';
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
type Chain = { categoryId: string; subcategoryId: string; childCategoryId: string };

async function member() {
  seq += 1;
  const n = `${Date.now().toString(36)}${seq}`;
  const reg = await http()
    .post('/api/v1/auth/register')
    .set({ 'X-MyTask-Client': 'ios' })
    .send({
      username: `rl_${n}`,
      email: `rl${n}@example.com`,
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
      'Accept-Language': 'en',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    } as Auth,
  };
}
type Member = Awaited<ReturnType<typeof member>>;

/** What the scan pipeline leaves: public variants for images, the PDF unchanged in `public_media`. */
async function file(ownerUserId: string, purpose: FilePurpose): Promise<FileRow> {
  const id = crypto.randomUUID();
  const pdf = purpose === 'gig_document';
  const variants = pdf
    ? undefined
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
      status: 'ready',
      bucket: 'public_media',
      objectKey: pdf ? `files/${id}` : variants!.large,
      variants,
      originalName: pdf ? 'brief.pdf' : 'cover.jpg',
      declaredType: pdf ? 'application/pdf' : 'image/jpeg',
      sizeBytes: 12_345n,
      width: pdf ? null : 1000,
      height: pdf ? null : 750,
      readyAt: new Date(),
    },
  });
}

async function category(parentId: string | null, depth: number) {
  seq += 1;
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth,
      slug: `rl-${Date.now().toString(36)}-${seq}`,
      translations: {
        create: [
          { locale: 'ka', name: 'დიზაინი' },
          { locale: 'en', name: 'Design' },
        ],
      },
    },
  });
}

/** A fresh top → sub → child chain; `sub` given = a second child under that sub-category. */
async function newChain(sub?: Chain): Promise<Chain> {
  if (sub) {
    const child = await category(sub.subcategoryId, 3);
    return { ...sub, childCategoryId: child.id };
  }
  const top = await category(null, 1);
  const s = await category(top.id, 2);
  const child = await category(s.id, 3);
  return { categoryId: top.id, subcategoryId: s.id, childCategoryId: child.id };
}

/** A word no other gig has, so M2…M4 never pick up gigs of other cases or files. */
const own = () => crypto.randomUUID().slice(0, 8);

interface Texts {
  title: { ka: string; en?: string | null };
  description?: { ka: string; en?: string | null };
}

/** A gig saved through createGig by `owner` in `at`. */
async function saveGig(owner: Member, at: Chain, texts: Texts) {
  const thumb = await file(owner.userId, 'gig_thumbnail');
  const image = await file(owner.userId, 'gig_image');
  const res = await http()
    .post('/api/v1/gigs')
    .set(owner.auth)
    .send({
      title: { en: null, ...texts.title },
      description: { en: null, ...(texts.description ?? { ka: `<p>აღწერა ${own()} ტექსტი</p>` }) },
      ...at,
      price: { amount: 5000, currency: 'GEL' },
      deliveryDays: 3,
      revisionsAllowed: 2,
      thumbnailFileId: thumb.id,
      imageFileIds: [image.id],
    });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as { id: string; status: string };
}

const related = (id: string, auth: Auth = { 'Accept-Language': 'en' }) =>
  http().get(`/api/v1/gigs/${id}/related`).set(auth);
const ids = (res: request.Response) => (res.body.gigs as { id: string }[]).map((g) => g.id).sort();
const sorted = (...list: string[]) => [...list].sort();

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
const autoApprove = (on: boolean) => withSetting('S-070', 'moderation.gigs.auto_approve', on);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
});

beforeEach(async () => {
  await app.get(RedisService).client.flushall();
  // Several gigs per seller (S-001 is 1 by default).
  await withSetting('S-001', 'plans.standard.gig_limit', null);
  await autoApprove(true);
});

afterEach(async () => {
  if (touched.length) {
    await prisma.setting.deleteMany({ where: { key: { in: [...new Set(touched.splice(0))] } } });
    app.get(SettingsService).invalidate();
  }
});

afterAll(async () => {
  await app.close();
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('listRelatedGigs: the match rules (AC-32, P-137)', () => {
  it('M1: other gigs of the same sub-category, the same seller too, never the viewed gig', async () => {
    const here = await newChain();
    const sibling = await newChain(here);
    const elsewhere = await newChain();
    const seller = await member();
    const other = await member();
    const viewed = await saveGig(seller, here, { title: { ka: `ლოგოს დიზაინი ${own()}` } });
    const mine = await saveGig(seller, sibling, { title: { ka: `ბანერის დიზაინი ${own()}` } });
    const title = `ვიზიტკის დიზაინი ${own()}`;
    const theirs = await saveGig(other, here, { title: { ka: title } });
    await saveGig(other, elsewhere, { title: { ka: `სულ სხვა რამ ${own()}` } });

    const guest = await related(viewed.id);
    expect(guest.status).toBe(200);
    expect(ids(guest)).toEqual(sorted(mine.id, theirs.id));
    const card = (guest.body.gigs as { id: string }[]).find((g) => g.id === theirs.id);
    expect(card).toMatchObject({
      title,
      contentLocale: 'ka',
      price: { amount: 5000, currency: 'GEL' },
      seller: { id: other.userId },
      isFavorite: null,
    });
    const signedIn = await related(viewed.id, other.auth);
    expect(ids(signedIn)).toEqual(sorted(mine.id, theirs.id));
    expect(signedIn.body.gigs[0].isFavorite).toBe(false);
  });

  it('M2–M4: titles and plain descriptions that contain the viewed texts, in any letter case', async () => {
    const t = `Zx${own()}`;
    const here = await newChain();
    const there = await newChain();
    const m = await member();
    const viewed = await saveGig(m, here, {
      title: { ka: `${t} Logo ლოგო` },
      description: { ka: `<p>ჩემი <b>${t}</b> ნამუშევარი</p>` },
    });
    // M2: the title contains the viewed title (other letter case).
    const m2 = await saveGig(m, there, {
      title: { ka: `საუკეთესო ${t.toUpperCase()} logo ლოგო აქ` },
    });
    // M3: the description contains the viewed title once the formatting is removed.
    const m3 = await saveGig(m, there, {
      title: { ka: `სხვა სათაური ${own()}` },
      description: { ka: `<p>ვაკეთებ <strong>${t.toLowerCase()} LOGO</strong> ლოგო ხშირად</p>` },
    });
    // M4: the description contains the viewed description (plain text "ჩემი Zx… ნამუშევარი").
    const m4 = await saveGig(m, there, {
      title: { ka: `მესამე სათაური ${own()}` },
      description: { ka: `<p>ეს არის ჩემი ${t} ნამუშევარი, ნახეთ</p>` },
    });
    // Only part of the viewed title: no match.
    await saveGig(m, there, { title: { ka: `${t} ლოგო` } });

    for (const lang of ['ka', 'en']) {
      const res = await related(viewed.id, { 'Accept-Language': lang });
      expect(res.status).toBe(200);
      expect(ids(res)).toEqual(sorted(m2.id, m3.id, m4.id));
    }
  });

  it('treats % and _ as ordinary characters and decodes entities in descriptions', async () => {
    const t = `P${own()}`;
    const here = await newChain();
    const there = await newChain();
    const m = await member();
    const viewed = await saveGig(m, here, {
      title: { ka: `ფასდაკლება ${t}`, en: `100%_off ${t} sale` },
      description: { ka: `<p>აღწერა ${t} ქართულად</p>`, en: `<p>Tom &amp; Jerry ${t}</p>` },
    });
    const literal = await saveGig(m, there, {
      title: { ka: `პირველი ${own()}`, en: `Get 100%_off ${t} sale now` },
    });
    // Would match if % and _ were LIKE wildcards ("100" … "-" "off …").
    await saveGig(m, there, { title: { ka: `მეორე ${own()}`, en: `100 big-off ${t} sale` } });
    const entity = await saveGig(m, there, {
      title: { ka: `მესამე ${own()}`, en: 'Cartoon style' },
      description: {
        ka: `<p>მულტფილმის სტილი ${own()}</p>`,
        en: `<p>Drawn like Tom &amp; <em>Jerry</em> ${t} for you</p>`,
      },
    });

    const res = await related(viewed.id, { 'Accept-Language': 'en' });
    expect(ids(res)).toEqual(sorted(literal.id, entity.id));
  });

  it('compares the page language with the Georgian fallback on both sides', async () => {
    const t = `Q${own()}`;
    const here = await newChain();
    const there = await newChain();
    const m = await member();
    const viewed = await saveGig(m, here, {
      title: { ka: `მთის ${t} ფოტოები`, en: `Mountain ${t} photos` },
    });
    // No English title: on English pages its Georgian title is compared with the viewed English one.
    const kaOnly = await saveGig(m, there, { title: { ka: `ჩემი მთის ${t} ფოტოები ალბომი` } });
    const enMatch = await saveGig(m, there, {
      title: { ka: `ზღვის სურათები ${own()}`, en: `Best Mountain ${t} Photos ever` },
    });

    expect(ids(await related(viewed.id, { 'Accept-Language': 'ka' }))).toEqual([kaOnly.id]);
    expect(ids(await related(viewed.id, { 'Accept-Language': 'en' }))).toEqual([enMatch.id]);
  });

  it('returns at most 40 gigs', async () => {
    const here = await newChain();
    const m = await member();
    const viewed = await saveGig(m, here, { title: { ka: `სათაური ${own()}` } });
    for (let i = 0; i < 41; i += 1) await saveGig(m, here, { title: { ka: `სათაური ${own()}` } });
    const res = await related(viewed.id);
    expect(res.status).toBe(200);
    expect(res.body.gigs).toHaveLength(40);
    expect(new Set(ids(res)).size).toBe(40);
  }, 60_000);
});

describe('listRelatedGigs: who is listed and who may ask (AC-28, P-29, EC-13)', () => {
  it('leaves out gigs that are not active or whose owner may not be listed; empty when none match', async () => {
    const here = await newChain();
    const viewer = await member();
    const viewed = await saveGig(viewer, here, { title: { ka: `მარტო ვარ აქ ${own()}` } });

    const restricted = await member();
    await saveGig(restricted, here, { title: { ka: `შეზღუდული ${own()}` } });
    await prisma.user.update({ where: { id: restricted.userId }, data: { isRestricted: true } });
    const banned = await member();
    await saveGig(banned, here, { title: { ka: `დაბლოკილი ${own()}` } });
    await prisma.user.update({ where: { id: banned.userId }, data: { status: 'banned' } });
    const other = await member();
    const gone = await saveGig(other, here, { title: { ka: `წაშლილი ${own()}` } });
    expect((await http().delete(`/api/v1/gigs/${gone.id}`).set(other.auth)).status).toBe(204);
    await autoApprove(false);
    const pending = await saveGig(other, here, { title: { ka: `მოლოდინში ${own()}` } });
    expect(pending.status).toBe('pending');

    const res = await related(viewed.id);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ gigs: [] });
  });

  it('applies the visibility of getGig to the viewed gig', async () => {
    const here = await newChain();
    const m = await member();
    const active = await saveGig(m, here, { title: { ka: `აქტიური ${own()}` } });
    await autoApprove(false);
    const pending = await saveGig(m, here, { title: { ka: `მოლოდინში ${own()}` } });
    const other = await member();

    expect((await related(pending.id)).status).toBe(404);
    expect((await related(pending.id, other.auth)).status).toBe(404);
    const mine = await related(pending.id, m.auth);
    expect(mine.status).toBe(200);
    expect(ids(mine)).toEqual([active.id]);

    expect((await http().delete(`/api/v1/gigs/${pending.id}`).set(m.auth)).status).toBe(204);
    expect((await related(pending.id, m.auth)).status).toBe(404);
    expect((await related(crypto.randomUUID())).status).toBe(404);
  });
});
