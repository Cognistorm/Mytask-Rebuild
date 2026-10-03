// Spec 03 data model (ROADMAP 4.2.2b, data-model §3.C, §3.D core, §3.R, §3.S): the local seed catalogue, the
// category tree trigger, project category link, old-slug scopes, gig checks and category chain, search indexes.
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadCatalog, readSeedCatalog, seedCatalog } from '../prisma/seed-catalog';
import { PrismaService } from '../src/platform/db/prisma.service';
import { createTestApp } from './app';

let app: NestExpressApplication;
let prisma: PrismaService;
let seq = 0;
const tag = Date.now().toString(36);
const slug = (name: string) => {
  seq += 1;
  return `t-${tag}-${name}-${seq}`;
};

async function category(parentId: string | null = null, name = 'cat') {
  return prisma.gigCategory.create({
    data: {
      parentId,
      depth: 1,
      slug: slug(name),
      translations: { create: [{ locale: 'ka', name: 'კატეგორია' }] },
    },
  });
}

/** A category → sub-category → child category branch. */
async function branch() {
  const top = await category();
  const sub = await category(top.id, 'sub');
  const child = await category(sub.id, 'child');
  return { top, sub, child };
}

async function owner() {
  seq += 1;
  const n = `${tag}${seq}`;
  return prisma.user.create({
    data: {
      username: `cs_${n}`,
      email: `cs${n}@example.com`,
      referralCode: `CS${n.slice(-6).toUpperCase().padStart(6, '0')}`,
      profile: { create: { fullname: 'Catalog Schema' } },
    },
  });
}

async function gigData(overrides: Record<string, unknown> = {}) {
  const u = await owner();
  const { top, sub, child } = await branch();
  const thumb = await prisma.file.create({
    data: {
      purpose: 'gig_thumbnail',
      ownerUserId: u.id,
      bucket: 'public_media',
      objectKey: `test/${u.id}/${Math.random().toString(36).slice(2)}`,
      originalName: 'a.jpg',
      declaredType: 'image/jpeg',
      sizeBytes: 1000n,
      status: 'ready',
    },
  });
  seq += 1;
  return {
    uid: `T${tag}${seq}`.toUpperCase().slice(0, 20),
    slug: `logo-${seq}`,
    ownerId: u.id,
    categoryId: top.id,
    subcategoryId: sub.id,
    childcategoryId: child.id,
    priceTetri: 5000n,
    deliveryDays: 3,
    revisionsAllowed: 1,
    thumbnailFileId: thumb.id,
    ...overrides,
  };
}

class Rollback extends Error {}

beforeAll(async () => {
  app = await createTestApp();
  prisma = app.get(PrismaService);
});

afterAll(async () => {
  await app?.close();
});

describe('seed catalogue (live public tree, local only)', () => {
  const catalog = readSeedCatalog();
  const levels = (nodes: typeof catalog.gigCategories, depth = 1): [number, string][] =>
    nodes.flatMap((n) => [
      [depth, n.slug] as [number, string],
      ...levels(n.children ?? [], depth + 1),
    ]);

  it('has 7 / 49 / 189 categories with slugs unique per level and valid for the contract', () => {
    const all = levels(catalog.gigCategories);
    expect([1, 2, 3].map((d) => all.filter(([x]) => x === d).length)).toEqual([7, 49, 189]);
    expect(new Set(all.map(([d, s]) => `${d}:${s}`)).size).toBe(all.length);
    for (const [, s] of all) expect(s).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(Math.max(...all.map(([, s]) => s.length))).toBeLessThanOrEqual(60);
  });

  it('has a Georgian and an English name for every category, each ≤ 60 characters', () => {
    const names = (nodes: typeof catalog.gigCategories): { ka: string; en: string }[] =>
      nodes.flatMap((n) => [n, ...names(n.children ?? [])]);
    for (const n of [...names(catalog.gigCategories), ...catalog.projectCategories]) {
      expect(n.ka.length).toBeGreaterThan(0);
      expect(n.ka.length).toBeLessThanOrEqual(60);
      expect(n.en.length).toBeGreaterThan(0);
      expect(n.en.length).toBeLessThanOrEqual(60);
      expect(n.en).not.toMatch(/[Ⴀ-ჿ]/);
    }
  });

  it('links every project category to a top-level gig category with the same slug (R-S8)', () => {
    const tops = new Set(catalog.gigCategories.map((c) => c.slug));
    expect(catalog.projectCategories).toHaveLength(7);
    for (const p of catalog.projectCategories) {
      expect(p.gigCategory).toBe(p.slug);
      expect(tops.has(p.gigCategory)).toBe(true);
    }
  });

  it('loads into the database with the depth set by the trigger (rolled back)', async () => {
    await expect(
      prisma.$transaction(
        async (tx) => {
          expect(await loadCatalog(tx, catalog)).toBe(245);
          const byDepth = await tx.gigCategory.groupBy({
            by: ['depth'],
            where: { legacyId: null, slug: { not: { startsWith: 't-' } } },
            _count: true,
            orderBy: { depth: 'asc' },
          });
          expect(byDepth.map((r) => r._count)).toEqual([7, 49, 189]);
          const logo = await tx.gigCategory.findFirstOrThrow({
            where: { slug: 'logo-design', depth: 3 },
            include: { translations: true, parent: { include: { parent: true } } },
          });
          expect(logo.parent?.parent?.slug).toBe('graphics-design');
          expect(logo.translations.map((t) => t.locale).sort()).toEqual(['en', 'ka']);
          const linked = await tx.projectCategory.findMany({
            where: { slug: { in: catalog.projectCategories.map((p) => p.slug) } },
            include: { gigCategory: true },
          });
          expect(linked).toHaveLength(7);
          for (const p of linked) expect(p.gigCategory?.depth).toBe(1);
          throw new Rollback();
        },
        { timeout: 120_000 },
      ),
    ).rejects.toBeInstanceOf(Rollback);
  });

  it('leaves an existing catalogue alone', async () => {
    await category();
    expect(await seedCatalog(prisma)).toBeNull();
  });
});

describe('gig category tree', () => {
  it('sets the depth from the parent and refuses a fourth level', async () => {
    const { top, sub, child } = await branch();
    expect([top.depth, sub.depth, child.depth]).toEqual([1, 2, 3]);
    // Expected failures run without nested rows (no transaction), see ROADMAP 4.2.0g.
    await expect(
      prisma.gigCategory.create({ data: { parentId: child.id, depth: 1, slug: slug('fourth') } }),
    ).rejects.toThrow();
  });

  it('refuses moving a category to another parent', async () => {
    const a = await branch();
    const b = await category();
    await expect(
      prisma.gigCategory.update({ where: { id: a.sub.id }, data: { parentId: b.id } }),
    ).rejects.toThrow();
  });

  it('keeps slugs unique per level, not across levels', async () => {
    const top = await category();
    await expect(
      prisma.gigCategory.create({ data: { parentId: null, depth: 1, slug: top.slug } }),
    ).rejects.toThrow();
    const sub = await prisma.gigCategory.create({
      data: { parentId: top.id, depth: 1, slug: top.slug },
    });
    expect(sub.depth).toBe(2);
  });

  it('refuses deleting a category that has children, and deletes translations with the category', async () => {
    const { top, child } = await branch();
    await expect(prisma.gigCategory.delete({ where: { id: top.id } })).rejects.toThrow();
    await prisma.gigCategory.delete({ where: { id: child.id } });
    expect(await prisma.gigCategoryTranslation.count({ where: { categoryId: child.id } })).toBe(0);
  });

  it('stores a description of at most 300 characters per language', async () => {
    const c = await category();
    await prisma.gigCategoryTranslation.update({
      where: { categoryId_locale: { categoryId: c.id, locale: 'ka' } },
      data: { description: 'ა'.repeat(300) },
    });
    await expect(
      prisma.gigCategoryTranslation.create({
        data: { categoryId: c.id, locale: 'en', name: 'Category', description: 'a'.repeat(301) },
      }),
    ).rejects.toThrow();
  });
});

describe('project categories and skills', () => {
  it('links a project category only to a top-level gig category, and refuses deleting that one', async () => {
    const { top, sub } = await branch();
    await expect(
      prisma.projectCategory.create({ data: { slug: slug('pc'), gigCategoryId: sub.id } }),
    ).rejects.toThrow();
    const pc = await prisma.projectCategory.create({
      data: { slug: slug('pc'), gigCategoryId: top.id },
    });
    await expect(
      prisma.projectCategory.update({ where: { id: pc.id }, data: { gigCategoryId: sub.id } }),
    ).rejects.toThrow();
    const bare = await category();
    const pc2 = await prisma.projectCategory.create({
      data: { slug: slug('pc'), gigCategoryId: bare.id },
    });
    await expect(prisma.gigCategory.delete({ where: { id: bare.id } })).rejects.toThrow();
    expect(pc2.isActive).toBe(true);
  });

  it('keeps skill slugs unique inside one project category', async () => {
    const [a, b] = await Promise.all([
      prisma.projectCategory.create({ data: { slug: slug('pc') } }),
      prisma.projectCategory.create({ data: { slug: slug('pc') } }),
    ]);
    const s = {
      slug: 'laravel',
      translations: { create: [{ locale: 'ka' as const, name: 'Laravel' }] },
    };
    await prisma.skill.create({ data: { ...s, projectCategoryId: a.id } });
    // Without nested rows (no transaction): local PGlite answers the next query wrongly after an error inside a
    // transaction (ROADMAP 4.2.0g).
    await expect(
      prisma.skill.create({ data: { slug: s.slug, projectCategoryId: a.id } }),
    ).rejects.toThrow();
    await prisma.skill.create({ data: { ...s, projectCategoryId: b.id } });
    await expect(prisma.projectCategory.delete({ where: { id: a.id } })).rejects.toThrow();
  });
});

describe('slug_redirects (data-model §3.R)', () => {
  it('scopes category slugs by level and pages/articles by 0', async () => {
    const entityId = (await category()).id;
    await prisma.slugRedirect.create({
      data: { entityType: 'gig_category', scope: 2, oldSlug: slug('old'), entityId },
    });
    await expect(
      prisma.slugRedirect.create({
        data: { entityType: 'gig_category', scope: 0, oldSlug: slug('old'), entityId },
      }),
    ).rejects.toThrow();
    await expect(
      prisma.slugRedirect.create({
        data: { entityType: 'page', scope: 1, oldSlug: slug('old'), entityId },
      }),
    ).rejects.toThrow();
    await prisma.slugRedirect.create({
      data: { entityType: 'blog_article', scope: 0, oldSlug: slug('old'), entityId },
    });
  });

  it('gives an old slug to one item at a time per type and scope', async () => {
    const [a, b] = [(await category()).id, (await category()).id];
    const oldSlug = slug('old');
    await prisma.slugRedirect.create({
      data: { entityType: 'gig_category', scope: 1, oldSlug, entityId: a },
    });
    await expect(
      prisma.slugRedirect.create({
        data: { entityType: 'gig_category', scope: 1, oldSlug, entityId: b },
      }),
    ).rejects.toThrow();
    await prisma.slugRedirect.create({
      data: { entityType: 'gig_category', scope: 2, oldSlug, entityId: b },
    });
  });
});

describe('gigs (core of §3.D)', () => {
  it('accepts a gig on one category branch; it starts as pending', async () => {
    const gig = await prisma.gig.create({
      data: {
        ...(await gigData()),
        translations: {
          create: [{ locale: 'ka', title: 'ლოგოს დიზაინი', description: '<p>ტექსტი</p>' }],
        },
      },
      include: { translations: true },
    });
    expect(gig.status).toBe('pending');
    expect([gig.salesCount, gig.ratingCount, gig.ratingSum]).toEqual([0, 0, 0]);
    expect(gig.translations[0]?.source).toBe('human');
  });

  it('refuses a child category from another branch, also on update', async () => {
    const other = await branch();
    await expect(
      prisma.gig.create({ data: await gigData({ childcategoryId: other.child.id }) }),
    ).rejects.toThrow();
    const gig = await prisma.gig.create({ data: await gigData() });
    await expect(
      prisma.gig.update({ where: { id: gig.id }, data: { subcategoryId: other.sub.id } }),
    ).rejects.toThrow();
  });

  it('checks price, delivery time, revisions, SEO pair and the deleted pair', async () => {
    for (const bad of [
      { priceTetri: 99n },
      { deliveryDays: 8 },
      { revisionsAllowed: null },
      { revisionsAllowed: 101 },
      { seoTitle: 'Only a title' },
      { status: 'deleted' },
    ]) {
      await expect(prisma.gig.create({ data: await gigData(bad) })).rejects.toThrow();
    }
    const migrated = await prisma.gig.create({
      data: await gigData({ revisionsAllowed: null, legacyId: BigInt(Date.now()) }),
    });
    expect(migrated.revisionsAllowed).toBeNull();
    const zeroDays = await prisma.gig.create({ data: await gigData({ deliveryDays: 0 }) });
    await prisma.gig.update({
      where: { id: zeroDays.id },
      data: { status: 'deleted', deletedAt: new Date() },
    });
  });

  it('refuses deleting a category that a gig uses', async () => {
    const data = await gigData();
    await prisma.gig.create({ data });
    await expect(
      prisma.gigCategory.delete({ where: { id: data.childcategoryId } }),
    ).rejects.toThrow();
  });
});

describe('search_documents (§3.S)', () => {
  it('stores a row with an empty tsvector by default and finds every word as a substring', async () => {
    const entityId = (await prisma.gig.create({ data: await gigData() })).id;
    await prisma.searchDocument.create({
      data: {
        entityType: 'gig',
        entityId,
        searchText: 'პროფესიონალური ლოგოს დიზაინი professional logo design',
        priceTetri: 5000n,
        deliveryDays: 3,
        status: 'active',
      },
    });
    await prisma.$executeRaw`UPDATE "search_documents" SET "tsv" = to_tsvector('simple', "search_text") WHERE "entity_id" = ${entityId}::uuid`;
    const hits = await prisma.$queryRaw<{ entity_id: string }[]>`
      SELECT "entity_id" FROM "search_documents"
      WHERE "entity_type" = 'gig' AND "search_text" ILIKE '%ლოგო%' AND "search_text" ILIKE '%DESIGN%'
        AND "tsv" @@ websearch_to_tsquery('simple', 'logo')`;
    expect(hits.map((h) => h.entity_id)).toContain(entityId);
    const doc = await prisma.searchDocument.findUniqueOrThrow({
      where: { entityType_entityId: { entityType: 'gig', entityId } },
    });
    expect([doc.ownerIsPremium, doc.ownerListable, doc.ratingCount]).toEqual([false, true, 0]);
  });
});
