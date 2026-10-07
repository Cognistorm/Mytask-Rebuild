// getGigAnalytics (ROADMAP 4.3.5c; spec 04 AC-39, ADR-012): Selling → Gigs → Analytics of an own gig; another
// user's, a deleted or an unknown gig → 404. Totals are the gig's all-time counters: clicks = counted visits
// (`visits_count`, 4.3.5b, Q-182), impressions = appearances in search lists (`impressions_count`, GigImpressions),
// sales and reviews = the stored counters (0 until slices 5 and 6). Breakdowns sum the `analytics_daily` rows of
// metric `gig_view` over all days, most frequent first (ties by label); referrers and cities are the top 10 as
// legacy showed them (`Seller/Gigs/Options/AnalyticsComponent.php`), the other lists are complete. Recent orders
// stay empty until orders exist (slice 5; 4.3.1 handoff §D).
import { Injectable } from '@nestjs/common';
import type { components } from '@mytask/types';
import { PrismaService } from '../../platform/db/prisma.service';
import { notFound } from './gigs.service';

type S = components['schemas'];
type Bucket = S['GigAnalyticsBucket'];

const DIMENSIONS = {
  device: 'devices',
  browser: 'browsers',
  os: 'operatingSystems',
  referrer: 'referrers',
  country: 'countries',
  city: 'cities',
} as const;
type Dimension = keyof typeof DIMENSIONS;
const TOP: Partial<Record<Dimension, number>> = { referrer: 10, city: 10 };

@Injectable()
export class GigAnalytics {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string, gigId: string): Promise<S['GigAnalytics']> {
    const gig = await this.prisma.gig.findUnique({
      where: { id: gigId },
      select: {
        ownerId: true,
        status: true,
        visitsCount: true,
        impressionsCount: true,
        salesCount: true,
        ratingCount: true,
      },
    });
    if (!gig || gig.ownerId !== userId || gig.status === 'deleted') throw notFound();

    const rows = await this.prisma.$queryRaw<
      { dimension: Dimension; label: string; count: bigint }[]
    >`
      SELECT "dimension", "dimension_value" AS "label", SUM("count")::bigint AS "count"
      FROM "analytics_daily"
      WHERE "metric" = 'gig_view' AND "entity_type" = 'gig' AND "entity_id" = ${gigId}::uuid
        AND "dimension" IN ('device', 'browser', 'os', 'referrer', 'country', 'city')
      GROUP BY "dimension", "dimension_value"
      ORDER BY SUM("count") DESC, "dimension_value" ASC`;
    const lists = Object.fromEntries(
      Object.values(DIMENSIONS).map((field) => [field, [] as Bucket[]]),
    ) as Record<(typeof DIMENSIONS)[Dimension], Bucket[]>;
    for (const row of rows) {
      const list = lists[DIMENSIONS[row.dimension]];
      const top = TOP[row.dimension];
      if (top === undefined || list.length < top) {
        list.push({ label: row.label, count: Number(row.count) });
      }
    }
    return {
      gigId,
      salesCount: gig.salesCount,
      clickCount: Number(gig.visitsCount),
      impressionCount: Number(gig.impressionsCount),
      reviewCount: gig.ratingCount,
      ...lists,
      recentOrders: [],
    };
  }
}
