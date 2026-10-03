// Rules shared by the public lists of spec 03 (searchGigs, listGigs, searchProjects, listSellers, listHireSellers):
// who may be listed (R-S1, P-29, AC-27), the daily mix key (P-26, P-30, EC-8) and offset paging. The web sends `page`
// (numbered pages + `totalCount`), the app sends the opaque `cursor`; both are an offset into the same order.
import type { Locale } from '@mytask/types';
import { Prisma } from '../../generated/prisma/client';
import { ApiException } from '../../platform/errors/api-exception';
import { translate } from '../../platform/errors/messages';

const DEFAULT_LIMIT = 20;
const MAX_OFFSET = 100_000;

/** User may be listed (R-S1, P-29, AC-27): active or verified, not deleted, not restricted (a ban sets `banned`); `u` = users. */
export const LISTABLE_OWNER = Prisma.sql`u."status" IN ('active', 'verified') AND u."deleted_at" IS NULL AND NOT u."is_restricted"`;

/** Tbilisi calendar date (UTC+4, no daylight saving) as YYYY-MM-DD: the key of the daily mix. */
export function tbilisiDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tbilisi' }).format(now);
}

/** Daily mix (data-model §3.S): the same order for everyone on a Tbilisi day. */
export const dailyMix = (id: Prisma.Sql, now: Date) =>
  Prisma.sql`md5(${id}::text || ${tbilisiDay(now)})`;

export const encodeOffset = (offset: number) => Buffer.from(`o:${offset}`).toString('base64url');

export function fieldError(locale: Locale, field: string, code: string, messageKey: string) {
  return new ApiException(400, 'VALIDATION_FAILED', messageKey, {
    fields: [{ field, code, message: translate(messageKey, locale), messageKey }],
  });
}

function decodeOffset(cursor: string, locale: Locale): number {
  const m = /^o:(\d{1,6})$/.exec(Buffer.from(cursor, 'base64url').toString('utf8'));
  const offset = m ? Number(m[1]) : NaN;
  if (!(offset >= 0 && offset <= MAX_OFFSET))
    throw fieldError(locale, 'cursor', 'format', 't_validator_regex');
  return offset;
}

export interface PageQuery {
  cursor?: string;
  limit?: number;
  page?: number;
}

export function offsetPaging(query: PageQuery, locale: Locale) {
  const limit = query.limit ?? DEFAULT_LIMIT;
  // A client error only (the web sends `page`, the app `cursor`), so the generic format text is enough.
  if (query.cursor !== undefined && query.page !== undefined) {
    throw fieldError(locale, 'page', 'conflict', 't_validator_regex');
  }
  const offset =
    query.cursor !== undefined
      ? decodeOffset(query.cursor, locale)
      : ((query.page ?? 1) - 1) * limit;
  return { limit, offset };
}

/** `nextCursor` and `totalCount` of a page that starts at `offset`. */
export function pageTail(offset: number, limit: number, total: number) {
  return {
    nextCursor: offset + limit < total ? encodeOffset(offset + limit) : null,
    totalCount: total,
  };
}
