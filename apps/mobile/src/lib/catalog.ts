// Gig list filters of the app (spec 03 AC-9…AC-15, AC-8 "42 per load on mobile"): the same options and rules as the
// web (`apps/web/src/lib/list-query.ts`): rating ≥ N, price min/max in GEL (→ tetri for the API, min > max refused),
// delivery time ≤ N days, the seven sorts. The app pages with `cursor` (CONVENTIONS §8.1).
import type { components } from '@mytask/types';

export type SearchGigSort = components['schemas']['SearchGigSort'];
export type GigCard = components['schemas']['GigCard'];

export const PAGE_SIZE = 42;
export const DELIVERY_TIMES = [1, 2, 3, 4, 5, 6, 7, 14, 21, 30] as const;
export type DeliveryTime = (typeof DELIVERY_TIMES)[number];
export const RATINGS = [5, 4, 3, 2, 1] as const;

export const SORTS: { value: SearchGigSort; key: string }[] = [
  { value: 'recommended', key: 't_recommended' },
  { value: 'most_popular', key: 't_most_popular' },
  { value: 'best_rating', key: 't_best_rating' },
  { value: 'most_selling', key: 't_most_selling' },
  { value: 'newest', key: 't_newest_first' },
  { value: 'price_asc', key: 't_price_low_to_high' },
  { value: 'price_desc', key: 't_price_high_to_low' },
];

export const DELIVERY_KEYS: Record<DeliveryTime, string> = {
  1: 't_1_day',
  2: 't_2_days',
  3: 't_3_days',
  4: 't_4_days',
  5: 't_5_days',
  6: 't_6_days',
  7: 't_1_week',
  14: 't_2_weeks',
  21: 't_3_weeks',
  30: 't_1_month',
};

export interface Filters {
  rating: number | null;
  minPrice: string;
  maxPrice: string;
  deliveryTime: DeliveryTime | null;
}

export const NO_FILTERS: Filters = { rating: null, minPrice: '', maxPrice: '', deliveryTime: null };

/** GEL with up to 2 decimals → integer tetri; anything else → null. */
export function gelToTetri(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** AC-10: min above max is refused before the list reloads. */
export function priceRangeInvalid(f: Filters): boolean {
  const min = gelToTetri(f.minPrice);
  const max = gelToTetri(f.maxPrice);
  return min !== null && max !== null && min > max;
}

export function filterCount(f: Filters): number {
  return (
    (f.rating !== null ? 1 : 0) +
    (f.minPrice.trim() || f.maxPrice.trim() ? 1 : 0) +
    (f.deliveryTime !== null ? 1 : 0)
  );
}

/** The `searchGigs` query of one load (42 per load). */
export function searchQuery(
  opts: { q: string; categoryId?: string; filters: Filters; sort: SearchGigSort },
  cursor?: string | null,
) {
  const min = gelToTetri(opts.filters.minPrice);
  const max = gelToTetri(opts.filters.maxPrice);
  return {
    ...(opts.q.trim() ? { q: opts.q.trim().slice(0, 100) } : {}),
    ...(opts.categoryId ? { categoryId: opts.categoryId } : {}),
    ...(opts.filters.rating !== null ? { rating: opts.filters.rating } : {}),
    ...(min !== null ? { minPrice: min } : {}),
    ...(max !== null ? { maxPrice: max } : {}),
    ...(opts.filters.deliveryTime !== null ? { deliveryTime: opts.filters.deliveryTime } : {}),
    sort: opts.sort,
    limit: PAGE_SIZE,
    ...(cursor ? { cursor } : {}),
  };
}
