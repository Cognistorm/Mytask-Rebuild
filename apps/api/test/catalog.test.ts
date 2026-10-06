// Public catalogue reads (ROADMAP 4.2.3; spec 03 AC-1…AC-5, AC-31, AC-33…AC-35): listCategories (60 s cache),
// lookupCategory, getCategory, listProjectCategories, lookupProjectCategory (S-075). Responses are validated
// against openapi.yaml by the test app. Other test files leave categories behind, so each test looks only at
// the rows it created (unique slugs).
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CategoriesService } from '../src/modules/catalog/categories.service';
import { PrismaService } from '../src/platform/db/prisma.service';
import { settingsRegistry, SettingsService } from '../src/platform/settings/settings.service';
import { createTestApp } from './app';

const MEDIA = 'https://media.test.mytask.ge';
const previousMediaUrl = process.env.PUBLIC_MEDIA_BASE_URL;
let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const tag = Date.now().toString(36);
const slug = (name: string) => {
  seq += 1;
  return `c-${tag}-${name}-${seq}`;
};
const http = () => request(app.getHttpServer());
const en = { 'Accept-Language': 'en' };

type Names = { ka?: string; en?: string } & Record<string, unknown>;
async function category(
  parentId: string | null,
  names: { ka: Names; en?: Names },
  data: Record<string, unknown> = {},
) {
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth: 1,
      slug: slug('cat'),
      ...data,
      translations: {
        create: [
          { locale: 'ka', name: names.ka.ka ?? 'კატეგორია', ...strip(names.ka) },
          ...(names.en
            ? [{ locale: 'en' as const, name: names.en.en ?? 'Category', ...strip(names.en) }]
            : []),
        ],
      },
    },
  });
}
const strip = ({ ka: _ka, en: _en, ...rest }: Names) => rest;

async function branch() {
  const top = await category(null, { ka: { ka: 'გრაფიკა' }, en: { en: 'Graphics' } });
  const sub = await category(top.id, { ka: { ka: 'ლოგო' }, en: { en: 'Logo' } });
  const child = await category(sub.id, { ka: { ka: 'მინიმალისტური' } });
  return { top, sub, child };
}

async function publicImage() {
  const id = crypto.randomUUID();
  return prisma.file.create({
    data: {
      id,
      purpose: 'category_image',
      bucket: 'public_media',
      objectKey: `images/${id}/large.webp`,
      originalName: 'icon.png',
      declaredType: 'image/png',
      sizeBytes: 100n,
      status: 'ready',
      readyAt: new Date(),
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

async function setS075(value: boolean) {
  const key = settingsRegistry['S-075'].key;
  await prisma.setting.upsert({
    where: { key },
    create: { key, registerId: 'S-075', value, currentVersion: 1 },
    update: { value },
  });
  app.get(SettingsService).invalidate();
}

type Node = {
  id: string;
  path: string;
  name: string;
  contentLocale: string;
  isVisibleOnHome: boolean;
  icon: unknown;
  children: Node[];
};
const findNode = (nodes: Node[], id: string): Node | undefined =>
  nodes.find((n) => n.id === id) ?? nodes.map((n) => findNode(n.children, id)).find(Boolean);

beforeAll(async () => {
  process.env.PUBLIC_MEDIA_BASE_URL = MEDIA;
  app = await createTestApp();
  prisma = app.get(PrismaService);
});
afterAll(async () => {
  if (previousMediaUrl === undefined) delete process.env.PUBLIC_MEDIA_BASE_URL;
  else process.env.PUBLIC_MEDIA_BASE_URL = previousMediaUrl;
  await prisma.setting.deleteMany({ where: { registerId: 'S-075' } });
  await app?.close();
});
beforeEach(() => {
  app.get(CategoriesService).invalidate();
});

describe('listCategories', () => {
  it('returns the 3-level tree with paths, names in the request language and the Georgian fallback (AC-1, AC-4)', async () => {
    const { top, sub, child } = await branch();
    const ka = await http().get('/api/v1/categories');
    expect(ka.status).toBe(200);
    const kaTop = findNode(ka.body.categories, top.id)!;
    expect(kaTop).toMatchObject({ path: top.slug, depth: 1, name: 'გრაფიკა', contentLocale: 'ka' });
    expect(kaTop.children.map((n) => n.id)).toEqual([sub.id]);
    expect(kaTop.children[0]!.children[0]).toMatchObject({
      id: child.id,
      path: `${top.slug}/${sub.slug}/${child.slug}`,
      depth: 3,
      children: [],
    });

    const res = await http().get('/api/v1/categories').set(en);
    expect(res.status).toBe(200);
    expect(findNode(res.body.categories, top.id)).toMatchObject({
      name: 'Graphics',
      contentLocale: 'en',
    });
    // No English name: the Georgian one, marked `ka` (AC-4).
    expect(findNode(res.body.categories, child.id)).toMatchObject({
      name: 'მინიმალისტური',
      contentLocale: 'ka',
    });
  });

  it('orders siblings by position', async () => {
    const top = await category(null, { ka: { ka: 'რიგი' } });
    const second = await category(top.id, { ka: { ka: 'ბ' } }, { position: 2 });
    const first = await category(top.id, { ka: { ka: 'ა' } }, { position: 1 });
    const res = await http().get('/api/v1/categories');
    expect(findNode(res.body.categories, top.id)!.children.map((n) => n.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it('keeps a hidden top-level category in the tree, marked not for the home page (AC-5)', async () => {
    const top = await category(null, { ka: { ka: 'დამალული' } }, { isVisible: false });
    const sub = await category(top.id, { ka: { ka: 'ქვე' } }, { isVisible: false });
    const res = await http().get('/api/v1/categories');
    expect(findNode(res.body.categories, top.id)!.isVisibleOnHome).toBe(false);
    expect(findNode(res.body.categories, sub.id)!.isVisibleOnHome).toBe(true);
  });

  it('returns the icon and image of a top-level category as CDN variants, never below the top level', async () => {
    const icon = await publicImage();
    const image = await publicImage();
    const top = await category(
      null,
      { ka: { ka: 'ხატულა' } },
      { iconFileId: icon.id, imageFileId: image.id },
    );
    const sub = await category(top.id, { ka: { ka: 'ქვე' } }, { iconFileId: icon.id });
    const res = await http().get('/api/v1/categories');
    const node = findNode(res.body.categories, top.id) as Node & { image: unknown };
    expect(node.icon).toEqual({
      fileId: icon.id,
      thumb: `${MEDIA}/images/${icon.id}/thumb.webp`,
      medium: `${MEDIA}/images/${icon.id}/medium.webp`,
      large: `${MEDIA}/images/${icon.id}/large.webp`,
      width: 64,
      height: 64,
    });
    expect(node.image).toMatchObject({ fileId: image.id });
    expect(findNode(res.body.categories, sub.id)!.icon).toBeNull();
  });

  it('is cached: a change shows after at most 60 seconds', async () => {
    const top = await category(null, { ka: { ka: 'ძველი' } });
    expect(findNode((await http().get('/api/v1/categories')).body.categories, top.id)!.name).toBe(
      'ძველი',
    );
    await prisma.gigCategoryTranslation.update({
      where: { categoryId_locale: { categoryId: top.id, locale: 'ka' } },
      data: { name: 'ახალი' },
    });
    expect(findNode((await http().get('/api/v1/categories')).body.categories, top.id)!.name).toBe(
      'ძველი',
    );
    const now = Date.now();
    const clock = vi.spyOn(Date, 'now').mockReturnValue(now + 60_000);
    try {
      expect(findNode((await http().get('/api/v1/categories')).body.categories, top.id)!.name).toBe(
        'ახალი',
      );
    } finally {
      clock.mockRestore();
    }
  });
});

describe('lookupCategory / getCategory', () => {
  it('resolves every level with breadcrumb and children (AC-3)', async () => {
    const { top, sub, child } = await branch();
    const one = await http().get('/api/v1/categories/lookup').query({ path: top.slug });
    expect(one.status).toBe(200);
    expect(one.body).toMatchObject({ id: top.id, depth: 1, path: top.slug, name: 'გრაფიკა' });
    expect(one.body.breadcrumb.map((b: { id: string }) => b.id)).toEqual([top.id]);
    expect(one.body.children).toEqual([
      { id: sub.id, slug: sub.slug, name: 'ლოგო', contentLocale: 'ka' },
    ]);

    const three = await http()
      .get('/api/v1/categories/lookup')
      .query({ path: `${top.slug}/${sub.slug}/${child.slug}` })
      .set(en);
    expect(three.status).toBe(200);
    expect(three.body).toMatchObject({
      id: child.id,
      depth: 3,
      path: `${top.slug}/${sub.slug}/${child.slug}`,
      name: 'მინიმალისტური',
      contentLocale: 'ka',
      hasEnglish: false,
      children: [],
    });
    expect(three.body.breadcrumb).toEqual([
      { id: top.id, slug: top.slug, name: 'Graphics', contentLocale: 'en' },
      { id: sub.id, slug: sub.slug, name: 'Logo', contentLocale: 'en' },
      { id: child.id, slug: child.slug, name: 'მინიმალისტური', contentLocale: 'ka' },
    ]);

    const byId = await http().get(`/api/v1/categories/${sub.id}`).set(en);
    expect(byId.status).toBe(200);
    expect(byId.body).toMatchObject({
      id: sub.id,
      path: `${top.slug}/${sub.slug}`,
      hasEnglish: true,
    });
  });

  it('answers 404 for an unknown slug, a level under the wrong parent, or too many levels (AC-3)', async () => {
    const a = await branch();
    const b = await branch();
    const lookup = (path: string) => http().get('/api/v1/categories/lookup').query({ path });
    expect((await lookup('no-such-category')).status).toBe(404);
    expect((await lookup(`${a.top.slug}/${b.sub.slug}`)).status).toBe(404);
    expect((await lookup(`${a.top.slug}/${a.sub.slug}/${b.child.slug}`)).status).toBe(404);
    // A sub-category slug is not a top-level slug.
    expect((await lookup(a.sub.slug)).status).toBe(404);
    expect((await lookup(`${a.top.slug}/${a.sub.slug}/${a.child.slug}/x`)).status).toBe(404);
    expect((await lookup(`${a.top.slug}//${a.sub.slug}`)).status).toBe(404);
    const missing = await http().get(`/api/v1/categories/${crypto.randomUUID()}`);
    expect(missing.status).toBe(404);
    expect(missing.body.code).toBe('NOT_FOUND');
  });

  it('shows Georgian SEO texts on an English page where the English ones are missing (AC-4)', async () => {
    const top = await category(null, {
      ka: {
        ka: 'ვებ',
        description: 'აღწერა',
        contentTop: '<p>ზედა</p>',
        contentBottom: '<p>ქვედა</p>',
      },
      en: { en: 'Web', description: 'About web', contentTop: '' },
    });
    const res = await http().get(`/api/v1/categories/${top.id}`).set(en);
    expect(res.body).toMatchObject({
      name: 'Web',
      description: 'About web',
      contentTop: '<p>ზედა</p>',
      contentBottom: '<p>ქვედა</p>',
      contentLocale: 'ka',
      hasEnglish: true,
    });
    const ka = await http().get(`/api/v1/categories/${top.id}`);
    expect(ka.body).toMatchObject({ name: 'ვებ', description: 'აღწერა', contentLocale: 'ka' });

    const full = await category(null, {
      ka: { ka: 'სრული', description: 'ქა' },
      en: { en: 'Full', description: 'En' },
    });
    expect((await http().get(`/api/v1/categories/${full.id}`).set(en)).body).toMatchObject({
      description: 'En',
      contentTop: null,
      contentLocale: 'en',
    });
  });

  it('never shows English body text on a Georgian page', async () => {
    const top = await category(null, {
      ka: { ka: 'მხოლოდ სახელი' },
      en: { en: 'Name', description: 'English only' },
    });
    const res = await http().get(`/api/v1/categories/${top.id}`);
    expect(res.body).toMatchObject({
      name: 'მხოლოდ სახელი',
      description: null,
      contentLocale: 'ka',
    });
  });

  it('still serves a hidden category page (AC-5)', async () => {
    const top = await category(null, { ka: { ka: 'დამალული' } }, { isVisible: false });
    expect((await http().get('/api/v1/categories/lookup').query({ path: top.slug })).status).toBe(
      200,
    );
  });
});

describe('listProjectCategories / lookupProjectCategory', () => {
  async function projectCategory(data: Record<string, unknown> = {}) {
    const s = slug('proj');
    return prisma.projectCategory.create({
      data: {
        slug: s,
        position: 1000 + seq,
        ...data,
        translations: {
          create: [
            { locale: 'ka', name: 'პროგრამირება', seoDescription: 'ქართული SEO' },
            { locale: 'en', name: 'Programming' },
          ],
        },
      },
    });
  }
  async function skill(projectCategoryId: string, ka: string, enName?: string, isActive = true) {
    return prisma.skill.create({
      data: {
        projectCategoryId,
        slug: slug('skill'),
        isActive,
        translations: {
          create: [
            { locale: 'ka', name: ka },
            ...(enName ? [{ locale: 'en' as const, name: enName }] : []),
          ],
        },
      },
    });
  }

  it('lists active project categories with their active skills, Georgian fallback (AC-31)', async () => {
    const pc = await projectCategory();
    const inactive = await projectCategory({ isActive: false });
    const php = await skill(pc.id, 'PHP', 'PHP');
    const js = await skill(pc.id, 'ჯავასკრიპტი');
    await skill(pc.id, 'ძველი', 'Old', false);

    const res = await http().get('/api/v1/project-categories').set(en);
    expect(res.status).toBe(200);
    const ids = res.body.projectCategories.map((p: { id: string }) => p.id);
    expect(ids).toContain(pc.id);
    expect(ids).not.toContain(inactive.id);
    const view = res.body.projectCategories.find((p: { id: string }) => p.id === pc.id);
    expect(view).toMatchObject({
      slug: pc.slug,
      name: 'Programming',
      seoDescription: 'ქართული SEO',
      contentLocale: 'ka',
      hasEnglish: true,
      image: null,
    });
    expect(view.skills).toEqual([
      { id: php.id, slug: php.slug, name: 'PHP', contentLocale: 'en' },
      { id: js.id, slug: js.slug, name: 'ჯავასკრიპტი', contentLocale: 'ka' },
    ]);
  });

  it('resolves a category and a skill inside it, else 404 (AC-33)', async () => {
    const pc = await projectCategory();
    const other = await projectCategory();
    const s = await skill(pc.id, 'React', 'React');
    const foreign = await skill(other.id, 'Vue', 'Vue');
    const hidden = await skill(pc.id, 'Old', 'Old', false);
    const inactive = await projectCategory({ isActive: false });
    const lookup = (query: Record<string, string>) =>
      http().get('/api/v1/project-categories/lookup').query(query);

    const plain = await lookup({ slug: pc.slug });
    expect(plain.status).toBe(200);
    expect(plain.body).toMatchObject({ projectCategory: { id: pc.id }, skill: null });
    const withSkill = await lookup({ slug: pc.slug, skillSlug: s.slug });
    expect(withSkill.body.skill).toEqual({
      id: s.id,
      slug: s.slug,
      name: 'React',
      contentLocale: 'ka',
    });

    expect((await lookup({ slug: 'no-such-project-category' })).status).toBe(404);
    expect((await lookup({ slug: pc.slug, skillSlug: foreign.slug })).status).toBe(404);
    expect((await lookup({ slug: pc.slug, skillSlug: hidden.slug })).status).toBe(404);
    expect((await lookup({ slug: inactive.slug })).status).toBe(404);
  });

  it('answers 403 FEATURE_DISABLED while S-075 is OFF (AC-34)', async () => {
    const pc = await projectCategory();
    await setS075(false);
    try {
      const res = await http()
        .get('/api/v1/project-categories/lookup')
        .query({ slug: pc.slug })
        .set(en);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FEATURE_DISABLED');
      expect(res.body.details).toMatchObject({
        settingId: 'S-075',
        messageKey: 't_feature_disabled',
      });
    } finally {
      await setS075(true);
    }
  });
});
