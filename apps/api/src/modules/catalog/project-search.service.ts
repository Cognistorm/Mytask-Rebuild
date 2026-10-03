// `searchProjects` (`/explore/projects[/{category}[/{skill}]]`, spec 03 AC-32…AC-34). Projects arrive in slice 9
// (spec 10), so the result is an empty page until then (4.2.1 handoff §D). What is real now: S-075 OFF → 403
// FEATURE_DISABLED, the paging checks, and the 404 for an unknown or inactive project category or skill, or a skill
// outside the given category. Slice 9 fills the list: active + completed, newest first, the `searchGigs` word rule
// (`keywordWords`/`containsPattern`) on title and description in either language, masked client (R-P6).
import { Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { SettingsService } from '../../platform/settings/settings.service';
import { offsetPaging, pageTail, type PageQuery } from './list-rules';

export interface ProjectSearchQuery extends PageQuery {
  q?: string;
  projectCategoryId?: string;
  skillId?: string;
}

const notFound = () => new ApiException(404, 'NOT_FOUND', 't_page_not_fount');

@Injectable()
export class ProjectSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async search(
    query: ProjectSearchQuery,
    locale: Locale,
  ): Promise<Schema<'SearchProjectCardPage'>> {
    if (!(await this.settings.get('S-075'))) {
      throw new ApiException(403, 'FEATURE_DISABLED', 't_feature_disabled', {
        settingId: 'S-075',
      });
    }
    const { limit, offset } = offsetPaging(query, locale);
    if (query.projectCategoryId !== undefined) {
      const category = await this.prisma.projectCategory.findFirst({
        where: { id: query.projectCategoryId, isActive: true },
        select: { id: true },
      });
      if (!category) throw notFound();
    }
    if (query.skillId !== undefined) {
      const skill = await this.prisma.skill.findFirst({
        where: {
          id: query.skillId,
          isActive: true,
          ...(query.projectCategoryId !== undefined && {
            projectCategoryId: query.projectCategoryId,
          }),
        },
        select: { id: true },
      });
      if (!skill) throw notFound();
    }
    return { data: [], ...pageTail(offset, limit, 0) };
  }
}
