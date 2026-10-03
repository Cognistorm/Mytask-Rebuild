// Freelancer lists of spec 03: `listSellers` (`/sellers`, AC-27, P-30) and `listHireSellers` (`/hire/{keyword}`,
// AC-28, AC-29, EC-7).
//
// `/sellers`: listable users (AC-27 status rules, joined live like the gig lists) with at least one active gig.
// `/hire/{keyword}`: only when some user skill has exactly this slug (else 404, the web answers 302 to `/search?q=`);
// then listable users, gig not required, with a skill whose slug or name contains the keyword (LEGACY `LIKE`, which is
// case-insensitive in MySQL → `ILIKE`). Both lists use the daily mix, no Premium boost (R-S3.7, R-S7).
// Cards: `UserSummary` + the user's first 3 skills (LEGACY `skills()->limit(3)`, oldest first as on the profile).
import { Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { UserSummaries } from '../profiles/user-summaries';
import { dailyMix, LISTABLE_OWNER, offsetPaging, pageTail, type PageQuery } from './list-rules';
import { containsPattern } from './search-text';

const CARD_SKILLS = 3;

@Injectable()
export class SellerListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaries: UserSummaries,
  ) {}

  async sellers(
    query: PageQuery,
    locale: Locale,
    now = new Date(),
  ): Promise<Schema<'SellerCardPage'>> {
    const where = Prisma.sql`${LISTABLE_OWNER} AND EXISTS (
      SELECT 1 FROM "gigs" g WHERE g."owner_id" = u."id" AND g."status" = 'active')`;
    return this.page(where, query, locale, now);
  }

  async hire(
    keyword: string,
    query: PageQuery,
    locale: Locale,
    now = new Date(),
  ): Promise<Schema<'HireSellerPage'>> {
    // EC-7: several users may have a skill with this slug; the title uses the oldest (LEGACY `first()`).
    const skill = await this.prisma.userSkill.findFirst({
      where: { slug: keyword },
      orderBy: { id: 'asc' },
      select: { name: true, slug: true },
    });
    if (!skill) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
    const pattern = containsPattern(keyword);
    const where = Prisma.sql`${LISTABLE_OWNER} AND EXISTS (
      SELECT 1 FROM "user_skills" s
      WHERE s."user_id" = u."id" AND (s."slug" ILIKE ${pattern} OR s."name" ILIKE ${pattern}))`;
    return { skill, ...(await this.page(where, query, locale, now)) };
  }

  private async page(
    where: Prisma.Sql,
    query: PageQuery,
    locale: Locale,
    now: Date,
  ): Promise<Schema<'SellerCardPage'>> {
    const { limit, offset } = offsetPaging(query, locale);
    const [counted] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS "total" FROM "users" u WHERE ${where}`;
    const total = counted?.total ?? 0;
    const rows =
      offset < total
        ? await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT u."id" FROM "users" u WHERE ${where}
            ORDER BY ${dailyMix(Prisma.sql`u."id"`, now)}, u."id"
            LIMIT ${limit} OFFSET ${offset}`
        : [];
    return { data: await this.cards(rows.map((r) => r.id)), ...pageTail(offset, limit, total) };
  }

  private async cards(ids: string[]): Promise<Schema<'SellerCard'>[]> {
    if (ids.length === 0) return [];
    const [summaries, skills] = await Promise.all([
      this.summaries.many(ids),
      this.prisma.$queryRaw<{ userId: string; name: string; slug: string }[]>`
        SELECT "user_id" AS "userId", "name", "slug" FROM (
          SELECT s.*, row_number() OVER (PARTITION BY s."user_id" ORDER BY s."id") AS "n"
          FROM "user_skills" s WHERE s."user_id" = ANY(${ids}::uuid[])) ranked
        WHERE "n" <= ${CARD_SKILLS}
        ORDER BY "user_id", "n"`,
    ]);
    return ids.flatMap((id) => {
      const user = summaries.get(id);
      if (!user) return [];
      return [
        {
          user,
          skills: skills.filter((s) => s.userId === id).map(({ name, slug }) => ({ name, slug })),
        },
      ];
    });
  }
}
