// Local catalogue for `pnpm db:seed` (ROADMAP 4.2.2b): the live site's public gig category tree (3 levels) and
// project categories, from seed-catalog.json (its `source` field says where each part was read). Loaded only
// while the catalogue is empty, so staff edits are kept. The Phase 5 migration loads the real rows instead.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { firstUnusedStarter } from '../src/modules/catalog/category-colors';

type SeedName = { slug: string; ka: string; en: string };
type SeedCategory = SeedName & { children?: SeedCategory[] };
export type SeedCatalog = {
  gigCategories: SeedCategory[];
  projectCategories: (SeedName & { gigCategory: string })[];
};

export function readSeedCatalog(): SeedCatalog {
  return JSON.parse(readFileSync(join(__dirname, 'seed-catalog.json'), 'utf8')) as SeedCatalog;
}

const names = (n: SeedName) => ({
  create: [
    { locale: 'ka' as const, name: n.ka },
    { locale: 'en' as const, name: n.en },
  ],
});

async function addCategories(
  tx: Prisma.TransactionClient,
  nodes: SeedCategory[],
  parentId: string | null,
  topIds: Map<string, string>,
  usedColors: Set<string | null>,
): Promise<number> {
  let count = 0;
  for (const [position, c] of nodes.entries()) {
    const row = await tx.gigCategory.create({
      // `depth` is set by the database trigger from the parent. Top-level categories get the first unused starter
      // colour: in an empty catalogue that is position order, as the 3X.7 migration does (ADR-023 §4).
      data: {
        parentId,
        depth: 1,
        slug: c.slug,
        position,
        color: parentId ? null : firstUnusedStarter(usedColors),
        translations: names(c),
      },
    });
    count += 1;
    if (!parentId) {
      topIds.set(c.slug, row.id);
      usedColors.add(row.color);
    }
    if (c.children) count += await addCategories(tx, c.children, row.id, topIds, usedColors);
  }
  return count;
}

/** Inserts the whole catalogue with `tx`; returns the number of gig categories. */
export async function loadCatalog(
  tx: Prisma.TransactionClient,
  catalog: SeedCatalog,
): Promise<number> {
  const topIds = new Map<string, string>();
  const used = await tx.gigCategory.findMany({
    where: { depth: 1, color: { not: null } },
    select: { color: true },
  });
  const count = await addCategories(
    tx,
    catalog.gigCategories,
    null,
    topIds,
    new Set(used.map((r) => r.color)),
  );
  for (const [position, p] of catalog.projectCategories.entries()) {
    await tx.projectCategory.create({
      data: {
        slug: p.slug,
        position,
        gigCategoryId: topIds.get(p.gigCategory) ?? null,
        translations: names(p),
      },
    });
  }
  return count;
}

/** Returns the number of gig categories created, or null when a catalogue was already present. */
export async function seedCatalog(
  prisma: PrismaClient,
  catalog: SeedCatalog = readSeedCatalog(),
): Promise<number | null> {
  if ((await prisma.gigCategory.count()) > 0 || (await prisma.projectCategory.count()) > 0) {
    return null;
  }
  return prisma.$transaction((tx) => loadCatalog(tx, catalog), { timeout: 120_000 });
}
