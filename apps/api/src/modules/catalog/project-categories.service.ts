// Public project category reads (spec 03 AC-31, AC-33, AC-34; P-31, R-S8): `listProjectCategories` (active categories
// with their active skills) and `lookupProjectCategory` (`/explore/projects/{category}[/{skill}]`, the skill must
// belong to the category; S-075 OFF → 403 FEATURE_DISABLED). The colour is the linked top-level gig category's
// (ADR-023 §3), null without a link.
import { Inject, Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import type { Prisma } from '../../generated/prisma/client';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { SettingsService } from '../../platform/settings/settings.service';
import { imageVariants } from '../files/image-variants';
import { localized } from './localized';

const include = {
  translations: true,
  gigCategory: { select: { color: true } },
  skills: { where: { isActive: true }, include: { translations: true } },
} satisfies Prisma.ProjectCategoryInclude;
type Row = Prisma.ProjectCategoryGetPayload<{ include: typeof include }>;
type SkillRow = Row['skills'][number];

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

@Injectable()
export class ProjectCategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async list(locale: Locale): Promise<Schema<'ProjectCategoryList'>> {
    const rows = await this.prisma.projectCategory.findMany({
      where: { isActive: true },
      include,
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    return { projectCategories: await this.views(rows, locale) };
  }

  async lookup(
    slug: string,
    skillSlug: string | undefined,
    locale: Locale,
  ): Promise<Schema<'ProjectCategoryLookupResult'>> {
    if (!(await this.settings.get('S-075'))) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_feature_disabled', {
        settingId: 'S-075',
      });
    }
    const row = await this.prisma.projectCategory.findFirst({
      where: { slug, isActive: true },
      include,
    });
    const [projectCategory] = row ? await this.views([row], locale) : [];
    if (!projectCategory) throw notFound();
    if (skillSlug === undefined) return { projectCategory, skill: null };
    const skill = projectCategory.skills.find((s) => s.slug === skillSlug);
    if (!skill) throw notFound();
    return { projectCategory, skill };
  }

  private async views(rows: Row[], locale: Locale): Promise<Schema<'ProjectCategory'>[]> {
    const imageIds = rows.flatMap((r) => (r.imageFileId ? [r.imageFileId] : []));
    const files = imageIds.length
      ? await this.prisma.file.findMany({ where: { id: { in: imageIds } } })
      : [];
    const images = new Map(
      files.map((f) => [f.id, imageVariants(f, this.env.PUBLIC_MEDIA_BASE_URL)]),
    );
    return rows.map((r) => {
      const { values, contentLocale, hasEnglish } = localized(r.translations, locale, [
        'name',
        'seoDescription',
      ]);
      return {
        id: r.id,
        slug: r.slug,
        name: values.name ?? '',
        seoDescription: values.seoDescription,
        contentLocale,
        hasEnglish,
        color: r.gigCategory?.color ?? null,
        image: r.imageFileId ? (images.get(r.imageFileId) ?? null) : null,
        position: r.position,
        skills: r.skills
          .map((s) => skillView(s, locale))
          .sort((a, b) => a.name.localeCompare(b.name, locale)),
      };
    });
  }
}

function skillView(s: SkillRow, locale: Locale): Schema<'SkillSummary'> {
  const { values, contentLocale } = localized(s.translations, locale, ['name']);
  return { id: s.id, slug: s.slug, name: values.name ?? '', contentLocale };
}
