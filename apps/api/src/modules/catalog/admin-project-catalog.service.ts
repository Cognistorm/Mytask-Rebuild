// Staff project categories and skills (spec 16 AC-61, spec 03 AC-31, R-S8, P-31): adminListProjectCategories,
// adminCreateProjectCategory, adminGetProjectCategory, adminUpdateProjectCategory, adminDeleteProjectCategory,
// adminListSkills, adminCreateSkill, adminGetSkill, adminUpdateSkill, adminDeleteSkill. Same rules as the gig
// categories of 4.2.7b: trimmed names, an English row only with an English name, an own ready `category_image`,
// every write audited in its transaction. Public project category reads are not cached, so nothing to empty.
// Projects arrive in slice 9: until then `projectCount` is 0 and only skills keep a project category in use.
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { AuditService } from '../../platform/audit/audit.service';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { afterCursor, decodeCursor, page } from '../../platform/pagination';
import type { RequestContext } from '../auth/request-context';
import { imageVariants } from '../files/image-variants';
import { FilesService } from '../files/files.service';
import { categoryImageInUse } from './category-images';
import { localized } from './localized';

type Tx = Prisma.TransactionClient;
type Localized = Schema<'LocalizedString'>;
type Texts = { ka: string | null; en: string | null };

const categoryInclude = {
  translations: true,
  gigCategory: { include: { translations: true } },
  _count: { select: { skills: true } },
} satisfies Prisma.ProjectCategoryInclude;
type CategoryRow = Prisma.ProjectCategoryGetPayload<{ include: typeof categoryInclude }>;
const skillInclude = { translations: true } satisfies Prisma.SkillInclude;
type SkillRow = Prisma.SkillGetPayload<{ include: typeof skillInclude }>;

const PERMISSION = 'catalog.write';
const NAME_MAX = 100;

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
const slugTaken = () => new ApiException(409, 'DUPLICATE', 't_validator_unique', { field: 'slug' });
const inUse = (skillCount: number, projectCount: number) =>
  new ApiException(409, 'CATEGORY_IN_USE', 't_category_in_use', { skillCount, projectCount });
const isPrismaError = (e: unknown, code: string) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === code;
const text = (v: string | null | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};
const both = <T extends { locale: string }, F extends keyof T>(rows: T[], f: F): Texts => ({
  ka: (rows.find((r) => r.locale === 'ka')?.[f] as string | null | undefined) ?? null,
  en: (rows.find((r) => r.locale === 'en')?.[f] as string | null | undefined) ?? null,
});
const latest = (dates: Date[]) => dates.reduce((a, b) => (b > a ? b : a)).toISOString();

@Injectable()
export class AdminProjectCatalogService {
  private readonly logger = new Logger(AdminProjectCatalogService.name);

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly files: FilesService,
  ) {}

  // ================================================================== project categories

  async listCategories(locale: Locale): Promise<Schema<'AdminProjectCategoryList'>> {
    const rows = await this.prisma.projectCategory.findMany({
      include: categoryInclude,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return { projectCategories: await this.categoryViews(rows, locale) };
  }

  async getCategory(id: string, locale: Locale): Promise<Schema<'AdminProjectCategory'>> {
    const row = await this.prisma.projectCategory.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!row) throw notFound();
    return (await this.categoryViews([row], locale))[0]!;
  }

  async createCategory(
    input: Schema<'ProjectCategoryCreateRequest'>,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminProjectCategory'>> {
    const texts = this.categoryTexts(input, ctx);
    await this.checkGigCategory(input.gigCategoryId, ctx);
    const imageFileId = await this.checkImage(input.imageFileId, staffId, null, ctx);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const position =
          input.position ??
          ((await tx.projectCategory.aggregate({ _max: { position: true } }))._max.position ?? -1) +
            1;
        const created = await tx.projectCategory.create({
          data: {
            slug: input.slug,
            gigCategoryId: input.gigCategoryId,
            imageFileId: imageFileId ?? null,
            position,
            isActive: input.isActive ?? true,
            translations: { create: this.categoryTranslationRows(texts, staffId) },
          },
        });
        await this.markAttached(tx, imageFileId, null, ctx);
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'project_category.create',
            targetType: 'project_category',
            targetId: created.id,
            after: { slug: created.slug, ...this.categorySnapshot(created, texts) },
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
    return this.getCategory(id, ctx.locale);
  }

  async updateCategory(
    id: string,
    input: Schema<'ProjectCategoryUpdateRequest'>,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminProjectCategory'>> {
    const before = await this.prisma.projectCategory.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!before) throw notFound();
    const texts = this.categoryTexts(input, ctx, before.translations);
    if (input.gigCategoryId !== undefined && input.gigCategoryId !== before.gigCategoryId) {
      await this.checkGigCategory(input.gigCategoryId, ctx);
    }
    const imageFileId = await this.checkImage(input.imageFileId, staffId, before, ctx);
    try {
      await this.prisma.$transaction(async (tx) => {
        const after = await tx.projectCategory.update({
          where: { id },
          data: {
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.gigCategoryId !== undefined ? { gigCategoryId: input.gigCategoryId } : {}),
            ...(imageFileId !== undefined ? { imageFileId } : {}),
            ...(input.position !== undefined ? { position: input.position } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            // Always written so `updatedAt` moves with a translation-only change.
            updatedAt: new Date(),
          },
        });
        for (const t of this.categoryTranslationRows(texts, staffId)) {
          await tx.projectCategoryTranslation.upsert({
            where: { projectCategoryId_locale: { projectCategoryId: id, locale: t.locale } },
            create: { projectCategoryId: id, ...t },
            update: t,
          });
        }
        if (texts.en === null) {
          await tx.projectCategoryTranslation.deleteMany({
            where: { projectCategoryId: id, locale: 'en' },
          });
        }
        await this.markAttached(tx, imageFileId, before, ctx);
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'project_category.update',
            targetType: 'project_category',
            targetId: id,
            before: {
              slug: before.slug,
              ...this.categorySnapshot(before, this.storedCategoryTexts(before.translations)),
            },
            after: { slug: after.slug, ...this.categorySnapshot(after, texts) },
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
    await this.purgeReplaced(before.imageFileId);
    return this.getCategory(id, ctx.locale);
  }

  /** Refused while skills (inactive ones too: FK) use it; projects join this check in slice 9. */
  async removeCategory(id: string, staffId: string, ctx: RequestContext): Promise<void> {
    const row = await this.prisma.projectCategory.findUnique({
      where: { id },
      include: { translations: true },
    });
    if (!row) throw notFound();
    const skills = () => this.prisma.skill.count({ where: { projectCategoryId: id } });
    const skillCount = await skills();
    if (skillCount) throw inUse(skillCount, 0);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.projectCategory.delete({ where: { id } });
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'project_category.delete',
            targetType: 'project_category',
            targetId: id,
            before: {
              slug: row.slug,
              ...this.categorySnapshot(row, this.storedCategoryTexts(row.translations)),
            },
            ip: ctx.ip,
            userAgent: ctx.userAgent,
          },
          tx,
        );
      });
    } catch (e) {
      // A skill added meanwhile (FK ON DELETE RESTRICT).
      if (isPrismaError(e, 'P2003')) throw inUse(await skills(), 0);
      throw e;
    }
    await this.purgeReplaced(row.imageFileId);
  }

  // ================================================================== skills

  /** Oldest first (keyset on `createdAt`, `id`); `q` matches the slug or a name in either language. */
  async listSkills(
    query: { projectCategoryId?: string; q?: string; cursor?: string; limit?: number },
    ctx: RequestContext,
  ): Promise<Schema<'AdminSkillPage'>> {
    const limit = query.limit ?? 50;
    const q = query.q?.trim();
    const where: Prisma.SkillWhereInput = {
      ...(query.projectCategoryId ? { projectCategoryId: query.projectCategoryId } : {}),
      ...(q
        ? {
            OR: [
              { slug: { contains: q, mode: 'insensitive' } },
              { translations: { some: { name: { contains: q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };
    const rows = await this.prisma.skill.findMany({
      where: { AND: [where, afterCursor(decodeCursor(query.cursor, ctx.t), 'asc')] },
      include: skillInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const { data, nextCursor } = page(rows, limit);
    return { data: data.map((r) => this.skillView(r)), nextCursor };
  }

  async getSkill(id: string): Promise<Schema<'AdminSkill'>> {
    const row = await this.prisma.skill.findUnique({ where: { id }, include: skillInclude });
    if (!row) throw notFound();
    return this.skillView(row);
  }

  async createSkill(
    input: Schema<'SkillCreateRequest'>,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminSkill'>> {
    const name = this.names(input.name, ctx);
    await this.requireProjectCategory(input.projectCategoryId);
    let id: string;
    try {
      id = await this.prisma.$transaction(async (tx) => {
        const created = await tx.skill.create({
          data: {
            projectCategoryId: input.projectCategoryId,
            slug: input.slug,
            isActive: input.isActive ?? true,
            translations: { create: this.skillTranslationRows(name, staffId) },
          },
        });
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'skill.create',
            targetType: 'skill',
            targetId: created.id,
            after: this.skillSnapshot(created, name),
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
    return this.getSkill(id);
  }

  /** Moving a skill to another project category keeps its slug, which must be free there (409). */
  async updateSkill(
    id: string,
    input: Schema<'SkillUpdateRequest'>,
    staffId: string,
    ctx: RequestContext,
  ): Promise<Schema<'AdminSkill'>> {
    const before = await this.prisma.skill.findUnique({ where: { id }, include: skillInclude });
    if (!before) throw notFound();
    const name = input.name ? this.names(input.name, ctx) : both(before.translations, 'name');
    if (input.projectCategoryId !== undefined) {
      await this.requireProjectCategory(input.projectCategoryId);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const after = await tx.skill.update({
          where: { id },
          data: {
            ...(input.projectCategoryId !== undefined
              ? { projectCategoryId: input.projectCategoryId }
              : {}),
            ...(input.slug !== undefined ? { slug: input.slug } : {}),
            ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            updatedAt: new Date(),
          },
        });
        if (input.name) {
          for (const t of this.skillTranslationRows(name, staffId)) {
            await tx.skillTranslation.upsert({
              where: { skillId_locale: { skillId: id, locale: t.locale } },
              create: { skillId: id, ...t },
              update: t,
            });
          }
          if (name.en === null) {
            await tx.skillTranslation.deleteMany({ where: { skillId: id, locale: 'en' } });
          }
        }
        await this.audit.write(
          {
            actorStaffId: staffId,
            permissionCode: PERMISSION,
            action: 'skill.update',
            targetType: 'skill',
            targetId: id,
            before: this.skillSnapshot(before, both(before.translations, 'name')),
            after: this.skillSnapshot(after, name),
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
    return this.getSkill(id);
  }

  /** Projects (slice 9) are the only users of a skill; until then a skill can always be deleted. */
  async removeSkill(id: string, staffId: string, ctx: RequestContext): Promise<void> {
    const row = await this.prisma.skill.findUnique({ where: { id }, include: skillInclude });
    if (!row) throw notFound();
    await this.prisma.$transaction(async (tx) => {
      await tx.skill.delete({ where: { id } });
      await this.audit.write(
        {
          actorStaffId: staffId,
          permissionCode: PERMISSION,
          action: 'skill.delete',
          targetType: 'skill',
          targetId: id,
          before: this.skillSnapshot(row, both(row.translations, 'name')),
          ip: ctx.ip,
          userAgent: ctx.userAgent,
        },
        tx,
      );
    });
  }

  // ================================================================== input

  /** Georgian name required, both at most 100 characters (the column). */
  private names(input: Localized, ctx: RequestContext): Texts {
    const name = { ka: text(input.ka), en: text(input.en) };
    if (!name.ka) throw this.invalid(ctx, 'name.ka', 'required', 't_validator_required');
    for (const locale of ['ka', 'en'] as const) {
      if ((name[locale]?.length ?? 0) > NAME_MAX) {
        throw this.invalid(ctx, `name.${locale}`, 'max', 't_validator_max', { max: NAME_MAX });
      }
    }
    return name;
  }

  /** Names and the SEO description (plain text) as stored; a field left out keeps its value. */
  private categoryTexts(
    input: Schema<'ProjectCategoryUpdateRequest'>,
    ctx: RequestContext,
    rows?: { locale: string; name: string; seoDescription: string | null }[],
  ) {
    const current = rows ? this.storedCategoryTexts(rows) : null;
    const name = input.name
      ? this.names(input.name, ctx)
      : (current?.name ?? this.names({ ka: '', en: null }, ctx));
    const seo =
      input.seoDescription === undefined
        ? (current?.seoDescription ?? { ka: null, en: null })
        : input.seoDescription === null
          ? { ka: null, en: null }
          : { ka: text(input.seoDescription.ka), en: text(input.seoDescription.en) };
    if (!name.en && seo.en) throw this.invalid(ctx, 'name.en', 'required', 't_validator_required');
    return {
      ka: { name: name.ka!, seoDescription: seo.ka },
      en: name.en ? { name: name.en, seoDescription: seo.en } : null,
    };
  }

  private storedCategoryTexts(
    rows: { locale: string; name: string; seoDescription: string | null }[],
  ) {
    return { name: both(rows, 'name'), seoDescription: both(rows, 'seoDescription') };
  }

  private categoryTranslationRows(
    texts: ReturnType<AdminProjectCatalogService['categoryTexts']>,
    staffId: string,
  ) {
    const meta = { source: 'human' as const, sourceLocale: null, updatedByStaffId: staffId };
    return [
      { locale: 'ka' as const, ...texts.ka, ...meta },
      ...(texts.en ? [{ locale: 'en' as const, ...texts.en, ...meta }] : []),
    ];
  }

  private skillTranslationRows(name: Texts, staffId: string) {
    const meta = { source: 'human' as const, sourceLocale: null, updatedByStaffId: staffId };
    return [
      { locale: 'ka' as const, name: name.ka!, ...meta },
      ...(name.en ? [{ locale: 'en' as const, name: name.en, ...meta }] : []),
    ];
  }

  /** Unknown → 400 on the field (the create operation has no 404); below the top level → 422 (contract). */
  private async checkGigCategory(id: string, ctx: RequestContext): Promise<void> {
    const gig = await this.prisma.gigCategory.findUnique({ where: { id } });
    if (!gig) throw this.invalid(ctx, 'gigCategoryId', 'not_found', 't_validator_exists');
    if (gig.depth !== 1) {
      throw new ApiException(422, 'BUSINESS_RULE_VIOLATION', 't_project_category_top_level_only', {
        field: 'gigCategoryId',
      });
    }
  }

  private async requireProjectCategory(id: string): Promise<void> {
    if (!(await this.prisma.projectCategory.findUnique({ where: { id }, select: { id: true } }))) {
      throw notFound();
    }
  }

  /** Same rule as the gig category images: an own, ready `category_image` that no category shows yet. */
  private async checkImage(
    id: string | null | undefined,
    staffId: string,
    row: { id: string; imageFileId: string | null } | null,
    ctx: RequestContext,
  ): Promise<string | null | undefined> {
    if (id === undefined || id === null || id === row?.imageFileId) return id;
    const file = await this.prisma.file.findUnique({ where: { id } });
    if (
      !file ||
      file.purpose !== 'category_image' ||
      file.ownerStaffId !== staffId ||
      file.status === 'deleted' ||
      (await categoryImageInUse(this.prisma, id, { projectCategoryId: row?.id }))
    ) {
      throw this.invalid(ctx, 'imageFileId', 'file_not_found', 't_file_not_found');
    }
    if (file.status !== 'ready') {
      throw this.invalid(ctx, 'imageFileId', 'file_not_ready', 't_file_not_ready');
    }
    return id;
  }

  /** SEC-74 compare-and-set: the new file must still be `ready` inside the write. */
  private async markAttached(
    tx: Tx,
    id: string | null | undefined,
    row: { imageFileId: string | null } | null,
    ctx: RequestContext,
  ): Promise<void> {
    if (!id || id === row?.imageFileId) return;
    const done = await tx.file.updateMany({
      where: { id, status: 'ready' },
      data: { attachedAt: new Date() },
    });
    if (!done.count) throw this.invalid(ctx, 'imageFileId', 'file_not_ready', 't_file_not_ready');
  }

  /** Best effort after the commit: a replaced or orphaned image is never shown again. */
  private async purgeReplaced(fileId: string | null): Promise<void> {
    if (!fileId || (await categoryImageInUse(this.prisma, fileId))) return;
    try {
      await this.files.purgeDetached(fileId);
    } catch (e) {
      this.logger.warn({ fileId, err: e }, 'project category image not deleted');
    }
  }

  private invalid(
    ctx: RequestContext,
    field: string,
    code: string,
    key: string,
    params?: Record<string, number>,
  ) {
    return new ApiException(400, 'VALIDATION_FAILED', key, {
      fields: [{ field, code, message: ctx.t(key, params), messageKey: key }],
    });
  }

  // ================================================================== views

  private categorySnapshot(
    row: {
      gigCategoryId: string | null;
      imageFileId: string | null;
      position: number;
      isActive: boolean;
    },
    texts: unknown,
  ) {
    return {
      gigCategoryId: row.gigCategoryId,
      imageFileId: row.imageFileId,
      position: row.position,
      isActive: row.isActive,
      texts,
    };
  }

  private skillSnapshot(
    row: { projectCategoryId: string; slug: string; isActive: boolean },
    name: Texts,
  ) {
    return {
      projectCategoryId: row.projectCategoryId,
      slug: row.slug,
      isActive: row.isActive,
      name,
    };
  }

  private async categoryViews(
    rows: CategoryRow[],
    locale: Locale,
  ): Promise<Schema<'AdminProjectCategory'>[]> {
    const imageIds = rows.flatMap((r) => (r.imageFileId ? [r.imageFileId] : []));
    const files = imageIds.length
      ? await this.prisma.file.findMany({ where: { id: { in: imageIds } } })
      : [];
    const images = new Map(
      files.map((f) => [f.id, imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL)]),
    );
    return rows.map((r) => {
      const t = this.storedCategoryTexts(r.translations);
      const gig = r.gigCategory;
      const gigText = gig ? localized(gig.translations, locale, ['name']) : null;
      return {
        id: r.id,
        slug: r.slug,
        name: { ka: t.name.ka ?? '', en: t.name.en },
        seoDescription:
          t.seoDescription.ka === null && t.seoDescription.en === null
            ? null
            : { ka: t.seoDescription.ka ?? '', en: t.seoDescription.en },
        gigCategory:
          gig && gigText
            ? {
                id: gig.id,
                slug: gig.slug,
                name: gigText.values.name ?? '',
                contentLocale: gigText.contentLocale,
              }
            : null,
        image: r.imageFileId ? (images.get(r.imageFileId) ?? null) : null,
        position: r.position,
        isActive: r.isActive,
        skillCount: r._count.skills,
        projectCount: 0,
        createdAt: r.createdAt.toISOString(),
        updatedAt: latest([r.updatedAt, ...r.translations.map((x) => x.updatedAt)]),
      };
    });
  }

  private skillView(r: SkillRow): Schema<'AdminSkill'> {
    const name = both(r.translations, 'name');
    return {
      id: r.id,
      projectCategoryId: r.projectCategoryId,
      slug: r.slug,
      name: { ka: name.ka ?? '', en: name.en },
      isActive: r.isActive,
      projectCount: 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: latest([r.updatedAt, ...r.translations.map((x) => x.updatedAt)]),
    };
  }
}
