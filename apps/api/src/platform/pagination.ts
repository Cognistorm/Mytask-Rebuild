// Keyset cursors (CONVENTIONS §8, ADR-011): `nextCursor` is the opaque base64url of the last row's
// `(createdAt, id)`, so a page stays stable while rows are inserted. Rows are ordered by `createdAt`, then `id`.
import { ApiException } from './errors/api-exception';

export interface CursorKey {
  createdAt: Date;
  id: string;
}

export function encodeCursor(row: CursorKey): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString('base64url');
}

/** A cursor this API did not make → 400 VALIDATION_FAILED on `cursor`. `t` localizes the field message. */
export function decodeCursor(
  cursor: string | undefined,
  t: (key: string) => string,
): CursorKey | null {
  if (cursor === undefined) return null;
  const [at, id] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
  const createdAt = new Date(at ?? '');
  if (
    !id ||
    Number.isNaN(createdAt.getTime()) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw new ApiException(400, 'VALIDATION_FAILED', 't_validator_regex', {
      fields: [
        {
          field: 'cursor',
          code: 'format',
          message: t('t_validator_regex'),
          messageKey: 't_validator_regex',
        },
      ],
    });
  }
  return { createdAt, id };
}

/** Prisma `where` part for the rows after the cursor in the given direction. */
export function afterCursor(key: CursorKey | null, dir: 'asc' | 'desc') {
  if (!key) return {};
  const op = dir === 'asc' ? 'gt' : 'lt';
  return {
    OR: [
      { createdAt: { [op]: key.createdAt } },
      { createdAt: key.createdAt, id: { [op]: key.id } },
    ],
  };
}

/** Takes `limit + 1` rows; returns the page and the cursor of its last row when more exist. */
export function page<T extends CursorKey>(rows: T[], limit: number) {
  const more = rows.length > limit;
  const data = more ? rows.slice(0, limit) : rows;
  return { data, nextCursor: more ? encodeCursor(data[data.length - 1]!) : null };
}
