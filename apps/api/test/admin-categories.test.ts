// Staff gig category CRUD (ROADMAP 4.2.7b; spec 16 AC-60, spec 03 AC-5/EC-2, spec 17 AC-10/EC-3): adminListCategories,
// adminCreateCategory, adminGetCategory, adminUpdateCategory, adminDeleteCategory. Responses are validated against
// openapi.yaml by the test app. Other test files leave categories behind, so each test looks only at its own rows.
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
let staff: { id: string; auth: { Authorization: string } };
let seq = 0;
const tag = Date.now().toString(36);
const slug = (name = 'c') => `a-${tag}-${name}-${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const URL_ = '/api/v1/admin/categories';

type Category = {
  id: string;
  parentId: string | null;
  depth: number;
  slug: string;
  name: { ka: string; en: string | null };
  description: { ka: string; en: string | null } | null;
  contentTop: { ka: string; en: string | null } | null;
  contentBottom: { ka: string; en: string | null } | null;
  icon: { fileId: string } | null;
  image: { fileId: string } | null;
  isVisibleOnHome: boolean;
  position: number;
  gigCount: number;
  childCount: number;
  projectCategoryCount: number;
  previousSlugs: string[];
  updatedAt: string;
};

async function create(body: Record<string, unknown>, auth = staff.auth) {
  return http()
    .post(URL_)
    .set(auth)
    .send({ name: { ka: 'კატეგორია', en: 'Category' }, slug: slug(), ...body });
}
async function created(body: Record<string, unknown> = {}): Promise<Category> {
  const res = await create(body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as Category;
}
const update = (id: string, body: Record<string, unknown>) =>
  http().patch(`${URL_}/${id}`).set(staff.auth).send(body);

async function branch() {
  const top = await created();
  const sub = await created({ parentId: top.id });
  const child = await created({ parentId: sub.id });
  return { top, sub, child };
}

async function categoryImage(ownerStaffId: string, status: 'ready' | 'pending' = 'ready') {
  const id = crypto.randomUUID();
  return prisma.file.create({
    data: {
      id,
      purpose: 'category_image',
      ownerStaffId,
      bucket: 'public_media',
      objectKey: `images/${id}/large.webp`,
      originalName: 'icon.png',
      declaredType: 'image/png',
      sizeBytes: 100n,
      status,
      readyAt: status === 'ready' ? new Date() : null,
      width: 64,
      height: 64,
      variants: {
        thumb: `images/${id}/thumb.webp`,
        medium: `images/${id}/medium.webp`,
        large: `images/${id}/large.webp`,
      },
    },
  });
}

async function gigIn(at: { top: Category; sub: Category; child: Category }) {
  const n = `${tag}${(seq += 1)}`;
  const owner = await prisma.user.create({
    data: {
      username: `ac_${n}`,
      email: `ac${n}@example.com`,
      referralCode: `A${n.slice(-7).toUpperCase().padStart(7, '0')}`,
      status: 'active',
      profile: { create: { fullname: 'Category Seller' } },
    },
  });
  const thumb = await prisma.file.create({
    data: {
      purpose: 'gig_thumbnail',
      ownerUserId: owner.id,
      bucket: 'public_media',
      objectKey: `images/${n}/large.webp`,
      originalName: 'a.png',
      declaredType: 'image/png',
      sizeBytes: 1000n,
      status: 'ready',
      readyAt: new Date(),
    },
  });
  return prisma.gig.create({
    data: {
      uid: `AC${n}`.toUpperCase().slice(0, 20),
      slug: `gig-${n}`,
      ownerId: owner.id,
      categoryId: at.top.id,
      subcategoryId: at.sub.id,
      childcategoryId: at.child.id,
      priceTetri: 5000n,
      deliveryDays: 3,
      revisionsAllowed: 1,
      status: 'active',
      thumbnailFileId: thumb.id,
      publishedAt: new Date(),
      translations: {
        create: [{ locale: 'ka', title: `განცხადება ${n}`, description: '<p>ა</p>' }],
      },
    },
  });
}

const tree = async (): Promise<string> =>
  JSON.stringify((await http().get('/api/v1/categories')).body);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  staff = await makeStaff(app, ['catalog.write']);
});
beforeEach(async () => {
  await prisma.bannedIp.deleteMany();
});
afterAll(async () => {
  await app?.close();
  delete process.env.STAFF_BODY_TOKENS_ENABLED;
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
});

describe('admin categories: access', () => {
  it('needs a staff session with catalog.write', async () => {
    expect((await http().get(URL_)).status).toBe(401);
    const other = await makeStaff(app, ['content.write']);
    expect((await http().get(URL_).set(other.auth)).status).toBe(403);
    expect((await create({}, other.auth)).status).toBe(403);
  });
});

describe('adminCreateCategory (spec 16 AC-60)', () => {
  it('saves every field, sanitises the SEO texts, audits and shows at once in the public tree', async () => {
    const before = await tree();
    const s = slug('full');
    const res = await create({
      slug: s,
      name: { ka: '  დიზაინი ', en: 'Design' },
      description: { ka: 'აღწერა', en: 'About' },
      contentTop: {
        ka: '<h2 onclick="x()">სათაური</h2><script>alert(1)</script><a href="javascript:alert(1)">ბმული</a>',
        en: `<p>Top <img src="https://evil.example/a.png"><img src="${MEDIA}/a.png"></p>`,
      },
      contentBottom: { ka: '<p> </p>', en: null },
      isVisibleOnHome: false,
      position: 7,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const c = res.body as Category;
    expect(c).toMatchObject({
      parentId: null,
      depth: 1,
      slug: s,
      name: { ka: 'დიზაინი', en: 'Design' },
      description: { ka: 'აღწერა', en: 'About' },
      contentTop: {
        ka: '<h2>სათაური</h2>ბმული',
        en: `<p>Top <img src="${MEDIA}/a.png" /></p>`,
      },
      contentBottom: null,
      icon: null,
      image: null,
      isVisibleOnHome: false,
      position: 7,
      gigCount: 0,
      childCount: 0,
      projectCategoryCount: 0,
      previousSlugs: [],
    });
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'category.create', targetId: c.id },
    });
    expect(audit).toMatchObject({
      actorStaffId: staff.id,
      permissionCode: 'catalog.write',
      targetType: 'gig_category',
    });
    expect(before).not.toContain(c.id);
    expect(await tree()).toContain(c.id);
  });

  it('puts a new category last among its siblings, visible on home by default, English optional', async () => {
    const top = await created();
    const a = await created({ parentId: top.id });
    const b = await created({ parentId: top.id, name: { ka: 'მხოლოდ ქართული', en: null } });
    expect(b.position).toBe(a.position + 1);
    expect(b).toMatchObject({ depth: 2, isVisibleOnHome: true, name: { en: null } });
    const row = await prisma.gigCategoryTranslation.findMany({ where: { categoryId: b.id } });
    expect(row.map((t) => t.locale)).toEqual(['ka']);
  });

  it('allows 3 levels: a parent of depth 3 → 422, an unknown parent → 404', async () => {
    const { child } = await branch();
    expect(child.depth).toBe(3);
    const deep = await create({ parentId: child.id });
    expect(deep.status).toBe(422);
    expect(deep.body).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      details: { messageKey: 't_category_max_depth' },
    });
    expect((await create({ parentId: crypto.randomUUID() })).status).toBe(404);
  });

  it('refuses a slug taken at the same level with 409 DUPLICATE (slug); other levels may reuse it', async () => {
    const top = await created();
    const taken = await create({ slug: top.slug });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'DUPLICATE', details: { field: 'slug' } });
    expect((await create({ parentId: top.id, slug: top.slug })).status).toBe(201);
  });

  it('refuses a blank name and English texts without an English name (400)', async () => {
    const blank = await create({ name: { ka: '   ', en: null } });
    expect(blank.status).toBe(400);
    expect(blank.body.details.fields[0]).toMatchObject({ field: 'name.ka', code: 'required' });
    const noName = await create({
      name: { ka: 'სახელი', en: null },
      description: { ka: 'ა', en: 'English only' },
    });
    expect(noName.status).toBe(400);
    expect(noName.body.details.fields[0]).toMatchObject({ field: 'name.en' });
  });

  it('takes a ready own category_image as icon and image of a top-level category only', async () => {
    const icon = await categoryImage(staff.id);
    const image = await categoryImage(staff.id);
    const c = await created({ iconFileId: icon.id, imageFileId: image.id });
    expect(c.icon).toMatchObject({
      fileId: icon.id,
      large: `${MEDIA}/images/${icon.id}/large.webp`,
    });
    expect(c.image).toMatchObject({ fileId: image.id });
    const marked = await prisma.file.findUniqueOrThrow({ where: { id: icon.id } });
    expect(marked.attachedAt).not.toBeNull();

    const sub = await create({ parentId: c.id, iconFileId: (await categoryImage(staff.id)).id });
    expect(sub.status).toBe(400);
    expect(sub.body.details.fields[0]).toMatchObject({
      field: 'iconFileId',
      code: 'top_level_only',
    });
    expect(sub.body.details.messageKey).toBe('t_category_images_top_level_only');

    const pending = await create({ imageFileId: (await categoryImage(staff.id, 'pending')).id });
    expect(pending.body.details.fields[0]).toMatchObject({
      field: 'imageFileId',
      code: 'file_not_ready',
    });
    const other = await makeStaff(app, ['catalog.write']);
    const foreign = await create({ iconFileId: (await categoryImage(other.id)).id });
    expect(foreign.body.details.fields[0]).toMatchObject({ code: 'file_not_found' });
    const used = await create({ iconFileId: icon.id });
    expect(used.body.details.fields[0]).toMatchObject({ code: 'file_not_found' });
  });
});

describe('adminUpdateCategory (spec 16 AC-60, spec 17 AC-10, EC-3)', () => {
  it('records the old slug, blocks it for others at that level, and a change back removes the row', async () => {
    const { top, sub } = await branch();
    const first = top.slug;
    const second = slug('renamed');
    const res = await update(top.id, { slug: second });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({ slug: second, previousSlugs: [first] });

    const third = slug('again');
    expect((await update(top.id, { slug: third })).body.previousSlugs).toEqual([first, second]);

    // The old slug cannot be given to another top-level category while it redirects; a sub-category may use it.
    const stranger = await created();
    const taken = await update(stranger.id, { slug: first });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'DUPLICATE', details: { field: 'slug' } });
    expect((await create({ slug: second })).status).toBe(409);
    expect((await update(sub.id, { slug: first })).status).toBe(200);

    const back = await update(top.id, { slug: first });
    expect(back.body).toMatchObject({ slug: first, previousSlugs: [second, third] });
    const lookup = await http().get('/api/v1/categories/lookup').query({ path: first });
    expect(lookup.status).toBe(200);
    expect(lookup.body.id).toBe(top.id);
  });

  it('changes only the fields sent, removes the English row with the English name, audits before/after', async () => {
    const c = await created({
      description: { ka: 'ქართ.', en: 'Eng.' },
      contentTop: { ka: '<p>ზედა</p>', en: '<p>Top</p>' },
    });
    const moved = await update(c.id, { position: 3, isVisibleOnHome: false });
    expect(moved.body).toMatchObject({
      position: 3,
      isVisibleOnHome: false,
      name: c.name,
      description: c.description,
      contentTop: c.contentTop,
    });
    const kaOnly = await update(c.id, {
      name: { ka: 'ახალი', en: null },
      description: { ka: 'ქართ.', en: null },
      contentTop: null,
    });
    expect(kaOnly.status, JSON.stringify(kaOnly.body)).toBe(200);
    expect(kaOnly.body).toMatchObject({
      name: { ka: 'ახალი', en: null },
      description: { ka: 'ქართ.', en: null },
      contentTop: null,
    });
    expect(kaOnly.body.updatedAt >= c.updatedAt).toBe(true);
    const rows = await prisma.gigCategoryTranslation.findMany({ where: { categoryId: c.id } });
    expect(rows.map((r) => r.locale)).toEqual(['ka']);
    const audits = await prisma.auditLog.findMany({
      where: { action: 'category.update', targetId: c.id },
      orderBy: { id: 'asc' },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]!.before).toMatchObject({ position: c.position, isVisibleOnHome: true });
    expect(audits[0]!.after).toMatchObject({ position: 3, isVisibleOnHome: false });
  });

  it('a new name shows in the public tree at once (cache emptied)', async () => {
    const c = await created();
    await tree();
    const name = `სახელი ${tag}`;
    expect((await update(c.id, { name: { ka: name, en: null } })).status).toBe(200);
    expect(await tree()).toContain(name);
  });

  it('replacing the icon deletes the old file; unknown id → 404', async () => {
    const oldIcon = await categoryImage(staff.id);
    const c = await created({ iconFileId: oldIcon.id });
    const newIcon = await categoryImage(staff.id);
    const res = await update(c.id, { iconFileId: newIcon.id });
    expect(res.body.icon).toMatchObject({ fileId: newIcon.id });
    expect((await prisma.file.findUniqueOrThrow({ where: { id: oldIcon.id } })).status).toBe(
      'deleted',
    );
    const cleared = await update(c.id, { iconFileId: null });
    expect(cleared.body.icon).toBeNull();
    expect((await prisma.file.findUniqueOrThrow({ where: { id: newIcon.id } })).status).toBe(
      'deleted',
    );
    expect((await update(crypto.randomUUID(), { position: 1 })).status).toBe(404);
  });
});

describe('adminListCategories / adminGetCategory', () => {
  it('lists every category in tree order with usage counts and old slugs', async () => {
    const at = await branch();
    await gigIn(at);
    const deleted = await gigIn(at);
    await prisma.gig.update({
      where: { id: deleted.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
    await prisma.projectCategory.create({ data: { slug: slug('pc'), gigCategoryId: at.top.id } });
    await update(at.sub.id, { slug: slug('sub-new') });

    const res = await http().get(URL_).set(staff.auth);
    expect(res.status).toBe(200);
    const list = res.body.categories as Category[];
    const ids = list.map((c) => c.id);
    expect(ids.indexOf(at.top.id)).toBeLessThan(ids.indexOf(at.sub.id));
    expect(ids.indexOf(at.sub.id)).toBe(ids.indexOf(at.child.id) - 1);
    const byId = new Map(list.map((c) => [c.id, c]));
    expect(byId.get(at.top.id)).toMatchObject({
      gigCount: 1,
      childCount: 1,
      projectCategoryCount: 1,
    });
    expect(byId.get(at.sub.id)).toMatchObject({
      gigCount: 1,
      childCount: 1,
      previousSlugs: [at.sub.slug],
    });
    expect(byId.get(at.child.id)).toMatchObject({ gigCount: 1, childCount: 0 });

    const one = await http().get(`${URL_}/${at.sub.id}`).set(staff.auth);
    expect(one.body).toEqual(byId.get(at.sub.id));
    expect((await http().get(`${URL_}/${crypto.randomUUID()}`).set(staff.auth)).status).toBe(404);
  });
});

describe('adminDeleteCategory (spec 16 AC-60, spec 03 EC-2)', () => {
  it('refuses a category with children, gigs (deleted ones too) or project categories', async () => {
    const at = await branch();
    const withChild = await http().delete(`${URL_}/${at.top.id}`).set(staff.auth);
    expect(withChild.status).toBe(409);
    expect(withChild.body).toMatchObject({
      code: 'CATEGORY_IN_USE',
      details: { childCount: 1, gigCount: 0, projectCount: 0, messageKey: 't_category_in_use' },
    });

    const gig = await gigIn(at);
    await prisma.gig.update({
      where: { id: gig.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
    const withGig = await http().delete(`${URL_}/${at.child.id}`).set(staff.auth);
    expect(withGig.status).toBe(409);
    expect(withGig.body.details).toMatchObject({ gigCount: 1 });

    const linked = await created();
    await prisma.projectCategory.create({ data: { slug: slug('pc'), gigCategoryId: linked.id } });
    const withProject = await http().delete(`${URL_}/${linked.id}`).set(staff.auth);
    expect(withProject.body.details).toMatchObject({ projectCount: 1 });
  });

  it('deletes an unused category with its old slugs and image, audited; then 404', async () => {
    const icon = await categoryImage(staff.id);
    const c = await created({ iconFileId: icon.id });
    await update(c.id, { slug: slug('moved') });
    const res = await http().delete(`${URL_}/${c.id}`).set(staff.auth);
    expect(res.status).toBe(204);
    expect(await prisma.slugRedirect.count({ where: { entityId: c.id } })).toBe(0);
    expect(await prisma.gigCategoryTranslation.count({ where: { categoryId: c.id } })).toBe(0);
    expect((await prisma.file.findUniqueOrThrow({ where: { id: icon.id } })).status).toBe(
      'deleted',
    );
    expect(
      await prisma.auditLog.count({ where: { action: 'category.delete', targetId: c.id } }),
    ).toBe(1);
    expect(await tree()).not.toContain(c.id);
    expect((await http().delete(`${URL_}/${c.id}`).set(staff.auth)).status).toBe(404);
  });
});
