// Public gig category reads (spec 03 AC-1…AC-5, AC-35; data-model §3.C): `listCategories` (the whole 3-level tree,
// cached ≤ 60 s), `lookupCategory` (slug path, each level inside the one above) and `getCategory` (by id).
// `is_visible` only drops a top-level category from the home rows (AC-5): the tree and the pages keep it.
import { Inject, Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import type { GigCategory, GigCategoryTranslation } from '../../generated/prisma/client';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { imageVariants } from '../files/image-variants';
import { localized } from './localized';

type Image = Schema<'ImageVariants'> | null;
type Depth = Schema<'CategoryDepth'>;
type Row = GigCategory & { translations: Pick<GigCategoryTranslation, 'locale' | 'name'>[] };
type DetailRow = GigCategory & { translations: GigCategoryTranslation[] };

/** listCategories: "changes by staff appear within 60 seconds" (contract). */
const TREE_CACHE_MS = 60_000;
const DETAIL_FIELDS = ['name', 'description', 'contentTop', 'contentBottom'] as const;

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
const byPosition = (a: GigCategory, b: GigCategory) =>
  a.position - b.position || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

@Injectable()
export class CategoriesService {
  private tree: { at: number; load: Promise<{ rows: Row[]; images: Map<string, Image> }> } | null =
    null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Tests and the staff write path (4.2.7). */
  invalidate(): void {
    this.tree = null;
  }

  async listTree(locale: Locale): Promise<Schema<'CategoryTree'>> {
    if (!this.tree || Date.now() - this.tree.at >= TREE_CACHE_MS) {
      const load = this.loadTree();
      this.tree = { at: Date.now(), load };
      load.catch(() => {
        if (this.tree?.load === load) this.tree = null;
      });
    }
    const { rows, images } = await this.tree.load;
    const children = new Map<string | null, Row[]>();
    for (const r of rows) children.set(r.parentId, [...(children.get(r.parentId) ?? []), r]);
    const build = (parentId: string | null, prefix: string): Schema<'CategoryNode'>[] =>
      (children.get(parentId) ?? []).sort(byPosition).map((r) => {
        const { values, contentLocale } = localized(r.translations, locale, ['name']);
        const path = prefix ? `${prefix}/${r.slug}` : r.slug;
        const top = r.depth === 1;
        return {
          id: r.id,
          slug: r.slug,
          path,
          depth: r.depth as Depth,
          name: values.name ?? '',
          contentLocale,
          icon: top && r.iconFileId ? (images.get(r.iconFileId) ?? null) : null,
          image: top && r.imageFileId ? (images.get(r.imageFileId) ?? null) : null,
          isVisibleOnHome: top ? r.isVisible : true,
          position: r.position,
          children: build(r.id, path),
        };
      });
    return { categories: build(null, '') };
  }

  /** `/categories/{c}[/{s}[/{child}]]`: every segment must exist at its level and belong to the one above (AC-3). */
  async lookup(path: string, locale: Locale): Promise<Schema<'CategoryDetail'>> {
    const slugs = path.split('/');
    if (slugs.length > 3 || slugs.some((s) => s === '')) throw notFound();
    const rows = await this.prisma.gigCategory.findMany({
      where: { OR: slugs.map((slug, i) => ({ depth: i + 1, slug })) },
      select: { id: true, parentId: true, depth: true },
    });
    let found: { id: string } | undefined;
    for (const [i] of slugs.entries()) {
      found = rows.find((r) => r.depth === i + 1 && r.parentId === (found?.id ?? null));
      if (!found) throw notFound();
    }
    return this.get(found!.id, locale);
  }

  async get(id: string, locale: Locale): Promise<Schema<'CategoryDetail'>> {
    const withNames = { translations: { select: { locale: true, name: true } } } as const;
    const row = await this.prisma.gigCategory.findUnique({
      where: { id },
      include: {
        translations: true,
        parent: { include: { ...withNames, parent: { include: withNames } } },
        children: { include: withNames },
      },
    });
    if (!row) throw notFound();
    const ancestors: Row[] = [];
    for (let p: (Row & { parent?: Row | null }) | null = row.parent; p; p = p.parent ?? null) {
      ancestors.unshift(p);
    }
    const ref = (r: Row): Schema<'CategoryRef'> => {
      const { values, contentLocale } = localized(r.translations, locale, ['name']);
      return { id: r.id, slug: r.slug, name: values.name ?? '', contentLocale };
    };
    const { values, contentLocale, hasEnglish } = localized(
      (row as DetailRow).translations,
      locale,
      DETAIL_FIELDS,
    );
    const images = await this.images([row.iconFileId, row.imageFileId]);
    const updatedAt = [row.updatedAt, ...row.translations.map((t) => t.updatedAt)].reduce((a, b) =>
      b > a ? b : a,
    );
    return {
      id: row.id,
      slug: row.slug,
      path: [...ancestors.map((a) => a.slug), row.slug].join('/'),
      depth: row.depth as Depth,
      name: values.name ?? '',
      description: values.description,
      contentTop: values.contentTop,
      contentBottom: values.contentBottom,
      contentLocale,
      hasEnglish,
      icon: row.iconFileId ? (images.get(row.iconFileId) ?? null) : null,
      image: row.imageFileId ? (images.get(row.imageFileId) ?? null) : null,
      breadcrumb: [...ancestors.map(ref), ref(row)],
      children: [...row.children].sort(byPosition).map(ref),
      updatedAt: updatedAt.toISOString(),
    };
  }

  private async loadTree(): Promise<{ rows: Row[]; images: Map<string, Image> }> {
    const rows = await this.prisma.gigCategory.findMany({
      include: { translations: { select: { locale: true, name: true } } },
    });
    const images = await this.images(
      rows.filter((r) => r.depth === 1).flatMap((r) => [r.iconFileId, r.imageFileId]),
    );
    return { rows, images };
  }

  private async images(ids: (string | null)[]): Promise<Map<string, Image>> {
    const wanted = ids.filter((id): id is string => id !== null);
    if (!wanted.length) return new Map();
    const files = await this.prisma.file.findMany({ where: { id: { in: wanted } } });
    return new Map(files.map((f) => [f.id, imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL)]));
  }
}
