// QA ROADMAP 4.2.17 (independent): spec 03 acceptance criteria, rules and edge cases that the slice's own tests did
// not cover, plus "wrong role tries it" on the spec 16 AC-60/AC-61 staff catalogue. Same harness as
// gig-search.test.ts / admin-categories.test.ts (real HTTP pipeline, contract validation, PGlite + in-process Redis,
// MemoryStorage). Each test names the AC it checks; the plan is docs/06-qa/plans/03-categories-and-search.md.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SearchIndex } from '../src/modules/catalog/search-index';
import { PrismaService } from '../src/platform/db/prisma.service';
import { RedisService } from '../src/platform/redis/redis.module';
import { ObjectStorage } from '../src/platform/storage/storage';
import { createTestApp } from './app';
import { MemoryStorage } from './memory-storage';
import { makeStaff } from './test-staff';

const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
const storage = new MemoryStorage();
let app: NestExpressApplication;
let prisma: PrismaService;
let index: SearchIndex;
let writer: { id: string; auth: Record<string, string> };
let seq = 0;
const tag = Date.now().toString(36);
const next = () => `${tag}${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const ids = (res: { body: { data: { id: string }[] } }) => res.body.data.map((c) => c.id);

async function owner() {
  const n = next();
  return prisma.user.create({
    data: {
      username: `q3_${n}`,
      email: `q3${n}@example.com`,
      referralCode: `Q${n.slice(-7).toUpperCase().padStart(7, '0')}`,
      status: 'active',
      profile: { create: { fullname: 'QA Slice 3' } },
    },
  });
}

async function branch(visible = true) {
  const make = (parentId: string | null) =>
    prisma.gigCategory.create({
      data: {
        parentId,
        depth: 1,
        slug: `q3-${next()}`,
        isVisible: visible,
        translations: { create: [{ locale: 'ka', name: 'QA კატეგორია' }] },
      },
    });
  const top = await make(null);
  const sub = await make(top.id);
  const child = await make(sub.id);
  return { top, sub, child };
}
type Branch = Awaited<ReturnType<typeof branch>>;

let minute = 0;
async function gig(ownerId: string, at: Branch, ka: { title: string; description?: string }) {
  const n = next();
  minute += 1;
  const thumb = await prisma.file.create({
    data: {
      purpose: 'gig_thumbnail',
      ownerUserId: ownerId,
      bucket: 'public_media',
      objectKey: `images/${n}/large.webp`,
      originalName: 'a.png',
      declaredType: 'image/png',
      sizeBytes: 1000n,
      status: 'ready',
      readyAt: new Date(),
    },
  });
  const g = await prisma.gig.create({
    data: {
      uid: `Q${n}`.toUpperCase().slice(0, 20),
      slug: `gig-${n}`,
      ownerId,
      categoryId: at.top.id,
      subcategoryId: at.sub.id,
      childcategoryId: at.child.id,
      priceTetri: 5000n,
      deliveryDays: 3,
      revisionsAllowed: 1,
      status: 'active',
      thumbnailFileId: thumb.id,
      publishedAt: new Date(Date.UTC(2026, 1, 1, 0, minute)),
      translations: {
        create: [{ locale: 'ka', title: ka.title, description: ka.description ?? '<p>აღწერა</p>' }],
      },
    },
  });
  await index.indexGig(g.id);
  return g;
}

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  index = app.get(SearchIndex);
  await app.get(RedisService).client.flushall();
  writer = await makeStaff(app, ['catalog.write']);
});
afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('QA-KW keyword rule through HTTP (AC-19, R-S5, R-S9, EC-6)', () => {
  it('QA-KW-1: Georgian Mtavruli and Latin capitals match as lower case; no transliteration between scripts', async () => {
    const u = await owner();
    const at = await branch();
    const ge = await gig(u.id, at, { title: `ლოგოს დიზაინი ${tag}` });
    const en = await gig(u.id, at, { title: `Logo pack ${tag}` });
    const q = (text: string) =>
      http().get('/api/v1/search/gigs').query({ q: text, categoryId: at.top.id, limit: 42 });
    expect(ids(await q('ᲚᲝᲒᲝᲡ'))).toEqual([ge.id]); // Mtavruli capitals
    expect(ids(await q('LOGO'))).toEqual([en.id]);
    expect(ids(await q('logo'))).not.toContain(ge.id); // R-S9: no transliteration
  });

  it('QA-KW-2: a keyword longer than 100 characters is cut; words after the cut do not narrow the list', async () => {
    const u = await owner();
    const at = await branch();
    const g = await gig(u.id, at, { title: `ბანერი ${tag}` });
    const long = `ბანერი ${'ა'.repeat(93)} zzzzzz-not-in-any-gig`; // 100 chars end inside the run of "ა"
    expect(long.length).toBeGreaterThan(100);
    const res = await http()
      .get('/api/v1/search/gigs')
      .query({ q: long, categoryId: at.top.id, limit: 42 });
    expect(res.status).toBe(200);
    // "ა…" (93 letters) must still be a substring of the text, so nothing matches; the cut word "zzzzzz" is gone.
    expect(ids(res)).toEqual([]);
    const cut = `ბანერი ${' '.repeat(93)} zzzzzz`;
    const res2 = await http()
      .get('/api/v1/search/gigs')
      .query({ q: cut, categoryId: at.top.id, limit: 42 });
    expect(ids(res2)).toEqual([g.id]);
  });

  it('QA-KW-3: words of the HTML markup are not matched, the visible text and entities are', async () => {
    const u = await owner();
    const at = await branch();
    const g = await gig(u.id, at, {
      title: `სათაური ${tag}`,
      description: '<p><strong>ფოტო</strong> &amp; ვიდეო</p>',
    });
    const q = (text: string) =>
      http().get('/api/v1/search/gigs').query({ q: text, categoryId: at.top.id, limit: 42 });
    expect(ids(await q('ფოტო ვიდეო'))).toEqual([g.id]);
    expect(ids(await q('strong'))).toEqual([]);
  });
});

describe('QA-LIST paging and hidden categories (AC-5, AC-8, R-S6)', () => {
  it('QA-PAGE-1: 50 gigs at 42 per page → page 2 has 8, totalCount 50, no next cursor; page 3 is empty', async () => {
    const u = await owner();
    const at = await branch();
    for (let i = 0; i < 50; i += 1) await gig(u.id, at, { title: `გვერდი ${tag} ${i}` });
    const page = (n: number) =>
      http().get('/api/v1/search/gigs').query({ categoryId: at.top.id, limit: 42, page: n });
    const p1 = await page(1);
    expect(p1.body.data).toHaveLength(42);
    expect(p1.body.totalCount).toBe(50);
    const p2 = await page(2);
    expect(p2.body.data).toHaveLength(8);
    expect(p2.body.nextCursor).toBeNull();
    expect(new Set([...ids(p1), ...ids(p2)]).size).toBe(50);
    const p3 = await page(3);
    expect(p3.status).toBe(200);
    expect(p3.body.data).toEqual([]);
    expect(p3.body.totalCount).toBe(50);
  });

  it('QA-HOME-1: a hidden top category gets no home row, but its page, tree entry and search results stay (AC-5)', async () => {
    const u = await owner();
    const at = await branch(false);
    const g = await gig(u.id, at, { title: `დამალული ${tag}` });
    const home = await http().get('/api/v1/home');
    expect(home.status).toBe(200);
    expect(
      (home.body.categoryRows as { category: { id: string } }[]).map((r) => r.category.id),
    ).not.toContain(at.top.id);
    const tree = await http().get('/api/v1/categories');
    expect((tree.body.categories as { id: string }[]).map((c) => c.id)).toContain(at.top.id);
    const lookup = await http()
      .get('/api/v1/categories/lookup')
      .query({ path: `${at.top.slug}/${at.sub.slug}/${at.child.slug}` });
    expect(lookup.status).toBe(200);
    const list = await http().get('/api/v1/search/gigs').query({ categoryId: at.top.id });
    expect(ids(list)).toEqual([g.id]);
    const kw = await http()
      .get('/api/v1/search/gigs')
      .query({ q: `დამალული ${tag}` });
    expect(ids(kw)).toContain(g.id);
  });
});

describe('QA-HIRE /hire/{keyword} (AC-28, AC-29, EC-7)', () => {
  it('QA-HIRE-1: the slug check ignores case, like legacy (F-01, fixed in 4.2.18b)', async () => {
    const u = await owner();
    const slug = `qa3php${tag}`;
    await prisma.userSkill.create({
      data: { userId: u.id, name: 'PHP QA', slug, experience: 'pro' },
    });
    const exact = await http().get(`/api/v1/hire/${slug}`).query({ limit: 42 });
    expect(exact.status).toBe(200);
    expect(exact.body.data.map((c: { user: { id: string } }) => c.user.id)).toContain(u.id);
    const upper = await http().get(`/api/v1/hire/${slug.toUpperCase()}`);
    expect(upper.status).toBe(200);
    expect(upper.body.skill.slug).toBe(slug);
  });

  it('QA-HIRE-2: a Georgian skill slug in the path (percent-encoded) works', async () => {
    const u = await owner();
    const slug = `ვებ-${tag}`;
    await prisma.userSkill.create({
      data: { userId: u.id, name: `ვებ ${tag}`, slug, experience: 'pro' },
    });
    const res = await http().get(`/api/v1/hire/${encodeURIComponent(slug)}`);
    expect(res.status).toBe(200);
    expect(res.body.skill.slug).toBe(slug);
  });
});

describe('QA-SAN staff SEO text reaches the public page sanitised (spec 16 AC-60, CONVENTIONS §19)', () => {
  it('QA-SAN-1: script, event handlers and javascript: links never reach lookupCategory', async () => {
    const res = await http()
      .post('/api/v1/admin/categories')
      .set(writer.auth)
      .send({
        name: { ka: 'QA SEO', en: 'QA SEO' },
        slug: `q3-seo-${tag}`,
        contentTop: {
          ka: '<p onclick="x()">ტექსტი<script>alert(1)</script><a href="javascript:alert(1)">ბმული</a><img src="https://evil.example/a.png" onerror="x()"></p>',
          en: '<h2>Title</h2><a href="https://example.com">ok</a>',
        },
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const ka = await http()
      .get('/api/v1/categories/lookup')
      .query({ path: `q3-seo-${tag}` });
    expect(ka.status).toBe(200);
    const top = ka.body.contentTop as string;
    expect(top).toContain('ტექსტი');
    expect(top).not.toMatch(/script|onclick|onerror|javascript:|evil\.example/i);
    const en = await http()
      .get('/api/v1/categories/lookup')
      .set('Accept-Language', 'en')
      .query({ path: `q3-seo-${tag}` });
    expect(en.body.contentTop).toContain('href="https://example.com/"');
    expect(en.body.contentTop).toContain('rel=');
  });
});

describe('QA-ROLE wrong role on the staff catalogue (spec 16 AC-60, AC-61)', () => {
  const ID = '00000000-0000-4000-8000-000000000001';
  const name = { ka: 'x', en: 'x' };
  const slug = `q3-role-${tag}`;
  // Valid bodies, so the contract validator (which runs before the guards, slice 02 N-1) lets each call reach the guard.
  const ops: [method: 'get' | 'post' | 'patch' | 'delete', path: string, body?: object][] = [
    ['get', '/api/v1/admin/categories'],
    ['post', '/api/v1/admin/categories', { name, slug }],
    ['get', `/api/v1/admin/categories/${ID}`],
    ['patch', `/api/v1/admin/categories/${ID}`, { slug }],
    ['delete', `/api/v1/admin/categories/${ID}`],
    ['get', '/api/v1/admin/project-categories'],
    ['post', '/api/v1/admin/project-categories', { name, slug, gigCategoryId: ID }],
    ['get', `/api/v1/admin/project-categories/${ID}`],
    ['patch', `/api/v1/admin/project-categories/${ID}`, { slug }],
    ['delete', `/api/v1/admin/project-categories/${ID}`],
    ['get', '/api/v1/admin/skills'],
    ['post', '/api/v1/admin/skills', { name, slug, projectCategoryId: ID }],
    ['get', `/api/v1/admin/skills/${ID}`],
    ['patch', `/api/v1/admin/skills/${ID}`, { slug }],
    ['delete', `/api/v1/admin/skills/${ID}`],
  ];
  const ADMIN = { 'X-MyTask-Client': 'admin', Origin: 'http://localhost:3200' };
  const call = (
    method: (typeof ops)[number][0],
    path: string,
    headers: Record<string, string>,
    body?: object,
  ) => {
    const r = http()[method](path).set(headers);
    return body ? r.send(body) : r;
  };

  it('QA-ROLE-1: a guest and a signed-in user (Bearer) are refused on all 15 operations, nothing is written', async () => {
    const n = next();
    const reg = await http()
      .post('/api/v1/auth/register')
      .set({ 'X-MyTask-Client': 'ios' })
      .send({
        username: `q3u_${n}`,
        email: `q3u${n}@example.com`,
        fullName: 'QA User',
        password: 'Secret123',
        acceptTerms: true,
      });
    expect(reg.status).toBe(201);
    const user = {
      'X-MyTask-Client': 'ios',
      Authorization: `Bearer ${reg.body.session.accessToken as string}`,
    };
    for (const [method, path, body] of ops) {
      const guest = await call(method, path, ADMIN, body);
      expect(guest.status, `${method} ${path} guest`).toBe(401);
      const signed = await call(method, path, user, body);
      expect(signed.status, `${method} ${path} user`).toBe(401);
    }
    expect(await prisma.gigCategory.count({ where: { slug } })).toBe(0);
  });

  it('QA-ROLE-2: staff without catalog.write get 403 on all 15 operations', async () => {
    const other = await makeStaff(app, ['kyc.review']);
    for (const [method, path, body] of ops) {
      const res = await call(method, path, other.auth, body);
      expect(res.status, `${method} ${path}`).toBe(403);
    }
    expect(await prisma.gigCategory.count({ where: { slug } })).toBe(0);
  });
});
