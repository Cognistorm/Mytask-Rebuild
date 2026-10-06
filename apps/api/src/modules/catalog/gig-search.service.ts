// `searchGigs` (`/search` and every category level, spec 03 AC-3, AC-6…AC-23, R-S1…R-S6; ADR-011) and `listGigs`
// (profile gig list, spec 02 AC-8: newest first, no boost, R-S3.7).
//
// Listed (R-S1, P-29): active gigs whose owner is active/verified, not deleted and not restricted (a ban sets the
// status `banned`). The owner is joined at query time, so a ban, a restriction or its lifting shows on the next
// request. Keyword (AC-19, P-28): every word as a substring of the normalised title/description text of either
// language (`search_documents.search_text`, trigram index); no fuzzy-only matches. Filters are applied first, then
// the order: group A (owner with active Premium, PremiumStatus) before group B for every sort but the two price
// sorts (R-S3, AC-14…AC-16); ties newest first.
//
// Paging (`list-rules.ts`): `page` or the opaque `cursor`, both an offset into the same order. The "Recommended" mix
// is fixed for a Tbilisi day, so pages stay stable (EC-8).
import { Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../platform/db/prisma.service';
import { ApiException } from '../../platform/errors/api-exception';
import { PremiumStatus } from '../subscriptions/premium-status';
import { GigCards } from './gig-cards';
import {
  dailyMix,
  encodeOffset,
  fieldError,
  LISTABLE_OWNER,
  offsetPaging,
  pageTail,
} from './list-rules';
import { containsPattern, keywordWords } from './search-text';

type Sort = Schema<'SearchGigSort'>;

export interface GigSearchQuery {
  q?: string;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  deliveryTime?: number;
  rating?: number;
  sort?: Sort;
  cursor?: string;
  limit?: number;
  page?: number;
}

const CATEGORY_COLUMN = {
  1: Prisma.sql`g."category_id"`,
  2: Prisma.sql`g."subcategory_id"`,
  3: Prisma.sql`g."childcategory_id"`,
} as const;

const NEWEST = Prisma.sql`g."published_at" DESC NULLS LAST, g."created_at" DESC, g."id" DESC`;

@Injectable()
export class GigSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: PremiumStatus,
    private readonly cards: GigCards,
  ) {}

  async search(
    query: GigSearchQuery,
    locale: Locale,
    viewerId: string | null,
    now = new Date(),
  ): Promise<Schema<'GigCardPage'>> {
    const { limit, offset } = offsetPaging(query, locale);
    // Security review 08 SEC-76: a price above the safe integer range would overflow the bigint bind (500).
    for (const field of ['minPrice', 'maxPrice'] as const) {
      const value = query[field];
      if (value !== undefined && !Number.isSafeInteger(value))
        throw fieldError(locale, field, 'range', 't_validator_integer');
    }
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw fieldError(locale, 'minPrice', 'range', 't_min_price_greater_than_max');
    }

    const where: Prisma.Sql[] = [
      Prisma.sql`d."entity_type" = 'gig'`,
      Prisma.sql`g."status" = 'active'`,
      LISTABLE_OWNER,
    ];
    for (const word of keywordWords(query.q)) {
      where.push(Prisma.sql`d."search_text" LIKE ${containsPattern(word)}`);
    }
    if (query.categoryId !== undefined) {
      const category = await this.prisma.gigCategory.findUnique({
        where: { id: query.categoryId },
        select: { depth: true },
      });
      if (!category) throw new ApiException(404, 'NOT_FOUND', 't_page_not_fount');
      const column = CATEGORY_COLUMN[category.depth as 1 | 2 | 3];
      where.push(Prisma.sql`${column} = ${query.categoryId}::uuid`);
    }
    if (query.minPrice !== undefined)
      where.push(Prisma.sql`g."price_tetri" >= ${BigInt(query.minPrice)}`);
    if (query.maxPrice !== undefined)
      where.push(Prisma.sql`g."price_tetri" <= ${BigInt(query.maxPrice)}`);
    if (query.deliveryTime !== undefined)
      where.push(Prisma.sql`g."delivery_days" <= ${query.deliveryTime}`);
    // Average ≥ N without division (P-56 exact); "5" = exactly 5.0; gigs without reviews never match.
    if (query.rating !== undefined)
      where.push(
        Prisma.sql`g."rating_count" > 0 AND g."rating_sum" >= ${query.rating} * g."rating_count"`,
      );

    const from = Prisma.sql`
      FROM "search_documents" d
      JOIN "gigs" g ON g."id" = d."entity_id"
      JOIN "users" u ON u."id" = g."owner_id"
      WHERE ${Prisma.join(where, ' AND ')}`;
    const [counted] = await this.prisma.$queryRaw<{ total: number }[]>`
      SELECT count(*)::int AS "total" ${from}`;
    const total = counted?.total ?? 0;
    const rows =
      offset < total
        ? await this.prisma.$queryRaw<{ id: string }[]>`
            SELECT g."id" ${from}
            ORDER BY ${this.order(query.sort ?? 'recommended', now)}
            LIMIT ${limit} OFFSET ${offset}`
        : [];
    return {
      data: await this.cards.cards(
        rows.map((r) => r.id),
        locale,
        viewerId,
      ),
      ...pageTail(offset, limit, total),
    };
  }

  /** Profile gig list: active gigs of a listable owner, newest first; anyone else → empty page. */
  async listBySeller(
    sellerUsername: string,
    query: Pick<GigSearchQuery, 'cursor' | 'limit'>,
    locale: Locale,
    viewerId: string | null,
  ): Promise<Schema<'GigCardPage'>> {
    const { limit, offset } = offsetPaging(query, locale);
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT g."id" FROM "gigs" g JOIN "users" u ON u."id" = g."owner_id"
      WHERE u."username" = ${sellerUsername} AND g."status" = 'active' AND ${LISTABLE_OWNER}
      ORDER BY ${NEWEST}
      LIMIT ${limit + 1} OFFSET ${offset}`;
    const ids = rows.slice(0, limit).map((r) => r.id);
    return {
      data: await this.cards.cards(ids, locale, viewerId),
      nextCursor: rows.length > limit ? encodeOffset(offset + limit) : null,
    };
  }

  /** R-S3: group A (active Premium owner) first except for the price sorts; then the sort; ties newest first. */
  private order(sort: Sort, now: Date): Prisma.Sql {
    const groupA = Prisma.sql`CASE WHEN g."owner_id" IN (${this.premium.activeUsersSql()}) THEN 0 ELSE 1 END`;
    switch (sort) {
      case 'price_asc':
        return Prisma.sql`g."price_tetri" ASC, ${NEWEST}`;
      case 'price_desc':
        return Prisma.sql`g."price_tetri" DESC, ${NEWEST}`;
      case 'most_popular':
        return Prisma.sql`${groupA}, g."visits_count" DESC, ${NEWEST}`;
      case 'best_rating':
        return Prisma.sql`${groupA}, CASE WHEN g."rating_count" > 0 THEN g."rating_sum"::numeric / g."rating_count" END DESC NULLS LAST, ${NEWEST}`;
      case 'most_selling':
        return Prisma.sql`${groupA}, g."sales_count" DESC, ${NEWEST}`;
      case 'newest':
        return Prisma.sql`${groupA}, ${NEWEST}`;
      case 'recommended':
        // Daily mix (data-model §3.S): the same for everyone on a Tbilisi day.
        return Prisma.sql`${groupA}, ${dailyMix(Prisma.sql`g."id"`, now)}, ${NEWEST}`;
    }
  }
}
