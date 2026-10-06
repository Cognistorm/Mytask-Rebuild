// A contract `GigCard` as the shared card's data and labels (spec 03 "Gig card", AC-7, AC-18): gig page
// `/service/{slug}` (slice 3), seller profile, the Georgian title's `lang` when it fell back.
import type { TFunction } from 'i18next';
import type { components } from '@mytask/types';
import type { Locale } from '@mytask/i18n';
import { formatMoney, type GigCardData, type GigCardLabels } from '@mytask/ui/web';
import { href } from './href';

type GigCard = components['schemas']['GigCard'];

export function toGigCardData(locale: Locale, gig: GigCard): GigCardData {
  return {
    href: href(locale, `/service/${gig.slug}`),
    title: gig.title,
    titleLang: gig.contentLocale !== locale ? gig.contentLocale : undefined,
    imageUrl: gig.thumbnail?.medium ?? null,
    seller: {
      username: gig.seller.username,
      href: href(locale, `/profile/${gig.seller.username}`),
      avatar: gig.seller.avatar,
      isOnline: gig.seller.isOnline,
      isIdVerified: gig.seller.isIdVerified,
    },
    rating: gig.rating,
    price: formatMoney(gig.price),
    featured: gig.isFeatured,
  };
}

export function gigCardLabels(t: TFunction): GigCardLabels {
  return {
    featured: t('t_featured'),
    featuredHint: t('t_featured_badge_hint'),
    noReviews: t('t_no_reviews_yet'),
    startingAt: t('t_starting_at'),
    verified: t('t_id_verified'),
    ratingLabel: (rating, count) => t('t_ui_rating_label', { rating, count }),
  };
}
