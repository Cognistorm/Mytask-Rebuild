// Staff project categories and skills (ROADMAP 4.2.8; spec 16 AC-61, spec 03 AC-31, R-S8, P-31): the 10 operations
// adminListProjectCategories … adminDeleteSkill. Responses are validated against openapi.yaml by the test app.
// Other test files leave catalog rows behind, so each test looks only at its own rows.
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
const slug = (name = 'p') => `pc-${tag}-${name}-${(seq += 1)}`;
const http = () => request(app.getHttpServer());
const PC = '/api/v1/admin/project-categories';
const SK = '/api/v1/admin/skills';

type ProjectCategory = {
  id: string;
  slug: string;
  name: { ka: string; en: string | null };
  seoDescription: { ka: string; en: string | null } | null;
  gigCategory: { id: string; slug: string; name: string; contentLocale: string } | null;
  image: { fileId: string } | null;
  position: number;
  isActive: boolean;
  skillCount: number;
  projectCount: number;
  updatedAt: string;
};
type Skill = {
  id: string;
  projectCategoryId: string;
  slug: string;
  name: { ka: string; en: string | null };
  isActive: boolean;
  projectCount: number;
};

async function gigCategory(depth = 1) {
  let parentId: string | null = null;
  let row = null as null | { id: string; slug: string };
  for (let d = 1; d <= depth; d += 1) {
    row = await prisma.gigCategory.create({
      data: {
        parentId,
        depth: d,
        slug: slug('gig'),
        translations: {
          create: [
            { locale: 'ka', name: `დიზაინი ${d}` },
            { locale: 'en', name: `Design ${d}` },
          ],
        },
      },
    });
    parentId = row.id;
  }
  return row!;
}

let top: { id: string; slug: string };

const createCategory = (body: Record<string, unknown>, auth = staff.auth) =>
  http()
    .post(PC)
    .set(auth)
    .send({ name: { ka: 'ვებ', en: 'Web' }, slug: slug(), gigCategoryId: top.id, ...body });
async function category(body: Record<string, unknown> = {}): Promise<ProjectCategory> {
  const res = await createCategory(body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as ProjectCategory;
}
const updateCategory = (id: string, body: Record<string, unknown>) =>
  http().patch(`${PC}/${id}`).set(staff.auth).send(body);

const createSkill = (projectCategoryId: string, body: Record<string, unknown> = {}) =>
  http()
    .post(SK)
    .set(staff.auth)
    .send({ projectCategoryId, slug: slug('s'), name: { ka: 'უნარი', en: 'Skill' }, ...body });
async function skill(projectCategoryId: string, body: Record<string, unknown> = {}) {
  const res = await createSkill(projectCategoryId, body);
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as Skill;
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
      originalName: 'image.png',
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

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  process.env.STAFF_BODY_TOKENS_ENABLED = 'true';
  app = await createTestApp((b) => b.overrideProvider(ObjectStorage).useValue(storage));
  prisma = app.get(PrismaService);
  await app.get(RedisService).client.flushall();
  staff = await makeStaff(app, ['catalog.write']);
  top = await gigCategory();
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

describe('admin project catalog: access', () => {
  it('needs a staff session with catalog.write on both lists', async () => {
    expect((await http().get(PC)).status).toBe(401);
    expect((await http().get(SK)).status).toBe(401);
    const other = await makeStaff(app, ['content.write']);
    expect((await http().get(PC).set(other.auth)).status).toBe(403);
    expect((await http().get(SK).set(other.auth)).status).toBe(403);
    expect((await createCategory({}, other.auth)).status).toBe(403);
  });
});

describe('adminCreateProjectCategory (spec 16 AC-61, spec 03 AC-31, R-S8)', () => {
  it('saves every field, links a top-level gig category, audits and shows in the public list', async () => {
    const image = await categoryImage(staff.id);
    const s = slug('full');
    const res = await http()
      .post(PC)
      .set(staff.auth)
      .set('Accept-Language', 'en')
      .send({
        slug: s,
        name: { ka: '  ვებ-დეველოპმენტი ', en: 'Web development' },
        seoDescription: { ka: 'აღწერა', en: 'About' },
        gigCategoryId: top.id,
        imageFileId: image.id,
        position: 4,
        isActive: true,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const c = res.body as ProjectCategory;
    expect(c).toMatchObject({
      slug: s,
      name: { ka: 'ვებ-დეველოპმენტი', en: 'Web development' },
      seoDescription: { ka: 'აღწერა', en: 'About' },
      gigCategory: { id: top.id, slug: top.slug, name: 'Design 1', contentLocale: 'en' },
      image: { fileId: image.id, large: `${MEDIA}/images/${image.id}/large.webp` },
      position: 4,
      isActive: true,
      skillCount: 0,
      projectCount: 0,
    });
    expect((await prisma.file.findUniqueOrThrow({ where: { id: image.id } })).attachedAt).not.toBe(
      null,
    );
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'project_category.create', targetId: c.id },
    });
    expect(audit).toMatchObject({
      actorStaffId: staff.id,
      permissionCode: 'catalog.write',
      targetType: 'project_category',
    });
    const pub = await http().get('/api/v1/project-categories');
    expect(JSON.stringify(pub.body)).toContain(c.id);
  });

  it('goes last by default, English optional, inactive ones stay out of the public list', async () => {
    const a = await category();
    const b = await category({ name: { ka: 'მხოლოდ ქართული', en: null }, isActive: false });
    expect(b.position).toBeGreaterThan(a.position);
    expect(b).toMatchObject({ name: { en: null }, seoDescription: null, isActive: false });
    const rows = await prisma.projectCategoryTranslation.findMany({
      where: { projectCategoryId: b.id },
    });
    expect(rows.map((r) => r.locale)).toEqual(['ka']);
    expect(JSON.stringify((await http().get('/api/v1/project-categories')).body)).not.toContain(
      b.id,
    );
  });

  it('refuses a gig category below the top level (422), an unknown one (400), a taken slug (409)', async () => {
    const sub = await gigCategory(2);
    const deep = await createCategory({ gigCategoryId: sub.id });
    expect(deep.status).toBe(422);
    expect(deep.body).toMatchObject({
      code: 'BUSINESS_RULE_VIOLATION',
      details: { messageKey: 't_project_category_top_level_only' },
    });
    const unknown = await createCategory({ gigCategoryId: crypto.randomUUID() });
    expect(unknown.status).toBe(400);
    expect(unknown.body.details.fields[0]).toMatchObject({ field: 'gigCategoryId' });
    const c = await category();
    const taken = await createCategory({ slug: c.slug });
    expect(taken.status).toBe(409);
    expect(taken.body).toMatchObject({ code: 'DUPLICATE', details: { field: 'slug' } });
  });

  it('refuses a blank or too long name, English SEO text without an English name, foreign or used images', async () => {
    const blank = await createCategory({ name: { ka: '  ', en: null } });
    expect(blank.body.details.fields[0]).toMatchObject({ field: 'name.ka', code: 'required' });
    const long = await createCategory({ name: { ka: 'ა', en: 'x'.repeat(101) } });
    expect(long.body.details.fields[0]).toMatchObject({ field: 'name.en', code: 'max' });
    const seo = await createCategory({
      name: { ka: 'ა', en: null },
      seoDescription: { ka: 'ა', en: 'English' },
    });
    expect(seo.body.details.fields[0]).toMatchObject({ field: 'name.en' });

    const other = await makeStaff(app, ['catalog.write']);
    const foreign = await createCategory({ imageFileId: (await categoryImage(other.id)).id });
    expect(foreign.body.details.fields[0]).toMatchObject({
      field: 'imageFileId',
      code: 'file_not_found',
    });
    const pending = await createCategory({
      imageFileId: (await categoryImage(staff.id, 'pending')).id,
    });
    expect(pending.body.details.fields[0]).toMatchObject({ code: 'file_not_ready' });
    // An image shown by a gig category is not free for a project category (and the other way round).
    const shown = await categoryImage(staff.id);
    await prisma.gigCategory.update({ where: { id: top.id }, data: { imageFileId: shown.id } });
    const used = await createCategory({ imageFileId: shown.id });
    expect(used.body.details.fields[0]).toMatchObject({ code: 'file_not_found' });
    await prisma.gigCategory.update({ where: { id: top.id }, data: { imageFileId: null } });
    const mine = await categoryImage(staff.id);
    await category({ imageFileId: mine.id });
    const gigTake = await http()
      .patch(`/api/v1/admin/categories/${top.id}`)
      .set(staff.auth)
      .send({ imageFileId: mine.id });
    expect(gigTake.body.details.fields[0]).toMatchObject({ code: 'file_not_found' });
  });
});

describe('adminUpdateProjectCategory', () => {
  it('changes only the fields sent, relinks, drops the English row, audits before/after', async () => {
    const c = await category({ seoDescription: { ka: 'ქართ.', en: 'Eng.' } });
    const other = await gigCategory();
    const moved = await updateCategory(c.id, {
      position: 9,
      isActive: false,
      gigCategoryId: other.id,
    });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(moved.body).toMatchObject({
      position: 9,
      isActive: false,
      name: c.name,
      seoDescription: c.seoDescription,
      gigCategory: { id: other.id },
    });
    const kaOnly = await updateCategory(c.id, {
      name: { ka: 'ახალი', en: null },
      seoDescription: null,
    });
    expect(kaOnly.body).toMatchObject({ name: { ka: 'ახალი', en: null }, seoDescription: null });
    expect(
      (
        await prisma.projectCategoryTranslation.findMany({ where: { projectCategoryId: c.id } })
      ).map((r) => r.locale),
    ).toEqual(['ka']);
    const audits = await prisma.auditLog.findMany({
      where: { action: 'project_category.update', targetId: c.id },
      orderBy: { id: 'asc' },
    });
    expect(audits).toHaveLength(2);
    expect(audits[0]!.before).toMatchObject({ gigCategoryId: top.id, isActive: true });
    expect(audits[0]!.after).toMatchObject({ gigCategoryId: other.id, isActive: false });

    const sub = await gigCategory(2);
    expect((await updateCategory(c.id, { gigCategoryId: sub.id })).status).toBe(422);
    const taken = await category();
    expect((await updateCategory(c.id, { slug: taken.slug })).status).toBe(409);
    expect((await updateCategory(crypto.randomUUID(), { position: 1 })).status).toBe(404);
  });

  it('replacing or removing the image deletes the old file', async () => {
    const first = await categoryImage(staff.id);
    const c = await category({ imageFileId: first.id });
    const second = await categoryImage(staff.id);
    const res = await updateCategory(c.id, { imageFileId: second.id });
    expect(res.body.image).toMatchObject({ fileId: second.id });
    expect((await prisma.file.findUniqueOrThrow({ where: { id: first.id } })).status).toBe(
      'deleted',
    );
    expect((await updateCategory(c.id, { imageFileId: null })).body.image).toBeNull();
    expect((await prisma.file.findUniqueOrThrow({ where: { id: second.id } })).status).toBe(
      'deleted',
    );
  });
});

describe('adminListProjectCategories / adminGetProjectCategory / adminDeleteProjectCategory', () => {
  it('lists by position with skill counts; get = the list item; unknown → 404', async () => {
    const a = await category({ position: 1000 });
    const b = await category({ position: 1001 });
    await skill(b.id);
    await skill(b.id, { isActive: false });
    const res = await http().get(PC).set(staff.auth);
    expect(res.status).toBe(200);
    const list = res.body.projectCategories as ProjectCategory[];
    const ids = list.map((c) => c.id);
    expect(ids.indexOf(a.id)).toBeLessThan(ids.indexOf(b.id));
    const item = list.find((c) => c.id === b.id)!;
    expect(item).toMatchObject({ skillCount: 2, projectCount: 0 });
    expect((await http().get(`${PC}/${b.id}`).set(staff.auth)).body).toEqual(item);
    expect((await http().get(`${PC}/${crypto.randomUUID()}`).set(staff.auth)).status).toBe(404);
  });

  it('refuses a category with skills (inactive too) with 409 CATEGORY_IN_USE, else deletes and audits', async () => {
    const image = await categoryImage(staff.id);
    const c = await category({ imageFileId: image.id });
    const s = await skill(c.id, { isActive: false });
    const refused = await http().delete(`${PC}/${c.id}`).set(staff.auth);
    expect(refused.status).toBe(409);
    expect(refused.body).toMatchObject({
      code: 'CATEGORY_IN_USE',
      details: { messageKey: 't_category_in_use', skillCount: 1, projectCount: 0 },
    });
    expect((await http().delete(`${SK}/${s.id}`).set(staff.auth)).status).toBe(204);
    expect((await http().delete(`${PC}/${c.id}`).set(staff.auth)).status).toBe(204);
    expect(await prisma.projectCategory.findUnique({ where: { id: c.id } })).toBeNull();
    expect((await prisma.file.findUniqueOrThrow({ where: { id: image.id } })).status).toBe(
      'deleted',
    );
    expect(
      await prisma.auditLog.count({ where: { action: 'project_category.delete', targetId: c.id } }),
    ).toBe(1);
    expect((await http().delete(`${PC}/${c.id}`).set(staff.auth)).status).toBe(404);
  });

  it('a gig category linked to a project category cannot be deleted (4.2.7b count)', async () => {
    const gig = await gigCategory();
    await category({ gigCategoryId: gig.id });
    const res = await http().delete(`/api/v1/admin/categories/${gig.id}`).set(staff.auth);
    expect(res.status).toBe(409);
    expect(res.body.details).toMatchObject({ projectCount: 1 });
  });
});

describe('admin skills (spec 16 AC-61, spec 03 AC-31)', () => {
  it('creates a skill inside one project category, audits, shows active ones publicly', async () => {
    const c = await category();
    const s = await skill(c.id, { name: { ka: ' ფოტოშოპი ', en: 'Photoshop' } });
    expect(s).toMatchObject({
      projectCategoryId: c.id,
      name: { ka: 'ფოტოშოპი', en: 'Photoshop' },
      isActive: true,
      projectCount: 0,
    });
    expect(await prisma.auditLog.count({ where: { action: 'skill.create', targetId: s.id } })).toBe(
      1,
    );
    const pub = await http().get('/api/v1/project-categories');
    const mine = (pub.body.projectCategories as { id: string; skills: { id: string }[] }[]).find(
      (p) => p.id === c.id,
    )!;
    expect(mine.skills.map((x) => x.id)).toEqual([s.id]);
  });

  it('slug unique inside its project category only; unknown category → 404; blank name → 400', async () => {
    const a = await category();
    const b = await category();
    const s = await skill(a.id);
    const dup = await createSkill(a.id, { slug: s.slug });
    expect(dup.status).toBe(409);
    expect(dup.body).toMatchObject({ code: 'DUPLICATE', details: { field: 'slug' } });
    expect((await createSkill(b.id, { slug: s.slug })).status).toBe(201);
    expect((await createSkill(crypto.randomUUID())).status).toBe(404);
    const blank = await createSkill(a.id, { name: { ka: ' ', en: 'x' } });
    expect(blank.status).toBe(400);
    expect(blank.body.details.fields[0]).toMatchObject({ field: 'name.ka' });
  });

  it('updates fields, moves between categories (slug must be free there), audits; get/delete 404', async () => {
    const a = await category();
    const b = await category();
    const s = await skill(a.id);
    await skill(b.id, { slug: `${s.slug}-b` });
    const res = await http()
      .patch(`${SK}/${s.id}`)
      .set(staff.auth)
      .send({ isActive: false, name: { ka: 'ახალი', en: null } });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toMatchObject({
      isActive: false,
      name: { ka: 'ახალი', en: null },
      slug: s.slug,
    });
    const clash = await http()
      .patch(`${SK}/${s.id}`)
      .set(staff.auth)
      .send({ projectCategoryId: b.id, slug: `${s.slug}-b` });
    expect(clash.status).toBe(409);
    const moved = await http()
      .patch(`${SK}/${s.id}`)
      .set(staff.auth)
      .send({ projectCategoryId: b.id });
    expect(moved.body).toMatchObject({ projectCategoryId: b.id });
    expect(
      (
        await http()
          .patch(`${SK}/${s.id}`)
          .set(staff.auth)
          .send({ projectCategoryId: crypto.randomUUID() })
      ).status,
    ).toBe(404);
    const audits = await prisma.auditLog.findMany({
      where: { action: 'skill.update', targetId: s.id },
      orderBy: { id: 'asc' },
    });
    expect(audits).toHaveLength(2);
    expect(audits[1]!.after).toMatchObject({ projectCategoryId: b.id });
    expect((await http().get(`${SK}/${s.id}`).set(staff.auth)).body).toMatchObject({ id: s.id });
    expect((await http().get(`${SK}/${crypto.randomUUID()}`).set(staff.auth)).status).toBe(404);
    expect((await http().delete(`${SK}/${crypto.randomUUID()}`).set(staff.auth)).status).toBe(404);
  });

  it('lists oldest first by category and by q (slug or either name), pages with a cursor', async () => {
    const c = await category();
    const word = `w${tag}`;
    const s1 = await skill(c.id, { name: { ka: `პირველი ${word}`, en: null } });
    const s2 = await skill(c.id, { name: { ka: 'მეორე', en: `Second ${word.toUpperCase()}` } });
    const s3 = await skill(c.id, { slug: `${word}-third` });
    await skill((await category()).id, { name: { ka: word, en: null } });

    const all = await http().get(SK).set(staff.auth).query({ projectCategoryId: c.id });
    expect(all.status).toBe(200);
    expect((all.body.data as Skill[]).map((s) => s.id)).toEqual([s1.id, s2.id, s3.id]);
    expect(all.body.nextCursor).toBeNull();

    const found = await http().get(SK).set(staff.auth).query({ projectCategoryId: c.id, q: word });
    expect((found.body.data as Skill[]).map((s) => s.id)).toEqual([s1.id, s2.id, s3.id]);

    const first = await http().get(SK).set(staff.auth).query({ projectCategoryId: c.id, limit: 2 });
    expect(first.body.data).toHaveLength(2);
    const next = await http()
      .get(SK)
      .set(staff.auth)
      .query({ projectCategoryId: c.id, limit: 2, cursor: first.body.nextCursor });
    expect((next.body.data as Skill[]).map((s) => s.id)).toEqual([s3.id]);
    expect((await http().get(SK).set(staff.auth).query({ cursor: 'nope' })).status).toBe(400);
  });
});
