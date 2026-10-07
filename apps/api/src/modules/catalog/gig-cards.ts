// `GigCard` of every gig list (spec 03 AC-7, AC-18; contract `GigCard`): title in the request language with the
// Georgian fallback, thumbnail variants, starting price, rating in tenths, seller summary and the Featured flag
// (= the seller's active Premium, the same PremiumStatus answer the ranking uses). Neutral values of later slices
// (4.2.1 handoff §D): rating counters stay 0 until slice 6. `isFavorite`: the signed-in caller's saved gigs
// (`favorites`, 4.3.6), `null` for guests.
import { Inject, Injectable } from '@nestjs/common';
import type { Locale, Schema } from '@mytask/types';
import { ENV, type Env } from '../../platform/config/env';
import { PrismaService } from '../../platform/db/prisma.service';
import { imageVariants } from '../files/image-variants';
import { UserSummaries } from '../profiles/user-summaries';
import { localized } from './localized';

/** Average × 10, rounded half up (`RatingSummary`, P-56): 13/3 = 4.33 → 43. Exact integer arithmetic. */
export function ratingSummary(count: number, sum: number): Schema<'RatingSummary'> {
  if (count === 0) return { count: 0, averageTenths: null };
  return { count, averageTenths: Math.floor((20 * sum + count) / (2 * count)) };
}

@Injectable()
export class GigCards {
  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly summaries: UserSummaries,
  ) {}

  /** Cards in the order of `ids`; ids without a gig are left out. */
  async cards(
    ids: readonly string[],
    locale: Locale,
    viewerId: string | null,
  ): Promise<Schema<'GigCard'>[]> {
    if (ids.length === 0) return [];
    const gigs = await this.prisma.gig.findMany({
      where: { id: { in: [...ids] } },
      include: { translations: { select: { locale: true, title: true } } },
    });
    const [thumbnails, sellers, saved] = await Promise.all([
      this.prisma.file.findMany({ where: { id: { in: gigs.map((g) => g.thumbnailFileId) } } }),
      this.summaries.many(gigs.map((g) => g.ownerId)),
      viewerId === null
        ? []
        : this.prisma.favorite.findMany({
            where: { userId: viewerId, gigId: { in: gigs.map((g) => g.id) } },
            select: { gigId: true },
          }),
    ]);
    const favorites = new Set(saved.map((f) => f.gigId));
    const byId = new Map(gigs.map((g) => [g.id, g]));
    return ids.flatMap((id) => {
      const gig = byId.get(id);
      const seller = gig && sellers.get(gig.ownerId);
      if (!gig || !seller) return [];
      const { values, contentLocale } = localized(gig.translations, locale, ['title']);
      const thumbnail = thumbnails.find((f) => f.id === gig.thumbnailFileId);
      return [
        {
          id: gig.id,
          uid: gig.uid,
          slug: gig.slug,
          title: values.title ?? '',
          contentLocale,
          thumbnail: thumbnail ? imageVariants(thumbnail, this.env.PUBLIC_MEDIA_BASE_URL) : null,
          price: { amount: Number(gig.priceTetri), currency: 'GEL' },
          deliveryDays: gig.deliveryDays as Schema<'GigDeliveryDays'>,
          rating: ratingSummary(gig.ratingCount, gig.ratingSum),
          seller,
          isFeatured: seller.isPremium,
          isFavorite: viewerId === null ? null : favorites.has(gig.id),
        },
      ];
    });
  }
}
