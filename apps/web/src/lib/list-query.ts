// Gig list filters in the URL with the legacy names (spec 03 AC-12, url-map §2): `q`, `min_price`, `max_price`
// (GEL, up to 2 decimals → tetri for the API), `delivery_time`, `rating`, `sort_by` (legacy values → the
// contract's `SearchGigSort`) and `page` (42 per page, AC-8). Unknown values are ignored, as legacy did.
import type { components } from '@mytask/types';

export type SearchGigSort = components['schemas']['SearchGigSort'];

export const PAGE_SIZE = 42;
export const DELIVERY_TIMES = [1, 2, 3, 4, 5, 6, 7, 14, 21, 30] as const;
export type DeliveryTime = (typeof DELIVERY_TIMES)[number];
export const RATINGS = [5, 4, 3, 2, 1] as const;

/** Legacy `sort_by` value ↔ contract sort; Recommended (the default) has no URL value. */
export const SORTS: { value: SearchGigSort; legacy: string; key: string }[] = [
  { value: 'recommended', legacy: '', key: 't_recommended' },
  { value: 'most_popular', legacy: 'popular', key: 't_most_popular' },
  { value: 'best_rating', legacy: 'rating', key: 't_best_rating' },
  { value: 'most_selling', legacy: 'sales', key: 't_most_selling' },
  { value: 'newest', legacy: 'newest', key: 't_newest_first' },
  { value: 'price_asc', legacy: 'price_low_high', key: 't_price_low_to_high' },
  { value: 'price_desc', legacy: 'price_high_low', key: 't_price_high_to_low' },
];

/** Translation key of each delivery-time option (legacy `delivery_times`). */
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

export interface ListQuery {
  q: string;
  /** The URL values as typed (shown back in the inputs). */
  minPriceText: string;
  maxPriceText: string;
  minPrice: number | null;
  maxPrice: number | null;
  deliveryTime: DeliveryTime | null;
  rating: number | null;
  sort: SearchGigSort;
  page: number;
  /** AC-10: min > max is refused; the price filter is left out and the message shown. */
  priceError: boolean;
}

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/** GEL with up to 2 decimals → integer tetri; anything else → null. */
export function gelToTetri(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

export function parseListQuery(params: Params): ListQuery {
  const minPriceText = one(params.min_price).trim();
  const maxPriceText = one(params.max_price).trim();
  let minPrice = gelToTetri(minPriceText);
  let maxPrice = gelToTetri(maxPriceText);
  const priceError = minPrice !== null && maxPrice !== null && minPrice > maxPrice;
  if (priceError) {
    minPrice = null;
    maxPrice = null;
  }
  const delivery = Number(one(params.delivery_time));
  const rating = Number(one(params.rating));
  const page = Number(one(params.page));
  return {
    // EC-6: the API cuts at 100 characters too; the input never sends more.
    q: one(params.q).trim().slice(0, 100),
    minPriceText,
    maxPriceText,
    minPrice,
    maxPrice,
    deliveryTime: (DELIVERY_TIMES as readonly number[]).includes(delivery)
      ? (delivery as DeliveryTime)
      : null,
    rating: (RATINGS as readonly number[]).includes(rating) ? rating : null,
    sort:
      SORTS.find((s) => s.legacy !== '' && s.legacy === one(params.sort_by))?.value ??
      'recommended',
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
    priceError,
  };
}

/** True when any filter or the sort differs from the clean list (AC-12 "Reset filter", AC-37 canonical). */
export function hasFilters(q: ListQuery, withKeyword = false): boolean {
  return (
    (withKeyword && q.q !== '') ||
    q.minPriceText !== '' ||
    q.maxPriceText !== '' ||
    q.deliveryTime !== null ||
    q.rating !== null ||
    q.sort !== 'recommended'
  );
}

/** The URL query for a list state; `page` 1 and empty values are left out. */
export function listSearch(
  q: ListQuery,
  change: Partial<Pick<ListQuery, 'sort' | 'page'>> = {},
): string {
  const next = { ...q, ...change };
  const out = new URLSearchParams();
  if (next.q) out.set('q', next.q);
  if (next.minPriceText) out.set('min_price', next.minPriceText);
  if (next.maxPriceText) out.set('max_price', next.maxPriceText);
  if (next.deliveryTime !== null) out.set('delivery_time', String(next.deliveryTime));
  if (next.rating !== null) out.set('rating', String(next.rating));
  const legacy = SORTS.find((s) => s.value === next.sort)?.legacy;
  if (legacy) out.set('sort_by', legacy);
  if (next.page > 1) out.set('page', String(next.page));
  const s = out.toString();
  return s ? `?${s}` : '';
}

/** The `searchGigs` query for a list state (42 per page). */
export function searchGigsQuery(q: ListQuery, categoryId?: string) {
  return {
    ...(q.q ? { q: q.q } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(q.minPrice !== null ? { minPrice: q.minPrice } : {}),
    ...(q.maxPrice !== null ? { maxPrice: q.maxPrice } : {}),
    ...(q.deliveryTime !== null ? { deliveryTime: q.deliveryTime } : {}),
    ...(q.rating !== null ? { rating: q.rating } : {}),
    sort: q.sort,
    page: q.page,
    limit: PAGE_SIZE,
  };
}
