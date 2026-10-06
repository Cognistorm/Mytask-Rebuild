// Staff gig category CRUD (spec 16 AC-60, spec 03 AC-1/AC-5/EC-2, spec 17 AC-10/EC-3): adminListCategories,
// adminCreateCategory, adminGetCategory, adminUpdateCategory, adminDeleteCategory. Old slugs go to
// `slug_redirects` by the rules of data-model §3.R; SEO texts are `staff_content` HTML (CONVENTIONS §19).
// Every write is audited in its transaction and empties the public tree cache (`CategoriesService`).
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Schema } from '@mytask/types';
import {
  Prisma,
  type File as FileRow,
  type GigCategory,
  type GigCategoryTranslation,
} from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { RichText } from '../../platform/rich-text/rich-text';
import type { RequestContext } from '../auth/request-context';
import { imageVariants } from '../files/image-variants';
import { FileAttachments, FilesService } from '../files/files.service';
import { CategoriesService } from './categories.service';
import { categoryImageInUse } from './category-images';

type Tx = Prisma.TransactionClient;
type Row = GigCategory & { translations: GigCategoryTranslation[] };
type Localized = Schema<'LocalizedString'>;
type CreateInput = Schema<'CategoryCreateRequest'>;
type UpdateInput = Schema<'CategoryUpdateRequest'>;
type Counts = { gigs: number; children: number; projectCategories: number };
type ImageField = 'iconFileId' | 'imageFileId';

const PERMISSION = 'catalog.write';
const MAX_DEPTH = 3;

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
const slugTaken = () => new ApiException(409, 'DUPLICATE', 't_validator_unique', { field: 'slug' });
const inUse = (c: Counts) =>
  new ApiException(409, 'CATEGORY_IN_USE', 't_category_in_use', {
    gigCount: c.gigs,
    childCount: c.children,
    projectCount: c.projectCategories,
  });
const isPrismaError = (e: unknown, code: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;

/** Texts as stored: trimmed, empty → null. */
const text = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};

@Injectable()
export class AdminCategoriesService {
  private readonly logger = new Logger(AdminCategoriesService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly richText: RichText,
    private readonly files: FilesService,
    private readonly categories: CategoriesService,
    attachmentChecks: FileAttachments,
  ) {
    // An icon or image cannot be deleted through the file endpoints while a category shows it.
    attachmentChecks.register(
      async (file) => file.purpose === 'category_image' && (await this.isUsed(file.id)),
    );
  }

  // ------------------------------------------------------------------ reads

  /** Flat list in tree order: each category followed by its children, siblings by position (contract). */
  async list(): Promise<Schema<'AdminCategoryList'>> {
    const rows = await this.prisma.gigCategory.findMany({ include: { translations: true } });
    const views = await this.views(rows);
    const byParent = new Map<string | null, Row[]>();
    for (const r of rows) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r]);
    const out: Schema<'AdminCategory'>[] = [];
    const walk = (parentId: string | null) => {
      const siblings = (byParent.get(parentId) ?? []).sort(
        (a, b) => a.position - b.position || (a.id < b.id ? -1 : 1),
      );
      for (const r of siblings) {
        out.push(views.get(r.id)!);
        walk(r.id);
      }
    };
    walk(null);
    return { categories: out };
  }

  async get(id: string): Promise<Schema<'AdminCategory'>> {
    const row = await this.prisma.gigCategory.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!row) throw notFound();
    return (await this.views([row])).get(row.id)!;
  }

  // ------------------------------------------------------------------ writes

  async create(
    input: CreateInput,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminCategory'>> {
    const parentId = input.parentId ?? null;
    const parent = parentId
      ? await this.prisma.gigCategory.findUnique({ where: { id: parentId } })
      : null;
    if (parentId && !parent) throw notFound();
    if (parent && parent.depth >= MAX_DEPTH) {
      throw new ApiException(422, 'BUSINESS_RULE_VIOLATION', 't_category_max_depth');
    }
    const depth = parent ? parent.depth + 1 : 1;
    const texts = this.texts(input, ctx);
    const images = await this.checkImages(input, depth, staffId, null, ctx);

    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        await this.lockSlugs(tx, depth, [input.slug]);
        await this.refuseTakenSlug(tx, depth, input.slug, null);
        const position =
          input.position ??
          ((await tx.gigCategory.aggregate({ where: { parentId }, _max: { position: true } }))._max
            .position ?? -1) + 1;
        const created = await tx.gigCategory.create({
          data: {
            parentId,
            depth,
            slug: input.slug,
            position,
            isVisible: input.isVisibleOnHome ?? true,
            iconFileId: images.iconFileId ?? null,
            imageFileId: images.imageFileId ?? null,
            translations: { create: this.translationRows(texts, staffId) },
          },
        });
        await this.markAttached(tx, images, null, ctx);
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'category.create',
            targetType: 'gig_category',
            targetId: created.id,
            after: { parentId, depth, slug: created.slug, ...this.snapshot(created, texts) },
            ip: ctx.ip,
            userAgent: ctx.userAgent,
          },
          tx,
        );
        return created.id;
      });
    } catch (e) {
      if (isPrismaError(e, 'P2002')) throw slugTaken();
      throw e;
    }
    this.categories.invalidate();
    return this.get(id);
  }

  async update(
    id: string,
    input: UpdateInput,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminCategory'>> {
    const before = await this.prisma.gigCategory.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!before) throw notFound();
    const texts = this.texts(input, ctx, before);
    const images = await this.checkImages(input, before.depth, staffId, before, ctx);
    const slug = input.slug !== undefined && input.slug !== before.slug ? input.slug : null;

    try {
      await this.prisma.$transaction(async (tx) => {
        if (slug !== null) {
          // §3.R rule 1: lock both the new and the released slug, refuse one in use, a change back
          // removes the item's own row, the released slug becomes a row.
          await this.lockSlugs(tx, before.depth, [slug, before.slug]);
          await this.refuseTakenSlug(tx, before.depth, slug, id);
          await tx.slugRedirect.deleteMany({
            where: { entityType: 'gig_category', scope: before.depth, oldSlug: slug, entityId: id },
          });
          await tx.slugRedirect.create({
            data: {
              entityType: 'gig_category',
              scope: before.depth,
              oldSlug: before.slug,
              entityId: id,
            },
          });
        }
        const after = await tx.gigCategory.update({
          where: { id },
          data: {
            ...(slug !== null ? { slug } : {}),
            ...(input.position !== undefined ? { position: input.position } : {}),
            ...(input.isVisibleOnHome !== undefined ? { isVisible: input.isVisibleOnHome } : {}),
            ...images,
            // The row is always written so `updatedAt` moves with a translation-only change.
            updatedAt: new Date(),
          },
        });
        for (const t of this.translationRows(texts, staffId)) {
          await tx.gigCategoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: id, locale: t.locale } },
            create: { categoryId: id, ...t },
            update: t,
          });
        }
        if (texts.en === null) {
          await tx.gigCategoryTranslation.deleteMany({ where: { categoryId: id, locale: 'en' } });
        }
        await this.markAttached(tx, images, before, ctx);
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'category.update',
            targetType: 'gig_category',
            targetId: id,
            before: { slug: before.slug, ...this.snapshot(before, this.stored(before)) },
            after: { slug: after.slug, ...this.snapshot(after, texts) },
            ip: ctx.ip,
            userAgent: ctx.userAgent,
          },
          tx,
        );
      });
    } catch (e) {
      if (isPrismaError(e, 'P2002')) throw slugTaken();
      throw e;
    }
    this.categories.invalidate();
    await this.purgeReplaced([before.iconFileId, before.imageFileId]);
    return this.get(id);
  }

  /** Refused while children, gigs (deleted ones too: they keep their category) or project categories use it. */
  async remove(id: string, staffId: string, ctx: RequestContext): Promise<void> {
    const row = await this.prisma.gigCategory.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!row) throw notFound();
    const counts = await this.usage(id, true);
    if (counts.gigs || counts.children || counts.projectCategories) throw inUse(counts);
    try {
      await this.prisma.$transaction(async (tx) => {
        // §3.R rule 3: the old slugs go with the item.
        await tx.slugRedirect.deleteMany({ where: { entityType: 'gig_category', entityId: id } });
        await tx.gigCategory.delete({ where: { id } });
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'category.delete',
            targetType: 'gig_category',
            targetId: id,
            before: {
              parentId: row.parentId,
              depth: row.depth,
              slug: row.slug,
              ...this.snapshot(row, this.stored(row)),
            },
            ip: ctx.ip,
            userAgent: ctx.userAgent,
          },
          tx,
        );
      });
    } catch (e) {
      // A gig, child or project category added meanwhile (FK ON DELETE RESTRICT).
      if (isPrismaError(e, 'P2003')) throw inUse(await this.usage(id, true));
      throw e;
    }
    this.categories.invalidate();
    await this.purgeReplaced([row.iconFileId, row.imageFileId]);
  }

  // ------------------------------------------------------------------ input

  /**
   * Both languages of every text the request sets (a field left out keeps its stored value). Names are trimmed
   * (the contract checked the length); SEO texts are sanitised and checked for text after it. English texts
   * need the English name: an English row without a name cannot exist.
   */
  private texts(input: CreateInput | UpdateInput, ctx: RequestContext, row?: Row) {
    const current = row ? this.stored(row) : null;
    const pick = (
      field: 'description' | 'contentTop' | 'contentBottom',
      clean: (v: string | null | undefined) => string | null,
    ) => {
      const given = input[field];
      if (given === undefined) return current ? current[field] : { ka: null, en: null };
      return given === null ? { ka: null, en: null } : { ka: clean(given.ka), en: clean(given.en) };
    };
    const html = (v: string | null | undefined) => {
      const clean = v ? this.richText.sanitize(v, 'staff_content') : '';
      // Markup without text (e.g. `<p> </p>`) is no text; an image alone is content.
      return this.richText.plainText(clean) !== '' || clean.includes('<img') ? clean : null;
    };
    const name = input.name
      ? { ka: text(input.name.ka), en: text(input.name.en) }
      : (current?.name ?? { ka: null, en: null });
    if (!name.ka) throw this.invalid(ctx, 'name.ka', 'required', 't_validator_required');
    const description = pick('description', text);
    const contentTop = pick('contentTop', html);
    const contentBottom = pick('contentBottom', html);
    if (!name.en && (description.en || contentTop.en || contentBottom.en)) {
      throw this.invalid(ctx, 'name.en', 'required', 't_validator_required');
    }
    const ka = { name: name.ka, description: description.ka, contentTop: contentTop.ka };
    return {
      ka: { ...ka, contentBottom: contentBottom.ka },
      en: name.en
        ? {
            name: name.en,
            description: description.en,
            contentTop: contentTop.en,
            contentBottom: contentBottom.en,
          }
        : null,
    };
  }

  private stored(row: Row) {
    const ka = row.translations.find((t) => t.locale === 'ka');
    const en = row.translations.find((t) => t.locale === 'en');
    const both = (f: 'name' | 'description' | 'contentTop' | 'contentBottom') => ({
      ka: ka?.[f] ?? null,
      en: en?.[f] ?? null,
    });
    return {
      name: both('name'),
      description: both('description'),
      contentTop: both('contentTop'),
      contentBottom: both('contentBottom'),
    };
  }

  private translationRows(texts: ReturnType<AdminCategoriesService['texts']>, staffId: string) {
    const meta = { source: 'human' as const, sourceLocale: null, updatedByStaffId: staffId };
    return [
      { locale: 'ka' as const, ...texts.ka, ...meta },
      ...(texts.en ? [{ locale: 'en' as const, ...texts.en, ...meta }] : []),
    ];
  }

  /**
   * Icon and image: top level only; a new file must be a `ready` `category_image` upload of this staff member
   * that no other category shows. Returns only the fields the request sets.
   */
  private async checkImages(
    input: CreateInput | UpdateInput,
    depth: number,
    staffId: string,
    row: GigCategory | null,
    ctx: RequestContext,
  ): Promise<Partial<Record<ImageField, string | null>>> {
    const out: Partial<Record<ImageField, string | null>> = {};
    for (const field of ['iconFileId', 'imageFileId'] as const) {
      const id = input[field];
      if (id === undefined) continue;
      out[field] = id;
      if (id === null || id === row?.iconFileId || id === row?.imageFileId) continue;
      if (depth !== 1) {
        throw this.invalid(ctx, field, 'top_level_only', 't_category_images_top_level_only');
      }
      const file = await this.prisma.file.findUnique({ where: { id } });
      if (
        !file ||
        file.purpose !== 'category_image' ||
        file.ownerStaffId !== staffId ||
        file.status === 'deleted' ||
        (await this.isUsed(id, row?.id))
      ) {
        throw this.invalid(ctx, field, 'file_not_found', 't_file_not_found');
      }
      if (file.status !== 'ready') {
        throw this.invalid(ctx, field, 'file_not_ready', 't_file_not_ready');
      }
    }
    return out;
  }

  /** Same compare-and-set as the portfolio save (SEC-74): each new file must still be `ready` inside the write. */
  private async markAttached(
    tx: Tx,
    images: Partial<Record<ImageField, string | null>>,
    row: GigCategory | null,
    ctx: RequestContext,
  ): Promise<void> {
    for (const field of ['iconFileId', 'imageFileId'] as const) {
      const id = images[field];
      if (!id || id === row?.iconFileId || id === row?.imageFileId) continue;
      const done = await tx.file.updateMany({
        where: { id, status: 'ready' },
        data: { attachedAt: new Date() },
      });
      if (!done.count) throw this.invalid(ctx, field, 'file_not_ready', 't_file_not_ready');
    }
  }

  // ------------------------------------------------------------------ slugs (data-model §3.R)

  /** One transaction-scoped advisory lock per (type, scope, slug), in a fixed order against deadlocks. */
  private async lockSlugs(tx: Tx, depth: number, slugs: string[]): Promise<void> {
    for (const slug of [...new Set(slugs)].sort()) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`gig_category:${depth}:${slug}`}, 0))`;
    }
  }

  /** Taken = another category's current slug at this level, or an old slug (row) of another category. */
  private async refuseTakenSlug(
    tx: Tx,
    depth: number,
    slug: string,
    ownId: string | null,
  ): Promise<void> {
    const current = await tx.gigCategory.findFirst({
      where: { depth, slug },
      select: { id: true },
    });
    if (current && current.id !== ownId) throw slugTaken();
    const old = await tx.slugRedirect.findUnique({
      where: {
        entityType_scope_oldSlug: { entityType: 'gig_category', scope: depth, oldSlug: slug },
      },
    });
    if (old && old.entityId !== ownId) throw slugTaken();
  }

  // ------------------------------------------------------------------ helpers

  /** Shown by another gig category or by any project category (4.2.8). */
  private isUsed(fileId: string, exceptCategoryId?: string): Promise<boolean> {
    return categoryImageInUse(this.prisma, fileId, { gigCategoryId: exceptCategoryId });
  }

  /** Best effort after the commit: a replaced or orphaned icon/image is only storage, never shown again. */
  private async purgeReplaced(fileIds: (string | null)[]): Promise<void> {
    for (const id of new Set(fileIds)) {
      if (!id || (await this.isUsed(id))) continue;
      try {
        await this.files.purgeDetached(id);
      } catch (e) {
        this.logger.warn({ fileId: id, err: e }, 'category file not deleted');
      }
    }
  }

  /** `includeDeletedGigs`: the delete check counts every gig row (FK), the list only live gigs (contract). */
  private async usage(id: string, includeDeletedGigs: boolean): Promise<Counts> {
    const gigWhere = {
      OR: [{ categoryId: id }, { subcategoryId: id }, { childcategoryId: id }],
      ...(includeDeletedGigs ? {} : { deletedAt: null }),
    };
    const [gigs, children, projectCategories] = await Promise.all([
      this.prisma.gig.count({ where: gigWhere }),
      this.prisma.gigCategory.count({ where: { parentId: id } }),
      this.prisma.projectCategory.count({ where: { gigCategoryId: id } }),
    ]);
    return { gigs, children, projectCategories };
  }

  private snapshot(row: GigCategory, texts: unknown) {
    return {
      position: row.position,
      isVisibleOnHome: row.isVisible,
      iconFileId: row.iconFileId,
      imageFileId: row.imageFileId,
      texts,
    };
  }

  private invalid(ctx: RequestContext, field: string, code: string, key: string) {
    return new ApiException(400, 'VALIDATION_FAILED', key, {
      fields: [{ field, code, message: ctx.t(key), messageKey: key }],
    });
  }

  private async views(rows: Row[]): Promise<Map<string, Schema<'AdminCategory'>>> {
    const ids = rows.map((r) => r.id);
    if (!ids.length) return new Map();
    const [gigCounts, childCounts, projectCounts, redirects, files] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; n: bigint }[]>`
        SELECT x.id, count(*) AS n FROM (
          SELECT category_id AS id FROM gigs WHERE deleted_at IS NULL
          UNION ALL SELECT subcategory_id FROM gigs WHERE deleted_at IS NULL
          UNION ALL SELECT childcategory_id FROM gigs WHERE deleted_at IS NULL
        ) x WHERE x.id = ANY(${ids}::uuid[]) GROUP BY x.id`,
      this.prisma.gigCategory.groupBy({
        by: ['parentId'],
        where: { parentId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.projectCategory.groupBy({
        by: ['gigCategoryId'],
        where: { gigCategoryId: { in: ids } },
        _count: { _all: true },
      }),
      this.prisma.slugRedirect.findMany({
        where: { entityType: 'gig_category', entityId: { in: ids } },
        orderBy: [{ createdAt: 'asc' }, { oldSlug: 'asc' }],
      }),
      this.imageFiles(rows.flatMap((r) => [r.iconFileId, r.imageFileId])),
    ]);
    const gigs = new Map(gigCounts.map((g) => [g.id, Number(g.n)]));
    const children = new Map(childCounts.map((c) => [c.parentId, c._count._all]));
    const projects = new Map(projectCounts.map((p) => [p.gigCategoryId, p._count._all]));
    const image = (fileId: string | null) => {
      const f = fileId ? files.get(fileId) : undefined;
      return f ? imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL) : null;
    };
    const localizedOrNull = (v: { ka: string | null; en: string | null }): Localized | null =>
      v.ka === null && v.en === null ? null : { ka: v.ka ?? '', en: v.en };
    return new Map(
      rows.map((r) => {
        const t = this.stored(r);
        const view: Schema<'AdminCategory'> = {
          id: r.id,
          parentId: r.parentId,
          depth: r.depth as Schema<'CategoryDepth'>,
          slug: r.slug,
          name: { ka: t.name.ka ?? '', en: t.name.en },
          description: localizedOrNull(t.description),
          contentTop: localizedOrNull(t.contentTop),
          contentBottom: localizedOrNull(t.contentBottom),
          icon: image(r.iconFileId),
          image: image(r.imageFileId),
          isVisibleOnHome: r.isVisible,
          position: r.position,
          gigCount: gigs.get(r.id) ?? 0,
          childCount: children.get(r.id) ?? 0,
          projectCategoryCount: projects.get(r.id) ?? 0,
          previousSlugs: redirects.filter((s) => s.entityId === r.id).map((s) => s.oldSlug),
          createdAt: r.createdAt.toISOString(),
          updatedAt: [r.updatedAt, ...r.translations.map((x) => x.updatedAt)]
            .reduce((a, b) => (b > a ? b : a))
            .toISOString(),
        };
        return [r.id, view];
      }),
    );
  }

  private async imageFiles(ids: (string | null)[]): Promise<Map<string, FileRow>> {
    const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
    if (!wanted.length) return new Map();
    const rows = await this.prisma.file.findMany({ where: { id: { in: wanted } } });
    return new Map(rows.map((f) => [f.id, f]));
  }
}
